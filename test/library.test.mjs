// Bibliotecas (fase 1): definiciones del documento, lo que viaja (publico + dependencias), revision antes de guardar y alias.
import assert from 'node:assert/strict';
import { newDoc, addPoint, addText, addLine } from '../src/model.js';
import { libDefs, libClosure, defaultExports, checkLibrary, aliasProblem, libFileName, refsOf, LIB_DIR, libPayload } from '../src/library.js';
import { qualify, qualifyDef } from '../src/qualify.js';
import { evalExpr } from '../src/expr.js';
import { shownText } from '../src/text.js';
import { textVarErrors } from '../src/params.js';
import { setDecimal } from '../src/locale.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const mk = (lines, scripts = []) => {
  const d = newDoc(); d.decimal = '.';
  lines.forEach((s, i) => addText(d, addPoint(d, 0, 300 - i * 10), '$$' + s + '$$', {}));
  scripts.forEach((s, i) => addText(d, addPoint(d, 100, 300 - i * 10), s, {}));
  return d;
};

t('definiciones y lo que viaja: los públicos y lo que necesitan; los ejemplos no', () => {
  const d = mk(['T_(st):[1, 2; 3, 4]', 'b:-0.113', 'g(x):x*T_(st)_(1,2)', 'h(x):g(x) + 1', 'ej:h(2)='],
    ['%loc(k):\n  b:[10, 20, 30]\n  b_k']);
  const { defs } = libDefs(d);
  assert.deepEqual([...defs.values()].map((x) => x.name + ':' + x.kind).sort(), ['T_(st):var', 'b:var', 'ej:var', 'g:fn', 'h:fn', 'loc:script']);
  assert.deepEqual(defaultExports(defs).sort(), ['g', 'h', 'loc']);
  assert.deepEqual([...refsOf(defs.get('g'), defs)], ['T_(st)']); // T_(st) es ese nombre, no el elemento st de un vector T
  assert.deepEqual([...refsOf(defs.get('loc'), defs)], []); // la b del script es local: no arrastra la b del documento
  const c = libClosure(d, ['h', 'loc']);
  assert.deepEqual([...c.names].sort(), ['T_(st)', 'g', 'h', 'loc']); // h necesita g, y g la tabla; ni b ni el ejemplo ej viajan
  assert.deepEqual(c.missing, []); assert.deepEqual(c.measures, []);
});

t('revisión antes de guardar: nombre, alias, nada público, un público que ya no existe, errores y medidas del dibujo', () => {
  const d = mk(['f(x):x^2', 'k(x):x*D1', 'm(x):x + l1.len', 'bad(x):x + noexiste1(x)']);
  const p0 = addPoint(d, 0, 0), p1 = addPoint(d, 10, 0); addLine(d, p0, p1, {});
  assert.deepEqual(checkLibrary(d), ['el documento no está declarado como biblioteca']);
  d.lib = { on: true, name: 'Prueba', alias: 'PR', exports: ['f'] };
  assert.deepEqual(checkLibrary(d), []);
  d.lib.exports = []; assert.match(checkLibrary(d).join('|'), /no hay nada público/);
  d.lib.exports = ['f', 'zz']; assert.match(checkLibrary(d).join('|'), /«zz» está marcado como público pero ya no está definido/);
  d.lib.exports = ['m']; assert.match(checkLibrary(d).join('|'), /«m» lee l1\.len: una biblioteca no debería depender/);
  d.lib = { on: true, name: '', alias: 'p1', exports: ['f'] };
  const pr = checkLibrary(d).join('|'); assert.match(pr, /falta el nombre/); assert.match(pr, /se confunde con el nombre de un elemento/);
});

t('alias y nombre del archivo', () => {
  assert.equal(aliasProblem('UF'), null); assert.equal(aliasProblem('Fat2'), null);
  for (const [a, re] of [['', /falta/], ['U F', /letras y números/], ['2UF', /letras y números/], ['p1', /elemento del dibujo/], ['D3', /elemento del dibujo/], ['sin', /reservado/]]) assert.match(aliasProblem(a), re, a);
  assert.equal(libFileName({ name: 'Utilidades: Fatiga/2' }), 'Utilidades- Fatiga-2.json');
  assert.equal(LIB_DIR, 'MyLibrary');
});

t('fase 2: qualify reescribe los nombres de la biblioteca, sin tocar locales, unidades, propiedades ni cadenas', () => {
  const n = new Set(['Neuber_(steels)', 'T', 'b', "S_e'"]);
  assert.equal(qualify('if(m == "steel", Neuber_(steels), 1)', n, 'UF'), 'if(m == "steel", UF.Neuber_(steels), 1)');
  assert.equal(qualify('Neuber_(steels)_(1,2) + b_k + T', n, 'UF'), 'UF.Neuber_(steels)_(1,2) + UF.b_k + UF.T');
  assert.equal(qualify("T'MPa + 1'T + p1.x + UF.T + \"T b\"", n, 'UF'), "T'MPa + 1'T + p1.x + UF.T + \"T b\""); // unidades, propiedades, ya calificado, cadena
  assert.equal(qualify("S_e'(2) + 3", n, 'UF'), "UF.S_e'(2) + 3");
  assert.equal(qualifyDef({ params: ['b'], expr: 'b*T' }, n, 'UF').expr, 'b*UF.T'); // el parametro b es local
  assert.equal(qualifyDef({ params: null, expr: 'line(b:[1, 2], b_2 + T)' }, n, 'UF').expr, 'line(b:[1, 2], b_2 + UF.T)'); // la b asignada en el programa es local
});

t('fase 2: el lector de fórmulas reconoce alias.nombre (llamadas, primas, índices) y avisa si la biblioteca no lo tiene', () => {
  setDecimal('.');
  const V = { 'UF.T': { vec: [10, 20, 30], r: false }, 'UF.f': { fn: { params: ['x'], body: 'x*2' } }, "UF.S_e'": { fn: { params: ['s'], body: 's/2' } }, 'UF.N_(st)': { mat: [[1, 2], [3, 4]], r: false }, k: { v: 2, r: false }, 'T_(st)': { mat: [[5, 6], [7, 8]], r: false } };
  const E = (q) => evalExpr(q, { vars: V, allowMat: true });
  assert.equal(E('UF.f(3)').value, 6); assert.equal(E('UF.T_k').value, 20); assert.equal(E("UF.S_e'(8)").value, 4);
  assert.equal(E('UF.N_(st)_(2,1)').value, 3); assert.equal(E('T_(st)_(1,2)').value, 6); // indice de un nombre con subindice (antes «No reconozco _»)
  assert.equal(E('UF.f(UF.T_3) + 1').value, 61);
  assert.throws(() => E('UF.zz'), /La biblioteca «UF» no tiene «zz»/);
});

t('fase 2: una biblioteca insertada vale desde su lugar, atada a sus propias tablas; antes de ella y tras clear(all) avisa', () => {
  const src = newDoc(); src.decimal = '.';
  ['T_(st):[100, 200]', 'b:-0.113', 'g(i):T_(st)_i + 1', 'h(x):g(x)*2', 'ej:h(1)='].forEach((q, i) => addText(src, addPoint(src, 0, 300 - i * 10), '$$' + q + '$$', {}));
  src.lib = { on: true, name: 'Prueba', alias: 'PR', version: 2, exports: ['h'] };
  const P = libPayload(src);
  assert.deepEqual(P.defs.map((x) => x.name), ['T_(st)', 'g', 'h']); assert.equal(P.alias, 'PR'); assert.equal(P.version, 2);
  const d = newDoc(); d.decimal = '.';
  const L = ['a:PR.h(1)', null, 'T_(st):[1, 2]', 'PR.h(1)=', 'PR.h(2)=', 'T_(st)_2=', 'PR.T_(st)_2=', 'PR.ej=', 'clear(all)=', 'PR.h(1)='];
  const T = L.map((q, i) => { const id = addText(d, addPoint(d, 0, 300 - i * 10), q === null ? '▸ Prueba' : '$$' + q + '$$', {}); if (q === null) d.texts[id].lib = P; return d.texts[id]; });
  const show = (k) => shownText(d, T[k]).text.replace(/[\uE000-\uF8FF]/g, '').replace(/color\(gray\)\(PR\.\)/g, 'PR.');
  assert.equal(show(3), '$$PR.h(1)=202$$'); assert.equal(show(4), '$$PR.h(2)=402$$'); // usa su T_(st), no la del documento
  assert.equal(show(5), '$$T_(st)_2=2$$'); assert.equal(show(6), '$$PR.T_(st)_2=200$$');
  assert.match(show(7), /⚠/); assert.match(show(9), /⚠/); // el ejemplo no viaja; tras clear(all) ya no vale
  assert.match(textVarErrors(d).map((e) => e.msg).join('|'), /«PR» es una biblioteca que está más abajo/);
  assert.match(shownText(d, T[3]).text, /color\(gray\)\(PR\.\)h/); // el prefijo, en gris
});

console.log(`\n${passed} pruebas de bibliotecas pasaron`);
