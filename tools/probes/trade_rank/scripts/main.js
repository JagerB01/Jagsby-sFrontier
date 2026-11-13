import { world, system } from "@minecraft/server";

const PREFIX = "jagsby_frontier_probe:";
const pending = new Set();

world.beforeEvents.playerInteractWithEntity.subscribe(event => {
  if (!event.player.isSneaking || !["minecraft:villager", "minecraft:villager_v2"].includes(event.target.typeId)) return;
  event.cancel = true;
  const player = event.player, villager = event.target;
  if (pending.has(player.id)) return;
  pending.add(player.id);
  system.run(async () => {
    try {
      villager.triggerEvent(PREFIX + "request");
      await new Promise(resolve => system.runTimeout(resolve, 10));
      const ready = villager.getProperty(PREFIX + "ready");
      const raw = villager.getProperty(PREFIX + "raw_rank");
      if (ready === true && Number.isInteger(raw) && raw >= 0 && raw <= 5) {
        player.sendMessage(`§e[Trade rank PROBE]§r ${villager.id}: raw tier = ${raw}. Compare with the trading screen; this result is not yet verified.`);
        console.warn(`[Frontier rank probe] entity=${villager.id} raw_tier=${raw} ready=true; requires comparison with native trading UI`);
      } else {
        player.sendMessage("§e[Trade rank PROBE]§r No result. Check the Content Log for query errors; unemployed villagers may have no trade table.");
        console.warn(`[Frontier rank probe] entity=${villager.id} no result; ready=${ready} raw=${raw}`);
      }
    } catch (error) {
      console.warn(`[Frontier rank probe] ${error}`);
      player.sendMessage("§c[Trade rank PROBE]§r Could not sample this entity. Check the Content Log.");
    } finally {
      try { villager.triggerEvent(PREFIX + "reset"); } catch { /* Entity may no longer exist. */ }
      pending.delete(player.id);
    }
  });
});
