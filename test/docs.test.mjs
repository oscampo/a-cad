// Manual y ayuda: la ayuda generada (src/help-gen/) esta al dia con docs/, y cada traduccion al ingles (docs/en/) corresponde al texto
// actual en español y lo sigue en estructura (mismos temas, tablas y listas).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MANUAL_FILES, LANGS, moduleText, readDoc, esHash, srcOf, buildLang } from '../tools/build-help.mjs';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const norm = (s) => s.replace(/\r\n/g, '\n');
const shape = (md) => {
  const lines = md.split('\n');
  return {
    topics: lines.filter((l) => /^## /.test(l)).length,
    rows: lines.filter((l) => /^\s*\|/.test(l)).length,
    items: lines.filter((l) => /^\s*([-*]|\d+\.)\s/.test(l)).length,
    codes: (md.match(/^```/gm) || []).length,
  };
};

t('la ayuda generada (src/help-gen) esta al dia: corre «npm run help»', () => {
  for (const lang of LANGS) assert.equal(norm(readFileSync(new URL(`../src/help-gen/${lang}.js`, import.meta.url), 'utf8')), moduleText(lang), `src/help-gen/${lang}.js quedo viejo`);
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

console.log(`\n${passed} pruebas del manual pasaron`);
