from pathlib import Path

from PIL import Image
from psd_tools import PSDImage


EFFECT_ASSET_PATHS = {
    "slash1": Path("assets/effects/attack/slash_1.png"),
    "slash2": Path("assets/effects/attack/slash_2.png"),
    "slash3": Path("assets/effects/attack/slash_3.png"),
}


def effect_asset_path(root, asset):
    relative = EFFECT_ASSET_PATHS.get(asset)
    if not relative:
        raise RuntimeError("Invalid effect asset")
    return (root / relative).resolve()


def effect_source_psd_path(root, asset):
    return effect_asset_path(root, asset).with_suffix(".psd")


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
