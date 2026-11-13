# Village census (0.0.12)

Charter interaction queries loaded vanilla villagers once in a 64-block sphere,
in the charter's dimension. Placement, menu navigation, Rename and busy-menu
retries do not rerun that query. Counts are saved with the settlement.

## Native trade-level bridge

The original query inside set_property was rejected by the 0.0.9 live log. A
separate probe moved the query into behavior animation-controller transitions
and used literal-valued entity events to export the result. The later probe log
has no errors and reports raw tier 1; the user identified that villager as an
Apprentice and confirmed the probe was working. Mojang's client villager
rendering maps query.trade_tier directly onto the five ordered badge textures.

0.0.12 integrates that controller context. Charter interaction requests sampling
for the observed villagers, waits one batch of 10 ticks, reads ready/raw_rank
properties, and saves the resulting census. Concurrent menu openings share
in-flight reads of the same entity. A new later interaction samples fresh values.
Native unemployed/nitwit professions (variant 0 and 14) are unranked and get the
base contribution without a trade query. Profession is not used to infer an
employed villager's trade level.

The controller's idle state checks only its request property. Rank queries occur
only in the requested state. There is no background villager census. Incomplete,
missing or invalid reads remain unknown instead of being called novice. The
separate probe pack must be disabled: it also overrides vanilla villagers and
would replace the production bridge if it wins the pack stack.

The intended score table remains:

| Trading level | Power |
| --- | --- |
| Unranked / Novice | 0.2 |
| Apprentice | 0.4 |
| Journeyman | 0.6 |
| Expert | 0.8 |
| Master | 1.0 |

With unknown ranks, each unknown villager contributes 0.2 to a **minimum
estimate**, and power/tier use a ≥ prefix. Successful rank readings use the table
above. Exact power can increase on the next charter interaction after trading up
villagers. An empty successful census is exactly zero; query failures are unknown.

## Persistence and boundaries

Observations use dimension-qualified settlement IDs, and matching legacy records
migrate on interaction. Re-read current world state before storing a completed
observation so another player's research or collection is not overwritten.
Tier selection derives from saved power with the user-approved provisional
thresholds 2, 5, 10 and 20. It can change on the next charter interaction. Counts
are local to each settlement; overlapping charter ranges cannot be summed into
a realm total without deduplication.

## Biome

The current stable server API target supports Dimension.getBiome. Placement and
interaction read the primary biome, retaining an existing known biome on a failed
query. The separate production-page 256-block circular survey remains an explicit
user action in the charter dimension.

## Verification

27 Node and 3 Python tests exercise scoring, promotions/demotions, controller
structure, literal-only property events, unranked villagers, batching, shared
reads, snapshots and the UI data/layout. The supplied probe log and user's
Apprentice confirmation provide live evidence for the controller query context.
The integrated build, full rank range and visual changes still need in-game
verification; offline tests do not execute Minecraft Molang.
