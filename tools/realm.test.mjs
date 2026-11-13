import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
const base=new URL('../packs/behavior/scripts/',import.meta.url);
const moduleURL=source=>`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
let source=await readFile(new URL('settlement-realm.js',base),'utf8');
for(const name of ['settlement-tiers.js','settlement-overview.js'])
  source=source.replace('"./'+name+'"',JSON.stringify(moduleURL(await readFile(new URL(name,base),'utf8'))));
const {ownerName,ownerRecord,claimSettlement,settlementDirectory}=await import(moduleURL(source));
const village=(i,owner)=>({id:String(i),name:'Settlement '+i,owner,location:{x:i*100,y:64,z:0},
  dimension:'minecraft:overworld',census:{realmPowerTenths:20}});

test('ownership tracks the placer and legacy claims cannot overwrite another owner',()=>{
  const player={id:'p',name:'Builder'},other={id:'q',name:'Other'};
  const state={villages:{a:village(1,null),b:village(2,ownerRecord(other))}};
  assert.equal(ownerName(state.villages.a),'Unclaimed');
  assert.equal(claimSettlement(state,'a',player),true);
  assert.equal(ownerName(state.villages.a),'Builder');
  assert.equal(claimSettlement(state,'b',player),false);
  assert.equal(state.villages.b.owner.id,'q');
});
test('Realm filters settlements by owner and paginates without summing overlapping power',()=>{
  const player={id:'p',name:'Builder'};
  const villages=Object.fromEntries(Array.from({length:7},(_,i)=>[String(i),village(i,i<4?ownerRecord(player):null)]));
  const mine=settlementDirectory(villages,player,0,true);
  assert.equal(mine.count,4);assert.equal(mine.pages,2);
  assert.match(mine.text,/Builder/);assert.match(mine.text,/2.0 RP/);
  const all=settlementDirectory(villages,player,999,false);
  assert.equal(all.count,7);assert.equal(all.page,2);assert.equal(all.pages,3);
  assert.match(all.text,/Unclaimed/);
  assert.equal(settlementDirectory(villages,player,-4,false).page,0);
  assert.match(settlementDirectory(villages,{id:'nobody'},0,true).text,/do not own/);
});
