import assert from 'node:assert/strict';
import test from 'node:test';
import {productionView} from '../packs/behavior/scripts/production-display.js';
import {migrateResearch} from '../packs/behavior/scripts/global-research.js';
import {migrateLocalResearch} from '../packs/behavior/scripts/local-research.js';
const fixture=()=>{
 const v=migrateLocalResearch({id:'a',name:'Test',dimension:'minecraft:overworld',location:{x:0,y:64,z:0},biome:'minecraft:plains',available:[],biomeSamples:{},hearth:1,efficiency:0,productionPower:10,developmentValue:0});
 const s=migrateResearch({villages:{a:v},global:{},roads:{},stock:{}});return {s,v};
};
test('Production displays precise per-resource base and zone rates without mutating state',()=>{
 const {s,v}=fixture();v.location.x=28000;s.global.colonization=5;
 const before=JSON.stringify(s),view=productionView(s,v);
 assert.equal(view.output.count,1);assert.equal(view.output.rows[0].base,1.75);assert.equal(view.output.rows[0].bonus,0.875);assert.equal(view.output.rows[0].actual,2.625);
 assert.equal(view.items[0].text,'Wheat\n+ 2.625/hour');assert.equal(view.modifierRows[2].value,'+ 50');assert.equal(JSON.stringify(s),before);
});
test('A full stockpile shows paused actual output while preserving potential rates',()=>{
 const {s,v}=fixture();s.stock['minecraft:wheat']=792;const view=productionView(s,v);
 assert.equal(view.status,'Stockpile full - paused');assert.equal(view.output.rows[0].actual,0);
 assert.equal(view.output.rows[0].base,1.75);assert.equal(view.items[0].text,'Wheat\n+ 0.000/hour');
});
test('Unlocked secondary biomes add resources while each allocation retains its source',()=>{
 const {s,v}=fixture();v.biomeUnlocked=true;v.secondary='minecraft:forest';
 const view=productionView(s,v);assert.equal(view.output.count,2);
 const oak=view.output.rows.find(r=>r.id==='minecraft:oak_log');assert.deepEqual(oak.sources,['Forest']);assert.equal(oak.base,0.75);
 v.biomeUnlocked=false;assert.equal(productionView(s,v).output.count,1);
});
test('Stockpile packs only stocked whole items on one page',()=>{
 const {s,v}=fixture();v.biomeUnlocked=true;v.secondary='minecraft:jungle';
 s.stock={'minecraft:wheat':12.99,'minecraft:potato':0.999,'minecraft:oak_log':250,'minecraft:poplar_log':3.7};
 const before=JSON.stringify(s),first=productionView(s,v,{stock:0}),last=productionView(s,v,{stock:999});
 assert.equal(first.output.rows.length,2);assert.equal(first.stock.length,3);
 assert.deepEqual(last.stock,first.stock);assert.equal(new Set(first.stock.map(i=>i.id)).size,3);
 assert.equal(first.stock.find(i=>i.id==='minecraft:wheat').count,12);
 assert.equal(first.stock.find(i=>i.id==='minecraft:potato'),undefined);
 assert.equal(first.stock.find(i=>i.id==='minecraft:oak_log').count,250);
 assert.ok(first.stock.every(i=>Number.isInteger(i.count)&&i.count>=0));
 assert.equal(first.stockHeading,'Stockpile  265 / 792');
 assert.equal(JSON.stringify(s),before);
});
test('Biome panel explains research progress and separates verified choices from stale/out-of-range samples',()=>{
 const {s,v}=fixture();v.localResearch.progress.biome=20;
 v.available=['minecraft:forest','minecraft:taiga','minecraft:forest','minecraft:plains','unknown'];
 v.biomeSamples={'minecraft:forest':{x:32,y:64,z:0},'minecraft:taiga':{x:300,y:64,z:0}};
 const view=productionView(s,v);assert.equal(view.choices[0].text,'Plains\n+ 1.750 Wheat/hour');
 assert.equal(view.biomes.count,3);assert.equal(view.choices[0].verified,true);assert.equal(view.choices[2].verified,false);
 v.biomeUnlocked=true;v.secondary='minecraft:forest';assert.equal(productionView(s,v).choices[1].selected,true);
});
test('Unknown/empty production and oversized requests have useful bounded empty states',()=>{
 const {s,v}=fixture();v.biome='minecraft:unmapped';v.productionPower=0;
 const view=productionView(s,v,{output:-4,stock:100,biomes:100});
 assert.equal(view.output.page,0);assert.equal(view.biomes.count,0);
 assert.deepEqual(view.items,[]);assert.equal(view.stock.length,0);assert.ok(view.stock.every(i=>i.count===0));
 assert.ok(view.status.includes('Waiting for Realm Power'));
});
test('All produced resources have a packaged item image and compact actual hourly rate',async()=>{
 const {BIOME_ASSIGNMENTS}=await import('../packs/behavior/scripts/biome-resources.js');
 const {readFile}=await import('node:fs/promises');
 for(const assignment of BIOME_ASSIGNMENTS){
  const {s,v}=fixture();v.biome=assignment.biome;
  const view=productionView(s,v),item=view.items[0];
  assert.equal(item.id,assignment.item);assert.equal(item.texture,'textures/ui/frontier/production/'+assignment.item.replace('minecraft:',''));
  assert.match(item.text,/\n\+ \d+\.\d{3}\/hour$/);
  const png=await readFile(new URL('../packs/resource/'+item.texture+'.png',import.meta.url));
  assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 }
});
test('River is conditional and Total reflects multiplicative, crop-aware production boosts',()=>{
 const {s,v}=fixture();v.biome='minecraft:river';v.biomeUnlocked=true;v.productionMode='specialize';
 v.efficiency=4;v.developmentValue=50000;v.location.x=28000;s.global.innovation=4;s.global.colonization=5;
 let view=productionView(s,v);
 assert.deepEqual(view.modifierRows.map(r=>r.label),['Prosperity','Development','Colonization','River']);
 assert.equal(view.modifierRows[3].value,'+ 10');assert.equal(view.modifierTotal,'+ 117.8');
 v.productionMode='diversify';v.secondary='minecraft:forest';view=productionView(s,v);
 assert.equal(view.modifierTotal,'+ 111.86');
 v.biome='minecraft:plains';v.available=['minecraft:river'];view=productionView(s,v);
 assert.equal(view.modifierRows.some(r=>r.label==='River'),false);
 assert.equal(view.modifierTotal,'+ 98');
});
test('Prospecting lists every surveyed biome with its icon and post-selection resource rate',async()=>{
 const {BIOME_ASSIGNMENTS}=await import('../packs/behavior/scripts/biome-resources.js');
 const {s,v}=fixture();v.biome='minecraft:river';v.biomeUnlocked=true;v.productionMode='specialize';
 v.available=BIOME_ASSIGNMENTS.filter(b=>b.biome!==v.biome).map(b=>b.biome);
 v.biomeSamples=Object.fromEntries(v.available.map(id=>[id,{x:32,y:70,z:0}]));
 const before=JSON.stringify(s),view=productionView(s,v);
 assert.equal(view.choices.length,52);assert.equal(view.biomes.rows.length,52);
 assert.equal(view.choices[0].text,'River\n+ 3.850 Wheat/hour');
 const forest=view.choices.find(c=>c.id==='minecraft:forest');
 assert.equal(forest.text,'Forest\n+ 0.750 Oak Logs/hour');assert.equal(forest.texture,'textures/ui/frontier/production/oak_log');
 const plains=view.choices.find(c=>c.id==='minecraft:plains');assert.equal(plains.hourly,view.choices[0].hourly);
 assert.equal(JSON.stringify(s),before);
 v.biomeUnlocked=false;assert.equal(productionView(s,v).choices[0].text,'River\n+ 1.925 Wheat/hour');
});
