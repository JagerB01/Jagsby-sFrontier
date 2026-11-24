import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { blockGuardShield, joinGuardSquad, JUGGERNAUT, removeGuardFromSquad } from '../packs/behavior/scripts/frontier-guards.js';
import { GUARD_COLORS, handleGuardEgg, playerGuardColor, refreshGuardColor, selectGuardColor } from '../packs/behavior/scripts/guard-colors.js';
import { bindTownPost, nearestTownPost, townGuardPatrol } from '../packs/behavior/scripts/town-guard-posts.js';

const read = path => readFile(new URL('../packs/' + path, import.meta.url), 'utf8');
const json = async path => JSON.parse(await read(path));
const id = name => 'jagsby_frontier:' + name;
const squadRoles = ['swordsman', 'arbalist', 'lancer', 'juggernaut', 'horse_lancer'];
const townRoles = squadRoles.map(role => 'town_' + role);
const guards = [...squadRoles, ...townRoles];
const roster = [...guards, 'guard_horse', 'town_guard_horse'];
const leaderProperty = id('squad_leader');

test('Guard definitions ship distinct combat roles, test eggs and matching client assets', async () => {
  const resource = await json('resource/animations/frontier_guard.animation.json');
  const texts = await read('resource/texts/en_US.lang');
  const atlas = (await json('resource/textures/item_texture.json')).texture_data;
  const combat = new Map();
  const behaviorFiles = await readdir(new URL('../packs/behavior/entities/guards/', import.meta.url));
  const clientFiles = await readdir(new URL('../packs/resource/entity/guards/', import.meta.url));
  assert.deepEqual(behaviorFiles.sort(), roster.map(name => name + '.json').sort());
  assert.deepEqual(clientFiles.sort(), roster.map(name => name + '.entity.json').sort());
  for (const name of roster) {
    const behavior = (await json('behavior/entities/guards/' + name + '.json'))['minecraft:entity'];
    const client = (await json('resource/entity/guards/' + name + '.entity.json'))['minecraft:client_entity'].description;
    const hasEgg = !name.endsWith('horse_lancer');
    assert.equal(behavior.description.identifier, id(name));
    assert.equal(client.identifier, id(name));
    assert.equal(behavior.description.is_summonable, true);
    assert.equal(behavior.description.is_spawnable, false);
    assert.equal(client.spawn_egg, undefined);
    assert.ok(texts.includes('entity.' + id(name) + '.name='));
    if (hasEgg) {
      const egg = (await json('behavior/items/guard_eggs/' + name + '_team_egg.json'))['minecraft:item'];
      assert.equal(egg.description.identifier, id(name + '_team_egg'));
      assert.equal(egg.components['minecraft:entity_placer'].entity, id(name));
      const key = egg.components['minecraft:icon'].textures.default;
      await read('resource/' + atlas[key].textures + '.png');
      assert.ok(texts.includes(egg.components['minecraft:display_name'].value + '='));
    }
    if (guards.includes(name)) {
      assert.ok(behavior.components['minecraft:type_family'].family.includes('frontier_guard'));
      assert.deepEqual(behavior.description.properties[leaderProperty], {type: 'bool', default: false, client_sync: true});
      assert.deepEqual(behavior.description.properties[id('headband')],
        {type: 'int', range: [0, GUARD_COLORS.length - 1], default: 0, client_sync: true});
      const path = behavior.components['minecraft:equipment'].table;
      combat.set(name, {
        components: behavior.components,
        equipment: (await json('behavior/' + path)).pools.flatMap(pool => pool.entries.map(entry => entry.name)),
      });
      assert.equal(Object.keys(client.textures).length, GUARD_COLORS.length);
      for (const texture of Object.values(client.textures)) await read('resource/' + texture + '.png');
      for (const animation of Object.values(client.animations)) assert.ok(resource.animations[animation]);
    }
  }
  assert.deepEqual(combat.get('swordsman').equipment, ['minecraft:iron_sword']);
  assert.ok(combat.get('swordsman').components['minecraft:behavior.melee_box_attack']);
  assert.deepEqual(combat.get('arbalist').equipment, ['minecraft:crossbow']);
  assert.equal(combat.get('arbalist').components['minecraft:shooter'].def, 'minecraft:arrow');
  assert.ok(combat.get('arbalist').components['minecraft:behavior.ranged_attack']);
  for (const name of ['lancer', 'horse_lancer']) {
    assert.deepEqual(combat.get(name).equipment, ['minecraft:iron_spear']);
    assert.equal(combat.get(name).components['minecraft:behavior.use_kinetic_weapon'].hijack_mount_navigation,
      name !== 'lancer');
  }
  assert.deepEqual(combat.get('juggernaut').equipment, ['minecraft:iron_axe', 'minecraft:shield']);
  assert.ok(combat.get('juggernaut').components['minecraft:environment_sensor']);
  for (const role of squadRoles) {
    const squad = combat.get(role), town = combat.get('town_' + role);
    assert.deepEqual(town.equipment, squad.equipment);
    for (const key of Object.keys(squad.components).filter(key =>
      /attack|shooter|charge_held_item|use_kinetic_weapon|knockback_resistance|environment_sensor|health/.test(key))) {
      assert.deepEqual(town.components[key], squad.components[key], role + ' ' + key);
    }
  }
  const geometry = (await json('resource/models/entity/frontier_guard.geo.json'))['minecraft:geometry'][0];
  assert.ok(geometry.bones.some(bone => bone.name === 'leaderPlume'));
  const controller = (await json('resource/render_controllers/frontier_guard.render_controllers.json'))
    .render_controllers['controller.render.jagsby_frontier.guard'];
  assert.deepEqual(controller.part_visibility, [{leaderPlume: `query.property('${leaderProperty}')`}]);
  assert.equal(controller.arrays.textures['Array.headbands'].length, GUARD_COLORS.length);
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
    const {components} = (await json('behavior/entities/guards/' + role + '.json'))['minecraft:entity'];
    assert.equal(components['minecraft:home'], undefined);
    const path = components['minecraft:preferred_path'];
    assert.deepEqual(path.preferred_path_blocks[0].blocks, ['grass_path', 'cobblestone', 'gravel']);
    assert.ok(path.preferred_path_blocks[0].cost < path.default_block_cost);
    const returnHome = components['minecraft:behavior.move_towards_dwelling_restriction'];
    const road = components['minecraft:behavior.move_to_block'];
    const wander = components['minecraft:behavior.random_stroll'];
    const attack = components['minecraft:behavior.melee_box_attack']
      ?? components['minecraft:behavior.ranged_attack'] ?? components['minecraft:behavior.mount_pathing'];
    assert.equal(components['minecraft:dweller'].dweller_role, 'defender');
    assert.equal(components['minecraft:dweller'].can_migrate, false);
    assert.equal(components['minecraft:behavior.move_through_village'].only_at_night, false);
    assert.deepEqual(road.target_blocks, path.preferred_path_blocks[0].blocks.map(block => 'minecraft:' + block));
    assert.ok(road.start_chance > 0 && road.start_chance < 1);
    assert.ok(attack.priority < returnHome.priority && returnHome.priority < road.priority && road.priority < wander.priority);
  }
});

test('Both Horse Lancer Team eggs match the correct horse and rider without natural guard spawn rules', async () => {
  for (const prefix of ['', 'town_']) {
    const mount = (await json('behavior/entities/guards/' + prefix + 'guard_horse.json'))['minecraft:entity'];
    assert.deepEqual(mount.events[id('spawn_empty')], {});
    const rideable = mount.components['minecraft:rideable'];
    assert.equal(rideable.seat_count, 1);
    assert.equal(rideable.seats.length, 1);
    const [group] = mount.events['minecraft:entity_spawned'].add.component_groups;
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

test('Raised Juggernaut shields block frontal melee and projectile hits only', () => {
  const guard = {
    typeId: JUGGERNAUT,
    getProperty: () => 'raised',
    location: {x: 0, z: 0},
    getViewDirection: () => ({x: 0, z: 1}),
  };
  const check = (damageSource, target = guard) => {
    const event = {hurtEntity: target, damageSource, cancel: false};
    blockGuardShield(event);
    return event.cancel;
  };
  const melee = {cause: 'entityAttack', damagingEntity: {location: {x: 0, z: 3}}};
  assert.equal(check(melee), true);
  assert.equal(check(melee, {...guard, typeId: id('town_juggernaut')}), true);
  assert.equal(check({...melee, damagingEntity: {location: {x: 0, z: -3}}}), false);
  assert.equal(check({...melee, cause: 'fall'}), false);
  assert.equal(check(melee, {...guard, getProperty: () => 'recovering'}), false);
  assert.equal(check(melee, {...guard, typeId: id('swordsman')}), false);
  assert.equal(check({cause: 'projectile', damagingProjectile: {getVelocity: () => ({x: 0, z: -1})}}), true);
  assert.equal(check({cause: 'projectile', damagingProjectile: {getVelocity: () => ({x: 0, z: 1})}}), false);
});
