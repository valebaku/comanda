// Vista Dettaglio tavolo. (Fase 1: segnaposto; completata in Fase 4)

import { h, icona, appbar } from '../lib/ui.js';

export function renderTavolo(el, { id }) {
  appbar({
    titolo: 'Tavolo',
    azioni: [h('a', { class: 'btn btn--icona', href: '#/sala', 'aria-label': 'Torna alla sala' }, icona('arrow_back'))]
  });
  el.append(h('p', { class: 'segnaposto' }, `Dettaglio del servizio ${id}: in arrivo nella Fase 4.`));
}
