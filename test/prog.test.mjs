// Programas en las formulas (como en SMath): seq(…), for(…), while(…) y la asignacion local «s:valor».
import assert from 'node:assert/strict';
import { evalExpr, LOOP_MAX } from '../src/expr.js';
import { newDoc, addPoint, addText } from '../src/model.js';
import { shownText } from '../src/text.js';
import { textVarErrors } from '../src/params.js';
import { calcParse, calcSrc } from '../src/tvars.js';
import { setDecimal } from '../src/locale.js';

setDecimal('.');
let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const fn = (params, body) => ({ fn: { params, body } });
const ev = (s, vars = {}) => evalExpr(s, { vars, allowMat: true });
const err = (s, re, vars = {}) => assert.throws(() => ev(s, vars), re);
const clean = (s) => s.replace(/[-]/g, '');

t('line hace los pasos en orden y vale el ultimo; las asignaciones son locales', () => {
  assert.equal(ev('seq(a:1, b:a+1, a*b)').value, 2);
  const vars = { s: { v: 99, r: false } };
  assert.equal(ev('seq(s:0, s:s+5, s)', vars).value, 5);
  assert.equal(vars.s.v, 99); // la variable de afuera no cambia
  assert.deepEqual(Object.keys(vars), ['s']); // ni aparecen variables nuevas
  const r = ev("seq(x:1'm, x:x*2, x)");
  assert.equal(r.value, 2); assert.deepEqual(r.dim, [1, 0, 0, 0, 0, 0, 0]); // con unidades
});

t('for recorre un rango o un vector; while repite mientras se cumple; if puede asignar', () => {
  const vars = { n: { v: 10, r: false } };
  assert.equal(ev('seq(s:0, for(i, 1..n, s:s+i^2), s)', vars).value, 385);
  assert.equal(ev('seq(t:0, for(i, 5..1, t:t+1), t)').value, 0); // fin < inicio: ninguna vuelta
  assert.equal(ev('seq(v:[1,2,3], t:0, for(e, v, t:t+e), t)').value, 6);
  assert.equal(ev('seq(k:0, while(k^2<50, k:k+1), k)').value, 8);
  assert.ok(Math.abs(ev('seq(x:1, for(i, 1..20, x:x-(x^2-2)/(2x)), x)').value - Math.SQRT2) < 1e-12); // Newton
  assert.equal(ev('seq(c:0, if(n>5, c:1, c:2), c)', vars).value, 1);
  assert.equal(ev('seq(v:[4,5,6], v_2)').value, 5); // un vector local con indice
});

t('funciones propias con programas, tambien recursivas', () => {
  const vars = { suma2: fn(['n'], 'seq(s:0, for(i, 1..n, s:s+i^2), s)'), fact: fn(['n'], 'if(n<=1, 1, n*fact(n-1))') };
  assert.equal(ev('suma2(3)', vars).value, 14);
  assert.equal(ev('suma2(3)+suma2(4)', vars).value, 44);
  assert.equal(ev('fact(5)', vars).value, 120);
});

t('errores claros: ciclo sin fin, «:» fuera de un programa, local sin valor, elemento, sintaxis', () => {
  err('seq(k:0, while(1, k:k+1), k)', new RegExp(`pasó de ${LOOP_MAX.toLocaleString('es')} vueltas`));
  err('max(s:1, 2)', /«:» asigna un valor solo dentro de seq\(\), for\(\) o while\(\)/, { s: { v: 1, r: false } });
  err('seq(z:z+1, z)', /«z» se usa antes de darle un valor/);
  assert.deepEqual(ev('seq(v:[1,2], v_1:5, v)').mat, [[5, 2]]); // asignar a un elemento ya se puede (ver más abajo)
  err('seq(m:3, m_1)', /no es un vector ni una matriz/);
  err('for(i, 1..3)', /for\(i, inicio\.\.fin, cuerpo\)/);
  err('seq()', /seq\(a, b, …\)/);
  err("for(i, 1'm..3, 0)", /deben tener las mismas unidades/);
});

t('en los textos: se define y se usa; el programa en varias lineas se dibuja como se escribio; el texto guardado no cambia', () => {
  const d = newDoc();
  const src = '$$suma2(n):seq(\n  s:0,\n  for(i, 1..n,\n    s:s+i^2\n  ),\n  s\n)$$';
  const a = d.texts[addText(d, addPoint(d, 0, 100), src, {})];
  const b = d.texts[addText(d, addPoint(d, 0, 0), '$$suma2(10)=$$', {})];
  assert.deepEqual(textVarErrors(d), []);
  assert.equal(clean(shownText(d, b).text), '$$suma2(10)=385$$');
  assert.equal(clean(shownText(d, a).text), '$$suma2(n):=seq(\n  s:0,\n  for(i, 1..n,\n    s:s+i^2\n  ),\n  s\n)$$'); // en varias lineas
  assert.equal(calcSrc(calcParse(src)), src);
  const r = newDoc(); // un valor calculado con un programa
  const c = r.texts[addText(r, addPoint(r, 0, 0), '$$r:seq(a:2, b:a^2, a+b)=$$', {})];
  assert.equal(clean(shownText(r, c).text), '$$r:=seq(a:2, b:a^2, a+b)=6$$');
});

t('el 0 sin unidades por cualquier cosa sigue valiendo con cualquier unidad (la rama «0» de un if); una unidad escrita se conserva', () => {
  const vars = { P: { v: 25000, r: false, d: [1, 1, -2, 0, 0, 0, 0] }, f: fn(['x', 'a'], "if(x>a, x-a, 0)") };
  const r = ev("P*f(0.1'm, 0.36'm) + 3'kN*'m", vars); // la rama 0: P*0 no es «0 N» y se suma a un momento
  assert.equal(r.value, 3000); assert.deepEqual(r.dim, [2, 1, -2, 0, 0, 0, 0]);
  assert.deepEqual(ev("0'mm").dim, [1, 0, 0, 0, 0, 0, 0]); // 0 mm sigue siendo una longitud
  assert.deepEqual(ev("0*'m").dim, [1, 0, 0, 0, 0, 0, 0]);
  assert.throws(() => ev("0'mm+2'kg"), /No se puede sumar/);
  assert.deepEqual(ev("2'm*3").dim, [1, 0, 0, 0, 0, 0, 0]);
});

t('asignar a un elemento dentro de un programa: p_i, A_(i,j) y cadenas, sobre una copia local; crece como en MATLAB', () => {
  const q = { vec: [1, 2, 3], r: false };
  assert.deepEqual(ev('seq(p:[1, 2, 3], for(i, 1..3, p_i:p_i + 1), p)').mat, [[2, 3, 4]]);
  assert.deepEqual(ev('seq(q_1:9, q)', { q }).mat, [[9, 2, 3]]); assert.deepEqual(q.vec, [1, 2, 3]); // la del documento no cambia
  assert.deepEqual(ev('seq(p:[0], for(i, 1..4, p_i:i^2), p)').mat, [[1, 4, 9, 16]]); // crece con cada asignación
  assert.deepEqual(ev('seq(A:[1, 2; 3, 4], A_(3,3):7, A)').mat, [[1, 2, 0], [3, 4, 0], [0, 0, 7]]);
  assert.deepEqual(evalExpr('seq(s:["a", "b"], s_2:"z", s)', { vars: {}, allowMat: true, allowCplx: true }).strs, ['a', 'z']); // allowCplx: también cadenas
  assert.deepEqual(ev("seq(p:zeros(1, 3), p_2:5'mm, p)").dim, [1, 0, 0, 0, 0, 0, 0]); // ceros sin unidades: toma la del valor
  assert.equal(ev('seq(p:[1, 2], p_2:7)').value, 7); // vale lo asignado
  assert.throws(() => ev("seq(p:[1'mm, 2'mm], p_1:3'kN, p)"), /lleva m: no se le asigna N/);
  assert.throws(() => ev('seq(p:[1, 2], p_0:1, p)'), /entero desde 1/);
  assert.throws(() => ev('seq(A:[1, 2; 3, 4], A_2:0, A)'), /lleva dos índices/);
  assert.throws(() => ev('seq(p:[1, 2], p_1:[1, 2], p)'), /recibe 1×1 elementos y el valor es de 1×2/);
});

t('índices con paréntesis dentro: b_(k + 7*(j - 1)), funciones en el índice, el índice de un nombre con subíndice y asignar', () => {
  const V = { b: { vec: [10, 20, 30, 40, 50, 60, 70, 80], r: false }, jug: { v: 2, r: false }, k: { v: 1, r: false }, A: { mat: [[1, 2], [3, 4]], r: false }, 'T_(st)': { mat: [[5, 6], [7, 8]], r: false } };
  const n = (s) => ev(s, V).value;
  assert.equal(n('b_(k + 7*(jug - 1))'), 80); // antes: «No reconozco b_»
  assert.equal(n('b_((2))'), 20); assert.equal(n('b_(max(1, 3))'), 30);
  assert.equal(n('A_(max(1, 2), (1))'), 3);
  assert.equal(n('T_(st)_((1),(2))'), 6); assert.equal(n('T_(st)_(1,2)'), 6);
  assert.equal(n('b_(k + 7*(jug - 1)) * (2)'), 160); // el paréntesis de después no es parte del índice
  assert.deepEqual(ev('seq(p:b, p_(k + 3*(jug - 1)):0, p)', V).mat, [[10, 20, 30, 0, 50, 60, 70, 80]]);
  const d = newDoc(); d.decimal = '.';
  addText(d, addPoint(d, 0, 100), '$$b:[1, 2, 3, 4, 5, 6, 7, 8]$$', {});
  addText(d, addPoint(d, 0, 90), '%lado(v, jug):\n  s:0\n  for k in 1..3:\n    s:s + v_(k + 4*(jug - 1))\n  s', {});
  addText(d, addPoint(d, 0, 80), '%poner(v, jug):\n  v_(1 + 4*(jug - 1)):0\n  v', {});
  const o = d.texts[addText(d, addPoint(d, 0, 70), '$$lado(b, 2)=$$', {})], q = d.texts[addText(d, addPoint(d, 0, 60), '$$sum(poner(b, 2))=$$', {})];
  assert.equal(textVarErrors(d).length, 0, textVarErrors(d).map((e) => e.msg).join('|'));
  assert.equal(clean(shownText(d, o).text), '$$lado(b, 2)=18$$'); // 5+6+7 (en un script, con «for»)
  assert.equal(clean(shownText(d, q).text), '$$sum(poner(b, 2))=31$$'); // asignar con un índice anidado en un script: 36 - 5
});

t('«Mostrar solo el resultado» (valOnly): cada «expr=» se dibuja como su valor; sin la propiedad, como siempre', () => {
  const d = newDoc(); d.decimal = '.';
  const T = (q, y, o = {}) => Object.assign(d.texts[addText(d, addPoint(d, 0, y), q, {})], o);
  T("$$fo:[4, 0, 7]$$", 100); T("$$F:2.5'kN$$", 90);
  const a = T('$$fo_3=$$', 80, { valOnly: true }), b = T('$$F=$$', 70, { valOnly: true }), c = T('$$fo_3=$$', 60), e = T('$$k:2\nk*fo_1=$$', 50, { valOnly: true });
  const s = (x) => clean(shownText(d, x).text);
  assert.equal(s(a), '$$7$$'); assert.equal(s(b), '$$2.5 " kN"$$'); // con su unidad (como en «F=»)
  assert.equal(s(c), '$$fo_3=7$$'); // sin la propiedad, como siempre
  assert.equal(s(e), '$$k:=2\n8$$'); // las definiciones se dibujan igual; solo las salidas cambian
  T('$$saludo:"Tu turno"$$', 40);
  const g = T('$$saludo=$$', 30, { valOnly: true }), h = T('$$saludo=$$', 20);
  assert.equal(s(g), 'Tu turno'); // una cadena: como texto normal, sin comillas (un mensaje), en la fuente del texto
  T('$$fila:" ·  ✶  A "$$', 15); const fl = T('$$fila=$$', 10, { valOnly: true }), mix = T('$$k:2\nk*fo_1=$$', 5, { valOnly: true });
  assert.equal(s(fl), ' ·  ✶  A '); // con sus espacios (una fila alineada en monoespaciada)
  assert.equal(s(mix), '$$k:=2\n8$$'); // un bloque con definiciones o un número: como fórmula, como siempre
  assert.equal(s(h), '$$saludo="“Tu turno”"$$'); // sin la propiedad, con ellas
});

t('una definición cuyo valor es el vector que devuelve una función se dibuja como su fórmula (con «=», también su valor)', () => {
  const d = newDoc(); d.decimal = '.';
  const T = (q, y) => d.texts[addText(d, addPoint(d, 0, y), q, {})];
  const s = (x) => clean(shownText(d, x).text);
  T('$$doble(v):2*v$$', 100);
  const a = T('$$w:doble([1, 2])$$', 90), b = T('$$z:doble([1, 2])=$$', 80), c = T('$$u:[1, 2]$$', 70), r = T('$$q:0..1..2$$', 60);
  assert.equal(s(a), '$$w:=doble([1, 2])$$'); // la fórmula, no el vector
  assert.match(s(b), /^\$\$z:=doble\(\[1, 2\]\)=.*2.*4/); // la fórmula y su valor
  assert.equal(s(c), '$$u:=[1, 2]$$'); // escrito a mano: el vector, como siempre
  assert.equal(s(r), '$$q:=[0, 1, 2]$$'); // un rango: su vector, como siempre
});

t('el reparto de semillas del Mancala: una función que modifica su parámetro y un script con while', () => {
  const d = newDoc(); d.decimal = '.';
  const T = (q, y) => d.texts[addText(d, addPoint(d, 0, y), q, {})];
  T('$$capture(p, i):seq(p_7:p_7 + p_i + p_(14-i), p_i:0, p_(14-i):0, p)$$', 100);
  T('%sembrar(p, k):\n  # reparte las semillas del foso k, una por foso, en sentido antihorario\n  n:p_k\n  p_k:0\n  i:k\n  while n > 0:\n    i:mod(i, 14) + 1\n    p_i:p_i + 1\n    n:n - 1\n  p', 90);
  const a = T('$$tab:[4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0]$$', 80);
  T('$$r:sembrar(tab, 3)$$', 70);
  T('$$c:capture([0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 5, 0, 0, 0], 3)$$', 65);
  const outs = ['r_3', 'r_4', 'r_7', 'r_8', 'r_9', 'sum(r)', 'c_7', 'c_3', 'c_11', 'tab_3'].map((q, i) => [q, T('$$' + q + '=$$', 60 - i * 3)]);
  assert.equal(textVarErrors(d).length, 0, textVarErrors(d).map((e) => e.msg).join('|'));
  const val = (t) => clean(shownText(d, t).text).replace(/^\$\$.*=/, '').replace(/\$\$$/, '');
  // foso 3 con 4 semillas: queda vacío y van a 4, 5, 6 y 7 (el almacén); 8 no recibe; se conservan las 48 semillas
  assert.deepEqual(outs.map(([q, t]) => q + '=' + val(t)), ['r_3=0', 'r_4=5', 'r_7=1', 'r_8=4', 'r_9=4', 'sum(r)=48', 'c_7=8', 'c_3=0', 'c_11=0', 'tab_3=4']); // tab no cambió
  void a;
});

t('scripts con break, continue y return; también dentro de las fórmulas', () => {
  const d = newDoc(); d.decimal = '.';
  let y = 200; const T = (q) => addText(d, addPoint(d, 0, y -= 10), q, {});
  T('%primero(v, lim):\n  for i in 1..numel(v):\n    if v_i > lim:\n      return i\n  0');
  T('%pares(n):\n  s:0\n  for i in 1..n:\n    if mod(i, 2) == 1:\n      continue\n    s:s + i\n  s');
  T('%hasta(n):\n  k:0\n  while 1:\n    k:k + 1\n    if k >= n:\n      break\n  k');
  T('%anidado(n):\n  c:0\n  for i in 1..n:\n    for j in 1..n:\n      if j > i:\n        break\n      c:c + 1\n  c');
  T('$$a:primero([1, 5, 9, 2], 4)$$'); T('$$b:primero([1, 2], 4)$$'); T('$$c:pares(10)$$'); T('$$k:hasta(7)$$'); T('$$f:anidado(4)$$');
  const outs = ['a', 'b', 'c', 'k', 'f'].map((n) => d.texts[T(`$$${n}=$$`)]);
  assert.deepEqual(textVarErrors(d), []);
  assert.deepEqual(outs.map((t) => clean(shownText(d, t).text)), ['$$a=2$$', '$$b=0$$', '$$c=30$$', '$$k=7$$', '$$f=10$$']); // f: el break interno solo corta su ciclo (1+2+3+4)
  assert.equal(ev('seq(s:0, for(i, 1..10, seq(if(i > 3, break(), 0), s:s + i)), s)').value, 6);
  assert.equal(ev('seq(return(5), 7)').value, 5);
  assert.throws(() => ev('break()'), /va dentro de un for o un while/);
  assert.deepEqual(ev('find([0, 3, 0, 5])').mat, [[2, 4]]);
  assert.equal(ev('find([0, 0])').value, 0);
  assert.equal(evalExpr('isempty("")', { allowCplx: true }).value, 1);
  assert.equal(evalExpr('replace("a-b", "-", "+")', { allowCplx: true }).str, 'a+b');
  assert.equal(evalExpr('extractBetween("abcdef", 2, 4)', { allowCplx: true }).str, 'bcd');
});

console.log(`\n${passed} pruebas de programas pasaron`);
