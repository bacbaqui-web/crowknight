#!/usr/bin/env python3
import json
import time
from pathlib import Path


def export_psd_preview(psd_path, output_path, manifest_path, layer_output_dir=None):
    psd = psd_image().open(psd_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)

    preview = psd.composite()
    save_webp(preview, output_path)

    layers = export_psd_layers(psd, layer_output_dir, manifest_path.parent)
    updated_at = int(time.time() * 1000)
    manifest = {
        "source": str(psd_path),
        "preview": output_path.name,
        "mimeType": "image/webp",
        "width": psd.width,
        "height": psd.height,
        "layers": layers,
        "updatedAt": updated_at,
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return manifest


def export_psd_layers(psd, layer_output_dir, runtime_dir):
    if not layer_output_dir:
        return []

    layer_output_dir.mkdir(parents=True, exist_ok=True)
    layers = []
    for index, layer in enumerate(flatten_layers(psd), start=1):
        layer_id = stable_layer_id(layer, index)
        output_path = layer_output_dir / f"{layer_id}.webp"
        image = layer.composite()
        if image is None:
            continue

        canvas = transparent_canvas(psd.width, psd.height)
        canvas.alpha_composite(image.convert("RGBA"), (max(0, layer.left), max(0, layer.top)))
        save_webp(canvas, output_path)

        layers.append(
            {
                "id": layer_id,
                "sourceId": valid_layer_source_id(layer, index),
                "rowId": index,
                "name": layer.name or f"레이어 {index}",
                "visible": bool(layer.visible),
                "sourceOffsetX": int(layer.left or 0),
                "sourceOffsetY": int(layer.top or 0),
                "offsetX": 0,
                "offsetY": 0,
                "opacity": clamp_opacity(getattr(layer, "opacity", 255)),
                "image": output_path.relative_to(runtime_dir).as_posix(),
            }
        )

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


def save_webp(image, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGBA").save(path, "WEBP", lossless=True, quality=100, method=6)


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
