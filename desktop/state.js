export function createCache() {
  return { data: null, error: false, failures: 0, nextAt: 0, lastAttempt: -Infinity, pending: null, revision: 0 };
}

export function isLocalCodex(pane) {
  return typeof pane?.pane === 'string' && !pane.pane.includes('/')
    && (pane.app === 'codex' || pane.program?.key === 'codex');
}

export async function refreshCache(cache, load, now = Date.now(), force = false) {
  // Native exec has a 30 s limit; a view reload can abandon its JS promise.
  if (cache.pending && now - cache.lastAttempt < 35000) return cache.pending;
  if ((!force && now < cache.nextAt) || now - cache.lastAttempt < 5000) return;
  cache.lastAttempt = now;
  const revision = ++cache.revision;
  const request = (async () => {
    try {
      const data = await load();
      if (!data || typeof data.enabled !== 'boolean' || !Array.isArray(data.windows)) throw new Error('Invalid display data');
      if (cache.revision !== revision) return;
      cache.data = data;
      cache.error = false;
      cache.failures = 0;
    } catch {
      if (cache.revision === revision) { cache.error = true; cache.failures += 1; }
    } finally {
      if (cache.revision === revision) {
        const seconds = Math.max(30, Math.min(3600, cache.data?.refreshSeconds || 60));
        cache.nextAt = now + Math.min(Math.max(600, seconds), seconds * 2 ** Math.min(cache.failures, 4)) * 1000;
      }
    }
  })();
  cache.pending = request;
  try { await request; }
  finally { if (cache.pending === request) cache.pending = null; }
}

export function footerState(cache, now = Date.now()) {
  const data = cache.data;
  const windows = data?.windows ?? [];
  const known = windows.filter((window) => Number.isFinite(window.usedPercent) && window.usedPercent >= 0);
  const window = known.sort((a, b) => b.usedPercent - a.usedPercent)[0] ?? windows[0];
  const remaining = window && Number.isFinite(window.usedPercent)
    ? Math.max(0, Math.min(100, 100 - window.usedPercent)) : null;
  const age = now - Date.parse(data?.fetchedAt ?? '');
  const stale = !!data && (cache.error || !Number.isFinite(age) || age > Math.max(180000, (data.refreshSeconds || 60) * 3000));
  const seconds = Number.isFinite(window?.resetsAt) ? window.resetsAt - now / 1000 : null;
  let reset = 'Reset time unavailable';
  if (seconds !== null) {
    const minutes = Math.ceil(Math.max(0, seconds) / 60);
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor(minutes % 1440 / 60);
    reset = seconds <= 0 ? 'Reset pending'
      : `Resets in ${days ? `${days}d ${hours}h` : hours ? `${hours}h ${minutes % 60}m` : `${minutes}m`}`;
  }
  return {
    enabled: data?.enabled !== false,
    remaining,
    label: window?.label || 'Quota',
    reset,
    stale,
    loading: !data && !cache.error,
    tone: stale || remaining === null ? 'muted'
      : window.usedPercent >= (data.criticalPercent ?? 95) ? 'blocked'
      : window.usedPercent >= (data.warningPercent ?? 80) ? 'ansi3' : 'done',
    text: remaining !== null ? `${Math.round(remaining)}% available${stale ? ' · stale' : ''}`
      : !data && !cache.error ? 'Reading quota…' : 'Quota unavailable',
  };
}
