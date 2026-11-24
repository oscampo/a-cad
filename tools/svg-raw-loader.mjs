// Gancho de carga de Node para importar un .svg con «?raw» como texto (como lo hace Vite en src/icons.js). Lo usa tools/build-doc-icons.mjs.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export async function resolve(specifier, ctx, next) {
  if (specifier.endsWith('?raw')) {
    const r = await next(specifier.slice(0, -4), ctx);
    return { ...r, url: r.url + '?raw', shortCircuit: true };
  }
  return next(specifier, ctx);
}
export async function load(url, ctx, next) {
  if (url.endsWith('?raw')) {
    const text = readFileSync(fileURLToPath(url.slice(0, -4)), 'utf8');
    return { format: 'module', source: 'export default ' + JSON.stringify(text) + ';', shortCircuit: true };
  }
  return next(url, ctx);
}
