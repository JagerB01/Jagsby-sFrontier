# Header, Overview cards, Realm and Global tree (0.0.15)

## Header and Overview

The native settlement-name record appears in the crimson header, with a smaller
Village Charter subtitle. Rename remains beside the title. The framed portrait
remains at the left of the Overview. Owner, Biome and Realm Power each have a
separate parchment card to its right; all fit without scrolling.

Realm Power now has a full-width text region and an explicit `RP` suffix, such
as `2.0 RP` or `≥ 2.0 RP`. This replaces the narrow bare-number row that was blank
in the user's screenshot. The interaction handler also logs the computed power
and unknown-rank count, allowing a future content log to distinguish a rendering
failure from a calculation failure. Updated native rendering is not verified by
the offline tests.

## Ownership and Realm

New settlement records store the placing player's ID and name. Legacy records
with no recorded owner show Unclaimed; they are not automatically assigned to
whoever opens the charter. Their Owner card offers Claim, which rechecks current
state and never overwrites an existing owner. Ownership here is display and
directory metadata, not a newly introduced permissions system.

Realm replaces Stockpile in the sidebar. My Settlements and All Settlements
are local subtabs. Each directory page contains at most three settlements,
showing name, tier, owner, power and coordinates/dimension. Previous/Next actions
retain the chosen filter and read persistent snapshots without resurveying
villagers. Power is explicitly the settlement's last recorded observation.

The stockpile summary, per-resource quantities and collection action remain
available under Production. This update does not implement a leaderboard,
realm-wide power total or terrain map; summing overlapping charter observations
would otherwise double-count villagers.

## Visual-only Global research tree

The layout follows the user's supplied diagram:

```text
                   Settlement Charters
                    /              \
        Frontier Mandate     Stewardship
                |                       |
           Reclamation            Hoards
```

All five nodes are native button controls with default, hover and pressed art.
They have empty button mappings, no form-record bindings and no script callbacks.
They neither spend materials nor change research state. Existing global purchase
callbacks are disconnected; global data and existing levels are preserved.
Reclamation is a visual placeholder only, with no invented gameplay effect.
Local research retains its current functional controls in the Local subtab.

The tree now fits in a fixed 254×150 research panel without scrolling. The Overview remains fixed
and does not scroll. Automatic checks verify the node set and absence of action
bindings, ownership/claim safety, directory filtering/pagination, the new header
and card bindings, and continued access to collection.

## 0.0.14 display correction

Village Tier is on the right with Owner, Biome and Realm Power. All sections are
32 pixels high. The village name/subtitle fit together inside the red banner.
Global and Local research use fixed visible panels rather than scroll containers.

The latest supplied live log confirms power_tenths values 18, 24 and 22 with zero
unknown ranks and no errors. The power UI now binds directly to the native form
button text, skipping data tags, expressions and visibility filters. The raw
record contains the formatted amount plus RP; its fallback text is Unavailable.
The updated native rendering still requires an in-game check.

## 0.0.15 research art

The five approved icons are transparent 64×64 PNG sprites in
`textures/ui/frontier/research`. Reclamation uses the selected map-and-farmland
option B; the other four use original option A. Each compact research button
has a 32×32 icon well, gilded parchment border and default/hover/pressed faces.
The fixed tree dimensions and unbound button mappings are preserved.

## 0.0.16 compact village identity

Overview now groups the village name, tier and size into one 147×64 identity
box. Size means the number of villagers recorded by the existing 64-block
interaction census, not land area. Owner, biome and Realm Power are compact
unboxed text groups underneath. The portrait keeps its decorative frame.
Population is an appended form record at index 33, preserving all previous
action indexes and the direct native power text binding. Header and identity
name use separate templates so their sizing and colors cannot override each other.

## 0.0.17 single Overview box

All six fields are contained in one right-hand 147×144 panel. Name sits above
a divider; Tier, Size, Owner, Biome and Realm Power use aligned label/value
rows underneath. Claim for unclaimed settlements is inside the same panel.
The framed 96×168 portrait is on the left. Population uses raw native form text
binding, like Realm Power, to avoid the blank marker-expression value observed
in the supplied 0.0.16 screenshot. No new census scans were added.

## 0.0.18 placement and styling correction

The single 147×125 information box is on the left at x=0. The 96×168
framed portrait is on the right at x=161. Size/population has been removed
from the UI and form records; census collection itself is unchanged.
The box contains village name, tier, owner, biome and Realm Power.
All sidebar/subtab faces and global research buttons are crimson in default
and active states, with lighter hover and darker pressed states where supported.
Action buttons also default to crimson. The research sprites are preserved.

## 0.0.19 visual redesign

Charcoal surfaces and a narrow brass frame replace the stone/wood/parchment
background. Navigation is compact and crimson, with restrained clipped corners.
Text colors are consistent: ivory values and muted labels. Production, Realm
and local research use the same dark surface palette. Artwork is Frontier's own;
no MineScape files were used.

Overview retains the left information panel and right portrait. The panel is
147×105 with name, tier, owner, biome and Realm Power. Labels and values have
a wider gap. In unclaimed villages Claim replaces the Owner value, avoiding
a permanently empty button row. The framed portrait remains unchanged.

An offline layout render was inspected for spacing and contrast, using real
assets and generated positions with a substitute font. Minecraft rendering and
input behavior still need native verification.

## 0.0.20 harvest identity

An original 380×240 transparent silver-and-wheat border overlays the warm dark
base. Its braided sides, leaf corners and gold grain motifs provide a shaped
frame without changing screen bounds. A raised-crest concept was rejected
because it crowded the header. Body colors now use warm brown, wheat gold
and aged silver; crimson controls remain. The information/portrait positions
and action mappings are preserved.

## 0.0.21 restored crest and matching palette

The first border is restored at 380×240, with its village crest fully inside
the root bounds. Header text starts at y=34 and the content at y=62. The
Overview portrait is now 90×158; the information panel remains on the left.
Research buttons are 122×34 in a fixed 254×131 tree, under the subtabs, so all
five remain visible. Directory pagination fits the same reduced content height.

The procedural base supports RGBA and leaves the exterior transparent. Menu
surfaces use harvest browns and cream, wheat-gold accents and aged-silver
edges; controls use subdued warm crimson. Neither the village data nor the
research action bindings changed.
