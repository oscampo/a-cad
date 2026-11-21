// Piezas para portar bibliotecas de SMath (UtilidadesFatiga): temperaturas sin desplazamiento, un numero con su unidad
// como una sola cantidad, el operador ≈ con su tolerancia del dibujo, e interp1 con "extrap".
import assert from 'node:assert/strict';
import { evalExpr, setAngleMode, approxTol, APPROX_TOL } from '../src/expr.js';
import { setDecimal } from '../src/locale.js';
import { newDoc, addPoint, addText } from '../src/model.js';
import { shownText } from '../src/text.js';
import { textVarErrors } from '../src/params.js';

setDecimal('.');
let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const E = (src) => evalExpr(src, { allowMat: true, allowCplx: true });
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) <= e * Math.max(1, Math.abs(b)), `${a} != ${b}`);
const K = [0, 0, 0, 0, 1, 0, 0];

t('temperatura sin desplazamiento: °C es un kelvin de tamaño, °F y °R 5/9', () => {
  const c = E("500'°C"); near(c.value, 500); assert.deepEqual(c.dim, K);
  near(E("500'°C/1'°C").value, 500); near(E("9'°F/1'K").value, 5); near(E("9'degR/1'degC").value, 5);
  near(E("500'°C/1'°C - 450").value, 50); // T/1'°C quita la unidad (antes daba K²)
});

t('un número con su unidad es una sola cantidad («10\'kN/2\'m» es 5 kN/m)', () => {
  const q = E("10'kN/2'm"); near(q.value, 5000); assert.deepEqual(q.dim, [0, 1, -2, 0, 0, 0, 0]);
  near(E("6'm/2'm").value, 3); assert.equal(E("6'm/2'm").dim, undefined);
  const a = E("2'm^2"); near(a.value, 2); assert.deepEqual(a.dim, [2, 0, 0, 0, 0, 0, 0]); // el exponente es de la unidad
  near(E("2*3'mm").value, 0.006);
});

t('≈ (y ~~): casi igual con la tolerancia del dibujo', () => {
  assert.equal(E('1e-15 ≈ 0').value, 1); assert.equal(E('1e-9 ≈ 0').value, 0); assert.equal(E('0.1+0.2 ~~ 0.3').value, 1);
  assert.equal(E("1'm ≈ 100'cm").value, 1); assert.equal(E('(1+2j) ≈ (1+2j)').value, 1);
  assert.equal(E('if(1/3*3 ≈ 1, 7, 8)').value, 7);
  assert.equal(approxTol(), APPROX_TOL);
  setAngleMode({ approxTol: 1e-6 }); assert.equal(E('1e-8 ≈ 0').value, 1); assert.equal(E('1e-5 ≈ 0').value, 0);
  setAngleMode({}); assert.equal(approxTol(), 1e-12);
});

t('interp1 con "extrap" (y "linear"); sin ella fuera de la tabla avisa', () => {
  assert.throws(() => E('interp1([0,1],[0,10],2)'), /extrap/);
  near(E('interp1([0,1],[0,10],2,"extrap")').value, 20); near(E('interp1([0,1],[0,10],-1,"linear","extrap")').value, -10);
  assert.deepEqual(E('interp1([0,1,2],[0,10,40],[0.5,3],"extrap")').mat, [[5, 70]]);
  const q = E("interp1([0,1]*1'm, [0,10]*1'kN, 2'm, \"extrap\")"); near(q.value, 20000); assert.deepEqual(q.dim, [1, 1, -2, 0, 0, 0, 0]);
  assert.throws(() => E('interp1([0,1],[0,10],0.5,"spline")'), /solo interpolación lineal/);
  assert.throws(() => E('interp1("a",[0,10],2)'), /no recibe cadenas/);
});

t('varargin y nargin: valores opcionales de cualquier tipo', () => {
  const V = {
    s: { fn: { params: ['varargin'], body: 'line(t:0, for(k, 1..nargin, t:t+varargin_k), t)' } },
    deq: { fn: { params: ['b', 'varargin'], body: 'if(nargin==1, 0.808*b, 0.808*sqrt(b*varargin_1))' } },
    g: { fn: { params: ['a', 'varargin'], body: 'nargin' } }, h: { fn: { params: ['varargin'], body: 'varargin_2' } },
    uno: { fn: { params: ['x'], body: 'nargin' } }, w: { fn: { params: ['varargin'], body: 'varargin' } },
  };
  const F = (src) => evalExpr(src, { vars: V, allowMat: true, allowCplx: true });
  assert.equal(F('s(1, 2, 3)').value, 6); assert.equal(F('s()').value, 0);
  near(F("deq(10'mm)").value, 0.00808); near(F("deq(10'mm, 40'mm)").value, 0.01616);
  assert.equal(F('g(1, "x", [1,2])').value, 3); assert.equal(F('h(1, "dos")').str, 'dos'); assert.equal(F('uno(5)').value, 1);
  assert.deepEqual(F('h(0, [1,2])').mat, [[1, 2]]);
  assert.throws(() => F('g()'), /al menos un valor/); assert.throws(() => F('h(1)'), /pero «varargin» trae 1/);
  assert.throws(() => F('w(1)'), /varargin_1/); assert.throws(() => E('nargin'), /dentro de una función/);
  // en los textos y en un script; varargin va al final
  const d = newDoc(); d.decimal = '.';
  const L = ['f(a, varargin):a + if(nargin>1, varargin_1, 0)', 'f(2)=', 'f(2, 3)=', 'm(varargin, b):b'];
  const T = L.map((q, i) => d.texts[addText(d, addPoint(d, 0, 300 - i * 10), '$$' + q + '$$', {})]);
  addText(d, addPoint(d, 0, 0), '%suma(varargin):\n  t:0\n  for e in 1..nargin:\n    t:t+varargin_e\n  t', {});
  const out = d.texts[addText(d, addPoint(d, 0, -10), '$$suma(4, 5)=$$', {})];
  const show = (q) => shownText(d, q).text.replace(/[\uE000-\uF8FF]/g, '');
  assert.equal(show(T[1]), '$$f(2)=2$$'); assert.equal(show(T[2]), '$$f(2, 3)=5$$'); assert.equal(show(out), '$$suma(4, 5)=9$$');
  assert.deepEqual(textVarErrors(d).map((e) => e.msg), ['«m(…)»: «varargin» va al final de los parámetros (recibe los valores que sobran)']);
});

console.log(`\n${passed} pruebas de fatiga pasaron`);
