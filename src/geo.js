// Propiedades de los elementos con la notacion «.»: p12.x es la coordenada x del punto p12. Sin DOM.
// Se leen en cualquier formula (cotas, textos p12.x=, variables, actuadores, graficas) y siempre valen lo que tiene el dibujo ahora.
//   punto:   x, y
//   linea:   len (o L: longitud), ang (angulo de a hacia b, en radianes: vale como un angulo)
//   circulo: r, d (diametro), x, y (centro)
//   arco:    r, x, y (centro)
const NAME = /^([A-Za-z]+\d+)\.([A-Za-zα-ωΑ-Ω]\w*)$/;
const num = (v) => ({ v, r: false });
const ang = (v) => ({ v, r: true });

function propOf(doc, id, prop) {
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
const PROPS = { pts: ['x', 'y'], lines: ['len', 'L', 'ang'], circles: ['r', 'd', 'x', 'y'], arcs: ['r', 'x', 'y'] };

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
  if (doc.lines[id]) return [doc.lines[id].a, doc.lines[id].b];
  const o = doc.circles[id] || doc.arcs[id];
  return o ? [o.c] : [];
}
