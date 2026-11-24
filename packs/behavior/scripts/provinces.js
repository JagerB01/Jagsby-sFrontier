import { development } from './settlement-economy.js';
import { settlementName } from './settlement-overview.js';
import { ECONOMY_CONFIG } from './economy-config.js';

export const PROVINCE_SIZE = 2048;
export const CAPITAL_DEVELOPMENT = 10;
const STANDARD_PROVINCE_NAMES = [
  'Alderwatch', 'Greyford', 'Flintmarch', 'Bracken Vale',
  'Foxmere', 'Stonecross', 'Westreach', 'Iron Hollow',
];
const TRAVEL_THRESHOLDS = [0, 25, 50];
const PATROL_TIERS = [
  {threshold: 15, roster: '3 Swordsmen'},
  {threshold: 20, roster: '3 Swordsmen, 1 Arbalist'},
  {threshold: 30, roster: '2 Swordsmen, 1 Juggernaut,\n1 Arbalist'},
  {threshold: 40, roster: '1 Swordsman, 2 Juggernauts,\n1 Arbalist'},
  {threshold: 50, roster: '1 Horse Lancer, 2 Juggernauts,\n1 Arbalist'},
];
const TIER_NAMES = ['I', 'II', 'III', 'IV', 'V'];

export function provinceAt(location, dimension) {
  if (dimension !== 'minecraft:overworld' || !Number.isFinite(location?.x) || !Number.isFinite(location?.z)) return null;
  const column = Math.floor(location.x / PROVINCE_SIZE);
  const row = Math.floor(location.z / PROVINCE_SIZE);
  const west = column * PROVINCE_SIZE;
  const north = row * PROVINCE_SIZE;
  return {key: `${column},${row}`, west, north, x: west + PROVINCE_SIZE / 2, z: north + PROVINCE_SIZE / 2};
}

export function provinceInfo(state, province) {
  const record = state.provinces?.[province.key];
  const capital = record?.capitalId ? state.villages[record.capitalId] : null;
  const capitalId = provinceAt(capital?.location, capital?.dimension)?.key === province.key ? record.capitalId : null;
  // Stagger the name sequence across rows so adjacent provinces use different names.
  const offset = (province.west + 3 * province.north) / PROVINCE_SIZE;
  const count = STANDARD_PROVINCE_NAMES.length;
  const index = ((offset % count) + count) % count;
  const name = record?.name || STANDARD_PROVINCE_NAMES[index];
  return {...province, name, capitalId, capital: capitalId ? capital : null};
}

export function provinceDevelopment(villages) {
  const totals = new Map();
  for (const village of Object.values(villages)) {
    const province = provinceAt(village?.location, village?.dimension);
    if (province) totals.set(province.key, (totals.get(province.key) ?? 0) + development(village));
  }
  return totals;
}

export function provincePerkText(province, combinedDevelopment) {
  const travelTier = province.capital ? TRAVEL_THRESHOLDS.filter(n => combinedDevelopment >= n).length : 0;
  const patrolTier = province.capital ? PATROL_TIERS.filter(({threshold}) => combinedDevelopment >= threshold).length : 0;
  const requiresCapital = 'Locked · Requires a capital';
  let travelStatus = requiresCapital;
  if (travelTier) {
    const multiplier = ECONOMY_CONFIG.roads.foodCostMultipliers[travelTier];
    const discount = Math.round((1 - multiplier) * 100);
    travelStatus = `Tier ${TIER_NAMES[travelTier - 1]} · ${discount ? discount + '％ less food' : 'Standard food cost'}`;
  }
  const patrolStatus = patrolTier
    ? `Tier ${TIER_NAMES[patrolTier - 1]}${patrolTier === PATROL_TIERS.length ? ' · Maximum' : ''}`
    : province.capital ? `Locked · Tier I at ${PATROL_TIERS[0].threshold}` : requiresCapital;
  return {
    travel: `${travelStatus}\nCapital → discovered POIs\nII at ${TRAVEL_THRESHOLDS[1]} · III at ${TRAVEL_THRESHOLDS[2]} Development`,
    patrols: `${patrolStatus}\n${PATROL_TIERS[Math.max(0, patrolTier - 1)].roster}\nTiers at ${PATROL_TIERS.map(({threshold}) => threshold).join(' / ')}`,
  };
}

export function capitalStatus(state, villageId, playerId) {
  const village = state.villages[villageId];
  const province = provinceAt(village?.location, village?.dimension);
  if (!province) return {reason: 'Provinces are in the Overworld.'};
  const info = provinceInfo(state, province);
  const ownsSettlement = Boolean(village.owner && village.owner.id === playerId);
  const isCapital = info.capitalId === villageId;
  const level = development(village);
  let reason = '';
  if (isCapital) reason = ownsSettlement ? 'This settlement is the capital.' : 'Only the capital owner can rename the province.';
  else if (info.capital) reason = 'This province already has a capital.';
  else if (!ownsSettlement) reason = 'Only the settlement owner can designate it as capital.';
  else if (level < CAPITAL_DEVELOPMENT) reason = `Requires Development ${CAPITAL_DEVELOPMENT} (currently ${level}).`;
  return {province: info, reason, canDesignate: !reason, canRename: isCapital && ownsSettlement};
}

export function designateCapital(state, villageId, playerId) {
  const status = capitalStatus(state, villageId, playerId);
  if (!status.canDesignate) return status.reason;
  const key = status.province.key;
  state.provinces ??= {};
  state.provinces[key] = {...state.provinces[key], capitalId: villageId};
  return '';
}

export function renameProvince(state, villageId, playerId, value) {
  const {province, canRename} = capitalStatus(state, villageId, playerId);
  if (!canRename) return 'Only the capital owner can rename the province.';
  const name = settlementName(value);
  if (!name) return 'Use 1–24 characters, without line breaks or formatting codes.';
  state.provinces[province.key].name = name;
  return '';
}

export function updateProvinceCapitalId(state, villageId, replacementId) {
  const village = state.villages[villageId];
  const province = provinceAt(village?.location, village?.dimension);
  const record = province && state.provinces?.[province.key];
  if (record?.capitalId !== villageId) return;
  if (replacementId) record.capitalId = replacementId;
  else delete record.capitalId;
}
