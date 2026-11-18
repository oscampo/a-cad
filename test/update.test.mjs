// Actualizacion automatica: ¿hay una compilacion nueva publicada? Y el service worker (sin conexion y sin guardar la API de GitHub).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { assetOf, needsReload, reloadAllowed } from '../src/update.js';

let passed = 0;
const t = async (name, fn) => { await fn(); passed++; console.log('ok  ' + name); };

const page = (name) => `<!doctype html><html><head><script type="module" crossorigin src="./assets/${name}"></script></head><body></body></html>`;

await t('assetOf: saca el nombre del script de la compilacion', () => {
  assert.equal(assetOf(page('index-CO1gA3uc.js')), 'assets/index-CO1gA3uc.js');
  assert.equal(assetOf('./assets/index-a_B-1.js'), 'assets/index-a_B-1.js');
  assert.equal(assetOf('<html>sin script</html>'), null);
  assert.equal(assetOf(undefined), null);
});

await t('needsReload: solo si los dos nombres existen y son distintos', () => {
  assert.equal(needsReload('./assets/index-AAAA.js', page('index-BBBB.js')), true);
  assert.equal(needsReload('./assets/index-AAAA.js', page('index-AAAA.js')), false);
  assert.equal(needsReload(null, page('index-BBBB.js')), false); // modo desarrollo (sin script con hash): nunca recarga
  assert.equal(needsReload('./assets/index-AAAA.js', '<html>error 404</html>'), false); // la respuesta no es la pagina
});

await t('reloadAllowed: como mucho una recarga automatica cada 5 minutos', () => {
  assert.equal(reloadAllowed(0, 1000), true);
  assert.equal(reloadAllowed(undefined, 1000), true);
  assert.equal(reloadAllowed(1000, 1000 + 60 * 1000), false);
  assert.equal(reloadAllowed(1000, 1000 + 6 * 60 * 1000), true);
});

// El service worker se ejecuta en un contexto simulado: eventos, caches y fetch falsos.
function runSW() {
  const handlers = {}, store = new Map(), calls = [];
  const self = {
    location: { origin: 'https://oscampo.github.io' },
    skipWaiting: () => {}, clients: { claim: async () => {} },
    addEventListener: (n, f) => { handlers[n] = f; },
  };
  const cacheApi = {
    keys: async () => ['ipad-cad-v1', 'ipad-cad-v2', 'otra'],
    deleted: [], delete(k) { this.deleted.push(k); return Promise.resolve(true); },
    open: async () => ({ put: async (rq, r) => { store.set(rq.url, r); } }),
    match: async (rq, o) => (typeof rq === 'string' ? store.get('https://oscampo.github.io/ipad-cad/') : store.get(rq.url)),
  };
  let online = true;
  const fetchFake = async (rq, init) => { calls.push({ url: rq.url, init }); if (!online) throw new Error('offline'); return { ok: true, clone() { return this; }, body: 'red' }; };
  const ctx = vm.createContext({ self, caches: cacheApi, fetch: fetchFake, URL, Promise });
  vm.runInContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), ctx);
  const fire = (rq) => { let p = null; handlers.fetch({ request: rq, respondWith: (x) => { p = x; } }); return p; };
  return { handlers, store, calls, cacheApi, fire, setOnline: (v) => { online = v; } };
}

await t('service worker: la navegacion se revalida (no-cache), lo demas va normal, y la API de GitHub no se toca', async () => {
  const sw = runSW();
  const nav = { method: 'GET', mode: 'navigate', url: 'https://oscampo.github.io/ipad-cad/' };
  await sw.fire(nav);
  assert.equal(sw.calls.at(-1).init.cache, 'no-cache');
  const asset = { method: 'GET', mode: 'no-cors', url: 'https://oscampo.github.io/ipad-cad/assets/index-X.js' };
  await sw.fire(asset);
  assert.equal(sw.calls.at(-1).init, undefined);
  const before = sw.calls.length;
  assert.equal(sw.fire({ method: 'GET', mode: 'cors', url: 'https://api.github.com/repos/u/r/contents/dibujos' }), null); // no responde: va directo a la red
  assert.equal(sw.fire({ method: 'PUT', mode: 'cors', url: 'https://oscampo.github.io/ipad-cad/x' }), null);
  assert.equal(sw.calls.length, before);
  assert.ok(!sw.store.has('https://api.github.com/repos/u/r/contents/dibujos'), 'sin copia de la API');
});

await t('service worker: sin conexion sirve la copia local, y al activarse borra las caches viejas', async () => {
  const sw = runSW();
  const nav = { method: 'GET', mode: 'navigate', url: 'https://oscampo.github.io/ipad-cad/' };
  await sw.fire(nav); // se guarda una copia
  await new Promise((r) => setTimeout(r, 0));
  sw.setOnline(false);
  const r = await sw.fire(nav);
  assert.equal(r.body, 'red'); // la copia guardada
  let waited = null; sw.handlers.activate({ waitUntil: (p) => { waited = p; } });
  await waited;
  assert.deepEqual([...sw.cacheApi.deleted].sort(), ['ipad-cad-v1', 'otra']);
});

console.log(`\n${passed} pruebas de actualizacion pasaron`);
