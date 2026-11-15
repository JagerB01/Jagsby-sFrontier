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
 assert.equal(view.output.count,2);assert.equal(view.output.rows[0].base,3.5);assert.equal(view.output.rows[0].bonus,1.75);assert.equal(view.output.rows[0].actual,5.25);
 assert.ok(view.summary.includes('Total output: 7.5'));assert.ok(view.outputText.includes('From: Plains'));assert.equal(JSON.stringify(s),before);
});
test('A full stockpile shows paused actual output while preserving potential rates',()=>{
 const {s,v}=fixture();s.stock['minecraft:wheat']=792;const view=productionView(s,v);
 assert.ok(view.summary.includes('Paused: shared stockpile is full'));assert.equal(view.output.rows[0].actual,0);
 assert.equal(view.output.rows[0].base,3.5);assert.ok(view.outputText.includes('Potential: 3.5'));
});
test('Unlocked secondary biomes add resources while shared primary resources are counted once',()=>{
 const {s,v}=fixture();v.biomeUnlocked=true;v.secondary='minecraft:forest';
 const view=productionView(s,v);assert.equal(view.output.count,3);
 const stone=view.output.rows.find(r=>r.id==='minecraft:stone');assert.deepEqual(stone.sources,['Plains','Forest']);assert.equal(stone.base,1.5);
 v.biomeUnlocked=false;assert.equal(productionView(s,v).output.count,2);
});
test('Output and stock pagination clamps safely and never emits an unbounded list',()=>{
 const {s,v}=fixture();v.biomeUnlocked=true;v.secondary='minecraft:jungle';
 for(let i=0;i<13;i++)s.stock['minecraft:example_'+i]=i+0.25;
 const first=productionView(s,v,{output:0,stock:0}),last=productionView(s,v,{output:999,stock:999});
 assert.equal(first.output.rows.length,3);assert.equal(last.output.rows.length,1);assert.equal(last.output.page,1);
 assert.equal(first.stock.rows.length,5);assert.equal(last.stock.rows.length,3);assert.equal(last.stock.page,2);
 assert.ok(first.stockText.includes('0 collectable'));assert.ok(last.stockFooter.includes('Page 3 / 3'));
});
test('Biome panel explains research progress and separates verified choices from stale/out-of-range samples',()=>{
 const {s,v}=fixture();v.localResearch.progress.biome=20;
 v.available=['minecraft:forest','minecraft:taiga','minecraft:forest','minecraft:plains','unknown'];
 v.biomeSamples={'minecraft:forest':{x:32,y:64,z:0},'minecraft:taiga':{x:300,y:64,z:0}};
 const view=productionView(s,v);assert.ok(view.biomeText.includes('Locked'));assert.ok(view.biomeText.includes('Paper: 20 / 64'));
 assert.equal(view.biomes.count,2);assert.equal(view.choices[0].verified,true);assert.equal(view.choices[1].verified,false);
 v.biomeUnlocked=true;v.secondary='minecraft:forest';assert.equal(productionView(s,v).choices[0].selected,true);
});
test('Unknown/empty production and oversized requests have useful bounded empty states',()=>{
 const {s,v}=fixture();v.biome='minecraft:unmapped';v.productionPower=0;
 const view=productionView(s,v,{output:-4,stock:100,biomes:100});
 assert.equal(view.output.page,0);assert.equal(view.stock.page,0);assert.equal(view.biomes.page,0);
 assert.ok(view.outputText.includes('No mapped resources'));assert.ok(view.stockText.includes('No produced resources'));
 assert.ok(view.summary.includes('Waiting for recorded Realm Power'));
});
