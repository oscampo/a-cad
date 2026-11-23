// Persistencia de los datos binarios (blobs.js) en IndexedDB del navegador: un almacen «blobs» con clave = nombre.
// Todo con promesas; si IndexedDB no esta (o falla) los datos siguen en memoria durante la sesion y viajan incrustados en el dibujo.
const DB = 'acad-data', STORE = 'blobs';
let dbp = null;
function open() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    if (typeof indexedDB === 'undefined') return rej(new Error('sin IndexedDB'));
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { r.result.createObjectStore(STORE); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error || new Error('no se pudo abrir IndexedDB'));
  });
  return dbp;
}
const tx = (mode, fn) => open().then((db) => new Promise((res, rej) => {
  const t = db.transaction(STORE, mode), out = fn(t.objectStore(STORE));
  t.oncomplete = () => res(out?.result ?? out);
  t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error('transaccion cancelada'));
}));
// Todo lo guardado: [[nombre, dato]]
export async function loadAllBlobs() {
  const db = await open();
  return new Promise((res, rej) => {
    const out = [], c = db.transaction(STORE, 'readonly').objectStore(STORE).openCursor();
    c.onsuccess = () => { const cur = c.result; if (cur) { out.push([cur.key, cur.value]); cur.continue(); } else res(out); };
    c.onerror = () => rej(c.error);
  });
}
export const putBlob = (name, entry) => tx('readwrite', (s) => s.put(entry, name));
export const delBlob = (name) => tx('readwrite', (s) => s.delete(name));
