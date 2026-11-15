# Biome production — 0.0.44

Each eligible Overworld surface biome produces exactly one resource. The
[assignment table](../packs/behavior/scripts/biome-resources.js) contains all 52
requested names, all supported, including Dappled Forest → Poplar Logs.
Biome and item IDs were checked against Microsoft's
[`@minecraft/vanilla-data@1.26.40`](https://www.npmjs.com/package/@minecraft/vanilla-data/v/1.26.40),
matching the pack's minimum engine version. The
[versioned reference](../tools/reference/biome-production-1.26.40.json) records the
registry IDs, assignments and package integrity used by the tests.

**Dappled Forest and Poplar Logs are supported.** Version 0.0.43 incorrectly
used the older 1.26.0 registry to exclude this assignment. The corrected baseline
is Bedrock 1.26.40, whose official registry includes `minecraft:dappled_forest`
and `minecraft:poplar_log`. The pack minimum engine version now matches that
verified baseline. Poplar Logs use the Building rate and contribution category.
Cave,
Nether and End biomes are excluded. Other biome variants outside the requested
list remain unmapped. Friendly saved names are normalized to real Bedrock IDs;
for example Snowy Plains is `ice_plains`, Snowy Taiga is `cold_taiga`, Swamp is
`swampland`, and Terracotta's item ID is `hardened_clay`.

## Allocations and rates

The native biome is captured at registration and stays fixed. Existing saves
capture their recorded biome on migration; subsequent census refreshes do not
change it. Each settlement has two allocation slots. Only the native slot
produces before Resource Prospecting, and each slot represents 50% capacity.

| Category | Full rate per RP/hour | Rate per allocation | Development value/item |
|---|---:|---:|---:|
| Common | 0.35 | 0.175 | 1 |
| Building | 0.15 | 0.075 | 2 |
| Uncommon | 0.05 | 0.025 | 5 |
| Valuable | 0.01 | 0.005 | 10 |

An allocation's hourly output is its rate × recorded RP × (1 + 0.05 × Prosperity)
× (1 + 0.001 × Development points) × applicable biome bonus. Two allocations
producing the same item add their rates; the stockpile lists that item once.

Resource Prospecting still costs 64 Paper. Research unlocks selection without
automatically assigning or doubling output. In Production > Resource Prospecting, choose:

- **Native Specialization:** both slots use the native biome. Available without
  a terrain survey, including when nearby chunks are unloaded.
- **Biome Diversification:** the second slot uses a different eligible surface
  biome within 256 horizontal blocks of the charter.

The list shows projected output before selection. As of 0.0.52, selecting an
option applies it immediately and returns to the Prospecting list, with no
confirmation page. The change first accounts elapsed output, then rechecks
revision, research, radius, cached sample and actual loaded biome identity.
A changed or unloaded sample cannot be selected. Clear second disables the
second slot while retaining research and native production.

Survey is an explicit bounded lattice of at most 197 columns within 256 blocks,
using the loaded column's top block when available. It caches supported biome
IDs and sample positions. It never loads chunks or runs continuously; narrow
biomes between lattice points can be missed. Explore and reopen the charter to find additional choices. Cached current selections continue producing offline.

As of 0.0.50, the charter surveys automatically on activation. The second tab
shows a scrolling list of biome names, item icons and projected resource rates,
with no manual survey or page controls. The confirmed allocation rules above
remain unchanged.

## River and contribution categories

An active River allocation grants +10% to crop output across both slots, once.
River specialization does not stack this bonus. Wheat, Potatoes, Cocoa Beans
and Bamboo are explicitly marked crops. Carrots remain accepted crop research
contributions, although none of the requested biome assignments produces them.
Fish, mushrooms, logs, metals and stone receive no crop bonus. Common is a
production-rate category, not a synonym for crops.

River specialization or Plains + River at 10 RP, zero Prosperity and zero
Development produces 0.35 × 10 × 24 × 1.10 = **92.4 Wheat/day**. River combines
multiplicatively with Prosperity and Development. Packed Ice is Building;
Honeycomb and Iron Ingots are Uncommon; prismarine resources are Valuable.
Sanctuary accepts only explicitly allowed crops, and Prosperity accepts mapped
Building resources plus the established building-material allowlist.

## Persistence and offline accounting

The existing timestamp/event integration, shared stockpile, fractions, lifetime
production and route engine are retained. Each 500 successfully generated
category-weighted value grants one Development point to the producing settlement.
Colonization extra items remain separate and earn no Development. Full stock
blocks new output and its Development without banking rejected production.

The first update finishes saved backlog using the old placeholder resource
mapping and full rates, then sets `productionVersion: 2` at that accounted
instant. Partial event-budget catch-up retains the old production epoch until
complete. Existing resources, fractions, progress, local/global levels, roads,
unknown saved fields and valid secondary choices are retained. New output uses
the new mapping only after migration. Shared Storage retains its established
792-item level increment independently of the larger resource table.

Automated tests cover all requested rows, target-version IDs, explicit choices,
River stacking/non-crops, category values, migration, restarts, capacity and
access-frequency independence. Native rendering and multiplayer interactions
still need an in-game check on the target Bedrock build.
