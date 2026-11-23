// Block offsets measured from the shipped Habitations 1.0.1 templates.
// Jigsaw rotation is handled by the survey. The patterns omit one-shot spawners.
export const HABITATIONS_PATTERNS = [
 // Camp town center, wild camp center and two small-camp variants.
 ['illager_camp','infested_cobblestone',[
  [-1,1,2,'stripped_spruce_log'],[0,1,3,'stone_bricks'],[-1,2,5,'iron_bars'],
 ]],
 ['illager_camp','campfire',[
  [0,0,-1,'dark_oak_shelf'],[0,-1,-3,'mossy_cobblestone'],[0,-1,-4,'stone_stairs'],
 ]],
 ['illager_camp','campfire',[
  [0,-1,0,'cobblestone'],[-1,-1,0,'grass_path'],[-2,0,2,'chest'],
 ]],
 ['illager_camp','campfire',[
  [-1,0,0,'dark_oak_shelf'],[0,-1,0,'cobblestone'],[3,0,1,'barrel'],
 ]],
 // Watchpost and watchtower.
 ['illager_outpost','infested_cobblestone',[
  [0,0,1,'stripped_spruce_log'],[-1,2,0,'dark_oak_shelf'],[-1,2,2,'iron_chain'],[1,5,0,'dark_oak_stairs'],
 ]],
 ['illager_outpost','wall_banner',[
  [0,0,-1,'stripped_spruce_log'],[-1,0,-1,'dark_oak_fence'],[0,1,1,'spruce_trapdoor'],[-1,1,1,'dark_oak_log'],
 ]],
 // Fortress and castle sections.
 ['illager_stronghold','rev:vindicator_minor_spawner',[
  [0,0,-1,'deepslate_tiles'],[0,1,-1,'deepslate_bricks'],[-1,0,-2,'polished_deepslate_wall'],[2,-1,-2,'spruce_shelf'],
 ]],
 ['illager_stronghold','wall_banner',[
  [0,1,0,'iron_bars'],[1,0,0,'stone_bricks'],[-2,0,-1,'andesite_wall'],
 ]],
 ['illager_stronghold','iron_chain',[
  [-1,-3,0,'smooth_stone_slab'],[-4,0,0,'stone_bricks'],[-1,-4,0,'iron_bars'],[4,4,-1,'deepslate_bricks'],
 ]],
];
