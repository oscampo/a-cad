// Las referencias que arma el codigo (Texto y calculo, Funciones y operadores, Iconos): cada texto tiene su traduccion al ingles, que conserva las
// marcas y el codigo del español, y los capitulos del manual en ingles (docs/en) estan al dia con ellas. Si cambias un texto de calcref.js o
// funcref.js: «npm run ref:sync», traduce los que queden en blanco en tools/i18n/ref/*.tsv, «npm run i18n» y «npm run docs».
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hashStr } from '../src/images.js';
import { REF_EN } from '../src/i18n-ref-en.js';
import { SOURCES } from '../tools/ref-i18n.mjs';
import { problems } from '../tools/check-ref.mjs';
import { funcRefMarkdown, funcRefHtml } from '../src/funcref.js';
import { calcRefMarkdown, calcRefHtml } from '../src/calcref.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const T = (s) => REF_EN[hashStr(s)] ?? s;
const norm = (s) => s.replace(/\r\n/g, '\n');

t('cada texto de las referencias tiene su traduccion, con las mismas marcas y el mismo codigo', () => {
  const bad = [];
  let n = 0;
  for (const [name, get] of Object.entries(SOURCES)) for (const es of get()) {
    n++;
    const p = problems(es, REF_EN[hashStr(es)] || '');
    if (p.length) bad.push(`${name}: ${es.slice(0, 70)} -> ${p.join('; ')}`);
  }
  assert.deepEqual(bad.slice(0, 12), [], `${bad.length} de ${n} textos sin traducir o con problemas (npm run ref:sync, traduce tools/i18n/ref/*.tsv y npm run i18n)`);
});

t('los enlaces internos de la referencia en ingles apuntan a un tema que existe', () => {
  const html = calcRefHtml(T) + funcRefHtml(T);
  const titles = new Set([...html.matchAll(/<h4>([^<]*)<\/h4>/g)].map((m) => m[1]));
  const bad = [...html.matchAll(/data-topic="([^"]*)"/g)].map((m) => m[1]).filter((x) => !titles.has(x));
  // los temas de las dos referencias se enlazan entre si: cada uno debe ser el titulo (en ingles) de un grupo
  assert.deepEqual(bad, []);
});

t('los capitulos generados del manual en ingles estan al dia: corre «npm run docs»', () => {
  const rd = (f) => norm(readFileSync(new URL('../docs/en/' + f, import.meta.url), 'utf8'));
  assert.equal(rd('funciones.md'), funcRefMarkdown(T), 'docs/en/funciones.md quedo viejo');
  assert.equal(rd('07-texto-y-calculo.md'), calcRefMarkdown(T), 'docs/en/07-texto-y-calculo.md quedo viejo');
});

console.log(`\n${passed} pruebas de las referencias en ingles pasaron`);
