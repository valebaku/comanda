// Admin › Dati: storico dei conti chiusi, backup (esporta/importa), dati di esempio, reset.

import * as store from '../../store.js';
import { vai } from '../../router.js';
import { h, icona, ridisegna, conferma, dialogo, toast, dataOra, vuoto } from '../../lib/ui.js';
import { formatEuro } from '../../lib/money.js';
import { chiudiSessione } from '../../lib/pin.js';
import { applicaDatiEsempio } from '../../lib/esempio.js';

const GIORNI_PROMEMORIA = 7;
const MODALITA = { totale: 'Totale', coperto: 'Per coperto', romana: 'Alla romana' };

export function giorniDaUltimoBackup(imp, ora = Date.now()) {
  if (!imp.ultimoBackup) return null;
  return Math.floor((ora - new Date(imp.ultimoBackup).getTime()) / 86400000);
}

/** Banner "Backup consigliato" (o null se non serve). */
export function bannerBackup() {
  const s = store.get();
  const vuoti = !s.tavoli.length && !s.piatti.length && !s.storico.length;
  if (vuoti) return null;
  const giorni = giorniDaUltimoBackup(s.impostazioni);
  if (giorni !== null && giorni < GIORNI_PROMEMORIA) return null;
  return h('div', { class: 'banner banner--avviso' }, icona('backup'),
    h('p', {}, h('b', {}, 'Backup consigliato. '),
      giorni === null ? 'Non hai ancora mai esportato i dati.' : `L’ultimo backup è di ${giorni} giorni fa.`,
      ' I dati sono solo su questo dispositivo.'),
    h('a', { class: 'btn', href: '#/admin/dati' }, 'Vai ai dati'));
}

function esporta() {
  const ora = new Date();
  store.aggiorna((s) => { s.impostazioni.ultimoBackup = ora.toISOString(); });
  const blob = new Blob([store.esporta()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const giorno = ora.toISOString().slice(0, 10);
  const a = h('a', { href: url, download: `comanda-backup-${giorno}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Backup esportato', { icona: 'download_done' });
}

async function importa(file) {
  let dati;
  try {
    dati = JSON.parse(await file.text());
    store.valida(dati);
    dati = store.migra(dati);
  } catch (err) {
    await dialogo({ titolo: 'File non valido', corpo: h('p', {}, `Impossibile importare: ${err.message}.`), azioni: [{ testo: 'Chiudi', valore: '' }] });
    return;
  }
  const riepilogo = `${dati.tavoli.length} tavoli, ${dati.piatti.length} piatti, ${dati.servizi.length} tavoli aperti, ${dati.storico.length} conti nello storico.`;
  const ok = await conferma({
    titolo: 'Sostituire tutti i dati?',
    testo: `Il backup contiene ${riepilogo} I dati attuali di questo dispositivo verranno sovrascritti.`,
    ok: 'Importa e sovrascrivi', pericolo: true, icona: 'upload'
  });
  if (!ok) return;
  store.sostituisci(dati);
  toast('Dati importati', { icona: 'check_circle' });
}

async function reset() {
  const primo = await conferma({
    titolo: 'Cancellare tutti i dati?',
    testo: 'Verranno eliminati tavoli, menu, tavoli aperti, storico e impostazioni. Il PIN torna 0000.',
    ok: 'Continua', pericolo: true
  });
  if (!primo) return;
  const secondo = await conferma({
    titolo: 'Sei davvero sicuro?',
    testo: 'Questa è l’ultima conferma: l’operazione non si può annullare. Se non hai un backup, i dati andranno persi.',
    ok: 'Cancella tutto', pericolo: true, icona: 'delete_forever'
  });
  if (!secondo) return;
  store.reset();
  chiudiSessione();
  toast('Dati cancellati', { icona: 'delete_forever' });
  vai('#/sala');
}

async function caricaEsempio() {
  const s = store.get();
  if (s.servizi.length) {
    toast('Chiudi prima i tavoli aperti', { icona: 'block' });
    return;
  }
  const haDati = s.tavoli.length || s.piatti.length;
  if (haDati && !(await conferma({
    titolo: 'Caricare i dati di esempio?',
    testo: 'Tavoli, categorie e piatti attuali verranno sostituiti. Storico e impostazioni restano.',
    ok: 'Sostituisci', pericolo: true
  }))) return;
  store.aggiorna(applicaDatiEsempio);
  toast('Dati di esempio caricati: 10 tavoli e un menu', { icona: 'check_circle' });
}

function dettaglioStorico(voce) {
  return dialogo({
    titolo: `Tavolo ${voce.tavoloNome} · ${formatEuro(voce.totaleCent)}`,
    corpo: h('div', { class: 'pila' },
      h('p', { class: 'testo-muted' }, `${dataOra(voce.apertoAlle)} → ${dataOra(voce.chiusoAlle)} · ${voce.coperti ?? '?'} coperti · ${MODALITA[voce.modalitaConto] ?? ''}`),
      voce.righe.length
        ? h('ul', { class: 'lista-semplice' }, voce.righe.map((r) => h('li', {},
            h('span', {}, `${r.qta}× ${r.nome}`, h('small', { class: 'testo-muted' }, ` · ${r.destinatario}${r.nota ? ` · ${r.nota}` : ''}`)),
            h('span', {}, formatEuro(r.prezzoCent * r.qta)))))
        : h('p', {}, 'Nessuna riga.')),
    azioni: [{ testo: 'Chiudi', valore: '' }]
  });
}

export function renderDati(el) {
  function costruisci() {
    const s = store.get();
    const giorni = giorniDaUltimoBackup(s.impostazioni);
    const input = h('input', {
      type: 'file', accept: 'application/json,.json', class: 'sr-only', id: 'file-import',
      onchange: (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) importa(f); }
    });

    const storico = [...s.storico].sort((a, b) => b.chiusoAlle.localeCompare(a.chiusoAlle));
    const incasso = storico.reduce((t, v) => t + v.totaleCent, 0);

    return [
      bannerBackup(),
      h('section', { class: 'scheda pila' },
        h('h2', { class: 'scheda__titolo' }, 'Backup'),
        h('p', {}, 'Ultimo backup: ', h('b', {}, s.impostazioni.ultimoBackup ? `${dataOra(s.impostazioni.ultimoBackup)} (${giorni === 0 ? 'oggi' : `${giorni} giorni fa`})` : 'mai')),
        h('div', { class: 'barra-azioni' },
          h('button', { type: 'button', class: 'btn btn--primario', onclick: esporta }, icona('download'), 'Esporta backup'),
          h('label', { class: 'btn', for: 'file-import', tabindex: '0', role: 'button', onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } } }, icona('upload'), 'Importa backup'),
          input)),
      h('section', { class: 'scheda pila' },
        h('h2', { class: 'scheda__titolo' }, 'Storico conti chiusi'),
        storico.length
          ? [
              h('p', { class: 'testo-muted' }, `${storico.length} conti · totale ${formatEuro(incasso)}`),
              h('ul', { class: 'lista' }, storico.map((v) => h('li', { class: 'lista__riga' },
                h('button', { type: 'button', class: 'lista__principale', onclick: () => dettaglioStorico(v) },
                  h('span', { class: 'lista__nome' }, `Tavolo ${v.tavoloNome}`),
                  h('span', { class: 'testo-muted' }, dataOra(v.chiusoAlle)),
                  h('span', { class: 'lista__prezzo' }, formatEuro(v.totaleCent))))))
            ]
          : vuoto({ icona: 'receipt_long', titolo: 'Nessun conto chiuso', testo: 'I tavoli chiusi compaiono qui.' })),
      h('section', { class: 'scheda pila' },
        h('h2', { class: 'scheda__titolo' }, 'Dati di esempio'),
        h('p', { class: 'testo-muted' }, '10 tavoli e un menu da trattoria, per provare l’app.'),
        h('div', {}, h('button', { type: 'button', class: 'btn', onclick: caricaEsempio }, icona('auto_awesome'), 'Carica dati di esempio'))),
      h('section', { class: 'scheda scheda--pericolo pila' },
        h('h2', { class: 'scheda__titolo' }, icona('warning'), 'Zona pericolo'),
        h('p', {}, 'Cancella tutti i dati di questo dispositivo. Fai prima un backup.'),
        h('div', {}, h('button', { type: 'button', class: 'btn btn--pericolo', onclick: reset }, icona('delete_forever'), 'Cancella tutti i dati')))
    ];
  }
  const disegna = () => ridisegna(el, costruisci);
  disegna();
  return store.ascolta(disegna);
}
