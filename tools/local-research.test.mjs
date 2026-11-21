import assert from 'node:assert/strict';
import test from 'node:test';
import {migrateLocalResearch,localResearchCost,localResearchLevel,localResearchText,localContribution,applyLocalContribution,categoryMaterials} from '../packs/behavior/scripts/local-research.js';
import {accountEconomy,startRoad,completeRoads,development} from '../packs/behavior/scripts/settlement-economy.js';
const state=level=>({global:{innovation:level}});
const village=()=>migrateLocalResearch({hearth:0,efficiency:0,sanctuary:0,roads:0,biomeUnlocked:false});
const give=(v,k,id,n,s=state(100))=>applyLocalContribution(v,k,id,n,s);

test('Hearthstone unlocks after exactly 32 bread and another 64, with clipped partial payments',()=>{
 let v=village();assert.equal(give(v,'hearth','minecraft:bread',20),20);assert.equal(v.hearth,0);
 v=JSON.parse(JSON.stringify(v));assert.equal(v.localResearch.progress.hearth,20);
 assert.equal(give(v,'hearth','minecraft:bread',100),12);assert.equal(v.hearth,1);assert.equal(v.localResearch.progress.hearth,0);
 assert.equal(localResearchCost(v,'hearth').amount,64);
 give(v,'hearth','minecraft:bread',63);assert.equal(v.hearth,1);
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
 assert.deepEqual(categoryMaterials('crop').sort(),['minecraft:bamboo','minecraft:carrot','minecraft:cocoa_beans','minecraft:potato','minecraft:wheat']);
 for(let level=1;level<=8;level++){
  assert.equal(localResearchCost(v,'sanctuary').amount,250);
  assert.equal(give(v,'sanctuary','minecraft:wheat',125),125);
  assert.equal(v.sanctuary,level-1);
  assert.equal(give(v,'sanctuary','minecraft:cocoa_beans',200),125);assert.equal(v.sanctuary,level);
 }
});
test('Prosperity costs 256 blocks per level and accepts only the eight stone types',()=>{
 const v=village();v.biomeUnlocked=true;
 for(let level=1;level<=7;level++){
  const cost=localResearchCost(v,'efficiency');
  assert.equal(cost.amount,256);
  assert.deepEqual(cost.materials,['stone','cobblestone','deepslate','cobbled_deepslate','granite','diorite','andesite','tuff'].map(id=>'minecraft:'+id));
  give(v,'efficiency','minecraft:stone',100);give(v,'efficiency','minecraft:tuff',100);
  assert.equal(give(v,'efficiency','minecraft:andesite',100),56);assert.equal(v.efficiency,level);
 }
 for(const id of ['wheat','oak_log','oak_planks','warped_stem','sandstone','stone_bricks','packed_ice'])assert.equal(give(v,'efficiency','minecraft:'+id,256),0);
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
 assert.equal(b.localResearch.progress.hearth,5);assert.equal(give(a,'hearth','minecraft:bread',64),2);
 assert.equal(a.hearth,1);assert.equal(b.hearth,0);
});
test('Stewardship caps both endless upgrades and preserves partial progress at the cap',()=>{
 const v=village();v.hearth=1;v.biomeUnlocked=true;
 for(const [key,id]of [['sanctuary','minecraft:wheat'],['efficiency','minecraft:stone']]){
  const cost=localResearchCost(v,key).amount;
  give(v,key,id,cost,state(1));assert.equal(v[key],1);
  assert.equal(give(v,key,id,250,state(1)),0);
  v.localResearch.progress[key]=125;
  assert.equal(give(v,key,id,250,state(1)),0);assert.equal(v.localResearch.progress[key],125);
  assert.equal(give(v,key,id,cost,state(2)),cost-125);assert.equal(v[key],2);
 }
 assert.ok(localResearchText(v,'sanctuary',state(2)).includes('§cRequired: Stewardship Lv 3§r'));
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
 for(const value of ['Lv 5','Next cost: 256 Stone Blocks','Contributed: 125 / 256','131 remaining','Resource production: §b+25％§r §7→§r §a+30％§r'])assert.ok(text.includes(value),value);
 v.hearth=2;assert.ok(localResearchText(v,'hearth',state(1)).includes('Fully upgraded'));
});
test('Paid legacy surplus survives a Stewardship ceiling and resumes when the ceiling rises',()=>{
 const v={hearth:1,efficiency:1,biomeUnlocked:true,researchProgress:{prosperity:625}};
 migrateLocalResearch(v,state(1));assert.equal(v.efficiency,1);assert.equal(v.localResearch.progress.efficiency,625);
 migrateLocalResearch(v,state(2));assert.equal(v.efficiency,2);assert.equal(v.localResearch.progress.efficiency,369);
 migrateLocalResearch(v,state(4));assert.equal(v.efficiency,3);assert.equal(v.localResearch.progress.efficiency,113);
 const before=JSON.stringify(v);migrateLocalResearch(v,state(4));assert.equal(JSON.stringify(v),before);
});
test('Hearthstone I unlocks villager healing and II unlocks player regeneration',()=>{
 const v=village();let text=localResearchText(v,'hearth',state(1));
 assert.ok(text.includes('Villager healing: §b0§r §7→§r §a2§r HP / Minecraft day'));
 assert.equal(text.includes('Player regeneration'),false);
 v.hearth=1;text=localResearchText(v,'hearth',state(1));
 assert.ok(text.includes('Villager healing: §b2§r HP / Minecraft day'));
 assert.ok(text.includes('Player regeneration: §bOff§r §7→§r §aI§r'));
 assert.ok(text.includes('Within 80 blocks; persists 3 minutes after leaving.'));
 v.hearth=2;text=localResearchText(v,'hearth',state(1));
 assert.ok(text.includes('Player regeneration: §bI§r'));
 assert.ok(text.includes('Fully upgraded'));
});

test('Sanctuary compares colored percentages on one line and states its shared duration once',()=>{
 const v=village();v.hearth=1;v.sanctuary=1;
 const text=localResearchText(v,'sanctuary',state(1));
 assert.ok(text.includes('Hostile damage reduction: §b5％§r §7→§r §a9.75％§r'));
 assert.equal(text.match(/Persists for 3 minutes after leaving\./g).length,1);
 assert.equal(text.includes('Current:'),false);assert.equal(text.includes('Next:'),false);
 for(const value of ['Stewardship ceiling','Next cost: 250 Crops','Contributed: 0 / 250','250 remaining','Required: Stewardship Lv 2'])assert.ok(text.includes(value),value);
});

test('Percentage comparisons include zero, preserve resets and avoid rounding Sanctuary to immunity',()=>{
 const v=village();v.hearth=1;
 assert.ok(localResearchText(v,'sanctuary',state(2)).includes('§b0％§r §7→§r §a5％§r'));
 assert.ok(localResearchText(v,'efficiency',state(2)).includes('§b+0％§r §7→§r §a+5％§r'));
 v.sanctuary=1000;const text=localResearchText(v,'sanctuary',state(1001));
 assert.ok(text.includes('99.9999％'));assert.equal(text.includes('100％'),false);
 assert.equal(text.includes('%'),false,'Use the fullwidth percent glyph so Script API cannot consume it as formatting');
});

test('Prospecting and Roads compare their actual allocation and local efficiency, including maximum levels',()=>{
 const v=village();v.hearth=1;v.sanctuary=1;
 let text=localResearchText(v,'biome',state(3));
 assert.ok(text.includes('Secondary allocation: §b0％§r §7→§r §a50％§r'));
 assert.ok(text.includes('256 blocks'));v.biomeUnlocked=true;
 text=localResearchText(v,'biome',state(3));assert.ok(text.includes('§b50％§r'));assert.equal(text.includes('→'),false);assert.ok(text.includes('Fully upgraded'));
 text=localResearchText(v,'roads',state(3));assert.ok(text.includes('Travel tier: §bLocked§r §7→§r §aTrail§r'));
 v.roads=1;text=localResearchText(v,'roads',state(3));assert.ok(text.includes('Travel tier: §bTrail§r §7→§r §aRoad§r'));
 assert.ok(text.includes('Food cost reduction: §b0％§r §7→§r §a30％§r'));
 v.roads=2;text=localResearchText(v,'roads',state(3));assert.ok(text.includes('§b30％§r §7→§r §a55％§r'));
 v.roads=3;text=localResearchText(v,'roads',state(3));assert.ok(text.includes('§bHighway§r'));assert.ok(text.includes('§b55％§r'));assert.equal(text.includes('→'),false);
 assert.ok(text.includes('Limited by completed road tier.'));assert.ok(text.includes('6 Minecraft days'));
});

test('Local cards list only missing requirements and omit the line as soon as they are satisfied',()=>{
 const v=village();
 assert.equal(localResearchText(v,'hearth',state(1)).includes('Required:'),false);
 for(const key of ['biome','sanctuary'])assert.ok(localResearchText(v,key,state(1)).includes('Required: Hearthstone Lv 1'));
 v.hearth=1;
 for(const key of ['biome','sanctuary'])assert.equal(localResearchText(v,key,state(1)).includes('Required:'),false);
 assert.ok(localResearchText(v,'efficiency',state(1)).includes('Required: Resource Prospecting Lv 1'));
 v.biomeUnlocked=true;assert.equal(localResearchText(v,'efficiency',state(1)).includes('Required:'),false);
 assert.ok(localResearchText(v,'roads',state(1)).includes('Required: Sanctuary Lv 1'));
 v.sanctuary=1;assert.equal(localResearchText(v,'roads',state(1)).includes('Required:'),false);
 let text=localResearchText(v,'sanctuary',state(1));
 assert.ok(text.includes('Required: Stewardship Lv 2'));assert.equal(text.includes('Hearthstone Lv 1'),false);
 assert.equal(localResearchText(v,'sanctuary',state(2)).includes('Required:'),false);
 v.hearth=0;text=localResearchText(v,'sanctuary',state(1));
 assert.ok(text.includes('Required: Hearthstone Lv 1; Stewardship Lv 2'));
 assert.equal(text.match(/Required:/g).length,1);
 v.hearth=2;assert.equal(localResearchText(v,'hearth',state(1)).includes('Required:'),false);
});

test('Fixed local techs and saved payments obey Stewardship as well as their own caps',()=>{
 const v=village();v.hearth=1;v.sanctuary=1;v.roads=1;v.efficiency=1;v.biomeUnlocked=true;
 for(const key of ['hearth','roads','sanctuary','efficiency']){
  const cost=localResearchCost(v,key);const before=JSON.stringify(v);
  assert.equal(localContribution(v,key,cost.materials[0],cost.amount,state(1)),0);
  assert.ok(localResearchText(v,key,state(1)).includes('Required: Stewardship Lv 2'));assert.equal(JSON.stringify(v),before);
  assert.ok(localContribution(v,key,cost.materials[0],cost.amount,state(2))>0);
 }
 v.localResearch.progress.roads=64;migrateLocalResearch(v,state(1));assert.equal(v.roads,1);assert.equal(v.localResearch.progress.roads,64);
 migrateLocalResearch(v,state(2));assert.equal(v.roads,2);assert.equal(v.localResearch.progress.roads,32);
 migrateLocalResearch(v,state(3));assert.equal(v.roads,3);assert.equal(v.localResearch.progress.roads,0);
 assert.equal(localResearchCost(v,'roads'),null);
});
