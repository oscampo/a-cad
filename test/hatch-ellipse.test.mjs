// Rellenos con arcos elipticos y con extremos que coinciden sin compartir punto.
import assert from 'node:assert/strict';
import { newDoc, addPoint, addLine, addEllipse, hatchLoops, cleanup, visibleDoc } from '../src/model.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const area = (p) => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a.x * b.y - b.x * a.y; } return Math.abs(s / 2); };

function halfEllipse(shared) {
  const d = newDoc();
  const c = addPoint(d, 0, 0), a = addPoint(d, 10, 0), b = addPoint(d, 0, 5), l = addPoint(d, -10, 0);
  const e = addEllipse(d, c, a, b, {}, a, l);
  const l2 = shared ? l : addPoint(d, -10, 0), r2 = shared ? a : addPoint(d, 10, 0);
  const ln = addLine(d, l2, r2);
  return { d, ids: [e, ln] };
}

t('un arco eliptico y una linea cierran un relleno (area de media elipse)', () => {
  const { d, ids } = halfEllipse(true);
  const L = hatchLoops(d, { ids });
  assert.equal(L.length, 1);
  assert.ok(Math.abs(area(L[0].pts) - (Math.PI * 10 * 5) / 2) < 0.2, String(area(L[0].pts)));
});

t('los extremos que coinciden sin compartir punto tambien se encadenan', () => {
  const { d, ids } = halfEllipse(false);
  const L = hatchLoops(d, { ids });
  assert.equal(L.length, 1);
  assert.ok(Math.abs(area(L[0].pts) - (Math.PI * 10 * 5) / 2) < 0.2);
});

t('una elipse completa es un contorno por si sola', () => {
  const d = newDoc();
  const e = addEllipse(d, addPoint(d, 0, 0), addPoint(d, 10, 0), addPoint(d, 0, 5), {});
  const L = hatchLoops(d, { ids: [e] });
  assert.equal(L.length, 1);
  assert.ok(Math.abs(area(L[0].pts) - Math.PI * 50) < 1);
});

t('limpiar y la vista conservan la elipse en el relleno', () => {
  const { d, ids } = halfEllipse(true);
  d.hatches.h1 = { ids: [...ids], kind: 'solid', angle: 45, spacing: 8, alpha: 0.2, color: 'auto' };
  cleanup(d);
  assert.deepEqual(d.hatches.h1.ids, ids);
  assert.ok('h1' in visibleDoc(d).hatches);
});

console.log(`${passed} pruebas de rellenos con elipses`);
