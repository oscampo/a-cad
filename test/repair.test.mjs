// Reparar un contorno: aristas repetidas y puntos coincidentes (src/repair.js).
import assert from 'node:assert/strict';
import { newDoc, addPoint, addLine, addArc, addEllipse, addCon, addCtr, ctrMembers } from '../src/model.js';
import { ctrDescribe } from '../src/tree.js';
import { dupEdges, removeDupEdges, coincidentPoints, mergePoints, mergeCoincident, ctrIssues, dissolvePoint, mergeGroup } from '../src/repair.js';
import { splitElement } from '../src/split.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const n = (o) => Object.keys(o || {}).length;

// un cuadrado cuyo ultimo vertice esta duplicado: l4 termina en q0, un punto distinto de p0 pero en el mismo lugar
function brokenSquare() {
  const d = newDoc();
  const p = [addPoint(d, 0, 0), addPoint(d, 10, 0), addPoint(d, 10, 10), addPoint(d, 0, 10)];
  const q0 = addPoint(d, 0, 0);
  const l = [addLine(d, p[0], p[1]), addLine(d, p[1], p[2]), addLine(d, p[2], p[3]), addLine(d, p[3], q0)];
  const items = l.map((id) => ({ k: 'ln', id }));
  return { d, p, q0, l, items };
}

t('aristas repetidas: una elipse dibujada dos veces, y una linea al reves', () => {
  const d = newDoc();
  const c = addPoint(d, 0, 0), a = addPoint(d, 10, 0), b = addPoint(d, 0, 5), p2 = addPoint(d, -10, 0);
  const e1 = addEllipse(d, c, a, b, {}, a, p2), e2 = addEllipse(d, c, a, b, {}, a, p2);
  const l1 = addLine(d, a, p2), l2 = addLine(d, p2, a);
  const g = dupEdges(d, [e1, e2, l1, l2].map((id) => ({ k: id.startsWith('e') ? 'el' : 'ln', id })));
  assert.equal(g.length, 2);
  assert.ok(g.every((x) => x.dups.length === 1));
});

t('quitar repetidas: queda una de cada y no se toca lo demas', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 10, 0), c = addPoint(d, 10, 10);
  const l1 = addLine(d, a, b), l2 = addLine(d, a, b), l3 = addLine(d, b, c);
  const items = [l1, l2, l3].map((id) => ({ k: 'ln', id }));
  assert.equal(removeDupEdges(d, items), 1);
  assert.equal(n(d.lines), 2);
  assert.ok(l3 in d.lines);
});

t('entre dos repetidas se conserva la que tiene relaciones', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 10, 0);
  const l1 = addLine(d, a, b), l2 = addLine(d, a, b);
  addCon(d, { t: 'H', refs: [l2] });
  removeDupEdges(d, [l1, l2].map((id) => ({ k: 'ln', id })));
  assert.deepEqual(Object.keys(d.lines), [l2]);
  assert.equal(n(d.cons), 1);
});

t('puntos coincidentes: se detectan los distintos en el mismo lugar y no los que comparten id', () => {
  const { d, p, q0 } = brokenSquare();
  const c = coincidentPoints(d, [...p, q0]);
  assert.equal(c.length, 1);
  assert.deepEqual(c[0].sort(), [p[0], q0].sort());
});

t('fusionar coincidentes: el contorno roto queda cerrado', () => {
  const { d, items } = brokenSquare();
  const { id } = addCtr(d, items);
  assert.match(ctrDescribe(d, id).state, /1 unión sin restricción/);
  const r = mergeCoincident(d, ctrMembers(d, id));
  assert.equal(r.merged, 1); assert.deepEqual(r.skipped, []);
  assert.equal(ctrDescribe(d, id).state, 'cerrado');
  assert.equal(n(d.pts), 4);
});

t('fusionar: las relaciones del punto que se va pasan al que se queda', () => {
  const { d, p, q0, l } = brokenSquare();
  addCon(d, { t: 'V', refs: [l[3]] });
  addCon(d, { t: 'DIST', refs: [q0, p[2]], v: 14.142 });
  assert.ok(mergePoints(d, p[0], q0).ok);
  assert.equal(d.lines[l[3]].b, p[0]);
  assert.ok(Object.values(d.cons).some((k) => k.t === 'DIST' && k.refs.includes(p[0]) && k.refs.includes(p[2])));
});

t('fusionar: una relacion entre los dos puntos desaparece (ya no tiene sentido)', () => {
  const { d, p, q0 } = brokenSquare();
  addCon(d, { t: 'COI', refs: [p[0], q0] });
  assert.ok(mergePoints(d, p[0], q0).ok);
  assert.equal(Object.values(d.cons).filter((k) => k.t === 'COI').length, 0);
});

t('fusionar: se niega si una linea va de uno al otro, y no cambia nada', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 0, 0);
  const l = addLine(d, a, b);
  const r = mergePoints(d, a, b);
  assert.equal(r.ok, false); assert.ok(b in d.pts); assert.equal(d.lines[l].b, b);
});

t('fusionar: conserva fijo y visible si alguno lo era', () => {
  const { d, p, q0 } = brokenSquare();
  d.pts[q0].fixed = true; d.pts[q0].auto = false; d.pts[p[0]].auto = true;
  mergePoints(d, p[0], q0);
  assert.equal(d.pts[p[0]].fixed, true); assert.equal(d.pts[p[0]].auto, false);
});

t('ctrIssues: resume lo que hay que reparar en un grupo', () => {
  const { d, items } = brokenSquare();
  const dup = addLine(d, d.lines[items[0].id].a, d.lines[items[0].id].b);
  const { id } = addCtr(d, [...items, { k: 'ln', id: dup }]);
  const r = ctrIssues(d, id);
  assert.equal(r.dups.length, 1); assert.equal(r.clusters.length, 1);
});

// ---- disolver un punto (lo contrario de dividir) y fusionar una seleccion
t('disolver: dos lineas alineadas pasan a ser una, el punto desaparece y se conserva el estilo y el grupo', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), m = addPoint(d, 5, 0), b = addPoint(d, 10, 0);
  const l1 = addLine(d, a, m, { color: '#f00', ltype: 'continua', w: 2, ls: 1 }), l2 = addLine(d, m, b);
  const { id } = addCtr(d, [l1, l2].map((x) => ({ k: 'ln', id: x })));
  d.hatches.h1 = { ids: [l1, l2], kind: 'solid' };
  const r = dissolvePoint(d, m);
  assert.ok(r.ok, r.msg);
  assert.deepEqual(Object.keys(d.lines), [l1]);
  assert.deepEqual([d.lines[l1].a, d.lines[l1].b], [a, b]);
  assert.equal(m in d.pts, false);
  assert.equal(d.lines[l1].color, '#f00');
  assert.deepEqual(d.hatches.h1.ids, [l1]);
  assert.equal(d.ctrs, undefined, 'con un solo elemento el grupo ya no existe (menos de 2)');
  assert.equal(id.startsWith('k'), true);
});

t('disolver es lo contrario de dividir: dividir y disolver devuelven la linea original', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 10, 0), q = addPoint(d, 4, 0);
  const l = addLine(d, a, b);
  const r = splitElement(d, l, [q]);
  assert.ok(r.ok); assert.equal(n(d.lines), 2);
  const x = dissolvePoint(d, q);
  assert.ok(x.ok, x.msg);
  assert.equal(n(d.lines), 1);
  const L = Object.values(d.lines)[0];
  assert.deepEqual([L.a, L.b].sort(), [a, b].sort());
});

t('disolver: las relaciones del punto y de la linea que se absorbe se pierden; las de la que queda siguen', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), m = addPoint(d, 5, 0), b = addPoint(d, 10, 0), c = addPoint(d, 5, 5);
  const l1 = addLine(d, a, m), l2 = addLine(d, m, b);
  addCon(d, { t: 'H', refs: [l1] });
  addCon(d, { t: 'DIST', refs: [m, c], v: 5 });
  addCon(d, { t: 'EQL', refs: [l1, l2] });
  const before = n(d.cons);
  assert.ok(dissolvePoint(d, m).ok);
  assert.equal(before, 3);
  assert.deepEqual(Object.values(d.cons).map((k) => k.t), ['H']);
});

t('disolver: se niega si no estan alineadas, si algo mas usa el punto o si no es el extremo de dos elementos', () => {
  let d = newDoc();
  let a = addPoint(d, 0, 0), m = addPoint(d, 5, 0), b = addPoint(d, 10, 5);
  addLine(d, a, m); addLine(d, m, b);
  assert.equal(dissolvePoint(d, m).ok, false);
  d = newDoc(); a = addPoint(d, 0, 0); m = addPoint(d, 5, 0); b = addPoint(d, 10, 0);
  const c = addPoint(d, 5, 5);
  addLine(d, a, m); addLine(d, m, b); addLine(d, m, c); // tres lineas en el punto
  assert.equal(dissolvePoint(d, m).ok, false);
  d = newDoc(); a = addPoint(d, 0, 0); b = addPoint(d, 10, 0);
  addLine(d, a, b);
  assert.equal(dissolvePoint(d, a).ok, false, 'un extremo suelto no se disuelve');
});

t('disolver: dos arcos del mismo circulo que se continuan pasan a ser uno', () => {
  const d = newDoc();
  const o = addPoint(d, 0, 0), p1 = addPoint(d, 10, 0), p2 = addPoint(d, 0, 10), p3 = addPoint(d, -10, 0);
  const a1 = addArc(d, o, p1, p2, 10, {}), a2 = addArc(d, o, p2, p3, 10, {});
  const r = dissolvePoint(d, p2);
  assert.ok(r.ok, r.msg);
  assert.deepEqual(Object.keys(d.arcs), [a1]);
  assert.deepEqual([d.arcs[a1].a, d.arcs[a1].b], [p1, p3]);
  assert.equal(p2 in d.pts, false);
  assert.equal(a2 in d.arcs, false);
});

t('disolver: dos arcos de circulos distintos no se disuelven', () => {
  const d = newDoc();
  const o = addPoint(d, 0, 0), o2 = addPoint(d, 3, 0), p1 = addPoint(d, 10, 0), p2 = addPoint(d, 0, 10), p3 = addPoint(d, -10, 0);
  addArc(d, o, p1, p2, 10, {}); addArc(d, o2, p2, p3, 10, {});
  assert.equal(dissolvePoint(d, p2).ok, false);
});

t('mergeGroup: une una seleccion en un punto, el de mas peso, y avisa de lo que no pudo', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 0, 0), c = addPoint(d, 0, 0), z = addPoint(d, 9, 9);
  addLine(d, a, z); addLine(d, b, z); addLine(d, c, z);
  addCon(d, { t: 'H', refs: [Object.keys(d.lines)[1]] });
  const r = mergeGroup(d, [a, b, c]);
  assert.equal(r.merged, 2); assert.deepEqual(r.skipped, []);
  assert.equal(n(d.pts), 2);
  assert.equal(r.keep in d.pts, true);
});

console.log(`${passed} pruebas de reparar contornos`);
