import { settlementTier } from "./settlement-tiers.js";
import { development, connectionKey } from "./settlement-economy.js";

export function ownerName(village) { return village.owner?.name || "Unclaimed"; }
export function ownerRecord(player) { return {id: player.id, name: player.name || "Unknown player"}; }
export function claimSettlement(state, id, player) {
  const village = state.villages[id];
  if (!village || village.owner) return false;
  village.owner = ownerRecord(player);
  return true;
}

export function directoryRoadState(source,target,roads={}) {
 if(!source)return {canEstablish:false,status:'Open a charter'};
 if(source.id===target.id)return {canEstablish:false,status:'Here'};
 if(source.dimension!==target.dimension)return {canEstablish:false,status:'Different\ndimension'};
 const road=roads[connectionKey(source.id,target.id)]||Object.values(roads).find(r=>(r.from===source.id&&r.to===target.id)||(r.to===source.id&&r.from===target.id));
 if(road?.targetLevel)return {canEstablish:false,status:'Building'};
 if(road?.level)return {canEstablish:false,status:'Connected'};
 if(!source.roads)return {canEstablish:false,status:'Requires\nRoads I'};
 return {canEstablish:true,status:''};
}
export function settlementDirectory(villages, player, requestedPage = 0, mine = false, source=null, roads={}) {
 const settlements=Object.values(villages).filter(v=>!mine||v.owner?.id===player.id).sort((a,b)=>a.name.localeCompare(b.name));
 const pages=Math.max(1,Math.ceil(settlements.length/3));
 const page=Math.max(0,Math.min(pages-1,Math.floor(requestedPage)||0));
 const rows=settlements.slice(page*3,page*3+3).map(target=>{
  const sameDimension=source?.dimension===target.dimension;
  const distance=sameDimension?Math.hypot(target.location.x-source.location.x,target.location.z-source.location.z):null;
  const road=directoryRoadState(source,target,roads);
  return {id:target.id,name:target.name,owner:ownerName(target),icon:settlementTier(target.census).iconTexture,
   coordinates:`${Math.floor(target.location.x)}, ${Math.floor(target.location.y)}, ${Math.floor(target.location.z)}`,
   distance, distanceText:sameDimension?`${Math.round(distance)} blocks`:target.dimension.replace('minecraft:',''),
   development:development(target),canEstablishRoad:road.canEstablish,roadStatus:road.status};
 });
 return {page,pages,count:settlements.length,rows,
  footer:`Page ${page+1} / ${pages}`,empty:mine?'You do not own any settlements yet.':'No settlements registered.'};
}
