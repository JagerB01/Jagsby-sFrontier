"""Fixed native form slots, projected in script; no dynamic UI property names."""
import copy

COLUMNS, ROWS = 12, 6
MAP_LAYOUT = {"columns": COLUMNS, "rows": ROWS, "cells": COLUMNS * ROWS}
MAP_LAYOUT.update({key: COLUMNS * ROWS + i for i, key in enumerate([
    "back", "fit", "zoomOut", "zoomIn", "west", "east", "north", "south", "dimension", "refresh", "bounds", "details"])})


def build_map_ui(ui, frame):
    def c(name, value): return {name: value}
    def label(text, size, offset=(0, 0), color=(0.88, 0.91, 0.86), scale=0.6):
        return {"type": "label", "text": text, "size": size, "offset": list(offset),
                "anchor_from": "top_left", "anchor_to": "top_left", "layer": 8,
                "color": list(color), "font_scale_factor": scale}
    def image(size, offset, color):
        return {"type": "image", "texture": "textures/ui/frontier/solid", "size": size,
                "offset": offset, "anchor_from": "top_left", "anchor_to": "top_left", "color": color, "layer": 3}
    bindings = [{"binding_type": "collection_details", "binding_collection_name": "form_buttons"},
                {"binding_name": "#form_button_text", "binding_type": "collection", "binding_collection_name": "form_buttons"}]
    def scope(template, index, size, offset):
        return {"type": "stack_panel", "orientation": "vertical", "collection_name": "form_buttons",
                "size": size, "offset": offset, "anchor_from": "top_left", "anchor_to": "top_left",
                "controls": [c("record@jagsby_frontier." + template, {"collection_index": index})]}
    for key, size, scale in [("bounds", [320, 14], 0.55), ("details", [320, 25], 0.65)]:
        ui["jf_map_" + key] = {**label("#form_button_text", size, scale=scale), "bindings": copy.deepcopy(bindings)}
    def button(template, width, height, marker=False):
        controls=[]
        for state in ["default", "hover", "pressed"]:
            children=[]
            if not marker or state!='default':
                children.append(c("background", image([width, height], [0, 0], [0.20, 0.27, 0.20] if state!='default' else [0.12, 0.15, 0.13])))
            if marker:
                children.append(c("icon", {"type": "image", "texture": "textures/ui/frontier/map_settlement",
                    "size": [8, 8], "offset": [9, 0], "anchor_from": "top_left", "anchor_to": "top_left", "layer": 8, "bilinear": False}))
            children.append(c("caption", {**label("#form_button_text", [width, 9], (0, 9 if marker else 3),
                color=(0.5, 1.0, 0.55) if marker else (0.9, 0.93, 0.88), scale=0.45 if marker else 0.55),
                "text_alignment": "center", "bindings": copy.deepcopy(bindings)}))
            controls.append(c(state, {"type": "panel", "size": [width, height], "controls": children}))
        ui[template + "@common.button"] = {"size": [width, height], "focus_enabled": True, "hover_enabled": True,
            "$pressed_button_name": "button.form_button_click", "bindings": copy.deepcopy(bindings) + ([
                {"binding_type": "view", "source_property_name": "(not (#form_button_text = ''))", "target_property_name": "#visible"},
                {"binding_type": "view", "source_property_name": "(not (#form_button_text = ''))", "target_property_name": "#enabled"}] if marker else []),
            "default_control": "default", "hover_control": "hover", "pressed_control": "pressed",
            "button_mappings": [
                {"from_button_id": "button.menu_select", "to_button_id": "button.form_button_click", "mapping_type": "pressed"},
                {"from_button_id": "button.menu_ok", "to_button_id": "button.form_button_click", "mapping_type": "focused"}], "controls": controls}
    button("jf_map_marker", 26, 20, True)
    content=copy.deepcopy([item for item in frame if 'title' not in item])
    content.append(c("title", label("Settlement Map  |  D-pad Up/Down: zoom", [290, 14], (30, 34), scale=0.7)))
    content.append(c("bounds", scope("jf_map_bounds", MAP_LAYOUT['bounds'], [320, 14], [30, 61])))
    content.append(c("details", scope("jf_map_details", MAP_LAYOUT['details'], [320, 25], [30, 199])))
    grid=[c("black", image([312, 120], [0, 0], [0.025, 0.035, 0.03]))]
    for x in range(COLUMNS+1): grid.append(c("x"+str(x), image([1, 120], [min(311, x*26), 0], [0.12, 0.16, 0.13])))
    for z in range(ROWS+1): grid.append(c("z"+str(z), image([312, 1], [0, min(119, z*20)], [0.12, 0.16, 0.13])))
    for slot in range(COLUMNS*ROWS):
        grid.append(c("cell"+str(slot), scope("jf_map_marker", slot, [26, 20], [(slot%COLUMNS)*26, (slot//COLUMNS)*20])))
    content.append(c("grid", {"type": "panel", "size": [312, 120], "offset": [30, 77],
        "anchor_from": "top_left", "anchor_to": "top_left", "controls": grid}))
    x=30
    for key, width in [("back", 34), ("fit", 24), ("zoomOut", 18), ("zoomIn", 18), ("west", 18), ("east", 18), ("north", 18), ("south", 18), ("dimension", 62), ("refresh", 47)]:
        template="jf_map_"+key
        button(template, width, 14)
        if key in ["zoomIn", "zoomOut"]:
            # Native form selection retains this button's explicit collection
            # index. Restrict the shortcut to gamepad input on the map view.
            zoom = ui[template + "@common.button"]
            zoom["button_mappings"].append({
                "from_button_id": "button.menu_up" if key == "zoomIn" else "button.menu_down",
                "to_button_id": "button.form_button_click", "mapping_type": "global",
                "scope": "view", "input_mode_condition": "gamepad_and_not_gaze"})
            zoom["tts_name"] = "Zoom in, D-pad up" if key == "zoomIn" else "Zoom out, D-pad down"
        content.append(c(key, scope(template, MAP_LAYOUT[key], [width, 14], [x, 47])))
        x+=width+2
    ui['jf_settlement_map']={"type": "panel", "size": [380, 240], "controls": content}
