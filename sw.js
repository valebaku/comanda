// Service worker: l'app funziona offline dopo la prima apertura.
// - File dell'app: precaricati all'installazione, serviti dalla cache e aggiornati in background.
// - Font Google: salvati in cache al primo utilizzo.
// Quando si modifica un file dell'app, aumentare VERSIONE: i client ricevono la nuova cache.

const VERSIONE = 'comanda-v1.0.0';
const CACHE_FONT = 'comanda-font-v1';

const FILE_APP = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './css/style.css',
  './css/tokens.css',
  './js/app.js',
  './js/lib/conto.js',
  './js/lib/esempio.js',
  './js/lib/money.js',
  './js/lib/ordini.js',
  './js/lib/pin.js',
  './js/lib/ui.js',
  './js/router.js',
  './js/store.js',
  './js/views/admin/dati.js',
  './js/views/admin/impostazioni.js',
  './js/views/admin/index.js',
  './js/views/admin/menu.js',
  './js/views/admin/pin.js',
  './js/views/admin/tavoli.js',
  './js/views/conto.js',
  './js/views/sala.js',
  './js/views/tavolo.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSIONE).then((c) => c.addAll(FILE_APP)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((nomi) => Promise.all(nomi.filter((n) => n !== VERSIONE && n !== CACHE_FONT).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Font e CSS dei font di Google: cache al primo uso, poi dalla cache.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(caches.open(CACHE_FONT).then(async (cache) => {
      const inCache = await cache.match(req);
      const rete = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; }).catch(() => inCache);
      return inCache || rete;
    }));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Navigazioni: sempre la shell (il routing è sull'hash).
  const chiave = req.mode === 'navigate' ? new URL('./index.html', self.registration.scope).href : req;

  // Stale-while-revalidate: risposta immediata dalla cache, aggiornamento in background.
  event.respondWith(caches.open(VERSIONE).then(async (cache) => {
    const inCache = await cache.match(chiave, { ignoreSearch: true });
    const rete = fetch(req).then((res) => {
      if (res.ok) cache.put(chiave, res.clone());
      return res;
    }).catch(() => inCache || Response.error());
    if (inCache) { event.waitUntil(rete.catch(() => {})); return inCache; }
    return rete;
  }));
});
