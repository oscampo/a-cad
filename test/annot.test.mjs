// Cotas con etiqueta libre y tamaño de letra; lineas indicativas (anotaciones LEAD): geometria, arrastre, exportacion.
import assert from 'node:assert/strict';
import { newDoc, addPoint, addLine, addCircle, addArc, addSpline, addCon, deleteItems } from '../src/model.js';
import { splitLabel, splitScale, dimText, layoutDim, dragDim, pointOnElement, leadLabel, dimGain, endOfElement, leadSpots, leadLabelPlace, LEAD_GAP } from '../src/dims.js';
import { exportSVG, exportSVGLaser, laserClasses } from '../src/export.js';
import { solve, initSolver } from '../src/solver.js';

let passed = 0;
const t = async (name, fn) => { await fn(); passed++; console.log('ok  ' + name); };
const view = { s: 4, ox: 100, oy: 400 };
const SXs = (a) => ({ l: 1, c: 0, r: -1 })[a[1]];

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

await t('SVG: con su color, grosor y tipo de línea; la letra de cada cota; la etiqueta de la línea indicativa como texto, con su fórmula', () => {
  const d = newDoc(), a = addPoint(d, 0, 0), b = addPoint(d, 10, 0), l = addLine(d, a, b, { color: 'auto', ltype: 'continua', w: 2 });
  d.cons.k1 = { t: 'LEAD', refs: [b, l], lbl: '$K_t$', ox: 5, oy: 5, color: '#ff0000', ltype: 'discontinua', w: 3 };
  d.cons.k2 = { t: 'DIST', refs: [a, b], v: 10, lbl: '"L"', fs: 20 };
  const svg = exportSVG(d);
  assert.match(svg, /<line [^>]*stroke="#ff0000" stroke-width="3" stroke-dasharray/);
  assert.match(svg, /<polygon [^>]*fill="#ff0000"/);
  assert.match(svg, /<g transform="translate\([^)]*\) rotate\(0\)" fill="#ff0000"><text [^>]*>K<\/text><text [^>]*>t<\/text><\/g>/); // la etiqueta sale como texto, con la formula dibujada (K con subindice t)
  assert.match(svg, /font-size="20"[^>]*>L<\/text>/);
});

await t('con cuerpo: en un extremo, el elemento es la línea indicativa (flecha tangente, etiqueta en el otro extremo); no se corta con láser', () => {
  const d = newDoc(), c = addPoint(d, 0, 0), a = addPoint(d, 10, 0), b = addPoint(d, 0, 10), ar = addArc(d, c, a, b, 10, { w: 2 });
  const s1 = addPoint(d, 30, 0), s2 = addPoint(d, 40, 8), s3 = addPoint(d, 50, 0), sp = addSpline(d, [s1, s2, s3], {}), spc = addSpline(d, [s1, s2, s3], {}, true);
  assert.ok(endOfElement(d, b, ar)); assert.ok(!endOfElement(d, c, ar)); assert.ok(endOfElement(d, s3, sp)); assert.ok(!endOfElement(d, s2, sp)); assert.ok(!endOfElement(d, s1, spc));
  const k = { t: 'LEAD', refs: [b, ar], on: 1, lbl: '"q"', h: 2 };
  let L = layoutDim(d, k, view); const A = L.arrows[0];
  assert.equal(L.lines.length, 0); // el trazo es el del arco
  assert.ok(Math.abs(A.dx + 1) < 0.01 && Math.abs(A.dy) < 0.05); // en b (arriba) el arco antihorario llega yendo hacia la izquierda
  assert.ok(Math.abs(A.len - 12) < 1e-9 && Math.abs(A.hw - 2) < 1e-9); // la flecha de las cotas: 12 px, 3:1
  assert.deepEqual(leadSpots(d, k).map((x) => x.key), ['a', 'm', 'b']);
  assert.equal(L.label.anchor, 'tc'); // en a (abajo a la derecha) el arco sale hacia abajo: el texto cuelga debajo
  assert.ok(Math.abs(L.label.x - 140) < 1e-9 && Math.abs(L.label.y - (400 + LEAD_GAP * 2 * 4)) < 1e-9); // en el otro extremo, separado un cuarto de altura
  
  assert.ok(dragDim(d, k, view, { x: 100 + 7.07 * 4, y: 400 - 7.07 * 4 })); assert.equal(k.at, 'm'); // arrastrada, salta al punto medio
  k.anchor = 'bl'; const P = leadLabelPlace(d, k, 1).P; assert.ok(Math.abs(P.x - (7.071 + 0.5)) < 1e-3 && Math.abs(P.y - (7.071 + 0.5)) < 1e-3);
  const ks = { t: 'LEAD', refs: [s3, sp], on: 1, h: 1 }; assert.deepEqual(leadSpots(d, ks).map((x) => x.key), ['i0', 'i1', 'i2']); assert.equal(leadLabelPlace(d, ks, 1).P.x, 30 + SXs(leadLabelPlace(d, ks, 1).anchor) * LEAD_GAP); // en un spline, en sus puntos; por defecto el primero
  d.cons.k1 = k; d.cons.k2 = ks;
  assert.equal(laserClasses(d).reduce((n, x) => n + x.count, 0), 1); // solo el spline cerrado
  assert.ok(!/<path d="M[^"]*A/.test(exportSVGLaser(d) || '')); // el arco no sale en el corte
});

await t('cotas con la letra de los textos (doc.dimText): altura en unidades del dibujo, escalan con el zoom; sin el ajuste, en px como antes', () => {
  const d = newDoc(), a = addPoint(d, 0, 0), b = addPoint(d, 50, 0), k = { t: 'DIST', refs: [a, b], v: 50 };
  const px = (doc, kk, s) => layoutDim(doc, kk, { s, ox: 0, oy: 0 }).label.px;
  assert.equal(px(d, k, 4), 12); assert.equal(px(d, k, 8), 12); // sin el ajuste: 12 px con cualquier zoom
  d.dimText = true; d.dimH = 3;
  assert.equal(px(d, k, 4), 12); assert.equal(px(d, k, 8), 24); // 3 unidades × escala: el doble de zoom, el doble de px
  assert.equal(px(d, { ...k, th: 5 }, 4), 20); // una cota con su propia altura
  assert.equal(px(d, { ...k, fs: 30 }, 4), 12); // el tamaño en px de antes no cuenta con el ajuste
  const L = layoutDim(d, k, { s: 8, ox: 0, oy: 0 }); assert.equal(L.size, 2); // flechas y separaciones con la letra
});

await t('flechas de cota según ASME Y14.2: largo = altura de las cifras y base = largo / 3, rellenas (también en el SVG)', () => {
  const d = newDoc(), a = addPoint(d, 0, 0), b = addPoint(d, 50, 0); d.dimText = true; d.dimH = 3;
  d.cons.k1 = { t: 'DIST', refs: [a, b], v: 50 };
  const svg = exportSVG(d), m = /<polygon points="([^"]+)" fill="#000000"\/>/.exec(svg);
  const [P0, P1, P2] = m[1].split(' ').map((q) => q.split(',').map(Number));
  const base = Math.hypot(P1[0] - P2[0], P1[1] - P2[1]), mid = [(P1[0] + P2[0]) / 2, (P1[1] + P2[1]) / 2], len = Math.hypot(P0[0] - mid[0], P0[1] - mid[1]);
  assert.ok(Math.abs(len / base - 3) < 1e-6, `proporción ${len / base}`);
  assert.ok(Math.abs(len - 3 * 6) < 1e-3); // 3 de altura × 6 (escala del SVG): el largo es la altura de las cifras
});

await t('flecha de línea indicativa = flecha de cota: mismo largo y 3:1, con zoom; no depende del grosor ni de la altura de la etiqueta', () => {
  const d = newDoc(), a = addPoint(d, 0, 0), b = addPoint(d, 20, 0), l = addLine(d, a, b, { w: 3.5 });
  const k = { t: 'LEAD', refs: [b, l], on: 1, lbl: '"F"', h: 3, fs: 18 }, kd = { t: 'DIST', refs: [a, b], v: 20 };
  for (const dimText of [false, true]) {
    if (dimText) { d.dimText = true; d.dimH = 2.5; }
    for (const s of [1, 2, 10]) {
      const view = { s, ox: 0, oy: 0 }, A = layoutDim(d, k, view).arrows[0], D = layoutDim(d, kd, view).arrows[0];
      const dl = Math.hypot(D.dx, D.dy) && (D.len ?? 12 * layoutDim(d, kd, view).size);
      assert.ok(Math.abs(A.len - dl) < 1e-9, `largo ${A.len} vs cota ${dl} (dimText ${dimText}, escala ${s})`);
      assert.ok(Math.abs(A.len / (2 * A.hw) - 3) < 1e-9);
      assert.ok(Math.abs(A.len - (dimText ? 2.5 * s : 12)) < 1e-9); // sin el ajuste, 12 px con cualquier zoom; con él, la letra de cotas × escala
    }
  }
});

console.log(`\n${passed} pruebas de etiquetas y anotaciones pasaron`);
