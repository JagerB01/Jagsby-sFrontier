"""Validate and reproducibly package the imported Bedrock prototype (stdlib only)."""
import argparse
import io
import json
from pathlib import Path
import struct
import subprocess
import uuid
import zipfile
from build_charter_ui import build as build_charter_ui
from build_villager_bridge import build as build_villager_bridge

ROOT = Path(__file__).resolve().parents[1]
PACKS = ROOT / "packs"


def validate_ui(value, path):
    if isinstance(value, dict):
        assert "precached_grid_item_count" not in value, f"precached_grid_item_count is rejected by the target Bedrock runtime: {path}"
        assert "text_truncate" not in value, f"text_truncate is unsupported in Bedrock JSON UI: {path}"
        assert not (value.get("type") == "panel" and "collection_name" in value), f"collection_name is unsupported on panel: {path}"
        for child in value.values():
            validate_ui(child, path)
    elif isinstance(value, list):
        for child in value:
            validate_ui(child, path)


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
                data = json.loads(path.read_text())
                if path.is_relative_to(PACKS / "resource/ui"):
                    validate_ui(data, path)
            if path.suffix == ".png":
                data = path.read_bytes()
                assert data[:8] == b"\x89PNG\r\n\x1a\n", f"Invalid PNG: {path}"
                width, height = struct.unpack(">II", data[16:24])
                assert width > 0 and height > 0
                if path.name == "pack_icon.png":
                    assert (width, height) == (256, 256), "Pack icons must be 256x256"
            if path.suffix == ".js":
                subprocess.run(["node", "--input-type=module", "--check"],
                               input=path.read_bytes(), check=True)
        for module in manifest["modules"]:
            if module["type"] == "script":
                assert (base / module["entry"]).is_file(), "Missing script entry"
    assert "pbr" in manifests["resource"].get("capabilities", []), "Resource pack must declare Vibrant Visuals compatibility"
    resource_ui = PACKS / "resource/ui"
    assert not (resource_ui / "hud_screen.json").exists(), "Frontier must not override the gameplay HUD"
    registration = json.loads((resource_ui / "_ui_defs.json").read_text())
    assert registration["ui_defs"] == ["ui/jagsby_frontier/charter.json"], "Register Frontier's custom renderer"
    charter_ui = json.loads((resource_ui / "jagsby_frontier/charter.json").read_text())
    assert charter_ui["namespace"] == "jagsby_frontier"
    form_ui = json.loads((resource_ui / "server_form.json").read_text())
    assert form_ui == {"namespace": "server_form", "main_screen_content/server_form_factory": {
        "control_ids": {"long_form": "@jagsby_frontier.jf_router", "custom_form": "@jagsby_frontier.jf_modal_router"}
    }}, "Keep the native entry hook paired with the registered Frontier renderer"
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
    build_charter_ui()
    build_villager_bridge()
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
