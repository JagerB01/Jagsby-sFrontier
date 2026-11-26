"""Resize Frontier's landmark sprites for the map tooltip font page."""
import json
from pathlib import Path
import subprocess

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RESOURCE = ROOT / "packs/resource"


def build():
    output = subprocess.check_output([
        "node", "--input-type=module", "-e",
        "import {MAP_POI_GLYPHS} from './packs/behavior/scripts/settlement-map.js';"
        "console.log(JSON.stringify(MAP_POI_GLYPHS));",
    ], cwd=ROOT, text=True)
    glyphs = json.loads(output)
    page = Image.new("RGBA", (256, 256))
    for texture, character in glyphs.items():
        codepoint = ord(character)
        assert codepoint >> 8 == 0xF7
        with Image.open(RESOURCE / f"{texture}.png") as source:
            icon = source.convert("RGBA")
        icon = icon.crop(icon.getbbox())
        icon.thumbnail((14, 14), Image.Resampling.NEAREST)
        x = (codepoint & 15) * 16 + (16 - icon.width) // 2
        y = ((codepoint >> 4) & 15) * 16 + (16 - icon.height) // 2
        page.paste(icon, (x, y))
    directory = RESOURCE / "font"
    directory.mkdir(exist_ok=True)
    page.save(directory / "glyph_F7.png", optimize=True)


if __name__ == "__main__":
    build()
