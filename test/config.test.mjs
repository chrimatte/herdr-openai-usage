import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defaults, loadConfig, validateConfig } from '../src/config.mjs';

test('defaults work without setup; invalid polling and thresholds are rejected', () => {
  assert.deepEqual(validateConfig(), defaults);
  for (const value of [null, [], { refreshSeconds: 0 }, { refreshSeconds: '60' }, { warningPercent: 99, criticalPercent: 80 }, { codexPath: '' }, { autoOpen: 'true' }, { surprise: true }, JSON.parse('{"__proto__":{}}')]) {
    assert.throws(() => validateConfig(value));
  }
  assert.equal(validateConfig({ codexPath: '/Applications/Example App/codex' }).codexPath, '/Applications/Example App/codex');
});

test('config is loaded only from Herdr config directory, absent file uses defaults', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'herdr-usage-test-'));
  try {
    assert.deepEqual(await loadConfig({ HERDR_PLUGIN_CONFIG_DIR: dir }), defaults);
    await writeFile(join(dir, 'config.json'), '{"refreshSeconds":120}');
    assert.equal((await loadConfig({ HERDR_PLUGIN_CONFIG_DIR: dir })).refreshSeconds, 120);
    await writeFile(join(dir, 'config.json'), 'invalid PRIVATE_DETAIL');
    await assert.rejects(loadConfig({ HERDR_PLUGIN_CONFIG_DIR: dir }), (e) => !e.message.includes('PRIVATE_DETAIL'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});
