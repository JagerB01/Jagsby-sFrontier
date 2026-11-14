# Interactive map addition — 0.0.32

Select the map rectangle under Realm > Map to open the larger HUD overlay.
Joystick or WASD pans. Moving the mouse/look camera also pans; actual
mouse-drag input is not available in this implementation. Jump cycles the four
zoom levels; Sneak (normally controller B/Back) exits and reopens Realm. The
menu's pan/zoom/centre/dimension buttons remain as fallback controls.

Only an active map session runs its input loop (every four game ticks); it draws
a cached map at most once every eight ticks. It does not trigger terrain scans,
censuses or production accounting. Lateral movement and jumping are temporarily
disabled while their input is used by the map. Their exact prior permission
values are saved on the player and restored on exit, damage, reconnect and
world load. Damage/death/dimension changes close the map. A disconnect retains
the recovery marker so the next spawn can restore permissions.

The original HUD overlay uses the current biome glyph page and a JF_MAP| title
payload. It is not a mouse-cursor screen. Native input, title binding, alignment,
permission recovery and compatibility with other HUD packs need live testing.

Disposable-world trial: select the map, move with each input device, cycle zoom,
exit, reopen, take damage, reconnect and confirm normal movement returns in each
case. Confirm existing disabled movement permissions remain disabled after exit.

---

# Shared biome Realm map — 0.0.31

This version replaces the 0.0.29 surface map described below. Open Realm > Map
and press Refresh to load it. Pan, zoom, Centre and Dim also load the view.
Initial charter opening supplies empty map rows and does not render a map.
The menu now carries 55 form records instead of 427, with twelve glyph text
rows replacing 384 native tile images. Glyphs use the original E1 font page.
The map viewport remains 32×12; native spacing/appearance must be verified.

Scanning uses Dimension.getBiome at Y=64, not getTopmostBlock or a block-column
scan. Colors classify plains, forest, water, dry, mountainous, snowy, savanna,
swamp, Nether and other regions. It is a coarse biome map, not a terrain/building
atlas, and does not represent vertical cave-biome variation. The combined six
samples/second budget, shared discovery, dimension isolation, bounded storage,
ten-second save cycle, cached rendering and settlement/player markers remain.

Biome discoveries use `jagsby_frontier:biome_map_v1:`. Prior surface-map data
under `jagsby_frontier:map_v1:` is left intact and is not misinterpreted as biome
IDs. Revisit old areas to populate the new shared biome cache. No research or
settlement data is reset. The biome map cannot import historical exploration.

All 36 JavaScript and 3 Python checks pass. They verify shared/reloaded biome
data, record count, blank initial map rows, navigation and the absence of
terrain-column queries. No native opening latency has been measured. Compare
charter opening against 0.0.30, then press Refresh to check colored glyph cells,
marker alignment, zoom and two-player discoveries. Wait ten seconds before
save/restart to check persistence. If glyphs show as characters or squares,
report the screenshot/content log; do not assume font rendering is validated.

---

## Historical surface-map implementation (0.0.29; superseded)

# Shared Realm map prototype — 0.0.29

Realm now contains Map, My Settlements and All Settlements. The map is a 32×12
surface grid. Direction buttons pan, Zoom + / - change scale, Centre returns to
the current charter, Dim cycles dimensions, and Refresh redraws discoveries.
Gold houses mark the current settlement, ivory houses mark other settlements,
and a white cross marks your position when inside the viewport. Overlapping
markers prioritize the current settlement, then the player. Information has a
short legend. Settlement markers are known records, even over unexplored tiles.

## Shared discovery and persistence

The server samples terrain around all online players, with one combined budget
of six getTopmostBlock calls per second. Observations are shared by everyone,
not stored per player. Players need not open a charter for discovery to occur.
Samples are at 16-block spacing within three sample cells of each player. A
position is attempted at most once per minute in the recent-sample cache.
Unloaded/unreadable columns leave old discoveries intact.

Surface categories are grass, leaves, water, sand, stone, snow, wood, earth,
lava and other blocks. Each tile samples one column; it is not a detailed atlas
of every block. Zoom levels are 16/32/64/128 blocks per tile. At distant zoom,
the dominant known category is drawn. Dark areas are unexplored; partially
explored zoomed tiles may show the known portion's category.

Regions contain 8×8 samples. Changed regions and their index save in world
dynamic properties about every ten seconds, with failed writes retried. A crash
can lose recent unsaved samples. Persistent storage is capped at 1,024 regions
and a 26,000-character region index, whichever fills first. The map reports
Storage full when a new region cannot be added. Existing regions remain
readable/updatable; old discoveries are not automatically evicted.

Overworld, Nether and End data are separate. This is a top-surface map; Nether
samples can show its roof. Cave mapping is not implemented. Historical Minecraft
exploration and Advanced Minimap's saved regions are not imported. Revisit old
areas after installing to discover them for Frontier.

The menu is a snapshot. Refresh/reopen it to see later discoveries. UI pan and
zoom never scan or load distant chunks. Shared terrain does not depend on the
player owning a settlement. Rendering uses indexed form image records, with no
HUD title channel, custom font pages, or third-party addon dependency. Native
form rendering with 427 records is unverified and needs a performance trial.

## Verification and trial

Offline checks cover shared/reloaded discoveries, negative coordinates,
dimension isolation, scan budget, unloaded columns, failed-save retry, corrupt
storage protection, storage limits, navigation without block scans, markers,
UI record indices and the map action dispatch. All 36 JavaScript tests and 3
Python tests pass. Static validation covers 127 pack files. These checks do not
execute Bedrock or measure its UI/server performance.

In a disposable Bedrock 1.26.0+ test world:

1. Import both 0.0.29 packs; open Realm > Map. Check terrain tiles, the gold
   current-settlement marker, and all three subtabs.
2. Walk around for a minute, reopen/Refresh and confirm new terrain appears.
   Check pan, zoom, Centre and Dim; distant unexplored areas should stay dark.
3. Have player A explore elsewhere while player B stays at the charter. B pans
   to that area and refreshes to confirm the shared discoveries.
4. Wait at least ten seconds, save/restart the world and revisit the map.
   Confirm discoveries remain even with player A offline.
5. Visit another dimension and verify it has separate terrain. Confirm the
   Nether roof limitation rather than interpreting it as an Overworld map.
6. Verify research, rename and settlement directories still work. Check content
   logs for errors, tile bindings, UI responsiveness and tick performance with
   multiple players. Report missing tiles or menu failures before Realm use.
