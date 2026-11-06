import { loadConfig } from './config.mjs';
import { windowLabel } from './data.mjs';
import { fetchSnapshot } from './monitor.mjs';

// The desktop receives only display data, never account identity or credentials.
try {
  const config = await loadConfig();
  const snapshot = config.autoOpen ? await fetchSnapshot(config) : null;
  console.log(JSON.stringify({
    enabled: config.autoOpen,
    refreshSeconds: config.refreshSeconds,
    warningPercent: config.warningPercent,
    criticalPercent: config.criticalPercent,
    fetchedAt: snapshot?.fetchedAt ?? null,
    windows: snapshot?.buckets.flatMap((bucket) => bucket.windows.map((window) => ({
      usedPercent: window.usedPercent,
      remainingPercent: window.remainingPercent,
      resetsAt: window.resetsAt,
      label: windowLabel(window),
    }))) ?? [],
  }));
} catch {
  console.error('Quotas unavailable. Check your Codex sign-in and plugin configuration.');
  process.exitCode = 1;
}
