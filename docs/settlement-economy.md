# Settlement economy, Development and Local research — 0.0.32

This implements the readable feature requirements in the supplied implementation
brief. Its final testing section was truncated after item 8. No capital-assignment
system, guards, caravans, physical roads or military structures are introduced.
The existing settlement records, census, pack UUIDs, stockpile and charter shell
are retained. The native Bedrock behaviours below need a disposable-world trial;
offline tests do not prove engine integration.

## Configuration and save migration

`packs/behavior/scripts/economy-config.js` contains trial research prices, resource
categories, road timing, food values and food costs. They are intentionally
editable balance inputs, not finalized prices. Existing fixed research prices
seed the local costs; repeatable costs grow linearly with level. Hearthstone II
costs twice the level-I recipe. Road unlock and other new prices are provisional.

No resource IDs were added to the original six prototype biome mappings.
Classifications: wheat/cocoa are common crops; logs/stone/sand/mud are common
building materials; clay balls are uncommon. No existing item was classified as
valuable. Valuable category support is present at the requested 0.01 RP/hour and
10 Development value, but requires an actual mapped resource before it produces.
The resource table remains a prototype and does not claim MineScape integration.

Old stocks, owners, names, research levels and census values are preserved.
Migration initializes lifetime production and Development at zero and starts the
new accounting clock on first access/world load. The old placeholder-production
era is not retrospectively revalued at new rates. Existing Prosperity levels are
preserved, but now grant the specified 5%, rather than the previous 10%, per
level. Global Settlement Development research is not permanent local Development.
Existing global stockpile capacity / Shared Storage level remains authoritative.

State still uses the existing `jagsby_frontier:state_v1` world property; map data
remains separate. This preserves the existing storage architecture, including its
native per-property size limit; it is not a sharded unlimited-settlement store.

## Production and permanent Development

Per-resource real-time hourly output is exactly:

`categoryRate × recordedRP × (1 + 0.05 × Prosperity) × (1 + 0.001 × Development)`

Rates are 0.35/0.15/0.05/0.01 for crop/building/uncommon/valuable resources.
Successfully admitted output earns 1/2/5/10 lifetime Development value respectively.
Every 500 value grants one permanent point. Lifetime item totals are stored per
settlement while resources pool in the shared stockpile. Collection or spending
does not reduce Development. Fractions occupy visible shared stock capacity;
collection transfers only whole items and preserves the remaining fraction.

Primary and one unlocked secondary biome contribute a deduplicated resource
list. Selecting a secondary biome does not apply an independent production
multiplier or duplicate a shared item such as stone. New selections need a
saved survey location within the 256-block circle and a matching loaded biome
read when selected. Legacy selected biome records are retained.

Accounting is lazy: opening/accessing the charter, collection, research changes,
route changes and world load settle elapsed UTC wall-clock time. It works using
records for unloaded settlements without touching their chunks. There is no
periodic production timer or four-hour catch-up cap. A completed census settles
old production before replacing RP; census failures retain the last usable
production RP. Incomplete rank reads retain the existing minimum-estimate rule.
Biome and research changes also settle their preceding time at the old rate.

The engine integrates chronologically, stopping at any settlement's next
Development threshold or the shared capacity boundary, then recomputing rates.
Route and production gains are applied simultaneously. This prevents awarding
the final Development multiplier for an entire long interval, and prevents
frequent opens/relogs from increasing output. Competing settlements enter limited
capacity proportionally to their rates. Once full, blocked output and its
Development value are discarded, not banked for later collection. Route value
can continue while physical storage is full. A bounded 10,000-event work budget
persists partial progress rather than dropping elapsed time; further access
continues catch-up and mutations are deferred until it is complete.

The published example (10 RP, Prosperity 5, Development 100) produces 4.8125
common-crop items/hour while that Development level remains unchanged.

## Local research and settlement effects

The existing Hearthstone → Prospecting / Sanctuary → Prosperity / Roads tree is
preserved. Hearthstone I unlocks both middle branches; Prospecting is required
for Prosperity, Sanctuary I for the Road Networks unlock. Saved legacy levels
are kept even if their new prerequisite was not previously purchased.

- Hearthstone I grants Regeneration I to nearby players. II additionally heals
  vanilla villagers by 2 HP, capped at effective maximum health, once per
  Minecraft day. Boundaries reuse the existing 32-block horizontal player radius.
  Player effects refresh every four seconds. A villager query runs at most once
  per day per occupied settlement; per-villager daily markers prevent double
  healing from overlapping settlements. Unloaded/empty settlements are not
  searched. Daily healing occurs when an eligible loaded settlement is occupied.
- Resource Prospecting is capped at I and unlocks exactly one secondary biome.
- Sanctuary is repeatable. Stable `WorldBeforeEvents.entityHurt` scales hostile
  damage by `0.95^level`, without Weakness or after-damage healing. A tiny
  positive numerical retention floor prevents underflow to total immunity at
  extreme levels. Monster/hostile families and goblin type IDs are recognized;
  hostile attack, projectile, entity-explosion, magic and wither sources qualify.
  PvP and environmental causes do not. A saved player grant stores source,
  level and real-time expiry three minutes after the last refresh. Outside the
  settlement, research changes do not rewrite the stored strength. Entering a
  different protected settlement grants its currently applicable strength.
- Prosperity is repeatable, exactly +5% per level; the old global-research ceiling
  on local efficiency no longer caps it.
- Road Networks unlocks managing new connections, rather than upgrading all
  roads together. The card also allows use of completed incoming routes without
  requiring the receiving settlement to buy its own unlock.

The stable @minecraft/server 2.9.0 declarations were checked for before-hurt
mutation, health maximums, player input and input permissions. Live content-log
and gameplay verification remain necessary, especially with other combat packs.

## Roads, construction and food travel

Each same-dimension settlement pair has one canonical key. The first settlement
to create it remains `from`/sender permanently, including upgrades initiated at
the opposite endpoint. Self-connections and duplicate construction are refused.
Deleting either charter removes its orphaned roads.

Trial construction ticks are `max(1200, distance × 5) × targetLevel`. These are
in-game ticks, so shutdowns pause construction; empty-server time counts only if
the world keeps ticking. One scheduled completion callback is used per pending
road, rehydrated from persistent world ticks on world load/access. There are no
road entities, ticking areas, caravans or continuous road-simulation loop.
A late recovered completion is accounted conservatively at observation time,
not retroactively guessed from real-world shutdown duration.

Connections progress independently through Trail (I), Road (II) and Highway
(III). Construction/upgrade progress appears in the Road Networks menu. No
route Development is earned during pending construction/upgrade. An existing
completed level remains usable for travel while its next level is building.

For completed routes, daily real-world Development value is exactly:

- Sender: `10 × level × (1 + receiverDevelopment / 100)`.
- Receiver: `2 × level × (1 + senderDevelopment / 100)`.

Partner Development uses actual permanent points, not lifetime value. Fractional
route rewards enter each endpoint's same lifetime value ledger; no physical
resources are consumed or generated. Offline progression uses the same threshold
integration as production.

Trial travel cost is `ceil(distance × 0.01 × levelMultiplier)`, minimum two food
points; Trail/Road/Highway multipliers are 1 / 0.7 / 0.45. Food values are a
configurable vanilla-item whitelist using hunger points. Whole foods are spent,
not player hunger bars. The bounded inventory planner minimizes overpayment;
unavoidable surplus whole-item value is not refunded. This is item spending,
so no eating effects or empty containers are generated. Food is restored if the
teleport throws. Both directions use the same connection and cost. Players must
stand within the source settlement. Arrival is one block above the target
charter; test landing clearance in a disposable world. No persistent forced
chunk loading is created.

## UI and verification

Overview shows permanent Development, bonus and next-point progress. Production
shows cached production RP, per-resource hourly rates, bonuses, lifetime output,
shared fractional stock and road income/count. Local cards show live levels,
costs and prerequisites. Road Networks opens the themed destination/upgrade/
construction/travel picker. Realm's map rectangle opens joystick/WASD and
mouse-look navigation; Jump cycles zoom and Sneak/Back returns. Actual dragging
was deferred with the user's agreement.

53 JavaScript tests and 3 Python tests pass. Tests cover the specified production
example, fractional/restart accounting, unloaded record processing, RP boundaries,
threshold/access-frequency equivalence, full-capacity discard/resume, mapping
deduplication, migration, permanent lifetime value, repeatable prerequisites,
road direction/duplicates/levels/construction, route feedback, food values and
refunds, Sanctuary source/expiry, daily HP caps and interactive-map cleanup.
Static build validates 141 pack files; native APIs and rendering are not run.

Before use on the Realm, trial a copy of the world:

1. Import both 0.0.32 packs and verify prior names, owners, upgrades and stock.
2. Open/select the map with controller and mouse; pan/zoom/exit, reconnect and
   take damage. Confirm normal movement returns and HUD glyphs align.
3. Record stock/rates, close/restart after a measured interval and compare lazy
   production. Repeat with unloaded settlements and a full stockpile. Collection
   must not release output from the full-storage interval.
4. Buy both Hearthstone levels, damage a villager, verify a maximum-2-HP heal
   and no second heal that game day. Check maximum HP and overlapping charters.
5. Research Sanctuary, compare hostile damage inside and after leaving, then
   verify expiry, PvP and environmental exclusions.
6. Survey/choose a secondary biome; verify the primary continues and shared
   items are not duplicated. Buy Prosperity and compare exactly 5% increments.
7. Connect two charters, wait for trial game-tick construction, try both travel
   directions/foods, upgrade to III, and verify sender/receiver daily value.
   Restart during construction and verify no duplicate/relog rewards.
8. Check live text wrapping, destination landing, persistence, content logs and
   opening latency with the other Realm packs before publishing to players.
