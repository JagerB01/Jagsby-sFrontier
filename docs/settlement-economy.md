> 0.0.104 limits outgoing trade to one selected connection per departure
> settlement. This supersedes the older multiple-route summary and permanent
> sender description. See the updated roads section below.

> 0.0.54 reduces the Development threshold to **100 value per point** and expands
> the loaded-villager census to an **80-block radius**. Existing earned value is
> retained. Pre-update offline intervals settle at the former 500-value threshold
> before switching; interrupted catch-up retains that threshold until complete.
> Development/Hr divides current earned value/hour by 100 after migration.

> 0.0.43 supersedes the placeholder mappings and full-per-biome rates below with
> the [finalized biome production rules](biome-production.md): one resource per
> biome, 50% allocations, specialization/diversification and River crop bonuses.
> The timestamp-based Development, shared-storage and road integration remains.

> 0.0.39 adds the [fixed Production panels](production-ui.md): Overview,
> Resources, inline secondary Biomes and shared Stockpile with paged lists.
> Development/Hr is right-aligned and compact. Tech hover descriptions cover only
> current/next effects; Hearthstone Regeneration I persists for three minutes.
> Economy rates and Development formulas are unchanged.

> 0.0.37 Overview: a separate Development panel shows permanent points, a
> snapshot estimate in **points per real-world hour**, and a named connected
> route. The estimate converts current base-production category value plus
> current route income using the existing 500-value-per-point threshold.
> Colonization bonus items earn no Development. At full storage, the production
> portion is zero while active route income continues. This is an estimate at
> current rates, not a forecast of later Development thresholds or storage fill.
> Active routes are shown before routes under construction, then sorted by
> destination ID; +N indicates additional connections. Long names are shortened.
> A separate Production panel is a titled placeholder pending its design.

> Local costs and progression are superseded by the finalized
> [0.0.36 local research rules](local-research.md): partial contributions,
> fixed per-level recipes, Road Networks research I–III, and Stewardship caps.
> Production, Development, perks and individual road mechanics below are retained.

> For 0.0.33, see [global research](global-research.md): Stewardship now caps
> Sanctuary/Prosperity; Colonization adds zone output without Development credit;
> Shared Storage uses a fixed linear item capacity. The document below describes
> the 0.0.32 baseline and its retained local/road mechanics.

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

State still uses the existing `jagsby_frontier:state_v1` world property. This preserves the existing storage architecture, including its
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

- Hearthstone I heals vanilla villagers by 2 HP, capped at effective maximum
  health, once per Minecraft day. II adds Regeneration I for players.
  Player effects refresh every six seconds within an 80-block horizontal radius. A villager query runs at most once
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
- Prosperity is repeatable, exactly +5% per level, with Stewardship setting its
  upgrade ceiling just as it does for every other technology.
- Road Networks unlocks managing new connections, rather than upgrading all
  roads together. The card also allows use of completed incoming routes without
  requiring the receiving settlement to buy its own unlock.

The stable @minecraft/server 2.9.0 declarations were checked for before-hurt
mutation, health maximums, player input and input permissions. Live content-log
and gameplay verification remain necessary, especially with other combat packs.

## Roads, construction and food travel

Each same-dimension settlement pair has one shared road. Its stored `from`/`to`
endpoints preserve the original road identity, while `tradeRoutes[departureId]`
selects at most one outgoing road per settlement. Either endpoint can select a
completed connection; sender/receiver rewards follow that selection. Incoming
routes are unrestricted, and each other departure has its own selection. Roads
not selected for trade remain available for food travel. Self-connections and
duplicate construction are refused. Deleting either charter removes its roads.

Starting or selecting a different route pauses the previous construction owned
by that departure, saving exact remaining ticks. Selecting it again resumes
that stage without restarting. Stopping outgoing trade also pauses construction.
A shared unfinished stage retains its construction owner; the opposite endpoint
cannot take it over. A paused upgrade keeps its completed tier for travel.
Road management offers Send trade route, Stop sending and Resume construction.

On first upgrade, old offline earnings settle under the prior multi-route rules.
Migration preserves all roads and progress, selecting the oldest unfinished road
per original departure (stable road ID breaks ties), or the first completed road
by start tick then ID if no construction exists. Other unfinished roads pause.
The selected map, schema version, construction owner and remaining ticks persist
in the existing world dynamic-property state.

Every construction stage takes six Minecraft days (`144000` ticks), independent
of distance and target level. Pending trial timers migrate from their original
start; completed roads are preserved. These are
in-game ticks, so shutdowns pause construction; empty-server time counts only if
the world keeps ticking. One scheduled completion callback is used per active construction
road (paused roads have none), rehydrated from persistent world ticks on world load/access. There are no
road entities, ticking areas, caravans or continuous road-simulation loop.
A late recovered completion is accounted conservatively at observation time,
not retroactively guessed from real-world shutdown duration.

Connections progress independently through Trail (I), Road (II) and Highway
(III). Construction/upgrade progress appears in the Road Networks menu. No
route Development is earned during pending construction/upgrade. Travel is
blocked until a first road is completed. During an upgrade, the completed tier
remains usable at its existing price. The upgraded discount applies only after
completion and remains capped by departure-village research.

For each selected completed route, daily real-world Development value is exactly:

- Sender: `10 × level × (1 + receiverDevelopment / 100)`.
- Receiver: `2 × level × (1 + senderDevelopment / 100)`.

Partner Development uses actual permanent points, not lifetime value. Fractional
route rewards enter each endpoint's same lifetime value ledger; no physical
resources are consumed or generated. Offline progression uses the same threshold
integration as production.

Travel requires Road Networks I in the departure village. The effective level
is the lower of its local Road Networks research and the completed connection
tier. Internal cost is `ceil(distance × 0.02 × levelMultiplier)`, minimum two
points; Trail/Road/Highway multipliers are 1 / 0.7 / 0.45. Display costs in
corndogs by dividing those points by two. The food whitelist uses these same
half-corndog units: bread is five points, or 2.5 corndogs. Whole foods are spent,
not player hunger bars. The bounded inventory planner minimizes overpayment;
unavoidable surplus whole-item value is not refunded. This is item spending,
so no eating effects or empty containers are generated. Food is restored if the
teleport throws. Both directions use the same connection but can have different
costs because their departure villages have different research levels. Players must
stand within the source settlement. Arrival is one block above the target
charter; test landing clearance in a disposable world. No persistent forced
chunk loading is created.

## UI and verification — current 0.0.38 behavior

The Overview retains the portrait. Its owner appears beside the settlement name,
and separate Development and Production boxes sit side by side beneath the main
details. Development shows permanent points, a snapshot estimate of points per
real-world hour and a named connection. Numerical fields use direct native
form-text binding, as used by the Realm Power readout, rather than string
subtraction. Native rendering of those fields still needs an in-game check.
The Production Overview box remains a titled placeholder pending its design;
the existing Production page and economy calculations remain functional.

Research cards show name and Lv X. Hover panels explain each local/global
technology and show its benefit, price, progress, remainder and prerequisites.
Clicking contributes the quoted eligible inventory type directly. Road Networks
research contributes ingots like the other cards; it does not open management.

Realm > Road Networks replaces Map. It shows four connections per page, their
Trail/Road/Highway grade, construction percentage or travel food cost, with
Previous/Next and Manage / travel controls. Management handles construction,
upgrades and travel in the existing themed picker. My Settlements and All
Settlements remain. The map scripts, HUD, glyphs, textures, discovery timer,
input/navigation callbacks and build tooling are removed. Existing saved map
properties are not read or rewritten. A one-time compatibility helper restores
only movement permissions recorded by an older map session.

96 Node tests and 3 Python tests pass. Map-only tests were removed with that
feature; replacement coverage checks Road Networks pages, no map UI, legacy
movement restoration, all ten populated hover panels and direct contributions
without research submenus. Existing economy/perk/road tests still pass.
Static validation checks 132 pack files. Before Realm use, test a copied world:

1. Confirm side-by-side boxes, owner placement and visible numeric Development.
2. Read each global/local hover explanation and verify a card click contributes
   the quoted amount without opening a separate research menu.
3. Verify partial progress, Stewardship ceilings, stale two-player clicks and
   interrupted payment recovery across restart.
4. Open Realm > Road Networks, page connections, construct/upgrade and travel;
   verify food spending and retained road Development.
5. Check health protection/healing, full-storage/offline production and content
   logs. A prior map session must not leave movement/jump disabled after reload.
