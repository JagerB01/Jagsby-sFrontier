import { charterKey, preventClosePlacement } from "./charter-placement.js";
import { world, system, ItemStack, BlockVolume, BlockTypes } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { nearbyVillagers, summarizeVillagers } from "./village-census.js";
import { sampleTradingRanks } from "./villager-trade-bridge.js";
import { CHARTER_LAYOUT } from "./charter-layout.js";
import { settlementName, biomeName, powerValue, tradeRouteSummary, developmentRateText } from "./settlement-overview.js";
import { settlementTier } from "./settlement-tiers.js";
import { ownerName, ownerRecord, claimSettlement, settlementDirectory, directoryRoadState } from "./settlement-realm.js";
import { displayMenu } from "./menu-display.js";
import { mapSnapshot, moveMap, mapDetails, provinceLinePixels } from "./settlement-map.js";
import { CLAPPING_EMOTE, POI_KEY, POI_RADIUS, readSurveyedPois, rememberPoiPlacement, surveyLoadedPois, wasPoiPlaced } from "./poi-survey.js";


const BLOCK = "jagsby_frontier:village_charter";
const KEY = "jagsby_frontier:state_v1";
const BIOME_RADIUS = 256;
import {DEFINITIONS,ZONES,zoneAt,maxLevel,nextCost,acceptedMaterials,lockReason,contribution,applyContribution,migrateResearch,settlementLimit,foundingReason,storageIncrement,localLevel,colonizationBonus} from "./global-research.js";
import {ECONOMY_CONFIG} from "./economy-config.js";
import {accountEconomy,development,developmentThreshold,resourceRates,capacity,stockTotal,researchCost,researchLevel,researchRequirement,startRoad,completeRoads,normalizeRoadTimers,selectTradeRoute,selectedTradeRoutes,roadTicksRemaining,travelQuote,corndogCost,foodCost,foodPlan,spendFoodAndTravel,routeRates,recordedPower,developmentHourlyRate} from "./settlement-economy.js";
import {refreshProtection,protectDamage,within,healVillager} from "./settlement-effects.js";
import {localContribution,applyLocalContribution,migrateLocalResearch,localResearchText,researchComparison,researchPercent} from "./local-research.js";
import {productionView} from "./production-display.js";
import {canonicalBiome,eligibleBiome,productionAllocations} from "./biome-resources.js";
const roadTimers=new Map();
const pendingSurveys=new Map();
function gameTick(){return world.getAbsoluteTime?.()??0;}
function accounted(){
 const s=state();const result=accountEconomy(s);
 if(!result.complete){save(s);throw Error('Offline accounting is catching up; reopen the charter to continue.');}
 normalizeRoadTimers(s,gameTick());completeRoads(s,gameTick());save(s);return s;
}
function scheduleRoads(s){
 for(const [id,job]of roadTimers){
  const road=s.roads?.[id];
  if(s.tradeRouteVersion!==1||!road?.targetLevel||road.paused||road.finishTick!==job.finishTick){system.clearRun(job.handle);roadTimers.delete(id);}
 }
 for(const road of Object.values(s.roads||{}))if(s.tradeRouteVersion===1&&road.targetLevel&&!road.paused&&Number.isFinite(road.finishTick)&&!roadTimers.has(road.id)){
  const finishTick=road.finishTick,delay=Math.max(1,finishTick-gameTick());
  const handle=system.runTimeout(()=>{
   if(roadTimers.get(road.id)?.finishTick!==finishTick)return;
   roadTimers.delete(road.id);try{accounted();}catch(e){console.warn(String(e));}
  },Math.min(delay,2147483647));
  roadTimers.set(road.id,{handle,finishTick});
 }
}

function state(){
 const raw=world.getDynamicProperty(KEY);
 // Never overwrite corrupt data with a new empty world.
 return raw?JSON.parse(raw):{villages:{},global:{},stock:{},lastTick:Date.now()};
}
function save(s){world.setDynamicProperty(KEY,JSON.stringify(s));scheduleRoads(s);}
function id(loc){return `${Math.floor(loc.x)},${Math.floor(loc.y)},${Math.floor(loc.z)}`;}
function getBiome(dim,loc){try{return dim.getBiome(loc).id;}catch(e){return "unknown";}}
async function refreshVillage(vId){
  const initial=state().villages[vId];if(!initial)return;
  const dim=world.getDimension(initial.dimension);
  let census;
  try{
    const villagers=nearbyVillagers(dim,initial.location);
    const readTier=await sampleTradingRanks(villagers,system);
    census=summarizeVillagers(villagers,readTier);
  }catch(e){census={error:true,observedAt:Date.now()};console.warn(`Frontier census: ${e}`);}
  // Re-read after awaiting native properties so another player's research or
  // collection cannot be overwritten by a stale survey state.
  const latest=accounted(),v=latest.villages[vId];if(!v)return;
  if(!census.error){v.productionPower=(Number.isFinite(census.realmPowerTenths)?census.realmPowerTenths:census.minimumPowerTenths)/10;v.productionPowerIsMinimum=census.realmPowerTenths===null;}
  v.census=census;save(latest);
  if(!census.error)console.log(`[Frontier census] villagers=${census.villagers} power_tenths=${census.realmPowerTenths} unknown_ranks=${census.unknownRanks}`);
}
function addVillage(s,block,creator){const legacy=id(block.location),k=`${block.dimension.id}|${legacy}`;
if(!s.villages[k]&&s.villages[legacy]?.dimension===block.dimension.id){s.villages[k]=s.villages[legacy];s.villages[k].id=k;delete s.villages[legacy];save(s);}
if(!s.villages[k]){
  const reason=foundingReason(s,zoneAt(block.location));
  if(reason){creator?.sendMessage('§e'+reason);return null;}
  const native=canonicalBiome(getBiome(block.dimension,block.location));
  s.villages[k]={nativeBiome:native,productionMode:'unassigned',id:k,location:{...block.location},dimension:block.dimension.id,name:`Settlement ${Object.keys(s.villages).length+1}`,owner:creator?ownerRecord(creator):null,biome:native,secondary:null,available:[],efficiency:0,hearth:0,biomeUnlocked:false};save(s);
}return s.villages[k];}
function cap(s){return capacity(s);}
function total(s){return stockTotal(s);}
function pageTitle(page){return `JF_CHARTER|${page}`;}
function researchText(s,v,key,player){return key in DEFINITIONS?globalResearchText(s,key):localResearchText(v,key,s);}
function globalResearchText(s,key){
 const d=DEFINITIONS[key],level=s.global[key],cost=nextCost(s,key),maximum=maxLevel(s,key);
 const compare=(now,next)=>researchComparison(now,next,cost!==undefined);
 const bonus=n=>n?`${ZONES[n]} +${researchPercent(n*10)}`:'None';
 const benefits={
  innovation:`Upgrade limit: ${compare('Lv '+level,'Lv '+(level+1))}\nSets the maximum level of every other local and global tech. Individual tech caps still apply.`,
  capacity:`Settlement limit: ${compare(settlementLimit(s),settlementLimit(s)+1)}`,
  frontier:`Founding limit: ${compare(ZONES[level+1],ZONES[level+2])}\nUnlocks founding zones; settlement slots are separate.`,
  colonization:`Zone bonus: ${compare(bonus(level),bonus(Math.min(5,level+1)))}\nEarlier zone bonuses remain active.\nBonus resources do not earn Development.`,
  storage:`Shared capacity: ${compare(cap(s),cap(s)+storageIncrement())} items`,
 };
 const description=benefits[key];
 const resource=key==='capacity'?'Logs':key==='storage'?'Logs or Nether Stems':acceptedMaterials(s,key).map(id=>id.replace('minecraft:','').replaceAll('_',' ')).join(', ');
 const missing=[];
 if(d.prerequisite&&s.global[d.prerequisite]<1)missing.push(DEFINITIONS[d.prerequisite].name+' Lv 1');
 if(key!=='innovation'&&cost!==undefined&&level>=s.global.innovation)missing.push('Stewardship Lv '+(level+1));
 const required=missing.length?'\n§cRequired: '+missing.join('; ')+'§r':'';
 return `Lv ${level}${Number.isFinite(maximum)?' / '+Math.max(level,maximum):' (endless)'}\n${description}\n${cost===undefined?'§eFully upgraded§r':`Next cost: ${cost} ${resource}\nContributed: ${s.researchProgress[key]} / ${cost}; ${Math.max(0,cost-s.researchProgress[key])} remaining${required}`}`;
}
function inventoryMaterials(player,s,key,materials=acceptedMaterials(s,key)){
 const inv=player.getComponent('minecraft:inventory')?.container,counts=new Map();
 if(inv)for(let slot=0;slot<inv.size;slot++){const item=inv.getItem(slot);if(item&&materials.includes(item.typeId))counts.set(item.typeId,(counts.get(item.typeId)||0)+item.amount);}
 return [...counts];
}
function cardContribution(player,s,v,key){
 const global=key in DEFINITIONS;
 const cost=global?nextCost(s,key):researchCost(v,key);
 const locked=global?lockReason(s,key):researchRequirement(v,key,s);
 const revision=global?s.researchRevision:v.localResearch.revision;
 const level=global?s.global[key]:researchLevel(v,key);
 if(locked||!cost)return {level,revision,reason:locked||'Fully upgraded'};
 const materials=global?acceptedMaterials(s,key):cost.materials;
 const inv=player.getComponent('minecraft:inventory')?.container;
 const held=inv?.getItem(Number.isInteger(player.selectedSlotIndex)?player.selectedSlotIndex:0)?.typeId;
 const available=inventoryMaterials(player,s,key,materials);
 const choice=available.find(([id])=>id===held)||available[0];
 if(!choice)return {level,revision,reason:'No eligible materials to contribute'};
 const [material,count]=choice;
 const amount=global?contribution(s,key,material,count):localContribution(v,key,material,count,s);
 return {level,revision,material,amount,reason:amount?'':'No contribution needed'};
}
function contributeResearchCard(player,vid,key,shown,view){
 const global=key in DEFINITIONS;
 try{
  const s=accounted(),v=s.villages[vid];if(!v)return;
  if(s.pendingResearch){player.sendMessage('Research payment recovery is pending. The original contributor must reopen a charter.');return;}
  const current=cardContribution(player,s,v,key);
  if(current.level!==shown.level||current.revision!==shown.revision||current.material!==shown.material){
   player.sendMessage('Research or inventory changed. Review the updated hover details.');
  }else if(!current.amount||!shown.amount){player.sendMessage(current.reason||'No contribution available.');}
  else{
   const amount=Math.min(current.amount,shown.amount),inv=player.getComponent('minecraft:inventory')?.container;
   const slots=[];let left=amount;
   for(let slot=0;slot<inv.size&&left;slot++){
    const item=inv.getItem(slot);if(item?.typeId!==shown.material)continue;
    const take=Math.min(left,item.amount);slots.push({slot,before:item.amount,after:item.amount-take});left-=take;
   }
   if(left)throw Error('Inventory changed before payment');
   s.pendingResearch={playerId:player.id,key,material:shown.material,amount,slots,recipeVersion:3};
   if(!global)Object.assign(s.pendingResearch,{scope:'local',vid,level:shown.level,revision:shown.revision});
   save(s);recoverResearch(player);
  }
  reopenView(player,vid,{...view,page:'Research',researchScope:global?'global':'local'});
 }catch(e){console.warn(`Frontier contribution: ${e}`);player.sendMessage('Research payment paused. Reopen the charter to retry or recover; keep payment items in place.');}
}
function recoverResearch(player){
  const s=state(),tx=s.pendingResearch;
  if(!tx||tx.playerId!==player.id)return;
  const result=accountEconomy(s);
  if(!result.complete){save(s);throw Error('Offline accounting is catching up; reopen the charter to continue.');}
  const target=tx.scope==='local'?s.villages[tx.vid]:null;
  if(tx.scope==='local'&&(!target||(tx.level!==undefined&&researchLevel(target,tx.key)!==tx.level)||(tx.revision!==undefined&&target.localResearch.revision!==tx.revision)))throw Error('Saved local payment requires manual recovery; research changed');
  // A journal saved before the recipe change already authorized these items.
  const legacyStorage=!tx.recipeVersion&&!target&&tx.key==='storage';
  const legacyProsperity=!tx.recipeVersion&&target&&tx.key==='efficiency';
  const legacyHearthstone=(tx.recipeVersion??0)<2&&target&&tx.key==='hearth';
  const legacyBamboo=(tx.recipeVersion??0)<3&&target&&tx.key==='sanctuary'&&tx.material==='minecraft:bamboo';
  const legacyLocalCost=legacyProsperity||legacyBamboo?250:legacyHearthstone?[64,128][target.hearth]:undefined;
  let eligible;
  if(legacyStorage)eligible=lockReason(s,tx.key)?0:Math.min(tx.amount,512-s.researchProgress.storage);
  else if(legacyLocalCost!==undefined)eligible=researchRequirement(target,tx.key,s)?0:Math.min(tx.amount,legacyLocalCost-target.localResearch.progress[tx.key]);
  else eligible=target?localContribution(target,tx.key,tx.material,tx.amount,s):contribution(s,tx.key,tx.material,tx.amount);
  if(eligible!==tx.amount)throw Error('Saved payment does not match current research; nothing further removed');
  const inv=player.getComponent('minecraft:inventory')?.container;if(!inv)return;
  // Refuse ambiguous recovery rather than consuming different items or crediting twice.
  for(const entry of tx.slots){
    const item=inv.getItem(entry.slot);
    const count=item?.typeId===tx.material?item.amount:item?NaN:0;
    if(count!==entry.before&&count!==entry.after)throw Error('Payment inventory changed; manual recovery required');
  }
  for(const entry of tx.slots){
    const item=inv.getItem(entry.slot);
    if(item?.amount===entry.before){
      if(entry.after===0)inv.setItem(entry.slot,undefined);
      else{item.amount=entry.after;inv.setItem(entry.slot,item);}
    }
  }
  if(legacyStorage){
   s.researchProgress.storage+=tx.amount;
   s.researchRevision++;
  }else if(legacyLocalCost!==undefined){
   target.localResearch.progress[tx.key]+=tx.amount;
   target.localResearch.revision++;
  }else{
   const accepted=target?applyLocalContribution(target,tx.key,tx.material,tx.amount,s):applyContribution(s,tx.key,tx.material,tx.amount);
   if(accepted!==tx.amount)throw Error('Saved payment is inconsistent with research progress');
  }
  delete s.pendingResearch;
  if(legacyStorage)migrateResearch(s);
  if(legacyLocalCost!==undefined)migrateLocalResearch(target,s);
  save(s);
  player.sendMessage(`§aContributed ${tx.amount} toward ${tx.scope==='local'?ECONOMY_CONFIG.research[tx.key].name:DEFINITIONS[tx.key].name}.`);
}

function reopenView(player,vid,view={}){
 open(player,vid,view.page||'Overview',view.researchScope||'local',view.realmPage||0,view.realmScope||'roads',view.productionScope||'summary',view.productionPages||{});
}
function open(player,vId,page='Overview',researchScope='local',realmPage=0,realmScope='roads',productionScope='summary',productionPages={}){
  const preparedAt=Date.now();
  const view={page,researchScope,realmPage,realmScope,productionScope,productionPages};
  const s=accounted(),v=s.villages[vId];if(!v){player.sendMessage('§cVillage Charter not registered.');return;}
  const {data,actions,recordCount,tabs}=CHARTER_LAYOUT;
  const records=Array(recordCount).fill('');
  records[data.overview]=v.name;
  records[data.biomes]=biomeName(v.biome);
  const power=powerValue(v.census);
  records[data.census]=power==='Unavailable'?power:`${power} RP`;
  records[data.owner]=`Owner: ${ownerName(v)}`;
  const mine=settlementDirectory(s.villages,player,realmPage,true,v,s.roads);
  const all=settlementDirectory(s.villages,player,realmPage,false,v,s.roads);
  const directoryIcons=new Map();
  const tier=settlementTier(v.census);
  records[data.tier]=tier.label;
  const researchChoices=new Map();
  for(const key of ['efficiency','hearth','biome','sanctuary','roads','frontier','capacity','innovation','colonization','storage']){
   const choice=cardContribution(player,s,v,key);researchChoices.set(key,choice);
   const available=key in DEFINITIONS?nextCost(s,key)!==undefined&&!lockReason(s,key):Boolean(researchCost(v,key))&&!researchRequirement(v,key,s);
   records[data[key]]=researchText(s,v,key,player)+(available?'\nClick to contribute':'');
  }
  records[data.zone]=zoneAt(v.location)||'Unknown';
  const devLevel=development(v);
  const actualDev=Math.max(0,v.developmentValue||0)/developmentThreshold(v);
  records[data.developmentValue]=`Development ${devLevel}`;
  records[data.developmentActual]=Math.min(actualDev,devLevel+0.999).toFixed(3);
  records[data.developmentHourly]=developmentRateText(developmentHourlyRate(s,v));
  records[data.tradeRoute]=tradeRouteSummary(s,v);
  for(const key of ['innovation','frontier','capacity','colonization','storage','hearth','biome','sanctuary','efficiency','roads']){
    const level=key in DEFINITIONS?s.global[key]:['efficiency','sanctuary'].includes(key)?localLevel(s,v,key):researchLevel(v,key);
    const finished=key in DEFINITIONS?DEFINITIONS[key].max!==undefined&&level>=DEFINITIONS[key].max:ECONOMY_CONFIG.research[key].max!==undefined&&level>=ECONOMY_CONFIG.research[key].max;
    records[data[key+'Level']]=finished?`§eLv ${level}§r`:`Lv ${level}`;
  }
  const production=productionView(s,v,productionPages);
  production.modifierRows.forEach((row,slot)=>{records[data['productionModifier'+slot]]=row.value;records[data['productionModifierName'+slot]]=row.label;});
  records[data.productionModifierTotal]=production.modifierTotal;
  records[data.productionOutput]=production.status;
  records[data.stockpile]=production.stockHeading;
  production.stock.forEach((item,slot)=>records[data['stockCount'+slot]]=String(item.count));
  for(let slot=0;slot<2;slot++){
   const item=production.items[slot];
   records[data['productionItem'+slot]]=item?.text||'';
   records[data['overviewProduction'+slot]]=item?`+ ${item.actual.toFixed(3)}/hr`:slot===0?'None':'';
  }
  production.choices.forEach((choice,slot)=>records[data['prospectInfo'+slot]]=choice.text);
  const roadView=roadNetworkOverview(s,v,realmPage);
  records[data.roadSummary]=roadView.summary;
  records[data.roadDetails]=roadView.rows.length?'':roadView.details;
  const handlers=new Map();
  handlers.set(actions.settlementMap,()=>openSettlementMap(player,vId,{},vId,view));
  const realmMarkers=[];
  const activeRoute=selectedTradeRoutes(s)[vId];
  const layout=CHARTER_LAYOUT.realmRows;
  const lists=[mine.rows,all.rows,roadView.rows];
  if(lists.some(rows=>rows.length>layout.limit)){
   player.sendMessage(`§cRealm lists exceed this pack's ${layout.limit}-row layout. Increase the Realm row limit and rebuild the pack; no settlements have been removed.`);return;
  }
  const put=(index,values)=>{while(records.length<index+values.length)records.push('');values.forEach((value,offset)=>records[index+offset]=String(value??''));};
  lists.forEach((rows,scopeIndex)=>rows.forEach((row,slot)=>{
   const scope=layout.scopes[scopeIndex],base=layout.base+slot*layout.stride+scopeIndex*8;
   realmMarkers.push(`[JF:row:${scope}:${slot}]`);
   if(scope!=='roads'){
    const sending=Boolean(row.sendRoadId&&row.sendRoadId===activeRoute);
    const canSend=Boolean(row.sendRoadId&&!sending);
    const action=row.canEstablishRoad?'Establish\nRoad':canSend?'Send Route':'';
    put(base,[row.name,row.owner,row.coordinates,row.distanceText,row.development,sending?'Sending':action?'':row.roadStatus,action,'']);
    directoryIcons.set(base,row.icon);
    if(action)realmMarkers.push(`[JF:directoryAction:${scope}:${slot}]`);
    if(row.canEstablishRoad)handlers.set(base+6,()=>establishDirectoryRoad(player,vId,row.id,0,scope));
    if(canSend)handlers.set(base+6,()=>changeTradeRoute(player,vId,row.sendRoadId,scope));
   }else{
    put(base,[row.name,row.owner,row.distance,row.cost==='Unavailable'?'—':row.cost,'',row.time,'','']);
    directoryIcons.set(base,row.villageTexture);
    directoryIcons.set(base+6,row.nextTexture||row.texture);
    handlers.set(base+6,()=>roadMenu(player,vId));
    realmMarkers.push(`[JF:${row.canTravel?'travel':'travel_disabled'}:roads:${slot}]`);
    if(row.canTravel)handlers.set(base+7,()=>travelRoad(player,vId,row.roadId));
   }
  }));
  for(const entry of CHARTER_LAYOUT.viewActions){
   const targetView={...view,...entry};
   handlers.set(actions[entry.scan],()=>surveySettlement(player,vId,targetView));
   handlers.set(actions[entry.rename],()=>renameSettlement(player,vId,targetView));
  }
  for(const [key,choice]of researchChoices)handlers.set(actions[key],()=>contributeResearchCard(player,vId,key,choice,view));
  const pages=productionPages;
  for(const [slot,choice]of production.choices.entries()){
   if(v.biomeUnlocked&&choice.verified&&!choice.selected)handlers.set(actions['prospectSelect'+slot],()=>selectBiome(player,vId,choice.id,pages,choice.mode,view));
  }
  if(v.biomeUnlocked&&(v.secondary||v.productionMode==='specialize'))handlers.set(actions.clearSecondary,()=>clearSecondary(player,vId,pages,view));
  handlers.set(actions.collect,()=>collect(player,vId,pages,view));
  handlers.set(actions.claim,()=>{const latest=state();if(claimSettlement(latest,vId,player))save(latest);reopenView(player,vId,{...view,page:'Overview'});});
  for(const [key,index] of Object.entries(actions))records[index]=`[JF:action:${key}]`;
  for(const [key,index] of Object.entries(data))if(!['census','developmentValue','developmentActual','developmentHourly','owner','realmMine','realmAll'].includes(key)&&!key.startsWith('stockCount')&&!key.startsWith('productionModifier')&&!key.startsWith('overviewProduction')&&!key.startsWith('directory')&&!key.startsWith('roadConnection')&&!key.startsWith('prospectInfo'))records[index]=`[JF:data:${key}]${records[index]}`;
  for(const key of ['clearSecondary',...Array.from({length:52},(_,i)=>'prospectSelect'+i)])if(!handlers.has(actions[key]))records[actions[key]]=`[JF:disabled:${key}]`;
  const tab=tabs.includes(page)?page.toLowerCase():'overview';
  // Records transport village data to Frontier's own custom JSON UI
  // controls. Tab switches stay local; action variants identify their visible page.
  const form=new ActionFormData().title(pageTitle('Dashboard')).body(`[JF:tab:${tab}][JF:research:${researchScope}][JF:realm:${realmScope}][JF:production:${productionScope}]${realmMarkers.join('')}${v.owner?'':'[JF:unclaimed]'}${production.stock.map((_,slot)=>`[JF:stock:${slot}]`).join('')}${production.modifierRows.map((_,slot)=>`[JF:modifier:${slot}]`).join('')}${production.choices.map((choice,slot)=>`[JF:prospect:${slot}]${choice.selected?'[JF:prospectSelected:'+slot+']':''}`).join('')}${v.biomeUnlocked?'':'[JF:prospectLocked]'}${[['mine',mine],['all',all]].map(([scope,directory])=>directory.rows.length?'':`[JF:directory:${scope}:empty]`).join('')}`);
  records.forEach((text,index)=>{
   const texture=index===data.tier?tier.texture:index===data.productionItem0?production.items[0]?.texture:index===data.productionItem1?production.items[1]?.texture:index===data.overviewProduction0?production.items[0]?.texture:index===data.overviewProduction1?production.items[1]?.texture:index>=data.stockCount0&&index<data.stockCount0+30?production.stock[index-data.stockCount0]?.texture:index>=data.prospectInfo0&&index<data.prospectInfo0+52?production.choices[index-data.prospectInfo0]?.texture:directoryIcons.get(index);
   form.button(text,texture);
  });
  console.log(`[Frontier menu data] view=${page}/${researchScope}/${realmScope}/${productionScope} mine=${mine.rows.length} all=${all.rows.length} roads=${roadView.rows.length} prospects=${production.choices.length} realm_base=${layout.base} prospect_base=${data.prospectInfo0}`);
  console.log(`[Frontier menu] prepare_ms=${Date.now()-preparedAt} records=${records.length}`);
  displayMenu(player,form,system).then(r=>{if(!r.canceled){const handler=handlers.get(r.selection);if(handler)handler();else{console.warn(`Frontier unmapped action: ${r.selection}`);player.sendMessage('§eThe charter did not recognize that action. Please reopen it.');}}}).catch(e=>{console.warn(`Frontier menu: ${e}`);player.sendMessage('§cThe Village Charter menu could not open. Check the Minecraft content log for Frontier menu errors.');});
}

// Map rendering reads the registry and the POIs previously discovered by clapping.
function openSettlementMap(player,vid,viewport={},selectedId=vid,returnView={}){
 try{
  const villages=state().villages;
  const requested={...viewport,dimension:viewport.dimension||villages[vid]?.dimension||player.dimension?.id||'minecraft:overworld'};
  let spawn=null;
  try{spawn=world.getDefaultSpawnLocation();}catch(error){console.warn(`Frontier map spawn: ${error}`);}
  const snapshot=mapSnapshot(villages,requested,selectedId,spawn,readSurveyedPois(world)),layout=CHARTER_LAYOUT.settlementMap;
  const records=Array(layout.zTicks.at(-1)+1).fill('');
  snapshot.cells.forEach(([point],index)=>{records[index]=mapDetails(point);});
  const labels={back:'Back',fit:'Fit',zoomOut:'-',zoomIn:'+',west:'<',east:'>',north:'N',south:'S',dimension:'Dimension',refresh:'Refresh'};
  for(const [key,text]of Object.entries(labels))records[layout[key]]=text;
  if(snapshot.pageCount>1)records[layout.nextPage]=`POI page ${snapshot.page+1}/${snapshot.pageCount} >`;
  const b=snapshot.bounds;
  layout.xTicks.forEach((index,i)=>{
    records[index]=`X ${Math.round(b.minX+(b.maxX-b.minX)*i/(layout.xTicks.length-1))}`;
  });
  layout.zTicks.forEach((index,i)=>{
    records[index]=String(Math.round(b.minZ+(b.maxZ-b.minZ)*i/(layout.zTicks.length-1)));
  });
  const provinceMarkers=snapshot.viewport.dimension==='minecraft:overworld'?
   provinceLinePixels(b.minX,b.maxX,layout.width).map(x=>`[JF:province:x:${x}]`).join('')+
   provinceLinePixels(b.minZ,b.maxZ,layout.height).map(z=>`[JF:province:z:${z}]`).join(''):'';
  const form=new ActionFormData().title(pageTitle('SettlementMap')).body(provinceMarkers);
  records.forEach((text,index)=>form.button(text,snapshot.cells[index]?.[0]?.texture));
  const show=(next=snapshot.viewport,selection=selectedId)=>openSettlementMap(player,vid,next,selection,returnView);
  displayMenu(player,form,system).then(response=>{
   if(response.canceled)return;
   const index=response.selection;
   // Marker records are data-only. Hover/focus never submits or replaces a form.
   if(index<layout.cells)return;
   if(index===layout.nextPage&&snapshot.pageCount>1){
    show({...snapshot.viewport,page:(snapshot.page+1)%snapshot.pageCount});return;
   }
   const action=Object.keys(labels).find(key=>layout[key]===index);
   if(action==='back'){reopenView(player,vid,{...returnView,page:'Diplomacy'});return;}
   if(action==='fit'){show({dimension:snapshot.viewport.dimension});return;}
   if(action==='dimension'){
    const next=snapshot.dimensions[(snapshot.dimensions.indexOf(snapshot.viewport.dimension)+1)%snapshot.dimensions.length];
    show({dimension:next});return;
   }
   if(action==='refresh'){show({...snapshot.viewport,page:snapshot.page});return;}
   if(action)show(moveMap(snapshot.viewport,action));
  }).catch(error=>{console.warn(`Frontier map: ${error}`);player.sendMessage('§cSettlement Map could not open. Please reopen the charter.');});
 }catch(error){console.warn(`Frontier map: ${error}`);player.sendMessage('§cSettlement Map could not load. Please reopen the charter.');}
}

let poiSurveyRunning=false;
world.afterEvents.playerEmote?.subscribe(({player,personaPieceId})=>{
 if(personaPieceId.toLowerCase()!==CLAPPING_EMOTE)return;
 const {dimension,location}=player;
 if(dimension.id!=='minecraft:overworld')return;
 if(poiSurveyRunning){player.sendMessage('A landmark survey is already running.');return;}
 const discovered=readSurveyedPois(world);
 const survey=surveyLoadedPois(dimension,location,BlockVolume,discovered,position=>wasPoiPlaced(world,position),type=>Boolean(BlockTypes.get(type)));
 player.sendMessage(`Surveying loaded landmarks within ${POI_RADIUS} blocks…`);
 poiSurveyRunning=true;
 const advance=()=>{
  try{
   const step=survey.next();
   if(!step.done){system.run(advance);return;}
   if(step.value)world.setDynamicProperty(POI_KEY,JSON.stringify(discovered));
   poiSurveyRunning=false;
   if(player.isValid)player.sendMessage(step.value?`Added ${step.value} landmark pin(s) to the Settlement Map.`:'No new landmarks found in the loaded survey area.');
  }catch(error){
   poiSurveyRunning=false;
   console.warn(`Frontier landmark survey: ${error}`);
   try{player.sendMessage('The landmark survey could not finish.');}catch{/* Player left. */}
  }
 };
 system.run(advance);
});

function openProduction(player,vid,scope='summary',pages={}){open(player,vid,'Production','global',0,'roads',scope==='biomes'?'biomes':'summary',pages);}
async function renameSettlement(player,vId,view={}){
  const current=state().villages[vId];if(!current)return;
  const form=new ModalFormData().title(pageTitle('Rename'))
    .textField('Settlement name (1–24 characters)','Settlement name',{defaultValue:current.name})
    .submitButton('Save name');
  try{
    const response=await displayMenu(player,form,system);
    if(!response.canceled){
      const name=settlementName(response.formValues?.[0]);
      if(!name){player.sendMessage('§eUse 1–24 characters, without line breaks or formatting codes.');}
      else{
        const latest=state();if(!latest.villages[vId])return;
        latest.villages[vId].name=name;save(latest);
      }
    }
    reopenView(player,vId,view);
  }catch(e){console.warn(`Frontier rename: ${e}`);player.sendMessage('§cSettlement name could not be saved.');}
}
async function surveySettlement(player,vid,view={}){
 let job=pendingSurveys.get(vid);
 if(!job){
  job=Promise.resolve().then(async()=>{
   await refreshVillage(vid);
   return surveyVillage(vid);
  });
  pendingSurveys.set(vid,job);
 }
 try{await job;player.sendMessage('§aVillager and biome survey updated.');}
 catch(e){console.warn(`Frontier survey: ${e}`);player.sendMessage('§cSurvey could not finish. Try Survey again.');}
 finally{if(pendingSurveys.get(vid)===job)pendingSurveys.delete(vid);}
 open(player,vid,view.page||'Overview',view.researchScope||'local',view.realmPage||0,view.realmScope||'roads',view.productionScope||'summary',view.productionPages||{});
}
function surveyVillage(vid){const s=accounted(),v=s.villages[vid];if(!v)return;
  if(v.dimension!=='minecraft:overworld')return;
  const dim=world.getDimension(v.dimension), seen=new Set(v.available||[]);
  // Scan only loaded positions in a lattice. Unloaded positions are not treated as nonexistent.
  let successful=0;v.biomeSamples??={};
  for(let dx=-256;dx<=256;dx+=32)for(let dz=-256;dz<=256;dz+=32){
    if(dx*dx+dz*dz>256*256)continue;
    try{
      const x=v.location.x+dx,z=v.location.z+dz,top=dim.getTopmostBlock?.({x,z});
      const sample={x,y:top?Math.min(319,top.location.y+1):v.location.y,z};
      const biome=canonicalBiome(dim.getBiome(sample).id);
      if(!eligibleBiome(biome))continue;
      seen.add(biome);v.biomeSamples[biome]=sample;successful++;
    }catch(e){} // Unloaded columns stay undiscovered; never force a chunk load.
  }
  v.available=[...seen].filter(x=>x!==v.biome).sort();save(s);
  return {successful,biomes:v.available.length};
}
function productionSelection(v,choice,mode){
 if(!['specialize','diversify'].includes(mode))throw Error('Choose specialization or diversification.');
 const native=canonicalBiome(v.nativeBiome??v.biome);
 if(!v.biomeUnlocked||v.dimension!=='minecraft:overworld'||!eligibleBiome(choice))throw Error('Unlock Resource Prospecting in an eligible Overworld settlement first.');
 if(mode==='specialize'){
  if(choice!==native||!eligibleBiome(native))throw Error('Native specialization is unavailable for this biome.');
 }else{
  const sample=v.biomeSamples?.[choice];
  if(choice===native||!v.available?.includes(choice)||!sample||Math.hypot(sample.x-v.location.x,sample.z-v.location.z)>256)throw Error('Explore nearby and reopen the charter to verify that surface biome.');
 }
 return {...v,productionMode:mode,secondary:mode==='specialize'?null:choice};
}
function selectBiome(player,vid,choice,pages={},mode='diversify',view){
 try{
  const v=state().villages[vid];if(!v)return;
  applyProductionSelection(player,vid,choice,mode,v.productionSelectionRevision||0);
 }catch(e){player.sendMessage(String(e.message||e));}
 reopenView(player,vid,{...view,page:'Production',productionScope:'biomes',productionPages:pages});
}
function applyProductionSelection(player,vid,choice,mode,revision){
 const s=accounted(),v=s.villages[vid];if(!v)return;
 if((v.productionSelectionRevision||0)!==revision)throw Error('Production selection changed. Reopen the charter.');
 const proposed=productionSelection(v,choice,mode);
 if(mode==='diversify'){
  const actual=canonicalBiome(world.getDimension(v.dimension).getBiome(v.biomeSamples[choice]).id);
  if(actual!==choice)throw Error('That sample must be loaded and still match the selected biome.');
 }
 v.secondary=proposed.secondary;v.productionMode=mode;v.productionSelectionRevision=revision+1;save(s);
}
function clearSecondary(player,vid,pages={},view){
 const s=accounted(),v=s.villages[vid];if(!v)return;v.secondary=null;v.productionMode='unassigned';v.productionSelectionRevision=(v.productionSelectionRevision||0)+1;save(s);reopenView(player,vid,{...view,page:'Production',productionScope:'biomes',productionPages:pages});
}
function collect(player,vid,pages={},view){const s=accounted();const inv=player.getComponent('minecraft:inventory')?.container;if(!inv)return;
 let moved=0;for(const [type,qty] of Object.entries(s.stock)){let remain=Math.floor(qty);const fraction=qty-remain;while(remain>0){const n=Math.min(64,remain);try{const left=inv.addItem(new ItemStack(type,n));const count=n-(left?.amount||0);if(count<=0)break;remain-=count;moved+=count;if(left)break;}catch(e){break;}}s.stock[type]=remain+fraction;if(!s.stock[type])delete s.stock[type];}
 save(s);player.sendMessage(`§aCollected ${moved} items. Remaining stockpile: ${total(s)}/${cap(s)}.`);reopenView(player,vid,{...view,page:'Production',productionScope:'summary',productionPages:pages});}
system.beforeEvents.startup.subscribe(ev=>{
  ev.blockComponentRegistry.registerCustomComponent('jagsby_frontier:charter_spacing',{
    beforeOnPlayerPlace(event){
      // Read only: dynamic-property writes and chat are deferred outside this event.
      const saved=JSON.parse(world.getDynamicProperty(KEY)||'{}');
      preventClosePlacement(event,saved,callback=>system.run(callback));
    }
  });
});
world.afterEvents.playerPlaceBlock.subscribe(ev=>{rememberPoiPlacement(world,ev.block,ev.block.typeId,true);if(ev.block.typeId!==BLOCK)return;let s=accounted();
(s.placedCharters??={})[charterKey(ev.block.dimension.id,ev.block.location)]={dimension:ev.block.dimension.id,location:{...ev.block.location}};save(s);const v=addVillage(s,ev.block,ev.player);if(!v)return;ev.player.sendMessage('§6Village Charter established. Use Survey to refresh villagers and discover nearby biomes.');});
const pendingCharterInteractions=new Set();
world.beforeEvents.playerInteractWithBlock.subscribe(ev=>{
  if(ev.block.typeId!==BLOCK)return;
  // Custom decorative blocks need not complete a vanilla interaction. Handle
  // the attempted interaction, and prevent held items from placing/using here.
  ev.cancel=true;
  // Holding interact emits additional events. One press opens one charter.
  if(ev.isFirstEvent===false)return;
  const player=ev.player,dim=ev.block.dimension,location={...ev.block.location};
  const pendingKey=`${player.id}|${dim.id}|${id(location)}`;
  if(pendingCharterInteractions.has(pendingKey))return;
  pendingCharterInteractions.add(pendingKey);
  system.run(()=>{
    try{
      const block=dim.getBlock(location);
      if(block?.typeId!==BLOCK)return;
      recoverResearch(player);
      let s=accounted(),v=addVillage(s,block,player);
      if(!v)return;
      open(player,v.id);
    }catch(e){console.warn(`Frontier charter interaction: ${e}`);player.sendMessage(String(e).includes('catching up')?'Production is catching up. Interact with the charter again to continue.':'§cThe Village Charter could not open. Check the Minecraft content log for Frontier charter errors.');}
    finally{pendingCharterInteractions.delete(pendingKey);}
  });
});
world.afterEvents.playerBreakBlock.subscribe(ev=>{rememberPoiPlacement(world,ev.block,ev.brokenBlockPermutation.type.id,false);if(ev.brokenBlockPermutation.type.id!==BLOCK)return;const s=accounted(),legacy=id(ev.block.location);if(s.placedCharters){delete s.placedCharters[charterKey(ev.block.dimension.id,ev.block.location)];save(s);}if(s.pendingResearch?.scope==='local'&&[legacy,`${ev.block.dimension.id}|${legacy}`].includes(s.pendingResearch.vid)){ev.player.sendMessage('Research payment recovery is pending. Replace this charter and reopen it before removing the settlement.');return;}delete s.villages[`${ev.block.dimension.id}|${legacy}`];if(s.villages[legacy]?.dimension===ev.block.dimension.id)delete s.villages[legacy];for(const [key,road]of Object.entries(s.roads||{}))if(!s.villages[road.from]||!s.villages[road.to])delete s.roads[key];save(s);});
// Player-only buffs are refreshed every six seconds. Villagers are queried
// at most once per in-game day, only around an occupied loaded settlement.
system.runInterval(()=>{
 const s=state(),day=Math.floor(gameTick()/24000);let changed=false;
 const healing=new Map();
 for(const player of world.getPlayers())try{
  for(const v of refreshProtection(player,s.villages,Date.now(),s.global?.innovation??Infinity))if(v.hearth>=1&&v.lastHealDay!==day)healing.set(v.id,v);
 }catch(e){console.warn(`Frontier protection: ${e}`);}
 for(const v of healing.values())try{
  const dim=world.getDimension(v.dimension);
  for(const entity of dim.getEntities({location:v.location,maxDistance:ECONOMY_CONFIG.protectionRadius,families:['villager']}))healVillager(entity,day);
  v.lastHealDay=day;changed=true;
 }catch(e){console.warn(`Frontier daily healing: ${e}`);}
 if(changed)save(s);
},120);
world.beforeEvents.entityHurt?.subscribe(protectDamage);
world.afterEvents.worldLoad?.subscribe(()=>{try{accounted();}catch(e){console.warn(String(e));}});

function roadNetworkOverview(s,v){
 const connections=Object.entries(s.roads||{}).filter(([,r])=>[r.from,r.to].includes(v.id))
  .map(([roadId,road])=>({roadId,road,target:s.villages[road.from===v.id?road.to:road.from]})).filter(entry=>entry.target)
  .sort((a,b)=>a.target.id.localeCompare(b.target.id));
 const selected=selectedTradeRoutes(s);
 const active=connections.filter(({roadId,road})=>roadId===selected[v.id]&&road.level&&!road.targetLevel).length;
 const building=connections.filter(({road})=>road.targetLevel&&!road.paused).length;
 const paused=connections.filter(({road})=>road.targetLevel&&road.paused).length;
 const rows=connections.map(({roadId,road,target})=>{
  const tier=['','trail','road','highway'][road.level];
  const ticksLeft=roadTicksRemaining(road,gameTick());
  const remainingDays=Math.ceil(ticksLeft/24000*100)/100;
  const nextTier=['none','trail','road','highway'][road.targetLevel||0];
  const status=road.targetLevel?`${road.paused?'Paused: ':''}${road.level?'Upgrading':'Building'} ${['','Trail','Road','Highway'][road.targetLevel]}`:['Unbuilt','Trail','Road','Highway'][road.level];
  const quote=travelQuote(road,v);
  const cost=quote.canTravel?corndogCost(quote.foodPoints):'Unavailable';
  const time=road.targetLevel?(road.paused?'Paused':`> ${Number(remainingDays.toFixed(2))} days`):'';
  const name=target.name,owner=ownerName(target),distance=`${Math.round(road.distance)} blocks`;
  const text=`§6${name}§r\n${owner} · ${distance}\nTravel cost: ${cost}\n${status}${time?'\n'+time:''}`;
  return {roadId,canTravel:quote.canTravel,name,owner,distance,cost,status,remainingDays,time,
   villageTexture:settlementTier(target.census).iconTexture,
   texture:tier?`textures/ui/frontier/road_icons/${tier}`:undefined,
   nextTexture:road.targetLevel?`textures/ui/frontier/road_icons/${nextTier}`:undefined,
   text:text+(road.level?'':'\nNo road built yet')};
 });
 return {rows,summary:`Road Networks | ${active} sending, ${building} building, ${paused} paused`,details:rows.map(row=>row.text).join('\n')||'No connections yet. Establish a road from My Settlements or All Settlements after researching Road Networks I.'};
}
// An older map session may have saved disabled movement permissions. Restore
// only recorded categories once; no map navigation, terrain reads or HUD remains.
function restoreLegacyControls(player){
 const key='jagsby_frontier:map_permissions',raw=player.getDynamicProperty(key);if(!raw)return;
 try{
  const previous=JSON.parse(raw);
  for(const [category,enabled]of Object.entries(previous))player.inputPermissions.setPermissionCategory(Number(category),enabled);
  player.setDynamicProperty(key,undefined);player.onScreenDisplay?.setTitle('');
 }catch(e){console.warn(`Frontier legacy controls: ${e}`);}
}
world.afterEvents.playerSpawn?.subscribe(({player})=>restoreLegacyControls(player));
world.afterEvents.worldLoad?.subscribe(()=>{for(const player of world.getPlayers())restoreLegacyControls(player);});

async function roadMenu(player,vid){
 try{
  const s=accounted(),v=s.villages[vid];if(!v)return;
  const options=[];
  const add=(caption,run)=>options.push({caption,run});
  if(v.roads<3)add('Contribute to Road Networks research',()=>open(player,vid,'Research','local'));
  for(const target of Object.values(s.villages).sort((a,b)=>a.id.localeCompare(b.id))){
   if(target.id===vid||target.dimension!==v.dimension)continue;
   const entry=Object.entries(s.roads).find(([,r])=>(r.from===vid&&r.to===target.id)||(r.to===vid&&r.from===target.id));
   const roadId=entry?.[0],road=entry?.[1];
   if(!road){if(v.roads)add(`Establish Trail to ${target.name}`,()=>buildRoad(player,vid,target.id));}
   else{
    const name=['Unbuilt','Trail','Road','Highway'][road.level];
    const selected=selectedTradeRoutes(s)[vid]===roadId;
    if(v.roads)add(`${selected?'Stop sending trade route to':'Send trade route to'} ${target.name}`,()=>changeTradeRoute(player,vid,selected?null:roadId));
    if(road.targetLevel){
     const done=Math.max(0,Math.min(100,100*(1-roadTicksRemaining(road,gameTick())/road.durationTicks)));
     if(road.paused&&road.constructionFrom===vid)add(`Resume construction to ${target.name} (${done.toFixed(1)}%)`,()=>buildRoad(player,vid,target.id));
     else add(`${target.name}: ${road.paused?'paused':'building'} level ${road.targetLevel} (${done.toFixed(1)}%)`,()=>roadMenu(player,vid));
    }else if(road.level<3&&v.roads)add(`Upgrade ${name} to ${target.name}`,()=>buildRoad(player,vid,target.id));
    const quote=travelQuote(road,v);if(quote.canTravel)add(`Travel to ${target.name}: ${corndogCost(quote.foodPoints)}`,()=>travelRoad(player,vid,road.id));
   }
  }
  add('Back to Road Networks',()=>open(player,vid,'Realm','global',0,'roads'));
  const form=new ActionFormData().title(pageTitle('Roads')).body('Connections / construction / food-powered travel');
  options.forEach(o=>form.button(o.caption));
  const response=await displayMenu(player,form,system);
  if(!response.canceled)options[response.selection]?.run();
  else open(player,vid,'Realm','global',0,'roads');
 }catch(e){player.sendMessage(String(e));}
}
function changeTradeRoute(player,vid,roadId,directoryScope){
 try{
  const s=accounted(),v=s.villages[vid];
  if(!v||!within(player,v))throw Error('Stand inside the source settlement to change its trade route.');
  if(directoryScope&&!s.roads[roadId]?.level)throw Error('That road is no longer connected.');
  const road=selectTradeRoute(s,vid,roadId,gameTick());save(s);
  const target=road?s.villages[road.from===vid?road.to:road.from]:null;
  player.sendMessage(target?`Now sending a trade route to ${target.name}.`:'Outgoing trade route stopped; construction progress is saved.');
 }catch(e){player.sendMessage(String(e.message||e));}
 if(directoryScope)open(player,vid,'Realm','global',0,directoryScope);
 else roadMenu(player,vid);
}
function establishDirectoryRoad(player,vid,targetId,page,scope){
 try{
  const s=accounted(),source=s.villages[vid],target=s.villages[targetId];
  if(!source||!target)throw Error('That settlement is no longer available.');
  if(!within(player,source))throw Error('Stand inside the source settlement to establish a road.');
  const status=directoryRoadState(source,target,s.roads);
  if(!status.canEstablish)throw Error(status.status.replace('\n',' '));
  startRoad(s,vid,targetId,gameTick());save(s);
  player.sendMessage(`Trail construction to ${target.name} started: 6 Minecraft days until completion.`);
 }catch(e){player.sendMessage(String(e.message||e));}
 open(player,vid,'Realm','global',page,scope);
}
function buildRoad(player,vid,target){
 try{const s=accounted(),v=s.villages[vid];if(!v||!within(player,v))throw Error('Stand inside the source settlement to manage roads.');
  const road=startRoad(s,vid,target,gameTick());save(s);
  player.sendMessage(`Construction active: ${Number((roadTicksRemaining(road,gameTick())/24000).toFixed(2))} Minecraft days remaining. Previous construction is paused.`);
 }catch(e){player.sendMessage(String(e));}
 roadMenu(player,vid);
}
function travelRoad(player,vid,roadId){
 try{
  const s=accounted(),v=s.villages[vid],road=s.roads[roadId];
  if(!v||!within(player,v)||!road?.level||![road.from,road.to].includes(vid))throw Error('No completed route from this settlement.');
  const quote=travelQuote(road,v);if(!quote.canTravel)throw Error(quote.reason);
  const target=s.villages[road.from===vid?road.to:road.from];if(!target)throw Error('Destination no longer exists.');
  const inventory=player.getComponent('minecraft:inventory')?.container;if(!inventory)throw Error('Inventory unavailable.');
  const items=[];for(let slot=0;slot<inventory.size;slot++){const item=inventory.getItem(slot);if(item)items.push({slot,typeId:item.typeId,amount:item.amount});}
  const plan=foodPlan(items,quote.foodPoints);if(!plan)throw Error(`Need ${corndogCost(quote.foodPoints)} worth of food. Bread is worth 2.5 corndogs each.`);
  spendFoodAndTravel(inventory,plan,()=>player.teleport({x:target.location.x+0.5,y:target.location.y+1,z:target.location.z+0.5},{dimension:world.getDimension(target.dimension)}));
  player.sendMessage(`Arrived at ${target.name}.`);
 }catch(e){player.sendMessage(String(e));}
}
