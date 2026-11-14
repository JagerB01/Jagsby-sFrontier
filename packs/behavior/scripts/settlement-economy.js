import {ECONOMY_CONFIG as C} from './economy-config.js';
const HOUR=3600000,DAY=86400000,EPS=1e-8;
export function development(v){return Math.floor(Math.max(0,v.developmentValue||0)/C.developmentThreshold+1e-10);}
export function capacity(s){return C.baseCapacity*2**Math.max(0,s.global?.storage||0);}
export function stockTotal(s){return Object.values(s.stock||{}).reduce((a,n)=>a+n,0);}
export function migrateEconomy(s,now=Date.now()){
 s.stock??={};s.roads??={};s.global??={};s.villages??={};
 if(!Number.isFinite(s.economyAt)){s.economyAt=now;s.economyVersion=1;}
 for(const v of Object.values(s.villages)){
  v.developmentValue=Math.max(0,v.developmentValue||0);v.lifetimeProduced??={};
  v.sanctuary??=0;v.roads??=0;v.efficiency??=0;v.hearth??=0;
 }
 return s;
}
export function resourcesFor(v){
 const result=new Map();
 for(const biome of [v.biome,...(v.biomeUnlocked&&v.secondary?[v.secondary]:[])])
  for(const r of C.resources[biome]||[])result.set(r.id,r);
 return [...result.values()];
}
export function recordedPower(v){
 if(Number.isFinite(v.productionPower))return Math.max(0,v.productionPower);
 const c=v.census;
 if(!c||c.error)return 0;
 const n=Number.isFinite(c.realmPowerTenths)?c.realmPowerTenths:c.minimumPowerTenths;
 return Math.max(0,Number.isFinite(n)?n/10:0);
}
export function resourceRates(v){
 const factor=recordedPower(v)*(1+C.prosperityBonus*(v.efficiency||0))*(1+C.developmentBonus*development(v));
 return resourcesFor(v).map(r=>({...r,rate:C.categories[r.category].rate*factor}));
}
export function routeRates(s){
 const result=Object.fromEntries(Object.keys(s.villages).map(k=>[k,0]));
 for(const road of Object.values(s.roads)){
  const a=s.villages[road.from],b=s.villages[road.to];
  if(!a||!b||!road.level||road.targetLevel)continue;
  result[road.from]+=10*road.level*(1+development(b)/100)/DAY;
  result[road.to]+=2*road.level*(1+development(a)/100)/DAY;
 }
 return result;
}
// Exact piecewise-constant integration: stop at every Development threshold
// and shared-capacity boundary, then recompute all rates simultaneously.
export function accountEconomy(s,now=Date.now(),maxEvents=10000){
 migrateEconomy(s,now);let t=s.economyAt,events=0;
 if(now<=t)return {complete:true,events};
 const entries=Object.entries(s.villages).sort(([a],[b])=>a.localeCompare(b));
 while(t<now&&events++<maxEvents){
  const free=Math.max(0,capacity(s)-stockTotal(s)),producing=free>EPS;
  const routes=routeRates(s),rates={},devRates={};let totalRate=0;
  for(const [id,v]of entries){
   rates[id]=producing?resourceRates(v).map(r=>({...r,perMs:r.rate/HOUR})):[];
   devRates[id]=routes[id]||0;
   for(const r of rates[id]){totalRate+=r.perMs;devRates[id]+=r.perMs*C.categories[r.category].value;}
  }
  let dt=now-t;
  if(totalRate>0)dt=Math.min(dt,free/totalRate);
  for(const [id,v]of entries)if(devRates[id]>0){
   const remaining=(development(v)+1)*C.developmentThreshold-v.developmentValue;
   dt=Math.min(dt,Math.max(remaining,EPS)/devRates[id]);
  }
  if(!(dt>0)||!Number.isFinite(dt))throw Error('Invalid economy accounting interval');
  for(const [id,v]of entries){
   for(const r of rates[id]){
    const amount=r.perMs*dt;s.stock[r.id]=(s.stock[r.id]||0)+amount;
    v.lifetimeProduced[r.id]=(v.lifetimeProduced[r.id]||0)+amount;
   }
   v.developmentValue+=devRates[id]*dt;
  }
  t=Math.min(now,t+dt);
  // Floating point timestamps may stop advancing below one ULP.
  if(now-t<0.001)t=now;
 }
 s.economyAt=t;
 return {complete:t>=now,events};
}
export function researchLevel(v,key){return key==='biome'?Number(v.biomeUnlocked):v[key]||0;}
export function researchCost(v,key){
 const def=C.research[key],level=researchLevel(v,key);
 if(Array.isArray(def))return def[level]??null;
 if(!def)return null;
 return Object.fromEntries(Object.entries(def.base).map(([id,n])=>[id,Math.ceil(n*(1+level*def.growth))]));
}
export function researchRequirement(v,key){
 if(['biome','sanctuary'].includes(key)&&v.hearth<1)return 'Requires Hearthstone I';
 if(key==='efficiency'&&!v.biomeUnlocked)return 'Requires Resource Prospecting';
 if(key==='roads'&&v.sanctuary<1)return 'Requires Sanctuary I';
 return null;
}
export function connectionKey(a,b){return JSON.stringify([a,b].sort());}
export function startRoad(s,from,to,gameTick){
 const a=s.villages[from],b=s.villages[to];
 if(!a||!b||from===to)throw Error('Choose another known settlement');
 if(!a.roads)throw Error('Research Road Networks first');
 if(a.dimension!==b.dimension)throw Error('Roads connect settlements in the same dimension');
 const id=connectionKey(from,to);let road=s.roads[id];
 if(road?.targetLevel)throw Error('This connection is already under construction');
 if(road?.level>=3)throw Error('This connection is already a Highway');
 const distance=Math.hypot(a.location.x-b.location.x,a.location.z-b.location.z);
 if(!road)road=s.roads[id]={id,from,to,level:0,distance};
 road.targetLevel=road.level+1;
 road.durationTicks=Math.ceil(Math.max(C.roads.minimumTicks,distance*C.roads.ticksPerBlock)*road.targetLevel);
 road.startedTick=gameTick;road.finishTick=gameTick+road.durationTicks;
 return road;
}
export function completeRoads(s,gameTick){
 let changed=false;
 for(const road of Object.values(s.roads))if(road.targetLevel&&gameTick>=road.finishTick){
  road.level=road.targetLevel;delete road.targetLevel;changed=true;
 }
 return changed;
}
export function foodCost(road){return Math.max(C.roads.minimumFood,Math.ceil(road.distance*C.roads.foodPerBlock*C.roads.foodCostMultipliers[road.level]));}
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
