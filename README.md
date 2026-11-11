# Comanda — gestione tavoli ristorante

Web app per gestire la sala di un ristorante. È scritta in HTML, CSS e JavaScript vanilla, senza framework e senza build step, ed è pensata per un tablet in orizzontale (funziona anche su smartphone).

- **Operatore** (cameriere): sala, tavoli, ordini, conto.
- **Admin** (titolare): tavoli, menu, impostazioni e dati. È protetta da PIN.

> **Nota sul PIN.** Il PIN serve a evitare accessi accidentali all'area Admin. **Non è una vera protezione di sicurezza**: i dati e il codice stanno sul dispositivo, e chi ha il tablet in mano può leggerli o modificarli dagli strumenti del browser.

## Stato dei lavori

| Fase | Contenuto | Stato |
|---|---|---|
| 1 | Scheletro: cartelle, router, store con persistenza e migrazioni, design tokens, README, GitHub Pages | ✅ |
| 2 | Admin: PIN, tavoli, categorie e piatti, impostazioni, dati di esempio | ✅ |
| 3 | Sala e apertura tavolo | ✅ |
| 4 | Dettaglio tavolo: destinatari, piatti, uscite, righe divise | ✅ |
| 5 | Conto: `conto.js` con test, tre modalità, chiusura e storico | ✅ |
| 6 | PWA, backup, import e reset, accessibilità | ✅ (test manuale su tablet reale da fare) |

## Primo utilizzo

1. Tocca il lucchetto in alto a destra e inserisci il PIN `0000`: l'app chiede subito di sceglierne uno nuovo.
2. In **Dati** puoi caricare i dati di esempio (10 tavoli e un menu), oppure creare tavoli e piatti nelle sezioni **Tavoli** e **Menu**.
3. In **Impostazioni** imposta il nome del locale, il prezzo del coperto (0 = nessun coperto), i nomi delle uscite e il tema.
4. Torna alla **Sala**: tocca un tavolo libero, scegli i coperti (e se vuoi le etichette) e apri.

## Come si usa in sala

- **Destinatario**: la fila di chip in alto indica a chi vanno i piatti (*Tavolo* = condiviso tra tutti, oppure un coperto). Con **Dividi tra coperti** si scelgono più coperti e i piatti vengono divisi in parti uguali. Un tocco lungo su un coperto lo rinomina.
- **Uscita**: si imposta da sola in base alla categoria del piatto, ma si può cambiare prima di toccarlo.
- **Piatti**: ogni tocco aggiunge 1. Il toast permette di annullare subito l'aggiunta.
- **Righe**: toccando una riga si cambiano quantità, nota, destinatario, divisione, uscita e stato, oppure la si elimina.
- **Uscite**: "Chiama uscita" porta le righe in attesa a *Chiamata* (il tavolo diventa **In attesa**); "Segna servita" le porta a *Servita*.
- **Conto**: *Totale tavolo*, *Per coperto* (propri, quota dei condivisi, coperto e pulsante "Pagato") o *Alla romana*. "Chiudi tavolo" si attiva quando tutto è pagato; in modalità Totale chiede una conferma esplicita. Il conto chiuso va nello storico (Admin › Dati).
- Su smartphone menu e ordine stanno in due schede (in basso); su tablet sono affiancati.

## Avvio in locale

Gli ES modules non funzionano da `file://`, quindi serve un piccolo server statico:

```bash
python3 -m http.server 8000
```

Poi apri <http://localhost:8000/>.

## Test

I test usano il runner integrato di Node (versione 20 o successiva) e non hanno dipendenze. Coprono i calcoli del conto (somma delle quote sempre uguale al totale), le operazioni sugli ordini, lo store, il PIN e la lista dei file del service worker:

```bash
node --test
```

## Pubblicazione su GitHub Pages

1. Su GitHub apri **Settings → Pages**.
2. In **Source** scegli *Deploy from a branch*, poi il branch (per esempio `main`) e la cartella `/ (root)`.
3. L'app sarà disponibile su `https://<utente>.github.io/<nome-repo>/`.

Dopo ogni modifica ai file dell'app, aumenta `VERSIONE` in `sw.js`: così i dispositivi su cui l'app è installata scaricano la nuova versione (la vedono alla seconda apertura). Se aggiungi un file JS o CSS, aggiungilo anche a `FILE_APP` in `sw.js` (lo controlla un test).

Tutti i percorsi sono relativi e il routing usa l'hash (`#/sala`), quindi l'app funziona anche in una sottocartella senza configurazioni aggiuntive. Il file `.nojekyll` disattiva Jekyll, che altrimenti potrebbe ignorare alcuni file.

## Struttura

```
index.html              shell dell'app (app bar + <main id="app">)
manifest.webmanifest    PWA installabile
sw.js                   service worker: uso offline
icons/                  icone dell'app
css/tokens.css          design tokens (Claude Design) + mappatura dei 4 stati
css/style.css           stili dei componenti
js/app.js               bootstrap: carica i dati, applica il tema, registra le rotte
js/router.js            router su hash con parametri (#/tavolo/:id)
js/store.js             stato, persistenza su localStorage, migrazioni, validazione backup
js/lib/money.js         formattazione e parsing degli importi in centesimi
js/lib/conto.js         calcoli del conto e stato del tavolo (funzioni pure)
js/lib/ordini.js        operazioni su servizio, coperti e righe (funzioni pure)
js/lib/pin.js           hash SHA-256 del PIN e sessione admin (10 minuti)
js/lib/esempio.js       dati di esempio
js/lib/ui.js            componenti: dialoghi, conferme, toast, stepper, chip…
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
- Il PIN di default è `0000`, salvato come hash SHA-256. Va cambiato al primo accesso. La sessione admin scade dopo 10 minuti di inattività o con "Esci".
- **Backup**: Admin › Dati › Esporta scarica un file JSON con tutto lo stato; Importa lo valida e chiede conferma prima di sovrascrivere. Se l'ultimo backup ha più di 7 giorni, l'area Admin mostra un promemoria.
- **Arrotondamenti**: quando un importo va diviso (righe divise, righe del tavolo, alla romana) si usa la divisione intera in centesimi e il resto va 1 centesimo alla volta ai primi coperti, così la somma delle quote è sempre uguale al totale.

### Stati del tavolo → token di design

| Stato (specifiche) | Token | Classe |
|---|---|---|
| Libero | `--status-free` (contorno tratteggiato) | `.stato--libero` |
| Occupato | `--status-active` | `.stato--occupato` |
| In attesa | `--status-held` (testo sempre scuro) | `.stato--attesa` |
| Conto richiesto | `--status-bill` | `.stato--conto` |

Lo stato si mostra sempre con colore **e** icona o testo.
