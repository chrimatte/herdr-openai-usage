import test from 'node:test';
import assert from 'node:assert/strict';
import { openPane, runHerdr } from '../src/herdr.mjs';
const env = { HERDR_ENV: '1', HERDR_PANE_ID: 'workspace:p1', HERDR_WORKSPACE_ID: 'workspace' };

test('Herdr reporting commands can succeed without a JSON response', () => {
  assert.deepEqual(runHerdr(['-e', 'process.exit(0)'], { HERDR_BIN_PATH: process.execPath }), {});
  assert.throws(() => runHerdr(['-e', 'console.log("invalid")'], { HERDR_BIN_PATH: process.execPath }), /Invalid/);
});

test('indicator opens below the chat without stealing focus or conflicting workspace flags', () => {
  const calls = [];
  const result = openPane({ env, run(args) {
    calls.push(args);
    if (calls.length === 1) return { plugin_pane: { pane: { pane_id: 'workspace:p3' } } };
    if (calls.length === 2) return { layout: { panes: [{ pane_id: env.HERDR_PANE_ID, rect: { x: 0, y: 0, width: 60, height: 20 } }], splits: [{ direction: 'right', ratio: 0.5, rect: { x: 0, y: 0, width: 120, height: 40 } }, { direction: 'down', ratio: 0.5, rect: { x: 0, y: 0, width: 60, height: 40 } }] } };
    return {};
  } });
  assert.equal(result.resizeWarning, false);
  assert.ok(calls[0].includes('--no-focus'));
  assert.ok(calls[0].includes('down'));
  assert.ok(calls[0].includes('indicator'));
  assert.ok(calls[0].includes(env.HERDR_PANE_ID));
  assert.ok(!calls[0].includes('--workspace'));
  assert.deepEqual(calls[2], ['pane', 'resize', '--pane', env.HERDR_PANE_ID, '--direction', 'down', '--amount', '0.375']);
});

test('details is an overlay and never changes split ratios', () => {
  let count = 0;
  openPane({ env, details: true, run(args) { count++; assert.ok(args.includes('overlay')); return {}; } });
  assert.equal(count, 1);
});

test('resize failure preserves the successfully opened indicator', () => {
  let count = 0;
  const result = openPane({ env, run() { if (++count === 1) return { opened: true }; throw new Error('unsupported'); } });
  assert.deepEqual(result.opened, { opened: true });
  assert.equal(result.resizeWarning, true);
  assert.throws(() => openPane({ env: {} }), /from Herdr/);
});
