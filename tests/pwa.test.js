import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const radice = new URL('..', import.meta.url).pathname;

function file(dir) {
  return readdirSync(join(radice, dir)).flatMap((n) => {
    const p = join(radice, dir, n);
    return statSync(p).isDirectory() ? file(relative(radice, p)) : [relative(radice, p)];
  });
}

test('il service worker mette in cache tutti i file JS, CSS e le icone', () => {
  const sw = readFileSync(join(radice, 'sw.js'), 'utf8');
  const inCache = new Set([...sw.matchAll(/'\.\/([^']+)'/g)].map((m) => m[1]));
  for (const f of [...file('js'), ...file('css'), ...file('icons')]) {
    assert.ok(inCache.has(f), `${f} manca in FILE_APP di sw.js`);
  }
  for (const f of inCache) assert.ok(statSync(join(radice, f)).isFile(), `${f} in sw.js non esiste`);
});

test('manifest e index usano solo percorsi relativi', () => {
  const manifest = JSON.parse(readFileSync(join(radice, 'manifest.webmanifest'), 'utf8'));
  assert.ok(manifest.start_url.startsWith('./'));
  for (const i of manifest.icons) assert.ok(!i.src.startsWith('/'), i.src);
  const html = readFileSync(join(radice, 'index.html'), 'utf8');
  assert.equal(/(?:href|src)="\/(?!\/)/.test(html), false, 'index.html contiene un percorso assoluto');
});
