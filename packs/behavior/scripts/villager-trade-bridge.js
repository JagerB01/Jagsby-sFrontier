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
    // Poll as one batch. A fresh request must cross at least one server tick;
    // finish ready entities immediately instead of always stalling ten ticks.
    // Keep the original ten-tick deadline for slow/incompatible controllers.
    const poll = elapsed => {
      let waiting = false;
      for (const job of fresh) {
        const {villager} = job;
        if (pending.get(villager.id) !== job) continue;
        let tier, ready = false;
        try {
          ready = villager.getProperty(PREFIX + "ready") === true;
          const raw = villager.getProperty(PREFIX + "raw_rank");
          if (ready && Number.isInteger(raw) && raw >= 0 && raw <= 4) tier = raw;
        } catch { ready = true; /* Removed entity or incompatible overriding pack. */ }
        if (!ready && elapsed < 10) { waiting = true; continue; }
        try { villager.triggerEvent(PREFIX + "reset"); } catch { /* Entity gone. */ }
        pending.delete(villager.id);
        job.resolve([villager.id, tier]);
      }
      if (waiting) system.runTimeout(() => poll(elapsed + 1), 1);
    };
    system.runTimeout(() => poll(1), 1);
  }
  const tiers = new Map(await Promise.all(jobs));
  return entity => tiers.get(entity.id);
}
