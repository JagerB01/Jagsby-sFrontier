# Settlement Map

Open Village Charter → Diplomacy → Map → Open Settlement Map. The controls are on the
left. Hover or focus a POI pin to see its information beside it.

## Provinces and capitals

Village Charter → Diplomacy → Provinces shows the current charter's province,
its capital and its bounds. When a province has no capital, a settlement owner
can designate their settlement once it reaches Development 10. The capital's
current owner can name the province. The name stays with the province if the
capital is removed.

The detailed map uses the Capital icon for a designated capital. In the
Overworld, the first press of − switches to Province icons for squares with
registered settlements, discovered landmarks or world spawn. Press Fit or zoom
back in past that step to return to individual pins. The map projects each icon
from the center of its province, snaps it to the pin grid, and uses separate
pages if centers share a cell.

## Pins and hover information

Settlements and world spawn use small pins. Hover or focus a pin to reveal its
full artwork in the map. Charter settlements use the Village icon and surveyed
landmarks use their own icons, visible at rest. World
spawn reveals the gold compass star. Expanded artwork stays inside the map
border, and hovering keeps the original pin's hit area.

The tooltip stays inside the map and opens on the left when it cannot fit on
the right. It sizes to the rendered text and displays the point’s X, Y
(elevation) and Z coordinates. Settlement
details also include the name, biome, Development and owner. The map reads the configured world spawn on each
request and includes it in Overworld Fit.

X increases to the right and Z increases downward. The grid lines show their
world coordinates in blocks, rounded to the nearest block. The labels update
as you zoom, pan or change dimensions. The 240×150 UI-pixel map
rounds positions to the centers of 6×6 UI-pixel cells, within three UI pixels
per axis of the projected position when the cell is free. Overlapping POIs
receive separate pins in the nearest free cells. Their tooltips show their
actual coordinates. If all cells fill up, the POI page control shows the
remaining pins on subsequent pages.

## Province and zone lines

Gold lines show the Overworld’s 2,048 × 2,048 block provinces, aligned to
multiples of 2,048 on X and Z. Fit includes the province around the active
charter. At very wide zooms the map omits intermediate borders to keep lines
legible. Zoom in to see the individual province boundaries.

Teal lines show the square MineScape zone boundaries from Heartlands through
Blackreach. They follow the same distances from the Overworld origin as the
settlement founding rules. The map rounds zone lines to its six-pixel grid.

Use **Province Lines** and **Zone Lines** at the top of the map to show or hide
each layer. A newly opened map starts with province lines on and zone lines
off. Both choices are kept while navigating, refreshing or switching dimensions
within that map session. The controls appear in the Overworld.

## Landmark survey

Use the Clapping emote in the Overworld to survey villages, trial chambers,
ancient cities, desert and jungle temples, strongholds, ocean monuments and
trail ruins. With Habitations loaded, surveys also recognize Illager Mines
and selected camp, watchpost, watchtower, fortress and castle layouts. Surveys check
loaded blocks within 48 horizontal blocks of where you clap, up to 128 blocks
below and 48 blocks above. The scan runs over multiple ticks. A bell alone
can flag a possible village. The survey skips clue blocks recorded as
player-placed since tracking began. Older placements, moved blocks, and
structures with missing clues can still affect results. Discoveries use the
matching POI artwork and are shared across the world. Refresh or reopen the
map after a survey finishes. New Trial Chamber pins require nearby tuff bricks
and copper grates. Previously saved pins carry over.

## Controls

- Opening the map fits registered POIs in the charter’s dimension.
- Fit includes all settlements and world spawn in the current dimension.
- +/− zoom. On controller, D-pad Up/Down also zooms.
- < / > pan west/east. N/S pan north/south.
- Dimension cycles through dimensions containing registered points.
- Refresh rereads world data. Back returns to Diplomacy.

The map reads the settlement registry and saved landmark discoveries. Opening
the map does not initiate a scan or write world data.
Hover and focus operate locally without submitting the form. Zoom and pan
replace the form with a fresh viewport.

Automated checks cover projection, collision handling, the generated marker and info
box geometry, and the form payload. Verify hover artwork, controller focus
and coordinate legibility in Bedrock before relying on them in-game.
