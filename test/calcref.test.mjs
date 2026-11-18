// La referencia de «Texto y cálculo» (src/calcref.js) dice la verdad: cada ejemplo se dibuja como lo anota la ayuda,
// y el manual (docs/07-texto-y-calculo.md) está al día.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { textValue, plainText } from '../src/text.js';
import { migrateCalc } from '../src/tvars.js';
import { CALC_GROUPS, calcRefHtml, calcRefMarkdown } from '../src/calcref.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };

const draw = (text) => {
  const d = { pts: { p: { x: 0, y: 0 } }, lines: {}, circles: {}, arcs: {}, cons: {}, ellipses: {}, splines: {}, hatches: {}, traces: {}, texts: {} };
  d.texts.t1 = { pt: 'p', h: 1, font: '', text };
  return plainText(textValue(d, d.texts.t1));
};
const shown = {
  t: (ex) => draw('$$' + ex + '$$').replace(/^\$\$|\$\$$/g, ''), // lo que se teclea se guarda como bloque matematico
  p: (ex) => draw(ex.replace(/^'/, '')).replace(/\$/g, ''), // texto normal: el «'» no se guarda y los «$» no se dibujan
  mig: (ex) => migrateCalc(ex),
};

t('cada ejemplo de «Texto y cálculo» se ve como dice la ayuda', () => {
  let n = 0;
  for (const g of CALC_GROUPS) for (const [name, , ex, res, mode] of g.rows) {
    if (!mode) continue;
    const got = shown[mode](ex);
    assert.equal(got, res, `${g.title} · ${name.replace(/<[^>]+>/g, '')}: «${ex}» se ve «${got}», la ayuda dice «${res}»`);
    n++;
  }
  assert.ok(n >= 25, `solo ${n} ejemplos comprobados`);
});

t('la ayuda documenta «x:expr=»', () => {
  assert.ok(CALC_GROUPS.some((g) => g.rows.some((r) => r[0].includes('x:expr='))));
});

t('el HTML se arma: una tabla por grupo, sin «<» sin escapar dentro de un ejemplo', () => {
  const h = calcRefHtml();
  assert.equal((h.match(/<table class="fref">/g) || []).length, CALC_GROUPS.length);
  assert.ok(!/<code>[^<]*<(?!\/code>)[^>]*>[^<]*<\/code>/.test(h.replace(/<br>/g, '')), 'un ejemplo con «<» sin escapar romperia la tabla');
  for (const g of CALC_GROUPS) for (const r of g.rows) assert.equal(r.length >= (g.head || [0, 0, 0, 0]).length, true, `${g.title}: fila con menos columnas que la cabecera`);
});

t('el manual (docs/07-texto-y-calculo.md) esta al dia con la referencia', () => {
  const file = readFileSync(new URL('../docs/07-texto-y-calculo.md', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.ok(file === calcRefMarkdown(), 'docs/07-texto-y-calculo.md quedo viejo: corre «npm run docs»');
});

console.log(`\n${passed} pruebas de la referencia de texto y cálculo`);
