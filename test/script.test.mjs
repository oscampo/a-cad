// Scripts «%f(x):» con el programa por sangria (ver script.js) y la edicion como codigo (ver codeedit.js).
import assert from 'node:assert/strict';
import { parseScript } from '../src/script.js';
import { codeKey } from '../src/codeedit.js';
import { evalExpr } from '../src/expr.js';
import { newDoc, addPoint, addText } from '../src/model.js';
import { shownText } from '../src/text.js';
import { textVarErrors } from '../src/params.js';
import { setDecimal } from '../src/locale.js';

setDecimal('.');
let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const call = (src, args) => {
  const r = parseScript(src);
  assert.equal(r.err, undefined, r.err);
  return evalExpr(`${r.name}(${args})`, { vars: { [r.name]: { fn: { params: r.params, body: r.body, lib: r.lib } } } }).value;
};
const clean = (s) => s.replace(/[\uE000-\uF8FF]/g, '');

t('traduccion: for, while, if/elif/else, varios pasos por vuelta, funciones locales, comentarios y la forma de una linea', () => {
  assert.equal(parseScript('%suma2(n):\n  s:0\n  for i in 1..n:\n    s:s+i^2\n  s').body, 'line(s:0; for(i; 1..n; s:s+i^2); s)');
  assert.equal(call('%suma2(n):\n  s:0\n  for i in 1..n:\n    s:s+i^2\n  s', 10), 385);
  const signo = '%signo(x):\n  if x>0:\n    1\n  elif x<0:\n    -1\n  else:\n    0';
  assert.deepEqual([call(signo, -3), call(signo, 0), call(signo, 5)], [-1, 0, 1]);
  assert.ok(Math.abs(call('%raiz(a):\n  # Newton\n  x:a\n  while abs(x^2-a)>1e-12:\n    x:x-(x^2-a)/(2x)  # un paso\n  x', 2) - Math.SQRT2) < 1e-9);
  assert.equal(call('%fib(n):\n  a:0\n  b:1\n  for i in 1..n:\n    c:a+b\n    a:b\n    b:c\n  a', 10), 55);
  assert.equal(call('%h(n):\n  g(k): k^2+1\n  t:0\n  for i in 1..n:\n    t:t+g(i)\n  t', 3), 17); // funcion local
  assert.equal(call('%f(x): x^2+1', 3), 10);
  assert.equal(call('%f(x):\n\tx*2', 4), 8); // un tabulador cuenta como sangria
});

t('errores de sintaxis con su numero de linea', () => {
  const e = (s) => parseScript(s).err;
  assert.match(e('%f(x):\n  s:0\n    s+1'), /^línea 3: sangría de más/);
  assert.match(e('%f(x):\ns:0'), /^línea 2: esta línea queda fuera del programa/);
  assert.match(e('%f(x):\n  for i 1..3:\n    i'), /^línea 2: «for» lleva la forma «for i in 1\.\.n:»/);
  assert.match(e('%f(x):\n  if x>0:\n  1'), /^línea 2: falta el cuerpo de if/);
  assert.match(e('%f(x):\n  else:\n    1'), /^línea 2: «elif» y «else» van después de un «if»/);
  assert.match(e('%f(x):\n  s:'), /^línea 2: a «s» le falta el valor/);
  assert.match(e('%f(x):\n  for i in 1..3:\n    g(k): k\n  1'), /^línea 3: las funciones locales van en el nivel principal/);
  assert.match(e('%f(x):'), /^línea 2: falta el programa/);
  assert.match(e('%f(x)'), /^línea 1: un script empieza con su firma/);
});

t('en el dibujo: es una definicion en el orden de lectura; colapsado muestra la firma, expandido el codigo; el error se ve', () => {
  const d = newDoc();
  const D = '$$';
  const sc = d.texts[addText(d, addPoint(d, 0, 100), '%suma2(n):\n  s:0\n  for i in 1..n:\n    s:s+i^2\n  s', {})];
  const out = d.texts[addText(d, addPoint(d, 0, 50), D + 'suma2(10)=' + D, {})];
  const vs = d.texts[addText(d, addPoint(d, 0, 40), '%total:\n  g(k): k^2\n  t:0\n  for i in 1..3:\n    t:t+g(i)\n  t', {})];
  const out2 = d.texts[addText(d, addPoint(d, 0, 0), D + 'total*2=' + D, {})];
  const above = d.texts[addText(d, addPoint(d, 0, 200), D + 'suma2(2)=' + D, {})]; // antes del script: todavia no existe
  assert.deepEqual(textVarErrors(d), []);
  assert.equal(clean(shownText(d, out).text), '$$suma2(10)=385$$');
  assert.equal(clean(shownText(d, out2).text), '$$total*2=28$$'); // una variable calculada con un script, con funcion local
  assert.equal(clean(shownText(d, above).text), '$$suma2(2)=⚠$$');
  assert.equal(shownText(d, sc).text, '```\n▸ suma2(n)\n```');
  assert.equal(shownText(d, vs).text, '```\n▸ total\n```');
  sc.open = true;
  assert.equal(shownText(d, sc).text, '```\n▾ suma2(n):\n  s:0\n  for i in 1..n:\n    s:s+i^2\n  s\n```');
  const bad = d.texts[addText(d, addPoint(d, 0, -20), '%mal(x):\n  for i 1..3:\n    i', {})];
  assert.equal(shownText(d, bad).text, '```\n▸ mal(x)  ⚠\n```');
  assert.ok(textVarErrors(d).some((x) => /script «mal»: línea 2/.test(x.msg)));
  bad.open = true;
  assert.match(shownText(d, bad).text, /\n⚠ línea 2: «for» lleva la forma/);
  // las funciones locales no se ven afuera
  const g = d.texts[addText(d, addPoint(d, 0, -60), D + 'g(2)=' + D, {})];
  assert.equal(clean(shownText(d, g).text), '$$g(2)=⚠$$');
});

t('edicion como codigo: Enter conserva la sangria (y suma tras «:»), Tab sangra, Shift+Tab quita sangria', () => {
  const v = '%f(x):';
  let r = codeKey('Enter', false, v, v.length, v.length);
  assert.equal(r.v, '%f(x):\n  '); assert.equal(r.s, r.v.length);
  r = codeKey('Enter', false, '  s:0', 5, 5); assert.equal(r.v, '  s:0\n  ');
  r = codeKey('Enter', false, '  for i in 1..n:', 16, 16); assert.equal(r.v, '  for i in 1..n:\n    ');
  r = codeKey('Tab', false, 'ab', 1, 1); assert.equal(r.v, 'a  b'); assert.equal(r.s, 3);
  r = codeKey('Tab', false, 'a\nb\nc', 0, 3); assert.equal(r.v, '  a\n  b\nc'); // varias lineas
  r = codeKey('Tab', true, '    a\n  b', 0, 9); assert.equal(r.v, '  a\nb');
  assert.equal(codeKey('a', false, 'x', 1, 1), null);
});

console.log(`\n${passed} pruebas de scripts pasaron`);
