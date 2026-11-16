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

    def test_preserves_rejection_of_unsupported_panel_collection_scopes(self):
        with self.assertRaisesRegex(AssertionError, "collection_name.*panel"):
            validate_ui({"type": "panel", "collection_name": "form_buttons"}, Path("ui.json"))

    def test_all_current_resource_ui_files_pass_the_packaging_guard(self):
        paths = list((PACKS / "resource/ui").rglob("*.json"))
        self.assertTrue(paths)
        for path in paths:
            with self.subTest(path=path):
                validate_ui(json.loads(path.read_text()), path)


if __name__ == "__main__":
    unittest.main()
