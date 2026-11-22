import assert from 'node:assert/strict';
import test from 'node:test';
import { POI_KEY, POI_TEXTURE, readSurveyedPois, surveyLoadedPois } from '../packs/behavior/scripts/poi-survey.js';
import { mapDetails, mapSnapshot } from '../packs/behavior/scripts/settlement-map.js';

test('Clap survey scans bounded loaded volumes, records landmark clues and avoids repeat pins',()=>{
 const sample=(id,x,y,z)=>({typeId:'minecraft:'+id,x,y,z});
 const worldBlocks=[
  sample('bell',0,63,0),sample('bed',4,63,0),
  sample('trial_spawner',12,-20,0),sample('trial_spawner',14,-20,0),
  sample('reinforced_deepslate',20,-50,0),
  sample('tnt',-14,55,12),sample('sandstone',-14,56,12),sample('stone_pressure_plate',-14,57,12),
  sample('dispenser',-12,63,-17),sample('mossy_cobblestone',-12,62,-17),sample('tripwire_hook',-12,63,-16),
  sample('tnt',30,63,0),sample('bell',40,65,0),
  sample('trial_spawner',48,-20,48),
 ];
 class Volume{constructor(from,to){this.from=from;this.to=to;}}
 let queries=0;
 const dimension={
  heightRange:{min:-64,max:320},
  getBlock:pos=>worldBlocks.find(block=>['x','y','z'].every(key=>block[key]===pos[key])),
  getBlocks({from,to},{includeTypes},allowUnloaded){
   queries++;
   assert.equal(allowUnloaded,true);
   assert.ok((to.x-from.x+1)*(to.y-from.y+1)*(to.z-from.z+1)<=33**3);
   const matches=worldBlocks.filter(block=>includeTypes.includes(block.typeId)
    &&['x','y','z'].every(key=>block[key]>=from[key]&&block[key]<=to[key]));
   return {getBlockLocationIterator:()=>matches};
  },
 };
 const saved=[];
 function scan(){
  const survey=surveyLoadedPois(dimension,{x:0,y:64,z:0},Volume,saved);
  let step;
  do{
   const before=queries;
   step=survey.next();
   assert.ok(queries-before<=1);
  }while(!step.done);
  return step.value;
 }
 assert.equal(scan(),5);
 assert.equal(scan(),0);
 assert.deepEqual(saved.map(p=>p.kind).sort(),['ancient_city','desert_temple','jungle_temple','trial_chamber','village']);
 const registered=readSurveyedPois({getDynamicProperty(key){assert.equal(key,POI_KEY);return JSON.stringify([...saved,{kind:'unknown',x:0,y:0,z:0}]);}});
 const map=mapSnapshot({}, {}, null, {x:0,y:63,z:0},registered);
 const pins=map.cells.flat();
 assert.equal(pins.length,6,'The village and spawn at the same location still have separate pins');
 assert.equal(map.visible,0);
 assert.equal(map.count,0);
 const city=pins.find(pin=>pin.kind==='ancient_city');
 assert.equal(city.texture,POI_TEXTURE);
 assert.equal(mapDetails(city),'Possible Ancient City\nX 20, Y -50, Z 0');
 assert.deepEqual(readSurveyedPois({getDynamicProperty:()=>'{invalid'}),[]);
});
