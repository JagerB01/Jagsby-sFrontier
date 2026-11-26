import {migrateResearch} from '../packs/behavior/scripts/global-research.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import * as E from '../packs/behavior/scripts/settlement-economy.js';
import * as F from '../packs/behavior/scripts/settlement-effects.js';
import {ECONOMY_CONFIG as C} from '../packs/behavior/scripts/economy-config.js';
import {withPoiArrival} from '../packs/behavior/scripts/provincial-travel.js';
const hour=3600000,day=24*hour;
function village(id='a',extra={}){return {id,dimension:'minecraft:overworld',location:{x:0,y:64,z:0},biome:'minecraft:plains',census:{realmPowerTenths:100},efficiency:0,hearth:1,biomeUnlocked:false,...extra};}
function state(v=village()){return migrateResearch({productionVersion:2,developmentVersion:2,villages:{[v.id]:v},global:{storage:20},stock:{},economyAt:0,roads:{}});}
function close(a,b,tolerance=1e-6){assert.ok(Math.abs(a-b)<tolerance,`${a} differs from ${b}`);}
test('specified hourly formula, fractional catch-up and shutdown/restart accounting',()=>{
 const s=state(village('a',{efficiency:5,developmentValue:10000}));
 E.accountEconomy(s,hour);
 close(s.stock['minecraft:wheat'],2.40625);
 const loaded=JSON.parse(JSON.stringify(s));E.accountEconomy(loaded,2*hour);
 close(loaded.stock['minecraft:wheat'],4.8125);
 E.accountEconomy(loaded,2*hour);close(loaded.stock['minecraft:wheat'],4.8125);
 assert.equal(E.development(loaded.villages.a),100);
 const small=state();E.accountEconomy(small,hour/10);close(small.stock['minecraft:wheat'],0.175);
});
test('RP changes apply only after accounting the old census; no loaded-world API is needed',()=>{
 const s=state();E.accountEconomy(s,hour);s.villages.a.census.realmPowerTenths=200;
 E.accountEconomy(s,2*hour);close(s.stock['minecraft:wheat'],5.25);
});
test('Development threshold integration is independent of access frequency',()=>{
 const initial=state(village('a',{developmentValue:99.9,efficiency:20}));
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
 E.accountEconomy(s,2*day+hour);close(s.stock['minecraft:wheat'],1.75);
 assert.ok(s.villages.a.developmentValue>value);
});
test('two allocations expose exactly their own resource and sum identical items',()=>{
 const v=village('a',{biomeUnlocked:true,secondary:'minecraft:forest'});
 const rates=E.resourceRates(v);assert.equal(rates.length,2);
 close(rates.find(r=>r.id==='minecraft:oak_log').rate,0.75);
 v.secondary='minecraft:sunflower_plains';close(E.resourceRates(v)[0].rate,3.5);
 v.biomeUnlocked=false;assert.equal(E.resourcesFor(v).length,1);
});
test('resource category values, permanent lifetime totals, and save migration',()=>{
 assert.deepEqual(Object.values(C.categories).map(c=>[c.rate,c.value]),[[0.35,1],[0.15,2],[0.05,5],[0.01,10]]);
 const s=state();E.accountEconomy(s,hour);
 close(s.villages.a.developmentValue,1.75);
 close(s.villages.a.lifetimeProduced['minecraft:wheat'],1.75);
 const value=s.villages.a.developmentValue;s.stock={};E.accountEconomy(s,hour);close(s.villages.a.developmentValue,value);
 const legacy={villages:{a:village('a',{efficiency:4})},global:{storage:0},stock:{'minecraft:wheat':7},lastTick:0};
 E.accountEconomy(legacy,100*day);assert.equal(legacy.stock['minecraft:wheat'],7);assert.equal(legacy.villages.a.efficiency,4);
});
test('roads preserve initiator, reject duplicates, cap upgrades, and reward both endpoints independently',()=>{
 const s=state(village('a',{roads:1,developmentValue:2000}));s.villages.b=village('b',{location:{x:1000,y:64,z:0},developmentValue:20000});
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
 const s=state(village('a',{biome:'unknown',developmentValue:2000}));s.villages.b=village('b',{biome:'unknown',developmentValue:20000});
 s.roads.r={from:'a',to:'b',level:1};E.accountEconomy(s,day);
 close(s.villages.a.developmentValue,2030);close(s.villages.b.developmentValue,20002.4);assert.deepEqual(s.stock,{});
});
test('local research prerequisites, repeatable costs and Hearthstone II cap',()=>{
 const v=village('a',{hearth:0});assert.ok(E.researchRequirement(v,'biome'));assert.ok(E.researchRequirement(v,'sanctuary'));
 v.hearth=1;assert.equal(E.researchRequirement(v,'biome'),null);assert.ok(E.researchRequirement(v,'efficiency'));
 v.biomeUnlocked=true;assert.equal(E.researchRequirement(v,'efficiency'),null);
 v.hearth=2;assert.equal(E.researchCost(v,'hearth'),null);
 v.efficiency=100;assert.ok(E.researchCost(v,'efficiency'));v.sanctuary=100;assert.ok(E.researchCost(v,'sanctuary'));
 v.sanctuary=0;assert.ok(E.researchRequirement(v,'roads'));v.sanctuary=1;assert.equal(E.researchRequirement(v,'roads'),null);
});
test('Travel pays from the leftmost hotbar food first and uses backpack food if needed',()=>{
 const items=[{slot:9,typeId:'minecraft:dried_kelp',amount:2},{slot:8,typeId:'minecraft:apple',amount:2},
  {slot:2,typeId:'minecraft:bread',amount:1},{slot:0,typeId:'minecraft:paper',amount:1}];
 const before=structuredClone(items);
 const paidSlots=cost=>E.foodPlan(items,cost)?.map(({slot,count})=>[slot,count]);
 assert.deepEqual(paidSlots(4),[[2,1]],'A later exact match must not override hotbar order');
 assert.deepEqual(paidSlots(9),[[2,1],[8,1]]);
 assert.deepEqual(paidSlots(14),[[2,1],[8,2],[9,1]]);
 assert.equal(E.foodPlan(items,16),null);
 assert.deepEqual(items,before);
});
test('Travel skips raw meat, raw fish and excluded special foods',()=>{
 const excluded=['beef','porkchop','chicken','mutton','rabbit','cod','salmon','tropical_fish','pufferfish',
  'spider_eye','poisonous_potato','rotten_flesh','enchanted_golden_apple'];
 const items=excluded.map((id,slot)=>({slot,typeId:'minecraft:'+id,amount:64}));
 assert.equal(E.foodPlan(items,2),null);
 const potatoes={slot:0,typeId:'minecraft:potato',amount:64};
 assert.deepEqual(E.foodPlan([potatoes],2),[{...potatoes,count:2}]);
 const pie={slot:items.length,typeId:'minecraft:pumpkin_pie',amount:64};
 assert.deepEqual(E.foodPlan([...items,pie],10),[{...pie,count:2}]);
});
test('Sanctuary applies only hostile-sourced damage and preserves grant level/expiry',()=>{
 close(F.sanctuaryDamage(20,2),18.05);
 const player={typeId:'minecraft:player',getDynamicProperty:()=>JSON.stringify({level:2,expires:1000})};
 const source={cause:'entityAttack',damagingEntity:{typeId:'custom:goblin'}};
 const event={hurtEntity:player,damageSource:source,damage:20};F.protectDamage(event,500);close(event.damage,18.05);
 event.damage=20;F.protectDamage(event,1001);close(event.damage,20);
 for(const source of [{cause:'fall'},{cause:'entityAttack',damagingEntity:{typeId:'minecraft:player'}},{cause:'lava',damagingEntity:{typeId:'custom:goblin'}}])assert.equal(F.hostileSource(source),false);
});
test('Hearthstone I healing respects maximum HP and one heal per villager per Minecraft day',()=>{
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

test('POI travel temporarily loads distant terrain and releases it after success or failure',async()=>{
 let loaded=false;
 const calls=[];
 const dimension={
  id:'minecraft:overworld',heightRange:{max:320},
  isChunkLoaded:()=>loaded,
  getTopmostBlock:({x,z})=>({
   typeId:x===1500&&z===500?'minecraft:lava':'minecraft:stone',
   isLiquidBlocking:()=>true,location:{y:63},
  }),
  getBlock:()=>({isAir:true}),
 };
 const world={tickingAreaManager:{
  async createTickingArea(id,options){
   calls.push(['load',id,options]);loaded=true;
  },
  removeTickingArea(id){calls.push(['remove',id]);loaded=false;},
 }};
 const poi={x:1500,y:25,z:500};
 const landed=await withPoiArrival(world,dimension,poi,position=>{
  assert.equal(loaded,true);
  return position;
 });
 assert.deepEqual(landed,{x:1499.5,y:64,z:500.5});
 assert.equal(calls[0][2].dimension,dimension);
 assert.deepEqual(calls[1],['remove',calls[0][1]]);
 await assert.rejects(withPoiArrival(world,dimension,poi,()=>{throw Error('Teleport failed');}),/Teleport failed/);
 assert.deepEqual(calls[3],['remove',calls[2][1]]);
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
 const s=state(village('a',{developmentValue:99.5}));s.villages.b=village('b',{developmentValue:199.5});s.roads.r={from:'a',to:'b',level:3};
 const once=structuredClone(s),frequent=structuredClone(s);E.accountEconomy(once,10*day);
 for(let t=hour;t<=10*day;t+=hour)E.accountEconomy(frequent,t);
 for(const id of ['a','b'])close(once.villages[id].developmentValue,frequent.villages[id].developmentValue,1e-5);
 for(const id of Object.keys(once.stock))close(once.stock[id],frequent.stock[id],1e-5);
});

test('Overview hourly Development estimate includes base category value and trade income, excluding Colonization bonus',()=>{
 const s=state(),v=s.villages.a;
 close(E.developmentHourlyRate(s,v),0.0175);
 s.global.colonization=5;v.location.x=28000;close(E.developmentHourlyRate(s,v),0.0175);
 s.villages.b=village('b',{developmentValue:2000});s.roads.ab={from:'a',to:'b',level:1};
 close(E.developmentHourlyRate(s,v),0.0225);
 const before=JSON.stringify(s);E.developmentHourlyRate(s,v);assert.equal(JSON.stringify(s),before);
});
test('Overview hourly Development estimate blocks full-storage production while preserving active route income',()=>{
 const s=state(),v=s.villages.a;s.stock['minecraft:wheat']=E.capacity(s);
 close(E.developmentHourlyRate(s,v),0);
 s.villages.b=village('b',{developmentValue:2000});s.roads.ab={from:'a',to:'b',level:1};
 close(E.developmentHourlyRate(s,v),0.005);
 s.roads.ab.targetLevel=2;close(E.developmentHourlyRate(s,v),0);
});
test('Hearthstone II refreshes Regeneration I within 80 horizontal blocks',()=>{
 const grants=[],p={dimension:{id:'minecraft:overworld'},location:{x:80,y:200,z:0},addEffect:(...args)=>grants.push(args)};
 const v=village('a',{hearth:1,sanctuary:0});F.refreshProtection(p,{a:v});
 assert.equal(grants.length,0);
 v.hearth=2;F.refreshProtection(p,{a:v});
 assert.deepEqual(grants,[['regeneration',3600,{amplifier:0,showParticles:false}]]);
 p.location.x=80.01;F.refreshProtection(p,{a:v});assert.equal(grants.length,1);
});
test('Development now awards a point every 100 value and converts hourly production at that threshold',()=>{
 assert.equal(C.developmentThreshold,100);
 for(const [value,points]of [[0,0],[99.99,0],[100,1],[199.99,1],[200,2],[750.125,7]])assert.equal(E.development(village('a',{developmentValue:value})),points);
 const s=state();close(E.developmentHourlyRate(s,s.villages.a),1.75/100);
});
test('Upgrade settles old 500-value backlog before adopting 100, including interrupted catch-up',()=>{
 const make=()=>migrateResearch({productionVersion:2,villages:{a:village('a',{developmentValue:499.9})},global:{storage:20},stock:{'minecraft:diamond':0.125},roads:{},economyAt:0,custom:'retained'});
 const once=make(),partial=make();E.accountEconomy(once,hour);
 let result=E.accountEconomy(partial,hour,1);
 assert.equal(result.complete,false);assert.equal(partial.developmentVersion,undefined);
 assert.equal(partial.villages.a.developmentThreshold,500);close(partial.villages.a.developmentValue,500);
 const reloaded=JSON.parse(JSON.stringify(partial));
 while(!result.complete)result=E.accountEconomy(reloaded,hour,1);
 for(const s of [once,reloaded]){
  close(s.stock['minecraft:wheat'],1.75165);close(s.villages.a.developmentValue,501.65165);
  assert.equal(s.developmentVersion,2);assert.equal(s.villages.a.developmentThreshold,100);assert.equal(E.development(s.villages.a),5);
  assert.equal(s.stock['minecraft:diamond'],0.125);assert.equal(s.custom,'retained');
 }
 close(once.stock['minecraft:wheat'],reloaded.stock['minecraft:wheat']);
 const saved=JSON.stringify(once);E.accountEconomy(once,hour);assert.equal(JSON.stringify(once),saved);
 E.accountEconomy(once,2*hour);close(once.stock['minecraft:wheat'],3.5104);close(once.villages.a.developmentValue,503.4104);
});
test('Unknown newer Development schemas are rejected without changing the save',()=>{
 const s=state();s.developmentVersion=3;const saved=JSON.stringify(s);
 assert.throws(()=>E.accountEconomy(s,hour),/Development save is newer/);assert.equal(JSON.stringify(s),saved);
});

test('every road construction stage lasts six Minecraft days at any distance and survives reload',()=>{
 for(const distance of [10,1551,100000]){
  let s=state(village('a',{roads:3}));s.villages.b=village('b',{location:{x:distance,y:64,z:0}});E.migrateEconomy(s,0);
  let tick=100;
  for(let level=1;level<=3;level++){
   const road=E.startRoad(s,'a','b',tick);
   assert.equal(road.durationTicks,144000);assert.equal(road.finishTick,tick+6*24000);
   s=JSON.parse(JSON.stringify(s));const saved=s.roads[road.id];
   E.completeRoads(s,tick+144000-1);assert.equal(saved.level,level-1);assert.equal(saved.targetLevel,level);
   assert.equal(E.travelQuote(saved,s.villages.a).canTravel,level>1);
   E.completeRoads(s,tick+144000);assert.equal(saved.level,level);assert.equal(saved.targetLevel,undefined);
   assert.equal(E.travelQuote(saved,s.villages.a).canTravel,true);tick+=144000;
  }
 }
});

test('pending trial timers migrate from their original start; completed roads are preserved',()=>{
 const s={villages:{a:village('a'),b:village('b')},roads:{pending:{from:'a',to:'b',level:1,targetLevel:2,startedTick:100,durationTicks:1200,finishTick:1300},done:{level:3,durationTicks:1200,finishTick:1300}}};
 E.completeRoads(s,1300);assert.equal(s.roads.pending.level,1);assert.equal(s.roads.pending.finishTick,144100);
 E.normalizeRoadTimers(s,5000);assert.equal(s.roads.pending.finishTick,144100);
 assert.equal(s.roads.done.level,3);assert.equal(s.roads.done.finishTick,1300);
 E.completeRoads(s,144100);assert.equal(s.roads.pending.level,2);
});

test('travel efficiency belongs to the departure village and cannot exceed the completed road tier',()=>{
 const road={level:3,distance:1551};
 assert.equal(E.travelQuote(road,{roads:0}).canTravel,false);
 for(const [roads,points] of [[1,32],[2,22],[3,14]]){
  const quote=E.travelQuote(road,{roads});assert.equal(quote.effectiveLevel,roads);assert.equal(quote.foodPoints,points);
 }
 assert.equal(E.travelQuote({level:1,distance:1551},{roads:3}).foodPoints,32);
 assert.equal(E.foodCost({level:1,distance:50}),2);
 for(const [level,points] of [[1,20],[2,14],[3,9]])assert.equal(E.foodCost({level,distance:1000}),points);
 assert.equal(E.corndogCost(16),'8 corndogs');assert.equal(E.corndogCost(5),'2.5 corndogs');
 const plan=E.foodPlan([{slot:0,typeId:'minecraft:bread',amount:4}],16);
 assert.equal(plan[0].count,4); // Four whole bread pay ten corndogs for an eight-corndog quote.
});

test('Lower stockpile limits preserve over-cap saves and pause production until collection frees space',()=>{
 let s=state();s.global.storage=0;s.stock={'minecraft:wheat':500.5,'minecraft:stone':20.25};
 const stock=JSON.stringify(s.stock),value=s.villages.a.developmentValue||0;
 E.accountEconomy(s,day);assert.equal(JSON.stringify(s.stock),stock);assert.equal(s.villages.a.developmentValue,value);
 s=JSON.parse(JSON.stringify(s));E.accountEconomy(s,2*day);
 assert.equal(JSON.stringify(s.stock),stock);assert.equal(s.villages.a.developmentValue,value);
 // Collection frees capacity after the blocked interval has been accounted.
 s.stock={'minecraft:wheat':0.5,'minecraft:stone':0.25};
 E.accountEconomy(s,2*day+hour);close(E.stockTotal(s),2.5);close(s.villages.a.developmentValue-value,1.75);
});

test('Upgrade discounts apply only at completion; pending travel uses the last completed tier',()=>{
 const s=state(village('a',{roads:3}));s.villages.b=village('b',{location:{x:1551,y:64,z:0}});
 const road={id:'r',from:'a',to:'b',level:1,distance:1551,targetLevel:2,startedTick:0,durationTicks:144000,finishTick:144000,timingVersion:1};s.roads.r=road;
 assert.equal(E.travelQuote(road,s.villages.a).canTravel,true);assert.equal(E.travelQuote(road,s.villages.a).foodPoints,32);
 E.completeRoads(s,143999);assert.equal(E.travelQuote(road,s.villages.a).foodPoints,32);
 E.completeRoads(s,144000);assert.equal(E.travelQuote(road,s.villages.a).foodPoints,22);
 assert.equal(E.travelQuote(road,{roads:1}).foodPoints,32,'Local tech still limits usable efficiency');
 road.targetLevel=3;road.startedTick=144000;road.finishTick=288000;
 E.completeRoads(s,287999);assert.equal(E.travelQuote(road,s.villages.a).foodPoints,22);
 E.completeRoads(s,288000);assert.equal(E.travelQuote(road,s.villages.a).foodPoints,14);
});
