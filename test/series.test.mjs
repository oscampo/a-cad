// Sumatorias y productorias: sum_(k=1)^8(k), \sum_(k=1)^8(k), prod_(k=1)^n(k) y sumatoria(k; k; 1; 8).
import assert from 'node:assert/strict';
import { evalExpr } from '../src/expr.js';
import { newDoc, addPoint, addText } from '../src/model.js';
import { shownText } from '../src/text.js';
import { textVarErrors } from '../src/params.js';
import { setDecimal } from '../src/locale.js';

setDecimal(undefined);
let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const BS = String.fromCharCode(92);
const vars = { n: { v: 4, r: false }, x: { v: 2, r: false }, v: { vec: [10, 20, 30], r: false } };
const ev = (s) => evalExpr(s, { vars, allowMat: true, allowCplx: true });
const err = (s, re) => assert.throws(() => ev(s), re);

t('la notacion: suma y producto, con o sin «\\», limite entre parentesis o no', () => {
  assert.equal(ev('sum_(k=1)^8(k)').value, 36); assert.equal(ev(BS + 'sum_(k=1)^8(k)').value, 36);
  assert.equal(ev('sum_(k=1)^(8)(k^2)').value, 204); assert.equal(ev('prod_(k=1)^5(k)').value, 120); assert.equal(ev(BS + 'prod_(k=1)^4(k)').value, 24);
  assert.equal(ev('sum_(k=1)^n(k*x)').value, 20); assert.equal(ev('sum_(k = 2) ^ 4 (k)').value, 9);
});

t('se compone con el resto de la formula y con otras sumatorias', () => {
  assert.equal(ev('sum_(k=1)^8(k)+1').value, 37); assert.equal(ev('2*sum_(k=1)^4(k)').value, 20);
  assert.equal(ev('sum_(k=1)^3(sum_(m=1)^k(m))').value, 10); assert.equal(ev('sum_(k=1)^3(k)/prod_(k=1)^3(k)').value, 1);
});

t('la variable tambien indexa un vector; la forma de funcion es la misma', () => {
  assert.equal(ev('sum_(i=1)^3(v_i)').value, 60); assert.equal(ev('sumatoria(k; k; 1; 4)').value, 10); assert.equal(ev('productoria(k; k; 1; 4)').value, 24);
});

t('vacia: la suma vale 0 y el producto 1; con unidades: las del termino (el producto, elevadas)', () => {
  assert.equal(ev('sum_(k=5)^1(k)').value, 0); assert.equal(ev('prod_(k=5)^1(k)').value, 1);
  const s = ev("sum_(k=1)^3(k*2'm)"); assert.equal(s.value, 12); assert.deepEqual(s.dim, [1, 0, 0, 0, 0, 0, 0]);
  const p = ev("prod_(k=1)^3(2'm)"); assert.equal(p.value, 8); assert.deepEqual(p.dim, [3, 0, 0, 0, 0, 0, 0]);
});

t('errores claros: sin parentesis, sin limite, limites no enteros, terminos de unidades distintas, vectores', () => {
  err('sum_(k=1)^8 k', /El sumando va entre paréntesis/); err('sum_(k=1)(k)', /necesita el límite superior/);
  err('sum_(k=1)^2.5(k)', /límites son números enteros sin unidades/); err("sum_(k=1)^3(k*1'm + 1'kg)", /No se puede sumar/);
  err('sum_(k=1)^2([k, k])', /vector|matriz/); err('sum_(k=1)^200000(k)', /hasta 100000 términos/);
});

t('en un texto del dibujo: se calcula, se dibuja Σ y la variable puede definirse despues de usarse si falta (⚠) o antes', () => {
  const d = newDoc();
  const L = [BS + 'sum_(k=1)^8(k)=', 'x:3', 'sum_(k=1)^4(k*x)=', 'sum_(k=1)^q(k)=', 'q:5', 'sum_(k=1)^q(k)=', 'y:sum_(k=1)^4(k)', 'y='];
  const T = L.map((q, i) => d.texts[addText(d, addPoint(d, 0, -i * 40), '$$' + q + '$$', {})]);
  const show = (q) => shownText(d, q).text.replace(/[-]/g, '');
  assert.ok(show(T[0]).endsWith('=36$$')); assert.ok(show(T[2]).endsWith('=30$$')); assert.ok(show(T[3]).endsWith('⚠$$')); assert.ok(show(T[5]).endsWith('=15$$')); assert.ok(show(T[7]).endsWith('=10$$'));
  assert.deepEqual(textVarErrors(d).map((e) => e.msg), []);
});

console.log(passed + ' pruebas de sumatorias y productorias');
