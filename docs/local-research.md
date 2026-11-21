# Finalized local research — 0.0.42

Local research uses the existing five-node tree and custom charter renderer.
Hovering a technology states its literal current and next effect (Current is omitted at Lv 0) and shows its current
level, next-level cost, contributed amount, remainder, prerequisite and status.
Cards center the name above smaller Lv X text beside the icon. The hover popup is placed above or below the card, never over it, and ends with Click to contribute. Clicking the card directly
contributes eligible inventory items; no research detail/selection menu opens.
The selected hotbar slot's eligible item type is preferred, falling back to the
first eligible inventory type. One type is used per click, limited by the quote
and remaining cost. A stale quote refreshes without spending. Road connection
management is separate, under Realm > Road Networks.

| Technology | Levels | Cost per additional level |
| --- | --- | --- |
| Hearthstone | I–II | 64 bread, then 128 bread |
| Resource Prospecting | I | 64 paper |
| Sanctuary | Endless, subject to Stewardship | 250 crops |
| Prosperity | Endless, subject to Stewardship | 256 stone blocks |
| Road Networks | I–III | 32 copper, then 32 iron, then 32 gold ingots |

These replace provisional local costs. There is no increasing per-level price
for Sanctuary or Prosperity. Neither has its own finite maximum, but **Stewardship
sets their current maximum level**, as clarified by the user after the local
cost brief. A completed Stewardship level raises the available ceiling; partial
Stewardship contributions do not. No local materials can be contributed when
that local technology is already at the ceiling. Saved local progress is retained.
Limited local technologies keep their own maximum levels.

## Materials and progression

Inventory remains the payment source; shared stock is untouched. Correct fixed
IDs are `minecraft:bread`, `minecraft:paper`, `minecraft:copper_ingot`,
`minecraft:iron_ingot` and `minecraft:gold_ingot`. Each item counts as one unit.

Sanctuary derives eligibility from the existing `crop` resource mappings:
currently wheat and cocoa beans. Bread, seeds, emeralds and unrelated foods do
not count as crops. Prosperity derives eligibility from mapped `building`
resources and the established explicit global building-material allowlist
(logs/wood, stems/hyphae, stripped variants, planks, the listed stone, brick and
sandstone materials). New mapped resources with the corresponding category
are eligible without adding separate local recipes. The current biome/resource
mapping remains the existing prototype mapping; no new production outputs are
introduced by these research costs.

Different eligible item types and different players may contribute to the same
requirement over multiple transactions. Each transaction selects one item type,
clips payment to the remaining next-level cost, and unlocks exactly one level
when its requirement completes. For example, Hearthstone I at 20/64 accepts
only another 44 bread; excess bread stays in inventory. Completion resets progress
for the following level. Sanctuary and Prosperity always require 250 items.

Hearthstone, Prospecting, Sanctuary and Prosperity retain their existing
prerequisites. Road Networks requires Sanctuary I and now has three research
levels. Research does not automatically construct or upgrade connections, nor
charge its ingot recipes for individual connections. The existing game-tick
construction, travel, connection cap III, and trade Development formulas are
unchanged. Research level I continues to unlock connection management.

Prosperity accepts any mix of stone, cobblestone, deepslate, cobbled deepslate,
granite, diorite, andesite and tuff.

## Perks, production and persistence

Hearthstone I heals villagers daily. Hearthstone II adds player Regeneration I
within 80 horizontal blocks, refreshed every six seconds and retained for up to
three minutes after leaving. Prospecting adds one secondary biome. Sanctuary
reduces hostile damage and lasts up to three minutes after leaving. Prosperity
uses the additive `1 + 0.05 × level` multiplier.
Production, permanent Development and road reward formulas are unchanged.
Old effects are fully accounted through the existing offline economy before a
new completed research level takes effect. Partial local contributions confer
no partial perk and do not change production rates.

`v.localResearch` stores schema version 1, progress by internal technology key
and a settlement revision. Existing `hearth`, `biomeUnlocked`, `sanctuary`,
`efficiency` and `roads` levels remain authoritative. Migration also recognizes
`hearthstone`, `resourceProspecting`/`prospecting`, `prosperity`, `roadNetworks`
and display names in legacy research records. Paid partial progress in prior
local progress maps is retained. Legacy completed contributions carry forward,
with endless surplus held when Stewardship blocks further levels. Fixed-cap
surplus is retained rather than silently erased. Names, owners, road records,
stock, census, Development, and unknown saved fields remain intact.

Both global and local contributions use the same persisted `pendingResearch`
inventory journal. A local intent includes settlement, technology, expected
level/revision, contributor, material, amount and before/after slot counts.
The intent is saved before debit; the final save records progress/level and
clears the journal together. No await occurs during that transaction. Fresh
state, session and revision checks reject stale/simultaneous submissions before
spending resources. Other contributions wait while a journal needs recovery.
The original contributor reopens a charter to resume unambiguous interrupted
payments; changed slots or research records stop for investigation. The target
settlement record is retained if its charter is broken while its local payment
is pending, allowing replacement and recovery rather than losing that record.

The engine still cannot promise an atomic durable save across inventory and
world properties if Minecraft restores mismatched save generations after a
crash. The recovery journal handles tested API/save failures and matching slot
states; native Realm crash/restart behavior requires an actual world trial.

## Verification

```sh
python tools/addon.py validate
node --test tools/*.test.mjs
python -m unittest discover -s tools -p 'test_*.py' -v
python tools/addon.py build
```

110 Node tests and 3 Python tests pass; static validation checks 146 pack files. The map feature and its obsolete tests/assets are removed.
New coverage checks exact prices/limits, mixed categories, invalid items, partial
reloads, independent settlements, legacy aliases/surplus, two contributors, stale
revisions, clipped spending, intent/final save failures, interrupted multi-slot
payments, repeat recovery and Stewardship ceiling preservation. The existing
production, Development, road, healing and Sanctuary tests continue to pass.

In a copied Bedrock 1.26.0+ world, verify direct card contributions, a partial
bread payment across restart, two clients contributing, all three Road Networks
research levels, full/capped stock production, and preserved saved settlements.
