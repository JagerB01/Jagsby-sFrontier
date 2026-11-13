import { world, system, ItemStack } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { takeCensus, censusText } from "./village-census.js";
import { displayMenu } from "./menu-display.js";

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
function refreshVillage(s,v){
  const dim=world.getDimension(v.dimension);
  const biome=getBiome(dim,v.location);
  if(biome!=='unknown')v.biome=biome;
  // The pinned Script API has no native villager trade-tier accessor. An exact
  // score requires a live resolver from the existing villager entity integration.
  // Do not substitute profession/variant, which is not trading level.
  try{v.census=takeCensus(dim,v.location);}
  catch(e){v.census={error:true,observedAt:Date.now()};console.warn(`Frontier census: ${e}`);}
  save(s);
}
function addVillage(s,block){const legacy=id(block.location),k=`${block.dimension.id}|${legacy}`;
if(!s.villages[k]&&s.villages[legacy]?.dimension===block.dimension.id){s.villages[k]=s.villages[legacy];s.villages[k].id=k;delete s.villages[legacy];save(s);}
if(!s.villages[k]){
  s.villages[k]={id:k,location:{...block.location},dimension:block.dimension.id,name:`Settlement ${Object.keys(s.villages).length+1}`,biome:getBiome(block.dimension,block.location),secondary:null,available:[],efficiency:0,hearth:0,biomeUnlocked:false};save(s);
}return s.villages[k];}
function canPay(player,cost){const inv=player.getComponent("minecraft:inventory")?.container;if(!inv)return false;
  for(const [item,num] of Object.entries(cost)) {let count=0;for(let i=0;i<inv.size;i++){const it=inv.getItem(i);if(it?.typeId===item)count+=it.amount;}if(count<num)return false;}return true;}
function pay(player,cost){if(!canPay(player,cost))return false;const inv=player.getComponent("minecraft:inventory").container;
  for(const [item,num] of Object.entries(cost)){let left=num;for(let i=0;i<inv.size&&left>0;i++){const it=inv.getItem(i);if(it?.typeId!==item)continue;const take=Math.min(left,it.amount);left-=take;if(take===it.amount)inv.setItem(i,undefined);else{it.amount-=take;inv.setItem(i,it);}}}return true;}
function costText(c){return Object.entries(c||{}).map(([k,v])=>`${v} ${k.replace('minecraft:','').replaceAll('_',' ')}`).join(' + ')||'Maxed';}
function cap(s){return BASE_CAP*Math.pow(2,s.global.storage||0);}
function total(s){return Object.values(s.stock).reduce((a,n)=>a+n,0);}
function pageTitle(page){return `JF_CHARTER|${page}`;}
function open(player, vId, page="Overview"){
  const s=state(),v=s.villages[vId];if(!v){player.sendMessage('§cVillage Charter not registered.');return;}
  let body = `§6${v.name}§r    §7${page}§r\n`;
  if(page==='Overview')body+=`§8Location:§r ${v.id}\n§8Zone:§r ${zoneAt(v.location)}\n§8Home Biome:§r ${v.biome}\n§8Second Biome:§r ${v.secondary||'Not selected'}\n§8Settlement Production:§r ${v.efficiency*10}% bonus\n§8Hearthstone:§r ${v.hearth?'Regeneration I':'Not researched'}\n§8Civilization:§r ${Object.keys(s.villages).length} settlements`;
  if(page==='Overview')body+=`\n${censusText(v.census)}`;
  if(page==='Research')body+=`§6LOCAL§r\nProduction Efficiency: ${v.efficiency}/4\nHearthstone: ${v.hearth?'Complete':'Available'}\nBiome Utilization: ${v.biomeUnlocked?'Unlocked':'Available'}\n§6GLOBAL§r\nFrontier Expansion: ${s.global.frontier}/5\nSettlement Capacity: ${s.global.capacity}/4\nSettlement Development: ${s.global.development}/3\nShared Storage: ${s.global.storage}/4`;
  if(page==='Production')body+=`§8Active biome:§r ${v.biome}\n§8Secondary biome:§r ${v.secondary||'None'}\n§8Production efficiency:§r +${v.efficiency*10}%\n§8Passive cycle:§r ${PRODUCTION_MS/60000} minutes\n§7Resource table is SAMPLE DATA; replace in config before deploying to Realm.`;
  if(page==='Stockpile')body+=`§8Civilization shared capacity:§r ${total(s)} / ${cap(s)}\n${Object.entries(s.stock).map(([r,n])=>`${r.replace('minecraft:','')}: ${n}`).join('\n')||'No produced resources yet.'}`;
  const nav=['Overview','Research','Production','Stockpile'];let actions=[];
  for(const tab of nav){if(tab!==page)actions.push({text:`§6▸ §r${tab}`,run:()=>open(player,vId,tab)});}
  if(page==='Overview')actions.push({text:'§eRename settlement',run:()=>{player.sendMessage('§7Renaming requires a custom text-input implementation; pending JSON UI integration.');}});
  if(page==='Research'){
    actions.push({text:'§aUpgrade Production Efficiency',run:()=>upgrade(player,vId,'efficiency')},{text:'§aResearch Hearthstone',run:()=>upgrade(player,vId,'hearth')},{text:'§aUnlock 2nd Biome',run:()=>upgrade(player,vId,'biome')});
    for(const k of ['frontier','capacity','development','storage'])actions.push({text:`§bGlobal: ${k}`,run:()=>upgrade(player,vId,k)});
  }
  if(page==='Production')actions.push({text:'§aScan nearby biomes (256 blocks)',run:()=>scan(player,vId)},{text:'§aChoose secondary biome',run:()=>selectBiome(player,vId)});
  if(page==='Stockpile')actions.push({text:'§aCollect produced items',run:()=>collect(player,vId)});
  const form=new ActionFormData().title(pageTitle(page)).body(body);
  for(const a of actions)form.button(a.text);
  displayMenu(player,form,system).then(r=>{if(!r.canceled&&actions[r.selection])actions[r.selection].run();}).catch(e=>{console.warn(`Frontier menu: ${e}`);player.sendMessage('§cThe Village Charter menu could not open. Check the Minecraft content log for Frontier menu errors.');});
}
function upgrade(player,vid,key){let s=state(),v=s.villages[vid];if(!v)return;
  const global=['frontier','capacity','development','storage'].includes(key);let current=global?s.global[key]:key==='biome'?Number(v.biomeUnlocked):key==='hearth'?v.hearth:v.efficiency;
  const list=COSTS[key];if(current>=list.length){player.sendMessage('§7Already at maximum research level.');return open(player,vid,'Research');}
  if(!global && key==='efficiency' && current>=1+s.global.development){player.sendMessage('§cResearch Settlement Development globally to unlock higher local tiers.');return open(player,vid,'Research');}
  if(key==='frontier'){player.sendMessage('§eFrontier Expansion is reserved until the existing MineScape zone logic is integrated. Nothing charged.');return open(player,vid,'Research');}
  if(key==='capacity'){player.sendMessage('§eSettlement Capacity is reserved until existing Diplomacy settlements are integrated. Nothing charged.');return open(player,vid,'Research');}
  const c=list[current];if(!pay(player,c)){player.sendMessage(`§cInsufficient materials: ${costText(c)}`);return open(player,vid,'Research');}
  if(global)s.global[key]++;else if(key==='biome')v.biomeUnlocked=true;else if(key==='hearth')v.hearth=1;else v.efficiency++;
  save(s);player.sendMessage(`§aResearch complete: ${key}.`);open(player,vid,'Research');
}
function scan(player,vid){const s=state(),v=s.villages[vid];if(!v)return;
  const dim=player.dimension, seen=new Set();
  // Scan only loaded positions in a lattice. Unloaded positions are not treated as nonexistent.
  let successful=0;
  for(let dx=-256;dx<=256;dx+=32)for(let dz=-256;dz<=256;dz+=32){if(dx*dx+dz*dz>256*256)continue;try{const b=dim.getBiome({x:v.location.x+dx,y:v.location.y,z:v.location.z+dz});seen.add(b.id);successful++;}catch(e){}}
  v.available=[...seen].filter(x=>x!==v.biome).sort();save(s);
  player.sendMessage(`§aSurveyed ${successful} loaded samples; found ${v.available.length} additional biomes. Survey again after exploring the surrounding chunks.`);
  open(player,vid,'Production');
}
function selectBiome(player,vid){const s=state(),v=s.villages[vid];if(!v.biomeUnlocked){player.sendMessage('§cResearch Biome Utilization first.');return open(player,vid,'Production');}
  const options=v.available.filter(b=>RESOURCE_TABLE[b]);if(!options.length){player.sendMessage('§eNo supported secondary biomes yet. Survey the surrounding region and check RESOURCE_TABLE.');return open(player,vid,'Production');}
  const form=new ActionFormData().title(pageTitle('Select Biome')).body('Choose ONE additional biome.');options.forEach(b=>form.button(b));form.show(player).then(r=>{if(!r.canceled){const st=state();st.villages[vid].secondary=options[r.selection];save(st);}open(player,vid,'Production');}).catch(e=>console.warn(String(e)));
}
function collect(player,vid){const s=state();const inv=player.getComponent('minecraft:inventory')?.container;if(!inv)return;
 let moved=0;for(const [type,qty] of Object.entries(s.stock)){let remain=qty;while(remain>0){const n=Math.min(64,remain);try{const left=inv.addItem(new ItemStack(type,n));const count=n-(left?.amount||0);if(count<=0)break;remain-=count;moved+=count;if(left)break;}catch(e){break;}}s.stock[type]=remain;if(!remain)delete s.stock[type];}
 save(s);player.sendMessage(`§aCollected ${moved} items. Remaining stockpile: ${total(s)}/${cap(s)}.`);open(player,vid,'Stockpile');}
function tick(){const s=state();const now=Date.now();const elapsed=Math.max(0,Math.min(now-(s.lastTick||now),4*60*60*1000));if(elapsed<PRODUCTION_MS)return;
 const cycles=Math.min(8,Math.floor(elapsed/PRODUCTION_MS));s.lastTick=now;
 for(const v of Object.values(s.villages)){
   const biomes=[v.biome,...(v.secondary?[v.secondary]:[])];
   for(const b of biomes)for(const r of RESOURCE_TABLE[b]||[]){if(total(s)>=cap(s))break;const n=Math.min(cap(s)-total(s),Math.max(1,Math.floor(cycles*(1+v.efficiency*0.1))));s.stock[r.id]=(s.stock[r.id]||0)+n;}
 }save(s);
}
world.afterEvents.playerPlaceBlock.subscribe(ev=>{if(ev.block.typeId!==BLOCK)return;let s=state();addVillage(s,ev.block);ev.player.sendMessage('§6Village Charter established. Interact to open the settlement menu.');});
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
  system.run(()=>{
    try{
      const block=dim.getBlock(location);
      if(block?.typeId!==BLOCK)return;
      let s=state(),v=addVillage(s,block);
      refreshVillage(s,v);
      open(player,v.id);
    }catch(e){console.warn(`Frontier charter interaction: ${e}`);player.sendMessage('§cThe Village Charter could not open. Check the Minecraft content log for Frontier charter errors.');}
    finally{pendingCharterInteractions.delete(pendingKey);}
  });
});
world.afterEvents.playerBreakBlock.subscribe(ev=>{if(ev.brokenBlockPermutation.type.id!==BLOCK)return;const s=state(),legacy=id(ev.block.location);delete s.villages[`${ev.block.dimension.id}|${legacy}`];if(s.villages[legacy]?.dimension===ev.block.dimension.id)delete s.villages[legacy];save(s);});
system.runInterval(tick,20*30);
system.runInterval(()=>{const s=state();for(const player of world.getPlayers()){for(const v of Object.values(s.villages)){if(!v.hearth||player.dimension.id!==v.dimension)continue;const d=Math.hypot(player.location.x-v.location.x,player.location.z-v.location.z);if(d<=32){try{player.addEffect('regeneration',120,{amplifier:0,showParticles:false});}catch(e){}break;}}}},20*4);
