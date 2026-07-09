from pathlib import Path

from PIL import Image
from psd_tools import PSDImage


EFFECT_ASSET_PATHS = {
    "slash1": Path("assets/effects/attack/slash_1.png"),
    "slash2": Path("assets/effects/attack/slash_2.png"),
    "slash3": Path("assets/effects/attack/slash_3.png"),
}


def effect_asset_path(root, asset):
    relative = EFFECT_ASSET_PATHS.get(asset) or dynamic_effect_asset_path(asset)
    if not relative:
        raise RuntimeError("Invalid effect asset")
    return (root / relative).resolve()


def effect_source_psd_path(root, asset):
    return effect_asset_path(root, asset).with_suffix(".psd")


def dynamic_effect_asset_path(asset):
    parts = str(asset or "").split("/")
    if len(parts) == 1:
        image_key = parts[0]
        if not valid_dynamic_effect_image_key(image_key):
            return None
        return Path("assets/effects/custom") / f"{image_key}.png"
    if len(parts) == 2:
        actor_id, image_key = parts
        if not valid_effect_actor_id(actor_id) or not valid_dynamic_effect_image_key(image_key):
            return None
        return Path("assets/effects") / actor_id / f"{image_key}.png"
    return None


def valid_dynamic_effect_image_key(value):
    return str(value or "").startswith("effect_") and all(char.isalnum() or char in "_-" for char in value)


def valid_effect_actor_id(value):
    text = str(value or "")
    return bool(text) and all(char.isalnum() or char in "_-" for char in text)


def export_effect_asset(source_path, output_path):
    source_path = Path(source_path)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if source_path.suffix.lower() == ".psd":
        image = PSDImage.open(source_path).composite()
    else:
        image = Image.open(source_path)

    image.convert("RGBA").save(output_path)
    return {"ok": True, "output": str(output_path), "updatedAt": int(output_path.stat().st_mtime * 1000)}
