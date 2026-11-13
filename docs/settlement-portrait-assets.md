# Settlement portrait assets

Five portraits were exported from the approved framed aerial settlement concept:
Outpost, Hamlet, Village, Town and City. Existing art and frames are retained.
The large title plaques below the portraits were excluded; tier names should be
drawn as live UI labels rather than baked into each texture.

The main resource textures are in `textures/ui/frontier/settlements/`, named
`outpost.png`, `hamlet.png`, `village.png`, `town.png` and `city.png`.
They are opaque **96×168 indexed PNGs**, capped at 128 colors, with metadata
stripped and PNG compression enabled. All five total 63,569 bytes (about 62 KiB).
Use `bilinear: false` when displaying them in Bedrock JSON UI.

Two downloadable ZIPs are available:

- `downloads/Jagsbys_Frontier_Settlement_Portraits_96x168.zip`: recommended set.
- `downloads/Jagsbys_Frontier_Settlement_Portraits_64x112.zip`: smaller set;
  30,893 bytes of PNGs (about 30 KiB), with less detail at the higher tiers.

Only the recommended set is included under the resource-pack texture directory,
avoiding duplicate texture storage. Original high-resolution generated art is
retained in the workspace outside the pack. Crop bounds, source checksum and
export settings are recorded in `settlement-portrait-assets.json`.

## Overview integration (0.0.9)

The recommended portrait fills the left Overview column at its native 96×168
size; a live tier label sits beneath it. Settlement name, biome and Realm Power
occupy the right column. The entire panel fits without scrolling and Rename
remains in the header.

The provisional thresholds approved by the user are:

| Realm Power | Tier |
| --- | --- |
| 0 to below 2 | Outpost |
| 2 to below 5 | Hamlet |
| 5 to below 10 | Village |
| 10 to below 20 | Town |
| 20 or more | City |

Edit `packs/behavior/scripts/settlement-tiers.js` to rebalance. Classification is
derived from the persisted census when the menu opens. Charter interaction
refreshes the census, so the next observation can promote or demote the portrait.
No background scan is added. Unknown trade ranks use the conservative minimum
with a ≥ tier label; an unavailable census displays an Outpost illustration with
"Tier unavailable", rather than claiming a measured tier.

The tier's texture travels with its tagged form record and the custom image
control binds `#form_button_texture` in the native factory context. The portrait
uses `bilinear: false`; no duplicate higher-resolution assets are packaged.
Automated tests cover boundaries, promotions/demotions, asset dimensions and the
fixed layout. Native Minecraft rendering remains unverified.
