// Reparar un contorno: aristas repetidas y puntos coincidentes (src/repair.js).
import assert from 'node:assert/strict';
import { newDoc, addPoint, addLine, addEllipse, addCon, addCtr, ctrMembers } from '../src/model.js';
import { ctrDescribe } from '../src/tree.js';
import { dupEdges, removeDupEdges, coincidentPoints, mergePoints, mergeCoincident, ctrIssues } from '../src/repair.js';

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

console.log(`${passed} pruebas de reparar contornos`);
