// Matematica en los textos: parser AsciiMath, reparto de $...$ / $$...$$ y layout (sin DOM, con una medida aproximada).
import assert from 'node:assert/strict';
import { parse } from '../src/asciimath.js';
import { splitMath, layoutMath, layoutText } from '../src/mathlayout.js';
import { textFrame, framePrims } from '../src/text.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const measure = (s) => s.length * 0.5;

t('parser: fraccion con operandos simples y parentesis que se quitan', () => {
  const r = parse('3/4=1/x');
  assert.deepEqual(r.c.map((n) => n.t), ['frac', 'o', 'frac']);
  assert.equal(r.c[0].a.s, '3');
  const g = parse('(a+b)/2');
  assert.equal(g.c[0].t, 'frac');
  assert.equal(g.c[0].a.t, 'row'); // sin los parentesis
});

t('parser: 3 * 5/2 = 7.5 -> numero, producto, fraccion, igual, numero', () => {
  assert.deepEqual(parse('3 * 5/2 = 7.5').c.map((n) => n.t), ['n', 'o', 'frac', 'o', 'n']);
});

t('parser: sub y superindices, griegas, raiz, sumatoria con limites', () => {
  const a = parse('x_1^2');
  assert.equal(a.c[0].t, 'ss'); assert.equal(a.c[0].sub.s, '1'); assert.equal(a.c[0].sup.s, '2');
  assert.equal(parse('alpha').c[0].s, 'α');
  assert.equal(parse('Delta').c[0].t, 'sym');
  const q = parse('sqrt(x^2+y^2)').c[0];
  assert.equal(q.t, 'sqrt'); assert.equal(q.body.t, 'row');
  const s = parse('sum_(i=1)^n i').c[0];
  assert.equal(s.t, 'big'); assert.ok(s.sub && s.sup);
  assert.equal(parse('root 3 x').c[0].idx.s, '3');
});

t('parser: operadores de varios signos y funciones', () => {
  assert.equal(parse('a<=b').c[1].s, '≤');
  assert.equal(parse('a->b').c[1].s, '→');
  assert.equal(parse('a+-b').c[1].s, '±');
  assert.equal(parse('sin x').c[0].t, 'fn');
  assert.equal(parse('oo').c[0].s, '∞');
});

t('parser: nunca lanza y un grupo sin cierre se acepta', () => {
  for (const s of ['', '(', '((a', 'sqrt', 'a/', '/a', '^', '_2', ')', 'frac', 'x^', '"abc', 'sum_', '{: a :}', '\u{1F600}']) assert.doesNotThrow(() => parse(s), s);
  const g = parse('(a+b').c[0];
  assert.equal(g.t, 'group'); assert.equal(g.r, null);
});

t('reparto: $ en linea, $$ en bloque, \\$ literal, y reglas de pandoc', () => {
  assert.deepEqual(splitMath('a $x$ b'), [{ t: 'txt', s: 'a ' }, { t: 'math', src: 'x', disp: false }, { t: 'txt', s: ' b' }]);
  assert.deepEqual(splitMath('$$\na\nb\n$$'), [{ t: 'math', src: '\na\nb\n', disp: true }]);
  assert.deepEqual(splitMath('cuesta $5 y $6'), [{ t: 'txt', s: 'cuesta $5 y $6' }]); // cierre seguido de cifra
  assert.deepEqual(splitMath('a $ x $ b'), [{ t: 'txt', s: 'a $ x $ b' }]); // espacio junto al $
  assert.deepEqual(splitMath('vale \\$5'), [{ t: 'txt', s: 'vale $5' }]);
  assert.deepEqual(splitMath('$a\nb$'), [{ t: 'txt', s: '$a\nb$' }]); // en linea no cruza lineas
  const u = splitMath('x $$a');
  assert.equal(u.length, 1); assert.match(u[0].s, /⚠/); // $$ sin cierre
});

t('layout: una fraccion es mas alta que una letra y mas ancha que sus partes', () => {
  const f = layoutMath('3/4', true, measure), l = layoutMath('3', true, measure);
  assert.ok(f.a > l.a && f.d > 0.1);
  assert.ok(f.w > l.w);
  assert.ok(f.ops.some((o) => o.k === 'p' && o.pts.length === 2)); // la barra
  const nums = f.ops.filter((o) => o.k === 't');
  assert.ok(nums[0].y < 0 && nums[1].y > 0); // numerador arriba, denominador abajo
});

t('layout: la linea base del denominador no depende de si es «x» o una cifra', () => {
  const base = (s) => layoutMath(s, true, measure).ops.filter((o) => o.k === 't').at(-1).y;
  assert.equal(base('3/x'), base('3/5'));
  const top = (s) => layoutMath(s, true, measure).ops.filter((o) => o.k === 't')[0].y;
  assert.equal(top('x/3'), top('y/3')); // el puntal del numerador tampoco depende de los descendentes
});

t('layout: superindice sube, subindice baja; raiz y parentesis grandes se dibujan con trazos', () => {
  const s = layoutMath('x^2_1', false, measure).ops.filter((o) => o.k === 't');
  assert.ok(s[1].y < 0 && s[2].y > 0);
  assert.ok(layoutMath('sqrt(x)', false, measure).ops.some((o) => o.k === 'p'));
  const g = layoutMath('(1/2)^2', false, measure);
  assert.ok(g.ops.filter((o) => o.k === 'p').length >= 3); // barra + 2 parentesis
  const natural = layoutMath('(x)', false, measure);
  assert.equal(natural.ops.filter((o) => o.k === 'p').length, 0); // tamano natural: letras
});

t('layout: menos unario sin espacios, binario con espacios', () => {
  const u = layoutMath('-x', false, measure), b = layoutMath('a-x', false, measure);
  assert.ok(b.w - 1.5 > u.w - 1.0 + 0.3); // el binario suma relleno a los lados
});

t('layout: nunca produce NaN', () => {
  for (const s of ['sum_(i=1)^n i^2', 'int_0^1 x dx', 'lim_(x->0) sin x/x', 'hat x + bar y + vec v', 'root 3 (x+1)', '{(a,b); c}', 'abs(x/2)', '"texto" + 1']) {
    const b = layoutMath(s, true, measure);
    for (const v of [b.w, b.a, b.d]) assert.ok(Number.isFinite(v), s);
    for (const o of b.ops) for (const v of o.k === 't' ? [o.x, o.y] : o.pts.flat()) assert.ok(Number.isFinite(v), s);
  }
});

t('texto: linea plana igual que siempre; mixto crece; bloque centrado y apilado', () => {
  const plain = layoutText('hola\nmundo', measure, '');
  assert.equal(plain.prims.length, 2);
  assert.ok(Math.abs(plain.hh - 2.4) < 1e-9);
  const mix = layoutText('vale $1/2$ aprox', measure, '');
  assert.ok(mix.hh > 1.2);
  const blk = layoutText('Resultado:\n$$\n3/4=1/x\nx=3*4\n$$\nfin', measure, '');
  const ys = [...new Set(blk.prims.filter((p) => p.k === 't').map((p) => Math.round(p.y * 100)))];
  assert.ok(ys.length >= 4);
  assert.ok(blk.hh > 1.2 * 3);
  const sin = layoutText('a\n$$x$$', measure, ''), con = layoutText('a\n$$x$$\n', measure, '');
  assert.ok(con.hh > sin.hh); // el salto de linea final cuenta como linea, el que sigue al $$ no
});

t('textFrame: sin formulas no cambia; con formulas trae las primitivas', () => {
  const tx = { text: 'abc', h: 0.2, font: '', anchor: 'bl' };
  const f = textFrame(tx, measure);
  assert.equal(f.math, undefined);
  assert.deepEqual(framePrims(f, tx), []);
  const tm = { text: 'x = $1/2$', h: 0.2, font: '', anchor: 'bl' };
  const g = textFrame(tm, measure);
  assert.ok(g.math && g.hh >= 0.24 && g.w > 0);
  const pr = framePrims(g, tm);
  assert.ok(pr.some((p) => p.k === 'p') && pr.some((p) => p.k === 't' && p.size > 0));
  for (const p of pr) for (const v of p.k === 't' ? [p.x, p.y] : p.pts.flat()) assert.ok(Number.isFinite(v));
});

console.log(`\n${passed} pruebas de matematica pasaron`);
