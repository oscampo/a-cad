// Despues de actualizar una traduccion (docs/en/X.md) a la version actual del español: escribe en su primera linea el resumen del español
// al que corresponde («<!-- es: abc123 -->»). Uso: npm run help:sync [archivo ...] (sin argumentos, todas las que existen).
// Revisa antes que de verdad sigue al español: el test solo comprueba el resumen y la estructura.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MANUAL_FILES, readDoc, esHash } from './build-help.mjs';
const only = process.argv.slice(2);
for (const f of MANUAL_FILES) {
  if (only.length && !only.includes(f)) continue;
  const en = readDoc('en', f);
  if (en === null) continue;
  const body = en.replace(/^<!--\s*es:[^>]*-->\n?/, '');
  writeFileSync(fileURLToPath(new URL('../docs/en/' + f, import.meta.url)), `<!-- es: ${esHash(f)} -->\n${body}`);
  console.log('docs/en/' + f, 'es:', esHash(f));
}
