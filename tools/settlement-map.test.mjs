import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {mapSnapshot,fitMap,provinceLinePixels,settlementPoints,moveMap,mapDetails,mapBoundaryMarkers,MAP_ASPECT,MAP_COLUMNS,MAP_ROWS,MAP_MIN_SPAN,MAP_MAX_SPAN} from '../packs/behavior/scripts/settlement-map.js';
import {CHARTER_LAYOUT as L} from '../packs/behavior/scripts/charter-layout.js';
import {capitalStatus,designateCapital,updateProvinceCapitalId} from '../packs/behavior/scripts/provinces.js';
const village=(name,x,z,dimension='minecraft:overworld')=>({name,location:{x,y:64,z},dimension,developmentValue:250,developmentThreshold:100});
const points=s=>s.cells.flat();
const children=v=>Object.assign({},...(v.controls||[]));
const record=v=>Object.values(v.controls[0])[0];
const markerFor=(ui,v)=>ui[Object.keys(v.controls[0])[0].split('@')[1].split('.')[1]+'@jagsby_frontier.jf_map_pin'];
test('Fit maps signed X/Z coordinates with north up and east right without mutation',()=>{
 const villages={nw:village('Northwest',-2000,-1000),se:village('Southeast',2000,1000)},before=JSON.stringify(villages);
 const snapshot=mapSnapshot(villages);assert.equal(snapshot.count,2);assert.equal(snapshot.visible,2);
 const a=snapshot.cells.findIndex(c=>c.some(p=>p.id==='nw')),b=snapshot.cells.findIndex(c=>c.some(p=>p.id==='se'));
 assert.ok(a%MAP_COLUMNS<b%MAP_COLUMNS);assert.ok(Math.floor(a/MAP_COLUMNS)<Math.floor(b/MAP_COLUMNS));
 assert.equal(JSON.stringify(villages),before);assert.equal(snapshot.cells.length,MAP_COLUMNS*MAP_ROWS);
});
test('Separate dimensions, preserve raw coordinates, and expose the existing Development calculation',()=>{
 const villages={o:village('Surface',8,10),n:village('Nether',8,10,'minecraft:nether')};
 const s=mapSnapshot(villages,{dimension:'minecraft:nether'},'n');
 assert.deepEqual(points(s).map(p=>p.id),['n']);assert.equal(s.selected.x,8);assert.equal(s.selected.z,10);
 assert.equal(s.selected.development,2);assert.match(mapDetails(s.selected),/Nether\nX 8, Y 64, Z 10\nBiome: Unknown\nDevelopment: 2\nOwner: Unclaimed/);
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
test('Overlapping POIs get separate pins and a full map spills onto another page',()=>{
 const capacity=MAP_COLUMNS*MAP_ROWS;
 const villages=Object.fromEntries(Array.from({length:capacity+2},(_,i)=>['v'+i,village('Settlement '+i,0,0)]));
 const first=mapSnapshot(villages),second=mapSnapshot(villages,{page:1});
 assert.equal(first.visible,capacity+2);
 assert.equal(first.pageCount,2);
 assert.ok(first.cells.every(cell=>cell.length===1));
 assert.ok(second.cells.every(cell=>cell.length<=1));
 assert.equal(points(second).length,2);
 assert.equal(new Set([...points(first),...points(second)].map(p=>p.id)).size,capacity+2);
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
 const s=mapSnapshot(villages,v);assert.equal(s.count,2);assert.equal(s.visible,1);assert.equal(s.cells.at(-1)[0].id,'edge');
 assert.equal(mapSnapshot(villages,{span:-1}).viewport.span,MAP_MIN_SPAN);
});
test('Map UI has fixed indexed form cells, a dedicated router and the ordinary native bindings',async()=>{
 const ui=JSON.parse(await readFile(new URL('../packs/resource/ui/jagsby_frontier/charter.json',import.meta.url)));
 const children=value=>Object.assign({},...(value.controls||[]));
 const router=children(ui.jf_router);assert.ok(router['map@jagsby_frontier.jf_settlement_map']);
 assert.match(JSON.stringify(router['picker@jagsby_frontier.jf_picker']),/not \(#title_text = 'JF_CHARTER\|SettlementMap'\)/);
 const map=children(ui.jf_settlement_map),grid=children(map.grid);
 assert.equal(L.settlementMap.cells,MAP_COLUMNS*MAP_ROWS);assert.deepEqual(map.grid.size,[240,150]);
 for(let i=0;i<L.settlementMap.cells;i++){
  assert.equal(grid['cell'+i].collection_name,'form_buttons');
  assert.equal(record(grid['cell'+i]).collection_index,i);
  assert.deepEqual(grid['cell'+i].offset,[i%MAP_COLUMNS*6,Math.floor(i/MAP_COLUMNS)*6]);
 }
 for(const [axis,ticks] of [['x',L.settlementMap.xTicks],['z',L.settlementMap.zTicks]]){
  ticks.forEach((index,i)=>{
   const tick=map[axis+'_tick'+i];
   assert.equal(record(tick).collection_index,index);
   const dimension=axis==='x'?0:1;
   const center=tick.offset[dimension]+tick.size[dimension]/2-map.grid.offset[dimension];
   assert.ok(Math.abs(center-grid[axis+i].offset[dimension])<=1);
  });
 }
 const marker=ui.jf_map_pin;assert.equal(marker.$pressed_button_name,undefined);assert.deepEqual(marker.button_mappings,[]);
 assert.equal(marker.hover_enabled,true);assert.equal(marker.focus_enabled,true);
 assert.deepEqual(marker.size,[6,6]);
 const art=ui.jf_map_pin_art;
 assert.ok(art.bindings.some(b=>b.binding_name==='#form_button_texture'&&b.binding_name_override==='#texture'));
 const tooltip=children(ui.jf_map_pin_details);
 const text=children(children(tooltip.content).body).text;
 assert.equal(text.size[1],'default');
 assert.equal(tooltip.background.size[1],'100%sm');
 assert.ok(text.bindings.some(b=>b.binding_name==='#form_button_text'&&b.binding_type==='collection'));
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

test('Hover data resolves biome and owner',()=>{
 const villages={a:{...village('Home',0,0),biome:'minecraft:birch_forest',owner:{name:'Jagsby',id:'p'}}};
 const p=settlementPoints(villages)[0];
 assert.equal(mapDetails(p),'Home\nX 0, Y 64, Z 0\nBiome: Birch Forest\nDevelopment: 2\nOwner: Jagsby');

});

test('Map drawing fills its rectangle and controls are framed entirely to its left',async()=>{
 const ui=JSON.parse(await readFile(new URL('../packs/resource/ui/jagsby_frontier/charter.json',import.meta.url)));
 const children=v=>Object.assign({},...(v.controls||[])),map=children(ui.jf_settlement_map),grid=children(map.grid);
 assert.deepEqual(map.grid.size,[240,150]);assert.equal(MAP_ASPECT,240/150);
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
 assert.deepEqual(grid.x1.size,[1,150]);assert.deepEqual(grid.z1.size,[240,1]);
});

test('Small idle pins reveal adjacent tooltips that stay inside the expanded map',async()=>{
 const ui=JSON.parse(await readFile(new URL('../packs/resource/ui/jagsby_frontier/charter.json',import.meta.url)));
 const map=children(ui.jf_settlement_map),grid=children(map.grid);
 assert.equal(map.info_dock,undefined);
 assert.equal(map.bounds,undefined);
 const [tooltipWidth,tooltipHeight]=ui.jf_map_pin_details.size;
 assert.equal(tooltipHeight,'100%cm');
 for(let slot=0;slot<L.settlementMap.cells;slot++){
  const target=grid['cell'+slot],states=children(markerFor(ui,target));
  const idle=states['idle@jagsby_frontier.jf_map_pin_art'];
  assert.deepEqual(idle.size,[6,6]);
  assert.equal(idle.collection_index,slot);
  const hover=children(states.info);
  const [x,z]=target.offset;
  const expanded=hover['art@jagsby_frontier.jf_map_pin_art'];
  assert.equal(expanded.collection_index,slot);
  const [artX,artZ]=expanded.offset;
  const [width,height]=ui.jf_map_pin_art.size;
  assert.ok(x+artX>=0&&x+artX+width<=map.grid.size[0]);
  assert.ok(z+artZ>=0&&z+artZ+height<=map.grid.size[1]);
  const tooltip=hover['tooltip@jagsby_frontier.jf_map_pin_details'];
  const [dx,dz]=tooltip.offset;
  assert.equal(dz,0);
  assert.equal(tooltip.anchor_from,z<map.grid.size[1]/2?'top_left':'bottom_left');
  assert.equal(tooltip.anchor_to,tooltip.anchor_from);
  assert.ok(x+dx>=0&&x+dx+tooltipWidth<=map.grid.size[0]);
  const expectedX=x+artX+width+4+tooltipWidth<=map.grid.size[0]
   ? artX+width+4 : artX-4-tooltipWidth;
  assert.equal(dx,expectedX);
  assert.equal(states.info.allow_clipping,false);
 }
 assert.deepEqual(Object.keys(children(ui.jf_map_pin_details)),['background','content']);
});

test('Points within the old coarse cell project independently and spawn shares the same axes',()=>{
 const viewport={dimension:'minecraft:overworld',x:0,z:0,span:240};
 const s=mapSnapshot({a:village('A',-39,-14),b:village('B',-20,-8)},viewport,null,{x:-20,y:70,z:-8});
 assert.equal(s.cells[10*MAP_COLUMNS+13][0].id,'a');
 const slot=11*MAP_COLUMNS+16;
 assert.equal(s.cells[slot][0].id,'b');
 assert.notEqual(s.spawnCell,slot);
 const columnDelta=s.spawnCell%MAP_COLUMNS-slot%MAP_COLUMNS;
 const rowDelta=Math.floor(s.spawnCell/MAP_COLUMNS)-Math.floor(slot/MAP_COLUMNS);
 assert.equal(Math.abs(columnDelta)+Math.abs(rowDelta),1);
 assert.equal(mapDetails(s.cells[s.spawnCell][0]),'World spawn\nX -20, Y 70, Z -8');
});

test('Map charter settlements share the Village artwork, and world spawn keeps its own icon',async()=>{
 for(const power of [0,20,50,100,200]){
  const p=settlementPoints({a:{...village('A',0,0),census:{realmPowerTenths:power}}})[0];
  assert.equal(p.texture,'textures/ui/frontier/poi_markers/village');
 }
 const s=mapSnapshot({}, {}, null,{x:-10.2,y:75,z:20.8});
 assert.equal(mapDetails(s.spawn),'World spawn\nX -10.2, Y 75, Z 20.8');
 for(const art of ['map_markers/world_spawn','poi_markers/village']){
  const data=await readFile(new URL('../packs/resource/textures/ui/frontier/'+art+'.png',import.meta.url));
  assert.equal(data.readUInt32BE(16),64);assert.equal(data.readUInt32BE(20),64);
 }
});

test('Province borders align to signed multiples of 2,048 and Fit frames the charter province',async()=>{
 assert.deepEqual(provinceLinePixels(-4096,4096,240),[0,60,120,180,239]);
 assert.deepEqual(provinceLinePixels(-3072,3072,240),[40,120,200]);
 assert.deepEqual(provinceLinePixels(100,200,240),[]);
 const wide=provinceLinePixels(-30000000,30000000,240);
 assert.ok(wide.length>1&&wide.length<=31);
 assert.ok(wide.slice(1).every((pixel,index)=>pixel-wide[index]>=7));
 const s=mapSnapshot({a:village('A',-100,300)}, {},'a');
 assert.ok(s.bounds.minX<-2048&&s.bounds.maxX>0);
 assert.ok(s.bounds.minZ<0&&s.bounds.maxZ>2048);
 const ui=JSON.parse(await readFile(new URL('../packs/resource/ui/jagsby_frontier/charter.json',import.meta.url)));
 const map=children(ui.jf_settlement_map),grid=children(map.grid);
 assert.ok(map.jf_map_boundary_state.bindings.some(b=>b.binding_name==='#form_text'));
 assert.deepEqual(grid.province_x120.offset,[120,0]);
 assert.deepEqual(grid.province_z75.offset,[0,75]);
 assert.ok(grid.province_x120.bindings.some(b=>b.source_control_name==='jf_map_boundary_state'
  &&b.source_property_name.includes('[JF:province:x:120]')&&b.target_property_name==='#visible'));
});

test('Zone lines trace clipped squares and their markers match the generated map geometry',async()=>{
 const layout=L.settlementMap;
 const view={x:0,z:0,span:9600,showZones:true,showProvinces:false};
 const square=mapBoundaryMarkers(mapSnapshot({},view),layout.width,layout.height);
 assert.ok(square.includes('[JF:zone:x:10:3]')&&square.includes('[JF:zone:x:30:22]'));
 assert.ok(square.includes('[JF:zone:z:3:10]')&&square.includes('[JF:zone:z:23:29]'));
 assert.ok(!square.includes('[JF:zone:x:10:2]')&&!square.includes('[JF:zone:z:3:30]'));
 assert.ok(!square.includes('[JF:province:'));
 const clipped=mapBoundaryMarkers(mapSnapshot({},{...view,x:2400,span:200}),layout.width,layout.height);
 assert.deepEqual(clipped.match(/\[JF:[^\]]+\]/g),
  Array.from({length:MAP_ROWS},(_,row)=>`[JF:zone:x:20:${row}]`));
 const ui=JSON.parse(await readFile(new URL('../packs/resource/ui/jagsby_frontier/charter.json',import.meta.url)));
 const map=children(ui.jf_settlement_map),grid=children(map.grid);
 assert.deepEqual(grid.zone_x10_3.offset,[60,18]);
 assert.deepEqual(grid.zone_z3_10.offset,[60,18]);
 assert.deepEqual(grid.zone_x40_24.offset,[239,144]);
 assert.deepEqual(grid.zone_z25_39.offset,[234,149]);
 assert.ok(grid.zone_x10_3.bindings.some(b=>b.source_control_name==='jf_map_boundary_state'
  &&b.source_property_name.includes('[JF:zone:x:10:3]')&&b.target_property_name==='#visible'));
 for(const key of ['provinceLines','zoneLines']){
  assert.equal(record(map[key]).collection_index,layout[key]);
  const button=ui['jf_map_'+key+'@common.button'];
  assert.equal(button.$pressed_button_name,'button.form_button_click');
  assert.ok(button.bindings.some(b=>b.target_property_name==='#enabled'&&b.source_property_name.includes('#form_button_text')));
 }
});

test('One zoom-out step from Fit switches Overworld pins to province centers',()=>{
 const villages={capital:village('Harbor',-2048,0),local:village('South Gate',-11,1),east:village('East',5,90)};
 const provinces={'-1,0':{name:'West Reach',capitalId:'capital'}};
 const detail=mapSnapshot(villages,{},'capital',null,[],provinces);
 const capital=points(detail).find(point=>point.id==='capital');
 assert.equal(capital.texture,'textures/ui/frontier/poi_markers/capital');
 assert.match(mapDetails(capital),/Capital of West Reach/);
 assert.equal(points(detail).find(point=>point.id==='local').texture,'textures/ui/frontier/poi_markers/village');
 const wide=mapSnapshot(villages,moveMap(detail.viewport,'zoomOut'),'capital',null,[],provinces);
 assert.equal(wide.viewport.span,detail.viewport.span*2);
 assert.equal(wide.provinceView,true);
 assert.deepEqual(points(wide).map(({x,z,name,texture})=>[x,z,name,texture]),[
  [-1024,1024,'West Reach','textures/ui/frontier/poi_markers/province'],
  [1024,1024,'Province 0,0','textures/ui/frontier/poi_markers/province'],
 ]);
 assert.equal(mapDetails(points(wide)[0]),'West Reach\nCenter: X -1024, Z 1024\nCapital: Harbor');
 const wider=moveMap(wide.viewport,'zoomOut');
 assert.equal(mapSnapshot(villages,moveMap(wider,'zoomIn')).provinceView,true);
 assert.equal(mapSnapshot(villages,moveMap(wide.viewport,'zoomIn')).provinceView,false);
 const nether=mapSnapshot({fort:village('Fort',0,0,'minecraft:nether')},
  moveMap({dimension:'minecraft:nether',x:0,z:0,span:256},'zoomOut'));
 assert.equal(nether.provinceView,false);
 assert.equal(points(nether)[0].name,'Fort');
});

test('Province centers sharing a cell paginate without moving either icon',()=>{
 const villages={a:village('A',1,1),b:village('B',3000,1)};
 const view=moveMap({dimension:'minecraft:overworld',x:0,z:0,span:100000},'zoomOut');
 const one=mapSnapshot(villages,view),two=mapSnapshot(villages,{...view,page:1});
 assert.equal(one.pageCount,2);
 assert.equal(one.cells.findIndex(cell=>cell.length),two.cells.findIndex(cell=>cell.length));
 assert.deepEqual([points(one)[0].x,points(two)[0].x],[1024,3072]);
});

test('Capital identity follows legacy charter migration and the province name survives removal',()=>{
 const old='-1,64,-1',canonical='minecraft:overworld|'+old;
 const owner={id:'p',name:'Owner'};
 const capital={...village('Capital',-1,-1),owner,developmentValue:1000};
 const state={villages:{[old]:capital},provinces:{'-1,-1':{name:'West Reach',capitalId:old}}};
 updateProvinceCapitalId(state,old,canonical);
 state.villages[canonical]=capital;
 delete state.villages[old];
 assert.equal(capitalStatus(state,canonical,'p').canRename,true);
 updateProvinceCapitalId(state,canonical);
 delete state.villages[canonical];
 assert.deepEqual(state.provinces['-1,-1'],{name:'West Reach'});
 state.villages.next={...capital,name:'Next'};
 assert.equal(designateCapital(state,'next','other'),'Only the settlement owner can designate it as capital.');
 assert.equal(designateCapital(state,'next','p'),'');
 assert.deepEqual(state.provinces['-1,-1'],{name:'West Reach',capitalId:'next'});
});
