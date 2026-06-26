#!/usr/bin/env python3
from argparse import ArgumentParser
from pathlib import Path

from PIL import Image
from psd_tools import PSDImage


PART_LAYER_NAMES = {
    "body",
    "head",
    "cape",
    "shield",
    "upper_arm_l",
    "lower_arm_l",
    "upper_arm_r",
    "lower_arm_r",
    "upper_leg_l",
    "lower_leg_l",
    "upper_leg_r",
    "lower_leg_r",
    "weapon",
}


def main():
    parser = ArgumentParser(description="Export character PSD layers into the matching character part PNG files.")
    parser.add_argument("--characters", default="assets/characters")
    parser.add_argument("--resize-to-existing", action="store_true", default=True)
    parser.add_argument("folders", nargs="*")
    args = parser.parse_args()

    characters_dir = Path(args.characters)
    folders = [characters_dir / name for name in args.folders] if args.folders else sorted(characters_dir.iterdir())
    exported = 0

    for folder in folders:
        if not folder.is_dir():
            continue
        psd_path = find_character_psd(folder)
        if not psd_path:
            continue
        exported += export_character_parts(psd_path, folder, resize_to_existing=args.resize_to_existing)

    print(f"exported {exported} part images")


def find_character_psd(folder):
    psds = sorted(folder.glob("*.psd"))
    if not psds:
        return None
    return next((path for path in psds if path.stem == folder.name), psds[0])


def export_character_parts(psd_path, folder, resize_to_existing=True):
    psd = PSDImage.open(psd_path)
    exported = 0

    for layer in psd.descendants():
        if layer.is_group() or layer.name not in PART_LAYER_NAMES or layer.width <= 0 or layer.height <= 0:
            continue

        output_path = folder / f"{layer.name}.png"
        image = layer.composite()
        if image is None:
            continue

        image = image.convert("RGBA")
        if resize_to_existing and output_path.exists():
            image = fit_to_existing_size(image, output_path)

        image.save(output_path)
        exported += 1
        print(f"{psd_path.name}: {layer.name} -> {output_path}")

    return exported


def fit_to_existing_size(image, output_path):
    target = Image.open(output_path)
    if image.size == target.size:
        return image
    return image.resize(target.size, Image.Resampling.LANCZOS)


if __name__ == "__main__":
    main()
