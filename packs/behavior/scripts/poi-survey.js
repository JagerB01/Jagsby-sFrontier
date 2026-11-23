import { HABITATIONS_PATTERNS } from './poi-habitations.js';

// The Bedrock Script API has no generated-structure lookup. These are
// observations of characteristic blocks, including ones placed by players.
export const CLAPPING_EMOTE = '9a469a61-c83b-4ba9-b507-bdbe64430582';
export const POI_KEY = 'jagsby_frontier:surveyed_pois';
export const POI_RADIUS = 48;
const MAX_POIS = 160;
const LANDMARKS = {
 village:{name:'Village',spacing:72},
 trial_chamber:{name:'Trial Chamber',icon:'trial_chambers',spacing:64},
 ancient_city:{name:'Ancient City',spacing:48},
 desert_temple:{name:'Desert Temple',spacing:24},
 jungle_temple:{name:'Jungle Temple',spacing:24},
 stronghold:{name:'Stronghold',spacing:64},
 ocean_monument:{name:'Ocean Monument',spacing:72},
 trail_ruins:{name:'Trail Ruins',spacing:32},
 illager_mine:{name:'Illager Mine',spacing:64},
 illager_camp:{name:'Illager Camp',spacing:64},
 illager_outpost:{name:'Illager Outpost',spacing:48},
 illager_stronghold:{name:'Illager Stronghold',spacing:96},
};
const vanilla=id=>'minecraft:'+id;
const blockId=id=>id.includes(':')?id:vanilla(id);
const copperGrates=['','exposed_','weathered_','oxidized_'].flatMap(stage=>
 [stage+'copper_grate','waxed_'+stage+'copper_grate']);
const terracotta=['hardened_clay',...['black','blue','brown','cyan','gray','green','light_blue','light_gray',
 'lime','magenta','orange','pink','purple','red','white','yellow'].map(color=>color+'_terracotta')];
const CLUES = [
 {anchor:'bell',kind:'village'},
 {anchor:'trial_spawner',kind:'trial_chamber',radius:12,near:[['tuff_bricks'],copperGrates]},
 {anchor:'reinforced_deepslate',kind:'ancient_city'},
 {anchor:'tnt',kind:'desert_temple',radius:6,near:[['sandstone'],['stone_pressure_plate']]},
 {anchor:'dispenser',kind:'jungle_temple',radius:8,near:[['mossy_cobblestone'],['tripwire_hook']]},
 {anchor:'end_portal_frame',kind:'stronghold'},
 {anchor:'sea_lantern',kind:'ocean_monument',radius:8,near:[['water'],['prismarine','prismarine_bricks'],['dark_prismarine']]},
 {anchor:'suspicious_gravel',kind:'trail_ruins',radius:6,near:[['mud_bricks'],terracotta]},
 {anchor:'rev:vindicator_miner_spawner',kind:'illager_mine'},
 ...HABITATIONS_PATTERNS.map(([kind,anchor,pattern])=>({kind,anchor,pattern})),
];
const BY_ANCHOR = new Map();
const TRACKED = new Set();
for(const {anchor,kind,radius,near,pattern} of CLUES){
 const id=blockId(anchor);
 if(!BY_ANCHOR.has(id))BY_ANCHOR.set(id,[]);
 const nearby=near?.map(group=>group.map(vanilla));
 const offsets=pattern?.map(([x,y,z,type])=>[x,y,z,vanilla(type)]);
 BY_ANCHOR.get(id).push({kind,radius,nearby,offsets});
 for(const type of [id,...(nearby?.flat()??[]),...(offsets?.map(offset=>offset[3])??[])])TRACKED.add(type);
}
const valid=point=>Object.hasOwn(LANDMARKS,point?.kind)&&[point.x,point.y,point.z].every(Number.isInteger);
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
 const {name,icon}=LANDMARKS[point.kind];
 return {...point,id:`survey:${point.kind}:${point.x},${point.y},${point.z}`,type:'survey',
  dimension:'minecraft:overworld',name,texture:`textures/ui/frontier/poi_markers/${icon??point.kind}`};
}

// A section has 4,096 block positions. Base-36 tokens keep a full section
// comfortably below the world dynamic-property string limit.
function placementSlot({x,y,z}){
 const local=n=>n&15;
 return {
  key:`jagsby_frontier:poi_placed:${Math.floor(x/16)}:${Math.floor(y/16)}:${Math.floor(z/16)}`,
  token:(local(x)*256+local(y)*16+local(z)).toString(36),
 };
}

export function rememberPoiPlacement(world,block,typeId,placed){
 if(!TRACKED.has(typeId)||block.dimension.id!=='minecraft:overworld')return;
 const {key,token}=placementSlot(block.location);
 const raw=world.getDynamicProperty(key);
 const members=new Set(typeof raw==='string'&&raw?raw.split(','):[]);
 if(placed===members.has(token))return;
 if(placed)members.add(token);else members.delete(token);
 world.setDynamicProperty(key,members.size?[...members].join(','):undefined);
}

export function wasPoiPlaced(world,position){
 const {key,token}=placementSlot(position);
 const raw=world.getDynamicProperty(key);
 return typeof raw==='string'&&raw.split(',').includes(token);
}

function alreadyMarked(points,marker,position){
 return points.some(point=>point.kind===marker.kind&&Math.abs(point.y-position.y)<=32&&horizontalDistance(point,position)<LANDMARKS[marker.kind].spacing);
}

function blocks(dimension,BlockVolume,from,to,includeTypes){
 return dimension.getBlocks(new BlockVolume(from,to),{includeTypes},true).getBlockLocationIterator();
}

function loadedBlockType(dimension,position){
 try{return dimension.getBlock(position)?.typeId;}catch{return undefined;}
}

function matchesPattern(dimension,pos,offsets,wasPlaced){
 const rotations=[
  (x,z)=>[x,z],(x,z)=>[-z,x],(x,z)=>[-x,-z],(x,z)=>[z,-x],
 ];
 return rotations.some(rotate=>offsets.every(([x,y,z,type])=>{
  const [dx,dz]=rotate(x,z);
  const match={x:pos.x+dx,y:pos.y+y,z:pos.z+dz};
  return loadedBlockType(dimension,match)===type&&!wasPlaced(match);
 }));
}

function* matchesNearby(dimension,BlockVolume,pos,marker,minY,maxY,wasPlaced,hasBlockType){
 const r=marker.radius,from={x:pos.x-r,y:Math.max(minY,pos.y-r),z:pos.z-r};
 const to={x:pos.x+r,y:Math.min(maxY,pos.y+r),z:pos.z+r};
 const types=[...new Set(marker.nearby.flat())].filter(hasBlockType);
 if(!types.length)return false;
 const corroborating=blocks(dimension,BlockVolume,from,to,types);
 yield;
 const found=new Set();
 let checked=0;
 for(const match of corroborating){
  if(++checked%64===0)yield;
  const type=loadedBlockType(dimension,match);
  if(type&&!found.has(type)&&!wasPlaced(match))found.add(type);
  if(marker.nearby.every(group=>group.some(id=>found.has(id))))return true;
 }
 return false;
}

// Yield after each bounded native query to keep the scan out of the tick loop.
export function* surveyLoadedPois(dimension,origin,BlockVolume,points,wasPlaced,hasBlockType=()=>true){
 const habitations=hasBlockType('rev:vindicator_miner_spawner');
 const anchors=[...BY_ANCHOR].filter(([type,markers])=>hasBlockType(type)
  &&(habitations||markers.some(marker=>!marker.offsets)));
 const types=anchors.map(([type])=>type);
 if(!types.length)return 0;
 const minY=Math.max(dimension.heightRange.min,Math.floor(origin.y)-128);
 const maxY=Math.min(dimension.heightRange.max-1,Math.floor(origin.y)+48);
 const minX=Math.floor(origin.x-POI_RADIUS),maxX=Math.floor(origin.x+POI_RADIUS);
 const minZ=Math.floor(origin.z-POI_RADIUS),maxZ=Math.floor(origin.z+POI_RADIUS);
 let discovered=0;
 for(let x=minX;x<=maxX;x+=16)for(let z=minZ;z<=maxZ;z+=16)for(let y=minY;y<=maxY;y+=48){
  if(points.length>=MAX_POIS)return discovered;
  const locations=blocks(dimension,BlockVolume,{x,y,z},{x:Math.min(x+15,maxX),y:Math.min(y+47,maxY),z:Math.min(z+15,maxZ)},types);
  yield;
  let checked=0;
  for(const pos of locations){
   if(++checked%16===0)yield;
   if(points.length>=MAX_POIS)return discovered;
   if(horizontalDistance(pos,origin)>POI_RADIUS)continue;
   const candidates=BY_ANCHOR.get(loadedBlockType(dimension,pos));
   if(!candidates||wasPlaced(pos))continue;
   for(const marker of candidates){
    if(alreadyMarked(points,marker,pos))continue;
    if(marker.offsets&&(!habitations||!matchesPattern(dimension,pos,marker.offsets,wasPlaced)))continue;
    if(marker.nearby&&!(yield* matchesNearby(dimension,BlockVolume,pos,marker,minY,maxY,wasPlaced,hasBlockType)))continue;
    points.push({kind:marker.kind,x:pos.x,y:pos.y,z:pos.z});
    discovered++;
    yield;
    break;
   }
  }
 }
 return discovered;
}
