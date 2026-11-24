// Arma src/i18n-en.js desde los archivos «es<TAB>en» de una carpeta (una linea por texto; «~» delante de la clave = trozo de un mensaje).
// Uso: node tools/build-catalog.mjs [carpeta con .tsv]  (por defecto tools/i18n/). Fuente del catalogo: tools/i18n/*.tsv; lo generado es src/i18n-en.js.
// Ademas arma src/i18n-ref-en.js desde tools/i18n/ref/*.tsv (ver mas abajo).
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { unesc } from './tsvesc.mjs';
const dir = process.argv[2] || fileURLToPath(new URL('./i18n', import.meta.url));
const out = new Map();
for (const f of readdirSync(dir).filter((x) => x.endsWith('.tsv')).sort()) {
  readFileSync(dir + '/' + f, 'utf8').split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    const k = line.split('\t');
    if (k.length !== 2) throw new Error(`${f}:${i + 1}: se esperaban 2 columnas, hay ${k.length}`);
    let [es, en] = k;
    if (es[0] === '~') { // un trozo conserva sus espacios de los lados (los editores suelen quitar los del final de una linea)
      const lead = es.slice(1).match(/^\s*/)[0], trail = es.match(/\s*$/)[0];
      en = lead + en.trim() + trail;
    }
    out.set(es, en);
  });
}
const body = [...out].map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n');
writeFileSync(new URL('../src/i18n-en.js', import.meta.url), `// Catalogo español -> ingles de la interfaz (lo arma tools/build-catalog.mjs; claves = el texto tal como esta en el programa).\n// «{0}», «{1}»: datos que se copian; clave con «~» delante: trozo de un mensaje que se arma con «+».\nexport const EN = {\n${body}\n};\n`);
console.log(out.size + ' textos');

// ---- El catalogo de las referencias que arma el codigo (Texto y calculo, Funciones y operadores): tools/i18n/ref/*.tsv, «clave<TAB>español<TAB>ingles»,
// se arma aparte en src/i18n-ref-en.js y la ayuda en ingles lo carga solo al abrirse (ver tools/ref-i18n.mjs). Los textos sin traducir no entran.
const refDir = dir + '/ref';
if (existsSync(refDir)) {
  const ref = {};
  for (const f of readdirSync(refDir).filter((x) => x.endsWith('.tsv')).sort()) {
    for (const line of readFileSync(refDir + '/' + f, 'utf8').split(/\r?\n/)) {
      if (!line) continue;
      const [k, , en = ''] = line.split('\t');
      if (en) ref[k] = unesc(en);
    }
  }
  const refBody = Object.entries(ref).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n');
  writeFileSync(new URL('../src/i18n-ref-en.js', import.meta.url), `// Traduccion al ingles de las referencias que arma el codigo (lo arma tools/build-catalog.mjs desde tools/i18n/ref/*.tsv). Clave: hashStr del texto en español.\nexport const REF_EN = {\n${refBody}\n};\n`);
  console.log(Object.keys(ref).length + ' textos de las referencias');
}
