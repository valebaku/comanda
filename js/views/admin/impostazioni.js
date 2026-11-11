// Admin › Impostazioni: nome locale, prezzo coperto, nomi delle uscite, tema, cambio PIN.

import * as store from '../../store.js';
import { h, icona, ridisegna, campo, segmentato, conferma, toast } from '../../lib/ui.js';
import { formatCent, parseCent } from '../../lib/money.js';

/** Un'uscita è in uso se è predefinita di una categoria o usata da righe aperte. */
function usoUscita(s, i) {
  return s.categorie.some((c) => c.uscitaDefault === i) || s.servizi.some((x) => x.righe.some((r) => r.uscita === i));
}

export function renderImpostazioni(el) {
  function costruisci() {
    const s = store.get();
    const imp = s.impostazioni;

    const nome = h('input', {
      class: 'campo__input', value: imp.nomeLocale, maxlength: 40, 'data-k': 'nome', placeholder: 'Es. Trattoria Da Rina',
      onchange: (e) => store.aggiorna((st) => { st.impostazioni.nomeLocale = e.target.value.trim(); })
    });

    const errCoperto = h('span', { class: 'campo__errore', role: 'alert' });
    const coperto = h('input', {
      class: 'campo__input', value: formatCent(imp.prezzoCopertoCent), inputmode: 'decimal', 'data-k': 'coperto',
      onchange: (e) => {
        const c = parseCent(e.target.value);
        if (c == null) { errCoperto.textContent = 'Importo non valido (es. 2,00)'; return; }
        errCoperto.textContent = '';
        store.aggiorna((st) => { st.impostazioni.prezzoCopertoCent = c; });
      }
    });

    const uscite = h('ol', { class: 'lista lista--compatta' }, imp.uscite.map((u, i) => h('li', { class: 'lista__riga' },
      h('span', { class: 'numero-uscita' }, String(i + 1)),
      h('input', {
        class: 'campo__input cresci', value: u, maxlength: 20, 'aria-label': `Nome uscita ${i + 1}`, 'data-k': `usc-${i}`,
        onchange: (e) => {
          const v = e.target.value.trim();
          if (!v) { e.target.value = u; return; }
          store.aggiorna((st) => { st.impostazioni.uscite[i] = v; });
        }
      }),
      i === imp.uscite.length - 1 && imp.uscite.length > 1
        ? h('button', {
            type: 'button', class: 'btn btn--icona btn--pericolo-testo', 'aria-label': `Elimina uscita ${u}`,
            onclick: async () => {
              if (usoUscita(store.get(), i)) {
                toast('Uscita in uso da categorie o tavoli aperti: non si può eliminare', { icona: 'block' });
                return;
              }
              if (await conferma({ titolo: `Eliminare “${u}”?`, ok: 'Elimina', pericolo: true })) {
                store.aggiorna((st) => { st.impostazioni.uscite.pop(); });
              }
            }
          }, icona('delete'))
        : null)));

    return [
      h('section', { class: 'scheda pila' },
        h('h2', { class: 'scheda__titolo' }, 'Locale'),
        campo('Nome del locale', nome),
        campo('Prezzo del coperto (€ a persona)', h('div', { class: 'pila-stretta' }, coperto, errCoperto), '0,00 = coperto disattivato')),
      h('section', { class: 'scheda pila' },
        h('h2', { class: 'scheda__titolo' }, 'Uscite'),
        h('p', { class: 'testo-muted' }, 'Ogni piatto appartiene a un’uscita. Si può eliminare solo l’ultima, se non è in uso.'),
        uscite,
        imp.uscite.length < 8 && h('button', {
          type: 'button', class: 'btn',
          onclick: () => store.aggiorna((st) => { st.impostazioni.uscite.push(`${st.impostazioni.uscite.length + 1}ª uscita`); })
        }, icona('add'), 'Aggiungi uscita')),
      h('section', { class: 'scheda pila' },
        h('h2', { class: 'scheda__titolo' }, 'Aspetto'),
        segmentato({
          etichetta: 'Tema', valore: imp.tema, classe: 'segmentato--largo',
          opzioni: [
            { valore: 'auto', testo: 'Automatico', icona: 'brightness_auto' },
            { valore: 'chiaro', testo: 'Chiaro', icona: 'light_mode' },
            { valore: 'scuro', testo: 'Scuro', icona: 'dark_mode' }
          ],
          onChange: (v) => store.aggiorna((st) => { st.impostazioni.tema = v; })
        })),
      h('section', { class: 'scheda pila' },
        h('h2', { class: 'scheda__titolo' }, 'Sicurezza'),
        h('p', { class: 'testo-muted' }, 'Il PIN evita accessi accidentali all’area Admin, ma non è una vera protezione: i dati restano su questo dispositivo.'),
        h('a', { class: 'btn', href: '#/admin/pin' }, icona('password'), 'Cambia PIN'))
    ];
  }
  const disegna = () => ridisegna(el, costruisci);
  disegna();
  return store.ascolta(disegna);
}
