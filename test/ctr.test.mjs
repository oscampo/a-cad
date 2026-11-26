// Grupos de contorno (doc.ctrs, atributo ctr de cada elemento miembro): modelo, copiar, dividir y limpieza.
import assert from 'node:assert/strict';
import { newDoc, addPoint, addLine, addArc, addCircle, addSpline, addLayer, addText, addCtr, dissolveCtr, deleteCtrAndMembers, ctrMembers, ctrEligible, ctrName, deleteItems, cleanup } from '../src/model.js';
import { buildTree } from '../src/tree.js';
import { geoVars, isGeoName, geoPoints } from '../src/geo.js';
import { textVars } from '../src/params.js';
import { clipOf, pasteClip, linearArray } from '../src/edit.js';
import { splitElement } from '../src/split.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const n = (o) => Object.keys(o || {}).length;

// un cuadrado de 4 lineas (l1..l4 en orden de creacion)
function square() {
  const d = newDoc();
  const p = [addPoint(d, 0, 0), addPoint(d, 10, 0), addPoint(d, 10, 10), addPoint(d, 0, 10)];
  const l = [addLine(d, p[0], p[1]), addLine(d, p[1], p[2]), addLine(d, p[2], p[3]), addLine(d, p[3], p[0])];
  return { d, p, l, items: l.map((id) => ({ k: 'ln', id })) };
}

t('agrupar: los elementos de trazo quedan en un grupo nuevo (k…), con su atributo ctr', () => {
  const { d, items } = square();
  const r = addCtr(d, items);
  assert.ok(/^k\d+$/.test(r.id)); assert.deepEqual(r.skipped, []);
  assert.deepEqual(d.ctrs[r.id], {});
  for (const it of items) assert.equal(d.lines[it.id].ctr, r.id);
  assert.deepEqual(ctrMembers(d, r.id), items);
});

t('agrupar: con nombre; ctrName da el nombre o, sin nombre, el id', () => {
  const { d, items } = square();
  const a = addCtr(d, items.slice(0, 2), 'perfil');
  const b = addCtr(d, items.slice(2));
  assert.equal(ctrName(d, a.id), 'perfil'); assert.equal(ctrName(d, b.id), b.id);
});

t('agrupar: no son miembros un circulo, un vector, un elemento constructivo ni una spline cerrada', () => {
  const { d, p, l, items } = square();
  const c = addCircle(d, p[0], 3);
  d.lines[l[0]].ltype = 'constructiva';
  d.lines[l[1]].vec = { m: p[0], t: 't1' };
  const sp = addSpline(d, [p[0], p[1], p[2]], {}, true);
  const r = addCtr(d, [...items, { k: 'ci', id: c }, { k: 'sp', id: sp }]);
  assert.ok(r.id);
  assert.deepEqual(r.skipped.map((s) => s.k + s.id).sort(), [`ci${c}`, `ln${l[0]}`, `ln${l[1]}`, `sp${sp}`].sort());
  assert.ok(r.skipped.every((s) => s.why === 'tipo'));
  assert.deepEqual(ctrMembers(d, r.id).map((m) => m.id), [l[2], l[3]]);
});

t('agrupar: con menos de 2 elementos validos no se crea nada', () => {
  const { d, items } = square();
  const r = addCtr(d, [items[0]]);
  assert.equal(r.id, null); assert.equal(d.ctrs, undefined); assert.equal(d.lines[items[0].id].ctr, undefined);
});

t('un elemento esta en un solo grupo: el que ya tiene grupo se omite', () => {
  const { d, items } = square();
  const a = addCtr(d, items.slice(0, 2));
  const b = addCtr(d, items.slice(1));
  assert.ok(b.id);
  assert.deepEqual(b.skipped.map((s) => [s.id, s.why, s.ctr]), [[items[1].id, 'grupo', a.id]]);
  assert.equal(d.lines[items[1].id].ctr, a.id);
  assert.deepEqual(ctrMembers(d, b.id).map((m) => m.id), [items[2].id, items[3].id]);
});

t('agrupar acepta arcos, arcos eliticos y splines abiertas junto con lineas', () => {
  const { d, p, items } = square();
  const ar = addArc(d, p[0], p[1], p[2], 10);
  const sp = addSpline(d, [p[0], p[1], p[2]], {}, false);
  assert.ok(ctrEligible(d, { k: 'ar', id: ar })); assert.ok(ctrEligible(d, { k: 'sp', id: sp }));
  const r = addCtr(d, [items[0], { k: 'ar', id: ar }, { k: 'sp', id: sp }]);
  assert.deepEqual(r.skipped, []);
  assert.equal(d.arcs[ar].ctr, r.id); assert.equal(d.splines[sp].ctr, r.id);
});

t('disolver: los miembros siguen en el dibujo sin grupo y el grupo desaparece', () => {
  const { d, items } = square();
  const { id } = addCtr(d, items);
  assert.equal(dissolveCtr(d, id), 4);
  assert.equal(d.ctrs, undefined);
  for (const it of items) { assert.ok(d.lines[it.id]); assert.equal(d.lines[it.id].ctr, undefined); }
  assert.equal(dissolveCtr(d, id), 0, 'disolver lo que ya no existe no hace nada');
});

t('eliminar con sus elementos: borra el grupo y todos los miembros (y no los demas)', () => {
  const { d, p, items } = square();
  const extra = addLine(d, p[0], p[2]);
  const { id } = addCtr(d, items);
  assert.equal(deleteCtrAndMembers(d, id), 4);
  assert.equal(d.ctrs, undefined);
  for (const it of items) assert.equal(d.lines[it.id], undefined);
  assert.ok(d.lines[extra], 'la diagonal no era miembro');
});

t('borrar un miembro deja el grupo con menos; con menos de 2 se disuelve solo y el ultimo queda sin atributo', () => {
  const { d, items } = square();
  const { id } = addCtr(d, items.slice(0, 3));
  deleteItems(d, [items[0]]);
  assert.equal(ctrMembers(d, id).length, 2); assert.ok(d.ctrs[id]);
  deleteItems(d, [items[1]]);
  assert.equal(d.ctrs, undefined);
  assert.equal(d.lines[items[2].id].ctr, undefined);
});

t('un ctr que apunta a un grupo que no existe se limpia', () => {
  const { d, items } = square();
  d.lines[items[0].id].ctr = 'k99';
  cleanup(d);
  assert.equal(d.lines[items[0].id].ctr, undefined);
});

t('copiar y pegar: la copia NO hereda el grupo, los originales lo conservan', () => {
  const { d, items } = square();
  const { id } = addCtr(d, items);
  const clip = clipOf(d, items);
  const r = pasteClip(d, clip, { x: 50, y: 50 });
  assert.ok(r.ok); assert.equal(r.made.length, 4);
  for (const m of r.made) assert.equal(d.lines[m.id].ctr, undefined, 'la copia no esta en el grupo');
  assert.equal(ctrMembers(d, id).length, 4);
});

t('matriz lineal: las copias no heredan el grupo', () => {
  const { d, items } = square();
  const { id } = addCtr(d, items);
  const r = linearArray(d, items, [{ u: { x: 1, y: 0 }, s: 30, n: 1 }]);
  assert.ok(r.ok);
  assert.equal(ctrMembers(d, id).length, 4);
  assert.equal(Object.values(d.lines).filter((l) => l.ctr === id).length, 4);
});

t('dividir: los trozos siguen en el grupo del original', () => {
  const { d, p, items } = square();
  const { id } = addCtr(d, items);
  const q = addPoint(d, 5, 0);
  const r = splitElement(d, items[0].id, [q]);
  assert.ok(r.ok); assert.equal(r.pieces.length, 2);
  for (const pc of r.pieces) assert.equal(d.lines[pc].ctr, id);
  assert.equal(ctrMembers(d, id).length, 5);
});

t('el grupo viaja con el documento (JSON) y no ensucia un dibujo sin grupos', () => {
  const { d, items } = square();
  assert.equal(d.ctrs, undefined);
  const { id } = addCtr(d, items);
  const back = JSON.parse(JSON.stringify(d));
  assert.deepEqual(ctrMembers(back, id), items);
  assert.equal(n(back.ctrs), 1);
});

// ---- el arbol: el grupo es dueño de sus miembros, y su estado se mide
const grp = (tree, key) => tree.find((g) => g.key === key);
const labels = (g) => (g ? g.children.map((c) => c.label) : []);

t('arbol: un grupo cerrado es dueño de sus 4 lineas; salen de «Líneas» y no se vuelven a detectar', () => {
  const { d, items } = square();
  let tree = buildTree(d);
  assert.deepEqual(labels(grp(tree, 'g:ct')), ['Contorno 1 · cerrado · 4 líneas']); // detectado: aun sin grupo
  assert.equal(grp(tree, 'g:ln').children.length, 4);
  const { id } = addCtr(d, items);
  tree = buildTree(d);
  const ct = grp(tree, 'g:ct');
  assert.equal(ct.children.length, 1);
  assert.equal(ct.children[0].ctr, id);
  assert.equal(ct.children[0].label, `Contorno ${id} · cerrado · 4 líneas`);
  assert.equal(ct.children[0].children.length, 4, 'las lineas cuelgan del grupo, con todo lo suyo');
  assert.deepEqual(ct.children[0].children.map((c) => c.sel.id), items.map((i) => i.id));
  assert.equal(grp(tree, 'g:ln'), undefined, 'ya no hay lineas sueltas: el grupo «Líneas» no aparece');
  assert.equal(ct.children[0].selMany.length, 4);
});

t('arbol: el grupo lleva el nombre que se le dio', () => {
  const { d, items } = square();
  const { id } = addCtr(d, items, 'perfil');
  assert.equal(grp(buildTree(d), 'g:ct').children[0].label, 'Contorno perfil · cerrado · 4 líneas');
  assert.ok(id);
});

t('arbol: un grupo abierto lo dice, con la abertura; uno cuyos miembros no se tocan, «desconectado»', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 10, 0), c = addPoint(d, 10, 10), e = addPoint(d, 0, 0.05);
  const l1 = addLine(d, a, b), l2 = addLine(d, b, c), l3 = addLine(d, c, e);
  const g1 = addCtr(d, [l1, l2, l3].map((id) => ({ k: 'ln', id })));
  const open = grp(buildTree(d), 'g:ct').children[0].label;
  assert.match(open, /^Contorno k\d+ · abierto · abertura 0\.05 entre sus extremos · 3 líneas$/, open);
  const f = addPoint(d, 100, 100), h = addPoint(d, 110, 100), i = addPoint(d, 200, 0), j = addPoint(d, 210, 0);
  const m1 = addLine(d, f, h), m2 = addLine(d, i, j);
  const g2 = addCtr(d, [m1, m2].map((id) => ({ k: 'ln', id })));
  const labs = labels(grp(buildTree(d), 'g:ct'));
  assert.ok(labs.includes(`Contorno ${g2.id} · desconectado (2 partes) · 2 líneas`), labs.join(' | '));
  assert.ok(g1.id);
});

t('arbol: lo que no esta agrupado sigue detectandose, con su accion de agrupar; lo agrupado no', () => {
  const { d, p, items } = square();
  const a = addPoint(d, 20, 0), b = addPoint(d, 30, 0), c = addPoint(d, 30, 10);
  const x = addLine(d, a, b), y = addLine(d, b, c);
  addCtr(d, items);
  const ct = grp(buildTree(d), 'g:ct');
  assert.equal(ct.children.length, 2);
  const det = ct.children.find((n) => n.ctrFrom);
  assert.deepEqual(det.ctrFrom.map((i) => i.id), [x, y]);
  assert.equal(ct.children.find((n) => n.ctr).ctrFrom, undefined);
  assert.ok(p);
});

t('arbol: disolver devuelve las lineas a «Líneas» y reaparece el contorno detectado', () => {
  const { d, items } = square();
  const { id } = addCtr(d, items);
  dissolveCtr(d, id);
  const tree = buildTree(d);
  assert.equal(grp(tree, 'g:ln').children.length, 4);
  assert.deepEqual(labels(grp(tree, 'g:ct')), ['Contorno 1 · cerrado · 4 líneas']);
});

t('arbol: por capa, los miembros de un grupo tampoco aparecen en su tipo', () => {
  const { d, items } = square();
  const y = addLayer(d, 'Base');
  for (const it of items) d.lines[it.id].layer = y;
  const extra = addLine(d, addPoint(d, 40, 0), addPoint(d, 50, 0)); d.lines[extra].layer = y;
  addCtr(d, items);
  const tree = buildTree(d, { by: 'layer' });
  const capa = tree.find((g) => g.layerId === y);
  assert.equal(grp(capa.children, 'g:ln').children.length, 1, 'solo la linea suelta');
  assert.equal(grp(tree, 'g:ct').children[0].children.length, 4);
});

// ---- propiedades de un grupo en las formulas: k1.L (perimetro) y k1.area (solo cerrado)
const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${a} vs ${b}`);

t('formulas: el perimetro y el area de un cuadrado de 10 (k.L = 40, k.area = 100)', () => {
  const d = newDoc();
  const p = [addPoint(d, 0, 0), addPoint(d, 10, 0), addPoint(d, 10, 10), addPoint(d, 0, 10)];
  const items = [[0, 1], [1, 2], [2, 3], [3, 0]].map(([a, b]) => ({ k: 'ln', id: addLine(d, p[a], p[b]) }));
  const { id } = addCtr(d, items);
  const v = geoVars(d);
  near(v[id + '.L'].v, 40); near(v[id + '.len'].v, 40); near(v[id + '.area'].v, 100);
  assert.equal(v[id + '.L'].r, false);
  assert.ok(isGeoName(d, id + '.area'));
});

t('formulas: un semicirculo (diametro de 10 y arco) da 10 + 5π y 12.5π', () => {
  const d = newDoc();
  const O = addPoint(d, 0, 0), A = addPoint(d, 5, 0), B = addPoint(d, -5, 0);
  const diam = addLine(d, B, A), arc = addArc(d, O, A, B, 5); // antihorario de A a B: pasa por (0, 5)
  const { id } = addCtr(d, [{ k: 'ln', id: diam }, { k: 'ar', id: arc }]);
  const v = geoVars(d);
  near(v[id + '.L'].v, 10 + 5 * Math.PI, 1e-12);
  near(v[id + '.area'].v, 12.5 * Math.PI, 1e-4);
});

t('formulas: un grupo abierto tiene perimetro pero no area', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 10, 0), c = addPoint(d, 10, 10);
  const { id } = addCtr(d, [addLine(d, a, b), addLine(d, b, c)].map((l) => ({ k: 'ln', id: l })));
  const v = geoVars(d);
  near(v[id + '.L'].v, 20); assert.equal(v[id + '.area'], undefined);
  assert.equal(isGeoName(d, id + '.area'), false);
});

t('formulas: un texto lee k.L y k.area; al disolver el grupo dejan de existir', () => {
  const d = newDoc();
  const p = [addPoint(d, 0, 0), addPoint(d, 6, 0), addPoint(d, 6, 4), addPoint(d, 0, 4)];
  const items = [[0, 1], [1, 2], [2, 3], [3, 0]].map(([a, b]) => ({ k: 'ln', id: addLine(d, p[a], p[b]) }));
  const { id } = addCtr(d, items);
  addText(d, addPoint(d, -50, -50), `$$perim:${id}.L
area:${id}.area$$`, {});
  let st = textVars(d);
  assert.deepEqual([...st.errs], []);
  near(st.vals.perim.v, 20); near(st.vals.area.v, 24);
  dissolveCtr(d, id);
  st = textVars(d);
  assert.ok(st.errs.size >= 1, 'sin el grupo, k.L ya no se reconoce');
});

t('formulas: un grupo de contorno depende de los puntos de todos sus elementos', () => {
  const { d, p, items } = square();
  const { id } = addCtr(d, items);
  assert.deepEqual(geoPoints(d, id + '.L').sort(), [...p].sort());
});

console.log(`${passed} pruebas de grupos de contorno`);
