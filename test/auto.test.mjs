import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { autoSync, ensureIndicator, eventPaneId, isCodexChat } from '../src/auto.mjs';

async function fixture(t) {
  const state = await mkdtemp(join(tmpdir(), 'herdr-auto-test-'));
  t.after(() => rm(state, { recursive: true, force: true }));
  const root = '/example/plugin';
  const env = { HERDR_ENV: '1', HERDR_PLUGIN_STATE_DIR: state, HERDR_SOCKET_PATH: '/example/session.sock' };
  const source = { pane_id: 'w1:p1', tab_id: 'w1:t1', agent: 'codex', cwd: '/example/project' };
  const snapshot = {
    panes: [source, { pane_id: 'w1:p2', tab_id: 'w1:t1', agent: 'claude' }],
    layouts: [{ tab_id: 'w1:t1', panes: [{ pane_id: source.pane_id, rect: { x: 0, y: 0, width: 60, height: 40 } }], splits: [] }],
  };
  const calls = [];
  const indicator = { pane_id: 'w1:p3', tab_id: 'w1:t1', cwd: root, label: 'OpenAI · available quota' };
  const addIndicator = () => {
    snapshot.panes.push(indicator);
    snapshot.layouts[0].panes[0].rect.height = 35;
    snapshot.layouts[0].panes.push({ pane_id: indicator.pane_id, rect: { x: 0, y: 35, width: 60, height: 5 } });
  };
  const run = (args) => {
    calls.push(args);
    if (args[0] === 'api') return { snapshot: structuredClone(snapshot) };
    if (args[0] === 'plugin' && args[2] === 'open') { addIndicator(); return { plugin_pane: { pane: indicator } }; }
    if (args[1] === 'layout') return { layout: structuredClone(snapshot.layouts[0]) };
    if (args[1] === 'report-metadata') { indicator.tokens = { openai_usage_parent: source.pane_id }; return {}; }
    if (args[0] === 'plugin' && args[2] === 'close') { snapshot.panes = snapshot.panes.filter((p) => p.pane_id !== args[3]); return {}; }
    throw new Error(`Unexpected command ${args[0]} ${args[1]}`);
  };
  return { env, root, run, calls, snapshot, source, indicator, addIndicator };
}

test('repeated status events open a single indicator and preserve the target and focus', async (t) => {
  const f = await fixture(t);
  assert.equal((await ensureIndicator(f.source.pane_id, f)).status, 'opened');
  assert.equal((await ensureIndicator(f.source.pane_id, f)).status, 'existing');
  const opens = f.calls.filter((a) => a[2] === 'open');
  assert.equal(opens.length, 1);
  assert.ok(opens[0].includes('--no-focus'));
  assert.ok(opens[0].includes(f.source.pane_id));
  assert.ok(!opens[0].includes('--workspace'));
});

test('simultaneous hooks cannot create duplicate indicators', async (t) => {
  const f = await fixture(t);
  const results = await Promise.all(Array.from({ length: 8 }, () => ensureIndicator(f.source.pane_id, f)));
  assert.equal(results.filter((r) => r.status === 'opened').length, 1);
  assert.equal(f.calls.filter((a) => a[2] === 'open').length, 1);
});

test('a lock whose owner is still being written is not stolen', async (t) => {
  const f = await fixture(t);
  const key = createHash('sha256').update(`${f.env.HERDR_SOCKET_PATH}:${f.source.pane_id}`).digest('hex');
  const lock = join(f.env.HERDR_PLUGIN_STATE_DIR, 'auto-locks', key);
  await mkdir(lock, { recursive: true });
  await writeFile(join(lock, 'pid'), '');
  assert.equal((await ensureIndicator(f.source.pane_id, f)).status, 'busy');
  assert.equal(f.calls.length, 0);
});

test('startup adopts the existing manual indicator instead of duplicating it', async (t) => {
  const f = await fixture(t);
  // Simulate a pane opened before the English translation.
  f.indicator.label = 'OpenAI · quota disponibile';
  f.addIndicator();
  const result = await autoSync({ autoOpen: true }, f);
  assert.equal(result.chats, 1);
  assert.equal(f.calls.filter((a) => a[2] === 'open').length, 0);
  assert.equal(f.indicator.tokens.openai_usage_parent, f.source.pane_id);
});

test('ordinary terminals, other agents and the monitor itself never trigger recursion', async (t) => {
  const f = await fixture(t);
  f.addIndicator(); f.indicator.agent = 'codex';
  f.snapshot.panes.push({ pane_id: 'w1:p4', agent: 'codex', restore_error: 'unavailable' });
  for (const id of ['w1:p2', 'w1:p3', 'w1:p4', 'missing']) assert.equal((await ensureIndicator(id, f)).status, 'ignored');
  assert.equal(f.calls.filter((a) => a[2] === 'open').length, 0);
  assert.ok(isCodexChat({ agent_session: { agent: 'codex' } }));
});

test('event envelope targets its own chat even when the focused pane differs', async (t) => {
  const f = await fixture(t);
  f.env.HERDR_PANE_ID = 'another-focused-pane';
  f.env.HERDR_PLUGIN_EVENT = 'pane.agent_detected';
  f.env.HERDR_PLUGIN_EVENT_JSON = JSON.stringify({ event: 'pane.agent_detected', data: { pane_id: f.source.pane_id } });
  assert.equal((await autoSync({ autoOpen: true }, { ...f, event: true })).status, 'opened');
  assert.ok(f.calls.find((a) => a[2] === 'open').includes(f.source.pane_id));
  assert.equal(eventPaneId('{"pane":{"pane_id":"created-pane"}}'), 'created-pane');
  assert.throws(() => eventPaneId('invalid'), /Invalid/);
});

test('disabled auto opening performs no Herdr calls and can still leave manual mode usable', async (t) => {
  const f = await fixture(t);
  assert.equal((await autoSync({ autoOpen: false }, f)).status, 'disabled');
  assert.equal(f.calls.length, 0);
  assert.equal((await ensureIndicator(f.source.pane_id, f)).status, 'opened');
});

test('closing a source chat closes only its own tagged indicator', async (t) => {
  const f = await fixture(t);
  await ensureIndicator(f.source.pane_id, f);
  f.snapshot.panes = f.snapshot.panes.filter((p) => p.pane_id !== f.source.pane_id);
  f.snapshot.panes.push({ pane_id: 'unrelated', cwd: f.root, label: f.indicator.label, tokens: { openai_usage_parent: 'other-chat' } });
  f.env.HERDR_PLUGIN_EVENT = 'pane.closed';
  f.env.HERDR_PLUGIN_EVENT_JSON = JSON.stringify({ data: { pane_id: f.source.pane_id } });
  assert.equal((await autoSync({ autoOpen: true }, { ...f, event: true })).status, 'cleaned');
  assert.deepEqual(f.calls.filter((a) => a[2] === 'close'), [['plugin', 'pane', 'close', f.indicator.pane_id]]);
  assert.ok(f.snapshot.panes.some((p) => p.pane_id === 'unrelated'));
});

test('failed launch releases its lock so a later hook can recover', async (t) => {
  const f = await fixture(t);
  await assert.rejects(ensureIndicator(f.source.pane_id, { ...f, run(args) { if (args[2] === 'open') throw new Error('temporary failure'); return f.run(args); } }));
  assert.equal((await ensureIndicator(f.source.pane_id, f)).status, 'opened');
});
