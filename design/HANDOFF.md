# Handoff per Claude Code — Gestione Tavoli

File di riferimento
- `tokens.css` — tutti i token (chiaro in `:root`, scuro in `[data-theme="dark"]`). Applicare `data-theme` su `<html>`; default = `prefers-color-scheme`, override manuale in Impostazioni.
- `Sala Smartphone.dc.html`, `Sala Tablet.dc.html` — hi-fi 16, 18, 20, 22, 25.
- `Admin.dc.html` — hi-fi 8, 9, 10, 12.
- `Altre Schermate.dc.html` — media fedeltà (1–7, 11, 13–15, 17, 19, 21, 23, 24, 26).
- `Componenti.dc.html` — libreria, stati, allergeni, flusso.
- `TavoloPosti.dc.html` — logica di posizionamento dei posti (porting 1:1 in JS vanilla).
- `dati.js` — dati di esempio e mappa stati → token.

## Font e icone
- IBM Plex Sans 400/500/600 (Google Fonts) con `font-variant-numeric: tabular-nums` su `body`.
- Icone: Material Symbols Rounded, `FILL 1`, `wght 500`, 18–24 px. Allergeni: icona + codice a 2 lettere sempre insieme.
- Prezzi formattati `it-IT` (`13,00`, `€ 1.234,50`).

## Misure
- Target minimo `--touch-target` 48 px; primari in sala 56 px; tasti PIN 72 px.
- Margini schermo smartphone 16 px; gap liste 6–8 px; gap sezioni 12–16 px.
- App bar 60 px (phone) / 72 px (tablet). Bottom bar sala 88 px incl. safe area.
- Tablet ≥ 768 px: vista tavolo a 2 colonne (`600px | 1fr` in orizzontale; in verticale schema sopra ≈45%, ordine sotto). Selezione piatto su tablet = pannello destro (non full-screen).
- Posti: 56–76 px (phone 56). Badge allergie 22 px in alto a destra, contatore righe 22 px in basso a destra.

## Componente “Tavolo con posti”
- Input: forma (round/square/rect), elenco posti `{label, guest, allergy, count, extra}`, selezione, larghezza/altezza, dimensione posto.
- Tonda: posti su cerchio, partenza a ore 12, senso orario.
- Quadrata: distribuzione round-robin su 4 lati.
- Rettangolare: < 6 posti solo lati lunghi; ≥ 6 un posto per testata e gli altri sui lati lunghi; ordine orario a partire dalla testata sinistra.
- Posti extra: bordo tratteggiato. Selezionato: fondo primario + alone 4 px. Con righe: bordo primario.
- Tap singolo (modalità normale) → apre Selezione piatto per quel posto e filtra l’ordine. Modalità multi: tap = toggle; serve ≥ 2 posti per “Aggiungi condiviso”.
- Pulsante centrale “Tavolo” = destinatario tavolo intero.

## Stati
- Tavolo: free / open / active / held / bill + badge allergie sovrapposto. Sempre icona + testo/meta, mai solo colore.
- Riga: Bozza (bordo tratteggiato), Inviata (icona send, info), Servita (check, success), Stornata (barrato, motivo nel sottotitolo).
- Timer tavolo: dall’apertura se nulla è inviato, altrimenti dall’ultima comanda; aggiornamento ogni 30 s.

## Comportamenti
- Ordinare in ≤ 4 tocchi: posto → categoria → piatto (+) → (config. solo se il piatto ha varianti obbligatorie) conferma.
- Piatti con allergeni in conflitto con il posto: marcati nella lista; al tocco di “+” apre il dialog 22 bloccante (focus iniziale su “Annulla”, Esc = Annulla, niente chiusura al tap sullo sfondo). Se confermato, la riga riporta il flag allergia nella comanda.
- Esauriti: visibili ma disattivati (opacity .5, `aria-disabled`).
- Annulla: ogni aggiunta/eliminazione di bozza mostra toast 5 s con “Annulla”. Conferme solo per azioni distruttive (storno, chiusura con residuo, reset dati).
- Storno: solo su righe inviate, motivo obbligatorio.
- Conto: le righe condivise si dividono tra i posti coinvolti, quelle “Tavolo” tra tutti; coperto per persona. “Chiudi tavolo” abilitato a residuo 0.
- Crea in blocco: numeri già esistenti vengono saltati e segnalati nell’anteprima.
- Editor piantina: aggancio griglia 20 px attivabile, rotazione a step 45° (handle libero + Shift = step), annulla/ripeti.

## Animazioni
- `--duration-fast` (120 ms): pressed, toggle, chip. `--duration-normal` (220 ms): bottom sheet (slide-up + fade sfondo), dialog (scale .96 → 1 + fade), toast.
- Selezione posto: transizione colore/alone `--duration-fast`.
- Cambio stato tavolo in mappa: cross-fade colore 220 ms; nessun lampeggio.
- `prefers-reduced-motion`: i token tornano a 0 ms (già in tokens.css).

## Accessibilità
- Contrasto AA verificato sui token principali; testo su `--status-held` sempre `#1D1A16`.
- Focus visibile: `outline: 3px solid var(--color-info); outline-offset: 2px`.
- Posti: `<button aria-pressed>` con `aria-label="P2, Giulia, allergie: glutine, latte, 2 righe"`.
- Layout a flex/grid senza altezze fisse sui testi: regge testo al 200%.
- Preconto: `@media print`, larghezza 80 mm, font monospazio, “DOCUMENTO NON FISCALE” in chiaro.
