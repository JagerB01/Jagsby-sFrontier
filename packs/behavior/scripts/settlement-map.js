// Read-only projection of registered POIs. Settlement persistence belongs to the
// existing world registry; viewport/selection belong only to the current form.
import { development } from './settlement-economy.js';
import { biomeName } from './settlement-overview.js';
import { ownerName } from './settlement-realm.js';
import { toMapPoi } from './poi-survey.js';
import { DISTANCE_STEP, ZONE_LEVELS } from './global-research.js';
import { PROVINCE_SIZE, provinceAt, provinceInfo } from './provinces.js';
export const MAP_COLUMNS=40, MAP_ROWS=25, MAP_ASPECT=MAP_COLUMNS/MAP_ROWS;
export const MAP_MIN_SPAN=64, MAP_MAX_SPAN=200000000;
export {PROVINCE_SIZE};
const finite=n=>typeof n==='number'&&Number.isFinite(n);
export function settlementPoints(villages={}) {
 return Object.entries(villages).filter(([,v])=>v&&finite(v.location?.x)&&finite(v.location?.z)&&typeof v.dimension==='string').map(([id,v])=>({
  id,type:'settlement',name:String(v.name||'Unnamed settlement'),dimension:v.dimension,
  texture:'textures/ui/frontier/poi_markers/village',
  x:v.location.x,y:finite(v.location.y)?v.location.y:null,z:v.location.z,development:development(v),biome:biomeName(v.biome),owner:ownerName(v)
 })).sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
}
export function fitMap(points,dimension,provinceAnchor) {
 const inDimension=points.filter(p=>p.dimension===dimension);
 if(!inDimension.length)return {dimension,x:0,z:0,span:256};
 let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
 for(const p of inDimension){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minZ=Math.min(minZ,p.z);maxZ=Math.max(maxZ,p.z);}
 const province=provinceAt(provinceAnchor,dimension);
 if(province){
  const {west,north}=province;
  minX=Math.min(minX,west);maxX=Math.max(maxX,west+PROVINCE_SIZE);
  minZ=Math.min(minZ,north);maxZ=Math.max(maxZ,north+PROVINCE_SIZE);
 }
 return {dimension,x:(minX+maxX)/2,z:(minZ+maxZ)/2,span:Math.min(MAP_MAX_SPAN,Math.max(256,(maxX-minX)*1.2,(maxZ-minZ)*MAP_ASPECT*1.2))};
}
export function provinceLinePixels(min,max,pixels){
 const span=max-min;
 // Keep wide views readable by retaining a power-of-two subset of real borders.
 const stride=PROVINCE_SIZE*2**Math.max(0,Math.ceil(Math.log2(8*span/(pixels*PROVINCE_SIZE))));
 const lines=[];
 for(let at=Math.ceil(min/stride)*stride;at<=max;at+=stride){
  lines.push(Math.max(0,Math.min(pixels-1,Math.round((at-min)/span*pixels))));
 }
 return lines;
}
// Square zone rings are centered on the Overworld origin. The UI draws their
// clipped edges on the same six-pixel lattice used to place POI pins.
function zoneLineMarkers({minX,maxX,minZ,maxZ}){
 const markers=new Set();
 const project=(at,min,max,cells)=>Math.round((at-min)/(max-min)*cells);
 function edge(axis,at,radius,min,max,alongMin,alongMax,acrossCells,alongCells){
  if(at<min||at>max||radius<=alongMin||-radius>=alongMax)return;
  const line=project(at,min,max,acrossCells);
  const start=project(Math.max(-radius,alongMin),alongMin,alongMax,alongCells);
  const end=project(Math.min(radius,alongMax),alongMin,alongMax,alongCells);
  for(let cell=start;cell<end;cell++)markers.add(`[JF:zone:${axis}:${line}:${cell}]`);
 }
 for(const level of ZONE_LEVELS.slice(1)){
  const radius=level*DISTANCE_STEP;
  for(const at of [-radius,radius]){
   edge('x',at,radius,minX,maxX,minZ,maxZ,MAP_COLUMNS,MAP_ROWS);
   edge('z',at,radius,minZ,maxZ,minX,maxX,MAP_ROWS,MAP_COLUMNS);
  }
 }
 return [...markers].join('');
}
export function mapBoundaryMarkers({viewport,bounds},width,height){
 if(viewport.dimension!=='minecraft:overworld')return '';
 const {minX,maxX,minZ,maxZ}=bounds;
 const province=viewport.showProvinces
  ?provinceLinePixels(minX,maxX,width).map(x=>`[JF:province:x:${x}]`).join('')+
   provinceLinePixels(minZ,maxZ,height).map(z=>`[JF:province:z:${z}]`).join('')
  :'';
 return province+(viewport.showZones?zoneLineMarkers(bounds):'');
}
function provincePoints(points,state) {
 const provinces=new Map();
 for(const point of points){
  const province=provinceAt(point,point.dimension);
  if(!province||provinces.has(province.key))continue;
  const info=provinceInfo(state,province);
  provinces.set(province.key,{...province,id:province.key,type:'province',name:info.name,capital:info.capital?.name,
   dimension:point.dimension,texture:'textures/ui/frontier/poi_markers/province'});
 }
 return [...provinces.values()].sort((a,b)=>a.z-b.z||a.x-b.x);
}
export function mapSnapshot(villages,requested={},selectedId=null,spawnLocation=null,surveyed=[],provinces={}) {
 const points=settlementPoints(villages);
 const state={villages,provinces};
 for(const point of points){
  const province=provinceAt(point,point.dimension);
  const info=province&&provinceInfo(state,province);
  if(info?.capitalId===point.id){
   point.provinceName=info.name;
   point.texture='textures/ui/frontier/poi_markers/capital';
  }
 }
 const spawn=finite(spawnLocation?.x)&&finite(spawnLocation?.z)?{id:'world-spawn',type:'spawn',dimension:'minecraft:overworld',name:'World spawn',texture:'textures/ui/frontier/map_markers/world_spawn',x:spawnLocation.x,y:finite(spawnLocation.y)?spawnLocation.y:null,z:spawnLocation.z}:null;
 const fitPoints=[...points,...surveyed.map(toMapPoi)];
 if(spawn)fitPoints.push(spawn);
 const dimensions=[...new Set(fitPoints.map(p=>p.dimension))].sort();
 const dimension=typeof requested.dimension==='string'?requested.dimension:dimensions[0]||'minecraft:overworld';
 if(!dimensions.includes(dimension))dimensions.push(dimension);
 const selected=points.find(p=>p.id===selectedId&&p.dimension===dimension)||null;
 const fitted=fitMap(fitPoints,dimension,selected);
 const viewport={dimension,x:finite(requested.x)?requested.x:fitted.x,z:finite(requested.z)?requested.z:fitted.z,
  span:finite(requested.span)?Math.min(MAP_MAX_SPAN,Math.max(MAP_MIN_SPAN,requested.span)):fitted.span,
  showProvinces:requested.showProvinces??true,showZones:requested.showZones??false,
  provinceViewSpan:requested.provinceViewSpan};
 const width=viewport.span,height=width/MAP_ASPECT;
 const bounds={minX:viewport.x-width/2,maxX:viewport.x+width/2,minZ:viewport.z-height/2,maxZ:viewport.z+height/2};
 const cells=Array.from({length:MAP_COLUMNS*MAP_ROWS},()=>[]);
 const project=point=>{
  if(point.dimension!==dimension||point.x<bounds.minX||point.x>bounds.maxX||point.z<bounds.minZ||point.z>bounds.maxZ)return null;
  const column=Math.min(MAP_COLUMNS-1,Math.floor((point.x-bounds.minX)/width*MAP_COLUMNS));
  const row=Math.min(MAP_ROWS-1,Math.floor((point.z-bounds.minZ)/height*MAP_ROWS));
  return row*MAP_COLUMNS+column;
 };
 const count=points.filter(point=>point.dimension===dimension).length;
 const visible=points.filter(point=>project(point)!==null).length;
 const provinceView=dimension==='minecraft:overworld'&&finite(viewport.provinceViewSpan)&&width>=viewport.provinceViewSpan;
 let page=Number.isInteger(requested.page)?Math.max(0,requested.page):0;
 if(provinceView){
  // Never displace a province marker. Centers sharing a map cell are shown
  // on different pages, each at the cell that contains the actual center.
  for(const point of provincePoints(fitPoints,state)){
   const slot=project(point);
   if(slot!==null)cells[slot].push(point);
  }
  const pageCount=Math.max(1,...cells.map(cell=>cell.length));
  page=Math.min(page,pageCount-1);
  return {viewport,bounds,cells:cells.map(cell=>cell.slice(page,page+1)),dimensions,count,visible,spawn,
   spawnCell:null,page,pageCount,selected,provinceView};
 }
 const projected=[];
 for(const point of fitPoints){
  const slot=project(point);
  if(slot!==null)projected.push({point,slot});
 }
 const pageCount=Math.max(1,Math.ceil(projected.length/cells.length));
 page=Math.min(page,pageCount-1);
 const displaced=[];
 for(const entry of projected.slice(page*cells.length,(page+1)*cells.length)){
  if(cells[entry.slot].length)displaced.push(entry);
  else cells[entry.slot].push(entry.point);
 }
 // Reserve each unoccupied projected cell before moving overlapping pins.
 for(const {point,slot} of displaced){
  const column=slot%MAP_COLUMNS,row=Math.floor(slot/MAP_COLUMNS);
  let closest=-1,best=Infinity;
  for(let i=0;i<cells.length;i++){
   if(cells[i].length)continue;
   const distance=(i%MAP_COLUMNS-column)**2+(Math.floor(i/MAP_COLUMNS)-row)**2;
   if(distance<best){closest=i;best=distance;}
  }
  cells[closest].push(point);
 }
 const spawnIndex=cells.findIndex(cell=>cell[0]?.type==='spawn');
 return {viewport,bounds,cells,dimensions,count,visible,spawn,spawnCell:spawnIndex<0?null:spawnIndex,page,pageCount,selected,provinceView};
}
export function moveMap(viewport,action){
 const next={...viewport};
 if(action==='zoomIn'){
  next.span=Math.max(MAP_MIN_SPAN,next.span/2);
  if(next.span<next.provinceViewSpan)delete next.provinceViewSpan;
 }
 if(action==='zoomOut'){
  next.span=Math.min(MAP_MAX_SPAN,next.span*2);
  // Keep province markers through further zoom steps until the player
  // zooms back in past the step where they first appeared.
  if(next.dimension==='minecraft:overworld')next.provinceViewSpan??=next.span;
 }
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
 if(point.type==='province')return `${point.name}\nCenter: X ${point.x}, Z ${point.z}\nCapital: ${point.capital||'None'}`;
 if(point.type==='spawn')return `World spawn\n${coordinates(point)}`;
 if(point.type==='survey')return `${point.name}\n${coordinates(point)}`;
 return `${point.name}\n${coordinates(point)}\nBiome: ${point.biome}\nDevelopment: ${point.development}\nOwner: ${point.owner}`+
  (point.provinceName?`\nCapital of ${point.provinceName}`:'');
}
