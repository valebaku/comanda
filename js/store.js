// Stato dell'app, persistenza su localStorage, migrazioni e validazione backup.
//
// Tutto lo stato vive in un unico oggetto salvato sotto una sola chiave.
// La chiave resta "ristoapp:v1" anche quando `version` cresce: la versione
// del formato è dentro il dato, e `migra()` lo porta all'ultima versione.

export const CHIAVE = 'ristoapp:v1';
export const VERSIONE = 1;

/** SHA-256 di "0000": PIN di default, da cambiare al primo accesso. */
export const PIN_DEFAULT_HASH = '9af15b336e6a9619928537df30b2e6a2376569fcf9d7e773eccede65606529a0';

export function statoIniziale() {
  return {
    version: VERSIONE,
    impostazioni: {
      nomeLocale: '',
      prezzoCopertoCent: 0,
      uscite: ['1ª uscita', '2ª uscita', '3ª uscita', 'Dessert'],
      pinHash: PIN_DEFAULT_HASH,
      pinDaCambiare: true,
      tema: 'auto',            // "auto" | "chiaro" | "scuro"
      ultimoBackup: null       // ISO string dell'ultimo export
    },
    categorie: [],
    piatti: [],
    tavoli: [],
    servizi: [],
    storico: []
  };
}

// Migrazioni: chiave = versione di partenza, valore = funzione che restituisce
// il dato alla versione successiva. Esempio per il futuro:
//   1: (d) => ({ ...d, version: 2, nuovoCampo: [] })
const MIGRAZIONI = {};

/** Porta un dato salvato (di qualsiasi versione nota) alla versione corrente. */
export function migra(dati) {
  if (!dati || typeof dati !== 'object') throw new Error('Dati mancanti o non validi');
  let d = dati;
  if (!Number.isInteger(d.version) || d.version < 1) throw new Error('Versione dei dati mancante');
  if (d.version > VERSIONE) {
    throw new Error(`I dati sono di una versione più recente (${d.version}) di quella dell'app (${VERSIONE})`);
  }
  while (d.version < VERSIONE) {
    const passo = MIGRAZIONI[d.version];
    if (!passo) throw new Error(`Nessuna migrazione dalla versione ${d.version}`);
    d = passo(d);
  }
  // Completa i campi aggiunti senza cambio di versione (default non distruttivi).
  const base = statoIniziale();
  d.impostazioni = { ...base.impostazioni, ...d.impostazioni };
  for (const k of ['categorie', 'piatti', 'tavoli', 'servizi', 'storico']) {
    if (!Array.isArray(d[k])) d[k] = [];
  }
  return d;
}

/** Controllo strutturale di un backup prima dell'import. Lancia un Error leggibile. */
export function valida(dati) {
  if (!dati || typeof dati !== 'object' || Array.isArray(dati)) throw new Error('Il file non contiene un oggetto JSON');
  if (!Number.isInteger(dati.version)) throw new Error('Campo "version" mancante');
  if (!dati.impostazioni || typeof dati.impostazioni !== 'object') throw new Error('Campo "impostazioni" mancante');
  for (const k of ['categorie', 'piatti', 'tavoli', 'servizi', 'storico']) {
    if (!Array.isArray(dati[k])) throw new Error(`Campo "${k}" mancante o non è una lista`);
  }
  const conId = (lista, nome) => lista.forEach((x, i) => {
    if (!x || typeof x.id !== 'string') throw new Error(`${nome}[${i}] senza id`);
  });
  conId(dati.categorie, 'categorie');
  conId(dati.piatti, 'piatti');
  conId(dati.tavoli, 'tavoli');
  conId(dati.servizi, 'servizi');
  return true;
}

export const nuovoId = () => crypto.randomUUID();

// ---------------------------------------------------------------------------
// Store in memoria + persistenza

let stato = null;
const ascoltatori = new Set();
let storage = globalThis.localStorage;

/** Solo per i test: sostituisce localStorage. */
export function _usaStorage(s) { storage = s; stato = null; }

export function carica() {
  let grezzo = null;
  try { grezzo = storage?.getItem(CHIAVE); } catch { /* storage non disponibile */ }
  if (!grezzo) {
    stato = statoIniziale();
    return stato;
  }
  try {
    stato = migra(JSON.parse(grezzo));
  } catch (err) {
    // Non sovrascrivere dati che non sappiamo leggere: li mettiamo da parte.
    console.error('Dati salvati non leggibili, ne conservo una copia:', err);
    try { storage.setItem(`${CHIAVE}:corrotto:${Date.now()}`, grezzo); } catch { /* pieno */ }
    stato = statoIniziale();
  }
  return stato;
}

export function salva() {
  try {
    storage?.setItem(CHIAVE, JSON.stringify(stato));
  } catch (err) {
    console.error('Salvataggio non riuscito', err);
    throw err;
  }
}

/** Stato corrente (sola lettura per convenzione: modificare solo via `aggiorna`). */
export function get() {
  if (!stato) carica();
  return stato;
}

/**
 * Modifica lo stato e salva subito. `fn` riceve lo stato e lo modifica in place.
 * Ritorna il valore restituito da `fn`.
 */
export function aggiorna(fn) {
  const s = get();
  const risultato = fn(s);
  salva();
  ascoltatori.forEach((cb) => cb(s));
  return risultato;
}

/** Sostituisce tutto lo stato (import backup / reset). */
export function sostituisci(nuovo) {
  stato = migra(structuredClone(nuovo));
  salva();
  ascoltatori.forEach((cb) => cb(stato));
}

export function reset() {
  sostituisci(statoIniziale());
}

/** Iscrizione ai cambiamenti. Ritorna la funzione per disiscriversi. */
export function ascolta(cb) {
  ascoltatori.add(cb);
  return () => ascoltatori.delete(cb);
}

/** Stato serializzato per il backup. */
export function esporta() {
  return JSON.stringify(get(), null, 2);
}
