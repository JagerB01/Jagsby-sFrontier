# Changes

## 0.0.7

- Fix native JSON UI collection scoping: put record indices on the labels and
  clickable buttons that consume them, rather than only their containers.
  This addresses Overview fields repeating the name and Rename submitting record 0.
- Add explicit mouse/controller mappings to action controls and the rename Save button.
- Research now has independent Global and Local subtabs; returning from a
  research purchase preserves the appropriate group without another census.
- In-game name: Jagsby's Frontier 0.0.7.
- 21 automated tests pass; native client rendering/input remain unverified.

## 0.0.6

- Overview now contains only settlement name with Rename, village biome and
  Realm Power, in that order, in a fixed panel without scrolling.
- Replace the rename placeholder with a themed text-entry screen and persistent
  save; validate names as 1–24 characters without line breaks or format codes.
- Re-read current state before saving a name to preserve concurrent changes.
- Keep other tabs and the interaction-triggered census behavior.
- In-game name: Jagsby's Frontier 0.0.6.

## 0.0.5

- Remove all bundled MineScape menu definitions and 129 copied textures.
- Move Frontier controls to `ui/jagsby_frontier/charter.json` in the independent
  `jagsby_frontier` namespace, registered by `_ui_defs.json`.
- Retain only a minimal Bedrock form-entry hook in `server_form.json`; ordinary
  forms use the vanilla renderer. MineScape is not required.
- Generate Frontier's own solid-color texture rather than copying one.
- Keep the custom sidebar design and interaction-triggered villager rank bridge.
- In-game name: Jagsby's Frontier 0.0.5.

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
