// Bootstrap dell'app: carica i dati, applica il tema, registra le rotte e il service worker.

import * as store from './store.js';
import { rotta, avvia, vai, percorsoCorrente } from './router.js';
import { applicaTema, toast } from './lib/ui.js';
import { sessioneValida, toccaSessione, DURATA_SESSIONE_MS } from './lib/pin.js';
import { renderSala } from './views/sala.js';
import { renderTavolo } from './views/tavolo.js';
import { renderConto } from './views/conto.js';
import { renderAdmin } from './views/admin/index.js';

store.carica();

const aggiornaTema = () => applicaTema(store.get().impostazioni.tema);
aggiornaTema();
store.ascolta(aggiornaTema);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', aggiornaTema);

rotta('/sala', renderSala);
rotta('/tavolo/:id', renderTavolo);
rotta('/conto/:id', renderConto);
rotta('/admin', (el) => renderAdmin(el, { sezione: '' }));
rotta('/admin/:sezione', renderAdmin);

avvia(document.getElementById('app'), { home: '#/sala' });

// Sessione admin: ogni interazione nell'area Admin la rinnova; dopo 10 minuti
// di inattività si torna al tastierino PIN.
const inAdmin = () => percorsoCorrente().startsWith('/admin');
let eraValida = sessioneValida();
['pointerdown', 'keydown'].forEach((t) => document.addEventListener(t, () => { if (inAdmin()) toccaSessione(); }, { capture: true, passive: true }));
setInterval(() => {
  const valida = sessioneValida();
  if (inAdmin() && eraValida && !valida) {
    toast(`Sessione admin scaduta dopo ${DURATA_SESSIONE_MS / 60000} minuti di inattività`, { icona: 'lock' });
    vai(location.hash);
  }
  eraValida = valida;
}, 15000);

// Salvataggio fallito (es. memoria piena): avvisa invece di perdere dati in silenzio.
window.addEventListener('error', (e) => {
  if (e.error?.name === 'QuotaExceededError') toast('Memoria del dispositivo piena: i dati non sono stati salvati', { icona: 'error' });
});

// PWA: service worker per l'uso offline (solo su http/https, percorso relativo).
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('Service worker non registrato', err));
  });
}
