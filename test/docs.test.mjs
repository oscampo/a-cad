// Manual y ayuda: la ayuda generada (src/help-gen/) esta al dia con docs/, y cada traduccion al ingles (docs/en/) corresponde al texto
// actual en español y lo sigue en estructura (mismos temas, tablas y listas).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shape } from '../tools/md-html.mjs';
import { problems as linkProblems } from '../tools/check-doc-links.mjs';
import { MANUAL_FILES, LANGS, moduleText, readDoc, esHash, srcOf, buildLang } from '../tools/build-help.mjs';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const norm = (s) => s.replace(/\r\n/g, '\n');

t('la ayuda generada (src/help-gen) esta al dia: corre «npm run help»', () => {
  for (const lang of LANGS) assert.equal(norm(readFileSync(new URL(`../src/help-gen/${lang}.js`, import.meta.url), 'utf8')), moduleText(lang), `src/help-gen/${lang}.js quedo viejo`);
});

t('la ayuda generada no deja marcas de Markdown sin convertir', () => {
  for (const lang of LANGS) for (const [id, html] of Object.entries(buildLang(lang).html)) {
    const txt = html.replace(/<code>[^<]*<\/code>/g, '').replace(/<[^>]+>/g, ' ');
    assert.ok(!/(^|\s)#{2,6}\s|\*\*[^*]+\*\*/.test(txt), lang + '/' + id + ': queda una marca de Markdown (### o **) sin convertir');
  }
});

t('los enlaces del manual (a otros temas) y sus iconos existen', () => {
  assert.deepEqual(linkProblems(), []);
});

t('los capitulos del manual existen y cada uno tiene su titulo', () => {
  for (const f of MANUAL_FILES) { const md = readDoc('es', f); assert.ok(md, f + ' no existe'); assert.match(md, /^#\s/m, f + ' sin titulo'); }
});

t('las traducciones al ingles siguen al español: mismo resumen y misma estructura', () => {
  const stale = [], shapes = [];
  let done = 0;
  for (const f of MANUAL_FILES) {
    const en = readDoc('en', f);
    if (en === null) continue;
    done++;
    if (srcOf(en) !== esHash(f)) stale.push(f);
    const a = shape(readDoc('es', f)), b = shape(en);
    for (const k of Object.keys(a)) if (a[k] !== b[k]) shapes.push(`${f}: ${k} ${a[k]} (es) / ${b[k]} (en)`);
  }
  assert.deepEqual(stale, [], 'el español cambio y la traduccion no (actualiza docs/en y corre «npm run help:sync»): ' + stale.join(', '));
  assert.deepEqual(shapes, [], 'la traduccion no sigue la estructura del español: ' + shapes.join('; '));
  const missing = buildLang('en').fallback;
  console.log(`    ingles: ${done} de ${MANUAL_FILES.length} capitulos traducidos` + (missing.length ? `; faltan: ${missing.join(', ')}` : ''));
});

t('Botones desplegables: cada boton de cada desplegable de la app (GROUPS en main.js) aparece en la referencia, en español y en ingles', () => {
  const src = norm(readFileSync(new URL('../src/main.js', import.meta.url), 'utf8'));
  const i = src.indexOf('const GROUPS = {'), j = src.indexOf('\n};', i);
  assert.ok(i > 0 && j > i, 'no encuentro GROUPS en main.js');
  const groups = Function('return (' + src.slice(i + 'const GROUPS = '.length, j + 2) + ')')();
  assert.ok(Object.keys(groups).length >= 11);
  for (const file of ['docs/desplegables.md', 'docs/en/desplegables.md']) {
    const md = norm(readFileSync(new URL('../' + file, import.meta.url), 'utf8'));
    const used = new Set([...md.matchAll(/icons\/([\w-]+)\.svg/g)].map((m) => m[1]));
    for (const [g, items] of Object.entries(groups)) for (const [id, icon] of items) assert.ok(used.has(icon), `${file}: falta el boton «${id}» (icono ${icon}) del grupo «${g}»`);
  }
});

console.log(`\n${passed} pruebas del manual pasaron`);
