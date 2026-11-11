// Tastierino PIN a schermo intero: accesso admin e cambio PIN.

import * as store from '../../store.js';
import { vai } from '../../router.js';
import { h, icona, appbar, toast } from '../../lib/ui.js';
import { PIN_MAX, PIN_MIN, pinValido, hashPin, verificaPin, apriSessione } from '../../lib/pin.js';

/**
 * Monta il tastierino in `el`. `onInvio(pin)` ritorna un messaggio di errore
 * (stringa) oppure null se va bene. Ritorna la funzione di pulizia.
 */
export function tastierino(el, { titolo, sottotitolo, onInvio }) {
  let pin = '';
  let errore = '';
  let occupato = false;

  const puntini = h('div', { class: 'pin__puntini', 'aria-hidden': 'true' });
  const msg = h('p', { class: 'pin__messaggio', role: 'alert', 'aria-live': 'assertive' });
  const stato = h('p', { class: 'sr-only', 'aria-live': 'polite' });

  function aggiorna() {
    const n = Math.max(PIN_MIN, pin.length);
    puntini.replaceChildren(...Array.from({ length: n }, (_, i) =>
      h('span', { class: `pin__puntino${i < pin.length ? ' pin__puntino--pieno' : ''}${errore ? ' pin__puntino--errore' : ''}` })));
    msg.textContent = errore || sottotitolo || '';
    msg.classList.toggle('pin__messaggio--errore', !!errore);
    stato.textContent = `${pin.length} cifre inserite`;
    ok.disabled = pin.length < PIN_MIN || occupato;
  }

  async function invia() {
    if (pin.length < PIN_MIN || occupato) return;
    occupato = true;
    const e = await onInvio(pin);
    occupato = false;
    if (e) { errore = e; pin = ''; navigator.vibrate?.([40, 40, 40]); }
    aggiorna();
  }
  function cifra(c) {
    if (pin.length >= PIN_MAX) return;
    errore = '';
    pin += c;
    aggiorna();
  }
  function cancella() {
    errore = '';
    pin = pin.slice(0, -1);
    aggiorna();
  }

  const tasto = (contenuto, fn, attrs = {}) => h('button', { type: 'button', class: 'pin__tasto', onclick: fn, ...attrs }, contenuto);
  const ok = tasto(icona('check'), invia, { class: 'pin__tasto pin__tasto--ok', 'aria-label': 'Conferma PIN' });
  const tasti = h('div', { class: 'pin__tasti' },
    ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((c) => tasto(c, () => cifra(c))),
    tasto(icona('backspace'), cancella, { 'aria-label': 'Cancella ultima cifra', class: 'pin__tasto pin__tasto--secondario' }),
    tasto('0', () => cifra('0')),
    ok
  );

  el.append(h('section', { class: 'pin' },
    icona('lock', 'pin__lucchetto'),
    h('h2', { class: 'pin__titolo' }, titolo),
    puntini, msg, stato, tasti));

  const tastiera = (e) => {
    if (/^\d$/.test(e.key)) cifra(e.key);
    else if (e.key === 'Backspace') cancella();
    else if (e.key === 'Enter') invia();
    else return;
    e.preventDefault();
  };
  document.addEventListener('keydown', tastiera);
  aggiorna();
  return () => document.removeEventListener('keydown', tastiera);
}

export function renderLogin(el) {
  appbar({ titolo: 'Amministrazione', indietro: '#/sala' });
  return tastierino(el, {
    titolo: 'PIN amministratore',
    sottotitolo: `Inserisci il PIN (${PIN_MIN}–${PIN_MAX} cifre)`,
    onInvio: async (pin) => {
      if (await verificaPin(pin, store.get().impostazioni.pinHash)) {
        apriSessione();
        vai(location.hash);
        return null;
      }
      return 'PIN errato, riprova';
    }
  });
}

/**
 * Cambio PIN in due passi (nuovo + conferma).
 * `obbligatorio`: primo accesso con il PIN di default.
 */
export function renderCambioPin(el, { obbligatorio = false, fatto } = {}) {
  appbar({ titolo: 'Cambia PIN', indietro: obbligatorio ? '#/sala' : '#/admin/impostazioni' });
  let primo = null;
  let pulizia = null;

  const passo = () => {
    pulizia?.();
    el.replaceChildren();
    if (obbligatorio && primo === null) {
      el.append(h('div', { class: 'banner banner--info pin__banner' }, icona('info'),
        h('p', {}, h('b', {}, 'Primo accesso. '), 'Il PIN di default è 0000: scegline uno nuovo prima di continuare.')));
    }
    pulizia = tastierino(el, primo === null
      ? {
          titolo: 'Nuovo PIN',
          sottotitolo: `Scegli ${PIN_MIN}–${PIN_MAX} cifre`,
          onInvio: async (pin) => {
            if (!pinValido(pin)) return `Il PIN deve avere ${PIN_MIN}–${PIN_MAX} cifre`;
            if (obbligatorio && pin === '0000') return 'Scegli un PIN diverso da 0000';
            primo = pin;
            queueMicrotask(passo);
            return null;
          }
        }
      : {
          titolo: 'Conferma il nuovo PIN',
          sottotitolo: 'Inseriscilo di nuovo',
          onInvio: async (pin) => {
            if (pin !== primo) {
              primo = null;
              queueMicrotask(() => { passo(); toast('I due PIN non coincidono, ricomincia', { icona: 'error' }); });
              return null;
            }
            const hash = await hashPin(pin);
            store.aggiorna((s) => { s.impostazioni.pinHash = hash; s.impostazioni.pinDaCambiare = false; });
            apriSessione();
            toast('PIN aggiornato', { icona: 'check_circle' });
            if (fatto) fatto(); else vai(location.hash);
            return null;
          }
        });
  };
  passo();
  return () => pulizia?.();
}
