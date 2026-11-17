// Guardar y abrir dibujos (.json) en un repositorio de GitHub mediante la API de contenidos.
// Sin servidor propio: el navegador habla directo con api.github.com (permite CORS) usando un token de acceso
// personal de grano fino con permiso "Contents: read and write" sobre UN repositorio. El token vive solo en el
// navegador de cada dispositivo (localStorage) y nunca entra en el archivo del dibujo.

const API = 'https://api.github.com';
const CFG_KEY = 'ipad-cad-gh', SHA_KEY = 'ipad-cad-gh-sha';

export class GhError extends Error {
  constructor(msg, status) { super(msg); this.status = status; }
}

const jget = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };

export const loadCfg = () => ({ repo: '', branch: 'main', dir: 'dibujos', token: '', ...jget(CFG_KEY, {}) });
export const saveCfg = (c) => jset(CFG_KEY, c);
export const clearCfg = () => { try { localStorage.removeItem(CFG_KEY); localStorage.removeItem(SHA_KEY); } catch (e) { /* sin almacenamiento */ } };
export const isReady = (c) => /^[\w.-]+\/[\w.-]+$/.test(c.repo || '') && !!c.token;

// Ultima version conocida (sha del blob) de cada archivo, para avisar si otro dispositivo lo cambio.
const shaKey = (c, path) => `${c.repo}@${c.branch}:${path}`;
export const knownSha = (c, path) => jget(SHA_KEY, {})[shaKey(c, path)] || null;
export const rememberSha = (c, path, sha) => { const m = jget(SHA_KEY, {}); m[shaKey(c, path)] = sha; jset(SHA_KEY, m); };

export const cleanDir = (d) => String(d || '').split('/').map((s) => s.trim()).filter(Boolean).join('/');
export const filePath = (c, name) => [cleanDir(c.dir), name].filter(Boolean).join('/');
const enc = (p) => p.split('/').map(encodeURIComponent).join('/');

export function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function call(c, method, url, body, accept = 'application/vnd.github+json', f = fetch) {
  let r;
  try {
    r = await f(url, {
      method, cache: 'no-store', // la API deja cachear 60 s: no queremos un sha viejo
      headers: { Authorization: 'Bearer ' + c.token, Accept: accept, 'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) { throw new GhError('Sin conexión con GitHub', 0); }
  if (r.ok) return r;
  let msg = '';
  try { msg = (await r.json()).message || ''; } catch (e) { /* sin cuerpo */ }
  if (r.status === 401) throw new GhError('El token no es válido o venció', 401);
  if (r.status === 403) throw new GhError('GitHub rechazó la operación (permisos del token o límite de uso)' + (msg ? ': ' + msg : ''), 403);
  if (r.status === 404) throw new GhError('No se encontró (revisa repositorio, rama y que el token tenga acceso)', 404);
  if (r.status === 409 || r.status === 422) throw new GhError('Conflicto: el archivo cambió en GitHub', r.status);
  throw new GhError(`GitHub respondió ${r.status}` + (msg ? ': ' + msg : ''), r.status);
}

// Papelera y archivo de metadatos (protegidos) viven dentro de la carpeta configurada; el segundo no se lista como dibujo.
export const TRASH = '_papelera', META = '_ipad-cad.json';
const join = (...p) => p.filter(Boolean).join('/');
export const dirPath = (c, sub = '') => join(cleanDir(c.dir), sub);

// Lista los .json de la carpeta configurada, o de su subcarpeta sub ('' o TRASH) ([] si la carpeta aun no existe).
export async function list(c, sub = '', f = fetch) {
  const dir = dirPath(c, sub);
  const url = `${API}/repos/${c.repo}/contents${dir ? '/' + enc(dir) : ''}?ref=${encodeURIComponent(c.branch)}`;
  let r;
  try { r = await call(c, 'GET', url, null, undefined, f); } catch (e) { if (e.status === 404) { await call(c, 'GET', `${API}/repos/${c.repo}`, null, undefined, f); return []; } throw e; }
  const j = await r.json();
  if (!Array.isArray(j)) return [];
  return j.filter((x) => x.type === 'file' && /\.json$/i.test(x.name) && x.name !== META).map((x) => ({ name: x.name, sha: x.sha, size: x.size })).sort((a, b) => a.name.localeCompare(b.name));
}

// sha actual del archivo en la rama, o null si no existe.
export async function currentSha(c, path, f = fetch) {
  try {
    const r = await call(c, 'GET', `${API}/repos/${c.repo}/contents/${enc(path)}?ref=${encodeURIComponent(c.branch)}`, null, undefined, f);
    const j = await r.json();
    return j.sha || null;
  } catch (e) { if (e.status === 404) return null; throw e; }
}

export async function read(c, path, f = fetch) {
  const r = await call(c, 'GET', `${API}/repos/${c.repo}/contents/${enc(path)}?ref=${encodeURIComponent(c.branch)}`, null, 'application/vnd.github.raw+json', f);
  return r.text();
}

// Crea o actualiza (con sha) un archivo; devuelve el sha nuevo.
export async function write(c, path, text, message, sha, f = fetch) {
  const r = await call(c, 'PUT', `${API}/repos/${c.repo}/contents/${enc(path)}`, { message, content: toBase64(text), branch: c.branch, ...(sha ? { sha } : {}) }, undefined, f);
  const j = await r.json();
  return j.content?.sha || null;
}

// Borra un archivo (queda en el historial de git, pero no se puede recuperar desde la app).
export async function remove(c, path, sha, message, f = fetch) {
  await call(c, 'DELETE', `${API}/repos/${c.repo}/contents/${enc(path)}`, { message, sha, branch: c.branch }, undefined, f);
}

// Nombre que no choca con los de taken: «a.json» -> «a (2).json»; con tag («copia»): «a copia.json», «a copia (2).json».
export function uniqueName(name, taken, tag = '') {
  const set = new Set(taken), m = /^(.*?)(\.json)$/i.exec(name), base = m ? m[1] : name, ext = m ? m[2] : '';
  const first = tag ? `${base} ${tag}${ext}` : name;
  if (!set.has(first)) return first;
  for (let i = 2; ; i++) { const n = `${tag ? base + ' ' + tag : base} (${i})${ext}`; if (!set.has(n)) return n; }
}

// Fecha del ultimo cambio de un archivo (la lista de contenidos no la trae: se pide el ultimo commit que lo toco). Se recuerda por sha,
// asi solo se vuelve a pedir si el archivo cambia. Un archivo movido o renombrado cuenta desde el movimiento (es un archivo nuevo en git).
const DATE_KEY = 'ipad-cad-gh-dates', DATE_MAX = 400;
export async function fileDate(c, path, sha, f = fetch) {
  const k = `${c.repo}@${c.branch}:${path}:${sha}`, m = jget(DATE_KEY, {});
  if (m[k]) return m[k];
  const r = await call(c, 'GET', `${API}/repos/${c.repo}/commits?sha=${encodeURIComponent(c.branch)}&path=${encodeURIComponent(path)}&per_page=1`, null, undefined, f);
  const j = await r.json(), cm = Array.isArray(j) ? j[0]?.commit : null;
  const d = cm?.committer?.date || cm?.author?.date || null;
  if (d) { m[k] = d; const ks = Object.keys(m); for (const x of ks.slice(0, Math.max(0, ks.length - DATE_MAX))) delete m[x]; jset(DATE_KEY, m); }
  return d;
}
export const cachedDate = (c, path, sha) => jget(DATE_KEY, {})[`${c.repo}@${c.branch}:${path}:${sha}`] || null;

// Copia un archivo a otra ruta (falla si el destino ya existe); devuelve el sha del nuevo.
export async function copyFile(c, from, to, f = fetch) {
  if (await currentSha(c, to, f)) throw new GhError('Ya existe un archivo con ese nombre', 409);
  const text = await read(c, from, f);
  return write(c, to, text, `ipad-cad: copia ${from} -> ${to}`, null, f);
}

// Mueve (o renombra) un archivo: primero crea el destino y luego borra el original, asi un fallo a medias deja una copia de mas, nunca una perdida.
export async function moveFile(c, from, to, f = fetch) {
  const fromSha = await currentSha(c, from, f);
  if (!fromSha) throw new GhError('El archivo ya no está en GitHub', 404);
  const sha = await copyFile(c, from, to, f);
  try { await remove(c, from, fromSha, `ipad-cad: mover ${from} -> ${to}`, f); }
  catch (e) { throw new GhError(`Se creó «${to}» pero no se pudo borrar el original «${from}»: ${e.message}`, e.status); }
  return sha;
}

// Metadatos compartidos por todos los dispositivos: { protected: [rutas relativas a la carpeta] }.
export async function loadMeta(c, f = fetch) {
  const path = dirPath(c, META), sha = await currentSha(c, path, f);
  if (!sha) return { meta: { protected: [] }, sha: null };
  let j = {}; try { j = JSON.parse(await read(c, path, f)); } catch (e) { /* archivo danado: se rehace */ }
  return { meta: { ...j, protected: Array.isArray(j.protected) ? j.protected : [] }, sha };
}
// Lee, aplica fn(meta) y escribe; si otro dispositivo lo cambio en medio, reintenta con lo nuevo.
export async function updateMeta(c, fn, f = fetch) {
  for (let i = 0; ; i++) {
    const { meta, sha } = await loadMeta(c, f);
    const next = fn(meta) || meta;
    try { await write(c, dirPath(c, META), JSON.stringify(next, null, 1), 'ipad-cad: metadatos', sha, f); return next; }
    catch (e) { if (i >= 2 || (e.status !== 409 && e.status !== 422)) throw e; }
  }
}
