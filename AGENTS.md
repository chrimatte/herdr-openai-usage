# OpenAI Usage for Herdr

Local Node.js plugin with no dependencies. Read [README.md](README.md) and [PROJECT.md](PROJECT.md) before making changes.

- The primary experience is a compact indicator below each Codex chat, opened automatically without stealing focus. Prevent duplicates even with concurrent events, and remove only the indicator associated with a closed chat. The detailed view is secondary.
- Use only documented Codex app-server account APIs. Do not start model turns to measure usage.
- Do not read, copy or print tokens, email addresses, account identifiers or authentication files. Use synthetic test data. Do not persist quotas.
- Do not assume plan durations, prices or capacity. Explicitly label missing data and previous readings after errors.
- Use HERDR_BIN_PATH for Herdr and argv arrays without a shell. Keep configuration under HERDR_PLUGIN_CONFIG_DIR; do not write user data into the project.
- Automation may associate local pane IDs in Herdr metadata and use locks under HERDR_PLUGIN_STATE_DIR. Hooks are single-run operations, not daemons. Respect autoOpen=false.
- Apply the development-workflow skill when available: preserve local state, define the outcome, implement, verify and review the diff.
- Required checks: `npm run check` and `npm test`; for UI changes, also verify an interactive terminal and pane geometry. Node >=22; no dependency installation.
- Git: `main`, short branches and Conventional Commits. Do not change global Git configuration or existing history. Commit only with a valid identity and after secret checks.
- Desktop app sources are in `desktop/`; install with `npm run install:desktop`. Do not modify Herdr’s shipped mods or layouts: use the personal `openai-usage` layout. Run the native mod checker and inspect a screenshot after visual changes.
- The user requested this project’s initial public GitHub publication. Subsequent publication must stay within session authorization; marketplace publishing and license changes require a specific request. Keep personal data out of public screenshots.
- Use the Codex attribution trailer documented in CONTRIBUTING.md. Preserve the user’s Git identity and global configuration.
- Keep maintained repository content and interface text in English. Historical titles may remain as migration identifiers to preserve existing installations.
- Do not delegate unless explicitly requested. Close only processes and panes created for this project.
- Completion requires observed behavior, passing checks, a reviewed diff, reported limitations and local/remote status. Update PROJECT.md only with decisions or state useful for continuity.
