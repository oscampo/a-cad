// Service worker: uso sin conexion y actualizacion automatica.
// Red primero: la pagina (navegacion) se pide siempre con revalidacion («no-cache», una peticion condicional barata), asi una web app de
// pantalla de inicio no se queda con un index.html viejo por la cache HTTP de GitHub Pages (max-age=600). Sin conexion se usa la copia local.
// Solo se atiende lo del mismo origen: las llamadas a la API de GitHub (con el token del usuario) nunca se guardan en la cache.
const CACHE = 'ipad-cad-v2';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
));

self.addEventListener('fetch', (e) => {
  const rq = e.request;
  if (rq.method !== 'GET' || new URL(rq.url).origin !== self.location.origin) return;
  const fresh = rq.mode === 'navigate' ? fetch(rq, { cache: 'no-cache' }) : fetch(rq);
  e.respondWith(
    fresh.then((r) => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(rq, copy)).catch(() => {}); }
      return r;
    }).catch(() => caches.match(rq, { ignoreSearch: true }).then((r) => r || (rq.mode === 'navigate' ? caches.match('./') : undefined)))
  );
});
