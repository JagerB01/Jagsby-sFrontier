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
const bridgeSource = await readFile(new URL('villager-trade-bridge.js', scriptBase), 'utf8');
const bridgeModuleUrl = `data:text/javascript;base64,${Buffer.from(bridgeSource).toString('base64')}`;
const overviewSource = await readFile(new URL('settlement-overview.js',scriptBase),'utf8');
const overviewModuleUrl = `data:text/javascript;base64,${Buffer.from(overviewSource).toString('base64')}`;
const tiersSource = await readFile(new URL('settlement-tiers.js',scriptBase),'utf8');
const tiersModuleUrl = `data:text/javascript;base64,${Buffer.from(tiersSource).toString('base64')}`;
const realmSource=(await readFile(new URL('settlement-realm.js',scriptBase),'utf8'))
  .replace('"./settlement-tiers.js"',JSON.stringify(tiersModuleUrl))
  .replace('"./settlement-overview.js"',JSON.stringify(overviewModuleUrl));
const realmModuleUrl=`data:text/javascript;base64,${Buffer.from(realmSource).toString('base64')}`;
const villager = (id, tier) => ({ id, tier, typeId: 'minecraft:villager_v2' });

test('native trading levels give linear 0.2 to 1.0 contributions', () => {
  assert.deepEqual([0,1,2,3,4].map(describeTradeTier), [2,4,6,8,10]);
  for (const value of [undefined, null, -1, 5, '4', NaN]) {
    assert.equal(describeTradeTier(value), null);
  }
});

test('census queries the charter position once with a 64-block range', () => {
  const location = { x: 10, y: 70, z: -90 };
  let calls = 0;
  const dimension = { getEntities(query) {
    calls++;
    assert.deepEqual(query, { location, maxDistance: 64, families: ['villager'] });
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

test('missing trade data is a minimum estimate, never a false exact score', () => {
  const census = takeCensus({ getEntities: () => [villager('a'), villager('b')] }, {});
  assert.equal(census.unknownRanks, 2);
  assert.equal(census.minimumPowerTenths, 4);
  assert.equal(census.realmPowerTenths, null);
  assert.match(censusText(census), /at least 0.4/);
});

test('empty observations score zero; entity rank read failures remain unknown', () => {
  assert.equal(takeCensus({ getEntities: () => [] }, {}).realmPowerTenths, 0);
  const census = takeCensus({ getEntities: () => [villager('a')] }, {}, () => { throw Error('unloaded'); });
  assert.equal(census.unknownRanks, 1);
});

test('interaction refreshes and persists once; intervals and menu navigation never scan', async () => {
  const handlers = {};
  const queued = [];
  const intervals = [];
  const properties = new Map();
  const dimensions = new Map();
  let scans = 0, biomeReads = 0;
  let nativeTier = 0;
  let population = 1;
  const nativeVillager = {...villager('a'), triggerEvent() {}, getProperty: name => name.endsWith("ready") ? true : nativeTier};
  const makeDimension = id => {
    const dim = { id, getEntities() { scans++; return Array.from({length:population},(_,i)=>({...nativeVillager,id:'v'+i})); },
      getBiome() { biomeReads++; return {id:'minecraft:plains'}; },
      getBlock: location => ({ typeId:'jagsby_frontier:village_charter', location, dimension:dim }) };
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
    show() { const response = menuResponse; menuResponse = {canceled:true}; return Promise.resolve(response ?? {canceled:true}); }
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
      getDimension: id => dimensions.get(id), getPlayers: () => [],
      getDynamicProperty: key => properties.get(key),
      setDynamicProperty: (key,value) => properties.set(key,value) },
    system: { run: fn => queued.push(fn), runInterval: fn => intervals.push(fn),
      runTimeout: fn => {fn();} },
    Form, RenameForm,
  };
  let main = await readFile(new URL('main.js', scriptBase), 'utf8');
  main = main.replace('import { world, system, ItemStack } from "@minecraft/server";',
    'const {world,system}=globalThis.__frontierTest; class ItemStack {}')
    .replace('import { ActionFormData, ModalFormData } from "@minecraft/server-ui";',
      'const ActionFormData=globalThis.__frontierTest.Form;const ModalFormData=globalThis.__frontierTest.RenameForm;')
    .replace('"./village-census.js"', JSON.stringify(moduleUrl))
    .replace('"./menu-display.js"', JSON.stringify(menuModuleUrl))
    .replace('"./charter-layout.js"', JSON.stringify(layoutModuleUrl))
    .replace('"./villager-trade-bridge.js"', JSON.stringify(bridgeModuleUrl))
    .replace('"./settlement-overview.js"',JSON.stringify(overviewModuleUrl))
    .replace('"./settlement-tiers.js"',JSON.stringify(tiersModuleUrl))
    .replace('"./settlement-realm.js"',JSON.stringify(realmModuleUrl));
  await import(`data:text/javascript;base64,${Buffer.from(main).toString('base64')}`);
  const location = { x:0, y:64, z:0 };
  const player = { id:'p', name:'Builder', sendMessage() {}, getComponent() {} };
  const event = { player, block:dimension.getBlock(location), isFirstEvent:true };
  handlers.playerPlaceBlock(event);
  assert.equal(scans, 0);
  for (const callback of intervals) callback();
  assert.equal(scans, 0);
  assert.equal(handlers.playerInteractWithBlock, undefined, 'Must not depend on successful vanilla interactions');
  const heldEvent = {...event,isFirstEvent:false};
  handlers.beforeInteract(heldEvent);
  assert.equal(heldEvent.cancel, true);
  assert.equal(queued.length, 0);
  handlers.beforeInteract(event);
  assert.equal(event.cancel, true);
  handlers.beforeInteract(event);
  assert.equal(queued.length, 1);
  menuResponse = {canceled:false,selection:14}; // Research action; insufficient materials.
  await queued.shift()();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(scans, 1);
  let saved = JSON.parse(properties.get('jagsby_frontier:state_v1'));
  assert.equal(saved.villages['minecraft:overworld|0,64,0'].census.villagers, 1);
  assert.equal(saved.villages['minecraft:overworld|0,64,0'].biome, 'minecraft:plains');
  assert.equal(saved.villages['minecraft:overworld|0,64,0'].census.realmPowerTenths, 2);
  assert.equal(forms[0].heading, 'JF_CHARTER|Dashboard');
  assert.equal(forms[0].records.length,33);
  assert.equal(forms[0].records[24],'[JF:action:rename]');
  assert.equal(forms[0].records[25],'[JF:data:owner]Builder');
  assert.equal(saved.villages['minecraft:overworld|0,64,0'].owner.id,'p');
  assert.equal(forms[0].records[0],'[JF:data:overview]Settlement 1');
  assert.equal(forms[0].records[1],'[JF:data:biomes]Plains');
  assert.equal(forms[0].records[2],'0.2 RP');
  assert.equal(forms[0].records[3],'[JF:data:tier]Outpost');
  assert.equal(forms[0].icons[3],'textures/ui/frontier/settlements/outpost');
  assert.equal(forms[1].text,'[JF:tab:research][JF:research:local][JF:realm:mine]');
  nativeTier = 4;
  handlers.beforeInteract(event);
  await queued.shift()();
  saved = JSON.parse(properties.get('jagsby_frontier:state_v1'));
  assert.equal(saved.villages['minecraft:overworld|0,64,0'].census.realmPowerTenths, 10,
    'A fresh controller sample must reflect a promotion from novice to master');
  handlers.beforeInteract({...event,block:nether.getBlock(location)});
  await queued.shift()();
  saved = JSON.parse(properties.get('jagsby_frontier:state_v1'));
  assert.equal(Object.keys(saved.villages).length, 2);
  assert.equal(scans, 3);
  assert.ok(biomeReads >= 2);
  menuResponse={canceled:false,selection:24};
  renameResponse={canceled:false,formValues:['Oakfield']};
  handlers.beforeInteract(event);
  await queued.shift()();
  await new Promise(resolve=>setImmediate(resolve));
  saved=JSON.parse(properties.get('jagsby_frontier:state_v1'));
  assert.equal(saved.villages['minecraft:overworld|0,64,0'].name,'Oakfield');
  assert.equal(saved.stock['minecraft:iron_ingot'],12,'Rename must preserve concurrent stockpile changes');
  assert.equal(forms.at(-1).records[0],'[JF:data:overview]Oakfield');
  assert.equal(scans,4,'Only the charter interaction should scan; rename must not rescan');
  population=20;
  handlers.beforeInteract(event);
  await queued.shift()();
  assert.equal(forms.at(-1).records[3],'[JF:data:tier]City');
  assert.equal(forms.at(-1).icons[3],'textures/ui/frontier/settlements/city');
  population=5;
  handlers.beforeInteract(event);
  await queued.shift()();
  assert.equal(forms.at(-1).records[3],'[JF:data:tier]Village');
  assert.equal(forms.at(-1).icons[3],'textures/ui/frontier/settlements/village');
  assert.equal(scans,6);
  delete globalThis.__frontierTest;
});
