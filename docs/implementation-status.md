# Implementation status

The supplied project brief is the implementation request. Source imported from
the supplied v0.1 mcaddon is the starting point. Its art is retained. The current
changes add an interaction-only 64-block villager census and dimension-qualified
settlement IDs. No MineScape or Diplomacy code was supplied.

## Required integration inputs

1. MineScape source containing the exact six-zone coordinate calculation.
2. Finalized biome-to-resource eligibility table, including exclusions and prior
   production balance decisions. The prototype table is explicitly sample data.
3. Diplomacy settlement registration, annexation, removal, identity, ownership,
   boundaries/radius and persistence interfaces, plus any existing saved-data format.
4. MineScape resource-pack UI definitions and approved four-page visual references,
   to assess shared `server_form` compatibility before changing that override.

The archive contains exported geometry, textures and 64x64 pack icons. It does
not include the editable Blockbench `.bbmodel` or the separate concept images.
The exported assets are retained; a model redesign is unnecessary.

## Confirmed gaps in the imported prototype

| Area | Existing behavior / required correction |
| --- | --- |
| Settlement identity | Now dimension-qualified; matching legacy records migrate on interaction. |
| Registration | No zone or capacity enforcement; block interaction can create a new record. Diplomacy integration is absent. |
| Lifecycle | Breaking deletes local research; replacement creates fresh state. Placement/removal must follow the existing settlement lifecycle. |
| Zones | Placeholder string; no actual MineScape calculation. Frontier research is disabled. |
| Capacity | Research is disabled; no enforced settlement limit. |
| Production | Sample table generates all eligible resources independently; adding a second biome increases the total budget. |
| Timing | Shared wall-clock timestamp grants downtime catch-up, discards interval remainder, and does not track per-settlement progress. |
| Efficiency | Flooring at each cycle can erase modest bonuses. Highest prototype tier is IV rather than configurable progression. |
| Surveys | Queries the interacting player's dimension rather than the stored settlement dimension; partial surveys replace previous results without completeness metadata. |
| Research | Hard-coded provisional costs; details and affordability are not displayed before purchase. |
| Collection | Uses returned inventory remainder, but no multiplayer/reload runtime validation has been performed. |
| Hearthstone | Fixed 32-block radius rather than Diplomacy boundaries; Regeneration I is the only applied effect. |
| UI | ActionFormData drives a themed server-form override, not the final approved four-tab interface. It changes shared `server_form` definitions. Rename is a placeholder. |
| Persistence | One unversioned JSON payload behind a versioned key; parse failures silently fall back to fresh state. No migration or recovery policy. |

## Validation performed

The local tool checks JSON parsing, JavaScript syntax, UUID uniqueness, pack
dependency linkage, script entry points, 64x64 icons, and block geometry/texture
references. It can build a deterministic mcaddon with the same source contents.
Six Node tests also check power arithmetic, a single 64-block query, entity
filtering/deduplication, unknown-rank handling, interaction-only scheduling,
dimension isolation and saved observations. The engine-facing behavior is mocked.
These checks do not establish Minecraft engine compatibility or playable behavior.

## Runtime acceptance checks still required

- Zone boundary cases using the actual MineScape rules, locked-zone rejection,
  capacity rejection, existing-settlement preservation, and unrestricted travel.
- Dimension-separated identities; duplicate events; break/replace/move behavior;
  restart persistence and existing Diplomacy settlement migration.
- Simultaneous research and collection from two clients; insufficient payment,
  full and partially full inventory, and stale menu actions.
- Production while chunks are unloaded, fractional efficiency, shared-capacity
  saturation, second-biome budget conservation, and restart timing behavior.
- Partial biome surveys, actual circular 256-block range, saved selections, and
  only one selected secondary biome.
- Hearthstone boundary eligibility and brief expiration; JSON UI coexistence with
  MineScape and rendering/input on intended client devices.

No goblin, invasion, military, world-threat, parallel resource-site or arbitrary
item-deposit systems belong in this phase.
