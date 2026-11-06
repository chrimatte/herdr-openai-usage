# Herdr da terminale

Un indicatore compatto appena sotto ogni chat Codex: percentuale di quota disponibile, finestra di utilizzo e tempo al ripristino. Si apre automaticamente quando Herdr rileva Codex, si aggiorna ogni 60 secondi e lascia il focus sulla chat.

```text
OpenAI █████████░░░ 76% libero · settimana
Ripristino tra 5g 19h · 12/11, 13:38
18:15:32 · [r] aggiorna  [o] utilizzo  [q] chiudi
```

L’esempio è illustrativo. Le percentuali e le finestre provengono dall’account, senza assumere un limite di cinque ore o una specifica variante di Pro. Se ci sono più finestre, l’indicatore riassume quella con la percentuale consumata più alta; la vista dettagliata le mostra tutte.

## Requisiti

- Herdr 0.9.5 o successivo.
- Node.js 22 o successivo. Nessun pacchetto da installare.
- Codex CLI autenticata con il proprio account ChatGPT (`codex login`). Verificato con Codex CLI 0.167.0 su macOS; il manifest abilita anche Linux, che non è stato collaudato dal vivo.

## Installazione locale

Nella cartella del progetto:

```sh
herdr plugin link "$PWD"
herdr plugin action invoke local.openai-usage.sync
```

La sincronizzazione apre l’indicatore sulle chat Codex già presenti e riconosce quello eventualmente aperto con la versione precedente. Da quel momento i nuovi pannelli Codex lo ricevono automaticamente; un hook di avvio riallinea le chat quando il server Herdr riparte. Non serve riavviare la sessione per attivare la versione appena collegata.

Ogni indicatore occupa circa cinque righe complessive, compatibilmente con i vincoli di Herdr. Eventi ripetuti e concorrenti non creano copie. Quando chiudi il pannello della chat, viene chiuso anche l’indicatore associato. Terminali ordinari e altri agenti non ricevono l’indicatore automatico.

Resta disponibile l’azione manuale `OpenAI: indicatore sotto la chat` dal menu plugin, per il pannello selezionato nell’interfaccia. Il comando `node src/cli.mjs open` usa invece il terminale chiamante. Con l’apertura automatica abilitata non è necessario eseguire questi comandi manuali.

Per aprire tutte le quote in una vista temporanea:

```sh
herdr plugin action invoke local.openai-usage.details
```

Per rimuovere la registrazione senza cancellare i sorgenti:

```sh
herdr plugin unlink local.openai-usage
```

## Comandi e interazione

Quando il pannello dell’indicatore ha il focus: `r` aggiorna, `o` apre la pagina ufficiale utilizzo, `q` o `Esc` chiude. La vista dettagliata supporta frecce su/giù, PgUp e PgDown. La lettura automatica continua anche mentre scrivi nella chat.

Con `autoOpen` attivo, un indicatore chiuso manualmente può ricomparire alla successiva attività della chat. Per disabilitare le nuove aperture imposta `"autoOpen": false` nel file di configurazione; gli indicatori già aperti restano disponibili e puoi chiuderli con `q`.

Comandi dalla cartella del progetto, utilizzabili anche fuori Herdr:

```sh
npm start                            # vista dettagliata
node src/cli.mjs watch --compact      # indicatore compatto
npm run snapshot                     # una sola lettura
node src/cli.mjs snapshot --json      # dati sanitizzati per altri strumenti
npm run demo -- --compact             # dati sintetici, nessun accesso a Codex
npm run check
npm test
```

In un terminale non interattivo, `watch` stampa una sola lettura ed esce.

## Configurazione facoltativa

```sh
herdr plugin config-dir local.openai-usage
```

Copia `config.example.json` come `config.json` nella directory restituita. Il plugin funziona con le impostazioni predefinite anche senza questo file.

| Campo | Predefinito | Significato |
| --- | --- | --- |
| `refreshSeconds` | `60` | Intervallo da 30 a 3600 secondi |
| `warningPercent` | `80` | Utilizzo che rende giallo l’indicatore |
| `criticalPercent` | `95` | Utilizzo che rende rosso l’indicatore |
| `codexPath` | `codex` | Nome o percorso dell’eseguibile, senza argomenti |
| `autoOpen` | `true` | Apertura automatica per ogni chat Codex rilevata da Herdr |

In caso di errori il monitor conserva in memoria l’ultima lettura, la segnala come non aggiornata e rallenta i tentativi (fino a 10 minuti con l’intervallo predefinito). Il tasto `r` permette di riprovare, con un intervallo minimo di cinque secondi. Un ripristino scaduto viene indicato come atteso fino alla conferma del servizio.

## Dati e limiti

Il plugin usa il protocollo documentato di `codex app-server`: handshake, `account/read` e `account/rateLimits/read`. Riutilizza l’autenticazione gestita da Codex senza leggere o copiare i token e senza creare conversazioni o turni del modello. Rimuove email e identificativi dalle risposte esposte. Non salva quote o credenziali su disco e termina il proprio processo app-server alla chiusura normale.

Per evitare duplicati usa lock temporanei sotto `HERDR_PLUGIN_STATE_DIR` e un’associazione fra gli ID locali dei pannelli nei metadati Herdr. Non legge il contenuto delle chat. Gli hook di avvio ed evento eseguono una singola sincronizzazione e terminano.

Le quote riguardano l’utilizzo Codex e la quota condivisa con ChatGPT Work esposta da questo servizio. Non misurano i messaggi delle normali chat ChatGPT né le spese delle API OpenAI. Un saldo di crediti aggiuntivi non è la percentuale residua del piano. I dati mancanti rimangono indicati come non disponibili.

Se Codex non è trovato, configura `codexPath`. Se l’accesso manca o usa una API key, esegui `codex login` con ChatGPT dal tuo terminale. Gli errori upstream non vengono stampati integralmente per evitare di esporre informazioni private.

Fonti: [plugin Herdr](https://herdr.ink/docs/plugins), [protocollo app-server OpenAI](https://learn.chatgpt.com/docs/app-server), [quote condivise e pagina utilizzo](https://learn.chatgpt.com/docs/pricing).

## Struttura e sviluppo

`src/rpc.mjs` gestisce il processo Codex; `data.mjs` normalizza i dati; `render.mjs` genera le due viste; `monitor.mjs` gestisce aggiornamenti e tastiera; `herdr.mjs` apre e ridimensiona il pannello; `auto.mjs` gestisce hook, associazione dei pannelli e concorrenza. I test usano un app-server sintetico, senza account o credenziali.

Branch principale `main`; usare branch brevi `feat/…`, `fix/…` e commit Conventional Commits. Nessun servizio remoto, hook globale o repository GitHub è necessario. Per modifiche eseguire `npm run check` e `npm test`, controllare il diff e provare in un terminale le interazioni cambiate.
