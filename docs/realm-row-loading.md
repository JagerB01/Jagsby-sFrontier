# Realm row loading (0.0.92)

The 0.0.91 content log supplied by the user contains no UI errors and reports
21 ms of script data preparation for 299 records. This does not measure client
screen creation or establish the cause of the reported long opening delay.

Previously, each of the 128 potential positions in each of the three Realm
lists embedded its full row, hidden by the population marker. Now those full
rows are separate templates. Each position contains a 1×1 grid only, with
`maximum_grid_items: 0` and `precached_grid_item_count: 0`. A view binding from
`jf_menu_state` converts that slot's population-marker predicate into a numeric
0/1 `#maximum_grid_items`. Only populated positions request a row template.
The visibility binding also collapses unused positions. Both bindings remain
live to handle form text arriving after control creation.

There are still 384 lightweight grid slots and row template definitions in the
resource pack. This change defers the heavy row control trees; it does not
remove the 128-entry capacity or claim that no empty UI objects exist. The map
and Resource Prospecting controls are unchanged. No script loops or new
world-state properties were added. Native form/action indices are unchanged.

The grid item-limit property and binding target are used by Mojang's vanilla
`expanded_skin_pack.skins_grid` and crafting/furnace scroll grids. The 1×1 grid,
item template and zero-precache properties are documented JSON UI grid fields.
References:

- https://github.com/Mojang/bedrock-samples/blob/main/resource_pack/ui/expanded_skin_pack.json
- https://github.com/Mojang/bedrock-samples/blob/main/resource_pack/ui/crafting_screen.json
- https://wiki.bedrock.dev/json-ui/json-ui-documentation#grid
- https://wiki.bedrock.dev/json-ui/json-ui-intro#using-operators

Road rows are 33 rather than 38 UI pixels tall. The heading occupies y=0–5,
the unchanged 20px road icon y=5–25, and the countdown y=25–32. Travel retains
its original 43×22 size and position. The surface and focus stripe follow the
shorter row height. No road price, timer, research, travel or settlement logic
is changed.

Tests check default zero allocation, zero precache, absence of embedded heavy
controls, exact per-slot markers, late-bound limits, all prior field/action
indices and controller identities, a single-settlement form payload, and that
all content fits inside the compact row. These checks cannot execute Bedrock's
UI runtime. Test opening latency, initial and refresh population, empty lists,
scrolling, controller/touch/mouse actions and building countdowns in-game, then
export the content log to confirm no new UI errors.

## Spacing and focus correction (0.0.94)

The first grid implementation used `size: [251, "default"]` for each gate.
The user supplied a screenshot of My/All names and distances overlaid at the
same row position. An automatically measured native grid can initially report
zero height to the enclosing stack. Gates now reserve the row's explicit height
(32px for My/All, 33px for Roads); population-marker visibility still collapses
unused slots. The zero item limit and zero-precache configuration are retained.

Realm reading rows now set `focus_magnet_enabled: false`. Every action record
has a unique focus identifier and explicit horizontal links. On Roads, move
Right from the reading row to the road icon, Right again to Travel, and press A.
Left retraces the path; Up returns to the reading row. Disabled Travel remains
disabled. On My/All, Right enters Establish Road when available. Scroll reading
targets remain available when no action can be used. Prospecting is unchanged.

Static tests verify nonzero slot heights equal to their children, all compact
field bounds, focus links resolving to the proper records, and preserved native
collection indices. Test two or more settlements, empty lists, building and
completed roads, scrolling and controller activation in-game before claiming
that the rendering and input defects are resolved on Bedrock.
