# Stato del progetto

Aggiornato: 2026-11-06. Versione: 0.3.1.

## Obiettivo e decisioni

Mostrare le quote dell’account Codex autenticato con ChatGPT nel bordo inferiore di ogni chat Herdr. La fascia della nuova app è alta 32 px, con barra della disponibilità, percentuale, finestra e ripristino. La vista dettagliata è secondaria. I controlli del pannello e lo stato agente sono nella fascia inferiore.

Lettura solo attraverso le API account documentate di Codex app-server; nessuna API key aggiuntiva, nessun turno del modello e nessuna quota o credenziale persistita. Le normali chat ChatGPT non hanno contatori in questa integrazione. La quota locale non viene attribuita a chat remote.

## Stato locale

Cartella canonica: `~/Documents/herdr-openai-usage`. Un collegamento dalla posizione precedente mantiene compatibili i riferimenti locali. Il plugin Herdr da terminale è collegato al nuovo percorso. Nella nuova app sono installati il mod personale `openai-usage-footer` e il layout `openai-usage`; nessun file distribuito da Herdr è modificato. Il pannello dettagliato temporaneo è stato chiuso.

`desktop/` contiene il mod nativo e la cache condivisa solo in memoria. `src/footer-data.mjs` espone dati minimi per la vista. `npm run install:desktop` installa o aggiorna il mod e il percorso del checkout. Le copie condividono le letture; gli errori conservano il dato precedente, segnalato come non aggiornato. `autoOpen: false` viene rispettato.

L’integrazione da terminale mantiene gli hook su creazione, rilevamento, stato, chiusura e avvio. Lock e metadati associano un indicatore a ogni chat, senza duplicazioni concorrenti. I test di questa integrazione restano validi.

## Git e pubblicazione

Repository richiesta dall’utente: `https://github.com/chrimatte/herdr-openai-usage`, pubblica, branch principale `main`. La prima pubblicazione dell’intero plugin è autorizzata; Codex deve essere indicato come coautore. Identità e hook sono configurati solo nella repository, senza modificare Git globale. L’utente ha scelto la licenza MIT, con copyright 2026 Christian Matteotti; testo in LICENSE e identificatore SPDX nel manifest npm.

README e guida per contributori descrivono installazione, limiti, dati e verifiche. La CI usa action fissate a commit verificati e prova Node.js 22/26 su macOS/Linux. Non confondere la CI automatica con la verifica del rendering nativo.

## Verifiche e continuità

40 test automatici, incluso il recupero di una lettura abbandonata dopo ricaricamento nativo senza sovrascrivere i dati nuovi. Controllo nativo del mod e verifica visiva con quote reali, senza sottrarre il focus alla chat. Herdr app 0.1.13, Herdr da terminale 0.9.5, Codex CLI 0.167.0, Node.js 26; Linux non collaudato dal vivo per la UI. La prima CI pubblica su Node 22/26, macOS/Linux è passata; verificare ogni nuovo SHA prima di dichiarare la CI aggiornata.

Per proseguire: rileggere stato Git e remoto, mantenere il checkout perché il mod lo esegue, usare i controlli di CONTRIBUTING.md e verificare una cattura dopo modifiche visive. Nessuna delegazione salvo richiesta esplicita. Pubblicare solo entro il consenso della sessione.
