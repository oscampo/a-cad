// Arma la ayuda de la app desde el manual (docs/): un modulo por idioma en src/help-gen/ (es.js, en.js) con el HTML de cada capitulo.
// El español es docs/*.md; el ingles, docs/en/*.md (con la misma lista de archivos). Un capitulo que todavia no esta traducido sale en
// español, marcado. Uso: npm run help (lo comprueba test/docs.test.mjs). Los capitulos que salen del codigo (Texto y calculo,
// Funciones y operadores, Iconos) los arma la app en el momento (src/help.js).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chapterHtml, blocks, setDir, setLinks } from './md-html.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
// Orden de la ayuda: los capitulos del manual; null marca donde la app pone los que arma ella (calc, icons, funcs)
export const CHAPTERS = [
  ['conceptos', 'conceptos.md'], ['empezar', '01-empezar.md'], ['guias', 'guias.md'], ['desplegables', 'desplegables.md'], ['dibujar', '02-dibujar.md'], ['seleccionar', '03-seleccionar-y-editar.md'],
  ['dividir', '04-dividir-copiar-y-repetir.md'], ['restricciones', '05-restricciones.md'], ['cotas', '06-cotas.md'],
  ['calc', null], ['icons', null], ['funcs', null],
  ['splines', '08-splines-y-trazados.md'], ['simulaciones', '09-simulaciones-graficas.md'], ['estilo', '10-estilo-capas-y-vista.md'],
  ['archivo', '11-archivo-y-exportacion.md'], ['atajos', '12-atajos-de-teclado.md'], ['limites', '13-limites-conocidos.md'], ['acerca', '14-acerca-de.md'],
];
// Para los enlaces entre capitulos: cada archivo del manual, incluidos los dos que genera el codigo, apunta a su capitulo de la ayuda
setLinks({ ...Object.fromEntries(CHAPTERS.filter(([, f]) => f).map(([id, f]) => [f, id])), '07-texto-y-calculo.md': 'calc', 'funciones.md': 'funcs' });
export const MANUAL_FILES = CHAPTERS.filter(([, f]) => f).map(([, f]) => f);
export const LANGS = ['es', 'en'];

const norm = (s) => s.replace(/\r\n/g, '\n');
export const readDoc = (lang, file) => { const p = ROOT + 'docs/' + (lang === 'es' ? '' : lang + '/') + file; return existsSync(p) ? norm(readFileSync(p, 'utf8')) : null; };
// Resumen del texto en español de un capitulo: el de la traduccion lo guarda en su primera linea («<!-- es: abc123 -->»)
export const esHash = (file) => createHash('sha1').update(readDoc('es', file).trim()).digest('hex').slice(0, 10);
export const srcOf = (md) => /^<!--\s*es:\s*([0-9a-f]{6,})\s*-->/.exec(md)?.[1] || null;

// La presentacion que abre la ayuda: el primer parrafo de docs/README.md (docs/en/README.md en ingles)
export function introOf(lang) {
  const md = readDoc(lang, 'README.md') || readDoc('es', 'README.md');
  const lines = md.split('\n');
  const i = lines.findIndex((l, k) => k > 0 && l.trim() && !/^(#|<!--|\*\[)/.test(l)); // sin el titulo ni la linea que enlaza al otro idioma
  return blocks([lines[i]]);
}

export function buildLang(lang) {
  const out = {}, fallback = [];
  for (const [id, file] of CHAPTERS) {
    if (!file) continue;
    let md = lang === 'es' ? null : readDoc(lang, file), from = lang;
    if (md === null) { md = readDoc('es', file); from = 'es'; }
    if (lang !== 'es' && from === 'es') fallback.push(id);
    setDir(from === 'es' ? ['docs'] : ['docs', from]); // desde donde se resuelven los enlaces «../»
    let html = chapterHtml(md, id);
    if (from !== lang) html = html.replace('</summary>', ' <small>(es)</small></summary>'); // sin traducir: se ve en español
    out[id] = html;
  }
  return { html: out, intro: introOf(lang), fallback };
}
export const moduleText = (lang) => {
  const b = buildLang(lang);
  return `// Generado por tools/build-help.mjs desde docs/ (${lang}). No editar a mano: npm run help.\nexport default ${JSON.stringify({ intro: b.intro, chapters: b.html }, null, 1)};\n`;
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  mkdirSync(ROOT + 'src/help-gen', { recursive: true });
  for (const lang of LANGS) { writeFileSync(ROOT + `src/help-gen/${lang}.js`, moduleText(lang)); const b = buildLang(lang); console.log(`src/help-gen/${lang}.js`, lang === 'es' ? '' : `(sin traducir: ${b.fallback.length ? b.fallback.join(', ') : 'ninguno'})`); }
}
