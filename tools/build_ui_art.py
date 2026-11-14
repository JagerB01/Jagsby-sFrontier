"""Author small pixel-art UI textures from shapes; no external image dependency."""
import struct
import zlib
from pathlib import Path

DEST = Path(__file__).resolve().parents[1] / "packs/resource/textures/ui/frontier"


class Canvas:
    def __init__(self, width, height, color):
        self.width, self.height = width, height
        self.channels = len(color)
        self.pixels = [[color for _ in range(width)] for _ in range(height)]

    def rect(self, x, y, width, height, color):
        if self.channels == 4 and len(color) == 3:
            color = (*color, 255)
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
        data = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", self.width, self.height, 8, 6 if self.channels == 4 else 2, 0, 0, 0))
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


def button_texture(width, height, state):
    """Draw at the actual control size to keep bevels sharp on small buttons."""
    selected = state.startswith("checked")
    hover = "hover" in state
    pressed = state == "pressed"
    name = f"button_{width}x{height}_{state}"
    c = Canvas(width, height, (0, 0, 0, 0))
    light = (218, 215, 198) if hover else (171, 172, 161)
    shadow = (57, 60, 59)
    c.bevel(1, 1, width - 2, height - 2, (113, 116, 109),
            shadow if pressed else light, light if pressed else shadow)
    edge = (203, 174, 110) if selected else (83, 87, 83)
    c.rect(2, 2, width - 4, height - 4, edge)
    base = 29 if pressed else (51 if hover else (43 if selected else 36))
    # A shallow curved highlight and fine grain suggest worn leather/metal,
    # without bright patterns behind the caption.
    for y in range(3, height - 3):
        shade = base + int(7 * (1 - (y - 3) / max(1, height - 7)))
        c.grain(3, y, width - 6, 1, (shade, shade + 2, shade + 2), amount=2)
    if not pressed:
        c.rect(4, 3, width - 8, 1, (88, 91, 86) if hover else (65, 69, 66))
    # Small engraved corner strokes leave the face and icon well quiet.
    gold = (225, 199, 138) if hover or selected else (156, 139, 99)
    for x, direction in [(4, 1), (width - 5, -1)]:
        for y, vertical in [(4, 1), (height - 5, -1)]:
            c.rect(min(x, x + direction * 3), y, 4, 1, gold)
            c.rect(x, min(y, y + vertical * 2), 1, 3, gold)
    c.save(name + ".png")
    return "frontier/" + name


def build():
    DEST.mkdir(parents=True, exist_ok=True)
    map_colors = {
        "unknown": (27, 29, 34), "grass": (98, 126, 68), "leaves": (53, 85, 49),
        "water": (62, 108, 151), "sand": (193, 171, 114), "stone": (118, 120, 115),
        "snow": (218, 225, 220), "wood": (117, 88, 58), "earth": (117, 101, 76),
        "lava": (200, 86, 38), "built": (166, 151, 129),
        "current": (218, 184, 104), "settlement": (210, 210, 193), "player": (248, 248, 239),
    }
    (DEST / "map").mkdir(exist_ok=True)
    for name, color in map_colors.items():
        c = Canvas(7, 7, color)
        if name in ["current", "settlement", "player"]:
            c.rect(1, 1, 5, 5, (29, 32, 34))
            if name == "player":
                c.rect(3, 2, 1, 3, color); c.rect(2, 3, 3, 1, color)
            else:
                c.rect(2, 3, 3, 2, color); c.rect(3, 2, 1, 1, color)
        c.save("map/" + name + ".png")
    Canvas(1, 1, (255, 255, 255)).save("solid.png")
    # Palette materials are generated at their native UI sizes so all screens
    # share neutral charcoal surfaces, aged silver trim and wheat highlights.
    for name, width, height, framed in [
        ("palette_leather", 364, 189, False),
        ("palette_panel", 294, 210, True),
        ("palette_button", 176, 56, True),
    ]:
        c = Canvas(width, height, (0, 0, 0, 0))
        inset = 2 if framed else 0
        c.grain(inset, inset, width - inset * 2, height - inset * 2, (39, 41, 42), amount=3)
        if framed:
            c.bevel(1, 1, width - 2, height - 2, (139, 139, 129), (192, 190, 173), (76, 78, 76))
            c.grain(3, 3, width - 6, height - 6, (39, 41, 42), amount=3)
            c.rect(5, 4, width - 10, 1, (91, 92, 85))
            for x in (5, width - 8):
                for y in (5, height - 8):
                    c.rect(x, y, 3, 3, (193, 163, 98))
                    c.rect(x, y, 1, 1, (231, 213, 164))
        c.save(name + ".png")
    # Charcoal/ink surfaces. The original silver-and-wheat ornament
    # is a separate transparent asset so its silhouette is not boxed in.
    c = Canvas(380, 240, (0, 0, 0, 0))
    c.rect(18, 30, 344, 197, (35, 37, 38))
    c.rect(18, 31, 344, 25, (47, 49, 49))
    c.rect(18, 55, 344, 1, (184, 146, 78))
    c.rect(103, 60, 1, 159, (150, 144, 121))
    c.rect(104, 59, 258, 161, (30, 32, 33))
    c.save("charter_frame.png")
    for name in ["overview", "research", "production", "realm", "information"]:
        for state in ["unchecked", "checked", "unchecked_hover", "checked_hover"]:
            selected = state.startswith("checked")
            hover = "hover" in state
            c = Canvas(92, 35, (35, 37, 38))
            rim = (215, 178, 89) if selected else (143, 143, 132)
            face = (70, 72, 69) if hover else ((57, 59, 56) if selected else (39, 41, 42))
            # Two-pixel clipped corners, single rim, almost flat face.
            c.rect(2, 1, 88, 33, rim)
            c.rect(1, 3, 90, 29, rim)
            c.rect(3, 2, 86, 31, face)
            c.rect(2, 4, 88, 27, face)
            c.rect(4, 3, 84, 1, (153, 151, 137) if hover else (105, 106, 98))
            if selected: c.rect(3, 7, 2, 21, (231, 187, 86))
            c.save(f"tab_{name}_{state}.png")
    # Charcoal research buttons with aged silver edges.
    for state, face in [("default", (39, 41, 42)), ("hover", (70, 72, 69)), ("pressed", (29, 31, 32))]:
        c = Canvas(122, 40, (30, 32, 33))
        c.rect(3, 1, 116, 38, (162, 157, 138))
        c.rect(1, 3, 120, 34, (162, 157, 138))
        c.rect(3, 2, 116, 36, face)
        c.rect(2, 4, 118, 32, face)
        c.rect(2, 2, 118, 1, (151, 149, 135))
        c.rect(38, 7, 1, 26, (139, 139, 129))
        c.save(f"research_button_{state}.png")
    print("Generated original pixel-art charter frame and sidebar textures.")


if __name__ == "__main__":
    build()
