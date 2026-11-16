import {CHARTER_LAYOUT} from '../packs/behavior/scripts/charter-layout.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import * as R from '../packs/behavior/scripts/global-research.js';
import * as E from '../packs/behavior/scripts/settlement-economy.js';
import {refreshProtection} from '../packs/behavior/scripts/settlement-effects.js';
const hour=3600000;
const fresh=(now=0)=>R.migrateResearch({productionVersion:2,developmentVersion:2,villages:{},global:{},stock:{},roads:{},economyAt:now});
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
 assert.equal(E.development(s.villages.a),1);close(E.stockTotal(s),2.627625);close(s.villages.a.developmentValue-before,1.75175);
});
test('Stewardship caps endless local levels without capping permanent Development',()=>{
 const s=fresh(),v=village();v.biomeUnlocked=true;v.efficiency=1;v.sanctuary=1;v.developmentValue=100000;
 s.villages.a=v;assert.match(E.researchRequirement(v,'efficiency',s),/Stewardship/);assert.match(E.researchRequirement(v,'sanctuary',s),/Stewardship/);
 assert.equal(E.development(v),1000);assert.equal(R.localLevel(s,v,'efficiency'),1);
 grant(s,'innovation','minecraft:copper_ingot',192);assert.equal(E.researchRequirement(v,'efficiency',s),null);
 assert.equal(E.researchRequirement(v,'sanctuary',s),null);
 v.sanctuary=5;
 const props=new Map(),player={location:{x:0,z:0},dimension:{id:v.dimension},setDynamicProperty:(k,val)=>props.set(k,val),addEffect(){}};
 refreshProtection(player,s.villages,0,s.global.innovation);
 assert.equal(JSON.parse(props.get('jagsby_frontier:sanctuary')).level,2);
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
 E.accountEconomy(s,20*hour);close(E.stockTotal(s),52.5);close(s.villages.a.developmentValue,35);
 close(Object.values(s.villages.a.lifetimeBaseProduced).reduce((a,n)=>a+n,0),35);
 close(Object.values(s.villages.a.lifetimeBonusProduced).reduce((a,n)=>a+n,0),17.5);
 const serialized=JSON.stringify(s);E.accountEconomy(s,20*hour);assert.equal(JSON.stringify(s),serialized);
});
test('Capacity limits base and bonus proportionally; blocked output cannot generate Development',()=>{
 const s=fresh();s.villages.a=village(28000);s.global.colonization=5;s.stock['minecraft:sand']=765.75;
 E.accountEconomy(s,20*hour);close(E.stockTotal(s),792);close(s.villages.a.developmentValue,17.5);
 E.accountEconomy(s,40*hour);close(s.villages.a.developmentValue,17.5);
});
test('Research changes do not reprice earlier offline production',()=>{
 let s=fresh();s.villages.a=village(28000);E.accountEconomy(s,20*hour);close(E.stockTotal(s),35);
 s.global.colonization=5;s=reload(s);E.accountEconomy(s,40*hour);close(E.stockTotal(s),87.5);close(s.villages.a.developmentValue,70);
});
test('Colonization catch-up remains independent of access frequency across Development thresholds',()=>{
 const s=fresh();s.global.colonization=5;s.global.storage=10;s.global.innovation=10;s.villages.a={...village(28000),developmentValue:99.9};
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

async function runtime(initial=fresh(Date.now()),respond=()=>({canceled:true}),options={}){
 initial.villages.none??={...village(),id:'none',name:'Test',biome:'unknown',census:{realmPowerTenths:0},available:[]};
 E.accountEconomy(initial,initial.economyAt??Date.now());
 const slots=[{typeId:'minecraft:copper_ingot',amount:64},{typeId:'minecraft:copper_ingot',amount:64},{typeId:'minecraft:copper_ingot',amount:64}];
 let stored=JSON.stringify(initial),failWrite=0,write=0,failSlot=-1;
 const received=[];
 const inventory={addItem(item){received.push(item);return undefined;},size:slots.length,getItem(i){return slots[i]?{...slots[i]}:undefined;},setItem(i,item){if(i===failSlot){failSlot=-1;throw Error('interrupted inventory write');}slots[i]=item?{...item}:undefined;}};
 const messages=[],player={id:'p',selectedSlotIndex:0,sendMessage(text){messages.push(text);},getComponent(){return {container:inventory};}};
 const forms=[];
 class Form{constructor(){this.buttons=[];this.icons=[];forms.push(this);}title(text){this.heading=text;return this;}body(text){this.text=text;return this;}button(text,icon){this.buttons.push(text);this.icons.push(icon);return this;}show(){return Promise.resolve(respond(this));}}
 globalThis.__researchRuntime={world:{getAbsoluteTime(){return options.gameTick?.()??0;},getDimension(){return {getBiome:loc=>({id:options.biomeAt?options.biomeAt(loc):'minecraft:forest'}),getEntities(query){options.onCensus?.(query);return options.censusEntities||[];}};},getDynamicProperty(){return stored;},setDynamicProperty(k,value){write++;if(write===failWrite)throw Error('interrupted world write');stored=value;},afterEvents:Object.fromEntries(['playerPlaceBlock','playerBreakBlock'].map(x=>[x,{subscribe(){}}])),beforeEvents:{playerInteractWithBlock:{subscribe(){}}}},system:{beforeEvents:{startup:{subscribe(){}}},runInterval(){},run(){},runTimeout(){return 1;},clearRun(){}},Form};
 let source=await readFile(new URL('../packs/behavior/scripts/main.js',import.meta.url),'utf8');
 source=source.replace('import { world, system, ItemStack } from "@minecraft/server";','const {world,system}=globalThis.__researchRuntime;class ItemStack {constructor(typeId,amount){this.typeId=typeId;this.amount=amount;}}').replace('import { ActionFormData, ModalFormData } from "@minecraft/server-ui";','const {Form:ActionFormData,Form:ModalFormData}=globalThis.__researchRuntime;').replace(/from "(\.\/[^\"]+)"/g,(_,path)=>`from ${JSON.stringify(new URL('../packs/behavior/scripts/'+path.slice(2),import.meta.url).href)}`);
 source+='\nexport {cardContribution,contributeResearchCard,recoverResearch,state,open,globalResearchText,roadNetworkOverview,restoreLegacyControls,openProduction,selectBiome,applyProductionSelection,productionSelection,clearSecondary,collect,establishDirectoryRoad,surveySettlement};\n//'+Math.random();
 const api=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
 return {api,player,slots,forms,messages,received,read:()=>JSON.parse(stored),update(fn){const s=JSON.parse(stored);fn(s);stored=JSON.stringify(s);},failWorld(n){failWrite=write+n;},failInventory(i){failSlot=i;}};
}
function choice(h,key,vid='none',player=h.player){const s=h.read();return h.api.cardContribution(player,s,s.villages[vid],key);}
function click(h,key,vid='none',shown=choice(h,key,vid),player=h.player){h.api.contributeResearchCard(player,vid,key,shown);}
test('A global card click is clipped, journaled and cannot be credited again on recovery',async()=>{
 const s=fresh();s.researchProgress.innovation=190;const h=await runtime(s);click(h,'innovation');
 assert.equal(h.read().global.innovation,2);assert.equal(h.slots[0].amount,62);
 h.api.recoverResearch(h.player);assert.equal(h.read().global.innovation,2);assert.equal(h.slots[0].amount,62);
 assert.ok(h.forms.every(f=>f.heading==='JF_CHARTER|Dashboard'));
});
test('Interrupted global final save recovers once without duplicate charge',async()=>{
 const h=await runtime();h.failWorld(3);click(h,'innovation');
 assert.ok(h.read().pendingResearch);assert.ok(h.slots.every(x=>!x));assert.equal(h.read().global.innovation,1);
 h.api.recoverResearch(h.player);assert.equal(h.read().global.innovation,2);assert.equal(h.read().pendingResearch,undefined);
 h.api.recoverResearch(h.player);assert.equal(h.read().global.innovation,2);
});
test('Partly debited inventory recovers remaining slots; ambiguous inventories stop safely',async()=>{
 const h=await runtime();h.failInventory(1);click(h,'innovation');
 assert.ok(h.read().pendingResearch);assert.equal(h.slots[0],undefined);assert.equal(h.slots[1].amount,64);
 h.slots[1].amount=63;assert.throws(()=>h.api.recoverResearch(h.player),/inventory changed/);
 assert.equal(h.read().global.innovation,1);h.slots[1].amount=64;h.api.recoverResearch(h.player);assert.equal(h.read().global.innovation,2);
});
test('Journal-intent save failure leaves global inventory and research untouched',async()=>{
 const h=await runtime();h.failWorld(2);click(h,'innovation');
 assert.equal(h.read().global.innovation,1);assert.equal(h.read().pendingResearch,undefined);assert.deepEqual(h.slots.map(x=>x.amount),[64,64,64]);
});
test('Capped global cards do not debit inventory or erase partial progress',async()=>{
 const s=fresh();s.global.capacity=1;s.researchProgress.capacity=17;const h=await runtime(s);h.slots[0]={typeId:'minecraft:oak_log',amount:64};
 click(h,'capacity');assert.equal(h.read().researchProgress.capacity,17);assert.equal(h.slots[0].amount,64);
});
test('Global hover record exposes effect, next cost, progress, remaining amount, prerequisite and click action',async()=>{
 const s=fresh();const h=await runtime(s);h.api.open(h.player,'none','Research','global');
 const text=h.forms[0].buttons[10];
 for(const value of ['Lv 0','512 Building materials','Contributed: 0 / 512','512 remaining','Requires: Settlement Charters Lv 1','Stored: 0.000 / 792','792 shared item spaces'])assert.ok(text.includes(value),value);
});
test('Save migration refuses a future version instead of overwriting it',()=>{
 assert.throws(()=>R.migrateResearch({researchVersion:4}),/newer/);
});
test('Opening and canceling Research shows costs in hover records without spending',async()=>{
 const s=fresh(Date.now());s.villages.a={...village(),hearth:0,name:'Test',available:[]};const h=await runtime(s);
 h.slots[0]={typeId:'minecraft:bread',amount:20};h.api.open(h.player,'a','Research','local');
 for(const value of ['Next cost: 64 Bread','64 remaining','Click to contribute','players'])assert.ok(h.forms[0].buttons[5].includes(value));
 assert.equal(h.slots[0].amount,20);assert.equal(h.read().villages.a.hearth,0);
});
test('Selecting the actual local card contributes directly and only redraws the dashboard',async()=>{
 const s=fresh(Date.now());s.villages.a={...village(),hearth:0,name:'Test',available:[]};let clicked=false;
 const h=await runtime(s,form=>{if(!clicked){clicked=true;return {canceled:false,selection:15};}return {canceled:true};});
 h.slots[0]={typeId:'minecraft:bread',amount:20};h.api.open(h.player,'a','Research','local');await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.slots[0],undefined);assert.equal(h.read().villages.a.localResearch.progress.hearth,20);
 assert.equal(h.forms.length,2);assert.ok(h.forms.every(f=>f.heading==='JF_CHARTER|Dashboard'));
 assert.ok(h.forms[1].buttons[5].includes('Contributed: 20 / 64'));
});
test('A stale local card never spends for a different level',async()=>{
 const s=fresh(Date.now());s.villages.a={...village(),hearth:0,name:'Test',available:[]};const h=await runtime(s);
 h.slots[0]={typeId:'minecraft:bread',amount:64};const shown=choice(h,'hearth','a');h.update(s=>s.villages.a.hearth=1);
 click(h,'hearth','a',shown);assert.equal(h.slots[0].amount,64);assert.equal(h.read().villages.a.hearth,1);
 assert.ok(h.forms[0].buttons[5].includes('Next cost: 128 Bread'));
});
test('Two players accumulate local progress; stale cards cannot double-debit',async()=>{
 const s=fresh(Date.now());s.villages.a={...village(),hearth:0,name:'Test',available:[]};const h=await runtime(s);h.slots[0]={typeId:'minecraft:bread',amount:20};
 let bread={typeId:'minecraft:bread',amount:50};
 const other={id:'other',sendMessage(){},getComponent(){return {container:{size:1,getItem(){return bread?{...bread}:undefined;},setItem(slot,item){bread=item?{...item}:undefined;}}};}};
 const stale=choice(h,'hearth','a',other);click(h,'hearth','a');assert.equal(h.read().villages.a.localResearch.progress.hearth,20);
 click(h,'hearth','a',stale,other);assert.equal(bread.amount,50);
 const refreshed=choice(h,'hearth','a',other);click(h,'hearth','a',refreshed,other);
 assert.equal(bread.amount,6);assert.equal(h.read().villages.a.hearth,1);
 click(h,'hearth','a',refreshed,other);assert.equal(bread.amount,6);
});
test('Local journal recovers a failed final save without charging or crediting twice',async()=>{
 const s=fresh(Date.now());s.villages.a={...village(),hearth:0,name:'Test',available:[]};const h=await runtime(s);h.slots[0]={typeId:'minecraft:bread',amount:64};h.failWorld(3);
 click(h,'hearth','a');assert.equal(h.read().pendingResearch.scope,'local');assert.equal(h.slots[0],undefined);assert.equal(h.read().villages.a.hearth,0);
 h.api.recoverResearch(h.player);assert.equal(h.read().villages.a.hearth,1);assert.equal(h.read().pendingResearch,undefined);
 h.api.recoverResearch(h.player);assert.equal(h.read().villages.a.hearth,1);
});
test('Local journal recovers interrupted multi-slot payments',async()=>{
 const s=fresh(Date.now());s.villages.a={...village(),hearth:1,name:'Test',available:[]};const h=await runtime(s);
 h.slots[0]={typeId:'minecraft:bread',amount:64};h.slots[1]={typeId:'minecraft:bread',amount:64,nameTag:'Contribution'};h.failInventory(1);
 click(h,'hearth','a');assert.equal(h.slots[0],undefined);assert.equal(h.slots[1].amount,64);assert.equal(h.read().villages.a.hearth,1);
 h.api.recoverResearch(h.player);assert.equal(h.read().villages.a.hearth,2);assert.equal(h.slots[1],undefined);
});
test('Local journal intent-save failure leaves items and progress untouched',async()=>{
 const s=fresh(Date.now());s.villages.a={...village(),hearth:0,name:'Test',available:[]};const h=await runtime(s);h.slots[0]={typeId:'minecraft:bread',amount:20};h.failWorld(2);
 click(h,'hearth','a');assert.equal(h.slots[0].amount,20);assert.equal(h.read().pendingResearch,undefined);assert.equal(h.read().villages.a.localResearch.progress.hearth,0);
});
test('Capped local cards preserve saved progress and inventory until Stewardship rises',async()=>{
 const s=fresh(Date.now());s.villages.a={...village(),sanctuary:1,name:'Test',available:[],localResearch:{version:1,progress:{sanctuary:125},revision:0}};
 const h=await runtime(s);h.slots[0]={typeId:'minecraft:wheat',amount:64};click(h,'sanctuary','a');
 assert.ok(h.forms[0].buttons[55].includes('Contributed: 125 / 250'));assert.ok(h.forms[0].buttons[55].includes('Stewardship Lv 2'));assert.ok(h.forms[0].buttons[55].includes('Status: Locked'));assert.equal(h.forms[0].buttons[55].includes('Status: Requires'),false);
 assert.equal(h.slots[0].amount,64);assert.equal(h.read().villages.a.localResearch.progress.sanctuary,125);
 h.update(s=>s.global.innovation=2);click(h,'sanctuary','a');assert.equal(h.slots[0],undefined);assert.equal(h.read().villages.a.localResearch.progress.sanctuary,189);
 h.slots[0]={typeId:'minecraft:wheat',amount:64};click(h,'sanctuary','a');assert.equal(h.slots[0].amount,3);assert.equal(h.read().villages.a.sanctuary,2);
});
test('Held eligible material is preferred, a single material type is spent, and no click exceeds its hover quote',async()=>{
 const s=fresh(Date.now());s.villages.a={...village(),hearth:1,sanctuary:0,name:'Test',available:[]};const h=await runtime(s);
 h.slots[0]={typeId:'minecraft:wheat',amount:100};h.slots[1]={typeId:'minecraft:cocoa_beans',amount:20};h.player.selectedSlotIndex=1;
 const shown=choice(h,'sanctuary','a');assert.equal(shown.material,'minecraft:cocoa_beans');assert.equal(shown.amount,20);
 h.slots[1].amount=64;click(h,'sanctuary','a',shown);assert.equal(h.slots[1].amount,44);assert.equal(h.slots[0].amount,100);assert.equal(h.read().villages.a.localResearch.progress.sanctuary,20);
 h.player.selectedSlotIndex=2;assert.equal(choice(h,'sanctuary','a').material,'minecraft:wheat');
});
test('Changing the selected eligible material invalidates the old hover quote without a payment',async()=>{
 const s=fresh(Date.now());s.villages.a={...village(),name:'Test',available:[]};const h=await runtime(s);
 h.slots[0]={typeId:'minecraft:wheat',amount:10};h.slots[1]={typeId:'minecraft:cocoa_beans',amount:10};
 const shown=choice(h,'sanctuary','a');h.player.selectedSlotIndex=1;click(h,'sanctuary','a',shown);
 assert.equal(h.slots[0].amount,10);assert.equal(h.slots[1].amount,10);assert.equal(h.read().villages.a.localResearch.progress.sanctuary,0);
});

test('All ten research hover records describe effects, next cost, progress, prerequisites and contribution action',async()=>{
 const s=fresh(Date.now());s.villages.a={...village(),hearth:0,name:'Test',available:[]};
 const h=await runtime(s);h.api.open(h.player,'a','Research','global');const records=h.forms[0].buttons;
 for(const index of [4,5,6,7,8,9,10,55,56,61]){
  const text=records[index];
  for(const label of ['Next cost:','Contributed:','remaining','Requires:','Status:'])assert.ok(text.includes(label),`${index}: ${label}`);
  assert.ok(text.includes('Click to contribute'));
  assert.equal(text.includes('Carry the required material'),false);
  assert.equal(text.includes('Select for materials'),false);
 }
 assert.ok(records[5].includes('Grants players Regeneration I while within the settlement'));
 assert.ok(records[55].includes('3 minutes after leaving'));
 assert.ok(records[9].includes('Permanent settlement Development is not capped'));
 assert.ok(records[61].includes('Extra resources do not earn Development'));
});
test('Road Networks returns all connections for scrolling and distinguishes construction from travel',async()=>{
 const h=await runtime();const s=h.read(),v=s.villages.none;
 for(let i=0;i<5;i++){
  s.villages['t'+i]={...v,id:'t'+i,name:'Town '+i};
  s.roads['r'+i]={from:v.id,to:'t'+i,level:1,distance:100};
 }
 s.roads.r2.level=2;s.roads.r3.level=3;
 s.roads.r0.targetLevel=2;s.roads.r0.startedTick=0;s.roads.r0.durationTicks=100;
 const first=h.api.roadNetworkOverview(s,v,0),last=h.api.roadNetworkOverview(s,v,99);
 assert.ok(first.summary.includes('4 active, 1 building'));assert.equal(first.summary.includes('page'),false);
 assert.ok(first.details.includes('Upgrading'));assert.ok(first.details.includes('food pts'));
 assert.ok(first.details.includes('Town 4'));assert.deepEqual(first.rows,last.rows);
 assert.deepEqual(first.rows.map(row=>row.texture),['trail','trail','road','highway','trail'].map(tier=>'textures/ui/frontier/road_icons/'+tier));
 assert.equal(last.rows.length,5);
 assert.equal(h.api.roadNetworkOverview({...s,roads:{}},v).rows.length,0);
});
test('Road rows show destination identity, current food cost and only completed road artwork',async()=>{
 const h=await runtime(),s=h.read(),v=s.villages.none;
 const target={...v,id:'target',name:'Varnesk',owner:{id:'owner',name:'Jagsby'},census:{realmPowerTenths:20}};
 s.villages.target=target;
 const road={from:v.id,to:target.id,level:0,targetLevel:1,distance:1551,startedTick:0,durationTicks:100};
 s.roads={route:road};
 let row=h.api.roadNetworkOverview(s,v).rows[0];
 assert.equal(row.name,'Varnesk');assert.equal(row.owner,'Jagsby');assert.equal(row.distance,'1551 blocks');
 assert.equal(row.villageTexture,'textures/ui/frontier/settlement_icons/hamlet');
 assert.equal(row.status,'Building Trail');assert.equal(row.nextTexture,'textures/ui/frontier/road_icons/trail');assert.equal(row.time,'0.01 Minecraft days left');assert.equal(row.cost,'Unavailable');assert.equal(row.texture,undefined);
 assert.match(row.text,/No road built yet/);
 road.level=1;road.targetLevel=2;
 row=h.api.roadNetworkOverview(s,v).rows[0];
 assert.equal(row.status,'Upgrading Road');assert.equal(row.nextTexture,'textures/ui/frontier/road_icons/road');
 assert.equal(row.texture,'textures/ui/frontier/road_icons/trail');
 assert.equal(row.cost,`${E.foodCost(road)} food pts`);
 delete road.targetLevel;road.level=3;
 row=h.api.roadNetworkOverview(s,v).rows[0];
 assert.equal(row.status,'Highway');assert.equal(row.texture,'textures/ui/frontier/road_icons/highway');
 assert.equal(row.cost,`${E.foodCost(road)} food pts`);
});
test('Removing the map restores only previously saved movement controls once',async()=>{
 const h=await runtime();let raw=JSON.stringify({4:true,6:false});const restored=[],titles=[];
 const player={getDynamicProperty:()=>raw,setDynamicProperty:(key,value)=>raw=value,inputPermissions:{setPermissionCategory:(key,value)=>restored.push([key,value])},onScreenDisplay:{setTitle:value=>titles.push(value)}};
 h.api.restoreLegacyControls(player);assert.deepEqual(restored,[[4,true],[6,false]]);assert.equal(raw,undefined);assert.deepEqual(titles,['']);
 h.api.restoreLegacyControls(player);assert.equal(restored.length,2);
});

test('Selecting a verified biome applies immediately without a confirmation form',async()=>{
 const s=fresh(Date.now());s.villages.a={...village(),name:'Test',biomeUnlocked:true,available:['minecraft:forest'],biomeSamples:{'minecraft:forest':{x:32,y:64,z:0}}};let clicked=false,reads=0;
 const h=await runtime(s,form=>{if(!clicked){clicked=true;return {canceled:false,selection:CHARTER_LAYOUT.actions.prospectSelect1};}return {canceled:true};},{biomeAt:()=>{reads++;return 'minecraft:forest';}});
 h.api.openProduction(h.player,'a','biomes');await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.read().villages.a.secondary,'minecraft:forest');assert.equal(reads,1);
 assert.equal(h.forms.length,2);assert.ok(h.forms.every(form=>form.heading==='JF_CHARTER|Dashboard'));
 assert.ok(h.forms[1].text.includes('[JF:production:biomes]'));
 assert.equal(h.forms[1].icons[CHARTER_LAYOUT.data.overviewProduction0],'textures/ui/frontier/production/wheat');
 assert.equal(h.forms[1].icons[CHARTER_LAYOUT.data.overviewProduction1],'textures/ui/frontier/production/oak_log');
 assert.equal(h.forms[1].buttons[CHARTER_LAYOUT.data.overviewProduction0],'+ 1.750/hr');
 assert.equal(h.forms[1].buttons[CHARTER_LAYOUT.data.overviewProduction1],'+ 0.750/hr');
 h.api.clearSecondary(h.player,'a');assert.equal(h.read().villages.a.secondary,null);
});
test('Unverified/out-of-range biome controls are disabled and selecting unloaded samples never changes the second biome',async()=>{
 const s=fresh(Date.now());s.villages.a={...village(),name:'Test',biomeUnlocked:true,available:['minecraft:forest'],biomeSamples:{'minecraft:forest':{x:300,y:64,z:0}}};
 const h=await runtime(s,()=>({canceled:true}),{biomeAt:()=>{throw Error('unloaded');}});
 h.api.openProduction(h.player,'a','biomes');assert.equal(h.forms[0].buttons[CHARTER_LAYOUT.actions.prospectSelect1],'[JF:disabled:prospectSelect1]');
 await h.api.selectBiome(h.player,'a','minecraft:forest');assert.equal(h.read().villages.a.secondary,undefined);
 h.update(s=>s.villages.a.biomeSamples['minecraft:forest'].x=32);
 await assert.throws(()=>h.api.applyProductionSelection(h.player,'a','minecraft:forest','diversify',0),/unloaded/);assert.equal(h.read().villages.a.secondary,undefined);
});
test('The non-scrolling stockpile Collect all action transfers whole items and preserves fractions',async()=>{
 const s=fresh(Date.now());s.stock={'minecraft:wheat':2.75,'minecraft:stone':3.125};
 const h=await runtime(s);h.api.collect(h.player,'none');
 assert.equal(h.received.reduce((sum,item)=>sum+item.amount,0),5);
 assert.equal(h.read().stock['minecraft:wheat'],0.75);assert.equal(h.read().stock['minecraft:stone'],0.125);
 assert.ok(h.forms.at(-1).text.includes('[JF:production:summary]'));
});
test('Native Specialization applies immediately without any biome world reads',async()=>{
 const s=fresh(Date.now());s.villages.a={...village(),biomeUnlocked:true,available:[]};
 const h=await runtime(s,()=>({canceled:true}),{biomeAt:()=>{throw Error('Must not survey for specialization');}});
 await h.api.selectBiome(h.player,'a','minecraft:plains',{},'specialize');
 const v=h.read().villages.a;assert.equal(v.productionMode,'specialize');assert.equal(v.secondary,null);
 assert.equal(E.resourceRates(v).length,1);close(E.resourceRates(v)[0].rate,3.5);
 assert.equal(h.forms.length,1);assert.equal(h.forms[0].heading,'JF_CHARTER|Dashboard');
});
test('Closing the returned list does not undo an immediate selection',async()=>{
 const s=fresh(Date.now());s.villages.a={...village(),biomeUnlocked:true};
 const h=await runtime(s);await h.api.selectBiome(h.player,'a','minecraft:plains',{},'specialize');
 assert.equal(h.read().villages.a.productionMode,'specialize');assert.equal(h.read().villages.a.secondary,null);
});
test('Immediate selection rejects stale revisions and changed or unloaded world samples',async()=>{
 const s=fresh(Date.now());s.villages.a={...village(),biomeUnlocked:true,available:['minecraft:forest'],biomeSamples:{'minecraft:forest':{x:32,y:70,z:0}}};
 const h=await runtime(s,()=>({canceled:true}),{biomeAt:()=> 'minecraft:river'});
 assert.throws(()=>h.api.applyProductionSelection(h.player,'a','minecraft:forest','diversify',0),/must be loaded/);
 h.update(s=>s.villages.a.productionSelectionRevision=1);
 assert.throws(()=>h.api.applyProductionSelection(h.player,'a','minecraft:plains','specialize',0),/changed/);
 assert.equal(h.read().villages.a.productionMode,'unassigned');
});
test('Selecting a secondary allocation cannot bypass research, eligibility, different-biome or 256-block checks',async()=>{
 const h=await runtime(),v={...village(),biomeUnlocked:true,available:['minecraft:forest','minecraft:plains'],biomeSamples:{'minecraft:forest':{x:256,y:70,z:0},'minecraft:plains':{x:1,y:70,z:0}}};
 assert.equal(h.api.productionSelection(v,'minecraft:forest','diversify').secondary,'minecraft:forest');
 for(const candidate of [{...v,biomeUnlocked:false},{...v,dimension:'minecraft:nether'},{...v,biomeSamples:{'minecraft:forest':{x:257,z:0}}}])assert.throws(()=>h.api.productionSelection(candidate,'minecraft:forest','diversify'));
 for(const id of ['minecraft:plains','minecraft:lush_caves'])assert.throws(()=>h.api.productionSelection(v,id,'diversify'));
});
test('Production sends item images, aligned bonus percentages and whole stock counts on one page',async()=>{
 const s=fresh(Date.now());s.villages.a={...village(),biome:'minecraft:river',biomeUnlocked:true,productionMode:'specialize'};
 for(const id of ['bamboo','coal','iron_ingot','potato','sand','stone','wheat'])s.stock['minecraft:'+id]=10.25;
 const h=await runtime(s);h.api.openProduction(h.player,'a');
 assert.equal(h.forms[0].icons[96],'textures/ui/frontier/production/wheat');
 assert.equal(h.forms[0].icons[97],undefined);
 assert.ok(h.forms[0].buttons[96].includes('Wheat\n+ 3.850/hour'));
 for(const [i,value]of ['+ 0','+ 0','+ 0','+ 10'].entries())assert.equal(h.forms[0].buttons[CHARTER_LAYOUT.data.productionModifier0+i],value);
 assert.equal(h.forms[0].buttons[CHARTER_LAYOUT.data.productionModifierName3],'River');assert.equal(h.forms[0].buttons[CHARTER_LAYOUT.data.productionModifierTotal],'+ 10');
 assert.equal(h.forms.length,1);assert.ok(h.forms[0].text.includes('[JF:production:summary]'));
 const {STOCK_ITEMS}=await import('../packs/behavior/scripts/production-display.js');
 const stocked=STOCK_ITEMS.filter(item=>s.stock[item.id]>=1);
 for(const [i,item]of stocked.entries()){
  assert.equal(h.forms[0].buttons[CHARTER_LAYOUT.data.stockCount0+i],'10');
  assert.equal(h.forms[0].icons[CHARTER_LAYOUT.data.stockCount0+i],item.texture);
  assert.ok(h.forms[0].text.includes(`[JF:stock:${i}]`));
 }
 assert.equal(h.forms[0].buttons[CHARTER_LAYOUT.data.stockCount0+stocked.length],'');
 assert.equal(h.forms[0].text.includes(`[JF:stock:${stocked.length}]`),false);

});
test('Directory road button starts one Trail and returns to the same settlement list',async()=>{
 const s=fresh(Date.now());s.villages.a={...village(),name:'Alpha',owner:{id:'p',name:'Builder'},roads:1};
 s.villages.b={...village(100),id:'b',name:'Beta',owner:{id:'p',name:'Builder'},developmentValue:250,census:{realmPowerTenths:null,minimumPowerTenths:20}};
 let clicked=false;const h=await runtime(s,form=>{if(!clicked){clicked=true;return {canceled:false,selection:form.buttons.findIndex(text=>text.startsWith('[JF:list:mine]')&&text.includes('Beta'))};}return {canceled:true};});
 h.player.dimension={id:'minecraft:overworld'};h.player.location={x:0,y:64,z:0};
 h.api.open(h.player,'a','Realm','global',0,'mine');await new Promise(resolve=>setImmediate(resolve));
 const index=h.forms[0].buttons.findIndex(text=>text.startsWith('[JF:list:mine]')&&text.includes('Beta'));
 assert.ok(index>=CHARTER_LAYOUT.recordCount);
 for(const text of ['Beta','Builder','100, 64, 0','100 blocks','Dev 2','[JF:establish]'])assert.ok(h.forms[0].buttons[index].includes(text));
 assert.equal(h.forms[0].icons[index],'textures/ui/frontier/settlement_icons/hamlet');
 const roads=Object.values(h.read().roads);assert.equal(roads.length,1);assert.equal(roads[0].from,'a');assert.equal(roads[0].to,'b');assert.equal(roads[0].targetLevel,1);
 assert.equal(h.forms.length,2);assert.ok(h.forms[1].text.includes('[JF:realm:mine]'));assert.ok(h.forms[1].buttons.some(text=>text.startsWith('[JF:list:mine][JF:status:building]')&&text.includes('Beta')));
 h.api.establishDirectoryRoad(h.player,'a','b',0,'mine');assert.equal(Object.values(h.read().roads).length,1);
 assert.equal(Object.values(h.read().roads)[0].targetLevel,1);
});
test('Directory road creation cannot bypass research, dimension or source-location checks',async()=>{
 for(const scenario of ['research','dimension','distance']){
  const s=fresh(Date.now());s.villages.a={...village(),name:'Alpha',roads:scenario==='research'?0:1};s.villages.b={...village(100),id:'b',name:'Beta',dimension:scenario==='dimension'?'minecraft:nether':'minecraft:overworld'};
  const h=await runtime(s);h.player.dimension={id:'minecraft:overworld'};h.player.location={x:scenario==='distance'?1000:0,y:64,z:0};
  h.api.establishDirectoryRoad(h.player,'a','b',0,'all');assert.equal(Object.keys(h.read().roads).length,0);
 }
});
test('Simultaneous Survey requests share one villager census and biome scan',async()=>{
 const s=fresh(Date.now());s.villages.a={...village(),name:'Alpha'};let census=0,biomes=0;
 const h=await runtime(s,()=>({canceled:true}),{censusEntities:[{id:'v',typeId:'minecraft:villager_v2',getComponent:()=>({value:0})}],onCensus(){census++;},biomeAt(){biomes++;return 'minecraft:forest';}});
 await Promise.all([h.api.surveySettlement(h.player,'a',{page:'Production',productionScope:'biomes'}),h.api.surveySettlement({...h.player,id:'other'},'a',{page:'Production',productionScope:'biomes'})]);
 assert.equal(census,1);assert.equal(biomes,197);assert.equal(h.read().villages.a.productionPower,0.2);
 assert.ok(h.read().villages.a.available.includes('minecraft:forest'));
 assert.equal(h.forms.length,2);assert.ok(h.forms.every(form=>form.text.includes('[JF:production:biomes]')));
});

test('Scrollable Realm collections include every settlement and road beyond the former page sizes',async()=>{
 const s=fresh(Date.now());
 for(let i=0;i<40;i++){
  const id='v'+String(i).padStart(2,'0');
  s.villages[id]={...village(i*100),id,name:'Village '+i,owner:{id:'p',name:'Builder'},roads:1};
  if(i)s.roads['r'+i]={id:'r'+i,from:'v00',to:id,level:1,distance:i*100};
 }
 const h=await runtime(s);
 h.update(state=>{delete state.villages.none;});
 h.api.open(h.player,'v00','Realm','global',0,'roads');
 const form=h.forms[0],rows=form.buttons.slice(CHARTER_LAYOUT.recordCount);
 assert.equal(rows.filter(text=>text.startsWith('[JF:list:mine]')).length,40);
 assert.equal(rows.filter(text=>text.startsWith('[JF:list:all]')).length,40);
 assert.equal(rows.filter(text=>text.startsWith('[JF:list:roads]')).length,39);
 assert.ok(rows.some(text=>text.startsWith('[JF:list:roads]')&&text.includes('Village 39')));
 assert.equal(form.buttons.length,CHARTER_LAYOUT.recordCount+119);
 for(const key of ['minePrev','mineNext','allPrev','allNext','roadsPrev','roadsNext'])assert.equal(CHARTER_LAYOUT.actions[key],undefined);
 assert.equal(form.buttons.some(text=>text.startsWith('Page ')),false);
});

test('Road construction time uses 24000 ticks per Minecraft day and rounds positive remainders up',async()=>{
 let tick=12000;
 const h=await runtime(undefined,undefined,{gameTick:()=>tick}),s=h.read(),v=s.villages.none;
 s.villages.target={...v,id:'target',name:'Next Village'};
 s.roads={r:{from:v.id,to:'target',level:1,targetLevel:2,distance:100,startedTick:0,durationTicks:60000,finishTick:60000}};
 let row=h.api.roadNetworkOverview(s,v).rows[0];
 assert.equal(row.remainingDays,2);assert.equal(row.time,'2.00 Minecraft days left');
 assert.ok(row.record.includes('[JF:current:trail][JF:next:road]'));
 tick=48000;row=h.api.roadNetworkOverview(s,v).rows[0];assert.equal(row.time,'0.50 Minecraft days left');
 tick=59999;row=h.api.roadNetworkOverview(s,v).rows[0];assert.equal(row.time,'0.01 Minecraft days left');
 tick=60001;row=h.api.roadNetworkOverview(s,v).rows[0];assert.equal(row.remainingDays,0);
 s.roads.r.level=2;delete s.roads.r.targetLevel;
 row=h.api.roadNetworkOverview(s,v).rows[0];assert.equal(row.time,'');assert.equal(row.nextTexture,undefined);
 assert.ok(row.record.includes('[JF:current:road][JF:next:none]'));
});
