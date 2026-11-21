// Funciones de MATLAB (tanda 1): casos limite de unidades, complejos y errores (cada funcion ya tiene un ejemplo verificado en la ayuda).
import assert from 'node:assert/strict';
import { evalExpr, isReservedName } from '../src/expr.js';
import { setDecimal } from '../src/locale.js';

setDecimal('.');
let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const E = (src) => evalExpr(src, { allowMat: true, allowCplx: true, radians: true });
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) <= e * Math.max(1, Math.abs(b)), `${a} != ${b}`);
const L = [1, 0, 0, 0, 0, 0, 0];

t('unidades: linspace, interp1, trapz, integral, dist, nthroot, pinv', () => {
  const r = E("linspace(0'm, 2'm, 3)"); assert.deepEqual(r.mat, [[0, 1, 2]]); assert.deepEqual(r.dim, L);
  const q = E("interp1([0,10]*1'mm, [0,100]*1'MPa, 5'mm)"); near(q.value, 50e6); assert.deepEqual(q.dim, [-1, 1, -2, 0, 0, 0, 0]);
  const w = E("integral(2'N, x, 0'm, 3'm)"); near(w.value, 6); assert.deepEqual(w.dim, [2, 1, -2, 0, 0, 0, 0]);
  const tr = E("trapz([0,1,2]*1's, [0,1,4]*1'(m/s))"); near(tr.value, 3); assert.deepEqual(tr.dim, L);
  assert.deepEqual(E("dist([0,0]*1'm, [3,4]*1'm)").dim, L);
  near(E("nthroot(27'm^3, 3)").value, 3);
  assert.throws(() => E("dist([0,0]*1'm, [3,4])"), /mismas unidades/);
  assert.throws(() => E("roots([1,0,-2]*1'm)"), /sin unidades/);
});

t('complejos: roots, eig, polyval, conv, linsolve, diff con complejos', () => {
  const r = E('roots([1,2,5])'); assert.deepEqual(r.mat.flat().map((x) => +x.toFixed(9)), [-1, -1]); assert.deepEqual(r.mi.flat().map((x) => +x.toFixed(9)).sort(), [-2, 2]);
  const e = E('eig([0,1;-1,0])'); assert.deepEqual(e.mi.flat().map(Math.round).sort(), [-1, 1]);
  near(E('polyval([1,0,1], j)').value, 0);
  assert.deepEqual(E('conv([1,j],[1,-j])').mat, [[1, 0, 1]]);
  const x = E('linsolve([1,j;0,1],[1;j])'); assert.deepEqual([x.mat.flat(), x.mi?.flat()].map((v) => v?.map((q) => +q.toFixed(9))), [[2, 0], [0, 1]]);
  const dv = E('diff([1, 1+j, 3j])'); assert.deepEqual(dv.mat, [[0, -1]]); assert.deepEqual(dv.mi, [[1, 2]]);
});

t('algebra lineal: rank, cond, pinv y linsolve por minimos cuadrados', () => {
  assert.equal(E('rank([1,2;2,4])').value, 1); assert.equal(E('rank(eye(4))').value, 4);
  near(E('cond([1,0;0,2])').value, 2);
  assert.throws(() => E('cond([1,2;2,4])'), /singular/);
  const p = E('pinv([1,2;2,4])').mat; near(p[0][0], 0.04); near(p[1][1], 0.16);
  const ls = E('linsolve([1,1;1,2;1,3],[1;2;2])').mat.flat(); near(ls[0], 2 / 3); near(ls[1], 0.5);
  const ev = E('eig([4,1;2,3])').mat.flat(); near(ev[0], 2); near(ev[1], 5);
});

t('errores claros', () => {
  assert.throws(() => E('zeros(0)'), /entero de 1/);
  assert.throws(() => E('reshape([1,2,3],2,2)'), /3 elementos/);
  assert.throws(() => E('interp1([0,1],[0,1],2)'), /fuera de la tabla/);
  assert.throws(() => E('factorial(2.5)'), /entero/);
  assert.throws(() => E('nthroot(-8, 2)'), /impar/);
  assert.throws(() => E('integral(x^2, x, 0)'), /los límites/);
  assert.throws(() => E('eig([1,2,3])'), /cuadradas/);
  assert.throws(() => E('sort([1, j])'), /complejos/);
});

t('los nombres nuevos quedan reservados', () => {
  for (const n of ['linspace', 'interp1', 'roots', 'eig', 'integral', 'zeros', 'real', 'imag', 'conj', 'angle']) assert.ok(isReservedName(n), n);
  assert.ok(!isReservedName('total') && !isReservedName('area'));
});

console.log(`\n${passed} pruebas de funciones de MATLAB pasaron`);
