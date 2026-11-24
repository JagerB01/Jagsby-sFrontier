import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { blockGuardShield, joinGuardSquad, JUGGERNAUT, removeGuardFromSquad } from '../packs/behavior/scripts/frontier-guards.js';

const read = path => readFile(new URL('../packs/' + path, import.meta.url), 'utf8');
const json = async path => JSON.parse(await read(path));
const id = name => 'jagsby_frontier:' + name;
const guards = ['swordsman', 'arbalist', 'lancer', 'juggernaut', 'horse_lancer'];
const roster = [...guards, 'guard_horse'];
const leaderProperty = id('squad_leader');

test('Guard definitions ship distinct combat roles, test eggs and matching client assets', async () => {
  const resource = await json('resource/animations/frontier_guard.animation.json');
  const texts = await read('resource/texts/en_US.lang');
  const combat = new Map();
  const behaviorFiles = await readdir(new URL('../packs/behavior/entities/guards/', import.meta.url));
  const clientFiles = await readdir(new URL('../packs/resource/entity/guards/', import.meta.url));
  assert.deepEqual(behaviorFiles.sort(), roster.map(name => name + '.json').sort());
  assert.deepEqual(clientFiles.sort(), roster.map(name => name + '.entity.json').sort());
  for (const name of roster) {
    const behavior = (await json('behavior/entities/guards/' + name + '.json'))['minecraft:entity'];
    const client = (await json('resource/entity/guards/' + name + '.entity.json'))['minecraft:client_entity'].description;
    const hasEgg = !name.endsWith('_lancer');
    assert.equal(behavior.description.identifier, id(name));
    assert.equal(client.identifier, id(name));
    assert.equal(behavior.description.is_summonable, true);
    assert.equal(behavior.description.is_spawnable, hasEgg);
    assert.equal(Boolean(client.spawn_egg), hasEgg);
    assert.ok(texts.includes('entity.' + id(name) + '.name='));
    if (hasEgg) assert.ok(texts.includes('item.spawn_egg.entity.' + id(name) + '.name='));
    if (guards.includes(name)) {
      assert.ok(behavior.components['minecraft:type_family'].family.includes('frontier_guard'));
      assert.deepEqual(behavior.description.properties[leaderProperty], {type: 'bool', default: false, client_sync: true});
      const path = behavior.components['minecraft:equipment'].table;
      combat.set(name, {
        components: behavior.components,
        equipment: (await json('behavior/' + path)).pools.flatMap(pool => pool.entries.map(entry => entry.name)),
      });
      await read('resource/' + client.textures.default + '.png');
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
  const geometry = (await json('resource/models/entity/frontier_guard.geo.json'))['minecraft:geometry'][0];
  assert.ok(geometry.bones.some(bone => bone.name === 'leaderPlume'));
  const controller = (await json('resource/render_controllers/frontier_guard.render_controllers.json'))
    .render_controllers['controller.render.jagsby_frontier.guard'];
  assert.deepEqual(controller.part_visibility, [{leaderPlume: `query.property('${leaderProperty}')`}]);
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

test('The Horse Lancer Team egg spawns a horse and compatible rider without natural guard spawn rules', async () => {
  const mount = (await json('behavior/entities/guards/guard_horse.json'))['minecraft:entity'];
  const rideable = mount.components['minecraft:rideable'];
  assert.equal(rideable.seat_count, 1);
  assert.equal(rideable.seats.length, 1);
  const [group] = mount.events['minecraft:entity_spawned'].add.component_groups;
  const riders = mount.component_groups[group]['minecraft:addrider'].riders;
  assert.deepEqual(riders.map(rider => rider.entity_type), [id('horse_lancer')]);
  const entity = (await json('behavior/entities/guards/horse_lancer.json'))['minecraft:entity'];
  const families = entity.components['minecraft:type_family'].family;
  assert.ok(rideable.family_types.some(family => families.includes(family)));
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
  assert.equal(check({...melee, damagingEntity: {location: {x: 0, z: -3}}}), false);
  assert.equal(check({...melee, cause: 'fall'}), false);
  assert.equal(check(melee, {...guard, getProperty: () => 'recovering'}), false);
  assert.equal(check(melee, {...guard, typeId: id('swordsman')}), false);
  assert.equal(check({cause: 'projectile', damagingProjectile: {getVelocity: () => ({x: 0, z: -1})}}), true);
  assert.equal(check({cause: 'projectile', damagingProjectile: {getVelocity: () => ({x: 0, z: 1})}}), false);
});
