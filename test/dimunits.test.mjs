// Cotas con unidad: el dibujo mide lo real (una longitud en mm, otra magnitud en el SI) y la etiqueta lo dice en la unidad de la cota
// («126'in» mide 3200,4 y dice «126 in»); en las formulas una cota con unidad entra como cantidad, sin la escala.
import assert from 'node:assert/strict';
import { newDoc, addPoint, addLine, addCon } from '../src/model.js';
import { dimText, dimUnit, dimShown } from '../src/dims.js';
import { initSolver, solve } from '../src/solver.js';
import { settle, splitUnit, dimEval, varValue, varsList } from '../src/params.js';
import { setDecimal } from '../src/locale.js';

await initSolver();
setDecimal('.');
let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) <= e, `${a} != ${b}`);
const L = [1, 0, 0, 0, 0, 0, 0];

t('splitUnit: la unidad del final se separa; una formula que sigue despues no es unidad', () => {
  assert.deepEqual(splitUnit("126'in"), { body: '126', unit: 'in' });
  assert.deepEqual(splitUnit("D2*2'ft"), { body: 'D2*2', unit: 'ft' });
  assert.deepEqual(splitUnit("3'(m/s)"), { body: '3', unit: 'm/s' });
  assert.deepEqual(splitUnit("9.8'm/s^2"), { body: '9.8', unit: 'm/s^2' });
  assert.equal(splitUnit("2'm*D1"), null);
  assert.equal(splitUnit("D1'mm+D2"), null);
  assert.equal(splitUnit("'in"), null);
  assert.equal(splitUnit('126'), null);
  assert.equal(splitUnit("3'xyz"), null); // unidad que no existe
});

t('dimEval: el dibujo mide lo real y la etiqueta dice la unidad escrita, la de una cota de la formula o la del SI', () => {
  const vars = { D2: { v: 3.2004, d: L, pu: 'in', pf: 0.0254 }, D4: { v: 0.508, d: L, pu: 'in', pf: 0.0254 }, D1: { v: 50 } };
  assert.deepEqual(dimEval("126'in", vars), { v: 3200.4, du: 'in' });
  assert.deepEqual(dimEval('126', vars), { v: 126, du: null });
  assert.deepEqual(dimEval("2'cm", vars), { v: 20, du: 'cm' }); // como siempre: 2 cm miden 20
  assert.deepEqual(dimEval("12'V", vars), { v: 12, du: 'V' }); // otra magnitud: en el SI
  assert.deepEqual(dimEval("5'kN", vars), { v: 5000, du: 'kN' });
  assert.deepEqual(dimEval('D2*2', vars), { v: 6400.8, du: 'in' }); // la unidad de D2
  assert.deepEqual(dimEval("D2*2'ft", vars), { v: 6400.8, du: 'ft' }); // ya trae unidades: solo dice en cual mostrarla
  assert.deepEqual(dimEval("D1'mm+D2", vars), { v: 3250.4, du: 'in' });
  assert.deepEqual(dimEval('D1+3', vars), { v: 53, du: null }); // sin unidades, un numero como siempre
  assert.throws(() => dimEval('D1+D2', vars)); // numero mas longitud
});

const mkLine = (len, extra) => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, len, 0);
  addLine(d, a, b, {});
  const k = addCon(d, { t: 'DIST', refs: [a, b], v: len, ...extra });
  return { d, a, b, k };
};

t("una cota «126'in» mide 3200,4 y dice «126 in»; con [*k] el dibujo cambia y la cota sigue diciendo 126 in", () => {
  const { d, k, a, b } = mkLine(100, { expr: "126'in" });
  assert.ok(settle(d, solve, []).ok);
  near(Math.hypot(d.pts[b].x - d.pts[a].x, d.pts[b].y - d.pts[a].y), 3200.4, 1e-4);
  assert.equal(d.cons[k].du, 'in');
  assert.equal(dimText(d, d.cons[k]), '126 in');
  const s = mkLine(100, { expr: "126'in", scale: 1 / 25.4 });
  assert.ok(settle(s.d, solve, []).ok);
  near(Math.hypot(s.d.pts[s.b].x - s.d.pts[s.a].x, s.d.pts[s.b].y - s.d.pts[s.a].y), 126, 1e-4); // a escala: 126 unidades
  assert.equal(dimText(s.d, s.d.cons[s.k]), '126 in');
});

t('en las formulas una cota con unidad entra como cantidad (sin la escala); su area sale en m²', () => {
  const d = newDoc();
  const p = [addPoint(d, 0, 0), addPoint(d, 100, 0), addPoint(d, 0, 50), addPoint(d, 100, 50)];
  addLine(d, p[0], p[1], {}); addLine(d, p[2], p[3], {});
  const k2 = addCon(d, { t: 'DIST', refs: [p[0], p[1]], v: 100, expr: "126'in", scale: 0.1 });
  const k4 = addCon(d, { t: 'DIST', refs: [p[2], p[3]], v: 50, expr: "20'in" });
  assert.ok(settle(d, solve, []).ok);
  const v2 = varValue(d, d.cons[k2]);
  near(v2.v, 3.2004); assert.deepEqual(v2.d, L); assert.equal(v2.pu, 'in');
  const n2 = d.cons[k2].name, n4 = d.cons[k4].name;
  const area = dimEval(`${n2}*${n4}`, { [n2]: v2, [n4]: varValue(d, d.cons[k4]) });
  near(area.v, 3.2004 * 0.508); assert.equal(area.du, 'm²');
  assert.match(varsList(d), new RegExp(`${n2} = 126 in`));
});

t('una cota de solo lectura con unidad dice la medida en ella; sin unidad, todo como antes', () => {
  const { d, k } = mkLine(254, { ref: true, du: 'in' });
  near(dimShown(d, d.cons[k]), 10);
  assert.equal(dimText(d, d.cons[k]), '10 in');
  const o = mkLine(254, {});
  assert.equal(dimText(o.d, o.d.cons[o.k]), '254');
  assert.deepEqual(varValue(o.d, o.d.cons[o.k]), { v: 254, r: false });
  assert.equal(dimUnit('xyz'), null); assert.equal(dimUnit('in').g, 25.4); assert.equal(dimUnit('V').g, 1);
});

console.log(`\n${passed} pruebas de cotas con unidad pasaron`);
