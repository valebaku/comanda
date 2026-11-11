# Specifiche per Claude Code — App gestione tavoli ristorante (v1)

> Allegato: il design prodotto con Claude Design (schermate + design tokens). Rispettalo per layout, colori e componenti.

## 1. Obiettivo

Web app per la gestione della sala di un ristorante, **HTML + CSS + JavaScript vanilla**, pubblicata su **GitHub Pages**. In v1 gira su **un solo dispositivo** (tablet), quindi tutti i dati restano in locale.

Due aree: **Operatore** (sala, ordini, conto) e **Admin** (configurazione, protetta da PIN).

## 2. Vincoli tecnici

- Nessun framework e nessun build step: ES modules nativi (`<script type="module">`), così il repo si pubblica così com'è.
- Single Page App con router su hash (`#/sala`, `#/tavolo/:id`, `#/conto/:id`, `#/admin/...`).
- **Solo percorsi relativi** (GitHub Pages serve l'app da `/<nome-repo>/`).
- Persistenza: `localStorage` in un'unica chiave versionata (`ristoapp:v1`), con funzione di migrazione per versioni future. Salvataggio dopo ogni modifica.
- Importi gestiti **sempre in centesimi interi** (mai float).
- PWA leggera: `manifest.webmanifest` + `sw.js` con cache dei file statici, così l'app è installabile sul tablet e funziona anche senza rete.
- Codice e commenti in italiano o inglese, ma coerenti; nomi di dominio in italiano (tavolo, coperto, uscita).

## 3. Struttura del progetto

```
/
├── index.html
├── manifest.webmanifest
├── sw.js
├── css/
│   ├── tokens.css        # variabili dal design
│   └── style.css
├── js/
│   ├── app.js            # bootstrap
│   ├── router.js
│   ├── store.js          # stato, persistenza, migrazioni, backup
│   ├── lib/
│   │   ├── money.js      # formattazione centesimi
│   │   ├── conto.js      # calcoli del conto (funzioni pure)
│   │   └── pin.js        # hash PIN
│   └── views/
│       ├── sala.js
│       ├── tavolo.js
│       ├── conto.js
│       └── admin/        # pin, tavoli, menu, impostazioni, dati
├── tests/
│   └── conto.test.js     # node --test
└── README.md
```

## 4. Modello dati

```js
{
  version: 1,
  impostazioni: {
    nomeLocale: "",
    prezzoCopertoCent: 0,            // 0 = nessun coperto
    uscite: ["1ª uscita", "2ª uscita", "3ª uscita", "Dessert"],
    pinHash: "<sha-256>"             // default "0000", cambio obbligatorio al primo accesso
  },
  categorie: [{ id, nome, ordine, uscitaDefault }],   // uscitaDefault = indice in impostazioni.uscite
  piatti:    [{ id, nome, categoriaId, prezzoCent, attivo }],
  tavoli:    [{ id, nome, copertiDefault, ordine }],
  servizi: [{                         // un "servizio" = tavolo aperto
    id, tavoloId, apertoAlle, contoRichiesto: false,
    coperti: [{ id, etichetta, pagato: false }],
    righe: [{
      id, piattoId,
      nome, prezzoCent,               // snapshot al momento dell'ordine
      qta, nota, uscita,              // uscita = indice
      stato: "attesa" | "chiamata" | "servita",
      destinazione: { tipo: "tavolo" }
                  | { tipo: "coperto", copertoId }
                  | { tipo: "diviso", copertoIds: [...] }
    }],
    modalitaConto: "totale" | "coperto" | "romana",
    personeRomana: null,
    pagamentiRomana: 0
  }],
  storico: [{ id, tavoloNome, apertoAlle, chiusoAlle, totaleCent, modalitaConto, righe }]
}
```

Gli ID si generano con `crypto.randomUUID()`.

## 5. Regole di business

### Tavoli e coperti
- In Admin si aggiungono, rinominano, riordinano ed eliminano i tavoli e si imposta `copertiDefault`. Un tavolo con servizio aperto non è eliminabile.
- All'apertura il cameriere conferma il numero di coperti; le etichette di default sono "1", "2", ecc., rinominabili in qualsiasi momento (testo libero, max 20 caratteri).
- Si possono aggiungere/rimuovere coperti a servizio aperto. Se un coperto da rimuovere ha righe assegnate, chiedere se spostarle al Tavolo; se compare in righe "divise", va tolto dalla divisione (se ne resta uno solo, la riga diventa di quel coperto).

### Stato del tavolo (derivato, non salvato)
1. Nessun servizio → **Libero**
2. `contoRichiesto` → **Conto richiesto**
3. Esiste almeno una riga `chiamata` → **In attesa**
4. Altrimenti → **Occupato**

### Ordini e uscite
- Toccare un piatto aggiunge una riga (o incrementa `qta` se esiste già una riga identica: stesso piatto, destinazione, uscita, nota vuota e stato "attesa").
- L'uscita proposta è quella della categoria, modificabile.
- "Chiama uscita": tutte le righe `attesa` di quell'uscita → `chiamata`. "Segna servita": `chiamata` → `servita`. Possibile anche per singola riga.
- I piatti `attivo: false` non compaiono nel menu operatore.

### Calcolo del conto (`js/lib/conto.js`, funzioni pure e testate)
- **Totale** = Σ (prezzoCent × qta) + prezzoCopertoCent × numero coperti.
- **Per coperto**, per ogni persona:
  - righe con `tipo: "coperto"` a lei assegnate;
  - quota delle righe `diviso` in cui compare (importo ÷ numero coperti della divisione);
  - quota delle righe `tavolo` (importo ÷ numero totale coperti);
  - prezzo coperto.
  - Mostrare separatamente "propri", "quote" e "coperto".
- **Alla romana**: totale ÷ `personeRomana` (default = numero coperti).
- **Arrotondamenti**: divisione intera in centesimi; il resto si distribuisce 1 centesimo alla volta ai primi coperti, così **la somma delle quote è sempre uguale al totale**. Questo va coperto dai test.
- La chiusura del tavolo è consentita quando tutti i coperti sono pagati (modalità coperto), oppure i pagamenti alla romana coprono tutte le persone, oppure con conferma esplicita in modalità totale. Alla chiusura il servizio diventa una voce di `storico` e il tavolo torna libero.

### Admin e PIN
- PIN numerico 4–6 cifre, salvato come hash SHA-256 (`crypto.subtle`). Sessione admin valida finché non si esce o per 10 minuti di inattività.
- Nota nel README: il PIN impedisce accessi accidentali ma **non è una protezione di sicurezza reale**, perché dati e codice sono sul dispositivo.

### Backup
- Esporta: download di un file JSON con tutto lo stato (nome con data).
- Importa: validazione di `version` e struttura, conferma prima di sovrascrivere.
- Reset: doppia conferma.
- Visto che i dati vivono su un solo dispositivo, mostrare in Admin la data dell'ultimo backup e un promemoria se supera i 7 giorni.

## 6. Piano di lavoro (procedi una fase alla volta e fermati per la verifica)

1. **Scheletro**: struttura cartelle, router, store con persistenza e migrazioni, design tokens, `README.md`, pubblicazione su GitHub Pages funzionante.
2. **Admin**: PIN (con cambio obbligatorio al primo accesso), gestione tavoli, categorie e piatti, impostazioni. Dati di esempio caricabili con un pulsante.
3. **Sala + apertura tavolo**: griglia tavoli con stati derivati, apertura con numero coperti ed etichette.
4. **Dettaglio tavolo**: destinatari (Tavolo / coperto), aggiunta piatti, righe divise, note, uscite e stati, modifica coperti.
5. **Conto**: `conto.js` con test (`node --test`), le tre modalità, pagamenti, chiusura e storico.
6. **Rifinitura**: PWA (manifest + service worker), backup/import/reset, test manuale su tablet, accessibilità di base (focus visibile, aria-label sulle icone).

## 7. Criteri di accettazione

- Posso creare 10 tavoli con coperti diversi, aprirne uno con 4 coperti chiamati "Marco", "Anna", "3", "4".
- Posso assegnare un'acqua al Tavolo, un primo a Marco e un antipasto diviso tra Marco, Anna e "3".
- Nel conto per coperto la somma delle quote è identica al totale, al centesimo.
- Chiamando la 1ª uscita il tavolo diventa "In attesa"; segnandola servita torna "Occupato".
- Ricaricando la pagina non perdo nulla; l'app funziona offline dopo la prima apertura.
- L'app funziona pubblicata su GitHub Pages in una sottocartella.
