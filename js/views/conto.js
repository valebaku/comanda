// Vista Conto. (Fase 1: segnaposto; completata in Fase 5)

import { h, icona, appbar } from '../lib/ui.js';

export function renderConto(el, { id }) {
  appbar({
    titolo: 'Conto',
    azioni: [h('a', { class: 'btn btn--icona', href: `#/tavolo/${encodeURIComponent(id)}`, 'aria-label': 'Torna al tavolo' }, icona('arrow_back'))]
  });
  el.append(h('p', { class: 'segnaposto' }, 'Conto (Totale / Per coperto / Alla romana): in arrivo nella Fase 5.'));
}
