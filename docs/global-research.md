# Global research — 0.0.42

This release retains the local five-node tree, Sanctuary, road construction/travel
and exact offline economy. The map feature was removed in 0.0.38; Realm now
has Road Networks, My Settlements and All Settlements.
The global foundation is **Stewardship**, distinct from permanent settlement
Development. No MineScape installation is required at runtime.

As of 0.0.36, local research uses finalized costs and saved partial contributions.
See [local research](local-research.md) for the authoritative current recipes,
per-settlement progress, material categories and recovery behavior. Stewardship
sets the upgrade ceiling for every other local and global technology.

Every global/local research card shows its name and current **Lv X** without hovering; on-card descriptions are removed in 0.0.37, while hover explanations remain.
The Overview identity panel shows the current MineScape zone. A separate Development box below shows permanent points, hourly increase estimate and a named trade route; the separate Production box is reserved for later design. Stewardship is the
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
| Frontier Expansion | 0, Heartlands + Borderlands | 32 iron, 48 iron, 32 gold, 48 gold | Lower of IV and Stewardship |
| Colonization | 0 | 4, 8, 12, 16, 20 diamonds | Lower of V and Stewardship |
| Shared Storage | 0, 128 items | 512 building materials | Stewardship level |

Prerequisite decision: Colonization requires Frontier I; Shared Storage requires
Capacity I. Additional levels do not need matching levels of those prerequisites.
Stewardship also limits the fixed-length technologies; their own maxima still apply. Global costs never
use emeralds. Local prices/progress now follow [the finalized local rules](local-research.md); existing local prerequisites are retained.

Payments continue to use **player inventory**, matching existing research.
Partial contributions persist; each transaction uses one selected material and
is clipped to the remaining next-level requirement. Accepted logs include
vanilla Overworld log/wood types, stripped variants and Nether stems/hyphae.
Shared Storage additionally accepts the explicit plank, stone, brick and sandstone
allowlist in `global-research.js`. No items are withdrawn from shared stock.

The existing five 64×64 global icons, palette, tree layout and hover styling are
retained. All ten technologies use compact hover panels describing only current and next effects, showing
what changes, who benefits, current/next benefits, next cost, saved progress,
remaining amount and prerequisites. Global panels show full effects and prices
rather than an abbreviated placeholder. Cards center the larger name above smaller Lv X text beside the icon. Popups appear below top-tier cards and above other tiers, leaving the hovered card unobstructed.

Clicking a tech card contributes directly and redraws the research dashboard.
The hover prompt is Click to contribute. Native text-driven layout sizes the popup to its wrapped content, with a four-pixel anchor gap above/below the card. An eligible held item
type takes priority; otherwise the first eligible inventory type is selected.
Only that type is spent, up to its displayed-inventory snapshot amount and next-level remainder.
If progress or material selection changes, the old quote is rejected without
payment. Locked, capped and completed cards never spend items. Inventory journal
recovery is retained. Road management lives in Realm > Road Networks and never
replaces a research card's contribution action.

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
(1/2/5/10 for crop/building/uncommon/valuable). Every 100 value now grants one
permanent Development point. Colonization bonus earns none. Road Development
and its sender/receiver rules remain unchanged.

The engine stops at Development thresholds and shared capacity boundaries.
Base/bonus admission is proportional to output, so full storage cannot award
Development for blocked base resources. Fractional stock and offline catch-up
are retained. No new scans, per-tick settlement simulations or physical storage
blocks are introduced.

Shared Storage capacity is `128 + 64 × level` total items, shared across all
settlements. The initial two stacks become three stacks at level I, four at II,
and five at III. Each level still costs 512 building materials and obeys
Stewardship. The explicit `sharedStorage` configuration in `economy-config.js`
sets the base and increment independently of production rates and Realm Power.
The old reference-basket calculation is no longer used.

Existing inventory is never truncated to the new cap. Full or over-cap storage
pauses new production; collect items to free capacity. Whole stored items remain
collectible, fractions remain saved, and blocked output is not banked or credited
as Development. `baseCapacity:128` remains a separate legacy-backlog setting.

Sanctuary and Prosperity upgrades stop at Stewardship before spending materials.
Their displayed/effective levels also obey that ceiling. Existing partial or
legacy progression is retained. Permanent Development remains uncapped.
Hearthstone, Resource Prospecting, Road Networks and individual roads retain
existing fixed limits/semantics; no new local prices or road mechanics are added.

## Persistence and migration

The existing `jagsby_frontier:state_v1` world property remains the save location;
unused legacy map properties are not accessed. Before migrating, the exact prior 0.0.32 economy settles
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

Build regenerates tracked UI/bridge assets. The suite covers research, economy, geographic rules and inventory recovery. The current total is 110 Node tests, including direct card payments, fixed Production panels and map-removal checks.
Static tests cannot render JSON UI or execute Minecraft engine persistence.
In a backed-up disposable world, check all five global nodes, partial payments,
two-client stale menus, save/restart recovery, each zone boundary, full-storage
production, local caps and the Road Networks controls before Realm use.
