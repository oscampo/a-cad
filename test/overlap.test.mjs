// Elementos superpuestos bajo un toque (src/overlap.js).
import assert from 'node:assert/strict';
import { newDoc, addPoint, addLine, addCircle } from '../src/model.js';
import { nearAll, describe } from '../src/overlap.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const V = { s: 100, ox: 0, oy: 0 }; // 1 unidad = 100 px; y hacia arriba: pantalla (x*100, -y*100)
const at = (x, y) => [x * 100, -y * 100];

t('puntos coincidentes: aparecen todos, primero los mas cercanos', () => {
  const d = newDoc();
  const a = addPoint(d, 1, 1), b = addPoint(d, 1, 1), c = addPoint(d, 1.05, 1), far = addPoint(d, 3, 3);
  const r = nearAll(d, V, ...at(1, 1));
  assert.deepEqual(r.map((x) => x.id).sort(), [a, b, c].sort());
  assert.ok(!r.some((x) => x.id === far));
  assert.ok(r.every((x) => x.k === 'pt'));
  assert.equal(r[r.length - 1].id, c);
});

t('lineas colineales y superpuestas: las dos', () => {
  const d = newDoc();
  const p0 = addPoint(d, 0, 0), p1 = addPoint(d, 4, 0), p2 = addPoint(d, 1, 0), p3 = addPoint(d, 3, 0);
  const l1 = addLine(d, p0, p1), l2 = addLine(d, p2, p3);
  const r = nearAll(d, V, ...at(2, 0.02)).filter((x) => x.k === 'ln');
  assert.deepEqual(r.map((x) => x.id).sort(), [l1, l2].sort());
  assert.equal(nearAll(d, V, ...at(3.5, 0)).filter((x) => x.k === 'ln').map((x) => x.id).join(), l1); // el tramo de l2 no llega
});

t('circulos concentricos: el centro da un punto, el borde comun da ambos si coinciden', () => {
  const d = newDoc();
  const c = addPoint(d, 0, 0), c2 = addPoint(d, 0, 0);
  const a = addCircle(d, c, 2), b = addCircle(d, c2, 2.05);
  const r = nearAll(d, V, ...at(2.02, 0));
  assert.deepEqual(r.filter((x) => x.k === 'ci').map((x) => x.id).sort(), [a, b].sort());
  assert.deepEqual(nearAll(d, V, ...at(0, 0)).map((x) => x.k + x.id).sort(), ['p' + c, 'p' + c2].map((s) => s.replace(/^p/, 'pt')).sort());
});

t('filtros: puntos ocultos y elementos no seleccionables se omiten', () => {
  const d = newDoc();
  const a = addPoint(d, 1, 1), b = addPoint(d, 1, 1);
  assert.deepEqual(nearAll(d, V, ...at(1, 1), { pts: new Set([a]) }).map((x) => x.id), [a]);
  assert.deepEqual(nearAll(d, V, ...at(1, 1), { ok: (k, o) => o !== d.pts[b] }).map((x) => x.id), [a]);
});

t('describe: texto legible, y no falla con un elemento que ya no existe', () => {
  const d = newDoc();
  const a = addPoint(d, 1, 2), b = addPoint(d, 4, 6), l = addLine(d, a, b);
  assert.match(describe(d, 'pt', a), /Punto .* en \(1, 2\)/);
  assert.match(describe(d, 'ln', l), /largo 5/);
  assert.match(describe(d, 'ci', 'zz'), /Círculo zz/);
});

console.log(`\n${passed} pruebas de superpuestos pasaron`);
