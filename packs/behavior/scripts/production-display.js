import {ECONOMY_CONFIG as C} from './economy-config.js';
import {resourceRates,recordedPower,development,capacity,stockTotal} from './settlement-economy.js';
import {localLevel,colonizationBonus,zoneAt} from './global-research.js';
import {biomeName} from './settlement-overview.js';
const amount=(n,digits=4)=>n.toFixed(digits).replace(/\.?0+$/,'');
const itemName=id=>id.replace('minecraft:','').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
function paginate(rows,requested,size){
 const pages=Math.max(1,Math.ceil(rows.length/size));
 const page=Math.max(0,Math.min(pages-1,Math.floor(requested)||0));
 return {page,pages,rows:rows.slice(page*size,(page+1)*size),count:rows.length};
}
export function productionView(s,v,requested={}){
 const rates=resourceRates(v,s),used=stockTotal(s),cap=capacity(s),full=cap-used<=1e-8;
 const bonus=colonizationBonus(s,zoneAt(v.location));
 const base=rates.reduce((sum,r)=>sum+r.rate,0),extra=base*bonus;
 const status=full?'Paused: shared stockpile is full':!recordedPower(v)?'Waiting for recorded Realm Power':!rates.length?'No production resources mapped for this biome':'Producing';
 const outputRows=rates.map(r=>{
  const sources=[...new Set([v.biome,...(v.biomeUnlocked&&v.secondary?[v.secondary]:[])])]
   .filter(b=>(C.resources[b]||[]).some(resource=>resource.id===r.id)).map(biomeName);
  return {id:r.id,name:r.name,base:r.rate,bonus:r.rate*bonus,actual:full?0:r.rate*(1+bonus),sources};
 });
 const output=paginate(outputRows,requested.output,3);
 const stock=paginate(Object.entries(s.stock).filter(([,n])=>n>0).sort(([a],[b])=>a.localeCompare(b)),requested.stock,5);
 const available=[...new Set(v.available||[])].filter(b=>b!==v.biome&&C.resources[b]).sort();
 const biomes=paginate(available,requested.biomes,3);
 const choices=biomes.rows.map(id=>{
  const sample=v.biomeSamples?.[id];
  const verified=!!sample&&Math.hypot(sample.x-v.location.x,sample.z-v.location.z)<=256;
  const primary=new Set((C.resources[v.biome]||[]).map(r=>r.id));
  const adds=C.resources[id].filter(r=>!primary.has(r.id)).map(r=>r.name);
  return {id,verified,selected:v.biomeUnlocked&&v.secondary===id,text:`${biomeName(id)}${v.secondary===id?' (selected)':''}\n${!verified?'Survey again to verify':adds.length?'Adds: '+adds.join(', '):'Shares primary resources'}`};
 });
 const progress=v.localResearch?.progress?.biome||0;
 return {
  summary:`${status}\nTotal output: ${amount(full?0:base+extra)} items / hour\nBase: ${amount(base)} | Zone bonus: ${amount(extra)} / hour\nRecorded Realm Power: ${recordedPower(v).toFixed(1)}${v.productionPowerIsMinimum?' (minimum estimate)':''}\nProsperity Lv ${localLevel(s,v,'efficiency')}: +${localLevel(s,v,'efficiency')*5}%\nDevelopment ${development(v)}: +${(development(v)*0.1).toFixed(1)}%\n${zoneAt(v.location)}: +${bonus*100}% Colonization\nOffline production uses the same recorded rates.`,
  outputText:output.rows.map(r=>`${r.name}: ${amount(r.actual)} / hour${full?' (paused)':''}\nPotential: ${amount(r.base)} base + ${amount(r.bonus)} zone / hour\nFrom: ${r.sources.join(' + ')}`).join('\n')||'No mapped resources are produced here. Choose a supported surveyed secondary biome when Prospecting is unlocked.',
  outputFooter:`Resources: ${output.count} | Page ${output.page+1} / ${output.pages}`,
  biomeText:`Primary: ${biomeName(v.biome)}\nSecondary: ${v.biomeUnlocked?biomeName(v.secondary||'None'):'Locked - research Resource Prospecting'}\n${v.biomeUnlocked?'Prospecting unlocked: choose ONE secondary biome.':`Paper: ${progress} / 64. Contribute in Research > Local.`}`,
  biomeFooter:`Surveyed options: ${biomes.count} | Page ${biomes.page+1} / ${biomes.pages}`,
  stockSummary:`Shared stock: ${amount(used,3)} / ${cap} items\nFree space: ${amount(Math.max(0,cap-used),3)} | All settlements share this stock.`,
  stockText:stock.rows.map(([id,n])=>`${itemName(id)}: ${amount(n,3)} stored | ${Math.floor(n)} collectable`).join('\n')||'No produced resources stored yet.',
  stockFooter:`Items: ${stock.count} types | Page ${stock.page+1} / ${stock.pages}`,
  choices,output,stock,biomes,
 };
}
