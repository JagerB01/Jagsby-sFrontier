"""Author small pixel-art UI textures from shapes; no external image dependency."""
import struct
import zlib
from pathlib import Path

DEST = Path(__file__).resolve().parents[1] / "packs/resource/textures/ui/frontier"


class Canvas:
    def __init__(self, width, height, color):
        self.width, self.height = width, height
        self.pixels = [[color for _ in range(width)] for _ in range(height)]

    def rect(self, x, y, width, height, color):
        for row in range(max(0, y), min(self.height, y + height)):
            for col in range(max(0, x), min(self.width, x + width)):
                self.pixels[row][col] = color

    def grain(self, x, y, width, height, base, amount=5):
        for row in range(y, y + height):
            for col in range(x, x + width):
                noise = ((col * 37 + row * 73 + (col * row) % 41) % (2 * amount + 1)) - amount
                self.rect(col, row, 1, 1, tuple(max(0, min(255, c + noise)) for c in base))

    def bevel(self, x, y, width, height, base, highlight, shadow):
        self.grain(x, y, width, height, base)
        self.rect(x, y, width, 1, highlight)
        self.rect(x, y, 1, height, highlight)
        self.rect(x, y + height - 1, width, 1, shadow)
        self.rect(x + width - 1, y, 1, height, shadow)

    def save(self, name):
        def chunk(kind, data):
            return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xffffffff)
        raw = b"".join(b"\0" + bytes(c for pixel in row for c in pixel) for row in self.pixels)
        data = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", self.width, self.height, 8, 2, 0, 0, 0))
        data += chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
        (DEST / name).write_bytes(data)


def icon(c, name, x, y):
    gold, dark, paper = (229, 177, 65), (53, 30, 17), (235, 210, 153)
    if name == "overview":
        c.rect(x + 2, y, 11, 16, dark); c.rect(x + 3, y + 1, 9, 14, paper)
        c.rect(x, y, 14, 3, (170, 124, 66)); c.rect(x, y + 14, 12, 3, (183, 136, 72))
        for dy in [5, 8, 11]: c.rect(x + 4, y + dy, 6, 1, (126, 91, 48))
    elif name == "research":
        c.rect(x, y + 2, 18, 14, dark); c.rect(x + 1, y + 1, 7, 13, paper)
        c.rect(x + 10, y + 1, 7, 13, paper); c.rect(x + 8, y + 3, 2, 13, (164, 113, 55))
        for dy in [4, 7, 10]:
            c.rect(x + 2, y + dy, 5, 1, (163, 125, 70)); c.rect(x + 11, y + dy, 5, 1, (163, 125, 70))
    else:
        c.bevel(x, y + 2, 17, 14, (149, 94, 36), gold, dark)
        c.rect(x + 2, y + 4, 13, 10, (114, 72, 32))
        if name == "stockpile":
            c.rect(x, y + 7, 17, 2, dark); c.rect(x + 7, y + 6, 3, 5, gold)
            c.rect(x + 1, y + 2, 2, 14, (76, 68, 57)); c.rect(x + 14, y + 2, 2, 14, (76, 68, 57))
        else:
            for dx in [5, 10]: c.rect(x + dx, y + 2, 1, 14, dark)
            c.rect(x, y + 7, 17, 1, dark)


def build():
    DEST.mkdir(parents=True, exist_ok=True)
    Canvas(1, 1, (255, 255, 255)).save("solid.png")
    # Quiet charcoal cabinet with a narrow, continuous brass frame.
    # No masonry, wood planks, nested gold frames or parchment noise.
    c = Canvas(380, 240, (26, 29, 29))
    c.rect(2, 1, 376, 238, (69, 68, 57))
    c.rect(1, 3, 378, 234, (69, 68, 57))
    c.rect(3, 2, 374, 236, (151, 139, 104))
    c.rect(2, 4, 376, 232, (151, 139, 104))
    c.rect(4, 4, 372, 232, (34, 38, 38))
    c.rect(6, 6, 368, 228, (43, 47, 46))
    c.rect(6, 6, 368, 1, (91, 91, 75))
    for x in [5, 372]:
        for y in [5, 232]:
            c.rect(x, y, 3, 3, (90, 79, 55))
            c.rect(x, y, 2, 1, (190, 170, 115))
    # Shallow crimson header band, bounded by two fine rules.
    c.rect(13, 10, 354, 26, (97, 27, 28))
    c.rect(13, 10, 354, 1, (159, 81, 58))
    c.rect(13, 35, 354, 1, (109, 97, 69))
    c.rect(14, 11, 2, 24, (124, 45, 39))
    # Main page and sidebar share one surface; a hairline separates them.
    c.rect(103, 45, 1, 181, (83, 84, 70))
    c.rect(108, 44, 260, 184, (38, 42, 41))
    c.save("charter_frame.png")
    for name in ["overview", "research", "production", "realm"]:
        for state in ["unchecked", "checked", "unchecked_hover", "checked_hover"]:
            selected = state.startswith("checked")
            hover = "hover" in state
            c = Canvas(92, 35, (43, 47, 46))
            rim = (181, 155, 99) if selected else (99, 83, 66)
            face = (128, 43, 40) if hover else ((105, 32, 32) if selected else (79, 32, 33))
            # Two-pixel clipped corners, single rim, almost flat face.
            c.rect(2, 1, 88, 33, rim)
            c.rect(1, 3, 90, 29, rim)
            c.rect(3, 2, 86, 31, face)
            c.rect(2, 4, 88, 27, face)
            c.rect(4, 3, 84, 1, (155, 71, 56) if hover else (124, 53, 48))
            if selected: c.rect(3, 7, 2, 21, (211, 180, 112))
            if name == "realm":
                c.bevel(6, 8, 17, 18, (213, 183, 124), (244, 217, 155), (91, 57, 29))
                c.rect(14, 10, 1, 14, (155, 110, 56))
                c.rect(8, 14, 12, 1, (155, 110, 56))
                c.rect(10, 17, 3, 3, (99, 125, 57))
                c.rect(17, 20, 3, 3, (147, 48, 35))
            c.save(f"tab_{name}_{state}.png")
    # Crimson research buttons with a single restrained gold edge.
    for state, face in [("default", (89, 32, 33)), ("hover", (126, 45, 41)), ("pressed", (69, 26, 28))]:
        c = Canvas(122, 40, (38, 42, 41))
        c.rect(3, 1, 116, 38, (133, 111, 76))
        c.rect(1, 3, 120, 34, (133, 111, 76))
        c.rect(3, 2, 116, 36, face)
        c.rect(2, 4, 118, 32, face)
        c.rect(2, 2, 118, 1, (143, 62, 51))
        c.rect(38, 7, 1, 26, (139, 88, 65))
        c.save(f"research_button_{state}.png")
    print("Generated original pixel-art charter frame and sidebar textures.")


if __name__ == "__main__":
    build()
