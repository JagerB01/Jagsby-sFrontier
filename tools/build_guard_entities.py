"""Generate Frontier's manually spawnable guards and their client assets."""
import json
from pathlib import Path

from build_ui_art import Canvas

ROOT = Path(__file__).resolve().parents[1] / "packs"
BP, RP = ROOT / "behavior", ROOT / "resource"
NS = "jagsby_frontier"
FAMILY = "frontier_guard"
ROLES = {
    "swordsman": ("iron_sword", 24, (128, 57, 48), "#803930"),
    "arbalist": ("crossbow", 24, (60, 107, 85), "#3C6B55"),
    "lancer": ("iron_spear", 24, (59, 92, 137), "#3B5C89"),
    "juggernaut": ("iron_axe", 38, (134, 104, 55), "#866837"),
}


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def filter_(test, value, subject="self", **extra):
    return {"test": test, "subject": subject, "value": value, **extra}


def entity(identifier, spawnable, components, **extra):
    description = {"identifier": f"{NS}:{identifier}", "is_spawnable": spawnable, "is_summonable": True}
    description.update(extra.pop("description", {}))
    return {"format_version": "1.26.0",
            "minecraft:entity": {"description": description, "components": components, **extra}}


def mobility(health, speed, width, height, families):
    return {
        "minecraft:type_family": {"family": ["mob", *families]},
        "minecraft:health": {"value": health, "max": health},
        "minecraft:movement": {"value": speed},
        "minecraft:movement.basic": {},
        "minecraft:jump.static": {},
        "minecraft:navigation.walk": {"avoid_water": True, "avoid_damage_blocks": True},
        "minecraft:collision_box": {"width": width, "height": height},
        "minecraft:physics": {},
        "minecraft:pushable": {"is_pushable": True, "is_pushable_by_piston": True},
        "minecraft:nameable": {},
        "minecraft:persistent": {},
        "minecraft:behavior.float": {"priority": 0},
        "minecraft:behavior.random_stroll": {"priority": 8, "speed_multiplier": 0.9},
        "minecraft:behavior.look_at_player": {"priority": 9, "look_distance": 8},
        "minecraft:behavior.random_look_around": {"priority": 10},
    }


def arm_guard(role, identifier, mounted=False):
    _, health, _, _ = ROLES[role]
    families = [FAMILY]
    if mounted:
        families.append("frontier_horse_crew")
    components = mobility(health, 0.29, 0.6, 1.95, families)
    distance = 18 if role == "arbalist" else 13
    components.update({
        "minecraft:follow_range": {"value": 28},
        "minecraft:equipment": {
            "table": f"loot_tables/guards/{role}.json",
            "slot_drop_chance": [
                {"slot": "slot.weapon.mainhand", "drop_chance": 0},
                {"slot": "slot.weapon.offhand", "drop_chance": 0},
            ],
        },
        "minecraft:behavior.nearest_attackable_target": {
            "priority": 2,
            "must_see": True,
            "must_see_forget_duration": 3,
            "reselect_targets": True,
            "entity_types": [{"max_dist": distance, "filters": {"all_of": [
                filter_("is_family", "monster", "other"),
                filter_("is_family", "creeper", "other", operator="!="),
            ]}}],
        },
        "minecraft:damage_sensor": {"triggers": [
            {"cause": cause, "deals_damage": "no",
             "on_damage": {"filters": {"any_of": [
                 filter_("is_family", family, "other") for family in (FAMILY, "frontier_guard_mount")
             ]}}} for cause in ("entity_attack", "projectile")
        ]},
    })
    if role == "arbalist":
        components.update({
            "minecraft:behavior.charge_held_item": {"priority": 3, "items": ["minecraft:arrow"]},
            "minecraft:behavior.ranged_attack": {
                "priority": 4, "attack_interval": {"min": 2, "max": 2.5}, "attack_radius": 12,
            },
            "minecraft:shooter": {"def": "minecraft:arrow"},
        })
    else:
        components["minecraft:attack"] = {"damage": 6 if role == "juggernaut" else 7}
        components["minecraft:behavior.melee_box_attack"] = {
            "priority": 5 if role == "lancer" else 3, "track_target": True, "speed_multiplier": 1.05,
        }
    if role == "lancer":
        components["minecraft:behavior.use_kinetic_weapon"] = {
            "priority": 3,
            "approach_distance": 12 if mounted else 9,
            "reposition_distance": {"min": 7, "max": 9} if mounted else {"min": 5, "max": 7},
            "cooldown_distance": {"min": 9, "max": 11} if mounted else {"min": 7, "max": 9},
            "hijack_mount_navigation": mounted,
            "track_target": True,
            "speed_multiplier": 1.35 if mounted else 1,
            "reposition_speed_multiplier": 1.2 if mounted else 0.9,
        }
    extra = {}
    if role == "juggernaut":
        extra = shield_behavior(components)
    return entity(identifier, not mounted, components, **extra)


def shield_behavior(components):
    stance = f"{NS}:shield_stance"
    raise_shield, lower_shield, reset_shield = (f"{NS}:shield_{action}" for action in ("raise", "lower", "reset"))
    raised, recovering = (f"{NS}:shield_{state}" for state in ("raised", "recovering"))
    components["minecraft:knockback_resistance"] = {"value": 0.25}
    components["minecraft:environment_sensor"] = {"triggers": [
        {"filters": {"all_of": [
            filter_("enum_property", "ready", domain=stance),
            filter_("has_target", True),
            filter_("target_distance", 3, operator=">="),
            filter_("target_distance", 12, operator="<="),
        ]}, "event": raise_shield},
        {"filters": {"all_of": [
            filter_("enum_property", "raised", domain=stance),
            {"any_of": [filter_("has_target", False), filter_("target_distance", 2, operator="<=")]},
        ]}, "event": lower_shield},
    ]}

    def timer(seconds, event):
        return {"minecraft:timer": {"looping": False, "time": seconds,
                                    "time_down_event": {"event": event, "target": "self"}}}

    return {
        "description": {"properties": {
            stance: {"type": "enum", "values": ["ready", "raised", "recovering"],
                     "default": "ready", "client_sync": True},
        }},
        "component_groups": {
            raised: timer(3, lower_shield),
            recovering: timer(2, reset_shield),
        },
        "events": {
            raise_shield: {"add": {"component_groups": [raised]}, "set_property": {stance: "raised"}},
            lower_shield: {"remove": {"component_groups": [raised]},
                           "add": {"component_groups": [recovering]}, "set_property": {stance: "recovering"}},
            reset_shield: {"remove": {"component_groups": [recovering]}, "set_property": {stance: "ready"}},
        },
    }


def guard_horse():
    components = mobility(30, 0.23, 1.4, 1.6, ["frontier_guard_mount"])
    components.update({
        "minecraft:is_saddled": {},
        "minecraft:rideable": {
            "seat_count": 1, "controlling_seat": 0, "family_types": ["frontier_horse_crew"],
            "seats": [{"position": [0, 1.1, -0.2], "min_rider_count": 0, "max_rider_count": 1}],
        },
        "minecraft:behavior.mount_pathing": {"priority": 2, "track_target": True, "speed_multiplier": 1.1},
    })
    group = f"{NS}:mounted_crew"
    return entity("guard_horse", True, components,
                  component_groups={group: {"minecraft:addrider": {
                      "riders": [{"entity_type": f"{NS}:horse_lancer"}],
                  }}},
                  events={"minecraft:entity_spawned": {"add": {"component_groups": [group]}}})


def client(identifier, geometry, texture, animations, animate, egg, **extra):
    description = {
        "identifier": f"{NS}:{identifier}",
        "materials": {"default": "entity_alphatest"},
        "textures": {"default": texture},
        "geometry": {"default": geometry},
        "animations": animations,
        "scripts": {"animate": animate},
        "render_controllers": [f"controller.render.{NS}.guard"],
        **extra,
    }
    if egg:
        description["spawn_egg"] = {"base_color": egg, "overlay_color": "#D7B56D"}
    return {"format_version": "1.10.0", "minecraft:client_entity": {"description": description}}


def guard_client(role, identifier, egg):
    names = ["look", "walk", "ride"]
    animate = ["look", {"walk": "!query.is_riding"}, {"ride": "query.is_riding"}]
    if role == "arbalist":
        names.append("crossbow")
        animate.append("crossbow")
    else:
        names.append("swing")
        animate.append("swing")
    if role == "juggernaut":
        names.append("brace")
        animate.append({"brace": f"query.property('{NS}:shield_stance') == 'raised'"})
    return client(identifier, f"geometry.{NS}.guard",
                  f"textures/entity/{NS}/guards/{role}",
                  {name: f"animation.{NS}.guard.{name}" for name in names}, animate, egg,
                  enable_attachables=True)


def horse_client():
    data = client("guard_horse", "geometry.horse.v3", "textures/entity/horse2/horse_brown",
                  {"walk": "animation.horse.v3.walk"}, ["walk"], "#754836")
    description = data["minecraft:client_entity"]["description"]
    description["scripts"]["pre_animation"] = [
        "variable.stand_anim = 0;",
        "variable.leg_stand_factor = math.cos(query.modified_distance_moved * 38.38 + 180);",
        "variable.leg_x_rot_anim = variable.leg_stand_factor * 45.8 * query.modified_move_speed;",
    ]
    description["render_controllers"] = [f"controller.render.{NS}.guard_horse"]
    return data


def cube_bone(name, pivot, origin, size, uv, parent="root", **extra):
    return {"name": name, "parent": parent, "pivot": pivot,
            "cubes": [{"origin": origin, "size": size, "uv": uv, **extra}]}


def guard_geometry():
    return {"format_version": "1.12.0", "minecraft:geometry": [{
        "description": {"identifier": f"geometry.{NS}.guard", "texture_width": 64, "texture_height": 64,
                        "visible_bounds_width": 3, "visible_bounds_height": 3, "visible_bounds_offset": [0, 1.3, 0]},
        "bones": [
            {"name": "root", "pivot": [0, 0, 0]},
            cube_bone("body", [0, 23, 0], [-4, 11, -2.5], [8, 12, 5], [16, 17]),
            cube_bone("head", [0, 23, 0], [-4, 23, -4], [8, 9, 8], [0, 0]),
            cube_bone("crest", [0, 31, 0], [-0.5, 31, -2], [1, 2, 4], [42, 0], parent="head"),
            cube_bone("rightArm", [-5, 22, 0], [-8, 11, -2], [4, 12, 4], [44, 17]),
            cube_bone("leftArm", [5, 22, 0], [4, 11, -2], [4, 12, 4], [44, 17], mirror=True),
            {"name": "rightItem", "parent": "rightArm", "pivot": [-6, 13, 1]},
            {"name": "leftItem", "parent": "leftArm", "pivot": [6, 13, 1]},
            cube_bone("rightLeg", [-2, 11, 0], [-4, 0, -2], [4, 11, 4], [0, 20]),
            cube_bone("leftLeg", [2, 11, 0], [0, 0, -2], [4, 11, 4], [0, 20], mirror=True),
        ],
    }]}


def guard_animations():
    step = "math.cos(query.modified_distance_moved * 40) * math.min(1, query.modified_move_speed * 2) * 32"
    moves = {
        "look": {"head": ["query.target_x_rotation", "query.target_y_rotation", 0]},
        "walk": {"rightArm": [step, 0, 0], "leftArm": [f"-({step})", 0, 0],
                 "rightLeg": [f"-({step})", 0, 0], "leftLeg": [step, 0, 0]},
        "ride": {"rightLeg": [-65, 0, 17], "leftLeg": [-65, 0, -17]},
        "crossbow": {"rightArm": [-58, -12, 4], "leftArm": [-52, 27, -7]},
        "swing": {"rightArm": ["-math.sin(query.attack_time * 180) * 80", 0, 0]},
        "brace": {"leftArm": [-60, 13, -10]},
    }
    return {"format_version": "1.8.0", "animations": {
        f"animation.{NS}.guard.{name}": {"loop": True, "bones": {
            bone: {"rotation": rotation} for bone, rotation in bones.items()
        }} for name, bones in moves.items()
    }}


def guard_texture(role, accent):
    canvas = Canvas(64, 64, (0, 0, 0, 0))
    iron, edge, gold, leather, skin = (65, 74, 81), (114, 127, 132), (208, 172, 105), (63, 46, 38), (182, 125, 86)
    canvas.grain(0, 0, 32, 17, iron, 4)
    canvas.rect(8, 8, 8, 1, gold)
    canvas.rect(8, 10, 8, 5, skin)
    canvas.rect(9, 11, 2, 1, (55, 43, 36))
    canvas.rect(13, 11, 2, 1, (55, 43, 36))
    canvas.rect(10, 14, 4, 1, leather)
    canvas.rect(42, 0, 10, 6, accent)
    canvas.grain(0, 20, 16, 15, leather, 5)
    canvas.rect(0, 31, 16, 4, iron)
    canvas.rect(16, 17, 26, 17, iron)
    canvas.rect(16, 22, 26, 1, edge)
    canvas.rect(21, 24, 8, 6, accent)
    canvas.rect(24, 24, 2, 5, gold)
    canvas.rect(16, 31, 26, 2, leather)
    canvas.grain(44, 17, 16, 16, iron, 4)
    canvas.rect(44, 21, 16, 3, accent)
    canvas.rect(44, 31, 16, 2, skin)
    if role == "juggernaut":
        canvas.rect(44, 21, 16, 1, gold)
        canvas.rect(44, 26, 16, 1, edge)
    dest = RP / f"textures/entity/{NS}/guards"
    dest.mkdir(parents=True, exist_ok=True)
    canvas.save(dest / f"{role}.png")


def build():
    for role, (weapon, _, accent, egg) in ROLES.items():
        loot = [{"rolls": 1, "entries": [{"type": "item", "name": f"minecraft:{weapon}", "weight": 1}]}]
        if role == "juggernaut":
            loot.append({"rolls": 1, "entries": [{"type": "item", "name": "minecraft:shield", "weight": 1}]})
        write(BP / f"loot_tables/guards/{role}.json", {"pools": loot})
        write(BP / f"entities/guards/{role}.json", arm_guard(role, role))
        write(RP / f"entity/guards/{role}.entity.json", guard_client(role, role, egg))
        guard_texture(role, accent)
    write(BP / "entities/guards/horse_lancer.json", arm_guard("lancer", "horse_lancer", mounted=True))
    write(RP / "entity/guards/horse_lancer.entity.json", guard_client("lancer", "horse_lancer", None))
    write(BP / "entities/guards/guard_horse.json", guard_horse())
    write(RP / "entity/guards/guard_horse.entity.json", horse_client())
    write(RP / "models/entity/frontier_guard.geo.json", guard_geometry())
    write(RP / "animations/frontier_guard.animation.json", guard_animations())
    renderer = {"geometry": "Geometry.default", "materials": [{"*": "Material.default"}], "textures": ["Texture.default"]}
    write(RP / "render_controllers/frontier_guard.render_controllers.json", {
        "format_version": "1.8.0", "render_controllers": {
            f"controller.render.{NS}.guard": renderer,
            f"controller.render.{NS}.guard_horse": {**renderer, "part_visibility": [{"Bag*": False}, {"MuleEar*": False}]},
        },
    })


if __name__ == "__main__":
    build()
