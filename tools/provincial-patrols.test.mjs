import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { provincialPatrols } from '../packs/behavior/scripts/provincial-patrols.js';

const id = name => `jagsby_frontier:${name}`;
const overworld = 'minecraft:overworld';

function fixture() {
  const entities = new Map();
  const properties = new Map();
  let sequence = 0, tick = 0;
  const position = (x, y = 64) => ({x, y, z: 0});
  const dimension = {
    id: overworld,
    isChunkLoaded: () => true,
    getTopmostBlock: () => ({location: {y: 63}}),
    getSkyLightLevel: point => point.y > 63 ? 15 : 0,
    getBlock: point => point.y >= 64
      ? {typeId: 'minecraft:air', isAir: true} : {typeId: 'minecraft:grass_block', isLiquidBlocking: () => true},
    spawnEntity(typeId, location, options) {
      if (fixture.failOn === typeId) throw Error('Spawn blocked');
      const actor = create(typeId, location, dimension);
      actor.spawnOptions = options;
      return actor;
    },
  };
  function create(typeId, location, dimension) {
    const values = new Map();
    const actor = {
      id: 'entity-' + ++sequence, typeId, location, dimension, isValid: true, events: [],
      getDynamicProperty: key => values.get(key),
      setDynamicProperty: (key, value) => values.set(key, value),
      setProperty: (key, value) => values.set(key, value),
      triggerEvent(name) { this.events.push(name); },
      getComponent: key => key === 'minecraft:rideable' ? {addRider: rider => Boolean(actor.rider = rider)} : undefined,
      remove() { this.isValid = false; },
    };
    entities.set(actor.id, actor);
    return actor;
  }
  const world = {
    getDynamicProperty: key => properties.get(key),
    setDynamicProperty: (key, value) => properties.set(key, value),
    getEntity: key => entities.get(key),
    getPlayers: () => fixture.players,
  };
  const state = {
    villages: {
      capital: {dimension: overworld, location: position(0), owner: {id: 'owner'}, developmentValue: 1000},
      settlement: {dimension: overworld, location: position(100), developmentValue: 500},
    },
    provinces: {'0,0': {capitalId: 'capital'}},
  };
  const fixture = {
    world, state, dimension, players: [], roll: 0, failOn: '',
    advance: ticks => {tick += ticks;},
    restart: () => provincialPatrols(world, () => state, () => tick, () => fixture.roll),
    source: (mob, x = 400, options = {}) => create(`minecraft:${mob}`, position(x, options.y), options.dimension ?? dimension),
    spawn: (entity, cause = 'Spawned') => fixture.patrol.replace({cause, entity}),
    registry: () => JSON.parse(properties.get(id('provincial_patrols')) ?? '{}'),
    guards: () => [...entities.values()].filter(entity => entity.isValid && entity.typeId.startsWith('jagsby_frontier:')),
  };
  fixture.patrol = fixture.restart();
  return fixture;
}

test('Patrols replace 5% of eligible natural surface animals, zombies and skeletons', () => {
  for (const type of ['cow', 'pig', 'sheep', 'chicken', 'zombie', 'skeleton']) {
    const f = fixture(), source = f.source(type);
    f.roll = 0.05;
    assert.equal(f.spawn(source), false);
    f.roll = 0.04999;
    assert.equal(f.spawn(source), true);
    assert.equal(source.isValid, false);
    assert.deepEqual(f.guards().map(guard => guard.typeId), Array(3).fill(id('swordsman')));
    assert.ok(f.guards().every(guard => guard.getDynamicProperty(id('guard_owner')) === 'owner'));
    assert.equal(new Set(f.guards().map(guard => JSON.stringify(guard.location))).size, 3);
  }
  const f = fixture();
  for (const denied of [
    f.source('zombie', 180), f.source('skeleton', 800, {y: 20}), f.source('cow', 2200),
    f.source('pig', 800, {dimension: {...f.dimension, id: 'minecraft:nether'}}), f.source('creeper'),
  ]) {
    assert.equal(f.spawn(denied), false);
    assert.equal(denied.isValid, true);
  }
  for (const cause of ['Event', 'Loaded', 'Born', 'Transformed']) {
    assert.equal(f.spawn(f.source('sheep'), cause), false);
  }
  f.state.villages.settlement.developmentValue = 499;
  assert.equal(f.spawn(f.source('pig')), false);
  f.state.villages.settlement.developmentValue = 500;
  delete f.state.provinces['0,0'].capitalId;
  assert.equal(f.spawn(f.source('zombie')), false);
  assert.deepEqual(f.guards(), []);
});

test('Development 50 creates a mounted Lancer guide and promotes a Juggernaut if the Lancer dies', () => {
  const f = fixture();
  f.state.villages.settlement.developmentValue = 4000;
  assert.equal(f.spawn(f.source('skeleton')), true);
  const [horse, lancer, firstJuggernaut, secondJuggernaut, arbalist] = f.guards();
  assert.deepEqual(f.guards().map(guard => guard.typeId), ['guard_horse', 'horse_lancer', 'juggernaut', 'juggernaut', 'arbalist'].map(id));
  assert.deepEqual(horse.spawnOptions, {spawnEvent: id('spawn_empty')});
  assert.equal(horse.rider, lancer);
  assert.equal(lancer.getDynamicProperty(id('squad_leader')), true);
  const channel = horse.getDynamicProperty(id('patrol_guide'));
  assert.ok(channel > 0);
  for (const follower of [firstJuggernaut, secondJuggernaut, arbalist]) {
    assert.equal(follower.events.at(-1), id(`patrol_follow_${channel}`));
  }
  lancer.isValid = false;
  assert.equal(f.patrol.onDeath(lancer), true);
  assert.equal(horse.isValid, true, 'The upstream riderless horse lifecycle can release it');
  assert.equal(horse.getDynamicProperty(id('provincial_patrol')), undefined);
  assert.equal(firstJuggernaut.getDynamicProperty(id('squad_leader')), true);
  assert.equal(firstJuggernaut.getDynamicProperty(id('patrol_guide')), channel);
  assert.equal(firstJuggernaut.events.at(-1), id('patrol_walk'));
});

test('Failed placement or partial spawn leaves the original mob and no patrol', () => {
  const f = fixture(), source = f.source('cow');
  f.dimension.isChunkLoaded = () => false;
  assert.equal(f.spawn(source), false);
  f.dimension.isChunkLoaded = () => true;
  f.state.villages.settlement.developmentValue = 4000;
  f.failOn = id('juggernaut');
  assert.throws(() => f.spawn(source), /Spawn blocked/);
  assert.equal(source.isValid, true);
  assert.deepEqual(f.guards(), []);
  assert.deepEqual(f.registry(), {});
});

test('An original Horse Lancer can become a foot Lancer and keep its provincial patrol', () => {
  const f = fixture();
  f.state.villages.settlement.developmentValue = 4000;
  assert.equal(f.spawn(f.source('skeleton')), true);
  const [horse, lancer, juggernaut] = f.guards();
  const patrolKey = id('provincial_patrol');
  const patrolId = lancer.getDynamicProperty(patrolKey);
  const channel = horse.getDynamicProperty(id('patrol_guide'));
  assert.equal(f.patrol.replaceEntity(horse), true);
  horse.remove();
  const foot = f.dimension.spawnEntity(id('lancer'), lancer.location, {spawnEvent:'mn:spawn_hired'});
  foot.setDynamicProperty(patrolKey, patrolId);
  assert.equal(f.patrol.replaceEntity(lancer, foot), true);
  lancer.remove();
  assert.equal(f.registry()[patrolId].mount, undefined);
  assert.deepEqual(f.registry()[patrolId].guards[0], {id:foot.id,typeId:id('lancer')});
  assert.equal(foot.getDynamicProperty(id('squad_leader')), true);
  assert.equal(foot.getDynamicProperty(id('patrol_guide')), channel);
  assert.equal(juggernaut.events.at(-1), id(`patrol_follow_${channel}`));
});

test('Patrol spacing, province slots and expiry survive a reload without duplicating unloaded guards', () => {
  const f = fixture();
  assert.equal(f.spawn(f.source('cow', 400)), true);
  const unloadedGuard = f.guards()[0];
  for (const guard of f.guards()) guard.isValid = false;
  f.patrol = f.restart();
  assert.equal(f.spawn(f.source('pig', 450)), false);
  assert.equal(f.spawn(f.source('pig', 600)), true);
  assert.equal(f.spawn(f.source('pig', 800)), true);
  assert.equal(f.spawn(f.source('pig', 1000)), false);
  f.players = [{dimension: f.dimension, location: {x: 600, y: 64, z: 0}}];
  f.advance(1200);
  f.patrol.tick();
  assert.equal(Object.keys(f.registry()).length, 1);
  unloadedGuard.isValid = true;
  assert.equal(f.patrol.restore(unloadedGuard), true);
  assert.equal(unloadedGuard.isValid, false);
  assert.equal(f.spawn(f.source('chicken', 1000)), true);
});

test('Native patrol goals walk and follow only the squad guide, with combat goals taking priority', async () => {
  for (const role of ['swordsman', 'arbalist', 'juggernaut', 'horse_lancer', 'guard_horse']) {
    const data = JSON.parse(await readFile(new URL(`../packs/behavior/entities/guards/${role}.json`, import.meta.url)));
    const guard = data['minecraft:entity'];
    const walk = guard.component_groups[id('patrol_walk')]['minecraft:behavior.random_stroll'];
    const base = guard.components['minecraft:behavior.random_stroll']
      ?? guard.component_groups['mn:on_foot']['minecraft:behavior.random_stroll'];
    assert.ok(walk.speed_multiplier < base.speed_multiplier);
    if (role === 'guard_horse') continue;
    const follow = guard.component_groups[id('patrol_follow_12')]['minecraft:behavior.follow_mob'];
    assert.deepEqual(follow.filters, {test: 'int_property', subject: 'other', domain: id('patrol_guide'), value: 12});
    const combat = guard.components['minecraft:behavior.ranged_attack'] ?? guard.components['minecraft:behavior.melee_box_attack'];
    assert.ok(combat.priority < follow.priority && follow.priority < walk.priority);
    assert.ok(guard.events[id('patrol_walk')].remove.component_groups.includes(id('patrol_follow_12')));
  }
});
