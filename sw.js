// HGWS – minimális service worker: telepíthető alkalmazás + offline üzenet.
// Szándékosan NEM gyorsítótáraz semmit az oldalból (a ?v= verziózás így érintetlen marad).
const OFF = 'hgws-offline-v1';
self.addEventListener('install', e => { e.waitUntil(caches.open(OFF).then(c => c.addAll(['offline.html', 'img/logo.webp']))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== OFF).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return;               // csak oldalbetöltés: hálózat, ha nincs net → offline oldal
  e.respondWith(fetch(e.request).catch(() => caches.match('offline.html')));
});
