// On-demand observations only. No entity polling or background census.
export const CENSUS_RADIUS = 64;
export const POWER_TENTHS_BY_TIER = Object.freeze([2, 4, 6, 8, 10]);
const VILLAGERS = new Set(["minecraft:villager", "minecraft:villager_v2"]);

export function describeTradeTier(tier) {
  // Vanilla trading tiers are zero based: novice=0, master=4.
  return Number.isInteger(tier) && tier >= 0 && tier <= 4
    ? POWER_TENTHS_BY_TIER[tier] : null;
}

export function takeCensus(dimension, location, readTradeTier, now = Date.now()) {
  // Query once in the charter's dimension. Filter type IDs to exclude wandering
  // traders and zombie villagers; use entity IDs to avoid duplicate observations.
  const entities = dimension.getEntities({
    location, maxDistance: CENSUS_RADIUS, families: ["villager"],
  });
  const seen = new Set();
  const tiers = [0, 0, 0, 0, 0];
  let unknownRanks = 0;
  let knownPowerTenths = 0;
  for (const entity of entities) {
    if (!VILLAGERS.has(entity.typeId) || seen.has(entity.id)) continue;
    seen.add(entity.id);
    let tier;
    try { tier = readTradeTier?.(entity); } catch { /* Entity may have unloaded. */ }
    const power = describeTradeTier(tier);
    if (power === null) unknownRanks++;
    else {
      tiers[tier]++;
      knownPowerTenths += power;
    }
  }
  return {
    observedAt: now, radius: CENSUS_RADIUS, villagers: seen.size, tiers,
    unknownRanks, knownPowerTenths,
    // Missing rank data is not a claim that all villagers are novices.
    minimumPowerTenths: knownPowerTenths + unknownRanks * 2,
    realmPowerTenths: unknownRanks ? null : knownPowerTenths,
    scope: "loaded_nearby_villagers",
  };
}

export function censusText(census) {
  if (!census) return "§8Villagers / Realm Power:§r Not surveyed; interact with the charter again.";
  if (census.error) return "§8Village survey:§r Unavailable; interact again to retry.";
  const power = census.realmPowerTenths === null
    ? `at least ${(census.minimumPowerTenths / 10).toFixed(1)} (trading ranks unavailable)`
    : (census.realmPowerTenths / 10).toFixed(1);
  return `§8Nearby loaded villagers (${census.radius} blocks):§r ${census.villagers}\n` +
    `§8Settlement Realm Power:§r ${power}\n` +
    "§7Survey refreshes when you interact with this charter.";
}
