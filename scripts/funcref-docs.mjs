// Regenera docs/funciones.md a partir de src/funcref.js (la misma fuente de la ayuda). Uso: npm run docs:funciones
import { writeFileSync } from 'node:fs';
import { funcRefMarkdown } from '../src/funcref.js';
writeFileSync(new URL('../docs/funciones.md', import.meta.url), funcRefMarkdown());
console.log('docs/funciones.md actualizado');
