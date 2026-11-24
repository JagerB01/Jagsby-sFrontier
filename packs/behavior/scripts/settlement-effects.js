import {ECONOMY_CONFIG as C} from './economy-config.js';
import {isTownGuard} from './frontier-guards.js';
import {localLevel} from './global-research.js';
import {townGuardSettlement} from './town-guard-posts.js';
export function within(player,v,radius=C.boundaryRadius){return player.dimension.id===v.dimension&&Math.hypot(player.location.x-v.location.x,player.location.z-v.location.z)<=radius;}
export function sanctuaryDamage(damage,level){return damage*Math.max(1e-6,Math.pow(0.95,Math.max(0,level||0)));}
export function hostileSource(source){
 const actor=source?.damagingEntity;
 if(!actor||actor.typeId==='minecraft:player')return false;
 if(!['entityAttack','projectile','entityExplosion','magic','wither'].includes(source.cause))return false;
 try{return actor.typeId.includes('goblin')||actor.matches?.({families:['monster']})||actor.matches?.({families:['hostile']})||false;}catch{return false;}
}
export function refreshProtection(player,villages,now=Date.now(),cap=Infinity){
 const nearby=Object.values(villages).filter(v=>within(player,v,C.protectionRadius));
 const best=nearby.filter(v=>v.sanctuary>0).sort((a,b)=>b.sanctuary-a.sanctuary)[0];
 if(best)player.setDynamicProperty('jagsby_frontier:sanctuary',JSON.stringify({source:best.id,level:Math.min(best.sanctuary,cap),expires:now+180000}));
 if(nearby.some(v=>v.hearth>=2))player.addEffect('regeneration',3600,{amplifier:0,showParticles:false});
 return nearby;
}
export function protectDamage(event,now=Date.now(),readState){
 const target=event.hurtEntity;
 const townGuard=readState&&isTownGuard(target);
 if(target.typeId!=='minecraft:player'&&!townGuard)return;
 if(!hostileSource(event.damageSource))return;
 if(townGuard){
  const s=readState(),v=townGuardSettlement(target,s.villages);
  if(v&&within(target,v,C.protectionRadius))event.damage=sanctuaryDamage(event.damage,localLevel(s,v,'sanctuary'));
  return;
 }
 try{const grant=JSON.parse(target.getDynamicProperty('jagsby_frontier:sanctuary')||'null');
  if(grant&&grant.expires>now)event.damage=sanctuaryDamage(event.damage,grant.level);
 }catch{/* No usable grant. */}
}
export function healVillager(entity,day){
 if(!['minecraft:villager','minecraft:villager_v2'].includes(entity.typeId))return false;
 return healDaily(entity,day);
}
export function healTownGuard(guard,village,day){
 if(!isTownGuard(guard)||!(village?.hearth>=1)||!within(guard,village,C.protectionRadius))return false;
 return healDaily(guard,day);
}
function healDaily(entity,day){
 if(entity.getDynamicProperty('jagsby_frontier:healed_day')===day)return false;
 const health=entity.getComponent('minecraft:health');if(!health)return false;
 health.setCurrentValue(Math.min(health.effectiveMax,health.currentValue+2));
 entity.setDynamicProperty('jagsby_frontier:healed_day',day);return true;
}
