"""Integrate Villager Guards v1.4.9 into Frontier’s existing entity IDs."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "packs"
SOURCE = Path(__file__).with_name("vendor") / "villager-guards-1.4.9"
BP, RP = ROOT / "behavior", ROOT / "resource"
NS = "jagsby_frontier"
FAMILY = "frontier_guard"
PATROL_CHANNELS = 12
DWELLING_RETURN = "minecraft:behavior.move_towards_dwelling_restriction"
STROLL = "minecraft:behavior.random_stroll"
TERRAIN_SEARCH_HEIGHT = 8
GUARD_COLORS = [
    ("Standard", (208, 172, 105)),
    ("Red", (201, 56, 58)),
    ("Gold", (249, 204, 60)),
    ("Green", (93, 171, 70)),
    ("Teal", (56, 197, 186)),
    ("Blue", (73, 126, 232)),
    ("Purple", (176, 102, 222)),
    ("White", (237, 239, 227)),
    ("Orange", (235, 125, 52)),
]
ROLES = ("swordsman", "arbalist", "lancer", "juggernaut", "horse_lancer", "guard_horse")
BIOMES = ("plains", "desert", "jungle", "savanna", "snow", "swamp", "taiga")


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def filter_(test, value, subject="self", **extra):
    return {"test": test, "subject": subject, "value": value, **extra}


def original(path):
    return json.loads((SOURCE / path).read_text(encoding="utf-8-sig"))


def entity_ids(prefix):
    return {f"mn:{source_role(role)}": f"{NS}:{prefix}{role}" for role in ROLES}


def source_role(role):
    return "horse_destrier" if role == "guard_horse" else role


def remap_ids(value, ids):
    if isinstance(value, str):
        return ids.get(value, value)
    if isinstance(value, list):
        return [remap_ids(item, ids) for item in value]
    if isinstance(value, dict):
        return {ids.get(key, key): remap_ids(item, ids) for key, item in value.items()}
    return value


def patrol_goals(behavior, mount):
    guide = f"{NS}:patrol_guide"
    walk = f"{NS}:patrol_walk"
    behavior["description"].setdefault("properties", {})[guide] = {
        "type": "int", "range": [0, PATROL_CHANNELS], "default": 0}
    components = behavior["components"]
    groups = behavior.setdefault("component_groups", {})
    events = behavior.setdefault("events", {})
    stroll = components.get(STROLL) or groups["mn:on_foot"][STROLL]
    groups[walk] = {STROLL: {**stroll, "speed_multiplier": stroll["speed_multiplier"] * 0.75}}
    events[walk] = {"add": {"component_groups": [walk]}}
    if mount:
        return

    # Only provincial patrols run these goals. Keep original targeting and
    # attacks ahead of formation movement, and out-rank village wandering.
    for goal in ("move_through_village", "move_towards_dwelling_restriction"):
        key = "minecraft:behavior." + goal
        base = components.get(key) or groups["mn:on_foot"][key]
        groups[walk][key] = {**base, "priority": 9}
    follower_groups = []
    for channel in range(1, PATROL_CHANNELS + 1):
        follow = f"{NS}:patrol_follow_{channel}"
        follower_groups.append(follow)
        groups[follow] = {"minecraft:behavior.follow_mob": {
            "priority": 6, "search_range": 48, "stop_distance": 4, "speed_multiplier": 0.7,
            "filters": filter_("int_property", channel, subject="other", domain=guide),
        }}
        events[follow] = {"add": {"component_groups": [walk, follow]}}
    events[walk]["remove"] = {"component_groups": follower_groups}


def town_patrol():
    roads = ["grass_path", "cobblestone", "gravel"]
    return {
        "minecraft:dweller": {
            "dwelling_type": "village", "dweller_role": "defender",
            "can_find_poi": False, "can_migrate": False,
            "update_interval_base": 60, "update_interval_variant": 40,
        },
        "minecraft:preferred_path": {
            "default_block_cost": 1.5, "jump_cost": 1.5, "max_fall_blocks": 2,
            "preferred_path_blocks": [{"blocks": roads, "cost": 1}],
        },
        "minecraft:behavior.move_to_block": {
            "priority": 8, "speed_multiplier": 0.7, "search_range": 8, "search_height": TERRAIN_SEARCH_HEIGHT,
            "tick_interval": 100, "start_chance": 0.15, "goal_radius": 1.25,
            "target_blocks": [f"minecraft:{block}" for block in roads],
            "target_selection_method": "random", "target_offset": [0, 1, 0],
        },
        STROLL: {
            "priority": 9, "speed_multiplier": 0.7, "xz_dist": 24, "y_dist": TERRAIN_SEARCH_HEIGHT, "interval": 80,
        },
        "minecraft:behavior.move_through_village": {
            "priority": 10, "speed_multiplier": 0.7, "only_at_night": False,
        },
        "minecraft:behavior.look_at_player": {"priority": 11, "look_distance": 8},
        "minecraft:behavior.random_look_around": {"priority": 12},
    }


def behavior_profile(role, prefix):
    data = remap_ids(original(f"behavior/{source_role(role)}.json"), entity_ids(prefix))
    behavior = data["minecraft:entity"]
    description = behavior["description"]
    description["is_spawnable"] = False  # Existing Frontier eggs tag ownership.
    components = behavior["components"]
    families = components["minecraft:type_family"]["family"]
    mount = role == "guard_horse"
    components["minecraft:navigation.walk"].update({"can_jump": True, "avoid_damage_blocks": True})
    for goals in (components, *behavior.get("component_groups", {}).values()):
        if STROLL in goals:
            goals[STROLL]["y_dist"] = TERRAIN_SEARCH_HEIGHT
    if mount:
        families.append("frontier_guard_mount")
        # Commands retain the Frontier mounted-team spawn. SpawnGuard uses
        # the empty event and explicitly seats the rider for rollback on error.
        behavior["events"]["minecraft:entity_spawned"] = {"trigger": "mn:spawn_with_rider"}
        behavior["events"][f"{NS}:spawn_empty"] = {}
    else:
        families.append(FAMILY)
        # Horses already handle steps through their native runtime. Bedrock
        # supports this step-height component on the foot guards only.
        components["minecraft:variable_max_auto_step"] = {"base_value": 1.0}
        properties = description.setdefault("properties", {})
        properties[f"{NS}:squad_leader"] = {"type": "bool", "default": False, "client_sync": True}
        properties[f"{NS}:headband"] = {
            "type": "int", "range": [0, len(GUARD_COLORS) - 1], "default": 0, "client_sync": True}

    if prefix:
        if not mount:
            families.append("frontier_town_guard")
        # The Charter survey check already returns guards that leave their post.
        # Let idle movement cover the survey without the vanilla dwelling leash.
        components.pop(DWELLING_RETURN, None)
        components.update(town_patrol())
        if role == "arbalist":
            # The original on-foot event supplies these goals as a group.
            # Keep the town path preference when that group activates.
            on_foot = behavior["component_groups"]["mn:on_foot"]
            on_foot.pop(DWELLING_RETURN, None)
            for key in on_foot:
                on_foot[key] = components[key]
    else:
        patrol_goals(behavior, mount)
    return data


def client_profile(role, prefix):
    data = remap_ids(original(f"client/{source_role(role)}.entity.json"), entity_ids(prefix))
    client = data["minecraft:client_entity"]["description"]
    client.pop("spawn_egg", None)
    if role != "guard_horse":
        client["render_controllers"] = [frontier_render_id(name) for name in client["render_controllers"]]
        original_textures = client["textures"].copy()
        for band in range(1, len(GUARD_COLORS)):
            for biome in BIOMES:
                folder, filename = original_textures[biome].rsplit("/", 1)
                client["textures"][f"{biome}_band_{band}"] = f"{folder}/band_{band}/{filename}"
    return data


def frontier_render_id(name):
    return name.replace("controller.render.mn_", "controller.render.jagsby_frontier.")


def build_guard_eggs():
    textures = {}
    for prefix in ("", "town_"):
        for role in ROLES:
            if role == "horse_lancer":
                continue
            icon = "lancer" if role == "guard_horse" else role
            texture_key = f"mn_{icon}_egg"
            textures[texture_key] = {"textures": f"textures/items/{texture_key}"}
            name = prefix + role
            item = f"{name}_team_egg"
            write(BP / f"items/guard_eggs/{item}.json", {
                "format_version": "1.26.0", "minecraft:item": {
                    "description": {"identifier": f"{NS}:{item}",
                                    "menu_category": {"category": "nature", "group": "minecraft:itemGroup.name.mobEgg"}},
                    "components": {
                        "minecraft:icon": {"textures": {"default": texture_key}},
                        "minecraft:display_name": {"value": f"item.spawn_egg.entity.{NS}:{name}.name"},
                        "minecraft:entity_placer": {"entity": f"{NS}:{name}"},
                    },
                },
            })
    write(RP / "textures/item_texture.json", {
        "resource_pack_name": NS, "texture_name": "atlas.items", "texture_data": textures,
    })


def build():
    for prefix in ("", "town_"):
        for role in ROLES:
            identifier = prefix + role
            write(BP / f"entities/guards/{identifier}.json", behavior_profile(role, prefix))
            write(RP / f"entity/guards/{identifier}.entity.json", client_profile(role, prefix))
    build_guard_eggs()

    sounds = original("sounds.json")["entity_sounds"]["entities"]
    write(RP / "sounds.json", {"entity_sounds": {"entities": {
        target: sounds[source] for prefix in ("", "town_") for source, target in entity_ids(prefix).items()
    }}})
    render_file = "render_controllers/guard_villagers.render_controllers.json"
    render = original(render_file)
    controllers = render["render_controllers"]
    del controllers["controller.render.mn_healer"]
    for role in ("swordsman", "arbalist"):
        original_name = f"controller.render.mn_{role}"
        controller = controllers.pop(original_name)
        controllers[frontier_render_id(original_name)] = controller
        textures = controller["arrays"]["textures"]["Array.biomes"]
        textures.extend(f"Texture.{biome}_band_{band}" for band in range(1, len(GUARD_COLORS)) for biome in BIOMES)
        controller["textures"] = [f"Array.biomes[query.mark_variant + {len(BIOMES)} * query.property('{NS}:headband')]"]
    write(RP / render_file, render)

    palette = ", ".join(json.dumps(name) for name, _ in GUARD_COLORS)
    (BP / "scripts/guard-color-palette.js").write_text(
        f"// Generated by tools/build_guard_entities.py\nexport const GUARD_COLORS = [{palette}];\n", encoding="utf-8")


if __name__ == "__main__":
    build()
