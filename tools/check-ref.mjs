// Revisa traducciones de las referencias (tools/i18n/ref/*.tsv o un archivo con el mismo formato): que cada texto traducido conserve las marcas
// y el codigo del español (mismas etiquetas, mismo codigo entre <code>) y no lleve « » ni « — ». Uso: node tools/check-ref.mjs archivo.tsv [...]
import { readFileSync } from 'node:fs';
import { unesc } from './tsvesc.mjs';

const tags = (s) => (s.match(/<\/?[a-z][^>]*>/gi) || []).map((t) => t.replace(/\s+href="[^"]*"/, ' href').replace(/data-topic="[^"]*"/, 'data-topic'));
const codes = (s) => (s.match(/<code>[^<]*<\/code>/g) || []).join('\u0001');
const ticks = (s) => (s.match(/`[^`]*`/g) || []).join('\u0001');
const attrs = (s) => [...s.matchAll(/data-help="([^"]*)"/g)].map((m) => m[1]).join(',');
// Los problemas de una traduccion respecto del español
export function problems(es, en) {
  const out = [];
  if (!en) return ['sin traducir'];
  if (JSON.stringify(tags(es)) !== JSON.stringify(tags(en))) out.push('las etiquetas no coinciden: ' + tags(es).join('') + ' / ' + tags(en).join(''));
  if (codes(es) !== codes(en)) out.push('el codigo entre <code> cambio');
  if (ticks(es) !== ticks(en)) out.push('el codigo entre acentos graves cambio');
  if (attrs(es) !== attrs(en)) out.push('data-help cambio');
  if (/[«»]/.test(en)) out.push('lleva « » (usa comillas rectas)');
  if (/ — /.test(en)) out.push('lleva « — »');
  return out;
}
if (process.argv[1] && process.argv[1].endsWith('check-ref.mjs')) {
  let bad = 0;
  for (const f of process.argv.slice(2)) {
    const lines = readFileSync(f, 'utf8').split(/\r?\n/).filter(Boolean);
    let n = 0;
    for (const line of lines) {
      const [k, es = '', en = ''] = line.split('\t');
      const p = problems(unesc(es), unesc(en));
      if (p.length) { bad++; if (n++ < 40) console.log(`${f}: ${k}: ${p.join('; ')}\n   es: ${unesc(es).slice(0, 110)}\n   en: ${unesc(en).slice(0, 110)}`); }
    }
    console.log(`${f}: ${lines.length} textos, ${n} con problemas`);
  }
  process.exitCode = bad ? 1 : 0;
}
