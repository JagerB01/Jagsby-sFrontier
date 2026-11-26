import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
const root=new URL('../',import.meta.url);
const recipe=JSON.parse(await readFile(new URL('packs/behavior/recipes/village_charter.json',root),'utf8'));
const shaped=recipe['minecraft:recipe_shaped'];
const plankItems=['oak','spruce','birch','jungle','acacia','dark_oak','mangrove','cherry','bamboo','crimson','warped','pale_oak','poplar'].map(wood=>'minecraft:'+wood+'_planks');
test('Village Charter is a 3x3 crafting-table recipe with five planks, a lectern and three cobblestone',()=>{
 assert.deepEqual(shaped.tags,['crafting_table']);assert.deepEqual(shaped.pattern,['PPP','PLP','CCC']);
 assert.deepEqual(shaped.key.P,{tag:'minecraft:planks'});assert.deepEqual(shaped.key.L,{item:'minecraft:lectern'});assert.deepEqual(shaped.key.C,{item:'minecraft:cobblestone'});
 const slots=shaped.pattern.join('');assert.equal([...slots].filter(c=>c==='P').length,5);assert.equal([...slots].filter(c=>c==='L').length,1);assert.equal([...slots].filter(c=>c==='C').length,3);
 assert.deepEqual(shaped.result,{item:'jagsby_frontier:village_charter',count:1});
});
test('Recipe-book unlock rules cover each ingredient and every target-version plank type',()=>{
 const unlock=shaped.unlock.map(condition=>condition.item);
 assert.equal(new Set(unlock).size,15);
 for(const id of ['minecraft:lectern','minecraft:cobblestone',...plankItems])assert.ok(unlock.includes(id),id+' must independently unlock discovery');
 assert.equal(recipe.format_version,'1.20.10');
});
test('Crafting result is the registered, visible Village Charter block with a display name',async()=>{
 const block=JSON.parse(await readFile(new URL('packs/behavior/blocks/village_charter.json',root),'utf8'))['minecraft:block'];
 assert.equal(shaped.result.item,block.description.identifier);assert.equal(block.description.menu_category.category,'construction');
 const language=await readFile(new URL('packs/resource/texts/en_US.lang',root),'utf8');
 assert.ok(language.includes('tile.jagsby_frontier:village_charter.name=Village Charter'));
});

test('The two station recipes ship unlocked, with the agreed ingredients and block assets',async()=>{
 const terrain=JSON.parse(await readFile(new URL('packs/resource/textures/terrain_texture.json',root),'utf8'));
 for(const [slug,pattern,key] of [
  ['waystone',['P','C','C'],{P:{item:'minecraft:compass'},C:{item:'minecraft:cobblestone'}}],
  ['map_table',[' M ','PPP'],{M:{item:'minecraft:empty_map'},P:{tag:'minecraft:planks'}}],
 ]){
  const read=async (path)=>JSON.parse(await readFile(new URL(path,root),'utf8'));
  const shaped=(await read(`packs/behavior/recipes/${slug}.json`))['minecraft:recipe_shaped'];
  const block=(await read(`packs/behavior/blocks/${slug}.json`))['minecraft:block'];
  const geometry=await read(`packs/resource/models/blocks/${slug}.geo.json`);
  assert.deepEqual(shaped.tags,['crafting_table']);
  assert.deepEqual(shaped.unlock,[{context:'AlwaysUnlocked'}]);
  assert.deepEqual(shaped.pattern,pattern);
  assert.deepEqual(shaped.key,key);
  assert.deepEqual(shaped.result,{item:block.description.identifier,count:1});
  assert.equal(block.components['minecraft:geometry'],geometry['minecraft:geometry'][0].description.identifier);
  const texture=terrain.texture_data[block.components['minecraft:material_instances']['*'].texture].textures;
  await readFile(new URL(`packs/resource/${texture}.png`,root));
 }
});

test('Charter, Waystone and Map Table all have four-way placement direction',async()=>{
 for(const slug of ['village_charter','waystone','map_table']){
  const block=JSON.parse(await readFile(new URL(`packs/behavior/blocks/${slug}.json`,root),'utf8'))['minecraft:block'];
  assert.deepEqual(block.description.traits['minecraft:placement_direction'],{
   enabled_states:['minecraft:cardinal_direction'],y_rotation_offset:180,
  });
  assert.deepEqual(block.permutations.map(perm=>perm.condition.match(/'([^']+)'$/)[1]),['north','east','south','west']);
  assert.deepEqual(block.permutations.map(perm=>perm.components['minecraft:transformation'].rotation),[
   [0,0,0],[0,-90,0],[0,180,0],[0,90,0],
  ]);
 }
});
