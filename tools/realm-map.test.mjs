import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
const source=await readFile(new URL('../packs/behavior/scripts/realm-map.js',import.meta.url),'utf8');
const {createSharedMap,biomeCode}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
function storage(){const data=new Map();return {data,getDynamicProperty:k=>data.get(k),setDynamicProperty:(k,v)=>data.set(k,v)};}
const village={id:'home',dimension:'minecraft:overworld',location:{x:0,y:64,z:0}};
function player(id='alice',dimension='minecraft:overworld'){
 return {id,location:{x:0,y:64,z:0},dimension:{id:dimension,getBiome:()=>({id:'minecraft:plains'})}};
}
test('discoveries are world-shared, survive restart, and use separate dimensions and negative coordinates',()=>{
 const world=storage(),map=createSharedMap(world);
 map.observe('minecraft:overworld',-1,-9,3);
 map.observe('minecraft:nether',-1,-9,9);
 map.flush();
 const restored=createSharedMap(world);
 assert.equal(restored.read('minecraft:overworld',-1,-9),3);
 assert.equal(restored.read('minecraft:nether',-1,-9),9);
 assert.equal(restored.read('minecraft:the_end',-1,-9),0);
 const view={x:-16,z:-144,zoom:0,dimension:'minecraft:overworld'};
 assert.deepEqual(restored.render(view,{},player('alice'),'none'),restored.render(view,{},player('bob'),'none'));
 assert.ok(restored.render(view,{},player('bob'),'none').cells.some(c=>c==='ocean'));
});
test('all players share a six-column budget; unloaded columns preserve discoveries and saves are retried',()=>{
 const world=storage(),map=createSharedMap(world);let calls=0;
 const a=player('a'),b=player('b');b.location.x=1000;
 a.dimension.getBiome=()=>{calls++;return {id:'minecraft:ocean'};};
 b.dimension.getBiome=()=>{calls++;return {id:'minecraft:desert'};};
 assert.equal(map.tick([a,b],100000),6);assert.equal(calls,6);
 assert.equal(map.read(a.dimension.id,0,0),3);
 assert.equal(map.read(b.dimension.id,62,0),4);
 a.dimension.getBiome=()=>{throw Error('unloaded');};
 for(let i=0;i<10;i++)map.tick([a],200000+i*1000);
 assert.equal(map.read(a.dimension.id,0,0),3);
 map.observe(a.dimension.id,0,0,1);
 const write=world.setDynamicProperty;world.setDynamicProperty=()=>{throw Error('save failed');};
 assert.throws(()=>map.flush(),/save failed/);
 world.setDynamicProperty=write;map.flush();
 assert.equal(createSharedMap(world).read(a.dimension.id,0,0),1);
});
test('map navigation never scans terrain; markers and zoom use saved cells',()=>{
 const world=storage(),map=createSharedMap(world),p=player();
 p.dimension.getBiome=()=>assert.fail('Rendering must never scan blocks');
 map.observe(village.dimension,0,0,3);
 let view=map.view(p,village);
 let frame=map.render(view,{home:village},p,village.id);
 assert.equal(frame.cells.length,384);
 assert.ok(frame.cells.includes('current'));
 assert.equal(map.view(p,village,'east').x,64);
 assert.equal(map.view(p,village,'zoomOut').zoom,1);
 assert.equal(map.view(p,village,'dimension').dimension,'minecraft:nether');
 assert.deepEqual(map.view(p,village,'center'),view);
 for(let i=0;i<12;i++)view=map.view(p,village,'zoomOut');
 assert.equal(view.zoom,3);
 assert.equal(map.render(view,{},p,'none').cells.length,384);
});
test('corrupt saved maps are not silently overwritten and storage has an explicit bound',()=>{
 const world=storage();world.data.set('jagsby_frontier:biome_map_v1:index','broken');
 assert.throws(()=>createSharedMap(world).read('minecraft:overworld',0,0));
 assert.equal(world.data.get('jagsby_frontier:biome_map_v1:index'),'broken');
 const map=createSharedMap(storage());
 let added=0;
 while(added<1025&&map.observe('minecraft:overworld',added*8,0,1))added++;
 assert.ok(added>0&&added<=1024);
 assert.equal(map.observe('minecraft:overworld',added*8,0,1),false);
 assert.equal(map.observe('minecraft:overworld',0,0,3),true);
 assert.equal(map.read('minecraft:overworld',0,0),3);
});
test('biome palette distinguishes climate regions and unknown samples',()=>{
 assert.equal(biomeCode('minecraft:ocean'),3);
 assert.equal(biomeCode('minecraft:snowy_plains'),6);
 assert.equal(biomeCode('minecraft:forest'),2);
 assert.equal(biomeCode(undefined),0);
 assert.equal(biomeCode('minecraft:unknown_biome'),10);
});
