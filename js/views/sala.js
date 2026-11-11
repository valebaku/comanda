// Vista Sala — griglia dei tavoli. (Fase 1: segnaposto; completata in Fase 3)

import * as store from '../store.js';
import { h, icona, appbar, vuoto } from '../lib/ui.js';

export function renderSala(el) {
  const { impostazioni, tavoli } = store.get();

  appbar({
    titolo: 'Sala',
    locale: impostazioni.nomeLocale,
    azioni: [
      h('a', { class: 'btn btn--icona', href: '#/admin', 'aria-label': 'Area amministrazione' }, icona('lock'))
    ]
  });

  if (tavoli.length === 0) {
    el.append(vuoto({
      icona: 'table_restaurant',
      titolo: 'Nessun tavolo',
      testo: 'Crea i tavoli dall’area amministrazione.',
      azione: h('a', { class: 'btn btn--primario', href: '#/admin/tavoli' }, icona('lock'), 'Vai all’Admin')
    }));
    return;
  }

  el.append(h('p', { class: 'segnaposto' }, `${tavoli.length} tavoli configurati. La griglia della sala arriva nella Fase 3.`));
}
