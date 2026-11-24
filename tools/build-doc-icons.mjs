// Escribe los iconos de la app como archivos (docs/icons/<nombre>.svg) para que el manual los muestre en GitHub: un capitulo escribe
// «![Vector](icons/vector.svg)» (desde docs/en/: «../icons/vector.svg») y la ayuda de la app lo cambia por el icono de verdad (ver tools/md-html.mjs).
// Uso: npm run docs:icons (los iconos salen de src/icons.js; el trazo se pone en gris para que se vea en un fondo claro u oscuro).
import { register } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';

register(new URL('./svg-raw-loader.mjs', import.meta.url));
const { ICONS } = await import('../src/icons.js');
const dir = new URL('../docs/icons/', import.meta.url);
mkdirSync(dir, { recursive: true });
let n = 0;
for (const [name, svg] of Object.entries(ICONS)) {
  if (typeof svg !== 'string' || !svg.includes('<svg')) continue;
  let s = svg.replace(/<!--[\s\S]*?-->/g, '').trim().replace(/currentColor/g, '#6b7280');
  if (!/xmlns=/.test(s)) s = s.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  writeFileSync(new URL(name + '.svg', dir), s + '\n');
  n++;
}
console.log(n + ' iconos en docs/icons/');
