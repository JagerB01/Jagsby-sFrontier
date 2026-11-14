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
