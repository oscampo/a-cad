// Sintaxis de calculo de los textos (v2): «x:valor» asigna, «expr=» muestra el valor, `...` es literal, y la migracion de los dibujos
// anteriores («x{=v}» -> «$x:v$», «[=e]» -> «$e=$»).
import assert from 'node:assert/strict';
import { migrateCalc, migrateCalcDoc, calcStmts, calcParse, calcSrc, CALC_VERSION } from '../src/tvars.js';
import { textValue, plainText } from '../src/text.js';
import { newDoc } from '../src/model.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };

const stmts = (s) => calcStmts(s).map((p) => (p.k === 'def' ? p.name + (p.params !== undefined ? '(' + p.params + ')' : '') + ':' + p.expr : p.expr + '='));
const page = (text) => {
  const d = { pts: { p: { x: 0, y: 0 } }, lines: {}, circles: {}, arcs: {}, cons: {}, ellipses: {}, splines: {}, hatches: {}, traces: {}, texts: {} };
  d.texts.t1 = { pt: 'p', h: 1, font: '', text };
  return plainText(textValue(d, d.texts.t1));
};

t('enunciados: «x:v» y «x:=v» asignan, «f(x;y):e» define una funcion, «expr=» es una salida', () => {
  assert.deepEqual(stmts('$$x:2$$'), ['x:2']);
  assert.deepEqual(stmts('$$k:=4$$'), ['k:4']);
  assert.deepEqual(stmts('$$f(x;y):x+y$$'), ['f(x;y):x+y']);
  assert.deepEqual(stmts('$$x*3=$$'), ['x*3=']);
  assert.deepEqual(stmts('texto $a:1$ y $a=$'), ['a:1', 'a=']);
});

t('«==», «<=», «>=», «!=» y «:=» al final no son salidas', () => {
  for (const s of ['$$x==3$$', '$$a<=$$', '$$b>=$$', '$$c!=$$', '$$k:=$$']) assert.deepEqual(stmts(s), [], s);
  assert.equal(page('$$x:2\nx==2=$$'), '$$x:=2\nx==2=1$$'); // una comparacion si se puede mostrar con «=» al final
});

t('el literal `...` no se evalua; sin cerrar se marca con ⚠', () => {
  assert.deepEqual(stmts('$$`a:1` b:2$$'), ['b:2']);
  assert.equal(page('$$`x:2` y:3\ny=$$'), '$$x:2 y:=3\ny=3$$');
  assert.equal(page('$$`abierto$$'), '$$`abierto ⚠$$');
});

t('«x:expr=» asigna y muestra el valor en la misma linea', () => {
  assert.deepEqual(stmts('$$x:2*3=$$'), ['x:2*3']);
  assert.equal(page('$$x:2*3=\ny:x+1 =\ny*2=$$'), '$$x:=2*3=6\ny:=x+1=7\ny*2=14$$');
  assert.equal(page('$$k:=4=$$'), '$$k:=4=4$$');
  assert.equal(page('$$v:1..3;3=$$'), '$$v:=[1, 2, 3]$$'); // un vector ya muestra su valor
  assert.equal(page('$$b:3==3$$'), '$$b:=3==3$$'); // «==» al final es una comparacion, no «=»
  assert.equal(page('$$q:sqrt(-1)=$$').includes('⚠'), true);
  assert.deepEqual(stmts('$$f(x):x^2=$$'), ['f(x):x^2=']); // en una funcion el «=» queda en el cuerpo
  for (const s of ['$$x:2*3=$$', '$$y:x+1 = $$']) assert.equal(calcSrc(calcParse(s)), s);
});

t('un enunciado por linea: lo que sobra en la linea da ⚠', () => {
  assert.equal(page('$$x:2  y:3$$'), '$$x:=2  y:3 ⚠$$');
});

t('calcSrc vuelve a escribir el texto tal cual', () => {
  for (const s of ['a $x:1$ b', '$$f(x):x^2\nf(2)=\n`nota` x:3$$', '$$`sin cerrar$$', 'nada']) assert.equal(calcSrc(calcParse(s)), s);
});

t('migracion: en el texto plano cada definicion o salida pasa a formula', () => {
  assert.equal(migrateCalc('El área vale A{=b*h} y da [=A] mm'), 'El área vale $A:b*h$ y da $A=$ mm');
  assert.equal(migrateCalc('f(x){=x^2}'), '$f(x):x^2$');
  assert.equal(migrateCalc('v{=0..1;3}'), '$v:0..1;3$');
  assert.equal(migrateCalc('r{=3}[=r]2'), '$r:3$$r=$ 2'); // un digito pegado detras se separa
  assert.equal(migrateCalc('sin nada'), 'sin nada');
  assert.equal(migrateCalc('z=[=z]'), '$z=$'); // «e = [=e]» tambien en el texto plano: no se repite la expresion
  assert.equal(migrateCalc('m = [=m] mm'), '$m=$ mm');
  assert.equal(migrateCalc('tz=[=z]'), 'tz=$z=$'); // «tz» no es «z»
});

t('migracion: dentro de una formula lo demas pasa a literal y «e = [=e]» queda «e=»', () => {
  assert.equal(migrateCalc('$$b = [=b]$$'), '$$b=$$');
  assert.equal(migrateCalc('$$A*x^T = [=A*x^T]$$'), '$$A*x^T=$$');
  assert.equal(migrateCalc('$$ab = [=b]$$'), '$$`ab =` b=$$'); // «ab» no es «b»: no se colapsa
  assert.equal(migrateCalc('$$x = [=D1]/[=D2]$$'), '$$`x =` D1=`/`D2=$$');
  assert.equal(migrateCalc('$$a:b$$'), '$$`a:b`$$'); // formula vieja que ahora seria una asignacion: queda como estaba
  assert.equal(migrateCalc('$x+1=$'), '$`x+1=`$');
});

t('migracion del dibujo: una sola vez, y los dibujos nuevos ya nacen en la v2', () => {
  const old = { texts: { a: { text: 'k{=2}' }, b: { text: '[=k]' }, c: { text: 'hola' } } };
  assert.equal(migrateCalcDoc(old), 2);
  assert.deepEqual(Object.values(old.texts).map((x) => x.text), ['$k:2$', '$k=$', 'hola']);
  assert.equal(old.calc, CALC_VERSION);
  assert.equal(migrateCalcDoc(old), 0);
  assert.equal(old.texts.a.text, '$k:2$'); // no se vuelve a migrar (si no, «$k:2$» pasaria a literal)
  const fresh = newDoc();
  fresh.texts.t = { text: '$$x:1$$' };
  assert.equal(migrateCalcDoc(fresh), 0);
});

console.log(`\n${passed} pruebas de la sintaxis de calculo`);
