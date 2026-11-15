import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import * as R from '../packs/behavior/scripts/global-research.js';
import * as E from '../packs/behavior/scripts/settlement-economy.js';
import {refreshProtection} from '../packs/behavior/scripts/settlement-effects.js';
const hour=3600000;
const fresh=(now=0)=>R.migrateResearch({villages:{},global:{},stock:{},roads:{},economyAt:now});
const reload=s=>R.migrateResearch(JSON.parse(JSON.stringify(s)));
const grant=(s,key,material,n)=>R.applyContribution(s,key,material,n);
const village=(x=0)=>({id:'a',location:{x,y:64,z:0},dimension:'minecraft:overworld',biome:'minecraft:plains',efficiency:0,hearth:1,developmentValue:0,lifetimeProduced:{},census:{realmPowerTenths:100}});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} differs from ${b}`);

test('MineScape square rings use exact thresholds on both signed axes',()=>{
 for(const [i,d]of [2400,6000,11200,18400,28000].entries()){
  for(const sign of [-1,1])for(const axis of ['x','z']){
   const location={x:0,z:0,y:9999};location[axis]=sign*(d-0.001);
   assert.equal(R.zoneIndex(location),i);location[axis]=sign*d;assert.equal(R.zoneIndex(location),i+1);
  }
 }
 assert.equal(R.zoneAt({x:2000,z:2000}),'Heartlands');
 assert.equal(R.zoneAt({x:-6000,z:6000}),'Wildlands');
 assert.equal(R.zoneAt({x:28000,z:0}),'Blackreach');assert.equal(R.zoneAt({x:NaN,z:0}),null);
});
test('Stewardship is free at I and each further level costs exactly 192 copper',()=>{
 const s=fresh();assert.equal(s.global.innovation,1);
 for(let level=2;level<25;level++){
  assert.equal(grant(s,'innovation','minecraft:copper_ingot',191),191);assert.equal(s.global.innovation,level-1);
  assert.equal(grant(s,'innovation','minecraft:copper_ingot',100),1);assert.equal(s.global.innovation,level);
 }
 assert.equal(grant(s,'innovation','minecraft:emerald',192),0);
});
test('Capacity gives one slot per 64 mixed logs, saves partial progress and obeys Stewardship',()=>{
 let s=fresh();assert.equal(R.settlementLimit(s),2);
 grant(s,'capacity','minecraft:oak_log',40);s=reload(s);assert.equal(R.settlementLimit(s),2);
 assert.equal(s.researchProgress.capacity,40);assert.equal(grant(s,'capacity','minecraft:cherry_log',64),24);
 assert.equal(R.settlementLimit(s),3);assert.equal(grant(s,'capacity','minecraft:birch_log',64),0);
 grant(s,'innovation','minecraft:copper_ingot',192);assert.equal(grant(s,'capacity','minecraft:warped_stem',64),64);
 assert.equal(R.settlementLimit(s),4);assert.equal(Object.keys(s.villages).length,0);
});
test('Frontier unlocks only founding in sequence at fixed iron/gold costs independent of Stewardship',()=>{
 const s=fresh();assert.equal(R.foundingReason(s,'Heartlands'),'');assert.equal(R.foundingReason(s,'Borderlands'),'');
 for(const [i,cost]of [32,48,32,48].entries()){
  assert.match(R.foundingReason(s,R.ZONES[i+2]),/Frontier/);
  const material=i<2?'minecraft:iron_ingot':'minecraft:gold_ingot';
  assert.equal(grant(s,'frontier','minecraft:emerald',cost),0);
  grant(s,'frontier',material,cost-1);assert.equal(s.global.frontier,i);
  assert.equal(grant(s,'frontier',i<2?'minecraft:gold_ingot':'minecraft:iron_ingot',1),0);
  grant(s,'frontier',material,1);assert.equal(s.global.frontier,i+1);assert.equal(R.foundingReason(s,R.ZONES[i+2]),'');
 }
 assert.equal(s.global.innovation,1);assert.equal(R.settlementLimit(s),2);assert.equal(grant(s,'frontier','minecraft:gold_ingot',48),0);
});
test('Colonization costs 60 diamonds and preserves earlier zone-specific bonuses',()=>{
 const s=fresh();assert.equal(grant(s,'colonization','minecraft:diamond',4),0);
 grant(s,'frontier','minecraft:iron_ingot',32);let spent=0;
 for(let level=1;level<=5;level++){
  spent+=grant(s,'colonization','minecraft:diamond',4*level);
  for(let zone=0;zone<6;zone++)assert.equal(R.colonizationBonus(s,R.ZONES[zone]),zone>0&&zone<=level?zone/10:0);
 }
 assert.equal(spent,60);assert.equal(s.global.frontier,1);assert.equal(s.global.innovation,1);
});
test('Shared Storage has a fixed resource-derived 792-item increment and exactly 512 material cost',()=>{
 let s=fresh();assert.equal(R.storageIncrement(),792);assert.equal(E.capacity(s),792);
 assert.equal(grant(s,'storage','minecraft:stone',512),0);grant(s,'capacity','minecraft:oak_log',64);
 grant(s,'storage','minecraft:stone',511);s=reload(s);assert.equal(E.capacity(s),792);
 assert.equal(grant(s,'storage','minecraft:oak_planks',64),1);assert.equal(E.capacity(s),1584);
 assert.equal(grant(s,'storage','minecraft:stone',512),0);
 s.villages.a=village();s.villages.a.productionPower=100000;s.villages.a.developmentValue=1e9;
 assert.equal(E.capacity(s),1584);assert.equal(grant(s,'storage','minecraft:dirt',512),0);
});
test('Migration preserves stock, existing settlements, roads, local levels and unknown fields',()=>{
 const legacy={villages:{a:{...village(),efficiency:7,sanctuary:9,developmentValue:50000}},stock:{'minecraft:stone':9999},roads:{r:{level:3,from:'a',to:'b'}},global:{development:2,capacity:4,storage:3,frontier:2},custom:{keep:true}};
 const s=R.migrateResearch(legacy);assert.equal(s.global.innovation,9);assert.equal(s.villages.a.developmentValue,50000);
 assert.equal(s.stock['minecraft:stone'],9999);assert.equal(s.roads.r.level,3);assert.equal(s.global.frontier,2);
 assert.equal(s.researchLegacy.development,2);assert.equal(s.custom.keep,true);assert.deepEqual(reload(s),s);
 E.accountEconomy(s,hour);assert.equal(s.stock['minecraft:stone'],9999);
});
test('The first v0.0.32 backlog is paid under legacy effects before activating new storage and bonuses',()=>{
 const s={villages:{a:village(28000)},stock:{},global:{storage:0,colonization:5},roads:{},economyAt:0};
 E.accountEconomy(s,100*hour);close(E.stockTotal(s),128);assert.equal(s.researchVersion,3);assert.equal(E.capacity(s),792);
 s.stock={};const before=s.villages.a.developmentValue;E.accountEconomy(s,101*hour);
 close(E.stockTotal(s),7.5);close(s.villages.a.developmentValue-before,6.5);
});
test('Both local endless technologies stop at Stewardship without consuming capped progress',()=>{
 const s=fresh(),v=village();v.biomeUnlocked=true;v.efficiency=1;v.sanctuary=1;v.developmentValue=500000;
 s.villages.a=v;assert.match(E.researchRequirement(v,'efficiency',s),/Stewardship/);assert.match(E.researchRequirement(v,'sanctuary',s),/Stewardship/);
 assert.equal(E.development(v),1000);assert.equal(R.localLevel(s,v,'efficiency'),1);
 grant(s,'innovation','minecraft:copper_ingot',192);assert.equal(E.researchRequirement(v,'efficiency',s),null);
 assert.equal(E.researchRequirement(v,'sanctuary',s),null);assert.equal(E.researchRequirement(v,'hearth',s),null);
});
test('Sanctuary protection and Prosperity rates use the global cap while retaining stored levels',()=>{
 const s=fresh(),v=village();v.sanctuary=5;v.efficiency=5;s.villages.a=v;
 close(E.resourceRates(v,s).find(r=>r.id==='minecraft:wheat').rate,3.675);
 const props=new Map(),player={location:{x:0,z:0},dimension:{id:v.dimension},setDynamicProperty:(k,val)=>props.set(k,val),addEffect(){}};
 refreshProtection(player,s.villages,0,s.global.innovation);
 assert.equal(JSON.parse(props.get('jagsby_frontier:sanctuary')).level,1);assert.equal(v.sanctuary,5);
});
test('Founding enforces both research and capacity without rejecting existing settlements on migration',()=>{
 const s=fresh();s.villages.a=village();s.villages.b={...village(),id:'b'};
 assert.match(R.foundingReason(s,'Heartlands'),/capacity/);grant(s,'capacity','minecraft:oak_log',64);
 assert.equal(R.foundingReason(s,'Heartlands'),'');assert.match(R.foundingReason(s,'Wildlands'),/Frontier/);
 grant(s,'frontier','minecraft:iron_ingot',32);assert.equal(R.foundingReason(s,'Wildlands'),'');
 assert.equal(Object.keys(s.villages).length,2);assert.match(R.foundingReason(s,null),/zone/);
});
test('Offline Colonization output is separate from category-weighted base Development',()=>{
 const s=fresh();s.villages.a=village(28000);s.global.colonization=5;
 E.accountEconomy(s,20*hour);close(E.stockTotal(s),150);close(s.villages.a.developmentValue,130);
 close(Object.values(s.villages.a.lifetimeBaseProduced).reduce((a,n)=>a+n,0),100);
 close(Object.values(s.villages.a.lifetimeBonusProduced).reduce((a,n)=>a+n,0),50);
 const serialized=JSON.stringify(s);E.accountEconomy(s,20*hour);assert.equal(JSON.stringify(s),serialized);
});
test('Capacity limits base and bonus proportionally; blocked output cannot generate Development',()=>{
 const s=fresh();s.villages.a=village(28000);s.global.colonization=5;s.stock['minecraft:sand']=717;
 E.accountEconomy(s,20*hour);close(E.stockTotal(s),792);close(s.villages.a.developmentValue,65);
 E.accountEconomy(s,40*hour);close(s.villages.a.developmentValue,65);
});
test('Research changes do not reprice earlier offline production',()=>{
 let s=fresh();s.villages.a=village(28000);E.accountEconomy(s,20*hour);close(E.stockTotal(s),100);
 s.global.colonization=5;s=reload(s);E.accountEconomy(s,40*hour);close(E.stockTotal(s),250);close(s.villages.a.developmentValue,260);
});
test('Colonization catch-up remains independent of access frequency across Development thresholds',()=>{
 const s=fresh();s.global.colonization=5;s.global.storage=10;s.global.innovation=10;s.villages.a={...village(28000),developmentValue:499.9};
 const once=structuredClone(s),many=structuredClone(s);E.accountEconomy(once,100*hour);
 for(let t=hour;t<=100*hour;t+=hour)E.accountEconomy(many,t);
 close(E.stockTotal(once),E.stockTotal(many));close(once.villages.a.developmentValue,many.villages.a.developmentValue);
});
test('Partial contributions persist; excessive, fractional and invalid-resource submissions are clipped or refused',()=>{
 let s=fresh();grant(s,'innovation','minecraft:copper_ingot',90);s=reload(s);assert.equal(s.researchProgress.innovation,90);
 assert.equal(grant(s,'innovation','minecraft:copper_ingot',1000),102);
 for(const n of [-1,NaN,Infinity,1.5])assert.equal(grant(s,'innovation','minecraft:copper_ingot',n),0);
 assert.equal(grant(s,'innovation','minecraft:emerald',100),0);
 s.global.capacity=s.global.innovation;s.researchProgress.capacity=17;
 assert.equal(grant(s,'capacity','minecraft:oak_log',64),0);assert.equal(s.researchProgress.capacity,17);
});

async function runtime(initial=fresh(Date.now()),respond=()=>({canceled:false,selection:0})){
 const slots=[{typeId:'minecraft:copper_ingot',amount:64},{typeId:'minecraft:copper_ingot',amount:64},{typeId:'minecraft:copper_ingot',amount:64}];
 let stored=JSON.stringify(initial),failWrite=0,write=0,failSlot=-1;
 const inventory={size:slots.length,getItem(i){return slots[i]?{...slots[i]}:undefined;},setItem(i,item){if(i===failSlot){failSlot=-1;throw Error('interrupted inventory write');}slots[i]=item?{...item}:undefined;}};
 const player={id:'p',sendMessage(){},getComponent(){return {container:inventory};}};
 const forms=[];
 class Form{constructor(){this.buttons=[];forms.push(this);}title(text){this.heading=text;return this;}body(text){this.text=text;return this;}button(text){this.buttons.push(text);return this;}show(){return Promise.resolve(respond(this));}}
 globalThis.__researchRuntime={world:{getDynamicProperty(){return stored;},setDynamicProperty(k,value){write++;if(write===failWrite)throw Error('interrupted world write');stored=value;},afterEvents:Object.fromEntries(['playerPlaceBlock','playerBreakBlock'].map(x=>[x,{subscribe(){}}])),beforeEvents:{playerInteractWithBlock:{subscribe(){}}}},system:{runInterval(){},run(){}},Form};
 let source=await readFile(new URL('../packs/behavior/scripts/main.js',import.meta.url),'utf8');
 source=source.replace('import { world, system, ItemStack } from "@minecraft/server";','const {world,system}=globalThis.__researchRuntime;class ItemStack {}').replace('import { ActionFormData, ModalFormData } from "@minecraft/server-ui";','const {Form:ActionFormData,Form:ModalFormData}=globalThis.__researchRuntime;').replace(/from "(\.\/[^\"]+)"/g,(_,path)=>`from ${JSON.stringify(new URL('../packs/behavior/scripts/'+path.slice(2),import.meta.url).href)}`);
 source+='\nexport { researchDetails, recoverResearch, localResearchDetails, state };\n//'+Math.random();
 const api=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
 return {api,player,slots,forms,read:()=>JSON.parse(stored),update(fn){const s=JSON.parse(stored);fn(s);stored=JSON.stringify(s);},failWorld(n){failWrite=write+n;},failInventory(i){failSlot=i;}};
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
test('Research at its Stewardship cap does not debit inventory or erase partial progress',async()=>{
 const s=fresh();s.global.capacity=1;s.researchProgress.capacity=17;
 const h=await runtime(s);h.slots[0]={typeId:'minecraft:oak_log',amount:64};
 await h.api.researchDetails(h.player,'none','capacity');
 assert.equal(h.read().researchProgress.capacity,17);assert.equal(h.slots[0].amount,64);
});
test('Global detail renderer exposes name, next costs, progress, prerequisites and benefits',async()=>{
 const s=fresh();const h=await runtime(s);await h.api.researchDetails(h.player,'none','storage');
 for(const text of ['Shared Storage','Level 0','512 Building materials','Contributed: 0/512','Requires Settlement Charters I','Stockpile: 0/792','+792 items'])assert.ok(h.forms[0].text.includes(text),text);
});
test('Save migration refuses a future version instead of overwriting it',()=>{
 assert.throws(()=>R.migrateResearch({researchVersion:4}),/newer/);
});
test('Local cost details do not charge on opening or closing',async()=>{
 const s=fresh(Date.now());s.villages.a={...village(),hearth:0,name:'Test',available:[]};
 const h=await runtime(s,()=>({canceled:true}));
 h.slots[0]={typeId:'minecraft:gold_ingot',amount:8};h.slots[1]={typeId:'minecraft:emerald',amount:8};
 await h.api.localResearchDetails(h.player,'a','hearth');
 assert.ok(h.forms[0].text.includes('8 gold ingot + 8 emerald'));
 assert.ok(h.forms[0].buttons[0].startsWith('Research next level:'));
 assert.equal(h.slots[0].amount,8);assert.equal(h.slots[1].amount,8);assert.equal(h.read().villages.a.hearth,0);
});
test('Local cost details charge the displayed recipe only after selecting purchase',async()=>{
 const s=fresh(Date.now());s.villages.a={...village(),hearth:0,name:'Test',available:[]};
 const h=await runtime(s,form=>form.heading==='JF_CHARTER|Local Research'?{canceled:false,selection:0}:{canceled:true});
 h.slots[0]={typeId:'minecraft:gold_ingot',amount:8};h.slots[1]={typeId:'minecraft:emerald',amount:8};
 await h.api.localResearchDetails(h.player,'a','hearth');
 assert.equal(h.slots[0],undefined);assert.equal(h.slots[1],undefined);assert.equal(h.read().villages.a.hearth,1);
});
test('Stale local confirmations refresh the cost without spending for a different level',async()=>{
 const s=fresh(Date.now());s.villages.a={...village(),hearth:0,name:'Test',available:[]};let reviews=0;
 const h=await runtime(s,form=>{
  if(form.heading==='JF_CHARTER|Local Research'&&reviews++===0){h.update(s=>s.villages.a.hearth=1);return {canceled:false,selection:0};}
  return {canceled:true};
 });
 h.slots[0]={typeId:'minecraft:gold_ingot',amount:8};h.slots[1]={typeId:'minecraft:emerald',amount:8};
 await h.api.localResearchDetails(h.player,'a','hearth');
 assert.equal(h.slots[0].amount,8);assert.equal(h.slots[1].amount,8);assert.equal(h.read().villages.a.hearth,1);
 assert.ok(h.forms[1].text.includes('16 gold ingot + 16 emerald'));
});
