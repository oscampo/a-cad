// Seleccion por cuadro (sin DOM). rect en coordenadas del modelo. Dos modos, como en los CAD:
//  - ventana (cross = false): solo lo que queda completamente dentro del cuadro;
//  - cruce (cross = true): lo que queda dentro o toca el cuadro.
import { splinePolyline, arcSamples, ellipsePolyline, isHidden, isLocked, layerHiddenPoints, layerLockedPoints } from './model.js';

const inside = (p, r) => p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1;

// ¿El segmento ab toca el rectangulo? (Liang-Barsky)
function segHits(a, b, r) {
  let t0 = 0, t1 = 1;
  const dx = b.x - a.x, dy = b.y - a.y;
  for (const [p, q] of [[-dx, a.x - r.x0], [dx, r.x1 - a.x], [-dy, a.y - r.y0], [dy, r.y1 - a.y]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return true;
}

function polyIn(P, r, cross) {
  if (!P.length) return false;
  if (!cross) return P.every((p) => inside(p, r));
  if (P.some((p) => inside(p, r))) return true;
  for (let i = 0; i < P.length - 1; i++) if (segHits(P[i], P[i + 1], r)) return true;
  return false;
}

// El cuadro puede venir con las esquinas en cualquier orden. shown: ids de puntos que se dibujan (opcional). textBox(t): las 4 esquinas
// de un texto (opcional, con la medida del dibujo): con ella un texto se elige por su caja, como las figuras; sin ella, por su punto.
export function boxSelect(doc, rect, { cross = false, shown = null, textBox = null } = {}) {
  const r = { x0: Math.min(rect.x0, rect.x1), x1: Math.max(rect.x0, rect.x1), y0: Math.min(rect.y0, rect.y1), y1: Math.max(rect.y0, rect.y1) };
  const out = [], hp = layerHiddenPoints(doc), lp = layerLockedPoints(doc), ok = (o) => !isHidden(doc, o) && !isLocked(doc, o); // lo de una capa apagada o bloqueada no se elige
  for (const [id, p] of Object.entries(doc.pts)) {
    if (hp.has(id) || lp.has(id)) continue;
    if (shown ? !shown.has(id) : p.splOnly || p.txOnly) continue;
    if (inside(p, r)) out.push({ k: 'pt', id });
  }
  for (const [id, l] of Object.entries(doc.lines)) if (ok(l) && polyIn([doc.pts[l.a], doc.pts[l.b]], r, cross)) out.push({ k: 'ln', id });
  for (const [id, c] of Object.entries(doc.circles)) {
    if (!ok(c)) continue;
    const p = doc.pts[c.c];
    if (!cross) { if (p.x - c.r >= r.x0 && p.x + c.r <= r.x1 && p.y - c.r >= r.y0 && p.y + c.r <= r.y1) out.push({ k: 'ci', id }); continue; }
    // la circunferencia toca el cuadro si su radio esta entre la distancia minima y la maxima del centro al cuadro
    const dx = Math.max(r.x0 - p.x, 0, p.x - r.x1), dy = Math.max(r.y0 - p.y, 0, p.y - r.y1);
    const fx = Math.max(Math.abs(p.x - r.x0), Math.abs(p.x - r.x1)), fy = Math.max(Math.abs(p.y - r.y0), Math.abs(p.y - r.y1));
    if (Math.hypot(dx, dy) <= c.r && c.r <= Math.hypot(fx, fy)) out.push({ k: 'ci', id });
  }
  for (const [id, a] of Object.entries(doc.arcs)) if (ok(a) && polyIn(arcSamples(doc, a), r, cross)) out.push({ k: 'ar', id });
  for (const [id, sp] of Object.entries(doc.splines || {})) if (ok(sp) && polyIn(splinePolyline(doc, sp, 12), r, cross)) out.push({ k: 'sp', id });
  for (const [id, e] of Object.entries(doc.ellipses || {})) if (ok(e) && polyIn(ellipsePolyline(doc, e, 48), r, cross)) out.push({ k: 'el', id });
  for (const [id, t] of Object.entries(doc.texts || {})) {
    if (!doc.pts[t.pt] || !ok(t)) continue;
    const C = textBox ? textBox(t) : null;
    if (!C?.length) { if (inside(doc.pts[t.pt], r)) out.push({ k: 'tx', id }); continue; }
    const xs = C.map((q) => q.x), ys = C.map((q) => q.y), cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2;
    const covers = cross && cx >= Math.min(...xs) && cx <= Math.max(...xs) && cy >= Math.min(...ys) && cy <= Math.max(...ys); // el cuadro, dentro del texto
    if (covers || polyIn([...C, C[0]], r, cross)) out.push({ k: 'tx', id });
  }
  // graficas: un rectangulo (x, y, w, h en el modelo); ventana = entera dentro, cruce = dentro o tocando
  for (const [id, g] of [...Object.entries(doc.graphs || {}), ...Object.entries(doc.images || {}).filter(([, im]) => !im.locked && ok(im))]) { // y las imagenes (no las de una capa apagada), que se manejan como ellas
    const x1 = g.x + g.w, y1 = g.y + g.h;
    if (cross ? g.x <= r.x1 && x1 >= r.x0 && g.y <= r.y1 && y1 >= r.y0 : g.x >= r.x0 && x1 <= r.x1 && g.y >= r.y0 && y1 <= r.y1) out.push({ k: 'gr', id });
  }
  return out;
}
