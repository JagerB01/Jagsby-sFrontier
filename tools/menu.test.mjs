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

const uiFile=new URL('../packs/resource/ui/jagsby_frontier/charter.json',import.meta.url);
const loadUI=async()=>JSON.parse(await readFile(uiFile,'utf8'));
const children=control=>Object.assign({},...control.controls);
const template=(ui,name)=>ui[name]??ui[Object.keys(ui).find(key=>key.split('@')[0]===name)];

test('record bindings use collection-capable stack panels and explicitly indexed native children',async()=>{
  const ui=await loadUI();
  function validateScope(value) {
    if(value && typeof value==='object') {
      if('collection_name' in value) assert.equal(value.type,'stack_panel',
        'Content log regression: collection_name is unsupported on plain panel');
      for(const child of Object.values(value))validateScope(child);
    }
  }
  validateScope(ui);
  const layoutSource=await readFile(new URL('../packs/behavior/scripts/charter-layout.js',import.meta.url),'utf8');
  const {CHARTER_LAYOUT:layout}=await import(`data:text/javascript;base64,${Buffer.from(layoutSource).toString('base64')}`);
  for(const key of Object.keys(layout.data).filter(key=>key!=='civilization')) {
    const label=ui['jf_data_'+key];
    assert.equal(label.type,'label');
    assert.ok(label.bindings.some(b=>b.source_property_name===`(#record_text - '[JF:data:${key}]')`&&b.target_property_name==='#text'));
    assert.ok(label.bindings.some(b=>b.binding_name==='#form_button_text'&&b.binding_type==='collection'));
  }
  for(const key of Object.keys(layout.actions)) {
    const button=template(ui,'jf_action_'+key);
    assert.ok(button.bindings.some(b=>b.source_property_name===`(#form_button_text = '[JF:action:${key}]')`&&b.target_property_name==='#enabled'));
    assert.ok(button.bindings.some(b=>b.binding_type==='collection_details'));
  }
});

test('Overview has three non-scrolling fields, while Rename is in the top header',async()=>{
  const ui=await loadUI();
  assert.equal(ui.jf_overview_content.type,'panel');
  assert.deepEqual(ui.jf_overview_content.size,[257,177]);
  assert.equal(JSON.stringify(ui.jf_overview_content).includes('scroll'),false);
  const fields=children(ui.jf_overview_content);
  assert.deepEqual(Object.keys(fields),['portrait','name_label','name','tier','divider','biome_label','biome','power_label','power']);
  for(const control of Object.values(fields))assert.ok(control.offset[1]+control.size[1]<=177);
  const header=children(ui.jf_dashboard).header_rename;
  assert.ok(header.offset[1]+header.size[1]<=37,'Rename must fit inside the crimson top bar');
  assert.equal(header.type,'stack_panel');
  assert.deepEqual(header.controls,[{'record@jagsby_frontier.jf_action_rename':{collection_index:24}}]);
  const button=template(ui,'jf_action_rename');
  assert.equal(button.$pressed_button_name,'button.form_button_click');
  assert.ok(button.button_mappings.every(m=>m.to_button_id==='button.form_button_click'));
});

test('Overview uses the recommended full-height portrait on the left and details on the right',async()=>{
  const ui=await loadUI();
  const fields=children(ui.jf_overview_content);
  assert.deepEqual(fields.portrait.size,[96,168]);
  assert.deepEqual(fields.portrait.offset,[0,0]);
  assert.equal(fields.portrait.type,'stack_panel');
  assert.deepEqual(fields.portrait.controls,[{'record@jagsby_frontier.jf_tier_portrait':{collection_index:3}}]);
  assert.equal(ui.jf_tier_portrait.bilinear,false);
  assert.deepEqual(ui.jf_tier_portrait.uv,[8,12]);
  assert.deepEqual(ui.jf_tier_portrait.uv_size,[80,144]);
  assert.ok(ui.jf_tier_portrait.uv[0]+ui.jf_tier_portrait.uv_size[0]<96);
  assert.ok(ui.jf_tier_portrait.uv[1]+ui.jf_tier_portrait.uv_size[1]<168);
  assert.ok(Math.abs(fields.biome.offset[1]-fields.biome_label.offset[1])<=2,
    'Biome label and value should share a compact row');
  assert.ok(fields.tier.offset[0]>=108,'Tier should be grouped beneath the settlement name');
  assert.ok(ui.jf_data_overview.font_scale_factor>ui.jf_data_biomes.font_scale_factor,
    'Settlement name should have a stronger visual hierarchy');
  assert.ok(ui.jf_tier_portrait.bindings.some(b=>b.binding_name==='#form_button_texture'&&b.binding_name_override==='#texture'));
  for(const name of ['name','biome','power']) {
    assert.ok(fields[name].offset[0]>=108);
    assert.ok(fields[name].offset[0]+fields[name].size[0]<=257);
  }
  for(const name of ['outpost','hamlet','village','town','city']) {
    const data=await readFile(new URL(`../packs/resource/textures/ui/frontier/settlements/${name}.png`,import.meta.url));
    assert.equal(data.readUInt32BE(16),96);
    assert.equal(data.readUInt32BE(20),168);
  }
});

test('Overview puts each bound label at its explicit index inside a real collection layout',async()=>{
  const ui=await loadUI();
  const fields=children(ui.jf_overview_content);
  const records=['[JF:data:census]2.8','[JF:action:rename]','[JF:data:biomes]Plains','[JF:data:overview]Oakfield'];
  for(const [field,key,expected]of [['name','overview','Oakfield'],['biome','biomes','Plains'],['power','census','2.8']]) {
    assert.equal(fields[field].type,'stack_panel');
    assert.deepEqual(fields[field].controls,[{['record@jagsby_frontier.jf_data_'+key]:{collection_index:{name:0,biome:1,power:2}[field]}}]);
    const label=ui['jf_data_'+key];
    const expression=label.bindings.find(b=>b.target_property_name==='#text').source_property_name;
    const marker=expression.match(/'([^']+)'/)[1];
    const matching=records.filter(record=>record.includes(marker));
    assert.equal(matching.length,1);
    assert.equal(matching[0].replace(marker,''),expected);
  }
  const submit=children(ui.jf_rename)['submit@common.button'];
  assert.ok(submit.button_mappings.every(m=>m.to_button_id==='button.submit_custom_form'));
});

test('Research subtabs isolate the correct native action factories',async()=>{
  const ui=await loadUI();
  const controls=children(ui.jf_research_content);
  for(const scope of ['global','local']) {
    const toggle=controls['jf_research_tab_'+scope];
    assert.equal(toggle.toggle_name,'jagsby_frontier_research_tabs');
    assert.equal(toggle.radio_toggle_group,true);
    assert.equal(JSON.stringify(toggle).includes('button.form_button_click'),false);
    const page=controls[scope+'@common.scrolling_panel'];
    assert.ok(page.bindings.some(b=>b.source_control_name==='jf_research_tab_'+scope&&b.target_property_name==='#enabled'));
  }
  function actions(value,result=[]) {
    if(value&&typeof value==='object') {
      for(const key of Object.keys(value))if(key.startsWith('record@jagsby_frontier.jf_action_'))result.push(key.split('jf_action_')[1]);
      for(const child of Object.values(value))actions(child,result);
    }
    return result;
  }
  assert.deepEqual(actions(ui.jf_research_global_content),['frontier','capacity','development','storage']);
  assert.deepEqual(actions(ui.jf_research_local_content),['efficiency','hearth','biome']);
});

test('approved transparent sprites appear in every state of their sidebar tabs',async()=>{
  const ui=await loadUI();
  const dashboard=children(ui.jf_dashboard);
  for(const name of ['overview','research','production']) {
    for(const state of dashboard['jf_tab_'+name].controls) {
      const icon=children(Object.values(state)[0]).icon;
      assert.equal(icon.texture,'textures/ui/frontier/icons/'+name);
      assert.deepEqual(icon.size,[24,24]);
      assert.equal(icon.bilinear,false);
    }
  }
});

test('standalone UI references resolve to Frontier files and definitions',async()=>{
  const resourceRoot=new URL('../packs/resource/',import.meta.url);
  const ui=await loadUI();
  const textures=new Set();
  function walk(value) {
    if(typeof value==='string') {
      if(value.startsWith('textures/'))textures.add(value);
      const match=value.match(/^@?jagsby_frontier\.(\w+)$/);
      if(match)assert.ok(template(ui,match[1]),`Missing Frontier control: ${value}`);
    } else if(value&&typeof value==='object') {
      for(const [key,child]of Object.entries(value)) {
        if(key.includes('@jagsby_frontier.'))assert.ok(template(ui,key.split('@jagsby_frontier.')[1]));
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
