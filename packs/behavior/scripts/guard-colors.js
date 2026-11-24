import { GUARD_COLORS } from './guard-color-palette.js';
import { isFrontierGuard } from './frontier-guards.js';
import { bindTownPost, nearestTownPost } from './town-guard-posts.js';

export { GUARD_COLORS };
const OWNER = 'jagsby_frontier:guard_owner';
const HEADBAND = 'jagsby_frontier:headband';
const DIMENSIONS = ['overworld', 'nether', 'the_end'];
const ROLES = ['swordsman', 'arbalist', 'lancer', 'juggernaut', 'guard_horse'];
const HORSE_RIDERS = new Map([
  ['jagsby_frontier:guard_horse', 'jagsby_frontier:horse_lancer'],
  ['jagsby_frontier:town_guard_horse', 'jagsby_frontier:town_horse_lancer'],
]);
const EGGS = new Map([...ROLES, ...ROLES.map(role => `town_${role}`)].map(role =>
  [`jagsby_frontier:${role}_team_egg`, `jagsby_frontier:${role}`]));
const OFFSETS = {
  Up: [0, 1, 0], Down: [0, -1, 0],
  North: [0, 0, -1], South: [0, 0, 1],
  East: [1, 0, 0], West: [-1, 0, 0],
};

const colorKey = id => `jagsby_frontier:player_color:${id}`;
const validColor = index => Number.isInteger(index) && index >= 0 && index < GUARD_COLORS.length;

export function playerGuardColor(world, id) {
  const saved = world.getDynamicProperty(colorKey(id));
  return validColor(saved) ? saved : 0;
}

export function refreshGuardColor(world, guard) {
  const owner = guard.getDynamicProperty(OWNER);
  guard.setProperty(HEADBAND, owner ? playerGuardColor(world, owner) : 0);
}

export function selectGuardColor(world, id, index) {
  if (!validColor(index) || playerGuardColor(world, id) === index) return;
  world.setDynamicProperty(colorKey(id), index);
  for (const name of DIMENSIONS) {
    for (const guard of world.getDimension(name).getEntities({families: ['frontier_guard']})) {
      if (guard.isValid && isFrontierGuard(guard) && guard.getDynamicProperty(OWNER) === id) {
        guard.setProperty(HEADBAND, index);
      }
    }
  }
}

export function handleGuardEgg(event, schedule, villages) {
  const egg = event.itemStack?.typeId;
  const type = EGGS.get(egg);
  if (!type) return;
  event.cancel = true;
  if (event.isFirstEvent === false) return;
  const offset = OFFSETS[event.blockFace];
  if (!offset) return;
  const {player, block} = event;
  const {dimension, location} = block;
  const feet = {x: location.x + offset[0], y: location.y + offset[1], z: location.z + offset[2]};
  const pos = {x: feet.x + 0.5, y: feet.y, z: feet.z + 0.5};
  const slotIndex = player.selectedSlotIndex;
  schedule(() => {
    if (!player.isValid || player.dimension.id !== dimension.id || player.selectedSlotIndex !== slotIndex) return;
    const mode = player.getGameMode();
    if (mode === 'Spectator') return;
    const inventory = player.getComponent('minecraft:inventory')?.container;
    const item = inventory?.getItem(slotIndex);
    if (item?.typeId !== egg) return;

    const entities = [];
    try {
      let post;
      if (type.startsWith('jagsby_frontier:town_')) {
        post = nearestTownPost(villages(), dimension.id, pos);
        if (!post) {
          player.sendMessage('Place Town Guards within 80 blocks of a Village Charter.');
          return;
        }
      }
      // Find room for the two-block-tall guard or mounted rider.
      const rider = HORSE_RIDERS.get(type);
      const headroom = rider ? 4 : 2;
      for (let dy = 0; dy < headroom; dy++) {
        if (!dimension.getBlock({...feet, y: feet.y + dy})?.isAir) {
          player.sendMessage('Find an open spot for the Frontier guard.');
          return;
        }
      }
      let guard;
      if (rider) {
        const mount = dimension.spawnEntity(type, pos, {spawnEvent: 'jagsby_frontier:spawn_empty'});
        entities.push(mount);
        guard = dimension.spawnEntity(rider, pos);
        entities.push(guard);
        if (!mount.getComponent('minecraft:rideable')?.addRider(guard)) throw Error('Could not seat the Horse Lancer');
      } else {
        guard = dimension.spawnEntity(type, pos);
        entities.push(guard);
      }
      if (post) for (const entity of entities) bindTownPost(entity, post);
      guard.setDynamicProperty(OWNER, player.id);
      if (mode !== 'Creative') {
        if (item.amount > 1) {
          item.amount--;
          inventory.setItem(slotIndex, item);
        } else inventory.setItem(slotIndex, undefined);
      }
    } catch (error) {
      for (const entity of entities.reverse()) if (entity.isValid) entity.remove();
      console.warn(`Frontier guard egg: ${error}`);
      player.sendMessage('The Frontier guard could not spawn.');
    }
  });
}
