// Input enums are the stable @minecraft/server 2.9 values (4 lateral, 6 jump).
const HOLD='jagsby_frontier:map_permissions';
export function createMapNavigation(world,system,map,getState,onExit){
 const sessions=new Map();let runner;
 function restore(p){
  const raw=p.getDynamicProperty(HOLD);if(!raw)return;
  const old=JSON.parse(raw);
  for(const [category,enabled]of Object.entries(old))p.inputPermissions.setPermissionCategory(Number(category),enabled);
  p.setDynamicProperty(HOLD,undefined);
 }
 function close(p,back=true){
  const session=sessions.get(p.id);sessions.delete(p.id);
  try{restore(p);p.onScreenDisplay.setTitle('');}catch{}
  if(!sessions.size&&runner!==undefined){system.clearRun(runner);runner=undefined;}
  if(session&&back)system.run(()=>onExit(p,session.villageId));
 }
 function open(p,villageId){
  const s=getState(),v=s.villages[villageId];if(!v)return;
  restore(p);
  const old={};for(const category of [4,6])old[category]=p.inputPermissions.isPermissionCategoryEnabled(category);
  p.setDynamicProperty(HOLD,JSON.stringify(old));
  try{for(const category of [4,6])p.inputPermissions.setPermissionCategory(category,false);}
  catch(e){restore(p);throw e;}
  sessions.set(p.id,{player:p,villageId,dimension:p.dimension.id,rotation:p.getRotation(),ticks:0});
  if(runner===undefined)runner=system.runInterval(tick,4);
 }
 function tick(){
  for(const session of sessions.values()){
   const p=session.player;
   try{
    if(!p.isValid||p.dimension.id!==session.dimension){close(p,false);continue;}
    const s=getState(),v=s.villages[session.villageId];if(!v){close(p);continue;}
    const move=p.inputInfo.getMovementVector(),rotation=p.getRotation();
    const dx=(((rotation.y-session.rotation.y)+540)%360)-180,dy=rotation.x-session.rotation.x;
    session.rotation=rotation;
    map.adjustView(p,v,-move.x*0.6+Math.max(-12,Math.min(12,dx))*0.12,-move.y*0.6+Math.max(-12,Math.min(12,dy))*0.12);
    if(session.ticks++%2===0){
     const frame=map.render(map.view(p,v),s.villages,p,v.id);
     p.onScreenDisplay.setTitle('JF_MAP|'+frame.rows.join('')+frame.info,{stayDuration:40,fadeInDuration:0,fadeOutDuration:0});
    }
   }catch{close(p,false);}
  }
 }
 world.afterEvents.playerButtonInput?.subscribe(e=>{
  if(!sessions.has(e.player.id)||e.newButtonState!=='Pressed')return;
  if(e.button==='Sneak')close(e.player);
  if(e.button==='Jump'){
   const s=getState(),session=sessions.get(e.player.id),v=s.villages[session.villageId];
   const view=map.view(e.player,v);map.adjustView(e.player,v,0,0,view.zoom>=3?-3:1);
  }
 });
 world.afterEvents.playerSpawn?.subscribe(e=>{try{restore(e.player);}catch{}});
 world.afterEvents.worldLoad?.subscribe(()=>{for(const p of world.getPlayers())try{restore(p);}catch{}});
 world.beforeEvents.entityHurt?.subscribe(e=>{if(sessions.has(e.hurtEntity.id))system.run(()=>close(e.hurtEntity,false));});
 world.afterEvents.entityDie?.subscribe(e=>{if(sessions.has(e.deadEntity.id))close(e.deadEntity,false);});
 world.afterEvents.playerLeave?.subscribe(e=>{sessions.delete(e.playerId);if(!sessions.size&&runner!==undefined){system.clearRun(runner);runner=undefined;}});
 return {open,close,restore};
}
