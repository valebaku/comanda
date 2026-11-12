// Verifica che l'app pubblicata (GitHub Pages) sia completa e utilizzabile.
//
//   node scripts/verifica-pages.cjs [url]
//
// Default: https://valebaku.github.io/comanda/
// Controlla: ogni file elencato in sw.js risponde 200 ed è identico a quello locale
// (quindi la pubblicazione corrisponde a questo checkout), l'app si avvia in Chromium
// senza errori, la Sala si disegna, il service worker si registra e l'app
// si ricarica offline. Richiede Playwright (già presente negli ambienti cloud).
// Esce con codice 1 se qualcosa non va.

const fs = require('fs');
const path = require('path');

const URL_APP = (process.argv[2] || 'https://valebaku.github.io/comanda/').replace(/\/?$/, '/');
const radice = path.join(__dirname, '..');
const problemi = [];
const ok = (m) => console.log('  ✔', m);
const ko = (m) => { console.log('  ✘', m); problemi.push(m); };

async function controllaFile(richieste) {
  console.log(`File pubblicati (${URL_APP})`);
  const sw = fs.readFileSync(path.join(radice, 'sw.js'), 'utf8');
  const file = [...sw.matchAll(/'\.\/([^']*)'/g)].map((m) => m[1]).filter((f) => f && !f.endsWith('/'));
  let diversi = 0;
  for (const f of file) {
    const res = await richieste.get(URL_APP + f, { headers: { 'Cache-Control': 'no-cache' } });
    if (res.status() !== 200) { ko(`${f}: HTTP ${res.status()}`); continue; }
    const remoto = await res.body();
    const locale = fs.readFileSync(path.join(radice, f));
    if (!remoto.equals(locale)) { diversi++; console.log(`  ~ ${f}: diverso dalla versione locale`); }
  }
  if (diversi) ko(`${diversi} file pubblicati non coincidono con questo checkout (pubblicazione non aggiornata?)`);
  else if (!problemi.length) ok(`${file.length} file presenti e identici al checkout locale`);
}

async function controllaBrowser(ctx) {
  console.log('Avvio in Chromium');
  const page = await ctx.newPage();
  const errori = [];
  page.on('pageerror', (e) => errori.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errori.push(m.text()); });
  page.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(URL_APP)) errori.push(`HTTP ${r.status()} ${r.url()}`); });
  try {
    await page.goto(URL_APP, { waitUntil: 'load' });
    await page.waitForSelector('#app .card-tavolo, #app .vuoto', { timeout: 10000 });
    ok(`Sala visibile (hash ${await page.evaluate(() => location.hash)})`);
    const segnaposto = await page.locator('.segnaposto').count();
    if (segnaposto) ko('La Sala mostra ancora un segnaposto: è pubblicata una versione incompleta');

    const sw = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return 'non supportato';
      const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 8000))]);
      return reg ? reg.scope : null;
    });
    if (sw && sw !== 'non supportato') ok(`Service worker attivo (scope ${sw})`);
    else ko('Service worker non registrato: niente uso offline');

    if (sw) {
      await page.reload();
      await page.waitForTimeout(500);
      await ctx.setOffline(true);
      await page.reload().catch(() => {});
      const offline = await page.waitForSelector('#app .card-tavolo, #app .vuoto', { timeout: 5000 }).then(() => true).catch(() => false);
      offline ? ok('Si ricarica anche offline') : ko('Offline la pagina non si carica');
      await ctx.setOffline(false);
    }
  } catch (e) {
    ko(`Avvio fallito: ${e.message.split('\n')[0]}`);
  }
  errori.length ? ko(`Errori nella pagina: ${errori.join(' | ')}`) : ok('Nessun errore in console');
}

(async () => {
  const { chromium } = require('playwright');
  // Negli ambienti cloud il traffico passa da un proxy (variabile HTTPS_PROXY).
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
  const browser = await chromium.launch({ proxy });
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, ignoreHTTPSErrors: !!proxy });
  await controllaFile(ctx.request);
  await controllaBrowser(ctx);
  await browser.close();
  console.log(problemi.length ? `\nNON OK: ${problemi.length} problemi` : '\nOK: l’app pubblicata è completa e utilizzabile');
  process.exit(problemi.length ? 1 : 0);
})();
