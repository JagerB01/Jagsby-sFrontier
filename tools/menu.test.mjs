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

test('charter UI uses an actual factory and retains non-charter form routes', async () => {
  const ui = JSON.parse(await readFile(new URL('../packs/resource/ui/server_form.json',import.meta.url),'utf8'));
  const modification = ui.main_screen_content.modifications[0];
  assert.equal(modification.operation,'replace');
  assert.equal(modification.where.control_name,'server_form_factory');
  const factory = modification.value.server_form_factory;
  assert.equal(factory.type,'factory');
  assert.equal(factory.control_ids.long_form,'@server_form.jagsby_frontier_router');
  assert.equal(factory.control_ids.custom_form,'@server_form.custom_form');
  assert.ok(ui.jagsby_frontier_router.controls.some(c => c['vanilla@server_form.long_form']));
  assert.ok(ui.jagsby_frontier_router.controls.some(c => c['charter@server_form.jagsby_frontier_form']));
  assert.equal(ui.long_form,undefined,'Do not globally hide the original form');
});
