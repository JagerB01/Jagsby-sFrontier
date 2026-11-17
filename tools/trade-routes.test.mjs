import assert from 'node:assert/strict';
import test from 'node:test';
import * as E from '../packs/behavior/scripts/settlement-economy.js';
import {tradeRouteSummary} from '../packs/behavior/scripts/settlement-overview.js';
import {directoryRoadState} from '../packs/behavior/scripts/settlement-realm.js';

const DAY=86400000;
const village=(id,x=0)=>({id,name:id.toUpperCase(),dimension:'minecraft:overworld',location:{x,y:64,z:0},roads:3,biome:'unknown',developmentValue:0});
const fresh=()=>({villages:{a:village('a'),b:village('b',1000),c:village('c',2000),d:village('d',3000)},roads:{},stock:{},global:{},economyAt:0});
const reload=s=>JSON.parse(JSON.stringify(s));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function completed(s,from,to,tick=0){const r=E.startRoad(s,from,to,tick);E.completeRoads(s,r.finishTick);return r;}

test('each departure sends one selected route; other departures and incoming routes stay independent',()=>{
 const s=fresh();const ab=completed(s,'a','b'),ac=completed(s,'a','c'),db=completed(s,'d','b');
 assert.deepEqual(s.tradeRoutes,{a:ac.id,d:db.id});
 let rates=E.routeRates(s);for(const [id,daily]of Object.entries({a:10,b:2,c:2,d:10}))close(rates[id]*DAY,daily);
 E.selectTradeRoute(s,'a',ab.id,400000);rates=E.routeRates(s);
 for(const [id,daily]of Object.entries({a:10,b:4,c:0,d:10}))close(rates[id]*DAY,daily);
 assert.equal(s.tradeRoutes.d,db.id);assert.equal(tradeRouteSummary(s,s.villages.a),'B');
 assert.equal(E.travelQuote(ac,s.villages.a).canTravel,true);
 E.selectTradeRoute(s,'a',null,400001);assert.equal(tradeRouteSummary(s,s.villages.a),'None');close(E.routeRates(s).d*DAY,10);
});

test('selecting a shared completed road from the other end uses that departure for sender rewards',()=>{
 const s=fresh(),ab=completed(s,'a','b');s.villages.a.developmentValue=2000;s.villages.b.developmentValue=10000;
 E.selectTradeRoute(s,'a',null,150000);E.selectTradeRoute(s,'b',ab.id,150000);
 close(E.routeRates(s).b*DAY,12);close(E.routeRates(s).a*DAY,4);
 E.selectTradeRoute(s,'a',ab.id,150001);
 close(E.routeRates(s).a*DAY,24);close(E.routeRates(s).b*DAY,14.4);
 assert.equal(Object.keys(s.roads).length,1);
});

test('changing route freezes exact progress through serialization and resumes only remaining ticks',()=>{
 let s=fresh();let ab=E.startRoad(s,'a','b',100);
 const ac=E.startRoad(s,'a','c',24100);assert.equal(ab.paused,true);assert.equal(ab.remainingTicks,120000);assert.equal(ab.finishTick,undefined);
 const db=E.startRoad(s,'d','b',24100);assert.equal(db.paused,undefined);assert.equal(ac.paused,undefined);
 s=reload(s);ab=s.roads[ab.id];E.completeRoads(s,1000000);
 assert.equal(ab.level,0);assert.equal(ab.remainingTicks,120000);assert.equal(s.roads[ac.id].level,1);assert.equal(s.roads[db.id].level,1);
 E.startRoad(s,'a','b',1000000);assert.equal(ab.finishTick,1120000);assert.equal(ab.paused,undefined);
 E.completeRoads(s,1119999);assert.equal(ab.level,0);E.completeRoads(s,1120000);assert.equal(ab.level,1);assert.equal(ab.targetLevel,undefined);
 assert.equal(Object.keys(s.roads).length,3);
});

test('stop sending freezes construction; repeated resume/select does not reset the stage',()=>{
 const s=fresh(),ab=E.startRoad(s,'a','b',0);
 E.selectTradeRoute(s,'a',null,40000);assert.equal(E.roadTicksRemaining(ab,900000),104000);
 E.selectTradeRoute(s,'a',ab.id,100000);assert.equal(ab.finishTick,204000);
 E.startRoad(s,'a','b',110000);E.selectTradeRoute(s,'a',ab.id,120000);assert.equal(ab.finishTick,204000);
 E.selectTradeRoute(s,'a',null,130000);assert.equal(ab.remainingTicks,74000);
 E.selectTradeRoute(s,'a',ab.id,200000);assert.equal(ab.finishTick,274000);
});

test('choosing a completed connection pauses an upgrade, retaining tier and food travel',()=>{
 const s=fresh(),ab=completed(s,'a','b'),ac=completed(s,'a','c');
 E.startRoad(s,'a','b',300000);E.selectTradeRoute(s,'a',ac.id,324000);
 assert.equal(ab.targetLevel,2);assert.equal(ab.level,1);assert.equal(ab.remainingTicks,120000);
 assert.equal(E.travelQuote(ab,s.villages.a).canTravel,true);
 assert.equal(directoryRoadState(s.villages.a,s.villages.b,s.roads).status,'Paused');
 close(E.routeRates(s).a*DAY,10);
 E.startRoad(s,'a','b',800000);E.completeRoads(s,920000);assert.equal(ab.level,2);assert.equal(ab.targetLevel,undefined);
});

test('a shared construction cannot be taken over; other departures can build independently',()=>{
 const s=fresh(),ab=E.startRoad(s,'a','b',0),bc=E.startRoad(s,'b','c',100);
 assert.throws(()=>E.startRoad(s,'b','a',1000),/other settlement/);
 assert.equal(bc.paused,undefined);assert.equal(ab.paused,undefined);
 E.selectTradeRoute(s,'b',ab.id,1000);assert.equal(bc.paused,true);assert.equal(ab.constructionFrom,'a');
 E.startRoad(s,'a','c',2000);assert.equal(ab.paused,true);
 E.completeRoads(s,500000);assert.equal(ab.level,0);assert.equal(bc.level,0);
});

test('invalid route changes leave the current route and construction untouched',()=>{
 const s=fresh(),ab=E.startRoad(s,'a','b',0);s.villages.d.dimension='minecraft:nether';
 const snapshot=JSON.stringify(s);
 for(const run of [()=>E.selectTradeRoute(s,'a','missing',10),()=>E.startRoad(s,'a','a',10),()=>E.startRoad(s,'a','d',10)])assert.throws(run);
 assert.equal(JSON.stringify(s),snapshot);assert.equal(ab.paused,undefined);
});

test('legacy migration retains every road and chooses one unfinished route per original departure deterministically',()=>{
 const s=fresh();s.roads={
  ready:{from:'a',to:'d',level:3,distance:3000},
  later:{from:'a',to:'c',level:0,targetLevel:1,startedTick:2000},
  first:{from:'a',to:'b',level:1,targetLevel:2,startedTick:1000},
  separate:{from:'d',to:'b',level:1},
 };
 E.normalizeRoadTimers(s,25000);
 assert.deepEqual(s.tradeRoutes,{a:'first',d:'separate'});assert.equal(s.roads.first.finishTick,145000);
 assert.equal(s.roads.later.remainingTicks,121000);assert.equal(s.roads.later.paused,true);
 assert.equal(s.roads.ready.level,3);assert.equal(Object.keys(s.roads).length,4);
 const after=JSON.stringify(s);E.normalizeRoadTimers(s,25000);assert.equal(JSON.stringify(s),after);
 const loaded=reload(s);E.normalizeRoadTimers(loaded,90000);assert.equal(loaded.roads.later.remainingTicks,121000);
});

test('legacy offline income settles before applying the one-route migration; future income uses the selection',()=>{
 const s=fresh();s.roads={ab:{from:'a',to:'b',level:1},ac:{from:'a',to:'c',level:1}};
 E.accountEconomy(s,DAY);close(s.villages.a.developmentValue,20);close(s.villages.b.developmentValue,2);close(s.villages.c.developmentValue,2);
 E.normalizeRoadTimers(s,0);E.accountEconomy(s,2*DAY);
 close(s.villages.a.developmentValue,30);close(s.villages.b.developmentValue,4);close(s.villages.c.developmentValue,2);
});

test('deleted endpoints discard stale outgoing selections and future trade schemas are rejected',()=>{
 const s=fresh(),ab=E.startRoad(s,'a','b',0);delete s.villages.b;
 E.normalizeRoadTimers(s,100);assert.deepEqual(s.tradeRoutes,{});assert.equal(ab.paused,true);
 const snapshot=JSON.stringify(s);s.tradeRouteVersion=2;
 assert.throws(()=>E.accountEconomy(s,DAY),/newer/);assert.throws(()=>E.selectedTradeRoutes(s),/newer/);
 s.tradeRouteVersion=1;assert.equal(JSON.stringify(s),snapshot);
});

test('legacy noncanonical road IDs are reused on upgrade and never duplicate infrastructure',()=>{
 const s=fresh();s.roads.legacy={from:'a',to:'b',level:1,distance:1000};
 const r=E.startRoad(s,'b','a',100);assert.equal(r.id,'legacy');assert.equal(r.from,'a');assert.equal(r.constructionFrom,'b');
 assert.deepEqual(s.tradeRoutes,{a:'legacy',b:'legacy'});assert.equal(Object.keys(s.roads).length,1);
});
