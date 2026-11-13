import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import test from 'node:test';

const source=await readFile(new URL('../packs/behavior/scripts/villager-trade-bridge.js',import.meta.url),'utf8');
const {sampleTradingRanks}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('unsupported trade-rank bridge never invokes invalid events or trusts old cached properties',async()=>{
  const entity={id:'v',triggerEvent(){assert.fail('Unsupported event must not run');},
    getProperty(){assert.fail('Invalid bridge cache must not be trusted');}};
  const reader=await sampleTradingRanks([entity],{runTimeout(){assert.fail('No sampling timer is needed');}});
  assert.equal(reader(entity),undefined);
});

test('pack no longer overrides vanilla villagers with the rejected trade-tier Molang query',async()=>{
  for(const name of ['villager','villager_v2']) {
    await assert.rejects(access(new URL(`../packs/behavior/entities/${name}.json`,import.meta.url)),{code:'ENOENT'});
  }
  const build=await readFile(new URL('addon.py',import.meta.url),'utf8');
  assert.equal(build.includes('build_villager_bridge'),false);
});
