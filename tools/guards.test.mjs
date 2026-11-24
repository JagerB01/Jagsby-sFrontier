import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { blockGuardShield, JUGGERNAUT } from '../packs/behavior/scripts/frontier-guards.js';

const read = path => readFile(new URL('../packs/' + path, import.meta.url), 'utf8');
const json = async path => JSON.parse(await read(path));
const id = name => 'jagsby_frontier:' + name;
const guards = ['swordsman', 'arbalist', 'lancer', 'juggernaut', 'horse_lancer', 'camel_lancer'];
const mounts = ['guard_horse', 'guard_camel'];

test('Guard definitions ship distinct combat roles, test eggs and matching client assets', async () => {
  const resource = await json('resource/animations/frontier_guard.animation.json');
  const texts = await read('resource/texts/en_US.lang');
  const combat = new Map();
  for (const name of [...guards, ...mounts]) {
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
  for (const name of ['lancer', 'horse_lancer', 'camel_lancer']) {
    assert.deepEqual(combat.get(name).equipment, ['minecraft:iron_spear']);
    assert.equal(combat.get(name).components['minecraft:behavior.use_kinetic_weapon'].hijack_mount_navigation,
      name !== 'lancer');
  }
  assert.deepEqual(combat.get('juggernaut').equipment, ['minecraft:iron_axe', 'minecraft:shield']);
  assert.ok(combat.get('juggernaut').components['minecraft:environment_sensor']);
});

test('Mounted spawn eggs create compatible crews and guards have no natural spawn rules', async () => {
  for (const [kind, crew] of [['horse', ['horse_lancer']], ['camel', ['camel_lancer', 'arbalist']]]) {
    const mount = (await json('behavior/entities/guards/guard_' + kind + '.json'))['minecraft:entity'];
    const rideable = mount.components['minecraft:rideable'];
    assert.equal(rideable.seat_count, crew.length);
    assert.equal(rideable.seats.length, crew.length);
    const [group] = mount.events['minecraft:entity_spawned'].add.component_groups;
    const riders = mount.component_groups[group]['minecraft:addrider'].riders;
    assert.deepEqual(riders.map(rider => rider.entity_type), crew.map(id));
    for (const member of crew) {
      const entity = (await json('behavior/entities/guards/' + member + '.json'))['minecraft:entity'];
      const families = entity.components['minecraft:type_family'].family;
      assert.ok(rideable.family_types.some(family => families.includes(family)));
    }
  }
  const path = new URL('../packs/behavior/spawn_rules/', import.meta.url);
  const spawnRules = await readdir(path, {recursive: true}).catch(error => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  for (const rule of spawnRules.filter(path => path.endsWith('.json'))) {
    const {description} = (await json('behavior/spawn_rules/' + rule))['minecraft:spawn_rules'];
    assert.ok(![...guards, ...mounts].map(id).includes(description.identifier));
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
