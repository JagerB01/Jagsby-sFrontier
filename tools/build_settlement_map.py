"""Map geometry uses explicit rectangles; markers expose ordinary hover panels."""
import copy
from build_ui_art import button_texture, map_tooltip_texture

CELL = 6
COLUMNS, ROWS = 40, 25
WIDTH, HEIGHT = COLUMNS * CELL, ROWS * CELL
ART_SIZE = 16
TOOLTIP_WIDTH, TOOLTIP_GAP = 108, 4
GRID_X, GRID_Y = 110, 68
X_TICKS = range(0, WIDTH + 1, 40)
Z_TICKS = range(0, HEIGHT + 1, 30)
MAP_LAYOUT = {"columns": COLUMNS, "rows": ROWS, "cells": COLUMNS * ROWS, "width": WIDTH, "height": HEIGHT}
MAP_LAYOUT.update({key: COLUMNS * ROWS + i for i, key in enumerate([
    "back", "fit", "zoomOut", "zoomIn", "west", "east", "north", "south", "dimension", "refresh",
    "nextPage", "provinceLines", "zoneLines"])})
MAP_LAYOUT["xTicks"] = list(range(MAP_LAYOUT["zoneLines"] + 1, MAP_LAYOUT["zoneLines"] + 1 + len(X_TICKS)))
MAP_LAYOUT["zTicks"] = list(range(MAP_LAYOUT["xTicks"][-1] + 1, MAP_LAYOUT["xTicks"][-1] + 1 + len(Z_TICKS)))
MAP_LAYOUT["poiTravel"] = MAP_LAYOUT["zTicks"][-1] + 1


def build_map_ui(ui, frame):
    province_color = [0.66, 0.51, 0.26]
    zone_color = [0.30, 0.65, 0.62]
    overlay_controls = ("provinceLines", "zoneLines")
    caption_colors = {"provinceLines": (0.93, 0.78, 0.49), "zoneLines": (0.55, 0.85, 0.81)}

    def c(name, value): return {name: value}
    def label(text, size, offset=(0, 0), color=(0.88, 0.91, 0.86), scale=0.6):
        return {"type": "label", "text": text, "size": size, "offset": list(offset),
                "anchor_from": "top_left", "anchor_to": "top_left", "layer": 8,
                "color": list(color), "font_scale_factor": scale}
    def image(size, offset, color):
        return {"type": "image", "texture": "textures/ui/frontier/solid", "size": size,
                "offset": offset, "anchor_from": "top_left", "anchor_to": "top_left", "color": color,
                "keep_ratio": False, "bilinear": False, "layer": 3}
    bindings = [{"binding_type": "collection_details", "binding_collection_name": "form_buttons"},
                {"binding_name": "#form_button_text", "binding_type": "collection", "binding_collection_name": "form_buttons"}]
    def scope(template, index, size, offset):
        return {"type": "stack_panel", "orientation": "vertical", "collection_name": "form_buttons",
                "size": size, "offset": offset, "anchor_from": "top_left", "anchor_to": "top_left",
                "controls": [c("record@jagsby_frontier." + template, {"collection_index": index})]}
    def sprite(texture, size, offset):
        return {"type": "image", "texture": "textures/ui/frontier/"+texture, "size": size,
                "offset": offset, "anchor_from": "top_left", "anchor_to": "top_left", "layer": 8,
                "keep_ratio": False, "bilinear": False}
    for key, width, alignment in [("x_tick", 40, "center"), ("z_tick", 28, "left")]:
        ui["jf_map_" + key] = {
            **label("#form_button_text", [width, 8], scale=0.45),
            "text_alignment": alignment, "bindings": copy.deepcopy(bindings)}

    art = sprite("poi_markers/village", [ART_SIZE, ART_SIZE], [0, 0])
    art["layer"] = 20
    art["bindings"] = [
        {"binding_type": "collection_details", "binding_collection_name": "form_buttons"},
        {"binding_name": "#form_button_texture", "binding_name_override": "#texture",
         "binding_type": "collection", "binding_collection_name": "form_buttons"},
        {"binding_name": "#form_button_texture_file_system", "binding_name_override": "#texture_file_system",
         "binding_type": "collection", "binding_collection_name": "form_buttons"}]
    province_mode = "(not ((#form_text - '[JF:provinceView]') = #form_text))"
    art["bindings"].append({"binding_type": "view", "source_control_name": "jf_map_boundary_state",
                            "source_property_name": f"(not {province_mode})", "target_property_name": "#visible"})
    ui["jf_map_pin_art"] = art
    # The texture supplied in the form contains two crops of the same icon.
    # Each crop includes room for the sub-cell offset in either direction.
    for name, size, atlas_x, layer in (("idle", CELL, 0, 8), ("hover", ART_SIZE, (CELL * 2) * 4, 20)):
        padded = size + CELL
        ui["jf_map_province_" + name] = {
            **sprite("province_pins/0_0", [padded, padded], [(CELL - padded) // 2] * 2),
            "uv": [atlas_x, 0], "uv_size": [padded * 4, padded * 4], "layer": layer,
            "bindings": copy.deepcopy(art["bindings"][:-1]) + [
                {"binding_type": "view", "source_control_name": "jf_map_boundary_state",
                 "source_property_name": province_mode, "target_property_name": "#visible"}],
        }
    ui["jf_map_pin_details"] = {
        "type": "panel", "size": [TOOLTIP_WIDTH, "100%cm"],
        "anchor_from": "top_left", "anchor_to": "top_left",
        "layer": 100, "allow_clipping": False, "controls": [
            c("background", {**sprite(map_tooltip_texture().removeprefix("frontier/"),
                                       [TOOLTIP_WIDTH, "100%sm"], [0, 0]),
                             "layer": 3, "nineslice_size": 7}),
            c("content", {"type": "stack_panel", "orientation": "vertical",
                "size": [TOOLTIP_WIDTH, "100%c"], "anchor_from": "top_left", "anchor_to": "top_left",
                "controls": [
                    c("top_padding", {"type": "panel", "size": [TOOLTIP_WIDTH, 5]}),
                    c("body", {"type": "panel", "size": [TOOLTIP_WIDTH, "100%cm"], "controls": [
                        c("text", {**label("#form_button_text", [TOOLTIP_WIDTH - 12, "default"], (6, 0), scale=0.65),
                                   "property_bag": {"#form_button_text": ""}, "bindings": copy.deepcopy(bindings)})]}),
                    c("bottom_padding", {"type": "panel", "size": [TOOLTIP_WIDTH, 5]}),
                ]})]}
    ui["jf_map_pin"] = {
        "type": "button", "size": [CELL, CELL], "offset": [0, 0],
        "anchor_from": "top_left", "anchor_to": "top_left", "allow_clipping": False,
        "focus_enabled": True, "hover_enabled": True, "button_mappings": [],
        "default_control": "idle", "hover_control": "info", "pressed_control": "info",
        "bindings": copy.deepcopy(bindings) + [
            {"binding_type": "view", "source_property_name": "(not (#form_button_text = ''))", "target_property_name": prop}
            for prop in ["#visible", "#enabled"]]
    }
    def hover_marker(template, slot, x, z):
        # The hit area stays fixed. Clamp the expanded art at the map border.
        art_x = min(WIDTH - ART_SIZE, max(0, x + (CELL - ART_SIZE) // 2))
        art_z = min(HEIGHT - ART_SIZE, max(0, z + (CELL - ART_SIZE) // 2))
        tooltip_x = art_x + ART_SIZE + TOOLTIP_GAP
        if tooltip_x + TOOLTIP_WIDTH > WIDTH:
            tooltip_x = art_x - TOOLTIP_GAP - TOOLTIP_WIDTH
        tooltip_anchor = "top_left" if z < HEIGHT / 2 else "bottom_left"
        ui[template + "@jagsby_frontier.jf_map_pin"] = {"controls": [
            c("idle", {"type": "panel", "size": [CELL, CELL], "offset": [0, 0],
                       "anchor_from": "top_left", "anchor_to": "top_left", "allow_clipping": False,
                       "controls": [
                           c("art@jagsby_frontier.jf_map_pin_art", {"size": [CELL, CELL], "layer": 8, "collection_index": slot}),
                           c("province_art@jagsby_frontier.jf_map_province_idle", {"collection_index": slot})]}),
            c("info", {"type": "panel", "size": [CELL, CELL], "offset": [0, 0],
                       "anchor_from": "top_left", "anchor_to": "top_left", "allow_clipping": False,
                       "controls": [
                           c("art@jagsby_frontier.jf_map_pin_art", {"offset": [art_x - x, art_z - z], "collection_index": slot}),
                           c("province_art@jagsby_frontier.jf_map_province_hover", {"collection_index": slot}),
                           c("tooltip@jagsby_frontier.jf_map_pin_details",
                             {"offset": [tooltip_x - x, 0],
                              "anchor_from": tooltip_anchor, "anchor_to": tooltip_anchor})]})]}
    content=copy.deepcopy([item for item in frame if 'title' not in item])
    content.append(c("title", label("Diplomacy Map", [170, 14], (28, 34), color=(0.86, 0.73, 0.44), scale=1)))
    content.append(c("jf_map_boundary_state", {
        "type": "panel", "size": [0, 0], "property_bag": {"#form_text": ""},
        "bindings": [{"binding_name": "#form_text", "binding_type": "none", "binding_condition": "always"}]}))
    content.append(c("z_axis", label("Z", [28, 8], (GRID_X + WIDTH + 2, GRID_Y - 20), scale=0.55)))
    grid=[c("border", image([WIDTH+2, HEIGHT+2], [-1, -1], [0.32, 0.34, 0.30])),
          c("black", image([WIDTH, HEIGHT], [0, 0], [0.025, 0.035, 0.03]))]
    for i, x in enumerate(X_TICKS):
        grid.append(c(f"x{i}", image([1, HEIGHT], [min(WIDTH - 1, x), 0], [0.10, 0.14, 0.11])))
        content.append(c(f"x_tick{i}", scope("jf_map_x_tick", MAP_LAYOUT["xTicks"][i], [40, 8],
                                             [GRID_X + x - 20, GRID_Y - 11])))
    for i, z in enumerate(Z_TICKS):
        grid.append(c(f"z{i}", image([WIDTH, 1], [0, min(HEIGHT - 1, z)], [0.10, 0.14, 0.11])))
        content.append(c(f"z_tick{i}", scope("jf_map_z_tick", MAP_LAYOUT["zTicks"][i], [28, 8],
                                             [GRID_X + WIDTH + 2, GRID_Y + z - 4])))
    def boundary_line(size, offset, color, layer, marker):
        boundary = image(size, offset, color)
        boundary["layer"] = layer
        boundary["bindings"] = [{
            "binding_type": "view", "source_control_name": "jf_map_boundary_state",
            "source_property_name": f"(not ((#form_text - '{marker}') = #form_text))",
            "target_property_name": "#visible",
        }]
        return boundary

    for axis, count in (("x", WIDTH), ("z", HEIGHT)):
        for pixel in range(count):
            size, offset = ([1, HEIGHT], [pixel, 0]) if axis == "x" else ([WIDTH, 1], [0, pixel])
            grid.append(c(f"province_{axis}{pixel}",
                          boundary_line(size, offset, province_color, 5, f"[JF:province:{axis}:{pixel}]")))
    for axis, across, along in (("x", COLUMNS, ROWS), ("z", ROWS, COLUMNS)):
        for line in range(across + 1):
            perpendicular = min(line * CELL, across * CELL - 1)
            for cell in range(along):
                parallel = cell * CELL
                # Include the endpoint pixel so the two sides meet at a corner.
                length = min(CELL + 1, along * CELL - parallel)
                size, offset = ([1, length], [perpendicular, parallel]) if axis == "x" else (
                    [length, 1], [parallel, perpendicular])
                grid.append(c(f"zone_{axis}{line}_{cell}",
                              boundary_line(size, offset, zone_color, 4, f"[JF:zone:{axis}:{line}:{cell}]")))
    for slot in range(COLUMNS*ROWS):
        x, z = (slot % COLUMNS) * CELL, (slot // COLUMNS) * CELL
        template = f"jf_map_marker_{slot}"
        hover_marker(template, slot, x, z)
        grid.append(c("cell"+str(slot), scope(template, slot, [CELL, CELL], [x, z])))
    content.append(c("grid", {"type":"panel","size":[WIDTH,HEIGHT],"offset":[GRID_X,GRID_Y],
        "anchor_from":"top_left","anchor_to":"top_left","clips_children":True,"controls":grid}))
    # One framed control panel, kept outside the drawing area.
    panel=[c("edge", image([76, 162], [0, 0], [0.30, 0.32, 0.28])),
           c("background", image([74, 160], [1, 1], [0.075, 0.09, 0.08])),
           c("heading", label("Controls", [64, 10], (6, 4), color=(0.86, 0.73, 0.44), scale=0.65))]
    controls=[("fit",62,16,7,17), ("zoomOut",29,16,7,36), ("zoomIn",29,16,40,36),
              ("north",28,14,24,56), ("west",28,14,7,73), ("east",28,14,40,73),
              ("south",28,14,24,90), ("dimension",62,16,7,109),
              ("refresh",62,14,7,128), ("back",62,14,7,145),
              ("nextPage",120,12,GRID_X,221),
              ("poiTravel",108,12,242,221),
              ("provinceLines",90,16,168,34), ("zoneLines",90,16,262,34)]
    for key,width,height,x,y in controls:
        template="jf_map_"+key
        states=[]
        for state in ['default','hover','pressed']:
            states.append(c(state,{"type":"panel","size":[width,height],"controls":[
                c('face', {**sprite(button_texture(width, height, state).removeprefix("frontier/"),
                                    [width, height], [0, 0]), "layer": 3}),
                c('caption',{**label('#form_button_text',[width-4,10],(2,3),
                    color=caption_colors.get(key, (0.88, 0.91, 0.86)),scale=0.6),
                    'text_alignment':'center','bindings':copy.deepcopy(bindings)})]}))
        button={"size":[width,height],"focus_enabled":True,"hover_enabled":True,
            "$pressed_button_name":"button.form_button_click","bindings":copy.deepcopy(bindings),
            "default_control":"default","hover_control":"hover","pressed_control":"pressed",
            "button_mappings":[{"from_button_id":"button.menu_select","to_button_id":"button.form_button_click","mapping_type":"pressed"},
                {"from_button_id":"button.menu_ok","to_button_id":"button.form_button_click","mapping_type":"focused"}],"controls":states}
        if key in ['zoomIn','zoomOut']:
            button['button_mappings'].append({'from_button_id':'button.menu_up' if key=='zoomIn' else 'button.menu_down',
                'to_button_id':'button.form_button_click','mapping_type':'global','scope':'view','input_mode_condition':'gamepad_and_not_gaze'})
        if key in ("nextPage", "poiTravel") or key in overlay_controls:
            button["bindings"].extend(
                {"binding_type": "view", "source_property_name": "(not (#form_button_text = ''))",
                 "target_property_name": prop} for prop in ("#visible", "#enabled"))
        ui[template+'@common.button']=button
        target = content if key in ("nextPage", "poiTravel") or key in overlay_controls else panel
        target.append(c(key,scope(template,MAP_LAYOUT[key],[width,height],[x,y])))
    content.append(c('controls',{'type':'panel','size':[76,162],'offset':[26,61],
        'anchor_from':'top_left','anchor_to':'top_left','controls':panel}))
    ui['jf_settlement_map']={"type":"panel","size":[380,240],"controls":content}
