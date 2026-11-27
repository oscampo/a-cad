// Propiedades de los elementos con la notacion «.»: p12.x es la coordenada x del punto p12. Sin DOM.
// Se leen en cualquier formula (cotas, textos p12.x=, variables, actuadores, graficas) y siempre valen lo que tiene el dibujo ahora.
//   punto:   x, y
//   linea:   len (o L: longitud), ang (angulo de a hacia b, en radianes: vale como un angulo)
//   circulo: r, d (diametro), x, y (centro)
//   arco:    r, x, y (centro)
//   contorno (un grupo, k1): L o len (perimetro: suma de sus elementos), area (solo si forma UNA cadena cerrada) y n (cuantos elementos tiene)
//   spline:  n (cuantos puntos tiene)
import { ctrMembers, grpLeaves, arcOf, ellipsePolyline, splinePolyline } from './model.js';
import { elementValue } from './topo.js';
import { ctrState } from './tree.js';
import { normName } from './expr.js';
import { isValidElName, setNames, nameToId, NAMED } from './names.js';
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
  if (doc.grps?.[id]) { const v = GRP_PROPS.includes(prop) ? elementValue(doc, id) : null; return v && Number.isFinite(v[prop]) ? num(v[prop]) : null; } // un grupo: cuantos objetos tiene y su caja envolvente
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
const GRP_PROPS = ['n', 'xmin', 'xmax', 'ymin', 'ymax', 'w', 'h'];
const PROPS = { pts: ['x', 'y'], lines: ['len', 'L', 'ang'], circles: ['r', 'd', 'x', 'y'], arcs: ['r', 'x', 'y'], ctrs: ['L', 'len', 'area', 'n'], splines: ['n'], grps: GRP_PROPS };

// Los nombres que el usuario puso a puntos, lineas, circulos, arcos, grupos y contornos (name): nombre normalizado -> id. Solo los que pueden usarse como nombre (ver names.js) y no chocan
// con una cota (la cota gana, como una variable de texto: un dibujo anterior no cambia). Un nombre repetido no llama a ninguno.
export function elementNames(doc) {
  const m = new Map(), dup = new Set(), cons = new Set(Object.values(doc.cons).map((k) => k.name).filter(Boolean));
  const add = (raw, id) => { if (!isValidElName(raw)) return; const n = normName(raw); if (cons.has(n)) return; if (m.has(n)) dup.add(n); else m.set(n, id); };
  for (const [coll] of NAMED) for (const [id, o] of Object.entries(doc[coll] || {})) if (o.name) add(o.name, id);
  for (const n of dup) m.delete(n); // dos elementos con el mismo nombre (una copia de un grupo lo hereda): ninguno se llama por el, en vez de elegir uno al azar
  return m;
}
// «nombre.prop» de un elemento llamado por su nombre -> [id, prop]; «p12.x» -> [p12, x]
function splitGeo(name) {
  const s = String(name), m = NAME.exec(s);
  if (m) return [m[1], m[2]];
  const i = s.lastIndexOf('.');
  if (i < 1) return null;
  const id = nameToId(normName(s.slice(0, i))), pr = s.slice(i + 1);
  return id && /^[A-Za-zα-ωΑ-Ωϑϕϖɛ]\w*$/.test(pr) ? [id, pr] : null;
}
// Todas las propiedades: { 'p12.x': { v, r }, ... }; con nombre de usuario tambien «ini.x» (lo mismo que p12.x)
export function geoVars(doc) {
  const out = {}, names = elementNames(doc);
  setNames(names); // lo leen el evaluador (expr.js) y checkElName; cada vez que se arman las variables del dibujo
  for (const [key, props] of Object.entries(PROPS)) if (key !== 'grps') for (const id of Object.keys(doc[key] || {})) for (const pr of props) { const x = propOf(doc, id, pr); if (x) out[id + '.' + pr] = x; }
  for (const id of Object.keys(doc.grps || {})) { const v = elementValue(doc, id); for (const pr of GRP_PROPS) if (Number.isFinite(v?.[pr])) out[id + '.' + pr] = num(v[pr]); } // un grupo: una sola vez por grupo
  for (const [n, id] of names) for (const props of Object.values(PROPS)) for (const pr of props) { const x = out[id + '.' + pr]; if (x) out[n + '.' + pr] = x; }
  return out;
}
// ¿«p12.x» (o «ini.x») es una propiedad que existe en el dibujo?
export function isGeoName(doc, name) {
  const m = splitGeo(name);
  return !!m && !!propOf(doc, m[0], m[1]);
}
// Puntos que fijan la propiedad (para tratarlos como entradas de una formula).
export function geoPoints(doc, name) {
  const m = splitGeo(name);
  if (!m) return [];
  const id = m[0];
  if (doc.pts[id]) return [id];
  if (doc.ctrs?.[id]) { // un contorno depende de los puntos de todos sus elementos
    const out = new Set();
    for (const it of ctrMembers(doc, id)) {
      const o = doc[{ ln: 'lines', ar: 'arcs', el: 'ellipses', sp: 'splines' }[it.k]][it.id];
      for (const p of it.k === 'sp' ? o.pts : [o.a, o.b, o.c, o.p1, o.p2]) if (p) out.add(p);
    }
    return [...out];
  }
  if (doc.grps?.[id]) { // un grupo depende de los puntos de todo lo que contiene
    const out = new Set();
    for (const it of grpLeaves(doc, id)) {
      if (it.k === 'pt') out.add(it.id);
      else if (it.k === 'tx') { const t = doc.texts?.[it.id]; if (t?.pt) out.add(t.pt); }
      else { const o = doc[{ ln: 'lines', ar: 'arcs', el: 'ellipses', sp: 'splines', ci: 'circles' }[it.k]]?.[it.id]; if (o) for (const p of it.k === 'sp' ? o.pts : [o.a, o.b, o.c, o.p1, o.p2]) if (p) out.add(p); }
    }
    return [...out];
  }
  if (doc.lines[id]) return [doc.lines[id].a, doc.lines[id].b];
  const o = doc.circles[id] || doc.arcs[id];
  return o ? [o.c] : [];
}
