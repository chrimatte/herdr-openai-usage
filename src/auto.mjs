import { mkdir, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openPane, runHerdr } from './herdr.mjs';

const pluginRoot = fileURLToPath(new URL('..', import.meta.url));
const parentToken = 'openai_usage_parent';

export function isIndicator(pane, root = pluginRoot) {
  return !!pane?.cwd && resolve(pane.cwd) === resolve(root)
    && (pane.label === 'OpenAI · quota disponibile' || typeof pane.tokens?.[parentToken] === 'string');
}

export function isCodexChat(pane, root = pluginRoot) {
  return !!pane && !pane.restore_error && !isIndicator(pane, root)
    && (pane.agent === 'codex' || pane.agent_session?.agent === 'codex');
}

export function findIndicator(snapshot, source, root = pluginRoot) {
  const candidates = snapshot.panes.filter((p) => isIndicator(p, root));
  const tagged = candidates.find((p) => p.tokens?.[parentToken] === source.pane_id);
  if (tagged) return tagged;
  // Adopt the manually opened v0.1 indicator when it is directly below this chat.
  const layout = snapshot.layouts?.find((l) => l.tab_id === source.tab_id);
  const chat = layout?.panes.find((p) => p.pane_id === source.pane_id)?.rect;
  if (!chat) return null;
  return candidates.find((p) => {
    if (p.tokens?.[parentToken]) return false;
    const rect = layout.panes.find((item) => item.pane_id === p.pane_id)?.rect;
    return rect && rect.x === chat.x && rect.y === chat.y + chat.height && rect.width === chat.width;
  }) || null;
}

async function withPaneLock(env, paneId, task) {
  if (!env.HERDR_PLUGIN_STATE_DIR) throw new Error('Herdr non ha fornito la directory di stato del plugin.');
  const key = createHash('sha256').update(`${env.HERDR_SOCKET_PATH || 'default'}:${paneId}`).digest('hex');
  const directory = join(env.HERDR_PLUGIN_STATE_DIR, 'auto-locks');
  const lock = join(directory, key);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  try { await mkdir(lock, { mode: 0o700 }); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    // Recover a lock left by an interrupted hook, while respecting a live owner.
    let owner;
    try { owner = Number(await readFile(join(lock, 'pid'), 'utf8')); }
    catch { /* The owner may still be creating the pid file. */ }
    if (!Number.isSafeInteger(owner) || owner <= 0) {
      try { if (Date.now() - (await stat(lock)).mtimeMs < 120000) return { status: 'busy' }; }
      catch (err) { if (err.code === 'ENOENT') return { status: 'busy' }; throw err; }
    }
    if (Number.isSafeInteger(owner) && owner > 0) {
      try { process.kill(owner, 0); return { status: 'busy' }; }
      catch (err) { if (err.code !== 'ESRCH') return { status: 'busy' }; }
    }
    await rm(lock, { recursive: true, force: true });
    try { await mkdir(lock, { mode: 0o700 }); }
    catch (err) { if (err.code === 'EEXIST') return { status: 'busy' }; throw err; }
  }
  try {
    await writeFile(join(lock, 'pid'), String(process.pid), { mode: 0o600 });
    return await task();
  } finally { await rm(lock, { recursive: true, force: true }); }
}

export async function ensureIndicator(paneId, {
  env = process.env, root = pluginRoot, run = (args) => runHerdr(args, env),
} = {}) {
  if (!paneId || typeof paneId !== 'string') return { status: 'ignored' };
  return withPaneLock(env, paneId, async () => {
    // Refresh while holding the lock: concurrent status hooks cannot both open a pane.
    const snapshot = run(['api', 'snapshot']).snapshot;
    const source = snapshot.panes.find((p) => p.pane_id === paneId);
    if (!isCodexChat(source, root)) return { status: 'ignored' };
    let indicator = findIndicator(snapshot, source, root);
    const existed = !!indicator;
    if (!indicator) {
      const result = openPane({ env: { ...env, HERDR_PANE_ID: paneId }, run });
      indicator = result.opened?.plugin_pane?.pane;
      if (!indicator?.pane_id) throw new Error('Herdr non ha restituito il nuovo indicatore.');
    }
    if (indicator.tokens?.[parentToken] !== paneId) {
      run(['pane', 'report-metadata', indicator.pane_id, '--source', 'local.openai-usage', '--token', `${parentToken}=${paneId}`]);
    }
    return { status: existed ? 'existing' : 'opened' };
  });
}

export function eventPaneId(raw) {
  let envelope;
  try { envelope = JSON.parse(raw || '{}'); }
  catch { throw new Error('Evento Herdr non valido.'); }
  const data = envelope.data || envelope;
  return typeof data.pane_id === 'string' ? data.pane_id : data.pane?.pane_id;
}

export async function autoSync(config, { env = process.env, run = (args) => runHerdr(args, env), root = pluginRoot, event = false } = {}) {
  if (env.HERDR_ENV !== '1') throw new Error('L’apertura automatica richiede Herdr.');
  if (!config.autoOpen) return { status: 'disabled' };
  if (event) {
    const paneId = eventPaneId(env.HERDR_PLUGIN_EVENT_JSON);
    if (env.HERDR_PLUGIN_EVENT === 'pane.closed') {
      const snapshot = run(['api', 'snapshot']).snapshot;
      // Only close our tagged indicator when its own source chat was closed.
      if (!paneId || snapshot.panes.some((p) => p.pane_id === paneId)) return { status: 'ignored' };
      for (const pane of snapshot.panes.filter((p) => isIndicator(p, root) && p.tokens?.[parentToken] === paneId)) {
        run(['plugin', 'pane', 'close', pane.pane_id]);
      }
      return { status: 'cleaned' };
    }
    return ensureIndicator(paneId, { env, run, root });
  }
  const snapshot = run(['api', 'snapshot']).snapshot;
  const results = [];
  for (const pane of snapshot.panes.filter((p) => isCodexChat(p, root))) {
    results.push(await ensureIndicator(pane.pane_id, { env, run, root }));
  }
  return { status: 'synced', chats: results.length };
}
