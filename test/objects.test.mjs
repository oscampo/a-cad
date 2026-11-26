// Objetos del dibujo como valores en los scripts: pasar una linea, un arco, un circulo, un spline o un grupo de contorno a una funcion propia,
// typeof/isa, los puntos de un elemento por su papel (e.a.x, e.c.y), k1.n y k1_i (la topologia viene de topo.js, la misma del arbol).
import assert from 'node:assert/strict';
import { newDoc, addPoint, addLine, addArc, addCircle, addEllipse, addSpline, addText, addCtr } from '../src/model.js';
import { textVars } from '../src/params.js';
import { regenerate } from '../src/gen.js';
import { readFileSync } from 'node:fs';
import { elementPoints, elementValue, kindOfId } from '../src/topo.js';
import { buildTree } from '../src/tree.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };

function mk() {
  const d = newDoc();
  const p = [addPoint(d, 0, 0), addPoint(d, 10, 0), addPoint(d, 10, 10), addPoint(d, 0, 10)];
  const l = [addLine(d, p[0], p[1]), addLine(d, p[1], p[2]), addLine(d, p[2], p[3])];
  const c0 = addPoint(d, 0, 5), a1 = addArc(d, c0, p[3], p[0], 5, {});
  const o = addPoint(d, 20, 20), ci = addCircle(d, o, 3);
  const sp = [addPoint(d, 30, 0), addPoint(d, 35, 5), addPoint(d, 40, 0)];
  const s = addSpline(d, sp, {});
  const e = addEllipse(d, addPoint(d, 50, 0), addPoint(d, 55, 0), addPoint(d, 50, 2), {});
  const { id: k } = addCtr(d, [...l.map((id) => ({ k: 'ln', id })), { k: 'ar', id: a1 }], 'perfil');
  return { d, p, l, a1, ci, s, sp, e, k, c0, o };
}
// evalua `call` en un texto debajo de las funciones que se den; devuelve { err, vars }
function run(d, fns, call) {
  const dd = JSON.parse(JSON.stringify(d));
  addText(dd, addPoint(dd, 0, 200), fns, {});
  addText(dd, addPoint(dd, 0, 100), '$$' + call + '$$', {});
  const st = textVars(dd);
  const win = [...st.win.values()].find((w) => w.name === 'r');
  return { err: [...st.errs.values()].join(' | '), val: st.vals?.r, win };
}
const TYPES = '%tipo(x):\n  typeof(x)';

t('la topologia es la del arbol: papel y punto de cada elemento', () => {
  const { d, l, a1, ci, s } = mk();
  assert.deepEqual(elementPoints(d, 'ln', l[0]).map((q) => q.role + ':' + q.label), ['a:A:', 'b:B:']);
  assert.deepEqual(elementPoints(d, 'ar', a1).map((q) => q.role), ['c', 'a', 'b']);
  assert.deepEqual(elementPoints(d, 'ci', ci).map((q) => q.role), ['c']);
  assert.deepEqual(elementPoints(d, 'sp', s).map((q) => q.role), ['p1', 'p2', 'p3']);
  // el arbol muestra los mismos puntos bajo cada elemento
  const flat = (ns) => ns.flatMap((n) => [n, ...flat(n.children || [])]);
  const nodes = flat(buildTree(d));
  const lineNode = nodes.find((n) => n.sel?.k === 'ln' && n.sel.id === l[0]);
  assert.deepEqual(lineNode.children.filter((c) => c.sel?.k === 'pt').map((c) => c.sel.id), elementPoints(d, 'ln', l[0]).map((q) => q.id));
});

t('elementValue: una linea lleva a y b como valores de punto; un grupo lleva n, L y la lista de sus miembros', () => {
  const { d, l, p, k } = mk();
  const v = elementValue(d, l[1]);
  assert.equal(v.k, 'ln'); assert.deepEqual([v.a.x, v.a.y, v.b.x, v.b.y], [10, 0, 10, 10]);
  assert.equal(v.a.id, p[1]);
  const g = elementValue(d, k, (id, pr) => (pr === 'L' ? { v: 99 } : null));
  assert.equal(g.k, 'ct'); assert.equal(g.n, 4); assert.equal(g.list.length, 4); assert.equal(g.L, 99);
  assert.equal(kindOfId(d, k), 'ct'); assert.equal(elementValue(d, 'zz9'), null);
});

t('typeof: punto, linea, arco, circulo, elipse, spline, contorno, numero, cadena y matriz', () => {
  const { d, p, l, a1, ci, e, s, k } = mk();
  const cases = [[p[0], 'point'], [l[0], 'line'], [a1, 'arc'], [ci, 'circle'], [e, 'ellipse'], [s, 'spline'], [k, 'contour']];
  for (const [id, want] of cases) { const r = run(d, TYPES, `r:tipo(${id})`); assert.equal(r.err, '', id + ': ' + r.err); assert.equal(r.val?.str ?? r.win?.value, want, id); }
  for (const [expr, want] of [['3', 'number'], ['"hola"', 'string'], ['[1,2;3,4]', 'matrix']]) { const r = run(d, TYPES, `r:tipo(${expr})`); assert.equal(r.err, '', expr + ': ' + r.err); assert.equal(r.val?.str ?? r.val, want, expr); }
});

t('isa(x; "tipo") da 1 o 0', () => {
  const { d, l } = mk();
  const F = '%es(x):\n  isa(x; "line")';
  assert.equal(run(d, F, `r:es(${l[0]})`).val?.v ?? run(d, F, `r:es(${l[0]})`).val, 1);
  assert.equal(run(d, F, 'r:es(5)').val?.v ?? run(d, F, 'r:es(5)').val, 0);
});

t('una linea llega a una funcion propia: l.a.x, l.b.y, l.len', () => {
  const { d, l } = mk();
  const F = '%f(o):\n  o.a.x + 10*o.b.y + 100*o.len';
  const r = run(d, F, `r:f(${l[1]})`);   // a = (10,0), b = (10,10), len = 10
  assert.equal(r.err, '');
  assert.equal(r.val?.v ?? r.val, 10 + 100 + 1000);
});

t('un arco y un circulo: papeles c, a, b y c; y la propiedad r', () => {
  const { d, a1, ci } = mk();
  const A = run(d, '%f(o):\n  o.c.y + o.a.y + o.b.y + o.r', `r:f(${a1})`);   // c=(0,5), a=(0,10), b=(0,0), r=5
  assert.equal(A.err, ''); assert.equal(A.val?.v ?? A.val, 5 + 10 + 0 + 5);
  const C = run(d, '%f(o):\n  o.c.x + o.d', `r:f(${ci})`);                   // c=(20,20), d=6
  assert.equal(C.err, ''); assert.equal(C.val?.v ?? C.val, 26);
});

t('un spline: s.n y s_i', () => {
  const { d, s } = mk();
  const F = '%f(s):\n  q:s_2\n  q.x + s.n*100 + s_3.y';
  const r = run(d, F, `r:f(${s})`);   // s_2 = (35,5); n = 3; s_3 = (40,0)
  assert.equal(r.err, ''); assert.equal(r.val?.v ?? r.val, 35 + 300 + 0);
});

t('un grupo de contorno: k.n, k_i.len y e:k_i con sus puntos; se recorre con un for', () => {
  const { d, k } = mk();
  const F = '%f(k):\n  t:0\n  for i in 1..k.n:\n    o:k_i\n    t:t+o.a.x\n  t';
  const r = run(d, F, `r:f(${k})`);
  assert.equal(r.err, '', r.err);
  assert.equal(r.val?.v ?? r.val, 20); // suma de a.x de sus 4 miembros: 0 + 10 + 10 + 0
  const N = run(d, '%f(k):\n  k.n', `r:f(${k})`);
  assert.equal(N.val?.v ?? N.val, 4);
  const L = run(d, '%f(k):\n  k_1.len + k_2.len', `r:f(${k})`);
  assert.equal(L.err, ''); assert.equal(L.val?.v ?? L.val, 20);
});

t('varargin recibe objetos de cualquier tipo y typeof los distingue', () => {
  const { d, p, l, ci } = mk();
  const F = '%f(varargin):\n  n:0\n  for i in 1..nargin:\n    if isa(varargin_i; "line"):\n      n:n+1\n  n';
  const r = run(d, F, `r:f(${p[0]}, ${l[0]}, ${ci}, ${l[1]})`);
  assert.equal(r.err, '', r.err); assert.equal(r.val?.v ?? r.val, 2);
});

t('pedir un elemento que no existe da el mensaje de siempre; k_i fuera de rango dice cuantos hay', () => {
  const { d, k } = mk();
  assert.match(run(d, TYPES, 'r:tipo(zz9)').err, /No reconozco/);
  const r = run(d, '%f(k):\n  k_9.len', `r:f(${k})`);
  assert.match(r.err, /tiene 4/);
});

// ---- el caso que motivo todo esto: aplicar un script a un contorno cualquiera y dibujar su vista isometrica (copia viva)
t('iso sobre un contorno con lineas y un arco, y sobre un circulo: una sola funcion con typeof/isa; el arco y el circulo salen como splines por puntos de su imagen', () => {
  const d = newDoc();
  const P = (x, y) => addPoint(d, x, y);
  const p = [P(0, 0), P(30, 0), P(30, 10), P(10, 10), P(10, 30), P(0, 30)];
  const l = [addLine(d, p[0], p[1]), addLine(d, p[1], p[2]), addLine(d, p[2], p[3]), addLine(d, p[3], p[4]), addLine(d, p[5], p[0])];
  const arc = addArc(d, P(5, 30), p[4], p[5], 5, {});
  const { id: k } = addCtr(d, [...l.map((id) => ({ k: 'ln', id })), { k: 'ar', id: arc }], 'L');
  const hole = addCircle(d, P(18, 4), 2);
  addText(d, addPoint(d, 0, 200), readFileSync(new URL('./fixtures/iso-contorno.txt', import.meta.url), 'utf8').split('\r').join('').trim(), {}); // sin los \r de una descarga en Windows
  addText(d, addPoint(d, 0, 100), '$$r:iso("T", ' + k + ', 100, 0)$$', {});
  addText(d, addPoint(d, 0, 80), '$$q:iso("T", ' + hole + ', 100, 0)$$', {});
  const st = textVars(d), r = regenerate(d);
  assert.deepEqual([...st.errs.values()], []); assert.deepEqual(r.errs, []);
  const map = d.gen.map;
  assert.equal(Object.keys(map).filter((x) => x.includes('|') && !x.includes('/s:')).length, 5, 'las 5 lineas del contorno');
  assert.equal(Object.keys(d.splines).length, 2, 'el arco y el circulo, como splines');
  // los puntos del arco estan en su imagen: al deshacer la proyeccion caen a radio 5 del centro (5,30); los del circulo, a radio 2 de (18,4)
  const c = Math.cos(Math.PI / 6), s = Math.sin(Math.PI / 6), det = c * s + c * s;
  const inv = (x, y) => [(s * x + c * y) / det, (-s * x + c * y) / det];
  for (const sp of Object.values(d.splines)) {
    const circle = sp.pts.length === 24, [cx, cy, rr] = circle ? [18, 4, 2] : [5, 30, 5];
    assert.equal(!!sp.closed, circle);
    for (const q of sp.pts) { const [x, y] = inv(d.pts[q].x - 100, d.pts[q].y); assert.ok(Math.abs(Math.hypot(x - cx, y - cy) - rr) < 1e-9); }
  }
  // copia viva: mover un punto del contorno original mueve el punto transformado (se regenera con lo nuevo)
  d.pts[p[1]].x = 40; regenerate(d);
  const gp = d.pts[map[Object.keys(map).find((x) => x.endsWith('/P' + p[1]))]];
  assert.ok(Math.abs(gp.x - (100 + c * (40 - 0))) < 1e-9, 'el punto transformado sigue al original');
});

t('una funcion que recibe de todo: lo que una rama no usa no falla al leerlo; solo si se ejecuta con un objeto que no lo tiene', () => {
  const { d, ci, k } = mk();
  const F = '%f(o):\n  if isa(o; "contour"):\n    o.n\n  else:\n    o.r';
  assert.equal(run(d, F, `r:f(${k})`).err, ''); assert.equal(run(d, F, `r:f(${k})`).val?.v ?? run(d, F, `r:f(${k})`).val, 4);
  assert.equal(run(d, F, `r:f(${ci})`).err, ''); assert.equal(run(d, F, `r:f(${ci})`).val?.v ?? run(d, F, `r:f(${ci})`).val, 3);
  assert.match(run(d, '%f(o):\n  o_2', `r:f(${ci})`).err, /no es un spline ni un contorno/);
});

console.log(`${passed} pruebas de objetos como valores`);
