// Recortar dos elipses que se cruzan: la segunda debe seguir encontrando sus cruces tras recortar la primera.
import assert from 'node:assert/strict';
import { newDoc, addPoint, addEllipse, isPartial, ellipseOf, ellipseRange, ellipsePoint } from '../src/model.js';
import { trimAt } from '../src/edit.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const mk = (d, cx, cy, ax, ay, bx, by) => addEllipse(d, addPoint(d, cx, cy), addPoint(d, ax, ay), addPoint(d, bx, by), {});

t('dos cruces: se recorta el tramo de una y luego el de la otra, sin perder ninguna', (s = 1) => {
  const d = newDoc();
  const e1 = mk(d, 0, 0, 10 * s, 0, 0, 5 * s), e2 = mk(d, 6 * s, 0, 16 * s, 0, 6 * s, 5 * s);
  assert.equal(trimAt(d, 'el', e1, { x: 9.9 * s, y: 0.1 * s }).deleted, undefined);
  assert.ok(isPartial(d.ellipses[e1]));
  const r = trimAt(d, 'el', e2, { x: -3.9 * s + 6 * s - 6 * s, y: 0.1 * s });
  assert.equal(r.deleted, undefined);
  assert.ok(e1 in d.ellipses && e2 in d.ellipses);
  assert.ok(isPartial(d.ellipses[e2]));
});

t('lo mismo con elipses grandes (la poligonal se aparta mas de la elipse)', () => {
  const d = newDoc();
  const e1 = mk(d, 0, 0, 1000, 0, 0, 500), e2 = mk(d, 600, 0, 1600, 0, 600, 500);
  trimAt(d, 'el', e1, { x: 999, y: 10 });
  const r = trimAt(d, 'el', e2, { x: -399, y: 10 });
  assert.equal(r.deleted, undefined);
  assert.ok(e1 in d.ellipses && e2 in d.ellipses);
});

t('cuatro cruces (elipses en cruz): se quita un tramo de cada una y quedan arcos', () => {
  const d = newDoc();
  const e1 = mk(d, 0, 0, 10, 0, 0, 4), e2 = mk(d, 0, 0, 0, 10, 4, 0);
  const r1 = trimAt(d, 'el', e1, { x: 10, y: 0 });
  assert.equal(r1.deleted, undefined);
  const r2 = trimAt(d, 'el', e2, { x: 0, y: 10 });
  assert.equal(r2.deleted, undefined);
  assert.ok(e1 in d.ellipses && e2 in d.ellipses);
});

console.log(`${passed} pruebas de recortar elipses`);
