# Fixed Production panels — 0.0.46

Production has four local subtabs within the existing charter frame. All use
fixed-size panels; there is no scrolling Production page. Allocation previews are fixed panels.
Switching subtabs does not submit a form or trigger a census. Lists use explicit
Previous/Next controls and retain their selected subtab after an action.

- **Overview:** total items per real-world hour, base output and zone bonus,
  recorded Realm Power, Prosperity, permanent Development, Colonization and
  producing/paused/waiting status. Refresh rates accounts existing elapsed output
  without scanning villagers or terrain.
- **Resources:** three resources per page, each with current items/hour,
  potential base/zone components and the primary/secondary biome source.
  Matching resource output is added together and listed once. When stock is full, actual
  output is shown as paused while potential rates remain visible.
- **Biomes:** primary and selected secondary biome, Resource Prospecting unlock
  or saved paper progress, three allocation options per page, including Native Specialization, and inline Use
  buttons. Each option identifies its resource and 50% allocation. Use opens a fixed preview before confirmation.
  Survey runs the existing loaded-sample lattice within 256 blocks. No survey
  runs automatically on tab switching. Use rechecks research, recorded sample,
  distance, supported resource mapping and loaded biome identity. Stale or
  unavailable samples cannot replace the active second biome. Clear second
  removes only the secondary selection, leaving research and primary production.
- **Stockpile:** civilization-wide usage/free space, five item types per page,
  fractional amounts stored and whole items collectable. Collect all transfers
  all whole items that fit inventory, retaining fractions and uncollected items;
  it is not restricted to the visible page. Pages clamp after collection.

The [0.0.43 biome production rules](biome-production.md) define rates, eligibility,
allocation choices and River bonuses. Unmapped biomes receive an explicit
no-production message instead of invented outputs. Offline production
continues using cached Realm Power and saved biome/research records.

## Other readability corrections in this release

Development's labels and values share rows, with the hourly rate and route
values left-aligned to the same column. The panel is 56 UI units high instead
of 72, with tighter row spacing and unchanged width; the adjacent Production
placeholder matches its height. **Development N** stays gold; the other text
keeps its existing neutral colors and uniform font size.

**Dev/Hr** displays three decimal places: **+ 0.002**, **+ 1.236**, or **0.000**.
Large rates retain compact suffixes with three decimals, such as **+ 1.200k**.
The estimate still uses Development value rates divided by the existing
500-value-per-point threshold.

Research hover boxes now measure the rendered wrapped label instead of using a
fixed pixel height or reserving text rows. The collection scope and vertical
content stack derive their height from the label; the outside panel uses the
largest child's height and its nine-slice frame follows the sibling content.
The live collection sits inside a full-width body panel, with a nine-unit
inset matching the title and divider. This avoids native stack positioning
shifting the narrower collection outside the frame. Fixed padding is six
pixels above/below the title/body stack. The popup's top is
anchored four pixels below a top-tier card, or its bottom four pixels above other
cards, so changing height cannot move it over the hovered card. This uses native
JSON UI layout sizing (`default`, `100%c`, `100%cm`, `100%sm`), not estimates of
character counts. See [layout reference](https://wiki.bedrock.dev/json-ui/json-ui-documentation#layout).
Current effects are omitted at Lv 0; only current/next effects are described.
The prerequisite is shown once and status is Available, Locked or Fully upgraded.
Direct contribution, costs, saved progress and Stewardship caps are unchanged.
Hearthstone explicitly grants Regeneration I within the settlement and retains
it for three minutes after leaving; the native effect is refreshed to 3,600
game ticks while inside. Hearthstone II's next/current paragraph adds the
existing 2-health-point villager heal once per Minecraft day.

## Validation

178 Node tests and 3 Python tests pass. Static packaging validates 148 pack
files. Coverage includes rate components, full-stock paused output, combined
allocation output, bounded pages/empty states, research and sample gating,
previewed verified selection, unloaded rejection, clearing, whole-item collection
with fractional preservation, panel bounds, compact rate formatting, shorter
hover frames and Hearthstone's three-minute effect duration. Native font/text
wrapping and controls still require an in-game check on Bedrock 1.26.40+.
