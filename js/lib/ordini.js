// Operazioni sul servizio (tavolo aperto): coperti, righe, uscite.
// Funzioni pure sul dato: modificano l'oggetto ricevuto e non toccano DOM o storage,
// così si possono testare con node --test e usare dentro store.aggiorna().

import { destinazioneEffettiva } from './conto.js';

const id = () => globalThis.crypto.randomUUID();
export const MAX_ETICHETTA = 20;

export const pulisciEtichetta = (s) => String(s ?? '').trim().slice(0, MAX_ETICHETTA);

/** Crea un nuovo servizio per un tavolo. `etichette` opzionali, default "1", "2", … */
export function creaServizio(tavoloId, numeroCoperti, etichette = [], ora = new Date()) {
  const n = Math.max(1, Math.floor(numeroCoperti));
  return {
    id: id(),
    tavoloId,
    apertoAlle: ora.toISOString(),
    contoRichiesto: false,
    coperti: Array.from({ length: n }, (_, i) => ({
      id: id(),
      etichetta: pulisciEtichetta(etichette[i]) || String(i + 1),
      pagato: false
    })),
    righe: [],
    modalitaConto: 'totale',
    personeRomana: null,
    pagamentiRomana: 0
  };
}

export function stessaDestinazione(a, b) {
  if (a.tipo !== b.tipo) return false;
  if (a.tipo === 'coperto') return a.copertoId === b.copertoId;
  if (a.tipo === 'diviso') {
    return a.copertoIds.length === b.copertoIds.length && a.copertoIds.every((x) => b.copertoIds.includes(x));
  }
  return true;
}

/**
 * Aggiunge un piatto. Se esiste già una riga identica (stesso piatto, destinazione,
 * uscita, nota vuota, stato "attesa") ne incrementa la quantità.
 * Ritorna { riga, nuova }.
 */
export function aggiungiPiatto(servizio, piatto, destinazione, uscita) {
  const dest = destinazioneEffettiva(destinazione, servizio.coperti);
  const esistente = servizio.righe.find((r) =>
    r.piattoId === piatto.id && r.uscita === uscita && !r.nota && r.stato === 'attesa' &&
    stessaDestinazione(r.destinazione, dest));
  if (esistente) {
    esistente.qta += 1;
    return { riga: esistente, nuova: false };
  }
  const riga = {
    id: id(),
    piattoId: piatto.id,
    nome: piatto.nome,
    prezzoCent: piatto.prezzoCent,
    qta: 1,
    nota: '',
    uscita,
    stato: 'attesa',
    destinazione: dest
  };
  servizio.righe.push(riga);
  return { riga, nuova: true };
}

/** Annulla l'effetto di aggiungiPiatto (per il toast "Annulla"). */
export function annullaAggiunta(servizio, rigaId, nuova) {
  const r = servizio.righe.find((x) => x.id === rigaId);
  if (!r) return;
  if (nuova || r.qta <= 1) eliminaRiga(servizio, rigaId);
  else r.qta -= 1;
}

export const trovaRiga = (servizio, rigaId) => servizio.righe.find((r) => r.id === rigaId);

export function eliminaRiga(servizio, rigaId) {
  servizio.righe = servizio.righe.filter((r) => r.id !== rigaId);
}

/** Imposta la quantità; 0 o meno elimina la riga. */
export function impostaQta(servizio, rigaId, qta) {
  const r = trovaRiga(servizio, rigaId);
  if (!r) return;
  if (qta <= 0) eliminaRiga(servizio, rigaId);
  else r.qta = Math.floor(qta);
}

export function impostaDestinazione(servizio, rigaId, dest) {
  const r = trovaRiga(servizio, rigaId);
  if (r) r.destinazione = destinazioneEffettiva(dest, servizio.coperti);
}

/** "Chiama uscita": attesa → chiamata. "Segna servita": chiamata → servita. */
export function chiamaUscita(servizio, uscita) {
  let n = 0;
  for (const r of servizio.righe) if (r.uscita === uscita && r.stato === 'attesa') { r.stato = 'chiamata'; n++; }
  return n;
}
export function servitaUscita(servizio, uscita) {
  let n = 0;
  for (const r of servizio.righe) if (r.uscita === uscita && r.stato === 'chiamata') { r.stato = 'servita'; n++; }
  return n;
}

export const STATI_RIGA = ['attesa', 'chiamata', 'servita'];

// ---------------------------------------------------------------------------
// Coperti

/** Aggiunge un coperto con la prima etichetta numerica libera. */
export function aggiungiCoperto(servizio, etichetta) {
  let lab = pulisciEtichetta(etichetta);
  if (!lab) {
    const usate = new Set(servizio.coperti.map((c) => c.etichetta));
    let n = servizio.coperti.length + 1;
    while (usate.has(String(n))) n++;
    lab = String(n);
  }
  const c = { id: id(), etichetta: lab, pagato: false };
  servizio.coperti.push(c);
  return c;
}

export function rinominaCoperto(servizio, copertoId, etichetta) {
  const c = servizio.coperti.find((x) => x.id === copertoId);
  const lab = pulisciEtichetta(etichetta);
  if (c && lab) c.etichetta = lab;
}

/** Quante righe coinvolgono il coperto. */
export function righeDelCoperto(servizio, copertoId) {
  let proprie = 0;
  let divise = 0;
  for (const r of servizio.righe) {
    if (r.destinazione.tipo === 'coperto' && r.destinazione.copertoId === copertoId) proprie++;
    if (r.destinazione.tipo === 'diviso' && r.destinazione.copertoIds.includes(copertoId)) divise++;
  }
  return { proprie, divise };
}

/**
 * Rimuove un coperto: le sue righe passano al Tavolo, viene tolto dalle divisioni
 * (se resta un solo coperto la riga diventa sua). Non rimuove l'ultimo coperto.
 */
export function rimuoviCoperto(servizio, copertoId) {
  if (servizio.coperti.length <= 1) return false;
  servizio.coperti = servizio.coperti.filter((c) => c.id !== copertoId);
  for (const r of servizio.righe) {
    const d = r.destinazione;
    if (d.tipo === 'coperto' && d.copertoId === copertoId) r.destinazione = { tipo: 'tavolo' };
    else if (d.tipo === 'diviso' && d.copertoIds.includes(copertoId)) {
      r.destinazione = destinazioneEffettiva({ tipo: 'diviso', copertoIds: d.copertoIds.filter((x) => x !== copertoId) }, servizio.coperti);
    }
  }
  return true;
}

/** Testo leggibile del destinatario: "Tavolo", "Marco", "Diviso: Marco, Anna, 3". */
export function testoDestinazione(dest, coperti) {
  const d = destinazioneEffettiva(dest, coperti);
  const nome = (cid) => coperti.find((c) => c.id === cid)?.etichetta ?? '?';
  if (d.tipo === 'coperto') return nome(d.copertoId);
  if (d.tipo === 'diviso') return `Diviso: ${d.copertoIds.map(nome).join(', ')}`;
  return 'Tavolo';
}

/** Trasforma un servizio chiuso in una voce di storico. */
export function voceStorico(servizio, { tavoloNome, totaleCent, ora = new Date() }) {
  return {
    id: servizio.id,
    tavoloNome,
    apertoAlle: servizio.apertoAlle,
    chiusoAlle: ora.toISOString(),
    totaleCent,
    modalitaConto: servizio.modalitaConto,
    coperti: servizio.coperti.length,
    righe: servizio.righe.map((r) => ({
      nome: r.nome,
      qta: r.qta,
      prezzoCent: r.prezzoCent,
      nota: r.nota,
      destinatario: testoDestinazione(r.destinazione, servizio.coperti)
    }))
  };
}
