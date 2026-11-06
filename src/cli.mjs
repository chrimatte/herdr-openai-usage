import { spawnSync } from 'node:child_process';
import { loadConfig } from './config.mjs';
import { demoSnapshot } from './data.mjs';
import { fetchSnapshot, watch } from './monitor.mjs';
import { MonitorError } from './rpc.mjs';
import { openPane } from './herdr.mjs';
import { autoSync } from './auto.mjs';

const dashboardUrl = 'https://chatgpt.com/codex/settings/usage';

function openDashboard() {
  const [bin, args] = process.platform === 'darwin' ? ['open', [dashboardUrl]]
    : process.platform === 'win32' ? ['rundll32.exe', ['url.dll,FileProtocolHandler', dashboardUrl]] : ['xdg-open', [dashboardUrl]];
  const result = spawnSync(bin, args, { stdio: 'ignore', timeout: 5000, windowsHide: true });
  if (result.error || result.status !== 0) throw new Error('Could not open the usage page in your browser.');
}

async function main() {
  const [command = 'watch', ...args] = process.argv.slice(2);
  if (command === 'help' || command === '--help' || command === '-h') {
    console.log('OpenAI Usage for Herdr\n\nwatch [--compact] Interactive monitor\nsnapshot [--json] Current quotas\ndemo [--compact]  Preview without accessing Codex\nopen              Indicator below the chat\ndetails           Herdr monitor overlay\ndashboard         Official usage page');
    return;
  }
  if (command === 'open' || command === 'details') {
    const { opened, resizeWarning } = openPane({ details: command === 'details' });
    console.log(JSON.stringify(opened));
    if (resizeWarning) console.error('Indicator opened. You can resize the pane in Herdr.');
    return;
  }
  if (command === 'dashboard') return openDashboard();
  if (command === 'auto-sync' || command === 'auto-event') {
    console.log(JSON.stringify(await autoSync(await loadConfig(), { event: command === 'auto-event' })));
    return;
  }
  if (!['watch', 'snapshot', 'demo'].includes(command) || args.some((arg) => command === 'snapshot' ? arg !== '--json' : arg !== '--compact')) {
    throw new Error('Invalid command. Run: node src/cli.mjs --help.');
  }
  const config = await loadConfig();
  if (command === 'snapshot') {
    const snapshot = await fetchSnapshot(config);
    if (args.includes('--json')) console.log(JSON.stringify(snapshot, null, 2));
    else {
      const { render } = await import('./render.mjs');
      console.log(render({ snapshot }, { columns: process.stdout.columns || 100, config }).join('\n'));
    }
  } else await watch(config, { demo: command === 'demo' ? demoSnapshot() : null, openDashboard, compact: args.includes('--compact') });
}

try { await main(); }
catch (error) {
  const safe = error instanceof MonitorError || error?.constructor === Error;
  console.error(safe ? error.message : 'Monitor error. Check your configuration and Codex sign-in.');
  process.exitCode = 1;
}
