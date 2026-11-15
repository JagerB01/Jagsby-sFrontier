# Village Charter crafting — 0.0.56

Use a crafting table (3×3):

| Plank | Plank | Plank |
|---|---|---|
| Plank | Lectern | Plank |
| Cobblestone | Cobblestone | Cobblestone |

This consumes five planks, one lectern and three cobblestone and produces one
Village Charter. Planks use the native `minecraft:planks` tag, matching vanilla
chest recipes; supported wood types may be mixed.

The shaped recipe is registered under `jagsby_frontier:village_charter` with
`crafting_table` tags. The output references the existing placeable block, whose
Construction menu category and resource-pack display name remain enabled.

Recipe discovery uses independent item unlock conditions for a lectern,
cobblestone and oak, spruce, birch, jungle, acacia, dark oak, mangrove, cherry,
bamboo, crimson, warped, pale oak and poplar planks. All 15 item IDs were checked
against `@minecraft/vanilla-data@1.26.40`. Format 1.20.10 matches the official
vanilla shaped-recipe examples and supports item unlock conditions on the pack's
target engine.

Obtaining any listed ingredient unlocks discovery. The recipe book's **All**
view can show the recipe while ingredients are missing. **Craftable Only**
intentionally hides recipes until the full ingredients are available; the addon
does not bypass this vanilla filter or allow crafting with partial materials.

After placing the charter, open it and press **Survey** to record villagers,
Realm Power and nearby biome choices. Later menu opens use cached values; press
Survey again after villagers are added/promoted or nearby chunks are explored.

References:

- [Vanilla lectern recipe and unlock syntax](https://github.com/Mojang/bedrock-samples/blob/main/behavior_pack/recipes/lectern.json)
- [Vanilla chest recipe and planks tag](https://github.com/Mojang/bedrock-samples/blob/main/behavior_pack/recipes/chest.json)
- [Recipe unlocking documentation](https://wiki.bedrock.dev/loot/recipes#recipe-unlocking)

Automated checks validate registration, shape, ingredients, output, display name
and discovery conditions. The native crafting UI must still be checked in-game.
