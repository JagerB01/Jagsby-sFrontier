import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { POI_KEY, readSurveyedPois, rememberPoiPlacement, surveyLoadedPois, wasPoiPlaced } from '../packs/behavior/scripts/poi-survey.js';
import { mapDetails, mapSnapshot } from '../packs/behavior/scripts/settlement-map.js';

test('Clap surveys flag villages from bells, skip player placements, and use each landmark sprite',async()=>{
 const sample=(id,x,y,z)=>({typeId:'minecraft:'+id,x,y,z});
 const worldBlocks=[
  sample('bell',0,63,0),
  sample('trial_spawner',12,-20,0),sample('trial_spawner',14,-20,0),
  sample('tuff_bricks',12,-21,0),sample('waxed_oxidized_copper_grate',12,-20,3),
  sample('trial_spawner',15,40,0), // An isolated Habitations-style spawner.
  sample('end_portal_frame',10,-28,12),
  sample('sea_lantern',-20,49,2),sample('water',-21,50,2),
  sample('prismarine_bricks',-20,48,2),sample('dark_prismarine',-22,49,2),
  sample('suspicious_gravel',-28,64,-12),sample('mud_bricks',-27,64,-12),sample('orange_terracotta',-28,63,-12),
  {typeId:'rev:vindicator_miner_spawner',x:26,y:-18,z:2},
  // Wild camp center, turned 90 degrees.
  sample('campfire',30,64,1),sample('dark_oak_shelf',31,64,1),
  sample('mossy_cobblestone',33,63,1),sample('stone_stairs',34,63,1),
  // Watchtower and castle section.
  sample('wall_banner',20,66,25),sample('stripped_spruce_log',20,66,24),
  sample('dark_oak_fence',19,66,24),sample('spruce_trapdoor',20,67,26),sample('dark_oak_log',19,67,26),
  sample('wall_banner',-25,66,25),sample('iron_bars',-25,67,25),
  sample('stone_bricks',-24,66,25),sample('andesite_wall',-27,66,24),
  sample('reinforced_deepslate',20,-50,0),
  sample('tnt',-14,55,12),sample('sandstone',-14,56,12),sample('stone_pressure_plate',-14,57,12),
  sample('dispenser',-12,63,-17),sample('mossy_cobblestone',-12,62,-17),sample('tripwire_hook',-12,63,-16),
  sample('tnt',30,63,0),sample('sandstone',30,62,0),sample('stone_pressure_plate',31,63,0),
  sample('bell',40,-20,0),
  sample('trial_spawner',48,-20,48),
 ];
 class Volume{constructor(from,to){this.from=from;this.to=to;}}
 let queries=0,habitations=true;
 const dimension={
  id:'minecraft:overworld',
  heightRange:{min:-64,max:320},
  getBlock:pos=>worldBlocks.find(block=>['x','y','z'].every(key=>block[key]===pos[key])),
  getBlocks({from,to},{includeTypes},allowUnloaded){
   queries++;
   assert.equal(allowUnloaded,true);
   if(!habitations)assert.ok(includeTypes.every(type=>type.startsWith('minecraft:')));
   assert.ok((to.x-from.x+1)*(to.y-from.y+1)*(to.z-from.z+1)<=33**3);
   const matches=worldBlocks.filter(block=>includeTypes.includes(block.typeId)
    &&['x','y','z'].every(key=>block[key]>=from[key]&&block[key]<=to[key]));
   return {getBlockLocationIterator:()=>matches};
  },
 };
 const properties=new Map();
 const world={getDynamicProperty:key=>properties.get(key),setDynamicProperty:(key,value)=>{
  if(value===undefined)properties.delete(key);else properties.set(key,value);
 }};
 const trackedBell={x:40,y:-20,z:0},trackedSandstone={x:30,y:62,z:0};
 rememberPoiPlacement(world,{dimension,location:trackedBell},'minecraft:bell',true);
 rememberPoiPlacement(world,{dimension,location:trackedSandstone},'minecraft:sandstone',true);
 assert.equal(wasPoiPlaced(world,trackedBell),true);
 assert.equal(wasPoiPlaced(world,{x:40,y:-4,z:0}),false);
 const saved=[];
 function scan(){
  const survey=surveyLoadedPois(dimension,{x:0,y:64,z:0},Volume,saved,pos=>wasPoiPlaced(world,pos),type=>habitations||type.startsWith('minecraft:'));
  let step;
  do{
   const before=queries;
   step=survey.next();
   assert.ok(queries-before<=1);
  }while(!step.done);
  return step.value;
 }
 assert.equal(scan(),12);
 assert.equal(scan(),0);
 assert.deepEqual(saved.map(p=>p.kind).sort(),['ancient_city','desert_temple','illager_camp','illager_mine','illager_outpost','illager_stronghold','jungle_temple','ocean_monument','stronghold','trail_ruins','trial_chamber','village']);
 const registered=readSurveyedPois({getDynamicProperty(key){assert.equal(key,POI_KEY);return JSON.stringify([...saved,{kind:'unknown',x:0,y:0,z:0}]);}});
 const map=mapSnapshot({}, {}, null, {x:0,y:63,z:0},registered);
 const pins=map.cells.flat();
 assert.equal(pins.length,13,'The village and spawn at the same location still have separate pins');
 assert.equal(map.visible,0);
 assert.equal(map.count,0);
 const city=pins.find(pin=>pin.kind==='ancient_city');
 assert.equal(city.texture,'textures/ui/frontier/poi_markers/ancient_city');
 assert.equal(mapDetails(city),'Ancient City\nX 20, Y -50, Z 0');
 assert.equal(mapDetails(pins.find(pin=>pin.kind==='village')),'Village\nX 0, Y 63, Z 0');
 assert.equal(new Set(pins.map(pin=>pin.texture)).size,13);
 for(const pin of pins){
  const png=await readFile(new URL('../packs/resource/'+pin.texture+'.png',import.meta.url));
  assert.equal(png.readUInt32BE(16),64);
  assert.equal(png.readUInt32BE(20),64);
 }
 assert.deepEqual(readSurveyedPois({getDynamicProperty:()=>'{invalid'}),[]);
 habitations=false;
 saved.length=0;
 assert.equal(scan(),8);
 assert.ok(saved.every(point=>!point.kind.startsWith('illager_')));
 rememberPoiPlacement(world,{dimension,location:trackedBell},'minecraft:bell',false);
 assert.equal(wasPoiPlaced(world,trackedBell),false);
});
