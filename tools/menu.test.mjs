import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';
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

test('standalone charter definitions are registered separately with a minimal vanilla hook', async () => {
  const hookFile = JSON.parse(await readFile(new URL('../packs/resource/ui/server_form.json',import.meta.url),'utf8'));
  const ui = JSON.parse(await readFile(new URL('../packs/resource/ui/jagsby_frontier/charter.json',import.meta.url),'utf8'));
  const registration = JSON.parse(await readFile(new URL('../packs/resource/ui/_ui_defs.json',import.meta.url),'utf8'));
  const hook='main_screen_content/server_form_factory';
  assert.deepEqual(hookFile, {namespace:'server_form',[hook]:{
    control_ids:{long_form:'@jagsby_frontier.jf_router',custom_form:'@jagsby_frontier.jf_modal_router'}}});
  assert.deepEqual(registration.ui_defs,['ui/jagsby_frontier/charter.json']);
  assert.equal(ui.namespace,'jagsby_frontier');
  assert.ok(ui.jf_router.controls.some(c=>c['vanilla@server_form.long_form']));
  assert.ok(ui.jf_router.controls.some(c=>c['charter@jagsby_frontier.jf_dashboard']));
  assert.equal(JSON.stringify(ui).toLowerCase().includes('minescape'),false);
  assert.equal(ui.long_form,undefined);
  assert.equal(JSON.stringify(ui.jf_dashboard).includes('long_form_dynamic_buttons_panel'),false);
});

test('four local sidebar toggles control custom pages without submitting form buttons', async () => {
  const ui=JSON.parse(await readFile(new URL('../packs/resource/ui/jagsby_frontier/charter.json',import.meta.url),'utf8'));
  for(const name of ['overview','research','production','stockpile']) {
    const tab=ui.jf_dashboard.controls.find(c=>c['jf_tab_'+name])['jf_tab_'+name];
    assert.equal(tab.type,'toggle');
    assert.equal(tab.radio_toggle_group,true);
    assert.equal(JSON.stringify(tab).includes('button.form_button_click'),false);
    const key=['overview','research'].includes(name)?name+'@jagsby_frontier.jf_'+name+'_content':name+'@common.scrolling_panel';
    const page=ui.jf_dashboard.controls.find(c=>c[key])[key];
    assert.ok(page.bindings.some(b=>b.source_control_name==='jf_tab_'+name && b.target_property_name==='#visible'));
    assert.ok(page.bindings.some(b=>b.source_control_name==='jf_tab_'+name && b.target_property_name==='#enabled'));
  }
});

test('all fixed data and action records agree with the generated script layout',async()=>{
  const ui=JSON.parse(await readFile(new URL('../packs/resource/ui/jagsby_frontier/charter.json',import.meta.url),'utf8'));
  const source=await readFile(new URL('../packs/behavior/scripts/charter-layout.js',import.meta.url),'utf8');
  const {CHARTER_LAYOUT:layout}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const indices=[];
  function walk(value) {
    if(!value||typeof value!=='object')return;
    if(Number.isInteger(value.collection_index))indices.push(value.collection_index);
    for(const child of Object.values(value))walk(child);
  }
  for(const name of ['overview','research_global','research_local','production','stockpile'])walk(ui['jf_'+name+'_content']);
  assert.deepEqual(indices.sort((a,b)=>a-b),Array.from({length:layout.recordCount},(_,i)=>i).filter(i=>i!==3));
  assert.equal(new Set(Object.values(layout.actions)).size,11);
  assert.equal(layout.actions.collect,23);
  assert.equal(layout.actions.efficiency,14);
});

test('overview is a fixed three-field panel with rename alongside the name',async()=>{
  const ui=JSON.parse(await readFile(new URL('../packs/resource/ui/jagsby_frontier/charter.json',import.meta.url),'utf8'));
  assert.equal(ui.jf_overview_content.type,'panel');
  assert.deepEqual(ui.jf_overview_content.size,[257,177]);
  assert.equal(JSON.stringify(ui.jf_overview_content).includes('scroll'),false);
  const controls=Object.assign({},...ui.jf_overview_content.controls);
  assert.deepEqual(Object.keys(controls),['name_label','name','rename','biome_label','biome','power_label','power']);
  for(const control of Object.values(controls)) {
    assert.ok(control.offset[1]+control.size[1]<=177,'Overview content must fit without scrolling');
  }
  assert.equal(controls.rename.offset[1],16);
  assert.equal(controls.rename.controls[0]['purchase@common.button'].collection_index,24);
});

test('overview binds distinct records on the labels and Rename button themselves',async()=>{
  const ui=JSON.parse(await readFile(new URL('../packs/resource/ui/jagsby_frontier/charter.json',import.meta.url),'utf8'));
  const controls=Object.assign({},...ui.jf_overview_content.controls);
  const records=['Oakfield','Plains','2.8'];
  const values=['name','biome','power'].map((name,index)=>{
    const text=controls[name].controls[0].value;
    assert.equal(text.collection_index,index,'Collection indices must be on the bound label, not only its container');
    assert.ok(text.bindings.some(b=>b.binding_name==='#form_button_text'));
    return records[text.collection_index];
  });
  assert.deepEqual(values,['Oakfield','Plains','2.8']);
  const button=controls.rename.controls[0]['purchase@common.button'];
  assert.equal(button.collection_index,24);
  assert.equal(button.$pressed_button_name,'button.form_button_click');
  assert.ok(button.button_mappings.every(m=>m.to_button_id==='button.form_button_click'));
  const submit=ui.jf_rename.controls.find(c=>c['submit@common.button'])['submit@common.button'];
  assert.ok(submit.button_mappings.every(m=>m.to_button_id==='button.submit_custom_form'));
});

test('Research has independent Global and Local toggles with the correct upgrade actions',async()=>{
  const ui=JSON.parse(await readFile(new URL('../packs/resource/ui/jagsby_frontier/charter.json',import.meta.url),'utf8'));
  const controls=Object.assign({},...ui.jf_research_content.controls);
  for(const scope of ['global','local']) {
    const toggle=controls['jf_research_tab_'+scope];
    assert.equal(toggle.toggle_name,'jagsby_frontier_research_tabs');
    assert.equal(toggle.radio_toggle_group,true);
    assert.equal(JSON.stringify(toggle).includes('button.form_button_click'),false);
    const page=controls[scope+'@common.scrolling_panel'];
    assert.ok(page.bindings.some(b=>b.source_control_name==='jf_research_tab_'+scope&&b.target_property_name==='#enabled'));
  }
  function actionIndices(value,result=[]) {
    if(value&&typeof value==='object') {
      if(value.$pressed_button_name==='button.form_button_click')result.push(value.collection_index);
      for(const child of Object.values(value))actionIndices(child,result);
    }
    return result;
  }
  assert.deepEqual(actionIndices(ui.jf_research_global_content),[17,18,19,20]);
  assert.deepEqual(actionIndices(ui.jf_research_local_content),[14,15,16]);
});

test('standalone UI references resolve to Frontier files and definitions',async()=>{
  const resourceRoot=new URL('../packs/resource/',import.meta.url);
  const ui=JSON.parse(await readFile(new URL('ui/jagsby_frontier/charter.json',resourceRoot),'utf8'));
  const textures=new Set();
  function walk(value) {
    if(typeof value==='string') {
      if(value.startsWith('textures/'))textures.add(value);
      const match=value.match(/^@?jagsby_frontier\.(\w+)$/);
      if(match)assert.ok(ui[match[1]],`Missing Frontier control: ${value}`);
    } else if(value&&typeof value==='object') {
      for(const [key,child]of Object.entries(value)) {
        if(key.includes('@jagsby_frontier.'))assert.ok(ui[key.split('@jagsby_frontier.')[1]]);
        walk(child);
      }
    }
  }
  walk(ui);
  for(const path of textures) {
    assert.ok(path.startsWith('textures/ui/frontier'),`Foreign texture: ${path}`);
    await access(new URL(path+'.png',resourceRoot));
  }
});
