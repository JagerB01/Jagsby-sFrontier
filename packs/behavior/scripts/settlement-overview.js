export const MAX_SETTLEMENT_NAME_LENGTH = 24;

export function settlementName(value) {
  if (typeof value !== "string") return null;
  const name = value.trim();
  if (!name || [...name].length > MAX_SETTLEMENT_NAME_LENGTH || /[\u0000-\u001f\u007f§]/u.test(name)) return null;
  return name;
}

const BEDROCK_BIOME_NAMES={"minecraft:dappled_forest":"Dappled Forest","minecraft:plains": "Plains", "minecraft:sunflower_plains": "Sunflower Plains", "minecraft:ice_plains": "Snowy Plains", "minecraft:ice_plains_spikes": "Ice Spikes", "minecraft:forest": "Forest", "minecraft:flower_forest": "Flower Forest", "minecraft:birch_forest": "Birch Forest", "minecraft:birch_forest_mutated": "Old Growth Birch Forest", "minecraft:roofed_forest": "Dark Forest", "minecraft:pale_garden": "Pale Garden", "minecraft:taiga": "Taiga", "minecraft:cold_taiga": "Snowy Taiga", "minecraft:mega_taiga": "Old Growth Pine Taiga", "minecraft:redwood_taiga_mutated": "Old Growth Spruce Taiga", "minecraft:jungle": "Jungle", "minecraft:jungle_edge": "Sparse Jungle", "minecraft:bamboo_jungle": "Bamboo Jungle", "minecraft:meadow": "Meadow", "minecraft:cherry_grove": "Cherry Grove", "minecraft:grove": "Grove", "minecraft:snowy_slopes": "Snowy Slopes", "minecraft:jagged_peaks": "Jagged Peaks", "minecraft:frozen_peaks": "Frozen Peaks", "minecraft:stony_peaks": "Stony Peaks", "minecraft:extreme_hills": "Windswept Hills", "minecraft:extreme_hills_mutated": "Windswept Gravelly Hills", "minecraft:extreme_hills_plus_trees": "Windswept Forest", "minecraft:desert": "Desert", "minecraft:savanna": "Savanna", "minecraft:savanna_plateau": "Savanna Plateau", "minecraft:savanna_mutated": "Windswept Savanna", "minecraft:mesa": "Badlands", "minecraft:mesa_plateau_stone": "Wooded Badlands", "minecraft:mesa_bryce": "Eroded Badlands", "minecraft:river": "River", "minecraft:frozen_river": "Frozen River", "minecraft:swampland": "Swamp", "minecraft:mangrove_swamp": "Mangrove Swamp", "minecraft:beach": "Beach", "minecraft:cold_beach": "Snowy Beach", "minecraft:stone_beach": "Stony Shore", "minecraft:ocean": "Ocean", "minecraft:deep_ocean": "Deep Ocean", "minecraft:warm_ocean": "Warm Ocean", "minecraft:lukewarm_ocean": "Lukewarm Ocean", "minecraft:deep_lukewarm_ocean": "Deep Lukewarm Ocean", "minecraft:cold_ocean": "Cold Ocean", "minecraft:deep_cold_ocean": "Deep Cold Ocean", "minecraft:frozen_ocean": "Frozen Ocean", "minecraft:deep_frozen_ocean": "Deep Frozen Ocean", "minecraft:mushroom_island": "Mushroom Fields"};
export function biomeName(biome) {
  if (!biome || biome === "unknown") return "Unknown";
  if(BEDROCK_BIOME_NAMES[biome])return BEDROCK_BIOME_NAMES[biome];
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
 if(!(rate>0)||!Number.isFinite(rate))return '0.000';
 if(rate<1000)return '+ '+rate.toFixed(3);
 for(const [size,label]of [[1e12,'T'],[1e9,'B'],[1e6,'M'],[1e3,'k']])if(rate>=size)return '+ '+(rate/size).toFixed(3)+label;
}
