import {ECONOMY_CONFIG as C} from './economy-config.js';
import {TOWN_ARBALIST_INTERVAL,townGuardLimit} from './frontier-guards.js';
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
 const pending=s?.pendingResearch;
 const pendingHearthstone=pending?.key==='hearth'&&(pending.recipeVersion??0)<2&&s.villages?.[pending.vid]===v;
 for(const key of LOCAL_KEYS){
  if(key==='hearth'&&pendingHearthstone)continue;
  const before=localResearchLevel(v,key);let progress=v.localResearch.progress[key];
  if(C.research[key].max===undefined){
   const allowed=s?Math.max(0,s.global.innovation-before):Infinity;
   const complete=Math.min(allowed,Math.floor(progress/C.research[key].cost));
   v[key]+=complete;progress-=complete*C.research[key].cost;
  }else{
   let cost=localResearchCost(v,key);
   while(cost&&progress>=cost.amount&&(!s||localResearchLevel(v,key)<s.global.innovation)){
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
 return [...new Set(C.researchMaterials[category]??Object.values(C.resources).flat().filter(r=>r.category===category).map(r=>r.id))];
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
 if(s&&localResearchLevel(v,key)>=s.global.innovation)return 'Requires higher Stewardship';
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
// Shared presentation for local and global cards. Text and the arrow preserve
// meaning without relying on colors; native formatting resets after each value.
export function researchComparison(current,next,hasNext=true){
 return `§b${current}§r${hasNext&&next!==current?` §7→§r §a${next}§r`:''}`;
}
export function researchPercent(value){return `${Number(value.toFixed(value>=99.99?4:2))}％`;}
export function localResearchText(v,key,s=null){
 const d=C.research[key],stored=localResearchLevel(v,key),level=!d.max&&s?Math.min(stored,s.global.innovation):stored,cost=localResearchCost(v,key);
 const progress=v.localResearch?.progress?.[key]??0;
 const missing=[];
 if(['biome','sanctuary'].includes(key)&&v.hearth<1)missing.push('Hearthstone Lv 1');
 if(key==='efficiency'&&!v.biomeUnlocked)missing.push('Resource Prospecting Lv 1');
 if(key==='roads'&&v.sanctuary<1)missing.push('Sanctuary Lv 1');
 if(cost&&s&&stored>=s.global.innovation)missing.push('Stewardship Lv '+(stored+1));
 const required=missing.length?'\n§cRequired: '+missing.join('; ')+'§r':'';
 const compare=(now,next)=>researchComparison(now,next,Boolean(cost));
 const reduction=n=>Math.min(99.9999,(1-0.95**n)*100);
 const tier=['Locked','Trail','Road','Highway'];
 let benefit;
 if(key==='sanctuary'){
  const guardLimit=townGuardLimit(v,level);
  const nextGuardLimit=townGuardLimit(v,level+1);
  benefit=`Hostile damage reduction: ${compare(researchPercent(reduction(level)),researchPercent(reduction(level+1)))}\nPlayers and town guards. Players keep it 3 min after leaving.`;
  if(nextGuardLimit>guardLimit){
   const arbalist=nextGuardLimit%TOWN_ARBALIST_INTERVAL===0;
   const arbalists=Math.floor(guardLimit/TOWN_ARBALIST_INTERVAL);
   const previous=arbalist?arbalists:guardLimit-arbalists;
   benefit+=`\nTown Guard ${arbalist?'Arbalist':'Swordsman'} ${compare(previous,previous+1)}`;
  }
 }
 else if(key==='efficiency')benefit=`Resource production: ${compare('+'+researchPercent(level*5),'+'+researchPercent((level+1)*5))}`;
 else if(key==='hearth'){
  benefit=`Villager healing: ${researchComparison(level?'2':'0','2',level===0)} HP / Minecraft day\nAlso heals town guards.`;
  if(level>=1)benefit+=`\nPlayer regeneration: ${compare(level>=2?'I':'Off','I')}\nWithin 80 blocks; persists 3 minutes after leaving.`;
 }else if(key==='biome')benefit=`Second production slot: ${compare(level?'Unlocked':'Locked','Unlocked')}.\nUse both slots for your native biome to double its base output, or Survey within 256 blocks for a different resource.\nChoose in Production > Resource Prospecting.`;
 else if(key==='roads'){
  benefit=`Travel tier: ${compare(tier[level],tier[Math.min(3,level+1)])}`;
  if(level)benefit+=`\nFood cost reduction: ${compare(researchPercent((1-C.roads.foodCostMultipliers[level])*100),researchPercent((1-C.roads.foodCostMultipliers[Math.min(3,level+1)])*100))}`;
  benefit+='\nLimited by completed road tier.\nConstruction: 6 Minecraft days per stage.';
 }

 const accepted=key==='efficiency'?'\nStone, cobblestone, deepslate, cobbled deepslate, granite, diorite, andesite or tuff.':key==='sanctuary'?'\nWheat, potatoes, carrots, cocoa beans, beetroot, sweet berries or glow berries.':'';
 return `Lv ${level}${d.max?' / '+d.max:s?' / '+s.global.innovation:' (endless)'}\n${benefit}\n${cost?`Next cost: ${cost.amount} ${cost.label}${accepted}\nContributed: ${progress} / ${cost.amount}; ${Math.max(0,cost.amount-progress)} remaining${required}`:'§eFully upgraded§r'}`;
}
