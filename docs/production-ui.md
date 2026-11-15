# Fixed Production panels — 0.0.39

Production has four local subtabs within the existing charter frame. All use
fixed-size panels; there is no scrolling Production page or biome-picker menu.
Switching subtabs does not submit a form or trigger a census. Lists use explicit
Previous/Next controls and retain their selected subtab after an action.

- **Overview:** total items per real-world hour, base output and zone bonus,
  recorded Realm Power, Prosperity, permanent Development, Colonization and
  producing/paused/waiting status. Refresh rates accounts existing elapsed output
  without scanning villagers or terrain.
- **Resources:** three resources per page, each with current items/hour,
  potential base/zone components and the primary/secondary biome source.
  Shared resources such as stone are listed once. When stock is full, actual
  output is shown as paused while potential rates remain visible.
- **Biomes:** primary and selected secondary biome, Resource Prospecting unlock
  or saved paper progress, three surveyed options per page, and inline Use
  buttons. Each option identifies additional resources or shared primary output.
  Survey runs the existing loaded-sample lattice within 256 blocks. No survey
  runs automatically on tab switching. Use rechecks research, recorded sample,
  distance, supported resource mapping and loaded biome identity. Stale or
  unavailable samples cannot replace the active second biome. Clear second
  removes only the secondary selection, leaving research and primary production.
- **Stockpile:** civilization-wide usage/free space, five item types per page,
  fractional amounts stored and whole items collectable. Collect all transfers
  all whole items that fit inventory, retaining fractions and uncollected items;
  it is not restricted to the visible page. Pages clamp after collection.

This reorganizes existing economy information and controls without changing
production rates, biome eligibility, Development, Colonization or capacity.
The existing resource table remains authoritative: unmapped biomes receive an
explicit no-production message instead of invented outputs. Offline production
continues using cached Realm Power and saved biome/research records.

## Other readability corrections in this release

Development's labels and values share rows, with values aligned to the right.
**Dev/Hr** is the rate label. The current value appears beside Development in the heading, with no Current row; all text in this box uses the same size. Values use at most two decimal places;
a small positive rate is shown as **+<0.01**, rather than zero. All positive rates have a + prefix. Large rates use
compact suffixes. This changes formatting only; the estimate still uses existing
Development value rates divided by the 500-value-per-point threshold.

Research hover boxes use smaller per-technology frames instead of the former
uniform oversized frame. Effects describe only the current and next level.
At Lv 0 the Current paragraph is omitted. Direct contribution, exact next-level
cost, progress, remainder, prerequisite and Stewardship ceilings remain.
Hearthstone explicitly grants Regeneration I within the settlement and retains
it for three minutes after leaving; the native effect is refreshed to 3,600
game ticks while inside. Hearthstone II's next/current paragraph adds the
existing 2-health-point villager heal once per Minecraft day.

## Validation

110 Node tests and 3 Python tests pass. Static packaging validates 148 pack
files. Coverage includes rate components, full-stock paused output, source
resource deduplication, bounded pages/empty states, research and sample gating,
inline verified selection, unloaded rejection, clearing, whole-item collection
with fractional preservation, panel bounds, compact rate formatting, shorter
hover frames and Hearthstone's three-minute effect duration. Native font/text
wrapping and controls still require an in-game check on Bedrock 1.26.0+.
