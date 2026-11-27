// Reparar un contorno: aristas repetidas (el mismo elemento dibujado dos veces) y puntos coincidentes (dos puntos distintos en el mismo lugar,
// que impiden que las aristas se encadenen por punto compartido). Sin DOM: lo prueba test/repair.test.mjs.
import { ctrMembers, cleanup, deleteItems, conRefs, addPoint } from './model.js';
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
    const r = mergeGroup(doc, g);
    merged += r.merged; skipped.push(...r.skipped);
  }
  return { merged, skipped };
}

// Une varios puntos en uno: se queda el que mas pesa (fijo, generado, con mas relaciones, visible). Devuelve { keep, merged, skipped }.
export function mergeGroup(doc, ids) {
  const list = [...new Set(ids)].filter((id) => doc.pts[id]);
  const rank = (id) => (doc.pts[id].fixed ? 1e6 : 0) + (isGen(doc, id) ? 1e6 : 0) + nCons(doc, id) + (doc.pts[id].auto ? 0 : 1);
  const sorted = list.sort((a, b) => rank(b) - rank(a));
  const keep = sorted[0];
  let merged = 0;
  const skipped = [];
  for (const d of sorted.slice(1)) {
    if (!doc.pts[d]) continue;
    const r = mergePoints(doc, keep, d);
    if (r.ok) merged++; else skipped.push(`${d} con ${keep}: ${r.msg}`);
  }
  return { keep, merged, skipped };
}

// Lo que se puede reparar en un grupo de contorno: aristas repetidas y puntos coincidentes entre sus extremos.
export function ctrIssues(doc, ctrId) {
  const items = ctrMembers(doc, ctrId);
  return { dups: dupEdges(doc, items), clusters: coincidentPoints(doc, items.flatMap((it) => endpoints(doc, it))), items };
}

// ---------------------------------------------------------------- disolver un punto (lo contrario de dividir)
// El punto es el extremo comun de exactamente dos elementos del mismo tipo que continuan uno al otro (dos lineas alineadas, o dos arcos del
// mismo circulo, o dos arcos elipticos de la misma elipse): pasan a ser UNO y el punto desaparece. Las relaciones del punto y del elemento
// que se absorbe se pierden (la interfaz las cuenta y pide confirmacion). Devuelve { ok, msg? }.
const ANG_TOL = 1e-6;
export function dissolvePoint(doc, pid) {
  const P = doc.pts[pid];
  if (!P) return { ok: false, msg: 'Falta el punto' };
  if (isGen(doc, pid)) return { ok: false, msg: 'Lo genera un script: se cambia la llamada' };
  const lines = Object.entries(doc.lines).filter(([, l]) => l.a === pid || l.b === pid);
  const arcs = Object.entries(doc.arcs).filter(([, a]) => a.a === pid || a.b === pid || a.c === pid);
  const els = Object.entries(doc.ellipses || {}).filter(([, e]) => [e.c, e.a, e.b, e.p1, e.p2].includes(pid));
  const other = Object.values(doc.circles).some((c) => c.c === pid) || Object.values(doc.splines || {}).some((s) => s.pts.includes(pid))
    || Object.values(doc.texts || {}).some((t) => t.pt === pid) || Object.values(doc.acts || {}).some((a) => [a.c, a.p1, a.p2].includes(pid))
    || lines.some(([, l]) => l.vec) || Object.values(doc.lines).some((l) => l.vec?.m === pid);
  const BAD = { ok: false, msg: 'Un punto se disuelve si es el extremo común de dos líneas alineadas, de dos arcos del mismo círculo o de dos arcos elípticos de la misma elipse, y nada más lo usa' };
  if (other) return BAD;
  const kinds = [lines.length && 'ln', arcs.length && 'ar', els.length && 'el'].filter(Boolean);
  if (kinds.length !== 1) return BAD;
  const colls = { ln: lines, ar: arcs, el: els };
  const list = colls[kinds[0]];
  if (list.length !== 2) return BAD;
  const [[id1, o1], [id2, o2]] = list;
  const far = (o) => (o.a === pid ? o.b : o.a);
  if (kinds[0] === 'ln') {
    const X = doc.pts[far(o1)], Y = doc.pts[far(o2)];
    const ux = X.x - P.x, uy = X.y - P.y, vx = Y.x - P.x, vy = Y.y - P.y, lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy);
    if (!(lu > 1e-9 && lv > 1e-9)) return { ok: false, msg: 'Una de las líneas no tiene longitud' };
    if (Math.abs(ux * vy - uy * vx) / (lu * lv) > ANG_TOL || ux * vx + uy * vy > 0) return { ok: false, msg: 'Las dos líneas no están alineadas: al disolver el punto cambiaría la forma' };
    if (far(o1) === far(o2)) return { ok: false, msg: 'Las dos líneas unen los mismos puntos' };
    if (o1.a === pid) o1.a = far(o2); else o1.b = far(o2); // la primera llega ahora hasta el otro extremo de la segunda
  } else if (kinds[0] === 'ar') {
    if (o1.c === pid || o2.c === pid) return { ok: false, msg: 'El punto es el centro de un arco' };
    const C1 = doc.pts[o1.c], C2 = doc.pts[o2.c];
    if (Math.hypot(C1.x - C2.x, C1.y - C2.y) > TOL || Math.abs(o1.r - o2.r) > TOL) return { ok: false, msg: 'Los dos arcos no son del mismo círculo' };
    // antihorario de a a b: el que termina en el punto va primero
    const [first, second, idFirst] = o1.b === pid && o2.a === pid ? [o1, o2, id1] : o2.b === pid && o1.a === pid ? [o2, o1, id2] : [null, null, null];
    if (!first) return { ok: false, msg: 'Los dos arcos no se continúan (uno termina donde empieza el otro)' };
    first.b = second.b;
    return finishDissolve(doc, pid, idFirst === id1 ? id2 : id1, 'ar');
  } else {
    // la misma elipse: los mismos puntos, o (arcos generados por script o dibujados por separado, cada uno con sus puntos de eje) el mismo centro y los
    // mismos semiejes con una diferencia de ruido (hasta 0,2 % del semieje)
    const same = (x, y) => {
      if (x.c === y.c && x.a === y.a && x.b === y.b) return true;
      const Cx = doc.pts[x.c], Cy = doc.pts[y.c], ax = doc.pts[x.a], ay = doc.pts[y.a], bx = doc.pts[x.b], by = doc.pts[y.b];
      if (!(Cx && Cy && ax && ay && bx && by)) return false;
      const tol = Math.max(TOL, 0.002 * Math.max(Math.hypot(ax.x - Cx.x, ax.y - Cx.y), Math.hypot(bx.x - Cx.x, bx.y - Cx.y)));
      return Math.hypot(Cx.x - Cy.x, Cx.y - Cy.y) <= tol && Math.hypot((ax.x - Cx.x) - (ay.x - Cy.x), (ax.y - Cx.y) - (ay.y - Cy.y)) <= tol
        && Math.hypot((bx.x - Cx.x) - (by.x - Cy.x), (bx.y - Cx.y) - (by.y - Cy.y)) <= tol;
    };
    if (!same(o1, o2)) return { ok: false, msg: 'Los dos arcos elípticos no son de la misma elipse' };
    if (!(o1.p1 && o1.p2 && o2.p1 && o2.p2)) return BAD;
    const [first, second, idFirst] = o1.p2 === pid && o2.p1 === pid ? [o1, o2, id1] : o2.p2 === pid && o1.p1 === pid ? [o2, o1, id2] : [null, null, null];
    if (!first) return { ok: false, msg: 'Los dos arcos elípticos no se continúan' };
    first.p2 = second.p2;
    const gone = idFirst === id1 ? id2 : id1, keep = idFirst, goneEl = doc.ellipses[gone];
    for (const [cid, k] of Object.entries(doc.cons)) { // lo que se decia del arco que se absorbe pasa al que queda; lo que los unia entre si (tangencia, coincidencia) sobra
      if (!(k.refs || []).includes(gone)) continue;
      if (k.refs.includes(keep)) delete doc.cons[cid]; else k.refs = k.refs.map((r) => (r === gone ? keep : r));
    }
    const r = finishDissolve(doc, pid, gone, 'el');
    for (const q of new Set([goneEl.a, goneEl.b, goneEl.c])) { // sus puntos de eje y centro, si eran propios y ya nadie los usa, se van con el
      if (!doc.pts[q] || [first.a, first.b, first.c].includes(q) || pointUsers(doc, q).length) continue;
      if (Object.values(doc.texts || {}).some((t) => t.pt === q) || Object.values(doc.cons).some((k) => (k.refs || []).includes(q))) continue;
      deleteItems(doc, [{ k: 'pt', id: q }]);
    }
    return r;
  }
  return finishDissolve(doc, pid, id2, 'ln');
}
function finishDissolve(doc, pid, gone, kind) {
  for (const h of Object.values(doc.hatches || {})) h.ids = h.ids.filter((x) => x !== gone); // el relleno sigue pasando por el elemento que queda
  deleteItems(doc, [{ k: kind, id: gone }, { k: 'pt', id: pid }]);
  return { ok: true };
}

// ---------------------------------------------------------------- separar un punto (lo contrario de fusionar)
// Un punto que usan varios elementos (dos splines unidas por su extremo, una linea y un arco...) se separa: los elementos dados pasan a usar un punto
// NUEVO en el mismo lugar y dejan de estar unidos al resto. Sin elementos dados, cada elemento menos el primero recibe el suyo. Las relaciones que
// ataban el punto con lo que se separa se mueven al punto nuevo si solo tocan a los elementos que se mueven, y se pierden si unian las dos partes
// (la interfaz las cuenta y pide confirmacion). Devuelve { ok, pts?: [ids de los puntos nuevos], msg? }.
const USERS = [['lines', 'ln', ['a', 'b']], ['arcs', 'ar', ['a', 'b', 'c']], ['circles', 'ci', ['c']], ['ellipses', 'el', ['c', 'a', 'b', 'p1', 'p2']]];
function pointUsers(doc, pid) {
  const out = [];
  for (const [coll, k, fields] of USERS) for (const [id, o] of Object.entries(doc[coll] || {})) if (fields.some((f) => o[f] === pid)) out.push({ k, id });
  for (const [id, sp] of Object.entries(doc.splines || {})) if (sp.pts.includes(pid)) out.push({ k: 'sp', id });
  return out;
}
export function separatePoint(doc, pid, items = []) {
  const P = doc.pts[pid];
  if (!P) return { ok: false, msg: 'Falta el punto' };
  if (isGen(doc, pid)) return { ok: false, msg: 'Lo genera un script: se cambia la llamada' };
  const users = pointUsers(doc, pid);
  if (users.length < 2) return { ok: false, msg: 'Un solo elemento usa el punto: no hay nada que separar' };
  if (Object.values(doc.texts || {}).some((t) => t.pt === pid) || Object.values(doc.acts || {}).some((a) => [a.c, a.p1, a.p2].includes(pid))
    || Object.values(doc.lines).some((l) => l.vec && (l.vec.m === pid))) return { ok: false, msg: 'El punto también lo usa un texto, un actuador o un vector' };
  const key = (it) => it.k + it.id, have = new Set(users.map(key));
  let groups; // cada grupo de elementos pasa a un punto nuevo
  if (items.length) {
    const chosen = items.filter((it) => have.has(key(it)));
    if (chosen.length !== items.length) return { ok: false, msg: 'Un elemento seleccionado no usa ese punto' };
    if (chosen.length >= users.length) return { ok: false, msg: 'Quedaría todo en el punto nuevo: elige solo lo que se separa' };
    groups = [chosen];
  } else groups = users.slice(1).map((u) => [u]);
  for (const it of groups.flat()) if (isGen(doc, it.id)) return { ok: false, msg: 'Un elemento lo genera un script: se cambia la llamada' };
  const made = [];
  for (const g of groups) {
    const np = addPoint(doc, P.x, P.y, false);
    if (P.layer) doc.pts[np].layer = P.layer;
    if (P.fixed) doc.pts[np].fixed = true;
    const moving = new Set(g.map((it) => it.id));
    for (const it of g) {
      const o = doc[COLL[it.k] || { ci: 'circles' }[it.k]][it.id];
      if (it.k === 'sp') o.pts = o.pts.map((p) => (p === pid ? np : p));
      else for (const f of Object.keys(o)) if (o[f] === pid && ['a', 'b', 'c', 'p1', 'p2'].includes(f)) o[f] = np;
    }
    const staying = new Set(users.filter((u) => !g.some((m) => m.id === u.id)).map((u) => u.id));
    for (const [cid, k] of Object.entries(doc.cons)) {
      if (!k.refs || !k.refs.includes(pid)) continue;
      const ties = k.refs.some((r) => moving.has(r)), staysToo = k.refs.some((r) => staying.has(r));
      if (ties && staysToo) delete doc.cons[cid]; // unia las dos partes: ya no
      else if (ties) k.refs = k.refs.map((r) => (r === pid ? np : r)); // solo toca lo que se separa: se va con el punto nuevo
    }
    made.push(np);
  }
  cleanup(doc);
  return { ok: true, pts: made };
}
