// La referencia de funciones de la ayuda (src/funcref.js) dice la verdad: cada ejemplo da el resultado anotado
// y nombra todas las funciones y constantes del evaluador.
import assert from 'node:assert/strict';
import { evalExpr, FUNC_NAMES } from '../src/expr.js';
import { textValue, plainText } from '../src/text.js';
import { FUNC_GROUPS, funcRefHtml, funcRefMarkdown } from '../src/funcref.js';
import { readFileSync } from 'node:fs';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };

const fmt = (x) => String(Number(x.toFixed(4)));
const show = (r) => (r.mat ? '[' + r.mat.map((row) => row.map(fmt).join(', ')).join('; ') + ']' : fmt(r.value));
const page = (text) => {
  const d = { pts: { p: { x: 0, y: 0 } }, lines: {}, circles: {}, arcs: {}, cons: {}, ellipses: {}, splines: {}, hatches: {}, traces: {}, texts: {} };
  d.texts.t1 = { pt: 'p', h: 1, font: '', text: '$$' + text + '$$' }; // lo que se teclea se guarda como bloque matematico
  return plainText(textValue(d, d.texts.t1)).split('\n').at(-1).replace(/\$+$/, '').replace(/^.*=/, ''); // «expr=valor$$» -> valor
};

t('cada ejemplo de la referencia da el resultado anotado', () => {
  let n = 0;
  for (const g of FUNC_GROUPS) for (const [name, , ex, res, mode] of g.rows) {
    if (!ex) continue;
    const got = mode === 't' ? page(ex) : show(evalExpr(ex, { allowMat: mode === 'm' }));
    assert.equal(got, res, `${g.title} · ${name.replace(/<[^>]+>/g, '')}: «${ex}» da ${got}, la ayuda dice ${res}`);
    n++;
  }
  assert.ok(n > 50, `solo ${n} ejemplos`);
});

t('la referencia nombra todas las funciones y constantes del evaluador', () => {
  const named = new Set();
  for (const g of FUNC_GROUPS) for (const [name] of g.rows) for (const m of name.matchAll(/<code>([^<]*)<\/code>/g)) for (const w of m[1].match(/[A-Za-zπ][A-Za-z0-9]*/g) || []) named.add(w);
  const missing = FUNC_NAMES.filter((f) => !named.has(f));
  assert.deepEqual(missing, [], 'faltan en la ayuda: ' + missing.join(', '));
});

t('el HTML de la referencia se arma y escapa los signos de comparacion', () => {
  const h = funcRefHtml();
  assert.equal((h.match(/<table class="fref">/g) || []).length, FUNC_GROUPS.length);
  assert.ok(h.includes('<code>0.1+0.2==0.3</code>'));
  assert.ok(!/<code>[^<]*<(?!\/code>)[^>]*>[^<]*<\/code>/.test(h.replace(/<br>/g, '')), 'un ejemplo con «<» sin escapar romperia la tabla');
});

t('el manual (docs/funciones.md) esta al dia con la referencia', () => {
  const file = readFileSync(new URL('../docs/funciones.md', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.ok(file === funcRefMarkdown(), 'docs/funciones.md quedo viejo: corre «npm run docs:funciones»');
});

console.log(`\n${passed} pruebas de la referencia de funciones`);
