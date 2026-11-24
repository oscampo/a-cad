// Buscador de la ayuda: palabras sin tildes ni mayusculas, relevancia y fragmento con la coincidencia marcada.
import assert from 'node:assert/strict';
import { normMap, wordsOf, search, snippet } from '../src/helpsearch.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const U = (text, o = {}) => ({ ch: 'c', chTitle: 'Capítulo', topic: '', text, ...o });

t('normMap: sin tildes ni mayusculas y con el lugar de cada letra en el original', () => {
  const { n, map } = normMap('Árbol de ELEMENTOS ñu');
  assert.equal(n, 'arbol de elementos nu');
  assert.equal(map.length, n.length); assert.equal(map[0], 0); assert.equal(map[n.length - 1], 'Árbol de ELEMENTOS ñu'.length - 1);
  assert.deepEqual(wordsOf('  Árbol  DE '), ['arbol', 'de']);
});

t('search: todas las palabras (en el texto, el tema o el capitulo); orden por relevancia', () => {
  const units = [
    U('El árbol de elementos lista todo.'),
    U('Una nota sobre elementos sueltos.'),
    U('sin relacion', { topic: 'Árbol de elementos' }),
    U('plot(x, y) dibuja una gráfica', { key: 'plot', row: true, chTitle: 'Funciones y operadores' }),
    U('Otra cosa: la grafica de plot en el reproductor', { chTitle: 'Simulaciones' }),
  ];
  assert.equal(search(units, 'arbol elementos').hits.length, 2); // el 2.º no tiene «arbol»
  assert.equal(search(units, 'arbol elementos').hits[0].u, units[2]); // el tema coincide: primero
  assert.equal(search(units, 'zzz').hits.length, 0);
  assert.equal(search(units, '   ').hits.length, 0);
  const r = search(units, 'plot').hits;
  assert.equal(r[0].u, units[3]); // el nombre de la funcion, antes que una mencion
  assert.equal(r.length, 2);
});

t('search: la frase junta rinde mas que las palabras sueltas', () => {
  const juntas = U('Con un doble toque abres las propiedades.'), sueltas = U('Un toque simple selecciona; con doble clic y un toque largo se abre otra cosa.');
  const r = search([sueltas, juntas], 'doble toque').hits;
  assert.equal(r[0].u, juntas); assert.equal(r.length, 2);
});

t('search: una unidad corta rinde mas que una larga con la misma coincidencia', () => {
  const short = U('ajustar la vista'), long = U('ajustar la vista ' + 'texto de relleno '.repeat(60));
  const r = search([long, short], 'ajustar').hits;
  assert.equal(r[0].u, short);
});

t('snippet: la coincidencia marcada, con tildes en el original y sin cortar palabras', () => {
  const text = 'Una línea larga con el Árbol de Elementos en medio y mucho más texto después de la coincidencia para que se corte por los dos lados bien.';
  const s = snippet(text, ['arbol', 'elementos'], 60);
  assert.deepEqual(s.filter((x) => x.m).map((x) => x.t), ['Árbol', 'Elementos']);
  assert.ok(s[0].t === '…' && s[s.length - 1].t === '…');
  assert.ok(s.map((x) => x.t).join('').length <= 66);
  const all = snippet('corto: árbol', ['arbol'], 170);
  assert.equal(all.map((x) => x.t).join(''), 'corto: árbol'); // cabe entero: sin puntos suspensivos
  assert.deepEqual(snippet('nada', ['zzz'], 170), [{ t: 'nada', m: false }]);
});

console.log(`\n${passed} pruebas del buscador de la ayuda pasaron`);
