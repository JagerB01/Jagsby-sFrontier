// Provisional thresholds approved for testing; change this table to rebalance.
export const SETTLEMENT_TIERS = Object.freeze([
  { id: "outpost", name: "Outpost", minimumPower: 0 },
  { id: "hamlet", name: "Hamlet", minimumPower: 2 },
  { id: "village", name: "Village", minimumPower: 5 },
  { id: "town", name: "Town", minimumPower: 10 },
  { id: "city", name: "City", minimumPower: 20 },
].map(tier => Object.freeze(tier)));

export function settlementTier(census, tiers = SETTLEMENT_TIERS) {
  const exact = census && !census.error && Number.isFinite(census.realmPowerTenths)
    && census.realmPowerTenths >= 0;
  const minimum = census && !census.error && Number.isFinite(census.minimumPowerTenths)
    && census.minimumPowerTenths >= 0;
  const power = exact ? census.realmPowerTenths : minimum ? census.minimumPowerTenths : 0;
  let chosen = tiers[0];
  for (const tier of tiers) if (power >= tier.minimumPower * 10) chosen = tier;
  return {
    ...chosen,
    texture: `textures/ui/frontier/settlements/${chosen.id}`,
    label: exact ? chosen.name : minimum ? `≥ ${chosen.name}` : "Tier unavailable",
  };
}
