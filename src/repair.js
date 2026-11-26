// Reparar un contorno: aristas repetidas (el mismo elemento dibujado dos veces) y puntos coincidentes (dos puntos distintos en el mismo lugar,
// que impiden que las aristas se encadenen por punto compartido). Sin DOM: lo prueba test/repair.test.mjs.
import { ctrMembers, cleanup, deleteItems, conRefs } from './model.js';
// (no importa gen.js: expr.js -> geo.js -> tree.js -> repair.js cerraria un ciclo)
const isGen = (doc, id) => !!doc.gen?.map && Object.values(doc.gen.map).includes(id);

const TOL = 1e-3;
const COLL = { ln: 'lines', ar: 'arcs', el: 'ellipses', sp: 'splines' };

// Los puntos extremos (y de definicion) de un elemento de trazo.
function endpoints(doc, it) {
  const o = doc[COLL[it.k]]?.[it.id];
  if (!o) return [];
  if (it.k === 'ln') return [o.a, o.b];
  if (it.k === 'ar') return [o.a, o.b];
  if (it.k === 'el') return o.p1 && o.p2 ? [o.p1, o.p2] : [];
  return [o.pts[0], o.pts[o.pts.length - 1]];
}

// Firma geometrica de un elemento: dos con la misma firma son el mismo trazo (mismos extremos y misma forma).
function signature(doc, it) {
  const o = doc[COLL[it.k]]?.[it.id];
  if (!o) return null;
  const pk = (id) => { const p = doc.pts[id]; return p ? `${Math.round(p.x * 1e3)},${Math.round(p.y * 1e3)}` : id; };
  if (it.k === 'ln') return 'ln|' + [pk(o.a), pk(o.b)].sort().join('|');
  if (it.k === 'ar') return `ar|${pk(o.c)}|${pk(o.a)}|${pk(o.b)}|${Math.round(o.r * 1e3)}`;
  if (it.k === 'el') return `el|${pk(o.c)}|${pk(o.a)}|${pk(o.b)}` + (o.p1 && o.p2 ? `|${pk(o.p1)}|${pk(o.p2)}` : '');
  const f = o.pts.map(pk), r = [...f].reverse();
  return 'sp|' + (f.join('|') <= r.join('|') ? f : r).join('|');
}

// Cuantas relaciones tiene un elemento: entre dos repetidos, se conserva el que mas tiene.
const nCons = (doc, id) => Object.values(doc.cons).filter((k) => conRefs(k).includes(id)).length;

// Aristas repetidas entre los elementos dados: [{ keep, dups: [item…] }].
export function dupEdges(doc, items) {
  const by = new Map();
  for (const it of items) { const s = signature(doc, it); if (s) (by.get(s) || by.set(s, []).get(s)).push(it); }
  const out = [];
  for (const list of by.values()) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => nCons(doc, b.id) - nCons(doc, a.id)); // estable: a igual numero, el primero
    out.push({ keep: sorted[0], dups: sorted.slice(1) });
  }
  return out;
}

// Quita las aristas repetidas (deja una de cada). Devuelve cuantas quito.
export function removeDupEdges(doc, items) {
  const dups = dupEdges(doc, items).flatMap((g) => g.dups);
  if (!dups.length) return 0;
  deleteItems(doc, dups.map((d) => ({ k: d.k, id: d.id })));
  return dups.length;
}

// Puntos distintos que estan en el mismo lugar, entre los dados: [[id, id…]…] (grupos de 2 o mas).
export function coincidentPoints(doc, ids, tol = TOL) {
  const list = [...new Set(ids)].filter((id) => doc.pts[id]);
  const parent = new Map(list.map((id) => [id, id]));
  const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const p = doc.pts[list[i]], q = doc.pts[list[j]];
    if (Math.hypot(p.x - q.x, p.y - q.y) <= tol) parent.set(find(list[i]), find(list[j]));
  }
  const groups = new Map();
  for (const id of list) { const r = find(id); (groups.get(r) || groups.set(r, []).get(r)).push(id); }
  return [...groups.values()].filter((g) => g.length > 1);
}

// Une dos puntos: todo lo que usaba 'drop' pasa a usar 'keep' y 'drop' desaparece. Devuelve { ok, msg? }.
export function mergePoints(doc, keep, drop) {
  if (keep === drop || !doc.pts[keep] || !doc.pts[drop]) return { ok: false, msg: 'Hacen falta dos puntos distintos' };
  if (isGen(doc, drop)) return { ok: false, msg: 'Uno de los puntos lo genera un script: se une conservando ese' };
  for (const l of Object.values(doc.lines)) {
    if ((l.a === keep && l.b === drop) || (l.a === drop && l.b === keep)) return { ok: false, msg: 'Una línea va de uno al otro: al unirlos quedaría sin longitud' };
    if (l.vec && (l.vec.m === drop || l.vec.m === keep)) return { ok: false, msg: 'Es el punto medio de un vector' };
  }
  for (const a of Object.values(doc.arcs)) { const s = [a.c, a.a, a.b]; if (s.includes(keep) && s.includes(drop)) return { ok: false, msg: 'Un arco usa los dos puntos: al unirlos se deformaría' }; }
  for (const e of Object.values(doc.ellipses || {})) { const s = [e.c, e.a, e.b, e.p1, e.p2]; if (s.includes(keep) && s.includes(drop)) return { ok: false, msg: 'Una elipse usa los dos puntos' }; }
  for (const sp of Object.values(doc.splines || {})) if (sp.pts.includes(keep) && sp.pts.includes(drop)) return { ok: false, msg: 'Un spline pasa por los dos puntos' };
  const sw = (x) => (x === drop ? keep : x);
  for (const l of Object.values(doc.lines)) { l.a = sw(l.a); l.b = sw(l.b); }
  for (const c of Object.values(doc.circles)) c.c = sw(c.c);
  for (const a of Object.values(doc.arcs)) { a.c = sw(a.c); a.a = sw(a.a); a.b = sw(a.b); }
  for (const e of Object.values(doc.ellipses || {})) { e.c = sw(e.c); e.a = sw(e.a); e.b = sw(e.b); if (e.p1) e.p1 = sw(e.p1); if (e.p2) e.p2 = sw(e.p2); }
  for (const t of Object.values(doc.texts || {})) t.pt = sw(t.pt);
  for (const sp of Object.values(doc.splines || {})) sp.pts = sp.pts.map(sw);
  for (const a of Object.values(doc.acts || {})) for (const f of ['c', 'p1', 'p2']) if (a[f] === drop) a[f] = keep;
  for (const [id, k] of Object.entries(doc.cons)) {
    if (!k.refs) continue;
    k.refs = k.refs.map(sw);
    if (new Set(k.refs).size < k.refs.length) delete doc.cons[id]; // una relacion entre los dos puntos que se unieron ya no tiene sentido
  }
  const K = doc.pts[keep], D = doc.pts[drop];
  if (D.fixed) K.fixed = true;
  K.auto = !!(K.auto && D.auto); // visible si alguno lo era
  if (doc.traces?.[drop]) { if (!doc.traces[keep]) doc.traces[keep] = doc.traces[drop]; delete doc.traces[drop]; }
  delete doc.pts[drop];
  cleanup(doc);
  return { ok: true };
}

// Une los puntos coincidentes entre los extremos de los elementos dados. En cada grupo se conserva el punto con mas relaciones (o el fijo).
// Devuelve { merged, skipped: [mensaje…] }.
export function mergeCoincident(doc, items, tol = TOL) {
  const ids = items.flatMap((it) => endpoints(doc, it));
  let merged = 0;
  const skipped = [];
  for (const g of coincidentPoints(doc, ids, tol)) {
    const rank = (id) => (doc.pts[id].fixed ? 1e6 : 0) + (isGen(doc, id) ? 1e6 : 0) + nCons(doc, id) + (doc.pts[id].auto ? 0 : 1);
    const sorted = [...g].sort((a, b) => rank(b) - rank(a));
    const keep = sorted[0];
    for (const d of sorted.slice(1)) {
      if (!doc.pts[d]) continue;
      const r = mergePoints(doc, keep, d);
      if (r.ok) merged++; else skipped.push(`${d} con ${keep}: ${r.msg}`);
    }
  }
  return { merged, skipped };
}

// Lo que se puede reparar en un grupo de contorno: aristas repetidas y puntos coincidentes entre sus extremos.
export function ctrIssues(doc, ctrId) {
  const items = ctrMembers(doc, ctrId);
  return { dups: dupEdges(doc, items), clusters: coincidentPoints(doc, items.flatMap((it) => endpoints(doc, it))), items };
}
