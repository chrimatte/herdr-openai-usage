import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const appHome = process.env.HERDR_APP_HOME || join(homedir(), '.config', 'herdr-app');
const modName = 'openai-usage-footer';
const layoutName = 'openai-usage';
const target = join(appHome, 'mods', modName);

function run(args) {
  const result = spawnSync('herdr-app', args, { encoding: 'utf8', timeout: 15000 });
  if (result.error || result.status !== 0) throw new Error(`Herdr app: ${args[0]} non riuscito. ${result.stderr?.trim().slice(0, 1500) || ''}`);
  return result.stdout;
}

try {
  const status = JSON.parse(run(['status']));
  // Work only on our personal copy, keeping shipped layouts and unrelated mods intact.
  let oldManifest;
  try { oldManifest = JSON.parse(await readFile(join(target, 'mod.json'), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (oldManifest && oldManifest.title !== 'OpenAI Usage · barra chat') throw new Error('Esiste già un mod diverso con questo nome.');
  await mkdir(target, { recursive: true });
  for (const name of ['main.js', 'state.js', 'mod.json']) await copyFile(join(root, 'desktop', name), join(target, name));
  run(['check', target]);

  const layoutPath = join(appHome, 'layouts', `${layoutName}.json`);
  let exists = true;
  try { await access(layoutPath); } catch { exists = false; }
  if (!exists) run(['do', 'layout.clone', JSON.stringify({ name: status.layout, as: layoutName })]);
  const layout = JSON.parse(await readFile(layoutPath, 'utf8'));
  if (exists && !JSON.stringify(layout).includes(`"mod":"${modName}"`)) throw new Error('Esiste già un layout diverso con questo nome.');
  let changed = 0;
  function update(node) {
    if (node.content?.tab) {
      const pane = node.content.pane ?? (node.content.pane = {});
      pane.lone = true;
      pane.header = {
        content: { mod: modName, props: {
          sourceRoot: root,
          nodePath: process.execPath,
          configDir: process.env.HERDR_PLUGIN_CONFIG_DIR || join(homedir(), '.config', 'herdr', 'plugins', 'config', 'local.openai-usage'),
        } },
        height: 32, position: 'bottom', reveal: 'always',
      };
      changed += 1;
    }
    for (const child of node.children ?? []) update(child);
  }
  update(layout);
  if (!changed) throw new Error('Il layout non contiene chat da incorniciare.');
  layout.preview = `layouts/${layoutName}.svg`;
  await writeFile(join(appHome, 'layouts', `${layoutName}.svg`),
    '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="280" viewBox="0 0 480 280"><rect width="480" height="280" rx="12" fill="#101214"/><rect x="8" y="8" width="92" height="264" rx="6" fill="#1b1d20"/><rect x="108" y="34" width="364" height="238" rx="6" fill="#191a1d" stroke="#393c40"/><path d="M120 245h340" stroke="#393c40"/><rect x="128" y="256" width="84" height="4" rx="2" fill="#393c40"/><rect x="128" y="256" width="62" height="4" rx="2" fill="#9cc88a"/><path d="M230 258h80" stroke="#9cc88a" stroke-width="4"/><path d="M326 258h84" stroke="#626871" stroke-width="3"/></svg>\n');
  await writeFile(layoutPath, JSON.stringify(layout, null, 2) + '\n');
  run(['do', 'layout.switch', JSON.stringify({ name: layoutName })]);
  console.log('Barra OpenAI installata nel bordo inferiore delle chat Codex. Layout personale: openai-usage.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
