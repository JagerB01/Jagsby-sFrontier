# Settlement Map

Open Village Charter → Diplomacy → Open Settlement Map. The controls are on the
left. Hover or focus a POI pin to see its information beside it.

## Pins and hover information

Settlements and world spawn use small pins. Hover or focus a pin to reveal its
full artwork in the map. Settlement artwork follows the Realm Power tier. World
spawn reveals the gold compass star. Expanded artwork stays inside the map
border, and hovering keeps the original pin's hit area.

The tooltip stays inside the map and opens on the left when it cannot fit on
the right. It displays the point's X, Y and Z coordinates. Settlement
details also include the name, biome, Development and owner. Spawn details
identify the Overworld. The map reads the configured world spawn on each
request and includes it in Overworld Fit.

X increases to the right and Z increases downward. The grid lines show their
world coordinates in blocks, rounded to the nearest block. The labels update
as you zoom, pan or change dimensions. The 240×150 UI-pixel map
rounds positions to the centers of 6×6 UI-pixel cells, within three UI pixels
per axis of the projected position. Points in the same cell share a pin.
Hovering that pin shows one settlement's details, any co-located spawn
coordinates, and a count of other settlements. Zoom in to separate nearby pins.

## Controls

- Fit includes all settlements and world spawn in the current dimension.
- +/− zoom. On controller, D-pad Up/Down also zooms.
- < / > pan west/east. N/S pan north/south.
- Dimension cycles through dimensions containing registered points.
- Refresh rereads world data. Back returns to Diplomacy.

The map reads the existing settlement registry and does not write world data.
Hover and focus operate locally without submitting the form. Zoom and pan
replace the form with a fresh viewport.

Automated checks cover projection, clustering, the generated marker and info
box geometry, and the form payload. Verify hover artwork, controller focus
and coordinate legibility in Bedrock before relying on them in-game.
