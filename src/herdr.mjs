import { spawnSync } from 'node:child_process';

export function runHerdr(args, env = process.env) {
  const result = spawnSync(env.HERDR_BIN_PATH || 'herdr', args, {
    stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', timeout: 15000, windowsHide: true,
  });
  if (result.error || result.status !== 0) throw new Error('Operazione Herdr non riuscita.');
  // Metadata/reporting commands acknowledge success with an empty stdout.
  if (!result.stdout.trim()) return {};
  try { return JSON.parse(result.stdout).result; }
  catch { throw new Error('Risposta Herdr non valida.'); }
}

export function openPane({ details = false, env = process.env, run = (args) => runHerdr(args, env) } = {}) {
  if (env.HERDR_ENV !== '1') throw new Error('Esegui questa azione da Herdr. Per il terminale usa: npm start.');
  const args = ['plugin', 'pane', 'open', '--plugin', 'local.openai-usage', '--entrypoint', details ? 'monitor' : 'indicator', '--placement', details ? 'overlay' : 'split'];
  if (!details) args.push('--direction', 'down', '--no-focus');
  // Herdr rejects --workspace together with an existing target pane.
  if (env.HERDR_PANE_ID) args.push('--target-pane', env.HERDR_PANE_ID);
  const opened = run(args);
  let resizeWarning = false;
  // Resize only the new split directly below the invoking chat pane.
  if (!details && env.HERDR_PANE_ID) {
    try {
      const layout = run(['pane', 'layout', '--pane', env.HERDR_PANE_ID]).layout;
      const chat = layout.panes.find((p) => p.pane_id === env.HERDR_PANE_ID);
      const split = layout.splits.filter((s) => s.direction === 'down' && s.rect.x === chat.rect.x && s.rect.y === chat.rect.y && s.rect.width === chat.rect.width).sort((a, b) => a.rect.height - b.rect.height)[0];
      if (split && split.rect.height > 12) {
        const amount = Math.max(0, Math.min(0.4, (split.rect.height - 5) / split.rect.height - split.ratio));
        if (amount > 0) run(['pane', 'resize', '--pane', chat.pane_id, '--direction', 'down', '--amount', String(amount)]);
      }
    } catch { resizeWarning = true; }
  }
  return { opened, resizeWarning };
}
