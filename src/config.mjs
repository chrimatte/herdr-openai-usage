import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const defaults = Object.freeze({
  refreshSeconds: 60, warningPercent: 80, criticalPercent: 95, codexPath: 'codex', autoOpen: true,
});

export function validateConfig(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('config.json must contain a JSON object.');
  }
  for (const key of Object.keys(input)) {
    if (!Object.hasOwn(defaults, key)) throw new Error('Unknown option in config.json.');
  }
  const config = { ...defaults, ...input };
  if (typeof config.autoOpen !== 'boolean') throw new Error('autoOpen must be true or false.');
  if (!Number.isInteger(config.refreshSeconds) || config.refreshSeconds < 30 || config.refreshSeconds > 3600) {
    throw new Error('refreshSeconds must be an integer between 30 and 3600.');
  }
  if (!Number.isFinite(config.warningPercent) || !Number.isFinite(config.criticalPercent)
    || config.warningPercent < 1 || config.warningPercent >= config.criticalPercent || config.criticalPercent > 100) {
    throw new Error('Thresholds must satisfy: 1 <= warningPercent < criticalPercent <= 100.');
  }
  if (typeof config.codexPath !== 'string' || !config.codexPath.trim() || /[\x00-\x1f\x7f]/u.test(config.codexPath)) {
    throw new Error('codexPath must specify an executable without arguments.');
  }
  return config;
}

export async function loadConfig(env = process.env) {
  if (!env.HERDR_PLUGIN_CONFIG_DIR) return validateConfig();
  let raw;
  try { raw = await readFile(join(env.HERDR_PLUGIN_CONFIG_DIR, 'config.json'), 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return validateConfig(); throw new Error('Could not read config.json.'); }
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch { throw new Error('config.json does not contain valid JSON.'); }
  return validateConfig(parsed);
}
