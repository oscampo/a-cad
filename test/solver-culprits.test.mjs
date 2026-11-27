// Un arrastre que el solver no puede resolver: failCulprits nombra las relaciones que, quitadas, lo dejan resolver (dibujo real: transforma-iso.json,
// con tangencias entre piezas de una misma elipse que vuelven singular el sistema; antes cualquier arrastre fallaba sin avisar).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initSolver, solve, failCulprits, beginSession } from '../src/solver.js';
import { newDoc, addPoint, addLine } from '../src/model.js';

await initSolver();
let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const load = () => JSON.parse(readFileSync(new URL('./fixtures/transforma-iso-tangentes.json', import.meta.url), 'utf8')).doc;
const target = (d, id = 'p40') => [{ id, x: d.pts[id].x + 10, y: d.pts[id].y + 10 }];

t('el dibujo real no se deja mover: ni un texto libre (el solver no converge)', () => {
  const d = load(); beginSession(d, true);
  const o = { ...d.pts.p40 }, r = solve(d, target(d));
  assert.equal(r.ok, false);
  assert.equal(d.pts.p40.x, o.x);
});

t('failCulprits nombra las dos tangencias que lo impiden, cada una basta quitarla', () => {
  const d = load();
  const ids = failCulprits(d, target(d));
  assert.ok(ids.includes('k1146') && ids.includes('k1154'), ids.join(','));
  assert.ok(!ids.includes('k1153'), 'k1153 sola no lo arregla');
});

t('failCulprits no cambia el dibujo ni su sesion', () => {
  const d = load(); beginSession(d, true);
  const antes = JSON.stringify(d);
  failCulprits(d, target(d));
  assert.equal(JSON.stringify(d), antes);
});

t('quitar una de las relaciones nombradas deja mover', () => {
  const d = load(); delete d.cons.k1154; beginSession(d, true);
  const o = d.pts.p40.x;
  assert.equal(solve(d, target(d)).ok, true);
  assert.ok(d.pts.p40.x > o);
});

t('un dibujo sano no tiene culpables', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 10, 0);
  addLine(d, a, b);
  assert.deepEqual(failCulprits(d, [{ id: b, x: 12, y: 3 }]), []);
});

t('con tiempo agotado devuelve lo visto sin colgarse', () => {
  const d = load();
  assert.ok(Array.isArray(failCulprits(d, target(d), 0)));
});

console.log(passed + ' pruebas de relaciones culpables');
