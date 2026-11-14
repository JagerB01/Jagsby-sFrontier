import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
const code=await readFile(new URL('../packs/behavior/scripts/map-navigation.js',import.meta.url),'utf8');
const {createMapNavigation}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('interactive map pans with joystick/mouse-look and restores permissions on exit, reconnect and damage',()=>{
 const callbacks={},props=new Map(),permissions=new Map([[4,true],[6,false]]);let interval,cleared=0,returned=0,rotation={x:0,y:0},move={x:0,y:0},adjusted=[],titles=[];
 const p={id:'p',isValid:true,dimension:{id:'minecraft:overworld'},
 getDynamicProperty:k=>props.get(k),setDynamicProperty:(k,v)=>props.set(k,v),
 inputPermissions:{isPermissionCategoryEnabled:k=>permissions.get(k),setPermissionCategory:(k,v)=>permissions.set(k,v)},
 inputInfo:{getMovementVector:()=>move},getRotation:()=>rotation,onScreenDisplay:{setTitle:t=>titles.push(t)}};
 const world={afterEvents:Object.fromEntries(['playerButtonInput','playerSpawn','playerLeave','worldLoad'].map(k=>[k,{subscribe:fn=>callbacks[k]=fn}])),beforeEvents:{entityHurt:{subscribe:fn=>callbacks.hurt=fn}},getPlayers:()=>[p]};
 const system={run:fn=>fn(),runInterval:fn=>{interval=fn;return 1;},clearRun:()=>cleared++};
 let zoom=0;
 const map={view:()=>({zoom}),adjustView:(...args)=>{adjusted.push(args.slice(2));zoom+=args[4]||0;},render:()=>({rows:Array(12).fill('x'.repeat(32)),info:'map'})};
 const nav=createMapNavigation(world,system,map,()=>({villages:{home:{id:'home'}}}),()=>returned++);
 nav.open(p,'home');assert.equal(permissions.get(4),false);assert.equal(permissions.get(6),false);
 move={x:1,y:0};rotation={x:2,y:4};interval();assert.ok(adjusted[0].some(n=>n!==0));assert.ok(titles[0].startsWith('JF_MAP|'));
 callbacks.playerButtonInput({player:p,button:'Jump',newButtonState:'Pressed'});assert.equal(zoom,1);
 callbacks.playerButtonInput({player:p,button:'Sneak',newButtonState:'Pressed'});
 assert.equal(returned,1);assert.equal(permissions.get(4),true);assert.equal(permissions.get(6),false);assert.equal(cleared,1);
 nav.open(p,'home');callbacks.hurt({hurtEntity:p});assert.equal(permissions.get(4),true);assert.equal(returned,1);
 nav.open(p,'home');callbacks.playerLeave({playerId:'p'});assert.ok(props.get('jagsby_frontier:map_permissions'));
 callbacks.playerSpawn({player:p});assert.equal(permissions.get(4),true);assert.equal(permissions.get(6),false);
});

test('HUD binds exactly twelve map rows and hides only Frontier map titles',async()=>{
 const hud=JSON.parse(await readFile(new URL('../packs/resource/ui/hud_screen.json',import.meta.url),'utf8'));
 const inserted=hud.root_panel.modifications[0].value;
 const overlay=inserted.find(v=>v.frontier_map).frontier_map;
 const rows=overlay.controls.filter(v=>Object.keys(v)[0].startsWith('row_'));
 assert.equal(rows.length,12);
 assert.ok(JSON.stringify(rows[0]).includes('%.39s'));
 assert.ok(JSON.stringify(rows[11]).includes('%.391s'));
 assert.ok(JSON.stringify(hud['hud_title_text/title_frame/title']).includes('JF_MAP|'));
 const ui=JSON.parse(await readFile(new URL('../packs/resource/ui/jagsby_frontier/charter.json',import.meta.url),'utf8'));
 assert.equal(ui['jf_action_mapInteractive@common.button'].$pressed_button_name,'button.form_button_click');
});
