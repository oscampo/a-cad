// Extrae los textos en español de la interfaz (index.html y el JavaScript de src/) para el catalogo de idiomas (src/i18n-en.js).
// Uso: node tools/extract-strings.mjs [--json]  ->  lista (o JSON) de los textos que aun no estan en el catalogo.
// No cuenta la ayuda, el manual ni las referencias (help.js, calcref.js, funcref.js), que siguen en español.
import { readFileSync, readdirSync } from 'node:fs';
import { parseAst } from 'rolldown/parseAst';

const SKIP = new Set(['help.js', 'calcref.js', 'funcref.js', 'iconpaths.js', 'icons.js', 'i18n-en.js', 'i18n-ref-en.js', 'i18n.js']);
const STOP = new Set('de la el en para los las con que una un no se del al por o y solo sin más como cada hay ya es son este esta estos esas ese esa todo todas nuevo nueva primero luego antes después entre sobre desde hasta si tiene tienen puede pueden'.split(' '));
const ES_CHAR = /[áéíóúñÁÉÍÓÚÑ¿¡]/;

// Palabras sueltas que no se traducen (nombres propios, teclas, el nombre de cada idioma, tipografias).
const NAMES = new Set(['Español', 'English', 'Enter', 'Escape', 'Space', 'Shift', 'Bearer', 'Verdana', 'Palatino', 'Optima', 'Futura']);
const oneWord = (t) => /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{3,}\s?$/.test(t) && !NAMES.has(t.trim()); // una palabra con mayuscula inicial: «Ancho», «Cotas»
export const looksSpanish = (t) => {
  if (oneWord(t)) return true;
  if (t.length < 3 || /^[\w./#:%-]+$/.test(t) || /^\s*[\w.-]+\s*$/.test(t)) return false;
  if (/^(M|L|C|Z|H|V|A|Q)[\d .,-]+/.test(t) || /^[#@]?[0-9a-f]{3,8}$/i.test(t) || /^<\/?\w/.test(t)) return false;
  if (!/[A-Za-zÁ-ú]{3}/.test(t)) return false;
  if (ES_CHAR.test(t)) return true;
  const words = t.toLowerCase().match(/[a-zá-ú]+/g) || [];
  return words.length >= 2 && words.some((w) => STOP.has(w)) || words.length >= 3;
};

function walk(node, out) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const n of node) walk(n, out); return; }
  if (node.type === 'Literal' && typeof node.value === 'string') out.add(node.value);
  else if (node.type === 'TemplateLiteral') {
    // «texto ${a} mas» -> «texto {0} mas»
    let s = '';
    node.quasis.forEach((q, i) => { s += q.value.cooked ?? q.value.raw; if (i < node.expressions.length) s += '{' + i + '}'; });
    out.add(s);
  }
  for (const k of Object.keys(node)) if (k !== 'type' && k !== 'start' && k !== 'end') walk(node[k], out);
}

export function jsStrings() {
  const all = new Map();
  for (const f of readdirSync(new URL('../src', import.meta.url))) {
    if (!f.endsWith('.js') || SKIP.has(f)) continue;
    const out = new Set();
    walk(parseAst(readFileSync(new URL('../src/' + f, import.meta.url), 'utf8')).body, out);
    for (const s of out) if (looksSpanish(s)) (all.get(s) || all.set(s, []).get(s)).push(f);
  }
  return all;
}

export function htmlStrings() {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  const out = new Set();
  for (const m of html.matchAll(/>([^<>]+)</g)) { const t = m[1].replace(/\s+/g, ' ').trim(); if (looksSpanish(t) || (t.length > 2 && /[A-Za-zÁ-ú]/.test(t) && !/^[\w.-]+$/.test(t))) out.add(t); }
  for (const m of html.matchAll(/(?:title|aria-label|placeholder|data-hint)="([^"]+)"/g)) { const t = m[1].replace(/&[a-z]+;/g, (e) => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"' }[e] || e)); if (/[A-Za-zÁ-ú]{2}/.test(t)) out.add(t); }
  return out;
}

if (process.argv[1] && process.argv[1].endsWith('extract-strings.mjs')) {
  const h = [...htmlStrings()], j = [...jsStrings().keys()];
  if (process.argv.includes('--json')) console.log(JSON.stringify({ html: h, js: j }, null, 1));
  else console.log(`index.html: ${h.length} textos · src/: ${j.length} textos`);
}
