# Jagsby's Frontier

Minecraft Bedrock village and civilization addon, based on the imported v0.1
prototype. **This is not a completed implementation of the specification**.

## Download

[Download the current prototype addon](downloads/Jagsbys_Frontier_v0.0.53.mcaddon?raw=true)

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
