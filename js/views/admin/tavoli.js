// Admin › Tavoli: aggiungi, rinomina, riordina, coperti di default, elimina.

import * as store from '../../store.js';
import { h, icona, ridisegna, stepper, conferma, dialogo, campo, toast, vuoto } from '../../lib/ui.js';
import { pulisciEtichetta } from '../../lib/ordini.js';

const ordinati = (s) => [...s.tavoli].sort((a, b) => a.ordine - b.ordine);
const rinumera = (s) => ordinati(s).forEach((t, i) => { t.ordine = i; });

/** Primo nome numerico non usato ("1", "2", …). */
function prossimoNome(s, da = 1) {
  const usati = new Set(s.tavoli.map((t) => t.nome));
  let n = da;
  while (usati.has(String(n))) n++;
  return String(n);
}

function aggiungi(quanti, coperti) {
  store.aggiorna((s) => {
    for (let i = 0; i < quanti; i++) {
      s.tavoli.push({ id: store.nuovoId(), nome: prossimoNome(s), copertiDefault: coperti, ordine: s.tavoli.length });
    }
    rinumera(s);
  });
}

async function aggiungiPiu() {
  let quanti = 10;
  let coperti = 4;
  const v = await dialogo({
    titolo: 'Aggiungi più tavoli',
    corpo: h('div', { class: 'pila' },
      campo('Quanti tavoli', stepper({ valore: quanti, min: 1, max: 50, etichetta: 'Quanti tavoli', onChange: (n) => { quanti = n; } })),
      campo('Coperti di default', stepper({ valore: coperti, min: 1, max: 30, etichetta: 'Coperti di default', onChange: (n) => { coperti = n; } })),
      h('p', { class: 'testo-muted' }, 'I tavoli vengono numerati con i primi numeri liberi.')),
    azioni: [{ testo: 'Annulla', valore: '' }, { testo: 'Aggiungi', valore: 'ok', classe: 'btn--primario', icona: 'add' }]
  });
  if (v === 'ok') { aggiungi(quanti, coperti); toast(`${quanti} tavoli aggiunti`, { icona: 'check_circle' }); }
}

export function renderTavoliAdmin(el) {
  function costruisci() {
    const s = store.get();
    const tavoli = ordinati(s);
    const aperti = new Set(s.servizi.map((x) => x.tavoloId));

    const azioni = h('div', { class: 'barra-azioni' },
      h('button', { type: 'button', class: 'btn btn--primario', onclick: () => aggiungi(1, 4) }, icona('add'), 'Aggiungi tavolo'),
      h('button', { type: 'button', class: 'btn', onclick: aggiungiPiu }, icona('library_add'), 'Aggiungi più tavoli'));

    if (!tavoli.length) {
      return [azioni, vuoto({ icona: 'table_restaurant', titolo: 'Nessun tavolo', testo: 'Aggiungi i tavoli della sala, oppure carica i dati di esempio dalla sezione Dati.' })];
    }

    const lista = h('ol', { class: 'lista lista-tavoli' }, tavoli.map((t, i) => {
      const aperto = aperti.has(t.id);
      return h('li', { class: 'lista__riga' },
        h('div', { class: 'riordina' },
          h('button', {
            type: 'button', class: 'btn btn--icona btn--piatto', 'aria-label': `Sposta su il tavolo ${t.nome}`, disabled: i === 0, 'data-k': `su-${t.id}`,
            onclick: () => store.aggiorna((s) => { const l = ordinati(s); [l[i - 1].ordine, l[i].ordine] = [l[i].ordine, l[i - 1].ordine]; })
          }, icona('arrow_upward')),
          h('button', {
            type: 'button', class: 'btn btn--icona btn--piatto', 'aria-label': `Sposta giù il tavolo ${t.nome}`, disabled: i === tavoli.length - 1, 'data-k': `giu-${t.id}`,
            onclick: () => store.aggiorna((s) => { const l = ordinati(s); [l[i + 1].ordine, l[i].ordine] = [l[i].ordine, l[i + 1].ordine]; })
          }, icona('arrow_downward'))),
        h('label', { class: 'campo campo--riga lista-tavoli__nome' },
          h('span', { class: 'campo__etichetta' }, 'Tavolo'),
          h('input', {
            class: 'campo__input campo__input--grande', value: t.nome, maxlength: 20, 'data-k': `nome-${t.id}`,
            onchange: (e) => {
              const nome = pulisciEtichetta(e.target.value);
              if (!nome) { e.target.value = t.nome; return; }
              store.aggiorna((s) => { s.tavoli.find((x) => x.id === t.id).nome = nome; });
            }
          })),
        h('div', { class: 'campo campo--riga' },
          h('span', { class: 'campo__etichetta' }, 'Coperti'),
          stepper({
            valore: t.copertiDefault, min: 1, max: 30, etichetta: `Coperti di default tavolo ${t.nome}`, k: `cop-${t.id}`,
            onChange: (n) => store.aggiorna((s) => { s.tavoli.find((x) => x.id === t.id).copertiDefault = n; })
          })),
        aperto
          ? h('span', { class: 'etichetta-info', title: 'Tavolo aperto: chiudilo prima di eliminarlo' }, icona('lock'), 'Aperto')
          : h('button', {
              type: 'button', class: 'btn btn--icona btn--pericolo-testo', 'aria-label': `Elimina tavolo ${t.nome}`,
              onclick: async () => {
                if (await conferma({ titolo: `Eliminare il tavolo ${t.nome}?`, testo: 'L’operazione non si può annullare.', ok: 'Elimina', pericolo: true, icona: 'delete' })) {
                  store.aggiorna((s) => { s.tavoli = s.tavoli.filter((x) => x.id !== t.id); rinumera(s); });
                }
              }
            }, icona('delete')));
    }));

    return [azioni, h('p', { class: 'testo-muted' }, `${tavoli.length} tavoli. Un tavolo aperto non si può eliminare.`), lista];
  }

  const disegna = () => ridisegna(el, costruisci);
  disegna();
  return store.ascolta(disegna);
}
