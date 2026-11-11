import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCent, formatEuro, parseCent } from '../js/lib/money.js';

test('formatta i centesimi in formato italiano', () => {
  assert.equal(formatCent(1300), '13,00');
  assert.equal(formatCent(5), '0,05');
  assert.equal(formatEuro(123450), '€ 1.234,50');
  assert.throws(() => formatCent(1.5));
});

test('converte il testo in centesimi interi', () => {
  assert.equal(parseCent('13'), 1300);
  assert.equal(parseCent('13,5'), 1350);
  assert.equal(parseCent('13,50'), 1350);
  assert.equal(parseCent('13.50'), 1350);
  assert.equal(parseCent('1.234,50'), 123450);
  assert.equal(parseCent('€ 2,00'), 200);
  assert.equal(parseCent('0,10'), 10);
  assert.equal(parseCent('abc'), null);
  assert.equal(parseCent('1,234'), null);
  assert.equal(parseCent(''), null);
});
