# Settlement Map

Open Village Charter → Diplomacy → Open Settlement Map. The map opens as a
larger dedicated Charter screen so it has room for markers and controls.
The five Charter tabs continue to switch locally. Map preparation occurs only
on the explicit Open action, not on Charter startup or a periodic timer.

- Black background, subtle coordinate grid, green house markers and short names.
- X increases to the right; Z increases downwards (north is up).
- Select a marker to show its full name, X/Y/Z and existing Development level.
- On gamepad, D-pad Up zooms in and D-pad Down zooms out while the map is open.
  The +/− buttons remain for mouse/touch. Up/Down are reserved for zoom on this
  screen rather than marker navigation.
- Fit includes all settlements in the selected dimension; +/− zoom, < / > pan
  west/east, and N/S pan north/south. Dimension cycles through registered
  dimensions. Refresh rereads shared world data; Back returns to Diplomacy.
- Names are shortened on the grid to keep adjacent markers readable. Locations
  are projected into a 12×6 grid. If several settlements occupy one cell, its
  label shows +N; selection opens a paged list of the individual settlements.
  Zoom separates nearby points; exact coordinates are always in the details.
- Each action rereads the current world registry, so created, renamed and
  removed settlements appear on the next refresh/open/action. An idle open map
  is a snapshot, not a live feed. Players share locations, but choose their own
  viewport. Dimensions are separate coordinate spaces without Nether scaling.

## Persistence and performance

The existing `jagsby_frontier:state_v1` world dynamic property and `villages`
registry remain authoritative. Establishing a settlement already saves its
Village Charter location and dimension; existing rename/removal paths update
that registry. There is no second map registration, migration or saved cache.
Saved worlds therefore restore locations using the existing persistence path.
Opening a map does not change research, economy, inventory or settlement state.

`settlement-map.js` converts registry entries to typed `settlement` points,
then performs a read-only projection. Other POI types can later provide points
through a separate adapter; none are registered or discovered in this release.
The map does not access blocks, villagers, terrain, entity tracking or tick
scheduling. It groups any number of settlements into 72 fixed cells and sends
84 form records; cluster selection is paged at 20 entries. Work is O(n log n)
for stable name ordering plus O(n) projection per map action. Invalid or missing
coordinates are excluded rather than drawn at a fabricated location.

## Bedrock UI choice

The addon already uses a custom JSON UI renderer for native ActionFormData.
Mojang's [vanilla server_form.json](https://github.com/Mojang/bedrock-samples/blob/main/resource_pack/ui/server_form.json)
uses `form_buttons`, collection text bindings and `button.form_button_click`.
The map reuses those bindings, explicitly indexed collection-capable stack
panels and existing button/image/label controls. The Script API does not supply
a map canvas; a fixed coordinate grid avoids relying on unverified dynamically
bound vector offsets, per-player textures or unsupported UI properties.
Terrain rendering is intentionally absent.

A distinct `JF_CHARTER|SettlementMap` route excludes both the dashboard and the
generic picker. Other native forms retain their original routing. The cluster
picker uses the native form renderer, rather than adding more custom UI.
Microsoft Learn documentation was unavailable from the setup network; the
vanilla sample and existing addon bindings were inspected directly.

## Validation

Release 0.0.91 passed 258 Node tests, 6 Python tests, 222-file pack
validation, deterministic rebuild and nested archive integrity checks. Existing
UI definitions outside the router/Diplomacy changes and all prior transport
indices were compared against 0.0.90 and remain equivalent.

Automated tests cover signed coordinate projection, borders, dimensions, zoom,
pan, clusters with 500 settlements, invalid coordinates, registry serialization,
creation/rename/removal, map action dispatch and return to Diplomacy. The pack
validator rejects unsupported `text_truncate` and invalid collection scopes.

Minecraft rendering cannot run in this environment. In a disposable Bedrock
1.26.40+ world, test with two settlements and a cluster: open the map, select
markers, zoom, pan, switch dimensions, refresh, select a cluster entry and Back.
Rename/create/remove a settlement from another player, then refresh. Restart
the world and verify locations. Confirm controller/touch/mouse marker selection,
small-screen name readability, all Charter screens and an exported content log
without new Frontier UI errors. These in-game checks remain unverified.

## Input and refresh limitation (0.0.93)

D-pad shortcuts map `button.menu_up` / `button.menu_down` to the existing zoom
buttons' native form-click event. The mappings use `scope: view` and the
`gamepad_and_not_gaze` input condition; they are inside the map route, whose
visibility and enabled state are false on other Charter screens. Each zoom
button retains its own collection index and original mouse/touch mappings.

Zoom still submits ActionFormData and immediately opens its replacement. The
current Script API form has no update/redraw operation, and the UI does not
send non-closing custom messages to the script. This release does not claim
in-place rerendering or eliminate form transitions. Implementing that would
require an independently validated client-side rendering/state approach;
prebuilding many zoom grids would increase UI construction cost again.

Validate gamepad direction dispatch, repeated presses and marker navigation
in-game, and confirm Up/Down do not trigger map actions on other screens.
