# Istruzioni per Claude Design — App "Gestione Tavoli" per ristorazione

> Brief di progettazione dell'interfaccia. Lingua dell'interfaccia: **italiano**.
> Lo sviluppo verrà fatto da Claude Code in HTML/CSS/JS vanilla: i design tokens devono essere esportabili come **CSS custom properties**.

---

## 1. Il prodotto in breve

Una web app (installabile come app sul dispositivo) per gestire i tavoli di un ristorante. Ha due anime:

- **Area amministrativa**: serve a configurare sale, tavoli, posti e menu. Si usa con calma, prima del servizio.
- **Interfaccia cameriere (Sala)**: si usa durante il servizio, in piedi, spesso con una mano sola e di fretta.

La caratteristica distintiva è che **ogni piatto si associa a un singolo posto, a più posti (condiviso) o al tavolo intero**. Il conto si può poi dividere per persona. Ogni posto può avere un nome ospite e delle **allergie**.

L'app gira su **un solo dispositivo**, tipicamente uno smartphone o un tablet tenuto dal cameriere o alla cassa.

---

## 2. Utenti e contesto d'uso

| Utente | Contesto | Priorità di design |
|---|---|---|
| Cameriere | In sala, in movimento, luce variabile (anche dehors in pieno sole o sala in penombra) | Velocità, target grandi, leggibilità, pochi tocchi per ordinare |
| Titolare/Admin | Fuori servizio, con calma | Chiarezza, operazioni in blocco, prevenzione degli errori |

Principi:
1. **Ordinare un piatto in ≤ 4 tocchi** (posto → categoria → piatto → conferma).
2. **Lo stato del tavolo deve capirsi a colpo d'occhio** dalla mappa.
3. **Le allergie non devono mai passare inosservate.**
4. **Gli errori si annullano facilmente**: annulla per le righe non ancora inviate, conferme solo per le azioni distruttive.

---

## 3. Formati e breakpoint

- **Smartphone** (360–430 px), progettato per primo, in verticale.
- **Tablet** (768–1194 px), in orizzontale e in verticale: nella vista tavolo, layout a due colonne (schema del tavolo a sinistra, ordine a destra).
- Target touch di almeno **48×48 px**; i pulsanti primari in sala sono alti 56 px.
- Prevedere sia il **tema chiaro** sia il **tema scuro**: la sala serale e il dehors al sole hanno esigenze opposte.

---

## 4. Schermate da progettare

### Area comune
1. **Setup iniziale** (primo avvio): nome del locale e creazione del PIN admin.
2. **Selettore di modalità**: "Sala" / "Amministrazione" (quest'ultima chiede il PIN) ed eventuale "Chi sei?" per scegliere il cameriere.
3. **Tastierino PIN.**

### Area amministrativa
4. **Dashboard admin**: accesso rapido alle sezioni e banner "Backup consigliato".
5. **Impostazioni generali**: nome, coperto, portate, camerieri.
6. **Aree/Sale**: lista riordinabile.
7. **Tavoli – lista** per area, con il pulsante "Crea in blocco".
8. **Dialog "Crea tavoli in blocco"**: area, quantità, posti per tavolo, numerazione, prefisso, con anteprima dei tavoli generati.
9. **Dettaglio tavolo**: etichetta, forma, area e **lista dei posti** con etichette modificabili e riordinabili.
10. **Editor della piantina**: canvas con tavoli trascinabili, ridimensionabili e ruotabili, griglia di aggancio e palette delle forme.
11. **Menu – categorie e piatti**: lista con filtro, toggle "Esaurito" sempre visibile.
12. **Dettaglio piatto**: prezzo, descrizione, destinazione (Cucina/Bar), **selettore dei 14 allergeni** con icone, gruppi di varianti.
13. **Gruppi di varianti**: es. "Cottura" con le sue opzioni e i supplementi.
14. **Dati**: export, import, reset (zona "pericolo").
15. **Report**: KPI (incasso, coperti, scontrino medio) e classifica dei piatti.

### Interfaccia cameriere (Sala)
16. **Mappa tavoli**: tab delle aree, piantina con i tavoli nella loro forma e un toggle per passare alla vista **griglia**.
17. **Dialog "Apri tavolo"**: stepper dei coperti e scelta del cameriere.
18. **Vista tavolo** (schermata principale, la più importante):
    - schema del tavolo con i posti disposti attorno, nella forma reale;
    - su ogni posto: etichetta, nome ospite, icona allergie, contatore delle righe;
    - pulsante centrale **"Tavolo"** per i piatti comuni;
    - modalità **multi‑selezione** dei posti per i piatti condivisi;
    - lista dell'ordine raggruppata per **portata**, filtrabile per posto;
    - barra azioni: "Invia comanda", "Marcia portata", "Conto", menu ⋯ (sposta tavolo, unisci, chiudi).
19. **Scheda posto**: nome ospite e selezione delle allergie.
20. **Selezione piatto**: categorie in tab o chip, griglia o lista dei piatti, ricerca, piatti esauriti disattivati.
21. **Configurazione riga**: varianti, quantità, nota, portata, destinatari (modificabili).
22. **Avviso allergene** (bloccante): quale allergene, quale posto e quale ospite; azioni "Annulla" e "Conferma comunque".
23. **Riepilogo comanda** prima dell'invio, diviso Cucina/Bar.
24. **Storno riga**: con il motivo obbligatorio.
25. **Conto**: switch tra **Totale / Per posto / Alla romana**, quote per posto, pagamenti parziali, residuo e chiusura.
26. **Preconto stampabile**: formato scontrino 80 mm, con la dicitura "Documento non fiscale".

---

## 5. Stati dei tavoli (da codificare con colore **e** icona/testo)

| Stato | Significato | Suggerimento visivo |
|---|---|---|
| Libero | Nessun servizio aperto | Neutro, contorno |
| Aperto | Tavolo aperto, nulla inviato | Colore primario tenue |
| In corso | Comande inviate | Colore primario pieno |
| Portata in attesa | Ci sono portate da marciare | Ambra, icona ⏸ |
| Conto | Conto richiesto | Viola/blu, icona 🧾 |
| Allergie presenti | Badge sovrapposto a qualsiasi stato | Rosso, icona ⚠️ |

Su ogni tavolo della mappa vanno indicati anche: etichetta, coperti e timer (tempo dall'apertura o dall'ultima comanda).

Stati delle righe d'ordine: **Bozza** (tratteggiata o modificabile), **Inviata**, **Servita**, **Stornata** (barrata). Ogni riga mostra anche il tipo di assegnazione: icona posto, icona "condiviso" con il numero di posti, icona "tavolo".

---

## 6. Componenti richiesti

- App bar con titolo e azioni; bottom bar per le azioni primarie in sala.
- Tab o chip (aree, categorie, portate).
- Card tavolo (piantina e griglia), card piatto, riga d'ordine.
- **Componente "Tavolo con posti"** parametrico: forma tonda, quadrata o rettangolare, da 1 a 20 posti, posti selezionabili e multi‑selezionabili, posti extra.
- Stepper numerico, toggle, checkbox, campo di ricerca.
- Tastierino PIN.
- Dialog, bottom sheet, toast con l'azione "Annulla".
- Banner di avviso, sia informativo sia bloccante.
- Set di **14 icone per gli allergeni** con etichetta testuale.
- Badge, contatore, timer.
- Empty state: nessun tavolo, menu vuoto, nessun ordine.

---

## 7. Design tokens da consegnare

Consegnare i tokens come file `tokens.css` con **esattamente questi nomi di variabili** (i valori li decide Claude Design), sia per il tema chiaro sia per quello scuro (`[data-theme="dark"]`):

```css
:root {
  /* Colori base */
  --color-bg; --color-surface; --color-surface-2; --color-border;
  --color-text; --color-text-muted; --color-primary; --color-on-primary;
  --color-danger; --color-warning; --color-success; --color-info;

  /* Stati tavolo */
  --status-free; --status-open; --status-active;
  --status-held; --status-bill; --status-allergen;

  /* Tipografia */
  --font-family; --font-size-xs; --font-size-sm; --font-size-md;
  --font-size-lg; --font-size-xl; --font-size-2xl;
  --font-weight-regular; --font-weight-medium; --font-weight-bold;

  /* Spaziature, raggi, ombre */
  --space-1; --space-2; --space-3; --space-4; --space-6; --space-8;
  --radius-sm; --radius-md; --radius-lg; --radius-full;
  --shadow-sm; --shadow-md; --shadow-lg;

  /* Interazione */
  --touch-target: 48px;
  --duration-fast; --duration-normal;
}
```

Usare un font di sistema o un Google Font con ottima leggibilità dei numeri, perché prezzi, coperti e numeri dei tavoli devono leggersi bene.

---

## 8. Accessibilità

- Contrasto WCAG AA (4.5:1 per il testo, 3:1 per gli elementi grafici).
- Lo stato non va mai comunicato solo con il colore: aggiungere sempre un'icona o un testo.
- Prevedere gli stati di focus visibili.
- Il layout deve reggere il testo ingrandito al 200%.
- Rispettare `prefers-reduced-motion`.

---

## 9. Tono

Professionale, pulito e caldo. Deve sembrare uno strumento di lavoro affidabile, non un'app consumer giocosa. Microcopy breve e operativo: "Invia comanda", "Marcia i secondi", "Chiudi tavolo".

---

## 10. Deliverable attesi

1. Mockup ad alta fedeltà delle schermate **16, 18, 20, 22 e 25** (sala) su smartphone e tablet: sono le priorità.
2. Mockup delle schermate admin **8, 9, 10 e 12**.
3. Le restanti schermate anche a media fedeltà.
4. Libreria dei componenti (§6) con i loro stati: default, hover/pressed, selezionato, disattivato, errore.
5. File `tokens.css` (§7), tema chiaro e scuro.
6. Diagramma del flusso principale: *apri tavolo → assegna piatti ai posti → invia comanda → marcia portata → conto per posto → chiudi*.
7. Note di handoff per Claude Code: misure, comportamenti e animazioni.
