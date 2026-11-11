import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ripartisci, totaleServizio, contoPerCoperto, contoAllaRomana, statoTavolo, puoChiudere, destinazioneEffettiva
} from '../js/lib/conto.js';
import { creaServizio, aggiungiPiatto, chiamaUscita, servitaUscita, rimuoviCoperto, testoDestinazione } from '../js/lib/ordini.js';

const somma = (a) => a.reduce((s, x) => s + x, 0);

// Scenario dei criteri di accettazione: Marco, Anna, 3, 4
function scenario(prezzoCoperto = 0) {
  const s = creaServizio('t1', 4, ['Marco', 'Anna', '3', '4']);
  const [marco, anna, tre] = s.coperti;
  aggiungiPiatto(s, { id: 'acqua', nome: 'Acqua', prezzoCent: 250 }, { tipo: 'tavolo' }, 0);
  aggiungiPiatto(s, { id: 'primo', nome: 'Carbonara', prezzoCent: 1300 }, { tipo: 'coperto', copertoId: marco.id }, 1);
  aggiungiPiatto(s, { id: 'anti', nome: 'Antipasto misto', prezzoCent: 1000 }, { tipo: 'diviso', copertoIds: [marco.id, anna.id, tre.id] }, 0);
  return { s, prezzoCoperto };
}

test('ripartisci: il resto va ai primi, la somma è sempre il totale', () => {
  assert.deepEqual(ripartisci(1000, 3), [334, 333, 333]);
  assert.deepEqual(ripartisci(250, 4), [63, 63, 62, 62]);
  assert.deepEqual(ripartisci(0, 3), [0, 0, 0]);
  assert.deepEqual(ripartisci(5, 1), [5]);
  assert.throws(() => ripartisci(10, 0));
  assert.throws(() => ripartisci(1.5, 2));
});

test('ripartisci: proprietà su molti casi', () => {
  for (let importo = 0; importo < 2000; importo += 7) {
    for (let n = 1; n <= 12; n++) {
      const p = ripartisci(importo, n);
      assert.equal(somma(p), importo);
      assert.ok(Math.max(...p) - Math.min(...p) <= 1);
    }
  }
});

test('totale = Σ righe + coperto × coperti', () => {
  const { s } = scenario();
  assert.equal(totaleServizio(s, 0), 250 + 1300 + 1000);
  assert.equal(totaleServizio(s, 200), 2550 + 800);
});

test('criterio di accettazione: somma delle quote per coperto = totale, al centesimo', () => {
  for (const prezzoCoperto of [0, 150, 233]) {
    const { s } = scenario();
    const persone = contoPerCoperto(s, prezzoCoperto);
    assert.equal(somma(persone.map((p) => p.totaleCent)), totaleServizio(s, prezzoCoperto));
  }
});

test('conto per coperto separa propri, quote e coperto', () => {
  const { s } = scenario();
  const [marco, anna, tre, quattro] = contoPerCoperto(s, 200);
  // Marco: carbonara 13,00 propri; quota antipasto 3,34 + quota acqua 0,63
  assert.equal(marco.propriCent, 1300);
  assert.equal(marco.quoteCent, 334 + 63);
  assert.equal(marco.copertoCent, 200);
  assert.equal(marco.totaleCent, 1300 + 397 + 200);
  assert.equal(anna.propriCent, 0);
  assert.equal(anna.quoteCent, 333 + 63);
  assert.equal(tre.quoteCent, 333 + 62);
  assert.equal(quattro.quoteCent, 62);
  assert.equal(marco.etichetta, 'Marco');
});

test('quantità > 1 e righe divise con importi che non si dividono esattamente', () => {
  const s = creaServizio('t', 3);
  const [a, b, c] = s.coperti;
  const vino = { id: 'v', nome: 'Vino', prezzoCent: 1999 };
  aggiungiPiatto(s, vino, { tipo: 'diviso', copertoIds: [c.id, a.id] }, 0);
  aggiungiPiatto(s, vino, { tipo: 'diviso', copertoIds: [a.id, c.id] }, 0); // stessa divisione → qta 2
  assert.equal(s.righe.length, 1);
  assert.equal(s.righe[0].qta, 2);
  assert.deepEqual(s.righe[0].destinazione.copertoIds, [a.id, c.id]); // ordine dei coperti
  aggiungiPiatto(s, { id: 'x', nome: 'Pane', prezzoCent: 101 }, { tipo: 'tavolo' }, 0);
  const persone = contoPerCoperto(s, 0);
  assert.equal(somma(persone.map((p) => p.totaleCent)), 1999 * 2 + 101);
  assert.equal(persone[1].totaleCent, 34); // b: solo quota pane
  void b;
});

test('alla romana: quote intere che sommano al totale', () => {
  const q = contoAllaRomana(10000, 3);
  assert.deepEqual(q, [3334, 3333, 3333]);
  assert.equal(somma(contoAllaRomana(2551, 7)), 2551);
});

test('stato del tavolo derivato dalle righe', () => {
  const { s } = scenario();
  assert.equal(statoTavolo(null), 'libero');
  assert.equal(statoTavolo(s), 'occupato');
  chiamaUscita(s, 0);
  assert.equal(statoTavolo(s), 'attesa');
  servitaUscita(s, 0);
  assert.equal(statoTavolo(s), 'occupato');
  s.contoRichiesto = true;
  assert.equal(statoTavolo(s), 'conto');
});

test('rimuovere un coperto: righe proprie al tavolo, divisioni ridotte, totale invariato', () => {
  const { s } = scenario();
  const [marco, anna, tre] = s.coperti;
  const totalePrima = totaleServizio(s, 0);
  rimuoviCoperto(s, marco.id);
  const carbonara = s.righe.find((r) => r.nome === 'Carbonara');
  const antipasto = s.righe.find((r) => r.nome === 'Antipasto misto');
  assert.deepEqual(carbonara.destinazione, { tipo: 'tavolo' });
  assert.deepEqual(antipasto.destinazione, { tipo: 'diviso', copertoIds: [anna.id, tre.id] });
  rimuoviCoperto(s, anna.id);
  assert.deepEqual(antipasto.destinazione, { tipo: 'coperto', copertoId: tre.id });
  assert.equal(somma(contoPerCoperto(s, 0).map((p) => p.totaleCent)), totalePrima);
});

test('destinazioni con coperti inesistenti ricadono sul tavolo', () => {
  const coperti = [{ id: 'a' }, { id: 'b' }];
  assert.deepEqual(destinazioneEffettiva({ tipo: 'coperto', copertoId: 'x' }, coperti), { tipo: 'tavolo' });
  assert.deepEqual(destinazioneEffettiva({ tipo: 'diviso', copertoIds: ['x', 'b'] }, coperti), { tipo: 'coperto', copertoId: 'b' });
  assert.deepEqual(destinazioneEffettiva({ tipo: 'diviso', copertoIds: ['b', 'a'] }, coperti), { tipo: 'diviso', copertoIds: ['a', 'b'] });
});

test('testo del destinatario', () => {
  const { s } = scenario();
  assert.equal(testoDestinazione(s.righe[0].destinazione, s.coperti), 'Tavolo');
  assert.equal(testoDestinazione(s.righe[1].destinazione, s.coperti), 'Marco');
  assert.equal(testoDestinazione(s.righe[2].destinazione, s.coperti), 'Diviso: Marco, Anna, 3');
});

test('chiusura: per coperto serve tutto pagato, alla romana tutti i pagamenti', () => {
  const { s } = scenario();
  assert.equal(puoChiudere(s).richiedeConferma, true);
  s.modalitaConto = 'coperto';
  assert.equal(puoChiudere(s).ok, false);
  s.coperti.forEach((c) => { c.pagato = true; });
  assert.equal(puoChiudere(s).ok, true);
  s.modalitaConto = 'romana';
  s.personeRomana = 3;
  s.pagamentiRomana = 2;
  assert.equal(puoChiudere(s).ok, false);
  s.pagamentiRomana = 3;
  assert.equal(puoChiudere(s).ok, true);
});

test('aggiungere lo stesso piatto incrementa solo righe in attesa senza nota', () => {
  const s = creaServizio('t', 2);
  const p = { id: 'p', nome: 'P', prezzoCent: 100 };
  aggiungiPiatto(s, p, { tipo: 'tavolo' }, 0);
  aggiungiPiatto(s, p, { tipo: 'tavolo' }, 0);
  assert.equal(s.righe.length, 1);
  s.righe[0].nota = 'senza sale';
  aggiungiPiatto(s, p, { tipo: 'tavolo' }, 0);
  assert.equal(s.righe.length, 2);
  chiamaUscita(s, 0);
  aggiungiPiatto(s, p, { tipo: 'tavolo' }, 0);
  assert.equal(s.righe.length, 3);
  aggiungiPiatto(s, p, { tipo: 'tavolo' }, 1);
  assert.equal(s.righe.length, 4);
});
