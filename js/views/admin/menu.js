// Admin › Menu: categorie (uscita predefinita, ordine) e piatti (nome, prezzo, categoria, disponibile).

import * as store from '../../store.js';
import { h, icona, ridisegna, conferma, dialogo, campo, interruttore, segmentato, chiediTesto, toast, vuoto } from '../../lib/ui.js';
import { formatCent, parseCent } from '../../lib/money.js';

let scheda = 'piatti'; // ricordata tra una visita e l'altra

const catOrdinate = (s) => [...s.categorie].sort((a, b) => a.ordine - b.ordine);
const rinumera = (s) => catOrdinate(s).forEach((c, i) => { c.ordine = i; });

function selectUscita(valore, onChange, k) {
  const { uscite } = store.get().impostazioni;
  return h('select', { class: 'campo__input', 'data-k': k, onchange: (e) => onChange(Number(e.target.value)) },
    uscite.map((u, i) => h('option', { value: String(i), selected: i === valore }, u)));
}

async function nuovaCategoria() {
  const nome = await chiediTesto({ titolo: 'Nuova categoria', etichetta: 'Nome', ok: 'Aggiungi', maxlength: 30 });
  if (!nome) return;
  store.aggiorna((s) => {
    s.categorie.push({ id: store.nuovoId(), nome, ordine: s.categorie.length, uscitaDefault: 0 });
    rinumera(s);
  });
}

/** Dialogo crea/modifica piatto. */
async function formPiatto(piatto, categoriaId) {
  const s = store.get();
  if (!s.categorie.length) { toast('Crea prima una categoria', { icona: 'info' }); return; }
  const nome = h('input', { class: 'campo__input', value: piatto?.nome ?? '', maxlength: 40, required: true });
  const prezzo = h('input', { class: 'campo__input', value: piatto ? formatCent(piatto.prezzoCent) : '', inputmode: 'decimal', placeholder: '0,00' });
  const cat = h('select', { class: 'campo__input' },
    catOrdinate(s).map((c) => h('option', { value: c.id, selected: c.id === (piatto?.categoriaId ?? categoriaId) }, c.nome)));
  const errore = h('p', { class: 'campo__errore', role: 'alert' });

  const v = await dialogo({
    titolo: piatto ? 'Modifica piatto' : 'Nuovo piatto',
    corpo: h('div', { class: 'pila' }, campo('Nome', nome), campo('Prezzo (€)', prezzo), campo('Categoria', cat), errore),
    azioni: [
      { testo: 'Annulla', valore: '' },
      {
        testo: 'Salva', valore: 'ok', classe: 'btn--primario', primaria: true,
        prima: () => {
          if (!nome.value.trim()) { errore.textContent = 'Il nome è obbligatorio'; nome.focus(); return false; }
          const c = parseCent(prezzo.value);
          if (c == null) { errore.textContent = 'Prezzo non valido (es. 12,50)'; prezzo.focus(); return false; }
          return true;
        }
      }
    ]
  });
  if (v !== 'ok') return;
  const dati = { nome: nome.value.trim(), prezzoCent: parseCent(prezzo.value), categoriaId: cat.value };
  store.aggiorna((st) => {
    if (piatto) Object.assign(st.piatti.find((p) => p.id === piatto.id), dati);
    else st.piatti.push({ id: store.nuovoId(), attivo: true, ...dati });
  });
  toast(piatto ? 'Piatto aggiornato' : 'Piatto aggiunto', { icona: 'check_circle' });
}

function vistaCategorie(s) {
  const cats = catOrdinate(s);
  const lista = cats.length
    ? h('ol', { class: 'lista' }, cats.map((c, i) => {
        const nPiatti = s.piatti.filter((p) => p.categoriaId === c.id).length;
        return h('li', { class: 'lista__riga' },
          h('div', { class: 'riordina' },
            h('button', {
              type: 'button', class: 'btn btn--icona btn--piatto', 'aria-label': `Sposta su ${c.nome}`, disabled: i === 0, 'data-k': `csu-${c.id}`,
              onclick: () => store.aggiorna((st) => { const l = catOrdinate(st); [l[i - 1].ordine, l[i].ordine] = [l[i].ordine, l[i - 1].ordine]; })
            }, icona('arrow_upward')),
            h('button', {
              type: 'button', class: 'btn btn--icona btn--piatto', 'aria-label': `Sposta giù ${c.nome}`, disabled: i === cats.length - 1, 'data-k': `cgiu-${c.id}`,
              onclick: () => store.aggiorna((st) => { const l = catOrdinate(st); [l[i + 1].ordine, l[i].ordine] = [l[i].ordine, l[i + 1].ordine]; })
            }, icona('arrow_downward'))),
          h('label', { class: 'campo campo--riga cresci' },
            h('span', { class: 'campo__etichetta' }, `Categoria · ${nPiatti} piatti`),
            h('input', {
              class: 'campo__input', value: c.nome, maxlength: 30, 'data-k': `cnome-${c.id}`,
              onchange: (e) => {
                const nome = e.target.value.trim();
                if (!nome) { e.target.value = c.nome; return; }
                store.aggiorna((st) => { st.categorie.find((x) => x.id === c.id).nome = nome; });
              }
            })),
          h('label', { class: 'campo campo--riga' },
            h('span', { class: 'campo__etichetta' }, 'Uscita predefinita'),
            selectUscita(c.uscitaDefault, (u) => store.aggiorna((st) => { st.categorie.find((x) => x.id === c.id).uscitaDefault = u; }), `cusc-${c.id}`)),
          h('button', {
            type: 'button', class: 'btn btn--icona btn--pericolo-testo', 'aria-label': `Elimina categoria ${c.nome}`,
            onclick: async () => {
              if (nPiatti) {
                await dialogo({ titolo: 'Categoria non vuota', corpo: h('p', {}, `“${c.nome}” contiene ${nPiatti} piatti. Spostali in un’altra categoria o eliminali prima.`), azioni: [{ testo: 'Ho capito', valore: '' }] });
                return;
              }
              if (await conferma({ titolo: `Eliminare “${c.nome}”?`, ok: 'Elimina', pericolo: true, icona: 'delete' })) {
                store.aggiorna((st) => { st.categorie = st.categorie.filter((x) => x.id !== c.id); rinumera(st); });
              }
            }
          }, icona('delete')));
      }))
    : vuoto({ icona: 'category', titolo: 'Nessuna categoria', testo: 'Le categorie raggruppano i piatti e propongono l’uscita (1ª, 2ª…).' });

  return [
    h('div', { class: 'barra-azioni' }, h('button', { type: 'button', class: 'btn btn--primario', onclick: nuovaCategoria }, icona('add'), 'Nuova categoria')),
    lista
  ];
}

function vistaPiatti(s) {
  const cats = catOrdinate(s);
  const esauriti = s.piatti.filter((p) => !p.attivo).length;
  const barra = h('div', { class: 'barra-azioni' },
    h('button', { type: 'button', class: 'btn btn--primario', onclick: () => formPiatto(null, cats[0]?.id) }, icona('add'), 'Nuovo piatto'),
    esauriti ? h('span', { class: 'etichetta-info' }, icona('block'), `${esauriti} esauriti`) : null);

  if (!cats.length) {
    return [vuoto({
      icona: 'menu_book', titolo: 'Menu vuoto', testo: 'Aggiungi la prima categoria.',
      azione: h('button', { type: 'button', class: 'btn btn--primario', onclick: () => { scheda = 'categorie'; nuovaCategoria(); } }, icona('add'), 'Nuova categoria')
    })];
  }

  return [barra, ...cats.map((c) => {
    const piatti = s.piatti.filter((p) => p.categoriaId === c.id).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
    return h('section', { class: 'gruppo' },
      h('header', { class: 'gruppo__testa' },
        h('h3', { class: 'gruppo__titolo' }, c.nome),
        h('span', { class: 'testo-muted' }, s.impostazioni.uscite[c.uscitaDefault] ?? ''),
        h('button', { type: 'button', class: 'btn btn--piatto', onclick: () => formPiatto(null, c.id) }, icona('add'), 'Piatto')),
      piatti.length
        ? h('ul', { class: 'lista' }, piatti.map((p) => h('li', { class: `lista__riga${p.attivo ? '' : ' lista__riga--spenta'}` },
            h('button', { type: 'button', class: 'lista__principale', onclick: () => formPiatto(p), 'aria-label': `Modifica ${p.nome}` },
              h('span', { class: 'lista__nome' }, p.nome),
              h('span', { class: 'lista__prezzo' }, `€ ${formatCent(p.prezzoCent)}`)),
            h('span', { class: 'campo-switch' },
              h('span', { class: 'campo-switch__testo' }, p.attivo ? 'Disponibile' : 'Esaurito'),
              interruttore({
                acceso: p.attivo, etichetta: `${p.nome} disponibile`, k: `att-${p.id}`,
                onChange: (v) => store.aggiorna((st) => { st.piatti.find((x) => x.id === p.id).attivo = v; })
              })),
            h('button', {
              type: 'button', class: 'btn btn--icona btn--pericolo-testo', 'aria-label': `Elimina ${p.nome}`,
              onclick: async () => {
                if (await conferma({ titolo: `Eliminare “${p.nome}”?`, testo: 'Le righe già ordinate restano nei conti.', ok: 'Elimina', pericolo: true, icona: 'delete' })) {
                  store.aggiorna((st) => { st.piatti = st.piatti.filter((x) => x.id !== p.id); });
                }
              }
            }, icona('delete')))))
        : h('p', { class: 'testo-muted gruppo__vuoto' }, 'Nessun piatto in questa categoria.'));
  })];
}

export function renderMenuAdmin(el) {
  function costruisci() {
    const s = store.get();
    return [
      segmentato({
        etichetta: 'Sezione menu', valore: scheda, classe: 'segmentato--largo',
        opzioni: [{ valore: 'piatti', testo: 'Piatti', icona: 'restaurant_menu' }, { valore: 'categorie', testo: 'Categorie', icona: 'category' }],
        onChange: (v) => { scheda = v; disegna(); }
      }),
      ...(scheda === 'piatti' ? vistaPiatti(s) : vistaCategorie(s))
    ];
  }
  const disegna = () => ridisegna(el, costruisci);
  disegna();
  return store.ascolta(disegna);
}
