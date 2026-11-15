import {ECONOMY_CONFIG as C} from './economy-config.js';
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
 const stock=STOCK_ITEMS.map(item=>({...item,count:Math.max(0,Math.floor(s.stock[item.id]||0))})).filter(item=>item.count>0);
 const storedWhole=Object.values(s.stock).reduce((sum,n)=>sum+Math.max(0,Math.floor(n)),0);
 const available=[...new Set((v.available||[]).map(canonicalBiome))].filter(b=>b!==native&&biomeResource(b)).sort();
 const options=[...(nativeResource&&v.dimension==='minecraft:overworld'?[{id:native,mode:'specialize'}]:[]),...available.map(id=>({id,mode:'diversify'}))];
 const choices=options.map(({id,mode})=>{
  const sample=v.biomeSamples?.[id],resource=biomeResource(id);
  const verified=mode==='specialize'||!!sample&&Math.hypot(sample.x-v.location.x,sample.z-v.location.z)<=256;
  const selected=v.biomeUnlocked&&(mode==='specialize'?v.productionMode==='specialize':v.productionMode!=='specialize'&&v.productionMode!=='unassigned'&&v.secondary===id);
  const proposed={...v,biomeUnlocked:true,productionMode:mode,secondary:mode==='specialize'?null:id};
  const projected=mode==='specialize'&&!v.biomeUnlocked?rates:resourceRates(proposed,s);
  const hourly=(projected.find(r=>r.id===resource.id)?.rate||0)*(1+bonus);
  return {id,mode,verified,selected,texture:`textures/ui/frontier/production/${resource.id.replace('minecraft:','')}`,
   hourly,item:resource.id,text:`${biomeName(id)}\n+ ${hourly.toFixed(3)} ${resource.name}/hour`};
 });
 const biomes={rows:choices,count:choices.length};
 const prosperity=localLevel(s,v,'efficiency')*0.05,dev=development(v)*0.001;
 const allocationWeight=allocations.reduce((n,a)=>n+C.categories[a.category].rate*0.5,0);
 const cropWeight=allocations.reduce((n,a)=>n+(a.crop?C.categories[a.category].rate*0.5:0),0);
 // River boosts crops only: weight its contribution across current output.
 const riverMultiplier=allocationWeight?1+river*cropWeight/allocationWeight:1;
 const total=((1+prosperity)*(1+dev)*(1+bonus)*riverMultiplier-1)*100;
 const modifierRows=[{label:'Prosperity',percent:prosperity*100},{label:'Development',percent:dev*100},{label:'Colonization',percent:bonus*100},
  ...(river?[{label:'River',percent:river*100}]:[]),{label:'Total',percent:total}]
  .map(row=>({...row,value:`+ ${Number(row.percent.toFixed(2))}`}));
 return {
  status:full?'Stockpile full - paused':!recordedPower(v)?'Waiting for Realm Power':!rates.length?'No resource assigned':'Producing',
  items:output.rows.map(r=>({...r,text:`${r.name}\n+ ${r.actual.toFixed(3)}/hour`})),
  modifierRows,
  stockHeading:`Stockpile  ${storedWhole} / ${cap}`,
  choices,output,stock,biomes,allocations,river,
 };
}
