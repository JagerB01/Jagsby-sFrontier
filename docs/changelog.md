# 0.0.22

- Added the approved option A Realm and Information icons as transparent 64×64 sprites in every sidebar state.
- Added Information directly below Realm, with a fixed placeholder page for future guides.
- Extended controller focus navigation to the fifth tab and removed the old painted Realm icon and overlapping footer branding.
- Kept all five navigation buttons inside the border without scrolling.
- Build and all 32 automated checks passed; Minecraft rendering remains unverified.

# 0.0.21

- Restored the user's preferred first silver-and-wheat border, including its village crest.
- Made the base frame RGBA with a transparent exterior, preserving the ornamental silhouette instead of placing an opaque rectangle behind it.
- Moved the header and content below the crest while keeping the original 380×240 screen bounds. Compacted research/directory panels to remain inside the frame.
- Matched menus to the border with warm harvest browns, cream text, wheat-gold highlights, aged-silver edges and subdued crimson/terracotta controls.
- Preserved information on the left and the framed portrait on the right.
- Build, 29 Node checks and three Python checks passed; an offline layout render was inspected. Minecraft appearance still needs native verification.

# 0.0.20

- Added an original transparent ornamental border with braided aged silver, gold wheat and shaped leaf corners. The frame stays within the screen bounds and leaves header text clear.
- Replaced cool charcoal with warm dark brown surfaces, wheat-gold name/accent colors and silver-toned panel/button edges. Crimson remains the control accent.
- Preserved the single information box on the left, framed portrait on the right and existing gameplay.
- Build and all 32 automated checks passed. An offline layout render was inspected; Minecraft rendering remains unverified.

# 0.0.19

- Rebuilt the charter styling with charcoal surfaces, a continuous narrow brass frame and a shallow crimson header. Removed masonry, wood planks, bright parchment and stacked gold borders.
- Reduced navigation button and icon sizes; crimson controls use clipped corners, subtle outlines and visible selected states.
- Applied ivory body text and muted labels across Overview, Realm, Production and local research.
- Kept the single information panel on the left and framed tier portrait on the right. Reduced the information panel to 147×105, aligned values, and removed unused Claim space for owned villages.
- Global research buttons retain approved sprites, crimson faces and unbound actions.
- Static addon validation, 29 Node checks and three Python checks passed. Inspected an offline layout rendering using real assets and generated control positions; this does not validate Minecraft rendering or native font metrics.

# 0.0.18

- Moved the single Overview information box to the left and framed portrait to the right.
- Removed the Size field and its extra form record. Village name, tier, owner, biome and Realm Power remain together.
- Shortened the information box and tightened its rows.
- Changed sidebar/subtab, global research and action buttons to crimson faces with restrained gold edging and readable light text. Simplified nested button borders.
- Build, 29 Node checks and three Python checks passed; native rendering still requires in-game verification.

# 0.0.17

- Consolidated all Overview information into one right-hand box: village name, tier, size, owner, biome and Realm Power. Framed portrait remains on the left.
- Aligned compact label/value rows inside the single box; no information sits outside it.
- Size now uses direct native text binding, matching the working power binding, instead of marker-removal expressions.
- Build and 32 automated checks passed; native rendering requires in-game verification.

# 0.0.16

- Replaced the four oversized Overview cards with one compact village identity box containing name, tier and size (nearby villager count).
- Owner, biome and Realm Power appear as closely grouped text below, without individual boxes.
- Population uses the existing interaction census within 64 blocks; no extra scans.
- Preserved the framed portrait and working native Realm Power binding.
- Build, 29 Node checks and three Python checks passed; rendering requires in-game verification.

# 0.0.15

- Renamed the global research tree to Settlement Charters, Frontier Mandate, Stewardship, Reclamation and Hoards.
- Added five approved transparent 64×64 research sprites and compact parchment buttons with icon wells and hover/pressed art.
- Kept all five global nodes visible without scrolling and left actions unbound.
- Updated in-game pack name to Jagsby's Frontier 0.0.15.
- Validation: addon build, 29 Node checks and three Python checks passed; Minecraft rendering still needs in-game verification.

# Changes

## 0.0.14

- Fit the name/subtitle together inside the red banner instead of clipping the
  title against its top edge.
- Replace the oversized Overview cards with four compact rows; Village Tier now
  appears on the right with Owner, Biome and Realm Power, not below the portrait.
- Bind Realm Power directly to its raw native form text, with no marker-removal
  expression or visibility filter, and an Unavailable fallback. The user's live
  log confirms correct calculations (including 1.8, 2.4 and 2.2 RP); the blank
  display is a UI problem rather than a calculation failure.
- Fit all five Global tree nodes within a fixed 254×150 panel; no scroll container.
- Fit all three Local upgrades within a fixed panel while retaining their actions.
- Keep Global nodes unbound as requested.
- In-game name: Jagsby's Frontier 0.0.14.

## 0.0.13

- Use the village name as the larger header title with Village Charter below it.
- Add Owner, Biome and Realm Power cards, retaining the framed tier portrait.
- Give power a full-width value and explicit RP suffix to avoid the blank narrow
  numerical field. In-game rendering still needs verification.
- Persist placer ownership for new charters; legacy settlements remain Unclaimed
  with an explicit Claim action that cannot overwrite another owner.
- Replace Stockpile navigation with Realm: paged My Settlements / All Settlements
  directories showing saved owner, tier, coordinates and power.
- Move shared stockpile viewing and collection to Production.
- Add the visual-only Global research tree from the user's reference, including
  Colonization. No global node is wired to a purchase or gameplay action.
- Keep Local research working separately.
- In-game name: Jagsby's Frontier 0.0.13.

## 0.0.12

- Restore the decorative portrait frame; trim only one outer pixel instead of
  cropping the entire stone/oak/gold surround away.
- Use consistent Unicode body typography at 0.85 scale, title-case labels,
  compact aligned biome/power rows and an ordinary-sized power value.
- Keep tier caption below the framed portrait and Rename in the header.
- Integrate the server-animation rank bridge exercised by the probe. Native
  tier queries stay in requested controller transitions; property events write
  literal values only. Apprentice raw 1 was confirmed by the user.
- Batch sampling on charter interaction and share in-flight entity reads across
  players. Native unemployed/nitwit professions receive the base 0.2 power.
- Disable the separate probe pack while testing this integrated build.
- 27 Node tests and 3 Python tests pass; production integration and visual layout
  still require in-game verification.
- In-game name: Jagsby's Frontier 0.0.12.

## 0.0.11

- Remove the dark portrait frame from the displayed image with a shared UV crop,
  preserving the approved original artwork files and tier switching.
- Group a larger settlement name and tier together, put biome on one compact row,
  and place Realm Power below instead of three equally spaced information blocks.
- Use quieter secondary-label colors and a subtle divider on the parchment.
- Simplify the header Rename action to a smaller flat crimson button.
- Keep the working stack-panel collection scopes and non-scrolling Overview.
- In-game name: Jagsby's Frontier 0.0.11.

## 0.0.10

- Fix the exact UI schema error in the user's 0.0.9 content log: collection scopes
  now use stack_panel, not panel. Bind one explicitly indexed child within each
  scope for labels, the portrait and action buttons, including header Rename.
- Add build validation against collection_name on plain panels.
- Remove the invalid query.trade_tier entity event and vanilla villager overrides.
  The log proves that query is unsupported in that server event context.
- Do not trust cached properties from the invalid bridge. Native trade-level
  reading remains unresolved; power and tier are conservative minimum estimates.
- Keep portraits, sidebar artwork, header Rename and Global/Local research tabs.
- 24 automated tests pass; live client behavior needs retesting against a new log.
- In-game name: Jagsby's Frontier 0.0.10.

## 0.0.9

- Display the recommended 96×168 tier portraits down the left Overview column.
- Keep name, biome and Realm Power on the right, without scrolling; Rename stays
  in the top header bar.
- Use user-approved provisional Realm Power thresholds: Hamlet 2, Village 5,
  Town 10, City 20; Outpost below 2.
- Select the portrait from persisted census power and update it on subsequent
  charter interactions; support both promotion and demotion without extra scans.
- Supply the texture through the native tagged record factory, not fixed indices.
- 25 automated tests pass; in-game rendering remains unverified.
- In-game name: Jagsby's Frontier 0.0.9.

## 0.0.8

- Wire the approved transparent 64×64 scroll, book and resource-crate sprites
  into every sidebar state for Overview, Research and Production.
- Move Rename from the settlement details into the crimson top header bar.
- Replace manually indexed static data labels and action buttons with native
  form-record factories. Tagged records identify each displayed value/action,
  while Minecraft supplies the generated controls' actual collection context.
- Keep biome choices generated in native context and the themed Rename input.
- Log and report unrecognized selections rather than silently ignoring them.
- 22 automated tests pass; native client behavior remains unverified.
- In-game name: Jagsby's Frontier 0.0.8.

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
