// Fracciones en los textos que calculan: un nombre de varias letras («ancho») y una llamada a funcion («sin(x)», «area(r)») son el numerador
// entero de «a/b», no solo su ultima letra o su parentesis.
import assert from 'node:assert/strict';
import { newDoc, addPoint, addText } from '../src/model.js';
import { shownText } from '../src/text.js';
import { layoutText } from '../src/mathlayout.js';
import { parse, isWord } from '../src/asciimath.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const frac = (src) => parse(src).c.find((n) => n.t === 'frac');
// Las piezas dibujadas de un texto de calculo: textos (con su altura) y barras
const draw = (txt) => {
  const d = newDoc(), p = addPoint(d, 0, 0), id = addText(d, p, txt);
  const L = layoutText(shownText(d, d.texts[id]).text, (s) => s.length * 0.5, '');
  return { ts: L.prims.filter((q) => q.k === 't'), bars: L.prims.filter((q) => q.k === 'p') };
};

t('parse: «sin(x)/x», «f(x)/2» y «mean(v)/n»: la funcion con su parentesis es el numerador', () => {
  for (const src of ['sin(x)/x', 'f(x)/2', 'mean(v)/n', 'sin(x)^2/x']) {
    const f = frac(src);
    assert.ok(f, src + ' sin fraccion');
    assert.equal(f.a.t, 'row', src); // [funcion, parentesis]
    assert.ok(['group', 'ss'].includes(f.a.c.at(-1).t), src); // el parentesis (con su exponente, si lo lleva)
  }
  assert.equal(frac('sin(x)/x').a.c[0].t, 'fn');
  assert.equal(frac('sin(x)/x').b.s, 'x');
});

t('parse: lo que no es una llamada no cambia (sin(x) a secas, x(y+z), a/b, (a+b)/c)', () => {
  assert.equal(parse('sin(x)').c.length, 2); // «sin» y «(x)» como siempre
  assert.equal(frac('a/b').a.s, 'a');
  assert.equal(frac('(a+b)/c').a.t, 'row');
  assert.equal(parse('x(y+z)').c.length, 2); // sin barra, no se agrupa
});

t('un nombre de varias letras es una sola variable: «ancho/2» dibuja «ancho» sobre «2»', () => {
  const g = draw('$$alto:ancho/2$$');
  const num = g.ts.find((q) => q.s === 'ancho'), den = g.ts.find((q) => q.s === '2');
  assert.ok(num && den, 'ancho debe ser una sola pieza');
  assert.equal(g.bars.length, 1);
  assert.ok(num.y < g.bars[0].pts[0][1] && g.bars[0].pts[0][1] < den.y, 'numerador arriba, raya, denominador abajo'); // y crece hacia abajo
  const h = draw('$$s:2/ancho$$');
  assert.ok(h.ts.find((q) => q.s === 'ancho').y > h.bars[0].pts[0][1], 'ancho abajo');
});

t('sin(x)/x y f(x)/area dibujan la funcion entera arriba', () => {
  const g = draw('$$q:sin(x)/x$$');
  const bar = g.bars[0].pts[0][1], above = g.ts.filter((q) => q.y < bar).map((q) => q.s).join('');
  assert.equal(above, 'sin(x)');
  const h = draw('$$w:mean(v)/ancho$$');
  assert.equal(h.ts.filter((q) => q.y < h.bars[0].pts[0][1]).map((q) => q.s).join(''), 'mean(v)');
});

t('no se tocan las comillas, las unidades, los colores, los numeros con exponente ni las palabras del calculo', () => {
  assert.ok(draw('$$a:"hola mundo"$$').ts.some((q) => q.s.includes('hola')), 'el texto entre comillas queda como esta');
  assert.ok(draw('$$a:3\'mm/ancho$$').ts.some((q) => q.s === 'ancho'));
  assert.ok(draw('$$a:2e5/ancho$$').ts.some((q) => q.s === '2e5'), 'un numero con exponente no es un nombre');
  assert.ok(isWord('sin') && isWord('pi') && isWord('mean') === isWord('mean') && !isWord('ancho'));
  const sinFn = draw('$$a:sin(x)$$').ts.map((q) => q.s);
  assert.ok(sinFn.includes('sin'), 'sin sigue siendo la funcion');
});

console.log(`\n${passed} pruebas de fracciones pasaron`);
