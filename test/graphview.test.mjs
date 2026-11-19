// Graficas: x generica propia, x como vector del dibujo, tiempo solo del reproductor, zoom y paneo de los ejes.
import assert from 'node:assert/strict';
import { newDoc, addPoint, addText } from '../src/model.js';
import { addGraph, computeGraph, genericRange, genericX, GEN_X } from '../src/graphs.js';
import { panWin, zoomWin, zoomPos, zoomFromPos, winCenter, setWindow, clearWindow, ZOOM_R } from '../src/graphview.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) < e, a + ' ~ ' + b);
const mk = (...texts) => { const d = newDoc(); d.angles = 'rad'; texts.forEach((s, i) => addText(d, addPoint(d, 0, -i), s, {})); return d; };
const run = (d, series, extra = {}) => { const g = { x: 0, y: 0, w: 50, h: 30, series, n: 5, ...extra }; return computeGraph(d, g, () => ({ ok: true })); };

t('una grafica nueva no tiene tiempo final propio', () => {
  const d = newDoc(); const id = addGraph(d, 0, 0, 40, 30, ['x vs x']);
  assert.equal('t1' in d.graphs[id], false);
  assert.equal(d.graphs[id].n, 100);
});

t('x generica: n valores entre los limites del eje x1 (por defecto GEN_X)', () => {
  assert.deepEqual(genericRange({}, 'x1'), GEN_X);
  assert.deepEqual(genericRange({ axes: { x1: { min: 0, max: 4 } } }), [0, 4]);
  assert.deepEqual(genericRange({ axes: { x1: { min: 2, max: null } } }), [2, 22]); // un solo limite: el ancho por defecto
  assert.deepEqual(genericRange({ axes: { x1: { min: 5, max: 1 } } }), GEN_X); // limites al reves: por defecto
  assert.deepEqual(genericX({}, 'x1', 5), [-10, -5, 0, 5, 10]);
  const lg = genericX({ axes: { x1: { min: 1, max: 100, scale: 'log' } } }, 'x1', 3);
  near(lg[1], 10); // geometrica en escala log
});

t('«y vs x» sin definir x: cada grafica usa su vector y se resamplea con sus limites', () => {
  const d = mk('$$f(x):x^2$$');
  let r = run(d, ['f(x) vs x']);
  assert.equal(r.error, null); assert.equal(r.generic, true);
  assert.deepEqual(r.series[0].pts, [[-10, 100], [-5, 25], [0, 0], [5, 25], [10, 100]]);
  r = run(d, ['f(x) vs x'], { axes: { x1: { min: 0, max: 2 } } });
  assert.deepEqual(r.series[0].pts.map((p) => p[0]), [0, 0.5, 1, 1.5, 2]);
  const a = run(d, ['x vs x'], { axes: { x1: { min: 0, max: 1 } } }), b = run(d, ['x vs x']); // dos graficas, dos ventanas independientes
  assert.equal(a.series[0].pts.at(-1)[0], 1); assert.equal(b.series[0].pts.at(-1)[0], 10);
});

t('x definida como rango o vector: se usan esos valores', () => {
  const d = mk('$$x:0..1;3$$\n$$f(x):2*x$$');
  const r = run(d, ['f(x) vs x', 'x^2 vs x']);
  assert.equal(r.error, null); assert.ok(!r.generic);
  assert.deepEqual(r.series[0].pts, [[0, 0], [0.5, 1], [1, 2]]);
  assert.deepEqual(r.series[1].pts.map((p) => p[1]), [0, 0.25, 1]);
});

t('una formula con if() que no admite vectores se evalua elemento por elemento', () => {
  const d = mk('$$x:0..2;3$$\n$$g(x):if(x>0.5, 1, 0)$$');
  const r = run(d, ['g(x) vs x']);
  assert.equal(r.error, null);
  assert.deepEqual(r.series[0].pts, [[0, 0], [1, 1], [2, 1]]);
});

t('la x generica no se combina con t', () => {
  const r = run(mk(), ['t vs x']);
  assert.match(r.error, /x genérica no se combina con t/);
});

t('t sigue siendo el tiempo del reproductor (doc.tEnd), no de la grafica', () => {
  const d = mk(); d.tEnd = 2;
  const r = run(d, ['t vs t'], { t1: 99, n: 3 }); // un t1 viejo en la grafica se ignora
  assert.deepEqual(r.series[0].pts, [[0, 0], [1, 1], [2, 2]]);
});

t('zoom y paneo: ventanas lineales y logaritmicas', () => {
  assert.deepEqual(panWin(0, 10, 0.5), [5, 15]);
  assert.deepEqual(panWin(0, 10, -0.1), [-1, 9]);
  const l = panWin(1, 100, 0.5, true); near(l[0], 10); near(l[1], 1000);
  assert.deepEqual(zoomWin(0, 10, 2), [2.5, 7.5]);
  assert.deepEqual(zoomWin(0, 10, 2, false, 0), [0, 5]); // alrededor de un extremo
  near(zoomPos(0, 20, [0, 20]), 0);
  near(zoomPos(0, 2, [0, 20]), 0.5); // 10 veces mas cerca: la mitad del recorrido (R = 100)
  assert.equal(zoomPos(0, 0.001, [0, 20]), 1); assert.equal(zoomPos(0, 1e6, [0, 20]), -1);
  const w = zoomFromPos(3, [0, 20], 0.5); near(w[1] - w[0], 2); near(winCenter(w[0], w[1]), 3);
  for (const s of [-1, -0.3, 0, 0.7, 1]) { const [a, b] = zoomFromPos(3, [0, 20], s); near(zoomPos(a, b, [0, 20]), s); }
  assert.equal(ZOOM_R, 100);
});

t('setWindow y clearWindow guardan y quitan los limites sin tocar el resto del eje', () => {
  const g = { axes: { x1: { name: 'tiempo', scale: 'log', major: 4, minor: 0 } } };
  setWindow(g, 'x1', 1, 100);
  assert.deepEqual(g.axes.x1, { name: 'tiempo', scale: 'log', major: 4, minor: 0, min: 1, max: 100 });
  setWindow(g, 'y1', -1, 1); assert.equal(g.axes.y1.scale, 'lin');
  clearWindow(g, 'x1'); assert.equal(g.axes.x1.min, null); assert.equal(g.axes.x1.name, 'tiempo');
  clearWindow(g, 'zz'); // un eje sin configuracion no falla
});

console.log(`\n${passed} pruebas de ventana de graficas pasaron`);
