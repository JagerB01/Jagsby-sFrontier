// Read-only projection of registered POIs. Settlement persistence belongs to the
// existing world registry; viewport/selection belong only to the current form.
import { development } from './settlement-economy.js';
import { biomeName } from './settlement-overview.js';
import { ownerName } from './settlement-realm.js';
import { settlementTier } from './settlement-tiers.js';
export const MAP_COLUMNS=40, MAP_ROWS=25, MAP_ASPECT=MAP_COLUMNS/MAP_ROWS;
export const MAP_MIN_SPAN=64, MAP_MAX_SPAN=200000000;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
export function settlementPoints(villages={}) {
 return Object.entries(villages).filter(([,v])=>v&&finite(v.location?.x)&&finite(v.location?.z)&&typeof v.dimension==='string').map(([id,v])=>({
  id,type:'settlement',name:String(v.name||'Unnamed settlement'),dimension:v.dimension,
  texture:'textures/ui/frontier/map_markers/'+settlementTier(v.census).id,
  x:v.location.x,y:finite(v.location.y)?v.location.y:null,z:v.location.z,development:development(v),biome:biomeName(v.biome),owner:ownerName(v)
 })).sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
}
export function fitMap(points,dimension) {
 const inDimension=points.filter(p=>p.dimension===dimension);
 if(!inDimension.length)return {dimension,x:0,z:0,span:256};
 let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
 for(const p of inDimension){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minZ=Math.min(minZ,p.z);maxZ=Math.max(maxZ,p.z);}
 return {dimension,x:(minX+maxX)/2,z:(minZ+maxZ)/2,span:Math.min(MAP_MAX_SPAN,Math.max(256,(maxX-minX)*1.2,(maxZ-minZ)*MAP_ASPECT*1.2))};
}
export function mapSnapshot(villages,requested={},selectedId=null,spawnLocation=null) {
 const points=settlementPoints(villages);
 const spawn=finite(spawnLocation?.x)&&finite(spawnLocation?.z)?{id:'world-spawn',type:'spawn',dimension:'minecraft:overworld',name:'World spawn',texture:'textures/ui/frontier/map_markers/world_spawn',x:spawnLocation.x,y:finite(spawnLocation.y)?spawnLocation.y:null,z:spawnLocation.z}:null;
 const fitPoints=spawn?[...points,spawn]:points;
 const dimensions=[...new Set(fitPoints.map(p=>p.dimension))].sort();
 const dimension=typeof requested.dimension==='string'?requested.dimension:dimensions[0]||'minecraft:overworld';
 if(!dimensions.includes(dimension))dimensions.push(dimension);
 const fitted=fitMap(fitPoints,dimension);
 const viewport={dimension,x:finite(requested.x)?requested.x:fitted.x,z:finite(requested.z)?requested.z:fitted.z,
  span:finite(requested.span)?Math.min(MAP_MAX_SPAN,Math.max(MAP_MIN_SPAN,requested.span)):fitted.span};
 const width=viewport.span,height=width/MAP_ASPECT;
 const bounds={minX:viewport.x-width/2,maxX:viewport.x+width/2,minZ:viewport.z-height/2,maxZ:viewport.z+height/2};
 const cells=Array.from({length:MAP_COLUMNS*MAP_ROWS},()=>[]);
 const project=point=>{
  if(point.dimension!==dimension||point.x<bounds.minX||point.x>bounds.maxX||point.z<bounds.minZ||point.z>bounds.maxZ)return null;
  const column=Math.min(MAP_COLUMNS-1,Math.floor((point.x-bounds.minX)/width*MAP_COLUMNS));
  const row=Math.min(MAP_ROWS-1,Math.floor((point.z-bounds.minZ)/height*MAP_ROWS));
  return row*MAP_COLUMNS+column;
 };
 let count=0,visible=0;
 for(const point of points){
  if(point.dimension!==dimension)continue;
  count++;
  const slot=project(point);
  if(slot===null)continue;
  cells[slot].push(point);
  visible++;
 }
 const spawnCell=spawn?project(spawn):null;
 if(spawnCell!==null)cells[spawnCell].push(spawn);
 return {viewport,bounds,cells,dimensions,count,visible,spawn,spawnCell,selected:points.find(p=>p.id===selectedId&&p.dimension===dimension)||null};
}
export function moveMap(viewport,action){
 const next={...viewport};
 if(action==='zoomIn')next.span=Math.max(MAP_MIN_SPAN,next.span/2);
 if(action==='zoomOut')next.span=Math.min(MAP_MAX_SPAN,next.span*2);
 if(action==='west')next.x-=next.span/4;
 if(action==='east')next.x+=next.span/4;
 if(action==='north')next.z-=next.span/MAP_ASPECT/4;
 if(action==='south')next.z+=next.span/MAP_ASPECT/4;
 return next;
}
function coordinates(point){
 return `X ${point.x}, Y ${point.y??'?'}, Z ${point.z}`;
}
export function mapDetails(point){
 if(!point)return '';
 if(point.type==='spawn')return `Name: World spawn\nCoordinates: ${coordinates(point)}\nDimension: Overworld`;
 return `Name: ${point.name}\nCoordinates: ${coordinates(point)}\nBiome: ${point.biome}\nDevelopment: ${point.development}\nOwner: ${point.owner}`;
}
export function mapCellInfo(points){
 if(!points.length)return '';
 const [first,...nearby]=points;
 const spawn=nearby.find(point=>point.type==='spawn');
 const otherCount=nearby.length-Number(!!spawn);
 return mapDetails(first)+(spawn?`\nWorld spawn: ${coordinates(spawn)}`:'')+
  (otherCount?`\n+${otherCount} nearby. Zoom in to separate.`:'');
}
