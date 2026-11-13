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
    c = Canvas(380, 240, (38, 30, 24))
    c.grain(5, 5, 370, 230, (87, 53, 28), 7)
    for y in range(5, 235, 12):
        c.rect(5, y, 370, 1, (49, 30, 18)); c.rect(5, y + 1, 370, 1, (119, 76, 39))
    # Hand-laid masonry strips and corner caps, with visible block seams.
    for y in [0, 232]:
        for x in range(0, 380, 24):
            c.bevel(x, y, min(23, 380 - x), 8, (102, 98, 95), (145, 138, 129), (53, 51, 52))
    for x in [0, 374]:
        for y in range(8, 232, 16):
            c.bevel(x, y, 6, 15, (94, 90, 89), (137, 129, 121), (49, 47, 48))
    for x in [0, 368]:
        for y in [0, 228]: c.bevel(x, y, 12, 12, (111, 106, 104), (162, 152, 141), (49, 47, 48))
    # Gilded crimson title ribbon; all actual text remains a live JSON UI label.
    c.bevel(13, 9, 354, 28, (220, 159, 44), (255, 218, 114), (116, 69, 16))
    c.bevel(15, 11, 350, 24, (119, 23, 20), (185, 54, 35), (64, 17, 16))
    for x in [18, 359]:
        for y in [14, 20, 26]: c.rect(x, y, 2, 2, (239, 192, 78))
    # Parchment page with dark inset and corner rivets.
    c.bevel(103, 41, 270, 190, (90, 56, 28), (154, 108, 57), (39, 26, 18))
    c.grain(106, 44, 264, 184, (229, 205, 157), 5)
    for x in [108, 365]:
        for y in [46, 223]: c.bevel(x, y, 3, 3, (183, 143, 83), (246, 223, 166), (130, 92, 45))
    c.bevel(8, 204, 90, 23, (142, 91, 36), (218, 168, 71), (49, 28, 17))
    c.grain(10, 206, 86, 19, (112, 26, 22))
    c.save("charter_frame.png")
    for name in ["overview", "research", "production", "stockpile"]:
        for state in ["unchecked", "checked", "unchecked_hover", "checked_hover"]:
            selected = state.startswith("checked")
            hover = "hover" in state
            c = Canvas(92, 35, (39, 25, 17))
            c.bevel(1, 1, 90, 33, (211, 155, 54) if selected else (123, 82, 38),
                    (255, 218, 104) if selected else (176, 127, 64), (56, 33, 16))
            c.bevel(3, 3, 86, 29, (132, 31, 24) if selected else (125 if hover else 106, 67, 34),
                    (192, 72, 44) if selected else (160, 106, 53), (62, 27, 18))
            for y in [9, 24]:
                c.rect(26, y, 59, 1, (146, 44, 28) if selected else (117, 73, 38))
            icon(c, name, 6, 9)
            c.save(f"tab_{name}_{state}.png")
    print("Generated original pixel-art charter frame and sidebar textures.")


if __name__ == "__main__":
    build()
