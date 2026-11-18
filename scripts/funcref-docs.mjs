// Regenera los capitulos del manual que salen de la misma fuente que la ayuda:
// docs/funciones.md (src/funcref.js) y docs/07-texto-y-calculo.md (src/calcref.js). Uso: npm run docs
import { writeFileSync } from 'node:fs';
import { funcRefMarkdown } from '../src/funcref.js';
import { calcRefMarkdown } from '../src/calcref.js';
writeFileSync(new URL('../docs/funciones.md', import.meta.url), funcRefMarkdown());
writeFileSync(new URL('../docs/07-texto-y-calculo.md', import.meta.url), calcRefMarkdown());
console.log('docs/funciones.md y docs/07-texto-y-calculo.md actualizados');
