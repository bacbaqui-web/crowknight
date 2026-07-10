#!/usr/bin/env python3
import json
import time
from pathlib import Path

PSD_BACKGROUND_MAX_DIMENSION = 2048
PSD_BACKGROUND_EXPORT_TYPE = "WEBP"
PSD_BACKGROUND_EXPORT_QUALITY = 85


def export_psd_preview(psd_path, output_path, manifest_path, layer_output_dir=None):
    psd = psd_image().open(psd_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)

    preview = psd.composite()
    save_webp(preview, output_path)

    layers = export_psd_layers(psd, layer_output_dir, manifest_path.parent)
    updated_at = int(time.time() * 1000)
    preview_width, preview_height = scaled_dimension(psd.width, psd.height)
    manifest = {
        "source": str(psd_path),
        "preview": output_path.name,
        "mimeType": "image/webp",
        "exportQuality": PSD_BACKGROUND_EXPORT_QUALITY / 100,
        "width": preview_width,
        "height": preview_height,
        "exportWidth": preview_width,
        "exportHeight": preview_height,
        "sourceWidth": psd.width,
        "sourceHeight": psd.height,
        "maxDimension": PSD_BACKGROUND_MAX_DIMENSION,
        "layerOrder": "draw-bottom-to-top",
        "layers": layers,
        "updatedAt": updated_at,
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest


def export_psd_layers(psd, layer_output_dir, runtime_dir):
    if not layer_output_dir:
        return []

    layer_output_dir.mkdir(parents=True, exist_ok=True)
    layers = []
    preview_width, preview_height = scaled_dimension(psd.width, psd.height)
    for index, layer in enumerate(flatten_layers(psd), start=1):
        layer_id = stable_layer_id(layer, index)
        output_path = layer_output_dir / f"{layer_id}.webp"
        image = layer.composite()
        if image is None:
            continue

        canvas = transparent_canvas(psd.width, psd.height)
        composite_layer_image(canvas, image.convert("RGBA"), layer.left, layer.top)
        cropped = crop_transparent_x_bounds(downscale_image_for_export(canvas))

        layer_entry = {
            "id": layer_id,
            "sourceId": valid_layer_source_id(layer, index),
            "rowId": index,
            "name": layer.name or f"레이어 {index}",
            "visible": bool(layer.visible),
            "sourceOffsetX": int(layer.left or 0),
            "sourceOffsetY": int(layer.top or 0),
            "sourceWidth": psd.width,
            "sourceHeight": psd.height,
            "sourceCanvasWidth": psd.width,
            "sourceCanvasHeight": psd.height,
            "exportCanvasWidth": preview_width,
            "exportCanvasHeight": preview_height,
            "maxDimension": PSD_BACKGROUND_MAX_DIMENSION,
            "offsetX": 0,
            "offsetY": 0,
            "opacity": clamp_opacity(getattr(layer, "opacity", 255)),
        }

        if cropped is None:
            layer_entry.update(
                {
                    "empty": True,
                    "visible": False,
                    "width": 0,
                    "height": 0,
                    "exportWidth": 0,
                    "exportHeight": 0,
                    "cropX": 0,
                    "cropY": 0,
                    "cropWidth": 0,
                    "cropHeight": 0,
                    "originX": 0,
                    "originY": 0,
                    "image": "",
                }
            )
            layers.append(layer_entry)
            continue

        cropped_image, crop = cropped
        export_width, export_height = save_webp(cropped_image, output_path)
        source_crop = export_crop_to_source_crop(crop, psd.width, psd.height, preview_width, preview_height)
        layer_entry.update(
            {
                "empty": False,
                "width": export_width,
                "height": export_height,
                "exportWidth": export_width,
                "exportHeight": export_height,
                "cropX": crop["x"],
                "cropY": crop["y"],
                "cropWidth": crop["width"],
                "cropHeight": crop["height"],
                "originX": crop["x"],
                "originY": crop["y"],
                "sourceCropX": source_crop["x"],
                "sourceCropY": source_crop["y"],
                "sourceCropWidth": source_crop["width"],
                "sourceCropHeight": source_crop["height"],
                "image": output_path.relative_to(runtime_dir).as_posix(),
            }
        )
        layers.append(layer_entry)

    return layers


def flatten_layers(group):
    for layer in group:
        if layer.is_group():
            yield from flatten_layers(layer)
            continue
        if layer.width <= 0 or layer.height <= 0:
            continue
        yield layer


def stable_layer_id(layer, index):
    source_id = valid_layer_source_id(layer, None)
    if source_id:
        return f"psd_layer_{source_id}"
    return f"psd_layer_{index:03d}"


def valid_layer_source_id(layer, fallback):
    source_id = getattr(layer, "layer_id", None)
    if isinstance(source_id, int) and source_id > 0:
        return source_id
    return fallback


def clamp_opacity(value):
    try:
        return max(0, min(1, int(value) / 255))
    except (TypeError, ValueError):
        return 1


def transparent_canvas(width, height):
    return pillow_image().new("RGBA", (width, height), (0, 0, 0, 0))


def composite_layer_image(canvas, image, left, top):
    dest_x = int(left or 0)
    dest_y = int(top or 0)
    source_x = max(0, -dest_x)
    source_y = max(0, -dest_y)
    dest_x = max(0, dest_x)
    dest_y = max(0, dest_y)
    width = min(image.width - source_x, canvas.width - dest_x)
    height = min(image.height - source_y, canvas.height - dest_y)
    if width <= 0 or height <= 0:
        return

    visible = image.crop((source_x, source_y, source_x + width, source_y + height))
    canvas.alpha_composite(visible, (dest_x, dest_y))


def crop_transparent_x_bounds(image):
    rgba = image.convert("RGBA")
    alpha_bounds = rgba.getchannel("A").getbbox()
    if alpha_bounds is None:
        return None

    left, _, right, _ = alpha_bounds
    bounds = (left, 0, right, rgba.height)
    crop = {
        "x": int(left),
        "y": 0,
        "width": int(right - left),
        "height": int(rgba.height),
    }
    return rgba.crop(bounds), crop


def export_crop_to_source_crop(crop, source_width, source_height, export_width, export_height):
    scale_x = source_width / export_width if export_width else 1
    scale_y = source_height / export_height if export_height else 1
    return {
        "x": int(round(crop["x"] * scale_x)),
        "y": int(round(crop["y"] * scale_y)),
        "width": int(round(crop["width"] * scale_x)),
        "height": int(round(crop["height"] * scale_y)),
    }


def save_webp(image, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    export_image = downscale_image_for_export(image)
    temp_path = path.with_name(f".{path.name}.tmp")
    export_image.save(temp_path, PSD_BACKGROUND_EXPORT_TYPE, quality=PSD_BACKGROUND_EXPORT_QUALITY, method=6)
    width, height = verify_exported_webp_size(temp_path)
    temp_path.replace(path)
    return width, height


def downscale_image_for_export(image):
    scale = export_scale_for(image.width, image.height)
    export_image = image.convert("RGBA")
    if scale >= 1:
        return export_image
    return export_image.resize(scaled_dimension(image.width, image.height), resampling_filter())


def verify_exported_webp_size(path):
    with pillow_image().open(path) as exported:
        width, height = exported.size
    if max(width, height) > PSD_BACKGROUND_MAX_DIMENSION:
        raise RuntimeError(
            f"PSD background WebP export exceeded {PSD_BACKGROUND_MAX_DIMENSION}px: {path} is {width}x{height}"
        )
    return width, height


def export_scale_for(width, height):
    longest = max(int(width or 0), int(height or 0))
    if longest <= 0:
        return 1
    return min(1, PSD_BACKGROUND_MAX_DIMENSION / longest)


def scaled_dimension(width, height):
    scale = export_scale_for(width, height)
    return (max(1, round(width * scale)), max(1, round(height * scale)))


def resampling_filter():
    image_module = pillow_image()
    return getattr(image_module, "Resampling", image_module).LANCZOS


def psd_image():
    try:
        from psd_tools import PSDImage
    except ImportError as exc:
        raise RuntimeError("psd-tools is required to export PSD layers. Run `python3 -m pip install psd-tools Pillow`.") from exc

    return PSDImage


def pillow_image():
    try:
        from PIL import Image
    except ImportError as exc:
        raise RuntimeError("Pillow is required to export WebP images. Run `python3 -m pip install Pillow`.") from exc

    return Image
