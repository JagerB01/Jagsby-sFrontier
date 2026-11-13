"""Validate and reproducibly package the imported Bedrock prototype (stdlib only)."""
import argparse
import io
import json
from pathlib import Path
import struct
import subprocess
import uuid
import zipfile

ROOT = Path(__file__).resolve().parents[1]
PACKS = ROOT / "packs"


def validate():
    identifiers = set()
    manifests = {}
    files = 0
    for kind in ("behavior", "resource"):
        base = PACKS / kind
        manifest = json.loads((base / "manifest.json").read_text())
        manifests[kind] = manifest
        for entry in [manifest["header"], *manifest["modules"]]:
            identifier = str(uuid.UUID(entry["uuid"]))
            assert identifier not in identifiers, f"Duplicate UUID: {identifier}"
            identifiers.add(identifier)
        for path in sorted(base.rglob("*")):
            if not path.is_file():
                continue
            files += 1
            if path.suffix == ".json":
                json.loads(path.read_text())
            if path.suffix == ".png":
                data = path.read_bytes()
                assert data[:8] == b"\x89PNG\r\n\x1a\n", f"Invalid PNG: {path}"
                width, height = struct.unpack(">II", data[16:24])
                assert width > 0 and height > 0
                if path.name == "pack_icon.png":
                    assert (width, height) == (64, 64), "Pack icons must be 64x64"
            if path.suffix == ".js":
                subprocess.run(["node", "--input-type=module", "--check"],
                               input=path.read_bytes(), check=True)
        for module in manifest["modules"]:
            if module["type"] == "script":
                assert (base / module["entry"]).is_file(), "Missing script entry"
    resource = manifests["resource"]["header"]
    assert any(d.get("uuid") == resource["uuid"] and
               d.get("version") == resource["version"]
               for d in manifests["behavior"]["dependencies"]), "Pack dependency mismatch"
    block = json.loads((PACKS / "behavior/blocks/village_charter.json").read_text())["minecraft:block"]
    geometry = json.loads((PACKS / "resource/models/blocks/village_charter.geo.json").read_text())
    assert block["components"]["minecraft:geometry"] in {
        g["description"]["identifier"] for g in geometry["minecraft:geometry"]}
    atlas = json.loads((PACKS / "resource/textures/terrain_texture.json").read_text())["texture_data"]
    for material in block["components"]["minecraft:material_instances"].values():
        texture = atlas[material["texture"]]["textures"]
        assert (PACKS / "resource" / (texture + ".png")).is_file()
    print(f"Validated {files} pack files: JSON, script syntax, UUIDs, icons, entry point, pack and block asset references.")
    print("Static validation only; Minecraft API behavior, JSON UI rendering and Realm multiplayer require in-game tests.")


def archive(entries):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as out:
        for name, content in sorted(entries):
            info = zipfile.ZipInfo(name, date_time=(2020, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            out.writestr(info, content)
    return buffer.getvalue()


def build():
    validate()
    entries = []
    for kind, suffix in (("behavior", "BP"), ("resource", "RP")):
        base = PACKS / kind
        content = archive([(p.relative_to(base).as_posix(), p.read_bytes())
                           for p in base.rglob("*") if p.is_file()])
        entries.append((f"Jagsbys_Frontier_{suffix}.mcpack", content))
    version = ".".join(map(str, json.loads((PACKS / "behavior/manifest.json").read_text())["header"]["version"]))
    destination = ROOT / f"dist/Jagsbys_Frontier_v{version}.mcaddon"
    destination.parent.mkdir(exist_ok=True)
    destination.write_bytes(archive(entries))
    print(f"Built {destination}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("validate", "build"))
    args = parser.parse_args()
    {"validate": validate, "build": build}[args.command]()
