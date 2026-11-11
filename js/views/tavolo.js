// Vista Dettaglio tavolo: destinatari, menu, riepilogo ordine per uscita o per coperto.

import * as store from '../store.js';
import { vai } from '../router.js';
import {
  h, icona, appbar, ridisegna, dialogo, conferma, chiediTesto, toast, stepper, segmentato,
  pressioneLunga, tempoTrascorso, badgeStato, vuoto, STATI_RIGA
} from '../lib/ui.js';
import { statoTavolo, totaleServizio, contoPerCoperto, importoRiga, destinazioneEffettiva } from '../lib/conto.js';
import * as ord from '../lib/ordini.js';
import { formatEuro, formatCent } from '../lib/money.js';

// Stato dell'interfaccia per servizio (sopravvive ai ridisegni e ai cambi di vista).
const statiUi = new Map();
function uiDi(servizioId) {
  if (!statiUi.has(servizioId)) {
    statiUi.set(servizioId, {
      dest: { tipo: 'tavolo' },  // destinatario attivo
      multi: false,              // modalità "dividi tra coperti"
      multiIds: [],
      categoriaId: null,
      uscita: null,
      vista: 'uscita',           // "uscita" | "coperto"
      pannello: 'menu',          // smartphone: "menu" | "ordine"
      ultimoPiatto: null
    });
  }
  return statiUi.get(servizioId);
}

const trovaServizio = (tavoloId) => store.get().servizi.find((s) => s.tavoloId === tavoloId);

/** Applica una modifica al servizio del tavolo e salva. */
function modifica(tavoloId, fn) {
  return store.aggiorna((s) => {
    const serv = s.servizi.find((x) => x.tavoloId === tavoloId);
    return serv ? fn(serv, s) : undefined;
  });
}

function iconaDest(dest) {
  return dest.tipo === 'coperto' ? 'person' : dest.tipo === 'diviso' ? 'group' : 'table_restaurant';
}

function badgeDest(dest, coperti) {
  const d = destinazioneEffettiva(dest, coperti);
  return h('span', { class: `badge-dest badge-dest--${d.tipo}` }, icona(iconaDest(d)), ord.testoDestinazione(d, coperti));
}

// ---------------------------------------------------------------------------
// Dialoghi

/** Scelta multipla dei coperti per dividere una riga. Ritorna gli id o null. */
async function scegliCoperti(servizio, selezionati = [], titolo = 'Dividi tra coperti') {
  const scelti = new Set(selezionati);
  const avviso = h('p', { class: 'testo-muted' });
  const griglia = h('div', { class: 'scelta-coperti' });
  const disegna = () => {
    griglia.replaceChildren(...servizio.coperti.map((c) => h('button', {
      type: 'button', class: 'chip chip--grande', 'aria-pressed': String(scelti.has(c.id)),
      onclick: () => { scelti.has(c.id) ? scelti.delete(c.id) : scelti.add(c.id); disegna(); }
    }, icona(scelti.has(c.id) ? 'check_box' : 'check_box_outline_blank'), c.etichetta)));
    avviso.textContent = scelti.size < 2 ? 'Seleziona almeno 2 coperti.' : `Diviso in ${scelti.size} parti uguali.`;
  };
  disegna();
  const v = await dialogo({
    titolo,
    corpo: h('div', { class: 'pila' }, griglia, avviso),
    azioni: [
      { testo: 'Annulla', valore: '' },
      { testo: 'Dividi', valore: 'ok', classe: 'btn--primario', icona: 'call_split', prima: () => scelti.size >= 2 }
    ]
  });
  return v === 'ok' ? servizio.coperti.filter((c) => scelti.has(c.id)).map((c) => c.id) : null;
}

async function rinominaCoperto(tavoloId, coperto) {
  const nome = await chiediTesto({ titolo: 'Rinomina coperto', etichetta: 'Etichetta (max 20 caratteri)', valore: coperto.etichetta, maxlength: ord.MAX_ETICHETTA });
  if (nome) modifica(tavoloId, (s) => ord.rinominaCoperto(s, coperto.id, nome));
}

/** Foglio azioni di una riga: quantità, nota, destinatario, divisione, uscita, stato, elimina. */
function foglioRiga(tavoloId, rigaId) {
  const corpo = h('div', { class: 'pila foglio-riga' });
  let dlg = null;

  function disegna() {
    const s = store.get();
    const serv = trovaServizio(tavoloId);
    const r = serv && ord.trovaRiga(serv, rigaId);
    if (!r) { dlg?.close(''); return; }
    const dest = destinazioneEffettiva(r.destinazione, serv.coperti);
    dlg?.querySelector('.dialogo__titolo')?.replaceChildren(`${r.qta}× ${r.nome}`);
    const attivo = document.activeElement;
    const kFocus = corpo.contains(attivo) ? attivo.dataset.k : null;

    corpo.replaceChildren(
      h('div', { class: 'foglio-riga__riga' },
        h('span', { class: 'campo__etichetta' }, 'Quantità'),
        stepper({ valore: r.qta, min: 1, max: 99, k: 'qta', onChange: (q) => modifica(tavoloId, (x) => ord.impostaQta(x, rigaId, q)) }),
        h('span', { class: 'foglio-riga__importo' }, formatEuro(importoRiga(r)))),
      h('label', { class: 'campo' },
        h('span', { class: 'campo__etichetta' }, 'Nota'),
        h('input', {
          class: 'campo__input', value: r.nota, maxlength: 80, 'data-k': 'nota', placeholder: 'Es. senza cipolla, ben cotta',
          onchange: (e) => modifica(tavoloId, (x) => { ord.trovaRiga(x, rigaId).nota = e.target.value.trim(); })
        })),
      h('div', { class: 'campo' },
        h('span', { class: 'campo__etichetta' }, 'Destinatario'),
        h('div', { class: 'scelta-coperti' },
          h('button', {
            type: 'button', class: 'chip', 'aria-pressed': String(dest.tipo === 'tavolo'), 'data-k': 'fd-tavolo',
            onclick: () => modifica(tavoloId, (x) => ord.impostaDestinazione(x, rigaId, { tipo: 'tavolo' }))
          }, icona('table_restaurant'), 'Tavolo'),
          serv.coperti.map((c) => h('button', {
            type: 'button', class: 'chip', 'aria-pressed': String(dest.tipo === 'coperto' && dest.copertoId === c.id), 'data-k': `fd-${c.id}`,
            onclick: () => modifica(tavoloId, (x) => ord.impostaDestinazione(x, rigaId, { tipo: 'coperto', copertoId: c.id }))
          }, icona('person'), c.etichetta)),
          serv.coperti.length >= 2 && h('button', {
            type: 'button', class: 'chip', 'aria-pressed': String(dest.tipo === 'diviso'),
            onclick: async () => {
              const ids = await scegliCoperti(serv, dest.tipo === 'diviso' ? dest.copertoIds : []);
              if (ids) modifica(tavoloId, (x) => ord.impostaDestinazione(x, rigaId, { tipo: 'diviso', copertoIds: ids }));
            }
          }, icona('call_split'), dest.tipo === 'diviso' ? ord.testoDestinazione(dest, serv.coperti) : 'Dividi tra coperti…'))),
      h('div', { class: 'campo' },
        h('span', { class: 'campo__etichetta' }, 'Uscita'),
        segmentato({
          etichetta: 'Uscita della riga', valore: r.uscita, classe: 'segmentato--avvolgi',
          opzioni: s.impostazioni.uscite.map((u, i) => ({ valore: i, testo: u })),
          onChange: (u) => modifica(tavoloId, (x) => { ord.trovaRiga(x, rigaId).uscita = u; })
        })),
      h('div', { class: 'campo' },
        h('span', { class: 'campo__etichetta' }, 'Stato'),
        segmentato({
          etichetta: 'Stato della riga', valore: r.stato, classe: 'segmentato--largo',
          opzioni: ord.STATI_RIGA.map((st) => ({ valore: st, testo: STATI_RIGA[st].testo, icona: STATI_RIGA[st].icona })),
          onChange: (st) => modifica(tavoloId, (x) => { ord.trovaRiga(x, rigaId).stato = st; })
        })));
    if (kFocus) corpo.querySelector(`[data-k="${CSS.escape(kFocus)}"]`)?.focus();
  }

  disegna();
  const stop = store.ascolta(disegna);
  dialogo({
    titolo: '',
    classe: 'dialogo--foglio',
    corpo,
    azioni: [
      {
        testo: 'Elimina', valore: 'elimina', classe: 'btn--pericolo-outline', icona: 'delete',
        prima: async () => {
          const r = ord.trovaRiga(trovaServizio(tavoloId), rigaId);
          return conferma({ titolo: `Eliminare ${r.qta}× ${r.nome}?`, ok: 'Elimina', pericolo: true, icona: 'delete' });
        }
      },
      { testo: 'Fatto', valore: 'ok', classe: 'btn--primario', primaria: true }
    ],
    onApri: (d) => { dlg = d; disegna(); d.querySelector('.dialogo__azioni .btn--primario')?.focus(); }
  }).then((v) => {
    stop();
    if (v === 'elimina') {
      modifica(tavoloId, (x) => ord.eliminaRiga(x, rigaId));
      toast('Riga eliminata', { icona: 'delete' });
    }
  });
}

/** Modifica coperti: rinomina, aggiungi, rimuovi (con spostamento delle righe). */
function modificaCoperti(tavoloId) {
  const corpo = h('div', { class: 'pila' });
  function disegna() {
    const serv = trovaServizio(tavoloId);
    if (!serv) return;
    corpo.replaceChildren(
      h('ol', { class: 'lista lista--compatta' }, serv.coperti.map((c, i) => {
        const uso = ord.righeDelCoperto(serv, c.id);
        return h('li', { class: 'lista__riga' },
          h('span', { class: 'numero-uscita' }, String(i + 1)),
          h('input', {
            class: 'campo__input cresci', value: c.etichetta, maxlength: ord.MAX_ETICHETTA, 'aria-label': `Etichetta coperto ${i + 1}`,
            onchange: (e) => modifica(tavoloId, (x) => ord.rinominaCoperto(x, c.id, e.target.value))
          }),
          h('span', { class: 'testo-muted testo-piccolo' }, uso.proprie + uso.divise ? `${uso.proprie + uso.divise} righe` : ''),
          h('button', {
            type: 'button', class: 'btn btn--icona btn--pericolo-testo', 'aria-label': `Rimuovi coperto ${c.etichetta}`,
            disabled: serv.coperti.length <= 1,
            onclick: async () => {
              const u = ord.righeDelCoperto(trovaServizio(tavoloId), c.id);
              if (u.proprie || u.divise) {
                const parti = [];
                if (u.proprie) parti.push(`${u.proprie} righe sue passeranno al Tavolo`);
                if (u.divise) parti.push(`verrà tolto da ${u.divise} righe divise`);
                const ok = await conferma({ titolo: `Rimuovere “${c.etichetta}”?`, testo: `Ha righe assegnate: ${parti.join(' e ')}.`, ok: 'Rimuovi e sposta al Tavolo', pericolo: true });
                if (!ok) return;
              }
              modifica(tavoloId, (x) => ord.rimuoviCoperto(x, c.id));
              const ui = uiDi(serv.id);
              if (ui.dest.copertoId === c.id) ui.dest = { tipo: 'tavolo' };
              ui.multiIds = ui.multiIds.filter((x) => x !== c.id);
            }
          }, icona('person_remove')));
      })),
      h('button', { type: 'button', class: 'btn', onclick: () => modifica(tavoloId, (x) => ord.aggiungiCoperto(x)) }, icona('person_add'), 'Aggiungi coperto'));
  }
  disegna();
  const stop = store.ascolta(disegna);
  dialogo({ titolo: 'Modifica coperti', corpo, azioni: [{ testo: 'Fatto', valore: 'ok', classe: 'btn--primario' }] }).then(stop);
}

async function menuAltro(tavoloId) {
  const serv = trovaServizio(tavoloId);
  const vuoto = serv.righe.length === 0;
  const v = await dialogo({
    titolo: 'Altre azioni',
    classe: 'dialogo--menu',
    azioni: [
      { testo: 'Modifica coperti', valore: 'coperti', icona: 'group' },
      vuoto && { testo: 'Annulla apertura del tavolo', valore: 'annulla', icona: 'close', classe: 'btn--pericolo-outline' },
      { testo: 'Chiudi', valore: '' }
    ].filter(Boolean)
  });
  if (v === 'coperti') modificaCoperti(tavoloId);
  if (v === 'annulla' && await conferma({ titolo: 'Annullare l’apertura?', testo: 'Il tavolo torna libero. Nessun conto viene salvato.', ok: 'Annulla apertura', annulla: 'Indietro', pericolo: true })) {
    store.aggiorna((s) => { s.servizi = s.servizi.filter((x) => x.tavoloId !== tavoloId); });
    vai('#/sala');
  }
}

// ---------------------------------------------------------------------------
// Parti della vista

function barraDestinatari(tavoloId, serv, ui) {
  const conta = (cid) => {
    const u = ord.righeDelCoperto(serv, cid);
    return u.proprie + u.divise;
  };
  const chipTavolo = h('button', {
    type: 'button', class: 'chip chip--dest', 'aria-pressed': String(!ui.multi && ui.dest.tipo === 'tavolo'), 'data-k': 'dest-tavolo',
    onclick: () => { ui.multi = false; ui.dest = { tipo: 'tavolo' }; disegnaCorrente(); }
  }, icona('table_restaurant'), 'Tavolo');

  const chipCoperti = serv.coperti.map((c) => {
    const attivo = ui.multi ? ui.multiIds.includes(c.id) : ui.dest.tipo === 'coperto' && ui.dest.copertoId === c.id;
    const n = conta(c.id);
    const b = h('button', {
      type: 'button', class: `chip chip--dest${ui.multi ? ' chip--multi' : ''}`, 'aria-pressed': String(attivo), 'data-k': `dest-${c.id}`,
      'aria-label': `${c.etichetta}${n ? `, ${n} righe` : ''}. Tocco lungo per rinominare`,
      onclick: () => {
        if (ui.multi) ui.multiIds = attivo ? ui.multiIds.filter((x) => x !== c.id) : [...ui.multiIds, c.id];
        else ui.dest = { tipo: 'coperto', copertoId: c.id };
        disegnaCorrente();
      }
    },
      icona(ui.multi ? (attivo ? 'check_box' : 'check_box_outline_blank') : 'person'),
      h('span', { class: 'chip__testo' }, c.etichetta),
      n ? h('span', { class: 'chip__conta', 'aria-hidden': 'true' }, String(n)) : null);
    pressioneLunga(b, () => rinominaCoperto(tavoloId, c));
    return b;
  });

  const chipDividi = serv.coperti.length >= 2 && h('button', {
    type: 'button', class: 'chip chip--dividi', 'aria-pressed': String(ui.multi), 'data-k': 'dest-multi',
    onclick: () => {
      ui.multi = !ui.multi;
      if (ui.multi && ui.dest.tipo === 'coperto') ui.multiIds = [ui.dest.copertoId];
      disegnaCorrente();
    }
  }, icona('call_split'), ui.multi ? 'Dividi: attivo' : 'Dividi tra coperti');

  let suggerimento;
  if (ui.multi) {
    const nomi = serv.coperti.filter((c) => ui.multiIds.includes(c.id)).map((c) => c.etichetta);
    suggerimento = nomi.length >= 2
      ? h('p', { class: 'destinatari__info destinatari__info--attivo' }, icona('call_split'), `I piatti verranno divisi tra: ${nomi.join(', ')}`)
      : h('p', { class: 'destinatari__info destinatari__info--avviso' }, icona('info'), 'Seleziona almeno 2 coperti per dividere i piatti');
  } else {
    const nome = ui.dest.tipo === 'coperto' ? serv.coperti.find((c) => c.id === ui.dest.copertoId)?.etichetta : null;
    suggerimento = h('p', { class: 'destinatari__info' }, icona('arrow_downward'), nome ? `I piatti vanno a: ${nome}` : 'I piatti vanno al Tavolo (condivisi tra tutti)');
  }

  return h('div', { class: 'destinatari' },
    h('div', { class: 'destinatari__chip', role: 'toolbar', 'aria-label': 'Destinatario dei piatti', 'data-scroll': 'dest' }, chipTavolo, chipCoperti),
    h('div', { class: 'destinatari__riga' }, suggerimento, chipDividi));
}

function pannelloMenu(tavoloId, serv, ui, s) {
  const categorie = [...s.categorie].sort((a, b) => a.ordine - b.ordine)
    .filter((c) => s.piatti.some((p) => p.categoriaId === c.id && p.attivo));
  if (!categorie.length) {
    return h('section', { class: 'pannello pannello-menu' }, vuoto({ icona: 'menu_book', titolo: 'Menu vuoto', testo: 'Aggiungi categorie e piatti dall’area Admin.' }));
  }
  if (!categorie.some((c) => c.id === ui.categoriaId)) {
    ui.categoriaId = categorie[0].id;
    ui.uscita = null;
  }
  const cat = categorie.find((c) => c.id === ui.categoriaId);
  if (ui.uscita == null || ui.uscita >= s.impostazioni.uscite.length) ui.uscita = Math.min(cat.uscitaDefault, s.impostazioni.uscite.length - 1);

  const piatti = s.piatti.filter((p) => p.categoriaId === cat.id && p.attivo).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));

  function aggiungi(p) {
    let dest = ui.dest;
    if (ui.multi) {
      if (ui.multiIds.length < 2) { toast('Seleziona almeno 2 coperti per dividere', { icona: 'info' }); return; }
      dest = { tipo: 'diviso', copertoIds: ui.multiIds };
    }
    const uscita = ui.uscita;
    const res = modifica(tavoloId, (x) => ord.aggiungiPiatto(x, p, dest, uscita));
    if (!res) return;
    ui.ultimoPiatto = { id: p.id, t: Date.now() };
    navigator.vibrate?.(10);
    const serv2 = trovaServizio(tavoloId);
    toast(`${p.nome} → ${ord.testoDestinazione(res.riga.destinazione, serv2.coperti)} · ${s.impostazioni.uscite[uscita]}`, {
      icona: 'add_circle',
      azione: { testo: 'Annulla', fn: () => modifica(tavoloId, (x) => ord.annullaAggiunta(x, res.riga.id, res.nuova)) }
    });
  }

  const recente = ui.ultimoPiatto && Date.now() - ui.ultimoPiatto.t < 600 ? ui.ultimoPiatto.id : null;

  return h('section', { class: 'pannello pannello-menu', 'aria-label': 'Menu' },
    h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Categorie', 'data-scroll': 'tabs' },
      categorie.map((c) => h('button', {
        type: 'button', role: 'tab', class: 'tab', 'aria-selected': String(c.id === cat.id), 'data-k': `cat-${c.id}`,
        onclick: () => { ui.categoriaId = c.id; ui.uscita = Math.min(c.uscitaDefault, s.impostazioni.uscite.length - 1); disegnaCorrente(); }
      }, c.nome))),
    h('div', { class: 'selettore-uscita' },
      h('span', { class: 'selettore-uscita__etichetta' }, 'Uscita'),
      segmentato({
        etichetta: 'Uscita dei piatti da aggiungere', valore: ui.uscita, classe: 'segmentato--avvolgi',
        opzioni: s.impostazioni.uscite.map((u, i) => ({ valore: i, testo: u })),
        onChange: (u) => { ui.uscita = u; disegnaCorrente(); }
      })),
    h('div', { class: 'griglia-piatti', 'data-scroll': 'piatti' },
      piatti.map((p) => h('button', {
        type: 'button', class: `piatto${recente === p.id ? ' piatto--aggiunto' : ''}`, 'data-k': `piatto-${p.id}`,
        'aria-label': `Aggiungi ${p.nome}, ${formatCent(p.prezzoCent)} euro`,
        onclick: () => aggiungi(p)
      },
        h('span', { class: 'piatto__nome' }, p.nome),
        h('span', { class: 'piatto__prezzo' }, formatCent(p.prezzoCent))))));
}

function rigaOrdine(tavoloId, r, serv, { mostraUscita = false, uscite } = {}) {
  const st = STATI_RIGA[r.stato];
  return h('li', {},
    h('button', {
      type: 'button', class: `riga riga--${r.stato}`, 'data-k': `riga-${r.id}`,
      'aria-label': `${r.qta} ${r.nome}, ${ord.testoDestinazione(r.destinazione, serv.coperti)}, ${st.testo}. Apri azioni`,
      onclick: () => foglioRiga(tavoloId, r.id)
    },
      h('span', { class: 'riga__qta' }, `${r.qta}×`),
      h('span', { class: 'riga__corpo' },
        h('span', { class: 'riga__nome' }, r.nome),
        r.nota && h('span', { class: 'riga__nota' }, icona('sticky_note_2'), r.nota),
        h('span', { class: 'riga__meta' },
          badgeDest(r.destinazione, serv.coperti),
          mostraUscita && h('span', { class: 'testo-muted' }, uscite[r.uscita] ?? ''))),
      h('span', { class: 'riga__destra' },
        h('span', { class: 'riga__prezzo' }, formatCent(importoRiga(r))),
        h('span', { class: `riga__stato riga__stato--${r.stato}` }, icona(st.icona), st.testo))));
}

function pannelloOrdine(tavoloId, serv, ui, s) {
  const uscite = s.impostazioni.uscite;
  const prezzoCoperto = s.impostazioni.prezzoCopertoCent;
  const totale = totaleServizio(serv, prezzoCoperto);

  let contenuto;
  if (!serv.righe.length) {
    contenuto = vuoto({ icona: 'receipt', titolo: 'Nessun ordine', testo: 'Scegli il destinatario e tocca un piatto per aggiungerlo.' });
  } else if (ui.vista === 'uscita') {
    const indici = [...new Set(serv.righe.map((r) => r.uscita))].sort((a, b) => a - b);
    contenuto = indici.map((u) => {
      const righe = serv.righe.filter((r) => r.uscita === u);
      const n = (st) => righe.filter((r) => r.stato === st).reduce((q, r) => q + r.qta, 0);
      const [attesa, chiamata, servita] = ['attesa', 'chiamata', 'servita'].map(n);
      let statoGruppo = 'attesa';
      if (chiamata) statoGruppo = 'chiamata';
      else if (!attesa && servita) statoGruppo = 'servita';
      return h('section', { class: `gruppo-uscita gruppo-uscita--${statoGruppo}` },
        h('header', { class: 'gruppo-uscita__testa' },
          h('div', { class: 'gruppo-uscita__titoli' },
            h('h3', { class: 'gruppo-uscita__titolo' }, uscite[u] ?? `Uscita ${u + 1}`),
            h('p', { class: 'gruppo-uscita__conteggi' },
              [attesa && `${attesa} in attesa`, chiamata && `${chiamata} chiamate`, servita && `${servita} servite`].filter(Boolean).join(' · '))),
          h('div', { class: 'gruppo-uscita__azioni' },
            h('button', {
              type: 'button', class: 'btn btn--chiama', disabled: !attesa, 'data-k': `chiama-${u}`,
              onclick: () => { modifica(tavoloId, (x) => ord.chiamaUscita(x, u)); toast(`${uscite[u]} chiamata`, { icona: 'campaign' }); }
            }, icona('campaign'), 'Chiama uscita'),
            h('button', {
              type: 'button', class: 'btn btn--servita', disabled: !chiamata, 'data-k': `servita-${u}`,
              onclick: () => { modifica(tavoloId, (x) => ord.servitaUscita(x, u)); toast(`${uscite[u]} servita`, { icona: 'check_circle' }); }
            }, icona('check_circle'), 'Segna servita'))),
        h('ul', { class: 'righe' }, righe.map((r) => rigaOrdine(tavoloId, r, serv))));
    });
  } else {
    const persone = contoPerCoperto(serv, 0);
    const delTavolo = serv.righe.filter((r) => destinazioneEffettiva(r.destinazione, serv.coperti).tipo === 'tavolo');
    const gruppi = [
      { titolo: 'Tavolo', icona: 'table_restaurant', righe: delTavolo, parziale: delTavolo.reduce((t, r) => t + importoRiga(r), 0), nota: 'condivisi tra tutti' },
      ...serv.coperti.map((c, i) => {
        const righe = serv.righe.filter((r) => {
          const d = destinazioneEffettiva(r.destinazione, serv.coperti);
          return (d.tipo === 'coperto' && d.copertoId === c.id) || (d.tipo === 'diviso' && d.copertoIds.includes(c.id));
        });
        return { titolo: c.etichetta, icona: 'person', righe, parziale: persone[i].propriCent, nota: 'propri' };
      })
    ];
    contenuto = gruppi.map((g) => h('section', { class: 'gruppo-uscita' },
      h('header', { class: 'gruppo-uscita__testa' },
        h('div', { class: 'gruppo-uscita__titoli' },
          h('h3', { class: 'gruppo-uscita__titolo' }, icona(g.icona), g.titolo),
          h('p', { class: 'gruppo-uscita__conteggi' }, `${formatEuro(g.parziale)} ${g.nota}`))),
      g.righe.length
        ? h('ul', { class: 'righe' }, g.righe.map((r) => rigaOrdine(tavoloId, r, serv, { mostraUscita: true, uscite })))
        : h('p', { class: 'testo-muted gruppo__vuoto' }, 'Nessuna riga.')));
  }

  return h('section', { class: 'pannello pannello-ordine', 'aria-label': 'Ordine' },
    h('div', { class: 'pannello-ordine__testa' },
      h('h2', { class: 'pannello__titolo' }, 'Ordine'),
      segmentato({
        etichetta: 'Raggruppa ordine', valore: ui.vista,
        opzioni: [{ valore: 'uscita', testo: 'Per uscita', icona: 'format_list_numbered' }, { valore: 'coperto', testo: 'Per coperto', icona: 'group' }],
        onChange: (v) => { ui.vista = v; disegnaCorrente(); }
      })),
    h('div', { class: 'pannello-ordine__lista', 'data-scroll': 'ordine' }, contenuto),
    h('footer', { class: 'pannello-ordine__piede' },
      h('div', { class: 'totale' },
        h('span', { class: 'totale__etichetta' }, 'Totale',
          prezzoCoperto > 0 && h('small', {}, ` · coperto ${serv.coperti.length} × ${formatCent(prezzoCoperto)}`)),
        h('span', { class: 'totale__valore' }, formatEuro(totale))),
      h('a', { class: 'btn btn--primario', href: `#/conto/${tavoloId}` }, icona('receipt_long'), 'Vai al conto')));
}

// ---------------------------------------------------------------------------

let disegnaCorrente = () => {};

export function renderTavolo(el, { id: tavoloId }) {
  const s0 = store.get();
  const tavolo = s0.tavoli.find((t) => t.id === tavoloId);
  if (!tavolo || !trovaServizio(tavoloId)) {
    toast(tavolo ? `Il tavolo ${tavolo.nome} è libero` : 'Tavolo non trovato', { icona: 'info' });
    vai('#/sala');
    return;
  }

  function costruisci() {
    const s = store.get();
    const serv = trovaServizio(tavoloId);
    const t = s.tavoli.find((x) => x.id === tavoloId);
    if (!serv || !t) { queueMicrotask(() => vai('#/sala')); return null; }
    const ui = uiDi(serv.id);
    if (ui.dest.tipo === 'coperto' && !serv.coperti.some((c) => c.id === ui.dest.copertoId)) ui.dest = { tipo: 'tavolo' };
    const stato = statoTavolo(serv);
    const nRighe = serv.righe.reduce((q, r) => q + r.qta, 0);

    appbar({
      titolo: `Tavolo ${t.nome}`,
      locale: s.impostazioni.nomeLocale,
      indietro: '#/sala',
      azioni: [
        h('button', {
          type: 'button', class: `btn${serv.contoRichiesto ? ' btn--conto-attivo' : ''}`, 'aria-pressed': String(serv.contoRichiesto), 'aria-label': 'Conto richiesto',
          onclick: () => modifica(tavoloId, (x) => { x.contoRichiesto = !x.contoRichiesto; })
        }, icona('receipt_long'), h('span', { class: 'solo-ampio' }, serv.contoRichiesto ? 'Conto richiesto' : 'Richiedi conto')),
        h('a', { class: 'btn', href: `#/conto/${tavoloId}`, 'aria-label': 'Vai al conto' }, icona('payments'), h('span', { class: 'solo-ampio' }, 'Conto')),
        h('button', { type: 'button', class: 'btn btn--icona', 'aria-label': 'Altre azioni', onclick: () => menuAltro(tavoloId) }, icona('more_vert'))
      ]
    });

    return h('div', { class: `tavolo tavolo--${ui.pannello}` },
      h('div', { class: 'tavolo__testa' },
        badgeStato(stato),
        h('span', { class: 'meta' }, icona('group'), `${serv.coperti.length} coperti`),
        h('span', { class: 'meta' }, icona('timer'), tempoTrascorso(serv.apertoAlle)),
        h('span', { class: 'meta meta--totale' }, formatEuro(totaleServizio(serv, s.impostazioni.prezzoCopertoCent)))),
      barraDestinatari(tavoloId, serv, ui),
      h('div', { class: 'tavolo__corpo' },
        pannelloMenu(tavoloId, serv, ui, s),
        pannelloOrdine(tavoloId, serv, ui, s)),
      h('nav', { class: 'tavolo__switch', 'aria-label': 'Pannello' },
        segmentato({
          etichetta: 'Pannello', valore: ui.pannello, classe: 'segmentato--largo',
          opzioni: [{ valore: 'menu', testo: 'Menu', icona: 'restaurant_menu' }, { valore: 'ordine', testo: `Ordine (${nRighe})`, icona: 'receipt' }],
          onChange: (v) => { ui.pannello = v; disegnaCorrente(); window.scrollTo(0, 0); }
        })));
  }

  const disegna = () => ridisegna(el, costruisci);
  disegnaCorrente = disegna;
  disegna();
  const stop = store.ascolta(disegna);
  const timer = setInterval(disegna, 30000);
  return () => { stop(); clearInterval(timer); disegnaCorrente = () => {}; };
}
