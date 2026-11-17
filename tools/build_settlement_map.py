"""Map geometry uses explicit rectangles; markers expose ordinary hover panels."""
import copy

COLUMNS, ROWS, WIDTH, HEIGHT = 6, 3, 240, 90
MAP_LAYOUT = {"columns": COLUMNS, "rows": ROWS, "cells": COLUMNS * ROWS}
MAP_LAYOUT.update({key: COLUMNS * ROWS + i for i, key in enumerate([
    "back", "fit", "zoomOut", "zoomIn", "west", "east", "north", "south", "dimension", "refresh", "bounds", "details"])})
MAP_LAYOUT["names"] = MAP_LAYOUT["details"] + 1
MAP_LAYOUT["spawnInfo"] = MAP_LAYOUT["names"] + MAP_LAYOUT["cells"]


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
    for key, size, scale in [("bounds", [240, 12], 0.6), ("details", [240, 10], 0.5), ("name", [40, 9], 0.5)]:
        ui["jf_map_" + key] = {**label("#form_button_text", size, scale=scale), "bindings": copy.deepcopy(bindings)}
        if key=="name":
            ui["jf_map_name"].update({"text_alignment":"center","color":[0.5,1.0,0.55]})
    def hover_marker(template, info_offset):
        # Literal offsets in each template: the info dock is outside the map.
        # Do not inherit $info variables or use dynamic tooltip anchors.
        states=[]
        for state in ["idle", "info"]:
            icon=sprite("map_markers/outpost", [16,16], [1,1])
            icon["bindings"]=[
                {"binding_type":"collection_details","binding_collection_name":"form_buttons"},
                {"binding_name":"#form_button_texture","binding_name_override":"#texture","binding_type":"collection","binding_collection_name":"form_buttons"},
                {"binding_name":"#form_button_texture_file_system","binding_name_override":"#texture_file_system","binding_type":"collection","binding_collection_name":"form_buttons"}]
            children=[c("icon",icon)]
            if state=="info":
                for edge,size,offset in [("top",[18,1],[0,0]),("bottom",[18,1],[0,17]),
                                         ("left",[1,16],[0,1]),("right",[1,16],[17,1])]:
                    outline=image(size,offset,[1.0,0.95,0.65]);outline["layer"]=9
                    children.append(c("outline_"+edge,outline))
                text={**label("#form_button_text",[228,44],(6,5),scale=0.65),
                    "property_bag":{"#form_button_text":""},"bindings":copy.deepcopy(bindings)}
                children.append(c("tooltip",{"type":"panel","size":[240,54],
                    "offset":info_offset,"anchor_from":"top_left","anchor_to":"top_left",
                    "layer":100,"allow_clipping":False,"controls":[
                        c("background",image([240,54],[0,0],[0.07,0.08,0.07])),
                        c("left_edge",image([1,54],[0,0],[0.64,0.58,0.37])),
                        c("right_edge",image([1,54],[239,0],[0.64,0.58,0.37])),
                        c("text",text)]}))
            states.append(c(state,{"type":"panel","size":[18,20],"offset":[0,0],
                "anchor_from":"top_left","anchor_to":"top_left","controls":children}))
        ui[template]={"type":"button","size":[18,20],"offset":[0,0],
            "anchor_from":"top_left","anchor_to":"top_left","focus_enabled":True,
            "hover_enabled":True,"button_mappings":[],"default_control":"idle","hover_control":"info","pressed_control":"info",
            "bindings":copy.deepcopy(bindings)+[
                {"binding_type":"view","source_property_name":"(not (#form_button_text = ''))","target_property_name":"#visible"},
                {"binding_type":"view","source_property_name":"(not (#form_button_text = ''))","target_property_name":"#enabled"}],"controls":states}
    content=copy.deepcopy([item for item in frame if 'title' not in item])
    content.append(c("title", label("Settlement Map", [170, 14], (28, 34), color=(0.86, 0.73, 0.44), scale=1)))
    content.append(c("bounds", scope("jf_map_bounds", MAP_LAYOUT['bounds'], [240, 12], [110, 56])))
    content.append(c("details", scope("jf_map_details", MAP_LAYOUT['details'], [240, 10], [110, 159])))
    grid=[c("border", image([WIDTH+2, HEIGHT+2], [-1, -1], [0.32, 0.34, 0.30])),
          c("black", image([WIDTH, HEIGHT], [0, 0], [0.025, 0.035, 0.03]))]
    for x in range(COLUMNS+1): grid.append(c("x"+str(x), image([1, HEIGHT], [min(WIDTH-1, x*40), 0], [0.10, 0.14, 0.11])))
    for z in range(ROWS+1): grid.append(c("z"+str(z), image([WIDTH, 1], [0, min(HEIGHT-1, z*30)], [0.10, 0.14, 0.11])))
    for slot in range(COLUMNS*ROWS):
        x,z=(slot%COLUMNS)*40,(slot//COLUMNS)*30
        for kind,index,dx in [("cell",slot,1),("spawn",MAP_LAYOUT['spawnInfo'],21)]:
            template=f"jf_map_marker_{kind}{slot}"
            # Grid origin is 110,68; dock origin is 110,170. All anchors are
            # explicit top-left so the dock rectangle is independent of hover.
            hover_marker(template,[-x-dx,102-z-1])
            target=scope(template,index,[18,20],[x+dx,z+1])
            if kind=="spawn":
                present=f"(not ((#form_text - '[JF:spawn:{slot}]') = #form_text))"
                target['bindings']=[{"binding_name":"#form_text","binding_type":"none"}]+[
                    {"binding_type":"view","source_property_name":present,"target_property_name":prop}
                    for prop in ['#visible','#enabled']]
            grid.append(c(kind+str(slot),target))
        grid.append(c("name"+str(slot),scope("jf_map_name",MAP_LAYOUT['names']+slot,[40,9],[x,z+21])))
    content.append(c("grid", {"type":"panel","size":[WIDTH,HEIGHT],"offset":[110,68],
        "anchor_from":"top_left","anchor_to":"top_left","controls":grid}))
    content.append(c("info_dock",{"type":"panel","size":[240,54],"offset":[110,170],
        "anchor_from":"top_left","anchor_to":"top_left","controls":[
            c("background",image([240,54],[0,0],[0.07,0.08,0.07])),
            c("hint",label("Hover a marker for information.\nZoom in to separate clustered settlements.",[228,36],(6,8),scale=0.65))]}))
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
    content.append(c('legend',label('Settlements | Star: world spawn',[150,10],(204,38),scale=0.45)))
    ui['jf_settlement_map']={"type":"panel","size":[380,240],"controls":content}
