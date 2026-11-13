const PREFIX = "jagsby_frontier:";
const pending = new Map();

export async function sampleTradingRanks(villagers, system) {
  const jobs = [], fresh = [];
  for (const villager of villagers) {
    try {
      // Variant identifies profession, NOT trade rank. Only the two explicit
      // unranked professions (unemployed/nitwit) get the known base contribution.
      const profession = villager.getComponent?.("minecraft:variant")?.value;
      if (profession === 0 || profession === 14) {
        jobs.push(Promise.resolve([villager.id, 0]));
        continue;
      }
      let job = pending.get(villager.id);
      if (!job) {
        let resolve;
        const promise = new Promise(done => { resolve = done; });
        job = {villager, promise, resolve};
        pending.set(villager.id, job);
        fresh.push(job);
        villager.triggerEvent(PREFIX + "request");
      }
      jobs.push(job.promise);
    } catch {
      const failed = pending.get(villager.id);
      if (failed) { pending.delete(villager.id); failed.resolve([villager.id, undefined]); }
    }
  }
  if (fresh.length) {
    // One batch wait per interaction, sharing in-flight samples between players.
    system.runTimeout(() => {
      for (const job of fresh) {
        const {villager} = job;
        if (pending.get(villager.id) !== job) continue;
        let tier;
        try {
          const raw = villager.getProperty(PREFIX + "raw_rank");
          if (villager.getProperty(PREFIX + "ready") === true && Number.isInteger(raw) && raw >= 0 && raw <= 4) tier = raw;
        } catch { /* Unloaded/removed entity or incompatible overriding pack. */ }
        finally {
          try { villager.triggerEvent(PREFIX + "reset"); } catch { /* Entity gone. */ }
          pending.delete(villager.id);
          job.resolve([villager.id, tier]);
        }
      }
    }, 10);
  }
  const tiers = new Map(await Promise.all(jobs));
  return entity => tiers.get(entity.id);
}
