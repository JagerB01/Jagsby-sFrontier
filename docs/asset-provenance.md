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
