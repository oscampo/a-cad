// Dibujo generado por scripts: point/line/circle en los textos, reconciliados con el dibujo (gen.js).
import assert from 'node:assert/strict';
import { newDoc, addPoint, addLine, addText, addCon } from '../src/model.js';
import { regenerate, isGen, genSet } from '../src/gen.js';
import { evalExpr } from '../src/expr.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };

const CARA = '$$w:40\nh:30\na:point("A"; 0; 0)\nb:point("B"; w; 0)\nc:point("C"; w; h)\nd:point("D"; 0; h)\nab:line(a; b)\nbc:line(b; c)\ncd:line(c; d)\nda:line(d; a)$$';
function mk(text = CARA) {
  const d = newDoc();
  const anchor = addPoint(d, -100, 100);
  const tid = addText(d, anchor, text, {});
  return { d, tid };
}
const n = (o) => Object.keys(o).length;

t('fuera de la regeneracion, point/line/circle no hacen nada: solo dan el nombre', () => {
  assert.equal(evalExpr('point("A"; 1; 2)', { vars: {}, allowMat: true, allowCplx: true }).str, 'A');
  assert.equal(evalExpr('line("A"; "B")', { vars: {}, allowMat: true, allowCplx: true }).str, 'A-B');
  assert.equal(evalExpr('circle("A"; 3)', { vars: {}, allowMat: true, allowCplx: true }).str, 'o(A)');
});

t('un texto que dibuja: 4 puntos fijos y 4 lineas, gobernados por el script', () => {
  const { d, tid } = mk();
  const r = regenerate(d);
  assert.equal(r.changed, true); assert.deepEqual(r.errs, []);
  const ps = Object.entries(d.pts).filter(([id]) => isGen(d, id));
  assert.equal(ps.length, 4); assert.ok(ps.every(([, p]) => p.fixed === true));
  assert.equal(n(d.lines), 4);
  assert.deepEqual(Object.keys(d.gen.map).filter((k) => k.startsWith(tid + '/A') || k.startsWith(tid + '/D')).sort(), [tid + '/A', tid + '/A|B', tid + '/D', tid + '/A|D'].sort());
  const C = d.pts[d.gen.map[tid + '/C']];
  assert.deepEqual([C.x, C.y], [40, 30]);
  assert.equal(isGen(d, Object.keys(d.pts)[0]), false, 'el punto del texto no es generado');
});

t('regenerar sin cambios no toca nada (mismos ids, nada que resolver)', () => {
  const { d } = mk(); regenerate(d);
  const ids = JSON.stringify(d.gen.map), snap = JSON.stringify([d.pts, d.lines]);
  const r = regenerate(d);
  assert.equal(r.changed, false); assert.equal(JSON.stringify(d.gen.map), ids); assert.equal(JSON.stringify([d.pts, d.lines]), snap);
});

t('parametrico: cambiar w mueve lo generado con los mismos ids', () => {
  const { d, tid } = mk(); regenerate(d);
  const ids = { ...d.gen.map };
  d.texts[tid].text = CARA.replace('w:40', 'w:60');
  const r = regenerate(d);
  assert.equal(r.changed, true);
  assert.deepEqual({ ...d.gen.map }, ids);
  const C = d.pts[ids[tid + '/C']];
  assert.deepEqual([C.x, C.y], [60, 30]);
});

t('las cotas del usuario sobre lo generado siguen ahi tras regenerar', () => {
  const { d, tid } = mk(); regenerate(d);
  const u = addPoint(d, 5, 5);
  const k = addCon(d, { t: 'DIST', refs: [d.gen.map[tid + '/A'], u], v: 10 }); // entre un generado y un punto del usuario: conduce
  d.texts[tid].text = CARA.replace('w:40', 'w:55');
  regenerate(d);
  assert.ok(d.cons[k] && !d.cons[k].ref, 'sigue como cota conductora');
});

t('una cota entre dos cosas generadas pasa sola a ser de referencia; una restriccion geometrica entre ellas sobra', () => {
  const { d, tid } = mk(); regenerate(d);
  const A = d.gen.map[tid + '/A'], B = d.gen.map[tid + '/B'];
  const k = addCon(d, { t: 'DIST', refs: [A, B], v: 40 });
  const h = addCon(d, { t: 'H', refs: [d.gen.map[tid + '/A|B']] });
  const r = regenerate(d);
  assert.equal(d.cons[k].ref, true);
  assert.equal(d.cons[h], undefined);
  assert.ok(r.notes.some((x) => /referencia/.test(x)));
});

t('quitar una llamada quita lo generado; un punto que otros usan queda como un punto normal', () => {
  const { d, tid } = mk(); regenerate(d);
  const D = d.gen.map[tid + '/D'], u = addPoint(d, 9, 9);
  const mine = addLine(d, D, u, {}); // una linea del usuario que usa el punto D
  d.texts[tid].text = CARA.replace('\ncd:line(c; d)', '').replace('\nda:line(d; a)', '').replace('\nd:point("D"; 0; h)', '');
  const r = regenerate(d);
  assert.equal(d.gen.map[tid + '/C|D'], undefined); assert.equal(n(d.lines), 3, 'AB, BC y la del usuario');
  assert.ok(d.lines[mine], 'la linea del usuario se conserva');
  assert.equal(d.pts[D].fixed, false, 'D se suelta');
  assert.equal(isGen(d, D), false);
  assert.ok(r.notes.some((x) => /punto normal/.test(x)));
});

t('un texto con un error no borra lo que ya generaba', () => {
  const { d, tid } = mk(); regenerate(d);
  d.texts[tid].text = CARA.replace('w:40', 'w:40+++');
  const before = n(d.pts) + n(d.lines);
  regenerate(d);
  assert.equal(n(d.pts) + n(d.lines), before);
});

t('borrar el texto borra lo que generaba', () => {
  const { d, tid } = mk(); regenerate(d);
  delete d.texts[tid];
  regenerate(d);
  assert.equal(n(d.lines), 0); assert.equal(Object.keys(d.pts).filter((id) => isGen(d, id)).length, 0); assert.equal(d.gen, undefined);
  assert.equal(n(d.pts), 1, 'solo queda el punto del texto');
});

t('los nombres son locales al texto: dos textos con «A» no chocan', () => {
  const d = newDoc();
  const p1 = addPoint(d, 0, 0), p2 = addPoint(d, 0, 50);
  const t1 = addText(d, p1, '$$a:point("A"; 1; 1)$$', {}), t2 = addText(d, p2, '$$a:point("A"; 7; 7)$$', {});
  regenerate(d);
  assert.deepEqual([d.pts[d.gen.map[t1 + '/A']].x, d.pts[d.gen.map[t2 + '/A']].x], [1, 7]);
});

t('errores claros: linea sin punto, tipo de linea desconocido, punto definido dos veces', () => {
  let { d } = mk('$$a:point("A"; 0; 0)\nl:line(a; "Z")$$'); let r = regenerate(d);
  assert.ok(r.errs.some((e) => /falta un punto/.test(e))); assert.equal(n(d.lines), 0);
  ({ d } = mk('$$a:point("A"; 0; 0)\nb:point("B"; 1; 0)\nl:line(a; b; "zigzag")$$')); r = regenerate(d);
  assert.ok(r.errs.some((e) => /no es un tipo de línea/.test(e)));
  ({ d } = mk('$$a:point("A"; 0; 0)\nb:point("A"; 1; 0)$$')); r = regenerate(d);
  assert.ok(r.errs.some((e) => /dos veces/.test(e)));
});

t('line y circle con tipo de linea; un circulo sigue a su radio', () => {
  const { d, tid } = mk('$$r:5\na:point("O"; 0; 0)\nb:point("P"; 10; 0)\nl:line(a; b; "eje")\nc:circle(a; r)$$'); regenerate(d);
  assert.equal(d.lines[d.gen.map[tid + '/O|P']].ltype, 'eje');
  const cid = d.gen.map[tid + '/o:O#0'];
  assert.equal(d.circles[cid].r, 5);
  d.texts[tid].text = d.texts[tid].text.replace('r:5', 'r:8'); regenerate(d);
  assert.equal(d.circles[cid].r, 8);
});

t('el cambio de un enunciado de aqui no regenera nada si ningun texto dibuja', () => {
  const d = newDoc(); addText(d, addPoint(d, 0, 0), '$$x:1\nx=$$', {});
  assert.deepEqual(regenerate(d), { changed: false, errs: [], notes: [] });
  assert.equal(d.gen, undefined);
});

t('una copia de un elemento generado ya no lo es (otro id)', () => {
  const { d, tid } = mk(); regenerate(d);
  const A = d.gen.map[tid + '/A'], copy = addPoint(d, d.pts[A].x, d.pts[A].y); // lo que haria copiar y pegar
  assert.equal(isGen(d, A), true); assert.equal(isGen(d, copy), false); assert.equal(genSet(d).has(copy), false);
});

console.log(`${passed} pruebas de dibujo generado`);
