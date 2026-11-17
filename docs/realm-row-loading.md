# Realm rows — stability fallback (0.0.98)

**Current behavior:** Realm rows are ordinary explicitly indexed controls again.
The grid allocation optimization described historically below was withdrawn in
0.0.98 after another native crash on Charter opening. Population markers hide
unused rows; they do not prevent row construction. Row heights and controller
links from 0.0.94/95 remain. This trades the attempted allocation optimization
for the pre-grid construction pattern, pending actual device stability tests.


The 0.0.91 content log supplied by the user contains no UI errors and reports
21 ms of script data preparation for 299 records. This does not measure client
screen creation or establish the cause of the reported long opening delay.

Previously, each of the 128 potential positions in each of the three Realm
lists embedded its full row, hidden by the population marker. Now those full
rows are separate templates. Each position contains a 1×1 grid only, with
`maximum_grid_items: 0`. A view binding from
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
and item-template properties are documented JSON UI grid fields. The earlier
precache-property claim was incorrect for the user's runtime; see the 0.0.97
correction below.
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

Tests check an initial zero item limit, absence of embedded heavy
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
unused slots. The zero item limit is retained.

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

## Direct Travel navigation (0.0.95)

The current controller path is row → Right → Travel → A. The upgrade icon is
secondary: Left from either the reading row or Travel reaches it, even on a
building road whose Travel button is disabled. Left from the upgrade icon
returns to the Realm sidebar, and Up from an action returns to the reading row.
This supersedes the 0.0.94 two-step Right path above. Layout and native action
indices are unchanged. In-game controller verification remains required.

## Runtime evidence and correction (0.0.97)

`ContentLog2026-11-17_14-12-07_1.txt` identifies Frontier 0.0.96. At 14:13:21,
Charter data preparation took 18 ms for 299 records. At 14:13:22, UI loading
reported 382 occurrences of unknown property `precached_grid_item_count`: 128
under My Settlements, 128 under All Settlements, and 126 under Roads, with the
log ending in the next Roads error. No other unknown property is present in
the supplied log. There is no native fatal/crash stack, so causality beyond the
confirmed error flood is not established.

This property was introduced in 0.0.92 based on community documentation, but
is rejected by the user's target build. 0.0.97 removes it from every grid slot
without adding a replacement. Packaging recursively rejects it, even if set to
zero or false. Grid item limits, dimensions, explicit row heights, marker
bindings and controller navigation are preserved. No gameplay script or world
state is changed. A target-device session with a clean content log is still
required to verify runtime stability.

## Second crash report and fallback (0.0.98)

The supplied `ContentLog2026-11-17_14-16-53_1.txt` identifies version 0.0.97,
contains no UI errors or script exceptions and ends during verbose sound
messages. The user confirms crashing when opening the Village Charter. No
native crash stack or Charter data-timing message is recorded. The sound
messages are not evidence of the crash cause.

Hidden map/Realm definitions participate in Charter UI construction. This
release removes both newer native paths from that construction: per-slot
Realm grids and the map custom hover-text renderer. Ordinary row controls and
panel/image/label popovers replace them. These are rollback choices, not a
claim that the log proves either mechanism caused the crash. No settlement
or research data is changed, and no sound definitions are modified. Validate
Charter opening, all tabs, multi-row lists, controller Travel and map hover in
a target-device session before claiming stability.
