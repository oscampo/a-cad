// Grupos desde los scripts (fase 3): un grupo (g1) llega a una funcion propia como objeto: g.n, g_i, g.w/g.h/g.xmin…, typeof "group"; y un texto y una cota como objetos.
import assert from 'node:assert/strict';
import { newDoc, addPoint, addLine, addCircle, addEllipse, addText, addCon, addCtr, addGrp } from '../src/model.js';
import { textVars } from '../src/params.js';
import { elementValue, kindOfId } from '../src/topo.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };

// un rectangulo 40x30 (contorno), un circulo de radio 5 en (20,15), un texto en (0,40) y una cota; todo en un grupo; y un grupo mayor con otro texto
function mk() {
  const d = newDoc();
  const p = [addPoint(d, 0, 0), addPoint(d, 40, 0), addPoint(d, 40, 30), addPoint(d, 0, 30)];
  const l = [addLine(d, p[0], p[1]), addLine(d, p[1], p[2]), addLine(d, p[2], p[3]), addLine(d, p[3], p[0])];
  const ci = addCircle(d, addPoint(d, 20, 15), 5);
  const tx = addText(d, addPoint(d, 0, 40), 'Vista', {});
  const dim = addCon(d, { t: 'DIST', refs: [p[0], p[1]], v: 40 });
  const { id: k } = addCtr(d, l.map((id) => ({ k: 'ln', id })), 'Front');
  const g = addGrp(d, [{ k: 'ct', id: k }, { k: 'ci', id: ci }, { k: 'tx', id: tx }, { k: 'co', id: dim }], 'Vista frontal').id;
  const tx2 = addText(d, addPoint(d, 100, 60), 'Titulo', {});
  const G = addGrp(d, [{ k: 'gp', id: g }, { k: 'tx', id: tx2 }], 'Hoja').id;
  return { d, p, l, ci, tx, tx2, dim, k, g, G };
}
function run(d, fns, call) {
  const dd = JSON.parse(JSON.stringify(d));
  addText(dd, addPoint(dd, 0, 200), fns, {});
  addText(dd, addPoint(dd, 0, 100), '$$' + call + '$$', {});
  const st = textVars(dd);
  const win = [...st.win.values()].find((w) => w.name === 'r');
  return { err: [...st.errs.values()].join(' | '), val: st.vals?.r, win };
}
const num = (r) => r.val?.v ?? r.val;

t('elementValue de un grupo: n, caja envolvente, nombre y miembros', () => {
  const { d, g, G, tx, dim } = mk();
  assert.equal(kindOfId(d, g), 'gp'); assert.equal(kindOfId(d, tx), 'tx'); assert.equal(kindOfId(d, dim), 'co');
  const v = elementValue(d, g);
  assert.equal(v.k, 'gp'); assert.equal(v.name, 'Vista frontal'); assert.equal(v.n, 4);
  assert.deepEqual(v.list.map((m) => m.k), ['ct', 'ci', 'tx', 'co']);
  assert.deepEqual([v.xmin, v.xmax, v.ymin, v.ymax, v.w, v.h], [0, 40, 0, 40, 40, 40]); // el texto en (0,40) alarga la caja
  const V = elementValue(d, G);
  assert.equal(V.n, 2); assert.deepEqual([V.xmax, V.ymax, V.w], [100, 60, 100]);
});

t('typeof: un grupo, un texto y una cota', () => {
  const { d, g, tx, dim } = mk();
  const F = '%tipo(x):\n  typeof(x)';
  for (const [id, want] of [[g, 'group'], [tx, 'text'], [dim, 'dimension']]) { const r = run(d, F, `r:tipo(${id})`); assert.equal(r.err, '', id + ': ' + r.err); assert.equal(r.val?.str ?? r.win?.value, want, id); }
});

t('un grupo llega a una funcion: g.n, g.w, g.h, g.xmin, g.ymax', () => {
  const { d, g } = mk();
  const F = '%f(o):\n  o.n + 10*o.w + 1000*o.h + 100000*o.xmin + 1000000*o.ymax';
  const r = run(d, F, `r:f(${g})`);
  assert.equal(r.err, '');
  assert.equal(num(r), 4 + 400 + 40000 + 0 + 40000000);
});

t('g_i: el i-esimo objeto del grupo, con su tipo y sus propiedades; un grupo dentro de un grupo es un miembro mas', () => {
  const { d, G } = mk();
  const F = '%f(o):\n  s:0\n  for i in 1..o.n:\n    s:s + isa(o_i; "group")\n  s';
  const r = run(d, F, `r:f(${G})`);
  assert.equal(r.err, '');
  assert.equal(num(r), 1);
  const F2 = '%w(o):\n  o_1.w';
  const r2 = run(d, F2, `r:w(${G})`);
  assert.equal(r2.err, '');
  assert.equal(num(r2), 40);
});

t('un contorno tambien lleva su caja envolvente: k.w y k.h', () => {
  const { d, k } = mk();
  const r = run(d, '%f(o):\n  o.w + 1000*o.h', `r:f(${k})`);
  assert.equal(r.err, '');
  assert.equal(num(r), 40 + 30000);
});

t('un texto como objeto: t.x, t.y; una funcion que recibe de todo puede preguntar el tipo antes', () => {
  const { d, tx } = mk();
  const F = '%f(o):\n  if isa(o; "text"):\n    o.x + 10*o.y\n  else:\n    -1';
  const r = run(d, F, `r:f(${tx})`);
  assert.equal(r.err, '');
  assert.equal(num(r), 0 + 400);
});



t('isa(x; "earc"): un arco eliptico si, una elipse completa no; los dos son «ellipse» para typeof e isa(x; "ellipse")', () => {
  const d = newDoc(), c = addPoint(d, 0, 0), a = addPoint(d, 20, 0), b = addPoint(d, 0, 10), p1 = addPoint(d, 20, 0), p2 = addPoint(d, 0, 10);
  const full = addEllipse(d, c, a, b, {}), arco = addEllipse(d, c, a, b, {}, p1, p2);
  const F = '%f(x):\n  100*isa(x; "earc")+10*isa(x; "ellipse")+isa(x; "line")';
  for (const [id, want] of [[full, 10], [arco, 110]]) { const r = run(d, F, `r:f(${id})`); assert.equal(r.err, '', id + ': ' + r.err); assert.equal(num(r), want, id); }
  const T = '%g(x):\n  typeof(x)';
  for (const id of [full, arco]) { const r = run(d, T, `r:g(${id})`); assert.equal(r.val?.str ?? r.win?.value, 'ellipse'); }
});

t('isa(x; "earc") dentro de un grupo: g_i distingue los dos tipos, y un numero o una linea dan 0', () => {
  const d = newDoc(), c = addPoint(d, 0, 0), a = addPoint(d, 20, 0), b = addPoint(d, 0, 10), p1 = addPoint(d, 20, 0), p2 = addPoint(d, 0, 10);
  const arco = addEllipse(d, c, a, b, {}, p1, p2), full = addEllipse(d, c, a, b, {}), ln = addLine(d, c, a);
  const g = addGrp(d, [{ k: 'el', id: arco }, { k: 'el', id: full }, { k: 'ln', id: ln }], 'Mixto').id;
  const F = '%f(o):\n  s:0\n  for i in 1..o.n:\n    s:s*10+isa(o_i; "earc")\n  s';
  const r = run(d, F, `r:f(${g})`);
  assert.equal(r.err, ''); assert.equal(num(r), 10); // el grupo lista por tipo: la linea (0), el arco eliptico (1), la elipse completa (0)
  assert.equal(num(run(d, '%h(x):\n  isa(x; "earc")', 'r:h(5)')), 0);
});

console.log(`${passed} pruebas de grupos en scripts`);
