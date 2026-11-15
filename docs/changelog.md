# 0.0.48

- Replace paged stock text with a single 10-column, 3-row grid showing every
  producible item icon and its whole-number count at the bottom right. Show
  zero balances; remove stock Prev/Next controls and page text entirely.
- Preserve fractional balances internally and collect only whole items. The
  heading reports the sum of whole stored items against existing capacity.
- Enlarge output/modifier text and keep two output rows within the production
  box. Match Producing and Modifiers heading colors.
- Show only Prosperity, Development, Colonization and River crop percentages,
  with labels and values in aligned columns. Remove raw Realm Power from bonuses.
- Center Collect stockpile horizontally and vertically on its button.
- 181 Node tests and 3 Python tests pass; static validation checks 184 pack files.
  Native rendering still requires an in-game check.

# 0.0.47

- Replace four Production tabs with Overview and Resource Prospecting.
- Show produced item images, names and + X.XXX/hour in a compact output box.
  Rates include all active bonuses, combine matching resources and show zero
  when the stockpile is full. Package icons for all 30 distinct mapped items.
- Put Realm Power, Prosperity, Development, Colonization and River crop bonuses
  in a separate modifiers box beside output.
- Put the shared stockpile below both boxes, with six item types per page in
  two columns and a Collect stockpile button. Collection retains fractions and
  collects all available whole items, including items on other pages.
- Keep stock navigation and collection on Overview. Keep native specialization,
  surveyed secondary selection and the confirmation preview on the second tab.
- 180 Node tests and 3 Python tests pass; static validation checks 181 pack files.
  Native rendering and multiplayer behavior require an in-game check.

# 0.0.46

- Put every research tooltip's live text collection inside a full-width body row
  with a nine-unit inset on both sides, matching the title and divider.
- Avoid positioning a narrow collection directly in the vertical stack, which
  let native layout shift the text beyond the frame. Explicitly left-align text.
- Retain native content-driven height, edge padding, outside-card placement,
  direct contributions and all current/next effect text.
- 178 Node tests and static pack validation pass; native rendering still requires
  an in-game check.

# 0.0.45

- Left-align Dev/Hr and Route values to a shared column. Keep the gold
  Development heading and uniform text size.
- Reduce Development and adjacent Production panel heights from 72 to 56 UI
  units, tighten row spacing and retain existing widths.
- Show hourly Development to three decimal places with a spaced plus sign;
  replace +<0.01 with values such as + 0.002. Zero displays 0.000.

# 0.0.44

- Correct the outdated compatibility check that excluded Dappled Forest/Poplar.
  Verify all 52 assignments against the official Bedrock 1.26.40 registry and
  raise the pack minimum engine version to 1.26.40.
- Add Dappled Forest → Poplar Logs as Building production, including native
  specialization, nearby diversification, friendly display and research materials.
- Retain saved settlement identities, research progress and production mechanics.
- 178 Node tests and 3 Python tests pass; static pack validation passes.

# 0.0.43

- Replace placeholder biome outputs with 51 validated single-resource surface
  assignments. Document Dappled Forest/Poplar as unavailable in Bedrock 1.26.0.
- Use two 50% allocations. Prospecting unlocks an explicit choice between Native
  Specialization and a verified nearby biome. Add matching-item output together.
- Add a fixed, non-scrolling allocation preview and revalidate before confirming.
  Freeze native biomes after registration and cache on-demand surface surveys.
- Apply River's +10% crop bonus once across both slots. Keep crop contributions
  distinct from Common production and accept the new Building resources.
- Preserve offline backlog at old rates until migration, fractions, shared stock,
  research progress, Development/Colonization separation and storage capacity.
- 177 Node tests and 3 Python tests pass. In-game UI/multiplayer validation remains
  necessary. See [mechanics and compatibility](biome-production.md).

# 0.0.42

- Replace fixed per-tech hover heights with native text-driven sizing: intrinsic
  label height, child-measured collection/content stacks, a largest-child-sized
  outer panel and sibling-sized nine-slice frame. Keep only six-pixel edge pads.
- Anchor the popup's top below the top-tier card or its bottom above other cards,
  keeping a four-pixel gap regardless of changing text height.
- Replace repeated Status: Requires ... text with Status: Locked; keep the
  prerequisite line and Click to contribute footer.
- Remove obsolete fixed-height frame assets. 110 Node tests and 3 Python tests
  pass; static validation checks 146 pack files. Native content reflow still
  requires an in-game check.

# 0.0.41

- Use one consistent text size throughout the Development box. Show Development
  and its value together in the heading; remove the Current label/row.
- Rename the rate label to Dev/Hr, retain aligned values, and prefix positive
  rates with +. Small positives display +<0.01; zero remains 0.
- 110 Node tests and 3 Python tests pass; static validation checks 148 pack files.
  Native rendering remains unverified.

# 0.0.40

- Place top-tier tech hover popups below their cards and other tier popups above
  their cards, with a four-pixel gap. Check every hover/pressed state for overlap.
- Center the tech name and Lv X within the text area beside the icon. Make the
  name larger and the level smaller on all ten cards.
- Replace inventory-carry instructions and variable click hints in the popup
  with Click to contribute. Direct payments, safe clipping and stale checks remain.
- 110 Node tests and 3 Python tests pass; static validation checks 148 pack files.
  Native rendering and pointer behavior still require an in-game check.

# 0.0.39

- Rebuild Production as four fixed non-scrolling subtabs: Overview, Resources,
  Biomes and Stockpile. Show hourly base/zone output, source biomes, modifiers,
  offline/paused status and paged shared stock with whole-item collection.
- Replace the secondary-biome picker with paged inline options, Prospecting
  status/progress, explicit Survey/Use/Clear controls and loaded-sample rechecks.
  Preserve economy formulas, existing mappings, shared stock and saved selections.
- Align Development values across from labels, rename Development/Hr, remove
  six-place decimals and preserve tiny positive rates as <0.01.
- Shrink tech hover frames and describe only literal current/next effects,
  omitting empty current benefits at Lv 0. Hearthstone now refreshes Regeneration I
  for three minutes so its actual duration matches the clarified description.
- 110 Node tests and 3 Python tests pass; static build validates 148 pack files.
  Native rendering/controls still need in-game verification.

# 0.0.38

- Remove the complete map feature: scripts, terrain discovery, navigation/HUD,
  glyphs/textures, generator, obsolete tests and guide. Realm's first subtab is
  now Road Networks with paged connections and management/travel controls;
  settlement directory tabs remain. Restore legacy movement permissions once.
- Put Development and Production boxes side by side and move Owner alongside
  the settlement name. Switch numeric Development fields to native form-text
  binding rather than marker subtraction. Production remains a placeholder.
- Expand all ten local/global hover panels with plain-language effects, affected
  players/settlements, next benefits, costs, contribution progress, remainder
  and requirements. Cards retain name and Lv X only.
- Clicking a card now contributes directly. The popup quotes the exact item and
  amount: prefer eligible held material, otherwise the first eligible inventory
  type, clipped to the quote/remainder. Reject stale quotes without spending;
  retain both local/global payment recovery and Stewardship caps.
- 96 Node tests and 3 Python tests pass; static validation checks 132 pack files.
  In-game layout, direct clicks and restart behavior still need native testing.

# 0.0.37

- Split Overview into settlement details, a separate Development box and a titled
  Production placeholder. Keep the portrait beside the panels, with no scrolling.
- Show current Development points, an estimated points/hour increase and a named
  connected route with Trail/Road/Highway or building status. Additional routes
  are indicated by +N; missing connections show None.
- Derive the hourly estimate from existing base-production Development value
  plus active trade income, excluding Colonization bonus output. Full storage
  suppresses production income while active trade income remains.
- Simplify all ten research cards to their name and larger Lv X. Remove on-card
  descriptions; retain hover explanations, costs and contribution screens.
- All 98 Node tests and 3 Python tests pass. Static validation checks 143 pack
  files. Native rendering still needs an in-game check.

# 0.0.36

- Replace all provisional local prices with finalized recipes: Hearthstone 64/128
  bread, Prospecting 64 paper, Sanctuary 250 crops, Prosperity 250 building
  materials, Road Networks 32 copper / iron / gold for research levels I–III.
- Add persistent partial contribution progress per settlement, mixed eligible
  materials, clipped payments, remaining-cost/status UI, and shared inventory
  journal recovery with stale level/revision protection.
- Preserve existing research and legacy aliases/progress, perks, production,
  permanent Development and road construction/trade formulas. Stewardship still
  caps Sanctuary/Prosperity; fixed 250-item costs do not grow with level.
- All 95 Node tests and 3 Python tests pass; static build validates 143 pack files.
  Native Bedrock UI/persistence behavior still needs in-game verification.
  See [finalized local research](local-research.md).

# 0.0.35

- Local research cards now open the custom charter cost/details picker before
  purchase, displaying level, price, benefits and prerequisites. Existing local
  prices remain provisional and unchanged.
- Add an explicit purchase button and reject stale confirmations when another
  player upgrades that local technology. Road Networks exposes its connection
  menu from the same details screen. Closing a screen spends nothing.
- All 79 JavaScript tests and 3 Python tests pass. Static validation checks 142
  pack files; native in-game rendering remains unverified.

# 0.0.34

- Use Stewardship for the foundational global technology and Settlement Charters
  for settlement capacity. Stewardship occupies the top position and Settlement
  Charters the middle-right, with matching sprites. Existing save keys remain
  compatible; no research progression or costs change.
- Show each technology's live current level on its card in default, hover and
  pressed states, across both global and local trees.
- Move permanent Development into the Overview identity panel with its production
  bonus and next-point progress, and add the settlement's MineScape zone.
- All 76 JavaScript tests and 3 Python tests pass; build/static validation checks
  142 pack files. In-game rendering still requires verification.

# 0.0.33

- Built on 0.0.32, preserving its interactive Realm map, local research, offline
  Development economy, Sanctuary, road construction and food-powered travel.
- Added Innovation, saved partial inventory contributions, exact global prices,
  prerequisites and endless research caps in the existing custom charter UI.
- Integrated MineScape 1.5.119 square zone rings (2,400 / 6,000 / 11,200 / 18,400 /
  28,000), sequential founding unlocks, and `2 + Capacity` settlement limits.
- Added zone-specific Colonization output without bonus Development credit,
  proportional capacity admission, and fixed 792-item Shared Storage increments.
- Added backward-compatible schema migration after prior offline output is
  settled; journaled global payments recover unambiguous interrupted debits.
- All 76 JavaScript tests and 3 Python tests pass. Static validation covers 142
  pack files. Native JSON UI and Realm restart behavior require in-game testing.
  See [global research details](global-research.md).

# 0.0.32

- Added a selectable interactive Realm map overlay. Joystick/WASD and mouse-look pan, Jump cycles zoom, and Sneak/Back returns to Realm. Previous movement permissions are restored on exit, damage, reconnect and world reload. Button controls remain available; mouse dragging is not implemented.
- Replaced periodic placeholder production with lazy real-time accounting for all settlement records, including offline/unloaded ones. Implemented the requested category rates, +5% Prosperity, +0.1% per permanent Development point, fractional shared stock and lifetime output tracking.
- Added threshold-by-threshold Development/route accounting, proportional admission at shared capacity, no banking of blocked production, and a resumable work budget. RP/biome/research changes settle old rates before applying new ones.
- Activated Hearthstone I–II, verified Resource Prospecting, repeatable Sanctuary/Prosperity and Road Networks research in the existing five-node tree. Hostile damage is scaled through the stable before-hurt event; daily villager healing is bounded and avoids excess HP.
- Added persistent unique roads with initiator ownership, distance-based game-tick construction, Trail/Road/Highway upgrades, directional offline Development rewards and bidirectional food-powered travel. Trial timing/food/research values live in economy-config.js. Teleport failure refunds food.
- Development/progress/bonuses are shown in Overview and production details; Local hover descriptions show live levels, prices and requirements. The Road Networks card opens connection/research/travel management.
- Build/static validation (141 pack files), all 53 JavaScript tests and all 3 Python tests passed. Native Bedrock input/HUD, damage, healing, travel and multiplayer persistence remain unverified and require the documented disposable-world trial.

# 0.0.31

- Replaced surface-block sampling with bounded biome-ID sampling and climate colors, including shared persistence and separate dimension data.
- Removed the 384 per-tile form images; twelve glyph text rows reduce each charter from 427 to 55 form records. Initial charter opening does not rasterize the map. Realm > Map > Refresh loads it explicitly; pan/zoom also load the map.
- Added an original E1 glyph page for colored map cells and settlement/player markers. Existing research icons/layout and purchase actions are retained.
- Biome discoveries use a new storage namespace. Old surface discoveries are preserved, but players must revisit areas to populate the biome map.
- Build/static validation (133 pack files), all 36 JavaScript tests and all 3 Python tests passed. Native font rendering, map alignment and the opening-lag improvement require an in-game comparison.

# 0.0.30

- Applied all five supplied 64×64 transparent Local research icons without changing the artwork.
- Matched the diagram: Hearthstone at the top, Resource Prospecting / Sanctuary in the middle, Prosperity / Road Networks at the bottom.
- Renamed the displayed biome and efficiency upgrades to Resource Prospecting and Prosperity while preserving their save keys, costs, effects and purchase bindings.
- Sanctuary and Road Networks have explanatory hover boxes and are clearly marked Planned; they cannot purchase or charge materials. Hearthstone's existing single prototype upgrade is unchanged; the diagram's two-level healing system is not implemented in this visual update.
- Build/static validation (132 pack files), all 36 JavaScript tests and 3 Python tests passed. Native Minecraft rendering remains unverified.

# 0.0.29

- Added Map / My Settlements / All Settlements under Realm, with a 32×12 terrain viewport, settlement/player markers, pan, zoom, centre, dimension and refresh controls.
- Shared explored surface samples are stored in world dynamic properties, visible to every player and partitioned by dimension. Exploration starts with this version; historical discoveries are not imported.
- Scanning samples at most six columns per second across online players. Rendering uses saved data only. Storage is capped; unloaded columns do not erase discoveries.
- Added a map legend in Information. UI rendering uses original palette tiles and indexed form images, with no HUD/font overrides or dependency on Advanced Minimap.
- Build/static validation, 36 JavaScript tests and 3 Python tests passed. Native Bedrock UI, live persistence and performance require in-game verification. See shared-realm-map.md for limits and trial steps.

# 0.0.28

- Replaced Local research's full-width rows with the same 122×34 icon cards, branch lines and charcoal/silver styling as Global.
- Efficiency sits above Hearthstone and Biome Utilization. The lines group the upgrades visually; no new prerequisites were added.
- Selecting a Local card uses its original purchase action. Hover explanations retain live level, benefit, cost and affordability/requirement text, plus the Hearthstone healing limitation.
- Kept Local left and Global right, with Global cards remaining informational.
- Build/static validation (102 pack files), all 30 JavaScript tests and all 3 Python tests passed. Native Minecraft layout, hover and selection need in-game verification.

# 0.0.27

- Added charcoal/silver tooltip boxes with wheat-gold titles and ivory explanations for all three Local and five Global research techs.
- Local explanations appear over the tech description or its Research button. Global explanations appear over each card. Hover and pressed states include the popup; normal states do not.
- Placed popups above or below their tech to stay inside the charter. Explanation controls do not submit actions or change research; existing purchase bindings remain intact.
- Descriptions distinguish planned Global effects and Hearthstone's inactive healing effect from available prototype features.
- Build/static validation (101 pack files), 30 JavaScript tests and 3 Python tests passed. In-game hover, controller focus, layering and dismissal still need verification.

# 0.0.26

- Moved Local research to the left and Global research to the right. Local is the initial research tab.
- Updated controller left/right focus navigation to follow the visible order; each tab retains its existing content and action bindings.
- Build/static validation and all 32 automated checks passed. Native Minecraft rendering remains unverified.

# 0.0.25

- Refined button faces with shallow aged-silver bevels, charcoal grain, subtle top lighting and engraved wheat-gold corner strokes.
- Selected tabs have a gold inner edge and wheat-gold captions; hover brightens silver, while pressed actions use a recessed bevel and a lowered caption.
- Generated textures at each control's actual dimensions to keep borders crisp across navigation, subtabs, research, short actions, biome choices and rename submission.
- Kept existing button sizes, icons, layout and action bindings.
- Build/static validation (100 pack files), all 29 JavaScript tests and all 3 Python tests passed. Native Minecraft rendering remains unverified.

# 0.0.24

- Replaced brown/crimson menu surfaces with procedural textured charcoal, aged-silver trim, ivory body text and wheat-gold headings and selection accents.
- Applied the palette to all five navigation tabs, Overview, Research, Production, Realm, Information, action buttons, secondary-biome picker and rename screen.
- Preserved layout, icons, portraits and action bindings. Applied the selected D2-style straight gold frame with silver leaf corners and village crest; fitted the surfaces and navigation inside its rails.
- Build/static validation (74 pack files), 29 JavaScript tests and 3 Python tests passed. Native Minecraft rendering remains unverified.

# 0.0.23

- Replaced flat interior fills with matching detailed leather and shaded aged-silver/wheat trim assets.
- Applied the material set to sidebar/subtabs, action buttons, global research nodes, Overview, production/local research panels and header.
- Kept quieter, darker surfaces behind live text; selected and hovered controls use brighter material tints.
- Preserved the original outer crest frame, information layout, all five navigation tabs and existing action bindings.
- Static addon validation and all 32 automated checks passed. An offline asset/layout render was inspected; native Minecraft rendering remains unverified.

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
