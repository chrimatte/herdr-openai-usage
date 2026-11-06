# Contributing

The project uses Node.js 22 or later and requires no package installation.

```sh
npm run check
npm test
npm run demo -- --compact
```

Tests use synthetic data and a mock app-server: they require no sign-in, read no credentials and generate no model turns.

## Making changes

Use short branches such as `feat/<topic>`, `fix/<topic>` or `chore/<topic>`, starting from `main`. Follow Conventional Commits, for example `fix: preserve previous quota after a failed refresh`. Open a pull request describing the behavior change and the checks performed.

To enable the local pre-commit checks, first make sure you have no personal hooks to preserve, then run:

```sh
git config --local core.hooksPath .githooks
```

The hook checks whitespace and syntax. If Gitleaks is already available, it also scans staged changes with secrets redacted. Run the full suite with `npm test`; it also runs in CI. Hooks do not install tools or change the staging area.

## Herdr interface

The desktop footer sources are in `desktop/`; `src/footer-data.mjs` provides only the data needed by the view. After a change:

```sh
npm run install:desktop
herdr-app check ~/.config/herdr-app/mods/openai-usage-footer
herdr-app status
herdr-app shot /tmp/openai-usage.png
```

Inspect the screenshot before considering the UI verified. The native checker alone does not cover layout or asynchronous states. Preserve chat focus, a compact footer, readability in narrow panes and an explicit stale-data message after errors. Do not modify Herdr’s shipped mods or layouts.

The terminal plugin is separate, in `src/auto.mjs` and `src/herdr.mjs`. Check concurrent opens and chat closure when changing hooks.

## Data and attribution

Use only documented Codex app-server APIs. Do not add reads of authentication files, tokens, email addresses or account identifiers, or model requests to measure quotas. Do not save quotas to disk. Do not attach screenshots or logs containing personal information to issues.

Keep maintained documentation, interface text, CLI messages, code comments and repository metadata in English. Preserve command names, configuration keys and migration identifiers when translating.

Contributions made with Codex may include the coauthor trailer linked to its GitHub account:

```text
Co-authored-by: Codex <199175422+chatgpt-codex-connector[bot]@users.noreply.github.com>
```
