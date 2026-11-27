// Capas bloqueadas y apagadas: el cuadro de seleccion no toma lo suyo (boxsel.js, model.js).
import assert from 'node:assert/strict';
import { newDoc, addPoint, addLine, addCircle, addLayer, isLocked, layerLockedPoints } from '../src/model.js';
import { boxSelect } from '../src/boxsel.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const R = { x0: -50, y0: -50, x1: 150, y1: 150 };
const ids = (d, o = {}) => boxSelect(d, R, o).map((x) => x.k + x.id).sort();

// capa A con una linea y un circulo; capa B con una linea
function mk() {
  const d = newDoc();
  const A = addLayer(d, 'A');
  const a1 = addPoint(d, 0, 0), a2 = addPoint(d, 10, 0), la = addLine(d, a1, a2), cc = addCircle(d, addPoint(d, 50, 50), 5);
  const B = addLayer(d, 'B');
  const b1 = addPoint(d, 0, 20), b2 = addPoint(d, 10, 20), lb = addLine(d, b1, b2);
  return { d, A, B, a1, a2, la, cc, b1, b2, lb };
}

t('sin bloquear ni apagar, el cuadro toma las dos capas', () => {
  const { d, la, lb, cc } = mk();
  const r = ids(d);
  assert.ok(r.includes('l' + la.slice(1)) || r.includes('ln' + la)); assert.ok(r.includes('ln' + lb)); assert.ok(r.includes('ci' + cc));
});

t('una capa bloqueada no entra al cuadro (ni sus elementos ni sus puntos); la otra sigue', () => {
  const { d, A, la, lb, cc, a1, a2, b1 } = mk();
  d.layers[A].locked = true;
  assert.equal(isLocked(d, d.lines[la]), true); assert.equal(isLocked(d, d.lines[lb]), false);
  const r = ids(d);
  assert.ok(!r.includes('ln' + la) && !r.includes('ci' + cc), 'nada de la capa A');
  assert.ok(!r.includes('pt' + a1) && !r.includes('pt' + a2), 'ni sus puntos');
  assert.ok(r.includes('ln' + lb) && r.includes('pt' + b1), 'la capa B si');
  assert.ok(layerLockedPoints(d).has(a1));
});

t('desbloquear la devuelve al cuadro', () => {
  const { d, A, la } = mk();
  d.layers[A].locked = true; delete d.layers[A].locked;
  assert.ok(ids(d).includes('ln' + la));
});

t('una capa apagada tampoco entra al cuadro (antes si entraba)', () => {
  const { d, A, la, lb, cc } = mk();
  d.layers[A].on = false;
  const r = ids(d);
  assert.ok(!r.includes('ln' + la) && !r.includes('ci' + cc));
  assert.ok(r.includes('ln' + lb));
});

t('un punto compartido con un elemento de una capa sin bloquear sigue eligiendose', () => {
  const { d, A, a2, lb } = mk();
  d.layers[A].locked = true;
  d.lines[lb].b = a2; // la linea de B usa el punto de A: ya no es solo de la capa bloqueada
  assert.ok(ids(d).includes('pt' + a2));
});

console.log(`${passed} pruebas de capas bloqueadas`);
