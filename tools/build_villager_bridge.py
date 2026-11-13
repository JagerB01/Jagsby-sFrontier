"""Add an on-demand trade-tier property bridge to pinned vanilla villagers."""
import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def build():
    destination = ROOT / "packs/behavior/entities"
    destination.mkdir(exist_ok=True)
    for name in ["villager", "villager_v2"]:
        source = ROOT / f"tools/reference/vanilla-1.26.0-{name}.json"
        data = json.loads(source.read_text())
        result = copy.deepcopy(data)
        entity = result["minecraft:entity"]
        entity["description"].setdefault("properties", {})["jagsby_frontier:trade_tier"] = {
            "type": "int", "range": [-1, 4], "default": -1, "client_sync": False,
        }
        entity.setdefault("events", {})["jagsby_frontier:sample_trade_tier"] = {
            "set_property": {"jagsby_frontier:trade_tier": "math.clamp(query.trade_tier, 0, 4)"},
        }
        (destination / f"{name}.json").write_text(json.dumps(result, indent=2) + "\n")
    print("Generated event-driven vanilla villager trade-tier bridges.")


if __name__ == "__main__":
    build()
