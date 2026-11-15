import assert from 'node:assert/strict';
import test from 'node:test';
import {migrateLocalResearch,localResearchCost,localResearchLevel,localResearchText,localContribution,applyLocalContribution,categoryMaterials} from '../packs/behavior/scripts/local-research.js';
import {accountEconomy,startRoad,completeRoads,development} from '../packs/behavior/scripts/settlement-economy.js';
const state=level=>({global:{innovation:level}});
const village=()=>migrateLocalResearch({hearth:0,efficiency:0,sanctuary:0,roads:0,biomeUnlocked:false});
const give=(v,k,id,n,s=state(100))=>applyLocalContribution(v,k,id,n,s);

test('Hearthstone unlocks after exactly 64 bread and another 128, with clipped partial payments',()=>{
 let v=village();assert.equal(give(v,'hearth','minecraft:bread',20),20);assert.equal(v.hearth,0);
 v=JSON.parse(JSON.stringify(v));assert.equal(v.localResearch.progress.hearth,20);
 assert.equal(give(v,'hearth','minecraft:bread',100),44);assert.equal(v.hearth,1);assert.equal(v.localResearch.progress.hearth,0);
 assert.equal(localResearchCost(v,'hearth').amount,128);
 give(v,'hearth','minecraft:bread',127);assert.equal(v.hearth,1);
 assert.equal(give(v,'hearth','minecraft:bread',64),1);assert.equal(v.hearth,2);
 assert.equal(localResearchCost(v,'hearth'),null);assert.equal(give(v,'hearth','minecraft:bread',64),0);
});
test('Prospecting requires exactly 64 paper after Hearthstone I',()=>{
 const v=village();assert.equal(give(v,'biome','minecraft:paper',64),0);v.hearth=1;
 give(v,'biome','minecraft:paper',63);assert.equal(v.biomeUnlocked,false);
 assert.equal(give(v,'biome','minecraft:paper',20),1);assert.equal(v.biomeUnlocked,true);
 assert.equal(give(v,'biome','minecraft:paper',64),0);
});
test('Sanctuary uses mapped crops, mixes eligible items and costs a fixed 250 at every level',()=>{
 const v=village();v.hearth=1;
 assert.deepEqual(categoryMaterials('crop').sort(),['minecraft:cocoa_beans','minecraft:wheat']);
 for(let level=1;level<=8;level++){
  assert.equal(localResearchCost(v,'sanctuary').amount,250);
  assert.equal(give(v,'sanctuary','minecraft:wheat',125),125);
  assert.equal(v.sanctuary,level-1);
  assert.equal(give(v,'sanctuary','minecraft:cocoa_beans',200),125);assert.equal(v.sanctuary,level);
 }
});
test('Prosperity accepts building categories and allowlisted variants at a fixed 250 per level',()=>{
 const v=village();v.biomeUnlocked=true;
 for(let level=1;level<=7;level++){
  assert.equal(localResearchCost(v,'efficiency').amount,250);
  give(v,'efficiency','minecraft:stone',100);give(v,'efficiency','minecraft:oak_planks',100);
  assert.equal(give(v,'efficiency','minecraft:warped_stem',100),50);assert.equal(v.efficiency,level);
 }
 assert.equal(give(v,'efficiency','minecraft:wheat',250),0);
});
test('Wrong materials, seeds, food, emeralds and non-integer counts are rejected without progress',()=>{
 const v=village();v.hearth=1;v.biomeUnlocked=true;
 for(const id of ['minecraft:bread','minecraft:wheat_seeds','minecraft:emerald','minecraft:stone'])assert.equal(give(v,'sanctuary',id,250),0);
 for(const id of ['minecraft:diamond','minecraft:dirt','minecraft:cocoa_beans'])assert.equal(give(v,'efficiency',id,250),0);
 for(const n of [-1,1.5,NaN,Infinity])assert.equal(give(v,'hearth','minecraft:bread',n),0);
 assert.equal(v.sanctuary,0);assert.equal(v.efficiency,0);
});
test('Road Networks charges 32 copper, iron, gold in sequence and stops at III',()=>{
 const v=village();v.sanctuary=1;
 for(const [index,id]of ['minecraft:copper_ingot','minecraft:iron_ingot','minecraft:gold_ingot'].entries()){
  const cost=localResearchCost(v,'roads');assert.equal(cost.amount,32);assert.deepEqual(cost.materials,[id]);
  assert.equal(give(v,'roads','minecraft:emerald',32),0);
  give(v,'roads',id,20);assert.equal(v.roads,index);assert.equal(give(v,'roads',id,64),12);assert.equal(v.roads,index+1);
 }
 assert.equal(localResearchCost(v,'roads'),null);assert.equal(give(v,'roads','minecraft:gold_ingot',32),0);
});
test('Road construction remains independent of research payments and caps connections at III',()=>{
 const s={villages:{a:{...village(),id:'a',roads:1,dimension:'minecraft:overworld',location:{x:0,z:0}},b:{...village(),id:'b',dimension:'minecraft:overworld',location:{x:100,z:0}}},roads:{},stock:{},global:{}};
 for(let level=1;level<=3;level++){
  const road=startRoad(s,'a','b',0);completeRoads(s,road.finishTick);assert.equal(road.level,level);
 }
 assert.equal(s.villages.a.roads,1);assert.deepEqual(s.villages.a.localResearch.progress,village().localResearch.progress);
 assert.throws(()=>startRoad(s,'a','b',0),/Highway/);
});
test('Partial local progress is settlement-specific, survives reload and combines multiple contributors',()=>{
 let a=village(),b=village();give(a,'hearth','minecraft:bread',20);give(b,'hearth','minecraft:bread',5);
 ({a,b}=JSON.parse(JSON.stringify({a,b})));
 assert.equal(give(a,'hearth','minecraft:bread',10),10);assert.equal(a.localResearch.progress.hearth,30);
 assert.equal(b.localResearch.progress.hearth,5);assert.equal(give(a,'hearth','minecraft:bread',64),34);
 assert.equal(a.hearth,1);assert.equal(b.hearth,0);
});
test('Stewardship caps both endless upgrades and preserves partial progress at the cap',()=>{
 const v=village();v.hearth=1;v.biomeUnlocked=true;
 for(const [key,id]of [['sanctuary','minecraft:wheat'],['efficiency','minecraft:stone']]){
  give(v,key,id,250,state(1));assert.equal(v[key],1);
  assert.equal(give(v,key,id,250,state(1)),0);
  v.localResearch.progress[key]=125;
  assert.equal(give(v,key,id,250,state(1)),0);assert.equal(v.localResearch.progress[key],125);
  assert.equal(give(v,key,id,250,state(2)),125);assert.equal(v[key],2);
 }
 assert.ok(localResearchText(v,'sanctuary',state(2)).includes('Requires higher Stewardship'));
});
test('Legacy aliases preserve purchased levels and paid partial contributions idempotently',()=>{
 const v={hearth:1,research:{prosperity:{level:4,progress:125},roadNetworks:{level:2,progress:12}},researchProgress:{sanctuary:80},custom:'keep'};
 migrateLocalResearch(v);assert.equal(v.efficiency,4);assert.equal(v.roads,2);
 assert.equal(v.localResearch.progress.efficiency,125);assert.equal(v.localResearch.progress.roads,12);assert.equal(v.localResearch.progress.sanctuary,80);
 assert.equal(v.custom,'keep');const before=JSON.stringify(v);migrateLocalResearch(v);assert.equal(JSON.stringify(v),before);
 assert.throws(()=>migrateLocalResearch({localResearch:{version:2}}),/newer/);
});
test('Local UI lists current level, category, exact quantity, saved progress and remaining amount',()=>{
 const v=village();v.hearth=1;v.biomeUnlocked=true;v.efficiency=5;
 v.localResearch.progress.efficiency=125;
 const text=localResearchText(v,'efficiency',state(10));
 for(const value of ['Prosperity','Level 5','Next Level: 6','Building Materials: 125 / 250','125 remaining','Production Bonus: +25%','Next Level: +30%','Available'])assert.ok(text.includes(value),value);
 v.hearth=2;assert.ok(localResearchText(v,'hearth',state(1)).includes('Fully upgraded'));
});
test('Paid legacy surplus survives a Stewardship ceiling and resumes when the ceiling rises',()=>{
 const v={hearth:1,efficiency:1,biomeUnlocked:true,researchProgress:{prosperity:625}};
 migrateLocalResearch(v,state(1));assert.equal(v.efficiency,1);assert.equal(v.localResearch.progress.efficiency,625);
 migrateLocalResearch(v,state(2));assert.equal(v.efficiency,2);assert.equal(v.localResearch.progress.efficiency,375);
 migrateLocalResearch(v,state(4));assert.equal(v.efficiency,3);assert.equal(v.localResearch.progress.efficiency,125);
 const before=JSON.stringify(v);migrateLocalResearch(v,state(4));assert.equal(JSON.stringify(v),before);
});
