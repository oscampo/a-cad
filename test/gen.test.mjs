// Dibujo generado por scripts: point/line/circle en los textos, reconciliados con el dibujo (gen.js).
import assert from 'node:assert/strict';
import { newDoc, addPoint, addLine, addText, addCon, deleteItems } from '../src/model.js';
import { regenerate, isGen, genSet, genOwners, releaseGen } from '../src/gen.js';
import { evalExpr } from '../src/expr.js';
import { textVars } from '../src/params.js';

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

t('arc: centro y dos extremos a la misma distancia; el radio sale de ahi y sigue al script', () => {
  const T = '$$r:10\no:point("O"; 0; 0)\na:point("A"; r; 0)\nb:point("B"; 0; r)\nx:arc(o; a; b)$$';
  const { d, tid } = mk(T); const e = regenerate(d);
  assert.deepEqual(e.errs, []);
  const id = d.gen.map[tid + '/a:O|A|B'];
  assert.ok(d.arcs[id]); assert.equal(d.arcs[id].r, 10);
  assert.equal(d.arcs[id].a, d.gen.map[tid + '/A']);
  d.texts[tid].text = T.replace('r:10', 'r:14'); regenerate(d);
  assert.equal(d.arcs[id].r, 14); assert.equal(d.pts[d.gen.map[tid + '/B']].y, 14);
});

t('arc: extremos a distancias distintas del centro es un error claro y no dibuja nada', () => {
  const { d } = mk('$$o:point("O"; 0; 0)\na:point("A"; 10; 0)\nb:point("B"; 0; 7)\nx:arc(o; a; b)$$');
  const r = regenerate(d);
  assert.ok(r.errs.some((e) => /misma distancia/.test(e))); assert.equal(Object.keys(d.arcs).length, 0);
});

t('spline: por puntos de point, abierto o cerrado; un punto que falta es un error', () => {
  const T = '$$a:point("A"; 0; 0)\nb:point("B"; 10; 5)\nc:point("C"; 20; 0)\ns:spline(["A", "B", "C"])$$';
  let { d, tid } = mk(T); let r = regenerate(d);
  assert.deepEqual(r.errs, []);
  const sid = d.gen.map[tid + '/s:A|B|C'];
  assert.deepEqual(d.splines[sid].pts, ['A', 'B', 'C'].map((n) => d.gen.map[tid + '/' + n])); assert.equal(!!d.splines[sid].closed, false);
  d.texts[tid].text = T.replace('["A", "B", "C"])', '["A", "B", "C"]; "cerrado"; "eje")');
  regenerate(d);
  const s2 = d.gen.map[tid + '/s:A|B|C|cerrado'];
  assert.equal(d.splines[s2].closed, true); assert.equal(d.splines[s2].ltype, 'eje'); assert.equal(d.splines[sid], undefined, 'el abierto ya no se pide');
  ({ d } = mk('$$a:point("A"; 0; 0)\ns:spline(["A", "Z"])$$')); r = regenerate(d);
  assert.ok(r.errs.some((e) => /falta el punto «Z»/.test(e)));
});

t('spline y arc: llamadas mal formadas', () => {
  const ev = (s) => evalExpr(s, { vars: {}, allowMat: true, allowCplx: true });
  assert.throws(() => ev('spline("A")'), /vector de nombres/);
  assert.throws(() => ev('spline(["A"])'), /al menos 2/);
  assert.throws(() => ev('spline(["A", "B"]; "cerrado")'), /al menos 3/);
  assert.throws(() => ev('arc("O"; 1; "B")'), /el primer extremo/);
  assert.equal(ev('arc("O"; "A"; "B")').str, 'arc(O,A-B)');
});

t('lo generado se borra al quitar el arco o el spline', () => {
  const { d, tid } = mk('$$o:point("O"; 0; 0)\na:point("A"; 5; 0)\nb:point("B"; 0; 5)\nx:arc(o; a; b)\ns:spline(["O", "A", "B"])$$'); regenerate(d);
  assert.equal(Object.keys(d.arcs).length, 1); assert.equal(Object.keys(d.splines).length, 1);
  d.texts[tid].text = '$$o:point("O"; 0; 0)\na:point("A"; 5; 0)\nb:point("B"; 0; 5)$$'; regenerate(d);
  assert.equal(Object.keys(d.arcs).length, 0); assert.equal(Object.keys(d.splines).length, 0);
});

t('un texto que lee una cota de referencia que mide lo que el mismo dibuja: error y lo generado no deriva', () => {
  const d = newDoc();
  const anc = addPoint(d, -100, 100), tid = addText(d, anc, '$$w:D1+10\na:point("A"; 0; 0)\nb:point("B"; w; 0)$$', {});
  d.cons.k0 = { t: 'DIST', refs: [anc, anc], v: 1, ref: true, name: 'D1' };
  regenerate(d);
  const A = d.gen.map[tid + '/A'], B = d.gen.map[tid + '/B'];
  d.cons.k0.refs = [A, B]; // el usuario mide la distancia entre los dos generados
  const x0 = d.pts[B].x;
  for (let i = 0; i < 3; i++) { const r = regenerate(d); assert.ok(r.errs.some((e) => /dependencia circular/.test(e))); }
  assert.equal(d.pts[B].x, x0, 'B ya no se mueve en cada regeneracion');
  d.cons.k0.refs = [addPoint(d, 1, 1), addPoint(d, 4, 5)]; // si la cota ya no mide lo generado, el lazo desaparece
  assert.deepEqual(regenerate(d).errs, []);
});

t('genOwners: de que textos viene lo seleccionado', () => {
  const d = newDoc();
  const t1 = addText(d, addPoint(d, 0, 0), '$$a:point("A"; 1; 1)$$', {}), t2 = addText(d, addPoint(d, 0, 50), '$$a:point("A"; 2; 2)$$', {});
  regenerate(d);
  const A1 = d.gen.map[t1 + '/A'], A2 = d.gen.map[t2 + '/A'], mine = addPoint(d, 9, 9);
  assert.deepEqual(genOwners(d, [{ k: 'pt', id: A1 }]), [t1]);
  assert.deepEqual(genOwners(d, [{ k: 'pt', id: A1 }, { k: 'pt', id: A2 }, { k: 'pt', id: mine }]).sort(), [t1, t2].sort());
  assert.deepEqual(genOwners(d, [{ k: 'pt', id: mine }]), []);
});

t('point(x; y) sin etiqueta: el objeto se llama como la variable', () => {
  const { d, tid } = mk('$$a:point(0; 0)\nb:point(10; 0)\nl:line(a; b)$$');
  assert.deepEqual(regenerate(d).errs, []);
  assert.deepEqual(Object.keys(d.gen.map).sort(), [tid + '/a', tid + '/a|b', tid + '/b']);
  assert.deepEqual([d.pts[d.gen.map[tid + '/b']].x, d.pts[d.gen.map[tid + '/b']].y], [10, 0]);
  // con la etiqueta de siempre sigue valiendo
  const o = mk('$$a:point("A"; 1; 2)$$'); regenerate(o.d);
  assert.deepEqual([o.d.pts[o.d.gen.map[o.tid + '/A']].x, o.d.pts[o.d.gen.map[o.tid + '/A']].y], [1, 2]);
});

t('varios objetos en un enunciado: el 1.o lleva el nombre de la variable y los demas «nombre#n»; una funcion llamada dos veces no choca', () => {
  let { d, tid } = mk('$$v:seq(point(0; 0); point(1; 0); point(2; 0))$$'); regenerate(d);
  assert.deepEqual(Object.keys(d.gen.map).sort(), [tid + '/v', tid + '/v#2', tid + '/v#3']);
  ({ d, tid } = mk('$$f(x):point(x; 0)\nc1:f(1)\nc2:f(5)$$')); const r = regenerate(d);
  assert.deepEqual(r.errs, []);
  assert.equal(d.pts[d.gen.map[tid + '/c1']].x, 1); assert.equal(d.pts[d.gen.map[tid + '/c2']].x, 5);
});

t('propiedades de la variable: p.x, p.y, l.L, l.ang, c.r, c.d, calculadas de lo que pidio el script', () => {
  const { d } = mk('$$a:point(3; 4)\nb:point(6; 8)\nl:line(a; b)\nc:circle(a; 2)\nax:a.x\nay:a.y\nll:l.L\nll2:l.len\ndir:l.ang\nrr:c.r\ndd:c.d\ncx:c.x$$');
  const v = textVars(d).vals;
  assert.equal(v.ax.v, 3); assert.equal(v.ay.v, 4);
  assert.ok(Math.abs(v.ll.v - 5) < 1e-12); assert.ok(Math.abs(v.ll2.v - 5) < 1e-12);
  assert.ok(Math.abs(v.dir.v - Math.atan2(4, 3)) < 1e-12);
  assert.equal(v.rr.v, 2); assert.equal(v.dd.v, 4); assert.equal(v.cx.v, 3);
});

t('las propiedades siguen a la variable al redefinirla y no existen antes de definirla', () => {
  const { d } = mk('$$a:point(1; 1)\nb:a.x\na:point(5; 5)\nc:a.x$$');
  const v = textVars(d).vals;
  assert.equal(v.b.v, 1); assert.equal(v.c.v, 5);
});

t('una variable de texto manda sobre un elemento del dibujo con ese nombre (p1.x)', () => {
  const d = newDoc();
  const mine = addPoint(d, 99, 99); // su id es p1
  assert.equal(mine, 'p1');
  addText(d, addPoint(d, -50, 50), '$$p1:point(5; 7)\nq:p1.x$$', {});
  assert.equal(textVars(d).vals.q.v, 5);
});

t('las propiedades funcionan aunque el dibujo no se haya regenerado, y no hay lazo con una cota que las lea', () => {
  const { d } = mk('$$w:20\na:point(0; 0)\nb:point(w; 0)\nl:line(a; b)\nk:l.L$$');
  assert.equal(textVars(d).vals.k.v, 20); // sin regenerar: el dibujo no tiene nada aun
  assert.equal(Object.keys(d.pts).length, 1);
});

t('Soltar: lo seleccionado deja de ser generado, se puede mover y regenerar no lo crea de nuevo ni lo mueve', () => {
  const { d, tid } = mk(); regenerate(d);
  const A = d.gen.map[tid + '/A'], AB = d.gen.map[tid + '/A|B'];
  const nPts = n(d.pts), nLines = n(d.lines);
  assert.equal(releaseGen(d, [{ k: 'pt', id: A }, { k: 'ln', id: AB }]), 2);
  assert.equal(isGen(d, A), false); assert.equal(isGen(d, AB), false);
  assert.equal(d.pts[A].fixed, false, 'el punto soltado se puede mover');
  d.pts[A].x = 7; d.pts[A].y = 9; // el usuario lo mueve
  const r = regenerate(d);
  assert.deepEqual(r.errs, []);
  assert.equal(n(d.pts), nPts); assert.equal(n(d.lines), nLines, 'no se duplica nada');
  assert.deepEqual([d.pts[A].x, d.pts[A].y], [7, 9], 'el script ya no lo manda');
  assert.equal(d.lines[AB].a === A || d.lines[AB].b === A, true, 'la linea soltada sigue usando el punto');
  assert.equal(isGen(d, d.gen.map[tid + '/B']), true, 'lo no seleccionado sigue generado');
});

t('Soltar: un punto soltado sigue de extremo de lo que el script aun dibuja', () => {
  const { d, tid } = mk(); regenerate(d);
  const A = d.gen.map[tid + '/A'];
  releaseGen(d, [{ k: 'pt', id: A }]);
  d.pts[A].x = 3;
  const r = regenerate(d);
  assert.deepEqual(r.errs, []); assert.deepEqual(r.notes, []);
  const da = d.lines[d.gen.map[tid + '/A|D']];
  assert.ok(da.a === A || da.b === A);
});

t('Soltar: las cotas del usuario y el texto se quedan como estaban', () => {
  const { d, tid } = mk(); regenerate(d);
  const A = d.gen.map[tid + '/A'], B = d.gen.map[tid + '/B'];
  const k = addCon(d, { t: 'DIST', refs: [A, B], v: 40 });
  const text = d.texts[tid].text;
  releaseGen(d, [{ k: 'pt', id: A }, { k: 'pt', id: B }]);
  regenerate(d);
  assert.ok(d.cons[k]); assert.equal(d.texts[tid].text, text);
});

t('Soltar: si el script deja de llamarlo, la llave soltada se olvida y el elemento queda normal', () => {
  const { d, tid } = mk(); regenerate(d);
  const A = d.gen.map[tid + '/A'];
  releaseGen(d, [{ k: 'pt', id: A }]);
  assert.ok(d.gen.rel[tid + '/A']);
  d.texts[tid].text = d.texts[tid].text.replace('a:point("A"; 0; 0)\n', 'a:point("Z"; 0; 0)\n');
  regenerate(d);
  assert.equal(d.gen.rel?.[tid + '/A'], undefined, 'la llave soltada se olvida');
  assert.ok(d.pts[A], 'el elemento sigue ahi, normal');
});

t('Soltar: borrar el elemento soltado lo hace volver a generarse si el script aun lo llama', () => {
  const { d, tid } = mk(); regenerate(d);
  const A = d.gen.map[tid + '/A'];
  releaseGen(d, [{ k: 'pt', id: A }]);
  const lines = Object.entries(d.lines).filter(([, l]) => l.a === A || l.b === A).map(([id]) => ({ k: 'ln', id }));
  deleteItems(d, [...lines, { k: 'pt', id: A }]);
  regenerate(d);
  assert.ok(d.gen.map[tid + '/A'] && d.pts[d.gen.map[tid + '/A']], 'el script lo vuelve a crear');
});

t('Soltar sin nada generado no hace nada', () => {
  const d = newDoc();
  assert.equal(releaseGen(d, [{ k: 'pt', id: 'p1' }]), 0);
});

console.log(`${passed} pruebas de dibujo generado`);
