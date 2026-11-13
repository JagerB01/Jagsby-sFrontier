import { settlementTier } from "./settlement-tiers.js";
import { powerValue } from "./settlement-overview.js";

export function ownerName(village) { return village.owner?.name || "Unclaimed"; }
export function ownerRecord(player) { return {id: player.id, name: player.name || "Unknown player"}; }
export function claimSettlement(state, id, player) {
  const village = state.villages[id];
  if (!village || village.owner) return false;
  village.owner = ownerRecord(player);
  return true;
}

export function settlementDirectory(villages, player, requestedPage = 0, mine = false) {
  const rows = Object.values(villages).filter(v => !mine || v.owner?.id === player.id)
    .sort((a, b) => a.name.localeCompare(b.name));
  const pages = Math.max(1, Math.ceil(rows.length / 3));
  const page = Math.max(0, Math.min(pages - 1, requestedPage));
  const visible = rows.slice(page * 3, page * 3 + 3);
  const text = visible.map(v => `${v.name} · ${settlementTier(v.census).label}\n` +
    `Owner: ${ownerName(v)} · ${powerValue(v.census)} RP\n` +
    `${v.location.x}, ${v.location.y}, ${v.location.z} · ${v.dimension.replace('minecraft:', '')}`)
    .join("\n\n");
  return {page, pages, count: rows.length,
    text: `${text || (mine ? 'You do not own any settlements yet.' : 'No settlements registered.')}\n\nPage ${page + 1}/${pages} · ${rows.length} settlements\nPower uses each settlement's last survey.`};
}
