import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { CodexClient } from '../src/rpc.mjs';
const fixture = fileURLToPath(new URL('./fixtures/codex.mjs', import.meta.url));
const clientFor = (mode, timeoutMs = 2000) => new CodexClient({ bin: process.execPath, args: [fixture, mode], timeoutMs });

test('official handshake and read-only account methods return quotas without identity', async () => {
  const client = clientFor('ok');
  try {
    await client.connect();
    const data = await client.read();
    assert.equal(data.planType, 'pro');
    assert.equal(data.quotas.rateLimits.primary.usedPercent, 27);
    assert.doesNotMatch(JSON.stringify(data), /private|PRIVATE_ACCOUNT/);
  } finally { await client.close(); }
  assert.equal(client.pending.size, 0);
  assert.equal(client.closed, true);
});

for (const mode of ['logged-out', 'api']) test(`auth state ${mode} gives actionable error`, async () => {
  const client = clientFor(mode);
  try { await client.connect(); await assert.rejects(client.read(), { code: 'auth' }); }
  finally { await client.close(); }
});

test('remote errors do not leak upstream details', async () => {
  const client = clientFor('error');
  try { await client.connect(); await assert.rejects(client.read(), (e) => e.code === 'rpc' && !e.message.includes('PRIVATE_DETAIL')); }
  finally { await client.close(); }
});

for (const mode of ['hang', 'exit', 'malformed', 'oversize']) test(`transport ${mode} fails within a bound and cleans up`, async () => {
  const client = clientFor(mode, 500);
  try { await assert.rejects(client.connect()); }
  finally { await client.close(); }
  assert.equal(client.pending.size, 0);
  assert.equal(client.closed, true);
});

test('missing Codex reports setup instructions instead of a stack trace', async () => {
  const client = new CodexClient({ bin: 'herdr-usage-nonexistent-executable' });
  try { await assert.rejects(client.connect(), /Codex CLI non trovata/); }
  finally { await client.close(); }
});
