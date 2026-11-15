import {resourceRates,recordedPower,development,capacity,stockTotal} from './settlement-economy.js';
import {localLevel,colonizationBonus,zoneAt} from './global-research.js';
import {productionAllocations,biomeResource,canonicalBiome,riverCropBonus} from './biome-resources.js';
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
 const allocations=productionAllocations(v),river=riverCropBonus(v),native=canonicalBiome(v.nativeBiome??v.biome),nativeResource=biomeResource(native);
 const bonus=colonizationBonus(s,zoneAt(v.location));
 const outputRows=rates.map(r=>{
  const sources=[...new Set((r.allocations||[]).map(a=>biomeName(a.biome)))];
  return {id:r.id,name:r.name,base:r.rate,bonus:r.rate*bonus,actual:full?0:r.rate*(1+bonus),sources,texture:`textures/ui/frontier/production/${r.id.replace('minecraft:','')}`};
 });
 const output=paginate(outputRows,requested.output,3);
 const stock=paginate(Object.entries(s.stock).filter(([,n])=>n>0).sort(([a],[b])=>a.localeCompare(b)),requested.stock,6);
 const available=[...new Set((v.available||[]).map(canonicalBiome))].filter(b=>b!==native&&biomeResource(b)).sort();
 const options=[...(nativeResource&&v.dimension==='minecraft:overworld'?[{id:native,mode:'specialize'}]:[]),...available.map(id=>({id,mode:'diversify'}))];
 const biomes=paginate(options,requested.biomes,3);
 const choices=biomes.rows.map(({id,mode})=>{
  const sample=v.biomeSamples?.[id];
  const verified=mode==='specialize'||!!sample&&Math.hypot(sample.x-v.location.x,sample.z-v.location.z)<=256;
  const resource=biomeResource(id);
  return {id,mode,verified,selected:v.biomeUnlocked&&(mode==='specialize'?v.productionMode==='specialize':v.productionMode!=='specialize'&&v.secondary===id),text:`${mode==='specialize'?'Native Specialization':biomeName(id)}${v.biomeUnlocked&&(mode==='specialize'?v.productionMode==='specialize':v.secondary===id)?' (selected)':''}\n${!verified?'Survey again to verify':resource.name+' - 50% allocation'}`};
 });
 const progress=v.localResearch?.progress?.biome||0;
 return {
  status:full?'Stockpile full - paused':!recordedPower(v)?'Waiting for Realm Power':!rates.length?'No resource assigned':'Producing',
  items:output.rows.map(r=>({...r,text:`${r.name}\n+ ${r.actual.toFixed(3)}/hour`})),
  modifiers:`Realm Power: ${recordedPower(v).toFixed(1)}${v.productionPowerIsMinimum?' (min)':''}\nProsperity: + ${localLevel(s,v,'efficiency')*5}%\nDevelopment: + ${(development(v)*0.1).toFixed(1)}%\nColonization: + ${Math.round(bonus*100)}%\nRiver crops: + ${Math.round(river*100)}%`,
  biomeText:`Native: ${biomeName(native)} - ${nativeResource?.name||'Unsupported biome'}\nSlots: ${allocations.map(a=>a.slot+': '+a.name).join(' | ')||'No eligible allocation'}\n${v.biomeUnlocked?'Preview specialization or a nearby biome below.':`Paper: ${progress} / 64. Contribute in Research > Local.`}`,
  biomeFooter:`Allocation choices: ${biomes.count} | Page ${biomes.page+1} / ${biomes.pages}`,
  stockHeading:`Stockpile  ${amount(used,3)} / ${cap}`,
  stockLeft:stock.rows.slice(0,3).map(([id,n])=>`${itemName(id)}  ${amount(n,3)}`).join('\n')||'Stockpile empty',
  stockRight:stock.rows.slice(3,6).map(([id,n])=>`${itemName(id)}  ${amount(n,3)}`).join('\n'),
  stockFooter:`Page ${stock.page+1} / ${stock.pages}`,
  choices,output,stock,biomes,allocations,river,
 };
}
