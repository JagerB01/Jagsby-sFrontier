export const MAX_SETTLEMENT_NAME_LENGTH = 24;

export function settlementName(value) {
  if (typeof value !== "string") return null;
  const name = value.trim();
  if (!name || [...name].length > MAX_SETTLEMENT_NAME_LENGTH || /[\u0000-\u001f\u007f§]/u.test(name)) return null;
  return name;
}

export function biomeName(biome) {
  if (!biome || biome === "unknown") return "Unknown";
  return biome.replace(/^minecraft:/, "").replaceAll("_", " ")
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

export function powerValue(census) {
  if (!census || census.error) return "Unavailable";
  if (census.realmPowerTenths === null) return `≥ ${(census.minimumPowerTenths / 10).toFixed(1)}`;
  return (census.realmPowerTenths / 10).toFixed(1);
}

export function tradeRouteSummary(s,v){
 const connected=Object.values(s.roads||{}).filter(r=>(r.level||r.targetLevel)&&(r.from===v.id||r.to===v.id))
  .map(road=>({road,target:s.villages[road.from===v.id?road.to:road.from]}))
  .filter(entry=>entry.target).sort((a,b)=>Number(Boolean(a.road.targetLevel))-Number(Boolean(b.road.targetLevel))||a.target.id.localeCompare(b.target.id));
 if(!connected.length)return 'None';
 const {road,target}=connected[0];
 const name=settlementName(target.name)||'Unnamed';
 const more=connected.length>1?` +${connected.length-1}`:'';
 const status=road.targetLevel?'building':['','Trail','Road','Highway'][road.level]||'Route';
 const limit=24-status.length-3-more.length;
 const short=[...name].length>limit?[...name].slice(0,limit-1).join('')+'…':name;
 return `${short} (${status})${more}`;
}

export function developmentRateText(rate){
 if(!(rate>0))return '0';
 if(rate<0.01)return '+<0.01';
 if(rate<99.995)return '+'+rate.toFixed(2);
 if(rate<1000)return '+'+Math.round(rate);
 for(const [size,label]of [[1e12,'T'],[1e9,'B'],[1e6,'M'],[1e3,'k']])if(rate>=size){
  const value=rate/size;return '+'+(value<10?value.toFixed(1):String(Math.round(value)))+label;
 }
}
