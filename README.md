# Jagsby's Frontier

Minecraft Bedrock village and civilization addon, based on the imported v0.1
prototype. **This is not a completed implementation of the specification**.

## Download

[Download the current prototype addon](downloads/Jagsbys_Frontier_v0.0.91.mcaddon?raw=true)

Version 0.0.91 adds **Diplomacy → Open Settlement Map**: shared settlement
locations, a dark grid with green named markers, selection details, zoom, pan
and dimension selection. It reads the existing saved registry only on map
actions, with no scans or tick loops. See [map controls and limitations](docs/settlement-map.md).

Version 0.0.90 replaces the Information tab with **Diplomacy** and the approved
64×64 transparent banners icon. The tab is a placeholder for future diplomacy
features; tab switching remains local.

Version 0.0.89 restores normal data binding in Realm directories, Road Networks
and Resource Prospecting. Rows no longer freeze their visibility before the
shared form body arrives, and indexed text/icons can populate while their tab
or scroll row is initially hidden. Layout, record values, local tab switching
and gameplay logic are unchanged. No new JSON UI properties are introduced;
`text_truncate` remains rejected. In-game display and content-log confirmation
are still required.

Version 0.0.88 removes unsupported `text_truncate` from the Roads name and owner
labels. The handoff identifies these two templates repeated across 128 rows as
the source of 256 UI errors per opening. No substitute property is introduced;
the generated UI changes only by those two removals. Packaging now rejects this
property anywhere in resource-pack UI. Layout, bindings, scrolling, controller
focus and gameplay remain unchanged. A clean Minecraft content log still needs
in-game confirmation.

Version 0.0.87 gives Prospecting and Realm rows a controller reading-focus target,
even when Select, Establish Road or Travel is unavailable. Move down from the
subtab into the list, then use the D-pad to move through rows; the native scroll
panel follows focus. A gold edge marks the focused row. Reading rows does not
submit the form. Native action validation, local tabs and the 13-binding
background-update budget are preserved. Controller behavior needs in-game testing.

Version 0.0.86 removes the broad hidden-list polling added in 0.0.85. Realm and
Prospecting keep the shared form-state source, read immutable row markers once
per opening, and update native text, icon and action bindings only while visible.
Always-updating binding definitions fall from 2,430 to 13 (the existing tab toggles
and shared body). Layout, scrolling, local navigation and gameplay are unchanged.
Minecraft loading-time improvement still needs in-game confirmation.

Version 0.0.85 addresses blank Realm and Resource Prospecting panels. Scrolling
rows read visibility markers from a shared dashboard control; native collection
bindings remain active while tabs are hidden. Prospecting previews use direct
native text, with one red research requirement instead of repeated Locked labels.
Tabs continue switching locally without reloading. Content logs include row counts
for diagnosis. Automated checks pass; Minecraft rendering needs in-game confirmation.

Version 0.0.84 resizes both addon-selector icons to exactly 256×256 pixels using
the same supplied Frontier artwork. Each PNG is 98,350 bytes; the larger original
is no longer bundled in the addon. Gameplay and the charter UI are unchanged.

Version 0.0.83 replaces the behavior and resource pack icons with the supplied
Jagsby's Frontier emblem for Minecraft's world-creation addon selectors. The
original PNG is used unchanged in both packs, replacing the previous artwork.

Version 0.0.82 removes the completed road-tier caption and enlarges the Road
icon from 16 to 20 UI units, centering its heading and image in the gap between
Travel Cost and Travel. Construction countdowns remain below the icon.
Shared Storage's hover no longer repeats the stored amount. Research cards omit
Status lines, show missing requirements in red, and mark permanent completion
and its card level in yellow. Click to contribute appears only on upgradeable,
unlocked techs. Research costs, progress and prerequisite rules are unchanged.

Version 0.0.81 allows travel on an already-completed road while its next tier is
under construction. Travel uses the current completed tier's price until the
six-Minecraft-day upgrade finishes, then gains the new discount if the departure
village's local Road Networks research supports it. The UI keeps showing the
upcoming icon/countdown. First-time road construction still blocks travel.

Version 0.0.80 labels the road price column Travel Cost and includes the unit in
the value (for example, 8 corndogs). Road appears above the tier icon, with
> X days beneath a construction/upgrade target icon. Construction remains six
Minecraft days per stage. Normal Savanna now produces wheat using common crop
rates; Savanna Plateau and Windswept Savanna still produce acacia logs. Existing
saved acacia stock remains visible and collectible.

Version 0.0.79 reduces the shared stockpile to 128 items initially, plus 64 per
completed Shared Storage level: 128 → 192 → 256 → 320. Storage upgrades still
cost 512 building materials and obey Stewardship. Previously stored items are
preserved, including fractions and amounts above the new capacity. Over-cap
stock displays "Over capacity - collect"; production resumes only after enough
space is available, without banking blocked output.

Version 0.0.78 restores selected defaults so fresh charters immediately show
Overview. The nested groups default to Local Research, Production Overview and
Road Networks. Correct one-time view bindings apply action-refresh selection;
the expression is evaluated as a view rather than treated as a binding name.
All tab/subtab switching remains local with no form reload.

Version 0.0.77 restores local tab and subtab switching with no form reload.
Only actions that update data submit the form. Research contributions return to
their Local/Global card view; production actions return to their own pane. Survey
and Rename use view-specific bindings gated by the visible local tabs, so action
refreshes can restore that view without submitting navigation clicks. Initial
selection comes from the refresh marker instead of forcing the first radio tab.
The all-tech Stewardship ceilings introduced in 0.0.76 remain in place.

Version 0.0.76 applies Stewardship's ceiling to every other local and global
tech, including Colonization, Frontier Expansion, Hearthstone and Road Networks.
Individual maximum levels still apply. New contributions and saved-payment
progression cannot cross the ceiling; existing purchases and contributions are
retained. Stewardship itself remains uncapped.

Tabs now send indexed navigation actions so the script knows the current page
and subtab. Contributions, Rename (including cancel), Survey, claiming, collection
and production changes reopen the current view. Tab selection refreshes the form
without surveying villagers; Realm's explicit indexed rows remain intact.

Version 0.0.75 explains that Stewardship sets the maximum level of Prosperity,
Sanctuary, Settlement Charters and Shared Storage. Settlement Charters shows its
limit comparison without founded-count or founding-rule filler. All research
cards show "Required:" only for unmet prerequisites, removing satisfied ones
individually and omitting the line entirely when none remain.

Version 0.0.74 extends the compact cyan-current → green-next comparisons to all
ten research cards. Stewardship shows the ceiling, Settlement Charters the slot
limit, Shared Storage the item capacity, Frontier Expansion the founding zone,
and Colonization the named zone and bonus. Hearthstone compares regeneration and
villager healing, Prospecting the secondary allocation, and Road Networks its
travel tier and food savings. Sanctuary and Prosperity retain their percentage
comparisons. Shared notes appear once; capped cards show only their current
benefit. Costs, prerequisites, progression and gameplay rules are unchanged.

Version 0.0.73 compacts Sanctuary and Prosperity research benefits into cyan
current values, an arrow, and green next-level values. Sanctuary's three-minute
linger is stated once; costs, contribution progress, prerequisites and locks
remain visible. Percent signs use a Unicode glyph to avoid the Script API's
ASCII-percent formatting issue. Research calculations and prices are unchanged.

Version 0.0.72 displays travel prices in corndogs: one stored food point is
half a corndog, so bread is worth 2.5 corndogs. Every Trail and upgrade takes
six Minecraft days (144,000 ticks). Travel is blocked during all construction
and upgrades. Departure requires local Road Networks I; pricing uses the lower
of the completed connection tier and the departure village's local research.
The two endpoints can therefore have different travel costs. Pending trial timers
are corrected from their original start; already-completed roads are preserved.
Whole food items are still consumed, with no refund for unavoidable overpayment.

Version 0.0.71 makes Road Networks a compact horizontal list: settlement and
owner, distance, food-point cost, road-tier icon, then a direct Travel button.
Rows are 34 UI units high instead of 66. There is no bottom management button;
click a tier icon to open the existing road management and upgrade controls.
Upgrading routes display only the upcoming tier icon with "in X days" beneath
it, using Minecraft days. Travel still uses the current completed road and cost
until the upgrade finishes. New routes disable Travel until their first road
is built. Settlement directory layouts retain their working indexed renderer.

Version 0.0.70 removes the unsuccessful Realm row factories entirely. Every
field and image now uses the explicit indexed collection scopes from the working
0.0.66 layout. My Settlements and All Settlements restore the two-line column
layout inside scrolling panels. Road cards retain their construction icons and
Minecraft-day estimates. Visibility comes from global form-body markers, without
collection-text filtering or sibling-source lookups. The generated layout supports
128 entries per list and reports overflow instead of hiding entries; change
`row_limit` in `tools/build_charter_ui.py` and rebuild to expand it. This replacement
still needs an in-game rendering check.

Version 0.0.69 attempted to replace Realm's per-control text aliases with one native
collection-bound label per row. Visibility, displayed details, and construction
icons read that named label using sibling-scope view bindings. The supplied
0.0.68 content log confirms that build loaded and created 248 form records but
contains no UI errors; the previous binding changes did not fix the reported
rendering. This replacement still requires an in-game rendering check.

Version 0.0.68 attempted to correct the Realm scrolling-row bindings after the reported blank
cards, unrelated icons, and overlapping labels in 0.0.67. In that version, row text properties received
explicit defaults and aliases, while descendants retained the native factory
collection context. Conditional content starts hidden until its row is bound.
The Overview route shows the destination settlement name without its road type;
the Road Networks summary no longer displays a research level. These binding
changes still need confirmation in Minecraft.

Version 0.0.67 replaces the Realm page controls with scrollable My Settlements,
All Settlements, and Road Networks lists. Rows are generated for every entry;
there is no three-row limit. Construction cards show the current and next road
artwork, plus time remaining in Minecraft days (24,000 ticks per day). A new
Trail starts from No road; upgrades retain the existing route and travel cost.
Time remaining refreshes when the charter is reopened.

Version 0.0.66 improves Realm rows: settlement icons are inset and smaller,
Establish Road is centered, and Road Networks uses matching village/owner/distance
rows with travel cost in food points. Completed Trail/Road/Highway artwork appears
beside each connection. New routes show Building progress with travel unavailable;
upgrades show the existing road artwork and current travel price until complete.

Version 0.0.65 prevents Village Charter placement within 80 blocks of another
recorded charter and explains blocked placement in player chat.

Version 0.0.64 makes **Survey** refresh both villagers/RP (80 blocks) and nearby
biomes (256 blocks). Opening and navigating use saved census results with no rank
sampling wait. New settlements need their first Survey before they have RP.

Version 0.0.63 reduces menu transport from 506 to 289 records and reads fresh
villager rank results as soon as the server controller is ready (one tick minimum,
with the existing ten-tick timeout). Every opening still refreshes villagers in
80 blocks; nearby-biome scans remain manual. Content-log timings separate villager
refresh from form preparation. Actual client load time needs an in-game check.

Version 0.0.62 restores Frontier's original resource-pack identity and separate
registered custom charter renderer, undoing the HUD troubleshooting changes in
0.0.60–0.0.61. The user traced the HUD issue to MineScape. Gameplay, existing
settlement data and the Vibrant Visuals declaration are unchanged.

**Updating:** use Frontier 0.0.62 for both Behavior Packs and Resource Packs.
Disable the separate 0.0.61 resource pack if you activated it. Fully restart
Minecraft after importing so the custom menu definitions reload.

Version 0.0.59 declares the resource pack’s **pbr** capability for Vibrant Visuals
compatibility. Enable Vibrant Visuals in Minecraft on a supported device;
Frontier keeps its existing textures and does not replace world lighting settings.
Compatibility still requires an in-game check with your active pack stack.

Version 0.0.58 adds the supplied Trail, Road and Highway icons to connection
rows in Road Networks. Construction shows the tier being built; completed
connections show their current tier alongside travel cost.

Version 0.0.57 restores villager and Realm Power refresh when the charter opens.
The header **Survey** button scans nearby biomes only. Opening no longer performs
the 197-position biome scan; the villager-rank sampling wait is retained.

The Village Charter is now [craftable](docs/village-charter-crafting.md) with
five planks, a center lectern and three cobblestone along the bottom. Its recipe
unlocks from any ingredient. Use the recipe book's **All** view to see it before
you have the complete materials.

Version 0.0.55 removes estimate markers from tier and RP displays. My Settlements
and All Settlements now use compact two-line rows with the uploaded size icons,
name/owner, coordinates/distance, Development and an Establish Road action.
Road construction starts directly and returns to the same list.

Version 0.0.54 increases villager detection to an **80-block radius** and awards
one Development point per **100 earned value**, down from 500. Existing value
is retained; saved offline production settles under its previous threshold
before the new threshold activates. Dev/Hr and production bonuses use the new
point count automatically.

Version 0.0.53 restores direct native bindings for modifier values and Overview
hourly production. A normal font percent sign follows the measured number
without string-expression conversion. Ownership is one readable **Owner: Name**
line beneath the settlement name, replacing the stacked label/name.

Version 0.0.52 puts the combined percentage beside **Modifiers**, aligned with
the values below, and uses real percent text immediately after each number.
Biome selections apply immediately with no confirmation page. The Overview's
compact production rates use **+ X.XXX/hr** so the hourly unit fits clearly.

Version 0.0.51 shifts the Development values slightly right and fills the main
Overview's Production box with up to two item icons and their current hourly
rates. Both overview boxes retain their compact dimensions.

Version 0.0.50 adds aligned Total and conditional River bonuses, with explicit
percent glyphs in the UI. Resource Prospecting is a scrolling biome/icon/rate
list; opening the charter automatically surveys nearby loaded terrain. Manual
Survey and biome paging buttons are removed.

Version 0.0.49 shows only stocked whole items, packed into the grid without gaps.
Each modifier now has its own label/value row with enough height; percentages
use native literal text bindings rather than a clipped multi-line field.

Version 0.0.48 puts all 30 stockpile item icons on one page, with whole-item
counts in the bottom-right corner and no stock paging. Collect stockpile is
centered. Larger text, matching orange headings and aligned percentage-only
modifiers keep the production overview compact and readable.

Version 0.0.47 rebuilds Production with just **Overview** and **Resource
Prospecting**. Overview shows item images and **+ X.XXX/hour**, a separate
modifiers box, and the shared stockpile below with **Collect stockpile**.
Stock pages stay in Overview; there are no separate Resources or Stockpile tabs.

Version 0.0.46 keeps research tooltip text inside the frame using a full-width
body row with the same inset as the title. Tooltip height still follows content.

Version 0.0.45 aligns Development values to one left-aligned column, reduces
the panel height, keeps the gold Development heading, and shows Dev/Hr to
three decimal places with a normal plus sign, such as **+ 0.002**.

Version 0.0.44 adds Dappled Forest → Poplar Logs using verified Bedrock IDs,
including production, biome selection and Building research contributions.
The minimum Bedrock version is now 1.26.40.

Version 0.0.43 implements the finalized [biome production economy](docs/biome-production.md):
one resource per biome, two 50% allocations, explicit Native Specialization or
nearby diversification, a fixed confirmation preview, and River's +10% crop
bonus. Version 0.0.44 corrects the outdated compatibility baseline and supports
all 52 assignments, including Dappled Forest producing Poplar Logs. Existing saved backlog is paid under its
previous rates before migration.

Version 0.0.42 replaces fixed research-popup heights with native content sizing:
the wrapped text determines the height, with small edge padding. The frame
follows the content and stays anchored above/below the hovered card. Locked
status no longer repeats the requirement sentence.

Version 0.0.41 cleans up the Development box: one text size, the value beside
Development, no Current row, and **Dev/Hr** with a **+** for positive rates.

Version 0.0.40 places research popups below the top tech or above the other
techs, keeping the hovered card clear. Names and levels are centered beside the
icon, with a larger name and smaller **Lv X**. The prompt is **Click to contribute**.

Version 0.0.39 replaces the scrolling Production page with fixed **Overview,
Resources, Biomes and Stockpile** panels. Resource and stock lists are paged;
secondary biome selection is inline with research/survey status. Development/Hr
is compact and right-aligned, and research hover boxes show literal current/next
effects in smaller frames. [Production details](docs/production-ui.md).

Version 0.0.38 removes the map feature and replaces Realm’s first subtab with
**Road Networks**, alongside My Settlements and All Settlements. Road connections
are listed in pages, with controls for management, construction and food-powered
travel. The Overview has side-by-side Development and Production boxes, with
the owner beside the settlement name; Production is reserved for later design.

Every research card shows its name and **Lv X**. Hover for a plain-language
explanation, next cost, saved contribution, remaining amount and requirements.
**Clicking the card contributes directly**; no research details menu opens.
The popup says **Click to contribute**. Eligible held items are
preferred; otherwise the first eligible inventory type is used, capped at the
remaining next-level cost. Stewardship caps all endless research.

- [Global research, zones and migration](docs/global-research.md)
- [Finalized local research costs and contributions](docs/local-research.md)
- [Settlement economy, Development and roads](docs/settlement-economy.md)
- [Version history](docs/changelog.md)

The header shows the village name above a smaller Village Charter subtitle.
Overview keeps the framed portrait beside compact Owner, Village Tier, Biome
and Realm Power sections. Both research subtabs fit without scrolling.
Power uses explicit text such as 2.0 RP. Rename stays in the header.

The fourth tab is **Realm**, with paged My Settlements / All Settlements views.
New charters record their placer as owner; legacy unowned settlements display
Unclaimed and can be explicitly claimed. Resource collection is under Production.
Global research uses Stewardship → Frontier Expansion / Settlement Charters →
Colonization / Shared Storage, with functional contribution actions. Local
Sanctuary and Prosperity obey Stewardship; permanent Development is uncapped. See [0.0.25 UI details](docs/realm-and-research-ui.md).

The on-demand server-controller trade-rank bridge is now included. **Disable the
separate Trade Rank Probe pack** when using this build, because both define
vanilla villagers. Charter interaction samples normal ranks from Novice (0.2)
through Master (1.0); unknown reads remain labeled minimum estimates. MineScape
is not required. In-game name: **Jagsby's Frontier 0.0.42**. The user confirmed
the probe's Apprentice reading; this production integration and updated visual
layout still need in-game verification.

- Requirements: [village system specification](docs/village-system-spec.md).
- Integration blockers and prototype defects: [implementation status](docs/implementation-status.md).
- Source: `packs/behavior` and `packs/resource`.
- Current census feature and limitations: [village census](docs/village-census.md).
- Standalone custom UI: [charter dashboard](docs/custom-charter-ui.md).

Village Charters cannot be placed within 80 blocks (including exactly 80) of
another recorded charter in the same dimension. This uses the Survey census
radius and three-dimensional distance. Blocked placements keep the held item
and show a chat message to the placing player. Newly placed charters are recorded
even if settlement founding is unavailable; breaking a charter clears its placement
record. Existing registered settlements also enforce the spacing rule. Older
unregistered charter blocks must be broken and replaced once to enter the index.
Existing settlements are not removed by this rule.

## Development

### Trade-rank diagnostic

[Download the isolated trade-rank probe](downloads/Jagsbys_Frontier_Trade_Rank_Probe_0.0.1.mcpack?raw=true).
This tests a different native Molang context and is **unverified**, not a
completed scoring fix. See [investigation and test steps](docs/trade-rank-investigation.md).

### Settlement portraits

- [Download 96×168 portraits](downloads/Jagsbys_Frontier_Settlement_Portraits_96x168.zip?raw=true): recommended; about 62 KiB for all five PNGs.
- [Download 64×112 portraits](downloads/Jagsbys_Frontier_Settlement_Portraits_64x112.zip?raw=true): compact; about 30 KiB for all five PNGs.

See [asset details](docs/settlement-portrait-assets.md). The recommended set is
wired into the Overview and changes with the settlement's Realm Power tier.

### Tab sprites

[Download the three transparent 64×64 tab sprites](downloads/Jagsbys_Frontier_Tab_Sprites_64x64.zip?raw=true).
The approved set A artwork is in `packs/resource/textures/ui/frontier/icons/`:
`overview.png` (charter scroll), `research.png` (open book), and `production.png`
(resource crate). Each is an RGBA PNG with binary transparency and crisp edges.
These sprites are wired into all states of the corresponding sidebar tabs in
the 0.0.25 addon, replacing the earlier placeholder drawings.

Use the existing checkout; cloud tasks already have isolated environments.
Python 3.12 and Node.js 24 are available in the prepared cloud environment.
No third-party build dependencies or credentials are needed for static validation.

```sh
cd /workspace/Jagsby-sFrontier
python tools/addon.py validate
node --test tools/*.test.mjs
python tools/addon.py build
```

Build output is `dist/Jagsbys_Frontier_v0.0.42.mcaddon`. Packaging is
deterministic; the build regenerates the custom UI and controller bridge. The included native villager definitions preserve vanilla AI/trades and add
the controller bridge.
The pack targets Bedrock 1.26.40+ with `@minecraft/server` 2.9.0 and
`@minecraft/server-ui` 2.1.0.

Static checks do not execute the Minecraft APIs or render JSON UI. Import both
packs into a disposable test world on the intended Bedrock version for runtime
testing. Do not deploy this prototype to the survival Realm as a finished system.
