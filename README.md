# Comanda — gestione tavoli ristorante

Web app per gestire la sala di un ristorante. È scritta in HTML, CSS e JavaScript vanilla, senza framework e senza build step, ed è pensata per un tablet in orizzontale (funziona anche su smartphone).

- **Operatore** (cameriere): sala, tavoli, ordini, conto.
- **Admin** (titolare): tavoli, menu, impostazioni e dati. È protetta da PIN.

> **Nota sul PIN.** Il PIN serve a evitare accessi accidentali all'area Admin. **Non è una vera protezione di sicurezza**: i dati e il codice stanno sul dispositivo, e chi ha il tablet in mano può leggerli o modificarli dagli strumenti del browser.

## Stato dei lavori

| Fase | Contenuto | Stato |
|---|---|---|
| 1 | Scheletro: cartelle, router, store con persistenza e migrazioni, design tokens, README, GitHub Pages | ✅ |
| 2 | Admin: PIN, tavoli, categorie e piatti, impostazioni, dati di esempio | ⏳ |
| 3 | Sala e apertura tavolo | ⏳ |
| 4 | Dettaglio tavolo: destinatari, piatti, uscite, righe divise | ⏳ |
| 5 | Conto: `conto.js` con test, tre modalità, chiusura e storico | ⏳ |
| 6 | PWA, backup, import e reset, accessibilità | ⏳ |

## Avvio in locale

Gli ES modules non funzionano da `file://`, quindi serve un piccolo server statico:

```bash
python3 -m http.server 8000
```

Poi apri <http://localhost:8000/>.

## Test

I test usano il runner integrato di Node (versione 20 o successiva) e non hanno dipendenze:

```bash
node --test
```

## Pubblicazione su GitHub Pages

1. Su GitHub apri **Settings → Pages**.
2. In **Source** scegli *Deploy from a branch*, poi il branch (per esempio `main`) e la cartella `/ (root)`.
3. L'app sarà disponibile su `https://<utente>.github.io/<nome-repo>/`.

Tutti i percorsi sono relativi e il routing usa l'hash (`#/sala`), quindi l'app funziona anche in una sottocartella senza configurazioni aggiuntive. Il file `.nojekyll` disattiva Jekyll, che altrimenti potrebbe ignorare alcuni file.

## Struttura

```
index.html              shell dell'app (app bar + <main id="app">)
css/tokens.css          design tokens (Claude Design) + mappatura dei 4 stati
css/style.css           stili dei componenti
js/app.js               bootstrap: carica i dati, applica il tema, registra le rotte
js/router.js            router su hash con parametri (#/tavolo/:id)
js/store.js             stato, persistenza su localStorage, migrazioni, validazione backup
js/lib/money.js         formattazione e parsing degli importi in centesimi
js/lib/ui.js            helper DOM (h, icona, appbar, empty state, tema)
js/views/               una vista per schermata (sala, tavolo, conto, admin/)
tests/                  test con node --test
design/                 handoff di Claude Design (mockup HTML, token, note)
```

## Rotte

| Hash | Vista |
|---|---|
| `#/sala` | Griglia dei tavoli (home) |
| `#/tavolo/:id` | Dettaglio del servizio aperto |
| `#/conto/:id` | Conto del servizio |
| `#/admin` · `#/admin/:sezione` | Area Admin (`tavoli`, `menu`, `impostazioni`, `dati`) |

## Dati

- Tutto lo stato è un unico oggetto JSON nella chiave `localStorage` `ristoapp:v1`, e viene salvato dopo ogni modifica (`store.aggiorna(fn)`).
- Il campo `version` indica il formato. All'avvio `migra()` porta i dati vecchi alla versione corrente applicando in ordine le funzioni registrate in `MIGRAZIONI` (in `js/store.js`).
- Se i dati salvati non si possono leggere, l'app non li sovrascrive: ne conserva una copia nella chiave `ristoapp:v1:corrotto:<timestamp>` e riparte da uno stato vuoto.
- Gli importi sono sempre **centesimi interi** (`prezzoCent`), mai numeri decimali.
- Gli ID si generano con `crypto.randomUUID()`.
- Il PIN di default è `0000`, salvato come hash SHA-256. Va cambiato al primo accesso.

### Stati del tavolo → token di design

| Stato (specifiche) | Token | Classe |
|---|---|---|
| Libero | `--status-free` (contorno tratteggiato) | `.stato--libero` |
| Occupato | `--status-active` | `.stato--occupato` |
| In attesa | `--status-held` (testo sempre scuro) | `.stato--attesa` |
| Conto richiesto | `--status-bill` | `.stato--conto` |

Lo stato si mostra sempre con colore **e** icona o testo.
