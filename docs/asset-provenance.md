# Reference sources

## MineScape

The user supplied `MineScape_v1.5.119.mcaddon` for custom-menu integration.
`tools/reference/minescape-1.5.119-server_form.json` is its original resource UI.
`tools/reference/minescape-ui-assets.json` lists the UI/item assets copied from
that archive to preserve its existing dashboard routes. No behavior scripts from
MineScape are included in Frontier's behavior pack.

## Vanilla villagers

Both vanilla entity definitions come from Mojang's Bedrock samples, tag
`v1.26.0.2`, commit `6ecff5fb86d6149cec0507665ea5686f3800b193`:

- https://github.com/Mojang/bedrock-samples/blob/6ecff5fb86d6149cec0507665ea5686f3800b193/behavior_pack/entities/villager.json
- https://github.com/Mojang/bedrock-samples/blob/6ecff5fb86d6149cec0507665ea5686f3800b193/behavior_pack/entities/villager_v2.json

JSONC comments were removed when retaining normalized reference JSON; gameplay
data is unchanged. `tools/build_villager_bridge.py` adds exactly one namespaced
integer property and one sample event to each entity. Tests compare all other
fields against the retained vanilla source. See `licenses/Mojang-bedrock-samples-LICENSE.md`.

The Molang query is listed in Microsoft's query reference:
https://github.com/MicrosoftDocs/minecraft-creator/blob/main/creator/Reference/Content/MolangReference/Examples/MolangConcepts/QueryFunctions.md

Native entity event property updates and their delayed application are described at:
https://github.com/MicrosoftDocs/minecraft-creator/blob/main/creator/Documents/IntroductionToEntityProperties.md
