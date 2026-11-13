# Header, Overview cards, Realm and Global tree (0.0.13)

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
                   Settlement Capacity
                    /              \
        Frontier Expansion     Settlement Development
                |                       |
           Colonization            Shared Storage
```

All five nodes are native button controls with default, hover and pressed art.
They have empty button mappings, no form-record bindings and no script callbacks.
They neither spend materials nor change research state. Existing global purchase
callbacks are disconnected; global data and existing levels are preserved.
Colonization is a visual placeholder only, with no invented gameplay effect.
Local research retains its current functional controls in the Local subtab.

The tree uses its existing research scroll viewport. The Overview remains fixed
and does not scroll. Automatic checks verify the node set and absence of action
bindings, ownership/claim safety, directory filtering/pagination, the new header
and card bindings, and continued access to collection.
