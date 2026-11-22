// Cotas con etiqueta libre y tamaño de letra; lineas indicativas (anotaciones LEAD): geometria, arrastre, exportacion.
import assert from 'node:assert/strict';
import { newDoc, addPoint, addLine, addCircle, addArc, addSpline, addCon, deleteItems } from '../src/model.js';
import { splitLabel, splitScale, dimText, layoutDim, dragDim, pointOnElement, leadLabel, dimGain, endOfElement } from '../src/dims.js';
import { exportSVG, exportSVGLaser, laserClasses } from '../src/export.js';
import { solve, initSolver } from '../src/solver.js';

let passed = 0;
const t = async (name, fn) => { await fn(); passed++; console.log('ok  ' + name); };
const view = { s: 4, ox: 100, oy: 400 };

await t('etiqueta libre: texto, fórmula y combinada con la escala; el valor no cambia', () => {
  assert.deepEqual(splitLabel('50["D"]'), { body: '50', lbl: '"D"' });
  assert.deepEqual(splitLabel('50[$D/2$]'), { body: '50', lbl: '$D/2$' });
  assert.deepEqual(splitLabel('50[$$D_1$$]'), { body: '50', lbl: '$$D_1$$' });
  assert.deepEqual(splitLabel('D1*2[“r”]'), { body: 'D1*2', lbl: '"r"' }); // comillas tipograficas del iPad
  const c = splitLabel("30[*1'mm/kN][\"F\"]");
  assert.equal(c.lbl, '"F"'); assert.equal(splitScale(c.body).src, "1'mm/kN");
  assert.deepEqual(splitLabel('30[*2]'), { body: '30[*2]' }); // solo escala: no es etiqueta
  const d = newDoc(), a = addPoint(d, 0, 0), b = addPoint(d, 50, 0);
  assert.equal(dimText(d, { t: 'DIST', refs: [a, b], v: 50, lbl: '"D"' }), 'D');
  assert.equal(dimText(d, { t: 'DIST', refs: [a, b], v: 50, lbl: '$D/2$' }), '$D/2$'); // la formula la dibuja el motor de los textos
});

await t('tamaño de letra: flechas, separaciones y letra crecen con él', () => {
  const d = newDoc(), a = addPoint(d, 0, 0), b = addPoint(d, 50, 0);
  const k12 = { t: 'DIST', refs: [a, b], v: 50 }, k24 = { ...k12, fs: 24 };
  assert.equal(dimGain(k12), 1); assert.equal(dimGain(k24), 2);
  const L1 = layoutDim(d, k12, view), L2 = layoutDim(d, k24, view);
  assert.equal(L1.label.px, 12); assert.equal(L2.label.px, 24); assert.equal(L2.size, 2);
  assert.ok(Math.abs(L2.label.y - L1.label.y) > 5); // la etiqueta se separa mas de la linea de cota
});

await t('pertenencia: extremo, centro, punto de control, punto sobre la recta; uno ajeno no', () => {
  const d = newDoc(), a = addPoint(d, 0, 0), b = addPoint(d, 10, 0), m = addPoint(d, 4, 0), q = addPoint(d, 4, 3), c = addPoint(d, 20, 0), on = addPoint(d, 25, 0);
  const l = addLine(d, a, b, {}), ci = addCircle(d, c, 5, {});
  const s1 = addPoint(d, 0, 10), s2 = addPoint(d, 5, 14), s3 = addPoint(d, 10, 10), sp = addSpline(d, [s1, s2, s3], {});
  assert.ok(pointOnElement(d, a, l)); assert.ok(pointOnElement(d, m, l)); assert.ok(!pointOnElement(d, q, l));
  assert.ok(pointOnElement(d, c, ci)); assert.ok(pointOnElement(d, on, ci)); assert.ok(!pointOnElement(d, a, ci));
  assert.ok(pointOnElement(d, s2, sp)); assert.ok(!pointOnElement(d, q, sp));
  d.cons.kx = { t: 'PONL', refs: [q, l] }; assert.ok(pointOnElement(d, q, l)); // con la restriccion «sobre» cuenta aunque aun no este
});

await t('texto de la etiqueta: suelto, entre comillas, fórmula o entre corchetes', () => {
  assert.equal(leadLabel('Agujero'), '"Agujero"'); assert.equal(leadLabel('"F"'), '"F"'); assert.equal(leadLabel('$K_t$'), '$K_t$');
  assert.equal(leadLabel('[$$x^2$$]'), '$$x^2$$'); assert.equal(leadLabel('  '), null); assert.equal(leadLabel('a "b"'), '"a ”b”"');
});

await t('línea indicativa: punta en el punto con flecha, etiqueta a su distancia; sigue al punto y se arrastra', () => {
  const d = newDoc(), a = addPoint(d, 0, 0), b = addPoint(d, 10, 0), l = addLine(d, a, b, {});
  const k = { t: 'LEAD', refs: [b, l], lbl: '"F"', ox: 10, oy: 10 };
  let L = layoutDim(d, k, view);
  assert.deepEqual([L.label.x, L.label.y], [140 + 40, 400 - 40]);
  assert.equal(L.arrows.length, 1); assert.deepEqual([L.arrows[0].x, L.arrows[0].y], [140, 400]); // la punta, en el punto
  assert.equal(L.lines.length, 1);
  d.pts[b].x = 20; L = layoutDim(d, k, view);
  assert.deepEqual([L.label.x, L.arrows[0].x], [220, 180]); // sigue a la geometria
  assert.ok(dragDim(d, k, view, { x: 180 + 40, y: 400 + 20 }));
  assert.deepEqual([k.ox, k.oy], [10, -5]);
  assert.equal(dimText(d, { t: 'LEAD', refs: [b, l] }), '…'); // sin etiqueta se ve (y se puede tocar)
});

await t('línea indicativa: el solver no la ve y se va con su elemento', async () => {
  await initSolver();
  const d = newDoc(), a = addPoint(d, 0, 0), b = addPoint(d, 10, 0), l = addLine(d, a, b, {});
  const id = addCon(d, { t: 'LEAD', refs: [b, l], lbl: '"F"', ox: 5, oy: 5 });
  assert.equal(d.cons[id].name, undefined); // no es una cota con nombre (D1)
  assert.ok(solve(d, []).ok); assert.deepEqual([d.pts[b].x, d.pts[b].y], [10, 0]);
  deleteItems(d, [{ k: 'ln', id: l }]);
  assert.equal(d.cons[id], undefined);
});

await t('SVG: con su color, grosor y tipo de línea; la letra de cada cota; la fórmula como texto plano', () => {
  const d = newDoc(), a = addPoint(d, 0, 0), b = addPoint(d, 10, 0), l = addLine(d, a, b, { color: 'auto', ltype: 'continua', w: 2 });
  d.cons.k1 = { t: 'LEAD', refs: [b, l], lbl: '$K_t$', ox: 5, oy: 5, color: '#ff0000', ltype: 'discontinua', w: 3 };
  d.cons.k2 = { t: 'DIST', refs: [a, b], v: 10, lbl: '"L"', fs: 20 };
  const svg = exportSVG(d);
  assert.match(svg, /<line [^>]*stroke="#ff0000" stroke-width="3" stroke-dasharray/);
  assert.match(svg, /<polygon [^>]*fill="#ff0000"/);
  assert.match(svg, /fill="#ff0000">K_t<\/text>/);
  assert.match(svg, /font-size="20"[^>]*>L<\/text>/);
});

await t('con cuerpo: en un extremo, el elemento es la línea indicativa (flecha tangente, etiqueta en el otro extremo); no se corta con láser', () => {
  const d = newDoc(), c = addPoint(d, 0, 0), a = addPoint(d, 10, 0), b = addPoint(d, 0, 10), ar = addArc(d, c, a, b, 10, { w: 2 });
  const s1 = addPoint(d, 30, 0), s2 = addPoint(d, 40, 8), s3 = addPoint(d, 50, 0), sp = addSpline(d, [s1, s2, s3], {}), spc = addSpline(d, [s1, s2, s3], {}, true);
  assert.ok(endOfElement(d, b, ar)); assert.ok(!endOfElement(d, c, ar)); assert.ok(endOfElement(d, s3, sp)); assert.ok(!endOfElement(d, s2, sp)); assert.ok(!endOfElement(d, s1, spc));
  const k = { t: 'LEAD', refs: [b, ar], on: 1, lbl: '"q"' };
  const L = layoutDim(d, k, view), A = L.arrows[0];
  assert.equal(L.lines.length, 0); // el trazo es el del arco
  assert.ok(Math.abs(A.dx + 1) < 0.01 && Math.abs(A.dy) < 0.05); // en b (arriba) el arco antihorario llega yendo hacia la izquierda
  assert.ok(Math.abs(A.x - (100 - 0.5)) < 4 && Math.abs(A.y - 360) < 1); // en la punta (adelantada lo justo para tapar el final del trazo)
  assert.ok(L.label.x > 140 && Math.abs(L.label.y - 400) < 15); // junto al otro extremo (a, a la derecha abajo)
  d.pts[a].y = -0; assert.ok(dragDim(d, k, view, { x: 160, y: 420 })); assert.deepEqual([k.ox, k.oy], [5, -5]); // relativa al otro extremo
  d.cons.k1 = k; d.cons.k2 = { t: 'LEAD', refs: [s3, sp], on: 1, lbl: '"r"' };
  assert.equal(laserClasses(d).reduce((n, x) => n + x.count, 0), 1); // solo el spline cerrado
  assert.ok(!/<path d="M[^"]*A/.test(exportSVGLaser(d) || '')); // el arco no sale en el corte
});

console.log(`\n${passed} pruebas de etiquetas y anotaciones pasaron`);
