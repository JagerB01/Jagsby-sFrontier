import { CENSUS_RADIUS } from './village-census.js';
import { isTownGuard } from './frontier-guards.js';

const POST = 'jagsby_frontier:town_guard_post';
const INSET = 5;
// Older town guards could roam 48 blocks from any placement within the survey.
const LEGACY_REACH = CENSUS_RADIUS + 48;
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export function nearestTownPost(villages, dimension, location, radius = CENSUS_RADIUS) {
  let post;
  let closest = radius;
  for (const village of Object.values(villages ?? {})) {
    if (village.dimension !== dimension || !village.location) continue;
    const range = distance(location, village.location);
    if (range > closest || (post && range === closest) || !Number.isFinite(range)) continue;
    closest = range;
    post = {dimension, location: village.location};
  }
  return post;
}

export function bindTownPost(entity, post) {
  entity.setDynamicProperty(POST, JSON.stringify(post));
}

export function isTownPatrol(entity) {
  return entity.typeId === 'jagsby_frontier:town_guard_horse' || isTownGuard(entity);
}

function surfaceReturn(dimension, position) {
  const block = dimension.getTopmostBlock({x: Math.floor(position.x), z: Math.floor(position.z)});
  if (!block || block.isAir || block.isLiquid) return;
  const {x, y, z} = block.location;
  return {x: x + 0.5, y: y + 1, z: z + 0.5};
}

function returnToPost(entry, dimension) {
  const {entity, post, inside} = entry;
  const rideable = entity.getComponent('minecraft:rideable');
  const riders = rideable?.getRiders() ?? [];
  const move = target => {
    if (!target || !entity.tryTeleport(target, {dimension, checkForBlocks: true})) return false;
    // Keep mounted patrols together if the engine dismounts a rider on teleport.
    const seated = new Set(rideable?.getRiders().map(rider => rider.id));
    for (const rider of riders) {
      if (rider.isValid && !seated.has(rider.id)
          && rider.tryTeleport(target, {dimension, checkForBlocks: true})) rideable.addRider(rider);
    }
    return true;
  };
  const origin = post.location;
  const current = entity.location;
  const range = distance(origin, current);
  const scale = range > 0 ? (CENSUS_RADIUS - INSET) / range : 0;
  const inward = {x: origin.x + (current.x - origin.x) * scale, z: origin.z + (current.z - origin.z) * scale};
  for (const target of [() => inside, () => surfaceReturn(dimension, inward), () => surfaceReturn(dimension, origin)]) {
    try {
      if (move(target())) return;
    } catch (error) {
      if (!isUnavailable(error)) throw error;
    }
  }
}

function isUnavailable(error) {
  return ['LocationInUnloadedChunkError', 'LocationOutOfWorldBoundariesError', 'InvalidEntityError'].includes(error?.name);
}

export function townGuardPatrol(world, villages) {
  const loaded = new Map();
  return {
    track(entity) {
      const saved = entity.getDynamicProperty(POST);
      const post = saved ? JSON.parse(saved)
        : nearestTownPost(villages(), entity.dimension.id, entity.location, LEGACY_REACH);
      if (!post) return;
      if (!saved) bindTownPost(entity, post);
      loaded.set(entity.id, {entity, post, inside: loaded.get(entity.id)?.inside});
    },
    tick() {
      for (const [id, entry] of loaded) {
        const {entity, post} = entry;
        if (!entity.isValid) {
          loaded.delete(id);
          continue;
        }
        try {
          const mount = entity.getComponent('minecraft:riding')?.entityRidingOn;
          if (mount?.isValid && mount.typeId === 'jagsby_frontier:town_guard_horse' && loaded.has(mount.id)) continue;
          const range = distance(entity.location, post.location);
          if (entity.dimension.id === post.dimension && range <= CENSUS_RADIUS) {
            if (range <= CENSUS_RADIUS - INSET && entity.isOnGround && !entity.isInWater) entry.inside = entity.location;
            continue;
          }
          returnToPost(entry, world.getDimension(post.dimension));
        } catch (error) {
          if (!isUnavailable(error)) console.warn(`Frontier town guard patrol: ${error}`);
        }
      }
    },
  };
}
