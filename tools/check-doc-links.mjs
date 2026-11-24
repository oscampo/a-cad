// Revisa los enlaces y los iconos del manual (docs/ y docs/en/): cada «[texto](archivo.md#tema)» o «[texto](#tema)» apunta a un archivo y a un
// titulo «##» que existen (con el ancla que GitHub le da), y cada «![x](icons/nombre.svg)» a un icono de docs/icons/. Uso: node tools/check-doc-links.mjs [archivos]
// (sin argumentos, todo el manual). Sale con error si algo no existe.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
// El ancla que GitHub da a un titulo: minusculas, sin signos (salvo guiones) y con guiones en lugar de espacios
export const slug = (t) => t.toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N} _-]/gu, '').trim().replace(/ /g, '-');
const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const anchorsOf = (file) => new Set(read(file).split('\n').filter((l) => /^#{2,6}\s/.test(l)).map((l) => slug(l.replace(/^#+\s+/, '').replace(/[*`]/g, ''))));

export function problems(files = null) {
  const out = [];
  const list = files || ['docs', 'docs/en'].flatMap((d) => readdirSync(ROOT + d).filter((f) => f.endsWith('.md')).map((f) => d + '/' + f));
  for (const f of list) {
    const dir = f.slice(0, f.lastIndexOf('/')), text = read(ROOT + f);
    const noCode = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
    for (const m of noCode.matchAll(/(!?)\[([^\]]*)\]\(([^)\s]+)\)/g)) {
      const [, bang, label, target] = m;
      if (/^(https?:|mailto:)/.test(target)) continue;
      if (bang) { if (/icons\//.test(target) && !existsSync(ROOT + dir + '/' + target)) out.push(`${f}: el icono «${target}» no existe`); continue; }
      const [file, frag] = target.split('#');
      const path = file ? ROOT + dir + '/' + file : ROOT + f;
      if (file && !existsSync(path)) { out.push(`${f}: el enlace «${label}» apunta a «${file}», que no existe`); continue; }
      if (frag && /\.md$/.test(path) && !anchorsOf(path).has(decodeURIComponent(frag).toLowerCase())) out.push(`${f}: el enlace «${label}» apunta a «${target}», pero ese tema no existe`);
    }
  }
  return out;
}
if (process.argv[1] && process.argv[1].endsWith('check-doc-links.mjs')) {
  const args = process.argv.slice(2).map((a) => (a.includes('/') ? a : (a.startsWith('en:') ? 'docs/en/' + a.slice(3) : 'docs/' + a)));
  const p = problems(args.length ? args : null);
  for (const x of p) console.log(x);
  console.log(p.length ? `${p.length} problemas` : 'enlaces e iconos bien');
  process.exitCode = p.length ? 1 : 0;
}
