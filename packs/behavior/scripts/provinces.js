import { development } from './settlement-economy.js';
import { settlementName } from './settlement-overview.js';

export const PROVINCE_SIZE = 2048;
export const CAPITAL_DEVELOPMENT = 10;
const STANDARD_PROVINCE_NAMES = [
  'Alderwatch', 'Greyford', 'Flintmarch', 'Bracken Vale',
  'Foxmere', 'Stonecross', 'Westreach', 'Iron Hollow',
];

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
