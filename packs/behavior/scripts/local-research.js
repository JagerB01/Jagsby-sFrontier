import {ECONOMY_CONFIG as C} from './economy-config.js';
import {BUILDING} from './global-research.js';
export const LOCAL_KEYS=['hearth','biome','sanctuary','efficiency','roads'];
const aliases={hearth:['hearthstone'],biome:['prospecting','resourceProspecting'],sanctuary:[],efficiency:['prosperity'],roads:['roadNetworks']};
const count=n=>Number.isSafeInteger(n)&&n>=0?n:0;
export function localResearchLevel(v,key){return key==='biome'?Number(Boolean(v.biomeUnlocked)):count(v[key]);}
export function migrateLocalResearch(v,s=null){
 v.localResearch??={};
 if(v.localResearch.version>1)throw Error('Local research save version is newer than this addon');
 if(v.localResearch.version!==1){
  v.localResearch.progress??={};
  for(const key of LOCAL_KEYS){
   let level=localResearchLevel(v,key),progress=count(v.localResearch.progress[key]);
   for(const name of [key,C.research[key].name,...aliases[key]]){
    const record=v.research?.[name];
    level=Math.max(level,count(v[name]),count(typeof record==='number'?record:record?.level));
    progress=Math.max(progress,count(v.localResearch.progress[name]),count(v.researchProgress?.[name]),count(v.localResearchProgress?.[name]),count(record?.progress));
   }
   if(key==='biome')v.biomeUnlocked=level>0;else v[key]=level;
   v.localResearch.progress[key]=progress;
  }
  v.localResearch.version=1;
 }
 v.localResearch.progress??={};v.localResearch.revision??=0;
 for(const key of LOCAL_KEYS)v.localResearch.progress[key]=count(v.localResearch.progress[key]);
 for(const key of LOCAL_KEYS){
  const before=localResearchLevel(v,key);let progress=v.localResearch.progress[key];
  if(C.research[key].max===undefined){
   const allowed=s?Math.max(0,s.global.innovation-before):Infinity;
   const complete=Math.min(allowed,Math.floor(progress/C.research[key].cost));
   v[key]+=complete;progress-=complete*C.research[key].cost;
  }else{
   let cost=localResearchCost(v,key);
   while(cost&&progress>=cost.amount){
    progress-=cost.amount;
    if(key==='biome')v.biomeUnlocked=true;else v[key]++;
    cost=localResearchCost(v,key);
   }
  }
  v.localResearch.progress[key]=progress;
  if(localResearchLevel(v,key)!==before)v.localResearch.revision++;
 }
 return v;
}
export function categoryMaterials(category){
 const mapped=Object.values(C.resources).flat().filter(r=>r.category===category).map(r=>r.id);
 return [...new Set(category==='building'?[...mapped,...BUILDING]:mapped)];
}
export function localResearchCost(v,key){
 const d=C.research[key];if(!d)return null;
 const level=localResearchLevel(v,key);
 if(d.max!==undefined&&level>=d.max)return null;
 const amount=Array.isArray(d.cost)?d.cost[level]:d.cost;
 const materials=d.category?categoryMaterials(d.category):[Array.isArray(d.material)?d.material[level]:d.material];
 return {amount,materials,label:d.label??materials[0].replace('minecraft:','').replaceAll('_',' ')};
}
export function localResearchRequirement(v,key,s=null){
 if(s&&['efficiency','sanctuary'].includes(key)&&localResearchLevel(v,key)>=s.global.innovation)return 'Requires higher Stewardship';
 if(['biome','sanctuary'].includes(key)&&v.hearth<1)return 'Requires Hearthstone I';
 if(key==='efficiency'&&!v.biomeUnlocked)return 'Requires Resource Prospecting';
 if(key==='roads'&&v.sanctuary<1)return 'Requires Sanctuary I';
 return null;
}
export function localContribution(v,key,material,available,s=null){
 const cost=localResearchCost(v,key);
 if(!cost||localResearchRequirement(v,key,s)||!cost.materials.includes(material))return 0;
 return Math.max(0,Math.min(count(available),cost.amount-count(v.localResearch?.progress?.[key])));
}
export function applyLocalContribution(v,key,material,amount,s=null){
 migrateLocalResearch(v,s);
 const accepted=localContribution(v,key,material,amount,s);if(!accepted)return 0;
 v.localResearch.progress[key]+=accepted;
 if(v.localResearch.progress[key]===localResearchCost(v,key).amount){
  if(key==='biome')v.biomeUnlocked=true;else v[key]=localResearchLevel(v,key)+1;
  v.localResearch.progress[key]=0;
 }
 v.localResearch.revision++;
 return accepted;
}
export function localResearchText(v,key,s=null){
 const d=C.research[key],stored=localResearchLevel(v,key),level=!d.max&&s?Math.min(stored,s.global.innovation):stored,cost=localResearchCost(v,key);
 const progress=v.localResearch?.progress?.[key]??0,requirement=localResearchRequirement(v,key,s);
 const prerequisite=key==='hearth'?'None':['biome','sanctuary'].includes(key)?'Hearthstone Lv 1':key==='efficiency'?'Resource Prospecting Lv 1':'Sanctuary Lv 1';
 const ceiling=!d.max?`; Stewardship Lv ${stored+1}`:'';
 const benefits={
  hearth:`Helps people recover health inside this settlement.\nCurrent: ${level===0?'No healing benefit':level===1?'Nearby players recover health over time (Regeneration I)':'Regeneration I for nearby players; villagers also heal 2 health points once per Minecraft day'}.\n${level===0?'Next: players within '+C.boundaryRadius+' blocks gain Regeneration I.':level===1?'Next: nearby villagers also recover 2 health points once per Minecraft day.':''}`,
  biome:`Lets this settlement produce resources from one additional biome while keeping its primary biome.\n${level?'Unlocked: choose a surveyed secondary biome in Production.':'Next: survey within 256 blocks, then choose one verified secondary biome in Production.'}`,
  sanctuary:`Reduces damage from hostile mobs while you are inside this settlement and for 3 minutes after leaving. Does not protect against players or environmental damage.\nCurrent reduction: ${Math.min(99.9999,(1-0.95**level)*100).toFixed(2)}%. Next: ${Math.min(99.9999,(1-0.95**(level+1))*100).toFixed(2)}%.`,
  efficiency:`Increases this settlement's resource output. Each level adds 5% to its production multiplier.\nCurrent bonus: +${level*5}%. Next: +${(level+1)*5}%.\nWorks for offline production too; permanent Development remains separate.`,
  roads:`Unlocks management of trade connections from this settlement. Connections give trade Development and allow travel by spending food.\nResearch: Lv ${level} of 3. Each connection is built and upgraded separately to Trail, Road, then Highway. Manage connections from Realm > Road Networks.`,
 };
 return `Lv ${level}${d.max?' / '+d.max:s?' / '+s.global.innovation+' (Stewardship ceiling)':' (endless)'}\n${benefits[key]}\n${cost?`Next cost: ${cost.amount} ${cost.label}\nContributed: ${progress} / ${cost.amount}; ${Math.max(0,cost.amount-progress)} remaining\nRequires: ${prerequisite}${ceiling}\nStatus: ${requirement||'Available'}`:'Fully upgraded'}`;
}
