# OpenAI Usage for Herdr

Monitor your Codex subscription quotas directly in Herdr: a footer in each chat shows your available percentage and time until reset. It reuses the Codex CLI’s ChatGPT sign-in, without an additional API key.

![Automated checks](https://github.com/chrimatte/herdr-openai-usage/actions/workflows/ci.yml/badge.svg)

![OpenAI footer with an availability bar, percentage and reset time](docs/assets/footer-preview.svg)

*Illustrative preview with sample data. The actual footer uses your Herdr theme and the quotas returned by your account.*

## Get started in the Herdr desktop app

You need Node.js 22 or later, Git, the Codex CLI and a version of the Herdr app that supports mods and personal layouts. There are no npm dependencies to install.

```sh
git clone https://github.com/chrimatte/herdr-openai-usage.git
cd herdr-openai-usage
codex login
npm run install:desktop
```

Open Herdr before running the last command and choose **Sign in with ChatGPT** in Codex. The installer duplicates the active layout as `openai-usage` and adds a 32 px footer to local Codex chats, including new ones. You can still select the original layout in settings. Keep the checkout: the mod runs its Node reader from this folder.

The footer shows available quota, the usage window and reset time. **↻** refreshes the reading; **↗** opens the usage page. Hover over the footer to reveal controls for splitting, expanding and closing the pane. Agent status also appears in the footer.

Verified live on macOS with Herdr app 0.1.13, Codex CLI 0.167.0 and Node.js 26. The Linux UI has not been tested live.

## Terminal-based Herdr

The plugin for Herdr 0.9.5 or later keeps a compact indicator below each chat:

```sh
herdr plugin link "$PWD"
herdr plugin action invoke local.openai-usage.sync
```

It opens automatically for detected Codex chats. See the [terminal Herdr guide](docs/terminal.md) for commands, keyboard controls, configuration and removal.

## Refreshing and configuration

Readings refresh every 60 seconds by default. Footer instances share the reading in memory. If a request fails, the previous value stays visible and is explicitly marked as stale; retries slow down automatically.

The optional `config.json` file belongs in the directory returned by:

```sh
herdr plugin config-dir local.openai-usage
```

If you only use the desktop app, the default path is `~/.config/herdr/plugins/config/local.openai-usage/`. Copy [config.example.json](config.example.json) there. You can change the interval, color thresholds and Codex path. `autoOpen: false` disables the automatic footer and new terminal-plugin indicators. Existing terminal indicators must be closed manually. See the [configuration table](docs/terminal.md#optional-configuration).

After updating the checkout, run `npm run install:desktop` again to update the files installed in the Herdr app.

## Data and limitations

- Reads the Codex/Work quotas available through `codex app-server`, without creating conversations or model turns.
- Does not count messages in regular ChatGPT chats or track OpenAI API spending.
- Does not read authentication files or save quotas or credentials to disk. The monitor does not expose account email addresses or identifiers.
- Durations and percentages come from the service. Missing quotas or reset times remain explicitly unavailable.
- Summarizes the window with the highest percentage used. In the desktop app, local quota is not attributed to remote chats.

If the monitor cannot find Codex, set `codexPath`. If you are signed out, run `codex login` in your terminal. The [full guide](docs/terminal.md) covers the detailed view and error handling.

## Development

```sh
npm run check
npm test
npm run demo -- --compact
```

Tests use a mock app-server and synthetic data. CI checks Node.js 22 and 26 on macOS and Linux; the badge shows its current status. Native Herdr rendering also requires an in-app check.

The footer code lives in `desktop/`; `src/` contains data reading, normalization and terminal integration. [CONTRIBUTING.md](CONTRIBUTING.md) covers the structure, checks and Git conventions.

## Credits and license

Created by [Christian Matteotti](https://github.com/chrimatte) with contributions from [Codex](https://github.com/apps/chatgpt-codex-connector), credited as a coauthor in relevant commits.

Distributed under the [MIT license](LICENSE). Copyright © 2026 Christian Matteotti. This project is not affiliated with Herdr or OpenAI.
