# Village census (0.0.10)

Charter interaction queries loaded vanilla villagers once in a 64-block sphere,
in the charter's dimension. Placement, menu navigation, Rename and busy-menu
retries do not rerun that query. Counts are saved with the settlement.

## Native trade-level reading is unresolved

The user's 0.0.9 content log explicitly rejects `query.trade_tier` in the
`jagsby_frontier:sample_trade_tier` entity set_property event. The event bridge
introduced in 0.0.4 therefore did not establish a supported native rank source.
The stable Script API declarations inspected through 2.11.0 expose no native
trade-tier component/accessor. A query being documented for Molang does not
establish support in a particular server context.

0.0.10 removes the invalid event, generated vanilla villager overrides and bridge
builder. It neither triggers that event nor trusts its cached entity property.
The adapter returns unknown ranks. No trade XP guess, manual rank or false novice
classification is substituted. Exact vanilla trade-level integration still needs
a supported engine source and in-game validation.

The intended score table remains:

| Trading level | Power |
| --- | --- |
| Unranked / Novice | 0.2 |
| Apprentice | 0.4 |
| Journeyman | 0.6 |
| Expert | 0.8 |
| Master | 1.0 |

With unknown ranks, each loaded villager contributes 0.2 to a **minimum estimate**.
UI power and tier show a ≥ prefix. Trading up a villager will not change this
minimum estimate; it is not a completed native rank score. An empty successful
census is exactly zero. Survey errors remain unavailable, not a zero population.

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

Automated tests cover entity filtering, minimum estimates, persistence, absence
of the rejected event/overrides, UI collection scopes, layout and asset resolution.
They do not run Minecraft's UI parser or native entity engine. The uploaded live
content log supplied the evidence of the actual failures; the replacement build
still needs an in-game check and fresh content log.
