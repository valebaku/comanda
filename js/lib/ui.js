// Piccoli helper DOM condivisi dalle viste.

/**
 * Crea un elemento: h('button', { class: 'btn', onclick: fn, 'aria-label': 'x' }, 'Testo', figlio)
 * Gli attributi che iniziano con "on" diventano listener.
 */
export function h(tag, attrs = {}, ...figli) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === false || v == null) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
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

/** Aggiorna titolo e azioni dell'app bar. */
export function appbar({ titolo = '', locale = '', azioni = [] } = {}) {
  document.getElementById('appbar-titolo').textContent = titolo;
  document.getElementById('appbar-locale').textContent = locale;
  document.getElementById('appbar-azioni').replaceChildren(...azioni);
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
  const scuro = tema === 'scuro' || (tema === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = scuro ? 'dark' : 'light';
}
