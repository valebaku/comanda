// Router su hash: #/sala, #/tavolo/:id, #/conto/:id, #/admin/...
// Ogni rotta ha un pattern e una funzione `render(contenitore, params)` che può
// restituire una funzione di pulizia, chiamata quando si lascia la vista.

const rotte = [];
let pulizia = null;
let contenitore = null;
let fallback = '#/sala';

export function rotta(pattern, render) {
  const nomi = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, n) => { nomi.push(n); return '([^/]+)'; }) + '/?$');
  rotte.push({ re, nomi, render });
}

export function trova(percorso) {
  for (const r of rotte) {
    const m = percorso.match(r.re);
    if (m) {
      const params = Object.fromEntries(r.nomi.map((n, i) => [n, decodeURIComponent(m[i + 1])]));
      return { render: r.render, params };
    }
  }
  return null;
}

export function percorsoCorrente() {
  return location.hash.replace(/^#/, '') || '/';
}

export function vai(hash) {
  if (!hash.startsWith('#')) hash = '#' + hash;
  if (location.hash === hash) mostra();
  else location.hash = hash;
}

async function mostra() {
  const percorso = percorsoCorrente();
  const trovata = trova(percorso);
  if (!trovata) {
    history.replaceState(null, '', fallback);
    return mostra();
  }
  if (typeof pulizia === 'function') pulizia();
  pulizia = null;
  contenitore.replaceChildren();
  pulizia = await trovata.render(contenitore, trovata.params);
  contenitore.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

export function avvia(el, { home = '#/sala' } = {}) {
  contenitore = el;
  fallback = home;
  window.addEventListener('hashchange', mostra);
  mostra();
}
