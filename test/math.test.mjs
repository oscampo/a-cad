// Matematica en los textos: parser AsciiMath, reparto de $...$ / $$...$$ y layout (sin DOM, con una medida aproximada).
import assert from 'node:assert/strict';
import { parse } from '../src/asciimath.js';
import { splitMath, layoutMath, layoutText } from '../src/mathlayout.js';
import { textFrame, framePrims, textValue, plainText } from '../src/text.js';
import { CASES } from './math-cases.mjs';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const measure = (s) => s.length * 0.5;
const sp = (x) => splitMath(x).map(({ raw, ...r }) => r); // sin el texto original (raw)

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

t('parser: operadores elemento a elemento en notacion matematica', () => {
  // ./ es una fraccion marcada (ew): se dibuja con un punto antes de la raya
  const ew = parse('sin(x)./x'), fr = parse('sin(x)/x');
  assert.equal(ew.c[1].ew, true);
  assert.equal(fr.c[1].ew, undefined);
  assert.deepEqual({ ...ew.c[1], ew: undefined }, { ...fr.c[1], ew: undefined });
  assert.deepEqual(parse('x.^2'), parse('x^2')); // .^ es una potencia normal
  assert.equal(parse('a.*b').c[1].s, '.⋅'); // .*: el punto antes del ⋅ del producto
  assert.equal(parse('2./3').c[0].a.s, '2'); // el punto no se pega al numero
  assert.equal(parse('1.5').c[0].s, '1.5');
  // el punto va a la izquierda de la raya, a la altura del eje, y la fraccion se ensancha
  const bx = (s) => layoutMath(s, false, measure);
  const A = bx('a./b'), B = bx('a/b');
  assert.ok(A.w > B.w);
  const dot = A.ops.find((o) => o.k === 't' && o.s === '⋅'), bar = A.ops.find((o) => o.k === 'p');
  assert.ok(dot && bar && dot.x < bar.pts[0][0]);
  assert.ok(!B.ops.some((o) => o.k === 't' && o.s === '⋅'));
});

t('parser: nunca lanza y un grupo sin cierre se acepta', () => {
  for (const s of ['', '(', '((a', 'sqrt', 'a/', '/a', '^', '_2', ')', 'frac', 'x^', '"abc', 'sum_', '{: a :}', '\u{1F600}']) assert.doesNotThrow(() => parse(s), s);
  const g = parse('(a+b').c[0];
  assert.equal(g.t, 'group'); assert.equal(g.r, null);
});

t('reparto: $ en linea, $$ en bloque, \\$ literal, y reglas de pandoc', () => {
  assert.deepEqual(sp('a $x$ b'), [{ t: 'txt', s: 'a ' }, { t: 'math', src: 'x', disp: false }, { t: 'txt', s: ' b' }]);
  assert.deepEqual(sp('$$\na\nb\n$$'), [{ t: 'math', src: '\na\nb\n', disp: true }]);
  assert.deepEqual(sp('cuesta $5 y $6'), [{ t: 'txt', s: 'cuesta $5 y $6' }]); // cierre seguido de cifra
  assert.deepEqual(sp('a $ x $ b'), [{ t: 'txt', s: 'a $ x $ b' }]); // espacio junto al $
  assert.deepEqual(sp('vale \\$5'), [{ t: 'txt', s: 'vale $5' }]);
  assert.deepEqual(sp('$a\nb$'), [{ t: 'txt', s: '$a\nb$' }]); // en linea no cruza lineas
  const u = sp('x $$a');
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

t('asciimath.org: todos los ejemplos de la tabla se parsean y se miden sin NaN', () => {
  for (const s of CASES) for (const disp of [false, true]) {
    const b = layoutMath(s, disp, measure);
    for (const v of [b.w, b.a, b.d]) assert.ok(Number.isFinite(v), s);
    for (const o of b.ops) for (const v of o.k === 't' ? [o.x, o.y, o.sz] : [...o.pts.flat(), o.lw]) assert.ok(Number.isFinite(v), s);
    assert.ok(b.w > 0, s + ' (vacio)');
  }
});

t('asciimath.org: matrices, vectores columna, aumentadas y casos', () => {
  const m = parse('[[a,b],[c,d]]').c[0];
  assert.equal(m.t, 'mat'); assert.equal(m.rows.length, 2); assert.equal(m.rows[0].length, 2);
  assert.equal(parse('((a),(b))').c[0].rows.length, 2);
  const au = parse('[[a,b,|,c],[d,e,|,f]]').c[0];
  assert.equal(au.rows[0].length, 3); assert.deepEqual(au.bars, [2]);
  const cs = parse('{(2x,+,17y,=,23),(x,-,y,=,5):}').c[0];
  assert.equal(cs.t, 'mat'); assert.equal(cs.rows[0].length, 5); assert.equal(cs.r, ':}');
  assert.equal(parse('(1,2)').c[0].t, 'group'); // una pareja no es matriz
  const sm = parse('[a, b; c, d]').c[0], col = parse('[a;b]').c[0];
  assert.equal(sm.t, 'mat'); assert.equal(sm.rows.length, 2); assert.equal(sm.rows[0].length, 2);
  assert.equal(col.t, 'mat'); assert.equal(col.rows.length, 2); assert.equal(col.rows[0].length, 1);
  for (const s of ['[a, b; c]', '[x; ]', '[0, 1]', '(a; b)']) assert.equal(parse(s).c[0].t, 'group', s); // filas desiguales, celda vacia o sin «;»: tal cual
  const lay2 = layoutMath('[[a,b],[c,d]]', true, measure), lay1 = layoutMath('[a,b]', true, measure);
  assert.ok(lay2.a + lay2.d > 2 * (lay1.a + lay1.d) * 0.9);
  assert.ok(lay2.ops.some((o) => o.k === 'p')); // corchetes grandes
  assert.ok(layoutMath('[[a,b,|,c],[d,e,|,f]]', true, measure).ops.filter((o) => o.k === 'p').length >= 3);
});

t('asciimath.org: dy/dx, primas, texto, color, fuentes y alfabetos', () => {
  const d = parse('dy/dx').c[0];
  assert.equal(d.t, 'frac'); assert.equal(d.a.c.length, 2);
  assert.equal(parse("f'(x)").c[1].s, '′');
  assert.equal(parse('text(hi there)').c[0].s, 'hi there');
  assert.equal(parse('color(red)(x)').c[0].col, 'red');
  assert.equal(parse('color(red"><x)(y)').c[0].col, null); // nombres raros se descartan (van a atributos SVG)
  const col = layoutMath('color(red)(x) + y', false, measure).ops.filter((o) => o.k === 't');
  assert.equal(col[0].col, 'red'); assert.equal(col[1].col, undefined);
  const bold = layoutMath('bb x', false, measure).ops[0];
  assert.equal(bold.bold, true); assert.equal(bold.it, false);
  assert.equal(layoutMath('bbb R', false, measure).ops[0].s, 'ℝ');
  assert.equal(layoutMath('cc A', false, measure).ops[0].s, '𝒜');
  assert.equal(layoutMath('fr g', false, measure).ops[0].s, '𝔤');
  assert.equal(layoutMath('tt x', false, measure).ops[0].font, 'mono');
  assert.equal(parse('overbrace(1+2)^("n")').c[0].sup.c[0].t, 'txt');
});

t('asciimath.org: simbolos con espacios y palabras', () => {
  assert.equal(parse('a and b').c[1].k, 'word');
  assert.equal(parse('a in B').c[1].s, '∈');
  assert.equal(parse('sin x').c[0].t, 'fn'); // «sin» no se parte en «s» + «in»
  assert.equal(parse('a o+ b').c[1].s, '⊕');
  assert.equal(parse('x |__ y __|').c[1].t, 'group');
  assert.equal(parse('a -<= b').c[1].s, '⪯');
});

t('rangos: dentro de $...$ el vector es un vector fila', () => {
  const doc = { pts: { p: { x: 0, y: 0 } }, lines: {}, circles: {}, arcs: {}, cons: {}, ellipses: {}, splines: {}, hatches: {}, traces: {}, texts: {} };
  doc.texts.t1 = { pt: 'p', h: 1, font: '', text: '$a:1..5;5$\n$b:0..0.5..1$\nvalen $a=$ y $b=$ y $$A:2..8;3\n`M =` a=$$' };
  const shown = textValue(doc, doc.texts.t1);
  assert.match(plainText(shown), /valen \$a=\[1, 2, 3, 4, 5\]\$ y \$b=\[0, 0\.5, 1\]\$ y /);
  assert.equal(plainText(shown).includes(''), false);
  const m = layoutText(shown, measure, '').prims;
  const nums = m.filter((p) => p.k === 't').map((p) => p.s);
  assert.ok(['0', '0.5', '1'].every((x) => nums.includes(x)), 'b = [0 0.5 1]');
  assert.ok(['2', '5', '8'].every((x) => nums.includes(x)), 'A := [2 5 8]');
  assert.ok(!nums.includes(','), 'sin comas dentro de la formula');
  assert.ok(m.filter((p) => p.k === 't' && p.s === '[').length >= 3 || m.some((p) => p.k === 'p'), 'con corchetes');
  const row = layoutMath('[1, 2, 3, 4, …, 9, 10]', false, measure);
  assert.ok(row.ops.some((o) => o.k === 't' && o.s === '…'));
  assert.equal(parse('[1, 2, 3]').c[0].rows[0].length, 3);
});

t('transpuesta: v^T y M^T se dibujan transpuestas (vector columna = fila transpuesta)', () => {
  const r = parse('[[1,2,3]]^T').c[0];
  assert.equal(r.t, 'mat'); assert.equal(r.rows.length, 3); assert.equal(r.rows[0].length, 1);
  const m = parse('[[a,b],[c,d]]^T').c[0];
  assert.equal(m.rows[0][1].c[0].s, 'c'); assert.equal(m.rows[1][0].c[0].s, 'b');
  const v = parse('[1, 2, 3]^T').c[0];
  assert.equal(v.rows.length, 3);
  assert.equal(parse('[1, 2, 3]^2').c[0].t, 'ss'); // otro exponente: no es transpuesta
  assert.equal(parse('x^T').c[0].t, 'ss'); // una letra no es una matriz
  const col = layoutMath('[1, 2, 3]^T', false, measure), fila = layoutMath('[1, 2, 3]', false, measure);
  assert.ok(col.a + col.d > 2 * (fila.a + fila.d) * 0.9 && col.w < fila.w);
});

t('variables con subindice: $var_(texto):valor$ se define, se usa en formulas y se dibuja con el subindice como texto', () => {
  const doc = { pts: { p: { x: 0, y: 0 } }, lines: {}, circles: {}, arcs: {}, cons: {}, ellipses: {}, splines: {}, hatches: {}, traces: {}, texts: {} };
  doc.texts.t1 = { pt: 'p', h: 1, font: '', text: '$var_(texto-del-subíndice):3$\n$k_( total ):2*var_(texto-del-subíndice)$\nplano: $k_(total)+var_(texto-del-subíndice)=$ y $2*k_( total )=$\n$$n_(ref):5\nx = n_(ref) + k_(total) * var_(texto-del-subíndice)^2$$' };
  const shown = textValue(doc, doc.texts.t1);
  const plain = plainText(shown);
  assert.match(plain, /^\$var_\(texto-del-subíndice\):=3\$\n\$k_\(total\):=2\*var_\(texto-del-subíndice\)\$\nplano: \$k_\(total\)\+var_\(texto-del-subíndice\)=9\$ y \$2\*k_\(total\)=12\$\n/); // k = 2*3 = 6; 6+3 = 9; 2*6 = 12
  assert.equal(plain.includes('⚠'), false);
  const m = layoutText(shown, measure, '').prims.filter((p) => p.k === 't');
  const subs = m.filter((p) => p.s === 'texto-del-subíndice'), names = m.filter((p) => p.s === 'var' && p.it);
  assert.ok(subs.length >= 1 && subs.every((p) => !p.it && p.sz < 1), 'subindice como texto recto y pequeno');
  assert.ok(names.length >= 1 && m.some((p) => p.s === 'ref'), 'el nombre en cursiva y la definicion dentro de la formula');
  assert.ok(!m.some((p) => /[→∈⊂]/.test(p.s)), 'sin simbolos sueltos («to» ya no es una flecha)');
  assert.ok(m.some((p) => p.s === 'k' && p.it) && m.some((p) => p.s === 'total'), 'k_(total)');
  // exponente junto al subindice
  const pw = parse('var_(a-b)^2').c[0];
  assert.equal(pw.t, 'ss'); assert.equal(pw.sub.s, 'a-b'); assert.equal(pw.sup.s, '2');
});

t('variables con subindice: sin definir no se tocan, y la sintaxis invalida no es una definicion', () => {
  const doc = { pts: { p: { x: 0, y: 0 } }, lines: {}, circles: {}, arcs: {}, cons: {}, ellipses: {}, splines: {}, hatches: {}, traces: {}, texts: {} };
  doc.texts.t1 = { pt: 'p', h: 1, font: '', text: '$x_(a-b)$ y $x_():3$ y y_(a(b)){=1}' };
  const shown = textValue(doc, doc.texts.t1);
  // x_():3 se lee como una funcion «x_» sin parametros: no vale (⚠); lo demas no se toca
  assert.equal(plainText(shown), '$x_(a-b)$ y $x_():=3 ⚠$ y y_(a(b)){=1}');
});

t("parser: «'in^2» es la unidad (no ∈ con prima), «'(x)» sigue siendo prima y clear(all) no tiene ≪", () => {
  assert.deepEqual(parse("'in^2").c, [{ t: 'txt', s: 'in²' }]); // sola, sin espacio delante
  assert.deepEqual(parse("5'(m/s)").c.map((n) => n.s), ['5', ' m/s']);
  assert.deepEqual(parse("f'(x)").c.map((n) => n.t), ['v', 'sym', 'group']);
  assert.ok(!JSON.stringify(parse('clear(all)')).includes('≪'));
  assert.ok(!JSON.stringify(parse("A='in")).includes('∈'));
});

console.log(`\n${passed} pruebas de matematica pasaron`);
