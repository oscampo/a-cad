// Borrar un elemento borra sus puntos que ya no usa nada, aunque no sean automaticos (los que deja un script ejecutado a mano o el usuario puso con la herramienta
// Punto): antes dependia de si «Puntos» estaba visible (con un cuadro de seleccion visible se tomaban tambien los puntos; apagado, quedaban «puntos sueltos»).
import assert from 'node:assert/strict';
import { newDoc, addPoint, addLine, addCircle, addArc, addEllipse, addText, addCon, deleteItems } from '../src/model.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const n = (o) => Object.keys(o || {}).length;

t('una linea con puntos propios (no automaticos): al borrarla se van sus dos puntos', () => {
  const d = newDoc(), a = addPoint(d, 0, 0, false), b = addPoint(d, 10, 0, false), l = addLine(d, a, b);
  deleteItems(d, [{ k: 'ln', id: l }], { orphans: true });
  assert.equal(n(d.lines), 0); assert.equal(n(d.pts), 0);
});

t('sin la opcion todo sigue como antes: los puntos no automaticos quedan', () => {
  const d = newDoc(), a = addPoint(d, 0, 0, false), b = addPoint(d, 10, 0, false), l = addLine(d, a, b);
  deleteItems(d, [{ k: 'ln', id: l }]);
  assert.equal(n(d.lines), 0); assert.equal(n(d.pts), 2);
});

t('un punto que usa otro elemento se queda', () => {
  const d = newDoc(), a = addPoint(d, 0, 0), b = addPoint(d, 10, 0), c = addPoint(d, 10, 10);
  const l1 = addLine(d, a, b), l2 = addLine(d, b, c);
  deleteItems(d, [{ k: 'ln', id: l1 }], { orphans: true });
  assert.deepEqual(Object.keys(d.pts).sort(), [b, c].sort()); assert.ok(d.lines[l2]);
});

t('un arco: se van su centro y sus dos extremos; un circulo, su centro', () => {
  const d = newDoc(), c = addPoint(d, 0, 0), a = addPoint(d, 10, 0), b = addPoint(d, 0, 10), ar = addArc(d, c, a, b);
  const c2 = addPoint(d, 30, 0), ci = addCircle(d, c2, 5);
  deleteItems(d, [{ k: 'ar', id: ar }, { k: 'ci', id: ci }], { orphans: true });
  assert.equal(n(d.arcs), 0); assert.equal(n(d.circles), 0); assert.equal(n(d.pts), 0);
});

t('una elipse y un arco eliptico con sus puntos de eje y de extremo', () => {
  const d = newDoc(), c = addPoint(d, 0, 0), a = addPoint(d, 20, 0), b = addPoint(d, 0, 10);
  const full = addEllipse(d, c, a, b, {}), earc = addEllipse(d, addPoint(d, 100, 0), addPoint(d, 120, 0), addPoint(d, 100, 10), {}, addPoint(d, 120, 0), addPoint(d, 100, 10));
  deleteItems(d, [{ k: 'el', id: full }, { k: 'el', id: earc }], { orphans: true });
  assert.equal(n(d.ellipses), 0); assert.equal(n(d.pts), 0);
});

t('un punto que usa un texto, una relacion o una cota se queda', () => {
  const d = newDoc(), a = addPoint(d, 0, 0), b = addPoint(d, 10, 0), c = addPoint(d, 5, 5), l = addLine(d, a, b);
  addText(d, a, 'etiqueta', {});
  const k = addCon(d, { t: 'DIST', refs: [b, c], v: 7 });
  deleteItems(d, [{ k: 'ln', id: l }], { orphans: true });
  assert.ok(d.pts[a], 'lo usa un texto'); assert.ok(d.pts[b], 'lo usa una cota'); assert.ok(d.pts[c]); assert.ok(d.cons[k]);
});

t('lo que genera un script no se borra con el elemento', () => {
  const d = newDoc(), a = addPoint(d, 0, 0), b = addPoint(d, 10, 0), l = addLine(d, a, b);
  d.gen = { map: { 't1/A': a } };
  deleteItems(d, [{ k: 'ln', id: l }], { orphans: true });
  assert.ok(d.pts[a], 'generado'); assert.equal(d.pts[b], undefined);
});

t('borrar un punto explicito sigue llevandose los elementos que lo usan, como siempre', () => {
  const d = newDoc(), a = addPoint(d, 0, 0), b = addPoint(d, 10, 0), l = addLine(d, a, b);
  deleteItems(d, [{ k: 'pt', id: a }], { orphans: true });
  assert.equal(n(d.lines), 0); assert.ok(d.pts[b], 'el otro extremo, que se borra pidiendo solo un punto, queda como antes');
});

console.log(passed + ' pruebas de borrado sin puntos huerfanos');
