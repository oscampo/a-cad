// Los textos de las referencias que arma el codigo (Texto y calculo, Funciones y operadores) y su traduccion al ingles.
// Uso: node tools/ref-i18n.mjs  (npm run ref:sync): escribe tools/i18n/ref/funcref.tsv y calcref.tsv con TODOS los textos actuales, una linea
// por texto: «clave<TAB>español<TAB>ingles». La clave es el resumen del texto en español (hashStr): se traduce solo la tercera columna y la
// app busca por clave, asi que da igual como se copie el español (la segunda columna es solo para leerlo). Conserva las traducciones que
// ya hay, deja en blanco las de los textos nuevos o cambiados y quita las de los que ya no existen. «npm run i18n» arma src/i18n-ref-en.js
// (lo comprueba test/refi18n.test.mjs).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { hashStr } from '../src/images.js';
import { esc, unesc } from './tsvesc.mjs';
import { funcRefStrings } from '../src/funcref.js';
import { calcRefStrings } from '../src/calcref.js';
import { helpStrings } from '../src/help.js';

export const REF_DIR = fileURLToPath(new URL('./i18n/ref/', import.meta.url));
export { esc, unesc };
export const SOURCES = { funcref: funcRefStrings, calcref: calcRefStrings, help: helpStrings };
export const keyOf = hashStr;
// Un archivo: Map clave -> { es, en }
export function readTsv(file) {
  const m = new Map();
  if (!existsSync(file)) return m;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line) continue;
    const [k, es = '', en = ''] = line.split('\t');
    m.set(k, { es: unesc(es), en: unesc(en) });
  }
  return m;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const [name, get] of Object.entries(SOURCES)) {
    const file = REF_DIR + name + '.tsv', old = readTsv(file), now = get(), keys = new Set();
    const lines = now.map((s) => {
      const k = keyOf(s);
      if (keys.has(k)) throw new Error('dos textos con la misma clave: ' + k);
      keys.add(k);
      return k + '\t' + esc(s) + '\t' + esc(old.get(k)?.en || '');
    });
    writeFileSync(file, lines.join('\n') + '\n');
    const blank = now.filter((s) => !old.get(keyOf(s))?.en).length, gone = [...old.keys()].filter((k) => !keys.has(k)).length;
    console.log(`${name}.tsv: ${now.length} textos, ${blank} sin traducir${gone ? `, ${gone} que ya no existen (quitados)` : ''}`);
  }
}
