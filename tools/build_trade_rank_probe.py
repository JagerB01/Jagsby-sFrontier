"""Build an isolated, UNVERIFIED server-animation trade-tier diagnostic pack."""
import copy
import json
from pathlib import Path
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "tools/probes/trade_rank"
PREFIX = "jagsby_frontier_probe:"
CONTROLLER = "controller.animation.jagsby_frontier_probe.trade_rank"


def probe_entity(baseline, prefix=PREFIX, controller=CONTROLLER, animation="frontier_rank_probe", tier_count=6):
    data = copy.deepcopy(baseline)
    entity = data["minecraft:entity"]
    description = entity["description"]
    description.setdefault("properties", {}).update({
        prefix + "requested": {"type": "bool", "default": False},
        prefix + "ready": {"type": "bool", "default": False},
        prefix + "raw_rank": {"type": "int", "range": [-1, tier_count - 1], "default": -1},
    })
    description.setdefault("animations", {})[animation] = controller
    description.setdefault("scripts", {}).setdefault("animate", []).append(animation)
    events = entity.setdefault("events", {})
    events[prefix + "request"] = {"set_property": {
        prefix + "requested": True, prefix + "ready": False, prefix + "raw_rank": -1,
    }}
    events[prefix + "reset"] = {"set_property": {prefix + "requested": False}}
    for tier in range(tier_count):
        events[prefix + f"result_{tier}"] = {"set_property": {
            prefix + "requested": False, prefix + "ready": True, prefix + "raw_rank": tier,
        }}
    return data


def probe_controller(prefix=PREFIX, controller=CONTROLLER, tier_count=6):
    states = {
        "default": {"transitions": [{"requested": f"query.property('{prefix}requested')"}]},
        "requested": {"transitions": [
            {f"raw_{tier}": f"query.max_trade_tier > 0 && query.trade_tier == {tier}"}
            for tier in range(tier_count)
        ] + [{"default": f"!query.property('{prefix}requested')"}]},
    }
    for tier in range(tier_count):
        states[f"raw_{tier}"] = {
            "on_entry": [f"@s {prefix}result_{tier}"],
            "transitions": [{"default": f"!query.property('{prefix}requested')"}],
        }
    return {"format_version": "1.10.0", "animation_controllers": {
        controller: {"initial_state": "default", "states": states},
    }}


def build():
    entries = [("manifest.json", (SOURCE / "manifest.json").read_bytes()),
               ("scripts/main.js", (SOURCE / "scripts/main.js").read_bytes()),
               ("pack_icon.png", (ROOT / "packs/behavior/pack_icon.png").read_bytes())]
    subprocess.run(["node", "--input-type=module", "--check"], input=entries[1][1], check=True)
    for name in ["villager", "villager_v2"]:
        baseline = json.loads((ROOT / f"tools/reference/vanilla-1.26.0-{name}.json").read_text())
        entries.append((f"entities/{name}.json", json.dumps(probe_entity(baseline), indent=2).encode()))
    entries.append(("animation_controllers/frontier_rank_probe.json",
                    json.dumps(probe_controller(), indent=2).encode()))
    output = ROOT / "downloads/Jagsbys_Frontier_Trade_Rank_Probe_0.0.1.mcpack"
    with zipfile.ZipFile(output, "w") as archive:
        for name, content in sorted(entries):
            info = zipfile.ZipInfo(name, date_time=(2020, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, content)
    print(f"Built UNVERIFIED diagnostic pack: {output}")


if __name__ == "__main__":
    build()
