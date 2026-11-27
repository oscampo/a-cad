// Topologia de los elementos: que puntos usa cada uno y con que papel. Es la misma lista que muestra el arbol de elementos (tree.js) y la que leen los scripts
// (e.a.x, e.c.y…): una sola fuente, para que lo que se ve en el arbol sea lo que se puede leer. Sin DOM.
//   linea:   a, b                       (A:, B:)
//   arco:    c, a, b                    (Centro:, Inicio:, Fin:)
//   circulo: c                          (Centro:)
//   elipse:  c, a, b (+ p1, p2 si es un arco eliptico)   (Centro:, Eje 1:, Eje 2:, Inicio:, Fin:)
//   spline:  p1, p2, … pn               (los puntos de control, en orden)
import { ctrMembers, grpMembers, grpLeaves, grpName } from './model.js';
import { bboxOf } from './edit.js';

// [{ role, label, id }] de un elemento del dibujo (kind: ln, ar, ci, el, sp); [] si no existe.
export function elementPoints(doc, kind, id) {
  const P = (role, label, pid) => ({ role, label, id: pid });
  if (kind === 'ln') { const l = doc.lines[id]; return l ? [P('a', 'A:', l.a), P('b', 'B:', l.b)] : []; }
  if (kind === 'ar') { const a = doc.arcs[id]; return a ? [P('c', 'Centro:', a.c), P('a', 'Inicio:', a.a), P('b', 'Fin:', a.b)] : []; }
  if (kind === 'ci') { const c = doc.circles[id]; return c ? [P('c', 'Centro:', c.c)] : []; }
  if (kind === 'el') { const e = doc.ellipses?.[id]; return e ? [P('c', 'Centro:', e.c), P('a', 'Eje 1:', e.a), P('b', 'Eje 2:', e.b), ...(e.p1 && e.p2 ? [P('p1', 'Inicio:', e.p1), P('p2', 'Fin:', e.p2)] : [])] : []; }
  if (kind === 'sp') { const s = doc.splines?.[id]; return s ? s.pts.map((p, i) => P('p' + (i + 1), '', p)) : []; }
  return [];
}

// El tipo de un id del dibujo: 'pt', 'ln', 'ci', 'ar', 'el', 'sp', 'ct' (grupo de contorno), 'gp' (grupo), 'tx' (texto) o 'co' (relacion); null si no existe.
export function kindOfId(doc, id) {
  if (doc.pts[id]) return 'pt';
  if (doc.lines[id]) return 'ln';
  if (doc.circles[id]) return 'ci';
  if (doc.arcs[id]) return 'ar';
  if (doc.ellipses?.[id]) return 'el';
  if (doc.splines?.[id]) return 'sp';
  if (doc.ctrs?.[id]) return 'ct';
  if (doc.grps?.[id]) return 'gp';
  if (doc.texts?.[id]) return 'tx';
  if (doc.cons?.[id]) return 'co';
  return null;
}

// Un valor de script para un elemento del dibujo: { k, id, …datos } con sus puntos como valores {k:'pt', id, x, y} bajo su papel (a, b, c…),
// un spline con su lista de puntos y un grupo de contorno con la de sus miembros (los mismos valores, uno por elemento). prop(id, 'L') pide a
// geo.js una propiedad numerica (perimetro, area).
// La caja envolvente de lo que contiene un contorno o un grupo: xmin, xmax, ymin, ymax, w (ancho) y h (alto).
function boxOf(doc, items) {
  const b = bboxOf(doc, items);
  return b ? { xmin: b.x0, xmax: b.x1, ymin: b.y0, ymax: b.y1, w: b.x1 - b.x0, h: b.y1 - b.y0 } : {};
}
export function elementValue(doc, id, prop = () => null) {
  const k = kindOfId(doc, id);
  if (!k) return null;
  const pt = (pid) => { const p = doc.pts[pid]; return p ? { k: 'pt', id: pid, x: p.x, y: p.y } : null; };
  if (k === 'pt') return pt(id);
  if (k === 'tx') { const t = doc.texts[id], p = doc.pts[t.pt]; return { k: 'tx', id, text: String(t.text ?? ''), ...(p ? { x: p.x, y: p.y } : {}) }; } // un texto: su punto de insercion y su contenido
  if (k === 'co') { const c = doc.cons[id]; return { k: 'co', id, t: c.t, ...(typeof c.v === 'number' ? { v: c.v } : {}) }; } // una relacion (cota): su tipo y, si lo tiene, su valor
  if (k === 'gp') { // un grupo: sus miembros directos (elementos, textos, cotas, contornos y grupos) y su caja envolvente
    const list = grpMembers(doc, id).map((m) => elementValue(doc, m.id, prop)).filter(Boolean);
    return { k: 'gp', id, name: grpName(doc, id), n: list.length, ...boxOf(doc, grpLeaves(doc, id)), list };
  }
  if (k === 'ct') {
    const list = ctrMembers(doc, id).map((m) => elementValue(doc, m.id, prop)).filter(Boolean);
    const L = prop(id, 'L'), A = prop(id, 'area');
    return { k: 'ct', id, n: list.length, ...(L ? { L: L.v } : {}), ...(A ? { area: A.v } : {}), ...boxOf(doc, ctrMembers(doc, id)), list };
  }
  const out = { k, id };
  const pts = elementPoints(doc, k, id);
  if (k === 'sp') { out.list = pts.map((q) => pt(q.id)).filter(Boolean); out.n = out.list.length; out.closed = !!doc.splines[id].closed; return out; }
  for (const q of pts) { const g = pt(q.id); if (g) out[q.role] = g; }
  if (k === 'ci' || k === 'ar') { const o = (k === 'ci' ? doc.circles : doc.arcs)[id], C = doc.pts[o.c]; if (C) { out.x = C.x; out.y = C.y; } out.r = o.r; }
  return out;
}
