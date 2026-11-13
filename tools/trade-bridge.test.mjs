import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const source=await readFile(new URL('../packs/behavior/scripts/villager-trade-bridge.js',import.meta.url),'utf8');
const {sampleTradingRanks}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('bridge triggers native sampling only on request and waits for property commit',async()=>{
  let tier=0,committed=-1,triggers=0,waits=0;
  const entity={id:'v',triggerEvent(name){assert.equal(name,'jagsby_frontier:sample_trade_tier');triggers++;},
    getProperty(name){assert.equal(name,'jagsby_frontier:trade_tier');return committed;}};
  const system={runTimeout(resolve,ticks){assert.equal(ticks,2);waits++;committed=tier;resolve();}};
  assert.equal(triggers,0);
  assert.equal((await sampleTradingRanks([entity],system))(entity),0);
  tier=4;
  assert.equal((await sampleTradingRanks([entity],system))(entity),4);
  assert.equal(triggers,2);assert.equal(waits,2);
});

test('missing/incompatible entity bridge is unknown, not silently scored as novice',async()=>{
  const entities=[{id:'missing',triggerEvent(){throw Error('missing');}},
    {id:'default',triggerEvent(){},getProperty(){return -1;}},
    {id:'removed',triggerEvent(){},getProperty(){throw Error('removed');}}];
  const reader=await sampleTradingRanks(entities,{runTimeout:resolve=>resolve()});
  for(const entity of entities)assert.equal(reader(entity),undefined);
});

test('villager overrides only add the namespaced bridge; vanilla trades and AI are retained',async()=>{
  for(const name of ['villager','villager_v2']) {
    const baseline=JSON.parse(await readFile(new URL(`reference/vanilla-1.26.0-${name}.json`,import.meta.url),'utf8'));
    const generated=JSON.parse(await readFile(new URL(`../packs/behavior/entities/${name}.json`,import.meta.url),'utf8'));
    const entity=generated['minecraft:entity'];
    assert.deepEqual(entity.description.properties['jagsby_frontier:trade_tier'],{
      type:'int',range:[-1,4],default:-1,client_sync:false});
    assert.equal(entity.events['jagsby_frontier:sample_trade_tier'].set_property['jagsby_frontier:trade_tier'],
      'math.clamp(query.trade_tier, 0, 4)');
    delete entity.description.properties['jagsby_frontier:trade_tier'];
    if(!Object.keys(entity.description.properties).length)delete entity.description.properties;
    delete entity.events['jagsby_frontier:sample_trade_tier'];
    assert.deepEqual(generated,baseline);
  }
});
