// Programas en las formulas (como en SMath): line(…), for(…), while(…) y la asignacion local «s:valor».
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
  assert.equal(ev('line(a:1, b:a+1, a*b)').value, 2);
  const vars = { s: { v: 99, r: false } };
  assert.equal(ev('line(s:0, s:s+5, s)', vars).value, 5);
  assert.equal(vars.s.v, 99); // la variable de afuera no cambia
  assert.deepEqual(Object.keys(vars), ['s']); // ni aparecen variables nuevas
  const r = ev("line(x:1'm, x:x*2, x)");
  assert.equal(r.value, 2); assert.deepEqual(r.dim, [1, 0, 0, 0, 0, 0, 0]); // con unidades
});

t('for recorre un rango o un vector; while repite mientras se cumple; if puede asignar', () => {
  const vars = { n: { v: 10, r: false } };
  assert.equal(ev('line(s:0, for(i, 1..n, s:s+i^2), s)', vars).value, 385);
  assert.equal(ev('line(t:0, for(i, 5..1, t:t+1), t)').value, 0); // fin < inicio: ninguna vuelta
  assert.equal(ev('line(v:[1,2,3], t:0, for(e, v, t:t+e), t)').value, 6);
  assert.equal(ev('line(k:0, while(k^2<50, k:k+1), k)').value, 8);
  assert.ok(Math.abs(ev('line(x:1, for(i, 1..20, x:x-(x^2-2)/(2x)), x)').value - Math.SQRT2) < 1e-12); // Newton
  assert.equal(ev('line(c:0, if(n>5, c:1, c:2), c)', vars).value, 1);
  assert.equal(ev('line(v:[4,5,6], v_2)').value, 5); // un vector local con indice
});

t('funciones propias con programas, tambien recursivas', () => {
  const vars = { suma2: fn(['n'], 'line(s:0, for(i, 1..n, s:s+i^2), s)'), fact: fn(['n'], 'if(n<=1, 1, n*fact(n-1))') };
  assert.equal(ev('suma2(3)', vars).value, 14);
  assert.equal(ev('suma2(3)+suma2(4)', vars).value, 44);
  assert.equal(ev('fact(5)', vars).value, 120);
});

t('errores claros: ciclo sin fin, «:» fuera de un programa, local sin valor, elemento, sintaxis', () => {
  err('line(k:0, while(1, k:k+1), k)', new RegExp(`pasó de ${LOOP_MAX.toLocaleString('es')} vueltas`));
  err('max(s:1, 2)', /«:» asigna un valor solo dentro de line\(\), for\(\) o while\(\)/, { s: { v: 1, r: false } });
  err('line(z:z+1, z)', /«z» se usa antes de darle un valor/);
  err('line(v:[1,2], v_1:5, v)', /Asignar a un elemento/);
  err('line(m:3, m_1)', /no es un vector ni una matriz/);
  err('for(i, 1..3)', /for\(i, inicio\.\.fin, cuerpo\)/);
  err('line()', /line\(a, b, …\)/);
  err("for(i, 1'm..3, 0)", /deben tener las mismas unidades/);
});

t('en los textos: se define y se usa; el programa en varias lineas se dibuja como se escribio; el texto guardado no cambia', () => {
  const d = newDoc();
  const src = '$$suma2(n):line(\n  s:0,\n  for(i, 1..n,\n    s:s+i^2\n  ),\n  s\n)$$';
  const a = d.texts[addText(d, addPoint(d, 0, 100), src, {})];
  const b = d.texts[addText(d, addPoint(d, 0, 0), '$$suma2(10)=$$', {})];
  assert.deepEqual(textVarErrors(d), []);
  assert.equal(clean(shownText(d, b).text), '$$suma2(10)=385$$');
  assert.equal(clean(shownText(d, a).text), '$$suma2(n):=line(\n  s:0,\n  for(i, 1..n,\n    s:s+i^2\n  ),\n  s\n)$$'); // en varias lineas
  assert.equal(calcSrc(calcParse(src)), src);
  const r = newDoc(); // un valor calculado con un programa
  const c = r.texts[addText(r, addPoint(r, 0, 0), '$$r:line(a:2, b:a^2, a+b)=$$', {})];
  assert.equal(clean(shownText(r, c).text), '$$r:=line(a:2, b:a^2, a+b)=6$$');
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

console.log(`\n${passed} pruebas de programas pasaron`);
