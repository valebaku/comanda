// Bootstrap dell'app: carica i dati, applica il tema, registra le rotte.

import * as store from './store.js';
import { rotta, avvia } from './router.js';
import { applicaTema } from './lib/ui.js';
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
