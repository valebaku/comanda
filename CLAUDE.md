# Istruzioni per Claude Code — Comanda

App di gestione tavoli in HTML, CSS e JS vanilla (nessun framework, nessun build step), pubblicata su GitHub Pages: <https://valebaku.github.io/comanda/> (dal branch `main`).
Le specifiche v1 sono in `design/specifiche-claude-code.md` e il design in `design/` (`HANDOFF.md`, `tokens.css`). Per le funzioni valgono le specifiche v1; il design vale per l'aspetto.

## Regole di lavoro
- **Ogni rilascio passa da una pull request verso `main`.** Crea sempre la PR quando una modifica è pronta, senza aspettare che venga chiesta. Non pubblicare mai direttamente su `main`.
- Se la PR del branch di lavoro è già stata unita, riparti da `origin/main` per il lavoro successivo e apri una **nuova** PR.
- Prima di ogni push: `node --test` deve passare.
- Se cambiano i file dell'app, aumenta `VERSIONE` in `sw.js`. Ogni nuovo file JS, CSS o icona va aggiunto a `FILE_APP` in `sw.js` (lo controlla `tests/pwa.test.js`).
- **Verifica sempre l'URL pubblicato** dopo ogni merge su `main`: aggiorna il checkout a `main`, poi lancia `node scripts/verifica-pages.cjs`. Riporta all'utente l'esito reale. Se l'host `valebaku.github.io` è bloccato dalla rete della sessione, dillo invece di dare l'app per verificata.

## Convenzioni
- Solo percorsi relativi; routing su hash (`#/sala`, `#/tavolo/:id`, `#/conto/:id`, `#/admin/:sezione`).
- Importi sempre in centesimi interi; le ripartizioni usano `ripartisci()` di `js/lib/conto.js` (la somma delle quote = totale).
- Stato in `localStorage`, chiave `ristoapp:v1`; modifiche solo tramite `store.aggiorna()`. Cambi di formato: aumenta `VERSIONE` in `js/store.js` e aggiungi una funzione in `MIGRAZIONI`.
- Logica di dominio pura in `js/lib/` (testata); viste in `js/views/`.
- Nomi di dominio e testi dell'interfaccia in italiano.
