// Helper DOM e componenti riutilizzabili (dialoghi, toast, stepper, segmented…).

/**
 * Crea un elemento: h('button', { class: 'btn', onclick: fn, 'aria-label': 'x' }, 'Testo', figlio)
 * Gli attributi che iniziano con "on" diventano listener; `false`/`null` vengono omessi.
 */
export function h(tag, attrs = {}, ...figli) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === false || v == null) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'value' && 'value' in el) el.value = v;
    else if (k === 'checked' || k === 'disabled' || k === 'selected') { el[k] = !!v; if (v === true) el.setAttribute(k, ''); }
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const f of figli.flat(Infinity)) {
    if (f == null || f === false) continue;
    el.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
  return el;
}

/** Icona Material Symbols decorativa (nascosta agli screen reader). */
export function icona(nome, cls = '') {
  return h('span', { class: `icona ${cls}`.trim(), 'aria-hidden': 'true' }, nome);
}

/** Aggiorna titolo, sottotitolo, pulsante indietro e azioni dell'app bar. */
export function appbar({ titolo = '', locale = '', indietro = null, azioni = [] } = {}) {
  const barra = document.getElementById('appbar');
  barra.querySelector('.appbar__indietro')?.remove();
  if (indietro) {
    barra.prepend(h('a', { class: 'btn btn--icona btn--piatto appbar__indietro', href: indietro, 'aria-label': 'Indietro' }, icona('arrow_back')));
  }
  document.getElementById('appbar-titolo').textContent = titolo;
  document.getElementById('appbar-locale').textContent = locale;
  document.getElementById('appbar-azioni').replaceChildren(...azioni.filter(Boolean));
  document.title = titolo ? `${titolo} — Comanda` : 'Comanda';
}

/** Stato vuoto con icona, titolo, descrizione e azione opzionale. */
export function vuoto({ icona: ic, titolo, testo, azione }) {
  return h('div', { class: 'vuoto' },
    icona(ic, 'vuoto__icona'),
    h('p', { class: 'vuoto__titolo' }, titolo),
    testo && h('p', { class: 'vuoto__testo' }, testo),
    azione
  );
}

/** Applica il tema: "auto" segue il sistema, altrimenti forza chiaro/scuro. */
export function applicaTema(tema) {
  const scuro = tema === 'scuro' || (tema !== 'chiaro' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = scuro ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', scuro ? '#1C1A17' : '#FFFFFF');
}

/**
 * Ridisegna il contenuto di `el` con `costruisci()` mantenendo lo scroll
 * degli elementi con [data-scroll] e il focus sull'elemento con lo stesso [data-k].
 */
export function ridisegna(el, costruisci) {
  const scroll = {};
  el.querySelectorAll('[data-scroll]').forEach((s) => { scroll[s.dataset.scroll] = s.scrollTop; });
  const pagina = window.scrollY;
  const attivo = document.activeElement;
  const chiaveFocus = el.contains(attivo) ? attivo?.dataset?.k : null;
  el.replaceChildren(...[costruisci()].flat().filter(Boolean));
  el.querySelectorAll('[data-scroll]').forEach((s) => { if (scroll[s.dataset.scroll] != null) s.scrollTop = scroll[s.dataset.scroll]; });
  window.scrollTo(0, pagina);
  if (chiaveFocus) el.querySelector(`[data-k="${CSS.escape(chiaveFocus)}"]`)?.focus({ preventScroll: true });
}

// ---------------------------------------------------------------------------
// Dialoghi

/**
 * Dialogo modale generico. Ritorna una Promise con il `valore` dell'azione scelta,
 * oppure "" se chiuso con Esc / tocco sullo sfondo.
 *   azioni: [{ testo, valore, classe, icona, primaria, prima: async () => bool }]
 * `prima` può impedire la chiusura (es. validazione) restituendo false.
 * Invio in un campo di testo attiva l'azione primaria.
 */
export function dialogo({ titolo, corpo, azioni = [], classe = '', chiudiSuSfondo = true, onApri } = {}) {
  return new Promise((resolve) => {
    const idTitolo = `dlg-${Math.random().toString(36).slice(2)}`;
    const d = h('dialog', { class: `dialogo ${classe}`.trim(), 'aria-labelledby': idTitolo });
    const scegli = async (a) => {
      if (a.prima && (await a.prima(d)) === false) return;
      d.close(a.valore ?? '');
    };
    const bottoni = azioni.map((a) => h('button', {
      type: 'button',
      class: `btn ${a.classe ?? ''}`.trim(),
      onclick: () => scegli(a),
      'data-primaria': a.primaria ? '1' : null
    }, a.icona && icona(a.icona), a.testo));

    d.append(
      h('h2', { class: 'dialogo__titolo', id: idTitolo }, titolo),
      corpo && h('div', { class: 'dialogo__corpo' }, corpo),
      bottoni.length && h('div', { class: 'dialogo__azioni' }, bottoni)
    );
    d.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.matches('input:not([type=checkbox]):not([type=radio])')) {
        const primaria = azioni.find((a) => a.primaria);
        if (primaria) { e.preventDefault(); scegli(primaria); }
      }
    });
    if (chiudiSuSfondo) {
      d.addEventListener('click', (e) => { if (e.target === d) d.close(''); });
    }
    d.addEventListener('close', () => { resolve(d.returnValue); d.remove(); });
    document.body.append(d);
    d.showModal();
    // Focus iniziale: primo campo, altrimenti l'azione non distruttiva
    const campo = d.querySelector('input, select, textarea');
    if (campo) { campo.focus(); campo.select?.(); }
    onApri?.(d);
  });
}

/**
 * Conferma. Per le azioni distruttive (`pericolo: true`) il pulsante è rosso,
 * il focus iniziale è su "Annulla" e il tocco sullo sfondo non chiude.
 */
export async function conferma({ titolo, testo, ok = 'Conferma', annulla = 'Annulla', pericolo = false, icona: ic }) {
  const v = await dialogo({
    titolo,
    corpo: testo && h('p', {}, testo),
    chiudiSuSfondo: !pericolo,
    azioni: [
      { testo: annulla, valore: '' },
      { testo: ok, valore: 'ok', classe: pericolo ? 'btn--pericolo' : 'btn--primario', icona: ic }
    ],
    onApri: (d) => d.querySelector('.dialogo__azioni .btn')?.focus()
  });
  return v === 'ok';
}

/** Chiede un testo. Ritorna la stringa (trim) o null se annullato. */
export async function chiediTesto({ titolo, etichetta, valore = '', maxlength = 40, ok = 'Salva', inputmode }) {
  const input = h('input', { class: 'campo__input', type: 'text', value: valore, maxlength, inputmode, 'aria-label': etichetta ?? titolo });
  const v = await dialogo({
    titolo,
    corpo: h('label', { class: 'campo' }, etichetta && h('span', { class: 'campo__etichetta' }, etichetta), input),
    azioni: [
      { testo: 'Annulla', valore: '' },
      { testo: ok, valore: 'ok', classe: 'btn--primario', primaria: true }
    ]
  });
  return v === 'ok' ? input.value.trim() : null;
}

// ---------------------------------------------------------------------------
// Toast (con azione "Annulla" opzionale)

let toastCorrente = null;

export function toast(testo, { icona: ic, azione, durata = 4000 } = {}) {
  let contenitore = document.getElementById('toast');
  if (!contenitore) {
    contenitore = h('div', { id: 'toast', class: 'toast-area', role: 'status', 'aria-live': 'polite' });
    document.body.append(contenitore);
  }
  toastCorrente?.chiudi();
  let timer;
  const el = h('div', { class: 'toast' },
    ic && icona(ic),
    h('span', { class: 'toast__testo' }, testo),
    azione && h('button', {
      type: 'button',
      class: 'toast__azione',
      onclick: () => { azione.fn(); chiudi(); }
    }, azione.testo)
  );
  function chiudi() {
    clearTimeout(timer);
    el.remove();
    if (toastCorrente?.el === el) toastCorrente = null;
  }
  contenitore.append(el);
  timer = setTimeout(chiudi, azione ? Math.max(durata, 5000) : durata);
  toastCorrente = { el, chiudi };
  return chiudi;
}

// ---------------------------------------------------------------------------
// Controlli

/** Stepper −/+ . `onChange(valore)` viene chiamato a ogni modifica. */
export function stepper({ valore, min = 0, max = 99, onChange, etichetta = 'Quantità', k }) {
  let v = valore;
  const out = h('output', { class: 'stepper__valore', 'aria-live': 'polite' }, String(v));
  const meno = h('button', { type: 'button', class: 'stepper__btn', 'aria-label': `${etichetta}: diminuisci`, 'data-k': k && `${k}-meno` }, icona('remove'));
  const piu = h('button', { type: 'button', class: 'stepper__btn', 'aria-label': `${etichetta}: aumenta`, 'data-k': k && `${k}-piu` }, icona('add'));
  const aggiorna = () => {
    out.textContent = String(v);
    meno.disabled = v <= min;
    piu.disabled = v >= max;
  };
  meno.addEventListener('click', () => { if (v > min) { v--; aggiorna(); onChange?.(v); } });
  piu.addEventListener('click', () => { if (v < max) { v++; aggiorna(); onChange?.(v); } });
  aggiorna();
  const el = h('div', { class: 'stepper', role: 'group', 'aria-label': etichetta }, meno, out, piu);
  el.imposta = (n) => { v = n; aggiorna(); };
  return el;
}

/** Controllo segmentato (scelta singola). opzioni: [{ valore, testo, icona }] */
export function segmentato({ opzioni, valore, onChange, etichetta, classe = '' }) {
  return h('div', { class: `segmentato ${classe}`.trim(), role: 'radiogroup', 'aria-label': etichetta },
    opzioni.map((o) => h('button', {
      type: 'button',
      role: 'radio',
      class: 'segmentato__opzione',
      'aria-checked': String(o.valore === valore),
      'data-k': `seg-${etichetta}-${o.valore}`,
      onclick: () => { if (o.valore !== valore) onChange(o.valore); }
    }, o.icona && icona(o.icona), o.testo))
  );
}

/** Interruttore on/off accessibile. */
export function interruttore({ acceso, onChange, etichetta, k }) {
  return h('button', {
    type: 'button',
    role: 'switch',
    class: 'switch',
    'aria-checked': String(!!acceso),
    'aria-label': etichetta,
    'data-k': k,
    onclick: () => onChange(!acceso)
  }, h('span', { class: 'switch__pallino' }));
}

/** Campo con etichetta. */
export function campo(etichetta, controllo, aiuto) {
  return h('label', { class: 'campo' },
    h('span', { class: 'campo__etichetta' }, etichetta),
    controllo,
    aiuto && h('span', { class: 'campo__aiuto' }, aiuto)
  );
}

/**
 * Pressione lunga (500 ms) su un elemento: chiama `fn` e annulla il click successivo.
 * Funziona con touch, penna e mouse; anche il menu contestuale (tasto destro) la attiva.
 */
export function pressioneLunga(el, fn, ms = 500) {
  let timer = null;
  let scattata = false;
  let x0 = 0;
  let y0 = 0;
  const annulla = () => { clearTimeout(timer); timer = null; };
  el.addEventListener('pointerdown', (e) => {
    scattata = false;
    x0 = e.clientX; y0 = e.clientY;
    timer = setTimeout(() => { scattata = true; navigator.vibrate?.(20); fn(); }, ms);
  });
  el.addEventListener('pointermove', (e) => { if (Math.hypot(e.clientX - x0, e.clientY - y0) > 10) annulla(); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => el.addEventListener(t, annulla));
  el.addEventListener('click', (e) => { if (scattata) { e.preventDefault(); e.stopImmediatePropagation(); scattata = false; } }, true);
  el.addEventListener('contextmenu', (e) => { e.preventDefault(); if (!scattata) { annulla(); scattata = false; fn(); } });
}

// ---------------------------------------------------------------------------
// Tempo

/** Minuti trascorsi come "6′", "38′", "1h12′". */
export function tempoTrascorso(daIso, ora = Date.now()) {
  const min = Math.max(0, Math.floor((ora - new Date(daIso).getTime()) / 60000));
  if (min < 60) return `${min}′`;
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}′`;
}

const fmtData = new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const dataOra = (iso) => fmtData.format(new Date(iso));

/** Info visive per i 4 stati del tavolo (colore + icona + testo). */
export const STATI_TAVOLO = {
  libero: { testo: 'Libero', icona: 'event_available' },
  occupato: { testo: 'Occupato', icona: 'restaurant' },
  attesa: { testo: 'In attesa', icona: 'pause_circle' },
  conto: { testo: 'Conto richiesto', icona: 'receipt_long' }
};

export function badgeStato(stato) {
  const s = STATI_TAVOLO[stato];
  return h('span', { class: `badge-stato stato--${stato}` }, icona(s.icona), s.testo);
}

/** Info visive per lo stato di una riga d'ordine. */
export const STATI_RIGA = {
  attesa: { testo: 'In attesa', icona: 'schedule' },
  chiamata: { testo: 'Chiamata', icona: 'campaign' },
  servita: { testo: 'Servita', icona: 'check_circle' }
};
