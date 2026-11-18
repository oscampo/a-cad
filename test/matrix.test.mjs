// Vectores y matrices en las formulas: literales [1, 2; 3, 4], suma, producto, division por escalar, transpuesta, y su uso en los textos.
import assert from 'node:assert/strict';
import { evalExpr } from '../src/expr.js';
import { textValue, plainText } from '../src/text.js';
import { layoutText } from '../src/mathlayout.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const M = (src, vars = null) => evalExpr(src, { allowMat: true, vars });
const mat = (src, vars) => M(src, vars).mat;
const num = (src, vars) => M(src, vars).value;
const fails = (src, re, vars) => assert.throws(() => M(src, vars), re, src);

t('literales: fila, columna y matriz; la coma separa dentro de [ ] y es decimal fuera', () => {
  assert.deepEqual(mat('[1, 2, 3]'), [[1, 2, 3]]);
  assert.deepEqual(mat('[1,2,3]'), [[1, 2, 3]]); // no es [1.2, 3]
  assert.deepEqual(mat('[1,2;3,4]'), [[1, 2], [3, 4]]);
  assert.deepEqual(mat('[1; 2; 3]'), [[1], [2], [3]]);
  assert.deepEqual(mat('[1.5, 2.25]'), [[1.5, 2.25]]);
  assert.deepEqual(mat('[1+1, 2*3; 4, 5]'), [[2, 6], [4, 5]]); // los elementos son expresiones
  assert.equal(num('2,5+1'), 3.5); // fuera de corchetes, la coma decimal de siempre
  assert.equal(num('max(2,5; 3)'), 3);
  fails('[1,2;3]', /mismo número de elementos/);
  fails('[]', /vacía/);
  fails('[1,2', /corchete/);
});

t('suma, resta y escalares', () => {
  assert.deepEqual(mat('[1,2,3]+[4,5,6]'), [[5, 7, 9]]);
  assert.deepEqual(mat('[5,5]-[1,2]'), [[4, 3]]);
  assert.deepEqual(mat('2*[1,2,3]'), [[2, 4, 6]]);
  assert.deepEqual(mat('[1,2,3]*2'), [[2, 4, 6]]);
  assert.deepEqual(mat('2[1,2]'), [[2, 4]]); // multiplicacion implicita
  assert.deepEqual(mat('[2,4,6]/2'), [[1, 2, 3]]);
  assert.deepEqual(mat('-[1,-2]'), [[-1, 2]]);
  assert.deepEqual(mat('[1,2]+[3,4]*2'), [[7, 10]]);
  assert.deepEqual(mat('([1,2]+[3,4])*2'), [[8, 12]]);
});

t('producto matricial y producto punto', () => {
  assert.deepEqual(mat('[1,2;3,4]*[5;6]'), [[17], [39]]);
  assert.deepEqual(mat('[1,2;3,4]*[5,6;7,8]'), [[19, 22], [43, 50]]);
  assert.deepEqual(mat('[1;2]*[3,4]'), [[3, 4], [6, 8]]); // columna por fila: matriz 2x2
  assert.equal(num('[1,2,3]*[4,5,6]^T'), 32); // fila por columna: un numero
  assert.deepEqual(mat('[1,2;3,4]*[1,0;0,1]'), [[1, 2], [3, 4]]);
});

t('transpuesta: ^T', () => {
  assert.deepEqual(mat('[1,2,3]^T'), [[1], [2], [3]]);
  assert.deepEqual(mat('[1,2;3,4]^T'), [[1, 3], [2, 4]]);
  assert.deepEqual(mat('[1,2;3,4;5,6]^T'), [[1, 3, 5], [2, 4, 6]]);
  assert.deepEqual(mat('([1,2]+[3,4])^T'), [[4], [6]]);
  assert.equal(num('5^T'), 5); // un numero es su propia transpuesta
  assert.equal(num('2^3'), 8); // la potencia de siempre
  assert.equal(num('2^T', { T: { v: 3 } }), 8); // si existe una variable T, es el exponente
});

t('errores claros', () => {
  fails('[1,2]+[1,2,3]', /mismo tamaño/);
  fails('1+[1,2]', /un número y un vector fila/);
  fails('[1,2]-3', /un número/);
  fails('[1,2]*[3,4]', /v\*w\^T/);
  fails('[1,2;3,4]*[1,2,3]', /columnas de la primera \(2\)/);
  fails('[1,2]/[1,2]', /dividir entre/);
  fails('[1,2]/0', /División entre cero/);
  fails('[1,2]^2', /potencia/);
  fails('2^[1,2]', /potencia/);
  fails('sin([1,2])', /todavía no acepta/);
  fails('[1,2]<[3,4]', /comparar/);
  fails('[[1,2],[3,4]]', /son números/);
  assert.throws(() => evalExpr('[1,2]'), /El resultado es un vector fila de 2, no un número/); // en una cota, por ejemplo
  assert.throws(() => evalExpr('[1,2;3,4]'), /una matriz de 2×2/);
  assert.throws(() => evalExpr('[1;2;3]'), /un vector columna de 3/);
});

t('variables: vector (vec) y matriz (mat)', () => {
  const vars = { x: { vec: [1, 2, 3] }, y: { vec: [4, 5, 6] }, A: { mat: [[1, 2], [3, 4]] }, a: { v: 2, r: false } };
  assert.deepEqual(mat('a*x', vars), [[2, 4, 6]]);
  assert.deepEqual(mat('x+y', vars), [[5, 7, 9]]);
  assert.equal(num('x*y^T', vars), 32);
  assert.deepEqual(mat('x^T', vars), [[1], [2], [3]]);
  assert.deepEqual(mat('A*A', vars), [[7, 10], [15, 22]]);
  assert.deepEqual(mat('A^T*[1;1]', vars), [[4], [6]]);
  assert.deepEqual(mat('A*a', vars), [[2, 4], [6, 8]]);
  assert.equal(num('x*x^T + 1', vars), 15);
});

t('textos: definiciones y salidas con vectores y matrices', () => {
  const doc = { pts: { p: { x: 0, y: 0 } }, lines: {}, circles: {}, arcs: {}, cons: {}, ellipses: {}, splines: {}, hatches: {}, traces: {}, texts: {} };
  doc.texts.t1 = { pt: 'p', h: 1, font: '', text: 'x{=1..3;3}\nA{=[1,2;3,4]}\ny{=2*x}\nB{=A*A}\nd{=x*y^T}\n[=x+y] | [=x^T] | [=A] | [=B] | [=d] | [=[1,2;3,4]*[1;1]] | [=A^T]' };
  const s = plainText(textValue(doc, doc.texts.t1));
  assert.match(s, /\[3, 6, 9\] \| \[1; 2; 3\] \| \[1, 2; 3, 4\] \| \[7, 10; 15, 22\] \| 28 \| \[3; 7\] \| \[1, 3; 2, 4\]$/);
  assert.match(s, /^x:=1\.\.3;3\nA:=\[1,2;3,4\]\ny:=2\*x/); // las definiciones, en texto plano, muestran su fuente
});

t('textos: dentro de $...$ salen como matrices dibujadas, sin comas', () => {
  const doc = { pts: { p: { x: 0, y: 0 } }, lines: {}, circles: {}, arcs: {}, cons: {}, ellipses: {}, splines: {}, hatches: {}, traces: {}, texts: {} };
  doc.texts.t1 = { pt: 'p', h: 1, font: '', text: 'A{=[1,2;3,4]}\nx{=1..3;3}\n$$B{=A*A}\n[=B] [=x^T]\nA := [=A]$$' };
  const shown = textValue(doc, doc.texts.t1);
  const m = layoutText(shown, (s) => s.length * 0.5, '').prims;
  const txt = m.filter((p) => p.k === 't').map((p) => p.s);
  for (const n of ['7', '10', '15', '22']) assert.ok(txt.includes(n), n); // B = A*A
  assert.ok(!txt.includes(','), 'sin comas');
  assert.ok(m.some((p) => p.k === 'p'), 'corchetes grandes de matriz');
});

t('textos: una salida con corchetes anidados no se corta', () => {
  const doc = { pts: { p: { x: 0, y: 0 } }, lines: {}, circles: {}, arcs: {}, cons: {}, ellipses: {}, splines: {}, hatches: {}, traces: {}, texts: {} };
  doc.texts.t1 = { pt: 'p', h: 1, font: '', text: 'ab [=[1,2;3,4]*[1;1]] cd [=1+1]' };
  assert.equal(textValue(doc, doc.texts.t1), 'ab [3; 7] cd 2');
  doc.texts.t2 = { pt: 'p', h: 1, font: '', text: '[=[1,2]*[1,2]]' }; // error: aparece ⚠
  assert.equal(textValue(doc, doc.texts.t2), '⚠');
});

console.log(`\n${passed} pruebas de vectores y matrices pasaron`);
