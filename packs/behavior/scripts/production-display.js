import {resourceRates,recordedPower,development,capacity,stockTotal} from './settlement-economy.js';
import {localLevel,colonizationBonus,zoneAt} from './global-research.js';
import {productionAllocations,biomeResource,canonicalBiome,riverCropBonus,BIOME_ASSIGNMENTS} from './biome-resources.js';
import {biomeName} from './settlement-overview.js';
export const STOCK_ITEMS=[...new Map(BIOME_ASSIGNMENTS.filter(b=>b.supported).map(b=>[b.item,{id:b.item,name:b.resource,texture:`textures/ui/frontier/production/${b.item.replace('minecraft:','')}`}])).values()].sort((a,b)=>a.id.localeCompare(b.id));
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
 const stock=STOCK_ITEMS.map(item=>({...item,count:Math.max(0,Math.floor(s.stock[item.id]||0))}));
 const storedWhole=Object.values(s.stock).reduce((sum,n)=>sum+Math.max(0,Math.floor(n)),0);
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
  modifierLabels:'Prosperity\nDevelopment\nColonization\nRiver crops',
  modifierValues:`+ ${localLevel(s,v,'efficiency')*5}%\n+ ${Number((development(v)*0.1).toFixed(1))}%\n+ ${Math.round(bonus*100)}%\n+ ${Math.round(river*100)}%`,
  biomeText:`Native: ${biomeName(native)} - ${nativeResource?.name||'Unsupported biome'}\nSlots: ${allocations.map(a=>a.slot+': '+a.name).join(' | ')||'No eligible allocation'}\n${v.biomeUnlocked?'Preview specialization or a nearby biome below.':`Paper: ${progress} / 64. Contribute in Research > Local.`}`,
  biomeFooter:`Allocation choices: ${biomes.count} | Page ${biomes.page+1} / ${biomes.pages}`,
  stockHeading:`Stockpile  ${storedWhole} / ${cap}`,
  choices,output,stock,biomes,allocations,river,
 };
}
