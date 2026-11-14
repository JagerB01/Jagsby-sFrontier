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

test('five local sidebar toggles control custom pages without submitting form buttons', async () => {
  const ui=JSON.parse(await readFile(new URL('../packs/resource/ui/jagsby_frontier/charter.json',import.meta.url),'utf8'));
  for(const name of ['overview','research','production','realm','information']) {
    const tab=ui.jf_dashboard.controls.find(c=>c['jf_tab_'+name])['jf_tab_'+name];
    assert.equal(tab.type,'toggle');
    assert.ok(tab.offset[1]+tab.size[1]<=220);
    if(name==='realm')assert.equal(tab.focus_change_down,'jf_tab_focus_information');
    if(name==='information')assert.equal(tab.focus_change_up,'jf_tab_focus_realm');
    assert.equal(tab.radio_toggle_group,true);
    assert.equal(JSON.stringify(tab).includes('button.form_button_click'),false);
    const key=['overview','research','realm','information'].includes(name)?name+'@jagsby_frontier.jf_'+name+'_content':name+'@common.scrolling_panel';
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
  for(const key of Object.keys(layout.data).filter(key=>!['frontier','capacity','development','storage'].includes(key))) {
    if(key.startsWith('mapCell')) {
      const cell=ui['jf_map_cell_'+key.slice(7)];
      assert.equal(cell.type,'image');
      assert.ok(cell.bindings.some(b=>b.binding_name==='#form_button_texture'&&b.target_property_name===undefined));
      continue;
    }
    const label=ui['jf_data_'+key];
    assert.equal(label.type,'label');
    if(key==='census') {
      assert.equal(label.text,'#form_button_text');
      assert.equal(label.property_bag['#form_button_text'],'Unavailable');
      assert.equal(label.bindings.some(b=>b.target_property_name==='#visible'),false);
      assert.ok(label.bindings.some(b=>b.binding_name==='#form_button_text'&&b.binding_name_override===undefined));
    } else assert.ok(label.bindings.some(b=>b.source_property_name===`(#record_text - '[JF:data:${key}]')`&&b.target_property_name==='#text'));
    assert.ok(label.bindings.some(b=>b.binding_name==='#form_button_text'&&b.binding_type==='collection'));
  }
  for(const key of Object.keys(layout.actions).filter(key=>!['frontier','capacity','development','storage'].includes(key))) {
    const button=template(ui,'jf_action_'+key);
    assert.ok(button.bindings.some(b=>b.source_property_name===`(#form_button_text = '[JF:action:${key}]')`&&b.target_property_name==='#enabled'));
    assert.ok(button.bindings.some(b=>b.binding_type==='collection_details'));
  }
});

test('Compact village identity fits without scrolling and Rename remains in the header',async()=>{
  const ui=await loadUI();
  const fields=children(ui.jf_overview_content);
  assert.deepEqual(Object.keys(fields),['portrait','identity']);
  assert.ok(fields.portrait.offset[0]>fields.identity.offset[0]);
  assert.equal(Object.keys(fields).some(key=>key.endsWith('_card')),false);
  assert.equal(JSON.stringify(ui.jf_overview_content).includes('scroll'),false);
  for(const control of Object.values(fields))assert.ok(control.offset[1]+control.size[1]<=158);
  assert.deepEqual(fields.identity.size,[147,105]);
  assert.equal(JSON.stringify(ui.jf_overview_content).includes('Size'),false);
  assert.equal(JSON.stringify(ui.jf_overview_content).includes('population'),false);
  for(const key of ['name','tier','owner','biomes','census'])assert.ok(children(fields.identity)[key]);
  const header=children(ui.jf_dashboard);
  assert.ok(header.header_rename.offset[1]+header.header_rename.size[1]<=56);
  assert.deepEqual(header.header_name.controls,[{'record@jagsby_frontier.jf_data_overview':{collection_index:0}}]);
  assert.equal(header.subtitle.text,'Village Charter');
  assert.ok(ui.jf_data_overview.font_scale_factor>header.subtitle.font_scale_factor);
  assert.ok(header.header_name.offset[1]>=12);
  assert.ok(header.header_name.offset[1]+header.header_name.size[1]<=header.subtitle.offset[1]);
  assert.ok(header.subtitle.offset[1]-(header.header_name.offset[1]+header.header_name.size[1])<=1);
  assert.ok(header.subtitle.offset[1]+header.subtitle.size[1]<=56);
});

test('framed portrait and compact details preserve native binding scopes',async()=>{
  const ui=await loadUI();
  const fields=children(ui.jf_overview_content);
  assert.deepEqual(fields.portrait.size,[90,158]);
  assert.deepEqual(ui.jf_tier_portrait.uv,[1,1]);
  assert.deepEqual(ui.jf_tier_portrait.uv_size,[94,166]);
  for(const [key,index]of [['owner',25],['biomes',1],['census',2]]) {
    const value=children(fields.identity)[key];
    assert.equal(value.type,'stack_panel');
    assert.deepEqual(value.controls,[{['record@jagsby_frontier.jf_data_'+key]:{collection_index:index}}]);
  }
  assert.ok(ui.jf_tier_portrait.bindings.some(b=>b.binding_name==='#form_button_texture'));
  for(const name of ['outpost','hamlet','village','town','city']) {
    const data=await readFile(new URL(`../packs/resource/textures/ui/frontier/settlements/${name}.png`,import.meta.url));
    assert.equal(data.readUInt32BE(16),96);assert.equal(data.readUInt32BE(20),168);
  }
});

test('Realm filters have paginated directories and stockpile collection stays under Production',async()=>{
  const ui=await loadUI();
  const realm=children(ui.jf_realm_content);
  assert.ok(realm.jf_realm_tab_mine);assert.ok(realm.jf_realm_tab_all);
  for(const scope of ['mine','all']) {
    const directory=children(ui['jf_realm_'+scope+'_content']);
    assert.ok(directory.prev);assert.ok(directory.next);
  }
  assert.ok(JSON.stringify(ui.jf_production_content).includes('jf_action_collect'));
  assert.equal(children(ui.jf_dashboard).jf_tab_stockpile,undefined);
});

test('Research subtabs isolate the correct native action factories',async()=>{
  const ui=await loadUI();
  const controls=children(ui.jf_research_content);
  for(const scope of ['global','local']) {
    const toggle=controls['jf_research_tab_'+scope];
    assert.equal(toggle.toggle_name,'jagsby_frontier_research_tabs');
    assert.equal(toggle.radio_toggle_group,true);
    assert.equal(JSON.stringify(toggle).includes('button.form_button_click'),false);
    const page=controls[scope+'@jagsby_frontier.jf_research_'+scope+'_content'];
    assert.ok(page.bindings.some(b=>b.source_control_name==='jf_research_tab_'+scope&&b.target_property_name==='#enabled'));
  }
  function actions(value,result=[]) {
    if(value&&typeof value==='object') {
      for(const key of Object.keys(value))if(key.startsWith('record@jagsby_frontier.jf_action_'))result.push(key.split('jf_action_')[1]);
      for(const child of Object.values(value))actions(child,result);
    }
    return result;
  }
  assert.deepEqual(actions(ui.jf_research_global_content),[]);
  assert.equal(JSON.stringify(ui.jf_research_content).includes('scroll'),false);
  const tree=children(ui.jf_research_global_content);
  for(const name of ['settlement_capacity','frontier_expansion','settlement_development','colonization','shared_storage']) {
    assert.equal(tree[name].type,'button');
    assert.ok(tree[name].offset[0]+tree[name].size[0]<=254);
    assert.ok(tree[name].offset[1]+tree[name].size[1]<=150);
    assert.deepEqual(tree[name].button_mappings,[]);
    assert.equal(JSON.stringify(tree[name]).includes('button.form_button_click'),false);
    assert.equal(tree[name].bindings,undefined);
  }
  assert.deepEqual(actions(ui.jf_research_local_content).sort(),['biome','efficiency','hearth']);
});

test('approved transparent sprites appear in every state of their sidebar tabs',async()=>{
  const ui=await loadUI();
  const dashboard=children(ui.jf_dashboard);
  for(const name of ['overview','research','production','realm','information']) {
    for(const state of dashboard['jf_tab_'+name].controls) {
      const icon=children(Object.values(state)[0]).icon;
      assert.equal(icon.texture,'textures/ui/frontier/icons/'+name);
      assert.deepEqual(icon.size,[20,20]);
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

test('research explanations appear only in hover/pressed states and stay inside the charter',async()=>{
  const ui=await loadUI();
  function check(button,x,y) {
    const states=children(button);
    assert.equal(children(states.default).research_tooltip,undefined);
    for(const state of ['hover','pressed']) {
      const tip=children(states[state]).research_tooltip;
      assert.ok(tip,'Missing research explanation');
      const content=children(tip);
      assert.ok(content.title.text.length>0);
      assert.ok(content.description?.text.length>0 || content.live_details);
      assert.ok(x+tip.offset[0]>=18&&x+tip.offset[0]+tip.size[0]<=362);
      assert.ok(y+tip.offset[1]>=30&&y+tip.offset[1]+tip.size[1]<=227);
      assert.equal(JSON.stringify(tip).includes('button.form_button_click'),false);
    }
  }
  for(const node of Object.values(children(ui.jf_research_global_content))) {
    if(node.type!=='button')continue;
    check(node,104+node.offset[0],89+node.offset[1]);
    assert.ok(children(children(node).hover).research_tooltip.controls.some(
      entry=>entry.description?.text.includes('not yet available')));
  }
  const local=children(ui.jf_research_local_content);
  for(const [key,index] of [['efficiency',14],['hearth',15],['biome',16]]) {
    const node=local[key];
    assert.deepEqual(node.size,[122,34]);
    assert.ok(node.offset[0]+node.size[0]<=254);
    const scope=children(node)[key+'_buy'];
    const record=scope.controls[0]['record@jagsby_frontier.jf_action_'+key];
    assert.equal(record.collection_index,index);
    const purchase=ui['jf_action_'+key+'@common.button'];
    assert.equal(purchase.$pressed_button_name,'button.form_button_click');
    check(purchase,104+node.offset[0],89+node.offset[1]);
    const details=children(children(children(purchase).hover).research_tooltip).live_details;
    assert.ok(details.controls[0]['record@jagsby_frontier.jf_data_'+key]);
  }
  assert.ok(local.hearth.offset[1]<local.biome.offset[1]);
  assert.ok(local.biome.offset[1]<local.efficiency.offset[1]);
  assert.equal(local.sanctuary.offset[1],local.biome.offset[1]);
  assert.equal(local.road_networks.offset[1],local.efficiency.offset[1]);
  for(const key of ['sanctuary','road_networks']) {
    assert.deepEqual(local[key].button_mappings,[]);
    check(local[key],104+local[key].offset[0],89+local[key].offset[1]);
  }
  assert.ok(local.branch_0&&local.branch_1&&local.branch_2&&local.branch_3);
  assert.equal(JSON.stringify(ui.jf_rename).includes('research_tooltip'),false);
  assert.equal(JSON.stringify(ui['jf_choice@common.button']).includes('research_tooltip'),false);
});

test('Realm map has three tabs and 384 correctly indexed terrain cells with navigation actions',async()=>{
  const ui=await loadUI(),realm=children(ui.jf_realm_content),map=children(ui.jf_realm_map_content);
  const tabs=['map','mine','all'].map(k=>realm['jf_realm_tab_'+k]);
  assert.deepEqual(tabs.map(t=>t.offset[0]),[0,86,172]);
  assert.equal(tabs[0].toggle_default_state,true);
  assert.ok(realm['map@jagsby_frontier.jf_realm_map_content'].bindings.some(b=>b.source_control_name==='jf_realm_tab_map'));
  for(let i=0;i<384;i++){
    const cell=map['cell_'+i];
    assert.equal(cell.controls[0]['tile@jagsby_frontier.jf_map_cell_'+i].collection_index,34+i);
    assert.ok(cell.offset[0]+7<=254&&cell.offset[1]+7<=84);
  }
  for(const key of ['West','North','South','East','ZoomIn','ZoomOut','Center','Dimension','Refresh']){
    assert.ok(map['map_'+key]);
    const button=template(ui,'jf_action_map'+key);
    assert.equal(button.$pressed_button_name,'button.form_button_click');
  }
});
