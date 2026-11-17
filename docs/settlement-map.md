# Settlement Map (0.0.98)

Open Village Charter → Diplomacy → Open Settlement Map. Controls are grouped in
a framed panel on the left; the map occupies a 240×144 UI-pixel rectangle on
the right. Stretchable backgrounds and grid lines explicitly disable texture
aspect preservation, correcting the square background and dotted grid seen
in the user's earlier screenshot.

## Markers and information

Green house icons mark settlements. Hovering a settlement shows an info
box with exactly Name, Biome, Development and Owner. Biome/owner names use the
same helpers as the Charter's existing settlement views. Unowned settlements
show Unclaimed. Controller focus shows the same hover state. The icons have no
button frame, submit action or click mapping; they do not open another form.
The engine's inert button primitive is used only for hover/focus hit testing,
like a reading target. It is not a native form action button.

Names are shortened under the icons to preserve legibility. Several settlements
projecting into one 12×6 grid cell share a marker with +N in its name. Its hover
text shows up to eight sets of the same four fields, then asks the player to
zoom in to separate additional settlements. The projection retains all entries.
There is no cluster-selection screen or click-to-select details footer.

A separate gold star marks the configured **world spawn**, read on each map
request using `world.getDefaultSpawnLocation()`. Fit includes it in the
Overworld. It does not use player spawn/bed locations and does not create a
settlement or write any world data. The icon is hidden in other dimensions or
when outside the current viewport. A failed/invalid spawn read does not invent
an origin. Spawn and settlement icons use separate positions within a shared
cell so both can appear.

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
control actions. The map uses 72 fixed cells and 156 form records. World spawn
is a separate body marker, so it does not inflate settlement totals.

The renderer uses the addon's existing native collection bindings. Tooltip
content uses ordinary panels, images and labels, following the research
popover pattern. The custom native hover-text renderer from 0.0.96/97 is
removed as part of the Charter-opening stability fallback. Hover targets
have no form-submit mappings. Popovers flip above lower map cells and keep
their horizontal bounds inside the map. The screen has a distinct
`JF_CHARTER|SettlementMap` route, preserving other forms.

Automated tests cover signed coordinates, bounds, dimension isolation, zoom,
pan, large clusters, registry changes, world-spawn projection and setting
changes, read-only state, the four requested hover fields, absence of marker
submit mappings, non-overlapping left-panel geometry, non-square backgrounds
and continuous grid-line sizing. Existing research and Realm tests also run.

In-game checks remain required: mouse hover, controller focus, tooltip wrapping
and screen-edge placement, left-panel navigation, spawn on initial Fit and
Refresh, same-cell spawn/settlement icons, zoom/pan/dimensions, and an exported
content log without new UI errors. Touch hover depends on Bedrock's native
focus behavior. Static tests do not render Minecraft UI.
