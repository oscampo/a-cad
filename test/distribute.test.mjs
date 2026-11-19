// Distribucion igualmente espaciada (DSH, DSV): la separacion entre puntos seguidos es la misma; los extremos mandan.
import assert from 'node:assert/strict';
import { newDoc, addPoint, addCon, addText } from '../src/model.js';
import { initSolver, solve, redundantCons } from '../src/solver.js';

await initSolver();
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg || ''} ${a} vs ${b}`);
let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };

t('horizontal: los de en medio se reparten entre los extremos fijos', () => {
  const d = newDoc();
  const ids = [[0, 0], [3, 5], [4, -2], [12, 1]].map(([x, y]) => addPoint(d, x, y));
  d.pts[ids[0]].fixed = d.pts[ids[3]].fixed = true;
  addCon(d, { t: 'DSH', refs: ids });
  assert.ok(solve(d).ok);
  ids.forEach((p, i) => near(d.pts[p].x, 4 * i, p));
  near(d.pts[ids[1]].y, 5, 'y libre'); near(d.pts[ids[2]].y, -2, 'y libre');
});

t('vertical, y al arrastrar un extremo libre los demas siguen repartidos', () => {
  const d = newDoc();
  const ids = [[0, 0], [1, 2], [2, 4]].map(([x, y]) => addPoint(d, x, y));
  d.pts[ids[0]].fixed = true;
  addCon(d, { t: 'DSV', refs: ids });
  assert.ok(solve(d, [{ id: ids[2], x: 2, y: 10 }]).ok);
  const y2 = d.pts[ids[2]].y;
  assert.ok(y2 > 8, 'se movio hacia el destino: ' + y2); // el destino es una atraccion debil: se acerca, no tiene que llegar exacto
  near(d.pts[ids[1]].y, y2 / 2);
  near(d.pts[ids[1]].x, 1, 'x libre');
});

t('textos: se reparte su punto de insercion', () => {
  const d = newDoc();
  const ps = [0, 7, 30].map((y) => addPoint(d, 0, y));
  ps.forEach((p) => addText(d, p, 'hola'));
  d.pts[ps[0]].fixed = d.pts[ps[2]].fixed = true;
  addCon(d, { t: 'DSV', refs: ps });
  assert.ok(solve(d).ok);
  near(d.pts[ps[1]].y, 15);
});

t('no es redundante por si sola, y con un conflicto avisa', () => {
  const d = newDoc();
  const ids = [0, 1, 5].map((x) => addPoint(d, x, 0));
  ids.forEach((p) => { d.pts[p].fixed = true; });
  addCon(d, { t: 'DSH', refs: ids });
  assert.equal(solve(d).ok, false); // 0, 1, 5 fijos no pueden quedar igualmente espaciados
  d.pts[ids[1]].fixed = false;
  assert.ok(solve(d).ok);
  near(d.pts[ids[1]].x, 2.5);
  assert.deepEqual(redundantCons(d), []);
});

console.log(`\n${passed} pruebas de distribucion`);
