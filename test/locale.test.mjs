// Indicador decimal del dibujo (doc.decimal): «.» (argumentos con «,») o «,» (argumentos con «;»).
import assert from 'node:assert/strict';
import { evalExpr, convertExpr, setAngleMode } from '../src/expr.js';
import { setDecimal, decimalMode, localNum, elemChar, rowChar, argChar } from '../src/locale.js';
import { fmtNum } from '../src/dims.js';
import { parse } from '../src/asciimath.js';
import { layoutMath } from '../src/mathlayout.js';
import { textValue, plainText } from '../src/text.js';
import { newDoc, addPoint, addText } from '../src/model.js';
import { setDocDecimal, convertSeries } from '../src/params.js';
import { convertCalcText } from '../src/tvars.js';

let passed = 0;
const t = (name, fn) => { try { fn(); } finally { setDecimal(null); } passed++; console.log('ok  ' + name); };
const num = (src, vars) => evalExpr(src, { vars, allowMat: true }).value;
const mat = (src, vars) => evalExpr(src, { vars, allowMat: true }).mat;
const fails = (src, re) => assert.throws(() => evalExpr(src, { allowMat: true }), re, src);

t('locale: separadores de cada modo', () => {
  assert.deepEqual([elemChar('.'), rowChar('.'), argChar('.')], [',', ';', ',']);
  assert.deepEqual([elemChar(','), rowChar(','), argChar(',')], [';', '|', ';']);
  setDecimal(','); assert.equal(decimalMode(), ','); assert.equal(localNum('0.5'), '0,5');
  setDecimal('.'); assert.equal(localNum('0.5'), '0.5');
  setDecimal('x'); assert.equal(decimalMode(), null); // un valor raro es «sin indicador»
  setAngleMode({ decimal: ',' }); assert.equal(decimalMode(), ','); // el indicador viaja con el dibujo
  setAngleMode({}); assert.equal(decimalMode(), null);
});

t('punto decimal: argumentos con coma (o punto y coma), la coma ya no es un decimal', () => {
  setDecimal('.');
  assert.equal(num('2.5*2'), 5);
  assert.equal(num('.5+1'), 1.5);
  assert.equal(num('max(2,3)'), 3);
  assert.equal(num('max(2; 3)'), 3); // «;» tambien vale (dibujos anteriores)
  assert.equal(num('round(2.567, 1)'), 2.6);
  assert.deepEqual(mat('[1.5, 2; 3, 4]'), [[1.5, 2], [3, 4]]);
  fails('2,5*2', /Sobra algo|no válid|Expresión/); // 2 y luego 5: no es un numero
  assert.equal(num('3e-1'), 0.3);
});

t('coma decimal: la coma es decimal, los argumentos van con «;» y las matrices con «;» y «|»', () => {
  setDecimal(',');
  assert.equal(num('2,5*2'), 5);
  assert.equal(num('2.5*2'), 5); // el punto tambien se entiende
  assert.equal(num(',5+1'), 1.5);
  assert.equal(num('max(2,5; 3)'), 3);
  assert.equal(num('round(2,567; 1)'), 2.6);
  fails('max(2, 7)', /./); // con coma decimal la coma ya no separa argumentos
  assert.deepEqual(mat('[1; 2; 3]'), [[1, 2, 3]]); // fila
  assert.deepEqual(mat('[1; 2 | 3; 4]'), [[1, 2], [3, 4]]);
  assert.deepEqual(mat('[1,5 | 2,5]'), [[1.5], [2.5]]); // columna con decimales
  assert.deepEqual(mat('[1,5; 2,5]'), [[1.5, 2.5]]);
  assert.equal(num('A_(2;1)', { A: { mat: [[1, 2], [3, 4]] } }), 3); // indices con «;»
  assert.equal(num('2,5e1'), 25);
  fails('[1; 2 | 3]', /mismo número de elementos/);
});

t('sin indicador (dibujos anteriores): se leen las dos formas como siempre', () => {
  assert.equal(num('2,5*2'), 5);
  assert.equal(num('2.5*2'), 5);
  assert.equal(num('max(2; 3)'), 3);
  assert.equal(num('max(a, 7)', { a: { v: 2, r: false } }), 7);
  assert.deepEqual(mat('[1,2; 3,4]'), [[1, 2], [3, 4]]); // dentro de corchetes la coma separa
});

t('se muestra con el indicador del dibujo', () => {
  assert.equal(fmtNum(0.3333), '0.333');
  setDecimal(','); assert.equal(fmtNum(0.3333), '0,333'); assert.equal(fmtNum(2000), '2000,0'); assert.equal(fmtNum(-1.5), '-1,5');
  const d = newDoc(); d.decimal = ',';
  const tx = addText(d, addPoint(d, 0, 0), '$$v:[1/3; 1/2 | 3; 4]=\nx:2/3=\nM:1.5*2=$$', {});
  const s = plainText(textValue(d, d.texts[tx]));
  assert.match(s, /\[0,333; 0,5 \| 3; 4\]/); // matriz: elementos con «;» y filas con «|»
  assert.match(s, /x:=2\/3=0,667/);
  assert.match(s, /M:=1\.5\*2=3/);
  d.decimal = '.';
  assert.match(plainText(textValue(d, d.texts[tx])), /\[0\.333, 0\.5; 3, 4\]/);
  assert.match(plainText(textValue(d, d.texts[tx])), /x:=2\/3=0\.667/);
});

t('se dibuja con el indicador del dibujo: «1,5» es un numero y «[a; b | c; d]» una matriz', () => {
  const measure = (s) => s.length * 0.5, syms = (src) => layoutMath(src, true, measure).ops.filter((o) => o.k === 't').map((o) => o.s);
  setDecimal(',');
  assert.deepEqual(syms('x = 1,5'), ['x', '=', '1,5']);
  const m = parse('[1; 2 | 3; 4]').c[0];
  assert.equal(m.t, 'mat'); assert.equal(m.rows.length, 2); assert.equal(m.rows[0].length, 2);
  assert.equal(parse('[1,5; 2,5]').c[0].rows[0].length, 2); // «;» separa los elementos de una fila, con decimales
  setDecimal(null);
  assert.deepEqual(syms('x = 1,5'), ['x', '=', '1', ',', '5']); // como siempre
  assert.equal(parse('[1; 2]').c[0].rows.length, 2); // columna (modo anterior)
  assert.equal(parse('[1, 2; 3, 4]').c[0].rows[1].length, 2);
});

t('convertExpr: de un indicador a otro', () => {
  const c = (s, a, b) => convertExpr(s, a, b);
  assert.equal(c('max(2.5, 3)', '.', ','), 'max(2,5; 3)');
  assert.equal(c('0.5*x+0.25', '.', ','), '0,5*x+0,25');
  assert.equal(c('[1.5, 2; 3, 4]', '.', ','), '[1,5; 2 | 3; 4]');
  assert.equal(c('A_(1,2)', '.', ','), 'A_(1;2)');
  assert.equal(c('f(x, y)+3e-1', '.', ','), 'f(x; y)+3e-1');
  assert.equal(c('max(2,5; 3)', ',', '.'), 'max(2.5, 3)');
  assert.equal(c('[1,5; 2 | 3; 4]', ',', '.'), '[1.5, 2; 3, 4]');
  assert.equal(c('A_(1;2)', ',', '.'), 'A_(1,2)');
  assert.equal(c('max(a; b)', null, ','), 'max(a; b)'); // de un dibujo anterior: «;» ya servia
  assert.equal(c('max(a, b)', null, ','), 'max(a; b)');
  assert.equal(c('2,5*3', null, '.'), '2.5*3'); // la coma decimal de siempre pasa a punto
  assert.equal(c('2,5*3', null, ','), '2,5*3');
  assert.equal(c('x+y', '.', ','), 'x+y');
  for (const e of ['max(2.5, 3)', '[1.5, 2; 3, 4]', 'A_(1,2)*0.5']) assert.equal(c(c(e, '.', ','), ',', '.'), e); // ida y vuelta
  assert.equal(c('5 +', '.', ','), '5 +'); // lo que no se lee queda igual
  assert.equal(decimalMode(), null); // y no cambia el modo activo
});

t('convertir el dibujo al cambiar el indicador', () => {
  assert.equal(convertSeries('max(0.5, 1) vs t @y2', '.', ','), 'max(0,5; 1) vs t @y2');
  assert.equal(convertCalcText('Hola $$f(x, y):=x*0.5$$ y $a:2.5*3=$', '.', ','), 'Hola $$f(x; y):=x*0,5$$ y $a:2,5*3=$');
  assert.equal(convertCalcText('$$x:0.5..2;10=$$', '.', ','), '$$x:0,5..2;10=$$');
  const d = newDoc(); d.cons = { c1: { t: 'DIST', expr: 'max(1.5, 2)', scaleExpr: '0.5*2' }, c2: { t: 'DIST', v: 3 } };
  d.acts = { a1: { expr: '2.5*t' } }; d.graphs = { g1: { series: ['0.5*t vs t'] } };
  assert.equal(setDocDecimal(d, ','), 4);
  assert.equal(d.decimal, ','); assert.equal(d.cons.c1.expr, 'max(1,5; 2)'); assert.equal(d.cons.c1.scaleExpr, '0,5*2'); assert.equal(d.acts.a1.expr, '2,5*t'); assert.equal(d.graphs.g1.series[0], '0,5*t vs t');
  setDocDecimal(d, '.'); assert.equal(d.cons.c1.expr, 'max(1.5, 2)'); assert.equal(d.decimal, '.');
  setDocDecimal(d, ',', false); assert.equal(d.cons.c1.expr, 'max(1.5, 2)'); // sin convertir: solo la opcion
});

t('definicion y llamada de funciones: los argumentos siguen el indicador', () => {
  const val = (dec, src) => { const d = newDoc(); if (dec) d.decimal = dec; const id = addText(d, addPoint(d, 0, 0), src, {}); return plainText(textValue(d, d.texts[id])); };
  assert.match(val('.', '$$f(x, y):=x+y\nf(1.5, 2)=$$'), /f\(1\.5, 2\)=3\.5/);
  assert.match(val(',', '$$f(x; y):=x+y\nf(1,5; 2)=$$'), /f\(1,5; 2\)=3,5/);
  assert.doesNotMatch(val(',', '$$f(x, y):=x+y\nf(1; 2)=$$'), /=3\b/); // con coma decimal los parametros van con «;»
  assert.doesNotMatch(val(',', '$$f(x; y):=x+y\nf(1, 2)=$$'), /=3\b/); // y la llamada tambien
  assert.match(val(null, '$$f(x, y):=x+y\nf(1, 2)=$$'), /f\(1, 2\)=3/); // dibujos anteriores: las dos formas
  const d = newDoc(); d.decimal = '.'; const id = addText(d, addPoint(d, 0, 0), '$$f(x, y):=x*0.5\nf(1, 2)=$$', {});
  setDocDecimal(d, ','); assert.equal(d.texts[id].text, '$$f(x; y):=x*0,5\nf(1; 2)=$$');
  setDocDecimal(d, '.'); assert.equal(d.texts[id].text, '$$f(x, y):=x*0.5\nf(1, 2)=$$');
});

t('rangos: «n» se separa segun el indicador', () => {
  const val = (dec, src) => { const d = newDoc(); if (dec) d.decimal = dec; const id = addText(d, addPoint(d, 0, 0), src, {}); return plainText(textValue(d, d.texts[id])); };
  assert.match(val('.', '$$x:0..2,3=$$'), /\[0, 1, 2\]/);
  assert.match(val('.', '$$x:0..2;3=$$'), /\[0, 1, 2\]/); // «;» tambien vale
  assert.match(val('.', '$$x:0..max(1,2),3=$$'), /\[0, 1, 2\]/); // la coma de un parentesis no separa
  assert.match(val(',', '$$x:0..2;3=$$'), /\[0; 1; 2\]/);
  assert.doesNotMatch(val(',', '$$x:0..2,3=$$'), /\[0/); // con coma decimal, «2,3» es un decimal: no hay «n»
  assert.match(val(null, '$$x:0..2;3=$$'), /\[0[,;] 1[,;] 2\]/);
  const d = newDoc(); d.decimal = '.'; const id = addText(d, addPoint(d, 0, 0), '$$x:0.5..2,4=\ny:0..0.5..2=$$', {});
  setDocDecimal(d, ','); assert.equal(d.texts[id].text, '$$x:0,5..2;4=\ny:0..0,5..2=$$');
  setDocDecimal(d, '.'); assert.equal(d.texts[id].text, '$$x:0.5..2,4=\ny:0..0.5..2=$$');
});

console.log(`\n${passed} pruebas de indicador decimal pasaron`);
