// SmartStyle: cambiar el estilo de una seleccion de cualquier mezcla de elementos. Cada propiedad dice a que tipos de elemento aplica
// (STYLE_PROPS) y se escribe solo en esos: el color llega a lineas, textos y rellenos, pero la fuente o la altura solo al texto.
// Sin DOM: lo prueba test/smartstyle.test.mjs; el panel Estilo de main.js solo lo muestra.
import { leadBody } from './dims.js';
import { CLINE_STYLE } from './shapes.js';

// Tipos de elemento (kind) de una seleccion: 'ln' linea, 'ci' circulo, 'ar' arco, 'el' elipse, 'sp' spline, 'ha' relleno, 'tx' texto,
// 'lead' linea indicativa (su estilo es el de su cuerpo, si lo tiene) y 'trace' el trazado de un punto.
const GRAPHIC = ['ln', 'ci', 'ar', 'el', 'sp', 'lead', 'trace'];
export const STYLE_PROPS = {
  color: [...GRAPHIC, 'ha', 'tx'],
  ltype: GRAPHIC, // el texto no tiene tipo de linea
  w: GRAPHIC,
  ls: GRAPHIC, // escala del patron
  font: ['tx'],
  h: ['tx'], // altura de la letra
};
const DEFAULTS = { color: 'auto', ltype: 'continua', w: 2, ls: 1, font: '' };
const COLL = { ln: 'lines', ci: 'circles', ar: 'arcs', el: 'ellipses', sp: 'splines', ha: 'hatches', tx: 'texts' };
const SHAPES = ['ln', 'ci', 'ar', 'el', 'sp']; // los que se vuelven «constructiva» con su color y grosor

// La seleccion como [{ kind, id, obj }]: lo que no tiene estilo (puntos sueltos, restricciones, cotas) no sale.
export function styleObjects(doc, sel) {
  const out = [];
  for (const s of sel || []) {
    let kind = null, obj = null;
    if (COLL[s.k]) { kind = s.k; obj = doc[COLL[s.k]]?.[s.id]; }
    else if (s.k === 'co') { const c = doc.cons?.[s.id]; if (c?.t === 'LEAD') { kind = 'lead'; obj = leadBody(doc, c) || c; } }
    else if (s.k === 'pt' && doc.traces?.[s.id]) { kind = 'trace'; obj = doc.traces[s.id]; }
    if (obj) out.push({ kind, id: s.id, obj });
  }
  return out;
}

// Los elementos de la seleccion a los que aplica una propiedad.
export const targetsOf = (doc, sel, prop) => styleObjects(doc, sel).filter((t) => STYLE_PROPS[prop]?.includes(t.kind));

// Como esta una propiedad en la seleccion: { n: a cuantos aplica, mixed: no todos la tienen igual, value: la del primero (undefined si n = 0) }.
export function styleState(doc, sel, prop) {
  const ts = targetsOf(doc, sel, prop);
  const vals = ts.map((t) => t.obj[prop] ?? DEFAULTS[prop]);
  return { n: ts.length, mixed: new Set(vals).size > 1, value: vals[0] };
}

// Escribe la propiedad solo en los elementos a los que aplica; devuelve cuantos cambio (0 = nada que deshacer).
export function applyStyleProp(doc, sel, prop, value) {
  const ts = targetsOf(doc, sel, prop);
  for (const t of ts) {
    t.obj[prop] = value;
    if (prop === 'ltype' && value === 'constructiva' && SHAPES.includes(t.kind)) { t.obj.color = CLINE_STYLE.color; t.obj.w = CLINE_STYLE.w; } // convertir a constructiva toma su color y grosor
  }
  return ts.length;
}

// Que tipos hay en la seleccion (para mostrar solo las filas del panel que sirven).
export const kindsOf = (doc, sel) => new Set(styleObjects(doc, sel).map((t) => t.kind));

// ---- Capa: se asigna a lo que la lleva (lineas, circulos, arcos, elipses, splines, rellenos, textos, y de las relaciones solo las cotas y las lineas
// indicativas, en la propia relacion). No es una propiedad de estilo (no cambia lo nuevo que se dibuje: eso es la capa actual).
export function layerObjects(doc, sel) {
  const out = [];
  for (const s of sel || []) {
    let obj = null;
    if (COLL[s.k]) obj = doc[COLL[s.k]]?.[s.id];
    else if (s.k === 'co') { const c = doc.cons?.[s.id]; if (c && (c.v !== undefined || c.t === 'LEAD')) obj = c; }
    if (obj) out.push({ k: s.k, id: s.id, obj });
  }
  return out;
}
// { n: a cuantos aplica, mixed: no todos en la misma capa, value: la del primero ('' = ninguna) }.
export function layerState(doc, sel) {
  const ts = layerObjects(doc, sel), vals = ts.map((t) => (t.obj.layer && doc.layers?.[t.obj.layer] ? t.obj.layer : ''));
  return { n: ts.length, mixed: new Set(vals).size > 1, value: vals[0] };
}
// Asigna la capa (id, o '' para ninguna); devuelve a cuantos. Una capa que no existe no se asigna.
export function applyLayer(doc, sel, id) {
  if (id && !doc.layers?.[id]) return 0;
  const ts = layerObjects(doc, sel);
  for (const t of ts) { if (id) t.obj.layer = id; else delete t.obj.layer; }
  return ts.length;
}
