// Mas funciones de vectores y matrices (prod, mean, cumsum, dot, cross...), filas y columnas A_(i,:) y funciones definidas en los textos: foo(x; y):....
import assert from 'node:assert/strict';
import { evalExpr } from '../src/expr.js';
import { textValue, plainText } from '../src/text.js';
import { newDoc, addPoint, addLine, addCon } from '../src/model.js';
import { recompute, varsInfo, renameDim, pruneFormulas } from '../src/params.js';
import { layoutMath } from '../src/mathlayout.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const M = (src, vars = null) => evalExpr(src, { allowMat: true, vars });
const mat = (src, vars) => M(src, vars).mat;
const num = (src, vars) => M(src, vars).value;
const fails = (src, re, vars) => assert.throws(() => M(src, vars), re, src);
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) <= e, `${a} != ${b}`);

t('resumenes: prod, mean, median, std, variance, len, rows, cols, min(x), max(x)', () => {
  assert.equal(num('prod([1,2,3,4])'), 24);
  assert.equal(num('mean([1,2,3,4])'), 2.5);
  assert.equal(num('mean([1,2;3,4])'), 2.5);
  assert.equal(num('median([5,1,3])'), 3);
  assert.equal(num('median([4,1,3,2])'), 2.5);
  near(num('variance([2,4,4,4,5,5,7,9])'), 32 / 7); // muestral (entre n-1)
  near(num('std([2,4,4,4,5,5,7,9])'), Math.sqrt(32 / 7));
  assert.equal(num('std([5])'), 0);
  assert.equal(num('len([1,2;3,4])'), 4);
  assert.equal(num('len(5)'), 1);
  assert.equal(num('rows([1,2;3,4;5,6])'), 3);
  assert.equal(num('cols([1,2;3,4;5,6])'), 2);
  assert.equal(num('rows([1,2,3])'), 1);
  assert.equal(num('cols([1;2;3])'), 1);
  assert.equal(num('min([4,1,9])'), 1);
  assert.equal(num('max([4,1,9;2,2,2])'), 9);
  assert.equal(num('max(3; 5)'), 5); // dos valores, como siempre
  assert.deepEqual(mat('max([1,5]; [3,2])'), [[3, 5]]); // elemento a elemento, como siempre
  fails('max(5)', /dos valores/);
  fails('mean([1,2],[3,4])', /recibe un valor/);
});

t('forma: trace, diag, eye', () => {
  assert.equal(num('trace([1,2;3,4])'), 5);
  assert.equal(num('trace(7)'), 7);
  fails('trace([1,2,3])', /cuadradas.*1×3/);
  assert.deepEqual(mat('diag([1,2,3])'), [[1, 0, 0], [0, 2, 0], [0, 0, 3]]);
  assert.deepEqual(mat('diag([4;5])'), [[4, 0], [0, 5]]);
  assert.deepEqual(mat('diag([1,2;3,4])'), [[1], [4]]);
  assert.deepEqual(mat('diag([1,2;3,4;5,6])'), [[1], [4]]);
  assert.deepEqual(mat('eye(3)'), [[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
  assert.deepEqual(mat('2*eye(2)+[1,2;3,4]'), [[3, 2], [3, 6]]);
  fails('eye(0)', /entero de 1 a 100/);
  fails('eye(2.5)', /entero/);
  fails('eye(101)', /1 a 100/);
  fails('eye([1,2])', /entero/);
});

t('acumuladas y entre dos vectores: cumsum, cumprod, dot, cross', () => {
  assert.deepEqual(mat('cumsum([1,2,3,4])'), [[1, 3, 6, 10]]);
  assert.deepEqual(mat('cumprod([1,2,3,4])'), [[1, 2, 6, 24]]);
  assert.deepEqual(mat('cumsum([1;2;3])'), [[1], [3], [6]]); // conserva la orientacion
  assert.equal(num('cumsum(5)'), 5);
  fails('cumsum([1,2;3,4])', /vectores \(fila o columna\)/);
  assert.equal(num('dot([1,2,3]; [4,5,6])'), 32);
  assert.equal(num('dot([1,2,3]; [4;5;6])'), 32); // fila y columna: da igual
  fails('dot([1,2,3]; [1,2])', /mismo tamaño \(3 y 2\)/);
  fails('dot([1,2,3])', /dos vectores/);
  assert.deepEqual(mat('cross([1,0,0]; [0,1,0])'), [[0, 0, 1]]);
  assert.deepEqual(mat('cross([1;0;0]; [0;1;0])'), [[0], [0], [1]]); // como el primero
  assert.deepEqual(mat('cross([1,2,3]; [4,5,6])'), [[-3, 6, -3]]);
  fails('cross([1,2]; [3,4])', /3 elementos/);
  assert.equal(num('dot(cross([1,2,3];[4,5,6]); [1,2,3])'), 0); // el producto vectorial es perpendicular
});

const IV = { A: { mat: [[1, 2, 3], [4, 5, 6]] }, v: { vec: [7, 8, 9] }, i: { v: 2, r: false }, w: { mat: [[1], [2], [3]] } };

t('filas y columnas: A_(i,:), A_(:,j), A_(:,:)', () => {
  assert.deepEqual(mat('A_(2,:)', IV), [[4, 5, 6]]);
  assert.deepEqual(mat('A_(:,3)', IV), [[3], [6]]);
  assert.deepEqual(mat('A_(:,:)', IV), [[1, 2, 3], [4, 5, 6]]);
  assert.deepEqual(mat('A_(i,:)', IV), [[4, 5, 6]]); // el indice puede ser una variable
  assert.deepEqual(mat('A_(i-1,:)', IV), [[1, 2, 3]]);
  assert.equal(num('sum(A_(2,:))', IV), 15);
  assert.equal(num('A_(1,:)*A_(2,:)^T', IV), 32); // producto punto de dos filas
  assert.deepEqual(mat('A_(:,2)^T', IV), [[2, 5]]);
  assert.equal(num('dot(A_(1,:); A_(2,:))', IV), 32);
  assert.deepEqual(mat('v_(1,:)', IV), [[7, 8, 9]]);
  assert.deepEqual(mat('w_(:,1)', IV), [[1], [2], [3]]);
  assert.equal(num('A_(2,3)', IV), 6); // el elemento, como siempre
  fails('A_(3,:)', /fuera de rango.*fila 3/, IV);
  fails('A_(:,4)', /fuera de rango.*columna 4/, IV);
  fails('A_(:)', /«:» solo no vale/, IV);
  fails('A_(1,:,2)', /dos/, IV);
});

const mk = (text) => {
  const doc = { pts: { p: { x: 0, y: 0 } }, lines: {}, circles: {}, arcs: {}, cons: {}, ellipses: {}, splines: {}, hatches: {}, traces: {}, texts: {} };
  doc.texts.t1 = { pt: 'p', h: 1, font: '', text };
  return doc;
};
const show = (text) => { const d = mk(text); return plainText(textValue(d, d.texts.t1)); };

t('funciones de usuario: $foo(x):...$, varios parametros, funciones que llaman a funciones', () => {
  const s = show('$f(x):x^2+1$\n$g(a; b):a*b+f(a)$\n$h(u, v):u-v$\n$f(3)=$ $g(2; 5)=$ $h(10, 4)=$ $f(f(1))=$ $f(2)*f(3)=$');
  assert.equal(s, '$f(x):=x^2+1$\n$g(a; b):=a*b+f(a)$\n$h(u, v):=u-v$\n$f(3)=10$ $g(2; 5)=15$ $h(10, 4)=6$ $f(f(1))=5$ $f(2)*f(3)=50$');
  assert.equal(s.includes('⚠'), false);
  assert.equal(show('$f(x):x^2$\n$sin(f(30))=$').split('\n').at(-1), '$sin(f(30))=0$'); // sin(900°) = sin(180°) = 0: las funciones de siempre aceptan las de usuario
});

t('funciones de usuario: los parametros ocultan a las variables de igual nombre; lo demas es del dibujo', () => {
  const s = show('$x:100$\n$k:3$\n$f(x):x+1$\n$h(x):x*k$\n$f(1)=$ $x=$ $h(4)=$ $f(x)=$');
  assert.match(s, /\$f\(1\)=2\$ \$x=100\$ \$h\(4\)=12\$ \$f\(x\)=101\$$/);
});

t('funciones de usuario: leen las variables que valen al llamarlas (orden de lectura)', () => {
  const s = show('$f(x):x+c$\n$g(q):q*2$\n$c:10$\n$z:g(c)$\n$y:f(2)+z$\n$y=$ $z=$');
  assert.match(s, /\$y=32\$ \$z=20\$$/); // f(2) = 12; z = g(10) = 20; y = 12 + 20 (f se define antes que c, pero se llama despues)
  assert.equal(s.includes('⚠'), false);
  // lo que se llama antes de definirse no existe todavia
  const late = show('$y:f(2)$\n$f(x):x+1$\n$f(1)=$');
  assert.match(late, /^\$y:=f\(2\) ⚠\$\n\$f\(x\):=x\+1\$\n\$f\(1\)=2\$$/);
});

t('funciones de usuario: vectores y matrices como argumentos y resultados', () => {
  const s = show('$sq(x):x.^2$\n$m(A):A*A$\n$n(a; b):dot(a; b)$\n$v:[1,2,3]$\n$B:[1,1;0,1]$\n$sq(v)=$ $m(B)=$ $n(v; [4,5,6])=$ $sq(2)=$ $sq([1;2])=$');
  assert.match(s, /\$sq\(v\)=\[1, 4, 9\]\$ \$m\(B\)=\[1, 2; 0, 1\]\$ \$n\(v; \[4,5,6\]\)=32\$ \$sq\(2\)=4\$ \$sq\(\[1;2\]\)=\[1; 4\]\$$/);
});

t('funciones de usuario: recursion con si() y limite de profundidad', () => {
  assert.match(show('$fact(n):si(n<=1; 1; n*fact(n-1))$\n$fact(5)=$ $fact(10)=$'), /=120\$ \$fact\(10\)=3628800\.0\$$/);
  assert.match(show('$fib(n):si(n<3; 1; fib(n-1)+fib(n-2))$\n$fib(12)=$'), /=144\$$/);
  assert.match(show('$loop(n):loop(n+1)$\n$loop(1)=$'), /=⚠\$$/); // sin fin: 200 niveles
  assert.throws(() => evalExpr('loop(1)', { vars: { loop: { fn: { params: ['n'], body: 'loop(n+1)' } } } }), /200 niveles/);
});

t('funciones de usuario: errores claros', () => {
  const vars = { f: { fn: { params: ['x'], body: 'x+1' } }, g: { fn: { params: ['a', 'b'], body: 'a*b' } }, h: { fn: { params: ['x'], body: 'x+y' } } };
  fails('f(1; 2)', /«f» recibe un valor: f\(x\)/, vars);
  fails('g(1)', /«g» recibe 2 valores separados por «;»: g\(a; b\)/, vars);
  fails('f', /es una función: escríbela con paréntesis/, vars);
  fails('f()', /al menos un valor/, vars);
  fails('h(1)', /En «h»: No reconozco «y»/, vars);
  assert.equal(num('f(1)+g(2;3)', vars), 8);
  assert.equal(num('2f(3)', vars), 8); // multiplicacion implicita
  assert.equal(num('max(f(1), f(2))', vars), 3); // coma tras una llamada
  // un fallo imposible dentro de una rama no elegida de si() no se propaga
  assert.equal(num('si(1; 5; f(1/0))', vars), 5);
});

t('funciones de usuario: definiciones invalidas y nombres que chocan', () => {
  const doc = mk('$sin(x):x$\n$f(x; x):x$\n$f2(1x):x$\n$f3():5$\n$ok(x):x$\n$ok(y):y$\n$r:1$\n$r(x):x$\n$sum(a):a$');
  const bad = plainText(textValue(doc, doc.texts.t1)).split('\n');
  for (const i of [0, 1, 2, 3, 8]) assert.ok(bad[i].includes('⚠'), `línea ${i}: ${bad[i]}`);
  for (const i of [4, 5, 6, 7]) assert.ok(!bad[i].includes('⚠'), `línea ${i}: ${bad[i]}`); // redefinir (incluso una variable como funcion) vale
  const f = mk('$f(x):x+1$\n$f(1)=$\n$f(x):x*10$\n$f(1)=$\n$f:7$\n$f=$');
  assert.match(plainText(textValue(f, f.texts.t1)), /\n\$f\(1\)=2\$\n.*\n\$f\(1\)=10\$\n.*\n\$f=7\$$/); // la ultima definicion leida es la que vale
});

t('funciones de usuario: se listan, se leen desde cotas y siguen el renombrado de cotas', () => {
  const d = newDoc(), a = addPoint(d, 0, 0), b = addPoint(d, 10, 0), c = addPoint(d, 0, 5), e = addPoint(d, 20, 5);
  addLine(d, a, b, {}); addLine(d, c, e, {});
  const k1 = addCon(d, { t: 'DIST', refs: [a, b], v: 10, name: 'D1' });
  const k2 = addCon(d, { t: 'DIST', refs: [c, e], v: 20, name: 'D2', expr: 'f(3) + D1' });
  d.texts.t1 = { pt: addPoint(d, 0, 100), h: 1, font: '', text: '$f(x):x^2+1$\n$h(x):x*D1$', ang: 0, anchor: 'bl', color: 'auto', readable: true }; // por encima de las cotas (orden de lectura)
  const r = recompute(d);
  assert.ok(r.ok, r.error);
  assert.equal(d.cons[k2].v, 20); // f(3) + D1 = 10 + 10
  assert.deepEqual(pruneFormulas(d), []); // la formula sigue viva
  const info = varsInfo(d).find((x) => x.name === 'f');
  assert.equal(info.text, 'f(x) = función');
  renameDim(d, k1, 'L');
  assert.match(d.texts.t1.text, /h\(x\):x\*L\$/); // el cuerpo de la funcion sigue al nombre
  assert.equal(d.cons[k2].expr, 'f(3) + L');
});

t('funciones de usuario: dentro de una formula se muestran como se escriben', () => {
  const s = show('$$f(x):x^2+1\nA:[1,2;3,4]\ng(a; b):a*b$$\n$f(2)=$');
  assert.match(s, /^\$\$f\(x\):=x\^2\+1\nA:=\[1, 2; 3, 4\]\ng\(a; b\):=a\*b\$\$\n\$f\(2\)=5\$$/);
});

t('dibujo: A_(i,:) y A_(:,j) llevan los dos puntos; (: x :) sigue siendo un angulo', () => {
  const syms = (src) => layoutMath(src, true, (x) => x.length * 0.5).ops.filter((o) => o.k === 't').map((o) => o.s);
  assert.ok(syms('A_(1,:)').includes(':') && !syms('A_(1,:)').includes('⟩'));
  assert.ok(syms('A_(:,2)').includes(':') && !syms('A_(:,2)').includes('⟨'));
  assert.deepEqual(syms('(: x :)'), ['⟨', 'x', '⟩']);
  assert.ok(syms('x_(i,:) + y_(:,j)').filter((q) => q === ':').length === 2);
});

console.log(`\n${passed} pruebas de funciones pasaron`);
