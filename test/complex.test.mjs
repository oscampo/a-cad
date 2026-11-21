// Numeros complejos: j y el sufijo (3j, 2.5i), aritmetica, funciones (como en MATLAB), matrices y unidades.
import assert from 'node:assert/strict';
import { evalExpr } from '../src/expr.js';
import { setDecimal } from '../src/locale.js';

setDecimal('.');
let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const C = (src, vars = null, radians = true) => evalExpr(src, { vars, allowMat: true, allowCplx: true, radians });
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) <= e * Math.max(1, Math.abs(b)), `${a} != ${b}`);
const z = (src, re, im, vars, radians) => { const r = C(src, vars, radians); near(r.value, re); near(r.im || 0, im); };
const mz = (src, re, im) => { const r = C(src); assert.deepEqual(r.mat.map((q) => q.map((x) => +x.toFixed(9))), re); assert.deepEqual((r.mi || re.map((q) => q.map(() => 0))).map((q) => q.map((x) => +x.toFixed(9))), im); };

t('j, el sufijo y la aritmetica', () => {
  z('3+4j', 3, 4); z('2.5i', 0, 2.5); z('j^2', -1, 0);
  z('(3+4j)*(3-4j)', 25, 0); z('(3+4j)/(1-2j)', -1, 2); z('(3+4j)^2', -7, 24); z('-(1+2j)', -1, -2);
  z('2(1+j)', 2, 2); // multiplicacion implicita
  assert.equal(C('i*2', { i: { v: 7, r: false } }).value, 14); // «i» sola sigue siendo una variable
  z('j*i', 0, 7, { i: { v: 7, r: false } });
});

t('funciones: modulo, argumento, partes, conjugado; las de MATLAB dan complejos fuera del dominio real', () => {
  assert.equal(C('abs(3+4j)').value, 5); near(C('angle(1+1j)').value, Math.PI / 4); near(C('angle(1+1j)', null, false).value, 45);
  assert.equal(C('real(3+4j)').value, 3); assert.equal(C('imag(3+4j)').value, 4); z('conj(3+4j)', 3, -4);
  z('sqrt(-4)', 0, 2); z('√(-9)', 0, 3); z('ln(-1)', 0, Math.PI); z('exp(j*pi)', -1, 0);
  z('(-8)^(1/3)', 1, Math.sqrt(3)); z('2^j', Math.cos(Math.LN2), Math.sin(Math.LN2)); z('sin(j)', 0, Math.sinh(1));
  near(C('acos(2)').im, Math.acosh(2));
});

t('matrices complejas: literal, indices, producto, inversa, determinante, transpuesta', () => {
  mz('[1+j, 2; 3, 4-2j]', [[1, 2], [3, 4]], [[1, 0], [0, -2]]);
  z('det([1+j, 2; 3, 4])', -2, 4);
  mz('inv([1+j, 2; 3, 4])', [[-0.4, 0.2], [0.3, 0.1]], [[-0.8, 0.4], [0.6, -0.3]]);
  z('[1+j, 2]*[3; 4j]', 3, 11);
  mz('[1, 2j]^T', [[1], [0]], [[0], [2]]);
  mz('sqrt([-4, 9])', [[0, 3]], [[2, 0]]);
  const M = { M: { mat: [[1, 2], [3, 4]], mi: [[1, 0], [0, 1]] } };
  z('M_(1,1)', 1, 1, M); z('sum([1+j, 2-j])', 3, 0);
});

t('unidades: una impedancia en Ω; |Z| conserva la unidad', () => {
  const r = C("(3+4j)*1'Ω");
  assert.deepEqual([r.value, r.im], [3, 4]); assert.deepEqual(r.dim, [2, 1, -3, -2, 0, 0, 0]);
  assert.equal(C("abs(3'Ω+4j*1'Ω)").value, 5);
});

t('donde hace falta un real (una cota, una grafica, una condicion) el complejo avisa', () => {
  assert.throws(() => evalExpr('3+4j'), /número complejo/);
  assert.equal(evalExpr('abs(3+4j)').value, 5);
  assert.throws(() => C('(3+4j)>2'), /No se pueden comparar números complejos/);
  assert.equal(C('(3+4j)==(3+4j)').value, 1);
  assert.throws(() => C('if(j, 1, 2)'), /condición de if\(\) no puede ser un número complejo/);
  assert.throws(() => C('max(1+j, 2)'), /no admite números complejos/);
  assert.throws(() => C('fzero(x^2+j, x, 1)'), /complejo/);
});

t('lo real no cambia', () => {
  assert.equal(evalExpr('2*3+1').value, 7); assert.equal(evalExpr('sqrt(16)').value, 4);
  assert.deepEqual(evalExpr('[1,2]*[3;4]', { allowMat: true }).value, 11);
  assert.equal(evalExpr('0*5').value, 0);
});

console.log(`\n${passed} pruebas de números complejos pasaron`);
