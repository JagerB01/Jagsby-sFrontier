import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {mapSnapshot,fitMap,settlementPoints,moveMap,mapDetails,mapCellInfo,mapCellName,MAP_ASPECT,MAP_MIN_SPAN,MAP_MAX_SPAN} from '../packs/behavior/scripts/settlement-map.js';
import {CHARTER_LAYOUT as L} from '../packs/behavior/scripts/charter-layout.js';
const village=(name,x,z,dimension='minecraft:overworld')=>({name,location:{x,y:64,z},dimension,developmentValue:250,developmentThreshold:100});
const points=s=>s.cells.flat();
test('Fit maps signed X/Z coordinates with north up and east right without mutation',()=>{
 const villages={nw:village('Northwest',-2000,-1000),se:village('Southeast',2000,1000)},before=JSON.stringify(villages);
 const snapshot=mapSnapshot(villages);assert.equal(snapshot.count,2);assert.equal(snapshot.visible,2);
 const a=snapshot.cells.findIndex(c=>c.some(p=>p.id==='nw')),b=snapshot.cells.findIndex(c=>c.some(p=>p.id==='se'));
 assert.ok(a%12<b%12);assert.ok(Math.floor(a/12)<Math.floor(b/12));
 assert.equal(JSON.stringify(villages),before);assert.equal(snapshot.cells.length,72);
});
test('Separate dimensions, preserve raw coordinates, and expose the existing Development calculation',()=>{
 const villages={o:village('Surface',8,10),n:village('Nether',8,10,'minecraft:nether')};
 const s=mapSnapshot(villages,{dimension:'minecraft:nether'},'n');
 assert.deepEqual(points(s).map(p=>p.id),['n']);assert.equal(s.selected.x,8);assert.equal(s.selected.z,10);
 assert.equal(s.selected.development,2);assert.match(mapDetails(s.selected),/Name: Nether\nBiome: Unknown\nDevelopment: 2\nOwner: Unclaimed/);
 assert.equal(s.dimensions.length,2);
});
test('Registry is the only source: creation, rename, removal and world serialization appear on the next snapshot',()=>{
 let saved={a:village('Old name',-10,20)};
 assert.equal(mapSnapshot(saved).count,1);
 saved.a.name='New name';saved.b=village('New settlement',100,200);
 saved=JSON.parse(JSON.stringify(saved));assert.equal(mapSnapshot(saved).count,2);
 assert.ok(points(mapSnapshot(saved)).some(p=>p.name==='New name'));
 delete saved.a;const s=mapSnapshot(saved,{},'a');assert.equal(s.count,1);assert.equal(s.selected,null);
 assert.equal(points(s)[0].id,'b');
});
test('Clusters retain all settlements without a marker cap and labels indicate overlapping entries',()=>{
 const villages=Object.fromEntries(Array.from({length:500},(_,i)=>['v'+i,village('Settlement '+i,0,0)]));
 const s=mapSnapshot(villages);assert.equal(s.count,500);assert.equal(s.visible,500);
 const cluster=s.cells.find(c=>c.length);assert.equal(cluster.length,500);
 assert.match(mapCellName(cluster),/\+499$/);assert.equal(mapCellName([]),'');
 assert.equal(new Set(points(s).map(p=>p.id)).size,500);
});
test('Empty and invalid locations are safe; zero coordinates and legacy ids remain valid',()=>{
 assert.equal(mapSnapshot({}).count,0);assert.equal(mapDetails(null),'');
 const locations={good:village('Good',0,0),bad:village('Bad',NaN,0),infinite:village('Bad',0,Infinity),missing:{name:'Bad'}};
 assert.deepEqual(settlementPoints(locations).map(p=>p.id),['good']);
 const empty=mapSnapshot(locations,{dimension:'minecraft:the_end'});assert.equal(empty.count,0);assert.equal(empty.visible,0);
 assert.deepEqual(fitMap([],'minecraft:overworld'),{dimension:'minecraft:overworld',x:0,z:0,span:256});
});
test('Zoom, pan and edge clipping use bounded viewports and correct axes',()=>{
 const v={dimension:'minecraft:overworld',x:0,z:0,span:256};
 assert.equal(moveMap(v,'zoomIn').span,128);assert.equal(moveMap(v,'zoomOut').span,512);
 assert.equal(moveMap({...v,span:MAP_MIN_SPAN},'zoomIn').span,MAP_MIN_SPAN);
 assert.equal(moveMap({...v,span:MAP_MAX_SPAN},'zoomOut').span,MAP_MAX_SPAN);
 assert.equal(moveMap(v,'west').x,-64);assert.equal(moveMap(v,'east').x,64);
 assert.equal(moveMap(v,'north').z,-256/MAP_ASPECT/4);assert.equal(moveMap(v,'south').z,256/MAP_ASPECT/4);
 const villages={edge:village('Edge',128,128/MAP_ASPECT),off:village('Off',129,0)};
 const s=mapSnapshot(villages,v);assert.equal(s.count,2);assert.equal(s.visible,1);assert.equal(s.cells[71][0].id,'edge');
 assert.equal(mapSnapshot(villages,{span:-1}).viewport.span,MAP_MIN_SPAN);
});
test('Map UI has fixed indexed form cells, a dedicated router and the ordinary native bindings',async()=>{
 const ui=JSON.parse(await readFile(new URL('../packs/resource/ui/jagsby_frontier/charter.json',import.meta.url)));
 const children=value=>Object.assign({},...(value.controls||[]));
 const router=children(ui.jf_router);assert.ok(router['map@jagsby_frontier.jf_settlement_map']);
 assert.match(JSON.stringify(router['picker@jagsby_frontier.jf_picker']),/not \(#title_text = 'JF_CHARTER\|SettlementMap'\)/);
 const map=children(ui.jf_settlement_map),grid=children(map.grid);
 assert.equal(L.settlementMap.cells,72);assert.deepEqual(map.grid.size,[240,144]);
 for(let i=0;i<72;i++){
  assert.equal(grid['cell'+i].collection_name,'form_buttons');
  assert.equal(grid['cell'+i].controls[0]['record@jagsby_frontier.jf_map_marker'].collection_index,i);
  assert.deepEqual(grid['cell'+i].offset,[i%12*20,Math.floor(i/12)*24]);
 }
 const marker=ui.jf_map_marker;assert.equal(marker.$pressed_button_name,undefined);assert.deepEqual(marker.button_mappings,[]);
 for(const state of marker.controls){
  const c=children(Object.values(state)[0]);assert.equal(c.icon.texture,'textures/ui/frontier/map_settlement');
 }
 const info=children(children(marker).info).tooltip;
 const text=children(children(children(info).content).text).inset;
 assert.ok(text.bindings.some(b=>b.binding_name==='#form_button_text'&&b.binding_type==='collection'));
 assert.ok(!JSON.stringify(marker).includes('hover_text'));
 assert.ok(!JSON.stringify(marker).includes('renderer'));
 assert.equal(info.type,'panel');
 const code=await readFile(new URL('../packs/behavior/scripts/settlement-map.js',import.meta.url),'utf8');
 for(const forbidden of ['runInterval','runTimeout','getBlock','getEntities','setDynamicProperty'])assert.ok(!code.includes(forbidden));
});

test('Fit includes the supported Minecraft coordinate range even along the taller Z extent',()=>{
 const s=mapSnapshot({north:village('Far north',-30000000,-30000000),south:village('Far south',30000000,30000000)});
 assert.equal(s.visible,2);assert.equal(points(s).length,2);
});

test('Map D-pad zoom is gamepad-only, scoped to the zoom controls and keeps native button indices',async()=>{
 const ui=JSON.parse(await readFile(new URL('../packs/resource/ui/jagsby_frontier/charter.json',import.meta.url)));
 const children=value=>Object.assign({},...(value.controls||[])),map=children(ui.jf_settlement_map);
 for(const [action,direction]of [['zoomIn','up'],['zoomOut','down']]){
  const wrapper=children(map.controls)[action];assert.equal(wrapper.controls[0]['record@jagsby_frontier.jf_map_'+action].collection_index,L.settlementMap[action]);
  const button=ui['jf_map_'+action+'@common.button'];
  assert.ok(button.button_mappings.some(m=>m.from_button_id==='button.menu_select'&&m.mapping_type==='pressed'));
  assert.ok(button.button_mappings.some(m=>m.from_button_id==='button.menu_ok'&&m.mapping_type==='focused'));
  assert.deepEqual(button.button_mappings.find(m=>m.from_button_id==='button.menu_'+direction),{
   from_button_id:'button.menu_'+direction,to_button_id:'button.form_button_click',mapping_type:'global',scope:'view',input_mode_condition:'gamepad_and_not_gaze'});
 }
 function check(value,path=''){
  if(!value||typeof value!=='object')return;
  for(const mapping of value.button_mappings||[])if(['button.menu_up','button.menu_down'].includes(mapping.from_button_id)){
   assert.ok(path.startsWith('/jf_map_zoomIn@common.button')||path.startsWith('/jf_map_zoomOut@common.button'),path);
  }
  for(const [key,child]of Object.entries(value))check(child,path+'/'+key);
 }
 check(ui);
 const route=children(ui.jf_router)['map@jagsby_frontier.jf_settlement_map'];
 for(const target of ['#visible','#enabled'])assert.ok(route.bindings.some(b=>b.target_property_name===target&&b.source_property_name==="(#title_text = 'JF_CHARTER|SettlementMap')"));
});

test('World spawn is fitted and projected in Overworld without affecting settlement counts or registry',()=>{
 const villages={a:village('A',5000,2000)},before=JSON.stringify(villages);
 const s=mapSnapshot(villages,{},null,{x:-1200,y:70,z:-700});
 assert.equal(s.count,1);assert.equal(s.visible,1);assert.ok(Number.isInteger(s.spawnCell));
 assert.ok(s.bounds.minX<-1200&&s.bounds.maxX>5000);assert.ok(s.bounds.minZ<-700&&s.bounds.maxZ>2000);
 assert.equal(mapSnapshot(villages,{dimension:'minecraft:nether'},null,{x:0,z:0}).spawnCell,null);
 assert.equal(mapSnapshot(villages,{dimension:'minecraft:overworld',x:5000,z:2000,span:64},null,{x:0,z:0}).spawnCell,null);
 assert.equal(mapSnapshot(villages,{},null,{x:NaN,z:0}).spawnCell,null);
 assert.equal(JSON.stringify(villages),before);
 const empty=mapSnapshot({}, {}, null,{x:320,z:-900});assert.equal(empty.count,0);assert.ok(Number.isInteger(empty.spawnCell));
 assert.equal(empty.viewport.x,320);assert.equal(empty.viewport.z,-900);
});

test('Hover data resolves biome and owner and stays bounded for dense clusters',()=>{
 const villages={a:{...village('Home',0,0),biome:'minecraft:birch_forest',owner:{name:'Jagsby',id:'p'}}};
 const p=settlementPoints(villages)[0];
 assert.equal(mapDetails(p),'Name: Home\nBiome: Birch Forest\nDevelopment: 2\nOwner: Jagsby');
 const cluster=Array.from({length:500},(_,i)=>({...p,name:'Home '+i}));
 const info=mapCellInfo(cluster);assert.equal((info.match(/Name:/g)||[]).length,8);assert.match(info,/492 more settlements/);
 assert.equal(mapCellInfo([]),'');
});

test('Map drawing fills its rectangle and controls are framed entirely to its left',async()=>{
 const ui=JSON.parse(await readFile(new URL('../packs/resource/ui/jagsby_frontier/charter.json',import.meta.url)));
 const children=v=>Object.assign({},...(v.controls||[])),map=children(ui.jf_settlement_map),grid=children(map.grid);
 assert.deepEqual(map.grid.size,[240,144]);assert.equal(MAP_ASPECT,240/144);
 assert.ok(map.controls.offset[0]+map.controls.size[0]<map.grid.offset[0]);
 for(const child of Object.values(children(map.controls)))if(child.collection_name){
  assert.ok(child.offset[0]>=0&&child.offset[1]>=0);
  assert.ok(child.offset[0]+child.size[0]<=map.controls.size[0]);
  assert.ok(child.offset[1]+child.size[1]<=map.controls.size[1]);
 }
 for(const [name,image]of Object.entries(grid))if(image.type==='image'){
  assert.equal(image.keep_ratio,false,`${name} must not collapse a rectangular image to a square`);
  assert.equal(image.bilinear,false);
 }
 assert.deepEqual(grid.black.size,map.grid.size);
 assert.deepEqual(grid.x1.size,[1,144]);assert.deepEqual(grid.z1.size,[240,1]);
 for(let i=0;i<72;i++){
  assert.equal(grid['name'+i].controls[0]['record@jagsby_frontier.jf_map_name'].collection_index,L.settlementMap.names+i);
  assert.equal(grid['spawn'+i].texture,'textures/ui/frontier/map_spawn');
  assert.ok(grid['spawn'+i].bindings.some(b=>b.source_property_name?.includes(`[JF:spawn:${i}]`)));
 }
});

test('Map hover info uses ordinary panel/image/label popovers instead of native custom renderers',async()=>{
 const ui=JSON.parse(await readFile(new URL('../packs/resource/ui/jagsby_frontier/charter.json',import.meta.url)));
 const children=v=>Object.assign({},...(v.controls||[])),grid=children(children(ui.jf_settlement_map).grid);
 function check(v){
  if(!v||typeof v!=='object')return;
  assert.notEqual(v.type,'custom');assert.equal(v.renderer,undefined);
  for(const [key,child]of Object.entries(v)){assert.ok(!key.includes('common.hover_text'));check(child);}
 }
 for(const [key,value]of Object.entries(ui))if(key.startsWith('jf_map_')||key==='jf_settlement_map')check(value);
 const popup=children(children(ui.jf_map_marker).info).tooltip;
 assert.equal(popup.type,'panel');assert.equal(popup.allow_clipping,false);
 for(let slot=0;slot<72;slot++){
  const record=grid['cell'+slot].controls[0]['record@jagsby_frontier.jf_map_marker'];
  const popupX=slot%12*20+record.$info_x;
  assert.ok(popupX>=0&&popupX+160<=240,'Popover must stay within the map horizontally');
  assert.equal(record.$info_anchor,Math.floor(slot/12)<3?'top_left':'bottom_left');
 }
});
