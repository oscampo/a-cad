// Vectores y matrices en las formulas: literales [1, 2; 3, 4], suma, producto, division por escalar, transpuesta, y su uso en los textos.
import assert from 'node:assert/strict';
import { evalExpr, exprRefs } from '../src/expr.js';
import { newDoc, addPoint, addLine, addCon } from '../src/model.js';
import { recompute, pruneFormulas } from '../src/params.js';
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
  fails('[1,2]^2', /cuadradas/); // un vector no es cuadrado
  fails('2^[1,2]', /exponente/);
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

const close = (got, want, e = 1e-9) => { assert.equal(got.length, want.length); got.forEach((r, i) => r.forEach((x, k) => assert.ok(Math.abs(x - want[i][k]) <= e, `[${i}][${k}] ${x} != ${want[i][k]}`))); };

t('inversa: inv(A) y A^(-1); el sistema A*x = b', () => {
  const A = [[1, 1], [10, 1]], vars = { A: { mat: A }, b: { mat: [[-25], [250]] } };
  close(mat('inv(A)', vars), [[-1 / 9, 1 / 9], [10 / 9, -1 / 9]]);
  close(mat('A^(-1)', vars), [[-1 / 9, 1 / 9], [10 / 9, -1 / 9]]);
  close(mat('A*inv(A)', vars), [[1, 0], [0, 1]]);
  close(mat('A^(-1)*b', vars), [[275 / 9], [-500 / 9]]); // x = 30.556, y = -55.556
  close(mat('A*(A^(-1)*b)', vars), [[-25], [250]]); // verifica: A*x = b
  close(mat('inv([2,0;0,4])'), [[0.5, 0], [0, 0.25]]);
  close(mat('inv([0,1;1,0])'), [[0, 1], [1, 0]]); // pide intercambiar filas (pivote parcial)
  close(mat('inv([2,1,0;1,3,1;0,1,4])*[2,1,0;1,3,1;0,1,4]'), [[1, 0, 0], [0, 1, 0], [0, 0, 1]], 1e-12);
  assert.equal(num('inv(4)'), 0.25);
  assert.equal(M('inv([5])').mat[0][0], 0.2); // 1x1: sigue siendo matriz
});

t('potencia entera de una matriz cuadrada', () => {
  const vars = { A: { mat: [[1, 1], [10, 1]] } };
  close(mat('A^2', vars), [[11, 2], [20, 11]]);
  close(mat('A^1', vars), [[1, 1], [10, 1]]);
  close(mat('A^0', vars), [[1, 0], [0, 1]]);
  close(mat('A^3', vars), mat('A*A*A', vars));
  close(mat('A^(-2)', vars), mat('inv(A)*inv(A)', vars), 1e-12);
  close(mat('[1,1;0,1]^10'), [[1, 10], [0, 1]]);
  assert.equal(num('2^3'), 8); assert.equal(num('(2)^(-1)'), 0.5); // los escalares, como siempre
});

t('inversa y potencia: errores claros', () => {
  fails('inv([1,2;2,4])', /singular/);
  fails('inv([0,0;0,0])', /singular/);
  fails('[1,2;2,4]^(-1)', /singular/);
  fails('inv([1,2,3])', /cuadradas.*1×3/);
  fails('[1,2;3,4;5,6]^2', /cuadradas/);
  fails('[1,2;3,4]^0.5', /entero/);
  fails('inv([1,2;3,4],[1,2;3,4])', /recibe un valor/);
  fails('inv(0)', /División entre cero/);
  assert.throws(() => evalExpr('inv'), /necesita paréntesis/);
});

t('elemento a elemento: .* ./ .^', () => {
  assert.deepEqual(mat('[1,2,3].*[4,5,6]'), [[4, 10, 18]]);
  assert.deepEqual(mat('[1,2,3]./[2,4,6]'), [[0.5, 0.5, 0.5]]);
  assert.deepEqual(mat('[1,2,3].^2'), [[1, 4, 9]]);
  assert.deepEqual(mat('2.^[1,2,3]'), [[2, 4, 8]]);
  assert.deepEqual(mat('[1,2].^[3,2]'), [[1, 4]]);
  assert.deepEqual(mat('2.*[1,2]'), [[2, 4]]);
  assert.deepEqual(mat('12./[1,2,3]'), [[12, 6, 4]]); // escalar ./ vector
  assert.deepEqual(mat('[1,2;3,4].*[1,0;0,1]'), [[1, 0], [0, 4]]);
  assert.deepEqual(mat('[1,2;3,4].^2'), [[1, 4], [9, 16]]); // no es A*A
  assert.deepEqual(mat('2*[1,2].^2'), [[2, 8]]); // .^ antes que *
  assert.deepEqual(mat('[1,2].*[3,4]+[1,1]'), [[4, 9]]);
  assert.equal(num('3.*4'), 12); assert.equal(num('8./2'), 4); assert.equal(num('2.^3'), 8); // con numeros, como * / ^
  assert.equal(num('2.5*2'), 5); // el punto decimal sigue siendo decimal
  assert.deepEqual(mat('[1.5,2.5].*2'), [[3, 5]]);
  fails('[1,2].*[1,2,3]', /mismo tamaño/);
  fails('[1,2]./[0,1]', /División entre cero/);
  fails('[1,2]./0', /División entre cero/);
  fails('[-1,2].^0.5', /no es un número/);
  fails('[1,2]*[3,4]', /v\*w\^T/); // * sigue siendo el producto matricial
});

t('funciones elemento a elemento', () => {
  assert.deepEqual(mat('sqrt([1,4,9])'), [[1, 2, 3]]);
  assert.deepEqual(mat('√[4,9]'), [[2, 3]]);
  assert.deepEqual(mat('abs([-1,2;-3,4])'), [[1, 2], [3, 4]]);
  close(mat('sin([0,90,30])'), [[0, 1, 0.5]]); // en grados, como con un numero
  close(mat('cos([0,60])'), [[1, 0.5]], 1e-12);
  assert.deepEqual(mat('exp([0])'), [[1]]);
  assert.deepEqual(mat('floor([1.5,-1.5])'), [[1, -2]]);
  assert.deepEqual(mat('max([1,5,3]; 2)'), [[2, 5, 3]]); // un escalar se extiende
  assert.deepEqual(mat('max([1,5]; [3,2])'), [[3, 5]]);
  assert.deepEqual(mat('min([4,1,9]; 3)'), [[3, 1, 3]]);
  assert.deepEqual(mat('round([1.234,2.345]; 1)'), [[1.2, 2.3]]);
  assert.deepEqual(mat('mod([7,8,9]; 4)'), [[3, 0, 1]]);
  close(mat('atan2([1,1]; [1,-1])'), [[45, 135]]);
  assert.deepEqual(mat('clamp([0,5,10]; 2; 8)'), [[2, 5, 8]]);
  assert.deepEqual(mat('hypot([3,5]; [4,12])'), [[5, 13]]);
  fails('sqrt([-1,4])', /no es un número/); // igual que sqrt(-1)
  fails('√[-1,4]', /negativo/);
  fails('ln([0,1])', /no es un número/); // ln(0) = -inf
  fails('max([1,2]; [1,2,3])', /mismo tamaño/);
  fails('sin([1,2],[3,4])', /un solo valor/);
  fails('si([1,0]; 1; 2)', /condición/);
  assert.equal(num('sin(30)'), Math.sin(Math.PI / 6)); // los escalares no cambian
  assert.deepEqual(mat('si(1; [1,2]; [3,4])'), [[1, 2]]); // las ramas de si() si pueden ser vectores
});

t('inv y operaciones en los textos', () => {
  const doc = { pts: { p: { x: 0, y: 0 } }, lines: {}, circles: {}, arcs: {}, cons: {}, ellipses: {}, splines: {}, hatches: {}, traces: {}, texts: {} };
  doc.texts.t1 = { pt: 'p', h: 1, font: '', text: 'A{=[1,1; 10,1]}\nb{=[-25; 250]}\nx{=A^(-1)*b}\ny{=inv(A)}\nz{=sqrt([4,9]).*[2,3]}\n[=x] | [=y] | [=A*x] | [=z] | [=x.^2]' };
  const s = plainText(textValue(doc, doc.texts.t1));
  assert.match(s, /\[30\.556; -55\.556\] \| \[-0\.111, 0\.111; 1\.111, -0\.111\] \| \[-25; 250\] \| \[4, 9\] \| \[933\.642; 3086\.4\]$/);
  assert.equal(s.includes('⚠'), false);
  doc.texts.t2 = { pt: 'p', h: 1, font: '', text: 'q{=inv([1,2;2,4])}\n[=q]' }; // singular: la definicion falla
  assert.match(plainText(textValue(doc, doc.texts.t2)), /⚠/);
});

t('det, sum y norm', () => {
  assert.equal(num('det([2,1;1,3])'), 5);
  assert.equal(num('det([1,2;2,4])'), 0);
  assert.equal(num('det([1,2,3;4,5,6;7,8,10])'), -3); // exacto con enteros
  assert.equal(num('det([2,1,3,4;0,3,1,2;0,0,4,5;0,0,0,5])'), 120); // triangular 4x4
  assert.equal(num('det([0,1,0,0;1,0,0,0;0,0,1,0;0,0,0,1])'), -1); // un intercambio de filas
  assert.equal(num('det([1,2,3,4;1,2,3,4;5,6,7,8;9,1,2,3])'), 0); // filas iguales
  assert.equal(num('det(5)'), 5);
  assert.equal(num('det([1,1;10,1]) * det(inv([1,1;10,1]))').toFixed(12), '1.000000000000');
  assert.equal(num('sum([1,2,3])'), 6);
  assert.equal(num('sum([1,2;3,4])'), 10); // todos los elementos
  assert.equal(num('sum([1,2,3].*[4,5,6])'), 32); // producto punto
  assert.equal(num('sum([1;2;3].^2)'), 14);
  assert.equal(num('sum(7)'), 7);
  assert.equal(num('norm([3,4])'), 5);
  assert.equal(num('norm([1,2;2,4])'), 5); // Frobenius
  assert.equal(num('norm([0,0])'), 0);
  assert.equal(num('norm(-3)'), 3);
  assert.equal(num('norm([3;4])'), 5);
  assert.ok(Number.isFinite(num('norm([10^200,10^200])'))); // sin desbordar
  fails('det([1,2,3])', /cuadradas.*1×3/);
  fails('det([1,2;3,4],2)', /recibe un valor/);
  fails('sum([1,2],[3,4])', /recibe un valor/);
  assert.throws(() => evalExpr('sum'), /necesita paréntesis/);
});

const IV = { v: { vec: [10, 20, 30] }, w: { mat: [[1], [2], [3]] }, A: { mat: [[1, 2], [3, 4]] }, i: { v: 2, r: false }, j: { v: 1, r: false } };

t('indices: v_2, v_i, A_(fila,columna), v_(i+1)', () => {
  assert.equal(num('v_2', IV), 20);
  assert.equal(num('v_1+v_3', IV), 40);
  assert.equal(num('w_3', IV), 3); // columna: el indice es la fila
  assert.equal(num('A_(2,1)', IV), 3);
  assert.equal(num('A_(1,2)*2', IV), 4);
  assert.equal(num('v_(1+1)', IV), 20);
  assert.equal(num('v_i', IV), 20); // un indice puede ser una variable
  assert.equal(num('v_(i+1)', IV), 30);
  assert.equal(num('A_(i,i)', IV), 4);
  assert.equal(num('A_(i-1, i)', IV), 2);
  assert.equal(num('A_(i,j)', IV), 3);
  assert.equal(num('v_(1,3)', IV), 30); // dos indices en un vector fila: fila 1, columna 3
  assert.equal(num('A_(2,2)^2', IV), 16);
  assert.equal(num('-v_1', IV), -10);
  assert.equal(num('2*v_2', IV), 40);
  assert.equal(num('3v_1', IV), 30); // multiplicacion implicita
  assert.equal(num('max(v_1, v_3)', IV), 30);
  assert.equal(num('sum(v) - v_1 - v_2 - v_3', IV), 0);
  assert.deepEqual(mat('A*[v_1; v_2]', IV), [[50], [110]]);
  assert.equal(num('A_(1,1) + det(A) + norm(w)', { ...IV, A: IV.A }).toFixed(6), (1 + -2 + Math.sqrt(14)).toFixed(6));
});

t('indices: un nombre que existe es esa variable; errores claros', () => {
  assert.equal(num('k_2', { k: { vec: [1, 2, 3] }, k_2: { v: 99, r: false } }), 99); // la variable k_2 gana
  assert.equal(num('k_(total)', { k: { vec: [1, 2, 3] }, 'k_(total)': { v: 7, r: false } }), 7); // variable con subindice de texto
  fails('v_4', /fuera de rango.*vector de 3.*elemento 4/, IV);
  fails('v_0', /fuera de rango/, IV);
  fails('A_3', /matriz de 2×2: lleva dos índices/, IV);
  fails('A_(3,1)', /fuera de rango.*fila 3, columna 1/, IV);
  fails('A_(1,2,3)', /dos/, IV);
  fails('v_(1.5)', /entero/, IV);
  fails('v_(1,)', /Falta un índice/, IV);
  fails('u_2', /No reconozco «u_2»/, IV); // u no existe
  fails('i_1', /No reconozco «i_1»/, IV); // i es un numero: no se indexa
});

t('indices: dependencias (variables de texto y cotas leen elementos de otros vectores)', () => {
  const has = (n) => ['x', 'A', 'i', 'k_2'].includes(n);
  assert.deepEqual(exprRefs('2*x_2+A_(i,1)', has).sort(), ['A', 'i', 'x']);
  assert.deepEqual(exprRefs('k_2', has), ['k_2']); // una variable llamada asi no es un indice
  assert.deepEqual(exprRefs('x_2'), ['x_2']); // sin saber que existe, tal cual
  const doc = { pts: { p: { x: 0, y: 0 } }, lines: {}, circles: {}, arcs: {}, cons: {}, ellipses: {}, splines: {}, hatches: {}, traces: {}, texts: {} };
  doc.texts.t1 = { pt: 'p', h: 1, font: '', text: 'y{=2*x_2+A_(2,1)}\nx{=[10, 20, 30]}\nA{=[1,2;3,4]}\n[=y] [=x_3] [=A_(1,2)] [=sum(x)] [=norm([3,4])] [=det(A)]' }; // y se define antes que x y A
  const s = plainText(textValue(doc, doc.texts.t1));
  assert.match(s, /43 30 2 60 5 -2$/); assert.equal(s.includes('⚠'), false);
  // una cota lee un elemento de un vector de texto
  const d = newDoc(), a = addPoint(d, 0, 0), b = addPoint(d, 20, 0);
  addLine(d, a, b, {});
  const k = addCon(d, { t: 'DIST', refs: [a, b], v: 5, name: 'D1', expr: 'x_2' });
  d.texts.t1 = { pt: a, h: 1, font: '', text: 'x{=[10, 20, 30]}', ang: 0, anchor: 'bl', color: 'auto', readable: true };
  const r = recompute(d);
  assert.ok(r.ok, r.error);
  assert.equal(d.cons[k].v, 20);
  assert.ok(pruneFormulas(d).length === 0 && d.cons[k].expr === 'x_2'); // la formula sigue viva: x_2 depende de la variable x
});

console.log(`\n${passed} pruebas de vectores y matrices pasaron`);
