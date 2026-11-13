"""Generate the server-controller trade-rank bridge exercised by the probe."""
import json
from pathlib import Path
from build_trade_rank_probe import probe_entity, probe_controller

ROOT = Path(__file__).resolve().parents[1]
PREFIX = "jagsby_frontier:"
CONTROLLER = "controller.animation.jagsby_frontier.trade_rank"


def build():
    destination = ROOT / "packs/behavior"
    (destination / "entities").mkdir(exist_ok=True)
    (destination / "animation_controllers").mkdir(exist_ok=True)
    for name in ["villager", "villager_v2"]:
        source = json.loads((ROOT / f"tools/reference/vanilla-1.26.0-{name}.json").read_text())
        entity = probe_entity(source, prefix=PREFIX, controller=CONTROLLER,
                              animation="frontier_trade_rank", tier_count=5)
        (destination / f"entities/{name}.json").write_text(json.dumps(entity, indent=2) + "\n")
    controller = probe_controller(prefix=PREFIX, controller=CONTROLLER, tier_count=5)
    (destination / "animation_controllers/frontier_trade_rank.json").write_text(json.dumps(controller, indent=2) + "\n")
    print("Generated on-demand server-controller trade-rank bridge.")


if __name__ == "__main__":
    build()
