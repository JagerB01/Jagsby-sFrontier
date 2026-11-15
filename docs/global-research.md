# Global research: Innovation

The foundation formerly called Settlement Development is now **Innovation**.
It is separate from each settlement's uncapped lifetime Development points.

The custom charter tree has Innovation above Frontier Expansion / Settlement
Capacity, with Colonization below Frontier and Shared Storage below Capacity.
The existing five 64×64 sprites are reused. Select a node for current level,
next cost, progress, prerequisite, benefit, and inventory contribution buttons.
Each contribution selects one material, is clipped to the next complete level,
and persists partial progress. Payment continues to use the player's inventory;
produced stockpile resources are never withdrawn for global research.

| Technology | Default | Cost per additional level | Limit |
| --- | --- | --- | --- |
| Innovation | I, free | 192 copper ingots | Endless |
| Settlement Capacity | 0; two settlement slots | 64 vanilla logs | Innovation |
| Frontier Expansion | 0; Heartlands and Borderlands | 32 iron, 48 iron, 32 gold, 48 gold | IV |
| Colonization | 0 | 4, 8, 12, 16, 20 diamonds | V |
| Shared Storage | 0; 792 items | 512 building materials | Innovation |

Prerequisite decision: Colonization requires Frontier I and Shared Storage
requires Capacity I. Their own subsequent levels do not require matching
Frontier/Capacity levels. Limited research is independent of the Innovation cap.
Research never creates settlements or changes player travel.

## Production and storage decisions

Base production uses the category rates in `global-research.js`, cached Realm
Power, +5% per Prosperity level and +0.1% per lifetime Development point.
Colonization adds only the bonus for the settlement's own unlocked zone.
Fractional normal and bonus output persist separately. Only whole normal items
actually deposited into the stockpile earn Development (one point per item).
Bonus items never earn Development. Overflow is discarded; fractional precision
is retained. No census is triggered by production or research menus.

Elapsed production is settled before research, census/biome changes, founding,
removal, collection and secondary-biome changes. Subsequent output uses the
new effects. Offline catch-up uses elapsed hours without scanning unloaded
chunks. The cached census is the last interaction's observation, not a simulated
population census. Development's multiplier is sampled at each settlement pass;
newly earned points apply to later passes, as in the existing batched economy.

The configurable reference basket is one of each distinct item currently in the
implemented biome mapping: wheat, stone, oak log, spruce log, mud, clay ball,
sand, cocoa beans, jungle log. Its total base rate is 1.65 items/RP/hour.
`1.65 × 10 × 48 = 792` items per storage increment, so capacity is
`792 × (1 + Shared Storage level)`. Duplicate stone mappings are counted once.
Actual settlements, power and modifiers cannot change this fixed capacity.
The prototype biome eligibility mapping remains sample data.

Vanilla Overworld log/wood variants, stripped variants and Nether stems/hyphae
are accepted as logs. Building materials additionally include the explicit plank,
stone, brick and sandstone allowlist in `global-research.js`; no arbitrary items
are accepted. Existing local inventory prices are retained. Prosperity reuses
the existing `efficiency` save field, becomes endless under Innovation, and
repeats the last configured prototype price after its original four levels.
No additional local prerequisite or payment systems are invented.

## Save migration and payment recovery

The existing `jagsby_frontier:state_v1` property remains the save location.
Research schema 2 preserves villages, owner records, stock, local progression,
existing global levels and unknown fields. The old global definition is copied
to `researchLegacy`. Old zero-based global `development` maps to Innovation
`development + 1`; Innovation is raised further when necessary to preserve
existing Capacity, Storage, Prosperity or Sanctuary levels. Existing stock above
the new capacity is retained; production pauses until room exists.
Migration begins a new production epoch at upgrade time; it does not recalculate
the unsettled legacy interval under the replacement economy. Back up a world
and collect pending legacy output before upgrading. Invalid JSON and future save
schemas fail rather than silently resetting settlements.

A single persisted global payment intent records contributor, material, research
and inventory slots before items are changed. Completion updates level/progress
and clears the intent in the same world-property write. Reopening the original
contributor's charter resumes an interrupted payment when its slots still match
the expected before/after amounts. Ambiguous inventory changes stop recovery
for manual investigation, and block further global payments. Menu session and
revision checks reject stale purchases. Tests cover interrupted slot writes,
failed intent/final saves, restart serialization and repeated recovery.

Bedrock does not expose an atomic durable transaction between player inventory
and world properties. The journal handles observed API failures and recoverable
slot states; it cannot guarantee atomicity if an engine crash restores inventory
and world data from different save generations. Cross-generation crash behavior
requires actual Realm restart testing. No claim of unconditional crash safety is
made. Do not clear a pending intent without checking the contributor's inventory.

## Pending integration

- The user will provide the authoritative MineScape zone implementation later.
  `zoneAt` intentionally returns unknown. Existing settlements remain usable,
  new founding is refused, and Colonization applies no geographic bonus until
  that adapter is supplied. No distance thresholds have been invented.
- The repository has no Sanctuary research implementation, continuous local
  contribution system, Road Networks or the requested five-node local tree.
  `localLevel` supports capping stored Sanctuary and Prosperity levels, but
  Sanctuary purchase/effects cannot be integrated into absent mechanics.
  Existing Hearthstone and Biome Utilization remain unchanged.
- Minecraft JSON UI rendering, live inventory behavior and multiplayer/restart
  behavior require disposable-world testing on Bedrock 1.26.0+.

## Verification

Run from `/workspace/Jagsby-sFrontier`:

```sh
python tools/addon.py validate
node --test tools/*.test.mjs
python -m unittest discover -s tools -p 'test_*.py' -v
python tools/addon.py build
```

The build regenerates tracked UI and bridge assets. Expected baseline is 49
passing Node tests and 3 Python tests. Node integration fixtures explicitly supply
a Heartlands zone for census tests; pure zone-rule tests cover all six named
zones, and production's missing adapter is not represented as verified.
