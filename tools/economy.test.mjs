import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
const base=new URL('../packs/behavior/scripts/',import.meta.url);
const configText=await readFile(new URL('economy-config.js',base),'utf8');
const configUrl='data:text/javascript;base64,'+Buffer.from(configText).toString('base64');
async function module(name){const source=(await readFile(new URL(name+'.js',base),'utf8')).replace("'./economy-config.js'",JSON.stringify(configUrl));return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));}
const E=await module('settlement-economy'),F=await module('settlement-effects');
const {ECONOMY_CONFIG:C}=await import(configUrl);
const hour=3600000,day=24*hour;
function village(id='a',extra={}){return {id,dimension:'minecraft:overworld',location:{x:0,y:64,z:0},biome:'minecraft:plains',census:{realmPowerTenths:100},efficiency:0,hearth:1,biomeUnlocked:false,...extra};}
function state(v=village()){return {villages:{[v.id]:v},global:{storage:20},stock:{},economyAt:0,roads:{}};}
function close(a,b,tolerance=1e-6){assert.ok(Math.abs(a-b)<tolerance,`${a} differs from ${b}`);}
test('specified hourly formula, fractional catch-up and shutdown/restart accounting',()=>{
 const s=state(village('a',{efficiency:5,developmentValue:50000}));
 E.accountEconomy(s,hour);
 close(s.stock['minecraft:wheat'],4.8125);
 const loaded=JSON.parse(JSON.stringify(s));E.accountEconomy(loaded,2*hour);
 close(loaded.stock['minecraft:wheat'],9.625);
 E.accountEconomy(loaded,2*hour);close(loaded.stock['minecraft:wheat'],9.625);
 assert.equal(E.development(loaded.villages.a),100);
 const small=state();E.accountEconomy(small,hour/10);close(small.stock['minecraft:wheat'],0.35);
});
test('RP changes apply only after accounting the old census; no loaded-world API is needed',()=>{
 const s=state();E.accountEconomy(s,hour);s.villages.a.census.realmPowerTenths=200;
 E.accountEconomy(s,2*hour);close(s.stock['minecraft:wheat'],10.5);
});
test('Development threshold integration is independent of access frequency',()=>{
 const initial=state(village('a',{developmentValue:499.9,efficiency:20}));
 const one=structuredClone(initial),many=structuredClone(initial);
 E.accountEconomy(one,30*day);
 for(let t=hour;t<=30*day;t+=hour)E.accountEconomy(many,t);
 close(one.stock['minecraft:wheat'],many.stock['minecraft:wheat'],1e-5);
 close(one.villages.a.developmentValue,many.villages.a.developmentValue,1e-5);
 assert.ok(E.development(one.villages.a)>0);
 const resumed=structuredClone(initial);
 let result=E.accountEconomy(resumed,30*day,1);assert.equal(result.complete,false);
 while(!result.complete)result=E.accountEconomy(resumed,30*day,1);
 close(resumed.stock['minecraft:wheat'],one.stock['minecraft:wheat'],1e-5);
});
test('full shared stock neither banks blocked output nor awards its Development',()=>{
 const s=state();s.global.storage=0;s.stock['minecraft:wheat']=127;
 E.accountEconomy(s,day);close(E.stockTotal(s),128);
 const value=s.villages.a.developmentValue;
 E.accountEconomy(s,2*day);close(s.villages.a.developmentValue,value);
 s.stock={};E.accountEconomy(s,2*day);assert.deepEqual(s.stock,{});
 E.accountEconomy(s,2*day+hour);close(s.stock['minecraft:wheat'],3.5);
 assert.ok(s.villages.a.developmentValue>value);
});
test('resources deduplicate across primary and exactly one secondary biome',()=>{
 const v=village('a',{biomeUnlocked:true,secondary:'minecraft:forest'});
 const rates=E.resourceRates(v);assert.equal(rates.filter(r=>r.id==='minecraft:stone').length,1);
 close(rates.find(r=>r.id==='minecraft:stone').rate,1.5);
 assert.ok(rates.some(r=>r.id==='minecraft:oak_log'));
 v.biomeUnlocked=false;assert.equal(E.resourcesFor(v).length,2);
});
test('resource category values, permanent lifetime totals, and save migration',()=>{
 assert.deepEqual(Object.values(C.categories).map(c=>[c.rate,c.value]),[[0.35,1],[0.15,2],[0.05,5],[0.01,10]]);
 const s=state();E.accountEconomy(s,hour);
 close(s.villages.a.developmentValue,3.5+1.5*2);
 close(s.villages.a.lifetimeProduced['minecraft:wheat'],3.5);
 const value=s.villages.a.developmentValue;s.stock={};E.accountEconomy(s,hour);close(s.villages.a.developmentValue,value);
 const legacy={villages:{a:village('a',{efficiency:4})},global:{storage:0},stock:{'minecraft:wheat':7},lastTick:0};
 E.accountEconomy(legacy,100*day);assert.equal(legacy.stock['minecraft:wheat'],7);assert.equal(legacy.villages.a.efficiency,4);
});
test('roads preserve initiator, reject duplicates, cap upgrades, and reward both endpoints independently',()=>{
 const s=state(village('a',{roads:1,developmentValue:10000}));s.villages.b=village('b',{location:{x:1000,y:64,z:0},developmentValue:100000});
 E.migrateEconomy(s,0);let r=E.startRoad(s,'a','b',0);
 assert.throws(()=>E.startRoad(s,'b','a',0));
 let rates=E.routeRates(s);close(rates.a,0);close(rates.b,0);
 E.completeRoads(s,r.finishTick);rates=E.routeRates(s);close(rates.a*day,30);close(rates.b*day,2.4);
 const food1=E.foodCost(r);s.villages.b.roads=1;
 E.startRoad(s,'b','a',r.finishTick);close(E.routeRates(s).a,0);assert.equal(r.from,'a');assert.equal(r.to,'b');
 E.completeRoads(s,r.finishTick);assert.equal(r.level,2);assert.ok(E.foodCost(r)<food1);
 E.startRoad(s,'a','b',r.finishTick);E.completeRoads(s,r.finishTick);assert.equal(r.level,3);
 assert.throws(()=>E.startRoad(s,'a','b',r.finishTick),/Highway/);
});
test('trade Development accrues offline, without producing or consuming physical resources',()=>{
 const s=state(village('a',{biome:'unknown',developmentValue:10000}));s.villages.b=village('b',{biome:'unknown',developmentValue:100000});
 s.roads.r={from:'a',to:'b',level:1};E.accountEconomy(s,day);
 close(s.villages.a.developmentValue,10030);close(s.villages.b.developmentValue,100002.4);assert.deepEqual(s.stock,{});
});
test('local research prerequisites, repeatable costs and Hearthstone II cap',()=>{
 const v=village('a',{hearth:0});assert.ok(E.researchRequirement(v,'biome'));assert.ok(E.researchRequirement(v,'sanctuary'));
 v.hearth=1;assert.equal(E.researchRequirement(v,'biome'),null);assert.ok(E.researchRequirement(v,'efficiency'));
 v.biomeUnlocked=true;assert.equal(E.researchRequirement(v,'efficiency'),null);
 v.hearth=2;assert.equal(E.researchCost(v,'hearth'),null);
 v.efficiency=100;assert.ok(E.researchCost(v,'efficiency'));v.sanctuary=100;assert.ok(E.researchCost(v,'sanctuary'));
 v.sanctuary=0;assert.ok(E.researchRequirement(v,'roads'));v.sanctuary=1;assert.equal(E.researchRequirement(v,'roads'),null);
});
test('food travel uses food values and refuses insufficient inventories without a mutation',()=>{
 const items=[{slot:0,typeId:'minecraft:bread',amount:1},{slot:1,typeId:'minecraft:apple',amount:2}];
 const plan=E.foodPlan(items,6);assert.ok(plan);assert.ok(plan.reduce((n,p)=>n+C.food[p.typeId]*p.count,0)>=6);
 assert.equal(E.foodPlan(items,14),null);assert.equal(items[0].amount,1);
 const exact=E.foodPlan(items,5);assert.equal(exact.reduce((n,p)=>n+C.food[p.typeId]*p.count,0),5);
});
test('Sanctuary applies only hostile-sourced damage and preserves grant level/expiry',()=>{
 close(F.sanctuaryDamage(20,2),18.05);
 const player={typeId:'minecraft:player',getDynamicProperty:()=>JSON.stringify({level:2,expires:1000})};
 const source={cause:'entityAttack',damagingEntity:{typeId:'custom:goblin'}};
 const event={hurtEntity:player,damageSource:source,damage:20};F.protectDamage(event,500);close(event.damage,18.05);
 event.damage=20;F.protectDamage(event,1001);close(event.damage,20);
 for(const source of [{cause:'fall'},{cause:'entityAttack',damagingEntity:{typeId:'minecraft:player'}},{cause:'lava',damagingEntity:{typeId:'custom:goblin'}}])assert.equal(F.hostileSource(source),false);
});
test('Hearthstone II healing respects maximum HP and one heal per villager per Minecraft day',()=>{
 const props=new Map();let hp=19;
 const entity={typeId:'minecraft:villager_v2',getDynamicProperty:k=>props.get(k),setDynamicProperty:(k,v)=>props.set(k,v),getComponent:()=>({currentValue:hp,effectiveMax:20,setCurrentValue:v=>hp=v})};
 assert.equal(F.healVillager(entity,5),true);assert.equal(hp,20);hp=15;
 assert.equal(F.healVillager(entity,5),false);assert.equal(hp,15);
 assert.equal(F.healVillager(entity,6),true);assert.equal(hp,17);
});

test('food spending is atomic across failed teleport and preserves item metadata',()=>{
 const original={typeId:'minecraft:bread',amount:3,nameTag:'Packed lunch'};
 let stack=structuredClone(original);
 const inventory={getItem:()=>stack?structuredClone(stack):undefined,setItem:(slot,item)=>stack=item?structuredClone(item):undefined};
 const plan=E.foodPlan([{slot:0,...original}],6);
 assert.throws(()=>E.spendFoodAndTravel(inventory,plan,()=>{throw Error('destination unavailable');}),/destination/);
 assert.deepEqual(stack,original);
 let travelled=false;E.spendFoodAndTravel(inventory,plan,()=>travelled=true);
 assert.equal(travelled,true);assert.equal(stack.amount,1);assert.equal(stack.nameTag,'Packed lunch');
});
test('Sanctuary retains its source strength for three minutes outside the settlement',()=>{
 const props=new Map();const p={dimension:{id:'minecraft:overworld'},location:{x:0,y:64,z:0},setDynamicProperty:(k,v)=>props.set(k,v),addEffect(){}};
 const source=village('a',{sanctuary:3});F.refreshProtection(p,{a:source},100);
 const grant=JSON.parse(props.get('jagsby_frontier:sanctuary'));assert.equal(grant.level,3);assert.equal(grant.source,'a');assert.equal(grant.expires,180100);
 p.location.x=1000;source.sanctuary=8;F.refreshProtection(p,{a:source},1000);
 assert.equal(JSON.parse(props.get('jagsby_frontier:sanctuary')).level,3);
 assert.ok(F.sanctuaryDamage(20,100000)>0);
});
test('route feedback and production remain consistent when a catch-up crosses partner Development thresholds',()=>{
 const s=state(village('a',{developmentValue:499.5}));s.villages.b=village('b',{developmentValue:999.5});s.roads.r={from:'a',to:'b',level:3};
 const once=structuredClone(s),frequent=structuredClone(s);E.accountEconomy(once,10*day);
 for(let t=hour;t<=10*day;t+=hour)E.accountEconomy(frequent,t);
 for(const id of ['a','b'])close(once.villages[id].developmentValue,frequent.villages[id].developmentValue,1e-5);
 for(const id of Object.keys(once.stock))close(once.stock[id],frequent.stock[id],1e-5);
});
