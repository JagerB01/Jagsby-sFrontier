"""Regenerate the committed province pin textures from the supplied icon.

Only asset regeneration uses Pillow. Normal add-on builds use the committed PNGs.
"""
from pathlib import Path

from PIL import Image

from build_settlement_map import ART_SIZE, CELL

TEXTURES = Path(__file__).resolve().parents[1] / "packs/resource/textures/ui/frontier"
TEXELS = 4


def build():
    with Image.open(TEXTURES / "poi_markers/province.png") as source:
        rgba = source.convert("RGBA")
    icon = rgba.crop(rgba.getbbox())
    destination = TEXTURES / "province_pins"
    destination.mkdir(exist_ok=True)
    idle_panel = (2 * CELL) * TEXELS
    hover_panel = (ART_SIZE + CELL) * TEXELS
    sizes = [(CELL, 0), (ART_SIZE, idle_panel)]
    icons = [
        icon.resize(tuple(round(value * size * TEXELS / rgba.width) for value in icon.size),
                    Image.Resampling.NEAREST)
        for size, _ in sizes
    ]
    for z in range(CELL):
        for x in range(CELL):
            atlas = Image.new("RGBA", (idle_panel + hover_panel, hover_panel))
            for sprite, (size, atlas_x) in zip(icons, sizes):
                # The first texel pair centers the artwork inside the target
                # UI pixel rather than on the boundary between two pixels.
                margin = size / 2 + 0.5
                left = atlas_x + round((x + margin) * TEXELS - sprite.width / 2)
                top = round((z + margin) * TEXELS - sprite.height / 2)
                atlas.paste(sprite, (left, top))
            atlas.save(destination / f"{x}_{z}.png", optimize=True)


if __name__ == "__main__":
    build()
