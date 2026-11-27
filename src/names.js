// Nombres de usuario de los elementos (puntos, lineas, circulos, arcos, elipses, splines, grupos, contornos): un elemento se puede llamar por el nombre que se le pone, no solo por su id
// (p12, l3, g3, k7). Sin DOM y sin importar nada (lo leen expr.js, geo.js, params.js y tvars.js). El nombre es un identificador («Pinion», «ini», «eje2») o uno con
// subindice («p_(ini)», «iso_1»); no puede parecer un id (p12) y debe ser unico entre los elementos y distinto de cualquier cota, variable de texto, funcion o palabra
// reservada (lo comprueba params.checkElName). El mapa nombre normalizado -> id lo arma geo.geoVars cada vez que se arman las variables del dibujo.

const L = 'A-Za-zα-ωΑ-Ωϑϕϖɛ';
export const ELEM_NAME_RE = new RegExp('^[' + L + '][' + L + '0-9]*(?:_(?:[' + L + '0-9]+|\\([^(){}\\n]+\\)))?$');
export const ID_LIKE = /^(?:[A-Za-z]|im)\d+$/; // los ids: una letra y un numero (p12, l3, k7, g2), o im3 (una imagen)
// ¿Se puede usar de nombre? (la forma; la unicidad la ve checkElName)
export const isValidElName = (raw) => typeof raw === 'string' && ELEM_NAME_RE.test(raw) && !ID_LIKE.test(raw);

// Las colecciones del dibujo cuyos elementos llevan nombre (doc[coleccion][id].name) y como se dice cada una (para los avisos).
export const NAMED = [['pts', 'punto'], ['lines', 'línea'], ['circles', 'círculo'], ['arcs', 'arco'], ['ellipses', 'elipse'], ['splines', 'spline'], ['grps', 'grupo'], ['ctrs', 'contorno']];

let MAP = new Map();
export const setNames = (m) => { MAP = m instanceof Map ? m : new Map(); };
export const nameToId = (n) => MAP.get(n);
export const hasElemName = (n) => MAP.has(n);
export const listNames = () => [...MAP.entries()].sort().flat(); // nombre, id, nombre, id… (para la clave de la memoria de tvars)

// Cambia el nombre `from` por `to` en una formula: la palabra entera, sola o con su propiedad («ini», «ini.x», «p_(fin).y»), fuera de las comillas y sin tocar
// «a.ini» (la propiedad de otra cosa) ni «ini_2» (otro nombre).
export function renameWord(src, from, to) {
  if (!from || from === to) return src;
  const esc = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('(^|[^' + L + '0-9_.])(' + esc + ')(?![' + L + '0-9_])', 'g');
  return String(src).split(/("[^"]*")/).map((part, i) => (i % 2 ? part : part.replace(re, (m, pre) => pre + to))).join('');
}
