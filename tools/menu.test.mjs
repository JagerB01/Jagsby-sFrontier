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
    const key=name+'@jagsby_frontier.jf_'+name+'_content';
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
    const label=ui['jf_data_'+key];
    assert.equal(label.type,'label');
    if(['census','developmentValue','developmentHourly','owner','realmMine','realmAll'].includes(key)||key.startsWith('stockCount')||key.startsWith('productionModifier')||key.startsWith('overviewProduction')||key.startsWith('directory')||key.startsWith('roadConnection')||key.startsWith('prospectInfo')) {
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
  assert.deepEqual(Object.keys(fields),['portrait','identity','development','production']);
  assert.ok(fields.portrait.offset[0]>fields.identity.offset[0]);
  assert.equal(Object.keys(fields).some(key=>key.endsWith('_card')),false);
  assert.equal(JSON.stringify(ui.jf_overview_content).includes('scroll'),false);
  for(const control of Object.values(fields))assert.ok(control.offset[1]+control.size[1]<=158);
  assert.deepEqual(fields.identity.size,[147,78]);
  assert.equal(JSON.stringify(ui.jf_overview_content).includes('Size'),false);
  assert.equal(JSON.stringify(ui.jf_overview_content).includes('population'),false);
  for(const key of ['name','tier','owner','biomes','zone','census'])assert.ok(children(fields.identity)[key]);
  assert.ok(fields.identity.offset[1]+fields.identity.size[1]<fields.development.offset[1]);
  assert.equal(fields.development.offset[1],fields.production.offset[1]);
  assert.equal(fields.development.size[1],fields.production.size[1]);
  assert.ok(fields.development.offset[0]+fields.development.size[0]<fields.production.offset[0]);
  assert.ok(children(fields.identity).owner.offset[1]<children(fields.identity).tier.offset[1]);
  const developmentFields=children(fields.development);
  for(const key of ['developmentValue','developmentHourly','tradeRoute']){
    assert.ok(developmentFields[key]);assert.equal(ui['jf_data_'+key].font_scale_factor,0.65);
  }
  assert.equal(developmentFields.developmentValue_label,undefined);
  assert.equal(developmentFields.title,undefined);
  assert.equal(developmentFields.developmentHourly_label.text,'Dev/Hr');
  assert.equal(developmentFields.developmentHourly_label.font_scale_factor,0.65);
  assert.equal(developmentFields.tradeRoute_label.font_scale_factor,0.65);
  assert.equal(developmentFields.developmentHourly.offset[0],developmentFields.tradeRoute.offset[0]);
  for(const key of ['developmentHourly','tradeRoute'])assert.equal(ui['jf_data_'+key].text_alignment,'left');
  assert.deepEqual(ui.jf_data_developmentValue.color,[0.82,0.70,0.44]);
  assert.equal(fields.development.size[1],56);

  assert.equal(children(fields.identity).owner_label,undefined);
  assert.deepEqual(children(fields.identity).owner.offset,[8,18]);
  assert.equal(children(fields.identity).name.offset[1]+children(fields.identity).name.size[1]<=children(fields.identity).owner.offset[1],true);
  assert.equal(children(fields.production).title.text,'Production');
  assert.deepEqual(Object.keys(children(fields.production)),['surface','title','icon0','rate0','icon1','rate1']);
  assert.equal(developmentFields.developmentHourly.offset[0],38);
  for(const key of ['icon0','rate0','icon1','rate1']){
   const item=children(fields.production)[key];
   assert.ok(item.offset[0]+item.size[0]<=fields.production.size[0]);
   assert.ok(item.offset[1]+item.size[1]<=fields.production.size[1]);
  }
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

test('Realm filters have scrollable directories and stockpile collection stays under Production',async()=>{
  const ui=await loadUI();
  const realm=children(ui.jf_realm_content);
  assert.ok(realm.jf_realm_tab_mine);assert.ok(realm.jf_realm_tab_all);
  for(const scope of ['mine','all']) {
    const directory=children(ui['jf_realm_'+scope+'_content']);
    assert.ok(directory['entries@common.scrolling_panel']);assert.equal(directory.prev,undefined);assert.equal(directory.next,undefined);
  }
  assert.ok(JSON.stringify(ui.jf_production_summary_content).includes('jf_action_collect'));
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
  assert.deepEqual(actions(ui.jf_research_global_content),['innovation','frontier','capacity','colonization','storage']);
  assert.equal(JSON.stringify(ui.jf_research_content).includes('scroll'),false);
  const tree=children(ui.jf_research_global_content);
  for(const name of ['innovation','frontier','capacity','colonization','storage']) {
    assert.equal(tree[name].type,'panel');
    assert.ok(tree[name].offset[0]+tree[name].size[0]<=254);
    assert.ok(tree[name].offset[1]+tree[name].size[1]<=150);
    assert.equal(actions(tree[name]).length,1);
  }
  assert.deepEqual(tree.innovation.offset,[66,0]);
  assert.deepEqual(tree.capacity.offset,[132,47]);
  const foundation=children(children(ui['jf_action_innovation@common.button']).default);
  const charters=children(children(ui['jf_action_capacity@common.button']).default);
  assert.equal(foundation.name.text,'Stewardship');
  assert.equal(charters.name.text,'Settlement Charters');
  assert.equal(foundation.icon.texture,'textures/ui/frontier/research/stewardship');
  assert.equal(charters.icon.texture,'textures/ui/frontier/research/settlement_charters');
  for(const key of ['innovation','frontier','capacity','colonization','storage','hearth','biome','sanctuary','efficiency','roads']){
    const button=ui['jf_action_'+key+'@common.button'];
    for(const state of ['default','hover','pressed']){
      const level=children(children(button)[state]).level;
      assert.equal(level.type,'stack_panel');
      assert.equal(children(children(button)[state]).note,undefined);
      assert.equal(level.size[1],9);
      const name=children(children(button)[state]).name;
      const levelTemplate=ui['jf_data_'+key+'Level'];
      assert.equal(name.text_alignment,'center');
      assert.equal(levelTemplate.text_alignment,'center');
      assert.ok(levelTemplate.font_scale_factor<name.font_scale_factor);
      assert.equal(name.offset[0]+name.size[0]/2,level.offset[0]+level.size[0]/2);
      assert.ok(level.controls[0]['record@jagsby_frontier.jf_data_'+key+'Level']);
      assert.ok(level.offset[1]+level.size[1]<=34);
    }
  }
  assert.deepEqual(actions(ui.jf_research_local_content).sort(),['biome','efficiency','hearth','roads','sanctuary']);
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

test('research popups size to text and anchor outside the hovered tech card',async()=>{
  const ui=await loadUI();
  function check(button,x,y) {
    const states=children(button);
    assert.equal(children(states.default).research_tooltip,undefined);
    for(const state of ['hover','pressed']) {
      const tip=children(states[state]).research_tooltip;
      assert.ok(tip,'Missing research explanation');
      const outer=children(tip),content=children(outer.content);
      assert.ok(children(content.title_row).title.text.length>0);
      assert.ok(content.description || content.live_details);
      assert.ok(x+tip.offset[0]>=18&&x+tip.offset[0]+tip.size[0]<=362);
      assert.deepEqual(tip.size,[240,'100%cm']);
      assert.equal(outer.frame.size[1],'100%sm');
      assert.equal(outer.frame.nineslice_size,6);
      assert.equal(tip.anchor_from,y===89?'bottom_left':'top_left');
      assert.equal(tip.anchor_to,y===89?'top_left':'bottom_left');
      assert.equal(tip.offset[1],y===89?4:-4);
      assert.equal(JSON.stringify(tip).includes('button.form_button_click'),false);
    }
  }
  for(const key of ['innovation','frontier','capacity','colonization','storage']) {
    const node=children(ui.jf_research_global_content)[key];
    const purchase=ui['jf_action_'+key+'@common.button'];
    assert.equal(purchase.$pressed_button_name,'button.form_button_click');
    check(purchase,104+node.offset[0],89+node.offset[1]);
    assert.ok(children(children(children(children(purchase).hover).research_tooltip).content).live_details);
  }
  const local=children(ui.jf_research_local_content);
  for(const [key,index] of [['efficiency',14],['hearth',15],['biome',16],['sanctuary',57],['roads',58]]) {
    const node=local[key];
    assert.deepEqual(node.size,[122,34]);
    assert.ok(node.offset[0]+node.size[0]<=254);
    const scope=children(node)[key+'_buy'];
    const record=scope.controls[0]['record@jagsby_frontier.jf_action_'+key];
    assert.equal(record.collection_index,index);
    const purchase=ui['jf_action_'+key+'@common.button'];
    assert.equal(purchase.$pressed_button_name,'button.form_button_click');
    check(purchase,104+node.offset[0],89+node.offset[1]);
    const details=children(children(children(children(purchase).hover).research_tooltip).content).live_details;
    assert.ok(children(details).inset.controls[0]['record@jagsby_frontier.jf_data_'+key]);
  }
  assert.ok(local.hearth.offset[1]<local.biome.offset[1]);
  assert.ok(local.biome.offset[1]<local.efficiency.offset[1]);
  assert.equal(local.sanctuary.offset[1],local.biome.offset[1]);
  assert.equal(local.roads.offset[1],local.efficiency.offset[1]);
  assert.ok(local.branch_0&&local.branch_1&&local.branch_2&&local.branch_3);
  assert.equal(JSON.stringify(ui.jf_rename).includes('research_tooltip'),false);
  assert.equal(JSON.stringify(ui['jf_choice@common.button']).includes('research_tooltip'),false);
});

test('Realm replaces the map with Road Networks and keeps both settlement directories',async()=>{
 const ui=await loadUI(),realm=children(ui.jf_realm_content),roads=children(ui.jf_realm_roads_content);
 const tabs=['roads','mine','all'].map(k=>realm['jf_realm_tab_'+k]);
 assert.deepEqual(tabs.map(t=>t.offset[0]),[0,86,172]);assert.ok(tabs[0].bindings.some(binding=>binding.source_property_name?.includes('[JF:realm:roads]')));
 assert.equal(tabs[0].type,'toggle');
 assert.ok(realm['roads@jagsby_frontier.jf_realm_roads_content'].bindings.some(b=>b.source_control_name==='jf_realm_tab_roads'));
 assert.equal(ui.jf_realm_map_content,undefined);
 assert.equal(roads.manageRoads,undefined);assert.equal(roads.roadsPrev,undefined);assert.equal(roads.roadsNext,undefined);
 for(const key of ['summary','empty','entries@common.scrolling_panel'])assert.ok(roads[key]);
 assert.equal(JSON.stringify(ui).includes('jf_data_map'),false);
 assert.equal(JSON.stringify(ui).includes('interactive map'),false);
});

test('Production uses exactly two fixed tabs with output, modifiers and stockpile together',async()=>{
 const ui=await loadUI(),root=children(ui.jf_production_content);
 assert.deepEqual(Object.keys(root).filter(k=>k.startsWith('jf_production_tab_')),['jf_production_tab_summary','jf_production_tab_biomes']);
 assert.equal(ui.jf_production_stock_content,undefined);assert.equal(ui.jf_production_output_content,undefined);
 assert.ok(children(ui.jf_dashboard)['production@jagsby_frontier.jf_production_content']);
 for(const scope of ['summary','biomes']){
  assert.ok(root['jf_production_tab_'+scope].bindings.some(binding=>binding.source_property_name?.includes('[JF:production:'+scope+']')));
  const pane=ui['jf_production_'+scope+'_content'];assert.equal(pane.type,'panel');
  assert.equal(JSON.stringify(pane).includes('scroll'),scope==='biomes');
  for(const child of Object.values(children(pane))){
   assert.ok(child.offset[0]+child.size[0]<=257);assert.ok(child.offset[1]+child.size[1]<=131);
  }
 }
 const prospecting=children(ui.jf_production_biomes_content);assert.ok(prospecting['choices@common.scrolling_panel']);assert.ok(prospecting.clear);
 for(const removed of ['previous','next','survey'])assert.equal(prospecting[removed],undefined);
 const summary=children(ui.jf_production_summary_content);
 assert.ok(summary.collect);assert.ok(summary.modifiers_box);assert.ok(summary.stock_box);
 assert.ok(summary.stock_box.offset[1]>=summary.output_box.size[1]);
 for(let slot=0;slot<2;slot++){
  assert.ok(summary['icon'+slot]);assert.ok(summary['item'+slot]);
  assert.ok(ui['jf_production_icon'+slot].bindings.some(b=>b.binding_name==='#form_button_texture'));
 }

});
test('Research hover heights flow from the rendered label with only fixed edge padding',async()=>{
 const ui=await loadUI();
 for(const key of ['innovation','frontier','capacity','colonization','storage','hearth','biome','sanctuary','efficiency','roads']){
  const tip=children(children(children(ui['jf_action_'+key+'@common.button']).hover).research_tooltip);
  const content=children(tip.content);
  assert.deepEqual(tip.content.size,[240,'100%c']);
  assert.deepEqual(content.live_details.size,[240,'100%cm']);
  const inset=children(content.live_details).inset;
  assert.deepEqual(inset.size,[222,'100%c']);
  assert.deepEqual(inset.offset,[9,0]);
  assert.equal(inset.offset[0],children(content.title_row).title.offset[0]);
  assert.equal(inset.offset[0]+inset.size[0],231);
  assert.equal(ui['jf_data_'+key].text_alignment,'left');
  assert.deepEqual(ui['jf_data_'+key].size,[222,'default']);
  assert.equal(content.top_padding.size[1],6);assert.equal(content.bottom_padding.size[1],6);
 }
});
test('Prospecting has no confirmation form or preview router',async()=>{
 const ui=await loadUI();assert.equal(ui.jf_production_preview,undefined);
 assert.equal(JSON.stringify(ui.jf_router).includes('Production Preview'),false);
});
test('Stockpile has 30 conditional slots with raw counts; each modifier has an unclipped native value row',async()=>{
 const ui=await loadUI(),summary=children(ui.jf_production_summary_content);
 assert.equal(summary.previous,undefined);assert.equal(summary.next,undefined);assert.equal(summary.stock_page,undefined);
 assert.deepEqual(ui.jf_data_productionOutput.color,summary.modifiers_title.color);
 assert.equal(ui.jf_data_productionOutput.font_scale_factor,0.8);
 assert.equal(summary.modifier_total.offset[1],summary.modifiers_title.offset[1]);
 assert.equal(summary.modifier_total.offset[0],207);
 assert.equal(summary.modifier_row4,undefined);
 const total=children(summary.modifier_total);assert.equal(total.percent.text,'%');assert.equal(total.percent.localize,false);
 assert.equal(summary.modifier_total.orientation,'horizontal');assert.equal(total.number.size[0],'100%c');
 for(let row=0;row<4;row++){
  const panel=summary['modifier_row'+row],contents=children(panel);
  assert.equal(contents.name.offset[1],contents.value.offset[1]);assert.equal(panel.size[1],12);
  assert.ok(panel.offset[1]+panel.size[1]<=summary.modifiers_box.size[1]);
  assert.equal(contents.value.offset[0],64);assert.equal(contents.name.offset[0],0);
  assert.equal(contents.percent,undefined);
  const value=children(contents.value);assert.equal(contents.value.orientation,'horizontal');
  assert.equal(value.percent.text,'%');assert.equal(value.percent.localize,false);
  assert.equal(value.number.size[0],'100%c');
  const text=ui['jf_data_productionModifier'+row];assert.equal(text.text,'#form_button_text');
  assert.deepEqual(text.size,['default',12]);assert.ok(text.bindings.every(b=>b.binding_type!=='view'));
 }
 for(const state of ui['jf_action_collect@common.button'].controls){
  const caption=children(nextValue(state)).caption;
  assert.equal(caption.text_alignment,'center');assert.deepEqual(caption.offset,[0,2]);
 }
 for(let i=0;i<30;i++){
  const cell=summary['stock_item'+i],contents=children(cell);
  assert.ok(ui['jf_stock_icon'+i].bindings.some(b=>b.binding_name==='#form_button_texture'));
  assert.ok(JSON.stringify(cell.bindings).includes('[JF:stock:'+i+']'));
  assert.ok(cell.offset[1]>=summary.stock_heading.offset[1]+summary.stock_heading.size[1]);
  assert.ok(cell.offset[1]+cell.size[1]<=summary.collect.offset[1]);
  const count=ui['jf_data_stockCount'+i];assert.equal(count.text_alignment,'right');assert.equal(count.shadow,true);
 }
 assert.equal(summary.icon1.offset[1]+summary.icon1.size[1]<=summary.output_box.size[1],true);
 function nextValue(obj){return Object.values(obj)[0];}
});
test('Prospecting scrolls all discovered choices with a shared header Survey and no paging',async()=>{
 const ui=await loadUI(),pane=children(ui.jf_production_biomes_content);
 assert.deepEqual(Object.keys(pane),['choices@common.scrolling_panel','clear']);
 assert.equal(pane['choices@common.scrolling_panel'].$scrolling_content,'jagsby_frontier.jf_prospecting_rows');
 const content=ui.jf_prospecting_rows;assert.equal(content.orientation,'vertical');
 assert.equal(content.size[1],'100%c');assert.equal(content.controls.length,53);
 const requirement=children(content).research_requirement;
 assert.equal(children(requirement).caption.text,'§cRequired: Resource Prospecting Lv 1§r');
 assert.ok(JSON.stringify(requirement.bindings).includes('[JF:prospectLocked]'));
 for(let slot=0;slot<52;slot++){
  const wrapper=children(content)['biome'+slot],row=children(wrapper).row;
  assert.ok(JSON.stringify(wrapper.bindings).includes('[JF:prospect:'+slot+']'));
  const fields=children(row);assert.ok(fields.icon);assert.ok(fields.details);assert.ok(fields.choose);
  assert.equal(fields.locked,undefined,'One shared requirement replaces repeated Locked captions');
  const info=ui['jf_data_prospectInfo'+slot];assert.equal(info.text,'#form_button_text');
  assert.ok(info.bindings.every(binding=>binding.binding_type!=='view'));
  assert.equal(ui['jf_prospect_icon'+slot].bindings.some(b=>b.binding_name==='#form_button_texture'),true);
 }
 const source=await readFile(new URL('../packs/behavior/scripts/charter-layout.js',import.meta.url),'utf8');
 const {CHARTER_LAYOUT}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 assert.equal(CHARTER_LAYOUT.actions.scan,21);
 const header=children(ui.jf_dashboard);assert.ok(header.header_survey);
 assert.ok(header.header_survey.offset[0]>=header.header_name.offset[0]+header.header_name.size[0]);
 assert.ok(header.header_survey.offset[0]+header.header_survey.size[0]<=header.header_rename.offset[0]);
 for(const removed of ['biomePrev','biomeNext'])assert.equal(CHARTER_LAYOUT.actions[removed],undefined);
});
test('Realm scrolling rows use explicit collection indices and the established column layout',async()=>{
 const ui=await loadUI();
 const {CHARTER_LAYOUT:layout}=await import('../packs/behavior/scripts/charter-layout.js');
 for(const [scopeIndex,scope] of layout.realmRows.scopes.entries()){
  const pane=children(ui['jf_realm_'+scope+'_content']);
  assert.ok(pane['entries@common.scrolling_panel']);assert.equal(pane.prev,undefined);assert.equal(pane.next,undefined);
  const list=ui['jf_realm_'+scope+'_rows'];
  assert.equal(list.factory,undefined,'Do not reintroduce the broken dynamic factory');
  assert.deepEqual(list.size,[251,'100%c']);
  const rows=children(list);assert.equal(Object.keys(rows).length,layout.realmRows.limit);
  for(const slot of [0,1,39,layout.realmRows.limit-1]){
   const row=rows['row'+slot],fields=children(row);
   assert.ok(row.bindings.some(binding=>binding.source_property_name?.includes('[JF:row:'+scope+':'+slot+']')));
   const base=layout.realmRows.base+slot*layout.realmRows.stride+scopeIndex*8;
   for(const [field,offset] of [['name',0],['owner',1],...(scope==='roads'?[['distance',2],['cost',3],['time',5]]:[['coordinates',2],['distance',3],['development',4],['status',5]])]){
    const wrapper=fields[field];assert.equal(wrapper.type,'stack_panel');assert.equal(wrapper.collection_name,'form_buttons');
    const record=Object.values(wrapper.controls[0])[0];assert.equal(record.collection_index,base+offset);
    const raw=ui['jf_realm_'+scope+'_'+field];assert.equal(raw.text,'#form_button_text');
    assert.equal(raw.bindings.some(binding=>binding.binding_type==='view'),false);
   }
   assert.equal(Object.values(fields.icon.controls[0])[0].collection_index,base);
   if(scope==='roads'){
    assert.deepEqual(row.size,[251,38]);
    assert.equal(Object.values(fields.tier_icon.controls[0])[0].collection_index,base+6);
    assert.equal(Object.values(fields.travel.controls[0])[0].collection_index,base+7);
    assert.equal(Object.values(fields.travel_disabled.controls[0])[0].collection_index,base+7);
    assert.ok(fields.travel.bindings.some(binding=>binding.source_property_name?.includes('[JF:travel:roads:'+slot+']')));
    assert.ok(fields.travel_disabled.bindings.some(binding=>binding.source_property_name?.includes('[JF:travel_disabled:roads:'+slot+']')));
    assert.ok(fields.name.offset[0]<fields.distance.offset[0]);assert.ok(fields.distance.offset[0]<fields.cost.offset[0]);
    assert.ok(fields.cost.offset[0]<fields.tier_icon.offset[0]);assert.ok(fields.tier_icon.offset[0]<fields.travel.offset[0]);
    assert.equal(fields.current_icon,undefined);assert.equal(fields.next_icon,undefined);
   }else{
    assert.equal(fields.coordinates.offset[1],fields.name.offset[1]);assert.equal(fields.owner.offset[1],fields.distance.offset[1]);
    assert.equal(Object.values(fields.establish.controls[0])[0].collection_index,base+6);
    assert.ok(fields.establish.bindings.some(binding=>binding.source_property_name?.includes('[JF:establish:'+scope+':'+slot+']')));
   }
  }
  if(scope!=='roads'){
   const button=template(ui,'jf_realm_establish_'+scope);
   for(const state of Object.values(children(button))){
    const caption=children(state).caption;assert.equal(caption.text_alignment,'center');assert.deepEqual(caption.offset,[0,0]);
   }
  }
 }
});

test('Hidden scrolling lists read row markers from the shared dashboard and keep native data bindings active',async()=>{
 const ui=await loadUI(),state=children(ui.jf_dashboard).jf_menu_state;
 assert.equal(state.type,'panel');assert.equal(state.visible,undefined);
 assert.deepEqual(state.bindings,[{binding_name:'#form_text',binding_type:'none',binding_condition:'always'}]);
 let markerBindings=0,collectionBindings=0;
 function check(value){
  if(!value||typeof value!=='object')return;
  for(const binding of value.bindings||[]){
   if(binding.binding_type==='collection'||binding.binding_type==='collection_details'){
    assert.equal(binding.binding_condition,'always');collectionBindings++;
   }
   if(binding.binding_type==='view'&&['#visible','#enabled'].includes(binding.target_property_name)&&binding.source_property_name.includes('#form_text')){
    assert.equal(binding.source_control_name,'jf_menu_state');assert.equal(binding.binding_condition,'always');markerBindings++;
    assert.ok(!(value.bindings||[]).some(b=>b.binding_name==='#form_text'),'Read shared state instead of a hidden local body binding');
   }
  }
  for(const child of Object.values(value))check(child);
 }
 for(const [key,value]of Object.entries(ui))if(/^(jf_realm_|jf_prospect_|jf_prospecting_|jf_data_prospectInfo|jf_action_prospectSelect)/.test(key))check(value);
 assert.ok(markerBindings>0);assert.ok(collectionBindings>0);
});

test('form payload packs later records without gaps and preserves contiguous collection ranges',async()=>{
 const source=await readFile(new URL('../packs/behavior/scripts/charter-layout.js',import.meta.url),'utf8');
 const {CHARTER_LAYOUT:layout}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const indices=[...Object.values(layout.data),...Object.values(layout.actions)];
 assert.equal(new Set(indices).size,indices.length);
 assert.ok(layout.recordCount<=300,'Avoid the former 506-record sparse payload');
 const later=indices.filter(index=>index>=98).sort((a,b)=>a-b);
 assert.deepEqual(later,Array.from({length:later.length},(_,i)=>i+98));
 for(const [group,prefix,count]of [['data','stockCount',30],['data','prospectInfo',52],['actions','prospectSelect',52]]){
  for(let i=0;i<count;i++)assert.equal(layout[group][prefix+i],layout[group][prefix+'0']+i);
 }
});

test('Every tab stays local, defaults to its first page and applies refresh selection only once',async()=>{
 const ui=await loadUI(),dashboard=children(ui.jf_dashboard);
 const tabs=['overview','research','production','realm','information'].map(name=>dashboard['jf_tab_'+name]);
 for(const [section,scopes]of [['research',['local','global']],['production',['summary','biomes']],['realm',['roads','mine','all']]]){
  const pane=children(ui['jf_'+section+'_content']);tabs.push(...scopes.map(scope=>pane['jf_'+section+'_tab_'+scope]));
 }
 for(const tab of tabs){
  assert.equal(tab.type,'toggle');assert.equal(tab.toggle_group_default_selected,0);assert.equal(tab.toggle_default_state,tab.toggle_group_forced_index===0);
  assert.equal(JSON.stringify(tab).includes('button.form_button_click'),false);
  assert.ok(tab.bindings.some(binding=>binding.binding_type==='view'&&binding.target_property_name==='#toggle_state'&&binding.binding_condition==='once'));
 }
 const {CHARTER_LAYOUT:layout}=await import('../packs/behavior/scripts/charter-layout.js');
 assert.equal(Object.keys(layout.actions).some(key=>key.startsWith('nav')),false);
 for(const kind of ['scan','rename']){
  const header=children(dashboard[kind==='scan'?'header_survey':'header_rename']);
  for(const entry of layout.viewActions){
   const group=header[entry.page.toLowerCase()];assert.ok(group.bindings.some(binding=>binding.source_control_name==='jf_tab_'+entry.page.toLowerCase()));
   const wrapper=children(group)[entry[kind]];assert.equal(wrapper.collection_name,'form_buttons');
   assert.equal(Object.values(wrapper.controls[0])[0].collection_index,layout.actions[entry[kind]]);
   const scope=entry[entry.page.toLowerCase()+'Scope'];
   if(scope)assert.ok(wrapper.bindings.some(binding=>binding.source_control_name==='jf_'+entry.page.toLowerCase()+'_tab_'+scope));
  }
 }
});

test('Fresh tab groups have exactly one selected default and refresh markers select the intended view',async()=>{
 const ui=await loadUI(),dashboard=children(ui.jf_dashboard);
 const groups=[['tab',['overview','research','production','realm','information'].map(name=>dashboard['jf_tab_'+name])]];
 for(const [section,scopes]of [['research',['local','global']],['production',['summary','biomes']],['realm',['roads','mine','all']]]){
  const pane=children(ui['jf_'+section+'_content']);groups.push([section,scopes.map(scope=>pane['jf_'+section+'_tab_'+scope])]);
 }
 for(const [section,tabs]of groups){
  assert.equal(tabs.filter(tab=>tab.toggle_default_state).length,1);assert.equal(tabs[0].property_bag['#toggle_state'],true);
  for(const chosen of tabs){
   const chosenBinding=chosen.bindings.find(binding=>binding.binding_type==='view'&&binding.target_property_name==='#toggle_state');
   const marker=chosenBinding.source_property_name.match(/#form_text - '([^']+)'/)[1];
   const active=tabs.filter(tab=>{
    const init=tab.bindings.find(binding=>binding.binding_type==='view'&&binding.target_property_name==='#toggle_state');
    assert.equal(init.binding_condition,'once');
    const expected=init.source_property_name.match(/#form_text - '([^']+)'/)[1];
    return marker.replace(expected,'')!==marker;
   });
   assert.deepEqual(active,[chosen],section+': '+marker);
  }
 }
});

test('Road bars label Travel Cost and Road, with the countdown beneath the tier icon',async()=>{
 const ui=await loadUI(),row=children(ui.jf_realm_roads_rows).row0,fields=children(row);
 assert.equal(fields.cost_label.text,'Travel Cost');assert.equal(fields.road_label.text,'Road');
 assert.deepEqual(row.size,[251,38]);assert.deepEqual(fields.cost.size,[44,12]);
 assert.ok(fields.road_label.offset[1]+fields.road_label.size[1]<=fields.tier_icon.offset[1]);
 assert.ok(fields.time.offset[1]>=fields.tier_icon.offset[1]+fields.tier_icon.size[1]);
 assert.ok(fields.time.offset[1]+fields.time.size[1]<=row.size[1]);
});

test('Road heading and enlarged icon are centered between price and Travel with no tier caption',async()=>{
 const ui=await loadUI(),row=children(ui.jf_realm_roads_rows).row0,fields=children(row);
 const left=fields.cost.offset[0]+fields.cost.size[0],right=fields.travel.offset[0],center=(left+right)/2;
 assert.equal(fields.road_label.offset[0]+fields.road_label.size[0]/2,center);
 assert.equal(fields.tier_icon.offset[0]+fields.tier_icon.size[0]/2,center);
 assert.deepEqual(fields.tier_icon.size,[20,20]);assert.deepEqual(ui.jf_realm_road_tier_icon.size,[20,20]);
 assert.equal(fields.status,undefined);assert.equal(ui.jf_realm_roads_status,undefined);
 assert.ok(fields.road_label.offset[1]+fields.road_label.size[1]<=fields.tier_icon.offset[1]);
 assert.ok(fields.tier_icon.offset[1]+fields.tier_icon.size[1]<=fields.time.offset[1]);
});
