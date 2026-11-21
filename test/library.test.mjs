// Bibliotecas (fase 1): definiciones del documento, lo que viaja (publico + dependencias), revision antes de guardar y alias.
import assert from 'node:assert/strict';
import { newDoc, addPoint, addText, addLine } from '../src/model.js';
import { libDefs, libClosure, defaultExports, checkLibrary, aliasProblem, libFileName, refsOf, LIB_DIR } from '../src/library.js';

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

console.log(`\n${passed} pruebas de bibliotecas pasaron`);
