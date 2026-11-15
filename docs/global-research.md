# Global research — 0.0.34

This release extends **0.0.32**, retaining its interactive Realm map, local
five-node tree, Sanctuary, road construction/travel and exact offline economy.
The global foundation is **Stewardship**, distinct from permanent settlement
Development. No MineScape installation is required at runtime.

Every global/local research card shows its current level without hovering.
The Overview identity panel includes permanent Development, its production
bonus, next-point progress and the current MineScape zone. Stewardship is the
top global technology; Settlement Charters is the middle-right technology.
The existing internal save key for the foundation is retained for compatibility.

## Tree and prices

```text
                       Stewardship
                      /          \
          Frontier Expansion    Settlement Charters
                  |                    |
             Colonization         Shared Storage
```

| Technology | Starting level | Next-level cost | Limit |
| --- | --- | --- | --- |
| Stewardship | I, free | 192 copper ingots | Endless |
| Settlement Charters | 0, two settlement slots | 64 logs | Stewardship level |
| Frontier Expansion | 0, Heartlands + Borderlands | 32 iron, 48 iron, 32 gold, 48 gold | IV |
| Colonization | 0 | 4, 8, 12, 16, 20 diamonds | V |
| Shared Storage | 0, 792 items | 512 building materials | Stewardship level |

Prerequisite decision: Colonization requires Frontier I; Shared Storage requires
Capacity I. Additional levels do not need matching levels of those prerequisites.
Stewardship does not limit the two fixed-length technologies. Global costs never
use emeralds. Local prices and local prerequisites retain their 0.0.32 rules.

Payments continue to use **player inventory**, matching existing research.
Partial contributions persist; each transaction uses one selected material and
is clipped to the remaining next-level requirement. Accepted logs include
vanilla Overworld log/wood types, stripped variants and Nether stems/hyphae.
Shared Storage additionally accepts the explicit plank, stone, brick and sandstone
allowlist in `global-research.js`. No items are withdrawn from shared stock.

The existing five 64×64 global icons, palette, tree layout and hover tooltips are
retained. Selecting a node opens the custom charter details/picker with levels,
cost, accepted category, progress, prerequisites and upgrade benefits. It uses
Frontier's own JSON UI renderer. Colony bonuses are listed by zone; Storage
shows actual item usage/capacity and the next increment; Capacity shows settlement
count/limit. Global records are appended without moving map/local record indices.

## Authoritative MineScape zones

Source: the uploaded **MineScape_v1.5.119.mcaddon**, behavior pack
`BP/scripts/slayer_hunt_data.js`, constants `DISTANCE_STEP = 400`,
`ZONE_LEVELS = [0, 6, 15, 28, 46, 70]`, function `zoneIndex`.
`BP/scripts/reliquary_information.js` independently lists the same ranges.

```js
const level = Math.floor(Math.max(Math.abs(location.x), Math.abs(location.z)) / 400);
let index = 0;
for (let i = 1; i < ZONE_LEVELS.length; i++)
  if (level >= ZONE_LEVELS[i]) index = i;
```

| Zone | `max(abs(x), abs(z))` |
| --- | --- |
| Heartlands | Below 2,400 |
| Borderlands | 2,400 to below 6,000 |
| Wildlands | 6,000 to below 11,200 |
| Dreadlands | 11,200 to below 18,400 |
| Blightlands | 18,400 to below 28,000 |
| Blackreach | 28,000 and above |

These are **square rings around (0, 0)**, with signed coordinates treated
symmetrically and height ignored. The function has no dimension argument or
Nether scaling; Frontier uses the same rule separately in each dimension.
The calculation is reproduced in one pure module rather than importing another
pack's scripts. Boundary tests cover both signed axes, fractional coordinates
and diagonals. Invalid/missing coordinates cannot authorize new founding.

Founding checks both zone unlock and `2 + Capacity level`. New research never
creates settlements and never restricts player travel. Existing settlements,
including ones outside current research unlocks or above capacity, are retained
and continue to open; restrictions apply only to new registration. As in the
existing addon, placing a denied charter leaves an unregistered block that may
be interacted with again after the relevant research is complete.

## Production, storage and local caps

For the settlement's own geographic zone, Colonization levels I–V unlock
Borderlands +10%, Wildlands +20%, Dreadlands +30%, Blightlands +40%, Blackreach
+50%. Earlier bonuses remain unlocked; Heartlands always receives zero.
Colonization neither unlocks zones nor changes RP/settlement tiers.

The 0.0.32 production engine remains authoritative:

`category rate × cached RP × (1 + 0.05 × Prosperity) × (1 + 0.001 × Development)`

Final output multiplies this by `1 + unlocked zone bonus`. Base and bonus output
are tracked separately in `lifetimeBaseProduced` / `lifetimeBonusProduced`;
`lifetimeProduced` remains total output. Only the base output actually admitted
into the shared stockpile earns existing category-weighted Development value
(1/2/5/10 for crop/building/uncommon/valuable). Every 500 value still grants one
permanent Development point. Colonization bonus earns none. Road Development
and its sender/receiver rules remain unchanged.

The engine stops at Development thresholds and shared capacity boundaries.
Base/bonus admission is proportional to output, so full storage cannot award
Development for blocked base resources. Fractional stock and offline catch-up
are retained. No new scans, per-tick settlement simulations or physical storage
blocks are introduced.

Shared Storage capacity is `792 × (1 + level)` actual items. Its configurable,
explicit nine-item reference basket in `economy-config.js` uses each distinct
original mapped resource once (duplicates such as stone across biomes do not
increase its weight). Base rates sum to 1.65 items/RP/hour:
`1.65 × 10 RP × 48 hours = 792`. The basket/rates exclude Prosperity, Development,
Colonization and all actual civilization/settlement RP. Only a completed storage
level changes capacity. `baseCapacity:128` is retained solely for old-save backlog
migration, not as the new storage formula.

Sanctuary and Prosperity upgrades stop at Stewardship before spending materials.
Their displayed/effective levels also obey that ceiling. Existing partial or
legacy progression is retained. Permanent Development remains uncapped.
Hearthstone, Resource Prospecting, Road Networks and individual roads retain
existing fixed limits/semantics; no new local prices or road mechanics are added.

## Persistence and migration

The existing `jagsby_frontier:state_v1` world property remains the save location;
map storage is untouched. Before migrating, the exact prior 0.0.32 economy settles
its outstanding backlog at old capacity/rates with no new Colonization bonuses.
If the work budget is exceeded, partial accounting is saved and further access
continues it. Only after completion does research schema 3 activate. Subsequent
research changes likewise settle old effects before applying new levels.

Village identities, names, owners, census, local levels, permanent Development,
stock and road records are retained. Unknown fields remain intact. Prior global
fields are retained and archived in `researchLegacy`. Old zero-based global
`development` maps to Stewardship `development + 1`; Stewardship is raised further
as needed to preserve existing Capacity/Storage/Sanctuary/Prosperity levels.
Existing stock above recalculated capacity is retained; further physical
production waits for room. Corrupt JSON or newer schemas fail instead of silently
replacing the world with empty data.

A persisted single global payment journal records contributor, material,
amount and before/after inventory slots before item removal. Completion updates
progress/level and clears the journal in one world-property write. Reopening the
original contributor's charter resumes unambiguous interrupted slot changes.
Changed/ambiguous slots stop for investigation; pending journals block further
global contributions. Session and research revision checks reject stale menus.

Bedrock exposes no atomic durable transaction spanning inventory and world
properties. Tests cover API failures, partial debits, failed saves and repeat
recovery, but an engine crash restoring mismatched inventory/world save
generations still needs actual Realm testing; unconditional crash atomicity is
not claimed. Preserve the contributor's inventory when recovering a journal.

## Validation

From `/workspace/Jagsby-sFrontier`:

```sh
python tools/addon.py validate
node --test tools/*.test.mjs
python -m unittest discover -s tools -p 'test_*.py' -v
python tools/addon.py build
```

Build regenerates tracked UI/bridge assets. The original 53 tests remain, with
23 additional research, economy, geographic and inventory recovery tests.
Static tests cannot render JSON UI or execute Minecraft engine persistence.
In a backed-up disposable world, check all five global nodes, partial payments,
two-client stale menus, save/restart recovery, each zone boundary, full-storage
production, local caps and the retained map/road controls before Realm use.
