import { foodCost } from './settlement-economy.js';
import { provinceAt, provinceDevelopment, provinceInfo, provincialTravelTier } from './provinces.js';
import { readSurveyedPois, toMapPoi } from './poi-survey.js';

const RADIUS = 12;
const UNSAFE = new Set(['magma', 'cactus', 'campfire', 'soul_campfire', 'powder_snow', 'lava']
  .map(block => `minecraft:${block}`));
let nextArea = 0;

export function provincialDestinations(world, state, capitalId) {
  const capital = state.villages[capitalId];
  const province = provinceAt(capital?.location, capital?.dimension);
  if (!province) return null;
  const info = provinceInfo(state, province);
  if (info.capitalId !== capitalId) return null;
  const tier = provincialTravelTier(info, provinceDevelopment(state.villages).get(province.key) ?? 0);
  return readSurveyedPois(world).map(toMapPoi).filter(point =>
    provinceAt(point, point.dimension)?.key === province.key).map(point => {
    const distance = Math.hypot(point.x - capital.location.x, point.z - capital.location.z);
    return {...point, distance, foodPoints: foodCost({level: tier, distance})};
  }).sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id));
}

function arrivalInColumn(dimension, x, z) {
  const surface = dimension.getTopmostBlock({x, z});
  if (!surface || UNSAFE.has(surface.typeId)) return;
  const isWater = surface.typeId === 'minecraft:water' || surface.typeId === 'minecraft:flowing_water';
  if (!isWater && (surface.isAir || surface.isLiquid || !surface.isLiquidBlocking('Water'))) return;
  const y = surface.location.y + 1;
  if (y + 1 >= dimension.heightRange.max
      || !dimension.getBlock({x, y, z})?.isAir || !dimension.getBlock({x, y: y + 1, z})?.isAir) return;
  return {position: {x: x + 0.5, y, z: z + 0.5}, isWater};
}

export async function withPoiArrival(world, dimension, point, travel) {
  const {x, z} = point;
  const province = provinceAt(point, dimension.id);
  const from = {x: x - RADIUS, y: 64, z: z - RADIUS};
  const to = {x: x + RADIUS, y: 64, z: z + RADIUS};
  const manager = world.tickingAreaManager;
  const areaId = `frontier_poi_travel_${++nextArea}`;
  let loadedTemporarily = false;
  const sample = [from, to, {x: from.x, y: 64, z: to.z}, {x: to.x, y: 64, z: from.z}, {x, y: 64, z}];
  try {
    if (!sample.every(location => dimension.isChunkLoaded(location))) {
      if (!manager) throw Error('Could not load the destination. Try again later.');
      await manager.createTickingArea(areaId, {dimension, from, to});
      loadedTemporarily = true;
    }
    let water;
    for (let range = 0; range <= RADIUS; range++) {
      for (let dx = -range; dx <= range; dx++) {
        const dz = range - Math.abs(dx);
        for (const zOffset of dz ? [-dz, dz] : [0]) {
          const cx = x + dx, cz = z + zOffset;
          if (!dimension.isChunkLoaded({x: cx, y: 64, z: cz})) continue;
          if (provinceAt({x: cx, z: cz}, dimension.id)?.key !== province?.key) continue;
          const arrival = arrivalInColumn(dimension, cx, cz);
          if (arrival && !arrival.isWater) return travel(arrival.position);
          water ??= arrival?.position;
        }
      }
    }
    if (water) return travel(water);
    throw Error('No safe landing spot near that POI.');
  } finally {
    if (loadedTemporarily) {
      try { manager.removeTickingArea(areaId); }
      catch (error) { console.warn(`Frontier POI ticking area: ${error}`); }
    }
  }
}
