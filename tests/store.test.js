import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as store from '../js/store.js';

function memoria() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _m: m
  };
}

test('PIN di default è lo SHA-256 di "0000"', () => {
  assert.equal(store.PIN_DEFAULT_HASH, createHash('sha256').update('0000').digest('hex'));
});

test('senza dati salvati parte dallo stato iniziale', () => {
  store._usaStorage(memoria());
  const s = store.carica();
  assert.equal(s.version, store.VERSIONE);
  assert.deepEqual(s.tavoli, []);
  assert.equal(s.impostazioni.pinDaCambiare, true);
});

test('aggiorna salva subito e il dato sopravvive al ricaricamento', () => {
  const mem = memoria();
  store._usaStorage(mem);
  store.carica();
  store.aggiorna((s) => { s.tavoli.push({ id: 't1', nome: '1', copertiDefault: 4, ordine: 0 }); });
  assert.ok(mem.getItem(store.CHIAVE));

  store._usaStorage(mem);
  assert.equal(store.carica().tavoli[0].nome, '1');
});

test('dati illeggibili non vengono persi: copia di sicurezza', () => {
  const mem = memoria();
  mem.setItem(store.CHIAVE, '{non json');
  store._usaStorage(mem);
  const s = store.carica();
  assert.equal(s.version, store.VERSIONE);
  const copie = [...mem._m.keys()].filter((k) => k.startsWith(`${store.CHIAVE}:corrotto:`));
  assert.equal(copie.length, 1);
});

test('migra completa i campi mancanti e rifiuta versioni future', () => {
  const d = store.migra({ version: 1, impostazioni: { nomeLocale: 'Da Rina' } });
  assert.equal(d.impostazioni.nomeLocale, 'Da Rina');
  assert.deepEqual(d.impostazioni.uscite, ['1ª uscita', '2ª uscita', '3ª uscita', 'Dessert']);
  assert.deepEqual(d.servizi, []);
  assert.throws(() => store.migra({ version: store.VERSIONE + 1 }), /più recente/);
  assert.throws(() => store.migra({}), /Versione/);
});

test('valida riconosce un backup corretto e segnala quelli rotti', () => {
  assert.equal(store.valida(store.statoIniziale()), true);
  assert.throws(() => store.valida([]), /oggetto/);
  assert.throws(() => store.valida({ ...store.statoIniziale(), tavoli: null }), /tavoli/);
  assert.throws(() => store.valida({ ...store.statoIniziale(), tavoli: [{ nome: 'x' }] }), /senza id/);
});

test('ascolta notifica i cambiamenti e si può disiscrivere', () => {
  store._usaStorage(memoria());
  store.carica();
  let n = 0;
  const stop = store.ascolta(() => n++);
  store.aggiorna(() => {});
  stop();
  store.aggiorna(() => {});
  assert.equal(n, 1);
});
