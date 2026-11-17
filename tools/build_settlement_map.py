"""Map geometry uses explicit rectangles; markers only expose native hover text."""
import copy

COLUMNS, ROWS, WIDTH, HEIGHT = 12, 6, 240, 144
MAP_LAYOUT = {"columns": COLUMNS, "rows": ROWS, "cells": COLUMNS * ROWS}
MAP_LAYOUT.update({key: COLUMNS * ROWS + i for i, key in enumerate([
    "back", "fit", "zoomOut", "zoomIn", "west", "east", "north", "south", "dimension", "refresh", "bounds", "details"])})
MAP_LAYOUT["names"] = MAP_LAYOUT["details"] + 1


def build_map_ui(ui, frame):
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
    for key, size, scale in [("bounds", [240, 12], 0.6), ("details", [240, 10], 0.5), ("name", [20, 9], 0.4)]:
        ui["jf_map_" + key] = {**label("#form_button_text", size, scale=scale), "bindings": copy.deepcopy(bindings)}
        if key=="name":
            ui["jf_map_name"].update({"text_alignment":"center","color":[0.5,1.0,0.55]})
    # An inert hover/focus hit target, without button chrome, submit mappings or
    # a pressed event. The engine's button primitive provides hover state only.
    marker_controls=[]
    for state in ["idle", "info"]:
        children=[c("icon", sprite("map_settlement", [9, 9], [2, 1]))]
        if state=="info":
            # Ordinary panels/images/labels, matching the working research
            # popovers. Avoid the native custom hover renderer on form records.
            text={**label("#form_button_text", [148, "default"], (6, 0), scale=0.65),
                "property_bag":{"#form_button_text":""},"bindings":copy.deepcopy(bindings)}
            body={"type":"stack_panel","orientation":"vertical","size":[160,"100%c"],"controls":[
                c("top",{"type":"panel","size":[160,6]}),
                c("text",{"type":"panel","size":[160,"100%cm"],"controls":[c("inset",text)]}),
                c("bottom",{"type":"panel","size":[160,6]})]}
            children.append(c("tooltip",{"type":"panel","size":[160,"100%cm"],
                "offset":["$info_x","$info_y"],"anchor_from":"top_left","anchor_to":"$info_anchor",
                "layer":100,"allow_clipping":False,"controls":[
                    c("background",image([160,"100%sm"],[0,0],[0.07,0.08,0.07])),
                    c("left_edge",image([1,"100%sm"],[0,0],[0.64,0.58,0.37])),
                    c("right_edge",image([1,"100%sm"],[159,0],[0.64,0.58,0.37])),
                    c("content",body)]}))
        marker_controls.append(c(state, {"type": "panel", "size": [20, 20], "controls": children}))
    ui["jf_map_marker"]={"$info_x|default":20,"$info_y|default":20,"$info_anchor|default":"top_left","type": "button", "size": [20, 20], "focus_enabled": True,
        "hover_enabled": True, "button_mappings": [], "default_control": "idle", "hover_control": "info", "pressed_control": "info",
        "bindings": copy.deepcopy(bindings)+[
            {"binding_type": "view", "source_property_name": "(not (#form_button_text = ''))", "target_property_name": "#visible"},
            {"binding_type": "view", "source_property_name": "(not (#form_button_text = ''))", "target_property_name": "#enabled"}],
        "controls": marker_controls}
    content=copy.deepcopy([item for item in frame if 'title' not in item])
    content.append(c("title", label("Settlement Map", [170, 14], (28, 34), color=(0.86, 0.73, 0.44), scale=1)))
    content.append(c("bounds", scope("jf_map_bounds", MAP_LAYOUT['bounds'], [240, 12], [110, 56])))
    content.append(c("details", scope("jf_map_details", MAP_LAYOUT['details'], [240, 10], [110, 214])))
    grid=[c("border", image([242, 146], [-1, -1], [0.32, 0.34, 0.30])),
          c("black", image([WIDTH, HEIGHT], [0, 0], [0.025, 0.035, 0.03]))]
    for x in range(COLUMNS+1): grid.append(c("x"+str(x), image([1, HEIGHT], [min(WIDTH-1, x*20), 0], [0.10, 0.14, 0.11])))
    for z in range(ROWS+1): grid.append(c("z"+str(z), image([WIDTH, 1], [0, min(HEIGHT-1, z*24)], [0.10, 0.14, 0.11])))
    for slot in range(COLUMNS*ROWS):
        x,z=(slot%COLUMNS)*20,(slot//COLUMNS)*24
        marker=scope("jf_map_marker", slot, [20, 20], [x, z])
        marker["controls"][0]["record@jagsby_frontier.jf_map_marker"].update({
            "$info_x":min(x+20, WIDTH-160)-x,
            "$info_y":20 if slot//COLUMNS<3 else -2,
            "$info_anchor":"top_left" if slot//COLUMNS<3 else "bottom_left"})
        grid.append(c("cell"+str(slot), marker))
        grid.append(c("name"+str(slot), scope("jf_map_name", MAP_LAYOUT['names']+slot, [20, 9], [x, z+11])))
        spawn=sprite("map_spawn", [9, 9], [x+11, z+1])
        spawn['bindings']=[{"binding_name": "#form_text", "binding_type": "none"},
            {"binding_type": "view", "source_property_name": f"(not ((#form_text - '[JF:spawn:{slot}]') = #form_text))", "target_property_name": "#visible"}]
        grid.append(c("spawn"+str(slot),spawn))
    content.append(c("grid", {"type": "panel", "size": [WIDTH, HEIGHT], "offset": [110, 68],
        "anchor_from": "top_left", "anchor_to": "top_left", "controls": grid}))
    # One framed control panel, kept outside the drawing area.
    panel=[c("edge", image([76, 162], [0, 0], [0.30, 0.32, 0.28])),
           c("background", image([74, 160], [1, 1], [0.075, 0.09, 0.08])),
           c("heading", label("Controls", [64, 10], (6, 4), color=(0.86, 0.73, 0.44), scale=0.65))]
    controls=[("fit",62,16,7,17), ("zoomOut",29,16,7,36), ("zoomIn",29,16,40,36),
              ("north",28,14,24,56), ("west",28,14,7,73), ("east",28,14,40,73),
              ("south",28,14,24,90), ("dimension",62,16,7,109),
              ("refresh",62,14,7,128), ("back",62,14,7,145)]
    for key,width,height,x,y in controls:
        template="jf_map_"+key
        states=[]
        for state in ['default','hover','pressed']:
            states.append(c(state,{"type":"panel","size":[width,height],"controls":[
                c('rim',image([width,height],[0,0],[0.48,0.48,0.41] if state=='default' else [0.75,0.65,0.40])),
                c('face',image([width-2,height-2],[1,1],[0.13,0.16,0.14] if state=='default' else [0.22,0.26,0.21])),
                c('caption',{**label('#form_button_text',[width-4,10],(2,3),scale=0.6),
                    'text_alignment':'center','bindings':copy.deepcopy(bindings)})]}))
        button={"size":[width,height],"focus_enabled":True,"hover_enabled":True,
            "$pressed_button_name":"button.form_button_click","bindings":copy.deepcopy(bindings),
            "default_control":"default","hover_control":"hover","pressed_control":"pressed",
            "button_mappings":[{"from_button_id":"button.menu_select","to_button_id":"button.form_button_click","mapping_type":"pressed"},
                {"from_button_id":"button.menu_ok","to_button_id":"button.form_button_click","mapping_type":"focused"}],"controls":states}
        if key in ['zoomIn','zoomOut']:
            button['button_mappings'].append({'from_button_id':'button.menu_up' if key=='zoomIn' else 'button.menu_down',
                'to_button_id':'button.form_button_click','mapping_type':'global','scope':'view','input_mode_condition':'gamepad_and_not_gaze'})
        ui[template+'@common.button']=button
        panel.append(c(key,scope(template,MAP_LAYOUT[key],[width,height],[x,y])))
    content.append(c('controls',{'type':'panel','size':[76,162],'offset':[26,61],
        'anchor_from':'top_left','anchor_to':'top_left','controls':panel}))
    content.append(c('legend',label('Green: settlement  Gold: spawn',[150,10],(204,38),scale=0.45)))
    ui['jf_settlement_map']={"type":"panel","size":[380,240],"controls":content}
