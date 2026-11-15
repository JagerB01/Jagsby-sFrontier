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
