// Trial balance: road timing, food costs and research prices are configurable.
export const ECONOMY_CONFIG = {
  baseCapacity:128, developmentThreshold:500, developmentBonus:0.001,
  prosperityBonus:0.05, boundaryRadius:32,
  categories:{crop:{rate:0.35,value:1},building:{rate:0.15,value:2},uncommon:{rate:0.05,value:5},valuable:{rate:0.01,value:10}},
  resources:{
    'minecraft:plains':[{id:'minecraft:wheat',name:'Wheat',category:'crop'},{id:'minecraft:stone',name:'Stone',category:'building'}],
    'minecraft:forest':[{id:'minecraft:oak_log',name:'Oak Logs',category:'building'},{id:'minecraft:stone',name:'Stone',category:'building'}],
    'minecraft:taiga':[{id:'minecraft:spruce_log',name:'Spruce Logs',category:'building'},{id:'minecraft:stone',name:'Stone',category:'building'}],
    'minecraft:swamp':[{id:'minecraft:mud',name:'Mud',category:'building'},{id:'minecraft:clay_ball',name:'Clay',category:'uncommon'}],
    'minecraft:desert':[{id:'minecraft:sand',name:'Sand',category:'building'},{id:'minecraft:stone',name:'Stone',category:'building'}],
    'minecraft:jungle':[{id:'minecraft:cocoa_beans',name:'Cocoa Beans',category:'crop'},{id:'minecraft:jungle_log',name:'Jungle Logs',category:'building'}],
  },
  research:{
    hearth:[{'minecraft:gold_ingot':8,'minecraft:emerald':8},{'minecraft:gold_ingot':16,'minecraft:emerald':16}],
    biome:[{'minecraft:iron_ingot':32,'minecraft:emerald':16}],
    efficiency:{base:{'minecraft:iron_ingot':16,'minecraft:emerald':4},growth:1},
    sanctuary:{base:{'minecraft:iron_ingot':16,'minecraft:emerald':4},growth:1},
    roads:[{'minecraft:iron_ingot':24,'minecraft:emerald':8}],
  },
  roads:{minimumTicks:1200,ticksPerBlock:5,foodPerBlock:0.01,foodCostMultipliers:[0,1,0.7,0.45],minimumFood:2},
  food:{'minecraft:bread':5,'minecraft:apple':4,'minecraft:carrot':3,'minecraft:potato':1,'minecraft:baked_potato':5,'minecraft:cooked_beef':8,'minecraft:cooked_porkchop':8,'minecraft:cooked_chicken':6,'minecraft:cooked_mutton':6,'minecraft:cooked_rabbit':5,'minecraft:cooked_cod':5,'minecraft:cooked_salmon':6,'minecraft:beetroot':1,'minecraft:dried_kelp':1,'minecraft:melon_slice':2,'minecraft:cookie':2,'minecraft:sweet_berries':2,'minecraft:glow_berries':2,'minecraft:beef':3,'minecraft:porkchop':3,'minecraft:chicken':2,'minecraft:mutton':2,'minecraft:rabbit':3,'minecraft:cod':2,'minecraft:salmon':2,'minecraft:tropical_fish':1,'minecraft:pufferfish':1,'minecraft:rotten_flesh':4,'minecraft:spider_eye':2,'minecraft:poisonous_potato':2,'minecraft:golden_apple':4,'minecraft:enchanted_golden_apple':4,'minecraft:chorus_fruit':4,'minecraft:honey_bottle':6,'minecraft:beetroot_soup':6,'minecraft:mushroom_stew':6,'minecraft:rabbit_stew':10,'minecraft:suspicious_stew':6,'minecraft:pumpkin_pie':8,'minecraft:golden_carrot':6},
};
