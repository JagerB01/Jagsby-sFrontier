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
const ZONES = ["Heartlands", "Borderlands", "Wildlands", "Dreadlands", "Blightlands", "Blackreach"];
// CONFIGURE before production: these are examples only, NOT the agreed MineScape resource table.
const RESOURCE_TABLE = {
  "minecraft:plains": [{id:"minecraft:wheat", name:"Wheat"},{id:"minecraft:stone",name:"Stone"}],
  "minecraft:forest": [{id:"minecraft:oak_log",name:"Oak Logs"},{id:"minecraft:stone",name:"Stone"}],
  "minecraft:taiga": [{id:"minecraft:spruce_log",name:"Spruce Logs"},{id:"minecraft:stone",name:"Stone"}],
  "minecraft:swamp": [{id:"minecraft:mud",name:"Mud"},{id:"minecraft:clay_ball",name:"Clay"}],
  "minecraft:desert": [{id:"minecraft:sand",name:"Sand"},{id:"minecraft:stone",name:"Stone"}],
  "minecraft:jungle": [{id:"minecraft:cocoa_beans",name:"Cocoa Beans"},{id:"minecraft:jungle_log",name:"Jungle Logs"}],
};
const PRODUCTION_MS = 30*60*1000; // conservative placeholder: one per resource each half hour, per village
const BASE_CAP = 128; // total pooled items, placeholder pending balance
const COSTS = {
  efficiency: [{"minecraft:iron_ingot":16,"minecraft:emerald":4},{"minecraft:iron_ingot":32,"minecraft:emerald":8},{"minecraft:iron_ingot":64,"minecraft:emerald":16},{"minecraft:iron_ingot":96,"minecraft:emerald":32}],
  hearth: [{"minecraft:gold_ingot":8,"minecraft:emerald":8}],
  biome: [{"minecraft:iron_ingot":32,"minecraft:emerald":16}],
  frontier: [{"minecraft:emerald":16},{"minecraft:emerald":32},{"minecraft:emerald":64},{"minecraft:emerald":96},{"minecraft:emerald":128}],
  capacity: [{"minecraft:iron_ingot":24},{"minecraft:iron_ingot":48},{"minecraft:iron_ingot":96},{"minecraft:iron_ingot":128}],
  development: [{"minecraft:gold_ingot":16},{"minecraft:gold_ingot":32},{"minecraft:gold_ingot":64}],
  storage: [{"minecraft:iron_ingot":16},{"minecraft:iron_ingot":32},{"minecraft:iron_ingot":64},{"minecraft:iron_ingot":128}]
};
function state(){ try {const raw=world.getDynamicProperty(KEY);if(raw) return JSON.parse(raw);}catch(e){console.warn(String(e));}return {villages:{},global:{frontier:0,capacity:0,development:0,storage:0},stock:{},lastTick:Date.now()};}
function save(s){world.setDynamicProperty(KEY,JSON.stringify(s));}
function id(loc){return `${Math.floor(loc.x)},${Math.floor(loc.y)},${Math.floor(loc.z)}`;}
function zoneAt(loc){ // MUST BE REPLACED with MineScape's EXISTING exact zone calculation. No duplicate guessed thresholds.
  return "Pending MineScape zone integration";
}
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
  const latest=state(),v=latest.villages[vId];if(!v)return;
  if(biome!=='unknown')v.biome=biome;
  v.census=census;save(latest);
  if(!census.error)console.log(`[Frontier census] villagers=${census.villagers} power_tenths=${census.realmPowerTenths} unknown_ranks=${census.unknownRanks}`);
}
function addVillage(s,block,creator){const legacy=id(block.location),k=`${block.dimension.id}|${legacy}`;
if(!s.villages[k]&&s.villages[legacy]?.dimension===block.dimension.id){s.villages[k]=s.villages[legacy];s.villages[k].id=k;delete s.villages[legacy];save(s);}
if(!s.villages[k]){
  s.villages[k]={id:k,location:{...block.location},dimension:block.dimension.id,name:`Settlement ${Object.keys(s.villages).length+1}`,owner:creator?ownerRecord(creator):null,biome:getBiome(block.dimension,block.location),secondary:null,available:[],efficiency:0,hearth:0,biomeUnlocked:false};save(s);
}return s.villages[k];}
function canPay(player,cost){const inv=player.getComponent("minecraft:inventory")?.container;if(!inv)return false;
  for(const [item,num] of Object.entries(cost)) {let count=0;for(let i=0;i<inv.size;i++){const it=inv.getItem(i);if(it?.typeId===item)count+=it.amount;}if(count<num)return false;}return true;}
function pay(player,cost){if(!canPay(player,cost))return false;const inv=player.getComponent("minecraft:inventory").container;
  for(const [item,num] of Object.entries(cost)){let left=num;for(let i=0;i<inv.size&&left>0;i++){const it=inv.getItem(i);if(it?.typeId!==item)continue;const take=Math.min(left,it.amount);left-=take;if(take===it.amount)inv.setItem(i,undefined);else{it.amount-=take;inv.setItem(i,it);}}}return true;}
function costText(c){return Object.entries(c||{}).map(([k,v])=>`${v} ${k.replace('minecraft:','').replaceAll('_',' ')}`).join(' + ')||'Maxed';}
function cap(s){return BASE_CAP*Math.pow(2,s.global.storage||0);}
function total(s){return Object.values(s.stock).reduce((a,n)=>a+n,0);}
function pageTitle(page){return `JF_CHARTER|${page}`;}
function researchText(s,v,key,player){
  const names={efficiency:'Prosperity',hearth:'Hearthstone',biome:'Resource Prospecting',frontier:'Frontier Expansion',capacity:'Settlement Capacity',development:'Settlement Development',storage:'Shared Storage'};
  const global=['frontier','capacity','development','storage'].includes(key);
  const current=global?s.global[key]:key==='biome'?Number(v.biomeUnlocked):key==='hearth'?v.hearth:v.efficiency;
  const cost=COSTS[key][current];
  const benefits={efficiency:`Current: +${current*10}% production. Next: +${(current+1)*10}% total.`,hearth:'Regeneration I within settlement boundaries.',biome:'Select ONE additional biome within 256 blocks.',frontier:'Unlock settlement establishment in the next MineScape zone.',capacity:'Increase civilization settlement limit.',development:`Local efficiency ceiling: ${1+current} -> ${2+current}.`,storage:`Shared capacity: ${cap(s)} -> ${cap(s)*2} produced items.`};
  let status=!cost?'Complete':canPay(player,cost)?'Affordable':'Materials needed';
  if(key==='frontier'||key==='capacity')status='Awaiting settlement integration; nothing charged';
  if(key==='efficiency'&&current>=1+s.global.development&&cost)status='Requires Settlement Development';
  return `§6${names[key]}§r  ${current}/${COSTS[key].length}\n${benefits[key]}\n${cost?'Test cost: '+costText(cost):'Maximum level'}\n${status}`;
}
function open(player,vId,page='Overview',researchScope='global',realmPage=0,realmScope='map'){
  const s=state(),v=s.villages[vId];if(!v){player.sendMessage('§cVillage Charter not registered.');return;}
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
  for(const key of ['efficiency','hearth','biome','frontier','capacity','development','storage'])records[data[key]]=researchText(s,v,key,player);
  const eligible=[...new Set([v.biome,v.secondary].filter(Boolean).flatMap(b=>(RESOURCE_TABLE[b]||[]).map(r=>r.name)))];
  records[data.production]=`Primary biome: ${v.biome}\nSecondary biome: ${v.secondary||'None'}\nSurveyed options: ${v.available.join(', ')||'Survey nearby biomes'}\nEligible resources: ${eligible.join(', ')||'None configured'}\nEfficiency: +${v.efficiency*10}%\nPrototype cycle: ${PRODUCTION_MS/60000} minutes\n§cSample resource table and production balance; not final.§r`;
  records[data.stockpile]=`Stored: ${total(s)} / ${cap(s)}\nRemaining capacity: ${cap(s)-total(s)}\nProduced resources only; shared by every settlement.`;
  records[data.resources]=Object.entries(s.stock).map(([r,n])=>`${r.replace('minecraft:','').replaceAll('_',' ')}: ${n}`).join('\n')||'No produced resources yet.';
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
  // Global tree nodes are visual-only until their progression is approved.
  for(const key of ['efficiency','hearth','biome'])handlers.set(actions[key],()=>upgrade(player,vId,key));
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
function upgrade(player,vid,key){let s=state(),v=s.villages[vid];if(!v)return;
  const global=['frontier','capacity','development','storage'].includes(key);let current=global?s.global[key]:key==='biome'?Number(v.biomeUnlocked):key==='hearth'?v.hearth:v.efficiency;
  const list=COSTS[key];if(current>=list.length){player.sendMessage('§7Already at maximum research level.');return open(player,vid,'Research',global?'global':'local');}
  if(!global && key==='efficiency' && current>=1+s.global.development){player.sendMessage('§cResearch Settlement Development globally to unlock higher local tiers.');return open(player,vid,'Research',global?'global':'local');}
  if(key==='frontier'){player.sendMessage('§eFrontier Expansion is reserved until the existing MineScape zone logic is integrated. Nothing charged.');return open(player,vid,'Research',global?'global':'local');}
  if(key==='capacity'){player.sendMessage('§eSettlement Capacity is reserved until existing Diplomacy settlements are integrated. Nothing charged.');return open(player,vid,'Research',global?'global':'local');}
  const c=list[current];if(!pay(player,c)){player.sendMessage(`§cInsufficient materials: ${costText(c)}`);return open(player,vid,'Research',global?'global':'local');}
  if(global)s.global[key]++;else if(key==='biome')v.biomeUnlocked=true;else if(key==='hearth')v.hearth=1;else v.efficiency++;
  save(s);player.sendMessage(`§aResearch complete: ${key}.`);open(player,vid,'Research',global?'global':'local');
}
function scan(player,vid){const s=state(),v=s.villages[vid];if(!v)return;
  const dim=world.getDimension(v.dimension), seen=new Set(v.available||[]);
  // Scan only loaded positions in a lattice. Unloaded positions are not treated as nonexistent.
  let successful=0;
  for(let dx=-256;dx<=256;dx+=32)for(let dz=-256;dz<=256;dz+=32){if(dx*dx+dz*dz>256*256)continue;try{const b=dim.getBiome({x:v.location.x+dx,y:v.location.y,z:v.location.z+dz});seen.add(b.id);successful++;}catch(e){}}
  v.available=[...seen].filter(x=>x!==v.biome).sort();save(s);
  player.sendMessage(`§aSurveyed ${successful} loaded samples; found ${v.available.length} additional biomes. Survey again after exploring the surrounding chunks.`);
  open(player,vid,'Production');
}
function selectBiome(player,vid){const s=state(),v=s.villages[vid];if(!v.biomeUnlocked){player.sendMessage('§cResearch Biome Utilization first.');return open(player,vid,'Production');}
  const options=v.available.filter(b=>RESOURCE_TABLE[b]);if(!options.length){player.sendMessage('§eNo supported secondary biomes yet. Survey the surrounding region and check RESOURCE_TABLE.');return open(player,vid,'Production');}
  const form=new ActionFormData().title(pageTitle('Select Biome')).body('Choose ONE additional biome.');options.forEach(b=>form.button(b));displayMenu(player,form,system).then(r=>{if(!r.canceled&&options[r.selection]){const st=state();if(!st.villages[vid])return;st.villages[vid].secondary=options[r.selection];save(st);}open(player,vid,'Production');}).catch(e=>console.warn(String(e)));
}
function collect(player,vid){const s=state();const inv=player.getComponent('minecraft:inventory')?.container;if(!inv)return;
 let moved=0;for(const [type,qty] of Object.entries(s.stock)){let remain=qty;while(remain>0){const n=Math.min(64,remain);try{const left=inv.addItem(new ItemStack(type,n));const count=n-(left?.amount||0);if(count<=0)break;remain-=count;moved+=count;if(left)break;}catch(e){break;}}s.stock[type]=remain;if(!remain)delete s.stock[type];}
 save(s);player.sendMessage(`§aCollected ${moved} items. Remaining stockpile: ${total(s)}/${cap(s)}.`);open(player,vid,'Production');}
function tick(){const s=state();const now=Date.now();const elapsed=Math.max(0,Math.min(now-(s.lastTick||now),4*60*60*1000));if(elapsed<PRODUCTION_MS)return;
 const cycles=Math.min(8,Math.floor(elapsed/PRODUCTION_MS));s.lastTick=now;
 for(const v of Object.values(s.villages)){
   const biomes=[v.biome,...(v.secondary?[v.secondary]:[])];
   for(const b of biomes)for(const r of RESOURCE_TABLE[b]||[]){if(total(s)>=cap(s))break;const n=Math.min(cap(s)-total(s),Math.max(1,Math.floor(cycles*(1+v.efficiency*0.1))));s.stock[r.id]=(s.stock[r.id]||0)+n;}
 }save(s);
}
world.afterEvents.playerPlaceBlock.subscribe(ev=>{if(ev.block.typeId!==BLOCK)return;let s=state();addVillage(s,ev.block,ev.player);ev.player.sendMessage('§6Village Charter established. Interact to open the settlement menu.');});
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
      let s=state(),v=addVillage(s,block);
      await refreshVillage(v.id);
      open(player,v.id);
    }catch(e){console.warn(`Frontier charter interaction: ${e}`);player.sendMessage('§cThe Village Charter could not open. Check the Minecraft content log for Frontier charter errors.');}
    finally{pendingCharterInteractions.delete(pendingKey);}
  });
});
world.afterEvents.playerBreakBlock.subscribe(ev=>{if(ev.brokenBlockPermutation.type.id!==BLOCK)return;const s=state(),legacy=id(ev.block.location);delete s.villages[`${ev.block.dimension.id}|${legacy}`];if(s.villages[legacy]?.dimension===ev.block.dimension.id)delete s.villages[legacy];save(s);});
system.runInterval(tick,20*30);
system.runInterval(()=>{const s=state();for(const player of world.getPlayers()){for(const v of Object.values(s.villages)){if(!v.hearth||player.dimension.id!==v.dimension)continue;const d=Math.hypot(player.location.x-v.location.x,player.location.z-v.location.z);if(d<=32){try{player.addEffect('regeneration',120,{amplifier:0,showParticles:false});}catch(e){}break;}}}},20*4);

// Shared discovery is independent of charter census and runs on a small budget.
let mapWarningShown=false;
system.runInterval(()=>{
  try { sharedMap.tick(world.getPlayers());mapWarningShown=false; }
  catch(e){if(!mapWarningShown){console.warn(`Frontier shared exploration: ${e}`);mapWarningShown=true;}}
},20);
