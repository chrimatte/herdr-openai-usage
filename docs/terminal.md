# Terminal-based Herdr

A compact indicator below each Codex chat shows your available quota percentage, usage window and time until reset. It opens automatically when Herdr detects Codex, refreshes every 60 seconds and leaves focus on the chat.

```text
OpenAI █████████░░░ 76% available · week
Resets in 5d 19h · 12/11, 13:38
18:15:32 · [r] refresh  [o] usage  [q] close
```

This example is illustrative. Percentages and windows come from the account; no five-hour limit or specific Pro variant is assumed. If there are multiple windows, the indicator summarizes the one with the highest percentage used; the detailed view shows them all.

## Requirements

- Herdr 0.9.5 or later.
- Node.js 22 or later. No packages to install.
- Codex CLI signed in with your ChatGPT account (`codex login`). Verified with Codex CLI 0.167.0 on macOS; the manifest also enables Linux, which has not been tested live.

## Local installation

From the project folder:

```sh
herdr plugin link "$PWD"
herdr plugin action invoke local.openai-usage.sync
```

Synchronization opens the indicator for existing Codex chats and adopts an indicator left open by an earlier version. New Codex panes then receive it automatically; a startup hook resynchronizes chats when the Herdr server restarts. You do not need to restart the session to activate the newly linked version.

Each indicator occupies about five lines in total, subject to Herdr’s constraints. Repeated and concurrent events do not create copies. Closing a chat pane also closes its associated indicator. Regular terminals and other agents do not receive the automatic indicator.

The manual `OpenAI: indicator below the chat` action remains available in the plugin menu for the selected pane. The `node src/cli.mjs open` command targets the calling terminal instead. With automatic opening enabled, these manual commands are optional.

To open all quotas in a temporary view:

```sh
herdr plugin action invoke local.openai-usage.details
```

To unregister the plugin without deleting its sources:

```sh
herdr plugin unlink local.openai-usage
```

## Commands and interaction

When the indicator pane has focus, `r` refreshes, `o` opens the official usage page, and `q` or `Esc` closes it. The detailed view supports Up/Down, PgUp and PgDown. Automatic reading continues while you type in the chat.

With `autoOpen` enabled, an indicator closed manually may reappear after the chat’s next activity. To prevent new indicators, set `"autoOpen": false` in the configuration file; existing indicators stay open and can be closed with `q`.

Commands from the project folder, also usable outside Herdr:

```sh
npm start                            # detailed view
node src/cli.mjs watch --compact      # compact indicator
npm run snapshot                     # one reading
node src/cli.mjs snapshot --json      # sanitized data for other tools
npm run demo -- --compact             # synthetic data, no Codex access
npm run check
npm test
```

In a non-interactive terminal, `watch` prints one reading and exits.

## Optional configuration

```sh
herdr plugin config-dir local.openai-usage
```

Copy `config.example.json` as `config.json` into the returned directory. The plugin works with defaults even without this file.

| Field | Default | Meaning |
| --- | --- | --- |
| `refreshSeconds` | `60` | Interval from 30 to 3600 seconds |
| `warningPercent` | `80` | Usage percentage that turns the indicator yellow |
| `criticalPercent` | `95` | Usage percentage that turns the indicator red |
| `codexPath` | `codex` | Executable name or path, without arguments |
| `autoOpen` | `true` | Automatically open an indicator for each Codex chat detected by Herdr |

After an error, the monitor retains its last reading in memory, labels it as stale and slows retries down to a maximum interval of 10 minutes with default settings. Press `r` to retry, with at least five seconds between attempts. A reset time that has passed remains pending until the service confirms it.

## Data and limitations

The plugin uses the documented `codex app-server` protocol: handshake, `account/read` and `account/rateLimits/read`. It reuses Codex-managed authentication without reading or copying tokens and without creating conversations or model turns. It strips email addresses and identifiers from exposed responses. It saves no quotas or credentials to disk and terminates its own app-server process on normal shutdown.

To prevent duplicates, it uses temporary locks under `HERDR_PLUGIN_STATE_DIR` and associates local pane IDs in Herdr metadata. It does not read chat content. Startup and event hooks perform one synchronization and exit.

Quotas cover the Codex usage and quota shared with ChatGPT Work exposed by this service. They do not count messages in regular ChatGPT chats or track OpenAI API spending. An extra credit balance is not the plan’s remaining percentage. Missing values stay explicitly unavailable.

If Codex cannot be found, configure `codexPath`. If you are signed out or use an API key, run `codex login` with ChatGPT from your terminal. Raw upstream errors are not printed to avoid exposing private details.

Sources: [Herdr plugins](https://herdr.ink/docs/plugins), [OpenAI app-server protocol](https://learn.chatgpt.com/docs/app-server), [shared quotas and usage page](https://learn.chatgpt.com/docs/pricing).

## Structure and development

`src/rpc.mjs` manages the Codex process; `data.mjs` normalizes data; `render.mjs` builds both views; `monitor.mjs` handles refreshing and keyboard input; `herdr.mjs` opens and resizes panes; `auto.mjs` handles hooks, pane associations and concurrency. Tests use a synthetic app-server without accounts or credentials.

The default branch is `main`; use short `feat/…` or `fix/…` branches and Conventional Commits. No remote service, global hook or GitHub repository is required for local use. After changes, run `npm run check` and `npm test`, review the diff and exercise changed interactions in a terminal.
