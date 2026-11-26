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

// ---- puntos del dibujo (del usuario) como extremos de lo que dibuja el script
function mkU(body) { // un punto del usuario (p1) y un texto que dibuja
  const d = newDoc();
  const u = addPoint(d, 5, 5);
  const tid = addText(d, addPoint(d, -50, 50), '$$w:30\npto2:point(p1.x + w; p1.y)\n' + body + '$$', {});
  return { d, u, tid };
}
const linesOf = (d, id) => Object.values(d.lines).filter((l) => l.a === id || l.b === id);

t('line(p1; pto2): un punto del dibujo es extremo de una linea generada', () => {
  const { d, u, tid } = mkU('s1:line(p1; pto2)');
  const r = regenerate(d);
  assert.deepEqual(r.errs, []);
  assert.equal(linesOf(d, u).length, 1);
  assert.equal(isGen(d, u), false, 'el punto del usuario no pasa a ser generado');
  assert.equal(d.pts[u].fixed || false, false, 'ni se fija');
  assert.ok(linesOf(d, d.gen.map[tid + '/pto2']).length === 1);
});

t('tambien entre comillas, y con los extremos al reves', () => {
  const { d, u } = mkU('s1:line("p1"; "pto2")');
  assert.deepEqual(regenerate(d).errs, []); assert.equal(linesOf(d, u).length, 1);
  const g = mkU('s1:line(pto2; p1)');
  assert.deepEqual(regenerate(g.d).errs, []); assert.equal(linesOf(g.d, g.u).length, 1);
});

t('el punto del usuario se puede mover: la linea lo sigue y regenerar no lo toca ni duplica la linea', () => {
  const { d, u, tid } = mkU('s1:line(p1; pto2)');
  regenerate(d);
  const ids = JSON.stringify(d.gen.map);
  d.pts[u].x = 9; d.pts[u].y = 11;
  const r = regenerate(d);
  assert.deepEqual(r.errs, []);
  assert.equal(n(d.lines), 1); assert.equal(JSON.stringify(d.gen.map), ids);
  assert.deepEqual([d.pts[u].x, d.pts[u].y], [9, 11]);
  assert.deepEqual([d.pts[d.gen.map[tid + '/pto2']].x, d.pts[d.gen.map[tid + '/pto2']].y], [39, 11], 'pto2 lee p1.x y p1.y: sigue al punto');
});

t('quitar la llamada borra la linea pero no el punto del usuario', () => {
  const { d, u, tid } = mkU('s1:line(p1; pto2)');
  regenerate(d);
  d.texts[tid].text = d.texts[tid].text.replace('s1:line(p1; pto2)', '');
  regenerate(d);
  assert.equal(n(d.lines), 0); assert.ok(d.pts[u]);
});

t('borrar el punto del usuario: la linea se va con el, el texto queda con su error (ya no existe p1) y no se rompe nada', () => {
  const { d, u, tid } = mkU('s1:line(p1; pto2)');
  regenerate(d);
  deleteItems(d, [{ k: 'pt', id: u }]);
  assert.doesNotThrow(() => regenerate(d));
  assert.equal(n(d.lines), 0);
  assert.ok(textVars(d).errs.size >= 1 || textVars(d).bad?.size >= 1, 'el texto avisa: ' + tid);
});

t('circle con el centro en un punto del dibujo; y spline con puntos del dibujo', () => {
  const a = mkU('c1:circle(p1; 3)');
  assert.deepEqual(regenerate(a.d).errs, []);
  const o = Object.values(a.d.circles); assert.equal(o.length, 1); assert.equal(o[0].c, a.u);
  const b = mkU('q:point(w; 20)\nsp:spline(["p1", "pto2", "q"])');
  assert.deepEqual(regenerate(b.d).errs, []);
  assert.equal(Object.values(b.d.splines).length, 1);
  const c = mkU('q:point(w; 20)\nsp:spline([p1, pto2, q])');
  assert.deepEqual(regenerate(c.d).errs, []);
  assert.equal(Object.values(c.d.splines).length, 1);
});

t('una variable del texto con ese nombre manda sobre el punto del dibujo', () => {
  const d = newDoc(); const u = addPoint(d, 5, 5); // p1
  const tid = addText(d, addPoint(d, -50, 50), '$$p1:point(20; 20)\nq:point(30; 20)\ns:line(p1; q)$$', {});
  assert.deepEqual(regenerate(d).errs, []);
  assert.equal(linesOf(d, u).length, 0, 'la linea usa el p1 generado, no el del usuario');
  assert.equal(n(d.lines), 1); assert.ok(d.gen.map[tid + '/p1']);
});

t('fuera de line/circle/arc/spline, un punto del dibujo no es una variable (sigue dando error)', () => {
  assert.throws(() => evalExpr('p1 + 1', { vars: { 'p1.x': { v: 5, r: false }, 'p1.y': { v: 5, r: false } }, allowMat: true, allowCplx: true }), /No reconozco/);
});

// ---- un punto de OTRO texto: la variable que lo guarda lleva su texto de origen (sin prefijos ni ids)
function mkMulti(...bodies) {
  const d = newDoc(); const u = addPoint(d, 5, 5); // p1 del usuario
  const ids = bodies.map((b, i) => addText(d, addPoint(d, -50, 50 - 10 * i), '$$' + b + '$$', {}));
  return { d, u, ids };
}

t('una linea usa, por su variable, un punto que genero otro texto (y uno del usuario)', () => {
  const { d, u, ids } = mkMulti('pto2:point(p1.x + 30; p1.y)', 'pto3:point(pto2.x; pto2.y + 40)', 's1:line(p1; pto2)', 's2:line(pto2; pto3)');
  const r = regenerate(d);
  assert.deepEqual(r.errs, []);
  assert.equal(n(d.lines), 2);
  assert.equal(linesOf(d, u).length, 1);
  assert.equal(linesOf(d, d.gen.map[ids[0] + '/pto2']).length, 2);
});

t('dos textos con el mismo nombre de punto: la variable dice cual es, sin adivinar', () => {
  const { d, ids } = mkMulti('a1:point("A"; 1; 1)', 'a2:point("A"; 5; 5)', 'b:point("B"; 9; 9)\nl:line(a2; b)\nm:line(a1; b)');
  const r = regenerate(d);
  assert.deepEqual(r.errs, []);
  assert.equal(n(d.lines), 2);
  const A1 = d.gen.map[ids[0] + '/A'], A2 = d.gen.map[ids[1] + '/A'], B = d.gen.map[ids[2] + '/B'];
  assert.ok(A1 && A2 && A1 !== A2);
  assert.equal(linesOf(d, A1).length, 1); assert.equal(linesOf(d, A2).length, 1); assert.equal(linesOf(d, B).length, 2);
});

t('por nombre entre comillas sigue siendo local al texto: usar el de otro texto da el aviso de siempre', () => {
  const { d } = mkMulti('a1:point("A"; 1; 1)', 'b:point("B"; 9; 9)\nl:line("A"; "B")');
  const r = regenerate(d);
  assert.ok(r.errs.some((e) => /falta un punto/.test(e)), r.errs.join(' | '));
  assert.equal(n(d.lines), 0);
});

t('el punto de otro texto sigue al script que lo genera; quitar la linea no toca el punto', () => {
  const { d, ids } = mkMulti('w:30\npto2:point(w; 0)', 's1:line(p1; pto2)');
  regenerate(d);
  const P2 = d.gen.map[ids[0] + '/pto2'];
  d.texts[ids[0]].text = d.texts[ids[0]].text.replace('w:30', 'w:50');
  regenerate(d);
  assert.equal(d.pts[P2].x, 50); assert.equal(n(d.lines), 1);
  d.texts[ids[1]].text = '$$$$';
  regenerate(d);
  assert.equal(n(d.lines), 0); assert.ok(d.pts[P2]);
});

t('circle y arc con puntos de otros textos', () => {
  const { d } = mkMulti('o:point(0; 0)', 'a:point(4; 0)\nb:point(0; 4)', 'c1:circle(o; 3)\nar:arc(o; a; b)');
  const r = regenerate(d);
  assert.deepEqual(r.errs, []);
  assert.equal(Object.keys(d.circles).length, 1); assert.equal(Object.keys(d.arcs).length, 1);
});

// ---- funciones que dibujan: «r:f(x)» hace de r un objeto (lo que la funcion devuelve); lo que crea por dentro se llama «r.nombre-local»
function mkFn(fnBody, ...calls) { // un texto de funcion (script «%f(x):») y textos con llamadas, en orden de lectura; un punto del usuario (p1)
  const d = newDoc(); const u = addPoint(d, 5, 5);
  const ids = [addText(d, addPoint(d, -50, 50), '%' + fnBody, {}), ...calls.map((c, i) => addText(d, addPoint(d, -50, 30 - 20 * i), '$$' + c + '$$', {}))];
  return { d, u, ids };
}
const F2 = 'f(x):\n  pa := point(x, 0)\n  pb := point(x, 5)\n  line(pa, pb)';

t('una funcion que dibuja: lo de dentro se llama «r.pa», «r.pb» y r es lo que devuelve; dos llamadas no chocan', () => {
  const { d, ids } = mkFn(F2, 'r:f(1)\ns:f(2)\nk:r.L');
  const r = regenerate(d);
  assert.deepEqual(r.errs, []);
  const keys = Object.keys(d.gen.map).map((k) => k.split('/')[1]).sort();
  assert.deepEqual(keys, ['r.pa', 'r.pb', 'r.pa|r.pb', 's.pa', 's.pb', 's.pa|s.pb'].sort());
  assert.equal(n(d.lines), 2);
  assert.equal(textVars(d).vals.k.v, 5, 'r es la linea que devuelve la funcion');
});

t('dentro de la funcion, una variable local que guarda un punto tiene sus propiedades (pto2.x)', () => {
  const { d } = mkFn('f(x):\n  a := point(x, 1)\n  b := point(a.x + 10, a.y + 5)\n  line(a, b)', 'r:f(3)');
  assert.deepEqual(regenerate(d).errs, []);
  const pts = Object.values(d.gen.map).map((id) => d.pts[id]).filter(Boolean);
  assert.ok(pts.some((p) => p.x === 13 && p.y === 6));
});

t('un punto del dibujo como argumento de la funcion: p.x y p.y dentro (tambien uno generado)', () => {
  const { d, u, ids } = mkFn('g(p):\n  q := point(p.x + 10, p.y)\n  line(p, q)', 'a:point(0; 0)\nr:g(p1)\ns:g(a)');
  const r = regenerate(d);
  assert.deepEqual(r.errs, []);
  assert.equal(n(d.lines), 2);
  assert.equal(linesOf(d, u).length, 1, 'g(p1): la linea parte del punto del usuario');
  const q = d.pts[d.gen.map[ids[1] + '/r.q']];
  assert.deepEqual([q.x, q.y], [15, 5]);
});

t('en un for dentro de la funcion, el mismo nombre local cuenta aparte: r.p, r.p#2', () => {
  const { d } = mkFn('h(n):\n  for(i; 1..n; p:point(i; 0))', 'r:h(3)');
  assert.deepEqual(regenerate(d).errs, []);
  const keys = Object.keys(d.gen.map).map((k) => k.split('/')[1]).sort();
  assert.deepEqual(keys, ['r.p', 'r.p#2', 'r.p#3']);
});

t('un enunciado con «=» que llama a una funcion que dibuja: no genera y avisa que se asigne', () => {
  const { d } = mkFn(F2, 'f(1)=');
  const r = regenerate(d);
  assert.equal(Object.keys(d.gen?.map || {}).length, 0);
  assert.ok(r.notes.some((m) => /solo muestra/.test(m)), r.notes.join(' | '));
});

t('un punto del dibujo fuera de line/circle/arc/spline y de una funcion propia sigue sin ser variable', () => {
  assert.throws(() => evalExpr('p1 + 1', { vars: { 'p1.x': { v: 5, r: false }, 'p1.y': { v: 5, r: false } }, allowMat: true, allowCplx: true }), /No reconozco/);
});

// ---- los miembros de lo que una funcion dibujo: «rect:f(x)» → rect.pto2 (el punto) y rect.pto2.x (su coordenada)
const FM = 'm(p):\n  w := 30\n  pto2 := point(p.x + w, p.y)\n  pto3 := point(pto2.x, pto2.y + 40)\n  line(pto2, pto3)';

t('rect.pto2, rect.pto2.x y rect.L: se leen los objetos que la funcion dibujo y lo que devuelve', () => {
  const { d } = mkFn(FM, 'rect:m(p1)', 'a:rect.pto2.x\nb:rect.pto3.y\nc:rect.L');
  assert.deepEqual(regenerate(d).errs, []);
  const v = textVars(d).vals;
  assert.equal(v.a.v, 35); assert.equal(v.b.v, 45); assert.equal(v.c.v, 40);
});

t('un miembro se usa como argumento: line(rect.pto2; q) y funciones propias', () => {
  const { d } = mkFn(FM, 'rect:m(p1)', 'q:point(0; 0)\nl:line(rect.pto2; q)');
  assert.deepEqual(regenerate(d).errs, []);
  assert.equal(n(d.lines), 2);
  const ids = Object.values(d.gen.map);
  const rp2 = d.gen.map[Object.keys(d.gen.map).find((k) => k.endsWith('/rect.pto2'))];
  assert.equal(linesOf(d, rp2).length, 2, 'rect.pto2 es extremo de la linea de la funcion y de la nueva');
});

t('solo los objetos dibujados son miembros: los numeros locales (w) siguen siendo locales', () => {
  const { d } = mkFn(FM, 'rect:m(p1)', 'k:rect.w');
  regenerate(d);
  assert.ok(textVars(d).errs.size >= 1 && /rect/.test([...textVars(d).errs.values()].join(' ')));
});

t('los miembros siguen al script: cambiar el parametro mueve rect.pto2.x', () => {
  const { d, ids } = mkFn(FM, 'rect:m(p1)', 'a:rect.pto2.x');
  regenerate(d);
  d.texts[ids[0]].text = d.texts[ids[0]].text.replace('w := 30', 'w := 50');
  assert.deepEqual(regenerate(d).errs, []);
  assert.equal(textVars(d).vals.a.v, 55);
});

t('dos llamadas con nombres distintos: cada una tiene sus miembros (rect.pto2 y rect2.pto2)', () => {
  const { d } = mkFn(FM, 'rect:m(p1)\nrect2:m(p1)', 'a:rect.pto2.x + rect2.pto3.y');
  assert.deepEqual(regenerate(d).errs, []);
  assert.equal(textVars(d).vals.a.v, 35 + 45);
});

t('una funcion que no dibuja, o una asignacion normal, no crea miembros', () => {
  const { d } = mkFn('g(x):\n  y := x * 2\n  y', 'r:g(4)', 'k:r.y');
  regenerate(d);
  assert.ok(textVars(d).errs.size >= 1);
});

t('las propiedades de un miembro: .x .y de un punto y .L .len .ang de una linea (tambien de varias letras)', () => {
  const FL = 'm(p):\n  a := point(p.x, p.y)\n  b := point(p.x + 3, p.y + 4)\n  s := line(a, b)';
  const { d } = mkFn(FL, 'r:m(p1)', 'x1:r.a.x', 'y1:r.b.y', 'l1:r.s.L', 'l2:r.s.len', 'l3:r.s.len + 1', 'ang1:r.s.ang'); // un texto por enunciado: uno de varias lineas se extiende hacia arriba y pasaria antes en el orden de lectura
  assert.deepEqual(regenerate(d).errs, []);
  const st = textVars(d), v = st.vals;
  assert.deepEqual([...st.errs], []);
  assert.equal(v.x1.v, 5); assert.equal(v.y1.v, 9); assert.equal(v.l1.v, 5); assert.equal(v.l2.v, 5); assert.equal(v.l3.v, 6);
  assert.ok(Math.abs(v.ang1.v - Math.atan2(4, 3)) < 1e-12 && v.ang1.r === true, 'el angulo va en radianes');
});

t('evalExpr: nombre.miembro.propiedad con propiedades de una y de varias letras', () => {
  const num = (v) => ({ v, r: false });
  const vars = { 'r.s': { str: 'a-b', gen: { k: 'ln', a: { k: 'pt', x: 0, y: 0 }, b: { k: 'pt', x: 3, y: 4 } } }, 'r.s.L': num(5), 'r.s.len': num(5), 'r.s.ang': { v: 1, r: true } };
  for (const [e, want] of [['r.s.L', 5], ['r.s.len', 5], ['r.s.ang', 1], ['r.s.len + 1', 6]]) assert.equal(evalExpr(e, { vars, allowMat: true, allowCplx: true }).value, want, e);
});

t('un punto del dibujo como primer argumento de una funcion propia admite la coma como separador (f(p5, 30, 10))', () => {
  const d = newDoc();
  const P = addPoint(d, 5, 5);
  addText(d, addPoint(d, 0, 100), '%caja(p, w, h):\n  q:point(p.x+w, p.y)\n  r:point(p.x+w, p.y+h)\n  s1:line(p, q)\n  s2:line(q, r)', {});
  const calls = [`k:caja(${P}, 30, 10)`, `k:caja(${P}; 30; 10)`];
  for (const call of calls) {
    const dd = JSON.parse(JSON.stringify(d));
    addText(dd, addPoint(dd, 0, 50), '$$' + call + '$$', {});
    const st = textVars(dd), r = regenerate(dd);
    assert.deepEqual([...st.errs], [], call);
    assert.deepEqual(r.errs, [], call);
    assert.equal(Object.keys(dd.lines).length, 2, call);
  }
});

console.log(`${passed} pruebas de dibujo generado`);
