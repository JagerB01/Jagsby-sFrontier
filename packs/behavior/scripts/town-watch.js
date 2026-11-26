import { TOWN_ARBALIST_INTERVAL, townGuardLimit } from './frontier-guards.js';
import { localLevel } from './global-research.js';
import { setGuardOwner } from './guard-colors.js';
import { bindTownPost, townGuardSettlement } from './town-guard-posts.js';

const SLOT = 'jagsby_frontier:town_watch_slot';
const DIRECTIONS = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [-1, -1], [1, -1]];

function spawnPosition(dimension, origin, slot) {
  const [x, y, z] = [Math.floor(origin.x), Math.floor(origin.y), Math.floor(origin.z)];
  for (const radius of [2, 4, 8, 12]) {
    for (let i = 0; i < DIRECTIONS.length; i++) {
      const [dx, dz] = DIRECTIONS[(i + slot - 1) % DIRECTIONS.length];
      const column = {x: x + dx * radius, z: z + dz * radius};
      for (const height of [0, 1, -1, 2, -2]) {
        const feet = {...column, y: y + height};
        try {
          const ground = dimension.getBlock({...feet, y: feet.y - 1});
          if (ground && !ground.isAir && !ground.isLiquid && ground.typeId !== 'minecraft:magma'
              && dimension.getBlock(feet)?.isAir
              && dimension.getBlock({...feet, y: feet.y + 1})?.isAir) {
            return {x: feet.x + 0.5, y: feet.y, z: feet.z + 0.5};
          }
        } catch (error) {
          if (!['LocationInUnloadedChunkError', 'LocationOutOfWorldBoundariesError'].includes(error.name)) throw error;
          break;
        }
      }
    }
  }
}

export function retireTownGuards(world, village, limit = 0) {
  const slots = village.townGuardSlots;
  if (!slots || slots.length <= limit) return false;
  for (const id of slots.slice(limit)) {
    const guard = typeof id === 'string' ? world.getEntity(id) : undefined;
    if (guard?.isValid) guard.remove();
  }
  slots.length = limit;
  return true;
}

export function fillTownGuardSlot(world, village, limit, day) {
  const slots = village.townGuardSlots ?? [];
  // A string reserves a living guard's slot even when its chunk unloads.
  // A number is the first day a replacement can be recruited.
  let index = 0;
  while (index < limit && (typeof slots[index] === 'string' || slots[index] > day)) index++;
  if (index === limit) return false;

  const dimension = world.getDimension(village.dimension);
  const slot = index + 1;
  const position = spawnPosition(dimension, village.location, slot);
  if (!position) return false;

  const type = slot % TOWN_ARBALIST_INTERVAL === 0 ? 'jagsby_frontier:town_arbalist' : 'jagsby_frontier:town_swordsman';
  const guard = dimension.spawnEntity(type, position);
  try {
    bindTownPost(guard, {dimension: village.dimension, location: village.location});
    setGuardOwner(guard, village.owner?.id);
    guard.setDynamicProperty(SLOT, slot);
    slots[index] = guard.id;
    village.townGuardSlots = slots;
    return true;
  } catch (error) {
    if (guard.isValid) guard.remove();
    throw error;
  }
}

export function validateTownGuard(guard, readState, saveState) {
  const slot = guard.getDynamicProperty(SLOT);
  if (!slot) return true;
  const state = readState();
  const village = townGuardSettlement(guard, state.villages);
  if (village?.townGuardSlots?.[slot - 1] === guard.id) {
    if (slot <= townGuardLimit(village, localLevel(state, village, 'sanctuary'))) {
      setGuardOwner(guard, village.owner?.id);
      return true;
    }
    village.townGuardSlots[slot - 1] = null;
    saveState(state);
  }
  // The settlement may have lost this slot while the guard was unloaded.
  guard.remove();
  return false;
}

export function recordTownGuardDeath(guard, day, readState, saveState) {
  const slot = guard.getDynamicProperty(SLOT);
  if (!slot) return;
  const state = readState();
  const village = townGuardSettlement(guard, state.villages);
  if (village?.townGuardSlots?.[slot - 1] !== guard.id) return;
  village.townGuardSlots[slot - 1] = day + 1;
  saveState(state);
}
