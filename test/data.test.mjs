// wfile(valor, Nombre) y rfile(Nombre), como en SMath: el texto que se guarda, la ida y vuelta (tambien con coma decimal), los nombres y los errores.
import assert from 'node:assert/strict';
import { evalExpr } from '../src/expr.js';
import { newDoc, addPoint, addText } from '../src/model.js';
import { shownText } from '../src/text.js';
import { textVarErrors } from '../src/params.js';
import { setDecimal } from '../src/locale.js';
import { setDataBackend, takeDataWrites, clearDataWrites, dataName, numText, dataChanged } from '../src/datastore.js';
import { textVars } from '../src/params.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const clean = (s) => s.replace(/[\u0000-\u001f]/g, '');
let store = new Map();
const fresh = () => { store = new Map(); setDataBackend(store); clearDataWrites(); };
// Un dibujo con esas lineas (cada una un texto, de arriba abajo): lo que se ve, los errores y lo que quedo por escribir (se graba en el almacen).
function page(dec, lines) {
  setDecimal(dec);
  const d = newDoc(); d.decimal = dec;
  const ids = lines.map((q, i) => addText(d, addPoint(d, 0, 100 - i * 10), q, {}));
  clearDataWrites();
  const shown = ids.map((id) => clean(shownText(d, d.texts[id]).text));
  const errs = textVarErrors(d).map((e) => e.msg);
  const w = Object.fromEntries(takeDataWrites());
  for (const [n, x] of Object.entries(w)) store.set(n, x);
  return { shown, errs, w };
}

t('wfile guarda el valor como texto de A-CAD, en la unidad de la variable y con punto decimal; vale 1', () => {
  fresh();
  const r = page('.', ["$$a:12'kN$$", '$$wfile(a, MiVariable)=$$', "$$M:[1, 2; 3, 4]'mm$$", '$$wfile(M, "m.txt")=$$', '$$s:"di ""hola"""$$', '$$wfile(s, S)=$$', "$$z:(3+4j)'kΩ$$", '$$wfile(z, Z)=$$', "$$P:3'N*2'm$$", '$$wfile(P, P1)=$$', "$$T:20'°C$$", '$$wfile(T, T1)=$$']);
  assert.deepEqual(r.errs, []);
  assert.equal(r.shown[1], '$$wfile(a, MiVariable)=1$$');
  assert.deepEqual(r.w, { MiVariable: "12'kN", 'm.txt': "[1, 2; 3, 4]'mm", S: '"di ""hola"""', Z: "(3+4j)'kΩ", P1: "6'(N·m)", T1: "20'°C" });
});

t('rfile devuelve el mismo valor con sus unidades, también en un dibujo con coma decimal', () => {
  const r = page(',', ['$$q:rfile(MiVariable)$$', '$$q=$$', '$$N:rfile("m.txt")$$', '$$N_(2;1)=$$', '$$rfile(S)=$$', '$$rfile(Z)=$$', '$$rfile(P1)=$$', '$$rfile(T1)=$$']);
  assert.deepEqual(r.errs, []);
  assert.equal(r.shown[1], '$$q=12 " kN"$$');
  assert.equal(r.shown[3], '$$N_(2;1)=3 " mm"$$');
  assert.equal(r.shown[4], '$$rfile(S)="“di ″hola″”"$$');
  assert.equal(r.shown[5], '$$rfile(Z)=(3+4j) " kΩ"$$');
  assert.equal(r.shown[6], '$$rfile(P1)=6 " N·m"$$');
  assert.equal(r.shown[7], '$$rfile(T1)=20 " °C"$$');
});

t('con coma decimal: el separador es «;» y el archivo igual lleva punto', () => {
  fresh();
  const r = page(',', ["$$b:2,5'MPa$$", '$$wfile(b*2; B)=$$', '$$wfile(1/3; tercio.dat)=$$']);
  assert.deepEqual(r.errs, []);
  assert.deepEqual(r.w, { B: "5'MPa", 'tercio.dat': '0.333333333333333' });
  setDecimal('.');
  assert.equal(evalExpr('rfile(B)', {}).value, 5e6);
});

t('el nombre no se evalúa: una variable definida, una sin definir o una cadena; cada ejecución lee lo guardado antes', () => {
  fresh();
  store.set('n', '0');
  const r = page('.', ['$$n:5$$', '$$c:rfile(n)$$', '$$wfile(c+1, n)=$$', '$$c=$$']);
  assert.deepEqual(r.errs, []);
  assert.equal(r.shown[3], '$$c=0$$'); // lee lo guardado antes (no el 5 de la variable n)
  assert.deepEqual(r.w, { n: '1' });
  assert.equal(page('.', ['$$c:rfile(n)$$', '$$wfile(c+1, n)=$$']).w.n, '2'); // otro paso: suma 1
});

t('errores: sin datos, una función, un nombre no válido, argumentos de más o de menos', () => {
  fresh();
  setDecimal('.');
  assert.throws(() => evalExpr('rfile(nada)', {}), /no hay datos «nada»/);
  assert.throws(() => evalExpr('wfile(sin, X)', {})); // una función no se guarda
  assert.throws(() => evalExpr('wfile(2, "a/b")', {}), /no sirve como nombre/);
  assert.throws(() => evalExpr('wfile(2)', {}), /falta el nombre/);
  assert.throws(() => evalExpr('wfile(2, X, Y)', {}), /sobra un argumento/);
  assert.throws(() => evalExpr('rfile(3)', {}), /es un nombre .* o una cadena/);
  assert.throws(() => dataName('..'), /no sirve/);
  store.set('roto', '[1, 2');
  assert.throws(() => evalExpr('rfile(roto)', {}), /«roto» no se puede leer/);
});

t('un paso con el mismo dibujo vuelve a calcular (la memoria del cálculo sabe que cambió lo guardado) y rfile lee lo guardado', () => {
  fresh();
  setDecimal('.');
  store.set('n', '0');
  const d = newDoc(); d.decimal = '.';
  addText(d, addPoint(d, 0, 100), '$$c:rfile(n)$$', {}); addText(d, addPoint(d, 0, 90), '$$ok:wfile(c+1, n)$$', {});
  const step = () => { clearDataWrites(); textVars(d); for (const [k, x] of takeDataWrites()) store.set(k, x); dataChanged(); };
  step(); step(); step(); // el mismo dibujo tres veces: tres pasos
  assert.equal(store.get('n'), '3');
  assert.equal(textVars(d).vals.c.v, 3); // se ve lo guardado
});

t('rfile(nombre, inicial): el valor inicial si no hay datos (y solo entonces se calcula)', () => {
  fresh();
  setDecimal('.');
  assert.equal(evalExpr('rfile(nada, 7)', {}).value, 7);
  assert.deepEqual(evalExpr('rfile(nada, [1, 2])', { allowMat: true }).mat, [[1, 2]]);
  store.set('hay', "3'kN");
  assert.equal(evalExpr('rfile(hay, 1/0)', {}).value, 3000); // con datos, el inicial no se calcula (1/0 no da error)
  assert.equal(evalExpr('rfile(nada, x0)', { vars: { x0: { v: 5 } } }).value, 5); // un nombre en el segundo lugar es una variable, no un archivo
  assert.throws(() => evalExpr('rfile(nada, 1, 2)', {}), /sobra un argumento/);
});

t('numText: todas las cifras útiles, en una forma que se vuelve a leer', () => {
  assert.equal(numText(0.1 + 0.2), '0.3');
  assert.equal(numText(1.2e-7), '1.2e-7');
  assert.equal(numText(-1.5e20), '-150000000000000000000');
  assert.equal(numText(1e21), '1e21');
  setDecimal('.');
  for (const x of ['1e21', '1.2e-7']) assert.equal(evalExpr(x, {}).value, Number(x));
});

console.log(`\n${passed} pruebas de datos pasaron`);
