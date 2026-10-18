/* sw.js — der "Service Worker".
   Er legt die App-Dateien im Gerät ab, damit die App auch ohne Internet
   startet (z. B. im Keller-Gym ohne Empfang).

   Wichtig: Deine Trainingsdaten liegen NICHT hier, sondern in der
   Datenbank (IndexedDB). Der Service Worker speichert nur die App selbst. */

const CACHE = 'fitness-app-v4';

const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/util.js',
  './js/icons.js',
  './js/seed.js',
  './js/db.js',
  './js/logic.js',
  './js/ui.js',
  './js/timer.js',
  './js/chart.js',
  './js/screen-home.js',
  './js/screen-workout.js',
  './js/screen-progress.js',
  './js/screen-plan.js',
  './js/screen-settings.js',
  './js/app.js',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // einzeln hinzufügen: eine fehlende Datei soll nicht alles scheitern lassen
      .then((cache) => Promise.all(FILES.map((f) => cache.add(f).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  /* Zuerst aus dem Speicher antworten (schnell und offline sicher),
     im Hintergrund die neue Fassung holen. Beim nächsten Start ist
     dann automatisch die aktuelle Version da. */
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req).then((cached) => {
        const fresh = fetch(req).then((res) => {
          if (res && res.status === 200 && res.type === 'basic') cache.put(req, res.clone());
          return res;
        }).catch(() => null);

        if (cached) return cached;
        return fresh.then((res) => res || cache.match('./index.html'));
      })
    )
  );
});
