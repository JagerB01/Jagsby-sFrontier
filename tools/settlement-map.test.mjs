import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {mapSnapshot,fitMap,settlementPoints,moveMap,mapDetails,mapCellName,MAP_ASPECT,MAP_MIN_SPAN,MAP_MAX_SPAN} from '../packs/behavior/scripts/settlement-map.js';
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
 assert.equal(s.selected.development,2);assert.match(mapDetails(s.selected),/X 8  Y 64  Z 10.*Development 2/);
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
 assert.equal(mapSnapshot({}).count,0);assert.match(mapDetails(null),/Select/);
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
 assert.equal(L.settlementMap.cells,72);assert.deepEqual(map.grid.size,[312,120]);
 for(let i=0;i<72;i++){
  assert.equal(grid['cell'+i].collection_name,'form_buttons');
  assert.equal(grid['cell'+i].controls[0]['record@jagsby_frontier.jf_map_marker'].collection_index,i);
  assert.deepEqual(grid['cell'+i].offset,[i%12*26,Math.floor(i/12)*20]);
 }
 const marker=ui['jf_map_marker@common.button'];assert.equal(marker.$pressed_button_name,'button.form_button_click');
 for(const state of marker.controls){
  const c=children(Object.values(state)[0]);assert.equal(c.icon.texture,'textures/ui/frontier/map_settlement');
  assert.equal(c.caption.text,'#form_button_text');assert.ok(c.caption.bindings.some(b=>b.binding_type==='collection'));
 }
 assert.equal(JSON.stringify(ui.jf_settlement_map).includes('binding_condition'),false);
 const code=await readFile(new URL('../packs/behavior/scripts/settlement-map.js',import.meta.url),'utf8');
 for(const forbidden of ['runInterval','runTimeout','getBlock','getEntities','setDynamicProperty'])assert.ok(!code.includes(forbidden));
});

test('Fit includes the supported Minecraft coordinate range even along the taller Z extent',()=>{
 const s=mapSnapshot({north:village('Far north',-30000000,-30000000),south:village('Far south',30000000,30000000)});
 assert.equal(s.visible,2);assert.equal(points(s).length,2);
});
