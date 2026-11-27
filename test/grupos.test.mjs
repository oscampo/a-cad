// Grupos (doc.grps, atributo grp): una jerarquia con de todo adentro. Modelo, contornos, copiar y dividir.
import assert from 'node:assert/strict';
import { newDoc, addPoint, addLine, addCircle, addText, addCon, addCtr, addGrp, dissolveGrp, deleteGrpAndMembers, grpMembers, grpLeaves, grpDescendants, grpOf, grpName, grpPlan, deleteItems, cleanup, dissolveCtr } from '../src/model.js';
import { clipOf, pasteClip, mirrorCopy, linearArray, circularArray } from '../src/edit.js';
import { splitElement } from '../src/split.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const n = (o) => Object.keys(o || {}).length;

// una vista: un rectangulo (4 lineas), un circulo, un texto y una cota
function vista() {
  const d = newDoc();
  const p = [addPoint(d, 0, 0), addPoint(d, 40, 0), addPoint(d, 40, 30), addPoint(d, 0, 30)];
  const l = [addLine(d, p[0], p[1]), addLine(d, p[1], p[2]), addLine(d, p[2], p[3]), addLine(d, p[3], p[0])];
  const c = addCircle(d, addPoint(d, 20, 15), 5);
  const tx = addText(d, addPoint(d, 0, 40), 'Vista frontal', {});
  const dim = addCon(d, { t: 'DIST', refs: [p[0], p[1]], v: 40 });
  const { id: k } = addCtr(d, l.map((id) => ({ k: 'ln', id })), 'Front');
  return { d, p, l, c, tx, dim, k };
}
const it = (k, id) => ({ k, id });

t('un grupo reune de todo: un contorno, un circulo, un texto y una cota; ninguno pierde su identidad', () => {
  const { d, c, tx, dim, k, l } = vista();
  const r = addGrp(d, [it('ct', k), it('ci', c), it('tx', tx), it('co', dim)], 'Vista frontal');
  assert.ok(/^g\d+$/.test(r.id)); assert.deepEqual(r.skipped, []);
  assert.equal(grpName(d, r.id), 'Vista frontal');
  assert.deepEqual(grpMembers(d, r.id).map((m) => m.k), ['ct', 'ci', 'tx', 'co']);
  assert.equal(grpOf(d, 'ci', c), r.id); assert.equal(grpOf(d, 'ct', k), r.id);
  assert.equal(grpOf(d, 'ln', l[0]), undefined, 'una linea de un contorno tiene por padre al contorno, no al grupo');
  assert.deepEqual(grpLeaves(d, r.id).map((m) => m.k + ':' + m.id).sort(), [...l.map((x) => 'ln:' + x), 'ci:' + c, 'tx:' + tx, 'co:' + dim].sort());
});

t('un elemento de un contorno entra con su contorno si se da entero; si solo se da una parte, no entra y se dice por que', () => {
  const { d, l, c } = vista();
  const entero = addGrp(d, [...l.map((x) => it('ln', x)), it('ci', c)]);
  assert.ok(entero.id); assert.deepEqual(grpMembers(d, entero.id).map((m) => m.k), ['ct', 'ci']);
  const v2 = vista();
  const parcial = grpPlan(v2.d, [it('ln', v2.l[0]), it('ln', v2.l[1]), it('ci', v2.c)]);
  assert.deepEqual(parcial.ok.map((m) => m.k), ['ci']);
  assert.deepEqual(parcial.skipped.map((s) => s.why), ['contorno', 'contorno']);
  assert.equal(addGrp(v2.d, [it('ln', v2.l[0]), it('ci', v2.c)]).id, null, 'menos de 2 que puedan entrar');
});

t('puntos: solo los sueltos son miembros; el que usa un elemento sigue a su elemento. Las relaciones: solo cotas', () => {
  const { d, p, c, dim } = vista();
  const libre = addPoint(d, 99, 99);
  const h = addCon(d, { t: 'H', refs: [Object.keys(d.lines)[0]] });
  const plan = grpPlan(d, [it('pt', libre), it('pt', p[0]), it('co', h), it('co', dim), it('ci', c)]);
  assert.deepEqual(plan.ok.map((m) => m.k + ':' + m.id).sort(), [`ci:${c}`, `co:${dim}`, `pt:${libre}`].sort());
  assert.deepEqual(plan.skipped.map((s) => s.why).sort(), ['owned', 'tipo']);
});

t('grupos dentro de grupos: el nuevo queda en el grupo de sus miembros si era uno solo; si no, en la raiz', () => {
  const { d, c, tx, dim } = vista();
  const a = addGrp(d, [it('ci', c), it('tx', tx)]).id;
  const extra = addText(d, addPoint(d, 0, 50), 'otro', {});
  const b = addGrp(d, [it('gp', a), it('tx', extra)]).id;       // a (en la raiz) y un texto (en la raiz): nuevo en la raiz
  assert.equal(grpOf(d, 'gp', a), b); assert.equal(grpOf(d, 'gp', b), undefined);
  const z = addGrp(d, [it('ci', c), it('co', dim)]).id;         // c esta en a, dim en la raiz: padres distintos, raiz
  assert.equal(grpOf(d, 'gp', z), undefined);
  assert.equal(grpOf(d, 'ci', c), z, 'el circulo sale de a y entra al nuevo');
  assert.deepEqual(grpDescendants(d, b), [a]);
  const dos = addText(d, addPoint(d, 0, 60), 'dos', {}), tres = addText(d, addPoint(d, 0, 70), 'tres', {}), cuatro = addText(d, addPoint(d, 0, 80), 'cuatro', {});
  const e = addGrp(d, [it('tx', dos), it('tx', tres), it('tx', cuatro)]).id;
  const f = addGrp(d, [it('tx', dos), it('tx', tres)]);          // estaban en e: el nuevo grupo queda dentro de e
  assert.equal(grpOf(d, 'gp', f.id), e);
});

t('disolver: los hijos suben al grupo de arriba (o a la raiz) y siguen en el dibujo', () => {
  const { d, c, tx, dim, k } = vista();
  const a = addGrp(d, [it('ci', c), it('tx', tx)]).id;
  const b = addGrp(d, [it('gp', a), it('ct', k)]).id;
  assert.equal(dissolveGrp(d, a), 2);
  assert.equal(grpOf(d, 'ci', c), b); assert.equal(grpOf(d, 'tx', tx), b); assert.equal(n(d.grps), 1);
  assert.equal(dissolveGrp(d, b), 3);
  assert.equal(d.grps, undefined); assert.equal(grpOf(d, 'ci', c), undefined);
  assert.ok(c in d.circles && tx in d.texts && dim in d.cons);
});

t('borrar con su contenido: elementos, textos, contornos y los grupos de dentro', () => {
  const { d, c, tx, k } = vista();
  const a = addGrp(d, [it('ci', c), it('tx', tx)]).id;
  const b = addGrp(d, [it('gp', a), it('ct', k)]).id;
  const borrados = deleteGrpAndMembers(d, b);
  assert.equal(borrados, 2 + 4);
  assert.equal(n(d.circles), 0); assert.equal(n(d.texts), 0); assert.equal(n(d.lines), 0);
  assert.equal(d.grps, undefined); assert.equal(d.ctrs, undefined);
});

t('cleanup: un grupo se queda sin nada y desaparece, y arrastra al de arriba si este tambien se queda vacio', () => {
  const { d, c, tx } = vista();
  const a = addGrp(d, [it('ci', c), it('tx', tx)]).id;
  const otro = addText(d, addPoint(d, 5, 5), 'x', {});
  addGrp(d, [it('gp', a), it('tx', otro)]);
  deleteItems(d, [it('ci', c), it('tx', tx), it('tx', otro)]);
  cleanup(d);
  assert.equal(d.grps, undefined, 'a quedo vacio, y con el b');
  const v = vista();
  const g = addGrp(v.d, [it('ci', v.c), it('tx', v.tx)]).id;
  deleteItems(v.d, [it('ci', v.c)]); cleanup(v.d);
  assert.ok(v.d.grps?.[g], 'con uno que queda el grupo sigue');
});

t('contornos y grupos: un contorno nuevo queda en el grupo de sus miembros, y al disolverlo los miembros vuelven a ese grupo', () => {
  const d = newDoc();
  const p = [addPoint(d, 0, 0), addPoint(d, 10, 0), addPoint(d, 10, 10)];
  const l = [addLine(d, p[0], p[1]), addLine(d, p[1], p[2])];
  const txt = addText(d, addPoint(d, 0, 20), 't', {});
  const g = addGrp(d, [it('ln', l[0]), it('ln', l[1]), it('tx', txt)]).id;
  assert.equal(grpOf(d, 'ln', l[0]), g);
  const { id: k } = addCtr(d, l.map((x) => it('ln', x)));
  assert.equal(grpOf(d, 'ct', k), g, 'el contorno queda en el grupo');
  assert.equal(d.lines[l[0]].grp, undefined, 'y sus lineas pasan a depender del contorno');
  dissolveCtr(d, k);
  assert.equal(grpOf(d, 'ln', l[0]), g); assert.equal(grpOf(d, 'ln', l[1]), g);
});

t('copiar una parte de un grupo: la copia no entra al grupo del original; dividir: los trozos si siguen en su grupo', () => {
  const { d, c, tx } = vista();
  const g = addGrp(d, [it('ci', c), it('tx', tx)]).id;
  const r = pasteClip(d, clipOf(d, [it('ci', c)]), { x: 100, y: 100 });
  assert.ok(r.ok);
  for (const m of r.made) assert.equal(grpOf(d, m.k, m.id), undefined, 'la copia parcial no entra al grupo');
  assert.equal(grpMembers(d, g).length, 2); assert.equal(n(d.grps), 1);
  const e = newDoc();
  const a = addPoint(e, 0, 0), b = addPoint(e, 10, 0), q = addPoint(e, 4, 0), l = addLine(e, a, b), l2 = addLine(e, a, addPoint(e, 0, 5));
  const gg = addGrp(e, [it('ln', l), it('ln', l2)]).id;
  const s = splitElement(e, l, [q]);
  assert.ok(s.ok);
  for (const pc of s.pieces) assert.equal(grpOf(e, 'ln', pc), gg);
});

const hojas = (d, g) => grpLeaves(d, g);
const leafIds = (d, g) => new Set(hojas(d, g).map((m) => m.id));

t('copiar un grupo completo (pegar): la copia es un grupo nuevo con su nombre, su contorno propio y su cota; el original no cambia', () => {
  const { d, c, tx, dim, k } = vista();
  const g = addGrp(d, [it('ct', k), it('ci', c), it('tx', tx), it('co', dim)], 'Vista frontal').id;
  const antes = JSON.stringify(grpLeaves(d, g));
  const r = pasteClip(d, clipOf(d, grpLeaves(d, g)), { x: 200, y: 200 });
  assert.ok(r.ok);
  assert.equal(n(d.grps), 2);
  const ng = Object.keys(d.grps).find((x) => x !== g);
  assert.equal(grpName(d, ng), 'Vista frontal');
  assert.deepEqual(grpMembers(d, ng).map((m) => m.k), ['ct', 'ci', 'tx', 'co']);
  assert.notEqual(grpMembers(d, ng).find((m) => m.k === 'ct').id, k, 'contorno nuevo');
  assert.equal(JSON.stringify(grpLeaves(d, g)), antes);
  assert.equal(grpLeaves(d, ng).length, grpLeaves(d, g).length);
  for (const m of grpLeaves(d, ng)) assert.ok(!leafIds(d, g).has(m.id));
});

t('copiar grupos anidados: la copia conserva la jerarquia; si falta un grupo de adentro, lo copiado queda sin ese grupo', () => {
  const { d, c, tx } = vista();
  const extra = addText(d, addPoint(d, 0, 50), 'otro', {});
  const a = addGrp(d, [it('ci', c), it('tx', tx)], 'A').id;
  const b = addGrp(d, [it('gp', a), it('tx', extra)], 'B').id;
  pasteClip(d, clipOf(d, grpLeaves(d, b)), { x: 300, y: 0 });
  assert.equal(n(d.grps), 4);
  const nuevos = Object.keys(d.grps).filter((x) => x !== a && x !== b);
  const nb = nuevos.find((x) => grpName(d, x) === 'B'), na = nuevos.find((x) => grpName(d, x) === 'A');
  assert.equal(grpOf(d, 'gp', na), nb); assert.equal(grpOf(d, 'gp', nb), undefined);
  const d2 = vista();
  const e2 = addText(d2.d, addPoint(d2.d, 0, 50), 'otro', {});
  const a2 = addGrp(d2.d, [it('ci', d2.c), it('tx', d2.tx)], 'A').id;
  const b2 = addGrp(d2.d, [it('gp', a2), it('tx', e2)], 'B').id;
  pasteClip(d2.d, clipOf(d2.d, [it('ci', d2.c), it('tx', e2)]), { x: 300, y: 0 }); // el circulo sin su texto: A no esta completo; B tampoco
  assert.equal(n(d2.d.grps), 2); assert.equal(b2 in d2.d.grps, true);
});

t('espejo y matrices con un grupo: cada copia es un grupo nuevo', () => {
  const { d, c, tx, k } = vista();
  const g = addGrp(d, [it('ct', k), it('ci', c), it('tx', tx)], 'V').id;
  const items = grpLeaves(d, g);
  const m = mirrorCopy(d, items, { x: -10, y: 0 }, { x: -10, y: 10 });
  assert.ok(m.ok); assert.equal(n(d.grps), 2);
  const l = linearArray(d, items, [{ u: { x: 1, y: 0 }, s: 100, n: 2 }]);
  assert.ok(l.ok); assert.equal(n(d.grps), 4);
  const c2 = circularArray(d, items, { c: { x: 0, y: -50 }, step: Math.PI / 2, n: 3 });
  assert.ok(c2.ok); assert.equal(n(d.grps), 6);
  for (const x of Object.keys(d.grps)) assert.equal(grpName(d, x), 'V');
});

console.log(`${passed} pruebas de grupos`);
