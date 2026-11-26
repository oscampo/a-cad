// Vectores de cadenas con repmat, horzcat y vertcat (un vector de cadenas es una lista: no tiene filas ni columnas).
import assert from 'node:assert/strict';
import { evalExpr } from '../src/expr.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const ev = (e, vars = {}) => evalExpr(e, { vars, allowMat: true, allowCplx: true });

t('repmat repite una cadena o un vector de cadenas n*m veces', () => {
  assert.deepEqual(ev('repmat("a"; 1; 3)').strs, ['a', 'a', 'a']);
  assert.deepEqual(ev('repmat(""; 1; 24)').strs, Array(24).fill(''));
  assert.deepEqual(ev('repmat(["x","y"]; 2; 2)').strs, ['x', 'y', 'x', 'y', 'x', 'y', 'x', 'y']);
  assert.deepEqual(ev('repmat("z"; 3)').strs, Array(9).fill('z'), 'sin m, m = n como en los numeros');
});

t('horzcat y vertcat unen cadenas y vectores de cadenas en uno', () => {
  assert.deepEqual(ev('horzcat("a"; "b")').strs, ['a', 'b']);
  assert.deepEqual(ev('horzcat(["a","b"]; "c"; ["d"])').strs, ['a', 'b', 'c', 'd']);
  assert.deepEqual(ev('vertcat("a"; ["b","c"])').strs, ['a', 'b', 'c']);
  assert.deepEqual(ev('horzcat(s; "x")', { s: { strs: ['p', 'q'], loc: true } }).strs, ['p', 'q', 'x']);
});

t('un vector de cadenas crece dentro de un for con horzcat', () => {
  assert.deepEqual(ev('seq(n:["a"], for(j, 1..3, n:horzcat(n; "v"+num2str(j))), n)').strs, ['a', 'v1', 'v2', 'v3']);
});

t('errores claros: cadenas con numeros, n invalido; los numeros siguen igual', () => {
  assert.throws(() => ev('horzcat("a"; 3)'), /no se mezclan cadenas y números/);
  assert.throws(() => ev('repmat("a"; 0; 2)'), /entero de 1 a 10000/);
  assert.throws(() => ev('repmat(3; "a")'), /no recibe cadenas|cadena/);
  assert.deepEqual(ev('repmat(7; 2; 2)').mat, [[7, 7], [7, 7]]);
  assert.deepEqual(ev('horzcat([1,2]; [3])').mat, [[1, 2, 3]]);
});

t('el mensaje de «un vector de cadenas no va dentro de otro» dice algo que funciona', () => {
  assert.throws(() => ev('[s, "c"]', { s: { strs: ['a'], loc: true } }), /horzcat/);
  assert.deepEqual(ev('horzcat(s; "c")', { s: { strs: ['a'], loc: true } }).strs, ['a', 'c']);
});

console.log(`${passed} pruebas de vectores de cadenas`);
