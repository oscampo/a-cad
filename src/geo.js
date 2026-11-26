// Propiedades de los elementos con la notacion «.»: p12.x es la coordenada x del punto p12. Sin DOM.
// Se leen en cualquier formula (cotas, textos p12.x=, variables, actuadores, graficas) y siempre valen lo que tiene el dibujo ahora.
//   punto:   x, y
//   linea:   len (o L: longitud), ang (angulo de a hacia b, en radianes: vale como un angulo)
//   circulo: r, d (diametro), x, y (centro)
//   arco:    r, x, y (centro)
//   contorno (un grupo, k1): L o len (perimetro: suma de sus elementos), area (solo si forma UNA cadena cerrada) y n (cuantos elementos tiene)
//   spline:  n (cuantos puntos tiene)
import { ctrMembers, arcOf, ellipsePolyline, splinePolyline } from './model.js';
import { ctrState } from './tree.js';
const NAME = /^([A-Za-z]+\d+)\.([A-Za-zα-ωΑ-Ωϑϕϖɛ]\w*)$/;
const num = (v) => ({ v, r: false });
const ang = (v) => ({ v, r: true });

// Los puntos de un elemento de un grupo de contorno, de su inicio a su fin (las lineas y los arcos con exactitud suficiente; arcos a medio grado).
function ctrPoly(doc, it) {
  if (it.k === 'ln') { const l = doc.lines[it.id]; return l && doc.pts[l.a] && doc.pts[l.b] ? [doc.pts[l.a], doc.pts[l.b]] : []; }
  if (it.k === 'ar') {
    const a = doc.arcs[it.id], C = a && doc.pts[a.c]; if (!C || !doc.pts[a.a] || !doc.pts[a.b]) return [];
    const { a0, sweep } = arcOf(doc, a), n = Math.max(4, Math.ceil(Math.abs(sweep) / (Math.PI / 360))), out = [];
    for (let i = 0; i <= n; i++) { const t = a0 + (sweep * i) / n; out.push({ x: C.x + a.r * Math.cos(t), y: C.y + a.r * Math.sin(t) }); }
    return out;
  }
  if (it.k === 'el') { const e = doc.ellipses[it.id]; return e ? ellipsePolyline(doc, e, 360) : []; }
  if (it.k === 'sp') { const sp = doc.splines[it.id]; return sp ? splinePolyline(doc, sp, 32) : []; }
  return [];
}
const plen = (P) => { let s = 0; for (let i = 1; i < P.length; i++) s += Math.hypot(P[i].x - P[i - 1].x, P[i].y - P[i - 1].y); return s; };
// Perimetro y area de un grupo de contorno. El perimetro suma sus elementos (lineas y arcos exactos; elipses y splines por muestreo); el area, solo si los miembros
// forman UNA cadena cerrada: se encadenan en el orden en que se recorren y se aplica la formula del area de un poligono (con un contorno que se cruza a si mismo
// da el area neta, no la suma de las regiones).
function ctrProp(doc, id, prop) {
  if (prop !== 'L' && prop !== 'len' && prop !== 'area') return null;
  const m = ctrMembers(doc, id);
  if (m.length < 2) return null;
  if (prop !== 'area') {
    let L = 0;
    for (const it of m) {
      if (it.k === 'ar') { const a = doc.arcs[it.id], C = a && doc.pts[a.c]; if (C && doc.pts[a.a] && doc.pts[a.b]) L += a.r * arcOf(doc, a).sweep; }
      else L += plen(ctrPoly(doc, it));
    }
    return num(L);
  }
  const c = ctrState(doc, id).comp;
  if (!c || !c.closed) return null;
  let poly = [];
  for (const it of c.items) {
    let P = ctrPoly(doc, it); if (P.length < 2) return null;
    if (poly.length) {
      const end = poly[poly.length - 1], d0 = Math.hypot(P[0].x - end.x, P[0].y - end.y), d1 = Math.hypot(P[P.length - 1].x - end.x, P[P.length - 1].y - end.y);
      if (d1 < d0) P = [...P].reverse();
      P = P.slice(1);
    }
    poly = poly.concat(P);
  }
  let A = 0;
  for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; A += p.x * q.y - q.x * p.y; }
  return num(Math.abs(A) / 2);
}

export function propOf(doc, id, prop) {
  if (doc.ctrs?.[id]) return prop === 'n' ? num(ctrMembers(doc, id).length) : ctrProp(doc, id, prop);
  if (doc.splines?.[id]) return prop === 'n' ? num(doc.splines[id].pts.length) : null;
  const p = doc.pts[id];
  if (p) return prop === 'x' ? num(p.x) : prop === 'y' ? num(p.y) : null;
  const l = doc.lines[id];
  if (l) {
    const A = doc.pts[l.a], B = doc.pts[l.b];
    if (!A || !B) return null;
    if (prop === 'len' || prop === 'L') return num(Math.hypot(B.x - A.x, B.y - A.y));
    if (prop === 'ang') return ang(Math.atan2(B.y - A.y, B.x - A.x));
    return null;
  }
  const o = doc.circles[id] || doc.arcs[id], C = o && doc.pts[o.c];
  if (!C) return null;
  if (prop === 'r') return num(o.r);
  if (prop === 'd' && doc.circles[id]) return num(2 * o.r);
  if (prop === 'x') return num(C.x);
  if (prop === 'y') return num(C.y);
  return null;
}
const PROPS = { pts: ['x', 'y'], lines: ['len', 'L', 'ang'], circles: ['r', 'd', 'x', 'y'], arcs: ['r', 'x', 'y'], ctrs: ['L', 'len', 'area', 'n'], splines: ['n'] };

// Todas las propiedades: { 'p12.x': { v, r }, ... }
export function geoVars(doc) {
  const out = {};
  for (const [key, props] of Object.entries(PROPS)) for (const id of Object.keys(doc[key] || {})) for (const pr of props) { const x = propOf(doc, id, pr); if (x) out[id + '.' + pr] = x; }
  return out;
}
// ¿«p12.x» es una propiedad que existe en el dibujo?
export function isGeoName(doc, name) {
  const m = NAME.exec(String(name));
  return !!m && !!propOf(doc, m[1], m[2]);
}
// Puntos que fijan la propiedad (para tratarlos como entradas de una formula).
export function geoPoints(doc, name) {
  const m = NAME.exec(String(name));
  if (!m) return [];
  const id = m[1];
  if (doc.pts[id]) return [id];
  if (doc.ctrs?.[id]) { // un contorno depende de los puntos de todos sus elementos
    const out = new Set();
    for (const it of ctrMembers(doc, id)) {
      const o = doc[{ ln: 'lines', ar: 'arcs', el: 'ellipses', sp: 'splines' }[it.k]][it.id];
      for (const p of it.k === 'sp' ? o.pts : [o.a, o.b, o.c, o.p1, o.p2]) if (p) out.add(p);
    }
    return [...out];
  }
  if (doc.lines[id]) return [doc.lines[id].a, doc.lines[id].b];
  const o = doc.circles[id] || doc.arcs[id];
  return o ? [o.c] : [];
}
