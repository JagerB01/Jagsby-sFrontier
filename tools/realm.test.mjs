import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
const base=new URL('../packs/behavior/scripts/',import.meta.url);
const moduleURL=source=>`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
let source=await readFile(new URL('settlement-realm.js',base),'utf8');
source=source.replace('"./settlement-economy.js"',JSON.stringify(new URL('settlement-economy.js',base).href));
for(const name of ['settlement-tiers.js','settlement-overview.js'])
  source=source.replace('"./'+name+'"',JSON.stringify(moduleURL(await readFile(new URL(name,base),'utf8'))));
const {ownerName,ownerRecord,claimSettlement,settlementDirectory,directoryRoadState}=await import(moduleURL(source));
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
  assert.equal(mine.rows[0].owner,'Builder');assert.equal(mine.rows[0].icon,'textures/ui/frontier/settlement_icons/hamlet');
  const all=settlementDirectory(villages,player,999,false);
  assert.equal(all.count,7);assert.equal(all.page,2);assert.equal(all.pages,3);
  assert.equal(all.rows[0].owner,'Unclaimed');
  assert.equal(settlementDirectory(villages,player,-4,false).page,0);
  assert.match(settlementDirectory(villages,{id:'nobody'},0,true).empty,/do not own/);
});
test('two-line directory rows use uploaded tier icons, current-settlement distances and Development',()=>{
 const source={...village(0),roads:1},target={...village(1,{id:'p',name:'Builder'}),developmentValue:250,location:{x:3,y:200,z:4},census:{realmPowerTenths:null,minimumPowerTenths:20}};
 const result=settlementDirectory({a:source,b:target},{id:'p'},0,false,source);
 const row=result.rows.find(r=>r.id===target.id);
 assert.equal(row.owner,'Builder');assert.equal(row.coordinates,'3, 200, 4');assert.equal(row.distance,5);assert.equal(row.distanceText,'5 blocks');
 assert.equal(row.development,2);assert.equal(row.icon,'textures/ui/frontier/settlement_icons/hamlet');assert.equal(row.canEstablishRoad,true);
 const here=result.rows.find(r=>r.id===source.id);assert.equal(here.roadStatus,'Here');assert.equal(here.canEstablishRoad,false);
 const other={...target,dimension:'minecraft:nether'};
 const cross=settlementDirectory({b:other},{id:'p'},0,false,source).rows[0];assert.equal(cross.distance,null);assert.equal(cross.canEstablishRoad,false);
});
test('directory road states respect research, existing connections and construction',()=>{
 const source=village(0),target=village(1);
 assert.equal(directoryRoadState(source,target).canEstablish,false);source.roads=1;
 assert.equal(directoryRoadState(source,target).canEstablish,true);
 assert.equal(directoryRoadState(source,target,{legacy:{from:target.id,to:source.id,level:1}}).status,'Connected');
 assert.equal(directoryRoadState(source,target,{legacy:{from:target.id,to:source.id,level:0,targetLevel:1}}).status,'Building');
});
