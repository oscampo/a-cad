// Rangos en los indices: A_(2..4, 2), A_(:, 1..2), v_(2..end), N_(2..3) y «end» (el ultimo), en matrices, vectores y vectores de cadenas.
import assert from 'node:assert/strict';
import { evalExpr } from '../src/expr.js';
import { newDoc, addPoint, addText } from '../src/model.js';
import { textVars } from '../src/params.js';
import { setDecimal } from '../src/locale.js';

setDecimal(undefined);
let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const vars = {
  A: { mat: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], r: false }, v: { mat: [[10, 20, 30, 40]], r: false }, c: { mat: [[1], [2], [3]], r: false },
  N: { strs: ['a', 'b', 'c', 'd'] }, U: { mat: [[1, 2], [3, 4]], d: [1, 0, 0, 0, 0, 0, 0], r: false },
  Z: { mat: [[1, 2], [3, 4]], mi: [[0, 1], [0, 0]], r: false },
};
const ev = (s) => evalExpr(s, { vars, allowMat: true, allowCplx: true });
const err = (s, re) => assert.throws(() => ev(s), re);

t('una parte de una matriz: filas, columnas o las dos', () => {
  assert.deepEqual(ev('A_(2..3,1)').mat, [[4], [7]]);
  assert.deepEqual(ev('A_(1..2,2..3)').mat, [[2, 3], [5, 6]]);
  assert.deepEqual(ev('A_(:,1..2)').mat, [[1, 2], [4, 5], [7, 8]]);
  assert.deepEqual(ev('A_(2..3,:)').mat, [[4, 5, 6], [7, 8, 9]]);
  assert.deepEqual(ev('A_(2..3; 2)').mat, [[5], [8]]); // el punto y coma tambien separa los indices
});

t('end es el ultimo de esa direccion, solo o en un rango', () => {
  assert.equal(ev('A_(end,1)').value, 7); assert.equal(ev('A_(end,end)').value, 9);
  assert.deepEqual(ev('A_(2..end,2)').mat, [[5], [8]]); assert.deepEqual(ev('A_(1,2..end)').mat, [[2, 3]]);
  assert.equal(ev('v_(end)').value, 40); assert.equal(ev('v_(end-1)').value, 30); assert.deepEqual(ev('v_(2..end)').mat, [[20, 30, 40]]);
});

t('un vector fila o columna: un solo indice con rango; un rango de una celda es un numero', () => {
  assert.deepEqual(ev('v_(2..3)').mat, [[20, 30]]); assert.deepEqual(ev('c_(1..2)').mat, [[1], [2]]);
  assert.equal(ev('A_(2..2,2..2)').value, 5);
});

t('las partes se operan como cualquier matriz: suma, producto, resumenes', () => {
  assert.deepEqual(ev('A_(2..3,1)+A_(1..2,3)').mat, [[7], [13]]);
  assert.equal(ev('sum(A_(2..3,2..3))').value, 28);
  assert.deepEqual(ev('A_(1..2,1..2)*A_(1..2,1..2)').mat, [[9, 12], [24, 33]]);
});

t('conservan la unidad y la parte compleja', () => {
  assert.deepEqual(ev('U_(1..2,1)').dim, [1, 0, 0, 0, 0, 0, 0]); assert.deepEqual(ev('U_(1..2,1)').mat, [[1], [3]]);
  const z = ev('Z_(1..2,2)'); assert.deepEqual(z.mat, [[2], [4]]); assert.deepEqual(z.mi, [[1], [0]]);
});

t('un vector de cadenas: s_(2..3) es un vector de cadenas, de una sola es una cadena; end', () => {
  assert.deepEqual(ev('N_(2..3)').strs, ['b', 'c']); assert.equal(ev('N_(2..2)').str, 'b'); assert.equal(ev('N_(end)').str, 'd'); assert.deepEqual(ev('N_(2..end)').strs, ['b', 'c', 'd']);
});

t('errores claros: al reves, fuera de rango, dos indices a una matriz', () => {
  err('A_(3..2,1)', /pides las filas 3\.\.2 y hay 3 \(de menor a mayor/); err('A_(1..4,1)', /1\.\.4 y hay 3/); err('A_(1,2..9)', /las columnas 2\.\.9 y hay 3/);
  err('N_(3..9)', /pides 3\.\.9 y tiene 4 cadenas/); err('A_(1..2)', /lleva dos índices/); err('A_(0..1,1)', /pides las filas 0\.\.1/);
});

t('en un texto del dibujo: definir una matriz y operar sus partes', () => {
  const d = newDoc();
  addText(d, addPoint(d, 0, 0), '$$A:[1,2,3;4,5,6;7,8,9]$$', {});
  addText(d, addPoint(d, 0, -40), '$$s:sum(A_(2..3,2))+sum(A_(2..3,3))=$$', {});
  addText(d, addPoint(d, 0, -80), '$$B:A_(1..2,2..end)$$', {});
  addText(d, addPoint(d, 0, -120), '$$u:B_(2,1)=$$', {});
  const st = textVars(d);
  assert.deepEqual([...st.errs.values()], []); assert.equal(st.vals.s.v, 5 + 8 + 6 + 9); assert.equal(st.vals.u.v, 5);
});

console.log(passed + ' pruebas de rangos en los índices');
