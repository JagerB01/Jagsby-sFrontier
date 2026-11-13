# Village census

## Confirmed behavior

- Use a 64-block range and normal vanilla trading level, as requested.
- Handle the before-interaction event so the charter need not complete a vanilla
  block interaction. Cancel default item use and defer world changes/menu display.
- Run a census only on the first event of a charter interaction. Holding interact
  and duplicate events in the same pending player interaction do not repeat it.
- Placement does not scan villagers. No interval scans villagers. Tab navigation
  reads the persisted observation rather than performing a new census.
- Use the charter's saved dimension and position, not the player's location.
- Query loaded entities in a 64-block sphere. Count vanilla villagers only, not
  wandering traders or zombie villagers. The count is an observation of nearby
  loaded villagers, not a complete count of unloaded entities or a realm census.
- Store observation time, population, rank counts and power with the settlement.
  Refresh at the next interaction; do not treat a stored count as live data.
- Include the dimension in settlement keys; migrate a legacy coordinate-only
  record when its stored dimension matches the interacted charter.

## Rank scoring and the remaining integration

Provisional mapping: novice/unranked 0.2, apprentice 0.4, journeyman 0.6,
expert 0.8, master 1.0. Internal native trade tiers are 0 through 4.
Use integer tenths so adding many contributions avoids floating-point drift.

The scoring function supports a live `readTradeTier(entity)` adapter. It is not
connected to an automatic trading-level source yet: the pinned stable
`@minecraft/server` 2.0.0 declarations expose neither a trade-tier component nor
a trade-tier accessor. Villager profession/variant is not its trading level.
Do not infer rank from profession, biome appearance, or equipment.

Consequently, actual pack execution currently shows a **minimum power estimate**
at 0.2 per unknown-rank villager, labeled as such. It does not claim to detect
masters or display an exact power total. A future compatible villager entity
integration must supply current trading tiers to `takeCensus`. No vanilla entity
override or rank polling has been introduced to work around this limitation.
The figure is per settlement; overlapping surveys must not be summed into a
realm-wide total because the same villager may be near more than one charter.

## Biome compatibility limitation

The prototype called `Dimension.getBiome`, but that method is absent from its
pinned server API 2.0.0 (also absent from 2.1.0 and 2.2.0). It is available in
2.3.0. On an API supporting it, placement reads the primary biome and interaction
refreshes it before opening the menu. Failed queries retain an existing known
biome rather than replacing it with `unknown`.

The API pin and engine minimum have not been silently raised: selecting a newer
supported Minecraft target is needed to enable that API. Until then, an unknown
biome remains unknown. Static tests mock successful biome reads; they are not
proof that the pinned version supports this method.

## Checks

Run `node --test tools/*.test.mjs` and `python tools/addon.py build`.
Ten tests passed with mocked engine objects and JSON UI structure checks. In-game tests are still required
for entity query behavior, unloaded chunks, client UI and Realm interaction.
