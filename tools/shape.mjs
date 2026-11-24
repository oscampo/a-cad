// Compara la estructura de una traduccion con su original: node tools/shape.mjs 06-cotas.md (temas, filas de tabla, puntos de lista y bloques de codigo).
import { readDoc } from './build-help.mjs';
import { shape } from './md-html.mjs';
for (const f of process.argv.slice(2)) {
  const es = readDoc('es', f), en = readDoc('en', f);
  if (en === null) { console.log(f, ': no existe docs/en/' + f); continue; }
  const a = shape(es), b = shape(en), bad = Object.keys(a).filter((k) => a[k] !== b[k]);
  console.log(f, bad.length ? 'DIFIERE ' + bad.map((k) => `${k}: es ${a[k]} / en ${b[k]}`).join(', ') : 'misma estructura', JSON.stringify(a));
}
