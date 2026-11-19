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

console.log(`\n${passed} pruebas de Markdown pasaron`);
