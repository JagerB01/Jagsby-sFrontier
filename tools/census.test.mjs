import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const scriptBase = new URL('../packs/behavior/scripts/', import.meta.url);
const source = await readFile(new URL('village-census.js', scriptBase), 'utf8');
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const { takeCensus, censusText, describeTradeTier } = await import(moduleUrl);
const menuSource = await readFile(new URL('menu-display.js', scriptBase), 'utf8');
const menuModuleUrl = `data:text/javascript;base64,${Buffer.from(menuSource).toString('base64')}`;
const layoutSource = await readFile(new URL('charter-layout.js', scriptBase), 'utf8');
const layoutModuleUrl = `data:text/javascript;base64,${Buffer.from(layoutSource).toString('base64')}`;
const {CHARTER_LAYOUT}=await import(layoutModuleUrl);
const bridgeSource = await readFile(new URL('villager-trade-bridge.js', scriptBase), 'utf8');
const bridgeModuleUrl = `data:text/javascript;base64,${Buffer.from(bridgeSource).toString('base64')}`;
const overviewModuleUrl = new URL('settlement-overview.js',scriptBase).href;
const tiersSource = await readFile(new URL('settlement-tiers.js',scriptBase),'utf8');
const tiersModuleUrl = `data:text/javascript;base64,${Buffer.from(tiersSource).toString('base64')}`;
const realmSource=(await readFile(new URL('settlement-realm.js',scriptBase),'utf8'))
  .replace('"./settlement-economy.js"',JSON.stringify(new URL('settlement-economy.js',scriptBase).href))
  .replace('"./biome-resources.js"',JSON.stringify(new URL('biome-resources.js',scriptBase).href)).replace('"./settlement-tiers.js"',JSON.stringify(tiersModuleUrl))
  .replace('"./settlement-overview.js"',JSON.stringify(overviewModuleUrl));
const realmModuleUrl=`data:text/javascript;base64,${Buffer.from(realmSource).toString('base64')}`;
const configSource=(await readFile(new URL('economy-config.js',scriptBase),'utf8')).replace("'./biome-resources.js'",JSON.stringify(new URL('biome-resources.js',scriptBase).href));
const configUrl=`data:text/javascript;base64,${Buffer.from(configSource).toString('base64')}`;
const extraUrls=Object.fromEntries(['settlement-economy','settlement-effects','frontier-guards','town-watch','provincial-patrols','settlement-stations','provincial-travel','villager-guards']
  .map(name=>[name,new URL(name+'.js',scriptBase).href]));

const villager = (id, tier) => ({ id, tier, typeId: 'minecraft:villager_v2' });

test('native trading levels give linear 0.2 to 1.0 contributions', () => {
  assert.deepEqual([0,1,2,3,4].map(describeTradeTier), [2,4,6,8,10]);
  for (const value of [undefined, null, -1, 5, '4', NaN]) {
    assert.equal(describeTradeTier(value), null);
  }
});

test('census queries the charter position once with a 80-block range', () => {
  const location = { x: 10, y: 70, z: -90 };
  let calls = 0;
  const dimension = { getEntities(query) {
    calls++;
    assert.deepEqual(query, { location, maxDistance: 80, families: ['villager'] });
    return [0,1,2,3,4].map(tier => villager(String(tier), tier));
  }};
  const census = takeCensus(dimension, location, e => e.tier, 123);
  assert.equal(calls, 1);
  assert.equal(census.realmPowerTenths, 30);
  assert.equal(census.villagers, 5);
  assert.equal(census.observedAt, 123);
  assert.deepEqual(census.tiers, [1,1,1,1,1]);
});

test('duplicates and non-villagers do not inflate the score', () => {
  const entity = villager('a', 4);
  const census = takeCensus({ getEntities: () => [entity, entity,
    { id:'b', typeId:'minecraft:wandering_trader' },
    { id:'c', typeId:'minecraft:zombie_villager_v2' }] }, {}, e => e.tier);
  assert.equal(census.villagers, 1);
  assert.equal(census.realmPowerTenths, 10);
});

test('missing trade data retains the fallback calculation without estimate markers', () => {
  const census = takeCensus({ getEntities: () => [villager('a'), villager('b')] }, {});
  assert.equal(census.unknownRanks, 2);
  assert.equal(census.minimumPowerTenths, 4);
  assert.equal(census.realmPowerTenths, null);
  assert.match(censusText(census), /Power:§r 0.4/);
  assert.equal(censusText(census).includes('at least'),false);
});

test('empty observations score zero; entity rank read failures remain unknown', () => {
  assert.equal(takeCensus({ getEntities: () => [] }, {}).realmPowerTenths, 0);
  const census = takeCensus({ getEntities: () => [villager('a')] }, {}, () => { throw Error('unloaded'); });
  assert.equal(census.unknownRanks, 1);
});

test('opening uses cached results; Survey refreshes villagers and nearby biomes', async () => {
  const handlers = {};
  const queued = [];
  const intervals = [];
  const properties = new Map();
  const dimensions = new Map();
  let scans = 0, biomeReads = 0, rankWaits = 0, biomeResult = 'minecraft:plains';
  let nativeTier = 0;
  let population = 1;
  const placedStations = new Map();
  const nativeVillager = {...villager('a'), triggerEvent() {}, getProperty: name => name.endsWith("ready") ? true : nativeTier};
  const makeDimension = id => {
    const dim = { id, getEntities() { scans++; return Array.from({length:population},(_,i)=>({...nativeVillager,id:'v'+i})); },
      getBiome() { biomeReads++; return {id:biomeResult}; },
      isChunkLoaded: () => true, heightRange:{max:320},
      getTopmostBlock: () => ({typeId:'minecraft:stone',location:{y:63},isLiquidBlocking:()=>true}),
      getBlock: location => {
        const station = placedStations.get(`${id}|${location.x},${location.y},${location.z}`);
        return station ?? { typeId:'jagsby_frontier:village_charter', location, dimension:dim, isAir:location.x>=500 };
      } };
    dimensions.set(id, dim);
    return dim;
  };
  const dimension = makeDimension('minecraft:overworld');
  const nether = makeDimension('minecraft:nether');
  let menuResponse;
  let renameResponse;
  const forms = [];
  class Form {
    constructor() { this.records=[]; this.icons=[]; forms.push(this); }
    title(value) {this.heading=value; return this; } body(value) {this.text=value; return this; }
    button(value,icon) {this.records.push(value); this.icons.push(icon); return this; }
    show() {
      const response = Array.isArray(menuResponse) ? menuResponse.shift() : menuResponse;
      if(!Array.isArray(menuResponse))menuResponse = {canceled:true};
      return Promise.resolve(response ?? {canceled:true});
    }
  }
  class RenameForm {
    title() {return this;}
    textField() {return this;}
    submitButton() {return this;}
    show() {
      const latest=JSON.parse(properties.get('jagsby_frontier:state_v1'));
      latest.stock['minecraft:iron_ingot']=12;
      properties.set('jagsby_frontier:state_v1',JSON.stringify(latest));
      return Promise.resolve(renameResponse);
    }
  }
  globalThis.__frontierTest = {
    world: { afterEvents: Object.fromEntries(['playerPlaceBlock','playerInteractWithBlock','playerBreakBlock']
      .map(name => [name,{subscribe: fn => {handlers[name] = fn;}}])),
      beforeEvents: {playerInteractWithBlock: {subscribe: fn => {handlers.beforeInteract = fn;}}},
      getDimension: id => dimensions.get(id), getPlayers: () => [], getDefaultSpawnLocation: () => ({x:0,y:64,z:0}),
      getDynamicProperty: key => properties.get(key),
      setDynamicProperty: (key,value) => properties.set(key,value) },
    system: { beforeEvents: {startup: {subscribe(fn){handlers.startup=fn;}}}, run: fn => queued.push(fn), runInterval: (fn,ticks) => {assert.ok([10,100,120].includes(ticks));intervals.push(fn);},
      runTimeout: fn => {rankWaits++;fn();} },
    Form, RenameForm,
  };
  let main = await readFile(new URL('main.js', scriptBase), 'utf8');
  main = main.replace('import { world, system, ItemStack, BlockVolume, BlockTypes } from "@minecraft/server";',
    'const {world,system}=globalThis.__frontierTest; class ItemStack {} class BlockVolume {} const BlockTypes={get(){}};')
    .replace('import { ActionFormData, ModalFormData } from "@minecraft/server-ui";',
      'const ActionFormData=globalThis.__frontierTest.Form;const ModalFormData=globalThis.__frontierTest.RenameForm;')
    .replace('"./poi-survey.js"',JSON.stringify(new URL('poi-survey.js',scriptBase).href))
    .replace('"./settlement-map.js"',JSON.stringify(new URL('settlement-map.js',scriptBase).href))
    .replace('"./provinces.js"',JSON.stringify(new URL('provinces.js',scriptBase).href))
    .replace('"./guard-colors.js"',JSON.stringify(new URL('guard-colors.js',scriptBase).href))
    .replace('"./town-guard-posts.js"',JSON.stringify(new URL('town-guard-posts.js',scriptBase).href))
    .replace('"./charter-placement.js"',JSON.stringify(new URL('charter-placement.js',scriptBase).href))
    .replace('"./village-census.js"', JSON.stringify(moduleUrl))
    .replace('"./menu-display.js"', JSON.stringify(menuModuleUrl))
    .replace('"./charter-layout.js"', JSON.stringify(layoutModuleUrl))
    .replace('"./villager-trade-bridge.js"', JSON.stringify(bridgeModuleUrl))
    .replace('"./settlement-overview.js"',JSON.stringify(overviewModuleUrl))
    .replace('"./biome-resources.js"',JSON.stringify(new URL('biome-resources.js',scriptBase).href)).replace('"./settlement-tiers.js"',JSON.stringify(tiersModuleUrl))
    .replace('"./settlement-realm.js"',JSON.stringify(realmModuleUrl))
    .replace('"./economy-config.js"',JSON.stringify(configUrl))
    .replace('"./global-research.js"',JSON.stringify(new URL('global-research.js',scriptBase).href))
    .replace('"./local-research.js"',JSON.stringify(new URL('local-research.js',scriptBase).href))
    .replace('"./production-display.js"',JSON.stringify(new URL('production-display.js',scriptBase).href));
  for(const [name,url] of Object.entries(extraUrls))main=main.replace(JSON.stringify('./'+name+'.js'),JSON.stringify(url));
  await import(`data:text/javascript;base64,${Buffer.from(main).toString('base64')}`);
  const location = { x:0, y:64, z:0 };
  const player = { id:'p', name:'Builder', sendMessage() {}, getComponent() {} };
  const event = { player, block:dimension.getBlock(location), isFirstEvent:true };
  const components={};
  handlers.startup({blockComponentRegistry:{registerCustomComponent(name,component){components[name]=component;}}});
  const spacing=components['jagsby_frontier:charter_spacing'];
  assert.ok(spacing);
  const firstPlacement={...event,cancel:false};
  spacing.beforeOnPlayerPlace(firstPlacement);
  assert.equal(firstPlacement.cancel,false);
  handlers.playerPlaceBlock(event);
  const closePlacement={...event,cancel:false,block:{dimension,location:{x:80,y:64,z:0}}};
  const chat=[];closePlacement.player={sendMessage:message=>chat.push(message)};
  spacing.beforeOnPlayerPlace(closePlacement);
  assert.equal(closePlacement.cancel,true);
  assert.equal(chat.length,0);
  queued.shift()();
  assert.match(chat[0],/cannot place.*80 blocks/);
  const distantPlacement={...closePlacement,cancel:false,block:{dimension,location:{x:81,y:64,z:0}}};
  spacing.beforeOnPlayerPlace(distantPlacement);
  assert.equal(distantPlacement.cancel,false);
  assert.equal(scans, 0);
  for (const callback of intervals) callback();
  assert.equal(scans, 0);
  assert.equal(handlers.playerInteractWithBlock, undefined, 'Must not depend on successful vanilla interactions');
  const heldEvent = {...event,isFirstEvent:false};
  handlers.beforeInteract(heldEvent);assert.equal(heldEvent.cancel,true);assert.equal(queued.length,0);
  handlers.beforeInteract(event);handlers.beforeInteract(event);assert.equal(queued.length,1);
  menuResponse={canceled:true};await queued.shift()();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(scans,0);assert.equal(rankWaits,0);assert.equal(biomeReads,1,'Opening performs no census or biome scan');
  assert.equal(forms[0].records[2],'Unavailable');
  const interact=async(response={canceled:true},block=event.block)=>{
    menuResponse=response;handlers.beforeInteract({...event,block});await queued.shift()();
    await new Promise(resolve=>setImmediate(resolve));
  };
  await interact({canceled:false,selection:21});
  assert.equal(scans,1);assert.equal(rankWaits,1);assert.equal(biomeReads,198);
  let saved=JSON.parse(properties.get('jagsby_frontier:state_v1'));
  const sourceId='minecraft:overworld|0,64,0';
  assert.equal(saved.villages[sourceId].census.villagers,1);
  assert.equal(saved.villages[sourceId].census.realmPowerTenths,2);
  assert.equal(saved.villages[sourceId].nativeBiome,'minecraft:plains');
  const surveyed=forms.at(-1);assert.equal(surveyed.heading,'JF_CHARTER|Dashboard');
  assert.equal(surveyed.records.length,CHARTER_LAYOUT.recordCount);assert.equal(surveyed.records[2],'0.2 RP');
  assert.equal(surveyed.records[3],'[JF:data:tier]Outpost');assert.equal(surveyed.records[25],'Owner: Builder');
  assert.equal(surveyed.records[64],'Development 0');assert.equal(surveyed.records[60],'+ 0.000');
  assert.equal(surveyed.icons[3],'textures/ui/frontier/settlements/outpost');
  await interact({canceled:false,selection:14});
  assert.ok(forms.at(-1).text.startsWith('[JF:tab:research]'));assert.equal(scans,1);assert.equal(biomeReads,198);
  nativeTier=4;biomeResult='minecraft:forest';
  await interact();saved=JSON.parse(properties.get('jagsby_frontier:state_v1'));
  assert.equal(saved.villages[sourceId].census.realmPowerTenths,2,'Reopening retains the last Survey results');
  assert.equal(scans,1);assert.equal(rankWaits,1);assert.equal(biomeReads,198);
  await interact({canceled:false,selection:21});saved=JSON.parse(properties.get('jagsby_frontier:state_v1'));
  assert.equal(saved.villages[sourceId].census.realmPowerTenths,10);
  assert.equal(saved.villages[sourceId].nativeBiome,'minecraft:plains');
  assert.ok(saved.villages[sourceId].available.includes('minecraft:forest'));
  await interact({canceled:true},nether.getBlock(location));
  saved=JSON.parse(properties.get('jagsby_frontier:state_v1'));
  assert.equal(Object.keys(saved.villages).length,2);assert.equal(scans,2);assert.equal(biomeReads,396);
  renameResponse={canceled:false,formValues:['Oakfield']};await interact({canceled:false,selection:24});
  saved=JSON.parse(properties.get('jagsby_frontier:state_v1'));
  assert.equal(saved.villages[sourceId].name,'Oakfield');assert.equal(saved.stock['minecraft:iron_ingot'],12);
  assert.equal(forms.at(-1).records[0],'[JF:data:overview]Oakfield');assert.equal(scans,2);
  population=20;await interact();
  assert.equal(scans,2);
  await interact({canceled:false,selection:21});
  assert.equal(forms.at(-1).records[3],'[JF:data:tier]City');assert.equal(forms.at(-1).icons[3],'textures/ui/frontier/settlements/city');
  population=5;await interact({canceled:false,selection:21});
  assert.equal(forms.at(-1).records[3],'[JF:data:tier]Village');assert.equal(scans,4);assert.equal(rankWaits,4);
  const previousBiomeReads=biomeReads;
  await interact();
  assert.equal(CHARTER_LAYOUT.actions.roadsNext,undefined);
  assert.equal(scans,4);assert.equal(biomeReads,previousBiomeReads,'Navigation never scans nearby biomes or adds another census');
  assert.doesNotMatch(forms.at(-1).text,/\[JF:row:/);

  const placeStation = (type, x) => {
    const station = {typeId:`jagsby_frontier:${type}`,location:{x,y:64,z:0},dimension};
    placedStations.set(`${dimension.id}|${x},64,0`,station);
    handlers.playerPlaceBlock({player,block:station});
    return station;
  };
  const waystone=placeStation('waystone',75),table=placeStation('map_table',76);
  player.dimension=dimension;
  player.location=waystone.location;
  await interact({canceled:true},waystone);
  assert.equal(forms.at(-1).heading,'JF_CHARTER|Waystone');
  assert.match(forms.at(-1).text,/\[JF:realm:roads\]/);
  assert.match(forms.at(-1).text,/\[JF:row:all:0\]/);
  assert.match(forms.at(-1).text,/\[JF:row:mine:0\]/);
  assert.doesNotMatch(forms.at(-1).text,/\[JF:(?:tab|research|provinceView):/);
  assert.equal(forms.at(-1).records[0],'[JF:data:overview]Oakfield');

  const {poiTravel,fit}=CHARTER_LAYOUT.settlementMap;
  player.location=table.location;
  await interact({canceled:true},table);
  assert.equal(forms.at(-1).heading,'JF_CHARTER|SettlementMap');
  assert.equal(forms.at(-1).records[poiTravel],'');
  saved=JSON.parse(properties.get('jagsby_frontier:state_v1'));
  saved.villages[sourceId].developmentValue=2500;
  saved.provinces={'0,0':{capitalId:sourceId}};
  properties.set('jagsby_frontier:state_v1',JSON.stringify(saved));
  properties.set('jagsby_frontier:surveyed_pois',JSON.stringify([
    {kind:'stronghold',x:500,y:22,z:100},{kind:'village',x:2800,y:63,z:0},
  ]));
  await interact([{selection:fit},{canceled:true}],table);
  assert.equal(forms.at(-2).heading,'JF_CHARTER|SettlementMap');
  assert.deepEqual(forms.at(-2).records,forms.at(-1).records,'The first view matches pressing Fit');
  assert.equal(forms.at(-2).text,forms.at(-1).text);
  assert.doesNotMatch(forms.at(-1).text,/\[JF:(?:tab|research|realm):/);
  let bread=5;
  player.getComponent=()=>({container:{size:1,getItem:()=>({typeId:'minecraft:bread',amount:bread}),
    setItem:(_,item)=>{bread=item?.amount??0;}}});
  const choices=[poiTravel,0,0];
  player.tryTeleport=()=>false;
  await interact(choices.map(selection=>({selection})),table);
  assert.equal(bread,5,'Failed POI travel restores the fare');
  assert.equal(forms.at(-2).records.length,2,'Destinations in a different province are excluded');
  assert.equal(forms.at(-1).records[0],'Travel · 4 corndogs');
  let arrival;
  player.tryTeleport=(position,options)=>{arrival={position,options};return true;};
  await interact(choices.map(selection=>({selection})),table);
  assert.deepEqual(arrival.position,{x:500.5,y:64,z:100.5});
  assert.equal(arrival.options.checkForBlocks,true);
  assert.equal(bread,3);
  delete globalThis.__frontierTest;
});
test('80-block radius includes villagers beyond the old 64-block limit and excludes farther ones',()=>{
 const location={x:100,y:64,z:100};
 const entities=[64,65,80,80.01].map((distance,i)=>({...villager('edge'+i,4),location:{x:location.x+distance,y:64,z:100}}));
 let reads=0;
 const result=takeCensus({getEntities(query){
  reads++;assert.equal(query.maxDistance,80);
  return entities.filter(e=>Math.hypot(e.location.x-query.location.x,e.location.y-query.location.y,e.location.z-query.location.z)<=query.maxDistance);
 }},location,e=>e.tier);
 assert.equal(reads,1);assert.equal(result.radius,80);assert.equal(result.villagers,3);assert.equal(result.realmPowerTenths,30);
});
