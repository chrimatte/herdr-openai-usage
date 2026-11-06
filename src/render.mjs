import { cleanText, planLabel, windowLabel } from './data.mjs';
import { defaults } from './config.mjs';

const percent = (n) => `${Number(n.toFixed(1))}%`;
const time = (date) => date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
export function resetLabel(seconds, now) {
  if (seconds === null) return 'Ripristino non comunicato';
  const left = Math.max(0, Math.ceil(seconds - now / 1000));
  if (left === 0) return 'Ripristino atteso; aggiorna per confermare';
  const days = Math.floor(left / 86400);
  const hours = Math.floor((left % 86400) / 3600);
  const mins = Math.floor((left % 3600) / 60);
  const relative = days ? `${days}g ${hours}h` : hours ? `${hours}h ${mins}m` : `${Math.max(1, mins)}m`;
  const date = new Date(seconds * 1000).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  return `Ripristino tra ${relative} · ${date}`;
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
  line('OPENAI  /  UTILIZZO', '1;36');
  line(snapshot ? `Piano ${planLabel(snapshot.planType)}` : 'Quote del tuo abbonamento');
  line('─'.repeat(width), '2');
  if (demo) line('DEMO · dati di esempio', '33');
  if (error) { line('DATI NON AGGIORNATI', '1;33'); line(error, '33'); }
  if (loading) line(snapshot ? 'Aggiornamento…' : 'Connessione a Codex…', '2');
  if (snapshot) {
    for (const bucket of snapshot.buckets) {
      line(); line(bucket.name, '1');
      if (bucket.limitReached || bucket.spendControlReached) line('Limite raggiunto secondo il servizio', '1;31');
      if (!bucket.windows.length) line('Quote percentuali non comunicate');
      for (const window of bucket.windows) {
        line(windowLabel(window), '1');
        if (window.usedPercent === null) line('Utilizzo non disponibile');
        else {
          const stale = window.resetsAt !== null && window.resetsAt <= now / 1000;
          const code = stale ? '2' : window.usedPercent >= config.criticalPercent ? '1;31' : window.usedPercent >= config.warningPercent ? '33' : '32';
          line(`${percent(window.remainingPercent)} disponibile`, code);
          const n = Math.max(4, Math.min(32, width - 2));
          const used = Math.round(n * Math.min(window.usedPercent, 100) / 100);
          line('█'.repeat(used) + '░'.repeat(n - used), code);
          line(`${percent(window.usedPercent)} utilizzato${stale ? ' · da verificare' : ''}`);
          if (!stale && window.usedPercent >= config.warningPercent) line(window.usedPercent >= config.criticalPercent ? 'Quota quasi esaurita' : 'Utilizzo elevato', code);
        }
        line(resetLabel(window.resetsAt, now), '2');
      }
      if (bucket.credits) {
        const credits = bucket.credits;
        line(credits.unlimited ? 'Crediti aggiuntivi: illimitati' : credits.balance !== null ? `Crediti aggiuntivi: ${credits.balance}` : credits.hasCredits === true ? 'Crediti aggiuntivi: disponibili' : 'Saldo crediti non comunicato', '2');
      }
    }
    if (!snapshot.buckets.length) { line(); line('Nessuna quota comunicata dal servizio.'); line('Consulta la pagina utilizzo con [o].'); }
    if (snapshot.ordinaryUsageAllowed === false) line('Il servizio segnala utilizzo non consentito.', '1;31');
    if (snapshot.resetCredits > 0) line(`Ripristini disponibili: ${snapshot.resetCredits}`);
    line(); line(`Ultima lettura ${time(new Date(snapshot.fetchedAt))}${error ? ' · precedente' : ''}`, '2');
  }
  if (nextAt && !loading) line(`Prossima lettura tra ${Math.max(0, Math.ceil((nextAt - now) / 1000))}s`, '2');
  if (notice) line(notice, '33');
  line(); line('[r] aggiorna  [o] pagina utilizzo', '2');
  line('[↑↓] scorri  [q / Esc] chiudi', '2');
  line('Dati Codex / Work condivisi dal piano.', '2');
  line('Le chat ChatGPT non hanno contatori qui.', '2');
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
  let title = error ? 'OpenAI · dati non disponibili' : 'OpenAI · connessione…';
  if (snapshot) {
    if (worst) {
      const barWidth = Math.min(12, Math.max(4, width - 38));
      const filled = Math.round(barWidth * Math.min(worst.remainingPercent, 100) / 100);
      title = `OpenAI ${'█'.repeat(filled)}${'░'.repeat(barWidth - filled)} ${percent(worst.remainingPercent)} libero · ${windowLabel(worst).toLowerCase()}`;
    } else title = 'OpenAI · quote non comunicate';
  }
  const status = error ? `Non aggiornato · ${error}` : blocked ? 'Limite raggiunto secondo il servizio' : worst ? resetLabel(worst.resetsAt, now) : loading ? 'Lettura delle quote in corso' : 'Premi [o] per la pagina utilizzo';
  const hint = demo ? 'DEMO · [q] chiudi' : notice || (loading && snapshot ? 'Aggiornamento…' : `${snapshot ? time(new Date(snapshot.fetchedAt)) + ' · ' : ''}[r] aggiorna  [o] utilizzo  [q] chiudi`);
  return [color ? `\x1b[${code}m${clip(title)}\x1b[0m` : clip(title), clip(status), clip(hint)];
}
