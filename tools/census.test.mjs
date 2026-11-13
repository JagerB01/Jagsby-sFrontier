import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const scriptBase = new URL('../packs/behavior/scripts/', import.meta.url);
const source = await readFile(new URL('village-census.js', scriptBase), 'utf8');
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const { takeCensus, censusText, describeTradeTier } = await import(moduleUrl);
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
  const makeDimension = id => {
    const dim = { id, getEntities() { scans++; return [villager('a')]; },
      getBiome() { biomeReads++; return {id:'minecraft:plains'}; },
      getBlock: location => ({ typeId:'jagsby_frontier:village_charter', location, dimension:dim }) };
    dimensions.set(id, dim);
    return dim;
  };
  const dimension = makeDimension('minecraft:overworld');
  const nether = makeDimension('minecraft:nether');
  let menuResponse;
  class Form {
    title() { return this; } body() { return this; } button() { return this; }
    show() { const response = menuResponse; menuResponse = {canceled:true}; return Promise.resolve(response ?? {canceled:true}); }
  }
  globalThis.__frontierTest = {
    world: { afterEvents: Object.fromEntries(['playerPlaceBlock','playerInteractWithBlock','playerBreakBlock']
      .map(name => [name,{subscribe: fn => {handlers[name] = fn;}}])),
      getDimension: id => dimensions.get(id), getPlayers: () => [],
      getDynamicProperty: key => properties.get(key),
      setDynamicProperty: (key,value) => properties.set(key,value) },
    system: { run: fn => queued.push(fn), runInterval: fn => intervals.push(fn) },
    Form,
  };
  let main = await readFile(new URL('main.js', scriptBase), 'utf8');
  main = main.replace('import { world, system, ItemStack } from "@minecraft/server";',
    'const {world,system}=globalThis.__frontierTest; class ItemStack {}')
    .replace('import { ActionFormData } from "@minecraft/server-ui";',
      'const ActionFormData=globalThis.__frontierTest.Form;')
    .replace('"./village-census.js"', JSON.stringify(moduleUrl));
  await import(`data:text/javascript;base64,${Buffer.from(main).toString('base64')}`);
  const location = { x:0, y:64, z:0 };
  const player = { id:'p', sendMessage() {} };
  const event = { player, block:dimension.getBlock(location), isFirstEvent:true };
  handlers.playerPlaceBlock(event);
  assert.equal(scans, 0);
  for (const callback of intervals) callback();
  assert.equal(scans, 0);
  handlers.playerInteractWithBlock({...event,isFirstEvent:false});
  assert.equal(queued.length, 0);
  handlers.playerInteractWithBlock(event);
  handlers.playerInteractWithBlock(event);
  assert.equal(queued.length, 1);
  menuResponse = {canceled:false,selection:0}; // Navigate from Overview to Research.
  queued.shift()();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(scans, 1);
  let saved = JSON.parse(properties.get('jagsby_frontier:state_v1'));
  assert.equal(saved.villages['minecraft:overworld|0,64,0'].census.villagers, 1);
  assert.equal(saved.villages['minecraft:overworld|0,64,0'].biome, 'minecraft:plains');
  handlers.playerInteractWithBlock({...event,block:nether.getBlock(location)});
  queued.shift()();
  saved = JSON.parse(properties.get('jagsby_frontier:state_v1'));
  assert.equal(Object.keys(saved.villages).length, 2);
  assert.equal(scans, 2);
  assert.ok(biomeReads >= 2);
  delete globalThis.__frontierTest;
});
