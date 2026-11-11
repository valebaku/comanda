// Vista Sala: griglia dei tavoli con stato derivato, filtro per stato, apertura tavolo.

import * as store from '../store.js';
import { vai } from '../router.js';
import { h, icona, appbar, vuoto, ridisegna, dialogo, stepper, campo, tempoTrascorso, STATI_TAVOLO } from '../lib/ui.js';
import { statoTavolo, totaleServizio } from '../lib/conto.js';
import { creaServizio, MAX_ETICHETTA } from '../lib/ordini.js';
import { formatEuro } from '../lib/money.js';

let filtro = 'tutti';

const FILTRI = [
  { valore: 'tutti', testo: 'Tutti' },
  { valore: 'libero', testo: 'Liberi' },
  { valore: 'occupato', testo: 'Occupati' },
  { valore: 'attesa', testo: 'In attesa' },
  { valore: 'conto', testo: 'Conto' }
];

/** Dialogo di apertura: numero coperti + etichette facoltative. */
export async function apriTavolo(tavolo) {
  let n = tavolo.copertiDefault;
  const valori = [];
  const contenitore = h('div', { class: 'etichette-coperti' });
  const disegnaEtichette = () => {
    contenitore.replaceChildren(...Array.from({ length: n }, (_, i) => h('input', {
      class: 'campo__input', maxlength: MAX_ETICHETTA, placeholder: String(i + 1), value: valori[i] ?? '',
      'aria-label': `Etichetta coperto ${i + 1}`,
      oninput: (e) => { valori[i] = e.target.value; }
    })));
  };
  disegnaEtichette();
  const dettagli = h('details', { class: 'dettagli' },
    h('summary', {}, icona('edit'), 'Etichette dei coperti (facoltative)'),
    h('p', { class: 'testo-muted' }, 'Es. “Marco”, “Bimbo”. Puoi cambiarle anche dopo con un tocco lungo.'),
    contenitore);

  const v = await dialogo({
    titolo: `Apri tavolo ${tavolo.nome}`,
    classe: 'dialogo--apertura',
    corpo: h('div', { class: 'pila' },
      campo('Coperti', stepper({ valore: n, min: 1, max: 30, etichetta: 'Coperti', onChange: (x) => { n = x; disegnaEtichette(); } })),
      dettagli),
    azioni: [
      { testo: 'Annulla', valore: '' },
      { testo: 'Apri tavolo', valore: 'ok', classe: 'btn--primario btn--grande', icona: 'login', primaria: true }
    ],
    onApri: (d) => d.querySelector('.stepper__btn:last-of-type')?.focus()
  });
  if (v !== 'ok') return;
  const s = store.get();
  if (s.servizi.some((x) => x.tavoloId === tavolo.id)) { vai(`#/tavolo/${tavolo.id}`); return; }
  store.aggiorna((st) => { st.servizi.push(creaServizio(tavolo.id, n, valori.slice(0, n))); });
  vai(`#/tavolo/${tavolo.id}`);
}

function cardTavolo(t, servizio, prezzoCoperto) {
  const stato = statoTavolo(servizio);
  const info = STATI_TAVOLO[stato];
  const coperti = servizio ? servizio.coperti.length : t.copertiDefault;
  const etichetta = [
    `Tavolo ${t.nome}`, info.testo,
    servizio ? `${coperti} coperti, ${formatEuro(totaleServizio(servizio, prezzoCoperto))}, aperto da ${tempoTrascorso(servizio.apertoAlle)}` : `${coperti} posti`
  ].join(', ');
  return h('button', {
    type: 'button',
    class: `card-tavolo stato--${stato}`,
    'aria-label': etichetta,
    'data-k': `tav-${t.id}`,
    onclick: () => (servizio ? vai(`#/tavolo/${t.id}`) : apriTavolo(t))
  },
    h('span', { class: 'card-tavolo__riga' },
      h('span', { class: 'card-tavolo__nome' }, t.nome),
      h('span', { class: 'card-tavolo__coperti' }, icona('person'), String(coperti))),
    h('span', { class: 'card-tavolo__stato' }, icona(info.icona), info.testo),
    servizio
      ? h('span', { class: 'card-tavolo__riga card-tavolo__piede' },
          h('span', { class: 'card-tavolo__totale' }, formatEuro(totaleServizio(servizio, prezzoCoperto))),
          h('span', { class: 'card-tavolo__tempo' }, icona('timer'), tempoTrascorso(servizio.apertoAlle)))
      : h('span', { class: 'card-tavolo__riga card-tavolo__piede' }, h('span', { class: 'card-tavolo__azione' }, icona('add'), 'Apri')));
}

export function renderSala(el) {
  function costruisci() {
    const { impostazioni, tavoli, servizi } = store.get();
    appbar({
      titolo: 'Sala',
      locale: impostazioni.nomeLocale,
      azioni: [h('a', { class: 'btn btn--icona', href: '#/admin', 'aria-label': 'Area amministrazione (PIN)' }, icona('lock'))]
    });

    if (tavoli.length === 0) {
      return vuoto({
        icona: 'table_restaurant',
        titolo: 'Nessun tavolo',
        testo: 'Crea i tavoli (o carica i dati di esempio) dall’area amministrazione.',
        azione: h('a', { class: 'btn btn--primario', href: '#/admin/tavoli' }, icona('lock'), 'Vai all’Admin')
      });
    }

    const perTavolo = new Map(servizi.map((s) => [s.tavoloId, s]));
    const ordinati = [...tavoli].sort((a, b) => a.ordine - b.ordine);
    const conStato = ordinati.map((t) => ({ t, s: perTavolo.get(t.id), stato: statoTavolo(perTavolo.get(t.id)) }));
    const conta = (v) => (v === 'tutti' ? conStato.length : conStato.filter((x) => x.stato === v).length);
    const visibili = filtro === 'tutti' ? conStato : conStato.filter((x) => x.stato === filtro);
    const coperti = servizi.reduce((n, s) => n + s.coperti.length, 0);

    return [
      h('div', { class: 'sala__barra' },
        h('div', { class: 'filtri', role: 'toolbar', 'aria-label': 'Filtra per stato' },
          FILTRI.map((f) => h('button', {
            type: 'button',
            class: `chip${f.valore !== 'tutti' ? ` chip--stato chip--${f.valore}` : ''}`,
            'aria-pressed': String(filtro === f.valore),
            'data-k': `filtro-${f.valore}`,
            onclick: () => { filtro = filtro === f.valore ? 'tutti' : f.valore; disegna(); }
          }, f.valore !== 'tutti' && h('span', { class: 'chip__pallino', 'aria-hidden': 'true' }), f.testo, h('span', { class: 'chip__conta' }, String(conta(f.valore)))))),
        h('p', { class: 'sala__riepilogo' },
          h('span', {}, 'Aperti ', h('b', {}, `${servizi.length}/${tavoli.length}`)),
          h('span', {}, 'Coperti ', h('b', {}, String(coperti))))),
      visibili.length
        ? h('div', { class: 'griglia-tavoli' }, visibili.map((x) => cardTavolo(x.t, x.s, impostazioni.prezzoCopertoCent)))
        : vuoto({ icona: 'filter_alt_off', titolo: 'Nessun tavolo in questo stato', azione: h('button', { type: 'button', class: 'btn', onclick: () => { filtro = 'tutti'; disegna(); } }, 'Mostra tutti') })
    ];
  }

  const disegna = () => ridisegna(el, costruisci);
  disegna();
  const stop = store.ascolta(disegna);
  const timer = setInterval(disegna, 30000);
  return () => { stop(); clearInterval(timer); };
}
