// Markdown en los textos normales: marcas en linea, formas de bloque y su efecto en la caja del texto.
import assert from 'node:assert/strict';
import { mdInline, mdBlock, hasMd } from '../src/markdown.js';
import { layoutText } from '../src/mathlayout.js';
import { textFrame } from '../src/text.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const f = (s) => mdInline(s).map((r) => (r.b ? 'B' : '') + (r.it ? 'I' : '') + (r.st ? 'S' : '') + (r.code ? 'C' : '') + '[' + r.s + ']').join(' ');

t('marcas en linea', () => {
  assert.equal(f('**negrita** y *cursiva*'), 'B[negrita] [ y ] I[cursiva]');
  assert.equal(f('***ambas***'), 'BI[ambas]');
  assert.equal(f('*a **b** c*'), 'I[a ] BI[b] I[ c]');
  assert.equal(f('__neg__ _cur_'), 'B[neg] [ ] I[cur]');
  assert.equal(f('~~tachado~~'), 'S[tachado]');
  assert.equal(f('`a*b*`'), 'C[a*b*]');
  assert.equal(f('**a** y **b**'), 'B[a] [ y ] B[b]');
});

t('lo que queda tal cual', () => {
  assert.equal(f('mi_archivo_v2'), '[mi_archivo_v2]'); // _ dentro de una palabra
  assert.equal(f('2 * 3 * 4'), '[2 * 3 * 4]'); // * entre espacios
  assert.equal(f('\\*literal\\*'), '[*literal*]'); // escapado
  assert.equal(f('C:\\Users\\x'), '[C:\\Users\\x]'); // \ ante una letra no escapa
  assert.equal(f('**sin cierre'), '[**sin cierre]');
  assert.equal(f('``'), '[``]');
});

t('formas de bloque', () => {
  assert.deepEqual(mdBlock('## T'), { kind: 'h', level: 2, rest: 'T' });
  assert.deepEqual(mdBlock('- a'), { kind: 'ul', level: 1, mark: '•', rest: 'a' });
  assert.deepEqual(mdBlock('  * b'), { kind: 'ul', level: 2, mark: '◦', rest: 'b' });
  assert.deepEqual(mdBlock('3) c'), { kind: 'ol', level: 1, mark: '3)', rest: 'c' });
  assert.deepEqual(mdBlock('>> q'), { kind: 'quote', level: 2, rest: 'q' });
  assert.deepEqual(mdBlock(' --- '), { kind: 'hr' });
  assert.deepEqual(mdBlock('#sin espacio'), { kind: 'p', rest: '#sin espacio' });
  assert.deepEqual(mdBlock('-5 grados'), { kind: 'p', rest: '-5 grados' });
});

t('un texto sin marcas se dibuja como siempre', () => {
  assert.equal(hasMd('Hola mundo, F = 3 N'), false);
  const fr = textFrame({ text: 'Hola\nmundo', h: 2, anchor: 'bl' }, (s) => s.length * 0.5);
  assert.equal(fr.math, undefined);
  assert.equal(fr.hh, 2 * 2 * 1.2);
});

t('la caja con Markdown', () => {
  const m = (s) => s.length * 0.5;
  const L = layoutText('# Titulo\n- **a** $x$\n---\n> cita ~~no~~', m, '');
  const tx = L.prims.filter((p) => p.k === 't');
  const ti = tx.find((p) => p.s === 'Titulo');
  assert.equal(ti.sz, 1.6); assert.equal(ti.bold, true);
  assert.ok(tx.find((p) => p.s === '•').x < tx.find((p) => p.s === 'a').x); // viñeta antes del contenido sangrado
  assert.equal(tx.find((p) => p.s === 'a').bold, true);
  assert.equal(L.prims.filter((p) => p.k === 'p').length, 3); // raya, barra de la cita y tachado
  assert.ok(!tx.some((p) => /[#*~>]/.test(p.s))); // las marcas no se dibujan
  const fr = textFrame({ text: '**a**', h: 2, anchor: 'bl' }, m);
  assert.ok(fr.math); // con Markdown, la caja la arma el mismo trazado que las formulas
});

const m = (s) => s.length * 0.5;
const texts = (L) => L.prims.filter((p) => p.k === 't');

t('enlaces, imagenes, autoenlaces y escapes', () => {
  const g = (s, ctx) => mdInline(s, ctx).map((r) => (r.link ? 'L' : '') + (r.img ? 'G' : '') + (r.sup ? 'S' : '') + (r.b ? 'B' : '') + '[' + r.s + ']').join(' ');
  assert.equal(g('ver [la **guia**](https://x.org "t") ya'), '[ver ] L[la ] LB[guia] [ ya]');
  assert.equal(g('![un dibujo](a.png)'), 'G[▣ un dibujo]');
  assert.equal(g('<https://a.b/c> y <yo@uao.co>'), 'L[https://a.b/c] [ y ] L[yo@uao.co]');
  assert.equal(g('[uno][r] [dos] [tres]', { refs: new Map([['r', 'u'], ['dos', 'v']]) }), 'L[uno] [ ] L[dos] [ [tres]]');
  assert.equal(g('[m] sin enlace'), '[[m] sin enlace]');
  assert.equal(g('\\# \\[a\\] \\! \\{'), '[# [a] ! {]');
  assert.equal(g('dato[^n]', { fn: () => 3 }), '[dato] S[3]');
});

t('titulos 1 a 6, tareas y avisos', () => {
  assert.deepEqual(mdBlock('###### seis'), { kind: 'h', level: 6, rest: 'seis' });
  assert.deepEqual(mdBlock('## Cierre ##'), { kind: 'h', level: 2, rest: 'Cierre' });
  assert.equal(mdBlock('####### siete').kind, 'p');
  assert.deepEqual(mdBlock('- [x] hecho'), { kind: 'ul', level: 1, mark: '☑', rest: 'hecho', task: true });
  assert.equal(mdBlock('- [ ] falta').mark, '☐');
  assert.deepEqual(mdBlock('> [!warning] Ojo'), { kind: 'quote', level: 1, rest: 'Ojo', callout: 'warning' });
  const L = layoutText('> [!note]\n> cuerpo', m, '');
  const lab = texts(L).find((p) => p.s === 'Nota');
  assert.equal(lab.bold, true); assert.equal(lab.col, '#2563eb');
  assert.ok(L.prims.filter((p) => p.k === 'p').every((p) => p.col === '#2563eb')); // las barras del aviso van en su color
});

t('codigo cercado y sangrado: sin Markdown ni formulas dentro', () => {
  const L = layoutText('antes\n```js\n**no** $x$ # no\n```\ndespues', m, '');
  const c = texts(L).find((p) => p.font === 'mono');
  assert.equal(c.s, '**no** $x$ # no');
  assert.ok(L.prims.some((p) => p.k === 'p' && p.pts.length === 5)); // el recuadro del bloque
  const I = layoutText('texto\n\n    sangrado *x*\n\n- lista\n\n    sigue en la lista', m, '');
  assert.equal(texts(I).find((p) => p.s.startsWith('sangrado')).font, 'mono');
  assert.notEqual(texts(I).find((p) => p.s.trim().startsWith('sigue')).font, 'mono');
});

t('tablas: encabezado en negrita, alineacion y formulas en las celdas', () => {
  const L = layoutText('| a | b |\n|:-|--:|\n| uno | $x^2$ |\n| \\| | `c|d` |', m, '');
  const tx = texts(L);
  assert.equal(tx.find((p) => p.s === 'a').bold, true);
  assert.ok(tx.find((p) => p.s === 'x')); // la formula de la celda
  assert.ok(tx.find((p) => p.s === '|')); // «\|» es una barra dentro de la celda
  assert.ok(tx.find((p) => p.s === 'c|d')); // la barra dentro de `codigo` no separa celdas
  assert.ok(!tx.some((p) => /^:?-+:?$/.test(p.s))); // la fila de alineacion no se dibuja
  const b = tx.find((p) => p.s === 'b'), uno = tx.find((p) => p.s === 'uno');
  assert.ok(b.x > uno.x); // la segunda columna, alineada a la derecha
});

t('notas al pie, referencias y comentarios', () => {
  const L = layoutText('Dato[^a] y otro[^b].\n\n[^b]: La segunda.\n[^a]: La primera.\n[r]: https://x.org\n<!-- oculto\nen dos lineas -->\nVer [esto][r].', m, '');
  const tx = texts(L);
  assert.equal(tx.find((p) => p.s === '1').sz < 1, true); // la llamada va en superindice
  const n1 = tx.find((p) => p.s.includes('La primera')), n2 = tx.find((p) => p.s.includes('La segunda'));
  assert.ok(n1.y < n2.y); // ordenadas por su llamada, al final
  assert.equal(n1.sz, 0.8);
  assert.ok(!tx.some((p) => /oculto|https/.test(p.s)));
  assert.equal(tx.find((p) => p.s === 'esto').col, '#2563eb');
});

t('titulo subrayado con === y raya con ---', () => {
  const L = layoutText('Titulo\n===\nTexto\n---', m, '');
  assert.equal(texts(L).find((p) => p.s === 'Titulo').sz, 1.6);
  assert.equal(texts(L).find((p) => p.s === 'Texto').sz, 1);
  assert.equal(L.prims.filter((p) => p.k === 'p').length, 1);
});

t('saltos de linea: cada salto de linea es un salto de linea, con pagina o sin ella', () => {
  const src = 'uno\ndos  \ntres\\\ncuatro\n\ncinco\n- a\n  b\n> c\n> d';
  for (const opt of [{}, { reflow: true }, { reflow: true, maxW: 40 }]) {
    const L = layoutText(src, m, '', opt), tx = texts(L), s = tx.map((p) => p.s.trim()).filter(Boolean);
    for (const w of ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'a', 'b', 'c', 'd']) assert.ok(s.includes(w), JSON.stringify(opt) + ': ' + s.join('|'));
    assert.ok(!s.some((x) => x.endsWith('\\')), 'la «\\» final no se dibuja');
    const y = (w) => tx.find((p) => p.s.trim() === w).y;
    assert.ok(y('uno') < y('dos') && y('dos') < y('tres') && y('tres') < y('cuatro') && y('a') < y('b') && y('c') < y('d'), 'una linea debajo de otra');
  }
  // el Texto del ejemplo de Oscar: tres lineas, no «Texto Texto Texto»
  const T = texts(layoutText('Texto\nTexto\nTexto', m, '', { reflow: true, maxW: 40 }));
  assert.equal(T.length, 3);
  assert.equal(new Set(T.map((p) => p.y)).size, 3);
  assert.equal(hasMd('a\\\nb'), true);
});

t('hasMd reconoce lo nuevo y no el texto comun', () => {
  for (const s of ['[a](b)', '<https://x.y>', 'x[^1]', '#### t', '| a | b |\n|---|---|', 'T\n===', '    codigo', '<!-- c -->']) assert.equal(hasMd(s), true, s);
  for (const s of ['Hola mundo, F = 3 N', 'cota [mm] 25', 'a < b > c', 'x = 3']) assert.equal(hasMd(s), false, s);
});

t('la fuente del texto: un bloque de codigo la sigue si se eligio una; el codigo en linea y el bloque sin fuente elegida, monoespaciada', () => {
  const m = (s, font) => s.length * (font === 'mono' ? 0.6 : 0.5);
  const fonts = (src, font) => layoutText(src, (s, f) => m(s, f), font).prims.filter((p) => p.k === 't' && p.s.trim()).map((p) => p.s + ':' + (p.font || ''));
  assert.deepEqual(fonts('```\nab\n```', ''), ['ab:mono']); // sin fuente elegida: como siempre
  assert.deepEqual(fonts('```\nab\n```', 'serif'), ['ab:serif']); // elegida: el bloque la sigue (la consola de un juego)
  assert.deepEqual(fonts('```\nab\n```', 'mono'), ['ab:mono']);
  assert.ok(fonts('uso `x` y', 'serif').includes('x:mono')); // el codigo en linea sigue siendo monoespaciado
  const w = (font) => layoutText('```\nabcd\n```', (s, f) => m(s, f), font).w; // el ancho del bloque se mide con la fuente que se dibuja
  assert.ok(w('serif') < w('mono'));
});

console.log(`\n${passed} pruebas de Markdown pasaron`);
