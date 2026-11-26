import json
from pathlib import Path
import unittest

from addon import PACKS, validate_ui


class UIValidationTests(unittest.TestCase):
    def test_rejects_unsupported_truncation_in_nested_record_templates(self):
        for setting in (True, False):
            ui = {"namespace": "jagsby_frontier", "record": {
                "type": "panel", "controls": [{"name": {
                    "type": "label", "text_truncate": setting}}]}}
            with self.subTest(setting=setting):
                with self.assertRaisesRegex(AssertionError, "text_truncate.*roads.json"):
                    validate_ui(ui, Path("roads.json"))

    def test_rejects_runtime_reported_precache_property_inside_grid_templates(self):
        for setting in (0, 1, False):
            ui = {"namespace": "jagsby_frontier", "rows": {
                "type": "stack_panel", "controls": [{"row0": {
                    "type": "grid", "grid_item_template": "jagsby_frontier.row",
                    "maximum_grid_items": 0, "precached_grid_item_count": setting}}]}}
            with self.subTest(setting=setting):
                with self.assertRaisesRegex(AssertionError, "precached_grid_item_count.*realm.json"):
                    validate_ui(ui, Path("realm.json"))

    def test_preserves_rejection_of_unsupported_panel_collection_scopes(self):
        with self.assertRaisesRegex(AssertionError, "collection_name.*panel"):
            validate_ui({"type": "panel", "collection_name": "form_buttons"}, Path("ui.json"))

    def test_only_direct_collection_children_can_be_indexed(self):
        record = {"type": "button", "collection_index": 4}
        scope = {"type": "stack_panel", "collection_name": "form_buttons",
                 "controls": [{"record": record}]}
        validate_ui(scope, Path("map.json"))
        record["controls"] = [{"idle": {"type": "panel", "controls": [
            {"art": {"type": "image", "collection_index": 4}}]}}]
        with self.assertRaisesRegex(AssertionError, "collection_index.*map.json"):
            validate_ui(scope, Path("map.json"))

    def test_optional_renderer_hooks_resolve_to_registered_frontier_controls(self):
        ui_root = PACKS / "resource/ui"
        hooks = json.loads((ui_root / "_global_variables.json").read_text())
        registrations = json.loads((ui_root / "_ui_defs.json").read_text())["ui_defs"]
        controls = {}
        for name in registrations:
            ui = json.loads((PACKS / "resource" / name).read_text())
            for key in ui:
                if key != "namespace":
                    controls[ui["namespace"] + "." + key.split("@")[0]] = ui[key]
        for key in ["$msfm_external_long_form", "$msfm_external_modal_form"]:
            with self.subTest(hook=key):
                self.assertIn(hooks[key], controls, "Adapter must name an actually registered renderer")
                self.assertEqual(controls[hooks[key]]["type"], "panel")

    def test_all_current_resource_ui_files_pass_the_packaging_guard(self):
        paths = list((PACKS / "resource/ui").rglob("*.json"))
        self.assertTrue(paths)
        for path in paths:
            with self.subTest(path=path):
                validate_ui(json.loads(path.read_text()), path)


if __name__ == "__main__":
    unittest.main()
