// Vista Conto: Totale tavolo / Per coperto / Alla romana, pagamenti e chiusura.

import * as store from '../store.js';
import { vai } from '../router.js';
import { h, icona, appbar, ridisegna, conferma, toast, stepper, segmentato, tempoTrascorso, badgeStato } from '../lib/ui.js';
import {
  totaleServizio, contoPerCoperto, contoAllaRomana, personeRomana, puoChiudere, importoRiga, statoTavolo
} from '../lib/conto.js';
import { testoDestinazione, voceStorico } from '../lib/ordini.js';
import { formatEuro, formatCent } from '../lib/money.js';

const trovaServizio = (tavoloId) => store.get().servizi.find((s) => s.tavoloId === tavoloId);

function modifica(tavoloId, fn) {
  store.aggiorna((s) => {
    const serv = s.servizi.find((x) => x.tavoloId === tavoloId);
    if (serv) fn(serv);
  });
}

function vistaTotale(serv, s) {
  const prezzoCoperto = s.impostazioni.prezzoCopertoCent;
  const uscite = s.impostazioni.uscite;
  const righe = [...serv.righe].sort((a, b) => a.uscita - b.uscita);
  return h('section', { class: 'scheda conto-totale' },
    righe.length
      ? h('ul', { class: 'lista-conto' }, righe.map((r) => h('li', {},
          h('span', { class: 'lista-conto__qta' }, `${r.qta}×`),
          h('span', { class: 'lista-conto__nome' }, r.nome,
            h('small', {}, `${testoDestinazione(r.destinazione, serv.coperti)} · ${uscite[r.uscita] ?? ''}${r.nota ? ` · ${r.nota}` : ''}`)),
          h('span', { class: 'lista-conto__importo' }, formatCent(importoRiga(r))))))
      : h('p', { class: 'testo-muted' }, 'Nessun piatto ordinato.'),
    prezzoCoperto > 0 && h('div', { class: 'lista-conto__extra' },
      h('span', {}, `Coperto · ${serv.coperti.length} × ${formatCent(prezzoCoperto)}`),
      h('span', {}, formatCent(prezzoCoperto * serv.coperti.length))),
    h('div', { class: 'conto-totale__totale' },
      h('span', {}, 'Totale'),
      h('span', { class: 'importo-grande' }, formatEuro(totaleServizio(serv, prezzoCoperto)))));
}

function vistaPerCoperto(tavoloId, serv, s) {
  const persone = contoPerCoperto(serv, s.impostazioni.prezzoCopertoCent);
  return h('div', { class: 'griglia-coperti' }, persone.map((p) => {
    const proprie = p.voci.filter((v) => v.tipo === 'proprio');
    const quote = p.voci.filter((v) => v.tipo !== 'proprio');
    return h('article', { class: `card-coperto${p.pagato ? ' card-coperto--pagato' : ''}` },
      h('header', { class: 'card-coperto__testa' },
        h('span', { class: 'card-coperto__avatar', 'aria-hidden': 'true' }, icona('person')),
        h('h3', { class: 'card-coperto__nome' }, p.etichetta),
        h('span', { class: 'card-coperto__totale' }, formatEuro(p.totaleCent))),
      h('ul', { class: 'lista-conto lista-conto--compatta' },
        proprie.map((v) => h('li', {},
          h('span', { class: 'lista-conto__nome' }, `${v.qta}× ${v.nome}`),
          h('span', { class: 'lista-conto__importo' }, formatCent(v.importoCent)))),
        !proprie.length && h('li', { class: 'testo-muted' }, 'Nessun piatto personale')),
      h('dl', { class: 'card-coperto__parti' },
        h('div', {}, h('dt', {}, 'Propri'), h('dd', {}, formatCent(p.propriCent))),
        h('div', {},
          h('dt', {}, 'Quota condivisi',
            quote.length ? h('small', {}, quote.map((v) => (v.tipo === 'tavolo' ? `tavolo 1/${v.parti}` : `${v.nome} 1/${v.parti}`)).join(' · ')) : null),
          h('dd', {}, formatCent(p.quoteCent))),
        p.copertoCent > 0 && h('div', {}, h('dt', {}, 'Coperto'), h('dd', {}, formatCent(p.copertoCent)))),
      h('button', {
        type: 'button', class: `btn btn--pagato${p.pagato ? ' btn--pagato-si' : ''}`, 'aria-pressed': String(p.pagato), 'data-k': `pag-${p.copertoId}`,
        onclick: () => modifica(tavoloId, (x) => { const c = x.coperti.find((c2) => c2.id === p.copertoId); c.pagato = !c.pagato; })
      }, icona(p.pagato ? 'check_circle' : 'radio_button_unchecked'), p.pagato ? 'Pagato' : `Segna pagato · ${formatEuro(p.totaleCent)}`));
  }));
}

function vistaRomana(tavoloId, serv, s) {
  const totale = totaleServizio(serv, s.impostazioni.prezzoCopertoCent);
  const persone = personeRomana(serv);
  const quote = contoAllaRomana(totale, persone);
  const pagati = Math.min(serv.pagamentiRomana || 0, persone);
  const alta = quote[0];
  const bassa = quote[quote.length - 1];
  const nAlte = quote.filter((q) => q === alta).length;

  return h('section', { class: 'scheda romana pila' },
    h('div', { class: 'romana__riga' },
      h('span', { class: 'campo__etichetta' }, 'Persone'),
      stepper({
        valore: persone, min: 1, max: 60, etichetta: 'Persone alla romana', k: 'persone',
        onChange: (n) => modifica(tavoloId, (x) => { x.personeRomana = n; x.pagamentiRomana = Math.min(x.pagamentiRomana || 0, n); })
      })),
    h('div', { class: 'romana__quota' },
      h('span', { class: 'testo-muted' }, `Totale ${formatEuro(totale)} ÷ ${persone}`),
      h('span', { class: 'importo-grande' }, `${formatEuro(alta)} a testa`),
      alta !== bassa && h('span', { class: 'testo-muted' }, `${nAlte} persone pagano ${formatEuro(alta)}, ${persone - nAlte} pagano ${formatEuro(bassa)} (arrotondamento al centesimo)`)),
    h('div', { class: 'romana__pagamenti' },
      h('p', { class: 'romana__contatore' }, h('b', {}, `${pagati} di ${persone}`), ' hanno pagato'),
      h('div', { class: 'barra-azioni' },
        h('button', {
          type: 'button', class: 'btn', disabled: pagati <= 0, 'data-k': 'rom-meno',
          onclick: () => modifica(tavoloId, (x) => { x.pagamentiRomana = Math.max(0, (x.pagamentiRomana || 0) - 1); })
        }, icona('undo'), 'Annulla un pagamento'),
        h('button', {
          type: 'button', class: 'btn btn--primario', disabled: pagati >= persone, 'data-k': 'rom-piu',
          onclick: () => modifica(tavoloId, (x) => { x.pagamentiRomana = Math.min(personeRomana(x), (x.pagamentiRomana || 0) + 1); })
        }, icona('payments'), pagati < persone ? `Registra pagamento · ${formatEuro(quote[pagati])}` : 'Tutti hanno pagato'))));
}

/** Importi pagati e residui secondo la modalità. */
function riepilogoPagamenti(serv, s) {
  const prezzoCoperto = s.impostazioni.prezzoCopertoCent;
  const totale = totaleServizio(serv, prezzoCoperto);
  let pagato = 0;
  if (serv.modalitaConto === 'coperto') {
    pagato = contoPerCoperto(serv, prezzoCoperto).filter((p) => p.pagato).reduce((t, p) => t + p.totaleCent, 0);
  } else if (serv.modalitaConto === 'romana') {
    const quote = contoAllaRomana(totale, personeRomana(serv));
    pagato = quote.slice(0, Math.min(serv.pagamentiRomana || 0, quote.length)).reduce((t, q) => t + q, 0);
  }
  return { totale, pagato, residuo: totale - pagato };
}

async function chiudiTavolo(tavoloId) {
  const s = store.get();
  const serv = trovaServizio(tavoloId);
  const tavolo = s.tavoli.find((t) => t.id === tavoloId);
  const verifica = puoChiudere(serv);
  if (!verifica.ok) return;
  const totale = totaleServizio(serv, s.impostazioni.prezzoCopertoCent);
  const ok = await conferma({
    titolo: `Chiudere il tavolo ${tavolo?.nome ?? ''}?`,
    testo: verifica.richiedeConferma
      ? `Confermi che il conto di ${formatEuro(totale)} è stato pagato? Il tavolo tornerà libero e il conto finirà nello storico.`
      : `Conto di ${formatEuro(totale)} saldato. Il tavolo tornerà libero e il conto finirà nello storico.`,
    ok: 'Chiudi tavolo', pericolo: true, icona: 'task_alt'
  });
  if (!ok) return;
  store.aggiorna((st) => {
    const x = st.servizi.find((y) => y.tavoloId === tavoloId);
    if (!x) return;
    st.storico.push(voceStorico(x, { tavoloNome: tavolo?.nome ?? '?', totaleCent: totaleServizio(x, st.impostazioni.prezzoCopertoCent) }));
    st.servizi = st.servizi.filter((y) => y.id !== x.id);
  });
  toast(`Tavolo ${tavolo?.nome ?? ''} chiuso · ${formatEuro(totale)}`, { icona: 'task_alt' });
  vai('#/sala');
}

export function renderConto(el, { id: tavoloId }) {
  const s0 = store.get();
  const tavolo = s0.tavoli.find((t) => t.id === tavoloId);
  if (!tavolo || !trovaServizio(tavoloId)) {
    toast('Nessun conto aperto per questo tavolo', { icona: 'info' });
    vai('#/sala');
    return;
  }

  function costruisci() {
    const s = store.get();
    const serv = trovaServizio(tavoloId);
    const t = s.tavoli.find((x) => x.id === tavoloId);
    if (!serv || !t) return null;
    const modalita = serv.modalitaConto || 'totale';
    const verifica = puoChiudere(serv);
    const { totale, pagato, residuo } = riepilogoPagamenti(serv, s);

    appbar({
      titolo: `Conto · Tavolo ${t.nome}`,
      locale: `${serv.coperti.length} coperti · ${serv.righe.length} righe`,
      indietro: `#/tavolo/${tavoloId}`,
      azioni: [
        !serv.contoRichiesto && h('button', {
          type: 'button', class: 'btn', 'aria-label': 'Segna conto richiesto', onclick: () => modifica(tavoloId, (x) => { x.contoRichiesto = true; })
        }, icona('receipt_long'), h('span', { class: 'solo-ampio' }, 'Segna conto richiesto'))
      ]
    });

    let corpo;
    if (modalita === 'coperto') corpo = vistaPerCoperto(tavoloId, serv, s);
    else if (modalita === 'romana') corpo = vistaRomana(tavoloId, serv, s);
    else corpo = vistaTotale(serv, s);

    let testoChiudi = 'Chiudi tavolo';
    if (!verifica.ok) testoChiudi = `Chiudi tavolo · ${verifica.totali - verifica.pagati} da pagare`;

    return h('div', { class: 'conto' },
      h('div', { class: 'conto__testa' },
        badgeStato(statoTavolo(serv)),
        h('span', { class: 'meta' }, icona('timer'), tempoTrascorso(serv.apertoAlle)),
        segmentato({
          etichetta: 'Modalità del conto', valore: modalita, classe: 'segmentato--largo conto__modalita',
          opzioni: [
            { valore: 'totale', testo: 'Totale tavolo', icona: 'receipt_long' },
            { valore: 'coperto', testo: 'Per coperto', icona: 'group' },
            { valore: 'romana', testo: 'Alla romana', icona: 'call_split' }
          ],
          onChange: (v) => modifica(tavoloId, (x) => { x.modalitaConto = v; })
        })),
      modalita === 'coperto' && h('div', { class: 'avanzamento' },
        h('p', {}, h('b', {}, `${verifica.pagati} di ${verifica.totali}`), ' pagati'),
        h('div', { class: 'avanzamento__barra', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(verifica.totali), 'aria-valuenow': String(verifica.pagati), 'aria-label': 'Coperti pagati' },
          h('span', { style: `width:${verifica.totali ? (verifica.pagati / verifica.totali) * 100 : 0}%` }))),
      h('div', { class: 'conto__corpo' }, corpo),
      h('footer', { class: 'conto__piede' },
        h('dl', { class: 'conto__cifre' },
          h('div', {}, h('dt', {}, 'Totale'), h('dd', {}, formatEuro(totale))),
          modalita !== 'totale' && h('div', {}, h('dt', {}, 'Pagato'), h('dd', { class: 'testo-successo' }, formatEuro(pagato))),
          modalita !== 'totale' && h('div', { class: 'conto__residuo' }, h('dt', {}, 'Residuo'), h('dd', {}, formatEuro(residuo)))),
        h('button', {
          type: 'button', class: 'btn btn--chiudi', disabled: !verifica.ok, 'data-k': 'chiudi',
          onclick: () => chiudiTavolo(tavoloId)
        }, icona(verifica.ok ? 'task_alt' : 'lock'), testoChiudi)));
  }

  const disegna = () => ridisegna(el, costruisci);
  disegna();
  const stop = store.ascolta(disegna);
  const timer = setInterval(disegna, 30000);
  return () => { stop(); clearInterval(timer); };
}
