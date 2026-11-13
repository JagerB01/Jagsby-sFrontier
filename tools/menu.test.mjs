import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../packs/behavior/scripts/menu-display.js', import.meta.url), 'utf8');
const { displayMenu } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('busy menu retries after a delay and returns the eventual selection', async () => {
  let calls = 0, waits = 0;
  const selection = { canceled:false, selection:2 };
  const response = await displayMenu({sendMessage() {assert.fail('Unexpected warning');}}, {
    show: async () => ++calls < 3 ? {canceled:true,cancelationReason:'UserBusy'} : selection,
  }, {runTimeout(resolve,ticks) { assert.equal(ticks,10); waits++; resolve(); }});
  assert.equal(response, selection);
  assert.equal(calls,3);
  assert.equal(waits,2);
});

test('closing a menu never retries or reopens it', async () => {
  let calls = 0;
  const response = await displayMenu({}, {show: async () => {
    calls++; return {canceled:true,cancelationReason:'UserClosed'};
  }}, {runTimeout() { assert.fail('Must not retry UserClosed'); }});
  assert.equal(response.canceled,true);
  assert.equal(calls,1);
});

test('busy retries are bounded and tell the player to try again', async () => {
  let calls = 0, warnings = 0;
  const response = await displayMenu({sendMessage() {warnings++;}}, {
    show: async () => {calls++; return {canceled:true,cancelationReason:'UserBusy'};},
  }, {runTimeout(resolve) {resolve();}});
  assert.equal(calls,4);
  assert.equal(warnings,1);
  assert.equal(response.canceled,true);
});

test('charter UI follows the MineScape nested factory hook and retains all existing definitions', async () => {
  const ui = JSON.parse(await readFile(new URL('../packs/resource/ui/server_form.json',import.meta.url),'utf8'));
  const reference = JSON.parse(await readFile(new URL('reference/minescape-1.5.119-server_form.json',import.meta.url),'utf8'));
  const hook='main_screen_content/server_form_factory';
  assert.equal(ui[hook].control_ids.long_form,'@server_form.jf_router');
  for(const [key,value] of Object.entries(reference)) {
    if(key!==hook) assert.deepEqual(ui[key],value,`MineScape definition changed: ${key}`);
  }
  assert.ok(ui.jf_router.controls.some(c=>c['minescape@server_form.minescape_form_router']));
  assert.ok(ui.jf_router.controls.some(c=>c['charter@server_form.jf_dashboard']));
  assert.equal(ui.long_form,undefined);
  assert.equal(JSON.stringify(ui.jf_dashboard).includes('long_form_dynamic_buttons_panel'),false);
});

test('four local sidebar toggles control custom pages without submitting form buttons', async () => {
  const ui=JSON.parse(await readFile(new URL('../packs/resource/ui/server_form.json',import.meta.url),'utf8'));
  for(const name of ['overview','research','production','stockpile']) {
    const tab=ui.jf_dashboard.controls.find(c=>c['jf_tab_'+name])['jf_tab_'+name];
    assert.equal(tab.type,'toggle');
    assert.equal(tab.radio_toggle_group,true);
    assert.equal(JSON.stringify(tab).includes('button.form_button_click'),false);
    const page=ui.jf_dashboard.controls.find(c=>c[name+'@common.scrolling_panel'])[name+'@common.scrolling_panel'];
    assert.ok(page.bindings.some(b=>b.source_control_name==='jf_tab_'+name && b.target_property_name==='#visible'));
    assert.ok(page.bindings.some(b=>b.source_control_name==='jf_tab_'+name && b.target_property_name==='#enabled'));
  }
});

test('all fixed data and action records agree with the generated script layout',async()=>{
  const ui=JSON.parse(await readFile(new URL('../packs/resource/ui/server_form.json',import.meta.url),'utf8'));
  const source=await readFile(new URL('../packs/behavior/scripts/charter-layout.js',import.meta.url),'utf8');
  const {CHARTER_LAYOUT:layout}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const indices=[];
  function walk(value) {
    if(!value||typeof value!=='object')return;
    if(Number.isInteger(value.collection_index))indices.push(value.collection_index);
    for(const child of Object.values(value))walk(child);
  }
  for(const name of ['overview','research','production','stockpile'])walk(ui['jf_'+name+'_content']);
  assert.deepEqual(indices.sort((a,b)=>a-b),Array.from({length:layout.recordCount},(_,i)=>i));
  assert.equal(new Set(Object.values(layout.actions)).size,11);
  assert.equal(layout.actions.collect,23);
  assert.equal(layout.actions.efficiency,14);
});
