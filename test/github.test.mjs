// Capa de GitHub (src/github.js) contra un GitHub falso en memoria: la API de contenidos (listar, leer, crear/actualizar con sha, borrar).
import assert from 'node:assert/strict';
import * as gh from '../src/github.js';

let passed = 0;
const t = async (name, fn) => { await fn(); passed++; console.log('ok  ' + name); };

function fakeGitHub(initial = {}) {
  const files = new Map(Object.entries(initial)), log = [];
  let n = 0;
  const shaOf = () => 'sha' + ++n;
  const store = new Map([...files].map(([k, v]) => [k, { text: v, sha: shaOf() }]));
  const res = (status, body, raw) => ({ ok: status < 300, status, json: async () => body, text: async () => raw ?? JSON.stringify(body) });
  const f = async (url, o = {}) => {
    const u = new URL(url), m = o.method || 'GET';
    const m2 = /^\/repos\/([^/]+\/[^/]+)(?:\/contents\/?(.*))?$/.exec(u.pathname);
    if (!m2) return res(404, { message: 'Not Found' });
    const path = decodeURIComponent(m2[2] || '');
    log.push(m + ' ' + path);
    if (m2[2] === undefined) return res(200, {});
    if (m === 'GET') {
      if (store.has(path)) { const e = store.get(path); return /raw/.test(o.headers.Accept) ? res(200, null, e.text) : res(200, { type: 'file', name: path.split('/').pop(), sha: e.sha, size: e.text.length }); }
      const pre = path ? path + '/' : '', items = new Map();
      for (const [k, e] of store) if (k.startsWith(pre)) { const rest = k.slice(pre.length), i = rest.indexOf('/'); if (i < 0) items.set(rest, { type: 'file', name: rest, sha: e.sha, size: e.text.length }); else items.set(rest.slice(0, i), { type: 'dir', name: rest.slice(0, i) }); }
      return items.size ? res(200, [...items.values()]) : res(404, { message: 'Not Found' });
    }
    const body = JSON.parse(o.body);
    if (m === 'PUT') {
      const cur = store.get(path);
      if (cur && cur.sha !== body.sha) return res(422, { message: 'sha does not match' });
      if (!cur && body.sha) return res(422, { message: 'sha given but file missing' });
      const sha = shaOf(); store.set(path, { text: Buffer.from(body.content, 'base64').toString('utf8'), sha });
      return res(200, { content: { sha } });
    }
    if (m === 'DELETE') {
      const cur = store.get(path);
      if (!cur) return res(404, { message: 'Not Found' });
      if (cur.sha !== body.sha) return res(409, { message: 'sha does not match' });
      store.delete(path); return res(200, {});
    }
    return res(405, {});
  };
  return { f, store, log, paths: () => [...store.keys()].sort() };
}
const C = { repo: 'u/r', branch: 'main', dir: 'dibujos', token: 'x' };

await t('listar: solo .json de la carpeta, sin la papelera ni los metadatos', async () => {
  const g = fakeGitHub({ 'dibujos/a.json': '1', 'dibujos/b.JSON': '22', 'dibujos/nota.txt': 'x', 'dibujos/_ipad-cad.json': '{}', 'dibujos/_papelera/c.json': '3' });
  assert.deepEqual((await gh.list(C, '', g.f)).map((x) => x.name), ['a.json', 'b.JSON']);
  assert.deepEqual((await gh.list(C, gh.TRASH, g.f)).map((x) => x.name), ['c.json']);
  assert.deepEqual(await gh.list(C, 'no-existe', g.f), []);
});

await t('uniqueName: no choca con los existentes', () => {
  assert.equal(gh.uniqueName('a.json', ['b.json']), 'a.json');
  assert.equal(gh.uniqueName('a.json', ['a.json']), 'a (2).json');
  assert.equal(gh.uniqueName('a.json', ['a.json', 'a (2).json']), 'a (3).json');
  assert.equal(gh.uniqueName('a.json', ['a.json'], 'copia'), 'a copia.json');
  assert.equal(gh.uniqueName('a.json', ['a copia.json'], 'copia'), 'a copia (2).json');
});

await t('moverArchivo: crea el destino y borra el original; mismo contenido', async () => {
  const g = fakeGitHub({ 'dibujos/a.json': '{"x":"ñ π"}' });
  await gh.moveFile(C, 'dibujos/a.json', 'dibujos/_papelera/a.json', g.f);
  assert.deepEqual(g.paths(), ['dibujos/_papelera/a.json']);
  assert.equal(g.store.get('dibujos/_papelera/a.json').text, '{"x":"ñ π"}');
});

await t('moverArchivo: si el destino existe no toca nada', async () => {
  const g = fakeGitHub({ 'dibujos/a.json': 'A', 'dibujos/b.json': 'B' });
  await assert.rejects(() => gh.moveFile(C, 'dibujos/a.json', 'dibujos/b.json', g.f), /Ya existe/);
  assert.deepEqual(g.paths(), ['dibujos/a.json', 'dibujos/b.json']);
  assert.equal(g.store.get('dibujos/b.json').text, 'B');
});

await t('moverArchivo: si falla el borrado queda la copia y el mensaje lo dice (nunca se pierde)', async () => {
  const g = fakeGitHub({ 'dibujos/a.json': 'A' });
  const f = async (url, o = {}) => (o.method === 'DELETE' ? { ok: false, status: 500, json: async () => ({ message: 'boom' }) } : g.f(url, o));
  await assert.rejects(() => gh.moveFile(C, 'dibujos/a.json', 'dibujos/z.json', f), /Se creó «dibujos\/z.json» pero no se pudo borrar/);
  assert.deepEqual(g.paths(), ['dibujos/a.json', 'dibujos/z.json']);
});

await t('moverArchivo: si el original cambio mientras se movia, no lo borra', async () => {
  const g = fakeGitHub({ 'dibujos/a.json': 'A' });
  const f = async (url, o = {}) => { if (o.method === 'DELETE') g.store.get('dibujos/a.json').sha = 'otro'; return g.f(url, o); };
  await assert.rejects(() => gh.moveFile(C, 'dibujos/a.json', 'dibujos/z.json', f));
  assert.ok(g.store.has('dibujos/a.json'));
});

await t('copiarArchivo y borrar', async () => {
  const g = fakeGitHub({ 'dibujos/a.json': 'A' });
  await gh.copyFile(C, 'dibujos/a.json', 'dibujos/a copia.json', g.f);
  assert.deepEqual(g.paths(), ['dibujos/a copia.json', 'dibujos/a.json']);
  const sha = await gh.currentSha(C, 'dibujos/a copia.json', g.f);
  await gh.remove(C, 'dibujos/a copia.json', sha, 'x', g.f);
  assert.deepEqual(g.paths(), ['dibujos/a.json']);
  await assert.rejects(() => gh.remove(C, 'dibujos/a.json', 'viejo', 'x', g.f), /Conflicto/);
});

await t('metadatos: protegidos, con reintento si otro dispositivo escribio en medio', async () => {
  const g = fakeGitHub({});
  assert.deepEqual((await gh.loadMeta(C, g.f)).meta.protected, []);
  await gh.updateMeta(C, (m) => { m.protected = ['a.json']; }, g.f);
  assert.deepEqual((await gh.loadMeta(C, g.f)).meta.protected, ['a.json']);
  let once = true;
  const f = async (url, o = {}) => { if (o.method === 'PUT' && once && /_ipad-cad/.test(url)) { once = false; g.store.get('dibujos/_ipad-cad.json').sha = 'cambio'; } return g.f(url, o); };
  await gh.updateMeta(C, (m) => { m.protected = [...m.protected, 'b.json']; }, f);
  assert.deepEqual((await gh.loadMeta(C, g.f)).meta.protected, ['a.json', 'b.json']);
  g.store.set('dibujos/_ipad-cad.json', { text: '{ roto', sha: 's' });
  assert.deepEqual((await gh.loadMeta(C, g.f)).meta.protected, []);
});

console.log(`\n${passed} pruebas de GitHub pasaron`);
