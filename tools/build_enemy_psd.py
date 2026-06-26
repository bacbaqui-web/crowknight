#!/usr/bin/env python3
from argparse import ArgumentParser
from pathlib import Path

from PIL import Image
from psd_tools import PSDImage


def main():
    parser = ArgumentParser(description="Build enemy PSDs from the player PSD layer layout.")
    parser.add_argument("--template", default="assets/characters/player/player.psd")
    parser.add_argument("--characters", default="assets/characters")
    parser.add_argument("--output-name", default="enemy.psd")
    parser.add_argument("folders", nargs="*", default=["enemy1", "enemy2", "enemy3", "enemy4"])
    args = parser.parse_args()

    template_path = Path(args.template)
    characters_dir = Path(args.characters)
    template = PSDImage.open(template_path)
    template_layers = [layer for layer in template.descendants() if not layer.is_group()]

    for folder in args.folders:
        folder_path = characters_dir / folder
        output_path = folder_path / args.output_name
        build_enemy_psd(template, template_layers, folder_path, output_path)
        print(f"wrote {output_path}")


def build_enemy_psd(template, template_layers, folder_path, output_path):
    psd = PSDImage.new("RGB", (template.width, template.height), color=0)

    for template_layer in template_layers:
        part_path = folder_path / f"{template_layer.name}.png"
        if not part_path.exists():
            continue

        layer_image = make_layer_image(part_path, template_layer.width, template_layer.height)
        layer = psd.create_pixel_layer(
            layer_image,
            name=template_layer.name,
            top=template_layer.top,
            left=template_layer.left,
            opacity=getattr(template_layer, "opacity", 255),
        )
        layer.visible = bool(template_layer.visible)
        psd.append(layer)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    psd.save(output_path)


def make_layer_image(source_path, width, height):
    source = Image.open(source_path).convert("RGBA")
    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    fitted = contain_image(source, width, height)
    x = (width - fitted.width) // 2
    y = (height - fitted.height) // 2
    canvas.alpha_composite(fitted, (x, y))
    return canvas


def contain_image(image, width, height):
    ratio = min(width / image.width, height / image.height)
    size = (max(1, round(image.width * ratio)), max(1, round(image.height * ratio)))
    return image.resize(size, Image.Resampling.LANCZOS)


if __name__ == "__main__":
    main()
