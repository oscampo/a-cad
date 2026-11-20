// Ecuaciones: fzero(ecuacion; x; inicial) dentro de una formula y solve(ec1; ec2; x; y)= en un texto (Levenberg-Marquardt de numopt-js).
import assert from 'node:assert/strict';
import { newDoc, addPoint, addLine, addCon, addText } from '../src/model.js';
import { initSolver, solve } from '../src/solver.js';
import { dimText } from '../src/dims.js';
import { shownText } from '../src/text.js';
import { textVarErrors, settle, hasReactive } from '../src/params.js';
import { setDecimal } from '../src/locale.js';
import { evalExpr } from '../src/expr.js';
import { splitEq } from '../src/nsolve.js';

await initSolver();
setDecimal('.');
let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) <= e * Math.max(1, Math.abs(b)), `${a} != ${b}`);
const L = [1, 0, 0, 0, 0, 0, 0];
const clean = (s) => s.replace(/[-]/g, '');
let DEC = null; // indicador decimal del documento de prueba (null: el de siempre, punto)
const page = (...xs) => {
  const d = newDoc();
  if (DEC) d.decimal = DEC;
  xs.forEach((x, i) => addText(d, addPoint(d, 0, -10 * i), '$$' + x + '$$', {}));
  return { show: Object.values(d.texts).map((tx) => clean(shownText(d, tx).text)), errs: textVarErrors(d).map((e) => e.msg) };
};

t('splitEq: el «==» de afuera; no el de un if ni «<=», «>=», «!=»', () => {
  assert.deepEqual(splitEq('x^2 == 2'), ['x^2 ', ' 2']);
  assert.equal(splitEq('if(a==b, 1, 2)'), null);
  assert.equal(splitEq('a <= b'), null); assert.equal(splitEq('a != b'), null);
  assert.equal(splitEq('x^2-2'), null);
});

t('fzero: con «==» o una expresion que vale 0, con valor inicial, con unidades y dentro de otra formula', () => {
  near(evalExpr('fzero(x^2-2, x)').value, Math.SQRT2);
  near(evalExpr('fzero(x^2==2, x, -1)').value, -Math.SQRT2); // la raiz mas cercana al valor inicial
  const r = evalExpr("fzero(x^2==2'm^2, x, 1'm)");
  near(r.value, Math.SQRT2); assert.deepEqual(r.dim, L);
  near(evalExpr("fzero(F*2'm == 30'kN*'m, F, 1'kN)").value, 15000);
  near(evalExpr('2*fzero(x^2-4, x)+1').value, 5);
  near(evalExpr('fzero(x-a, x)', { vars: { a: { v: 3, r: false } } }).value, 3);
  near(evalExpr('fzero(x^3==8, x)', { vars: { x: { v: 5, r: false } } }).value, 2); // sin valor inicial: el de x en ese punto
});

t('fzero: errores claros', () => {
  assert.throws(() => evalExpr('fzero(x^2+1, x)'), /no encontré una solución/);
  assert.throws(() => evalExpr("fzero(x^2==2'm^2, x)"), /unidades/); // x sin unidades no puede dar m²
  assert.throws(() => evalExpr('fzero(x^2-2)'));
});

t('solve: las incognitas valen la solucion desde ahi, con la unidad de su valor inicial', () => {
  const a = page("x:1'm\ny:1'm", "solve(x^2+y^2==25'm^2, y==x+1'm, x, y)=", 'x=\ny=\nx*y=');
  assert.equal(a.show[1], '$$solve(x^2+y^2==25 " m"^2, y==x+1 " m", x, y)=x=3 " m"; y=4 " m"$$');
  assert.equal(a.show[2], '$$x=3 " m"\ny=4 " m"\nx*y=12 " m²"$$');
  assert.deepEqual(a.errs, []);
  const b = page("F:1'kN\nL:1'm", "solve(F*L==30'kN*'m, F==10'kN*L/'m, F, L)=");
  assert.equal(b.show[1], '$$solve(F*L==30 " kN"* " m", F==10 " kN"*L/ " m", F, L)=F=17.321 " kN"; L=1.732 " m"$$');
  const c = page('x:5', 'x=', 'solve(x^2==4, x)=', 'x='); // antes del solve, el valor inicial
  assert.equal(c.show[1], '$$x=5$$'); assert.equal(c.show[3], '$$x=2$$');
});

t('solve con vectores: [ecuaciones], [incognitas] da un vector columna', () => {
  const a = page('x:1\ny:1', 'solve([2x+17y==23; x-y==5], [x; y])=');
  assert.equal(a.show[1], '$$solve([2x+17y==23; x-y==5], [x; y])=[x=5.684; y=0.684]$$');
  assert.deepEqual(a.errs, []);
  const b = page("x:1'm\ny:1'm\nz:1'm", "solve([x+y+z==6'm; x-y==1'm; y-z==1'm], [x; y; z])="); // tres incognitas, con unidades
  assert.equal(b.show[1], '$$solve([x+y+z==6 " m"; x-y==1 " m"; y-z==1 " m"], [x; y; z])=[x=3 " m"; y=2 " m"; z=1 " m"]$$');
  DEC = ',';
  const c = page('x:1\ny:1', 'solve([2x+17y==23,5 | x-y==5]; [x | y])='); // coma decimal: filas con «|», vectores con «;»
  DEC = null;
  assert.equal(c.show[1], '$$solve([2x+17y==23,5 | x-y==5]; [x | y])=[x=5,711 | y=0,711]$$');
  assert.match(page('x:1', 'solve([x==1], x)=').errs.join('|'), /lleva dos vectores/);
  assert.match(page('x:1', 'solve(x==1, [x])=').errs.join('|'), /lleva dos vectores/);
});

t('solve: errores claros (sin solucion, sin valor inicial, pocas ecuaciones, una cota)', () => {
  const a = page('x:1', 'solve(x^2==-1, x)=');
  assert.equal(a.show[1], '$$solve(x^2==-1, x)=⚠$$'); assert.match(a.errs.join('|'), /no encontré una solución/);
  assert.match(page('a:1', 'solve(z^2==2, z)=').errs.join('|'), /define «z» antes del solve/);
  assert.match(page('x:1\ny:1', 'solve(x+y==2, x, y)=').errs.join('|'), /al menos tantas ecuaciones/);
  assert.match(page('x:1', 'solve(x^2, x)=').errs.join('|'), /no es una ecuación/);
});

// Un rectangulo: ancho D1 (mueve el dibujo), alto D2 = 20 y la diagonal D3 de solo lectura; la meta en un texto.
const rect = (goal, du) => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 40, 0), c = addPoint(d, 40, 20);
  d.pts[a].fixed = true;
  const l1 = addLine(d, a, b, {}), l2 = addLine(d, b, c, {});
  addCon(d, { t: 'H', refs: [l1] }); addCon(d, { t: 'V', refs: [l2] });
  const u = du ? { du } : {};
  const k1 = addCon(d, { t: 'DIST', refs: [a, b], v: 40, name: 'D1', ...u });
  const k2 = addCon(d, { t: 'DIST', refs: [b, c], v: 20, name: 'D2', ...u });
  const k3 = addCon(d, { t: 'DIST', refs: [a, c], v: Math.hypot(40, 20), name: 'D3', ref: true, ...u });
  const tx = addText(d, addPoint(d, 0, -30), '$$' + goal + '$$', {});
  return { d, k1, k2, k3, show: () => clean(shownText(d, d.texts[tx]).text), errs: () => textVarErrors(d).map((e) => e.msg) };
};

t('solve con cotas como incognitas: mueve el dibujo hasta cumplir la ecuacion sobre sus medidas', () => {
  const r = rect('solve(D1*D2 == 500; D1)=');
  assert.ok(hasReactive(r.d));
  assert.ok(settle(r.d, solve, []).ok);
  near(r.d.cons[r.k1].v, 25, 1e-6);
  assert.equal(r.show(), '$$solve(D1*D2 == 500; D1)=D1=25$$');
  const g = rect('solve(D3 == 50; D1)='); // la diagonal (de solo lectura) mide 50
  assert.ok(settle(g.d, solve, []).ok);
  near(g.d.cons[g.k1].v, Math.sqrt(50 * 50 - 20 * 20), 1e-6); assert.equal(dimText(g.d, g.d.cons[g.k3]), '50');
  const u = rect("solve(D3 == 6'cm; D1)=", 'mm'); // con unidades
  assert.ok(settle(u.d, solve, []).ok);
  assert.equal(dimText(u.d, u.d.cons[u.k3]), '60 mm');
  g.d.cons[g.k2].v = 30; // otro cambio del dibujo: la meta se vuelve a cumplir
  assert.ok(settle(g.d, solve, []).ok);
  near(g.d.cons[g.k1].v, 40, 1e-6);
});

t('solve con cotas: sin solucion, el dibujo queda como estaba; una cota de solo lectura no es incognita', () => {
  const r = rect('solve(D3 == 10; D1)='); // con un alto de 20 la diagonal no puede medir 10
  const s = settle(r.d, solve, []);
  assert.equal(s.ok, false); assert.match(s.error, /no encontré una solución/);
  near(r.d.cons[r.k1].v, 40); assert.match(r.show(), /=⚠\$\$$/);
  const q = rect('solve(D3 == 50; D3)=');
  assert.match(settle(q.d, solve, []).error, /D3 es de solo lectura/);
  assert.ok(q.errs().some((m) => /D3 es de solo lectura/.test(m)));
  assert.match(rect('x:1\nsolve(D3 == 50; D1; x)=').errs().join('|'), /todas cotas o todas variables de texto/);
});

t('fzero: la incognita puede llamarse como una funcion definida antes (F(x) y luego fzero(…, F, …))', () => {
  setDecimal('.');
  const vars = { F: { fn: { params: ['x'], body: 'x*2' } } };
  const r = evalExpr("fzero(F*2'm == 30'kN*'m, F, 10'kN)", { vars });
  assert.ok(Math.abs(r.value - 15000) < 1e-6, String(r.value));
  assert.equal(evalExpr('max(F(2), 3)', { vars }).value, 4); // F sigue siendo la funcion fuera de fzero
});

console.log(`\n${passed} pruebas de ecuaciones pasaron`);
