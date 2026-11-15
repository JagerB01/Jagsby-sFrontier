# Production panels — 0.0.56

Production has exactly two tabs: a fixed **Overview** and a scrollable
**Resource Prospecting** list. Both use the existing charter frame. The header Survey button refreshes villagers and nearby loaded terrain;
opening and navigating use cached data and do not trigger scans.

## Overview

The upper section has two compact boxes side by side:

- **Output:** an item image, name and **+ X.XXX/hour** for each produced resource.
  Two rows fit both possible resources; matching items combine into one row.
  Text is larger and Producing uses the same orange/gold as Modifiers. Rates
  include all active bonuses; full stock shows a paused status and zero output.
- **Modifiers:** the combined increase sits beside the Modifiers heading,
  aligned with the same value column used by Prosperity, Development,
  Colonization and conditional River below. There is no bottom Total row.
  Values bind directly to native form text. A horizontal stack places a normal
  font percent label immediately after the measured numeric label. No numeric
  string concatenation, percent images or separate fixed percent columns are
  used. This restores the values hidden by the 0.0.52 computed bindings.
  The combined increase still multiplies the production boosts and weights
  River across crop output. At 20% Prosperity, 10% Development and 50%
  Colonization, River specialization totals +117.8%; River + Forest +111.86%.

The **stockpile** sits below both boxes on a single page. Only items with at least one whole unit appear, packed consecutively in a
15-column grid with room for all 30 producible types in two rows. Empty slots
are hidden; fractional-only balances wait until a whole item is available. Every
icon has its whole stored quantity in the bottom-right corner with a shadow for
contrast. There are no stock Prev/Next buttons or page indicator. The heading
shows the sum of whole stored items against the existing shared capacity.
Fractions remain saved internally, continue accumulating, and are neither shown
as collectable items nor discarded by collection.

**Collect stockpile** is centered on its button. It collects all whole items that
fit the player's inventory and preserves fractions and items that did not fit.
Previously saved items outside the new production table remain in storage and
are still collected. Collection returns to Overview. There are no separate
Resources or Stockpile tabs, and the panel remains fixed and non-scrolling.

All 30 distinct producible resources have packaged icons. Flat item images use
Mojang's vanilla textures, and block items use compact isometric cubes generated
from their top/side textures. [Source provenance](production-icon-assets.json)
records the pinned Bedrock samples commit and each texture's SHA256. The optional
`tools/build_production_icons.py` regenerates icons with network access and
Pillow; ordinary addon builds use the checked-in PNGs without downloads.

## Resource Prospecting

The second tab lists the native biome first, followed by every discovered
eligible nearby biome. Each row has the biome name, item image and projected
**+ X.XXX Resource/hour**. Native uses its name, such as River, instead of
Native Specialization. Selecting that row still specializes both allocations.

A row's rate is that item's output after the proposed selection, including all
current bonuses. Matching items include their combined output; other rows show
the new item's output while retaining the native slot. Before Prospecting is
unlocked, the native row shows its actual single allocation. Selected rows are
marked and locked rows cannot be selected. No production changes on hover.

The list supports all 52 eligible choices and scrolls when its contents exceed
the viewport. The old inline Survey, Prev and Next controls and verbose header
are removed; the shared Survey button is beside Rename.
Pressing Survey performs a bounded survey of loaded surface columns within
256 blocks and caches IDs/sample positions; unloaded columns are skipped, and
chunks are never forced to load. Other menu actions do not survey again. Clear second
is retained below the list. Selection applies immediately, rechecking research, revision, radius and the
actual loaded biome identity before saving. There is no confirmation page.

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
100-value-per-point threshold.

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

188 Node tests and 3 Python tests pass. Static packaging validates 191 pack
files. Coverage includes rate components, full-stock paused output, combined
allocation output, bounded pages/empty states, research and sample gating,
immediate verified selection, unloaded rejection, clearing, whole-item collection
with fractional preservation, panel bounds, compact rate formatting, shorter
hover frames and Hearthstone's three-minute effect duration. Native font/text
wrapping and controls still require an in-game check on Bedrock 1.26.40+.

## Settlement Overview summary (0.0.51)

The main Overview's compact Production box shows the current produced item
icons and their + X.XXX/hr rates, with two rows available for distinct items.
Matching resources remain combined, and full storage shows zero actual rates.
An unassigned settlement shows None. This uses separate summary label controls
so it cannot change the detailed Production tab's text dimensions.

Dev/Hr and Route values remain left-aligned in a shared column, shifted four
UI units right. Both box sizes and the gold Development heading are retained.

## Binding and ownership correction (0.0.53)

Overview production rate records are now raw native form text, using the same
binding path as the working Dev/Hr field. They bypass marker-stripping computed
text. The two rates remain beside their item icons and include the /hr unit.

The identity header places the settlement name on one line and Owner: Name on
a full-width byline below it, without a tiny separate Owner label. Both fit
above the existing divider; the card dimensions do not change.

## Development and census balance (0.0.54)

An 80-block-radius loaded-villager census supplies recorded RP. One Development
point now requires 100 earned value, with the existing +0.1% production per point.
At fixed production and trade value rates, the points/hour estimate is five
times the former estimate. Saved value is retained. Old offline intervals use
the old threshold until catch-up completes, then the new threshold takes effect.

## Manual survey (0.0.56)

Survey sits beside Rename and is available from any charter tab. It performs
the villager-rank refresh and biome survey, then redraws the charter with the
updated data.
Opening no longer waits for the rank bridge or terrain queries. RP and biome
choices remain cached until another Survey; new settlements need an initial
Survey. Requests from multiple players share one job per settlement.
