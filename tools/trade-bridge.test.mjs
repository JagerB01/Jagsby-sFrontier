import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const source=await readFile(new URL('../packs/behavior/scripts/villager-trade-bridge.js',import.meta.url),'utf8');
const {sampleTradingRanks}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('fresh controller results read actual ranks after one batch wait',async()=>{
  let raw=1,requests=0;
  const entity={id:'rank-change',triggerEvent(name){if(name.endsWith('request'))requests++;},
    getProperty(name){return name.endsWith('ready')?true:raw;}};
  const system={runTimeout(resolve,ticks){assert.equal(ticks,10);resolve();}};
  assert.equal((await sampleTradingRanks([entity],system))(entity),1);
  raw=4;
  assert.equal((await sampleTradingRanks([entity],system))(entity),4);
  assert.equal(requests,2);
});
test('overlapping players share in-flight entity samples',async()=>{
  const callbacks=[];let requests=0;
  const entity={id:'shared',triggerEvent(name){if(name.endsWith('request'))requests++;},
    getProperty(name){return name.endsWith('ready')?true:2;}};
  const system={runTimeout:fn=>callbacks.push(fn)};
  const a=sampleTradingRanks([entity],system),b=sampleTradingRanks([entity],system);
  assert.equal(requests,1);assert.equal(callbacks.length,1);
  callbacks.shift()();
  assert.equal((await a)(entity),2);assert.equal((await b)(entity),2);
});
test('unranked professions contribute the base tier without querying trade tiers',async()=>{
  const entities=[0,14].map(value=>({id:'unranked-'+value,getComponent:()=>({value}),
    triggerEvent(){assert.fail('Unranked entity needs no native trade query');}}));
  const read=await sampleTradingRanks(entities,{runTimeout(){assert.fail('No wait needed');}});
  for(const entity of entities)assert.equal(read(entity),0);
});
test('incomplete or invalid controller results remain unknown',async()=>{
  for(const [ready,raw]of [[false,1],[true,-1],[true,5]]) {
    const entity={id:`invalid-${ready}-${raw}`,triggerEvent(){},getProperty:name=>name.endsWith('ready')?ready:raw};
    assert.equal((await sampleTradingRanks([entity],{runTimeout:fn=>fn()}))(entity),undefined);
  }
});
test('rank queries stay in controller transitions, while native property events are literal only',async()=>{
  for(const name of ['villager','villager_v2']) {
    const entity=JSON.parse(await readFile(new URL(`../packs/behavior/entities/${name}.json`,import.meta.url),'utf8'))['minecraft:entity'];
    for(const [key,event]of Object.entries(entity.events))if(key.startsWith('jagsby_frontier:')) {
      assert.ok(Object.values(event.set_property).every(value=>typeof value==='number'||typeof value==='boolean'));
    }
    const baseline=JSON.parse(await readFile(new URL(`reference/vanilla-1.26.0-${name}.json`,import.meta.url),'utf8'))['minecraft:entity'];
    assert.deepEqual(entity.components,baseline.components);
    assert.deepEqual(entity.component_groups,baseline.component_groups);
  }
  const controller=JSON.parse(await readFile(new URL('../packs/behavior/animation_controllers/frontier_trade_rank.json',import.meta.url),'utf8'));
  const states=controller.animation_controllers['controller.animation.jagsby_frontier.trade_rank'].states;
  assert.equal(states.requested.transitions.length,6);
  assert.equal(JSON.stringify(states.default).includes('query.trade_tier'),false);
});
