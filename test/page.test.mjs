// Modo pagina: ajuste de los textos al margen, union de las lineas de un parrafo y formulas que siguen en otra linea con «...».
import assert from 'node:assert/strict';
import { layoutText } from '../src/mathlayout.js';
import { textFrame, shownText, textValue, pageWrap } from '../src/text.js';
import { calcParse, calcSrc, calcStmts } from '../src/tvars.js';
import { newDoc } from '../src/model.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const m = (s) => s.length * 0.5; // cada caracter mide media altura de letra
const texts = (L) => L.prims.filter((p) => p.k === 't');

t('un parrafo largo se parte en los espacios sin pasar del ancho', () => {
  const src = 'uno dos tres cuatro cinco seis siete ocho nueve diez';
  const L = layoutText(src, m, '', { reflow: true, maxW: 10 });
  const tx = texts(L);
  const ys = [...new Set(tx.map((p) => p.y))];
  assert.ok(ys.length >= 3, 'varias lineas');
  assert.ok(L.w <= 10 + 1e-9, 'ancho ' + L.w);
  const all = tx.map((p) => p.s).join(' ').replace(/\s+/g, ' ').trim();
  assert.equal(all, src); // ninguna palabra se pierde ni se repite
  assert.ok(!tx.some((p) => p.s.startsWith(' ') && p.x === 0), 'sin espacio al comienzo de una linea');
});

t('sin ancho, el texto queda en una linea', () => {
  const L = layoutText('uno dos tres cuatro cinco seis', m, '', { reflow: true });
  assert.equal(new Set(texts(L).map((p) => p.y)).size, 1);
});

t('una palabra o formula mas ancha que la linea se sale del margen', () => {
  const L = layoutText('a Supercalifragilisticoespialidoso b', m, '', { reflow: true, maxW: 6 });
  assert.ok(L.w > 6);
  const F = layoutText('x $a+b+c+d+e+f+g+h+i+j+k$ y', m, '', { reflow: true, maxW: 4 });
  assert.ok(F.w > 4);
});

t('una lista ajustada: la viñeta solo en la primera linea y la sangria en todas', () => {
  const L = layoutText('- uno dos tres cuatro cinco seis siete', m, '', { reflow: true, maxW: 9 });
  const tx = texts(L);
  assert.equal(tx.filter((p) => p.s === '•').length, 1);
  const firstX = new Map();
  for (const p of tx) if (p.s !== '•' && !firstX.has(p.y)) firstX.set(p.y, p.x);
  assert.ok(firstX.size >= 2);
  assert.equal(new Set(firstX.values()).size, 1); // todas las lineas arrancan en la misma sangria
});

t('pageWrap: el ancho segun el anclaje y el angulo', () => {
  const doc = { page: { w: 215.9, m: 25, x0: 0 }, pts: { p: { x: 50, y: 0 } }, lines: {} };
  const w = pageWrap(doc, { pt: 'p', h: 5, anchor: 'bl' });
  assert.equal(w.reflow, true);
  assert.ok(Math.abs(w.maxW - (215.9 - 25 - 50) / 5) < 1e-9);
  assert.ok(Math.abs(pageWrap(doc, { pt: 'p', h: 5, anchor: 'br' }).maxW - 25 / 5) < 1e-9);
  assert.ok(Math.abs(pageWrap(doc, { pt: 'p', h: 5, anchor: 'mc' }).maxW - 50 / 5) < 1e-9);
  assert.equal(pageWrap(doc, { pt: 'p', h: 5, anchor: 'bl', ang: 30 }).maxW, undefined); // girado: une lineas pero no ajusta
  assert.equal(pageWrap({ ...doc, page: undefined }, { pt: 'p', h: 5 }), null); // sin limites
});

t('shownText y textFrame: con pagina la caja respeta el margen', () => {
  const doc = { page: { w: 100, m: 10, x0: 0 }, pts: { p: { x: 10, y: 0 } }, lines: {}, texts: {} };
  const tx = { pt: 'p', h: 2, anchor: 'tl', text: 'palabra '.repeat(20).trim() };
  const st = shownText(doc, tx);
  assert.ok(st.wrap);
  const f = textFrame(st, m);
  assert.ok(f.w <= 80 + 1e-9, 'ancho ' + f.w);
  assert.ok(f.hh > 1.5 * 1.2 * 2); // mas de una linea
  const sin = textFrame(shownText({ ...doc, page: undefined }, tx), m);
  assert.ok(sin.w > 80); // «Sin limites»: una sola linea larga
});

t('formula que sigue en la otra linea con «...»: un solo enunciado', () => {
  const s = '$$F: 1 + 2 + ...\n... 3 + 4\nG: F*2 =$$';
  const st = calcStmts(s);
  assert.equal(st.length, 2);
  assert.equal(st[0].name, 'F');
  assert.equal(calcSrc(calcParse(s)), s); // se reescribe tal cual
  const doc = newDoc(), tx = { text: s, pt: 'p', h: 2 };
  doc.pts.p = { x: 0, y: 0 }; doc.texts.a = tx;
  const v = textValue(doc, tx);
  assert.ok(v.includes('...\n... '), v);
  assert.ok(/=\s*20/.test(v), v);
  const s2 = '$$x: 10 -...\n   4 =$$'; // sin «...» al comienzo de la siguiente tambien vale
  assert.equal(calcStmts(s2).length, 1);
});

console.log(`\n${passed} pruebas de pagina pasaron`);
