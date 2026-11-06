import { cleanText, planLabel, windowLabel } from './data.mjs';
import { defaults } from './config.mjs';

const percent = (n) => `${Number(n.toFixed(1))}%`;
const time = (date) => date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
export function resetLabel(seconds, now) {
  if (seconds === null) return 'Reset time not provided';
  const left = Math.max(0, Math.ceil(seconds - now / 1000));
  if (left === 0) return 'Reset pending; refresh to confirm';
  const days = Math.floor(left / 86400);
  const hours = Math.floor((left % 86400) / 3600);
  const mins = Math.floor((left % 3600) / 60);
  const relative = days ? `${days}d ${hours}h` : hours ? `${hours}h ${mins}m` : `${Math.max(1, mins)}m`;
  const date = new Date(seconds * 1000).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  return `Resets in ${relative} · ${date}`;
}

export function render({ snapshot = null, error = null, loading = false, nextAt = null, demo = false, notice = null }, {
  columns = 80, rows = 40, now = Date.now(), color = false, config = defaults,
} = {}) {
  const width = Math.max(16, Math.min(columns, 100));
  const paint = (text, code) => color ? `\x1b[${code}m${text}\x1b[0m` : text;
  const out = [];
  const line = (text = '', style = null) => {
    const clipped = [...cleanText(text, 1000)].slice(0, width).join('');
    out.push(style ? paint(clipped, style) : clipped);
  };
  line('OPENAI  /  USAGE', '1;36');
  line(snapshot ? `Plan ${planLabel(snapshot.planType)}` : 'Your subscription quotas');
  line('─'.repeat(width), '2');
  if (demo) line('DEMO · sample data', '33');
  if (error) { line('STALE DATA', '1;33'); line(error, '33'); }
  if (loading) line(snapshot ? 'Refreshing…' : 'Connecting to Codex…', '2');
  if (snapshot) {
    for (const bucket of snapshot.buckets) {
      line(); line(bucket.name, '1');
      if (bucket.limitReached || bucket.spendControlReached) line('Usage limit reached', '1;31');
      if (!bucket.windows.length) line('Percentage quotas not provided');
      for (const window of bucket.windows) {
        line(windowLabel(window), '1');
        if (window.usedPercent === null) line('Usage unavailable');
        else {
          const stale = window.resetsAt !== null && window.resetsAt <= now / 1000;
          const code = stale ? '2' : window.usedPercent >= config.criticalPercent ? '1;31' : window.usedPercent >= config.warningPercent ? '33' : '32';
          line(`${percent(window.remainingPercent)} available`, code);
          const n = Math.max(4, Math.min(32, width - 2));
          const used = Math.round(n * Math.min(window.usedPercent, 100) / 100);
          line('█'.repeat(used) + '░'.repeat(n - used), code);
          line(`${percent(window.usedPercent)} used${stale ? ' · needs verification' : ''}`);
          if (!stale && window.usedPercent >= config.warningPercent) line(window.usedPercent >= config.criticalPercent ? 'Quota nearly exhausted' : 'High usage', code);
        }
        line(resetLabel(window.resetsAt, now), '2');
      }
      if (bucket.credits) {
        const credits = bucket.credits;
        line(credits.unlimited ? 'Extra credits: unlimited' : credits.balance !== null ? `Extra credits: ${credits.balance}` : credits.hasCredits === true ? 'Extra credits: available' : 'Credit balance not provided', '2');
      }
    }
    if (!snapshot.buckets.length) { line(); line('No quotas provided by the service.'); line('Press [o] to open the usage page.'); }
    if (snapshot.ordinaryUsageAllowed === false) line('The service reports that usage is not allowed.', '1;31');
    if (snapshot.resetCredits > 0) line(`Available resets: ${snapshot.resetCredits}`);
    line(); line(`Last reading ${time(new Date(snapshot.fetchedAt))}${error ? ' · previous reading' : ''}`, '2');
  }
  if (nextAt && !loading) line(`Next reading in ${Math.max(0, Math.ceil((nextAt - now) / 1000))}s`, '2');
  if (notice) line(notice, '33');
  line(); line('[r] refresh  [o] usage page', '2');
  line('[↑↓] scroll  [q / Esc] close', '2');
  line('Codex / Work data shared by your plan.', '2');
  line('Regular ChatGPT message counts are unavailable.', '2');
  // The viewport handles scrolling; keep the complete content available.
  return out;
}

export function renderCompact({ snapshot = null, error = null, loading = false, demo = false, notice = null }, {
  columns = 80, now = Date.now(), color = false, config = defaults,
} = {}) {
  const width = Math.max(12, columns - 1);
  const clip = (s) => [...cleanText(s, 1000)].slice(0, width).join('');
  const windows = snapshot?.buckets.flatMap((b) => b.windows.map((w) => ({ ...w, bucket: b.name }))) || [];
  const worst = windows.filter((w) => w.usedPercent !== null).sort((a, b) => b.usedPercent - a.usedPercent)[0];
  const blocked = snapshot?.ordinaryUsageAllowed === false || snapshot?.buckets.some((b) => b.limitReached || b.spendControlReached);
  const stale = !!error || worst?.resetsAt !== null && worst?.resetsAt <= now / 1000;
  const code = stale ? '33' : blocked || worst?.usedPercent >= config.criticalPercent ? '1;31' : worst?.usedPercent >= config.warningPercent ? '33' : '32';
  let title = error ? 'OpenAI · data unavailable' : 'OpenAI · connecting…';
  if (snapshot) {
    if (worst) {
      const barWidth = Math.min(12, Math.max(4, width - 38));
      const filled = Math.round(barWidth * Math.min(worst.remainingPercent, 100) / 100);
      title = `OpenAI ${'█'.repeat(filled)}${'░'.repeat(barWidth - filled)} ${percent(worst.remainingPercent)} available · ${windowLabel(worst).toLowerCase()}`;
    } else title = 'OpenAI · quotas not provided';
  }
  const status = error ? `Stale · ${error}` : blocked ? 'Usage limit reached' : worst ? resetLabel(worst.resetsAt, now) : loading ? 'Reading quotas' : 'Press [o] for the usage page';
  const hint = demo ? 'DEMO · [q] close' : notice || (loading && snapshot ? 'Refreshing…' : `${snapshot ? time(new Date(snapshot.fetchedAt)) + ' · ' : ''}[r] refresh  [o] usage  [q] close`);
  return [color ? `\x1b[${code}m${clip(title)}\x1b[0m` : clip(title), clip(status), clip(hint)];
}
