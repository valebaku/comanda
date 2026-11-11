// Area Admin: controllo PIN/sessione, dashboard e smistamento tra le sezioni.

import * as store from '../../store.js';
import { vai } from '../../router.js';
import { h, icona, appbar } from '../../lib/ui.js';
import { sessioneValida, toccaSessione, chiudiSessione } from '../../lib/pin.js';
import { renderLogin, renderCambioPin } from './pin.js';
import { renderTavoliAdmin } from './tavoli.js';
import { renderMenuAdmin } from './menu.js';
import { renderImpostazioni } from './impostazioni.js';
import { renderDati, bannerBackup } from './dati.js';

const SEZIONI = [
  { id: 'tavoli', nome: 'Tavoli', icona: 'table_restaurant', descr: 'Numero/nome, coperti di default, ordine', render: renderTavoliAdmin },
  { id: 'menu', nome: 'Menu', icona: 'menu_book', descr: 'Categorie, piatti, prezzi, esauriti', render: renderMenuAdmin },
  { id: 'impostazioni', nome: 'Impostazioni', icona: 'settings', descr: 'Nome locale, coperto, uscite, tema, PIN', render: renderImpostazioni },
  { id: 'dati', nome: 'Dati', icona: 'database', descr: 'Storico conti, backup, ripristino, reset', render: renderDati }
];

export function bottoneEsci() {
  return h('button', {
    type: 'button',
    class: 'btn',
    onclick: () => { chiudiSessione(); vai('#/sala'); }
  }, icona('logout'), h('span', { class: 'solo-ampio' }, 'Esci'));
}

export function renderAdmin(el, { sezione = '' }) {
  if (!sessioneValida()) return renderLogin(el);
  if (store.get().impostazioni.pinDaCambiare) return renderCambioPin(el, { obbligatorio: true });
  toccaSessione();

  const corrente = SEZIONI.find((s) => s.id === sezione);
  if (sezione === 'pin') return renderCambioPin(el, { fatto: () => vai('#/admin/impostazioni') });
  if (corrente) {
    appbar({ titolo: corrente.nome, locale: 'Amministrazione', indietro: '#/admin', azioni: [bottoneEsci()] });
    return corrente.render(el);
  }
  if (sezione) { vai('#/admin'); return; }

  const { impostazioni } = store.get();
  appbar({ titolo: 'Amministrazione', locale: impostazioni.nomeLocale, indietro: '#/sala', azioni: [bottoneEsci()] });
  el.append(
    bannerBackup(),
    h('nav', { class: 'menu-admin', 'aria-label': 'Sezioni amministrazione' },
      SEZIONI.map((s) => h('a', { class: 'menu-admin__voce', href: `#/admin/${s.id}` },
        icona(s.icona),
        h('span', { class: 'menu-admin__testi' },
          h('span', { class: 'menu-admin__nome' }, s.nome),
          h('span', { class: 'menu-admin__descr' }, s.descr)),
        icona('chevron_right', 'menu-admin__freccia')))
    )
  );
}
