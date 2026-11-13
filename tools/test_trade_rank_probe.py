import json
from pathlib import Path
import unittest

from build_trade_rank_probe import CONTROLLER, PREFIX, probe_controller, probe_entity

ROOT = Path(__file__).resolve().parents[1]


class TradeRankProbeTests(unittest.TestCase):
    def test_trade_queries_are_only_in_requested_controller_state(self):
        states = probe_controller()["animation_controllers"][CONTROLLER]["states"]
        for name, state in states.items():
            text = json.dumps(state)
            if name == "requested":
                self.assertIn("query.trade_tier", text)
                self.assertIn("query.max_trade_tier > 0", text)
            else:
                self.assertNotIn("query.trade_tier", text)
        self.assertEqual(len(states["requested"]["transitions"]), 7)

    def test_added_events_only_write_literal_values(self):
        baseline = json.loads((ROOT / "tools/reference/vanilla-1.26.0-villager_v2.json").read_text())
        entity = probe_entity(baseline)["minecraft:entity"]
        for name, event in entity["events"].items():
            if name.startswith(PREFIX):
                for value in event["set_property"].values():
                    self.assertIsInstance(value, (int, bool))

    def test_vanilla_ai_trades_and_existing_events_are_preserved(self):
        for name in ["villager", "villager_v2"]:
            baseline = json.loads((ROOT / f"tools/reference/vanilla-1.26.0-{name}.json").read_text())["minecraft:entity"]
            entity = probe_entity({"minecraft:entity": baseline})["minecraft:entity"]
            for key in ["component_groups", "components"]:
                self.assertEqual(entity[key], baseline[key])
            for name, event in baseline["events"].items():
                self.assertEqual(entity["events"][name], event)
            for name, value in baseline["description"].items():
                self.assertEqual(entity["description"][name], value)


if __name__ == "__main__":
    unittest.main()
