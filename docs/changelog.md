# Changes

## 0.0.4

- Custom four-page charter dashboard with local sidebar toggles, parchment panels,
  crimson/gold accents and custom action controls, based on the supplied reference.
- Reuse MineScape 1.5.119 menu routing and preserve its existing UI definitions/assets.
- Native on-demand villager trade-tier bridge via Molang entity event properties,
  scored on interaction from novice 0.2 through master 1.0.
- Re-read shared state after awaiting entity properties to preserve other players' changes.
- Match MineScape's Bedrock 1.26.0+ and stable API targets, enabling biome queries.
- In-game name for both linked packs: Jagsby's Frontier 0.0.4.
- Automated tests use mocked engine objects; in-game validation remains outstanding.

## 0.0.3

- Handle attempted charter interactions with the before-event, cancel default
  held-item use, and defer registration, the census and menu display to a safe tick.
- Accept an absent first-event flag; reject explicit held-button repeats.
- Replace the malformed panel-based UI factory with a factory control routing
  charter forms to their themed view and other forms to the vanilla view.
- Retry UserBusy form cancellations at most three times, without rerunning the
  census; never retry a menu the player deliberately closes.
- Show a player message when opening fails, rather than only logging it.
- Ten automated tests pass; Minecraft UI rendering and device input are unverified.

## 0.0.2

- Interaction-triggered, persisted 64-block loaded-villager census.
- Dimension-qualified settlement identifiers with matching legacy migration.
- Realm power scoring supports normal trade tiers, but the live rank adapter is
  still missing; show a labeled minimum estimate for villagers with unknown rank.
- Biome lookup remains unavailable with the pinned server API 2.0.0.
