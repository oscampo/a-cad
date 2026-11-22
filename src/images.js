// Imagenes del dibujo: un rectangulo del modelo (x, y esquina inferior izquierda; w, h) con una foto o un esquema.
// Los bytes van aparte, en doc.assets ({ clave: dataURL }), con la clave sacada del contenido: dos imagenes iguales
// comparten los datos, y el historial de deshacer no copia los datos en cada paso (ver main.js: snapshot y unsnap).
// Al guardar solo van los datos que alguna imagen usa. Sin DOM.
import { nextId } from './model.js';

export const IMG_MAX = 1600; // lado mayor, en pixeles, con que se guarda una imagen (se reduce al insertarla)

// FNV-1a de 32 bits sobre la cadena (para un dataURL de ~1 MB tarda pocos ms)
export function hashStr(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36) + s.length.toString(36);
}

export function addImage(doc, src, x, y, w, h) {
  const a = 'a' + hashStr(src);
  (doc.assets ||= {})[a] = src;
  const id = nextId(doc, 'im');
  (doc.images ||= {})[id] = { x, y, w, h, a, ...(doc.curLayer && doc.layers?.[doc.curLayer] ? { layer: doc.curLayer } : {}) }; // en la capa actual, como lo demas
  return id;
}

export const imageSrc = (doc, im) => doc.assets?.[im?.a] || null;

// Copia para guardar: solo los datos que alguna imagen usa (los de imagenes borradas se quedan en memoria para deshacer)
export function docForSave(doc) {
  if (!doc.assets) return doc;
  const used = new Set(Object.values(doc.images || {}).map((im) => im.a));
  const assets = Object.fromEntries(Object.entries(doc.assets).filter(([k]) => used.has(k)));
  const out = { ...doc };
  if (Object.keys(assets).length) out.assets = assets; else delete out.assets;
  return out;
}

// Para el historial: el dibujo sin los datos de las imagenes (no cambian: se reponen con unsnap)
export function withoutAssets(doc) {
  if (!doc.assets) return doc;
  const { assets, ...rest } = doc; // eslint-disable-line no-unused-vars
  return rest;
}
export function unsnap(text, assets) {
  const d = JSON.parse(text);
  if (assets && !d.assets) d.assets = assets;
  else if (assets) d.assets = { ...assets, ...d.assets };
  return d;
}

// Tamaño al reducir: el lado mayor a lo sumo IMG_MAX
export function fitPixels(w, h, max = IMG_MAX) {
  const k = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

// Redimensionar con la proporcion de la imagen: o el rectangulo original, M el modo (l, r, t, b), y la propuesta libre
export function keepAspect(o, M, p) {
  const r = o.w / o.h;
  let { x, y, w, h } = p;
  if (M.l || M.r) h = w / r; else w = h * r;
  if (M.l) x = o.x + o.w - w;
  if (M.b) y = o.y + o.h - h;
  return { x, y, w, h };
}
