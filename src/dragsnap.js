// Snap al arrastrar (sin DOM, se prueba en Node): al mover puntos, una linea o una seleccion, los puntos que se mueven (los «anclas») se pegan a los
// objetos que no se mueven: otros puntos (extremos, centros), puntos medios de lineas, y el borde de lineas, circulos y arcos. Solo ajusta el
// desplazamiento: no crea restricciones (las que ya existan las resuelve el solver despues, como siempre).
//   moving: Set de ids de los puntos que se mueven     anchors: [{ id, x, y }] su posicion original
//   d: { dx, dy } el desplazamiento pedido por el cursor     tol: radio de captura en unidades del dibujo (el de pantalla / escala)
//   o: { hidden: Set de puntos que no cuentan (puntos de texto ocultos), grid: paso de la cuadricula o 0, gridId: ancla que va a la cuadricula }
// Devuelve { dx, dy, hit } con hit = { type: 'pt' | 'mid' | 'ln' | 'ci' | 'ar' | 'grid', x, y, anchor } o null si nada atrapo.
import { shownEntries, arcOf } from './model.js';
import { closestOnSeg, inSweep } from './geom.js';

const PRI = { pt: 0, mid: 1, ln: 2, ci: 2, ar: 2 };

export function dragSnap(doc, moving, anchors, d, tol, o = {}) {
  const hidden = o.hidden || new Set();
  const A = anchors.slice(0, 40); // con muchos puntos seleccionados basta con los primeros: la busqueda es por ancla
  let best = null;
  const offer = (type, ax, tx, ty, anchor) => { // ax: ancla ya desplazada; (tx, ty): donde quedaria
    const dist = Math.hypot(tx - ax.x, ty - ax.y);
    if (dist > tol) return;
    if (!best || PRI[type] < PRI[best.type] || (PRI[type] === PRI[best.type] && dist < best.dist)) best = { type, dist, ddx: tx - ax.x, ddy: ty - ax.y, x: tx, y: ty, anchor };
  };
  const still = (l) => !moving.has(l.a) && !moving.has(l.b);
  const pts = Object.entries(doc.pts).filter(([id]) => !moving.has(id) && !hidden.has(id));
  const lines = shownEntries(doc, 'lines').filter(([, l]) => still(l));
  const circles = shownEntries(doc, 'circles').filter(([, c]) => !moving.has(c.c));
  const arcs = shownEntries(doc, 'arcs').filter(([, a]) => !moving.has(a.c));
  for (const a of A) {
    const p = { x: a.x + d.dx, y: a.y + d.dy };
    for (const [, q] of pts) offer('pt', p, q.x, q.y, a.id);
    for (const [, l] of lines) {
      const P = doc.pts[l.a], Q = doc.pts[l.b];
      offer('mid', p, (P.x + Q.x) / 2, (P.y + Q.y) / 2, a.id);
      const c = closestOnSeg(p, P, Q);
      offer('ln', p, c.x, c.y, a.id);
    }
    for (const [, ci] of circles) {
      const C = doc.pts[ci.c], r = Math.hypot(p.x - C.x, p.y - C.y);
      if (r > 1e-9) offer('ci', p, C.x + ((p.x - C.x) / r) * ci.r, C.y + ((p.y - C.y) / r) * ci.r, a.id);
    }
    for (const [, ar] of arcs) {
      const C = doc.pts[ar.c], r = Math.hypot(p.x - C.x, p.y - C.y);
      if (r < 1e-9) continue;
      const g = arcOf(doc, ar);
      if (inSweep(C, g.a0, g.sweep, p, 1e-3)) offer('ar', p, C.x + ((p.x - C.x) / r) * ar.r, C.y + ((p.y - C.y) / r) * ar.r, a.id);
    }
  }
  if (best) return { dx: d.dx + best.ddx, dy: d.dy + best.ddy, hit: { type: best.type, x: best.x, y: best.y, anchor: best.anchor } };
  if (o.grid > 0 && A.length) { // sin objeto cerca, el iman de la cuadricula: el ancla que se agarro cae en un nudo
    const a = A.find((q) => q.id === o.gridId) || A[0], gx = Math.round((a.x + d.dx) / o.grid) * o.grid, gy = Math.round((a.y + d.dy) / o.grid) * o.grid;
    return { dx: gx - a.x, dy: gy - a.y, hit: { type: 'grid', x: gx, y: gy, anchor: a.id } };
  }
  return { dx: d.dx, dy: d.dy, hit: null };
}

// El ancla de un arrastre por el cuerpo de una linea, circulo o arco: el punto de ESE objeto mas cercano al toque m0 (con el dedo el toque cae a varios
// px del trazo; si el ancla fuera m0, el «pegado» dejaria el objeto a esa distancia). orig: posiciones originales de los puntos que se mueven.
export function grabAnchor(doc, h, m0, orig = {}) {
  const O = (id) => orig[id] || doc.pts[id];
  let a = { x: m0.x, y: m0.y };
  if (h.k === 'ln' && doc.lines[h.id]) { const l = doc.lines[h.id]; if (O(l.a) && O(l.b)) a = closestOnSeg(a, O(l.a), O(l.b)); }
  else if (h.k === 'ci' || h.k === 'ar') {
    const e = doc.circles[h.id] || doc.arcs[h.id], C = e && O(e.c), r = C && Math.hypot(a.x - C.x, a.y - C.y);
    if (C && r > 1e-9) a = { x: C.x + ((a.x - C.x) / r) * e.r, y: C.y + ((a.y - C.y) / r) * e.r };
  }
  return { x: a.x, y: a.y };
}
