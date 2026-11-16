import assert from 'node:assert/strict';
import test from 'node:test';
import {preventClosePlacement,CHARTER_BLOCKED_MESSAGE} from '../packs/behavior/scripts/charter-placement.js';
const dimension='minecraft:overworld';
const charter={dimension,location:{x:0,y:64,z:0}};
function attempt(location,state={villages:{legacy:charter}} ,dim=dimension){
  const messages=[],queued=[];
  const event={cancel:false,block:{dimension:{id:dim},location},player:{sendMessage:m=>messages.push(m)}};
  preventClosePlacement(event,state,fn=>queued.push(fn));
  return {event,messages,queued};
}
test('blocks same-dimension placements within and exactly at the 80-block census radius',()=>{
  for(const location of [{x:0,y:64,z:0},{x:80,y:64,z:0},{x:48,y:64,z:64},{x:0,y:144,z:0}]){
    const result=attempt(location);
    assert.equal(result.event.cancel,true);
    assert.deepEqual(result.messages,[]);
    result.queued[0]();
    assert.deepEqual(result.messages,[CHARTER_BLOCKED_MESSAGE]);
  }
});
test('allows outside the sphere, empty worlds and other dimensions',()=>{
  for(const result of [attempt({x:81,y:64,z:0}),attempt({x:60,y:64,z:60}),attempt(charter.location,{}),attempt(charter.location,undefined,'minecraft:nether')]){
    assert.equal(result.event.cancel,false);assert.equal(result.queued.length,0);
  }
});
test('physical charters block placement even without an established settlement; removal frees space',()=>{
  const state={placedCharters:{one:charter}};
  assert.equal(attempt(charter.location,state).event.cancel,true);
  delete state.placedCharters.one;
  assert.equal(attempt(charter.location,state).event.cancel,false);
});
