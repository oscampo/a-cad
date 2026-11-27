// Ejecucion manual de un texto que dibuja (gen.js): no dibuja solo; «ejecutar» crea elementos normales una vez por pulsacion; «adoptar» corta el vinculo en vivo.
import assert from 'node:assert/strict';
import { newDoc, addPoint, addText, deleteItems, grpLeaves } from '../src/model.js';
import { regenerate, isGen, runGen, adoptGen, genCount } from '../src/gen.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const CARA = '$$w:40\nh:30\na:point("A"; 0; 0)\nb:point("B"; w; 0)\nc:point("C"; w; h)\nd:point("D"; 0; h)\nab:line(a; b)\nbc:line(b; c)\ncd:line(c; d)\nda:line(d; a)$$';
function mk(text = CARA, manual = false) {
  const d = newDoc();
  const tid = addText(d, addPoint(d, -100, 100), text, {});
  if (manual) d.texts[tid].manual = true;
  return { d, tid };
}
const n = (o) => Object.keys(o || {}).length;

t('un texto manual no dibuja al refrescar (y no da error)', () => {
  const { d } = mk(CARA, true);
  const r = regenerate(d);
  assert.deepEqual(r.errs, []);
  assert.equal(n(d.lines), 0); assert.equal(n(d.pts), 1); assert.equal(d.gen, undefined);
});

t('ejecutar crea 4 puntos y 4 lineas normales (sin fijar, nada en doc.gen) y los agrupa', () => {
  const { d, tid } = mk(CARA, true);
  const r = runGen(d, tid);
  assert.equal(r.ok, true); assert.equal(r.n, 4); assert.deepEqual(r.errs, []);
  assert.equal(n(d.lines), 4); assert.equal(n(d.pts), 5);
  assert.ok(Object.values(d.pts).every((p) => !p.fixed));
  assert.equal(d.gen, undefined);
  for (const id of Object.keys(d.pts)) assert.equal(isGen(d, id), false);
  assert.ok(r.group, 'queda un grupo'); assert.equal(d.grps[r.group].name, 'script_1'); // un texto que dibuja directo con point/line: script_N (si llama a una funcion, funcion_N)
  assert.equal(grpLeaves(d, r.group).filter((m) => m.k === 'ln').length, 4);
});

t('refrescar despues de ejecutar no vuelve a dibujar ni toca lo creado; borrar un elemento no lo regenera', () => {
  const { d, tid } = mk(CARA, true);
  runGen(d, tid);
  const before = JSON.stringify(d.lines);
  assert.equal(regenerate(d).changed, false);
  assert.equal(JSON.stringify(d.lines), before);
  const lid = Object.keys(d.lines)[0];
  deleteItems(d, [{ k: 'ln', id: lid }]);
  regenerate(d);
  assert.equal(n(d.lines), 3, 'no vuelve la linea borrada');
});

t('ejecutar de nuevo ACUMULA: otro grupo con ids nuevos', () => {
  const { d, tid } = mk(CARA, true);
  const a = runGen(d, tid), b = runGen(d, tid);
  assert.notEqual(a.group, b.group);
  assert.equal(n(d.lines), 8); assert.equal(n(d.pts), 9);
});

t('ejecutar solo corre su texto: otro texto en vivo no se duplica', () => {
  const { d, tid } = mk(CARA, true);
  const live = addText(d, addPoint(d, 0, 200), '$$q:point("Q"; 5; 5)\nr:point("R"; 9; 9)\nl:line(q; r)$$', {});
  regenerate(d);
  assert.equal(n(d.lines), 1);
  runGen(d, tid);
  assert.equal(n(d.lines), 5);
  regenerate(d);
  assert.equal(n(d.lines), 5);
  assert.equal(genCount(d, live), 3, 'el texto en vivo sigue gobernando lo suyo');
});

t('adoptar: lo que el texto dibujaba en vivo conserva los ids y deja de estar gobernado', () => {
  const { d, tid } = mk();
  regenerate(d);
  const ids = Object.keys(d.lines), pt0 = Object.keys(d.pts).filter((id) => isGen(d, id))[0];
  assert.equal(adoptGen(d, tid, 'cara'), 8);
  d.texts[tid].manual = true;
  assert.equal(d.gen, undefined);
  assert.deepEqual(Object.keys(d.lines), ids);
  assert.equal(d.pts[pt0].fixed, false);
  regenerate(d);
  assert.deepEqual(Object.keys(d.lines), ids, 'sigue igual');
  deleteItems(d, [{ k: 'ln', id: ids[0] }]); regenerate(d);
  assert.equal(n(d.lines), 3, 'una linea borrada no vuelve');
});

t('un archivo con el texto ya manual y objetos en vivo (editado a mano): al refrescar se adoptan, no se borran', () => {
  const { d, tid } = mk();
  regenerate(d);
  d.texts[tid].manual = true;
  const r = regenerate(d);
  assert.equal(r.changed, true);
  assert.equal(n(d.lines), 4); assert.equal(d.gen, undefined);
});

t('un texto con error no crea nada al ejecutar', () => {
  const { d, tid } = mk('$$a:point("A"; 0; 0)\nb:line(a; zz)\nq:1/$$', true);
  const r = runGen(d, tid);
  assert.equal(n(d.lines), 0);
  assert.equal(r.ok, false);
});

t('un texto que no dibuja avisa', () => {
  const { d, tid } = mk('$$x:3$$', true);
  const r = runGen(d, tid);
  assert.equal(r.ok, false); assert.ok(r.notes[0].includes('no dibuja nada'));
});

console.log(`${passed} pruebas de ejecucion manual`);
