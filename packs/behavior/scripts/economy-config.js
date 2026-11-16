import {BIOME_RESOURCES} from './biome-resources.js';
// Finalized local research costs. Road stages take six Minecraft days. Food points are stored as half-corndogs.
export const ECONOMY_CONFIG = {
  baseCapacity:128, developmentThreshold:100, developmentBonus:0.001,
  prosperityBonus:0.05, boundaryRadius:32,
  categories:{common:{rate:0.35,value:1},building:{rate:0.15,value:2},uncommon:{rate:0.05,value:5},valuable:{rate:0.01,value:10}},
  resources:BIOME_RESOURCES,
  // Shared item count: two stacks initially, one more per completed upgrade.
  sharedStorage:{base:128,perLevel:64},
  researchMaterials:{crop:['minecraft:wheat','minecraft:potato','minecraft:carrot','minecraft:cocoa_beans','minecraft:bamboo']},
  research:{
    hearth:{name:'Hearthstone',max:2,cost:[64,128],material:'minecraft:bread',label:'Bread'},
    biome:{name:'Resource Prospecting',max:1,cost:64,material:'minecraft:paper',label:'Paper'},
    sanctuary:{name:'Sanctuary',cost:250,category:'crop',label:'Crops'},
    efficiency:{name:'Prosperity',cost:250,category:'building',label:'Building Materials'},
    roads:{name:'Road Networks',max:3,cost:[32,32,32],material:['minecraft:copper_ingot','minecraft:iron_ingot','minecraft:gold_ingot']},
  },
  roads:{constructionTicks:144000,foodPerBlock:0.01,foodCostMultipliers:[0,1,0.7,0.45],minimumFood:2},
  food:{'minecraft:bread':5,'minecraft:apple':4,'minecraft:carrot':3,'minecraft:potato':1,'minecraft:baked_potato':5,'minecraft:cooked_beef':8,'minecraft:cooked_porkchop':8,'minecraft:cooked_chicken':6,'minecraft:cooked_mutton':6,'minecraft:cooked_rabbit':5,'minecraft:cooked_cod':5,'minecraft:cooked_salmon':6,'minecraft:beetroot':1,'minecraft:dried_kelp':1,'minecraft:melon_slice':2,'minecraft:cookie':2,'minecraft:sweet_berries':2,'minecraft:glow_berries':2,'minecraft:beef':3,'minecraft:porkchop':3,'minecraft:chicken':2,'minecraft:mutton':2,'minecraft:rabbit':3,'minecraft:cod':2,'minecraft:salmon':2,'minecraft:tropical_fish':1,'minecraft:pufferfish':1,'minecraft:rotten_flesh':4,'minecraft:spider_eye':2,'minecraft:poisonous_potato':2,'minecraft:golden_apple':4,'minecraft:enchanted_golden_apple':4,'minecraft:chorus_fruit':4,'minecraft:honey_bottle':6,'minecraft:beetroot_soup':6,'minecraft:mushroom_stew':6,'minecraft:rabbit_stew':10,'minecraft:suspicious_stew':6,'minecraft:pumpkin_pie':8,'minecraft:golden_carrot':6},
};
