import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {BIOME_ASSIGNMENTS,BIOME_RESOURCES,biomeResource,productionAllocations,riverCropBonus,migrateProduction} from '../packs/behavior/scripts/biome-resources.js';
import {resourceRates,accountEconomy,stockTotal,development,capacity} from '../packs/behavior/scripts/settlement-economy.js';
import {migrateResearch} from '../packs/behavior/scripts/global-research.js';
import {categoryMaterials} from '../packs/behavior/scripts/local-research.js';
const reference=JSON.parse(await readFile(new URL('reference/biome-production-1.26.40.json',import.meta.url),'utf8'));
const hour=3600000,day=24*hour;
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} differs from ${b}`);
function village(extra={}){return {id:'a',dimension:'minecraft:overworld',location:{x:0,y:64,z:0},biome:'minecraft:plains',productionPower:10,hearth:1,efficiency:0,developmentValue:0,...extra};}
function state(v=village()){return migrateProduction(migrateResearch({villages:{a:v},global:{storage:20},stock:{},roads:{},economyAt:0}));}
for(const assignment of reference.assignments){
 test(`${assignment.name}: target-version assignment`,()=>{
  const actual=BIOME_ASSIGNMENTS.find(row=>row.name===assignment.name);
  assert.deepEqual(actual,assignment);
  if(!assignment.supported){assert.equal(actual.biome,undefined);assert.equal(actual.item,undefined);return;}
  assert.ok(reference.biomeIds.includes(actual.biome));assert.ok(reference.itemIds.includes(actual.item));
  assert.equal(BIOME_RESOURCES[actual.biome].length,1);
  const allocations=productionAllocations(village({biome:actual.biome}));
  assert.equal(allocations.length,1);assert.equal(allocations[0].id,actual.item);
 });
}
test('all 52 requested biomes are accounted for have valid supported identifiers',()=>{
 assert.equal(BIOME_ASSIGNMENTS.length,52);assert.equal(Object.keys(BIOME_RESOURCES).length,52);
 assert.ok(BIOME_ASSIGNMENTS.every(b=>b.supported));
 for(const id of ['minecraft:deep_dark','minecraft:lush_caves','minecraft:dripstone_caves','minecraft:hell','minecraft:the_end'])assert.equal(biomeResource(id),null);
 for(const dimension of ['minecraft:nether','minecraft:the_end'])assert.deepEqual(productionAllocations(village({dimension,biomeUnlocked:true,secondary:'minecraft:river'})),[]);
 const rejected=['ice','clay_ball','slime_ball','snowball'];
 assert.ok(Object.values(BIOME_RESOURCES).flat().every(r=>!rejected.includes(r.id.replace('minecraft:',''))));
});
test('Bedrock aliases resolve Snowy Plains, Snowy Taiga, Swamp and Mushroom Fields correctly',()=>{
 for(const [id,item]of [['snowy_plains','potato'],['snowy_taiga','spruce_log'],['swamp','mud'],['mushroom_fields','red_mushroom'],['badlands','hardened_clay']])assert.equal(biomeResource('minecraft:'+id).id,'minecraft:'+item);
});
test('Prospecting alone never doubles output; explicit specialization fills the second half',()=>{
 const v=village();close(resourceRates(v)[0].rate,1.75);assert.equal(productionAllocations(v).length,1);
 v.biomeUnlocked=true;close(resourceRates(v)[0].rate,1.75);
 v.productionMode='specialize';assert.equal(productionAllocations(v).length,2);close(resourceRates(v)[0].rate,3.5);
 v.productionMode='diversify';v.secondary='minecraft:forest';assert.equal(resourceRates(v).length,2);close(resourceRates(v)[1].rate,0.75);
 v.productionMode='unassigned';close(resourceRates(v)[0].rate,1.75);
});
test('River specialization and Plains plus River each produce exactly 92.4 wheat per day',()=>{
 for(const extra of [{biome:'minecraft:river',productionMode:'specialize'},{secondary:'minecraft:river',productionMode:'diversify'}]){
  const v=village({biomeUnlocked:true,...extra});assert.equal(riverCropBonus(v),0.1);
  const rates=resourceRates(v);assert.equal(rates.length,1);close(rates[0].rate*24,92.4);
  assert.equal(rates[0].allocations.length,2);
  const s=state(v);accountEconomy(s,day);close(s.stock['minecraft:wheat'],92.4);close(v.developmentValue,92.4);
 }
});
test('River multiplies both crop slots once, with RP, Prosperity and Development',()=>{
 const v=village({biome:'minecraft:ice_plains',biomeUnlocked:true,productionMode:'diversify',secondary:'minecraft:river',productionPower:12,efficiency:4,developmentValue:50000});
 const rates=resourceRates(v);for(const r of rates)close(r.rate,0.175*12*1.2*1.1*1.1);
 for(const biome of ['minecraft:ocean','minecraft:forest','minecraft:stony_peaks','minecraft:mushroom_island']){
  const mixed=village({biome,biomeUnlocked:true,productionMode:'diversify',secondary:'minecraft:river'});
  const original=resourceRates(village({biome}))[0],actual=resourceRates(mixed).find(r=>r.id===original.id);
  close(actual.rate,original.rate);close(actual.riverBonus,0);
 }
});
test('crop and research categories stay explicit rather than treating every common resource as crops',()=>{
 const crops=categoryMaterials('crop'),building=categoryMaterials('building');
 for(const id of ['wheat','potato','carrot','cocoa_beans','bamboo'])assert.ok(crops.includes('minecraft:'+id));
 for(const id of ['cod','salmon','red_mushroom','honeycomb'])assert.ok(!crops.includes('minecraft:'+id));
 assert.ok(building.includes('minecraft:packed_ice'));assert.ok(!building.includes('minecraft:iron_ingot'));
});
test('all four category rates and weighted Development values account only successful production',()=>{
 for(const [biome,rate,value]of [['plains',0.175,1],['forest',0.075,2],['meadow',0.025,5],['deep_ocean',0.005,10]]){
  const s=state(village({biome:'minecraft:'+biome}));accountEconomy(s,hour);close(stockTotal(s),rate*10);close(s.villages.a.developmentValue,rate*10*value);
 }
 const s=state(village({biome:'minecraft:river',biomeUnlocked:true,productionMode:'specialize'}));
 s.stock['minecraft:stone']=capacity(s)-0.2;accountEconomy(s,day);close(s.stock['minecraft:wheat'],0.2);close(s.villages.a.developmentValue,0.2);
 const saved=JSON.stringify(s);accountEconomy(s,day);assert.equal(JSON.stringify(s),saved);
});
test('fractional offline catch-up and Development threshold integration are independent of access frequency',()=>{
 const initial=state(village({biome:'minecraft:river',biomeUnlocked:true,productionMode:'specialize',developmentValue:499.9}));
 const once=structuredClone(initial),many=structuredClone(initial);accountEconomy(once,30*day);
 for(let time=hour;time<=30*day;time+=hour)accountEconomy(many,time);
 close(stockTotal(once),stockTotal(many));close(once.villages.a.developmentValue,many.villages.a.developmentValue);assert.ok(development(once.villages.a)>1);
 const resumed=structuredClone(initial);let result=accountEconomy(resumed,30*day,1);assert.equal(result.complete,false);
 while(!result.complete)result=accountEconomy(resumed,30*day,1);
 close(stockTotal(once),stockTotal(resumed));
 const restart=JSON.parse(JSON.stringify(once));accountEconomy(restart,30*day);assert.deepEqual(restart,once);
});
test('migration pays saved backlog at original full placeholder rates then switches once',()=>{
 const s=migrateResearch({villages:{a:village({biomeUnlocked:true,secondary:'minecraft:forest',localResearch:{version:1,progress:{roads:7,biome:0},revision:2}})},global:{storage:20},stock:{'minecraft:diamond':0.125},roads:{},economyAt:0,custom:'keep'});
 accountEconomy(s,hour);close(s.stock['minecraft:wheat'],3.5);close(s.stock['minecraft:stone'],1.5);close(s.stock['minecraft:oak_log'],1.5);
 assert.equal(s.productionVersion,2);assert.equal(s.villages.a.nativeBiome,'minecraft:plains');assert.equal(s.villages.a.productionMode,'diversify');assert.equal(s.villages.a.localResearch.progress.roads,7);
 accountEconomy(s,2*hour);close(s.stock['minecraft:wheat'],5.25);close(s.stock['minecraft:stone'],1.5);close(s.stock['minecraft:oak_log'],2.25);
 assert.equal(s.custom,'keep');assert.equal(s.stock['minecraft:diamond'],0.125);
 const saved=JSON.stringify(s);accountEconomy(s,2*hour);assert.equal(JSON.stringify(s),saved);
});
test('native biome is frozen once migrated even if the legacy biome field changes',()=>{
 const s=state();s.villages.a.biome='minecraft:forest';migrateProduction(s);
 assert.equal(productionAllocations(s.villages.a)[0].biome,'minecraft:plains');
});
test('Dappled Forest produces Poplar Logs in either allocation and accepts them as Building materials',()=>{
 const native=village({biome:'minecraft:dappled_forest'});close(resourceRates(native)[0].rate,0.75);
 native.biomeUnlocked=true;native.productionMode='specialize';close(resourceRates(native)[0].rate,1.5);
 const diversified=village({biome:'minecraft:river',biomeUnlocked:true,productionMode:'diversify',secondary:'minecraft:dappled_forest'});
 const poplar=resourceRates(diversified).find(r=>r.id==='minecraft:poplar_log');close(poplar.rate,0.75);close(poplar.riverBonus,0);
 assert.ok(categoryMaterials('building').includes('minecraft:poplar_log'));
 assert.ok(!categoryMaterials('crop').includes('minecraft:poplar_log'));
 const s=state(native);accountEconomy(s,hour);close(s.stock['minecraft:poplar_log'],1.5);close(native.developmentValue,3);
});
