#!/usr/bin/env python3
import argparse
import json
import sqlite3
import struct
import tempfile
import time
import zlib
from collections import Counter
from io import BytesIO
from pathlib import Path


SQLITE_MAGIC = b"SQLite format 3"
PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
JPEG_MAGIC = b"\xff\xd8"


def find_sqlite_payload(clip_path):
    data = clip_path.read_bytes()
    offset = data.find(SQLITE_MAGIC)
    if offset < 0:
        raise RuntimeError(f"SQLite payload not found: {clip_path}")
    return data[offset:]


def find_sqlite_offset(data, clip_path):
    offset = data.find(SQLITE_MAGIC)
    if offset < 0:
        raise RuntimeError(f"SQLite payload not found: {clip_path}")
    return offset


def detect_image_type(data):
    if data.startswith(PNG_MAGIC):
        return "image/png", ".png"
    if data.startswith(JPEG_MAGIC):
        return "image/jpeg", ".jpg"
    return None, None


def extract_clip_data(clip_path, layer_output_dir=None, runtime_dir=None, layer_extension=".png"):
    clip_bytes = clip_path.read_bytes()
    sqlite_offset = find_sqlite_offset(clip_bytes, clip_path)
    sqlite_payload = clip_bytes[sqlite_offset:]
    with tempfile.NamedTemporaryFile(suffix=".sqlite") as tmp:
        tmp.write(sqlite_payload)
        tmp.flush()
        con = sqlite3.connect(tmp.name)
        try:
            row = con.execute(
                """
                SELECT ImageData, ImageWidth, ImageHeight
                FROM CanvasPreview
                WHERE ImageData IS NOT NULL
                ORDER BY ImageWidth * ImageHeight DESC
                LIMIT 1
                """
            ).fetchone()
            if not row or not row[0]:
                raise RuntimeError(f"CanvasPreview image not found: {clip_path}")

            image_data = bytes(row[0])
            layers = extract_layers(
                con,
                clip_bytes=clip_bytes,
                sqlite_offset=sqlite_offset,
                preview_data=image_data,
                preview_width=row[1],
                preview_height=row[2],
                layer_output_dir=layer_output_dir,
                runtime_dir=runtime_dir,
                layer_extension=layer_extension,
            )
        finally:
            con.close()

    mime_type, extension = detect_image_type(image_data)
    if not mime_type:
        raise RuntimeError(f"Unsupported preview image data: {clip_path}")

    return {
        "bytes": image_data,
        "mimeType": mime_type,
        "extension": extension,
        "width": row[1],
        "height": row[2],
        "layers": layers,
    }


def extract_layers(
    con,
    clip_bytes=None,
    sqlite_offset=None,
    preview_data=None,
    preview_width=None,
    preview_height=None,
    layer_output_dir=None,
    runtime_dir=None,
    layer_extension=".png",
):
    rows = con.execute(
        """
        SELECT _PW_ID, MainId, LayerName, LayerType, LayerVisibility, LayerOffsetX, LayerOffsetY, LayerOpacity
        FROM Layer
        ORDER BY _PW_ID
        """
    ).fetchall()

    layer_records = []
    for row in rows:
        layer_row_id, main_id, name, layer_type, visible, offset_x, offset_y, opacity = row
        label = str(name or "").strip()
        if not label or label == "용지" or int(layer_type or 0) != 1:
            continue
        layer_records.append(
            {
                "id": f"clip_layer_{main_id}",
                "sourceId": main_id,
                "rowId": layer_row_id,
                "name": label,
                "visible": bool(visible),
                "sourceOffsetX": int(offset_x or 0),
                "sourceOffsetY": int(offset_y or 0),
                "offsetX": 0,
                "offsetY": 0,
                "opacity": max(0, min(1, int(opacity if opacity is not None else 255) / 255)),
            }
        )

    layer_masks = extract_layer_masks(con, clip_bytes, sqlite_offset, preview_width, preview_height, layer_records)
    preview = read_rgba_png(preview_data)
    occluded_by_later = build_occlusion_masks(preview_width, preview_height, layer_records, layer_masks)
    layer_colors = choose_layer_colors(preview, preview_width, preview_height, layer_records, layer_masks, occluded_by_later)

    layers = []
    for layer in layer_records:
        export_layer_png(
            layer,
            layer_masks.get(layer["id"]),
            layer_colors.get(layer["id"]),
            layer_output_dir,
            preview_width,
            preview_height,
            preview,
            occluded_by_later.get(layer["id"]),
            layer_extension,
        )
        normalized = {
            **layer,
        }
        layer_image = find_layer_image(normalized["id"], layer_output_dir, runtime_dir, layer_extension)
        if layer_image:
            normalized["image"] = layer_image
        layers.append(normalized)
    return layers


def extract_layer_masks(con, clip_bytes, sqlite_offset, preview_width, preview_height, layers):
    if not clip_bytes or sqlite_offset is None or not preview_width or not preview_height:
        return {}

    external_chunks = load_external_chunk_offsets(con)
    masks = {}
    for layer in layers:
        offscreen = con.execute(
            """
            SELECT o.Attribute, o.BlockData
            FROM MipmapInfo m
            JOIN Offscreen o ON o.MainId = m.Offscreen
            WHERE m.LayerId = ? AND ABS(m.ThisScale - 100.0) < 0.001
            LIMIT 1
            """,
            (layer["sourceId"],),
        ).fetchone()
        if not offscreen:
            continue

        attribute, external_id = offscreen
        cols = read_clip_u16(attribute, 48)
        rows = read_clip_u16(attribute, 52)
        body = read_external_chunk_body(clip_bytes, sqlite_offset, external_chunks, external_id)
        streams = extract_tile_streams(body)
        if not cols or not rows or not streams:
            continue

        masks[layer["id"]] = assemble_alpha_mask(streams, cols, rows, preview_width, preview_height)
    return masks


def load_external_chunk_offsets(con):
    rows = con.execute("SELECT ExternalID, Offset FROM ExternalChunk ORDER BY Offset").fetchall()
    return [(external_id_to_text(external_id), int(offset)) for external_id, offset in rows]


def external_id_to_text(value):
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="ignore")
    return str(value)


def read_external_chunk_body(clip_bytes, sqlite_offset, external_chunks, external_id):
    lookup = dict(external_chunks)
    start = lookup.get(external_id_to_text(external_id))
    if start is None:
        return b""

    next_offsets = [offset for _, offset in external_chunks if offset > start]
    end = min(next_offsets) if next_offsets else sqlite_offset
    chunk = clip_bytes[start:end]
    if not chunk.startswith(b"CHNKExta"):
        return b""

    external_id_length = int.from_bytes(chunk[16:24], "big")
    return chunk[24 + external_id_length :]


def extract_tile_streams(body):
    streams = []
    cursor = 0
    tile_plane_size = 256 * 256
    expected_size = tile_plane_size * 5

    while True:
        position = body.find(b"\x78", cursor)
        if position < 0:
            break

        if body[position : position + 2] in (b"\x78\x01", b"\x78\x9c", b"\x78\xda"):
            try:
                raw = zlib.decompress(body[position:])
            except zlib.error:
                raw = None
            if raw and len(raw) == expected_size:
                tile_index = int.from_bytes(body[position - 28 : position - 24], "big")
                streams.append((tile_index, raw[:tile_plane_size]))
        cursor = position + 1

    return streams


def assemble_alpha_mask(streams, cols, rows, width, height):
    tile_size = 256
    alpha = bytearray(width * height)

    for tile_index, tile_alpha in streams:
        col = tile_index % cols
        row = tile_index // cols
        if row >= rows:
            continue

        for y in range(tile_size):
            dest_y = row * tile_size + y
            if dest_y >= height:
                continue
            dest_x = col * tile_size
            if dest_x >= width:
                continue

            count = min(tile_size, width - dest_x)
            src_start = y * tile_size
            dest_start = dest_y * width + dest_x
            alpha[dest_start : dest_start + count] = tile_alpha[src_start : src_start + count]

    return alpha


def choose_layer_colors(preview, width, height, layers, masks, occluded_by_later):
    if not preview:
        return {layer["id"]: (255, 255, 255) for layer in layers}

    colors = {}
    for index, layer in enumerate(layers):
        color_counts = count_visible_preview_colors(
            preview["rows"], width, height, masks.get(layer["id"]), occluded_by_later.get(layer["id"])
        )
        if not color_counts:
            color_counts = count_visible_preview_colors(preview["rows"], width, height, masks.get(layer["id"]), None)
        colors[layer["id"]] = pick_layer_color(color_counts, index)
    return colors


def build_occlusion_masks(width, height, layers, masks):
    coverage = bytearray(width * height)
    occluded_by_later = {}
    for layer in reversed(layers):
        mask = masks.get(layer["id"])
        occluded_by_later[layer["id"]] = bytearray(coverage)
        if not mask:
            continue
        for index, alpha in enumerate(mask):
            if alpha >= 128:
                coverage[index] = 255
    return occluded_by_later


def count_visible_preview_colors(preview_rows, width, height, mask, occlusion):
    if not mask:
        return Counter()

    counts = Counter()
    step = 2
    for y in range(0, height, step):
        row = preview_rows[y]
        row_start = y * width
        for x in range(0, width, step):
            pixel_index = row_start + x
            if mask[pixel_index] < 128:
                continue
            if occlusion and occlusion[pixel_index] >= 128:
                continue
            counts[tuple(row[x * 4 : x * 4 + 3])] += 1
    return counts


def pick_layer_color(color_counts, layer_index):
    if not color_counts:
        return (255, 255, 255)

    common = color_counts.most_common(8)
    color = common[0][0]
    if layer_index <= 1 or luminance(color) <= 140:
        return color

    for candidate, _ in common[1:]:
        candidate_luminance = luminance(candidate)
        if 24 <= candidate_luminance <= 130:
            return candidate
    return color


def luminance(color):
    red, green, blue = color
    return red * 0.2126 + green * 0.7152 + blue * 0.0722


def export_layer_png(layer, alpha, color, layer_output_dir, width, height, preview=None, occlusion=None, extension=".png"):
    if not layer_output_dir or not alpha or not color:
        return
    if width <= 0 or height <= 0:
        return

    rgba = bytearray(width * height * 4)
    fallback_red, fallback_green, fallback_blue = color
    preview_rows = preview["rows"] if preview else None
    for y in range(height):
        preview_row = preview_rows[y] if preview_rows and y < len(preview_rows) else None
        for x in range(width):
            index = y * width + x
            alpha_value = alpha[index]
            if not alpha_value:
                continue

            red, green, blue = fallback_red, fallback_green, fallback_blue
            if preview_row and (not occlusion or occlusion[index] < 128):
                preview_pixel = x * 4
                red, green, blue = preview_row[preview_pixel : preview_pixel + 3]

            pixel = index * 4
            rgba[pixel : pixel + 4] = bytes((red, green, blue, alpha_value))

    layer_output_dir.mkdir(parents=True, exist_ok=True)
    write_rgba_image(layer_output_dir / f"{layer['id']}{extension}", width, height, rgba)


def read_clip_u16(data, offset):
    if not data or len(data) < offset + 2:
        return 0
    return int.from_bytes(data[offset : offset + 2], "big")


def read_rgba_png(data):
    if not data or not data.startswith(PNG_MAGIC):
        return None

    position = len(PNG_MAGIC)
    width = None
    height = None
    idat = b""
    while position < len(data):
        length = struct.unpack(">I", data[position : position + 4])[0]
        chunk_type = data[position + 4 : position + 8]
        chunk_data = data[position + 8 : position + 8 + length]
        position += length + 12

        if chunk_type == b"IHDR":
            width, height, bit_depth, color_type, _, _, _ = struct.unpack(">IIBBBBB", chunk_data)
            if bit_depth != 8 or color_type != 6:
                return None
        elif chunk_type == b"IDAT":
            idat += chunk_data

    if not width or not height:
        return None

    raw = zlib.decompress(idat)
    stride = width * 4
    rows = []
    previous = bytearray(stride)
    cursor = 0
    for _ in range(height):
        filter_type = raw[cursor]
        cursor += 1
        row = bytearray(raw[cursor : cursor + stride])
        cursor += stride
        unfilter_png_row(row, previous, filter_type, 4)
        rows.append(bytes(row))
        previous = row

    return {"width": width, "height": height, "rows": rows}


def unfilter_png_row(row, previous, filter_type, bytes_per_pixel):
    for index in range(len(row)):
        left = row[index - bytes_per_pixel] if index >= bytes_per_pixel else 0
        up = previous[index]
        up_left = previous[index - bytes_per_pixel] if index >= bytes_per_pixel else 0

        if filter_type == 1:
            row[index] = (row[index] + left) & 255
        elif filter_type == 2:
            row[index] = (row[index] + up) & 255
        elif filter_type == 3:
            row[index] = (row[index] + ((left + up) // 2)) & 255
        elif filter_type == 4:
            row[index] = (row[index] + paeth_predictor(left, up, up_left)) & 255


def paeth_predictor(left, up, up_left):
    estimate = left + up - up_left
    left_distance = abs(estimate - left)
    up_distance = abs(estimate - up)
    up_left_distance = abs(estimate - up_left)
    if left_distance <= up_distance and left_distance <= up_left_distance:
        return left
    if up_distance <= up_left_distance:
        return up
    return up_left


def write_rgba_image(path, width, height, rgba):
    if path.suffix.lower() == ".webp":
        write_rgba_webp(path, width, height, rgba)
        return
    write_rgba_png(path, width, height, rgba)


def write_rgba_webp(path, width, height, rgba):
    image = pillow_image().frombytes("RGBA", (width, height), bytes(rgba))
    save_webp(image, path)


def write_rgba_png(path, width, height, rgba):
    def chunk(chunk_type, chunk_data):
        checksum = zlib.crc32(chunk_type + chunk_data) & 0xFFFFFFFF
        return struct.pack(">I", len(chunk_data)) + chunk_type + chunk_data + struct.pack(">I", checksum)

    scanlines = b"".join(b"\x00" + rgba[y * width * 4 : (y + 1) * width * 4] for y in range(height))
    path.write_bytes(
        PNG_MAGIC
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(scanlines, 6))
        + chunk(b"IEND", b"")
    )


def write_preview_image(path, image_bytes):
    if path.suffix.lower() != ".webp":
        path.write_bytes(image_bytes)
        return

    image = pillow_image().open(BytesIO(image_bytes)).convert("RGBA")
    save_webp(image, path)


def save_webp(image, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "WEBP", lossless=True, quality=100, method=6)


def pillow_image():
    try:
        from PIL import Image
    except ImportError as exc:
        raise RuntimeError("Pillow is required to export WebP images. Run `python3 -m pip install Pillow`.") from exc

    return Image


def find_layer_image(layer_id, layer_output_dir, runtime_dir, extension=".png"):
    if not layer_output_dir or not runtime_dir:
        return None
    image_path = layer_output_dir / f"{layer_id}{extension}"
    if not image_path.exists():
        return None
    try:
        return image_path.relative_to(runtime_dir).as_posix()
    except ValueError:
        return image_path.name


def export_preview(clip_path, output_path, manifest_path, layer_output_dir=None):
    layer_extension = ".webp" if output_path.suffix.lower() == ".webp" else ".png"
    preview = extract_clip_data(
        clip_path,
        layer_output_dir=layer_output_dir,
        runtime_dir=manifest_path.parent,
        layer_extension=layer_extension,
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    write_preview_image(output_path, preview["bytes"])

    updated_at = int(time.time() * 1000)
    manifest = {
        "source": str(clip_path),
        "preview": output_path.name,
        "mimeType": "image/webp" if output_path.suffix.lower() == ".webp" else preview["mimeType"],
        "width": preview["width"],
        "height": preview["height"],
        "layers": preview["layers"],
        "updatedAt": updated_at,
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return manifest


def watch(args):
    clip_path = Path(args.clip).resolve()
    output_path = Path(args.output).resolve()
    manifest_path = Path(args.manifest).resolve()
    layer_output_dir = Path(args.layer_output_dir).resolve()
    last_mtime_ns = None

    while True:
        try:
            stat = clip_path.stat()
            if stat.st_mtime_ns != last_mtime_ns or args.once:
                manifest = export_preview(clip_path, output_path, manifest_path, layer_output_dir=layer_output_dir)
                last_mtime_ns = stat.st_mtime_ns
                print(
                    f"updated {output_path} "
                    f"({manifest['width']}x{manifest['height']}, {manifest['mimeType']})",
                    flush=True,
                )
            if args.once:
                return
        except Exception as exc:
            print(f"clip preview export failed: {exc}", flush=True)
            if args.once:
                raise

        time.sleep(args.interval)


def main():
    parser = argparse.ArgumentParser(description="Export a live CanvasPreview image from a CLIP file.")
    parser.add_argument("--clip", default="assets/clip_file/배경.clip")
    parser.add_argument("--output", default="runtime/background-preview.webp")
    parser.add_argument("--manifest", default="runtime/background-preview.json")
    parser.add_argument("--layer-output-dir", default="runtime/background-layers")
    parser.add_argument("--interval", type=float, default=1.0)
    parser.add_argument("--once", action="store_true")
    watch(parser.parse_args())


if __name__ == "__main__":
    main()
