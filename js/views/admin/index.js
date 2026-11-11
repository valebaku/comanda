// Area Admin: smista tra le sezioni. (Fase 1: segnaposto; PIN e sezioni in Fase 2)

import { h, icona, appbar } from '../../lib/ui.js';

const SEZIONI = [
  { id: 'tavoli', nome: 'Tavoli', icona: 'table_restaurant' },
  { id: 'menu', nome: 'Menu', icona: 'menu_book' },
  { id: 'impostazioni', nome: 'Impostazioni', icona: 'settings' },
  { id: 'dati', nome: 'Dati', icona: 'database' }
];

export function renderAdmin(el, { sezione }) {
  const corrente = SEZIONI.find((s) => s.id === sezione);
  appbar({
    titolo: corrente ? corrente.nome : 'Amministrazione',
    azioni: [h('a', { class: 'btn btn--icona', href: corrente ? '#/admin' : '#/sala', 'aria-label': 'Indietro' }, icona('arrow_back'))]
  });

  if (!corrente) {
    el.append(h('nav', { class: 'menu-admin', 'aria-label': 'Sezioni amministrazione' },
      SEZIONI.map((s) => h('a', { class: 'menu-admin__voce', href: `#/admin/${s.id}` }, icona(s.icona), s.nome))
    ));
    return;
  }
  el.append(h('p', { class: 'segnaposto' }, `Sezione “${corrente.nome}”: in arrivo nella Fase 2.`));
}
