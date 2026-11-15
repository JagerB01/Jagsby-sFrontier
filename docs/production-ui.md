# Production panels — 0.0.47

Production has exactly two fixed, non-scrolling tabs: **Overview** and
**Resource Prospecting**. Both use the existing charter frame. Local tab
switches do not trigger terrain or villager scans.

## Overview

The upper section has two compact boxes side by side:

- **Output:** an item image, name and **+ X.XXX/hour** for each produced resource.
  At most two different items are possible; allocations producing the same item
  combine. Rates include Prosperity, Development, Colonization and any applicable
  River crop bonus. Full shared storage shows a paused status and zero actual
  output. Missing power and unsupported biomes have explicit status text.
- **Modifiers:** recorded Realm Power and the Prosperity, Development,
  Colonization and River crop percentages. A minimum RP estimate is marked.

The **stockpile** sits below both boxes. Its heading shows shared usage/capacity.
Six item types appear per page in two columns of three rows, with fractional
balances retained. Prev/Next changes only the stock page and stays in Overview.
**Collect stockpile** collects all whole items that fit the player's inventory,
including items on other pages, preserving fractions and anything that did not
fit. Collection returns to Overview and clamps the page if stock has changed.
There are no separate Resources or Stockpile tabs.

All 30 distinct producible resources have packaged icons. Flat item images use
Mojang's vanilla textures, and block items use compact isometric cubes generated
from their top/side textures. [Source provenance](production-icon-assets.json)
records the pinned Bedrock samples commit and each texture's SHA256. The optional
`tools/build_production_icons.py` regenerates icons with network access and
Pillow; ordinary addon builds use the checked-in PNGs without downloads.

## Resource Prospecting

The second tab retains the native biome/resource, allocation status, paper
progress, Native Specialization and surveyed nearby choices. Up to three choices
are shown per page, with Survey and Clear second controls. Selecting an option
opens a fixed confirmation preview. Confirmation rechecks research, selection
revision, radius, sample and loaded world identity before changing production.
Survey runs only on demand; navigating stock or tabs does not scan terrain.

The [biome production rules](biome-production.md) define rates, eligibility,
River bonuses, offline accounting and migration. This release changes display
and navigation without changing those production formulas or saved resources.

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

180 Node tests and 3 Python tests pass. Static packaging validates 181 pack
files. Coverage includes rate components, full-stock paused output, combined
allocation output, bounded pages/empty states, research and sample gating,
previewed verified selection, unloaded rejection, clearing, whole-item collection
with fractional preservation, panel bounds, compact rate formatting, shorter
hover frames and Hearthstone's three-minute effect duration. Native font/text
wrapping and controls still require an in-game check on Bedrock 1.26.40+.
