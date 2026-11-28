// Piezas para portar bibliotecas de SMath (UtilidadesFatiga): temperaturas sin desplazamiento, un numero con su unidad
// como una sola cantidad, el operador ≈ con su tolerancia del dibujo, e interp1 con "extrap".
import assert from 'node:assert/strict';
import { evalExpr, setAngleMode, approxTol, APPROX_TOL } from '../src/expr.js';
import { setDecimal } from '../src/locale.js';
import { newDoc, addPoint, addText } from '../src/model.js';
import { shownText } from '../src/text.js';
import { textVarErrors } from '../src/params.js';
import { solveEqs } from '../src/nsolve.js';
import { autoUnit, setUnitSystem } from '../src/units.js';
import { computeGraph } from '../src/graphs.js';

setDecimal('.');
let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const E = (src) => evalExpr(src, { allowMat: true, allowCplx: true });
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) <= e * Math.max(1, Math.abs(b)), `${a} != ${b}`);
const K = [0, 0, 0, 0, 1, 0, 0];

t('una temperatura sin unidad pedida se muestra en la absoluta del sistema: K en SI, °R en anglosajon', () => {
  const K1 = E("1'K").dim;
  try { setUnitSystem('SI'); assert.equal(autoUnit(30, K1).name, 'K'); setUnitSystem('US'); assert.equal(autoUnit(30, K1).name, '°R'); } finally { setUnitSystem('SI'); }
});

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
    s: { fn: { params: ['varargin'], body: 'seq(t:0, for(k, 1..nargin, t:t+varargin_k), t)' } },
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

t('el problema de la clase: solve lejos del valor inicial, una local que tapa a una global, σ con π en una gráfica', () => {
  const N = [1, 1, -2, 0, 0, 0, 0];
  const base = { V: { fn: { params: ['x'], body: "Ay - 1500'N*x" } }, Ay: { v: 1, r: false, d: N } };
  const calc = (q, vv) => evalExpr(q, { vars: vv, allowMat: true });
  near(solveEqs([{ name: 'Ay', v: 1, r: false, d: N }], ['V(1) == 0'], calc, base)[0], 1500); // desde 1 N: antes no llegaba
  assert.throws(() => solveEqs([{ name: 'x', v: 1, r: false }], ['x^2 == -1'], calc, {}), /no encontré una solución/);
  // un programa que asigna b:[…] con una b global numero: b_k es un indice (antes «No reconozco b_k»); afuera b no cambia
  const G = { b: { v: -0.113, r: false }, g: { fn: { params: ['k'], body: 'seq(b:[10, 20, 30], b_k)' } } };
  assert.equal(evalExpr('g(2)', { vars: G, allowMat: true }).value, 20); assert.equal(G.b.v, -0.113);
  // σ = 32·M/(π·d³) lleva la marca de π, pero es una presion: la grafica la dibuja en MPa, no la pasa a grados
  const d = newDoc(); d.decimal = '.';
  addText(d, addPoint(d, 0, 10), "$$σ:32*300'N*1'm/(π*(25'mm)^3)$$", {});
  const g = { x: 0, y: -60, w: 100, h: 50, series: ['σ vs x'], n: 5, axes: {} };
  const r = computeGraph(d, g, () => ({ ok: true }));
  near(r.series[0].pts[0][1], 195.57, 1e-4);
});

t('diagrama S-N con vectores: una unidad por eje (S_s en MPa y σ en ksi se dibujan en la misma unidad)', () => {
  const d = newDoc(); d.decimal = '.';
  ["Sut:110'ksi", "S_s:[Sut, 0.9*Sut, 30.25'ksi, 30.25'ksi]", 'N_s:[1, 1e3, 1e6, 1e9]', "σ:38.2'ksi", 'N:256914'].forEach((q, i) => addText(d, addPoint(d, 0, 300 - i * 10), '$$' + q + '$$', {}));
  const r = computeGraph(d, { x: 0, y: 0, w: 100, h: 60, series: ['S_s vs N_s', 'σ vs N'], n: 3, axes: { x1: { scale: 'log' }, y1: { scale: 'log' } } }, () => ({ ok: true }));
  const [s1, s2] = r.series, u = / \(([^)]+)\) vs/;
  assert.equal(u.exec(s1.label)[1], u.exec(s2.label)[1]); // la misma unidad en las dos etiquetas
  near(s2.pts[0][1] / s1.pts[0][1], 38.2 / 110, 1e-9); // y en la misma escala
  assert.deepEqual(s1.pts.map((q) => q[0]), [1, 1e3, 1e6, 1e9]);
});

t('números grandes: sin «.0» en los miles; notación científica desde el umbral del dibujo (doc.sciAt, 1e6 por defecto, 0 nunca)', () => {
  const show = (sciAt, q) => { const d = newDoc(); d.decimal = '.'; if (sciAt !== undefined) d.sciAt = sciAt; const t = d.texts[addText(d, addPoint(d, 0, 0), '$$' + q + '$$', {})]; return shownText(d, t).text.replace(/[\uE000-\uF8FF]/g, '').replace(/^\$\$|\$\$$/g, '').split('=').pop(); };
  assert.equal(show(undefined, '1000='), '1000'); assert.equal(show(undefined, '256913.8='), '256913.8'); assert.equal(show(undefined, '1e9='), '1e9');
  assert.equal(show(5, '256913.8='), '2.569e5'); assert.equal(show(5, '999999.7='), '1e6'); assert.equal(show(3, '1500='), '1.5e3');
  assert.equal(show(0, '1e9='), '1000000000'); assert.equal(show(undefined, '-3.2e7='), '-3.2e7');
  assert.equal(show(undefined, '[1, 1e3, 1e6, 1e9]='), '[1, 1000, 1e6, 1e9]');
});

t('rand en una salida: la misma tirada en cada dibujo, distinta entre salidas; rng(7)= cambia la secuencia desde su lugar', () => {
  const mk = (pre) => {
    const d = newDoc(); d.decimal = '.';
    addText(d, addPoint(d, 0, 300), '%dado(n):\n  randi(1000)', {});
    if (pre) addText(d, addPoint(d, 0, 290), '$$' + pre + '$$', {});
    const o = [280, 270].map((y) => d.texts[addText(d, addPoint(d, 0, y), '$$dado(1)=$$', {})]);
    return () => o.map((t) => shownText(d, t).text.replace(/[\uE000-\uF8FF]/g, ''));
  };
  const a = mk(null), r1 = a(), r2 = a();
  assert.deepEqual(r1, r2); // antes cambiaba con cada redibujo (al mover la vista)
  assert.notEqual(r1[0], r1[1]); // dos salidas, dos tiradas
  const b = mk('rng(7)='), c = mk('rng(7)=');
  assert.deepEqual(b(), c()); assert.notDeepEqual(b(), r1); // otra secuencia, tambien reproducible
  const d = newDoc(); d.decimal = '.'; // «rng("shuffle")=» muestra la semilla que se uso, no una nueva en cada dibujo (antes cambiaba al mover el mouse)
  const sh = d.texts[addText(d, addPoint(d, 0, 300), '$$rng("shuffle")=$$', {})];
  const sv = () => shownText(d, sh).text.replace(/[\uE000-\uF8FF]/g, '');
  assert.equal(sv(), sv());
});

console.log(`\n${passed} pruebas de fatiga pasaron`);
