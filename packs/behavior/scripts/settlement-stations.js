import { charterKey } from './charter-placement.js';
import { CENSUS_RADIUS } from './village-census.js';
import { within } from './settlement-effects.js';

export const WAYSTONE = 'jagsby_frontier:waystone';
export const MAP_TABLE = 'jagsby_frontier:map_table';
export const isSettlementStation = type => type === WAYSTONE || type === MAP_TABLE;
const BINDING = 'jagsby_frontier:station:';
const reach = 8;

const stationKey = station => BINDING + charterKey(station.dimension.id, station.location);
const villageKey = village => charterKey(village.dimension, village.location);

export function bindStation(world, state, station, replace = false) {
  const key = stationKey(station);
  const saved = world.getDynamicProperty(key);
  const villages = Object.values(state.villages).filter(village => within(station, village, CENSUS_RADIUS));
  const existing = !replace && villages.find(village => villageKey(village) === saved);
  if (existing) return existing;
  const {x, z} = station.location;
  const range = village => Math.hypot(village.location.x - x, village.location.z - z);
  const nearest = villages.sort((a, b) => range(a) - range(b) || villageKey(a).localeCompare(villageKey(b)))[0];
  if (nearest || saved !== undefined) world.setDynamicProperty(key, nearest ? villageKey(nearest) : undefined);
  return nearest;
}

export function clearStation(world, station) {
  world.setDynamicProperty(stationKey(station), undefined);
}

export function atStation(world, player, village, station, typeId) {
  if (!village || station?.typeId !== typeId || player.dimension.id !== station.dimension.id
      || village.dimension !== station.dimension.id) return false;
  const {x, y, z} = station.location;
  const point = player.location;
  return Math.hypot(point.x - x - 0.5, point.y - y - 0.5, point.z - z - 0.5) <= reach
    && station.dimension.getBlock(station.location)?.typeId === typeId
    && world.getDynamicProperty(stationKey(station)) === villageKey(village);
}
