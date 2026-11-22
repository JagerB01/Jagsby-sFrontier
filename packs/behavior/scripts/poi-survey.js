// The Bedrock Script API has no generated-structure lookup. These are
// observations of characteristic blocks, including ones placed by players.
export const CLAPPING_EMOTE = '9a469a61-c83b-4ba9-b507-bdbe64430582';
export const POI_KEY = 'jagsby_frontier:surveyed_pois';
export const POI_RADIUS = 48;
export const POI_TEXTURE = 'textures/ui/frontier/map_markers/world_spawn';
const MAX_POIS = 160;
const LANDMARKS = {
 'minecraft:bell': {kind:'village',name:'Village',spacing:72,near:['minecraft:bed'],radius:16},
 'minecraft:trial_spawner': {kind:'trial_chamber',name:'Trial Chamber',spacing:64},
 'minecraft:reinforced_deepslate': {kind:'ancient_city',name:'Ancient City',spacing:48},
 'minecraft:tnt': {kind:'desert_temple',name:'Desert Temple',spacing:24,near:['minecraft:sandstone','minecraft:stone_pressure_plate'],radius:6},
 'minecraft:dispenser': {kind:'jungle_temple',name:'Jungle Temple',spacing:24,near:['minecraft:mossy_cobblestone','minecraft:tripwire_hook'],radius:8},
};
const TYPES = Object.keys(LANDMARKS);
const BY_KIND = new Map(Object.values(LANDMARKS).map(landmark=>[landmark.kind,landmark]));
const valid=point=>BY_KIND.has(point?.kind)&&[point.x,point.y,point.z].every(Number.isInteger);
const horizontalDistance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

export function readSurveyedPois(world){
 const saved=world.getDynamicProperty(POI_KEY);
 if(saved===undefined)return [];
 try{
  const points=JSON.parse(saved);
  return Array.isArray(points)?points.filter(valid):[];
 }catch{return [];}
}

export function toMapPoi(point){
 const name=BY_KIND.get(point.kind).name;
 return {...point,id:`survey:${point.kind}:${point.x},${point.y},${point.z}`,type:'survey',
  dimension:'minecraft:overworld',name,texture:POI_TEXTURE};
}

function alreadyMarked(points,marker,position){
 return points.some(point=>point.kind===marker.kind&&Math.abs(point.y-position.y)<=32&&horizontalDistance(point,position)<marker.spacing);
}

function blocks(dimension,BlockVolume,from,to,includeTypes){
 return dimension.getBlocks(new BlockVolume(from,to),{includeTypes},true).getBlockLocationIterator();
}

function loadedBlockType(dimension,position){
 try{return dimension.getBlock(position)?.typeId;}catch{return undefined;}
}

// Yield after each bounded native query to keep the scan out of the tick loop.
export function* surveyLoadedPois(dimension,origin,BlockVolume,points){
 const minY=Math.max(dimension.heightRange.min,Math.floor(origin.y)-128);
 const maxY=Math.min(dimension.heightRange.max-1,Math.floor(origin.y)+48);
 const minX=Math.floor(origin.x-POI_RADIUS),maxX=Math.floor(origin.x+POI_RADIUS);
 const minZ=Math.floor(origin.z-POI_RADIUS),maxZ=Math.floor(origin.z+POI_RADIUS);
 let discovered=0;
 for(let x=minX;x<=maxX;x+=16)for(let z=minZ;z<=maxZ;z+=16)for(let y=minY;y<=maxY;y+=48){
  if(points.length>=MAX_POIS)return discovered;
  const locations=blocks(dimension,BlockVolume,{x,y,z},{x:Math.min(x+15,maxX),y:Math.min(y+47,maxY),z:Math.min(z+15,maxZ)},TYPES);
  yield;
  let checked=0;
  for(const pos of locations){
   if(++checked%64===0)yield;
   if(points.length>=MAX_POIS)return discovered;
   if(horizontalDistance(pos,origin)>POI_RADIUS)continue;
   const marker=LANDMARKS[loadedBlockType(dimension,pos)];
   if(!marker||alreadyMarked(points,marker,pos))continue;
   if(marker.near){
    const r=marker.radius,from={x:pos.x-r,y:Math.max(minY,pos.y-r),z:pos.z-r};
    const to={x:pos.x+r,y:Math.min(maxY,pos.y+r),z:pos.z+r};
    const corroborating=blocks(dimension,BlockVolume,from,to,marker.near);
    yield;
    const found=new Set();
    for(const match of corroborating){
     found.add(loadedBlockType(dimension,match));
     if(marker.near.every(id=>found.has(id)))break;
    }
    if(!marker.near.every(id=>found.has(id)))continue;
   }
   points.push({kind:marker.kind,x:pos.x,y:pos.y,z:pos.z});
   discovered++;
   yield;
  }
 }
 return discovered;
}
