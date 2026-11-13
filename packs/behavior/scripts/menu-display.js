// Only UserBusy is retried. Closing a menu must never force it back open.
export async function displayMenu(player, form, system, maxBusyRetries = 3) {
  for (let attempt = 0; attempt <= maxBusyRetries; attempt++) {
    const response = await form.show(player);
    if (response.cancelationReason !== "UserBusy") return response;
    if (attempt < maxBusyRetries) {
      await new Promise(resolve => system.runTimeout(resolve, 10));
    }
  }
  player.sendMessage("§eThe Village Charter menu is busy. Close other screens and interact again.");
  return { canceled: true };
}
