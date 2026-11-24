// Regenera los capitulos del manual que salen de la misma fuente que la ayuda, en español y en ingles:
// docs/funciones.md y docs/en/funciones.md (src/funcref.js), docs/07-texto-y-calculo.md y docs/en/07-texto-y-calculo.md (src/calcref.js).
// El ingles sale del catalogo tools/i18n/ref/*.tsv (npm run i18n). Uso: npm run docs
import { writeFileSync, mkdirSync } from 'node:fs';
import { funcRefMarkdown } from '../src/funcref.js';
import { calcRefMarkdown } from '../src/calcref.js';
import { hashStr } from '../src/images.js';
import { REF_EN } from '../src/i18n-ref-en.js';

const T = (s) => REF_EN[hashStr(s)] ?? s;
const out = (f, s) => writeFileSync(new URL('../docs/' + f, import.meta.url), s);
mkdirSync(new URL('../docs/en/', import.meta.url), { recursive: true });
out('funciones.md', funcRefMarkdown());
out('07-texto-y-calculo.md', calcRefMarkdown());
out('en/funciones.md', funcRefMarkdown(T));
out('en/07-texto-y-calculo.md', calcRefMarkdown(T));
console.log('docs/funciones.md, docs/07-texto-y-calculo.md y sus versiones en docs/en/ actualizados');
