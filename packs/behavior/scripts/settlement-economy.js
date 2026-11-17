import {ECONOMY_CONFIG as C} from './economy-config.js';
import {migrateResearch,storageCapacity,localLevel,colonizationBonus,zoneAt} from './global-research.js';
import {migrateLocalResearch,localResearchLevel,localResearchCost,localResearchRequirement} from './local-research.js';
import {productionAllocations,riverCropBonus,migrateProduction} from './biome-resources.js';
import {LEGACY_RESOURCES} from './legacy-production.js';
const HOUR=3600000,DAY=86400000,EPS=1e-8;
export function developmentThreshold(v){return v.developmentThreshold??C.developmentThreshold;}
export function development(v){return Math.floor(Math.max(0,v.developmentValue||0)/developmentThreshold(v)+1e-10);}
export function migrateDevelopment(s){
 for(const v of Object.values(s.villages))v.developmentThreshold=C.developmentThreshold;
 s.developmentVersion=2;
 return s;
}
export function capacity(s,legacy=false){return legacy?C.baseCapacity*2**Math.max(0,s.global?.storage||0):storageCapacity(s);}
export function stockTotal(s){return Object.values(s.stock||{}).reduce((a,n)=>a+n,0);}
export function migrateEconomy(s,now=Date.now()){
 s.stock??={};s.roads??={};s.global??={};s.villages??={};
 if(!Number.isFinite(s.economyAt)){s.economyAt=now;s.economyVersion=1;}
 for(const v of Object.values(s.villages)){
  v.developmentThreshold??=s.developmentVersion===2?C.developmentThreshold:500;
  v.developmentValue=Math.max(0,v.developmentValue||0);v.lifetimeProduced??={};
  v.sanctuary??=0;v.roads??=0;v.efficiency??=0;v.hearth??=0;
 }
 return s;
}
export function resourcesFor(v){return [...new Map(productionAllocations(v).map(a=>[a.id,a])).values()];}
function legacyResources(v){
 const result=new Map();
 for(const biome of [v.biome,...(v.biomeUnlocked&&v.secondary?[v.secondary]:[])])
  for(const r of LEGACY_RESOURCES[biome]||[])result.set(r.id,r);
 return [...result.values()];
}
export function recordedPower(v){
 if(Number.isFinite(v.productionPower))return Math.max(0,v.productionPower);
 const c=v.census;
 if(!c||c.error)return 0;
 const n=Number.isFinite(c.realmPowerTenths)?c.realmPowerTenths:c.minimumPowerTenths;
 return Math.max(0,Number.isFinite(n)?n/10:0);
}
export function resourceRates(v,s=null,legacy=false,oldProduction=false){
 const prosperity=!legacy&&s?localLevel(s,v,'efficiency'):(v.efficiency||0);
 const factor=recordedPower(v)*(1+C.prosperityBonus*prosperity)*(1+C.developmentBonus*development(v));
 if(oldProduction)return legacyResources(v).map(r=>({...r,rate:C.categories[r.category].rate*factor}));
 const result=new Map(),river=riverCropBonus(v);
 for(const allocation of productionAllocations(v)){
  const raw=C.categories[allocation.category].rate*0.5*factor;
  const rate=raw*(allocation.crop?1+river:1);
  const entry=result.get(allocation.id)||{...allocation,rate:0,riverBonus:0,allocations:[]};
  entry.rate+=rate;entry.riverBonus+=rate-raw;
  entry.allocations.push({...allocation,rate});result.set(allocation.id,entry);
 }
 return [...result.values()];
}
// Roads are shared infrastructure. Trade selections are directional: one
// outgoing connection per departure settlement, with any number of incoming.
export function selectedTradeRoutes(s){
 if((s.tradeRouteVersion||0)>1)throw Error('Trade route save is newer than this addon');
 const roads=s.roads||{},villages=s.villages||{};
 const valid=(from,id)=>{const r=roads[id];return r&&villages[from]&&[r.from,r.to].includes(from)&&villages[r.from]&&villages[r.to]&&villages[r.from].dimension===villages[r.to].dimension;};
 if(s.tradeRouteVersion===1)return Object.fromEntries(Object.entries(s.tradeRoutes||{}).filter(([from,id])=>valid(from,id)));
 const result={};
 const entries=Object.entries(roads).sort(([ai,a],[bi,b])=>Number(!a.targetLevel)-Number(!b.targetLevel)||(a.startedTick||0)-(b.startedTick||0)||ai.localeCompare(bi));
 for(const [id,r]of entries)if((r.level||r.targetLevel)&&!Object.hasOwn(result,r.from)&&valid(r.from,id))result[r.from]=id;
 return result;
}
export function routeRates(s,legacyAll=false){
 const result=Object.fromEntries(Object.keys(s.villages).map(k=>[k,0]));
 const routes=legacyAll?Object.entries(s.roads||{}).filter(([,r])=>s.villages[r.from]&&s.villages[r.to]).map(([id,r])=>[r.from,id]):Object.entries(selectedTradeRoutes(s));
 for(const [from,id]of routes){
  const road=s.roads[id],to=road.from===from?road.to:road.from;
  if(!road.level||road.targetLevel)continue;
  result[from]+=10*road.level*(1+development(s.villages[to])/100)/DAY;
  result[to]+=2*road.level*(1+development(s.villages[from])/100)/DAY;
 }
 return result;
}
// Snapshot estimate in Development POINTS per real-world hour. Bonus output
// earns no Development; full physical storage blocks only production income.
export function developmentHourlyRate(s,v){
 const baseValue=capacity(s)-stockTotal(s)>EPS
  ?resourceRates(v,s).reduce((sum,r)=>sum+r.rate*C.categories[r.category].value,0):0;
 const tradeValue=(routeRates(s)[v.id]||0)*HOUR;
 return (baseValue+tradeValue)/developmentThreshold(v);
}
// Exact piecewise-constant integration: stop at every Development threshold
// and shared-capacity boundary, then recompute all rates simultaneously.
export function accountEconomy(s,now=Date.now(),maxEvents=10000){
 if(s.developmentVersion>2)throw Error('Development save is newer than this addon');
 if((s.tradeRouteVersion||0)>1)throw Error('Trade route save is newer than this addon');
 if(s.productionVersion>2)throw Error('Production save is newer than this addon');
 if(s.researchVersion>3)throw Error('Research save version is newer than this addon');
 migrateEconomy(s,now);let t=s.economyAt,events=0;
 // Finish the prior economy under its prior effects before switching schemas.
 const legacy=s.researchVersion!==3,oldProduction=s.productionVersion!==2;
 if(now<=t){migrateResearch(s);for(const v of Object.values(s.villages))migrateLocalResearch(v,s);migrateProduction(s);migrateDevelopment(s);return {complete:true,events};}
 const entries=Object.entries(s.villages).sort(([a],[b])=>a.localeCompare(b));
 while(t<now&&events++<maxEvents){
  const free=Math.max(0,capacity(s,legacy)-stockTotal(s)),producing=free>EPS;
  const routes=routeRates(s,s.tradeRouteVersion!==1),rates={},devRates={};let totalRate=0;
  for(const [id,v]of entries){
   const bonus=legacy?0:colonizationBonus(s,zoneAt(v.location));
   rates[id]=producing?resourceRates(v,s,legacy,oldProduction).map(r=>({...r,basePerMs:r.rate/HOUR,perMs:r.rate*(1+bonus)/HOUR})):[];
   devRates[id]=routes[id]||0;
   for(const r of rates[id]){totalRate+=r.perMs;devRates[id]+=r.basePerMs*C.categories[r.category].value;}
  }
  let dt=now-t;
  if(totalRate>0)dt=Math.min(dt,free/totalRate);
  for(const [id,v]of entries)if(devRates[id]>0){
   const remaining=(development(v)+1)*developmentThreshold(v)-v.developmentValue;
   dt=Math.min(dt,Math.max(remaining,EPS)/devRates[id]);
  }
  if(!(dt>0)||!Number.isFinite(dt))throw Error('Invalid economy accounting interval');
  for(const [id,v]of entries){
   for(const r of rates[id]){
    const amount=r.perMs*dt;s.stock[r.id]=(s.stock[r.id]||0)+amount;
    const base=r.basePerMs*dt,bonus=amount-base;
    v.lifetimeProduced[r.id]=(v.lifetimeProduced[r.id]||0)+amount;
    v.lifetimeBaseProduced??={};v.lifetimeBonusProduced??={};
    v.lifetimeBaseProduced[r.id]=(v.lifetimeBaseProduced[r.id]||0)+base;
    v.lifetimeBonusProduced[r.id]=(v.lifetimeBonusProduced[r.id]||0)+bonus;
   }
   v.developmentValue+=devRates[id]*dt;
  }
  t=Math.min(now,t+dt);
  // Floating point timestamps may stop advancing below one ULP.
  if(now-t<0.001)t=now;
 }
 s.economyAt=t;
 if(t>=now){migrateResearch(s);for(const v of Object.values(s.villages))migrateLocalResearch(v,s);migrateProduction(s);migrateDevelopment(s);}
 return {complete:t>=now,events};
}
export const researchLevel=localResearchLevel;
export const researchCost=localResearchCost;
export const researchRequirement=localResearchRequirement;
export function connectionKey(a,b){return JSON.stringify([a,b].sort());}
export function roadTicksRemaining(road,gameTick){
 if(!road?.targetLevel)return 0;
 return road.paused?Math.max(0,road.remainingTicks||0):Math.max(0,(road.finishTick??((road.startedTick??gameTick)+(road.durationTicks??0)))-gameTick);
}
function pauseConstruction(road,gameTick){
 if(!road.targetLevel||road.paused)return;
 road.remainingTicks=roadTicksRemaining(road,gameTick);road.paused=true;
 delete road.finishTick;
}
function resumeConstruction(road,gameTick){
 if(!road.targetLevel||!road.paused)return;
 const left=Math.max(0,Math.min(road.durationTicks,road.remainingTicks||0));
 road.finishTick=gameTick+left;road.startedTick=road.finishTick-road.durationTicks;
 delete road.paused;delete road.remainingTicks;
}
export function normalizeRoadTimers(s,gameTick){
 // Preserve the existing six-day migration for old construction timers.
 for(const [id,road]of Object.entries(s.roads||{})){
  road.id=id;
  if(!road.targetLevel)continue;
  if(road.timingVersion!==1){
   road.startedTick=Number.isFinite(road.startedTick)?road.startedTick:gameTick;
   road.durationTicks=C.roads.constructionTicks;road.finishTick=road.startedTick+road.durationTicks;road.timingVersion=1;
  }
  road.constructionFrom??=road.from;
 }
 const selected=selectedTradeRoutes(s);
 s.tradeRoutes=selected;s.tradeRouteVersion=1;
 for(const [id,road]of Object.entries(s.roads||{}))if(road.targetLevel){
  if(selected[road.constructionFrom]===id)resumeConstruction(road,gameTick);
  else pauseConstruction(road,gameTick);
 }
}
function activateTradeRoute(s,from,id,gameTick){
 if(id===null)delete s.tradeRoutes[from];else s.tradeRoutes[from]=id;
 for(const [key,road]of Object.entries(s.roads||{}))if(road.targetLevel&&road.constructionFrom===from){
  if(key===id)resumeConstruction(road,gameTick);else pauseConstruction(road,gameTick);
 }
 return id===null?null:s.roads[id];
}
export function selectTradeRoute(s,from,id,gameTick){
 const source=s.villages[from],road=s.roads?.[id];
 if(!source)throw Error('Departure settlement no longer exists');
 if(id!==null){
  if(!source.roads)throw Error('Research Road Networks first');
  if(!road||![road.from,road.to].includes(from))throw Error('Choose a connection from this settlement');
  const target=s.villages[road.from===from?road.to:road.from];
  if(!target||target.dimension!==source.dimension)throw Error('Choose a settlement in the same dimension');
 }
 normalizeRoadTimers(s,gameTick);
 return activateTradeRoute(s,from,id,gameTick);
}
export function startRoad(s,from,to,gameTick){
 const a=s.villages[from],b=s.villages[to];
 if(!a||!b||from===to)throw Error('Choose another known settlement');
 if(!a.roads)throw Error('Research Road Networks first');
 if(a.dimension!==b.dimension)throw Error('Roads connect settlements in the same dimension');
 normalizeRoadTimers(s,gameTick);s.roads??={};
 const canonical=connectionKey(from,to);
 const id=s.roads[canonical]?canonical:Object.keys(s.roads).find(key=>{const r=s.roads[key];return r.from===from&&r.to===to||r.from===to&&r.to===from;})||canonical;
 let road=s.roads[id];
 if(road?.targetLevel){
  if(road.constructionFrom!==from)throw Error('This connection is being built from the other settlement');
  return activateTradeRoute(s,from,id,gameTick);
 }
 if(road?.level>=3)throw Error('This connection is already a Highway');
 const distance=Math.hypot(a.location.x-b.location.x,a.location.z-b.location.z);
 if(!road)road=s.roads[id]={id,from,to,level:0,distance};
 road.targetLevel=road.level+1;road.constructionFrom=from;
 road.durationTicks=C.roads.constructionTicks;road.timingVersion=1;
 road.startedTick=gameTick;road.finishTick=gameTick+road.durationTicks;
 return activateTradeRoute(s,from,id,gameTick);
}
export function completeRoads(s,gameTick){
 normalizeRoadTimers(s,gameTick);
 let changed=false;
 for(const road of Object.values(s.roads||{}))if(road.targetLevel&&!road.paused&&gameTick>=road.finishTick){
  road.level=road.targetLevel;delete road.targetLevel;delete road.constructionFrom;
  delete road.remainingTicks;delete road.paused;changed=true;
 }
 return changed;
}
export function foodCost(road,source){
 const level=source?Math.min(road.level,Math.max(0,Math.min(3,Math.floor(source.roads||0)))):road.level;
 if(!level)return null;
 return Math.max(C.roads.minimumFood,Math.ceil(road.distance*C.roads.foodPerBlock*C.roads.foodCostMultipliers[level]));
}
export function corndogCost(points){return `${points/2} corndogs`;}
export function travelQuote(road,source){
 let reason='';
 if(!source?.roads)reason='Unlock Road Networks I in the departure settlement before travelling.';
 else if(!road?.level)reason='No completed road from this settlement.';
 const foodPoints=reason?null:foodCost(road,source);
 return {canTravel:!reason,reason,foodPoints,effectiveLevel:reason?0:Math.min(road.level,source.roads)};
}
export function foodPlan(items,cost){
 if(cost<=0)return [];
 const eligible=items.filter(i=>Number.isFinite(C.food[i.typeId])&&C.food[i.typeId]>0);
 const total=eligible.reduce((n,i)=>n+C.food[i.typeId]*i.amount,0);
 if(total<cost)return null;
 const maxValue=Math.max(...eligible.map(i=>C.food[i.typeId]));
 const limit=Math.min(total,Math.ceil(cost)+maxValue-1),plans=Array(limit+1).fill(null);
 plans[0]={prev:null};
 // Bounded knapsack chooses the least food-point overpayment using whole items.
 for(const item of eligible){
  let remaining=item.amount;
  for(let group=1;remaining>0;group*=2){
   const count=Math.min(group,remaining),value=count*C.food[item.typeId];remaining-=count;
   for(let sum=limit;sum>=value;sum--)if(!plans[sum]&&plans[sum-value])plans[sum]={prev:plans[sum-value],item,count};
  }
 }
 let chosen=Math.ceil(cost);while(chosen<=limit&&!plans[chosen])chosen++;
 if(chosen>limit)return null;
 const slots=new Map();
 for(let node=plans[chosen];node?.item;node=node.prev){
  const entry=slots.get(node.item.slot)||{...node.item,count:0};entry.count+=node.count;slots.set(node.item.slot,entry);
 }
 return [...slots.values()];
}

export function spendFoodAndTravel(inventory,plan,teleport){
 const originals=plan.map(p=>({slot:p.slot,item:inventory.getItem(p.slot)}));
 try{
  for(const p of plan){
   const item=inventory.getItem(p.slot);
   if(!item||item.typeId!==p.typeId||item.amount<p.count)throw Error('Travel inventory changed');
   if(item.amount===p.count)inventory.setItem(p.slot,undefined);
   else{item.amount-=p.count;inventory.setItem(p.slot,item);}
  }
  teleport();
 }catch(e){for(const original of originals)inventory.setItem(original.slot,original.item);throw e;}
}
