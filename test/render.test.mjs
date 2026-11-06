import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSnapshot } from '../src/data.mjs';
import { render, renderCompact, resetLabel } from '../src/render.mjs';
const now = 1800000000000;
const make = (used = 23, reset = now / 1000 + 3600) => normalizeSnapshot({ planType: 'pro', quotas: { rateLimits: { primary: { usedPercent: used, windowDurationMins: 10080, resetsAt: reset } } } }, now);

test('compact indicator shows remaining quota, real duration and reset in three lines', () => {
  const lines = renderCompact({ snapshot: make() }, { now });
  assert.equal(lines.length, 3);
  assert.match(lines[0], /77% available · week/);
  assert.equal((lines[0].match(/█/gu) || []).length, 9);
  assert.match(lines[1], /Resets in/);
  assert.match(lines[2], /refresh/);
});

test('compact chooses most consumed window, supports narrow panes and no color', () => {
  const snapshot = make();
  snapshot.buckets[0].windows.push({ ...snapshot.buckets[0].windows[0], usedPercent: 95, remainingPercent: 5 });
  assert.match(renderCompact({ snapshot }, { now })[0], /5% available/);
  for (const columns of [20, 40, 80, 160]) {
    for (const line of renderCompact({ snapshot }, { columns, now })) {
      assert.ok([...line].length < columns);
      assert.ok(!line.includes('\x1b'));
    }
  }
});

test('error retains last data but clearly marks it stale, never implies a reset', () => {
  const snapshot = make(95, now / 1000 - 1);
  const detailed = render({ snapshot, error: 'No connection' }, { now }).join('\n');
  assert.match(detailed, /STALE DATA/);
  assert.match(detailed, /95% used · needs verification/);
  assert.match(detailed, /Reset pending/);
  assert.doesNotMatch(detailed, /0% used/);
  assert.match(renderCompact({ snapshot, error: 'No connection' }, { now })[1], /Stale/);
  assert.match(resetLabel(null, now), /not provided/);
});

test('color reflects quota thresholds and missing quotas are explicit', () => {
  assert.match(renderCompact({ snapshot: make(96) }, { now, color: true })[0], /\x1b\[1;31m/);
  assert.match(renderCompact({ snapshot: make(85) }, { now, color: true })[0], /\x1b\[33m/);
  assert.match(renderCompact({ snapshot: normalizeSnapshot({ quotas: {} }) }, { now })[0], /not provided/);
  assert.match(renderCompact({ loading: true }, { now })[0], /connecting/);
});
