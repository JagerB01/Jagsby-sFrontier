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

These are assets for subsequent integration. No tier thresholds have been
invented, no tier-switching logic is implemented here, and the published 0.0.8
addon has not been rebuilt with these portraits.
