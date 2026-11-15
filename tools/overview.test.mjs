import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
const source=await readFile(new URL('../packs/behavior/scripts/settlement-overview.js',import.meta.url),'utf8');
const {settlementName,biomeName,powerValue,tradeRouteSummary,developmentRateText}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('rename accepts short names and rejects empty, oversized or formatted names',()=>{
  assert.equal(settlementName(' Oakfield '),'Oakfield');
  for(const value of ['', ' ', 'a'.repeat(25),'Oak\nfield','§cOakfield',null])assert.equal(settlementName(value),null);
});
test('compact overview uses a readable biome and a single power value',()=>{
  assert.equal(biomeName('minecraft:flower_forest'),'Flower Forest');
  assert.equal(biomeName('unknown'),'Unknown');
  assert.equal(powerValue({realmPowerTenths:12}),'1.2');
  assert.equal(powerValue({realmPowerTenths:null,minimumPowerTenths:4}),'0.4');
  assert.equal(powerValue({error:true}),'Unavailable');
});

test('Overview route summary identifies the route, construction, multiple routes and no route',()=>{
 const a={id:'a',name:'Home'},b={id:'b',name:'Rosefield'},c={id:'c',name:'A Very Long Village Name'};
 const s={villages:{a,b,c},roads:{}};
 assert.equal(tradeRouteSummary(s,a),'None');
 s.roads.ab={from:'a',to:'b',level:2};assert.equal(tradeRouteSummary(s,a),'Rosefield (Road)');
 s.roads.ab.targetLevel=3;assert.equal(tradeRouteSummary(s,a),'Rosefield (building)');
 s.roads.ac={from:'c',to:'a',level:1};
 const text=tradeRouteSummary(s,a);assert.ok(text.includes('(Trail) +1'));assert.ok(text.length<=24);
 s.roads.orphan={from:'a',to:'missing',level:3};assert.equal(tradeRouteSummary(s,a),text);
 delete s.roads.ab;delete s.roads.ac;assert.equal(tradeRouteSummary(s,a),'None');
});

test('Development/Hr uses a normal plus sign and three decimal places',()=>{
 assert.equal(developmentRateText(0),'0.000');assert.equal(developmentRateText(0.00156),'+ 0.002');
 assert.equal(developmentRateText(0.013),'+ 0.013');assert.equal(developmentRateText(1.236),'+ 1.236');
 assert.equal(developmentRateText(1200),'+ 1.200k');assert.equal(developmentRateText(1500000),'+ 1.500M');
});
