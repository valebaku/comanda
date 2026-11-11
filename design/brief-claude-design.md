# Brief per Claude Design — App gestione tavoli ristorante (v1)

## 1. Contesto

Web app (HTML/CSS/JS) per la gestione della sala di un ristorante. In v1 gira su **un solo dispositivo**, principalmente un **tablet in orizzontale** (deve funzionare anche su smartphone in verticale). La usano camerieri durante il servizio: mani occupate, poco tempo, luce variabile. Priorità assoluta: **velocità, leggibilità, pochi tocchi**.

L'app ha due aree:
- **Operatore** (cameriere): sala, tavoli, ordini, conto.
- **Admin** (titolare): configurazione, protetta da **PIN numerico**.

## 2. Concetti chiave da rendere visivamente chiari

- **Tavolo**: ha un numero/nome e un numero di coperti.
- **Coperto**: un posto al tavolo con un'**etichetta libera** (es. "Marco", "2", "Bimbo").
- **Destinatario di un piatto**: un piatto può essere assegnato
  - al **Tavolo** (condiviso tra tutti, es. acqua, vino),
  - a un **singolo coperto**,
  - **diviso** tra alcuni coperti scelti (es. antipasto per 3).
- **Uscite/portate**: ogni piatto appartiene a un'uscita (1ª, 2ª, 3ª, Dessert — nomi configurabili). Ogni riga ha uno stato: **In attesa → Chiamata → Servita**.
- **Stato del tavolo** (colore + etichetta, mai solo colore):
  - **Libero**
  - **Occupato**
  - **In attesa** (c'è un'uscita chiamata non ancora servita)
  - **Conto richiesto**

## 3. Schermate area Operatore

### 3.1 Sala
- Griglia di card tavolo, grandi e toccabili.
- Ogni card mostra: numero tavolo, stato (colore + testo), coperti attuali, totale parziale, tempo trascorso dall'apertura.
- Filtro rapido per stato; pulsante discreto per accedere all'Admin (icona lucchetto).

### 3.2 Apertura tavolo (modale/pannello)
- Al tocco su un tavolo libero: scelta numero coperti (stepper +/–, precompilato col default del tavolo).
- Facoltativo: etichette dei coperti (di default "1, 2, 3…"), modificabili subito o dopo.
- Pulsante grande "Apri tavolo".

### 3.3 Dettaglio tavolo (schermata principale di lavoro)
Layout tablet suggerito: **menu a sinistra, ordine a destra**.

- **Header**: numero tavolo, stato, tempo, azioni (Richiedi conto, Vai al conto, menu ⋯ con "Modifica coperti").
- **Barra destinatari**: chip "🍽 Tavolo" + una chip per ogni coperto (con etichetta). La chip selezionata è il destinatario dei piatti che si aggiungono. Deve essere evidentissima quale è attiva. Tocco lungo su un coperto = rinomina.
- **Selettore uscita**: 1ª / 2ª / 3ª / Dessert (precompilato dalla categoria del piatto, modificabile).
- **Menu**: tab categorie + griglia di pulsanti piatto (nome + prezzo). Un tocco = aggiunge 1 al destinatario attivo. Feedback immediato.
- **Riepilogo ordine**: righe raggruppate per **uscita**; ogni riga mostra quantità, piatto, destinatario (badge "Tavolo", "Marco", oppure "Diviso: Marco, Anna, 3"), prezzo, stato.
  - Per ogni uscita: pulsante "Chiama uscita" e "Segna servita".
  - Azioni sulla riga (swipe o menu): quantità +/–, nota, cambia destinatario, **dividi tra coperti** (selezione multipla dei coperti), cambia uscita, elimina.
- **Vista alternativa per coperto**: toggle per vedere l'ordine raggruppato per persona invece che per uscita.

### 3.4 Conto
Tre schede:
1. **Totale tavolo**: elenco righe, eventuale coperto (prezzo per persona configurabile), totale.
2. **Per coperto**: una card per persona con i suoi piatti, la sua quota dei piatti condivisi/divisi (mostrata separatamente, es. "Quota condivisi: 4,50 €"), totale personale, pulsante "Pagato". Indicatore di avanzamento: "2 di 4 pagati".
3. **Alla romana**: totale ÷ numero persone (stepper modificabile), importo a testa, contatore pagamenti.
- Pulsante finale "Chiudi tavolo" (abilitato quando tutto è pagato, con conferma).

## 4. Schermate area Admin

- **Accesso**: tastierino PIN a schermo intero (cifre grandi), errore visibile.
- **Tavoli**: lista con numero/nome, coperti di default, riordino, aggiungi/elimina (non eliminabile se aperto).
- **Menu**: categorie (con uscita predefinita e ordine) e piatti (nome, prezzo, categoria, attivo/disattivo per i piatti esauriti).
- **Impostazioni**: nome locale, prezzo coperto (0 = disattivato), nomi delle uscite, cambio PIN.
- **Dati**: storico conti chiusi (lista semplice con data, tavolo, totale), backup esporta/importa, reset dati con doppia conferma.

## 5. Linee guida visive

- Target touch **minimo 48×48 px**, ideale 56+ per i pulsanti piatto.
- Testo base ≥ 16 px; numeri tavolo e totali molto grandi.
- Tema **chiaro ad alto contrasto** come default; tema scuro opzionale (sala serale).
- Colori di stato coerenti ovunque e accessibili (contrasto AA), sempre accompagnati da testo o icona.
- Azioni distruttive (elimina, chiudi tavolo, reset) in rosso e sempre con conferma.
- Niente animazioni lunghe: transizioni ≤ 150 ms.
- Stile sobrio e professionale, tipografia molto leggibile (es. Inter, Atkinson Hyperlegible o simili con fallback di sistema).

## 6. Cosa mi serve come output

1. Prototipo delle schermate sopra (tablet orizzontale + almeno Sala, Dettaglio tavolo e Conto in versione smartphone).
2. **Design tokens**: palette (inclusi i 4 colori di stato), tipografia, spaziature, raggi, ombre, espressi come variabili CSS (`--color-...`, `--space-...`).
3. Elenco componenti riutilizzabili (card tavolo, chip destinatario, pulsante piatto, riga ordine, card coperto nel conto, tastierino PIN, modale di conferma).
4. Il risultato verrà passato a Claude Code per lo sviluppo in **HTML, CSS e JavaScript vanilla** (nessun framework): preferire soluzioni realizzabili con CSS Grid/Flexbox standard.
