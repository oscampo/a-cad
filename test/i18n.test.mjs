// Idioma: el catalogo ingles cubre la interfaz (index.html y el JavaScript) y tr() traduce textos, datos y trozos.
import assert from 'node:assert/strict';
import { htmlStrings, jsStrings } from '../tools/extract-strings.mjs';
import { EN } from '../src/i18n-en.js';
import { tr, setLang, getLang } from '../src/i18n.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const key = (s) => s.replace(/^~/, '').trim().replace(/\s+/g, ' ');

// Textos que no se traducen: nombres propios, fragmentos que la interfaz arma con otros ya traducidos, etc.
const IGNORE = (s) => /^[\w\s.,:;#\[\]()>*="'%@/&!?{}|+~-]+$/.test(s) && !/[a-záéíóúñ]{3,} [a-záéíóúñ]{3,}/i.test(s) // CSS, selectores, tipos MIME, URL
  || /^(display|gap|min-|width|flex|position|font|-apple|linear-gradient|conic-gradient|fill=|\s?(font-|text-))/.test(s.trim()) || /(sans-)?serif|cursive|monospace/.test(s) || /px -apple|\{0\}\{1\}px/.test(s)
  || ['Español', 'usuario/repositorio', 'main', 'dibujos', 'github_pat_…', '(sin uso en la interfaz)'].includes(s) || s.startsWith('MR1 vs t'); // nombres propios, ejemplos y texto interno

t('todo texto de la interfaz tiene traduccion', () => {
  const have = new Set(Object.keys(EN).map(key));
  const keys = [...have];
  const covered = (s) => have.has(key(s)) || IGNORE(s) || (key(s).length > 3 && keys.some((k) => k.includes(key(s)))); // un trozo de un mensaje armado con «+» queda dentro de su clave completa
  const miss = [...htmlStrings(), ...jsStrings().keys()].filter((s) => !covered(s));
  assert.deepEqual(miss, [], 'faltan en src/i18n-en.js:\n' + miss.map((s) => '  ' + JSON.stringify(s)).join('\n'));
});

t('el catalogo no deja textos vacios ni con huecos distintos', () => {
  for (const [es, en] of Object.entries(EN)) {
    assert.ok(en.trim(), 'vacio: ' + es);
    const holes = (s) => new Set(s.match(/\{\d+\}/g) || []);
    for (const h of holes(en)) assert.ok(holes(es).has(h), 'hueco que no existe en el original: ' + es); // el ingles puede omitir uno (el plural «s» del español)
  }
});

t('tr: exacto, con datos y trozos', () => {
  assert.equal(tr('Cancelar'), 'Cancelar'); // en español no cambia nada
  setLang('en', false);
  assert.equal(getLang(), 'en');
  assert.equal(tr('Cancelar'), 'Cancel');
  assert.equal(tr('  Cancelar \n'), '  Cancel \n'); // conserva los espacios de los lados
  assert.equal(tr('No reconozco «abc»'), "I don't recognize «abc»");
  assert.equal(tr('Copiado: 3 elementos. Pulsa Pegar y toca el punto donde va su centro'), 'Copied: 3 elements. Press Paste and tap the point where its center goes');
  assert.equal(tr('Capas · capa actual: Base'), 'Layers · current layer: Base'); // trozo
  assert.equal(tr('Línea (L) · toca de nuevo o mantén presionado para ver más herramientas'), 'Line (L) · tap again or press and hold to see more tools'); // partes
  assert.equal(tr('texto que no esta'), 'texto que no esta');
  setLang('es', false);
  assert.equal(tr('Cancelar'), 'Cancelar');
});

console.log(`\n${passed} pruebas de idioma pasaron`);
