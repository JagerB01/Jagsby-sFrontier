import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import * as r from '../packs/behavior/scripts/global-research.js';
const fresh=(now=0)=>r.migrateState({villages:{},global:{},stock:{}},now);
const reload=s=>r.migrateState(JSON.parse(JSON.stringify(s)),s.lastTick);
const grant=(s,key,material,n)=>r.applyContribution(s,key,material,n);
const village=()=>({location:{x:0,z:0},dimension:'minecraft:overworld',biome:'plains',efficiency:0,developmentPoints:0,productionRemainders:{},census:{realmPowerTenths:100}});
const table={plains:[{id:'minecraft:wheat'},{id:'minecraft:stone'}]};

test('Innovation is free at I and each further level costs exactly 192 copper',()=>{
 const s=fresh();assert.equal(s.global.innovation,1);
 for(let level=2;level<25;level++){
  assert.equal(grant(s,'innovation','minecraft:copper_ingot',191),191);
  assert.equal(s.global.innovation,level-1);
  assert.equal(grant(s,'innovation','minecraft:copper_ingot',100),1);
  assert.equal(s.global.innovation,level);
 }
 assert.equal(grant(s,'innovation','minecraft:emerald',192),0);
});
test('Capacity grants one slot per 64 mixed vanilla logs, never partial slots',()=>{
 let s=fresh();assert.equal(r.settlementLimit(s),2);
 grant(s,'capacity','minecraft:oak_log',40);s=reload(s);
 assert.equal(r.settlementLimit(s),2);assert.equal(s.researchProgress.capacity,40);
 assert.equal(grant(s,'capacity','minecraft:cherry_log',64),24);
 assert.equal(r.settlementLimit(s),3);
 assert.equal(grant(s,'capacity','minecraft:birch_log',64),0);
 assert.match(r.lockReason(s,'capacity'),/Innovation/);
 grant(s,'innovation','minecraft:copper_ingot',192);
 assert.equal(grant(s,'capacity','minecraft:pale_oak_log',64),64);
 assert.equal(r.settlementLimit(s),4);
});
test('Frontier unlocks only founding, sequentially, at fixed iron/gold prices',()=>{
 const s=fresh();assert.equal(r.foundingReason(s,'Heartlands'),'');assert.equal(r.foundingReason(s,'Borderlands'),'');
 for(const [i,cost]of [32,48,32,48].entries()){
  assert.match(r.foundingReason(s,r.ZONES[i+2]),/Frontier/);
  const material=i<2?'minecraft:iron_ingot':'minecraft:gold_ingot';
  assert.equal(grant(s,'frontier','minecraft:emerald',cost),0);
  grant(s,'frontier',material,cost-1);assert.equal(s.global.frontier,i);
  grant(s,'frontier',material,1);assert.equal(s.global.frontier,i+1);
  assert.equal(r.foundingReason(s,r.ZONES[i+2]),'');assert.equal(r.settlementLimit(s),2);
 }
 assert.equal(s.global.innovation,1);assert.equal(grant(s,'frontier','minecraft:gold_ingot',48),0);
});
test('Colonization needs Frontier I, costs 60 diamonds total and is zone-specific',()=>{
 const s=fresh();assert.equal(grant(s,'colonization','minecraft:diamond',4),0);
 grant(s,'frontier','minecraft:iron_ingot',32);
 let spent=0;
 for(let level=1;level<=5;level++){
  spent+=grant(s,'colonization','minecraft:diamond',level*4);
  for(let zone=0;zone<6;zone++)assert.equal(r.colonizationBonus(s,r.ZONES[zone]),zone>0&&zone<=level?zone/10:0);
 }
 assert.equal(spent,60);assert.equal(s.global.frontier,1);assert.equal(r.colonizationBonus(s,null),0);
});
test('Shared Storage uses a fixed documented item basket, independent of actual production',()=>{
 const s=fresh();const base=r.storageCapacity(s);assert.equal(base,792);
 assert.equal(grant(s,'storage','minecraft:stone',512),0);
 grant(s,'capacity','minecraft:oak_log',64);
 assert.equal(grant(s,'storage','minecraft:stone',511),511);assert.equal(r.storageCapacity(s),base);
 s.villages.x=village();s.villages.x.census.realmPowerTenths=100000;s.villages.x.efficiency=100;
 assert.equal(r.storageCapacity(s),base);
 assert.equal(grant(s,'storage','minecraft:oak_planks',512),1);assert.equal(r.storageCapacity(s),base*2);
 assert.equal(grant(s,'storage','minecraft:stone',512),0);
 assert.equal(r.storageIncrement(['minecraft:clay_ball']),24);
});
test('Migration preserves settlements, stock, local upgrades, legacy progression and is idempotent',()=>{
 const legacy={villages:{old:{name:'Keep',efficiency:7,sanctuary:3,developmentPoints:5000}},stock:{'minecraft:stone':9999},global:{development:2,capacity:4,storage:3,frontier:2},lastTick:-100};
 const s=r.migrateState(legacy,100);
 assert.equal(s.global.innovation,7);assert.equal(s.villages.old.name,'Keep');assert.equal(s.stock['minecraft:stone'],9999);
 assert.equal(s.villages.old.developmentPoints,5000);assert.equal(s.global.frontier,2);assert.equal(s.researchLegacy.development,2);
 assert.deepEqual(reload(s),s);assert.equal(s.lastTick,100);
});
test('Endless local Prosperity and Sanctuary obey Innovation without capping lifetime Development',()=>{
 const s=fresh();const v={efficiency:8,sanctuary:9,developmentPoints:99999};
 assert.equal(r.localLevel(s,v,'efficiency'),1);assert.equal(r.localLevel(s,v,'sanctuary'),1);
 assert.equal(v.developmentPoints,99999);assert.equal(v.efficiency,8);
 s.global.innovation=10;assert.equal(r.localLevel(s,v,'efficiency'),8);
});
test('Founding enforces both capacity and authoritative zones without deleting legacy settlements',()=>{
 const s=fresh();assert.match(r.foundingReason(s,null),/authoritative/);
 s.villages.a=village();s.villages.b=village();assert.match(r.foundingReason(s,'Heartlands'),/capacity/);
 s.global.capacity=1;assert.equal(r.foundingReason(s,'Heartlands'),'');assert.match(r.foundingReason(s,'Wildlands'),/Frontier/);
 assert.equal(Object.keys(s.villages).length,2);
});
test('Production gives Development only for successfully stored base items, including offline catch-up',()=>{
 const s=fresh();s.villages.a=village();s.global.colonization=5;
 r.produce(s,20*3600000,table,()=> 'Blackreach');
 assert.equal(r.stockTotal(s),150);assert.equal(s.villages.a.developmentPoints,100);
 const before=JSON.stringify(s);r.produce(s,20*3600000,table,()=> 'Blackreach');assert.equal(JSON.stringify(s),before);
});
test('Full storage and Colonization overflow never earn unproduced Development',()=>{
 const s=fresh();s.villages.a=village();s.global.colonization=5;s.stock['minecraft:sand']=712;
 r.produce(s,20*3600000,table,()=> 'Blackreach');
 assert.equal(r.stockTotal(s),792);assert.equal(s.villages.a.developmentPoints,70);
 r.produce(s,40*3600000,table,()=> 'Blackreach');assert.equal(s.villages.a.developmentPoints,70);
});
test('Research effect timestamp boundary settles old output before enabling bonus',()=>{
 let s=fresh();s.villages.a=village();
 r.produce(s,20*3600000,table,()=> 'Blackreach');assert.equal(r.stockTotal(s),100);
 s.global.colonization=5;s=reload(s);
 r.produce(s,40*3600000,table,()=> 'Blackreach');
 assert.equal(r.stockTotal(s),264);assert.equal(s.villages.a.developmentPoints,210);
});
test('Fractional production persists across reloads and duplicate biome resources are not duplicated',()=>{
 let s=fresh();s.villages.a=village();s.villages.a.secondary='plains';
 r.produce(s,1800000,table,()=> 'Heartlands');s=reload(s);
 assert.equal(r.stockTotal(s),1);assert.ok(s.villages.a.productionRemainders['minecraft:wheat'].base>0);
 assert.equal(s.villages.a.developmentPoints,1);
});
test('Partial contributions persist and excessive/invalid submissions consume no extra items',()=>{
 let s=fresh();grant(s,'innovation','minecraft:copper_ingot',90);s=reload(s);
 assert.equal(s.researchProgress.innovation,90);
 assert.equal(grant(s,'innovation','minecraft:copper_ingot',1000),102);
 for(const n of [-1,NaN,Infinity,1.5])assert.equal(grant(s,'innovation','minecraft:copper_ingot',n),0);
});

async function runtime(initial=fresh()){
 const slots=[{typeId:'minecraft:copper_ingot',amount:64},{typeId:'minecraft:copper_ingot',amount:64},{typeId:'minecraft:copper_ingot',amount:64}];
 let stored=JSON.stringify(initial),failWrite=0,write=0,failSlot=-1;
 const inventory={size:slots.length,getItem(i){return slots[i]?{...slots[i]}:undefined;},setItem(i,item){if(i===failSlot){failSlot=-1;throw Error('interrupted inventory write');}slots[i]=item?{...item}:undefined;}};
 const player={id:'p',sendMessage(){},getComponent(){return {container:inventory};}};
 const forms=[];
 class Form{constructor(){this.buttons=[];forms.push(this);}title(){return this;}body(text){this.text=text;return this;}button(text){this.buttons.push(text);return this;}show(){return Promise.resolve({canceled:false,selection:0});}}
 globalThis.__researchRuntime={world:{getDynamicProperty(){return stored;},setDynamicProperty(k,value){write++;if(write===failWrite)throw Error('interrupted world write');stored=value;},afterEvents:Object.fromEntries(['playerPlaceBlock','playerBreakBlock'].map(x=>[x,{subscribe(){}}])),beforeEvents:{playerInteractWithBlock:{subscribe(){}}}},system:{runInterval(){},run(){}},Form};
 let source=await readFile(new URL('../packs/behavior/scripts/main.js',import.meta.url),'utf8');
 source=source.replace('import { world, system, ItemStack } from "@minecraft/server";','const {world,system}=globalThis.__researchRuntime;class ItemStack {}').replace('import { ActionFormData, ModalFormData } from "@minecraft/server-ui";','const {Form:ActionFormData,Form:ModalFormData}=globalThis.__researchRuntime;').replace(/from "(\.\/[^\"]+)"/g,(_,path)=>`from ${JSON.stringify(new URL('../packs/behavior/scripts/'+path.slice(2),import.meta.url).href)}`);
 source+='\nexport { researchDetails, recoverResearch, state };\n//'+Math.random();
 const api=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
 return {api,player,slots,forms,read:()=>JSON.parse(stored),failWorld(n){failWrite=write+n;},failInventory(i){failSlot=i;}};
}
test('Inventory contribution is clipped, journaled and cannot be credited again on recovery',async()=>{
 const s=fresh();s.researchProgress.innovation=190;
 const h=await runtime(s);await h.api.researchDetails(h.player,'none','innovation');
 assert.equal(h.read().global.innovation,2);assert.equal(h.slots[0].amount,62);assert.equal(h.read().pendingResearch,undefined);
 h.api.recoverResearch(h.player);assert.equal(h.read().global.innovation,2);assert.equal(h.slots[0].amount,62);
});
test('Interrupted save after inventory debit recovers once without duplicate charge',async()=>{
 const h=await runtime();h.failWorld(2);
 await h.api.researchDetails(h.player,'none','innovation');
 assert.ok(h.read().pendingResearch);assert.ok(h.slots.every(x=>!x));assert.equal(h.read().global.innovation,1);
 h.api.recoverResearch(h.player);assert.equal(h.read().global.innovation,2);assert.equal(h.read().pendingResearch,undefined);
 h.api.recoverResearch(h.player);assert.equal(h.read().global.innovation,2);
});
test('Partly debited inventory recovers remaining slots; ambiguous inventories stop safely',async()=>{
 const h=await runtime();h.failInventory(1);await h.api.researchDetails(h.player,'none','innovation');
 assert.ok(h.read().pendingResearch);assert.equal(h.slots[0],undefined);assert.equal(h.slots[1].amount,64);
 h.slots[1].amount=63;assert.throws(()=>h.api.recoverResearch(h.player),/inventory changed/);
 assert.equal(h.read().global.innovation,1);
 h.slots[1].amount=64;h.api.recoverResearch(h.player);assert.equal(h.read().global.innovation,2);
});
test('Journal-intent save failure leaves inventory and research untouched',async()=>{
 const h=await runtime();h.failWorld(1);await h.api.researchDetails(h.player,'none','innovation');
 assert.equal(h.read().global.innovation,1);assert.equal(h.read().pendingResearch,undefined);
 assert.deepEqual(h.slots.map(x=>x.amount),[64,64,64]);
});
test('Research at its Innovation cap does not debit inventory or erase partial progress',async()=>{
 const s=fresh();s.global.capacity=1;s.researchProgress.capacity=17;
 const h=await runtime(s);h.slots[0]={typeId:'minecraft:oak_log',amount:64};
 await h.api.researchDetails(h.player,'none','capacity');
 assert.equal(h.read().researchProgress.capacity,17);assert.equal(h.slots[0].amount,64);
});
test('Global detail renderer exposes name, next costs, progress, prerequisites and benefits',async()=>{
 const s=fresh();const h=await runtime(s);await h.api.researchDetails(h.player,'none','storage');
 for(const text of ['Shared Storage','Level 0','512 Building materials','Contributed: 0/512','Requires Settlement Capacity I','Stockpile: 0/792','+792 items'])assert.ok(h.forms[0].text.includes(text),text);
});
test('Save migration refuses a future version instead of overwriting it',()=>{
 assert.throws(()=>r.migrateState({researchVersion:3}),/newer/);
});
