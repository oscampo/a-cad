// Compara un ejemplo guardado desde la app (con tus ajustes) con lo que genera tools/build-guide-examples.mjs, para pasar esos ajustes al script.
// Uso: npm run examples:diff -- ruta/al/guardado.json [nombre-del-ejemplo]   (el nombre se toma del archivo si coincide; el idioma, de «.en»)
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { buildDoc, EXAMPLE_NAMES } from './build-guide-examples.mjs';

const [file, nameArg] = process.argv.slice(2);
if (!file) { console.error('Uso: npm run examples:diff -- guardado.json [nombre]\nEjemplos: ' + EXAMPLE_NAMES.join(', ')); process.exit(2); }
const base = basename(file).replace(/\.json$/, '');
const lang = base.endsWith('.en') ? 'en' : 'es';
const name = nameArg || base.replace(/\.en$/, '');
const saved = JSON.parse(readFileSync(file, 'utf8'));
const mine = await buildDoc(name, lang);

const COLS = ['pts', 'lines', 'circles', 'arcs', 'ellipses', 'splines', 'texts', 'cons', 'hatches', 'layers', 'ltypes'];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const brief = (v) => { const s = JSON.stringify(v) ?? '(sin valor)'; return s.length > 110 ? s.slice(0, 107) + '...' : s; };
const round = (v) => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v);
let n = 0;
const out = (s) => { n++; console.log(s); };

for (const col of COLS) {
  const A = mine.doc[col] || {}, B = saved.doc?.[col] || {};
  for (const id of Object.keys(B)) {
    if (!(id in A)) { out(`+ ${col}.${id}  ${brief(B[id])}`); continue; }
    const fa = A[id], fb = B[id];
    if (typeof fb !== 'object' || fb === null) { if (!same(fa, fb)) out(`~ ${col}.${id}  ${brief(fa)} -> ${brief(fb)}`); continue; }
    for (const k of new Set([...Object.keys(fa), ...Object.keys(fb)])) {
      if (k === 'ts' || k === 'id') continue; // sellos de creacion
      if (!same(round(fa[k]), round(fb[k]))) out(`~ ${col}.${id}.${k}  ${brief(fa[k])} -> ${brief(fb[k])}`);
    }
  }
  for (const id of Object.keys(A)) if (!(id in B)) out(`- ${col}.${id}  ${brief(A[id])}`);
}
if (!same(mine.view, saved.view)) out(`~ view  ${brief(mine.view)} -> ${brief(saved.view)}${saved.view ? '' : '   (el guardado no lleva «view»: la app no sabe que encender; el script lo calcula)'}`);
console.log(n ? `\n${n} diferencias en «${name}» (${lang}). + lo que agregaste, - lo que quitaste, ~ lo que cambiaste.` : `Sin diferencias con lo que genera el script para «${name}» (${lang}).`);
