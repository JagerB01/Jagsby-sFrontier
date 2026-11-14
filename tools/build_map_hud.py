"""Original interactive map overlay, using the existing biome glyph page."""
import json
from pathlib import Path

def build():
    controls = [{"background": {"type": "image", "texture": "textures/ui/frontier/palette_panel", "size": [288, 190], "layer": 1}}]
    def text(value,size,offset,scale=0.8,color=(0.94,0.92,0.85)):
        return {"type":"label","text":value,"size":size,"offset":offset,"anchor_from":"top_left","anchor_to":"top_left","shadow":False,"font_size":"small","font_scale_factor":scale,"color":list(color),"layer":5}
    controls.append({"heading":text("Shared Realm Map",[256,16],[16,10],1.0,(0.82,0.70,0.44))})
    for i in range(12):
        label=text("#text",[272,12],[16,34+i*8],1.0,(1,1,1))
        label["bindings"]=[{"binding_type":"view","source_control_name":"map_data","source_property_name":f"(('%.{7+32*(i+1)}s' * #map_text) - ('%.{7+32*i}s' * #map_text))","target_property_name":"#text"}]
        controls.append({"row_"+str(i):label})
    info=text("#text",[256,12],[16,137],0.65)
    info["bindings"]=[{"binding_type":"view","source_control_name":"map_data","source_property_name":"(#map_text - ('%.391s' * #map_text))","target_property_name":"#text"}]
    controls.append({"info":info})
    controls.append({"help":text("Joystick/WASD or mouse-look: pan\nJump: cycle zoom   Sneak/Back: return",[256,28],[16,154],0.7)})
    data={"type":"panel","size":[0,0],"bindings":[{"binding_name":"#hud_title_text_string","binding_name_override":"#map_text","binding_type":"global"}]}
    overlay={"type":"panel","size":[288,190],"layer":200,"bindings":[{"binding_type":"view","source_control_name":"map_data","source_property_name":"(('%.7s' * #map_text) = 'JF_MAP|')","target_property_name":"#visible"}],"controls":controls}
    ui={"namespace":"hud","root_panel":{"modifications":[{"array_name":"controls","operation":"insert_front","value":[{"map_data":data},{"frontier_map":overlay}]}]},
        "hud_title_text/title_frame/title":{"modifications":[{"array_name":"bindings","operation":"insert_back","value":{"binding_type":"view","source_property_name":"(not (('%.7s' * #text) = 'JF_MAP|'))","target_property_name":"#visible"}}]}}
    ui["hud_title_text/title_frame/title_background"]={"bindings":[
        {"binding_name":"#hud_title_text_string","binding_type":"global"},
        {"binding_type":"view","source_property_name":"(not (('%.7s' * #hud_title_text_string) = 'JF_MAP|'))","target_property_name":"#visible"}]}
    dest=Path(__file__).resolve().parents[1]/"packs/resource/ui/hud_screen.json"
    dest.write_text(json.dumps(ui,indent=2)+"\n")
