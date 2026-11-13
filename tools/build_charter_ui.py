"""Build the standalone Frontier dashboard and its minimal Bedrock entry hook."""
import copy
import json
from pathlib import Path
from build_ui_art import build as build_ui_art

ROOT = Path(__file__).resolve().parents[1]
RP = ROOT / "packs/resource"
DATA = {
    "overview": 0, "biomes": 1, "census": 2, "civilization": 3,
    "efficiency": 4, "hearth": 5, "biome": 6, "frontier": 7,
    "capacity": 8, "development": 9, "storage": 10,
    "production": 11, "stockpile": 12, "resources": 13,
}
ACTIONS = {name: i + 14 for i, name in enumerate([
    "efficiency", "hearth", "biome", "frontier", "capacity", "development",
    "storage", "scan", "selectBiome", "collect", "rename",
])}
TABS = ["Overview", "Research", "Production", "Stockpile"]


def control(name, definition):
    return {name: definition}


def view(expression, target="#visible", source=None):
    result = {"binding_type": "view", "source_property_name": expression,
              "target_property_name": target}
    if source:
        result["source_control_name"] = source
    return result


def condition(expression, binding="#title_text"):
    return [{"binding_name": binding, "binding_type": "none"},
            view(expression), view(expression, "#enabled")]


def image(texture, size, offset=(0, 0), layer=0, color=None):
    result = {"type": "image", "texture": "textures/ui/" + texture,
              "size": size, "offset": list(offset), "keep_ratio": False,
              "bilinear": False, "anchor_from": "top_left",
              "anchor_to": "top_left", "layer": layer}
    if color:
        result["color"] = color
    return result


def label(text, size, offset=(0, 0), color=(0.20, 0.12, 0.055), scale=0.8):
    return {"type": "label", "text": text, "size": size, "offset": list(offset),
            "anchor_from": "top_left", "anchor_to": "top_left", "layer": 8,
            "font_type": "default", "font_scale_factor": scale,
            "color": list(color), "shadow": False}


def collection_bindings():
    return [{"binding_type": "collection_details", "binding_collection_name": "form_buttons"},
            {"binding_name": "#form_button_text", "binding_name_override": "#text",
             "binding_type": "collection", "binding_collection_name": "form_buttons"}]


def record(name, index, height):
    if height is None:
        text = label("#text", [240, "default"], (7, 0))
        text["bindings"] = collection_bindings()
        text["collection_index"] = index
        return control(name, {"type": "stack_panel", "orientation": "vertical",
            "size": [254, "100%c"], "collection_name": "form_buttons",
            "controls": [control("text", text), control("spacing", {"type": "panel", "size": [254, 8]})]})
    text = label("#text", [240, height - 8], (7, 4))
    text["bindings"] = collection_bindings()
    text["collection_index"] = index
    return control(name, {"type": "panel", "size": [254, height],
        "collection_name": "form_buttons",
        "controls": [control("paper", image("frontier/solid", [254, height - 2],
                                             color=[0.84, 0.69, 0.44])),
                     control("text", text)]})


def action(name, index, caption):
    states = []
    for state, texture, tint in [("default", "frontier_wood", None),
                                  ("hover", "frontier_red", None),
                                  ("pressed", "frontier_red", [0.7, 0.6, 0.5])]:
        states.append(control(state, {"type": "panel", "size": [254, 21], "controls": [
            control("gold", image("frontier/solid", [254, 21], color=[0.88, 0.62, 0.18])),
            control("wood", image(texture, [252, 19], (1, 1), 1, tint)),
            control("caption", label(caption, [242, 12], (6, 4), (1, 0.91, 0.65))),
        ]}))
    return control(name, {"type": "stack_panel", "orientation": "vertical",
        "size": [254, 24], "collection_name": "form_buttons",
        "controls": [control("purchase@common.button", {
            "size": [254, 21], "$pressed_button_name": "button.form_button_click",
            "collection_index": index,
            "focus_enabled": True, "hover_enabled": True,
            "button_mappings": [
                {"from_button_id": "button.menu_select", "to_button_id": "button.form_button_click", "mapping_type": "pressed"},
                {"from_button_id": "button.menu_ok", "to_button_id": "button.form_button_click", "mapping_type": "focused"},
            ],
            "bindings": [{"binding_type": "collection_details", "binding_collection_name": "form_buttons"}],
            "controls": states,
        })]})


def heading(text):
    return control("heading_" + text.replace(" ", "_"), {
        "type": "panel", "size": [254, 19], "controls": [
            control("ribbon", image("frontier/solid", [254, 17], color=[0.71, 0.50, 0.24])),
            control("caption", label(text, [244, 12], (5, 3))),
        ]})


def tab(name, index):
    lower = name.lower()
    states = []
    for state in ["unchecked", "checked", "unchecked_hover", "checked_hover"]:
        selected = state.startswith("checked")
        states.append(control(state, {"type": "panel", "size": [92, 35], "controls": [
            control("face", image(f"frontier/tab_{lower}_{state}", [92, 35], layer=1)),
            control("caption", label(name, [63, 13], (26, 12), (1, 0.93, 0.73), 0.7)),
        ]}))
    marker = f"[JF:tab:{lower}]"
    return control("jf_tab_" + lower, {
        "type": "toggle", "size": [92, 35], "offset": [6, 48 + 39 * index],
        "anchor_from": "top_left", "anchor_to": "top_left", "layer": 10,
        "radio_toggle_group": True, "toggle_name": "jagsby_frontier_tabs",
        "toggle_group_forced_index": index, "toggle_group_default_selected": 0,
        "toggle_default_state": index == 0, "reset_on_focus_lost": False,
        "focus_enabled": True, "hover_enabled": True,
        "focus_identifier": "jf_tab_focus_" + lower,
        "focus_change_up": "jf_tab_focus_" + TABS[max(0, index - 1)].lower(),
        "focus_change_down": "jf_tab_focus_" + TABS[min(3, index + 1)].lower(),
        "toggle_on_button": "toggle.toggle_on", "toggle_off_button": "toggle.toggle_off",
        "property_bag": {"#toggle_state": index == 0},
        "bindings": [
            {"binding_name": "#toggle_state", "binding_type": "none", "binding_condition": "always"},
            {"binding_name": "#form_text", "binding_type": "none"},
            {"binding_name": f"(not ((#form_text - '{marker}') = #form_text))",
             "binding_name_override": "#toggle_state", "binding_type": "none", "binding_condition": "once"},
        ],
        "button_mappings": [
            {"from_button_id": "button.menu_select", "to_button_id": "button.menu_select", "mapping_type": "pressed"},
            {"from_button_id": "button.menu_ok", "to_button_id": "button.menu_ok", "mapping_type": "focused"},
        ],
        "unchecked_control": "unchecked", "checked_control": "checked",
        "unchecked_hover_control": "unchecked_hover", "checked_hover_control": "checked_hover",
        "tts_name": name, "controls": states,
    })


def overview_value(name, index, offset, size, scale=0.9):
    text = label("#text", size, color=(0.20, 0.12, 0.055), scale=scale)
    text["bindings"] = collection_bindings()
    text["collection_index"] = index
    return control(name, {"type": "panel", "anchor_from": "top_left", "anchor_to": "top_left",
        "offset": offset, "size": size, "collection_name": "form_buttons",
        "clips_children": True, "controls": [control("value", text)]})


def research_tab(scope, index):
    toggle = tab("Research", index)["jf_tab_research"]
    toggle.update({"size": [124, 23], "offset": [index * 129, 0],
        "toggle_name": "jagsby_frontier_research_tabs", "tts_name": scope.title(),
        "focus_identifier": "jf_research_focus_" + scope,
        "focus_change_left": "jf_research_focus_global",
        "focus_change_right": "jf_research_focus_local"})
    toggle.pop("focus_change_up", None)
    toggle.pop("focus_change_down", None)
    for binding in toggle["bindings"]:
        if "binding_name" in binding:
            binding["binding_name"] = binding["binding_name"].replace("[JF:tab:research]", f"[JF:research:{scope}]")
    for state in toggle["controls"]:
        panel = next(iter(state.values()))
        panel["size"] = [124, 23]
        panel["controls"][0]["face"]["size"] = [124, 23]
        caption = panel["controls"][1]["caption"]
        caption.update({"text": scope.title(), "size": [124, 13], "offset": [0, 6], "text_alignment": "center"})
    return control("jf_research_tab_" + scope, toggle)


def build():
    build_ui_art()
    ui = {"namespace": "jagsby_frontier"}
    is_charter = "(not ((#title_text - 'JF_CHARTER|') = #title_text))"
    is_dashboard = "(#title_text = 'JF_CHARTER|Dashboard')"
    ui["jf_router"] = {"type": "panel", "size": [380, 240], "controls": [
        control("vanilla@server_form.long_form", {"bindings": condition(f"(not {is_charter})")}),
        control("charter@jagsby_frontier.jf_dashboard", {"bindings": condition(is_dashboard)}),
        control("picker@jagsby_frontier.jf_picker", {"bindings": condition(f"({is_charter} and (not {is_dashboard}))")}),
    ]}
    frame = [
        control("frame", image("frontier/charter_frame", [380, 240], layer=1)),
        control("title", label("VILLAGE CHARTER", [310, 17], (33, 14), (1, 0.93, 0.71), 1.1)),
        control("close@common.close_button", {"$close_button_offset": [-7, 7], "layer": 30, "bindings": []}),
    ]
    dashboard = copy.deepcopy(frame)
    dashboard += [tab(name, index) for index, name in enumerate(TABS)]
    dashboard.append(control("seal", image("frontier_red", [86, 24], (9, 204), 3)))
    dashboard.append(control("seal_text", label("JAGSBY'S FRONTIER", [86, 12], (10, 212), (1, 0.84, 0.45), 0.55)))
    for name in TABS:
        lower = name.lower()
        if lower in ["overview", "research"]:
            dashboard.append(control(lower + "@jagsby_frontier.jf_" + lower + "_content", {
                "anchor_from": "top_left", "anchor_to": "top_left", "offset": [110, 47],
                "size": [257, 177], "layer": 5,
                "bindings": [view("#toggle_state", target, "jf_tab_" + lower)
                             for target in ["#visible", "#enabled"]],
            }))
            continue
        dashboard.append(control(lower + "@common.scrolling_panel", {
            "anchor_from": "top_left", "anchor_to": "top_left", "offset": [110, 47],
            "size": [257, 177], "layer": 5, "$show_background": False,
            "$scrolling_content": "jagsby_frontier.jf_" + lower + "_content",
            "$scroll_size": [4, "100% - 4px"], "$scrolling_pane_size": ["100% - 5px", "100% - 2px"],
            "$scrolling_pane_offset": [0, 0], "$scroll_bar_right_padding_size": [0, 0],
            "bindings": [view("#toggle_state", target, "jf_tab_" + lower)
                         for target in ["#visible", "#enabled"]],
        }))
    ui["jf_dashboard"] = {"type": "panel", "size": [380, 240], "controls": dashboard}
    pages = {
        "overview": [],
        "research": [],
        "production": [heading("PRODUCTION MANAGEMENT"), record("production", 11, None),
            action("survey", ACTIONS["scan"], "Survey nearby biomes"),
            action("choose", ACTIONS["selectBiome"], "Choose secondary biome")],
        "stockpile": [heading("SHARED STOCKPILE"), record("capacity", 12, 50),
            record("resources", 13, None), action("collect", ACTIONS["collect"], "Collect produced resources")],
    }
    for scope, group, names in [("local", "LOCAL SETTLEMENT RESEARCH", ["efficiency", "hearth", "biome"]),
                         ("global", "CIVILIZATION RESEARCH", ["frontier", "capacity", "development", "storage"])]:
        children = [heading(group)]
        for name in names:
            children += [record(name, DATA[name], 80), action(name + "_buy", ACTIONS[name], "Research / upgrade")]
        pages["research_" + scope] = children
    for name, children in pages.items():
        ui["jf_" + name + "_content"] = {"type": "stack_panel", "orientation": "vertical",
            "size": [254, "100%c"], "anchor_from": "top_left", "anchor_to": "top_left", "controls": children}
    research_controls = [research_tab("global", 0), research_tab("local", 1)]
    for scope in ["global", "local"]:
        research_controls.append(control(scope + "@common.scrolling_panel", {
            "anchor_from": "top_left", "anchor_to": "top_left", "offset": [0, 27],
            "size": [257, 150], "$show_background": False,
            "$scrolling_content": "jagsby_frontier.jf_research_" + scope + "_content",
            "$scroll_size": [4, "100% - 4px"], "$scrolling_pane_size": ["100% - 5px", "100% - 2px"],
            "bindings": [view("#toggle_state", target, "jf_research_tab_" + scope)
                         for target in ["#visible", "#enabled"]],
        }))
    ui["jf_research_content"] = {"type": "panel", "size": [257, 177], "controls": research_controls}
    rename = action("rename", ACTIONS["rename"], "Rename")["rename"]
    rename.update({"type": "panel", "anchor_from": "top_left", "anchor_to": "top_left",
                   "offset": [180, 16], "size": [74, 24]})
    button = rename["controls"][0]["purchase@common.button"]
    button["size"] = [74, 21]
    for state in button["controls"]:
        panel = next(iter(state.values()))
        panel["size"] = [74, 21]
        panel["controls"][0]["gold"]["size"] = [74, 21]
        panel["controls"][1]["wood"]["size"] = [72, 19]
        panel["controls"][2]["caption"]["size"] = [62, 12]
    ui["jf_overview_content"] = {"type": "panel", "size": [257, 177], "controls": [
        control("name_label", label("SETTLEMENT NAME", [170, 12], (4, 1))),
        overview_value("name", DATA["overview"], [4, 20], [170, 25]),
        control("rename", rename),
        control("biome_label", label("VILLAGE BIOME", [250, 12], (4, 59))),
        overview_value("biome", DATA["biomes"], [4, 77], [250, 24]),
        control("power_label", label("REALM POWER", [250, 12], (4, 113))),
        overview_value("power", DATA["census"], [4, 132], [250, 32], scale=1.6),
    ]}
    picker = copy.deepcopy(frame)
    # Secondary-biome choices have their own custom button renderer, not the
    # vanilla long-form dynamic list used by the previous prototype.
    picker.append(control("options@common.scrolling_panel", {
        "anchor_from": "top_left", "anchor_to": "top_left", "offset": [110, 47],
        "size": [257, 177], "layer": 5, "$show_background": False,
        "$scrolling_content": "jagsby_frontier.jf_picker_content", "$scroll_size": [4, "100% - 4px"],
        "$scrolling_pane_size": ["100% - 5px", "100% - 2px"],
    }))
    picker.append(control("caption", label("SECONDARY\nBIOME", [88, 32], (10, 65), (1, 0.91, 0.65))))
    ui["jf_picker"] = {"type": "panel", "size": [380, 240], "controls": picker}
    ui["jf_picker_content"] = {"type": "stack_panel", "orientation": "vertical", "size": [254, "100%c"],
        "controls": [heading("CHOOSE ONE BIOME"), control("choices", {
            "type": "stack_panel", "orientation": "vertical", "size": [254, "100%c"],
            "collection_name": "form_buttons", "factory": {"name": "buttons",
                "control_ids": {"button": "@jagsby_frontier.jf_choice"}},
            "bindings": [{"binding_name": "#form_button_contents", "binding_name_override": "#collection_length"}],
        })]}
    choice = action("choice", 0, "#text")["choice"]
    choice["controls"][0]["purchase@common.button"].pop("collection_index")
    for state in choice["controls"][0]["purchase@common.button"]["controls"]:
        next(iter(state.values()))["controls"][-1]["caption"]["bindings"] = collection_bindings()
    ui["jf_choice"] = choice
    ui["jf_modal_router"] = {"type": "panel", "size": [380, 240], "controls": [
        control("vanilla@server_form.custom_form", {"bindings": condition("(not (#title_text = 'JF_CHARTER|Rename'))")}),
        control("rename@jagsby_frontier.jf_rename", {"bindings": condition("(#title_text = 'JF_CHARTER|Rename')")}),
    ]}
    submit = copy.deepcopy(action("submit", 0, "Save name")["submit"]["controls"][0]["purchase@common.button"])
    submit["$pressed_button_name"] = "button.submit_custom_form"
    for mapping in submit["button_mappings"]:
        mapping["to_button_id"] = "button.submit_custom_form"
    submit.pop("collection_index")
    submit["bindings"] = []
    submit.update({"anchor_from": "top_left", "anchor_to": "top_left", "offset": [110, 151]})
    ui["jf_rename"] = {"type": "panel", "size": [380, 240], "controls": copy.deepcopy(frame) + [
        control("caption", label("RENAME", [88, 32], (10, 65), (1, 0.91, 0.65))),
        control("input@server_form.generated_contents", {"anchor_from": "top_left", "anchor_to": "top_left",
            "offset": [110, 70], "size": [254, "100%c"], "layer": 5}),
        control("submit@common.button", submit),
    ]}
    custom_path = RP / "ui/jagsby_frontier/charter.json"
    custom_path.parent.mkdir(parents=True, exist_ok=True)
    custom_path.write_text(json.dumps(ui, indent=2) + "\n")
    (RP / "ui/_ui_defs.json").write_text(json.dumps({
        "ui_defs": ["ui/jagsby_frontier/charter.json"]}, indent=2) + "\n")
    # The game creates Script API forms through this vanilla control. Keep only
    # the entry hook here; Frontier definitions and artwork live separately.
    (RP / "ui/server_form.json").write_text(json.dumps({
        "namespace": "server_form", "main_screen_content/server_form_factory": {
            "control_ids": {"long_form": "@jagsby_frontier.jf_router",
                            "custom_form": "@jagsby_frontier.jf_modal_router"}}}, indent=2) + "\n")
    layout = {"data": DATA, "actions": ACTIONS, "recordCount": 25, "tabs": TABS}
    (ROOT / "packs/behavior/scripts/charter-layout.js").write_text(
        "// Generated by tools/build_charter_ui.py; indices match the JSON UI.\n"
        "export const CHARTER_LAYOUT = " + json.dumps(layout, indent=2) + ";\n")
    print("Generated standalone Frontier UI, registration and minimal Bedrock entry hook.")


if __name__ == "__main__":
    build()
