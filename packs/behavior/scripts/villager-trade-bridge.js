// The 0.0.9 content log proves query.trade_tier is not available in entity
// set_property events. Stable Script API also has no native trade-tier accessor.
// Do not reuse a cached property from that invalid bridge as a real trade level.
export async function sampleTradingRanks() {
  return () => undefined;
}
