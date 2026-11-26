import { GUARD_HORSE, LEADER_PROPERTY, PATROL, squadLeader } from './frontier-guards.js';
import { setGuardOwner, spawnGuard } from './guard-colors.js';
import {
  PROVINCE_SIZE, provinceAt, provinceDevelopment, provinceInfo, provincialPatrolRoles, provincialPatrolTier,
} from './provinces.js';
import { nearestTownPost } from './town-guard-posts.js';

const REGISTRY = 'jagsby_frontier:provincial_patrols';
const GUIDE = 'jagsby_frontier:patrol_guide';
const WALK = 'jagsby_frontier:patrol_walk';
const ELIGIBLE_MOBS = new Set(['cow', 'pig', 'sheep', 'chicken', 'zombie', 'skeleton'].map(mob => `minecraft:${mob}`));
const UNSAFE_GROUND = new Set(['magma', 'cactus', 'campfire', 'soul_campfire'].map(block => `minecraft:${block}`));
const SPAWN_CHANCE = 0.05;
const PROVINCE_LIMIT = 3;
const PATROL_SPACING = 96;
const RETIRE_AFTER = 1200;

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const columnKey = ({x, z}) => `${x},${z}`;

function skyExposed(dimension, location) {
  const x = Math.floor(location.x);
  const z = Math.floor(location.z);
  const top = dimension.getTopmostBlock({x, z});
  // Skylight also allows ground below a sparse canopy, where the topmost
  // block can be several blocks above the original spawn.
  return Boolean(top && (location.y >= top.location.y || dimension.getSkyLightLevel(location) >= 11));
}

function standable(dimension, feet, headroom) {
  if (!dimension.isChunkLoaded(feet)) return false;
  const ground = dimension.getBlock({...feet, y: feet.y - 1});
  if (!ground || ground.isAir || ground.isLiquid || UNSAFE_GROUND.has(ground.typeId)
      || !ground.isLiquidBlocking('Water')) return false;
  for (let dy = 0; dy < headroom; dy++) {
    if (!dimension.getBlock({...feet, y: feet.y + dy})?.isAir) return false;
  }
  return skyExposed(dimension, feet);
}

function formationPositions(dimension, origin, types, inWilderness) {
  const center = {x: Math.floor(origin.x), y: Math.floor(origin.y), z: Math.floor(origin.z)};
  const columns = [center];
  for (const d of [2, 4, 6]) {
    columns.push(...[[d, 0], [0, d], [-d, 0], [0, -d], [d, d], [-d, d], [-d, -d], [d, -d]]
      .map(([x, z]) => ({x: center.x + x, z: center.z + z})));
  }
  const taken = new Set();
  const positions = [];
  for (const type of types) {
    const mounted = type === GUARD_HORSE;
    const footprint = mounted ? [[0, 0], [1, 0], [0, 1], [1, 1]] : [[0, 0]];
    const offsets = [0, 1, -1];
    let position;
    for (const {x, z} of columns) {
      const tiles = footprint.map(([dx, dz]) => ({x: x + dx, z: z + dz}));
      if (tiles.some(tile => taken.has(columnKey(tile)) || !inWilderness({x: tile.x + 0.5, z: tile.z + 0.5}))) continue;
      for (const dy of offsets) {
        const y = center.y + dy;
        if (!tiles.every(tile => standable(dimension, {...tile, y}, mounted ? 4 : 2))) continue;
        const inset = mounted ? 1 : 0.5;
        position = {x: x + inset, y, z: z + inset};
        for (const tile of tiles) taken.add(columnKey(tile));
        break;
      }
      if (position) break;
    }
    if (!position) return;
    positions.push(position);
  }
  return positions;
}

function livingEntity(world, id) {
  const entity = id && world.getEntity(id);
  return entity?.isValid ? entity : undefined;
}

function restoreSquadBehavior(world, patrol) {
  const leader = squadLeader(patrol.guards);
  const horse = livingEntity(world, patrol.mount);
  if (horse) {
    horse.setProperty(GUIDE, patrol.channel);
    horse.triggerEvent(WALK);
  }
  for (const member of patrol.guards) {
    const guard = livingEntity(world, member.id);
    if (!guard) continue;
    const leads = member === leader;
    guard.setProperty(LEADER_PROPERTY, leads);
    guard.setProperty(GUIDE, leads && !horse ? patrol.channel : 0);
    guard.triggerEvent(leads ? WALK : `jagsby_frontier:patrol_follow_${patrol.channel}`);
  }
}

function loadedPatrolLocation(world, patrol) {
  return livingEntity(world, squadLeader(patrol.guards)?.id)?.location
    ?? patrol.guards.map(({id}) => livingEntity(world, id)).find(Boolean)?.location;
}

function removePatrol(world, patrol) {
  for (const {id} of patrol.guards) livingEntity(world, id)?.remove();
  livingEntity(world, patrol.mount)?.remove();
}

export function provincialPatrols(world, readState, tickNow, random = Math.random) {
  function readPatrols() {
    const saved = world.getDynamicProperty(REGISTRY);
    return saved ? JSON.parse(saved) : {};
  }
  function savePatrols(patrols) {
    world.setDynamicProperty(REGISTRY, JSON.stringify(patrols));
  }

  return {
    replace({cause, entity}) {
      if (cause !== 'Spawned' || !ELIGIBLE_MOBS.has(entity.typeId) || !entity.isValid) return false;
      const {dimension, location} = entity;
      const province = provinceAt(location, dimension.id);
      if (!province || random() >= SPAWN_CHANCE) return false;
      const state = readState();
      if (!state.provinces?.[province.key]?.capitalId) return false;
      const info = provinceInfo(state, province);
      const tier = provincialPatrolTier(info, provinceDevelopment(state.villages).get(province.key) ?? 0);
      if (!tier || nearestTownPost(state.villages, dimension.id, location)) return false;

      const patrols = readPatrols();
      const active = Object.values(patrols);
      const used = new Set(active.filter(patrol => patrol.province === province.key).map(patrol => patrol.channel));
      // Neighboring provinces use different channels, including across zero.
      const parity = (province.west / PROVINCE_SIZE & 1) + 2 * (province.north / PROVINCE_SIZE & 1);
      const channel = Array.from({length: PROVINCE_LIMIT}, (_, i) => 1 + i + PROVINCE_LIMIT * parity)
        .find(candidate => !used.has(candidate));
      if (!channel || active.some(patrol => distance(loadedPatrolLocation(world, patrol) ?? patrol.location, location) < PATROL_SPACING)) return false;
      if (!skyExposed(dimension, location)) return false;

      const types = provincialPatrolRoles(tier).flatMap(([role, count]) =>
        Array(count).fill(role === 'horse_lancer' ? GUARD_HORSE : `jagsby_frontier:${role}`));
      const positions = formationPositions(dimension, location, types, point =>
        provinceAt(point, dimension.id)?.key === province.key && !nearestTownPost(state.villages, dimension.id, point));
      if (!positions) return false;

      const entities = [];
      let patrolId;
      let registered = false;
      try {
        const guards = types.map((type, index) => spawnGuard(dimension, type, positions[index], entities));
        patrolId = guards[0].id;
        for (const member of entities) member.setDynamicProperty(PATROL, patrolId);
        for (const guard of guards) setGuardOwner(guard, info.capital.owner?.id);
        const patrol = {
          province: province.key, channel, location, lastNear: tickNow(),
          guards: guards.map(guard => ({id: guard.id, typeId: guard.typeId})),
          mount: entities.find(member => member.typeId === GUARD_HORSE)?.id,
        };
        restoreSquadBehavior(world, patrol);
        patrols[patrolId] = patrol;
        savePatrols(patrols);
        registered = true;
        entity.remove();
        return true;
      } catch (error) {
        for (const member of entities.reverse()) {
          if (member.isValid) member.remove();
        }
        if (registered) {
          delete patrols[patrolId];
          savePatrols(patrols);
        }
        throw error;
      }
    },

    restore(entity) {
      const id = entity.getDynamicProperty(PATROL);
      if (!id) return false;
      const patrol = readPatrols()[id];
      if (!patrol || (entity.id !== patrol.mount && !patrol.guards.some(guard => guard.id === entity.id))) {
        entity.remove();
      } else {
        const state = readState();
        // The squad can walk across a province line. Its colors still belong
        // to the capital that sent it.
        const capital = state.villages[state.provinces?.[patrol.province]?.capitalId];
        if (entity.typeId !== GUARD_HORSE) setGuardOwner(entity, capital?.owner?.id);
        restoreSquadBehavior(world, patrol);
      }
      return true;
    },

    replaceEntity(previous, next) {
      const id = previous.getDynamicProperty(PATROL);
      if (!id) return false;
      const patrols = readPatrols(), patrol = patrols[id];
      if (!patrol) return false;
      if (patrol.mount === previous.id) delete patrol.mount;
      else patrol.guards = patrol.guards.map(guard => guard.id === previous.id
        ? {id: next.id, typeId: next.typeId} : guard);
      savePatrols(patrols);
      restoreSquadBehavior(world, patrol);
      return true;
    },

    onDeath(entity) {
      const patrols = readPatrols();
      // A dead entity's ID is readable even after its dynamic properties
      // become unavailable.
      const entry = Object.entries(patrols).find(([, patrol]) =>
        patrol.mount === entity.id || patrol.guards.some(guard => guard.id === entity.id));
      if (!entry) return false;
      const [id, patrol] = entry;
      const member = patrol.guards.find(({id}) => id === entity.id);
      if (entity.id === patrol.mount || member?.typeId === 'jagsby_frontier:horse_lancer') {
        if (entity.id !== patrol.mount) {
          const horse = livingEntity(world, patrol.mount);
          horse?.setProperty(GUIDE, 0);
          horse?.setDynamicProperty(PATROL, undefined);
        }
        delete patrol.mount;
      }
      patrol.guards = patrol.guards.filter(({id}) => id !== entity.id);
      if (patrol.guards.length) restoreSquadBehavior(world, patrol);
      else delete patrols[id];
      savePatrols(patrols);
      return true;
    },

    tick() {
      const patrols = readPatrols();
      const entries = Object.entries(patrols);
      if (!entries.length) return;
      const now = tickNow();
      const players = world.getPlayers().filter(player => player.dimension.id === 'minecraft:overworld');
      const state = readState();
      let changed = false;
      for (const [id, patrol] of entries) {
        const location = loadedPatrolLocation(world, patrol);
        const nearby = location && players.some(player => distance(player.location, location) <= PATROL_SPACING);
        if (!state.villages[state.provinces?.[patrol.province]?.capitalId]
            || (!nearby && now - patrol.lastNear >= RETIRE_AFTER)) {
          removePatrol(world, patrol);
          delete patrols[id];
          changed = true;
        } else if (nearby) {
          patrol.lastNear = now;
          patrol.location = location;
          changed = true;
        }
      }
      if (changed) savePatrols(patrols);
    },
  };
}
