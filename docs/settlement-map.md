# Settlement Map (0.0.100)

Open Village Charter → Diplomacy → Open Settlement Map. Controls are grouped in
a framed panel on the left; the map occupies a 240×90 UI-pixel rectangle on
the right. Stretchable backgrounds and grid lines explicitly disable texture
aspect preservation, correcting the square background and dotted grid seen
in the user's earlier screenshot.

## Markers and information

The approved Outpost, Hamlet, Village, Town and City icons mark settlements.
They follow the existing Realm Power tier calculation, including its fallback
for unavailable ranks. Hovering a settlement fills the fixed information strip below the map with exactly Name, Biome, Development and Owner. Biome/owner names use the
same helpers as the Charter's existing settlement views. Unowned settlements
show Unclaimed. Controller focus shows the same hover state. The icons have no
button frame, submit action or click mapping; they do not open another form.
The engine's inert button primitive is used only for hover/focus hit testing,
like a reading target. It is not a native form action button.

Names are shortened under the icons to preserve legibility. Several settlements
projecting into one 6×3 grid cell share a marker with +N in its name. Its hover
text shows up to eight sets of the same four fields, then asks the player to
zoom in to separate additional settlements. The projection retains all entries.
There is no cluster-selection screen or click-to-select details footer.

A separate approved gold compass/star marks the configured **world spawn**, read on each map
request using `world.getDefaultSpawnLocation()`. Fit includes it in the
Overworld. It does not use player spawn/bed locations and does not create a
settlement or write any world data. The icon is hidden in other dimensions or
when outside the current viewport. A failed/invalid spawn read does not invent
an origin. Spawn and settlement icons have separate 18×20 hit areas within a shared
cell so both can be hovered independently. Spawn uses the same inert marker
template: its info box shows Name, configured Coordinates and Dimension.
It has no click action.

## Controls and freshness

- Fit includes all settlements and world spawn in the current dimension.
- +/− zoom; < / > pan west/east; N/S pan north/south. X increases right; Z
  increases down, so north is up.
- Dimension cycles through dimensions containing registered points.
- Refresh rereads world data. Back returns to Diplomacy.
- Gamepad D-pad Up/Down retains the map zoom shortcuts. Mouse/touch buttons
  remain. Up/Down are reserved for zoom while viewing the map.

Opening and map actions read the existing shared persistent `villages` registry;
created, renamed and removed settlements appear on the next request. An idle
map is a snapshot. Players choose their own viewports over the same shared
locations. There is no duplicate registration/cache, migration, terrain/block
scan, POI discovery or added tick loop. Development is the existing saved
settlement Development level. Spawn is the only added non-settlement landmark.

Only control actions replace the native ActionFormData form. Hovering is local
and does not submit it. The current form API has no in-place script update;
zoom/pan still replace the form as in previous versions.

## Implementation and checks

`settlement-map.js` performs a read-only projection. Per-cell hover records and
short names are separate form data, keeping non-action markers independent of
control actions. The map uses 18 fixed cells and 49 form records. World spawn
has a dedicated data/texture record and a body visibility marker, so it does not
inflate settlement totals.

The renderer uses the addon's existing native collection bindings. Tooltip
content uses ordinary panels, images and labels, following the research
popover pattern. The custom native hover-text renderer from 0.0.96/97 is
removed as part of the Charter-opening stability fallback. Hover targets
have no form-submit mappings. All current POIs share the same hover/focus appearance and a thin 1px outline,
without button chrome or submit mappings. Hover information has a reserved
240×54 dock at map-screen coordinates (110,170), below the 240×90 drawing area
at (110,68). The 12px gap means the dock does not overlap any icon. Each marker
has literal numeric offsets and explicit top-left anchors: no inherited info
position variables or dynamic anchor values remain. The same dock is filled
for all marker positions and for world spawn. The screen has a distinct
`JF_CHARTER|SettlementMap` route, preserving other forms.

Automated tests cover signed coordinates, bounds, dimension isolation, zoom,
pan, large clusters, registry changes, world-spawn projection and setting
changes, read-only state, the four requested hover fields, absence of marker
submit mappings, non-overlapping left-panel geometry, non-square backgrounds
and continuous grid-line sizing. Existing research and Realm tests also run.

In-game checks remain required: mouse hover, controller focus, tooltip wrapping
and screen-edge placement, left-panel navigation, spawn on initial Fit and
Refresh, same-cell independent spawn/settlement hover and outlines, zoom/pan/dimensions, and an exported
content log without new UI errors. Touch hover depends on Bedrock's native
focus behavior. Static tests do not render Minecraft UI.

## Marker readability (0.0.100)

Sprites draw at 16×16 UI pixels, doubled from the previous 8×8. The PNGs now use
the approved 64×64 source variants, with excess alpha margins trimmed and a 4px
transparent border. Filtering remains nearest-neighbor. Both types have distinct
18×20 hit areas inside each 40×30 cell, with the short name beneath them.
This reduces grid density from 12×6 to 6×3; zoom separates nearby settlements.
The fixed dock shows one settlement at a time in dense cells with a zoom hint,
so a large cluster cannot overflow a box over the map. Full coordinates remain
in shared data and names/biomes/development/owners use the existing helpers.

Automated geometry checks resolve every concrete marker template's complete
anchor/offset chain to the dock rectangle. They reject inherited info-position
variables and test that hit areas, outlines and text bounds fit. These checks
still do not execute Bedrock's renderer. The previous variable-based geometry
checks passed but did not match the user's screenshot; actual in-game hover
and legibility must be tested before claiming those problems are resolved.
