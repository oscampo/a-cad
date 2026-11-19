// Arma src/i18n-en.js desde los archivos «es<TAB>en» de una carpeta (una linea por texto; «~» delante de la clave = trozo de un mensaje).
// Uso: node tools/build-catalog.mjs [carpeta con .tsv]  (por defecto tools/i18n/). Fuente del catalogo: tools/i18n/*.tsv; lo generado es src/i18n-en.js.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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
