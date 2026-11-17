// Elementos que comparten posicion o quedan casi uno encima de otro (puntos coincidentes, centros de arcos/circulos
// concentricos, lineas colineales...): lista de candidatos bajo un toque, para poder elegir entre ellos.
import { closestOnSeg, inSweep, dist } from './geom.js';
import { arcOf, splinePolyline, ellipsePolyline } from './model.js';

export const OVERLAP_PT = 14, OVERLAP_CURVE = 11; // px de pantalla (igual que el toque normal)
const KIND = { pt: 'Punto', ln: 'Línea', ci: 'Círculo', ar: 'Arco', el: 'Elipse', sp: 'Spline' };
export const OV_COLL = { pt: 'pts', ln: 'lines', ci: 'circles', ar: 'arcs', el: 'ellipses', sp: 'splines' };

const polyDist = (P, x, y) => {
  let best = Infinity;
  for (let i = 1; i < P.length; i++) { const c = closestOnSeg({ x, y }, P[i - 1], P[i]); best = Math.min(best, Math.hypot(c.x - x, c.y - y)); }
  return best;
};

// doc, v: {s, ox, oy}, (sx, sy): toque en pantalla. o: { pts: Set de puntos visibles (o null = todos), entries(coll): [[id, obj]], ok(k, obj): bool, tol }
// Devuelve [{ k, id, d }] con los puntos primero y luego las curvas, cada grupo del mas cercano al mas lejano.
export function nearAll(doc, v, sx, sy, o = {}) {
  const toS = (p) => ({ x: p.x * v.s + v.ox, y: v.oy - p.y * v.s });
  const m = { x: (sx - v.ox) / v.s, y: (v.oy - sy) / v.s };
  const k = o.tol || 1, rp = OVERLAP_PT * k, rc = OVERLAP_CURVE * k;
  const entries = o.entries || ((c) => Object.entries(doc[c] || {}));
  const ok = o.ok || (() => true);
  const pts = [], cur = [];
  for (const [id, p] of Object.entries(doc.pts)) {
    if (o.pts && !o.pts.has(id)) continue;
    if (!ok('pt', p)) continue;
    const d = dist(toS(p), { x: sx, y: sy });
    if (d <= rp) pts.push({ k: 'pt', id, d });
  }
  for (const [id, l] of entries('lines')) {
    const a = doc.pts[l.a], b = doc.pts[l.b];
    if (!a || !b || !ok('ln', l)) continue;
    const d = dist(toS(closestOnSeg(m, a, b)), { x: sx, y: sy });
    if (d <= rc) cur.push({ k: 'ln', id, d });
  }
  for (const [id, ci] of entries('circles')) {
    const c = doc.pts[ci.c];
    if (!c || !ok('ci', ci)) continue;
    const d = Math.abs(dist(c, m) - ci.r) * v.s;
    if (d <= rc) cur.push({ k: 'ci', id, d });
  }
  for (const [id, ar] of entries('arcs')) {
    const c = doc.pts[ar.c];
    if (!c || !ok('ar', ar)) continue;
    const d = Math.abs(dist(c, m) - ar.r) * v.s, g = arcOf(doc, ar);
    if (d <= rc && inSweep(c, g.a0, g.sweep, m, 8 / Math.max(ar.r * v.s, 1))) cur.push({ k: 'ar', id, d });
  }
  for (const [id, sp] of entries('splines')) {
    if (!ok('sp', sp)) continue;
    const d = polyDist(splinePolyline(doc, sp, 12).map(toS), sx, sy);
    if (d <= rc) cur.push({ k: 'sp', id, d });
  }
  for (const [id, e] of entries('ellipses')) {
    if (!ok('el', e)) continue;
    const d = polyDist(ellipsePolyline(doc, e, 72).map(toS), sx, sy);
    if (d <= rc) cur.push({ k: 'el', id, d });
  }
  const by = (a, b) => a.d - b.d;
  return [...pts.sort(by), ...cur.sort(by)];
}

const r3 = (n) => String(Math.round(n * 1000) / 1000);
// Texto corto para reconocer el elemento en la lista.
export function describe(doc, k, id) {
  const o = doc[OV_COLL[k]]?.[id];
  if (!o) return `${KIND[k]} ${id}`;
  const pt = (pid) => { const p = doc.pts[pid]; return p ? `(${r3(p.x)}, ${r3(p.y)})` : '?'; };
  if (k === 'pt') return `${KIND[k]} ${id} en (${r3(o.x)}, ${r3(o.y)})${o.fixed ? ', fijo' : ''}`;
  if (k === 'ln') { const a = doc.pts[o.a], b = doc.pts[o.b]; return `${KIND[k]} ${id}: ${o.a} → ${o.b}, largo ${a && b ? r3(dist(a, b)) : '?'}`; }
  if (k === 'ci') return `${KIND[k]} ${id}: centro ${o.c} ${pt(o.c)}, radio ${r3(o.r)}`;
  if (k === 'ar') return `${KIND[k]} ${id}: centro ${o.c} ${pt(o.c)}, radio ${r3(o.r)}`;
  if (k === 'el') return `${KIND[k]} ${id}`;
  return `${KIND[k]} ${id}${o.pts ? `, ${o.pts.length} puntos` : ''}`;
}
