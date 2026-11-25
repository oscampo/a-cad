// Cadenas: literal "…", + y ==, vectores de cadenas, funciones de MATLAB, y como se muestran en los textos («msg = “Cumple”»).
import assert from 'node:assert/strict';
import { evalExpr } from '../src/expr.js';
import { newDoc, addPoint, addText } from '../src/model.js';
import { shownText } from '../src/text.js';
import { textVarErrors } from '../src/params.js';
import { setDecimal } from '../src/locale.js';

setDecimal('.');
let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const PA = [-1, 1, -2, 0, 0, 0, 0];
const V = { σ: { v: 210.254e6, r: false, d: PA }, Sy: { v: 250e6, r: false, d: PA }, Z: { v: 3, im: 4, r: false } };
const E = (src) => evalExpr(src, { vars: V, allowMat: true, allowCplx: true });
const S = (src) => E(src).str;

t('literal, + y ==; las comillas del iPad; "" dentro', () => {
  assert.equal(S('"a" + "b"'), 'ab'); assert.equal(S('“iPad”'), 'iPad'); assert.equal(S('"di ""hola"""'), 'di "hola"');
  assert.equal(E('"x" == "x"').value, 1); assert.equal(E('"x" != "x"').value, 0);
  assert.equal(S('if(σ<Sy, "Cumple", "No cumple")'), 'Cumple');
  assert.deepEqual(E('["a", "b"]').strs, ['a', 'b']);
  assert.equal(S('seq(s:"", for(e, ["x","y","z"], s:s+e), s)'), 'xyz');
});

t('num2str con la unidad (como la muestra la app), decimales y complejos; sprintf', () => {
  assert.equal(S('"σ = " + num2str(σ)'), 'σ = 210.254 MPa');
  assert.equal(S('num2str(2/3)'), '0.667'); assert.equal(S('num2str(2/3, 2)'), '0.67'); assert.equal(S('num2str(Z)'), '3+4j');
  assert.equal(S('sprintf("%.2f kN y %d piezas", 12.3456, 4)'), '12.35 kN y 4 piezas');
  assert.equal(S('sprintf("%5.1f|", [1,2,3])'), '  1.0|  2.0|  3.0|');
  assert.throws(() => E('sprintf("%f", σ)'), /tiene unidades/);
});

t('funciones de cadenas', () => {
  assert.equal(S('upper("abc")'), 'ABC'); assert.equal(S('strtrim("  x ")'), 'x'); assert.equal(S('reverse("abc")'), 'cba');
  assert.equal(S('strrep("a-b-c", "-", "+")'), 'a+b+c');
  assert.deepEqual(E('strsplit("a,b,c", ",")').strs, ['a', 'b', 'c']); assert.equal(S('strjoin(["a","b"], "-")'), 'a-b');
  assert.equal(E('strlength("hola")').value, 4); assert.equal(E('contains("hola mundo", "mun")').value, 1);
  assert.equal(E('StartsWith("hola", "ho")').value, 1); // sin importar mayusculas
  assert.deepEqual(E('strfind("abcabc", "bc")').mat, [[2, 5]]); assert.equal(E('strfind("abc", "z")').value, 0);
  assert.equal(E('strcmpi("Abc", "aBC")').value, 1);
  assert.equal(S('extractBefore("x=10", "=")'), 'x'); assert.equal(S('extractAfter("x=10", "=")'), '10'); assert.equal(S('extractBetween("[ok]", "[", "]")'), 'ok');
  assert.equal(E('str2double("3.25")*2').value, 6.5);
});

t('errores claros donde se espera un numero; una cota o una grafica piden un numero', () => {
  assert.throws(() => E('"a" + 1'), /num2str/); assert.throws(() => E('"a" * 2'), /no se multiplica/);
  assert.throws(() => E('"a" < "b"'), /== y !=/); assert.throws(() => E('sin("a")'), /no recibe cadenas/);
  assert.throws(() => E('["a", 1]'), /no mezcla/); assert.throws(() => E('if("a", 1, 2)'), /no puede ser una cadena/);
  assert.throws(() => evalExpr('"hola"'), /cadena: aquí hace falta un número/);
  assert.equal(evalExpr('strlength("abc")').value, 3);
});

t('en los textos: “…”, vectores, indices; las unidades y los # no se tocan dentro de una cadena', () => {
  const d = newDoc();
  const L = ["σ:210.254'MPa", "Sy:250'MPa", 'msg:"σ = " + num2str(σ) + " → " + if(σ<Sy, "Cumple", "No cumple")', 'msg=', 'v:strsplit("a,b,c", ",")', 'v=', 'v_2=', '"it\'s ok"=', "k:\"a\"'m"];
  const T = L.map((s, i) => d.texts[addText(d, addPoint(d, 0, 300 - i * 10), '$$' + s + '$$', {})]);
  addText(d, addPoint(d, 0, 0), '%etiqueta(x):\n  # comentario\n  "Valor #" + num2str(x)', {});
  const out = d.texts[addText(d, addPoint(d, 0, -10), '$$etiqueta(3)=$$', {})];
  const show = (q) => shownText(d, q).text.replace(/[\uE000-\uF8FF]/g, '');
  assert.equal(show(T[3]), '$$msg="“σ = 210.254 MPa → Cumple”"$$');
  assert.equal(show(T[5]), '$$v="[“a”, “b”, “c”]"$$');
  assert.equal(show(T[6]), '$$v_2="“b”"$$');
  assert.equal(show(T[7]), '$$"“it\'s ok”"="“it\'s ok”"$$'); // «'s» no es la unidad segundo; la cadena escrita tambien lleva sus comillas
  assert.equal(show(T[2]), '$$msg:="“σ = ”" + num2str(σ) + "“ → ”" + if(σ<Sy, "“Cumple”", "“No cumple”")$$');
  assert.equal(show(out), '$$etiqueta(3)="“Valor #3”"$$'); // el # de la cadena no es un comentario del script
  assert.deepEqual(textVarErrors(d).map((e) => e.msg), ['«k»: una cadena no lleva unidad']);
});

console.log(`\n${passed} pruebas de cadenas pasaron`);
