import test from 'node:test';
import assert from 'node:assert/strict';
import { createCache, footerState, refreshCache, isLocalCodex } from '../desktop/state.js';

const now = Date.parse('2026-11-06T18:00:00Z');
const data = (windows = [{ usedPercent: 26, label: 'Week', resetsAt: now / 1000 + 3600 }]) => ({
  enabled: true, refreshSeconds: 60, warningPercent: 80, criticalPercent: 95,
  fetchedAt: new Date(now).toISOString(), windows,
});

test('the local account is never attributed to remote Codex chats or other programs', () => {
  assert.equal(isLocalCodex({ pane: 'p1', app: 'codex' }), true);
  assert.equal(isLocalCodex({ pane: 'p2', app: null, program: { key: 'codex' } }), true);
  assert.equal(isLocalCodex({ pane: 'server/p1', app: 'codex' }), false);
  assert.equal(isLocalCodex({ pane: 'p3', app: 'claude-code' }), false);
  assert.equal(isLocalCodex(null), false);
});

test('footer chooses the most constrained known window and clamps exhausted quota', () => {
  const cache = createCache();
  cache.data = data([{ usedPercent: null }, { usedPercent: 20 }, { usedPercent: 110, label: '3 hours' }]);
  assert.equal(footerState(cache, now).remaining, 0);
  assert.equal(footerState(cache, now).tone, 'blocked');
  assert.equal(footerState(cache, now).label, '3 hours');
});

test('missing quota and reset are explicit instead of presented as a full plan', () => {
  const cache = createCache();
  cache.data = data([{ usedPercent: null, resetsAt: null }]);
  const state = footerState(cache, now);
  assert.equal(state.remaining, null);
  assert.equal(state.text, 'Quota unavailable');
  assert.equal(state.reset, 'Reset time unavailable');
});

test('expired resets remain pending until a confirmed service reading', () => {
  const cache = createCache();
  cache.data = data([{ usedPercent: 26, resetsAt: now / 1000 - 1 }]);
  assert.equal(footerState(cache, now).reset, 'Reset pending');
  assert.equal(footerState(cache, now).remaining, 74);
});

test('pane copies share an in-flight read and respect refresh interval', async () => {
  const cache = createCache();
  let reads = 0, release;
  const load = () => { reads += 1; return new Promise((resolve) => { release = resolve; }); };
  const first = refreshCache(cache, load, now);
  const second = refreshCache(cache, load, now);
  release(data());
  await Promise.all([first, second]);
  await refreshCache(cache, load, now + 10000);
  assert.equal(reads, 1);
});

test('an abandoned read after native reload cannot block or overwrite a new reading', async () => {
  const cache = createCache();
  let release;
  const oldRead = refreshCache(cache, () => new Promise((resolve) => { release = resolve; }), now);
  let freshRead = false;
  const nextRead = refreshCache(cache, async () => {
    freshRead = true;
    return data([{ usedPercent: 40, label: 'Week' }]);
  }, now + 45000);
  assert.equal(freshRead, true);
  await nextRead;
  release(data([{ usedPercent: 10, label: 'Week' }]));
  await oldRead;
  assert.equal(footerState(cache, now + 45000).remaining, 60);
});

test('errors retain the previous reading, mark it stale and back off', async () => {
  const cache = createCache();
  await refreshCache(cache, async () => data(), now);
  await refreshCache(cache, async () => { throw new Error('upstream'); }, now + 60000);
  const state = footerState(cache, now + 60000);
  assert.equal(state.remaining, 74);
  assert.match(state.text, /stale/);
  assert.equal(cache.nextAt, now + 180000);
});

test('old data is stale, disabled automation stays disabled, forced reads are throttled', async () => {
  const cache = createCache();
  await refreshCache(cache, async () => data(), now);
  assert.equal(footerState(cache, now + 181000).stale, true);
  await refreshCache(cache, async () => ({ ...data(), enabled: false }), now + 6000, true);
  assert.equal(footerState(cache, now + 6000).enabled, false);
  await refreshCache(cache, async () => { throw new Error('should not run'); }, now + 6500, true);
  assert.equal(cache.error, false);
});
