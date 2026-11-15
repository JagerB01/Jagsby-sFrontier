// Pure research/economy rules. No world APIs, scanning or per-tick simulations.
export const ZONES = ['Heartlands','Borderlands','Wildlands','Dreadlands','Blightlands','Blackreach'];
const WOODS = ['oak','spruce','birch','jungle','acacia','dark_oak','mangrove','cherry','pale_oak'];
export const LOGS = [...WOODS.flatMap(w=>[`minecraft:${w}_log`,`minecraft:${w}_wood`,`minecraft:stripped_${w}_log`,`minecraft:stripped_${w}_wood`]),... ['crimson','warped'].flatMap(w=>[`minecraft:${w}_stem`,`minecraft:stripped_${w}_stem`,`minecraft:${w}_hyphae`,`minecraft:stripped_${w}_hyphae`])];
export const BUILDING = [...LOGS,...WOODS.map(w=>`minecraft:${w}_planks`),...['crimson_stem','warped_stem','crimson_hyphae','warped_hyphae','crimson_planks','warped_planks','stone','cobblestone','deepslate','cobbled_deepslate','stone_bricks','bricks','sandstone','red_sandstone'].map(w=>`minecraft:${w}`)];
export const DEFINITIONS = {
  innovation:{name:'Innovation',cost:192,materials:['minecraft:copper_ingot']},
  frontier:{name:'Frontier Expansion',max:4,cost:[32,48,32,48],materials:['minecraft:iron_ingot','minecraft:iron_ingot','minecraft:gold_ingot','minecraft:gold_ingot']},
  capacity:{name:'Settlement Capacity',cost:64,materials:LOGS},
  colonization:{name:'Colonization',max:5,cost:[4,8,12,16,20],materials:['minecraft:diamond'],prerequisite:'frontier'},
  storage:{name:'Shared Storage',cost:512,materials:BUILDING,prerequisite:'capacity'},
};
export const RESOURCE_RATES = {
  'minecraft:wheat':0.35,'minecraft:cocoa_beans':0.35,
  ...Object.fromEntries(LOGS.map(id=>[id,0.15])),
  'minecraft:stone':0.15,'minecraft:mud':0.15,'minecraft:sand':0.15,'minecraft:clay_ball':0.05,
};
// Configurable reference basket: one of each DISTINCT resource in RESOURCE_TABLE.
// This avoids weighting duplicated stone mappings or choosing an arbitrary biome.
export const REFERENCE_BASKET = ['minecraft:wheat','minecraft:stone','minecraft:oak_log','minecraft:spruce_log','minecraft:mud','minecraft:clay_ball','minecraft:sand','minecraft:cocoa_beans','minecraft:jungle_log'];
const integer = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
export function migrateState(s, now=Date.now()) {
  if(s.researchVersion>2)throw Error('Research save version is newer than this addon');
  s.villages ??= {}; s.stock ??= {}; s.global ??= {};
  if (s.researchVersion !== 2) {
    s.researchLegacy = JSON.parse(JSON.stringify(s.global));
    // Old development was a zero-based local ceiling (1 + development).
    // Raise Innovation enough to preserve every existing endless upgrade.
    s.global.innovation = Math.max(1,integer(s.global.innovation),integer(s.global.development)+1,integer(s.global.capacity),integer(s.global.storage),...Object.values(s.villages).flatMap(v=>[integer(v.efficiency),integer(v.sanctuary)]));
    s.global.colonization ??= 0;
    s.researchProgress ??= {};
    s.researchVersion = 2;
    // Never backdate the replacement economy into the prototype period.
    s.lastTick = now;
  }
  for(const key of Object.keys(DEFINITIONS)) s.global[key] = integer(s.global[key]);
  s.global.innovation = Math.max(1,s.global.innovation);
  s.global.frontier = Math.min(4,s.global.frontier);
  s.global.colonization = Math.min(5,s.global.colonization);
  s.researchProgress ??= {}; s.researchRevision ??= 0;
  for(const key of Object.keys(DEFINITIONS)) s.researchProgress[key] = integer(s.researchProgress[key]);
  for(const v of Object.values(s.villages)) {v.developmentPoints ??= v.development ?? 0; v.productionRemainders ??= {}; v.available ??= []; v.efficiency ??= 0; v.hearth ??= 0;}
  return s;
}
export function maxLevel(s,key) {return DEFINITIONS[key].max ?? (key==='innovation'?Infinity:s.global.innovation);}
export function nextCost(s,key) {const d=DEFINITIONS[key]; return Array.isArray(d.cost)?d.cost[s.global[key]]:d.cost;}
export function acceptedMaterials(s,key) {const d=DEFINITIONS[key]; return key==='frontier'?[d.materials[s.global[key]]].filter(Boolean):d.materials;}
export function lockReason(s,key) {
  const d=DEFINITIONS[key];
  if(s.global[key]>=maxLevel(s,key)) return d.max?'Maximum level':'Raise Innovation';
  if(d.prerequisite && s.global[d.prerequisite]<1) return `Requires ${DEFINITIONS[d.prerequisite].name} I`;
  return '';
}
export function contribution(s,key,material,available) {
  if(!DEFINITIONS[key]||lockReason(s,key)||!acceptedMaterials(s,key).includes(material)) return 0;
  return Math.max(0,Math.min(integer(available),nextCost(s,key)-s.researchProgress[key]));
}
export function applyContribution(s,key,material,amount) {
  const accepted=contribution(s,key,material,amount);
  if(!accepted)return 0;
  s.researchProgress[key]+=accepted;
  if(s.researchProgress[key]===nextCost(s,key)){s.global[key]++;s.researchProgress[key]=0;}
  s.researchRevision++;
  return accepted;
}
export function settlementLimit(s){return 2+s.global.capacity;}
export function foundingReason(s,zone){
  if(Object.keys(s.villages).length>=settlementLimit(s))return 'Settlement capacity reached';
  const index=ZONES.indexOf(zone);
  if(index<0)return 'Founding unavailable: authoritative MineScape zone detection is not configured';
  return index<=s.global.frontier+1?'':`Requires Frontier Expansion ${index-1} (${zone})`;
}
export function colonizationBonus(s,zone){const index=ZONES.indexOf(zone);return index>0&&s.global.colonization>=index?index/10:0;}
export function storageIncrement(basket=REFERENCE_BASKET){return Math.floor(basket.reduce((sum,id)=>sum+(RESOURCE_RATES[id]??0),0)*10*48+1e-8);}
export function storageCapacity(s,basket=REFERENCE_BASKET){return storageIncrement(basket)*(1+s.global.storage);}
export function stockTotal(s){return Object.values(s.stock).reduce((a,n)=>a+n,0);}
export function localLevel(s,v,key){return Math.min(integer(v[key]),s.global.innovation);}
// Settle all elapsed production using OLD effects before any research/census change.
// Fractional base and bonus output are distinct and persisted, even when capped.
const whole=value=>Math.floor(value+1e-9);
export function produce(s,now,table,zoneAt){
  const hours=Math.max(0,now-s.lastTick)/3600000;
  if(!hours)return;
  s.lastTick=now;
  let room=Math.max(0,storageCapacity(s)-stockTotal(s));
  for(const v of Object.values(s.villages)){
    const power=(v.census?.realmPowerTenths??v.census?.minimumPowerTenths??0)/10;
    const multiplier=power*(1+0.05*localLevel(s,v,'efficiency'))*(1+0.001*v.developmentPoints);
    const bonus=colonizationBonus(s,zoneAt(v.location,v.dimension));
    const ids=new Set([v.biome,v.secondary].filter(Boolean).flatMap(b=>(table[b]??[]).map(r=>r.id)));
    let credited=0;
    for(const id of ids){
      const base=(RESOURCE_RATES[id]??0)*hours*multiplier;
      const prior=v.productionRemainders[id]??{base:0,bonus:0};
      const normal=prior.base+base, extra=prior.bonus+base*bonus;
      const acceptedBase=Math.min(room,whole(normal));room-=acceptedBase;
      const acceptedBonus=Math.min(room,whole(extra));room-=acceptedBonus;
      if(acceptedBase+acceptedBonus)s.stock[id]=(s.stock[id]??0)+acceptedBase+acceptedBonus;
      credited+=acceptedBase;
      // Capacity discards overflow, retaining only sub-item precision.
      v.productionRemainders[id]={base:Math.max(0,normal-whole(normal)),bonus:Math.max(0,extra-whole(extra))};
    }
    v.developmentPoints+=credited;
  }
}
