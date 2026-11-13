const PROPERTY = "jagsby_frontier:trade_tier";
const SAMPLE_EVENT = "jagsby_frontier:sample_trade_tier";

export async function sampleTradingRanks(villagers, system) {
  const sampled = new Map();
  // triggerEvent reaches the native villager trade component via Molang. No
  // animation controller, continuous ticking, XP guess or manual rank tag.
  for (const villager of villagers) {
    try {
      villager.triggerEvent(SAMPLE_EVENT);
      sampled.set(villager.id, villager);
    } catch { /* Another pack may have replaced our vanilla entity definition. */ }
  }
  if (sampled.size) {
    // Entity property changes commit at the end of the tick, so don't read the
    // property synchronously immediately after triggering its event.
    await new Promise(resolve => system.runTimeout(resolve, 2));
  }
  const tiers = new Map();
  for (const [id, villager] of sampled) {
    try {
      const tier = villager.getProperty(PROPERTY);
      if (Number.isInteger(tier) && tier >= 0 && tier <= 4) tiers.set(id, tier);
    } catch { /* Entity may have unloaded or been removed before the read. */ }
  }
  return entity => tiers.get(entity.id);
}
