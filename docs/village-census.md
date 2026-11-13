# Village census (0.0.4)

Interact with the charter to query loaded vanilla villagers in a **64-block
sphere**, in the charter's dimension. The before-interaction handler cancels
default item use and schedules the survey safely. Holding interact does not
repeat it. No villager census runs on placement, an interval, local tab changes,
or a menu-busy retry.

## Normal trade-level bridge

On interaction, the script queries villagers once and triggers
`jagsby_frontier:sample_trade_tier` on each. The entity event evaluates native
Molang `query.trade_tier` and writes `jagsby_frontier:trade_tier`, a script-readable
entity property. After two ticks to allow the native update, the script reads
those properties and scores the same observed entities. A later interaction
resamples them, so trade upgrades can change the next snapshot.

| Native tier | Trading level | Power |
| --- | --- | --- |
| 0 | Unranked / Novice | 0.2 |
| 1 | Apprentice | 0.4 |
| 2 | Journeyman | 0.6 |
| 3 | Expert | 0.8 |
| 4 | Master | 1.0 |

The bridge overrides the two vanilla villager entity definitions using pinned
Mojang samples, adding only a namespaced property and event. Vanilla AI and
trades are retained. It does not use a continuous animation controller, polling,
profession guesses, XP estimates, manual rank tags or commands requiring cheats.
Another addon overriding these same entities must incorporate the property/event
or it can replace this bridge. MineScape 1.5.119 contains no competing villager
entity definition.

Unavailable rank data stays unknown and produces a clearly labeled minimum
estimate rather than an exact score. Deduplicate by entity ID and sum integer
tenths. Wandering traders and zombie villagers do not contribute. This is a
**settlement observation**, not a whole-world total: overlapping charter ranges
must not be summed without realm-wide deduplication.

## Persistence and concurrency

Store count, tier counts, observation time and power with the settlement. The
menu reads this saved snapshot until the next charter interaction. After the
native-property wait, re-read world state before saving the census so concurrent
research and collection are preserved. Removed settlement records are not
recreated by an in-flight survey. Dimension-qualified IDs prevent cross-dimension
coordinate collisions; matching legacy records migrate on interaction.

## Biome

The update targets stable server API 2.9.0 and Bedrock 1.26.0+, matching the
supplied MineScape target. `Dimension.getBiome` is available at this API version.
Placement reads the primary biome; charter interaction refreshes it. A failed
lookup retains an existing known biome. The separate production-page biome
survey is also an explicit user action, uses the charter dimension, respects the
256-block circle and retains earlier observations from partial loaded surveys.

## Validation

Run `node --test tools/*.test.mjs` and `python tools/addon.py build`.
Tests simulate property commits, trade upgrades, unknown ranks, local tab routing,
entity filtering, dimension isolation and saved observations. They preserve the
vanilla entity data outside the bridge additions. These tests **do not execute
Minecraft Molang or render the client**. In a test world, compare novice and
master villagers, upgrade an existing villager, interact again, reopen after a
restart and verify the count/score and content log.
