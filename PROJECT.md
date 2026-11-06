# Project state

Updated: 2026-11-06. Version: 0.3.1.

## Objective and decisions

Show quotas for a Codex account authenticated with ChatGPT in the footer of each Herdr chat. The desktop footer is 32 px high and contains an availability bar, percentage, usage window and reset time. The detailed view is secondary. Pane controls and agent status are in the footer.

Read only documented Codex app-server account APIs. No additional API key, model turns, or persisted quotas or credentials. Regular ChatGPT chats have no counters in this integration. Local quota must not be attributed to remote chats.

The user requested English throughout the repository, including documentation, UI and CLI text, assets, tests and GitHub metadata. Preserve commands and configuration keys. Previous Italian titles remain only as migration identifiers for existing panes and mods.

## Local state

Canonical folder: `~/Documents/herdr-openai-usage`. A symlink from the previous location preserves local references. The terminal Herdr plugin points to the new path. The desktop app uses the personal `openai-usage-footer` mod and `openai-usage` layout; Herdr’s shipped files are untouched. The temporary detailed-view pane has been closed.

`desktop/` contains the native mod and its shared, memory-only cache. `src/footer-data.mjs` exposes minimal display data. `npm run install:desktop` installs or updates the mod and checkout path. Instances share readings; errors retain the previous value, explicitly marked as stale. `autoOpen: false` is respected.

The terminal integration retains creation, detection, status, closure and startup hooks. Locks and metadata associate one indicator with each chat without concurrent duplicates. Existing tests cover this integration.

## Git and publication

Public repository: `https://github.com/chrimatte/herdr-openai-usage`, default branch `main`. The user authorized initial publication and the subsequent MIT license and English updates. Credit Codex as a coauthor. Git identity and hooks are repository-local; global Git configuration is unchanged. The user selected the MIT license, copyright 2026 Christian Matteotti, with its text in LICENSE and SPDX identifier in the npm manifest.

The README and contribution guide cover setup, limitations, data and verification. CI actions are pinned to verified commits and test Node.js 22/26 on macOS/Linux. Automated CI does not verify native rendering.

## Verification and handoff

The 40-test suite includes recovery from a read abandoned during native reload without overwriting newer data. Native mod checks and screenshots have verified real quota display without stealing chat focus. Tested with Herdr app 0.1.13, terminal Herdr 0.9.5, Codex CLI 0.167.0 and Node.js 26. The Linux UI has not been tested live. CI has passed on Node 22/26 and macOS/Linux; check each new SHA before reporting the latest CI as successful.

To continue: inspect local and remote Git state, keep the checkout because the mod runs it, follow CONTRIBUTING.md, and inspect a screenshot after visual changes. Do not delegate without an explicit request. Publish only within current session authorization.
