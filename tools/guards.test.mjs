import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { joinGuardSquad, JUGGERNAUT, removeGuardFromSquad, townGuardLimit } from '../packs/behavior/scripts/frontier-guards.js';
import { startVillagerGuards } from '../packs/behavior/scripts/villager-guards.js';
import { GUARD_COLORS, handleGuardEgg, playerGuardColor, refreshGuardColor, selectGuardColor } from '../packs/behavior/scripts/guard-colors.js';
import { bindTownPost, nearestTownPost, townGuardPatrol } from '../packs/behavior/scripts/town-guard-posts.js';
import { fillTownGuardSlot, recordTownGuardDeath, retireTownGuards, validateTownGuard } from '../packs/behavior/scripts/town-watch.js';
import { healTownGuard, protectDamage } from '../packs/behavior/scripts/settlement-effects.js';

const read = path => readFile(new URL('../packs/' + path, import.meta.url), 'utf8');
const json = async path => JSON.parse(await read(path));
const id = name => 'jagsby_frontier:' + name;
const squadRoles = ['swordsman', 'arbalist', 'lancer', 'juggernaut', 'horse_lancer'];
const townRoles = squadRoles.map(role => 'town_' + role);
const guards = [...squadRoles, ...townRoles];
const roster = [...guards, 'guard_horse', 'town_guard_horse'];
const leaderProperty = id('squad_leader');

test('Guard variants reuse v1.4.9 models, biome textures, animations and combat data', async () => {
  const texts = await read('resource/texts/en_US.lang');
  const atlas = (await json('resource/textures/item_texture.json')).texture_data;
  const source = async path => JSON.parse(await readFile(
    new URL('../tools/vendor/villager-guards-1.4.9/' + path, import.meta.url), 'utf8'));
  const behaviorFiles = await readdir(new URL('../packs/behavior/entities/guards/', import.meta.url));
  const clientFiles = await readdir(new URL('../packs/resource/entity/guards/', import.meta.url));
  assert.deepEqual(behaviorFiles.sort(), roster.map(name => name + '.json').sort());
  assert.deepEqual(clientFiles.sort(), roster.map(name => name + '.entity.json').sort());
  const combat = /attack|shooter|charge_held_item|use_kinetic_weapon|knockback_resistance|environment_sensor|damage_sensor|health|equipment/;
  for (const name of roster) {
    const role = name.replace(/^town_/, '').replace(/^guard_horse$/, 'horse_destrier');
    const original = (await source('behavior/' + role + '.json'))['minecraft:entity'];
    const originalClient = (await source('client/' + role + '.entity.json'))['minecraft:client_entity'].description;
    const behavior = (await json('behavior/entities/guards/' + name + '.json'))['minecraft:entity'];
    const client = (await json('resource/entity/guards/' + name + '.entity.json'))['minecraft:client_entity'].description;
    assert.equal(behavior.description.identifier, id(name));
    assert.equal(client.identifier, id(name));
    assert.equal(behavior.description.is_summonable, true);
    assert.equal(behavior.description.is_spawnable, false);
    assert.equal(client.spawn_egg, undefined);
    const group = name.startsWith('town_') ? 'Town Guard' : 'Provincial';
    assert.ok(texts.includes('entity.' + id(name) + '.name=' + group + ' '));
    assert.deepEqual(client.geometry, originalClient.geometry);
    assert.deepEqual(client.scripts, originalClient.scripts);
    assert.deepEqual(client.animations, originalClient.animations);
    for (const [key, texture] of Object.entries(originalClient.textures)) assert.equal(client.textures[key], texture);
    if (!name.endsWith('horse_lancer')) {
      const egg = (await json('behavior/items/guard_eggs/' + name + '_team_egg.json'))['minecraft:item'];
      assert.equal(egg.description.identifier, id(name + '_team_egg'));
      assert.equal(egg.components['minecraft:entity_placer'].entity, id(name));
      const key = egg.components['minecraft:icon'].textures.default;
      assert.ok(key.startsWith('mn_'));
      await read('resource/' + atlas[key].textures + '.png');
      assert.ok(texts.includes(egg.components['minecraft:display_name'].value + '=' + group + ' '));
    }
    if (guards.includes(name)) {
      assert.ok(behavior.components['minecraft:type_family'].family.includes('frontier_guard'));
      assert.ok(behavior.components['minecraft:type_family'].family.includes('villager_guard'));
      assert.deepEqual(behavior.description.properties[leaderProperty], {type: 'bool', default: false, client_sync: true});
      assert.deepEqual(behavior.description.properties[id('headband')],
        {type: 'int', range: [0, GUARD_COLORS.length - 1], default: 0, client_sync: true});
      assert.equal(Object.keys(client.textures).length, 7 * GUARD_COLORS.length);
      for (const texture of Object.values(client.textures)) await read('resource/' + texture + '.png');
      assert.deepEqual(behavior.events['mn:raid_alert'], original.events['mn:raid_alert']);
      assert.deepEqual(behavior.events['mn:spawn_hired'], original.events['mn:spawn_hired']);
      await json('behavior/' + behavior.components['minecraft:equipment'].table);
    }
    for (const [key, value] of Object.entries(original.components).filter(([key]) => combat.test(key))) {
      assert.deepEqual(behavior.components[key], value, name + ' ' + key);
    }
    for (const [group, components] of Object.entries(original.component_groups ?? {})) {
      for (const [key, value] of Object.entries(components).filter(([key]) => combat.test(key))) {
        assert.deepEqual(behavior.component_groups[group][key], value, name + ' ' + group + ' ' + key);
      }
    }
  }
  const controller = (await json('resource/render_controllers/guard_villagers.render_controllers.json'))
    .render_controllers['controller.render.jagsby_frontier.swordsman'];
  const biomes = ['plains', 'desert', 'jungle', 'savanna', 'snow', 'swamp', 'taiga'];
  assert.deepEqual(controller.arrays.textures['Array.biomes'], GUARD_COLORS.flatMap((_, band) =>
    biomes.map(biome => 'Texture.' + biome + (band ? '_band_' + band : ''))));
  assert.deepEqual(controller.textures, [`Array.biomes[query.mark_variant + 7 * query.property('${id('headband')}')]`]);
});

function squadFixture() {
  const properties = new Map();
  const entities = new Map();
  const pending = new Map();
  const world = {
    getDynamicProperty: key => properties.get(key),
    setDynamicProperty(key, value) {
      if (value === undefined) properties.delete(key);
      else properties.set(key, value);
    },
    getEntity(key) {
      const entity = entities.get(key);
      return entity?.isValid ? entity : undefined;
    },
  };
  const dimension = {
    getEntities({location, maxDistance, families}) {
      assert.deepEqual(families, ['frontier_guard']);
      assert.equal(maxDistance, 12);
      return [...entities.values()].filter(entity => entity.isValid
        && Math.abs(entity.location.x - location.x) <= maxDistance);
    },
  };
  return {
    world,
    spawn(role, x = 0) {
      const entity = {
        id: String(entities.size + 1),
        typeId: id(role),
        dimension,
        location: {x, y: 64, z: 0},
        isValid: true,
        leader: false,
        setProperty(key, value) {
          assert.equal(key, leaderProperty);
          pending.set(entity, value);
        },
      };
      entities.set(entity.id, entity);
      joinGuardSquad(world, entity);
      return entity;
    },
    die(entity) {
      entity.isValid = false;
      removeGuardFromSquad(world, entity);
    },
    leaders() {
      for (const [entity, value] of pending) entity.leader = value;
      pending.clear();
      return [...entities.values()].filter(entity => entity.isValid && entity.leader);
    },
  };
}

test('A squad promotes Lancers, Juggernauts and Swordsmen in order and re-elects after deaths', () => {
  const squad = squadFixture();
  const arbalist = squad.spawn('arbalist');
  const swordsman = squad.spawn('swordsman');
  const juggernaut = squad.spawn('juggernaut');
  const lancer = squad.spawn('lancer');
  // All four join before Bedrock applies the queued leader property changes.
  assert.deepEqual(squad.leaders(), [lancer]);
  squad.die(lancer);
  assert.deepEqual(squad.leaders(), [juggernaut]);
  squad.die(juggernaut);
  assert.deepEqual(squad.leaders(), [swordsman]);
  squad.die(swordsman);
  assert.deepEqual(squad.leaders(), [arbalist]);
});

test('Horse Lancers tie foot Lancers, squad membership survives reloading, and other squads keep their leader', () => {
  const squad = squadFixture();
  const horseLancer = squad.spawn('horse_lancer');
  const lancer = squad.spawn('lancer');
  squad.spawn('swordsman');
  squad.spawn('juggernaut');
  const fifthGuard = squad.spawn('arbalist');
  const distantGuard = squad.spawn('lancer', 30);
  assert.deepEqual(squad.leaders(), [horseLancer, fifthGuard, distantGuard]);
  horseLancer.isValid = false;
  joinGuardSquad(squad.world, lancer);
  assert.deepEqual(squad.leaders(), [fifthGuard, distantGuard]);
  horseLancer.isValid = true;
  joinGuardSquad(squad.world, horseLancer);
  assert.deepEqual(squad.leaders(), [horseLancer, fifthGuard, distantGuard]);
  squad.die(horseLancer);
  assert.deepEqual(squad.leaders(), [lancer, fifthGuard, distantGuard]);
});

test('All town variants stay outside squads and favor roads during ordinary village patrols', async () => {
  const squad = squadFixture();
  const town = townRoles.map(role => squad.spawn(role));
  const guards = squadRoles.slice(0, 4).map(role => squad.spawn(role));
  const leader = guards[2];
  assert.deepEqual(squad.leaders(), [leader]);
  for (const member of town) {
    assert.equal(squad.world.getDynamicProperty(id('guard_membership:' + member.id)), undefined);
    squad.die(member);
  }
  assert.deepEqual(squad.leaders(), [leader]);

  for (const role of [...townRoles, 'town_guard_horse']) {
    const {components, component_groups} = (await json('behavior/entities/guards/' + role + '.json'))['minecraft:entity'];
    assert.equal(components['minecraft:home'], undefined);
    const path = components['minecraft:preferred_path'];
    assert.deepEqual(path.preferred_path_blocks[0].blocks, ['grass_path', 'cobblestone', 'gravel']);
    assert.ok(path.preferred_path_blocks[0].cost < path.default_block_cost);
    assert.equal(components['minecraft:behavior.move_towards_dwelling_restriction'], undefined);
    const road = components['minecraft:behavior.move_to_block'];
    const wander = components['minecraft:behavior.random_stroll'];
    const attack = components['minecraft:behavior.melee_box_attack']
      ?? components['minecraft:behavior.ranged_attack'] ?? components['minecraft:behavior.mount_pathing'];
    assert.equal(components['minecraft:dweller'].dweller_role, 'defender');
    assert.equal(components['minecraft:dweller'].can_migrate, false);
    const villageWalk = components['minecraft:behavior.move_through_village'];
    assert.equal(villageWalk.only_at_night, false);
    assert.equal(wander.xz_dist, 24);
    assert.equal(wander.interval, 80);
    assert.deepEqual(road.target_blocks, path.preferred_path_blocks[0].blocks.map(block => 'minecraft:' + block));
    assert.ok(road.start_chance > 0 && road.start_chance < 1);
    assert.ok(attack.priority < road.priority && road.priority < wander.priority && wander.priority < villageWalk.priority);
    if (role === 'town_arbalist') {
      const onFoot = component_groups['mn:on_foot'];
      assert.equal(onFoot['minecraft:behavior.move_towards_dwelling_restriction'], undefined);
      assert.deepEqual(onFoot['minecraft:behavior.random_stroll'], wander);
      assert.deepEqual(onFoot['minecraft:behavior.move_through_village'], villageWalk);
    }
  }
});

test('Both Horse Lancer Team eggs match the correct horse and rider without natural guard spawn rules', async () => {
  for (const prefix of ['', 'town_']) {
    const mount = (await json('behavior/entities/guards/' + prefix + 'guard_horse.json'))['minecraft:entity'];
    assert.deepEqual(mount.events[id('spawn_empty')], {});
    const rideable = mount.components['minecraft:rideable'];
    assert.equal(rideable.seat_count, 1);
    assert.deepEqual(rideable.seats.position, [0, 0.7, -0.2]);
    assert.equal(mount.events['minecraft:entity_spawned'].trigger, 'mn:spawn_with_rider');
    const [group] = mount.events['mn:spawn_with_rider'].add.component_groups;
    const riders = mount.component_groups[group]['minecraft:addrider'].riders;
    assert.deepEqual(riders.map(rider => rider.entity_type), [id(prefix + 'horse_lancer')]);
    const entity = (await json('behavior/entities/guards/' + prefix + 'horse_lancer.json'))['minecraft:entity'];
    const families = entity.components['minecraft:type_family'].family;
    assert.ok(rideable.family_types.some(family => families.includes(family)));
  }
  const path = new URL('../packs/behavior/spawn_rules/', import.meta.url);
  const spawnRules = await readdir(path, {recursive: true}).catch(error => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  for (const rule of spawnRules.filter(path => path.endsWith('.json'))) {
    const {description} = (await json('behavior/spawn_rules/' + rule))['minecraft:spawn_rules'];
    assert.ok(!roster.map(id).includes(description.identifier));
  }
});

test('Player color changes update only their loaded guards and carry over to guards that load later', () => {
  const ownerKey = id('guard_owner');
  const headband = id('headband');
  const make = (owner, valid = true, role = 'swordsman') => ({
    typeId: id(role), isValid: valid, band: 0,
    getDynamicProperty(key) { assert.equal(key, ownerKey); return owner; },
    setProperty(key, value) { assert.equal(key, headband); this.band = value; },
  });
  const own = make('p', true, 'town_arbalist'), other = make('q'), neutral = make(undefined), unloaded = make('p', false);
  const properties = new Map();
  const world = {
    getDynamicProperty: key => properties.get(key),
    setDynamicProperty: (key, value) => properties.set(key, value),
    getDimension: name => ({getEntities: () => name === 'overworld' ? [own, other, neutral, unloaded] : []}),
  };
  selectGuardColor(world, 'p', 1);
  selectGuardColor(world, 'q', 5);
  selectGuardColor(world, 'p', 999);
  assert.deepEqual([own.band, other.band, neutral.band, unloaded.band], [1, 5, 0, 0]);
  assert.equal(playerGuardColor(world, 'p'), 1);
  unloaded.isValid = true;
  refreshGuardColor(world, unloaded);
  assert.equal(unloaded.band, 1);
  selectGuardColor(world, 'p', 0);
  assert.deepEqual([own.band, other.band, neutral.band, unloaded.band], [0, 5, 0, 0]);
});

test('Guard eggs identify the player and seat and bind both mounted entities before spending the egg', () => {
  const village = {dimension: 'minecraft:overworld', location: {x: 1, y: 64, z: 3}};
  function eggAttempt(role, mode, canRide = true, villages = {a: village}) {
    const spawned = [], scheduled = [];
    const item = {typeId: id(role + '_team_egg'), amount: 2};
    let remaining = item.amount;
    const events = [];
    const dimension = {
      id: 'minecraft:overworld',
      getBlock: () => ({isAir: true}),
      spawnEntity(type, position, options) {
        assert.deepEqual(position, {x: 1.5, y: 65, z: 3.5});
        const entity = {
          typeId: type, options, isValid: true,
          getComponent: () => ({addRider: rider => (entity.rider = rider, canRide)}),
          setDynamicProperty(key, value) {
            if (key === id('town_guard_post')) entity.post = JSON.parse(value);
            else {
              assert.equal(key, id('guard_owner'));
              entity.owner = value;
            }
          },
          remove() { entity.isValid = false; },
        };
        spawned.push(entity);
        return entity;
      },
    };
    const event = {
      block: {location: {x: 1, y: 64, z: 3}, dimension}, blockFace: 'Up', itemStack: item,
      player: {
        id: 'player-1', isValid: true, dimension, selectedSlotIndex: 4, getGameMode: () => mode,
        getComponent: () => ({container: {
          getItem: slot => (assert.equal(slot, 4), {...item}),
          setItem(slot, value) {
            assert.equal(slot, 4);
            assert.equal(spawned.at(-1).owner, 'player-1');
            remaining = value?.amount || 0;
          },
        }}),
        sendMessage: message => events.push(message),
      },
    };
    handleGuardEgg(event, callback => scheduled.push(callback), () => villages);
    assert.equal(event.cancel, true);
    assert.deepEqual(spawned, []);
    scheduled[0]();
    return {spawned, remaining, events};
  }
  const foot = eggAttempt('juggernaut', 'Creative');
  assert.equal(foot.spawned[0].owner, 'player-1');
  assert.equal(foot.remaining, 2);
  const town = eggAttempt('town_swordsman', 'Creative');
  assert.equal(town.spawned[0].typeId, id('town_swordsman'));
  assert.equal(town.spawned[0].owner, 'player-1');
  assert.deepEqual(town.spawned[0].post, village);
  const outside = eggAttempt('town_swordsman', 'Survival', true, {});
  assert.deepEqual(outside.spawned, []);
  assert.equal(outside.remaining, 2);
  assert.match(outside.events[0], /within 80 blocks/);
  const horse = eggAttempt('guard_horse', 'Survival');
  const [mount, rider] = horse.spawned;
  assert.equal(mount.options.spawnEvent, id('spawn_empty'));
  assert.equal(mount.rider, rider);
  assert.equal(rider.typeId, id('horse_lancer'));
  assert.equal(rider.owner, 'player-1');
  assert.equal(horse.remaining, 1);
  const townHorse = eggAttempt('town_guard_horse', 'Creative');
  assert.equal(townHorse.spawned[0].typeId, id('town_guard_horse'));
  assert.equal(townHorse.spawned[0].rider.typeId, id('town_horse_lancer'));
  assert.equal(townHorse.spawned[0].rider.owner, 'player-1');
  assert.deepEqual(townHorse.spawned.map(entity => entity.post), [village, village]);
  const failed = eggAttempt('guard_horse', 'Survival', false);
  assert.ok(failed.spawned.every(entity => !entity.isValid));
  assert.equal(failed.remaining, 2);
});

test('Town patrols use the nearest charter in the same dimension and the exact horizontal survey boundary', () => {
  const dimension = {
    id: 'minecraft:overworld',
    getTopmostBlock: ({x, z}) => ({location: {x, y: 64, z}}),
  };
  const village = {dimension: dimension.id, location: {x: 0, y: 54, z: 0}};
  const villages = {a: village, b: {...village, location: {x: -90, y: 50, z: 0}},
    nether: {...village, dimension: 'minecraft:nether', location: {x: 79, y: 50, z: 0}}};
  assert.deepEqual(nearestTownPost(villages, dimension.id, {x: 80, y: 160, z: 0}), village);
  assert.equal(nearestTownPost(villages, dimension.id, {x: 80.01, y: 54, z: 0}), undefined);
  assert.deepEqual(nearestTownPost(villages, dimension.id, {x: -70, y: 54, z: 0}), villages.b);

  const patrol = townGuardPatrol({getDimension: () => dimension}, () => villages);
  const properties = new Map(), teleports = [];
  const entity = {
    id: 'town-1', typeId: id('town_swordsman'), dimension, location: {x: 100, y: 65, z: 0},
    isValid: true, isOnGround: true, isInWater: false,
    getComponent() {},
    getDynamicProperty: key => properties.get(key),
    setDynamicProperty: (key, value) => properties.set(key, value),
    tryTeleport(point, options) {
      assert.equal(options.checkForBlocks, true);
      teleports.push(point);
      this.location = point;
      return true;
    },
  };
  patrol.track(entity);
  assert.deepEqual(JSON.parse(properties.get(id('town_guard_post'))), village);
  patrol.tick();
  assert.ok(entity.location.x < 80, 'legacy patrol returns within the charter boundary');
  entity.location = {x: 70, y: 65, z: 0};
  patrol.tick();
  entity.location = {x: 80, y: 65, z: 0};
  patrol.tick();
  assert.equal(teleports.length, 1);
  entity.location = {x: 80.1, y: 65, z: 0};
  patrol.tick();
  assert.deepEqual(teleports.at(-1), {x: 70, y: 65, z: 0});
});

test('Town horse returns with its rider when teleporting dismounts the rider', () => {
  const dimension = {
    id: 'minecraft:overworld',
    getTopmostBlock: ({x, z}) => ({location: {x, y: 63, z}}),
  };
  const post = {dimension: dimension.id, location: {x: 0, y: 64, z: 0}};
  const make = (id, typeId) => {
    const properties = new Map();
    return {
      id, typeId, dimension, location: {x: 84, y: 65, z: 0}, isValid: true,
      getDynamicProperty: key => properties.get(key),
      setDynamicProperty: (key, value) => properties.set(key, value),
      tryTeleport(location) { this.location = location; return true; },
    };
  };
  const horse = make('horse', id('town_guard_horse')), rider = make('rider', id('town_horse_lancer'));
  let mounted = true;
  const rideable = {getRiders: () => mounted ? [rider] : [], addRider: entity => (mounted = entity === rider)};
  horse.getComponent = type => type === 'minecraft:rideable' ? rideable : undefined;
  rider.getComponent = type => type === 'minecraft:riding' && mounted ? {entityRidingOn: horse} : undefined;
  horse.tryTeleport = function (location) { this.location = location; mounted = false; return true; };
  bindTownPost(horse, post);
  bindTownPost(rider, post);
  const patrol = townGuardPatrol({getDimension: () => dimension}, () => ({}));
  patrol.track(rider);
  patrol.track(horse);
  patrol.tick();
  assert.ok(horse.location.x < 80);
  assert.deepEqual(rider.location, horse.location);
  assert.equal(mounted, true);
});

test('Sanctuary recruits the unlocked roles within the RP cap and preserves slots across unloads', () => {
  const spawned = [];
  const dimension = {
    id: 'minecraft:overworld',
    getBlock: ({y}) => y < 64 ? {typeId: 'minecraft:grass_block'} : {isAir: true},
    spawnEntity(typeId, location) {
      const props = new Map();
      const entity = {
        typeId, location, id: String(spawned.length + 1), isValid: true,
        setDynamicProperty: (key, value) => props.set(key, value),
        getDynamicProperty: key => props.get(key),
        remove() { this.isValid = false; },
      };
      spawned.push(entity);
      return entity;
    },
  };
  const world = {getDimension: () => dimension, getEntity: key => spawned.find(entity => entity.id === key && entity.isValid)};
  const village = {dimension: dimension.id, location: {x: 0, y: 64, z: 0}, sanctuary: 6,
    owner: {id: 'owner-1'}, census: {realmPowerTenths: 50}};
  let saved = {villages: {'minecraft:overworld|0,64,0': village}, global: {innovation: 6}};
  const readState = () => saved;
  const saveState = state => { saved = state; };

  assert.equal(townGuardLimit({}, 6), 0);
  assert.equal(townGuardLimit(village, 2), 2);
  const limit = townGuardLimit(village, 6);
  assert.equal(limit, 3);
  for (let slot = 0; slot < limit; slot++) assert.equal(fillTownGuardSlot(world, village, limit, 4), true);
  assert.deepEqual(spawned.map(guard => guard.typeId), ['town_swordsman', 'town_swordsman', 'town_arbalist'].map(id));
  assert.equal(spawned[2].getDynamicProperty(id('guard_owner')), 'owner-1');
  spawned[0].isValid = false;
  village.townGuardSlots = JSON.parse(JSON.stringify(village.townGuardSlots));
  assert.equal(fillTownGuardSlot(world, village, limit, 4), false, 'unloaded slots stay occupied');
  spawned[0].isValid = true;
  assert.equal(validateTownGuard(spawned[0], readState, saveState), true);
  recordTownGuardDeath(spawned[2], 4, readState, saveState);
  spawned[2].isValid = false;
  assert.equal(fillTownGuardSlot(world, village, limit, 4), false);
  assert.equal(fillTownGuardSlot(world, village, limit, 5), true);
  assert.equal(spawned[3].typeId, id('town_arbalist'));
  village.census.realmPowerTenths = 20;
  spawned[3].isValid = false;
  assert.equal(retireTownGuards(world, village, townGuardLimit(village, 6)), true);
  assert.deepEqual(village.townGuardSlots, [spawned[0].id]);
  assert.equal(spawned[1].isValid, false, 'loaded surplus guards retire immediately');
  spawned[3].isValid = true;
  assert.equal(validateTownGuard(spawned[3], readState, saveState), false);
  assert.equal(spawned[3].isValid, false, 'unloaded surplus guards retire on load');
});

test('Town guards receive daily Hearthstone healing and their charter’s hostile damage reduction', () => {
  const props = new Map();
  let hp = 17;
  const guard = {
    typeId: id('town_arbalist'), location: {x: 80, y: 80, z: 0}, dimension: {id: 'minecraft:overworld'},
    setDynamicProperty: (key, value) => props.set(key, value),
    getDynamicProperty: key => props.get(key),
    getComponent: () => ({currentValue: hp, effectiveMax: 20, setCurrentValue: value => {hp = value;}}),
  };
  const village = {dimension: guard.dimension.id, location: {x: 0, y: 64, z: 0}, hearth: 1, sanctuary: 3};
  bindTownPost(guard, village);
  assert.equal(healTownGuard(guard, village, 4), true);
  assert.equal(hp, 19);
  assert.equal(healTownGuard(guard, village, 4), false);
  assert.equal(healTownGuard(guard, village, 5), true);
  assert.equal(hp, 20);

  const state = {villages: {'0,64,0': village}, global: {innovation: 2}};
  const damageFrom = (damagingEntity, cause = 'entityAttack') => {
    const event = {hurtEntity: guard, damageSource: {cause, damagingEntity}, damage: 20};
    protectDamage(event, 0, () => state);
    return event.damage;
  };
  const zombie = {typeId: 'minecraft:zombie', matches: ({families}) => families.includes('monster')};
  assert.ok(Math.abs(damageFrom(zombie) - 18.05) < 1e-6);
  assert.equal(damageFrom({typeId: 'minecraft:player'}, 'projectile'), 20);
  assert.equal(damageFrom(zombie, 'fall'), 20);
  guard.location.x = 80.01;
  assert.equal(damageFrom(zombie), 20);
  assert.equal(healTownGuard(guard, village, 6), false);
  guard.location.x = 0;
  village.hearth = 0;
  assert.equal(healTownGuard(guard, village, 6), false);
});

test('The original Juggernaut shield handles front, back, projectiles and axe breaks', () => {
  let shield;
  const signal = {subscribe() {}};
  startVillagerGuards({
    afterEvents: {dataDrivenEntityTrigger: signal, entityHurt: signal, entityDie: signal,
      playerSpawn: signal, playerInteractWithEntity: signal},
    beforeEvents: {playerInteractWithEntity: signal, entityHurt: {subscribe(handler) { shield = handler; }}},
  }, {run: callback => callback(), runInterval() {}}, undefined, {});
  const events = [], sounds = [];
  const guard = {
    typeId: JUGGERNAUT, isValid: true,
    getProperty(key) { assert.equal(key, 'mn:shield_state'); return 'shielding'; },
    triggerEvent(name) { events.push(name); },
    dimension: {playSound(name) { sounds.push(name); }},
    location: {x: 0, z: 0},
    getViewDirection: () => ({x: 0, z: 1}),
  };
  const check = (damageSource, target = guard) => {
    const event = {hurtEntity: target, damageSource, cancel: false};
    shield(event);
    return event.cancel;
  };
  const melee = {cause: 'entityAttack', damagingEntity: {location: {x: 0, z: 3}}};
  assert.equal(check(melee), true);
  assert.equal(check(melee, {...guard, typeId: id('town_juggernaut')}), true);
  assert.equal(check({...melee, damagingEntity: {location: {x: 0, z: -3}}}), false);
  assert.equal(check({...melee, cause: 'fall'}), false);
  assert.equal(check(melee, {...guard, getProperty: () => 'ready'}), false);
  assert.equal(check(melee, {...guard, typeId: id('swordsman')}), false);
  assert.equal(check({cause: 'projectile', damagingProjectile: {location: {x: 0, z: 1}}}), true);
  assert.equal(check({cause: 'projectile', damagingProjectile: {location: {x: 0, z: -1}}}), false);
  const axe = {...melee.damagingEntity, isValid: true, typeId: 'minecraft:vindicator',
    getComponent: () => ({getEquipment: () => ({typeId: 'minecraft:iron_axe'}), hasTypeFamily: () => true})};
  assert.equal(check({...melee, damagingEntity: axe}), true);
  assert.deepEqual(events, ['mn:shield_blocked', 'mn:shield_blocked', 'mn:shield_blocked', 'mn:shield_disabled']);
  assert.equal(sounds.at(-1), 'random.break');
});
