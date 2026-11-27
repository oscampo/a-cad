// Snap al arrastrar (src/dragsnap.js): los puntos que se mueven se pegan a puntos, puntos medios y bordes que no se mueven; el iman lleva el ancla a la cuadricula.
import assert from 'node:assert/strict';
import { newDoc, addPoint, addLine, addCircle } from '../src/model.js';
import { dragSnap, grabAnchor } from '../src/dragsnap.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const near = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-9, `${m}: ${a} != ${b}`);

function mk() {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 100, 0);            // linea fija de (0,0) a (100,0)
  const lf = addLine(d, a, b);
  const m = addPoint(d, 30, 50);                                     // el punto que se arrastra
  const c = addCircle(d, addPoint(d, 200, 200), 20);
  return { d, a, b, lf, m, c };
}
const anc = (d, id) => [{ id, x: d.pts[id].x, y: d.pts[id].y }];

t('un punto cerca de otro punto se pega a el (prioridad sobre el resto)', () => {
  const { d, m, b } = mk();
  const r = dragSnap(d, new Set([m]), anc(d, m), { dx: 69, dy: -49 }, 3);  // queda en (99, 1), a ~1.4 de b=(100,0)
  assert.equal(r.hit.type, 'pt');
  near(30 + r.dx, 100, 'x'); near(50 + r.dy, 0, 'y');
});

t('cerca del punto medio de una linea se pega a el; cerca de su borde, al borde', () => {
  const { d, m } = mk();
  const mid = dragSnap(d, new Set([m]), anc(d, m), { dx: 19, dy: -49 }, 3); // (49, 1) ~ punto medio (50, 0)
  assert.equal(mid.hit.type, 'mid'); near(30 + mid.dx, 50, 'x'); near(50 + mid.dy, 0, 'y');
  const ln = dragSnap(d, new Set([m]), anc(d, m), { dx: 40, dy: -48 }, 3);  // (70, 2): sobre el borde, lejos de extremos y medio
  assert.equal(ln.hit.type, 'ln'); near(30 + ln.dx, 70, 'x'); near(50 + ln.dy, 0, 'y');
});

t('el borde de un circulo atrapa', () => {
  const { d, m } = mk();
  const r = dragSnap(d, new Set([m]), anc(d, m), { dx: 190 - 30, dy: 200 - 50 }, 3); // (190, 200): a 10 del centro (200,200), radio 20 -> a 10 del borde: fuera de rango
  assert.equal(r.hit, null);
  const r2 = dragSnap(d, new Set([m]), anc(d, m), { dx: 181.5 - 30, dy: 200 - 50 }, 3); // a 1.5 del borde (180, 200)
  assert.equal(r2.hit.type, 'ci'); near(30 + r2.dx, 180, 'x');
});

t('lo que se mueve no cuenta como objetivo: ni sus puntos ni las lineas que tocan puntos que se mueven', () => {
  const { d, a, b, lf } = mk();
  // se arrastra la linea fija entera: no se pega a si misma
  const r = dragSnap(d, new Set([a, b]), [{ id: a, x: 0, y: 0 }, { id: b, x: 100, y: 0 }], { dx: 1, dy: 1 }, 3);
  assert.ok(r.hit === null || (r.hit.type !== 'pt' && r.hit.type !== 'ln' && r.hit.type !== 'mid'), 'no se pega a su propia linea');
  assert.ok(lf);
});

t('una linea que se arrastra se pega con cualquiera de sus extremos', () => {
  const d = newDoc();
  const p = addPoint(d, 0, 0), q = addPoint(d, 10, 0), fijo = addPoint(d, 60, 5);
  addLine(d, p, q);
  // desplazamiento de (49, 5.5): q=(10,0) quedaria en (59, 5.5) ~ fijo (60,5); p quedaria en (49, 5.5)
  const r = dragSnap(d, new Set([p, q]), [{ id: p, x: 0, y: 0 }, { id: q, x: 10, y: 0 }], { dx: 49, dy: 5.5 }, 3);
  assert.equal(r.hit.type, 'pt'); assert.equal(r.hit.anchor, q);
  near(10 + r.dx, 60, 'x'); near(0 + r.dy, 5, 'y');
});

t('sin objetos cerca, el iman lleva el ancla agarrada a un nudo de la cuadricula; sin iman no cambia nada', () => {
  const { d, m } = mk();
  const g = dragSnap(d, new Set([m]), anc(d, m), { dx: 12.4, dy: -20.6 }, 3, { grid: 10, gridId: m });
  assert.equal(g.hit.type, 'grid'); near(30 + g.dx, 40, 'x'); near(50 + g.dy, 30, 'y');
  const free = dragSnap(d, new Set([m]), anc(d, m), { dx: 12.4, dy: -20.6 }, 3);
  assert.equal(free.hit, null); assert.equal(free.dx, 12.4); assert.equal(free.dy, -20.6);
});

t('tol negativa (solo el iman): ningun objeto atrapa', () => {
  const { d, m } = mk();
  const r = dragSnap(d, new Set([m]), anc(d, m), { dx: 69, dy: -49 }, -1);
  assert.equal(r.hit, null);
});

t('los puntos de texto ocultos no atrapan', () => {
  const { d, m, b } = mk();
  const r = dragSnap(d, new Set([m]), anc(d, m), { dx: 69, dy: -49 }, 3, { hidden: new Set([b]) });
  assert.notEqual(r.hit?.anchor && r.hit.type === 'pt' && Math.abs(30 + r.dx - 100) < 1e-9, true);
});

t('toque desviado del trazo (dedo): el ancla es el punto de la linea, y al pegarse la LINEA toca el circulo', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 100, 0), l = addLine(d, a, b);
  const c = addCircle(d, addPoint(d, 50, 80), 20);               // su borde mas bajo: (50, 60)
  const anchor = grabAnchor(d, { k: 'ln', id: l }, { x: 50, y: 12 }, { [a]: d.pts[a], [b]: d.pts[b] }); // el dedo toco 12 sobre la linea
  near(anchor.x, 50, 'x'); near(anchor.y, 0, 'y');
  const r = dragSnap(d, new Set([a, b]), [{ id: '__ptr', ...anchor }], { dx: 0, dy: 58 }, 5);
  assert.equal(r.hit.type, 'tan');
  near(r.dy, 60, 'la linea sube hasta tocar el circulo, no 12 antes');
});

t('una linea que se mueve entera queda TANGENTE a un circulo fijo (distancia del centro a la linea = r), aunque se agarre lejos del pie de la perpendicular', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 100, 0), l = addLine(d, a, b);
  addCircle(d, addPoint(d, 70, 80), 20);                            // su borde mas bajo: y = 60
  const orig = { [a]: { ...d.pts[a] }, [b]: { ...d.pts[b] } };
  const r = dragSnap(d, new Set([a, b]), [{ id: '__ptr', x: 20, y: 0 }], { dx: 5, dy: 57 }, 5, { orig });
  assert.equal(r.hit.type, 'tan');
  near(r.dy, 60, 'la linea queda a r del centro: y = 60'); near(r.dx, 5, 'no se desplaza a lo largo de la linea');
  near(r.hit.x, 70, 'contacto bajo el centro'); near(r.hit.y, 60, 'contacto en el borde');
});

t('tangente en la linea inclinada: la distancia del centro a la linea queda exactamente en r', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 100, 100), l = addLine(d, a, b);
  const C = addPoint(d, 100, 0); addCircle(d, C, 20);
  const orig = { [a]: { ...d.pts[a] }, [b]: { ...d.pts[b] } };
  const r = dragSnap(d, new Set([a, b]), [{ id: '__ptr', x: 50, y: 50 }], { dx: 70, dy: 0 }, 5, { orig });
  assert.equal(r.hit.type, 'tan');
  const dist = Math.abs(100 - r.dx + r.dy) / Math.SQRT2; // distancia del centro (100, 0) a la recta y = x desplazada (r.dx, r.dy)
  near(dist, 20, 'tangente exacta');
});

t('un circulo que se mueve queda tangente a una linea fija y a otro circulo fijo', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 100, 0); addLine(d, a, b);
  const cp = addPoint(d, 50, 33); addCircle(d, cp, 10);              // toca la linea cuando su centro esta en y = 10
  const orig = { [cp]: { ...d.pts[cp] } };
  let r = dragSnap(d, new Set([cp]), [{ id: cp, x: 50, y: 33 }], { dx: 0, dy: -20 }, 5, { orig }); // centro pedido (50, 13): a 3 de y=10
  assert.equal(r.hit.type, 'tan'); near(33 + r.dy, 10, 'tangente a la linea');
  const e = newDoc(); const c1 = addPoint(e, 0, 0); addCircle(e, c1, 20);
  const c2 = addPoint(e, 40, 3); addCircle(e, c2, 10);                // tangente por fuera cuando |centros| = 30
  r = dragSnap(e, new Set([c2]), [{ id: c2, x: 40, y: 3 }], { dx: -8, dy: 0 }, 5, { orig: { [c2]: { ...e.pts[c2] } } }); // centro (32, 3): a ~32.1 del otro
  assert.equal(r.hit.type, 'tan');
  near(Math.hypot(40 + r.dx, 3 + r.dy), 30, 'tangente exterior');
});

console.log(`${passed} pruebas de snap al arrastrar`);
