"""Build the standalone Frontier dashboard and its minimal Bedrock entry hook."""
import copy
import json
from pathlib import Path
from build_ui_art import build as build_ui_art, button_texture

ROOT = Path(__file__).resolve().parents[1]
RP = ROOT / "packs/resource"
DATA = {
    "overview": 0, "biomes": 1, "census": 2, "tier": 3,
    "efficiency": 4, "hearth": 5, "biome": 6, "frontier": 7,
    "capacity": 8, "innovation": 9, "storage": 10,
    "stockpile": 12,
    "owner": 25, "realmMine": 26, "realmAll": 27,
}
ACTIONS = {name: i + 14 for i, name in enumerate([
    "efficiency", "hearth", "biome", "frontier", "capacity", "innovation",
    "storage", "scan", "selectBiome", "collect", "rename",
])}
ACTIONS.update({"claim": 28, "minePrev": 29, "mineNext": 30, "allPrev": 31, "allNext": 32})
DATA.update({"roadSummary": 33, "roadDetails": 34})

ACTIONS.update({"roadsPrev": 46, "roadsNext": 47})
DATA.update({"sanctuary": 55, "roads": 56})
ACTIONS.update({"sanctuary": 57, "roads": 58})
DATA["colonization"] = 61
ACTIONS["colonization"] = 62
DATA.update({"zone": 63, "developmentValue": 64, "developmentHourly": 60})
TECHS = ["innovation", "frontier", "capacity", "colonization", "storage",
         "hearth", "biome", "sanctuary", "efficiency", "roads"]
DATA.update({key + "Level": 66 + i for i, key in enumerate(TECHS)})
DATA["tradeRoute"] = 76

DATA.update({"productionOutput": 78})
ACTIONS.update({"clearSecondary": 91})
DATA.update({"productionItem0": 96, "productionItem1": 97})
STOCK_ITEMS = json.loads((ROOT / "docs/production-icon-assets.json").read_text())["items"]
DATA.update({"stockCount" + str(i): 100 + i for i in range(len(STOCK_ITEMS))})
DATA.update({"productionModifier" + str(i): 130 + i for i in range(4)})
DATA.update({"productionModifierName" + str(i): 135 + i for i in range(4)})
DATA.update({"prospectInfo" + str(i): 200 + i for i in range(52)})
ACTIONS.update({"prospectSelect" + str(i): 300 + i for i in range(52)})
for obsolete in ["selectBiome"]:
    ACTIONS.pop(obsolete, None)
DATA.update({"overviewProduction0": 150, "overviewProduction1": 151})
DATA["productionModifierTotal"] = 154
# Realm records use explicit indexed slots; their configured limit is saved below.
for key in ["realmMine", "realmAll"]:
    DATA.pop(key, None)
for key in ["minePrev", "mineNext", "allPrev", "allNext", "roadsPrev", "roadsNext"]:
    ACTIONS.pop(key, None)
NAVIGATION = ["nav" + name for name in ["Overview", "Research", "Production", "Realm", "Information"]]
NAVIGATION += ["nav" + section + scope for section, scopes in [("Research", ["local", "global"]), ("Realm", ["roads", "mine", "all"]), ("Production", ["summary", "biomes"])] for scope in scopes]
ACTIONS.update({key: 700 + index for index, key in enumerate(NAVIGATION)})
# Preserve the original low transport IDs; pack later additions contiguously.
# These IDs are form-local, never saved. Avoid transmitting hundreds of holes.
late = sorted([(index, mapping, key) for mapping in [DATA, ACTIONS]
               for key, index in mapping.items() if index >= 98], key=lambda entry: entry[0])
for index, (_, mapping, key) in enumerate(late, start=98):
    mapping[key] = index
TABS = ["Overview", "Research", "Production", "Realm", "Information"]
# Shared palette: ivory text, aged silver labels, wheat gold accents.
IVORY = (0.94, 0.92, 0.85)
SILVER = (0.73, 0.73, 0.68)
WHEAT = (0.82, 0.70, 0.44)
CHARCOAL = (0.16, 0.17, 0.18)
RESEARCH_HELP = {
    "efficiency": ("Prosperity", "Each level adds 5% production.\nRepeatable; requires Resource Prospecting."),
    "hearth": ("Hearthstone", "I: Regeneration I inside the settlement.\nII: villagers recover 2 HP once per game day."),
    "biome": ("Resource Prospecting", "Unlocks one secondary production biome.\nSurvey nearby biomes, then choose one in\nProduction. Survey range: 256 blocks."),
    "sanctuary": ("Sanctuary", "Repeatable hostile-mob protection.\nEach level removes 5% of remaining damage.\nLasts three minutes after leaving."),
    "roads": ("Road Networks", "Establish and upgrade food-powered travel\nroutes. Connections progress from Trail\nto Road to Highway."),
    "capacity": ("Settlement Charters", "64 logs per additional settlement slot."),
    "frontier": ("Frontier Expansion", "Unlocks settlement founding in four frontier zones."),
    "innovation": ("Stewardship", "192 copper per level. Caps endless research."),
    "colonization": ("Colonization", "Zone-specific production bonuses, up to Blackreach."),
    "storage": ("Shared Storage", "512 building materials per fixed storage increment."),
}
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


def label(text, size, offset=(0, 0), color=IVORY, scale=0.8):
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
    if key in ["census", "developmentValue", "developmentHourly", "owner", "realmMine", "realmAll"] or key.startswith(("stockCount", "productionModifier", "overviewProduction", "directory", "roadConnection")):
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
        control("paper", image("frontier/palette_panel", [254, height - 2], color=[0.8, 0.8, 0.8])),
        control("data", text),
    ]})


def action(name, index, caption, width=254, height=21):
    key = next(key for key, value in ACTIONS.items() if value == index)
    template = "jf_action_" + key
    states = []
    for state in ["default", "hover", "pressed"]:
        states.append(control(state, {"type": "panel", "size": [width, height], "controls": [
            control("gold", image(button_texture(width, height, state), [width, height])),
            control("wood", {"type": "panel", "size": [width - 2, height - 2]}),
            control("caption", label(caption, [width - 12, 12], (6, 5 if state == "pressed" else 4), IVORY)),
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
            control("ribbon", image("frontier/solid", [254, 17], color=list(CHARCOAL))),
            control("caption", label(text.title(), [244, 12], (5, 3), scale=0.85)),
        ]})


def navigation_control(name, action_key, marker, size, offset, faces):
    selected = "(not ((#form_text - '" + marker + "') = #form_text))"
    states = []
    for state in ["default", "hover", "pressed"]:
        variants = []
        for active in [False, True]:
            key = ("checked" if active else "unchecked") + ("_hover" if state != "default" else "")
            panel = copy.deepcopy(faces[key])
            panel["bindings"] = condition(selected if active else "(not " + selected + ")", "#form_text")
            variants.append(control("selected" if active else "unselected", panel))
        states.append(control(state, {"type": "panel", "size": size, "controls": variants}))
    template = "jf_action_" + action_key
    GENERATED_CONTROLS[template + "@common.button"] = {
        "size": size, "$pressed_button_name": "button.form_button_click", "focus_enabled": True, "hover_enabled": True,
        "button_mappings": [
            {"from_button_id": "button.menu_select", "to_button_id": "button.form_button_click", "mapping_type": "pressed"},
            {"from_button_id": "button.menu_ok", "to_button_id": "button.form_button_click", "mapping_type": "focused"}],
        "bindings": [{"binding_type": "collection_details", "binding_collection_name": "form_buttons"}], "controls": states}
    wrapper = collection_scope(template, size)
    wrapper.update({"offset": offset, "anchor_from": "top_left", "anchor_to": "top_left", "layer": 10,
        "property_bag": {"#toggle_state": False},
        "bindings": [{"binding_name": "#form_text", "binding_type": "none"}, view(selected, "#toggle_state")]})
    return control(name, wrapper)


def navigation_faces(caption, width, height, icon=None, scale=0.8):
    faces = {}
    for state in ["unchecked", "checked", "unchecked_hover", "checked_hover"]:
        selected = state.startswith("checked")
        faces[state] = {"type": "panel", "size": [width, height], "controls": [
            control("face", image(button_texture(width, height, state), [width, height], layer=1)),
            *([control("icon", image("frontier/icons/" + icon, [20, 20], (6, 4), 4))] if icon else []),
            control("caption", label(caption, [width - 31, 12] if icon else [width, 13], (27, 9) if icon else (0, 6), WHEAT if selected else IVORY, scale))]}
        if not icon:
            faces[state]["controls"][-1]["caption"]["text_alignment"] = "center"
    return faces


def tab(name, index):
    lower = name.lower()
    return navigation_control("jf_tab_" + lower, "nav" + name, "[JF:tab:" + lower + "]", [80, 28], [20, 62 + 32 * index], navigation_faces(name, 80, 28, lower))


def overview_value(name, index, offset, size, scale=0.9):
    template = data_template(index, size, scale)
    value = collection_scope(template, size)
    value.update({"anchor_from": "top_left", "anchor_to": "top_left",
                  "offset": offset, "clips_children": True})
    return control(name, value)


def research_tab(scope, index, section="research", caption_text=None):
    width, spacing = (82, 86) if section == "realm" else (124, 129)
    return navigation_control("jf_" + section + "_tab_" + scope, "nav" + section.title() + scope,
        "[JF:" + section + ":" + scope + "]", [width, 23], [index * spacing, 0],
        navigation_faces(caption_text or scope.title(), width, 23, scale=0.7 if section == "production" else 0.85))


def info_card(name, title, index, y):
    return control(name, {"type": "panel", "size": [147, 32], "offset": [106, y],
        "anchor_from": "top_left", "anchor_to": "top_left", "controls": [
            control("edge", image("frontier/solid", [147, 32], color=[0.65, 0.63, 0.54])),
            control("paper", image("frontier/solid", [145, 30], (1, 1), 1, list(CHARCOAL))),
            control("label", label(title, [135, 9], (6, 4), scale=0.7)),
            overview_value("value", index, [6, 16], [135, 12], scale=0.85),
        ]})


def research_tooltip(key, position, live=False):
    title, description = RESEARCH_HELP[key]
    if live:
        # A native label's default height follows its rendered, wrapped text.
        # The collection stack then measures that label instead of reserving rows.
        template = data_template(DATA[key], [222, "default"], scale=0.75)
        details = collection_scope(template, [222, "100%c"])
        details.update({"offset": [9, 0], "anchor_from": "top_left", "anchor_to": "top_left"})
        # Offset a collection inside a full-width panel, not directly inside
        # the vertical stack: native stack layout can displace the narrower
        # collection's left edge even when it has an explicit offset.
        GENERATED_CONTROLS[template]["text_alignment"] = "left"
        body = control("live_details", {
            "type": "panel", "size": [240, "100%cm"],
            "controls": [control("inset", details)],
        })
    else:
        body = control("description", {
            "type": "panel", "size": [240, "100%cm"], "controls": [
                control("inset", label(description, [222, "default"], (9, 0), IVORY, 0.75))],
        })
    title_row = control("title_row", {"type": "panel", "size": [240, 12], "controls": [
        control("title", label(title, [222, 12], (9, 0), WHEAT, 0.8)),
    ]})
    rule_row = control("rule_row", {"type": "panel", "size": [240, 5], "controls": [
        control("rule", image("frontier/solid", [222, 1], (9, 2), 2, list(SILVER))),
    ]})
    content = {"type": "stack_panel", "orientation": "vertical", "size": [240, "100%c"],
        "anchor_from": "top_left", "anchor_to": "top_left", "controls": [
            control("top_padding", {"type": "panel", "size": [240, 6]}),
            title_row, rule_row, body,
            control("bottom_padding", {"type": "panel", "size": [240, 6]}),
        ]}
    frame = image(button_texture(240, 112, "default"), [240, "100%sm"])
    frame["nineslice_size"] = 6
    below = position[1] == 0
    return control("research_tooltip", {
        "type": "panel", "size": [240, "100%cm"], "offset": [7 - position[0], 4 if below else -4],
        "anchor_from": "bottom_left" if below else "top_left",
        "anchor_to": "top_left" if below else "bottom_left", "layer": 100,
        "controls": [control("frame", frame), control("content", content)],
    })


def research_node(name, title, position, sprite, local=False):
    active = local or name in ["innovation", "capacity", "frontier", "colonization", "storage"]
    level = collection_scope(data_template(DATA[name + "Level"], [80, 9], scale=0.6), [80, 9])
    GENERATED_CONTROLS["jf_data_" + name + "Level"]["text_alignment"] = "center"
    level.update({"offset": [38, 21], "anchor_from": "top_left", "anchor_to": "top_left", "layer": 8})
    states = []
    for state in ["default", "hover", "pressed"]:
        states.append(control(state, {"type": "panel", "size": [122, 34], "controls": [
            control("face", image(button_texture(122, 34, state), [122, 34])),
            control("icon", image("frontier/research/" + sprite, [28, 28], (4, 3), 6)),
            control("name", {**label(title, [80, 12], (38, 5), color=IVORY, scale=0.7 if len(title) > 18 else 0.8), "text_alignment": "center"}),
            control("level", copy.deepcopy(level)),
            *([research_tooltip(name, position, live=active)]
              if state in ["hover", "pressed"] else []),
        ]}))
    if active:
        purchase = action(name + "_buy", ACTIONS[name], title, width=122, height=34)
        GENERATED_CONTROLS["jf_action_" + name + "@common.button"]["controls"] = states
        return control(name, {"type": "panel", "size": [122, 34], "offset": position,
            "anchor_from": "top_left", "anchor_to": "top_left", "layer": 5,
            "controls": [purchase]})
    return control(name, {"type": "button", "size": [122, 34], "offset": position,
        "anchor_from": "top_left", "anchor_to": "top_left", "layer": 5,
        "focus_enabled": True, "hover_enabled": True, "button_mappings": [],
        "default_control": "default", "hover_control": "hover", "pressed_control": "pressed",
        "controls": states})


def global_tree():
    lines = [(127, 34, 1, 7), (61, 40, 133, 1), (61, 40, 1, 7), (193, 40, 1, 7),
             (61, 81, 1, 13), (193, 81, 1, 13)]
    controls = [control("branch_" + str(i), image("frontier/solid", [w, h], (x, y), 2, [0.55, 0.35, 0.14]))
                for i, (x, y, w, h) in enumerate(lines)]
    controls += [
        control("tier_one", label("Tier I", [50, 9], (0, 14), scale=0.555)),
        control("tier_two", label("Tier II", [50, 9], (0, 36), scale=0.555)),
        control("tier_three", label("Tier III", [50, 9], (0, 83), scale=0.555)),
        research_node("innovation", "Stewardship", [66, 0], "stewardship"),
        research_node("frontier", "Frontier Expansion", [0, 47], "frontier_mandate"),
        research_node("capacity", "Settlement Charters", [132, 47], "settlement_charters"),
        research_node("colonization", "Colonization", [0, 94], "reclamation"),
        research_node("storage", "Shared Storage", [132, 94], "hoards"),
    ]
    return {"type": "panel", "size": [254, 131], "controls": controls}


def local_tree():
    # Visual grouping only: this does not introduce gameplay prerequisites.
    lines = [(127, 34, 1, 7), (61, 40, 133, 1),
             (61, 40, 1, 7), (193, 40, 1, 7),
             (61, 81, 1, 13), (193, 81, 1, 13)]
    controls = [control("branch_" + str(i), image("frontier/solid", [w, h], (x, y), 2, [0.55, 0.35, 0.14]))
                for i, (x, y, w, h) in enumerate(lines)]
    controls += [
        research_node("hearth", "Hearthstone", [66, 0], "hearthstone", local=True),
        research_node("biome", "Resource Prospecting", [0, 47], "resource_prospecting", local=True),
        research_node("sanctuary", "Sanctuary", [132, 47], "sanctuary", local=True),
        research_node("efficiency", "Prosperity", [0, 94], "prosperity", local=True),
        research_node("roads", "Road Networks", [132, 94], "road_networks", local=True),
    ]
    return {"type": "panel", "size": [254, 131], "controls": controls}


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
        control("leather", image("frontier/palette_leather", [344, 197], (18, 30), layer=2, color=[0.58, 0.58, 0.58])),
        control("banner", image("frontier/palette_leather", [344, 25], (18, 31), layer=3, color=[1, 1, 1])),
        control("banner_rule", image("frontier/solid", [344, 1], (18, 55), layer=4, color=list(WHEAT))),
        control("ornament", image("frontier/harvest_border", [380, 240], layer=20)),
        control("title", label("Village Charter", [236, 17], (30, 34), WHEAT, 1.0)),
        control("close@common.close_button", {"$close_button_offset": [-7, 7], "layer": 30, "bindings": []}),
    ]
    dashboard = [copy.deepcopy(item) for item in frame if 'title' not in item]
    dashboard.append(overview_value("header_name", DATA["overview"], [30, 34], [185, 12], scale=1.0))
    GENERATED_CONTROLS["jf_data_overview"]["color"] = list(WHEAT)
    dashboard.append(control("subtitle", label("Village Charter", [185, 8], (30, 46), SILVER, 0.65)))
    dashboard += [tab(name, index) for index, name in enumerate(TABS)]
    for name in TABS:
        lower = name.lower()
        if lower in ["overview", "research", "production", "realm", "information"]:
            dashboard.append(control(lower + "@jagsby_frontier.jf_" + lower + "_content", {
                "anchor_from": "top_left", "anchor_to": "top_left", "offset": [104, 62],
                "size": [257, 158], "layer": 5,
                "bindings": [view("#toggle_state", target, "jf_tab_" + lower)
                             for target in ["#visible", "#enabled"]],
            }))
            continue
        dashboard.append(control(lower + "@common.scrolling_panel", {
            "anchor_from": "top_left", "anchor_to": "top_left", "offset": [104, 62],
            "size": [257, 158], "layer": 5, "$show_background": False,
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
        "production": [],
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
    ui["jf_research_local_content"] = local_tree()
    research_controls = [research_tab("local", 0), research_tab("global", 1)]
    for scope in ["global", "local"]:
        if scope in ["global", "local"]:
            research_controls.append(control(scope + "@jagsby_frontier.jf_research_" + scope + "_content", {
                "anchor_from": "top_left", "anchor_to": "top_left", "offset": [0, 27], "size": [254, 131],
                "bindings": [view("#toggle_state", target, "jf_research_tab_" + scope) for target in ["#visible", "#enabled"]],
            }))
            continue
        research_controls.append(control(scope + "@common.scrolling_panel", {
            "anchor_from": "top_left", "anchor_to": "top_left", "offset": [0, 27],
            "size": [257, 131], "$show_background": False,
            "$scrolling_content": "jagsby_frontier.jf_research_" + scope + "_content",
            "$scroll_size": [4, "100% - 4px"], "$scrolling_pane_size": ["100% - 5px", "100% - 2px"],
            "bindings": [view("#toggle_state", target, "jf_research_tab_" + scope)
                         for target in ["#visible", "#enabled"]],
        }))
    ui["jf_research_content"] = {"type": "panel", "size": [257, 158], "controls": research_controls}
    # Two production tabs: output/modifiers above the shared stockpile.
    def production_value(name, key, y, height, scale=0.75, x=7, width=240):
        return overview_value(name, DATA[key], [x, y], [width, height], scale=scale)
    def production_button(name, key, caption, x, y=107, width=60, height=21):
        button = action(name, ACTIONS[key], caption, width=width, height=height)[name]
        button.update({"offset": [x, y], "size": [width, height], "anchor_from": "top_left", "anchor_to": "top_left"})
        for state in GENERATED_CONTROLS["jf_action_" + key + "@common.button"]["controls"]:
            panel = next(iter(state.values()))
            caption_control = next(c["caption"] for c in panel["controls"] if "caption" in c)
            caption_control.update({"offset": [3, 3], "size": [width - 6, 12], "font_scale_factor": 0.65})
        return control(name, button)
    def production_surface(name, size, offset):
        return control(name, image("frontier/palette_panel", size, offset, color=[0.82, 0.82, 0.82]))
    def percentage_value(name, key, offset, color=IVORY):
        # Measure the native number label and place a real font percent sign
        # immediately after it; no expression concatenation or bitmap glyph.
        template = data_template(DATA[key], ["default", 12], scale=0.75)
        GENERATED_CONTROLS[template]["color"] = list(color)
        number = collection_scope(template, ["100%c", 12])
        number.update({"anchor_from": "top_left", "anchor_to": "top_left"})
        percent = label("%", [6, 12], color=color, scale=0.75)
        percent["localize"] = False
        return control(name, {"type": "stack_panel", "orientation": "horizontal", "size": [40, 12],
            "anchor_from": "top_left", "anchor_to": "top_left", "offset": offset,
            "controls": [control("number", number), control("percent", percent)]})
    summary_controls = [
        production_surface("output_box", [131, 70], [0, 0]),
        production_surface("modifiers_box", [118, 70], [136, 0]),
        production_surface("stock_box", [254, 57], [0, 74]),
        production_value("status", "productionOutput", 5, 10, scale=0.8, width=119),
        control("modifiers_title", label("Modifiers", [62, 12], (143, 5), WHEAT, 0.8)),
        production_value("stock_heading", "stockpile", 76, 10, scale=0.75, width=240),
        production_button("collect", "collect", "Collect stockpile", 48, 115, 158, 15),
    ]
    GENERATED_CONTROLS["jf_data_productionOutput"]["color"] = list(WHEAT)
    summary_controls.append(percentage_value("modifier_total", "productionModifierTotal", [207, 5], WHEAT))
    for row in range(4):
        name = overview_value("name", DATA["productionModifierName" + str(row)], [0, 0], [62, 12], scale=0.75)
        value = percentage_value("value", "productionModifier" + str(row), [64, 0])
        summary_controls.append(control("modifier_row" + str(row), {
            "type": "panel", "size": [104, 12], "offset": [143, 17 + row * 10],
            "anchor_from": "top_left", "anchor_to": "top_left",
            "bindings": condition("(not ((#form_text - '[JF:modifier:" + str(row) + "]') = #form_text))", "#form_text"),
            "controls": [name, value],
        }))
    for state in GENERATED_CONTROLS["jf_action_collect@common.button"]["controls"]:
        caption = next(c["caption"] for c in next(iter(state.values()))["controls"] if "caption" in c)
        caption.update({"text_alignment": "center", "offset": [0, 2], "size": [158, 11], "font_scale_factor": 0.75})
    for slot in range(len(STOCK_ITEMS)):
        key = "stockCount" + str(slot)
        count = overview_value("count", DATA[key], [0, 6], [16, 8], scale=0.6)
        GENERATED_CONTROLS["jf_data_" + key].update({"text_alignment": "right", "shadow": True, "layer": 12})
        template = "jf_stock_icon" + str(slot)
        icon = image("frontier/production/wheat", [12, 12], layer=8)
        icon["keep_ratio"] = True
        icon["bindings"] = [
            {"binding_type": "collection_details", "binding_collection_name": "form_buttons"},
            {"binding_name": "#form_button_texture", "binding_name_override": "#texture", "binding_type": "collection", "binding_collection_name": "form_buttons"},
            {"binding_name": "#form_button_texture_file_system", "binding_name_override": "#texture_file_system", "binding_type": "collection", "binding_collection_name": "form_buttons"},
        ]
        ui[template] = icon
        picture = control("icon", {
            "type": "stack_panel", "orientation": "vertical", "size": [12, 12],
            "offset": [1, 0], "anchor_from": "top_left", "anchor_to": "top_left",
            "collection_name": "form_buttons", "controls": [
                control("record@jagsby_frontier." + template, {"collection_index": DATA[key]})],
        })
        summary_controls.append(control("stock_item" + str(slot), {
            "type": "panel", "size": [16, 14], "offset": [7 + (slot % 15) * 16, 86 + (slot // 15) * 14],
            "anchor_from": "top_left", "anchor_to": "top_left",
            "bindings": condition("(not ((#form_text - '[JF:stock:" + str(slot) + "]') = #form_text))", "#form_text"),
            "controls": [picture, count],
        }))
    for slot, y in enumerate([17, 38]):
        key = "productionItem" + str(slot)
        summary_controls.append(production_value("item" + str(slot), key, y, 18, scale=0.75, x=28, width=92))
        icon = image("frontier/production/wheat", [14, 14], layer=8)
        icon["keep_ratio"] = True
        icon["bindings"] = [
            {"binding_type": "collection_details", "binding_collection_name": "form_buttons"},
            {"binding_name": "#form_button_texture", "binding_name_override": "#texture", "binding_type": "collection", "binding_collection_name": "form_buttons"},
            {"binding_name": "#form_button_texture_file_system", "binding_name_override": "#texture_file_system", "binding_type": "collection", "binding_collection_name": "form_buttons"},
            view("(not (#texture = ''))"),
        ]
        template = "jf_production_icon" + str(slot)
        ui[template] = icon
        summary_controls.append(control("icon" + str(slot), {
            "type": "stack_panel", "orientation": "vertical", "size": [14, 14],
            "offset": [7, y], "anchor_from": "top_left", "anchor_to": "top_left",
            "collection_name": "form_buttons", "controls": [
                control("record@jagsby_frontier." + template, {"collection_index": DATA[key]})],
        }))
    prospect_rows = []
    for slot in range(52):
        info_key, select_key = "prospectInfo" + str(slot), "prospectSelect" + str(slot)
        icon_name = "jf_prospect_icon" + str(slot)
        icon = image("frontier/production/wheat", [22, 22], layer=8)
        icon["keep_ratio"] = True
        icon["bindings"] = [
            {"binding_type": "collection_details", "binding_collection_name": "form_buttons"},
            {"binding_name": "#form_button_texture", "binding_name_override": "#texture", "binding_type": "collection", "binding_collection_name": "form_buttons"},
            {"binding_name": "#form_button_texture_file_system", "binding_name_override": "#texture_file_system", "binding_type": "collection", "binding_collection_name": "form_buttons"},
        ]
        ui[icon_name] = icon
        picture = control("icon", {
            "type": "stack_panel", "orientation": "vertical", "size": [22, 22],
            "offset": [3, 4], "anchor_from": "top_left", "anchor_to": "top_left",
            "collection_name": "form_buttons", "controls": [control("record@jagsby_frontier." + icon_name, {"collection_index": DATA[info_key]})],
        })
        details = overview_value("details", DATA[info_key], [30, 2], [171, 28], scale=0.7)
        button = production_button("choose", select_key, "Select", 207, 6, 42, 20)
        selected = label("Selected", [44, 12], (207, 10), WHEAT, 0.6)
        selected["bindings"] = condition("(not ((#form_text - '[JF:prospectSelected:" + str(slot) + "]') = #form_text))", "#form_text")
        locked = label("Locked", [44, 12], (207, 10), SILVER, 0.6)
        locked["bindings"] = condition("(not ((#form_text - '[JF:prospectLocked]') = #form_text))", "#form_text")
        visible = condition("(not ((#form_text - '[JF:prospect:" + str(slot) + "]') = #form_text))", "#form_text")
        prospect_rows.append(control("biome" + str(slot), {
            "type": "stack_panel", "orientation": "vertical", "size": [254, "100%c"], "bindings": visible,
            "controls": [control("row", {"type": "panel", "size": [254, 32], "controls": [picture, details, button, control("selected", selected), control("locked", locked)]})],
        }))
    ui["jf_prospecting_rows"] = {"type": "stack_panel", "orientation": "vertical", "size": [254, "100%c"], "controls": prospect_rows}
    production_panels = {
        "summary": summary_controls,
        "biomes": [control("choices@common.scrolling_panel", {
            "anchor_from": "top_left", "anchor_to": "top_left", "offset": [0, 0],
            "size": [257, 109], "$show_background": False,
            "$scrolling_content": "jagsby_frontier.jf_prospecting_rows", "$scroll_size": [4, "100% - 4px"],
            "$scrolling_pane_size": ["100% - 5px", "100% - 2px"],
        }), production_button("clear", "clearSecondary", "Clear second", 65, 112, 124, 18)],
    }
    production_controls = [research_tab(scope, index, "production", caption) for index, (scope, caption) in enumerate([
        ("summary", "Overview"), ("biomes", "Resource Prospecting")])]
    for scope, children in production_panels.items():
        ui["jf_production_" + scope + "_content"] = {"type": "panel", "size": [257, 131], "controls": children}
        production_controls.append(control(scope + "@jagsby_frontier.jf_production_" + scope + "_content", {
            "offset": [0, 27], "anchor_from": "top_left", "anchor_to": "top_left", "size": [257, 131],
            "bindings": [view("#toggle_state", target, "jf_production_tab_" + scope) for target in ["#visible", "#enabled"]],
        }))
    ui["jf_production_content"] = {"type": "panel", "size": [257, 158], "controls": production_controls}
    rename = action("header_rename", ACTIONS["rename"], "Rename", width=58, height=17)["header_rename"]
    rename.update({"anchor_from": "top_left", "anchor_to": "top_left",
                   "offset": [289, 35], "layer": 25})
    # Flat crimson faces keep the header action quieter than the main title.
    for state in GENERATED_CONTROLS["jf_action_rename@common.button"]["controls"]:
        name, panel = next(iter(state.items()))
        controls = {key: value for item in panel["controls"] for key, value in item.items()}
        controls["caption"].update({"offset": [0, 3], "size": [58, 11],
                                    "text_alignment": "center", "font_scale_factor": 0.85})
    dashboard.append(control("header_rename", rename))
    survey = action("header_survey", ACTIONS["scan"], "Survey", width=58, height=17)["header_survey"]
    survey.update({"anchor_from": "top_left", "anchor_to": "top_left", "offset": [225, 35], "layer": 25})
    for state in GENERATED_CONTROLS["jf_action_scan@common.button"]["controls"]:
        caption = next(c["caption"] for c in next(iter(state.values()))["controls"] if "caption" in c)
        caption.update({"offset": [0, 3], "size": [58, 11], "text_alignment": "center", "font_scale_factor": 0.85})
    dashboard.append(control("header_survey", survey))

    portrait = image("frontier/settlements/outpost", [90, 158], layer=8)
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
    name = overview_value("name", DATA["overview"], [8, 5], [131, 12], scale=0.85)
    GENERATED_CONTROLS["jf_identity_name"] = GENERATED_CONTROLS["jf_data_overview"]
    GENERATED_CONTROLS["jf_identity_name"]["color"] = list(WHEAT)
    GENERATED_CONTROLS["jf_data_overview"] = header_name
    name["name"]["controls"] = [control("record@jagsby_frontier.jf_identity_name", {"collection_index": DATA["overview"]})]
    rows = []
    for key, title, y in [("tier", "Tier", 34), ("biomes", "Biome", 44),
                          ("zone", "Zone", 54), ("census", "Realm Power", 64)]:
        rows += [control(key + "_label", label(title, [56, 11], (8, y), color=SILVER, scale=0.75)),
                 overview_value(key, DATA[key], [70, y], [69, 12], scale=0.8)]
    # In unclaimed villages the Claim control occupies the Owner value slot.
    owner = overview_value("owner", DATA["owner"], [8, 18], [131, 10], scale=0.65)
    GENERATED_CONTROLS["jf_data_owner"]["color"] = list(SILVER)
    owner["owner"]["bindings"] = condition(
        "((#form_text - '[JF:unclaimed]') = #form_text)", "#form_text")
    claim = action("claim", ACTIONS["claim"], "Claim", width=44, height=12)["claim"]
    claim.update({"offset": [8, 16], "anchor_from": "top_left", "anchor_to": "top_left",
                  "layer": 12, "bindings": condition("(not ((#form_text - '[JF:unclaimed]') = #form_text))", "#form_text")})
    for state in GENERATED_CONTROLS["jf_action_claim@common.button"]["controls"]:
        caption = next(c["caption"] for c in next(iter(state.values()))["controls"] if "caption" in c)
        caption.update({"offset": [0, 1], "size": [44, 10], "font_scale_factor": 0.65, "text_alignment": "center"})
    identity = control("identity", {"type": "panel", "size": [147, 78], "offset": [0, 4],
        "anchor_from": "top_left", "anchor_to": "top_left", "controls": [
            control("surface", image("frontier/palette_panel", [147, 78], color=[0.82, 0.82, 0.82])),
            name,
            control("divider", image("frontier/solid", [131, 1], (8, 29), 2, list(WHEAT))),
            owner, *rows, control("claim", claim),
        ]})
    development_rows = [
        overview_value("developmentValue", DATA["developmentValue"], [6, 5], [59, 12], scale=0.65),
        control("developmentHourly_label", label("Dev/Hr", [25, 12], (6, 20), SILVER, 0.65)),
        overview_value("developmentHourly", DATA["developmentHourly"], [38, 20], [27, 12], scale=0.65),
        control("tradeRoute_label", label("Route", [25, 12], (6, 33), SILVER, 0.65)),
        overview_value("tradeRoute", DATA["tradeRoute"], [38, 33], [27, 21], scale=0.65),
    ]
    GENERATED_CONTROLS["jf_data_developmentValue"]["color"] = list(WHEAT)
    GENERATED_CONTROLS["jf_data_developmentHourly"]["text_alignment"] = "left"
    GENERATED_CONTROLS["jf_data_tradeRoute"]["text_alignment"] = "left"
    development_box = control("development", {"type": "panel", "size": [71, 56], "offset": [0, 86],
        "anchor_from": "top_left", "anchor_to": "top_left", "controls": [
            control("surface", image("frontier/palette_panel", [71, 56], color=[0.82, 0.82, 0.82])),
            *development_rows,
        ]})
    overview_production = [
        control("surface", image("frontier/palette_panel", [72, 56], color=[0.82, 0.82, 0.82])),
        control("title", label("Production", [60, 10], (6, 4), WHEAT, 0.65)),
    ]
    for slot, y in enumerate([17, 36]):
        key, template = "overviewProduction" + str(slot), "jf_overview_production_icon" + str(slot)
        icon = image("frontier/production/wheat", [14, 14], layer=8)
        icon["keep_ratio"] = True
        icon["bindings"] = [
            {"binding_type": "collection_details", "binding_collection_name": "form_buttons"},
            {"binding_name": "#form_button_texture", "binding_name_override": "#texture", "binding_type": "collection", "binding_collection_name": "form_buttons"},
            {"binding_name": "#form_button_texture_file_system", "binding_name_override": "#texture_file_system", "binding_type": "collection", "binding_collection_name": "form_buttons"},
            view("(not (#texture = ''))"),
        ]
        ui[template] = icon
        overview_production.append(control("icon" + str(slot), {
            "type": "stack_panel", "orientation": "vertical", "size": [14, 14], "offset": [5, y],
            "anchor_from": "top_left", "anchor_to": "top_left", "collection_name": "form_buttons", "controls": [
                control("record@jagsby_frontier." + template, {"collection_index": DATA[key]})],
        }))
        overview_production.append(overview_value("rate" + str(slot), DATA[key], [23, y + 3], [43, 12], scale=0.65))
    production_box = control("production", {"type": "panel", "size": [72, 56], "offset": [75, 86],
        "anchor_from": "top_left", "anchor_to": "top_left", "controls": overview_production})
    ui["jf_overview_content"] = {"type": "panel", "size": [257, 158], "controls": [
        control("portrait", {**collection_scope("jf_tier_portrait", [90, 158]),
            "anchor_from": "top_left", "anchor_to": "top_left", "offset": [167, 0]}),
        identity, development_box, production_box,
    ]}
    GENERATED_CONTROLS["jf_data_tier"].update({"text_alignment": "left"})
    ui["jf_information_content"] = {"type": "panel", "size": [257, 158], "controls": [
        control("heading", label("Information", [233, 14], (8, 8), WHEAT, 0.95)),
        control("rule", image("frontier/solid", [233, 1], (8, 29), 2, list(WHEAT))),
        control("placeholder", label("Road Networks\nOpen Realm > Road Networks to view connections.\nManage construction, upgrades and food-powered travel there.\nContribute research directly from the tech cards.", [233, 96], (8, 40), scale=0.75)),
    ]}
    realm_controls = [research_tab("roads", 0, "realm", "Road Networks"), research_tab("mine", 1, "realm", "My Settlements"), research_tab("all", 2, "realm", "All Settlements")]
    # Fixed explicit collection indices reuse the renderer verified in 0.0.66.
    # Interleave scopes by slot so a small world transmits only a short prefix.
    row_base = max([*DATA.values(), *ACTIONS.values()]) + 1
    row_limit, row_stride = 128, 24
    ui["jf_realm_icon"] = image("frontier/settlement_icons/outpost", [24, 24], layer=8)
    ui["jf_realm_icon"]["keep_ratio"] = True
    ui["jf_realm_icon"]["bindings"] = [
        {"binding_type": "collection_details", "binding_collection_name": "form_buttons"},
        {"binding_name": "#form_button_texture", "binding_name_override": "#texture", "binding_type": "collection", "binding_collection_name": "form_buttons"},
        {"binding_name": "#form_button_texture_file_system", "binding_name_override": "#texture_file_system", "binding_type": "collection", "binding_collection_name": "form_buttons"},
    ]
    def explicit_scope(template, index, offset, size):
        return {"type": "stack_panel", "orientation": "vertical", "size": size,
            "anchor_from": "top_left", "anchor_to": "top_left", "offset": offset,
            "collection_name": "form_buttons", "controls": [
                control("record@jagsby_frontier." + template, {"collection_index": index})]}

    def row_present(marker):
        return condition("(not ((#form_text - '" + marker + "') = #form_text))", "#form_text")

    for scope_index, scope in enumerate(["mine", "all", "roads"]):
        road = scope == "roads"
        height = 34 if road else 32
        field_specs = [
            ("name", 0, [33, 2], [76, 12], 0.75, WHEAT),
            ("owner", 1, [33, 15], [76, 12], 0.65, SILVER),
        ]
        if road:
            field_specs = [
                ("name", 0, [32, 2], [56, 12], 0.75, WHEAT),
                ("owner", 1, [32, 15], [56, 12], 0.65, SILVER),
                ("distance", 2, [91, 15], [38, 12], 0.6, IVORY),
                ("cost", 3, [132, 15], [30, 12], 0.6, IVORY),
                ("status", 4, [162, 24], [40, 9], 0.5, SILVER),
                ("time", 5, [162, 24], [40, 9], 0.5, SILVER),
            ]
        else:
            field_specs += [
                ("coordinates", 2, [112, 2], [62, 12], 0.65, IVORY),
                ("distance", 3, [112, 15], [62, 12], 0.65, IVORY),
                ("development", 4, [177, 15], [23, 12], 0.65, IVORY),
                ("status", 5, [201, 4], [47, 24], 0.65, IVORY),
            ]
        for field, _, offset, size, scale, color in field_specs:
            template = "jf_realm_" + scope + "_" + field
            text = label("#form_button_text", size, color=color, scale=scale)
            text["property_bag"] = {"#form_button_text": ""}
            if road and field in ["name", "owner"]:
                text["text_truncate"] = True
            text["bindings"] = [
                {"binding_type": "collection_details", "binding_collection_name": "form_buttons"},
                {"binding_name": "#form_button_text", "binding_type": "collection", "binding_collection_name": "form_buttons"}]
            if field == "status" or (road and field == "time"):
                text["text_alignment"] = "center"
            ui[template] = text
        if not road:
            button = copy.deepcopy(GENERATED_CONTROLS["jf_action_rename@common.button"])
            button.update({"size": [47, 24], "bindings": [{"binding_type": "collection_details", "binding_collection_name": "form_buttons"}]})
            for state in button["controls"]:
                state_name, panel = next(iter(state.items()))
                panel["size"] = [47, 24]
                panel["controls"] = [control("face", image(button_texture(47, 24, state_name), [47, 24])),
                    control("caption", {**label("Establish\nRoad", [41, 18], scale=0.65),
                        "text_alignment": "center", "anchor_from": "center", "anchor_to": "center", "offset": [0, 0]})]
            ui["jf_realm_establish_" + scope + "@common.button"] = button
        if road:
            for enabled in [True, False]:
                button = copy.deepcopy(GENERATED_CONTROLS["jf_action_rename@common.button"])
                button.update({"size": [43, 22], "enabled": enabled, "focus_enabled": enabled,
                    "bindings": [{"binding_type": "collection_details", "binding_collection_name": "form_buttons"}]})
                for state in button["controls"]:
                    state_name, panel = next(iter(state.items()))
                    panel["size"] = [43, 22]
                    panel["controls"] = [control("face", image(button_texture(43, 22, state_name), [43, 22])),
                        control("caption", {**label("Travel", [37, 12], color=IVORY if enabled else SILVER, scale=0.7),
                            "text_alignment": "center", "anchor_from": "center", "anchor_to": "center", "offset": [0, 0]})]
                ui["jf_realm_travel" + ("" if enabled else "_disabled") + "@common.button"] = button
            tier_action = copy.deepcopy(GENERATED_CONTROLS["jf_action_rename@common.button"])
            tier_action.update({"size": [24, 24], "controls": [],
                "bindings": [{"binding_type": "collection_details", "binding_collection_name": "form_buttons"}]})
            ui["jf_realm_tier_action@common.button"] = tier_action
            tier_icon = copy.deepcopy(ui["jf_realm_icon"])
            tier_icon["size"] = [20, 20]
            ui["jf_realm_road_tier_icon"] = tier_icon
        rows = []
        for slot in range(row_limit):
            base = row_base + slot * row_stride + scope_index * 8
            fields = [control("surface", image("frontier/palette_panel", [251, height - 1], color=[0.82, 0.82, 0.82])),
                      control("icon", explicit_scope("jf_realm_icon", base, [3, 3], [24, 24]))]
            for field, index, offset, size, _, _ in field_specs:
                fields.append(control(field, explicit_scope("jf_realm_" + scope + "_" + field, base + index, offset, size)))
            if road:
                fields.append(control("distance_label", label("Distance", [38, 12], (91, 2), SILVER, 0.6)))
                fields.append(control("cost_label", label("Corndogs", [30, 12], (132, 2), SILVER, 0.6)))
                icon = explicit_scope("jf_realm_road_tier_icon", base + 6, [170, 2], [20, 20])
                fields.append(control("tier_icon", icon))
                tier_action = explicit_scope("jf_realm_tier_action", base + 6, [168, 0], [24, 24])
                fields.append(control("tier_action", tier_action))
                for enabled in [True, False]:
                    key = "travel" if enabled else "travel_disabled"
                    travel = explicit_scope("jf_realm_" + key, base + 7, [205, 5], [43, 22])
                    travel["bindings"] = row_present("[JF:" + key + ":roads:" + str(slot) + "]")
                    fields.append(control(key, travel))
            else:
                fields.append(control("dev_label", label("Dev", [23, 12], (177, 2), SILVER, 0.65)))
                establish = explicit_scope("jf_realm_establish_" + scope, base + 6, [201, 4], [47, 24])
                establish["bindings"] = row_present("[JF:establish:" + scope + ":" + str(slot) + "]")
                fields.append(control("establish", establish))
            rows.append(control("row" + str(slot), {"type": "panel", "size": [251, height], "controls": fields,
                "bindings": row_present("[JF:row:" + scope + ":" + str(slot) + "]")}))
        ui["jf_realm_" + scope + "_rows"] = {"type": "stack_panel", "orientation": "vertical", "size": [251, "100%c"], "controls": rows}
        scroll = control("entries@common.scrolling_panel", {
            "anchor_from": "top_left", "anchor_to": "top_left", "offset": [0, 12 if road else 0],
            "size": [257, 119 if road else 131], "$show_background": False,
            "$scrolling_content": "jagsby_frontier.jf_realm_" + scope + "_rows",
            "$scroll_size": [4, "100% - 4px"], "$scrolling_pane_size": ["100% - 5px", "100% - 2px"]})
        content = [scroll]
        if road:
            content.append(overview_value("summary", DATA["roadSummary"], [3, 0], [248, 10], scale=0.6))
            content.append(overview_value("empty", DATA["roadDetails"], [7, 30], [236, 60], scale=0.7))
        else:
            empty = label("You do not own any settlements yet." if scope == "mine" else "No settlements registered.", [240, 24], (7, 8), IVORY, 0.75)
            empty["bindings"] = row_present("[JF:directory:" + scope + ":empty]")
            content.append(control("empty", empty))
        ui["jf_realm_" + scope + "_content"] = {"type": "panel", "size": [257, 131], "controls": content}
        realm_controls.append(control(scope + "@jagsby_frontier.jf_realm_" + scope + "_content", {
            "offset": [0, 27], "anchor_from": "top_left", "anchor_to": "top_left", "size": [257, 131],
            "bindings": [view("#toggle_state", target, "jf_realm_tab_" + scope) for target in ["#visible", "#enabled"]]}))
    ui["jf_realm_content"] = {"type": "panel", "size": [257, 158], "controls": realm_controls}
    picker = copy.deepcopy(frame)
    # Secondary-biome choices have their own custom button renderer, not the
    # vanilla long-form dynamic list used by the previous prototype.
    picker.append(control("options@common.scrolling_panel", {
        "anchor_from": "top_left", "anchor_to": "top_left", "offset": [104, 62],
        "size": [257, 158], "layer": 5, "$show_background": False,
        "$scrolling_content": "jagsby_frontier.jf_picker_content", "$scroll_size": [4, "100% - 4px"],
        "$scrolling_pane_size": ["100% - 5px", "100% - 2px"],
    }))
    picker.append(control("caption", label("Select", [88, 32], (10, 65), WHEAT)))
    ui["jf_picker"] = {"type": "panel", "size": [380, 240], "controls": picker}
    details = label("#form_text", [244, 185], color=IVORY, scale=0.75)
    details["bindings"] = [{"binding_name": "#form_text", "binding_type": "none"}]
    ui["jf_picker_content"] = {"type": "stack_panel", "orientation": "vertical", "size": [254, "100%c"],
        "controls": [heading("CHARTER DETAILS"), control("details", details), control("choices", {
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
        panel["controls"][0]["gold"] = image(button_texture(254, 21, next(iter(state))), [254, 21])
        panel["controls"][1]["wood"]["size"] = [252, 19]
        panel["controls"][2]["caption"].update({"text": "#text", "size": [242, 12], "bindings": collection_bindings()})
    ui["jf_choice@common.button"] = picker_template
    ui["jf_modal_router"] = {"type": "panel", "size": [380, 240], "controls": [
        control("vanilla@server_form.custom_form", {"bindings": condition("(not (#title_text = 'JF_CHARTER|Rename'))")}),
        control("rename@jagsby_frontier.jf_rename", {"bindings": condition("(#title_text = 'JF_CHARTER|Rename')")}),
    ]}
    submit = copy.deepcopy(GENERATED_CONTROLS["jf_action_prospectSelect0@common.button"])
    for state in submit["controls"]:
        panel = next(iter(state.values()))
        panel["controls"] = [entry for entry in panel["controls"] if "research_tooltip" not in entry]
        panel["controls"][2]["caption"]["text"] = "Save name"
    submit["$pressed_button_name"] = "button.submit_custom_form"
    for mapping in submit["button_mappings"]:
        mapping["to_button_id"] = "button.submit_custom_form"
    submit["bindings"] = []
    submit["size"] = [254, 21]
    for state in submit["controls"]:
        panel = next(iter(state.values()))
        panel["size"] = [254, 21]
        panel["controls"][0]["gold"] = image(button_texture(254, 21, next(iter(state))), [254, 21])
        panel["controls"][1]["wood"]["size"] = [252, 19]
        panel["controls"][2]["caption"]["size"] = [242, 12]
    submit.update({"anchor_from": "top_left", "anchor_to": "top_left", "offset": [104, 151]})
    ui["jf_rename"] = {"type": "panel", "size": [380, 240], "controls": copy.deepcopy(frame) + [
        control("caption", label("Rename", [88, 32], (10, 65), WHEAT)),
        control("input@server_form.generated_contents", {"anchor_from": "top_left", "anchor_to": "top_left",
            "offset": [104, 70], "size": [254, "100%c"], "layer": 5}),
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
    layout = {"data": DATA, "actions": ACTIONS, "recordCount": max([*DATA.values(), *ACTIONS.values()]) + 1, "tabs": TABS, "realmRows": {"base": row_base, "limit": row_limit, "stride": row_stride, "scopes": ["mine", "all", "roads"]}}
    (ROOT / "packs/behavior/scripts/charter-layout.js").write_text(
        "// Generated by tools/build_charter_ui.py; indices match the JSON UI.\n"
        "export const CHARTER_LAYOUT = " + json.dumps(layout, indent=2) + ";\n")
    print("Generated standalone Frontier UI, registration and minimal Bedrock entry hook.")


if __name__ == "__main__":
    build()
