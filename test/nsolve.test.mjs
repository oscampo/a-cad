// Ecuaciones: fzero(ecuacion; x; inicial) dentro de una formula y solve(ec1; ec2; x; y)= en un texto (Levenberg-Marquardt de numopt-js).
import assert from 'node:assert/strict';
import { newDoc, addPoint, addText } from '../src/model.js';
import { shownText } from '../src/text.js';
import { textVarErrors } from '../src/params.js';
import { setDecimal } from '../src/locale.js';
import { evalExpr } from '../src/expr.js';
import { splitEq } from '../src/nsolve.js';

setDecimal('.');
let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) <= e * Math.max(1, Math.abs(b)), `${a} != ${b}`);
const L = [1, 0, 0, 0, 0, 0, 0];
const clean = (s) => s.replace(/[-]/g, '');
const page = (...xs) => {
  const d = newDoc();
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

t('solve: errores claros (sin solucion, sin valor inicial, pocas ecuaciones, una cota)', () => {
  const a = page('x:1', 'solve(x^2==-1, x)=');
  assert.equal(a.show[1], '$$solve(x^2==-1, x)=⚠$$'); assert.match(a.errs.join('|'), /no encontré una solución/);
  assert.match(page('a:1', 'solve(z^2==2, z)=').errs.join('|'), /define «z» antes del solve/);
  assert.match(page('x:1\ny:1', 'solve(x+y==2, x, y)=').errs.join('|'), /al menos tantas ecuaciones/);
  assert.match(page('x:1', 'solve(x^2, x)=').errs.join('|'), /no es una ecuación/);
});

console.log(`\n${passed} pruebas de ecuaciones pasaron`);
