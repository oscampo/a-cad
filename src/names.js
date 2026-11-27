// Nombres de usuario de los elementos (puntos, grupos, contornos): un elemento se puede llamar por el nombre que se le pone, no solo por su id (p12, g3, k7).
// Sin DOM y sin importar nada (lo leen expr.js, geo.js y params.js). El nombre es un identificador («Pinion», «ini», «eje2») o uno con subindice («p_(ini)», «iso_1»);
// no puede parecer un id (p12) y debe ser unico entre los elementos y distinto de cualquier cota, variable de texto, funcion o palabra reservada (lo comprueba
// params.checkElName). El mapa nombre normalizado -> id lo arma geo.geoVars cada vez que se arman las variables del dibujo.

const L = 'A-Za-zα-ωΑ-Ωϑϕϖɛ';
export const ELEM_NAME_RE = new RegExp('^[' + L + '][' + L + '0-9]*(?:_(?:[' + L + '0-9]+|\\([^(){}\\n]+\\)))?$');
export const ID_LIKE = /^(?:[A-Za-z]|im)\d+$/; // los ids: una letra y un numero (p12, l3, k7, g2), o im3 (una imagen)
// ¿Se puede usar de nombre? (la forma; la unicidad la ve checkElName)
export const isValidElName = (raw) => typeof raw === 'string' && ELEM_NAME_RE.test(raw) && !ID_LIKE.test(raw);

let MAP = new Map();
export const setNames = (m) => { MAP = m instanceof Map ? m : new Map(); };
export const nameToId = (n) => MAP.get(n);
export const hasElemName = (n) => MAP.has(n);
export const listNames = () => [...MAP.entries()].sort().flat(); // nombre, id, nombre, id… (para la clave de la memoria de tvars)
