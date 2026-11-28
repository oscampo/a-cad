// Matrices con celdas de distinto tipo: [ "Datos", "col1"; "fil1", 1 ], indices, rangos, colapso a numerica o de cadenas y errores que nombran la celda.
import assert from 'node:assert/strict';
import { evalExpr } from '../src/expr.js';
import { newDoc, addPoint, addText } from '../src/model.js';
import { textVars } from '../src/params.js';
import { shownText } from '../src/text.js';
import { setDecimal } from '../src/locale.js';

setDecimal(undefined);
let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const C = { cells: [[{ str: 'Datos' }, { str: 'col1' }, { str: 'col2' }], [{ str: 'fil1' }, { v: 1 }, { v: 2 }], [{ str: 'fil2' }, { v: 4 }, { str: 'texto' }], [{ str: 'fil3' }, { v: 7 }, { v: 8 }]] };
const ev = (s, vars = {}) => evalExpr(s, { vars: { C, ...vars }, allowMat: true, allowCplx: true });
const err = (s, re) => assert.throws(() => ev(s), re);
const plain = (r) => r.cells.map((row) => row.map((c) => (c.str !== undefined ? c.str : c.v)));

t('un literal con texto y numeros es una matriz con celdas, de varias filas', () => {
  assert.deepEqual(plain(ev('["Datos", "col1"; "fil1", 1]')), [['Datos', 'col1'], ['fil1', 1]]);
  assert.deepEqual(plain(ev('[1, "x"; 2, "y"]')), [[1, 'x'], [2, 'y']]);
  assert.deepEqual(plain(ev('["a", 1]')), [['a', 1]]);
});

t('si todo es de un solo tipo vuelve a la forma de siempre', () => {
  assert.deepEqual(ev('["a", "b"]').strs, ['a', 'b']); assert.deepEqual(ev('["a"; "b"]').strs, ['a', 'b']);
  assert.deepEqual(ev('["a", ["b", "c"]]').strs, ['a', 'b', 'c']); assert.deepEqual(ev('[1, 2; 3, 4]').mat, [[1, 2], [3, 4]]);
});

t('indices: celda, fila, columna y rangos con end', () => {
  assert.equal(ev('C_(2,2)').value, 1); assert.equal(ev('C_(3,3)').str, 'texto'); assert.equal(ev('C_(end,end)').value, 8);
  assert.deepEqual(ev('C_(1,:)').strs, ['Datos', 'col1', 'col2']); assert.deepEqual(ev('C_(:,1)').strs, ['Datos', 'fil1', 'fil2', 'fil3']);
  assert.deepEqual(ev('C_(2..4,2)').mat, [[1], [4], [7]]); assert.deepEqual(plain(ev('C_(2..4,3)')), [[2], ['texto'], [8]]);
});

t('medidas y forma: size, rows, cols, numel, typeof, transpuesta, horzcat y vertcat', () => {
  assert.deepEqual(ev('size(C)').mat, [[4, 3]]); assert.equal(ev('rows(C)').value, 4); assert.equal(ev('cols(C)').value, 3); assert.equal(ev('numel(C)').value, 12);
  assert.equal(ev('typeof(C)').str, 'matrix');
  assert.deepEqual(plain(ev('C^T'))[1], ['col1', 1, 4, 7]);
  assert.equal(ev('horzcat(C; C)').cells[0].length, 6); assert.equal(plain(ev('vertcat(C_(1,:); C_(2,:))')).length, 2);
});

t('las partes numericas se operan; las mezcladas dicen cual celda estorba', () => {
  assert.deepEqual(ev('C_(2..4,2)+C_(2..4,2)').mat, [[2], [8], [14]]); assert.equal(ev('sum(C_(2..4,2))').value, 12);
  assert.deepEqual(ev('strcmp(C_(:,1); "fil2")').mat, [[0, 0, 1, 0]]); assert.equal(ev('find(strcmp(C_(:,1); "fil2"))').value, 3);
  err('C+1', /fila 1, columna 1 es texto/); err('sum(C)', /«sum» no recibe una matriz con texto y números mezclados/); err('-C', /mezclados/); err('C==1', /mezclados/);
  err('C_(2..4,3)+1', /fila 2, columna 1 es texto/);
});

t('errores de indice claros', () => {
  err('C_(5,1)', /«C» tiene 4 filas y pides la 5/); err('C_(2..9,1)', /pides las filas 2\.\.9 y hay 4/);
});

t('cada celda puede llevar su unidad; solo colapsa a numerica si son de la misma dimension', () => {
  assert.deepEqual(plain(ev('["L", 3\'m; "t", 2\'s]')), [['L', 3], ['t', 2]]);
  const m = ev('["L", 3\'m, 4\'m]'); assert.equal(m.cells[0][2].v, 4);
  const M = { cells: [[{ str: 'L' }, { v: 3, d: m.cells[0][1].d }, { v: 4, d: m.cells[0][2].d }]] };
  const r = ev('M_(2..3)', { M }); assert.deepEqual(r.mat, [[3, 4]]); assert.ok(r.dim && r.dim[0] === 1);
});

t('una celda puede ser una expresion que se evalua en el sitio', () => {
  const r = ev('[1+1, "a"; sqrt(16), "b"]'); assert.deepEqual(plain(r), [[2, 'a'], [4, 'b']]);
});

t('en un texto del dibujo: definir, cortar y operar', () => {
  const d = newDoc();
  addText(d, addPoint(d, 0, 0), '$$T:["id","nota";1,4.5;2,3.5;3,5]$$', {});
  addText(d, addPoint(d, 0, -40), '$$p:sum(T_(2..4,2))/3=$$', {});
  addText(d, addPoint(d, 0, -80), '$$h:T_(1,2)=$$', {});
  const st = textVars(d);
  assert.deepEqual([...st.errs.values()], []); assert.ok(Math.abs(st.vals.p.v - 13 / 3) < 1e-12); assert.equal(st.vals.h.str, 'nota');
});

t('la celda captura el valor al definir la matriz (un T posterior no la cambia); la autorreferencia da error y no cuelga', () => {
  const run = (L) => { const d = newDoc(); const ids = L.map((x, i) => addText(d, addPoint(d, 0, -i * 40), '$$' + x + '$$', {})); return { st: textVars(d), d, ids }; };
  const a = run(['T:1', 'q:["a",T;"b",2]', 'x:q_(1,2)=', 'T:5', 'y:q_(1,2)=']);
  assert.deepEqual([...a.st.errs.values()], []); assert.equal(a.st.vals.x.v, 1); assert.equal(a.st.vals.y.v, 1);
  assert.ok([...run(['q:["a",q_(2,1);"b",2]']).st.errs.values()].length > 0);
});

t('las cadenas conservan sus comillas dentro de la matriz: "30 K" (texto) no se confunde con 30 K como cantidad', () => {
  const d = newDoc();
  const T = ['q:["datos","c1";"f1",2]', '"hola"='].map((x, i) => d.texts[addText(d, addPoint(d, 0, -i * 40), '$$' + x + '$$', {})]);
  const show = (q) => shownText(d, q).text.replace(/[-]/g, '');
  assert.equal(show(T[0]), '$$q:=["“datos”","“c1”";"“f1”",2]$$'); assert.equal(show(T[1]), '$$"“hola”"="“hola”"$$');
});

t('una celda con una variable en K o mm se muestra en esa unidad, no en la automatica', () => {
  const d = newDoc();
  const T = ["T:30'K", 'q:["a",T;"b",2]', 'q_(1,2)=', "m:5'mm", 'n:["a",m]', 'n_(1,2)='].map((x, i) => d.texts[addText(d, addPoint(d, 0, -i * 40), '$$' + x + '$$', {})]);
  const show = (q) => shownText(d, q).text.replace(/[-]/g, '');
  assert.equal(show(T[2]), '$$q_(1,2)=30 " K"$$'); assert.equal(show(T[5]), '$$n_(1,2)=5 " mm"$$');
});

t('una columna con texto y numeros se dibuja como una columna (matriz), no como una lista plana; cada numero con su unidad', () => {
  const d = newDoc();
  const L = ['D:["i","y";1,"-";2,3.5]', 'y:D_(2..end;2)', 'y=', "m:5'mm", 'c:["a",m;"b",2]', 'c='];
  const T = L.map((x, i) => d.texts[addText(d, addPoint(d, 0, -i * 40), '$$' + x + '$$', {})]);
  const raw = (q) => shownText(d, q).text;
  assert.ok(/[-]/.test(raw(T[2])), 'va entre las marcas de matriz');
  const show = (q) => raw(q).replace(/[-]/g, '');
  assert.equal(show(T[2]), '$$y=["“-”"; 3.5]$$'); assert.equal(show(T[5]), '$$c=["“a”", 5 " mm"; "“b”", 2]$$');
});

t('asignar a una celda dentro de un programa: elemento, rangos, :, end y crecer; a una matriz numerica, de cadenas o con celdas', () => {
  const V = () => ({ A: { mat: [[1, 2], [3, 4]], r: false }, v: { vec: [1, 2, 3], r: false }, N: { strs: ['a', 'b'] }, C: { cells: [[{ str: 'x' }, { v: 1 }], [{ v: 2 }, { str: 'y' }]] } });
  const run = (s) => evalExpr(s, { vars: V(), allowMat: true, allowCplx: true });
  assert.deepEqual(run('seq(A_(1,2):9; A)').mat, [[1, 9], [3, 4]]); assert.deepEqual(run('seq(A_(1..2,1):[7;8]; A)').mat, [[7, 2], [8, 4]]); assert.deepEqual(run('seq(A_(1..2,1):0; A)').mat, [[0, 2], [0, 4]]);
  assert.deepEqual(run('seq(A_(:,2):[5,6]; A)').mat, [[1, 5], [3, 6]]); assert.deepEqual(run('seq(A_(1,:):[5,6]; A)').mat, [[5, 6], [3, 4]]); // un vector en una fila o columna, en cualquier orientacion
  assert.deepEqual(run('seq(A_(end+1,1):9; A)').mat, [[1, 2], [3, 4], [9, 0]]); assert.deepEqual(run('seq(v_(end+1):4; v)').mat, [[1, 2, 3, 4]]); assert.deepEqual(run('seq(v_(2..3):[20,30]; v)').mat, [[1, 20, 30]]);
  assert.deepEqual(run('seq(M:[0], for(i, 1..3, M_(end+1,1):i), M)').mat, [[0], [1], [2], [3]]); // agregar filas en un ciclo
  assert.deepEqual(plain(run('seq(A_(1,2):"s"; A)')), [[1, 's'], [3, 4]]); // un texto en una matriz numerica: queda con celdas
  assert.deepEqual(plain(run('seq(C_(1,2):7; C)')), [['x', 7], [2, 'y']]); assert.deepEqual(plain(run('seq(C_(2,2):"z"; C)')), [['x', 1], [2, 'z']]);
  assert.deepEqual(plain(run('seq(C_(3,1):"new"; C)')), [['x', 1], [2, 'y'], ['new', '']]); // lo que crece se rellena con cadenas vacias si hay texto
  assert.deepEqual(run('seq(C_(1,1):1; C_(2,2):2; C)').mat, [[1, 1], [2, 2]]); // todo numero: vuelve a ser numerica
  assert.deepEqual(run('seq(N_(3):"c"; N)').strs, ['a', 'b', 'c']); assert.deepEqual(run('seq(N_(1..2):"q"; N)').strs, ['q', 'q']); assert.deepEqual(plain(run('seq(N_(2):5; N)')), [['a', 5]]);
  const z = run('seq(A_(1,2):3+4j; A)'); assert.equal(z.mat[0][1], 3); assert.equal(z.mi[0][1], 4);
  assert.deepEqual(run("seq(p:zeros(1, 3), p_2:5'mm, p)").dim, [1, 0, 0, 0, 0, 0, 0]);
  assert.throws(() => run('seq(A_(1..2,1):[1,2,3]; A)'), /recibe 2×1 elementos y el valor es de 1×3/); assert.throws(() => run('seq(A_(2..1,1):0; A)'), /va de menor a mayor/); assert.throws(() => run('seq(v_(:):0; v)'), /Un «:» solo no vale/);
});

console.log(passed + ' pruebas de matrices con celdas de distinto tipo');
