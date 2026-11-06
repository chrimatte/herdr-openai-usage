# Contribuire

Il progetto usa Node.js 22 o successivo e non richiede pacchetti da installare.

```sh
npm run check
npm test
npm run demo -- --compact
```

I test usano dati sintetici e un app-server simulato: non richiedono autenticazione, non leggono credenziali e non generano turni del modello.

## Modifiche

Usa branch brevi `feat/<tema>`, `fix/<tema>` o `chore/<tema>`, partendo da `main`. I commit seguono Conventional Commits, per esempio `fix: preserve previous quota after a failed refresh`. Apri una pull request con il comportamento cambiato e le verifiche eseguite.

Per attivare il controllo locale prima dei commit, verifica prima di non avere hook personali da preservare, poi esegui:

```sh
git config --local core.hooksPath .githooks
```

L’hook verifica whitespace e sintassi; se Gitleaks è già disponibile esegue anche una scansione staged con valori oscurati. La suite completa resta disponibile con `npm test` e viene eseguita in CI. Gli hook non installano strumenti e non modificano lo staging.

## Interfaccia Herdr

I sorgenti della fascia della nuova app sono in `desktop/`; `src/footer-data.mjs` fornisce soltanto i dati necessari alla vista. Dopo una modifica:

```sh
npm run install:desktop
herdr-app check ~/.config/herdr-app/mods/openai-usage-footer
herdr-app status
herdr-app shot /tmp/openai-usage.png
```

Esamina la cattura prima di considerare verificata la UI. Il controllo nativo da solo non copre layout e stati asincroni. Mantieni focus sulla chat, barra compatta, leggibilità nei pannelli stretti e indicazione esplicita dei dati precedenti dopo un errore. Non modificare mod o layout distribuiti da Herdr.

Il plugin da terminale è separato e resta in `src/auto.mjs` e `src/herdr.mjs`. Prova aperture concorrenti e chiusura della chat quando cambi gli hook.

## Dati e attribuzione

Usa solo le API documentate di Codex app-server. Non aggiungere letture di file di autenticazione, token, email o identificativi dell’account, né richieste al modello per misurare le quote. Non salvare quote su disco. Non allegare schermate o log con informazioni personali alle issue.

I contributi svolti con Codex possono includere il trailer di coautore collegato al suo account GitHub:

```text
Co-authored-by: Codex <199175422+chatgpt-codex-connector[bot]@users.noreply.github.com>
```
