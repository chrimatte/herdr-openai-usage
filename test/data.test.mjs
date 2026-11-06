import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSnapshot, windowLabel, planLabel, cleanText } from '../src/data.mjs';
const primary = { usedPercent: 23, windowDurationMins: 10080, resetsAt: 2000000000 };

test('uses live durations and prefers multi-bucket data over legacy duplicate', () => {
  const snapshot = normalizeSnapshot({ planType: 'prolite', quotas: {
    accountId: 'private', rateLimits: { primary: { ...primary, usedPercent: 99 } },
    rateLimitsByLimitId: { codex: { primary }, other: { secondary: { ...primary, windowDurationMins: 300 } } },
  } }, 1800000000000);
  assert.equal(snapshot.buckets.length, 2);
  assert.equal(snapshot.buckets[0].windows[0].remainingPercent, 77);
  assert.equal(snapshot.buckets[0].windows.length, 1);
  assert.equal(windowLabel(snapshot.buckets[0].windows[0]), 'Settimana');
  assert.equal(windowLabel(snapshot.buckets[1].windows[0]), '5 ore');
  assert.equal(planLabel(snapshot.planType), 'Pro (prolite)');
  assert.equal(JSON.stringify(snapshot).includes('private'), false);
});

test('legacy and empty quota responses preserve unknowns', () => {
  const old = normalizeSnapshot({ quotas: { rateLimits: { primary: { usedPercent: null } } } });
  assert.equal(old.buckets[0].windows[0].remainingPercent, null);
  assert.equal(old.buckets[0].windows[0].resetsAt, null);
  assert.deepEqual(normalizeSnapshot({ quotas: {} }).buckets, []);
  assert.equal(normalizeSnapshot({ quotas: {} }).ordinaryUsageAllowed, null);
});

test('invalid percentages do not become zero and over-limit values remain truthful', () => {
  for (const value of [undefined, '25', NaN, -1, Infinity]) {
    const result = normalizeSnapshot({ quotas: { rateLimits: { primary: { usedPercent: value } } } });
    assert.equal(result.buckets[0].windows[0].usedPercent, null);
  }
  const result = normalizeSnapshot({ quotas: { rateLimits: { primary: { usedPercent: 110 } } } });
  assert.equal(result.buckets[0].windows[0].usedPercent, 110);
  assert.equal(result.buckets[0].windows[0].remainingPercent, 0);
});

test('controls and private fields are excluded; credits and restrictions remain', () => {
  const result = normalizeSnapshot({ quotas: { ordinaryUsageAllowed: false, rateLimitResetCredits: { availableCount: 2, credits: [{ id: 'private' }] }, rateLimits: {
    limitName: '\x1b[31mDanger\n\u202e', primary, credits: { balance: '12.5', unlimited: false, hasCredits: true }, rateLimitReachedType: 'weekly', spendControlReached: true,
  } } });
  assert.equal(result.buckets[0].name.includes('\x1b'), false);
  assert.equal(result.buckets[0].spendControlReached, true);
  assert.equal(result.buckets[0].credits.balance, '12.5');
  assert.equal(result.resetCredits, 2);
  assert.equal(result.ordinaryUsageAllowed, false);
  assert.equal(JSON.stringify(result).includes('private'), false);
  assert.equal(cleanText(null), '');
});
