import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { hashPin, sha256, pinValido, verificaPin } from '../js/lib/pin.js';

const atteso = (s) => createHash('sha256').update(s).digest('hex');
const hex = (b) => Buffer.from(b).toString('hex');

test('hashPin coincide con SHA-256', async () => {
  for (const pin of ['0000', '1234', '987654']) assert.equal(await hashPin(pin), atteso(pin));
  assert.equal(await verificaPin('1234', atteso('1234')), true);
  assert.equal(await verificaPin('1235', atteso('1234')), false);
});

test('implementazione JS di ripiego identica a quella nativa', () => {
  const casi = ['', '0000', 'abc', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(64), 'x'.repeat(200)];
  for (const s of casi) assert.equal(hex(sha256(new TextEncoder().encode(s))), atteso(s));
});

test('PIN numerico di 4–6 cifre', () => {
  assert.equal(pinValido('1234'), true);
  assert.equal(pinValido('123456'), true);
  assert.equal(pinValido('123'), false);
  assert.equal(pinValido('1234567'), false);
  assert.equal(pinValido('12a4'), false);
});
