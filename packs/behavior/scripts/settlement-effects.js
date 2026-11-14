import {ECONOMY_CONFIG as C} from './economy-config.js';
export function within(player,v){return player.dimension.id===v.dimension&&Math.hypot(player.location.x-v.location.x,player.location.z-v.location.z)<=C.boundaryRadius;}
export function sanctuaryDamage(damage,level){return damage*Math.max(1e-6,Math.pow(0.95,Math.max(0,level||0)));}
export function hostileSource(source){
 const actor=source?.damagingEntity;
 if(!actor||actor.typeId==='minecraft:player')return false;
 if(!['entityAttack','projectile','entityExplosion','magic','wither'].includes(source.cause))return false;
 try{return actor.typeId.includes('goblin')||actor.matches?.({families:['monster']})||actor.matches?.({families:['hostile']})||false;}catch{return false;}
}
export function refreshProtection(player,villages,now=Date.now()){
 const nearby=Object.values(villages).filter(v=>within(player,v));
 const best=nearby.filter(v=>v.sanctuary>0).sort((a,b)=>b.sanctuary-a.sanctuary)[0];
 if(best)player.setDynamicProperty('jagsby_frontier:sanctuary',JSON.stringify({source:best.id,level:best.sanctuary,expires:now+180000}));
 if(nearby.some(v=>v.hearth>=1))player.addEffect('regeneration',120,{amplifier:0,showParticles:false});
 return nearby;
}
export function protectDamage(event,now=Date.now()){
 if(event.hurtEntity.typeId!=='minecraft:player'||!hostileSource(event.damageSource))return;
 try{const grant=JSON.parse(event.hurtEntity.getDynamicProperty('jagsby_frontier:sanctuary')||'null');
  if(grant&&grant.expires>now)event.damage=sanctuaryDamage(event.damage,grant.level);
 }catch{/* No usable grant. */}
}
export function healVillager(entity,day){
 if(!['minecraft:villager','minecraft:villager_v2'].includes(entity.typeId))return false;
 if(entity.getDynamicProperty('jagsby_frontier:healed_day')===day)return false;
 const health=entity.getComponent('minecraft:health');if(!health)return false;
 health.setCurrentValue(Math.min(health.effectiveMax,health.currentValue+2));
 entity.setDynamicProperty('jagsby_frontier:healed_day',day);return true;
}
