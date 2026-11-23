// Datos binarios del dispositivo (hoy audio; despues imagenes, tablas...): una carpeta comun a todos los dibujos, junto a los de texto de
// wfile/rfile (datastore.js). En memoria, para que el calculo siga siendo sincrono; la persistencia (IndexedDB, ver blobdb.js) la pone main.js
// con setBlobSink. Cada dato: { kind: 'audio', url: dataURL, ms, a: hash del contenido, at }. Sin DOM.
//
// Un dibujo lleva consigo (incrustados al guardar) los datos que LEE por nombre, y al abrirlo los restaura si faltan en el dispositivo
// (embedBlobs / takeEmbedded); nunca pisa uno que ya existe con ese nombre.
import { addSound, soundName } from './sounds.js';
import { hashStr } from './images.js';

const m = new Map();
let sink = null;
export const setBlobSink = (s) => { sink = s; }; // { put(name, entry), del(name) }: lo que persiste los cambios
export const blobGet = (name) => m.get(name) ?? null;
export const blobHas = (name, kind) => m.has(name) && (!kind || m.get(name).kind === kind);
export const blobEntries = () => [...m].sort((a, b) => a[0].localeCompare(b[0], 'es'));
export function blobPut(name, e, persist = true) {
  const entry = { ...e, a: e.a || (e.kind === 'audio' ? 's' : 'b') + hashStr(e.url), at: e.at || Date.now() };
  m.set(name, entry);
  if (persist) sink?.put(name, entry);
  return entry;
}
export function blobDel(name) { if (m.delete(name)) sink?.del(name); }
// Lo que ya estaba guardado en el dispositivo (al arrancar): no pisa lo que ya llego a memoria
export function blobLoad(entries) { for (const [n, e] of entries) if (!m.has(n)) m.set(n, e); }
export const blobClear = () => m.clear(); // solo para las pruebas

// Los nombres que un dibujo menciona entre comillas en sus textos o en las funciones de sus bibliotecas ("warp" o 'warp'): lo que lee por nombre.
// Un nombre que se arma con una variable (play(n)) no se detecta: ese dato no viaja con el dibujo.
export function referencedBlobs(doc, names = [...m.keys()]) {
  const parts = [];
  for (const t of Object.values(doc.texts || {})) { parts.push(String(t.text ?? '')); for (const d of t.lib?.defs || []) parts.push(String(d.expr ?? '')); }
  const hay = parts.join('\n');
  return names.filter((n) => hay.includes(`"${n}"`) || hay.includes(`'${n}'`));
}
// Una copia del dibujo con los datos que lee incrustados (doc.sounds y doc.assets, el mismo formato de siempre): para guardar
export function embedBlobs(doc) {
  const names = referencedBlobs(doc).filter((n) => m.get(n).kind === 'audio');
  if (!names.length) return doc;
  const out = { ...doc };
  if (out.assets) out.assets = { ...out.assets };
  if (out.sounds) out.sounds = { ...out.sounds };
  for (const n of names) { const e = m.get(n); addSound(out, n, e.url, { ms: e.ms }); }
  return out;
}
// Al abrir un dibujo: saca de el lo incrustado y lo devuelve ([{ name, url, ms, a }]); en memoria el dibujo no lleva datos binarios
export function takeEmbedded(doc) {
  const out = [];
  for (const [name, s] of Object.entries(doc.sounds || {})) {
    const url = doc.assets?.[s.a];
    if (!url) continue;
    try { soundName(name); } catch { continue; }
    out.push({ name, url, ms: s.ms || 0, a: s.a });
  }
  if (doc.assets) for (const e of out) delete doc.assets[e.a];
  if (doc.assets && !Object.keys(doc.assets).length) delete doc.assets;
  delete doc.sounds;
  return out;
}
// Lo incrustado que faltaba en el dispositivo pasa a la carpeta de datos; si ya hay uno distinto con ese nombre, queda el del dispositivo.
// Devuelve { added: [nombres], differs: [nombres] }
export function restoreEmbedded(list) {
  const added = [], differs = [];
  for (const e of list) {
    const cur = m.get(e.name);
    if (!cur) { blobPut(e.name, { kind: 'audio', url: e.url, ms: e.ms, a: e.a }); added.push(e.name); }
    else if (cur.a !== e.a) differs.push(e.name);
  }
  return { added, differs };
}
