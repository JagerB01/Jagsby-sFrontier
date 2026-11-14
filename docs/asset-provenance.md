# Reference sources

## Frontier UI

The user supplied MineScape 1.5.119 as a technical reference. No MineScape UI
files or textures are included in the current pack. The copies introduced in
0.0.4 were removed in 0.0.5. Frontier's own controls are in its own namespace and
file. Its frame and sidebar artwork are generated from original pixel shapes by
`tools/build_ui_art.py`; the initial charter textures and block model came from
the user's Frontier prototype.

## Vanilla villagers

Both vanilla entity definitions come from Mojang's Bedrock samples, tag
`v1.26.0.2`, commit `6ecff5fb86d6149cec0507665ea5686f3800b193`:

- https://github.com/Mojang/bedrock-samples/blob/6ecff5fb86d6149cec0507665ea5686f3800b193/behavior_pack/entities/villager.json
- https://github.com/Mojang/bedrock-samples/blob/6ecff5fb86d6149cec0507665ea5686f3800b193/behavior_pack/entities/villager_v2.json

JSONC comments were removed when retaining normalized reference JSON; gameplay
data is unchanged in the retained references. The villager bridge builder and
its generated entity overrides were removed in 0.0.10 after the live content log
rejected its Molang query context. These files are historical references, not
active pack entities. See `licenses/Mojang-bedrock-samples-LICENSE.md`.

The Molang query is listed in Microsoft's query reference:
https://github.com/MicrosoftDocs/minecraft-creator/blob/main/creator/Reference/Content/MolangReference/Examples/MolangConcepts/QueryFunctions.md

Native entity event property updates and their delayed application are described at:
https://github.com/MicrosoftDocs/minecraft-creator/blob/main/creator/Documents/IntroductionToEntityProperties.md

## Controller bridge reintroduced in 0.0.12

The vanilla entity references are used again by the new server-controller bridge.
`tools/build_villager_bridge.py` calls the same parameterized entity/controller
generation used by the probe, with the production namespace and five rank states.
It preserves the original components, AI and trades, and keeps native tier queries
out of set_property events. The user confirmed the probe's raw Apprentice reading.

## Global research sprites (0.0.15)

AI-generated art selected by the user: original option A for Settlement Charters,
Frontier Mandate, Stewardship and Hoards; alternative B for Reclamation.
Transparent sprite strip generated 2026-11-13, source
`exec-d9a10841-7863-4dec-b499-8e531ab0540e.png`. Each isolated icon was trimmed,
nearest-neighbor resized to fit 60×60 and centered in a transparent 64×64 PNG,
with binary alpha. No MineScape assets are included. Button faces are generated
by `tools/build_ui_art.py`.

## Charter surfaces (0.0.19)

Original procedural charcoal/brass/crimson UI textures replace the earlier
procedural stone/plank/parchment surfaces. Authored in `tools/build_ui_art.py`;
no MineScape textures or UI definitions were copied.

## Silver-and-wheat border (0.0.20)

Original AI-generated frame, guided by the user's harvest gold / silver palette
reference. No Elder Scrolls logo, emblem or game art was copied into the addon.
Source generation `exec-515f4a19-00ea-4256-b0b1-ec432479bca2.png` refines
the earlier raised-crest concept. Mechanically nearest-neighbor resized to
380×240 with binary alpha as `textures/ui/frontier/harvest_border.png`.
The transparent ornament is separate from the procedural base panel.

## Restored first frame (0.0.21)

`harvest_border.png` now uses the user's preferred initial generation
`exec-9fb207c7-7d27-4286-a304-508093800201.png`, including its original
village crest. It was mechanically nearest-neighbor resized to 380×240 with
binary alpha. The companion procedural base is RGBA so its exterior does not
obscure the transparent border silhouette.

## Realm and Information sprites (0.0.22)

User selected row A for both from original concept sheet
`exec-1e6417b9-771e-443b-a599-b58c478715f0.png`. Transparent extraction
generation `exec-42b0b859-cb6a-40fb-adf1-5a45c14bc2a5.png` was split into
two square cells, trimmed, nearest-neighbor resized to fit 60×60, and centered
on transparent 64×64 PNG canvases with binary alpha. These replace the former
procedurally painted Realm sidebar icon.

## Matching interior materials (0.0.23)

Original AI-generated assets were created using Frontier's own harvest border
as a style reference. `exec-8a9e86fe-3340-4ed4-9639-eb800fef5caf.png` is the
crimson leather and silver/wheat button; it was trimmed and nearest-neighbor
resized to 176×56 (`material_button.png`).
`exec-815b8045-5a04-4627-8389-ed9353c261c3.png` is the matching brown leather
panel, trimmed and resized to 294×210 (`material_panel.png`). An interior
1000×700 crop at +240+180, resized to 364×189, supplies the quiet leather
lining (`material_leather.png`). Button and panel use binary alpha.
No third-party game textures were used.

## Charcoal, silver, ivory and wheat palette (0.0.24)

`palette_button.png`, `palette_panel.png` and `palette_leather.png` are original
procedural textures generated by `tools/build_ui_art.py`, using charcoal grain,
aged-silver bevels and small wheat-gold corner details. Shared text colors live
in `tools/build_charter_ui.py`. Existing icons and portraits are retained.
The supplied D2 reference was cleaned through image generation (`exec-be425f40-f59a-4006-ac46-1ae5b19014f7.png`), alpha-thresholded to remove background haze, trimmed and nearest-neighbor resized to 380×240 as `harvest_border.png`. This is a cleaned generated adaptation of the supplied frame.

## Refined buttons (0.0.25)

Original procedural button textures are generated by `button_texture` in
`tools/build_ui_art.py` at each control's native dimensions. Separate normal,
hover, pressed and selected states use silver bevels, charcoal grain and
wheat-gold corner engraving. No new third-party artwork is included.

## Realm map palette (0.0.29)

The map's fourteen 7×7 terrain and marker tiles are original procedural assets
from `tools/build_ui_art.py`. The supplied Advanced Minimap v4 by ExterLeo was
inspected as a technical reference. Its scripts, textures, glyph pages and UI
files are not included or required. Frontier uses its own shared surface cache
and native form image collections instead of overriding HUD titles or fonts.

## Supplied Local research icons (0.0.30)

The user supplied `Jagsbys_Frontier_Local_Icons_Matched.zip`. Its five original
64×64 RGBA files are copied byte-for-byte to `textures/ui/frontier/research/`:
`hearthstone.png`, `resource_prospecting.png`, `sanctuary.png`, `prosperity.png`
and `road_networks.png`. The comparison preview is not packaged. No icon
regeneration, recoloring or extraction from the layout screenshot was used.
