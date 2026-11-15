import { world, system, ItemStack } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { nearbyVillagers, summarizeVillagers } from "./village-census.js";
import { sampleTradingRanks } from "./villager-trade-bridge.js";
import { CHARTER_LAYOUT } from "./charter-layout.js";
import { settlementName, biomeName, powerValue } from "./settlement-overview.js";
import { settlementTier } from "./settlement-tiers.js";
import { ownerName, ownerRecord, claimSettlement, settlementDirectory } from "./settlement-realm.js";
import { displayMenu } from "./menu-display.js";

import { createSharedMap } from "./realm-map.js";

const sharedMap=createSharedMap(world);
const BLOCK = "jagsby_frontier:village_charter";
const KEY = "jagsby_frontier:state_v1";
const BIOME_RADIUS = 256;
import {DEFINITIONS,ZONES,zoneAt,maxLevel,nextCost,acceptedMaterials,lockReason,contribution,applyContribution,settlementLimit,foundingReason,storageIncrement,localLevel,colonizationBonus} from "./global-research.js";
import {ECONOMY_CONFIG} from "./economy-config.js";
import {accountEconomy,development,resourceRates,capacity,stockTotal,researchCost,researchLevel,researchRequirement,startRoad,completeRoads,foodCost,foodPlan,spendFoodAndTravel,routeRates,recordedPower} from "./settlement-economy.js";
import {refreshProtection,protectDamage,within,healVillager} from "./settlement-effects.js";
import {createMapNavigation} from "./map-navigation.js";
const RESOURCE_TABLE=ECONOMY_CONFIG.resources;
const roadTimers=new Map();
const mapNavigation=createMapNavigation(world,system,sharedMap,state,(player,vid)=>open(player,vid,'Realm','local',0,'map'));
function gameTick(){return world.getAbsoluteTime?.()??0;}
function accounted(){
 const s=state(),result=accountEconomy(s);
 if(!result.complete){save(s);throw Error('Offline accounting is catching up; reopen the charter to continue.');}
 completeRoads(s,gameTick());save(s);return s;
}
function scheduleRoads(s){
 for(const [id,job]of roadTimers){
  const road=s.roads?.[id];
  if(!road?.targetLevel||road.finishTick!==job.finishTick){system.clearRun(job.handle);roadTimers.delete(id);}
 }
 for(const road of Object.values(s.roads||{}))if(road.targetLevel&&!roadTimers.has(road.id)){
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
  const biome=getBiome(dim,initial.location);
  let census;
  try{
    const villagers=nearbyVillagers(dim,initial.location);
    const readTier=await sampleTradingRanks(villagers,system);
    census=summarizeVillagers(villagers,readTier);
  }catch(e){census={error:true,observedAt:Date.now()};console.warn(`Frontier census: ${e}`);}
  // Re-read after awaiting native properties so another player's research or
  // collection cannot be overwritten by a stale survey state.
  const latest=accounted(),v=latest.villages[vId];if(!v)return;
  if(biome!=='unknown')v.biome=biome;
  if(!census.error){v.productionPower=(Number.isFinite(census.realmPowerTenths)?census.realmPowerTenths:census.minimumPowerTenths)/10;v.productionPowerIsMinimum=census.realmPowerTenths===null;}
  v.census=census;save(latest);
  if(!census.error)console.log(`[Frontier census] villagers=${census.villagers} power_tenths=${census.realmPowerTenths} unknown_ranks=${census.unknownRanks}`);
}
function addVillage(s,block,creator){const legacy=id(block.location),k=`${block.dimension.id}|${legacy}`;
if(!s.villages[k]&&s.villages[legacy]?.dimension===block.dimension.id){s.villages[k]=s.villages[legacy];s.villages[k].id=k;delete s.villages[legacy];save(s);}
if(!s.villages[k]){
  const reason=foundingReason(s,zoneAt(block.location));
  if(reason){creator?.sendMessage('§e'+reason);return null;}
  s.villages[k]={id:k,location:{...block.location},dimension:block.dimension.id,name:`Settlement ${Object.keys(s.villages).length+1}`,owner:creator?ownerRecord(creator):null,biome:getBiome(block.dimension,block.location),secondary:null,available:[],efficiency:0,hearth:0,biomeUnlocked:false};save(s);
}return s.villages[k];}
function canPay(player,cost){const inv=player.getComponent("minecraft:inventory")?.container;if(!inv)return false;
  for(const [item,num] of Object.entries(cost)) {let count=0;for(let i=0;i<inv.size;i++){const it=inv.getItem(i);if(it?.typeId===item)count+=it.amount;}if(count<num)return false;}return true;}
function pay(player,cost){if(!canPay(player,cost))return false;const inv=player.getComponent("minecraft:inventory").container;
  for(const [item,num] of Object.entries(cost)){let left=num;for(let i=0;i<inv.size&&left>0;i++){const it=inv.getItem(i);if(it?.typeId!==item)continue;const take=Math.min(left,it.amount);left-=take;if(take===it.amount)inv.setItem(i,undefined);else{it.amount-=take;inv.setItem(i,it);}}}return true;}
function costText(c){return Object.entries(c||{}).map(([k,v])=>`${v} ${k.replace('minecraft:','').replaceAll('_',' ')}`).join(' + ')||'Maxed';}
function cap(s){return capacity(s);}
function total(s){return stockTotal(s);}
function pageTitle(page){return `JF_CHARTER|${page}`;}
function researchText(s,v,key,player){
 const names={efficiency:'Prosperity',hearth:'Hearthstone',biome:'Resource Prospecting',sanctuary:'Sanctuary',roads:'Road Networks',frontier:'Frontier Expansion',capacity:'Settlement Charters',innovation:'Stewardship',colonization:'Colonization',storage:'Shared Storage'};
 const local=['efficiency','hearth','biome','sanctuary','roads'].includes(key);
 if(!local)return globalResearchText(s,key);
 const current=['efficiency','sanctuary'].includes(key)?localLevel(s,v,key):researchLevel(v,key);
 const cost=researchCost(v,key);
 const max=Array.isArray(ECONOMY_CONFIG.research[key])?ECONOMY_CONFIG.research[key].length:s.global.innovation;
 const benefits={efficiency:`Production: +${current*5}%. Next: +${(current+1)*5}%.`,hearth:'I: Regeneration I. II: villagers heal 2 HP/day.',biome:'One additional verified biome within 256 blocks.',sanctuary:`Hostile damage reduced by ${Math.min(99.9999,(1-0.95**current)*100).toFixed(4)}%. Persists 3 min.`,roads:'Manage Trail / Road / Highway connections.',frontier:'Unlock frontier establishment.',capacity:'Increase civilization settlement limit.',development:'Global research, separate from permanent local Development.',storage:`Shared capacity: ${cap(s)} items.`};
 let status=local?researchRequirement(v,key,s):null;
 if(!status)status=cost?(canPay(player,cost)?'Affordable':'Materials needed'):'Complete';
 if(key==='roads')status='Select for research / connections';
 return `§6${names[key]}§r ${current}/${max}\n${benefits[key]}\n${cost?'Trial cost: '+costText(cost):'No further research cost'}\n${status}`;
}
function productionText(s,v){
 const rates=resourceRates(v,s),points=development(v),bonus=colonizationBonus(s,zoneAt(v.location));
 const lifetime=Object.values(v.lifetimeProduced||{}).reduce((a,n)=>a+n,0);
 return `Primary: ${v.biome}\nSecondary: ${v.secondary||'None'}\nProduction RP: ${recordedPower(v).toFixed(1)}${v.productionPowerIsMinimum?' (minimum)':''}\nProsperity: +${localLevel(s,v,'efficiency')*5}%\nZone: ${zoneAt(v.location)}\nColonization: +${bonus*100}%\nDevelopment: ${points} (+${(points*0.1).toFixed(1)}%)\nProgress: ${((v.developmentValue||0)%500).toFixed(2)}/500\nLifetime produced: ${lifetime.toFixed(3)}\nResources / real-world hour:\n${rates.map(r=>`${r.name}: ${(r.rate*(1+bonus)).toFixed(4)}`).join('\n')||'No mapped biome resources'}\nRoad Development value/day: ${((routeRates(s)[v.id]||0)*86400000).toFixed(3)}\nRoads: ${Object.values(s.roads||{}).filter(r=>r.from===v.id||r.to===v.id).length} (manage in Local research)`;
}

function globalResearchText(s,key){
  const d=DEFINITIONS[key],level=s.global[key],cost=nextCost(s,key);
  const maximum=maxLevel(s,key),locked=lockReason(s,key);
  const benefits={
    innovation:`Maximum endless research level: ${level}. Next: ${level+1}.`,
    capacity:`Settlements: ${Object.keys(s.villages).length}/${settlementLimit(s)}. Next: ${settlementLimit(s)+1} slots.`,
    frontier:`Next zone: ${ZONES[level+2]||'All zones unlocked'}. Founding only; travel is unrestricted.`,
    colonization:ZONES.map((z,i)=>`${z}: ${i===0?0:i*10}%${i>level?' (locked)':''}`).join('\n'),
    storage:`Stockpile: ${total(s)}/${cap(s)} items. Next: +${storageIncrement()} items.`,
  };
  const resource=key==='capacity'?'Vanilla logs':key==='storage'?'Building materials':acceptedMaterials(s,key).map(x=>x.replace('minecraft:','').replaceAll('_',' ')).join(', ');
  return `${d.name} | Level ${level}${Number.isFinite(maximum)?' / '+maximum:' (endless)'}\n${benefits[key]}\n${cost===undefined?'Maximum level':`Next cost: ${cost} ${resource}\nContributed: ${s.researchProgress[key]}/${cost}`}\n${locked||'Unlocked'}\nPrerequisite: ${key==='innovation'?'Free foundation':d.prerequisite?DEFINITIONS[d.prerequisite].name+' I':'Stewardship I (free)'}`;
}
const researchSessions=new Map();
function inventoryMaterials(player,s,key){
  const inv=player.getComponent('minecraft:inventory')?.container;
  const counts=new Map();
  if(inv)for(let i=0;i<inv.size;i++){const item=inv.getItem(i);if(item&&acceptedMaterials(s,key).includes(item.typeId))counts.set(item.typeId,(counts.get(item.typeId)||0)+item.amount);}
  return [...counts];
}
async function researchDetails(player,vid,key){
  const session={};researchSessions.set(player.id,session);
  const s=state();
  if(s.pendingResearch){researchSessions.delete(player.id);player.sendMessage('§eA saved research payment needs recovery by its original contributor. Reopen their charter.');return;}
  const revision=s.researchRevision,choices=lockReason(s,key)?[]:inventoryMaterials(player,s,key);
  const form=new ActionFormData().title(pageTitle('Research')).body(globalResearchText(s,key));
  choices.forEach(([material,count])=>form.button(`Contribute ${contribution(s,key,material,count)} ${material.replace('minecraft:','').replaceAll('_',' ')}`));
  form.button('Back to global research');
  try{
    const response=await displayMenu(player,form,system);
    if(researchSessions.get(player.id)!==session)return;
    researchSessions.delete(player.id);
    if(!response.canceled&&choices[response.selection]){
      const latest=state();
      if(latest.researchRevision!==revision){player.sendMessage('§eResearch changed. Review the refreshed contribution.');return researchDetails(player,vid,key);}
      if(latest.pendingResearch)return;
      const material=choices[response.selection][0];
      const inv=player.getComponent('minecraft:inventory')?.container;
      if(!inv)return;
      let available=0;
      for(let slot=0;slot<inv.size;slot++){const item=inv.getItem(slot);if(item?.typeId===material)available+=item.amount;}
      let left=contribution(latest,key,material,Math.min(available,choices[response.selection][1]));
      if(!left)return researchDetails(player,vid,key);
      // Account old effects completely before recording a payment intent.
      const result=accountEconomy(latest);
      if(!result.complete){save(latest);throw Error('Offline accounting is catching up; reopen the charter to continue.');}
      const slots=[];const amount=left;
      for(let slot=0;slot<inv.size&&left;slot++){
        const item=inv.getItem(slot);if(item?.typeId!==material)continue;
        const take=Math.min(left,item.amount);slots.push({slot,before:item.amount,after:item.amount-take});left-=take;
      }
      // Persist intent BEFORE touching inventory. One pending world transaction.
      latest.pendingResearch={playerId:player.id,key,material,amount,slots};save(latest);
      recoverResearch(player);
    }
    open(player,vid,'Research','global');
  }catch(e){if(researchSessions.get(player.id)===session)researchSessions.delete(player.id);console.warn(`Frontier contribution: ${e}`);player.sendMessage('§cResearch payment paused. Reopen the charter to recover; do not move the payment items.');}
}
function recoverResearch(player){
  const s=state(),tx=s.pendingResearch;
  if(!tx||tx.playerId!==player.id)return;
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
  const result=accountEconomy(s);
  if(!result.complete){save(s);throw Error('Offline accounting is catching up; reopen the charter to continue.');}
  if(applyContribution(s,tx.key,tx.material,tx.amount)!==tx.amount)throw Error('Saved payment is inconsistent with research progress');
  delete s.pendingResearch;save(s);
  player.sendMessage(`§aContributed ${tx.amount} toward ${DEFINITIONS[tx.key].name}.`);
}

function open(player,vId,page='Overview',researchScope='global',realmPage=0,realmScope='map'){
  const s=accounted(),v=s.villages[vId];if(!v){player.sendMessage('§cVillage Charter not registered.');return;}
  const {data,actions,recordCount,tabs}=CHARTER_LAYOUT;
  const records=Array(recordCount).fill('');
  records[data.overview]=v.name;
  records[data.biomes]=biomeName(v.biome);
  const power=powerValue(v.census);
  records[data.census]=power==='Unavailable'?power:`${power} RP`;
  records[data.owner]=ownerName(v);
  const mine=settlementDirectory(s.villages,player,realmPage,true);
  const all=settlementDirectory(s.villages,player,realmPage,false);
  records[data.realmMine]=mine.text;
  records[data.realmAll]=all.text;
  const tier=settlementTier(v.census);
  records[data.tier]=tier.label;
  for(const key of ['efficiency','hearth','biome','sanctuary','roads','frontier','capacity','innovation','colonization','storage'])records[data[key]]=key in DEFINITIONS?`${DEFINITIONS[key].name}: ${s.global[key]} / ${Number.isFinite(maxLevel(s,key))?maxLevel(s,key):'Endless'}\nNext cost: ${nextCost(s,key)??'Complete'}\nContributed: ${s.researchProgress[key]}\n${lockReason(s,key)||'Unlocked'}\nSelect for materials and benefits.`:researchText(s,v,key,player);
  records[data.zone]=zoneAt(v.location)||'Unknown';
  records[data.developmentValue]=`${development(v)} (+${(development(v)*0.1).toFixed(1)}%)`;
  records[data.developmentProgress]=`${((v.developmentValue||0)%500).toFixed(1)} / 500 to next point`;
  for(const key of ['innovation','frontier','capacity','colonization','storage','hearth','biome','sanctuary','efficiency','roads']){
    const level=key in DEFINITIONS?s.global[key]:['efficiency','sanctuary'].includes(key)?localLevel(s,v,key):researchLevel(v,key);
    records[data[key+'Level']]=`Level ${level}`;
  }
  records[data.production]=productionText(s,v);
  records[data.stockpile]=`Stored: ${total(s).toFixed(3)} / ${cap(s)}\nRemaining capacity: ${Math.max(0,cap(s)-total(s)).toFixed(3)}\nProduced resources only; shared by every settlement.`;
  records[data.resources]=Object.entries(s.stock).map(([r,n])=>`${r.replace('minecraft:','').replaceAll('_',' ')}: ${n.toFixed(3)}`).join('\n')||'No produced resources yet.';
  // Initial charter opening carries no map rasterization or hundreds of tiles.
  let mapFrame={rows:Array(12).fill(''),info:'Press Refresh to load the shared biome map.'};
  if(page==='Realm'&&realmScope==='map')try {
    mapFrame=sharedMap.render(sharedMap.view(player,v),s.villages,player,vId);
  } catch(e) {
    mapFrame.info='Map unavailable; refresh to retry.';
    console.warn(`Frontier map: ${e}`);
  }
  records[data.mapInfo]=mapFrame.info;
  for(let row=0;row<12;row++)records[data['mapRow'+row]]=mapFrame.rows[row];
  const handlers=new Map();
  for(const command of ['North','South','West','East','ZoomIn','ZoomOut','Center','Dimension','Refresh']) {
    handlers.set(actions['map'+command],()=>{
      sharedMap.view(player,v,command[0].toLowerCase()+command.slice(1));
      open(player,vId,'Realm','local',0,'map');
    });
  }
  handlers.set(actions.mapInteractive,()=>mapNavigation.open(player,vId));
  for(const key of Object.keys(DEFINITIONS))handlers.set(actions[key],()=>researchDetails(player,vId,key));
  for(const key of ['efficiency','hearth','biome','sanctuary','roads'])handlers.set(actions[key],()=>localResearchDetails(player,vId,key));
  handlers.set(actions.scan,()=>scan(player,vId));
  handlers.set(actions.selectBiome,()=>selectBiome(player,vId));
  handlers.set(actions.collect,()=>collect(player,vId));
  handlers.set(actions.rename,()=>renameSettlement(player,vId));
  handlers.set(actions.claim,()=>{const latest=state();if(claimSettlement(latest,vId,player))save(latest);open(player,vId);});
  for(const [scope,directory]of [['mine',mine],['all',all]]){
    handlers.set(actions[scope+'Prev'],()=>open(player,vId,'Realm','global',directory.page-1,scope));
    handlers.set(actions[scope+'Next'],()=>open(player,vId,'Realm','global',directory.page+1,scope));
  }
  for(const [key,index] of Object.entries(actions))records[index]=`[JF:action:${key}]`;
  for(const [key,index] of Object.entries(data))if(key!=='census')records[index]=`[JF:data:${key}]${records[index]}`;
  const tab=tabs.includes(page)?page.toLowerCase():'overview';
  // Records transport village data to Frontier's own custom JSON UI
  // controls. Local toggle tabs do not submit forms or rerun the village census.
  const form=new ActionFormData().title(pageTitle('Dashboard')).body(`[JF:tab:${tab}][JF:research:${researchScope}][JF:realm:${realmScope}]${v.owner?'':'[JF:unclaimed]'}`);
  records.forEach((text,index)=>form.button(text,index===data.tier?tier.texture:undefined));
  displayMenu(player,form,system).then(r=>{if(!r.canceled){const handler=handlers.get(r.selection);if(handler)handler();else{console.warn(`Frontier unmapped action: ${r.selection}`);player.sendMessage('§eThe charter did not recognize that action. Please reopen it.');}}}).catch(e=>{console.warn(`Frontier menu: ${e}`);player.sendMessage('§cThe Village Charter menu could not open. Check the Minecraft content log for Frontier menu errors.');});
}
async function renameSettlement(player,vId){
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
    open(player,vId);
  }catch(e){console.warn(`Frontier rename: ${e}`);player.sendMessage('§cSettlement name could not be saved.');}
}
const localResearchSessions=new Map();
async function localResearchDetails(player,vid,key){
 const session={};localResearchSessions.set(player.id,session);
 try{
  const s=accounted(),v=s.villages[vid];if(!v){localResearchSessions.delete(player.id);return;}
  const level=researchLevel(v,key),cost=researchCost(v,key),requirement=researchRequirement(v,key,s);
  const options=[];
  if(cost&&!requirement)options.push({caption:'Research next level: '+costText(cost),run:()=>upgrade(player,vid,key,level)});
  if(key==='roads')options.push({caption:'Manage connections / travel',run:()=>roadMenu(player,vid)});
  options.push({caption:'Back to Local Research',run:()=>open(player,vid,'Research','local')});
  const form=new ActionFormData().title(pageTitle('Local Research'))
   .body(researchText(s,v,key,player)+'\nPayment: player inventory. Prices are provisional.');
  options.forEach(option=>form.button(option.caption));
  const response=await displayMenu(player,form,system);
  if(localResearchSessions.get(player.id)!==session)return;
  localResearchSessions.delete(player.id);
  if(!response.canceled)options[response.selection]?.run();
  else open(player,vid,'Research','local');
 }catch(e){
  if(localResearchSessions.get(player.id)===session)localResearchSessions.delete(player.id);
  console.warn(`Frontier local research: ${e}`);player.sendMessage('Local research could not open. Reopen the charter to retry.');
 }
}
function upgrade(player,vid,key,expectedLevel){
 const s=accounted(),v=s.villages[vid];if(!v)return;
 if(expectedLevel!==undefined&&researchLevel(v,key)!==expectedLevel){player.sendMessage('Research changed. Review the refreshed cost.');return localResearchDetails(player,vid,key);}
 const requirement=researchRequirement(v,key,s),cost=researchCost(v,key);
 if(requirement)player.sendMessage(requirement);
 else if(!cost)player.sendMessage('Already at maximum level.');
 else if(!pay(player,cost))player.sendMessage('Insufficient materials: '+costText(cost));
 else{if(key==='biome')v.biomeUnlocked=true;else v[key]=(v[key]||0)+1;save(s);player.sendMessage('Research complete.');}
 open(player,vid,'Research','local');
}

function scan(player,vid){const s=accounted(),v=s.villages[vid];if(!v)return;
  const dim=world.getDimension(v.dimension), seen=new Set(v.available||[]);
  // Scan only loaded positions in a lattice. Unloaded positions are not treated as nonexistent.
  let successful=0;v.biomeSamples??={};
  for(let dx=-256;dx<=256;dx+=32)for(let dz=-256;dz<=256;dz+=32){if(dx*dx+dz*dz>256*256)continue;try{const b=dim.getBiome({x:v.location.x+dx,y:v.location.y,z:v.location.z+dz});seen.add(b.id);v.biomeSamples[b.id]={x:v.location.x+dx,y:v.location.y,z:v.location.z+dz};successful++;}catch(e){}}
  v.available=[...seen].filter(x=>x!==v.biome).sort();save(s);
  player.sendMessage(`§aSurveyed ${successful} loaded samples; found ${v.available.length} additional biomes. Survey again after exploring the surrounding chunks.`);
  open(player,vid,'Production');
}
function selectBiome(player,vid){const s=accounted(),v=s.villages[vid];if(!v.biomeUnlocked){player.sendMessage('§cResearch Resource Prospecting first.');return open(player,vid,'Production');}
  const options=v.available.filter(b=>RESOURCE_TABLE[b]);if(!options.length){player.sendMessage('§eNo supported secondary biomes yet. Survey the surrounding region and check RESOURCE_TABLE.');return open(player,vid,'Production');}
  const form=new ActionFormData().title(pageTitle('Select Biome')).body('Choose ONE additional biome.');options.forEach(b=>form.button(b));displayMenu(player,form,system).then(r=>{if(!r.canceled&&options[r.selection]){const st=accounted();if(!st.villages[vid])return;const current=st.villages[vid],choice=options[r.selection],sample=current.biomeSamples?.[choice];
if(!sample||Math.hypot(sample.x-current.location.x,sample.z-current.location.z)>256||world.getDimension(current.dimension).getBiome(sample).id!==choice){player.sendMessage('Survey again: the selected biome needs a loaded verified sample.');return open(player,vid,'Production');}
current.secondary=choice;save(st);}open(player,vid,'Production');}).catch(e=>console.warn(String(e)));
}
function collect(player,vid){const s=accounted();const inv=player.getComponent('minecraft:inventory')?.container;if(!inv)return;
 let moved=0;for(const [type,qty] of Object.entries(s.stock)){let remain=Math.floor(qty);const fraction=qty-remain;while(remain>0){const n=Math.min(64,remain);try{const left=inv.addItem(new ItemStack(type,n));const count=n-(left?.amount||0);if(count<=0)break;remain-=count;moved+=count;if(left)break;}catch(e){break;}}s.stock[type]=remain+fraction;if(!s.stock[type])delete s.stock[type];}
 save(s);player.sendMessage(`§aCollected ${moved} items. Remaining stockpile: ${total(s)}/${cap(s)}.`);open(player,vid,'Production');}
world.afterEvents.playerPlaceBlock.subscribe(ev=>{if(ev.block.typeId!==BLOCK)return;let s=accounted();const v=addVillage(s,ev.block,ev.player);if(!v)return;ev.player.sendMessage('§6Village Charter established. Interact to open the settlement menu.');});
const pendingCharterInteractions=new Set();
world.beforeEvents.playerInteractWithBlock.subscribe(ev=>{
  if(ev.block.typeId!==BLOCK)return;
  // Custom decorative blocks need not complete a vanilla interaction. Handle
  // the attempted interaction, and prevent held items from placing/using here.
  ev.cancel=true;
  // Holding interact emits additional events. One press schedules one census.
  if(ev.isFirstEvent===false)return;
  const player=ev.player,dim=ev.block.dimension,location={...ev.block.location};
  const pendingKey=`${player.id}|${dim.id}|${id(location)}`;
  if(pendingCharterInteractions.has(pendingKey))return;
  pendingCharterInteractions.add(pendingKey);
  system.run(async()=>{
    try{
      const block=dim.getBlock(location);
      if(block?.typeId!==BLOCK)return;
      recoverResearch(player);
      let s=accounted(),v=addVillage(s,block,player);
      if(!v)return;
      await refreshVillage(v.id);
      open(player,v.id);
    }catch(e){console.warn(`Frontier charter interaction: ${e}`);player.sendMessage(String(e).includes('catching up')?'Production is catching up. Interact with the charter again to continue.':'§cThe Village Charter could not open. Check the Minecraft content log for Frontier charter errors.');}
    finally{pendingCharterInteractions.delete(pendingKey);}
  });
});
world.afterEvents.playerBreakBlock.subscribe(ev=>{if(ev.brokenBlockPermutation.type.id!==BLOCK)return;const s=accounted(),legacy=id(ev.block.location);delete s.villages[`${ev.block.dimension.id}|${legacy}`];if(s.villages[legacy]?.dimension===ev.block.dimension.id)delete s.villages[legacy];for(const [key,road]of Object.entries(s.roads||{}))if(!s.villages[road.from]||!s.villages[road.to])delete s.roads[key];save(s);});
// Player-only buffs are refreshed every four seconds. Villagers are queried
// at most once per in-game day, only around an occupied loaded settlement.
system.runInterval(()=>{
 const s=state(),day=Math.floor(gameTick()/24000);let changed=false;
 const healing=new Map();
 for(const player of world.getPlayers())try{
  for(const v of refreshProtection(player,s.villages,Date.now(),s.global?.innovation??Infinity))if(v.hearth>=2&&v.lastHealDay!==day)healing.set(v.id,v);
 }catch(e){console.warn(`Frontier protection: ${e}`);}
 for(const v of healing.values())try{
  const dim=world.getDimension(v.dimension);
  for(const entity of dim.getEntities({location:v.location,maxDistance:ECONOMY_CONFIG.boundaryRadius,families:['villager']}))healVillager(entity,day);
  v.lastHealDay=day;changed=true;
 }catch(e){console.warn(`Frontier daily healing: ${e}`);}
 if(changed)save(s);
},80);
world.beforeEvents.entityHurt?.subscribe(protectDamage);
world.afterEvents.worldLoad?.subscribe(()=>{try{accounted();}catch(e){console.warn(String(e));}});

// Shared discovery is independent of charter census and runs on a small budget.
let mapWarningShown=false;
system.runInterval(()=>{
  try { sharedMap.tick(world.getPlayers());mapWarningShown=false; }
  catch(e){if(!mapWarningShown){console.warn(`Frontier shared exploration: ${e}`);mapWarningShown=true;}}
},20);

async function roadMenu(player,vid){
 try{
  const s=accounted(),v=s.villages[vid];if(!v)return;
  const options=[];
  const add=(caption,run)=>options.push({caption,run});
  if(!v.roads)add('Research Road Networks: '+costText(researchCost(v,'roads')),()=>localResearchDetails(player,vid,'roads'));
  for(const target of Object.values(s.villages).sort((a,b)=>a.id.localeCompare(b.id))){
   if(target.id===vid||target.dimension!==v.dimension)continue;
   const road=Object.values(s.roads).find(r=>(r.from===vid&&r.to===target.id)||(r.to===vid&&r.from===target.id));
   if(!road){if(v.roads)add(`Establish Trail to ${target.name}`,()=>buildRoad(player,vid,target.id));}
   else{
    const name=['Unbuilt','Trail','Road','Highway'][road.level];
    if(road.targetLevel){const done=Math.max(0,Math.min(100,100*(gameTick()-road.startedTick)/road.durationTicks));add(`${target.name}: building level ${road.targetLevel} (${done.toFixed(1)}%)`,()=>roadMenu(player,vid));}
    else if(road.level<3&&v.roads)add(`Upgrade ${name} to ${target.name}`,()=>buildRoad(player,vid,target.id));
    if(road.level)add(`Travel to ${target.name}: ${foodCost(road)} food points (${name})`,()=>travelRoad(player,vid,road.id));
   }
  }
  add('Back to Local Research',()=>open(player,vid,'Research','local'));
  const form=new ActionFormData().title(pageTitle('Roads')).body('Connections / construction / food-powered travel');
  options.forEach(o=>form.button(o.caption));
  const response=await displayMenu(player,form,system);
  if(!response.canceled)options[response.selection]?.run();
  else open(player,vid,'Research','local');
 }catch(e){player.sendMessage(String(e));}
}
function buildRoad(player,vid,target){
 try{const s=accounted(),v=s.villages[vid];if(!v||!within(player,v))throw Error('Stand inside the source settlement to manage roads.');
  const road=startRoad(s,vid,target,gameTick());save(s);
  player.sendMessage(`Construction started: level ${road.targetLevel}; ${(road.durationTicks/20).toFixed(0)} in-game seconds (trial timing).`);
 }catch(e){player.sendMessage(String(e));}
 roadMenu(player,vid);
}
function travelRoad(player,vid,roadId){
 try{
  const s=accounted(),v=s.villages[vid],road=s.roads[roadId];
  if(!v||!within(player,v)||!road?.level||![road.from,road.to].includes(vid))throw Error('No completed route from this settlement.');
  const target=s.villages[road.from===vid?road.to:road.from];if(!target)throw Error('Destination no longer exists.');
  const inventory=player.getComponent('minecraft:inventory')?.container;if(!inventory)throw Error('Inventory unavailable.');
  const items=[];for(let slot=0;slot<inventory.size;slot++){const item=inventory.getItem(slot);if(item)items.push({slot,typeId:item.typeId,amount:item.amount});}
  const plan=foodPlan(items,foodCost(road));if(!plan)throw Error(`Need ${foodCost(road)} food points. Different foods provide different values.`);
  spendFoodAndTravel(inventory,plan,()=>player.teleport({x:target.location.x+0.5,y:target.location.y+1,z:target.location.z+0.5},{dimension:world.getDimension(target.dimension)}));
  player.sendMessage(`Arrived at ${target.name}.`);
 }catch(e){player.sendMessage(String(e));}
}
