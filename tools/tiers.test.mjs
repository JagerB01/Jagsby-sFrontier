import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
const source=await readFile(new URL('../packs/behavior/scripts/settlement-tiers.js',import.meta.url),'utf8');
const {settlementTier}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('agreed provisional tier boundaries use realm power 2, 5, 10 and 20',()=>{
  for(const [tenths,name]of [[0,'Outpost'],[19,'Outpost'],[20,'Hamlet'],[49,'Hamlet'],
    [50,'Village'],[99,'Village'],[100,'Town'],[199,'Town'],[200,'City'],[999,'City']]) {
    const tier=settlementTier({realmPowerTenths:tenths});
    assert.equal(tier.name,name);
    assert.equal(tier.label,name);
    assert.equal(tier.texture,'textures/ui/frontier/settlements/'+name.toLowerCase());
  }
});
test('partial rank observations use a labeled conservative tier and errors are not called exact tiers',()=>{
  const minimum=settlementTier({realmPowerTenths:null,minimumPowerTenths:60});
  assert.equal(minimum.id,'village');
  assert.equal(minimum.label,'≥ Village');
  for(const census of [undefined,{error:true},{realmPowerTenths:-1}]) {
    assert.equal(settlementTier(census).label,'Tier unavailable');
  }
});
