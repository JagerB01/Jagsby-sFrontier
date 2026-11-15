import {ECONOMY_CONFIG as C} from './economy-config.js';
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
const integer = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
// Same square rings as MineScape 1.5.119 BP/scripts/slayer_hunt_data.js.
export const DISTANCE_STEP = 400;
export const ZONE_LEVELS = Object.freeze([0,6,15,28,46,70]);
export function zoneIndex(location){
 if(!location||!Number.isFinite(location.x)||!Number.isFinite(location.z))return -1;
 const level=Math.floor(Math.max(Math.abs(location.x),Math.abs(location.z))/DISTANCE_STEP);
 let index=0;for(let i=1;i<ZONE_LEVELS.length;i++)if(level>=ZONE_LEVELS[i])index=i;
 return index;
}
export function zoneAt(location){return ZONES[zoneIndex(location)]??null;}
export function migrateResearch(s){
 if(s.researchVersion>3)throw Error('Research save version is newer than this addon');
 s.villages??={};s.stock??={};s.global??={};s.researchProgress??={};
 if(s.researchVersion!==3){
  s.researchLegacy??=JSON.parse(JSON.stringify(s.global));
  s.global.innovation=Math.max(1,integer(s.global.innovation),integer(s.global.development)+1,integer(s.global.capacity),integer(s.global.storage),...Object.values(s.villages).flatMap(v=>[integer(v.efficiency),integer(v.sanctuary)]));
  s.researchVersion=3;
 }
 for(const key of Object.keys(DEFINITIONS)){
  s.global[key]=integer(s.global[key]);s.researchProgress[key]=integer(s.researchProgress[key]);
 }
 s.global.innovation=Math.max(1,s.global.innovation);
 s.global.frontier=Math.min(4,s.global.frontier);s.global.colonization=Math.min(5,s.global.colonization);
 s.researchRevision??=0;
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
// Configurable fixed basket; defaults to one of each distinct implemented resource.
export function referenceBasket(){
 const resources=new Map(Object.values(C.resources).flat().map(r=>[r.id,r]));
 return C.storageReferenceBasket??[...resources.keys()];
}
export function storageIncrement(){
 const resources=new Map(Object.values(C.resources).flat().map(r=>[r.id,r]));
 return Math.floor(referenceBasket().reduce((sum,id)=>sum+(C.categories[resources.get(id)?.category]?.rate??0),0)*10*48+1e-8);
}
export function storageCapacity(s){return storageIncrement()*(1+(s.global.storage||0));}
export function localLevel(s,v,key){return Math.min(integer(v[key]),s.global?.innovation??Infinity);}
