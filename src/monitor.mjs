import { emitKeypressEvents } from 'node:readline';
import { CodexClient, MonitorError } from './rpc.mjs';
import { normalizeSnapshot } from './data.mjs';
import { render, renderCompact } from './render.mjs';

export async function fetchSnapshot(config) {
  const client = new CodexClient({ bin: config.codexPath });
  try { await client.connect(); return normalizeSnapshot(await client.read()); }
  finally { await client.close(); }
}

export async function watch(config, { demo = null, openDashboard = () => {}, compact = false } = {}) {
  if (!process.stdout.isTTY || !process.stdin.isTTY) {
    const snapshot = demo || await fetchSnapshot(config);
    process.stdout.write((compact ? renderCompact : render)({ snapshot, demo: !!demo }, { config }).join('\n') + '\n');
    return;
  }
  const state = { snapshot: demo, loading: !demo, error: null, nextAt: null, demo: !!demo };
  let client = null, stopped = false, failures = 0, lastAttempt = 0, offset = 0, activeRead = null, lastFrame = null;
  const draw = () => {
    if (stopped) return;
    const lines = (compact ? renderCompact : render)(state, { columns: process.stdout.columns || 80, now: Date.now(), color: !process.env.NO_COLOR, config });
    const height = Math.max(1, (process.stdout.rows || 24) - (compact ? 0 : 1));
    offset = Math.max(0, Math.min(offset, Math.max(0, lines.length - height)));
    const visible = lines.slice(offset, offset + height);
    if (!compact && lines.length > height) visible[height - 1] = `↕ ${offset + 1}–${Math.min(offset + height, lines.length)}/${lines.length}  [↑↓] scorri`;
    const frame = visible.join('\r\n');
    if (frame !== lastFrame) { process.stdout.write('\x1b[H\x1b[2J' + frame); lastFrame = frame; }
  };
  const refresh = async () => {
    if (stopped || state.loading && activeRead || demo) return;
    if (Date.now() - lastAttempt < 5000) return;
    lastAttempt = Date.now(); state.loading = true; state.notice = null; draw();
    try {
      if (!client || client.closed) {
        await client?.close();
        if (stopped) return;
        client = new CodexClient({ bin: config.codexPath }); await client.connect();
      }
      const snapshot = normalizeSnapshot(await client.read());
      if (stopped) return;
      state.snapshot = snapshot; state.error = null; failures = 0;
    } catch (error) {
      if (stopped) return;
      state.error = error instanceof MonitorError ? error.message : 'Dati Codex non disponibili. Riprova o consulta la pagina utilizzo.';
      failures += 1; await client?.close(); client = null;
    } finally {
      state.loading = false;
      state.nextAt = Date.now() + Math.min(Math.max(600, config.refreshSeconds), config.refreshSeconds * 2 ** Math.min(failures, 4)) * 1000;
      draw();
    }
  };
  const startRefresh = () => { if (!activeRead) activeRead = refresh().finally(() => { activeRead = null; }); };
  let finish;
  const done = new Promise((resolve) => { finish = resolve; });
  const stop = () => { if (!stopped) { stopped = true; void client?.close(); finish(); } };
  const keypress = (_str, key = {}) => {
    if (key.name === 'q' || key.name === 'escape' || key.ctrl && key.name === 'c') stop();
    else if (key.name === 'r') startRefresh();
    else if (key.name === 'o') { try { openDashboard(); } catch { state.notice = 'Impossibile aprire il browser.'; draw(); } }
    else if (key.name === 'up' || key.name === 'k') { offset -= 1; draw(); }
    else if (key.name === 'down' || key.name === 'j') { offset += 1; draw(); }
    else if (key.name === 'pageup') { offset -= 10; draw(); }
    else if (key.name === 'pagedown') { offset += 10; draw(); }
    else if (key.name === 'home') { offset = 0; draw(); }
  };
  const wasRaw = !!process.stdin.isRaw;
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true); process.stdin.resume();
  process.stdin.on('keypress', keypress);
  process.stdout.on('resize', draw);
  process.on('SIGINT', stop); process.on('SIGTERM', stop); process.on('SIGHUP', stop);
  process.stdout.write('\x1b[?1049h\x1b[?25l');
  const timer = setInterval(() => { if (!demo && Date.now() >= (state.nextAt || 0)) startRefresh(); draw(); }, 1000);
  try { draw(); if (!demo) startRefresh(); await done; }
  finally {
    clearInterval(timer);
    process.stdin.off('keypress', keypress); process.stdout.off('resize', draw);
    process.off('SIGINT', stop); process.off('SIGTERM', stop); process.off('SIGHUP', stop);
    process.stdin.setRawMode(wasRaw); process.stdin.pause();
    process.stdout.write('\x1b[?25h\x1b[?1049l');
    await client?.close(); await activeRead;
  }
}
