import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
const source=await readFile(new URL('../packs/behavior/scripts/settlement-overview.js',import.meta.url),'utf8');
const {settlementName,biomeName,powerValue}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('rename accepts short names and rejects empty, oversized or formatted names',()=>{
  assert.equal(settlementName(' Oakfield '),'Oakfield');
  for(const value of ['', ' ', 'a'.repeat(25),'Oak\nfield','§cOakfield',null])assert.equal(settlementName(value),null);
});
test('compact overview uses a readable biome and a single power value',()=>{
  assert.equal(biomeName('minecraft:flower_forest'),'Flower Forest');
  assert.equal(biomeName('unknown'),'Unknown');
  assert.equal(powerValue({realmPowerTenths:12}),'1.2');
  assert.equal(powerValue({realmPowerTenths:null,minimumPowerTenths:4}),'≥ 0.4');
  assert.equal(powerValue({error:true}),'Unavailable');
});
