"""Build the standalone Frontier dashboard and its minimal Bedrock entry hook."""
import copy
import json
from pathlib import Path
from build_ui_art import build as build_ui_art

ROOT = Path(__file__).resolve().parents[1]
RP = ROOT / "packs/resource"
DATA = {
    "overview": 0, "biomes": 1, "census": 2, "tier": 3,
    "efficiency": 4, "hearth": 5, "biome": 6, "frontier": 7,
    "capacity": 8, "development": 9, "storage": 10,
    "production": 11, "stockpile": 12, "resources": 13,
    "owner": 25, "realmMine": 26, "realmAll": 27, "population": 33,
}
ACTIONS = {name: i + 14 for i, name in enumerate([
    "efficiency", "hearth", "biome", "frontier", "capacity", "development",
    "storage", "scan", "selectBiome", "collect", "rename",
])}
ACTIONS.update({"claim": 28, "minePrev": 29, "mineNext": 30, "allPrev": 31, "allNext": 32})
TABS = ["Overview", "Research", "Production", "Realm"]
GENERATED_CONTROLS = {}


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
            "font_type": "unicode", "font_size": "normal", "font_scale_factor": scale,
            "color": list(color), "shadow": False}


def collection_bindings():
    return [{"binding_type": "collection_details", "binding_collection_name": "form_buttons"},
            {"binding_name": "#form_button_text", "binding_name_override": "#text",
             "binding_type": "collection", "binding_collection_name": "form_buttons"}]


def collection_scope(template, size):
    # A collection_name belongs on a collection-capable stack_panel, not panel.
    # Use one explicitly indexed child in that native collection scope.
    if template.startswith("jf_data_"):
        index = DATA[template.removeprefix("jf_data_")]
    elif template.startswith("jf_action_"):
        index = ACTIONS[template.removeprefix("jf_action_")]
    elif template == "jf_tier_portrait":
        index = DATA["tier"]
    else:
        raise ValueError("Unknown fixed collection template: " + template)
    return {"type": "stack_panel", "orientation": "vertical", "size": size,
        "collection_name": "form_buttons", "controls": [
            control("record@jagsby_frontier." + template, {"collection_index": index})]}


def data_template(index, size, scale=0.8):
    key = next(key for key, value in DATA.items() if value == index)
    marker = f"[JF:data:{key}]"
    name = f"jf_data_{key}"
    text = label("#text", size, scale=scale)
    text["bindings"] = [
        {"binding_type": "collection_details", "binding_collection_name": "form_buttons"},
        {"binding_name": "#form_button_text", "binding_name_override": "#record_text",
         "binding_type": "collection", "binding_collection_name": "form_buttons"},
        view(f"(#record_text - '{marker}')", "#text"),
        view(f"(not ((#record_text - '{marker}') = #record_text))"),
    ]
    if key == "census":
        text["text"] = "#form_button_text"
        text["property_bag"] = {"#form_button_text": "Unavailable"}
        text["bindings"] = [
            {"binding_type": "collection_details", "binding_collection_name": "form_buttons"},
            {"binding_name": "#form_button_text", "binding_type": "collection", "binding_collection_name": "form_buttons"},
        ]
    GENERATED_CONTROLS[name] = text
    return name


def record(name, index, height):
    height = height or (180 if index == DATA["production"] else 256)
    template = data_template(index, [240, height - 8])
    text = collection_scope(template, [240, height - 8])
    text.update({"anchor_from": "top_left", "anchor_to": "top_left", "offset": [7, 4]})
    return control(name, {"type": "panel", "size": [254, height], "controls": [
        control("paper", image("frontier/solid", [254, height - 2], color=[0.84, 0.69, 0.44])),
        control("data", text),
    ]})


def action(name, index, caption, width=254, height=21):
    key = next(key for key, value in ACTIONS.items() if value == index)
    template = "jf_action_" + key
    states = []
    for state, texture, tint in [("default", "frontier_wood", None),
                                  ("hover", "frontier_red", None),
                                  ("pressed", "frontier_red", [0.7, 0.6, 0.5])]:
        states.append(control(state, {"type": "panel", "size": [width, height], "controls": [
            control("gold", image("frontier/solid", [width, height], color=[0.88, 0.62, 0.18])),
            control("wood", image(texture, [width - 2, height - 2], (1, 1), 1, tint)),
            control("caption", label(caption, [width - 12, 12], (6, 4), (1, 0.91, 0.65))),
        ]}))
    bindings = [
        {"binding_type": "collection_details", "binding_collection_name": "form_buttons"},
        {"binding_name": "#form_button_text", "binding_type": "collection", "binding_collection_name": "form_buttons"},
        view(f"(#form_button_text = '[JF:action:{key}]')"),
        view(f"(#form_button_text = '[JF:action:{key}]')", "#enabled"),
    ]
    GENERATED_CONTROLS[template + "@common.button"] = {
        "size": [width, height], "$pressed_button_name": "button.form_button_click",
        "focus_enabled": True, "hover_enabled": True,
        "button_mappings": [
            {"from_button_id": "button.menu_select", "to_button_id": "button.form_button_click", "mapping_type": "pressed"},
            {"from_button_id": "button.menu_ok", "to_button_id": "button.form_button_click", "mapping_type": "focused"},
        ],
        "bindings": bindings, "controls": states,
    }
    return control(name, collection_scope(template, [width, height + 3]))


def heading(text):
    return control("heading_" + text.replace(" ", "_"), {
        "type": "panel", "size": [254, 19], "controls": [
            control("ribbon", image("frontier/solid", [254, 17], color=[0.71, 0.50, 0.24])),
            control("caption", label(text.title(), [244, 12], (5, 3), scale=0.85)),
        ]})


def tab(name, index):
    lower = name.lower()
    states = []
    for state in ["unchecked", "checked", "unchecked_hover", "checked_hover"]:
        selected = state.startswith("checked")
        states.append(control(state, {"type": "panel", "size": [92, 35], "controls": [
            control("face", image(f"frontier/tab_{lower}_{state}", [92, 35], layer=1)),
            *([control("icon", image(f"frontier/icons/{lower}", [24, 24], (3, 5), 4))]
              if lower in ["overview", "research", "production"] else []),
            control("caption", label(name, [61, 13], (29, 12), (1, 0.93, 0.73), 0.85)),
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
    template = data_template(index, size, scale)
    value = collection_scope(template, size)
    value.update({"anchor_from": "top_left", "anchor_to": "top_left",
                  "offset": offset, "clips_children": True})
    return control(name, value)


def research_tab(scope, index, section="research", caption_text=None):
    toggle = tab("Research", index)["jf_tab_research"]
    toggle.update({"size": [124, 23], "offset": [index * 129, 0],
        "toggle_name": "jagsby_frontier_" + section + "_tabs", "tts_name": caption_text or scope.title(),
        "focus_identifier": "jf_" + section + "_focus_" + scope,
        "focus_change_left": "jf_" + section + "_focus_" + ("mine" if section == "realm" else "global"),
        "focus_change_right": "jf_" + section + "_focus_" + ("all" if section == "realm" else "local")})
    toggle.pop("focus_change_up", None)
    toggle.pop("focus_change_down", None)
    for binding in toggle["bindings"]:
        if "binding_name" in binding:
            binding["binding_name"] = binding["binding_name"].replace("[JF:tab:research]", f"[JF:{section}:{scope}]")
    for state in toggle["controls"]:
        panel = next(iter(state.values()))
        panel["size"] = [124, 23]
        panel["controls"][0]["face"]["size"] = [124, 23]
        panel["controls"] = [entry for entry in panel["controls"] if "icon" not in entry]
        caption = next(entry["caption"] for entry in panel["controls"] if "caption" in entry)
        caption.update({"text": caption_text or scope.title(), "size": [124, 13], "offset": [0, 6], "text_alignment": "center"})
    return control("jf_" + section + "_tab_" + scope, toggle)


def info_card(name, title, index, y):
    return control(name, {"type": "panel", "size": [147, 32], "offset": [106, y],
        "anchor_from": "top_left", "anchor_to": "top_left", "controls": [
            control("edge", image("frontier/solid", [147, 32], color=[0.70, 0.54, 0.33])),
            control("paper", image("frontier/solid", [145, 30], (1, 1), 1, [0.90, 0.80, 0.60])),
            control("label", label(title, [135, 9], (6, 4), scale=0.7)),
            overview_value("value", index, [6, 16], [135, 12], scale=0.85),
        ]})


def research_node(name, title, subtitle, position, sprite):
    states = []
    for state in ["default", "hover", "pressed"]:
        states.append(control(state, {"type": "panel", "size": [122, 40], "controls": [
            control("face", image("frontier/research_button_" + state, [122, 40])),
            control("icon", image("frontier/research/" + sprite, [32, 32], (4, 4), 6)),
            control("name", label(title, [78, 12], (39, 6), scale=0.72)),
            control("note", label(subtitle, [78, 17], (39, 20), color=(0.38, 0.26, 0.13), scale=0.6)),
        ]}))
    return control(name, {"type": "button", "size": [122, 40], "offset": position,
        "anchor_from": "top_left", "anchor_to": "top_left", "layer": 5,
        "focus_enabled": True, "hover_enabled": True, "button_mappings": [],
        "default_control": "default", "hover_control": "hover", "pressed_control": "pressed",
        "controls": states})


def global_tree():
    lines = [(127, 40, 1, 6), (61, 45, 133, 1), (61, 45, 1, 10), (193, 45, 1, 10),
             (61, 95, 1, 15), (193, 95, 1, 15)]
    controls = [control("branch_" + str(i), image("frontier/solid", [w, h], (x, y), 2, [0.55, 0.35, 0.14]))
                for i, (x, y, w, h) in enumerate(lines)]
    controls += [
        control("tier_one", label("Tier I", [50, 9], (0, 14), scale=0.65)),
        control("tier_two", label("Tier II", [50, 9], (0, 44), scale=0.65)),
        control("tier_three", label("Tier III", [50, 9], (0, 99), scale=0.65)),
        research_node("settlement_capacity", "Settlement Charters", "More settlements\nRepeatable", [66, 0], "settlement_charters"),
        research_node("frontier_expansion", "Frontier Mandate", "Distant settlements\n5 levels", [0, 55], "frontier_mandate"),
        research_node("settlement_development", "Stewardship", "Higher local research\nRepeatable", [132, 55], "stewardship"),
        research_node("colonization", "Reclamation", "Frontier production\n5 levels proposed", [0, 110], "reclamation"),
        research_node("shared_storage", "Hoards", "Shared storage\nRepeatable", [132, 110], "hoards"),
    ]
    return {"type": "panel", "size": [254, 150], "controls": controls}


def build():
    build_ui_art()
    GENERATED_CONTROLS.clear()
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
        control("title", label("Village Charter", [236, 17], (25, 14), (1, 0.93, 0.71), 1.0)),
        control("close@common.close_button", {"$close_button_offset": [-7, 7], "layer": 30, "bindings": []}),
    ]
    dashboard = [copy.deepcopy(item) for item in frame if 'title' not in item]
    dashboard.append(overview_value("header_name", DATA["overview"], [25, 13], [235, 12], scale=1.0))
    GENERATED_CONTROLS["jf_data_overview"]["color"] = [1, 0.93, 0.71]
    dashboard.append(control("subtitle", label("Village Charter", [235, 8], (25, 25), (1, 0.85, 0.60), 0.65)))
    dashboard += [tab(name, index) for index, name in enumerate(TABS)]
    dashboard.append(control("seal", image("frontier_red", [86, 24], (9, 204), 3)))
    dashboard.append(control("seal_text", label("Jagsby's Frontier", [86, 12], (10, 212), (1, 0.84, 0.45), 0.65)))
    for name in TABS:
        lower = name.lower()
        if lower in ["overview", "research", "realm"]:
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
            action("choose", ACTIONS["selectBiome"], "Choose secondary biome"),
            heading("Shared Stockpile"), record("capacity", 12, 50),
            record("resources", 13, None), action("collect", ACTIONS["collect"], "Collect produced resources")],
    }
    for scope, group, names in [("local", "LOCAL SETTLEMENT RESEARCH", ["efficiency", "hearth", "biome"]),
                         ("global", "CIVILIZATION RESEARCH", [])]:
        children = [heading(group)]
        for name in names:
            children += [record(name, DATA[name], 80), action(name + "_buy", ACTIONS[name], "Research / upgrade")]
        pages["research_" + scope] = children
    for name, children in pages.items():
        ui["jf_" + name + "_content"] = {"type": "stack_panel", "orientation": "vertical",
            "size": [254, "100%c"], "anchor_from": "top_left", "anchor_to": "top_left", "controls": children}
    ui["jf_research_global_content"] = global_tree()
    local_controls = []
    for i, key in enumerate(["efficiency", "hearth", "biome"]):
        template = data_template(DATA[key], [166, 42], scale=0.75)
        values = collection_scope(template, [166, 42])
        values.update({"offset": [4, 3], "anchor_from": "top_left", "anchor_to": "top_left"})
        purchase = action(key + "_buy", ACTIONS[key], "Research", width=76)[key + "_buy"]
        purchase.update({"offset": [178, 13], "anchor_from": "top_left", "anchor_to": "top_left"})
        local_controls.append(control(key, {"type": "panel", "size": [254, 47],
            "offset": [0, i * 50], "anchor_from": "top_left", "anchor_to": "top_left", "controls": [
                control("paper", image("frontier/solid", [254, 47], color=[0.86, 0.73, 0.50])),
                control("data", values), control("purchase", purchase),
            ]}))
    ui["jf_research_local_content"] = {"type": "panel", "size": [254, 150], "controls": local_controls}
    research_controls = [research_tab("global", 0), research_tab("local", 1)]
    for scope in ["global", "local"]:
        if scope in ["global", "local"]:
            research_controls.append(control(scope + "@jagsby_frontier.jf_research_" + scope + "_content", {
                "anchor_from": "top_left", "anchor_to": "top_left", "offset": [0, 27], "size": [254, 150],
                "bindings": [view("#toggle_state", target, "jf_research_tab_" + scope) for target in ["#visible", "#enabled"]],
            }))
            continue
        research_controls.append(control(scope + "@common.scrolling_panel", {
            "anchor_from": "top_left", "anchor_to": "top_left", "offset": [0, 27],
            "size": [257, 150], "$show_background": False,
            "$scrolling_content": "jagsby_frontier.jf_research_" + scope + "_content",
            "$scroll_size": [4, "100% - 4px"], "$scrolling_pane_size": ["100% - 5px", "100% - 2px"],
            "bindings": [view("#toggle_state", target, "jf_research_tab_" + scope)
                         for target in ["#visible", "#enabled"]],
        }))
    ui["jf_research_content"] = {"type": "panel", "size": [257, 177], "controls": research_controls}
    rename = action("header_rename", ACTIONS["rename"], "Rename", width=58, height=17)["header_rename"]
    rename.update({"anchor_from": "top_left", "anchor_to": "top_left",
                   "offset": [289, 14], "layer": 25})
    # Flat crimson faces keep the header action quieter than the main title.
    for state in GENERATED_CONTROLS["jf_action_rename@common.button"]["controls"]:
        name, panel = next(iter(state.items()))
        controls = {key: value for item in panel["controls"] for key, value in item.items()}
        controls["wood"].update({"texture": "textures/ui/frontier/solid", "color": {
            "default": [0.45, 0.08, 0.07], "hover": [0.62, 0.14, 0.10],
            "pressed": [0.35, 0.06, 0.05],
        }[name]})
        controls["caption"].update({"offset": [0, 3], "size": [58, 11],
                                    "text_alignment": "center", "font_scale_factor": 0.85})
    dashboard.append(control("header_rename", rename))
    portrait = image("frontier/settlements/outpost", [96, 168], layer=8)
    # Retain the decorative stone/oak/gold frame. Trim only its one-pixel outer
    # dark rim; the previous painting-only crop removed the requested frame.
    portrait.update({"uv": [1, 1], "uv_size": [94, 166]})
    portrait["bindings"] = [
        {"binding_type": "collection_details", "binding_collection_name": "form_buttons"},
        {"binding_name": "#form_button_text", "binding_name_override": "#record_text",
         "binding_type": "collection", "binding_collection_name": "form_buttons"},
        {"binding_name": "#form_button_texture", "binding_name_override": "#texture",
         "binding_type": "collection", "binding_collection_name": "form_buttons"},
        {"binding_name": "#form_button_texture_file_system", "binding_name_override": "#texture_file_system",
         "binding_type": "collection", "binding_collection_name": "form_buttons"},
        view("(not ((#record_text - '[JF:data:tier]') = #record_text))"),
    ]
    ui["jf_tier_portrait"] = portrait
    # Separate name template keeps the header's dimensions and color independent.
    header_name = copy.deepcopy(GENERATED_CONTROLS["jf_data_overview"])
    name = overview_value("name", DATA["overview"], [8, 7], [131, 14], scale=0.95)
    GENERATED_CONTROLS["jf_identity_name"] = GENERATED_CONTROLS["jf_data_overview"]
    GENERATED_CONTROLS["jf_data_overview"] = header_name
    name["name"]["controls"] = [control("record@jagsby_frontier.jf_identity_name", {"collection_index": DATA["overview"]})]
    identity = control("identity", {"type": "panel", "size": [147, 64], "offset": [106, 4],
        "anchor_from": "top_left", "anchor_to": "top_left", "controls": [
            control("edge", image("frontier/solid", [147, 64], color=[0.70, 0.54, 0.33])),
            control("paper", image("frontier/solid", [145, 62], (1, 1), 1, [0.90, 0.80, 0.60])),
            name,
            control("divider", image("frontier/solid", [131, 1], (8, 25), 2, [0.73, 0.57, 0.34])),
            control("tier_label", label("Tier", [35, 10], (8, 32), scale=0.75)),
            overview_value("tier", DATA["tier"], [48, 32], [91, 11], scale=0.8),
            control("size_label", label("Size", [35, 10], (8, 47), scale=0.75)),
            overview_value("population", DATA["population"], [48, 47], [91, 11], scale=0.8),
        ]})
    details = []
    for key, title, y in [("owner", "Owner", 79), ("biomes", "Biome", 103), ("census", "Realm Power", 127)]:
        details += [control(key + "_label", label(title, [131, 9], (114, y), scale=0.7)),
                    overview_value(key, DATA[key], [114, y + 10], [131, 12], scale=0.85)]
    claim = action("claim", ACTIONS["claim"], "Claim", width=42, height=16)["claim"]
    claim.update({"offset": [203, 85], "anchor_from": "top_left", "anchor_to": "top_left",
                  "layer": 12, "bindings": condition("(not ((#form_text - '[JF:unclaimed]') = #form_text))", "#form_text")})
    ui["jf_overview_content"] = {"type": "panel", "size": [257, 177], "controls": [
        control("portrait", {**collection_scope("jf_tier_portrait", [96, 168]),
            "anchor_from": "top_left", "anchor_to": "top_left", "offset": [0, 0]}),
        identity, *details, control("claim", claim),
    ]}
    GENERATED_CONTROLS["jf_data_tier"].update({"text_alignment": "left"})
    realm_controls = [research_tab("mine", 0, "realm", "My Settlements"), research_tab("all", 1, "realm", "All Settlements")]
    for scope, data_key in [("mine", "realmMine"), ("all", "realmAll")]:
        content = [record("directory", DATA[data_key], 121)]
        for suffix, caption, x in [("Prev", "Previous", 0), ("Next", "Next", 129)]:
            button = action(scope + suffix, ACTIONS[scope + suffix], caption, width=122)[scope + suffix]
            button.update({"offset": [x, 125], "anchor_from": "top_left", "anchor_to": "top_left"})
            content.append(control(suffix.lower(), button))
        ui["jf_realm_" + scope + "_content"] = {"type": "panel", "size": [257, 150], "controls": content}
        realm_controls.append(control(scope + "@jagsby_frontier.jf_realm_" + scope + "_content", {
            "offset": [0, 27], "anchor_from": "top_left", "anchor_to": "top_left", "size": [257, 150],
            "bindings": [view("#toggle_state", target, "jf_realm_tab_" + scope) for target in ["#visible", "#enabled"]],
        }))
    ui["jf_realm_content"] = {"type": "panel", "size": [257, 177], "controls": realm_controls}
    picker = copy.deepcopy(frame)
    # Secondary-biome choices have their own custom button renderer, not the
    # vanilla long-form dynamic list used by the previous prototype.
    picker.append(control("options@common.scrolling_panel", {
        "anchor_from": "top_left", "anchor_to": "top_left", "offset": [110, 47],
        "size": [257, 177], "layer": 5, "$show_background": False,
        "$scrolling_content": "jagsby_frontier.jf_picker_content", "$scroll_size": [4, "100% - 4px"],
        "$scrolling_pane_size": ["100% - 5px", "100% - 2px"],
    }))
    picker.append(control("caption", label("Secondary\nBiome", [88, 32], (10, 65), (1, 0.91, 0.65))))
    ui["jf_picker"] = {"type": "panel", "size": [380, 240], "controls": picker}
    ui["jf_picker_content"] = {"type": "stack_panel", "orientation": "vertical", "size": [254, "100%c"],
        "controls": [heading("CHOOSE ONE BIOME"), control("choices", {
            "type": "stack_panel", "orientation": "vertical", "size": [254, "100%c"],
            "collection_name": "form_buttons", "factory": {"name": "buttons",
                "control_ids": {"button": "jagsby_frontier.jf_choice"}},
            "bindings": [{"binding_name": "#form_button_contents", "binding_name_override": "#collection_length"}],
        })]}
    # Native factory context supplies the chosen biome's real record index.
    picker_template = copy.deepcopy(GENERATED_CONTROLS["jf_action_rename@common.button"])
    picker_template["size"] = [254, 21]
    picker_template["bindings"] = collection_bindings()
    for state in picker_template["controls"]:
        panel = next(iter(state.values()))
        panel["size"] = [254, 21]
        panel["controls"][0]["gold"]["size"] = [254, 21]
        panel["controls"][1]["wood"]["size"] = [252, 19]
        panel["controls"][2]["caption"].update({"text": "#text", "size": [242, 12], "bindings": collection_bindings()})
    ui["jf_choice@common.button"] = picker_template
    ui["jf_modal_router"] = {"type": "panel", "size": [380, 240], "controls": [
        control("vanilla@server_form.custom_form", {"bindings": condition("(not (#title_text = 'JF_CHARTER|Rename'))")}),
        control("rename@jagsby_frontier.jf_rename", {"bindings": condition("(#title_text = 'JF_CHARTER|Rename')")}),
    ]}
    submit = copy.deepcopy(GENERATED_CONTROLS["jf_action_efficiency@common.button"])
    for state in submit["controls"]:
        next(iter(state.values()))["controls"][2]["caption"]["text"] = "Save name"
    submit["$pressed_button_name"] = "button.submit_custom_form"
    for mapping in submit["button_mappings"]:
        mapping["to_button_id"] = "button.submit_custom_form"
    submit["bindings"] = []
    submit["size"] = [254, 21]
    for state in submit["controls"]:
        panel = next(iter(state.values()))
        panel["size"] = [254, 21]
        panel["controls"][0]["gold"]["size"] = [254, 21]
        panel["controls"][1]["wood"]["size"] = [252, 19]
        panel["controls"][2]["caption"]["size"] = [242, 12]
    submit.update({"anchor_from": "top_left", "anchor_to": "top_left", "offset": [110, 151]})
    ui["jf_rename"] = {"type": "panel", "size": [380, 240], "controls": copy.deepcopy(frame) + [
        control("caption", label("Rename", [88, 32], (10, 65), (1, 0.91, 0.65))),
        control("input@server_form.generated_contents", {"anchor_from": "top_left", "anchor_to": "top_left",
            "offset": [110, 70], "size": [254, "100%c"], "layer": 5}),
        control("submit@common.button", submit),
    ]}
    ui.update(GENERATED_CONTROLS)
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
    layout = {"data": DATA, "actions": ACTIONS, "recordCount": 34, "tabs": TABS}
    (ROOT / "packs/behavior/scripts/charter-layout.js").write_text(
        "// Generated by tools/build_charter_ui.py; indices match the JSON UI.\n"
        "export const CHARTER_LAYOUT = " + json.dumps(layout, indent=2) + ";\n")
    print("Generated standalone Frontier UI, registration and minimal Bedrock entry hook.")


if __name__ == "__main__":
    build()
