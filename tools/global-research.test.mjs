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
test('Frontier unlocks only founding in sequence at fixed iron/gold costs within Stewardship',()=>{
 const s=fresh();assert.equal(R.foundingReason(s,'Heartlands'),'');assert.equal(R.foundingReason(s,'Borderlands'),'');
 for(const [i,cost]of [32,48,32,48].entries()){
  s.global.innovation=i+1;
  assert.match(R.foundingReason(s,R.ZONES[i+2]),/Frontier/);
  const material=i<2?'minecraft:iron_ingot':'minecraft:gold_ingot';
  assert.equal(grant(s,'frontier','minecraft:emerald',cost),0);
  grant(s,'frontier',material,cost-1);assert.equal(s.global.frontier,i);
  assert.equal(grant(s,'frontier',i<2?'minecraft:gold_ingot':'minecraft:iron_ingot',1),0);
  grant(s,'frontier',material,1);assert.equal(s.global.frontier,i+1);assert.equal(R.foundingReason(s,R.ZONES[i+2]),'');
 }
 assert.equal(s.global.innovation,4);assert.equal(R.settlementLimit(s),2);assert.equal(grant(s,'frontier','minecraft:gold_ingot',48),0);
});
test('Colonization costs 60 diamonds and preserves earlier zone-specific bonuses',()=>{
 const s=fresh();s.global.innovation=5;assert.equal(grant(s,'colonization','minecraft:diamond',4),0);
 grant(s,'frontier','minecraft:iron_ingot',32);let spent=0;
 for(let level=1;level<=5;level++){
  spent+=grant(s,'colonization','minecraft:diamond',4*level);
  for(let zone=0;zone<6;zone++)assert.equal(R.colonizationBonus(s,R.ZONES[zone]),zone>0&&zone<=level?zone/10:0);
 }
 assert.equal(spent,60);assert.equal(s.global.frontier,1);assert.equal(s.global.innovation,5);
});
test('Shared Storage starts at 128, adds 64 per level and costs exactly 512 materials',()=>{
 let s=fresh();assert.equal(R.storageIncrement(),64);assert.equal(E.capacity(s),128);
 assert.equal(grant(s,'storage','minecraft:stone',512),0);grant(s,'capacity','minecraft:oak_log',64);
 grant(s,'storage','minecraft:stone',511);s=reload(s);assert.equal(E.capacity(s),128);
 assert.equal(grant(s,'storage','minecraft:oak_planks',64),1);assert.equal(E.capacity(s),192);
 assert.equal(grant(s,'storage','minecraft:stone',512),0);
 s.villages.a=village();s.villages.a.productionPower=100000;s.villages.a.developmentValue=1e9;
 assert.equal(E.capacity(s),192);assert.equal(grant(s,'storage','minecraft:dirt',512),0);
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
 E.accountEconomy(s,100*hour);close(E.stockTotal(s),128);assert.equal(s.researchVersion,3);assert.equal(E.capacity(s),128);
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
 const s=fresh();s.villages.a=village(28000);s.global.colonization=5;s.stock['minecraft:sand']=101.75;
 E.accountEconomy(s,20*hour);close(E.stockTotal(s),128);close(s.villages.a.developmentValue,17.5);
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
 class Form{constructor(){this.buttons=[];this.icons=[];forms.push(this);}title(text){this.heading=text;return this;}body(text){this.text=text;return this;}textField(){return this;}submitButton(){return this;}button(text,icon){this.buttons.push(text);this.icons.push(icon);return this;}show(){return Promise.resolve(respond(this));}}
 globalThis.__researchRuntime={world:{getAbsoluteTime(){return options.gameTick?.()??0;},getDimension(){return {getBiome:loc=>({id:options.biomeAt?options.biomeAt(loc):'minecraft:forest'}),getEntities(query){options.onCensus?.(query);return options.censusEntities||[];}};},getDynamicProperty(){return stored;},setDynamicProperty(k,value){write++;if(write===failWrite)throw Error('interrupted world write');stored=value;},afterEvents:Object.fromEntries(['playerPlaceBlock','playerBreakBlock'].map(x=>[x,{subscribe(){}}])),beforeEvents:{playerInteractWithBlock:{subscribe(){}}}},system:{beforeEvents:{startup:{subscribe(){}}},runInterval(){},run(){},runTimeout(){return 1;},clearRun(){}},Form};
 let source=await readFile(new URL('../packs/behavior/scripts/main.js',import.meta.url),'utf8');
 source=source.replace('import { world, system, ItemStack } from "@minecraft/server";','const {world,system}=globalThis.__researchRuntime;class ItemStack {constructor(typeId,amount){this.typeId=typeId;this.amount=amount;}}').replace('import { ActionFormData, ModalFormData } from "@minecraft/server-ui";','const {Form:ActionFormData,Form:ModalFormData}=globalThis.__researchRuntime;').replace(/from "(\.\/[^\"]+)"/g,(_,path)=>`from ${JSON.stringify(new URL('../packs/behavior/scripts/'+path.slice(2),import.meta.url).href)}`);
 source+='\nexport {cardContribution,contributeResearchCard,recoverResearch,state,open,globalResearchText,roadNetworkOverview,restoreLegacyControls,openProduction,selectBiome,applyProductionSelection,productionSelection,clearSecondary,collect,establishDirectoryRoad,surveySettlement,travelRoad};\n//'+Math.random();
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
 for(const value of ['Lv 0','512 Building materials','Contributed: 0 / 512','512 remaining','Required: Settlement Charters Lv 1','Stored: 0.000 items','Shared capacity: §b128§r §7→§r §a192§r items'])assert.ok(text.includes(value),value);
});
test('Save migration refuses a future version instead of overwriting it',()=>{
 assert.throws(()=>R.migrateResearch({researchVersion:4}),/newer/);
});
test('Opening and canceling Research shows costs in hover records without spending',async()=>{
 const s=fresh(Date.now());s.villages.a={...village(),hearth:0,name:'Test',available:[]};const h=await runtime(s);
 h.slots[0]={typeId:'minecraft:bread',amount:20};h.api.open(h.player,'a','Research','local');
 for(const value of ['Next cost: 64 Bread','64 remaining','Click to contribute','Player regeneration'])assert.ok(h.forms[0].buttons[5].includes(value));
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
 const s=fresh(Date.now());s.global.innovation=2;s.villages.a={...village(),hearth:1,name:'Test',available:[]};const h=await runtime(s);
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
  for(const label of ['Next cost:','Contributed:','remaining','Status:'])assert.ok(text.includes(label),`${index}: ${label}`);
  assert.ok(text.includes('Click to contribute'));
  assert.equal(text.includes('Carry the required material'),false);
  assert.equal(text.includes('Select for materials'),false);
 }
 assert.ok(records[5].includes('Player regeneration: §bOff§r §7→§r §aI§r'));
 assert.ok(records[55].includes('3 minutes after leaving'));
 assert.ok(records[9].includes('every other local and global tech'));
 assert.equal(records[9].includes('Required:'),false);
 assert.ok(records[61].includes('Bonus resources do not earn Development'));
});
test('Road Networks returns all connections for scrolling and distinguishes construction from travel',async()=>{
 const h=await runtime();const s=h.read(),v=s.villages.none;v.roads=3;
 for(let i=0;i<5;i++){
  s.villages['t'+i]={...v,id:'t'+i,name:'Town '+i};
  s.roads['r'+i]={from:v.id,to:'t'+i,level:1,distance:100};
 }
 s.roads.r2.level=2;s.roads.r3.level=3;
 s.roads.r0.targetLevel=2;s.roads.r0.startedTick=0;s.roads.r0.durationTicks=100;
 const first=h.api.roadNetworkOverview(s,v,0),last=h.api.roadNetworkOverview(s,v,99);
 assert.ok(first.summary.includes('4 active, 1 building'));assert.equal(first.summary.includes('page'),false);
 assert.ok(first.details.includes('Upgrading'));assert.ok(first.details.includes('corndogs'));
 assert.ok(first.details.includes('Town 4'));assert.deepEqual(first.rows,last.rows);
 assert.deepEqual(first.rows.map(row=>row.texture),['trail','trail','road','highway','trail'].map(tier=>'textures/ui/frontier/road_icons/'+tier));
 assert.equal(last.rows.length,5);
 assert.equal(h.api.roadNetworkOverview({...s,roads:{}},v).rows.length,0);
});
test('Road rows show destination identity, current food cost and only completed road artwork',async()=>{
 const h=await runtime(),s=h.read(),v=s.villages.none;v.roads=3;
 const target={...v,id:'target',name:'Varnesk',owner:{id:'owner',name:'Jagsby'},census:{realmPowerTenths:20}};
 s.villages.target=target;
 const road={from:v.id,to:target.id,level:0,targetLevel:1,distance:1551,startedTick:0,durationTicks:100};
 s.roads={route:road};
 let row=h.api.roadNetworkOverview(s,v).rows[0];
 assert.equal(row.name,'Varnesk');assert.equal(row.owner,'Jagsby');assert.equal(row.distance,'1551 blocks');
 assert.equal(row.villageTexture,'textures/ui/frontier/settlement_icons/hamlet');
 assert.equal(row.status,'Building Trail');assert.equal(row.nextTexture,'textures/ui/frontier/road_icons/trail');assert.equal(row.time,'in 0.01 days');assert.equal(row.cost,'Unavailable');assert.equal(row.texture,undefined);
 assert.match(row.text,/No road built yet/);
 road.level=1;road.targetLevel=2;
 row=h.api.roadNetworkOverview(s,v).rows[0];
 assert.equal(row.status,'Upgrading Road');assert.equal(row.nextTexture,'textures/ui/frontier/road_icons/road');
 assert.equal(row.texture,'textures/ui/frontier/road_icons/trail');
 assert.equal(row.cost,'Unavailable');assert.equal(row.canTravel,false);
 delete road.targetLevel;road.level=3;
 row=h.api.roadNetworkOverview(s,v).rows[0];
 assert.equal(row.status,'Highway');assert.equal(row.texture,'textures/ui/frontier/road_icons/highway');
 assert.equal(row.cost,E.corndogCost(E.foodCost(road,v)));
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
 let clicked=false;const h=await runtime(s,form=>{if(!clicked){clicked=true;return {canceled:false,selection:CHARTER_LAYOUT.realmRows.base+CHARTER_LAYOUT.realmRows.stride+6};}return {canceled:true};});
 h.player.dimension={id:'minecraft:overworld'};h.player.location={x:0,y:64,z:0};
 h.api.open(h.player,'a','Realm','global',0,'mine');await new Promise(resolve=>setImmediate(resolve));
 const index=CHARTER_LAYOUT.realmRows.base+CHARTER_LAYOUT.realmRows.stride;
 assert.equal(h.forms[0].buttons[index],'Beta');assert.equal(h.forms[0].buttons[index+1],'Builder');
 assert.equal(h.forms[0].buttons[index+2],'100, 64, 0');assert.equal(h.forms[0].buttons[index+3],'100 blocks');
 assert.equal(h.forms[0].buttons[index+4],'2');assert.ok(h.forms[0].text.includes('[JF:establish:mine:1]'));
 assert.equal(h.forms[0].icons[index],'textures/ui/frontier/settlement_icons/hamlet');
 const roads=Object.values(h.read().roads);assert.equal(roads.length,1);assert.equal(roads[0].from,'a');assert.equal(roads[0].to,'b');assert.equal(roads[0].targetLevel,1);
 assert.equal(h.forms.length,2);assert.ok(h.forms[1].text.includes('[JF:realm:mine]'));assert.equal(h.forms[1].buttons[index+5],'Building');assert.equal(h.forms[1].text.includes('[JF:establish:mine:1]'),false);
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
 const form=h.forms[0],layout=CHARTER_LAYOUT.realmRows;
 assert.equal((form.text.match(/\[JF:row:mine:/g)||[]).length,40);
 assert.equal((form.text.match(/\[JF:row:all:/g)||[]).length,40);
 assert.equal((form.text.match(/\[JF:row:roads:/g)||[]).length,39);
 assert.equal(form.buttons[layout.base+38*layout.stride+16],'Village 39');
 assert.equal(form.buttons.length,layout.base+39*layout.stride+16);
 for(const key of ['minePrev','mineNext','allPrev','allNext','roadsPrev','roadsNext'])assert.equal(CHARTER_LAYOUT.actions[key],undefined);
 assert.equal(form.buttons.some(text=>text.startsWith('Page ')),false);
});

test('Road construction time uses 24000 ticks per Minecraft day and rounds positive remainders up',async()=>{
 let tick=12000;
 const h=await runtime(undefined,undefined,{gameTick:()=>tick}),s=h.read(),v=s.villages.none;
 s.villages.target={...v,id:'target',name:'Next Village'};
 s.roads={r:{from:v.id,to:'target',level:1,targetLevel:2,distance:100,startedTick:0,durationTicks:60000,finishTick:60000}};
 let row=h.api.roadNetworkOverview(s,v).rows[0];
 assert.equal(row.remainingDays,2);assert.equal(row.time,'in 2 days');
 assert.equal(row.texture,'textures/ui/frontier/road_icons/trail');assert.equal(row.nextTexture,'textures/ui/frontier/road_icons/road');
 tick=48000;row=h.api.roadNetworkOverview(s,v).rows[0];assert.equal(row.time,'in 0.5 days');
 tick=59999;row=h.api.roadNetworkOverview(s,v).rows[0];assert.equal(row.time,'in 0.01 days');
 tick=60001;row=h.api.roadNetworkOverview(s,v).rows[0];assert.equal(row.remainingDays,0);
 s.roads.r.level=2;delete s.roads.r.targetLevel;
 row=h.api.roadNetworkOverview(s,v).rows[0];assert.equal(row.time,'');assert.equal(row.nextTexture,undefined);
 assert.equal(row.texture,'textures/ui/frontier/road_icons/road');assert.equal(row.nextTexture,undefined);
});

test('Compact road records show the upgrade icon and days, with a direct Travel action',async()=>{
 const s=fresh(Date.now());
 s.villages.a={...village(),name:'Alpha',roads:1};
 s.villages.b={...village(100),id:'b',name:'Beta',owner:{id:'p',name:'Builder'}};
 s.roads.r={from:'a',to:'b',level:1,targetLevel:2,distance:100,startedTick:0,durationTicks:60000,finishTick:60000};
 const h=await runtime(s,undefined,{gameTick:()=>12000});h.api.open(h.player,'a','Realm');
 const base=CHARTER_LAYOUT.realmRows.base+16,form=h.forms[0];
 assert.equal(form.buttons[base],'Beta');assert.equal(form.buttons[base+1],'Builder');assert.equal(form.buttons[base+2],'100 blocks');
 assert.equal(form.buttons[base+4],'');assert.equal(form.buttons[base+5],'in 5.5 days');
 assert.equal(form.icons[base+6],'textures/ui/frontier/road_icons/road');assert.equal(form.icons[base+7],undefined);
 assert.ok(form.text.includes('[JF:travel_disabled:roads:0]'));assert.equal(form.text.includes('[JF:travel:roads:0]'),false);
});

test('Realm layout overflow is reported rather than silently discarding settlements',async()=>{
 const h=await runtime();h.update(s=>{
  s.villages=Object.fromEntries(Array.from({length:CHARTER_LAYOUT.realmRows.limit+1},(_,i)=>['v'+i,{...village(i*100),id:'v'+i,name:'Village '+i}]));
 });
 h.api.open(h.player,'v0','Realm');
 assert.equal(h.forms.length,0);assert.ok(h.messages.some(message=>message.includes('128-row layout')));
 assert.equal(Object.keys(h.read().villages).length,129);
});

test('Per-row Travel spends food and teleports directly only for completed roads',async()=>{
 for(const upgrading of [false]){
  const s=fresh(Date.now());s.villages.a={...village(),name:'Alpha',roads:2};
  s.villages.b={...village(100),id:'b',name:'Beta'};
  s.roads.savedKey={from:'a',to:'b',level:1,distance:100,...(upgrading?{targetLevel:2,startedTick:0,durationTicks:60000,finishTick:60000}:{})};
  const index=CHARTER_LAYOUT.realmRows.base+16+7;
  const h=await runtime(s,()=>({canceled:false,selection:index}));
  h.slots[0]={typeId:'minecraft:bread',amount:64};
  h.player.dimension={id:'minecraft:overworld'};h.player.location={x:0,y:64,z:0};
  const arrivals=[];h.player.teleport=location=>arrivals.push(location);
  h.api.open(h.player,'a','Realm');await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(arrivals,[{x:100.5,y:65,z:0.5}]);assert.ok(h.slots[0].amount<64);
  assert.ok(h.messages.includes('Arrived at Beta.'));assert.equal(h.forms.length,1,'Travel opens no management menu');
 }
});

test('New roads disable Travel and insufficient food never charges or teleports',async()=>{
 for(const level of [0,1]){
  const s=fresh(Date.now());s.villages.a={...village(),name:'Alpha',roads:1};s.villages.b={...village(100),id:'b',name:'Beta'};
  s.roads.r={from:'a',to:'b',level,distance:100,...(!level?{targetLevel:1,startedTick:0,durationTicks:60000,finishTick:60000}:{})};
  const index=CHARTER_LAYOUT.realmRows.base+16+7;
  const h=await runtime(s,()=>({canceled:false,selection:index}));
  h.player.dimension={id:'minecraft:overworld'};h.player.location={x:0,y:64,z:0};h.player.teleport=()=>assert.fail('Must not teleport');
  const before=JSON.stringify(h.slots);
  h.api.open(h.player,'a','Realm');await new Promise(resolve=>setImmediate(resolve));
  assert.equal(JSON.stringify(h.slots),before);
  assert.ok(h.forms[0].text.includes(level?'[JF:travel:roads:0]':'[JF:travel_disabled:roads:0]'));
  if(level)assert.ok(h.messages.some(text=>text.includes('Need')&&text.includes('corndogs')));
 }
});

test('server travel rejects upgrades and an unresearched departure even when called without the button',async()=>{
 for(const scenario of ['research','upgrade','trail']){
  const s=fresh(Date.now());s.villages.a={...village(),roads:scenario==='research'?0:3,name:'Alpha'};
  s.villages.b={...village(1551),id:'b',roads:3,name:'Beta'};
  s.roads.r={from:'a',to:'b',level:scenario==='trail'?0:1,distance:1551,...(scenario!=='research'?{targetLevel:2,startedTick:0,finishTick:144000,durationTicks:144000,timingVersion:1}:{})};
  const h=await runtime(s);h.slots[0]={typeId:'minecraft:bread',amount:64};
  h.player.dimension={id:'minecraft:overworld'};h.player.location={x:0,y:64,z:0};h.player.teleport=()=>assert.fail('Blocked travel must not teleport');
  const before=JSON.stringify(h.slots);h.api.travelRoad(h.player,'a','r');
  assert.equal(JSON.stringify(h.slots),before);
  assert.ok(h.messages.some(text=>text.includes(scenario==='research'?'Road Networks':scenario==='upgrade'?'construction':'completed')));
 }
});

test('both ends of the same Highway quote and charge their own local research efficiency in corndogs',async()=>{
 for(const [departure,tech,price,breadUsed] of [['a',1,'8 corndogs',4],['b',3,'3.5 corndogs',2]]){
  const s=fresh(Date.now());s.villages.a={...village(),id:'a',name:'Alpha',roads:1};
  s.villages.b={...village(1551),id:'b',name:'Beta',roads:3};s.roads.r={from:'a',to:'b',level:3,distance:1551};
  const h=await runtime(s);h.slots[0]={typeId:'minecraft:bread',amount:10};
  h.player.dimension={id:'minecraft:overworld'};h.player.location={...s.villages[departure].location};
  const arrivals=[];h.player.teleport=location=>arrivals.push(location);
  const row=h.api.roadNetworkOverview(h.read(),s.villages[departure]).rows[0];assert.equal(row.cost,price);
  h.api.open(h.player,departure,'Realm');
  assert.equal(h.forms[0].buttons[CHARTER_LAYOUT.realmRows.base+16+3],price.replace(' corndogs',''));
  h.api.travelRoad(h.player,departure,'r');assert.equal(arrivals.length,1);assert.equal(h.slots[0].amount,10-breadUsed);
 }
});

test('All global cards use compact colored comparisons while preserving zone meanings and capped states',async()=>{
 const h=await runtime(),s=h.read();
 const cases=[['innovation','Upgrade limit: §bLv 1§r §7→§r §aLv 2§r'],['capacity','Settlement limit: §b2§r §7→§r §a3§r'],['storage','Shared capacity: §b128§r §7→§r §a192§r items'],['frontier','Founding limit: §bBorderlands§r §7→§r §aWildlands§r'],['colonization','Zone bonus: §bNone§r §7→§r §aBorderlands +10％§r']];
 const before=JSON.stringify(s);
 for(const [key,expected] of cases){const text=h.api.globalResearchText(s,key);assert.ok(text.includes(expected),key);assert.equal(text.includes('Current:'),false);assert.equal(text.includes('Next:'),false);assert.ok(text.includes('Next cost:'));}
 assert.equal(JSON.stringify(s),before,'Rendering must not mutate research');
 s.global.colonization=1;let text=h.api.globalResearchText(s,'colonization');
 assert.ok(text.includes('§bBorderlands +10％§r §7→§r §aWildlands +20％§r'));assert.ok(text.includes('Earlier zone bonuses remain active.'));
 for(const [key,level] of [['colonization',5],['frontier',4]]){
  s.global[key]=level;text=h.api.globalResearchText(s,key);assert.equal(text.includes('→'),false);assert.equal(text.includes('undefined'),false);assert.ok(text.includes('Blackreach'));assert.ok(text.includes('Fully upgraded'));
 }
});

test('Global cards omit met prerequisites, explain Stewardship and remove charter filler',async()=>{
 const h=await runtime(),s=h.read();
 let text=h.api.globalResearchText(s,'innovation');
 assert.ok(text.includes('every other local and global tech'));
 assert.ok(text.includes('maximum level'));assert.equal(text.includes('Required:'),false);assert.equal(text.includes('None'),false);
 text=h.api.globalResearchText(s,'capacity');assert.equal(text.includes('Required:'),false);
 assert.equal(text.includes('Founded:'),false);assert.equal(text.toLowerCase().includes('founding'),false);
 assert.ok(h.api.globalResearchText(s,'storage').includes('Required: Settlement Charters Lv 1'));
 assert.ok(h.api.globalResearchText(s,'colonization').includes('Required: Frontier Expansion Lv 1'));
 s.global.capacity=1;s.global.frontier=1;
 text=h.api.globalResearchText(s,'storage');assert.equal(text.includes('Required:'),false);
 assert.equal(h.api.globalResearchText(s,'colonization').includes('Required:'),false);
 text=h.api.globalResearchText(s,'capacity');assert.ok(text.includes('Required: Stewardship Lv 2'));
 assert.equal(text.match(/Stewardship Lv 2/g).length,1);
 s.global.innovation=2;assert.equal(h.api.globalResearchText(s,'capacity').includes('Required:'),false);
 s.global.innovation=1;s.global.capacity=0;s.global.storage=1;
 text=h.api.globalResearchText(s,'storage');assert.ok(text.includes('Required: Settlement Charters Lv 1; Stewardship Lv 2'));
 s.global.frontier=4;s.global.colonization=5;
 for(const key of ['frontier','colonization'])assert.equal(h.api.globalResearchText(s,key).includes('Required:'),false);
});

test('Stewardship limits every global tech other than itself, including Colonization and Frontier',()=>{
 for(const key of ['capacity','storage','frontier','colonization']){
  const s=fresh();s.global.innovation=2;s.global.frontier=1;s.global.capacity=1;s.global[key]=2;s.researchProgress[key]=7;
  const material=R.acceptedMaterials(s,key)[0],cost=R.nextCost(s,key),before=JSON.stringify(s);
  assert.equal(R.maxLevel(s,key),2);assert.match(R.lockReason(s,key),/Stewardship/);
  assert.equal(grant(s,key,material,cost),0);assert.equal(JSON.stringify(s),before);
  s.global.innovation=3;assert.equal(grant(s,key,material,cost),cost-7);assert.equal(s.global[key],3);
 }
 const s=fresh();s.global.innovation=10;s.global.colonization=5;s.global.frontier=4;
 assert.equal(R.maxLevel(s,'colonization'),5);assert.equal(R.maxLevel(s,'frontier'),4);
 assert.equal(grant(s,'innovation','minecraft:copper_ingot',192),192);assert.equal(s.global.innovation,11);
});

test('Research tab navigation and contributions reopen the same Local or Global subtab',async()=>{
 for(const scope of ['local','global']){
  const s=fresh(Date.now());s.global.innovation=5;s.global.frontier=1;
  const key=scope==='local'?'hearth':'colonization';
  const steps=[CHARTER_LAYOUT.actions[key]];
  const h=await runtime(s,()=>steps.length?{canceled:false,selection:steps.shift()}:{canceled:true});
  h.slots[0]={typeId:scope==='local'?'minecraft:bread':'minecraft:diamond',amount:scope==='local'?10:4};
  h.slots[1]=undefined;h.slots[2]=undefined;
  h.api.open(h.player,'none');await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.forms.length,2);
  const last=h.forms.at(-1);assert.ok(last.text.startsWith('[JF:tab:research]'));assert.ok(last.text.includes('[JF:research:'+scope+']'));
  if(scope==='local')assert.equal(h.read().villages.none.localResearch.progress.hearth,10);
  else assert.equal(h.read().global.colonization,1);
 }
});

test('Production clearing, collection and Survey preserve their selected tabs and remembered research/Realm views',async()=>{
 const s=fresh(Date.now());s.villages.a={...village(),name:'Alpha',biomeUnlocked:true,secondary:'minecraft:forest',productionMode:'diversify'};
 const steps=[CHARTER_LAYOUT.actions.clearSecondary,CHARTER_LAYOUT.actions.collect,CHARTER_LAYOUT.actions.scanProductionsummary];
 const h=await runtime(s,()=>steps.length?{canceled:false,selection:steps.shift()}:{canceled:true});
 h.api.open(h.player,'a','Production','local',0,'all','summary');
 await new Promise(resolve=>setImmediate(resolve));await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.forms.length,4);
 for(const index of [1])assert.ok(h.forms[index].text.includes('[JF:production:biomes]'));
 for(const index of [2,3])assert.ok(h.forms[index].text.includes('[JF:production:summary]'));
 for(const form of h.forms){assert.ok(form.text.startsWith('[JF:tab:production]'));assert.ok(form.text.includes('[JF:research:local]'));assert.ok(form.text.includes('[JF:realm:all]'));}
 assert.equal(h.read().villages.a.secondary,null);
});

test('Survey identifies the current Realm subtab even when opened on Overview',async()=>{
 const steps=[CHARTER_LAYOUT.actions.scanRealmall];
 const h=await runtime(undefined,()=>steps.length?{canceled:false,selection:steps.shift()}:{canceled:true});
 h.api.open(h.player,'none');await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.forms.length,2);assert.ok(h.forms.at(-1).text.startsWith('[JF:tab:realm]'));assert.ok(h.forms.at(-1).text.includes('[JF:realm:all]'));
});

test('Saving or canceling Rename returns to the same Production subtab',async()=>{
 for(const canceled of [false,true]){
  const s=fresh(Date.now());s.villages.a={...village(),name:'Alpha',biomeUnlocked:true};
  let clicked=false;
  const h=await runtime(s,form=>{
   if(form.heading==='JF_CHARTER|Rename')return {canceled,formValues:['Beta']};
   if(!clicked){clicked=true;return {canceled:false,selection:CHARTER_LAYOUT.actions.renameProductionbiomes};}
   return {canceled:true};
  });
  h.api.open(h.player,'a','Production','local',0,'all','biomes');await new Promise(resolve=>setImmediate(resolve));
  const last=h.forms.at(-1);assert.ok(last.text.startsWith('[JF:tab:production]'));assert.ok(last.text.includes('[JF:production:biomes]'));
  assert.ok(last.text.includes('[JF:research:local]'));assert.ok(last.text.includes('[JF:realm:all]'));
  assert.equal(h.read().villages.a.name,canceled?'Alpha':'Beta');
 }
});

test('Each header Survey variant returns to its visible client-side page and subtab',async()=>{
 for(const entry of CHARTER_LAYOUT.viewActions){
  let clicked=false;
  const h=await runtime(undefined,()=>{if(!clicked){clicked=true;return {canceled:false,selection:CHARTER_LAYOUT.actions[entry.scan]};}return {canceled:true};});
  h.api.open(h.player,'none');await new Promise(resolve=>setImmediate(resolve));await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.forms.length,2);
  const last=h.forms.at(-1).text;assert.ok(last.startsWith('[JF:tab:'+entry.page.toLowerCase()+']'));
  const scope=entry[entry.page.toLowerCase()+'Scope'];if(scope)assert.ok(last.includes('[JF:'+entry.page.toLowerCase()+':'+scope+']'));
 }
});

test('Fresh charters request Overview and the first subtab of every section',async()=>{
 const h=await runtime();h.api.open(h.player,'none');
 const body=h.forms[0].text;
 for(const marker of ['[JF:tab:overview]','[JF:research:local]','[JF:production:summary]','[JF:realm:roads]'])assert.ok(body.includes(marker));
 assert.equal(h.forms.length,1);
});

test('Storage capacity follows the chosen 128 + 64 per level curve',()=>{
 for(const [level,capacity]of [[0,128],[1,192],[2,256],[3,320],[5,448],[10,768]]){
  const s=fresh();s.global.storage=level;assert.equal(R.storageCapacity(s),capacity);
  assert.equal(R.storageIncrement(),64);
 }
});

test('Collection returns all whole items from an old over-cap stockpile without discarding fractions',async()=>{
 const s=fresh(Date.now());s.stock={'minecraft:wheat':500.75,'minecraft:stone':300.25};
 const h=await runtime(s);h.api.collect(h.player,'none');
 assert.equal(h.received.reduce((sum,item)=>sum+item.amount,0),800);
 assert.equal(h.received.filter(item=>item.typeId==='minecraft:wheat').reduce((sum,item)=>sum+item.amount,0),500);
 assert.deepEqual(h.read().stock,{'minecraft:wheat':0.75,'minecraft:stone':0.25});
 assert.equal(h.read().global.storage,0);
});
