# OpenAI Usage per Herdr

Plugin locale Node.js senza dipendenze. Leggere [README.md](README.md) e [PROJECT.md](PROJECT.md) prima delle modifiche.

- Il comportamento principale è un indicatore compatto sotto ogni chat Codex, aperto automaticamente senza sottrarre il focus. Evitare duplicati anche con eventi concorrenti e rimuovere solo l’indicatore associato alla chat chiusa. La vista dettagliata è secondaria.
- Usare solo le API account documentate di Codex app-server; non avviare turni del modello per misurare l’utilizzo.
- Non leggere, copiare o stampare token, email, identificativi o file di autenticazione. Dati sintetici nei test. Non persistere le quote.
- Non assumere durate, prezzi o capienze del piano. Mostrare esplicitamente dati mancanti e letture precedenti dopo errori.
- Usare HERDR_BIN_PATH per Herdr e argv senza shell. Configurazione sotto HERDR_PLUGIN_CONFIG_DIR; non scrivere dati utente nel progetto.
- L’automazione può associare gli ID locali dei pannelli nei metadati Herdr e usare lock sotto HERDR_PLUGIN_STATE_DIR. Gli hook sono operazioni singole, non daemon. Rispettare autoOpen=false.
- Applicare la skill development-workflow quando disponibile: preservare lo stato locale, definire l’esito, implementare, verificare e rivedere il diff.
- Verifiche richieste: `npm run check`, `npm test`; per UI anche terminale interattivo e geometria del pannello. Node >=22, nessuna installazione di dipendenze.
- Git: `main`, branch brevi e Conventional Commits. Non toccare configurazione Git globale o storia esistente. Commit soltanto con identità valida e controllo segreti.
- Sorgenti della nuova app in `desktop/`, installazione con `npm run install:desktop`. Non modificare i mod/layout distribuiti da Herdr: usare il layout personale `openai-usage`. Eseguire il controllo nativo del mod e osservare una cattura dopo modifiche visive.
- L’utente ha richiesto la prima pubblicazione pubblica su GitHub di questo progetto. Pubblicazioni successive restano entro le autorizzazioni della sessione; marketplace e scelta della licenza richiedono una richiesta specifica. Non aggiungere dati personali alle schermate pubbliche.
- Per il contributo Codex usare il trailer riportato in CONTRIBUTING.md. Preservare l’identità Git dell’utente e la configurazione globale.
- Nessuna delegazione salvo esplicita richiesta. Chiudere solo processi e pannelli creati per questo progetto.
- Completamento: comportamento osservato, controlli superati, diff rivisto, limiti e stato locale/remoto riportati. Aggiornare PROJECT.md solo per decisioni o stato utili alla continuità.
