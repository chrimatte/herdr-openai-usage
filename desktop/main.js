import { View, div, svg, image } from 'gpui-kit';
import { h_flex } from 'gpui-base';
import { exec, home, notify, panes, props, run, theme } from 'herdr';
import { createCache, refreshCache, footerState, isLocalCodex } from './state.js';

const registryKey = '__localOpenAIUsageFooterV2';
const generation = {};

export default class OpenAIUsageFooter extends View {
  init(_props, cx) {
    this.hovered = false;
    this.width = 1000;
    const key = `${props()?.sourceRoot ?? ''}:${props()?.configDir ?? ''}`;
    // Shared in memory across pane copies; Herdr shared()/localStorage persist to disk.
    const registry = globalThis[registryKey] ?? (globalThis[registryKey] = {});
    const previous = registry[key];
    if (!previous || previous.generation !== generation) {
      registry[key] = { ...createCache(), data: previous?.data ?? null, generation };
    }
    this.cache = registry[key];
    this.refresh(cx);
    cx.timer.every(15000, (cx) => this.refresh(cx));
  }

  me() { return panes().find((pane) => pane.pane === props()?.pane); }
  isCodex(pane) { return isLocalCodex(pane); }

  args(script, extra = []) {
    const options = props();
    const args = [options.nodePath || 'node', `${options.sourceRoot}/src/${script}`, ...extra];
    return options.configDir ? [`HERDR_PLUGIN_CONFIG_DIR=${options.configDir}`, ...args] : args;
  }

  refresh(cx, force = false) {
    if (!this.isCodex(this.me()) || !props()?.sourceRoot) return;
    cx.spawn(async (cx) => {
      await refreshCache(this.cache, async () => {
        const response = await exec('/usr/bin/env', this.args('footer-data.mjs'), { cwd: props().sourceRoot });
        if (response.code !== 0) throw new Error('Quota unavailable');
        return JSON.parse(response.stdout);
      }, Date.now(), force);
      cx.notify();
    });
  }

  button(t, id, label, child, action) {
    return div().id(id).size(24).flex_none().flex().items_center().justify_center().rounded(4)
      .text_color(t.dim).text_size(14).cursor_pointer().role('button')
      .accessibility_label(label).tooltip(label)
      .hover((style) => style.bg(t.hover).text_color(t.foreground))
      .on_click((_event, cx) => { cx.stop_propagation(); action(cx); })
      .child(child);
  }

  render(cx) {
    const t = theme();
    const pane = this.me();
    if (!pane) return div();
    const paneId = pane.pane;
    const state = footerState(this.cache);
    const codex = this.isCodex(pane) && state.enabled;
    const compact = this.width < 620;
    const color = t[state.tone] || t.muted;
    const width = compact ? 56 : 112;
    const root = h_flex().id(`openai-footer-${paneId}`).size_full().px(12).gap(compact ? 7 : 12)
      .items_center().bg(t.background).border_t(1).border_color(t.border).text_size(12.5)
      .on_size_change((size, cx) => {
        if (Math.abs(size.width - this.width) > 1) { this.width = size.width; cx.notify(); }
      })
      .on_hover((hovered, cx) => { this.hovered = hovered; cx.notify(); })
      .on_click(() => run('pane.focus', { pane: paneId }));

    if (codex) {
      root.child(div().flex_none().font_medium().text_color(t.foreground).child('OpenAI'));
      if (state.remaining !== null && this.width >= 360) {
        root.child(div().w(width).h(4).flex_none().rounded(2).overflow_hidden().bg(t.selected)
          .role('progress_indicator').accessibility_label(`Quota OpenAI disponibile: ${Math.round(state.remaining)}%`)
          .child(div().w(width * state.remaining / 100).h(4).rounded(2).bg(color)));
      }
      root.child(div().flex_none().text_color(color).tooltip(`${state.label} · ${state.text} · ${state.reset}`)
        .child(state.text));
      if (!compact) root.child(div().flex_none().text_color(t.dim).child(state.label.toLowerCase()));
      if (this.width >= 820) root.child(div().truncate().text_color(t.dim).child(state.reset));
      root.child(div().flex_1());
      root.child(this.button(t, `quota-refresh-${paneId}`, 'Aggiorna quota OpenAI', '↻', (cx) => this.refresh(cx, true)));
      if (this.width >= 400) root.child(this.button(t, `quota-page-${paneId}`, 'Apri pagina utilizzo', '↗', (cx) => {
        cx.spawn(async () => {
          try {
            const result = await exec('/usr/bin/env', this.args('cli.mjs', ['dashboard']), { cwd: props().sourceRoot });
            if (result.code !== 0) throw new Error('Browser unavailable');
          } catch { notify({ title: 'OpenAI Usage', body: 'Impossibile aprire la pagina utilizzo.', level: 'error' }); }
        });
      }));
    } else {
      const program = pane.program;
      const pic = program?.icon ? (program.tint ? svg(program.icon).size(13).text_color(t.dim) : image(program.icon).size(13)) : null;
      if (pic) root.child(pic);
      const name = ((program?.agent || program?.shell) && program.name) || pane.title || program?.name || 'Terminal';
      const cwd = pane.cwd === home() ? '~' : pane.cwd?.replace(`${home()}/`, '~/');
      root.child(div().flex_none().max_w(220).truncate().text_color(t.foreground).child(name));
      root.child(div().flex_1().truncate().text_color(t.dim).child(cwd || ''));
    }

    if (pane.status === 'working') root.child(svg('mods/workspace-chrome/spinner.svg').size(11).flex_none().text_color(t.working).spin(900));
    else if (pane.status === 'blocked') root.child(div().flex_none().text_color(t.blocked).child('Richiede attenzione'));
    else if (pane.status === 'done') root.child(div().size(6).flex_none().rounded(3).bg(t.done));

    if (this.hovered && this.width >= 620) {
      for (const [icon, label, command, args] of [
        ['split-right', 'Dividi a destra', 'pane.split', { direction: 'right', pane: paneId }],
        ['split-down', 'Dividi sotto', 'pane.split', { direction: 'down', pane: paneId }],
        [pane.zoomed ? 'unzoom' : 'zoom', 'Espandi o ripristina chat', 'pane.zoom', { pane: paneId }],
        ['close', 'Chiudi pannello', 'pane.close', { pane: paneId }],
      ]) root.child(this.button(t, `quota-${icon}-${paneId}`, label,
        svg(`mods/pane/${icon}.svg`).size(13), () => run(command, args)));
    }
    return root;
  }
}
