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
    for name in ["overview", "research", "production", "realm"]:
        for state in ["unchecked", "checked", "unchecked_hover", "checked_hover"]:
            selected = state.startswith("checked")
            hover = "hover" in state
            c = Canvas(92, 35, (74, 21, 19))
            rim = (235, 188, 87) if selected else (170, 113, 48)
            face = (155, 39, 29) if hover else ((133, 29, 24) if selected else (108, 25, 23))
            c.rect(1, 1, 90, 33, rim)
            c.grain(2, 2, 88, 31, face, 2)
            c.rect(2, 2, 88, 1, (188, 66, 43))
            if selected: c.rect(3, 5, 2, 25, (244, 198, 92))
            if name == "realm":
                c.bevel(6, 8, 17, 18, (213, 183, 124), (244, 217, 155), (91, 57, 29))
                c.rect(14, 10, 1, 14, (155, 110, 56))
                c.rect(8, 14, 12, 1, (155, 110, 56))
                c.rect(10, 17, 3, 3, (99, 125, 57))
                c.rect(17, 20, 3, 3, (147, 48, 35))
            c.save(f"tab_{name}_{state}.png")
    # Crimson research buttons with a single restrained gold edge.
    for state, face in [("default", (111, 25, 22)), ("hover", (153, 39, 29)), ("pressed", (84, 19, 19))]:
        c = Canvas(122, 40, (74, 21, 19))
        c.rect(1, 1, 120, 38, (202, 151, 68))
        c.grain(2, 2, 118, 36, face, 2)
        c.rect(2, 2, 118, 1, (182, 65, 42))
        c.rect(38, 7, 1, 26, (171, 92, 48))
        c.save(f"research_button_{state}.png")
    print("Generated original pixel-art charter frame and sidebar textures.")


if __name__ == "__main__":
    build()
