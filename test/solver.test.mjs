import assert from 'node:assert/strict';
import { addLayer, deleteLayer, layerCount, isHidden, shownEntries, layerHiddenPoints, consHidden, visibleDoc, newDoc, addPoint, addLine, addCircle, addArc, addCon, addText, addSpline, deleteItems, hatchLoops, arcOf, cleanup, splinePolyline, conTag, ensureNumbers, addEllipse, ellipseOf, ellipsePolyline, ellipsePoint, ellipseParam, ellipseRange, isPartial } from '../src/model.js';
import { startTrace, recordTraces, traceToSpline, offsetPolyline, firstLap, unfoldPath } from '../src/curves.js';
import { layoutDim, dragDim, dimValue, dimText, angSector, angTrue, initAngle, trackAngles } from '../src/dims.js';
import { textFrame, textCorners, textHit, textPose, rawAngle, textValue, shownText, lineWidth } from '../src/text.js';
import { exportSVG, exportSVGLaser, exportDXF, dimLayouts, extraExtents, laserClasses, styleKey } from '../src/export.js';
import { splitElement } from '../src/split.js';
import { buildTree, conLabel, contours } from '../src/tree.js';
import { cleanFileBase } from '../src/files.js';
import { parseValue, evalExpr, isPlainNumber, exprRefs, renameInExpr } from '../src/expr.js';
import { makeVector, unmakeVector, syncVectors, isVector, vecArrow, vecEnds } from '../src/vectors.js';
import { varsInfo, readInt, splitTop, recompute, pruneFormulas, renameDim, checkName, varsOf, settle, hasReactive, textVarErrors, usesTextVars, varsList } from '../src/params.js';
import { runsOf, plainText } from '../src/tvars.js';
import { cornerOf, filletCorner, chamferCorner, maxFillet, filletBetween, chamferBetween, filletReach, cornerPair, cornerElements, coincidentIds } from '../src/corners.js';
import { addRotary, addLinear, actName, actDisp, simBegin, simStep, simEnd, parseTable, actError } from '../src/actuators.js';
import { addGraph, computeGraph, computeGraphAsync, niceTicks, parseSeries, axisLayout } from '../src/graphs.js';
import { rigidShape, looseShape, isRigid } from '../src/rigid.js';
import { nameDims, withOp } from '../src/model.js';
import { trimAt, extendEnd, cutsOf, curveCuts, linearArray, mirrorCopy, circularArray, clipOf, pasteClip, bboxOf } from '../src/edit.js';
import { CLINE_STYLE, circleThrough3, addRectangle, polygonVertices, addPolygon, arcIsClockwise, constructionArcDash } from '../src/shapes.js';
import { FONTS, fontCss } from '../src/text.js';
import { lineLock, lockConstraints, originsOfPoint, originsOfSnap } from '../src/lock.js';
import { initSolver, solve, solveSteps, reparamSplines, addConsSolved, projectMarks, isMark, assignMark, setMarkRef, resetMarks, ensureMarkRefs, redundantCons, makeGear, makeRack, checkRack, beginSession, endSession, finiteInactive, dragToStops } from '../src/solver.js';
import { readFileSync } from 'node:fs';
import { bsplineThrough, bsplinePoint } from '../src/bspline.js';
import { boxSelect } from '../src/boxsel.js';
import { crossPoints } from '../src/snapx.js';
import { lineLine, lineCircle, circleCircle, signedAngle, dashFromPattern, parsePattern, circumcircle, arcSweepOf, TAU, splineSamples, resamplePolyline, polylineLength, splineBezier, closestOnPolyline, polylineLine, polylineCircle, polylinePolyline } from '../src/geom.js';

await initSolver();
const near = (a, b, eps = 1e-6, msg) => assert.ok(Math.abs(a - b) < eps, `${msg || ''} ${a} vs ${b}`);
let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };

t('geometria: interseccion recta-recta', () => {
  const p = lineLine({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 });
  near(p.x, 5); near(p.y, 5);
  assert.equal(lineLine({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }), null);
});
t('geometria: recta-circulo y circulo-circulo', () => {
  assert.equal(lineCircle({ x: -5, y: 0 }, { x: 5, y: 0 }, { x: 0, y: 0 }, 3).length, 2);
  assert.equal(lineCircle({ x: -5, y: 5 }, { x: 5, y: 5 }, { x: 0, y: 0 }, 3).length, 0);
  assert.equal(circleCircle({ x: 0, y: 0 }, 3, { x: 4, y: 0 }, 3).length, 2);
  assert.equal(circleCircle({ x: 0, y: 0 }, 1, { x: 10, y: 0 }, 1).length, 0);
});
t('tipos de linea: patron a dash', () => {
  assert.deepEqual(dashFromPattern([12, -3, 2, -3]), [12, 3, 2, 3]);
  assert.deepEqual(dashFromPattern([0, -3], 0.6), [0.6, 3]);
  assert.deepEqual(dashFromPattern([]), []);
  assert.deepEqual(parsePattern('12, -3  2 -3'), [12, -3, 2, -3]);
  assert.equal(parsePattern('a b'), null);
});

function lineDoc() {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 10, 10), c = addPoint(d, 0, 10), e = addPoint(d, 10, 0);
  d.pts[a].fixed = d.pts[b].fixed = d.pts[c].fixed = d.pts[e].fixed = true;
  const l1 = addLine(d, a, b, {}), l2 = addLine(d, c, e, {});
  return { d, a, b, c, e, l1, l2 };
}

t('solver: punto de interseccion (point_on_line x2)', () => {
  const { d, l1, l2 } = lineDoc();
  const p = addPoint(d, 3, 4);
  addCon(d, { t: 'PONL', refs: [p, l1] }); addCon(d, { t: 'PONL', refs: [p, l2] });
  const r = solve(d);
  assert.ok(r.ok);
  near(d.pts[p].x, 5, 1e-5); near(d.pts[p].y, 5, 1e-5);
});

t('solver: arrastre sigue el puntero sobre un circulo de radio fijo', () => {
  const d = newDoc();
  const o = addPoint(d, 0, 0); d.pts[o].fixed = true;
  const c = addCircle(d, o, 10, {});
  const p = addPoint(d, 10, 0);
  addCon(d, { t: 'RAD', refs: [c], v: 10 }); addCon(d, { t: 'PONC', refs: [p, c] });
  for (let i = 1; i <= 36; i++) {
    const a = (i * Math.PI) / 36, R = 14;
    const r = solve(d, [{ id: p, x: R * Math.cos(a), y: R * Math.sin(a) }]);
    assert.ok(r.ok, 'paso ' + i);
    near(Math.hypot(d.pts[p].x, d.pts[p].y), 10, 1e-4, 'radio');
    near(Math.atan2(d.pts[p].y, d.pts[p].x), a, 0.05, 'angulo paso ' + i);
  }
});

t('solver: distancia y mecanismo de 4 barras sigue siendo resoluble', () => {
  const d = newDoc();
  const o2 = addPoint(d, 0, 0), o4 = addPoint(d, 8, 0);
  d.pts[o2].fixed = d.pts[o4].fixed = true;
  const a = addPoint(d, 0, 3), b = addPoint(d, 8, 4);
  const l2 = addLine(d, o2, a, {}), l3 = addLine(d, a, b, {}), l4 = addLine(d, o4, b, {});
  addCon(d, { t: 'DIST', refs: [o2, a], v: 3 });
  addCon(d, { t: 'DIST', refs: [a, b], v: 9 });
  addCon(d, { t: 'DIST', refs: [o4, b], v: 5 });
  void l2; void l3; void l4;
  for (let i = 0; i <= 20; i++) {
    const th = Math.PI / 6 + (i * Math.PI) / 30;
    const r = solve(d, [{ id: a, x: 3 * Math.cos(th), y: 3 * Math.sin(th) }]);
    assert.ok(r.ok, 'paso ' + i);
    near(Math.hypot(d.pts[a].x - d.pts[b].x, d.pts[a].y - d.pts[b].y), 9, 1e-4, 'biela');
  }
});

t('solver: angulo entre rectas conserva la geometria al aplicarse', () => {
  const d = newDoc();
  const o = addPoint(d, 0, 0), a = addPoint(d, 10, 0), b = addPoint(d, 3, 6);
  d.pts[o].fixed = d.pts[a].fixed = true;
  const l1 = addLine(d, o, a, {}), l2 = addLine(d, o, b, {});
  const ang = (signedAngle({ x: 10, y: 0 }, { x: 3, y: 6 }) * 180) / Math.PI;
  addCon(d, { t: 'ANG', refs: [l1, l2], v: ang });
  addCon(d, { t: 'DIST', refs: [o, b], v: Math.hypot(3, 6) });
  const r = solve(d);
  assert.ok(r.ok);
  near(d.pts[b].x, 3, 1e-4); near(d.pts[b].y, 6, 1e-4);
  d.cons[Object.keys(d.cons).find((k) => d.cons[k].t === 'ANG')].v = 90;
  assert.ok(solve(d).ok);
  near(d.pts[b].x, 0, 1e-4); near(Math.abs(d.pts[b].y), Math.hypot(3, 6), 1e-3);
  assert.ok(d.pts[b].y > 0, 'el angulo positivo gira antihorario (sin salto de signo)');
});

t('solver: punto medio y tangente recta-circulo', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 10, 2); d.pts[a].fixed = d.pts[b].fixed = true;
  addLine(d, a, b, {});
  const m = addPoint(d, 4, 1); addCon(d, { t: 'MID', refs: [a, b, m] });
  assert.ok(solve(d).ok); near(d.pts[m].x, 5, 1e-4); near(d.pts[m].y, 1, 1e-4);
  const d2 = newDoc();
  const p = addPoint(d2, 0, 0), q = addPoint(d2, 10, 0); d2.pts[p].fixed = d2.pts[q].fixed = true;
  const l = addLine(d2, p, q, {});
  const o = addPoint(d2, 5, 7), c = addCircle(d2, o, 4, {});
  addCon(d2, { t: 'TANLC', refs: [l, c] }); addCon(d2, { t: 'DISTPL', refs: [o, l], v: 6 });
  assert.ok(solve(d2).ok); near(d2.circles[c].r, 6, 1e-4);
});

t('solver: conflicto se informa y no modifica el documento', () => {
  const { d } = lineDoc();
  const p = addPoint(d, 1, 1), q = addPoint(d, 5, 1);
  addCon(d, { t: 'DIST', refs: [p, q], v: 3 }); addCon(d, { t: 'COI', refs: [p, q] });
  const before = JSON.stringify(d.pts);
  const r = solve(d);
  assert.equal(r.ok, false);
  assert.equal(JSON.stringify(d.pts), before);
});


const D2R = Math.PI / 180;
const onCircle = (d, c, p, r) => Math.abs(Math.hypot(d.pts[p].x - d.pts[c].x, d.pts[p].y - d.pts[c].y) - r);

t('arcos: circulo por 3 puntos y barrido antihorario', () => {
  const k = circumcircle({ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 });
  near(k.c.x, 0); near(k.c.y, 0); near(k.r, 1);
  assert.equal(circumcircle({ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }), null);
  const s = arcSweepOf({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 });
  near(s.sweep, Math.PI / 2);
  near(arcSweepOf({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 0 }).sweep, TAU, 1e-9, 'coincidentes = 360');
});

function arcDoc(r = 10) {
  const d = newDoc();
  const o = addPoint(d, 0, 0), a = addPoint(d, r, 0), b = addPoint(d, 0, r);
  d.pts[o].fixed = true;
  const A = addArc(d, o, a, b, r, {});
  return { d, o, a, b, A };
}

t('arcos: arrastrar el extremo mantiene el arco sobre su circunferencia', () => {
  const { d, o, a, b, A } = arcDoc();
  addCon(d, { t: 'RAD', refs: [A], v: 10 });
  for (let i = 1; i <= 20; i++) {
    const ang = Math.PI / 2 + (i * Math.PI) / 30;
    assert.ok(solve(d, [{ id: b, x: 14 * Math.cos(ang), y: 14 * Math.sin(ang) }]).ok, 'paso ' + i);
    near(onCircle(d, o, b, 10), 0, 1e-4); near(onCircle(d, o, a, 10), 0, 1e-4);
    near(Math.atan2(d.pts[b].y, d.pts[b].x), ((ang + Math.PI) % TAU) - Math.PI, 0.06, 'angulo');
  }
});

t('arcos: tangente recta-arco, punto sobre arco, radios iguales', () => {
  const { d, o, A } = arcDoc(8);
  const p1 = addPoint(d, -20, 10), p2 = addPoint(d, 20, 10);
  d.pts[p1].fixed = d.pts[p2].fixed = true;
  const L = addLine(d, p1, p2, {});
  addCon(d, { t: 'TANLC', refs: [L, A] });
  const q = addPoint(d, 5, 5);
  addCon(d, { t: 'PONC', refs: [q, A] });
  assert.ok(solve(d).ok);
  near(d.arcs[A].r, 10, 1e-4);
  near(onCircle(d, o, q, d.arcs[A].r), 0, 1e-4);
  const c2 = addPoint(d, 30, 0), e2 = addPoint(d, 36, 0), f2 = addPoint(d, 30, 6);
  const A2 = addArc(d, c2, e2, f2, 6, {});
  addCon(d, { t: 'EQR', refs: [A, A2] });
  assert.ok(solve(d).ok);
  near(d.arcs[A2].r, d.arcs[A].r, 1e-4);
});

t('colineal: dos lineas quedan sobre la misma recta', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 10, 2), c = addPoint(d, 14, 5), e = addPoint(d, 25, 9);
  d.pts[a].fixed = d.pts[b].fixed = true;
  const l1 = addLine(d, a, b, {}), l2 = addLine(d, c, e, {});
  addCon(d, { t: 'COL', refs: [l1, l2] });
  assert.ok(solve(d).ok);
  const cross = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  near(cross(d.pts[a], d.pts[b], d.pts[c]), 0, 1e-6);
  near(cross(d.pts[a], d.pts[b], d.pts[e]), 0, 1e-6);
});

t('dividir: segmento horizontal con 2 puntos hereda H y mantiene la recta', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 30, 0), p = addPoint(d, 10, 0), q = addPoint(d, 20, 0);
  d.pts[a].fixed = true;
  const L = addLine(d, a, b, { color: '#dc2626', ltype: 'eje', w: 2 });
  addCon(d, { t: 'H', refs: [L] });
  addCon(d, { t: 'PONL', refs: [p, L] });
  addCon(d, { t: 'PONL', refs: [q, L] });
  const r = splitElement(d, L, [p, q]);
  assert.ok(r.ok);
  assert.equal(r.pieces.length, 3);
  assert.ok(!(L in d.lines));
  assert.ok(r.pieces.every((id) => d.lines[id].color === '#dc2626' && d.lines[id].ltype === 'eje'), 'hereda estilo');
  assert.equal(Object.values(d.cons).filter((k) => k.t === 'H').length, 3, 'H en cada trozo');
  assert.equal(Object.values(d.cons).filter((k) => k.t === 'PONL').length, 0, 'ya son vertices');
  assert.ok(solve(d, [{ id: q, x: 22, y: 6 }]).ok);
  near(d.pts[q].y, 0, 1e-6); near(d.pts[p].y, 0, 1e-6); near(d.pts[b].y, 0, 1e-6);
});

t('dividir: segmento inclinado conserva la recta y reasigna puntos', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 30, 15), p = addPoint(d, 10, 5), m = addPoint(d, 25, 12.5);
  d.pts[a].fixed = true;
  const L = addLine(d, a, b, {});
  addCon(d, { t: 'PONL', refs: [p, L] });
  addCon(d, { t: 'PONL', refs: [m, L] });
  const r = splitElement(d, L, [p]);
  assert.ok(r.ok && r.pieces.length === 2);
  const onM = Object.values(d.cons).find((k) => k.t === 'PONL');
  assert.equal(onM.refs[0], m);
  assert.equal(onM.refs[1], r.pieces[1], 'm queda en el 2.º trozo');
  assert.ok(solve(d, [{ id: b, x: 30, y: 40 }]).ok);
  const cross = (P, Q, R) => (Q.x - P.x) * (R.y - P.y) - (Q.y - P.y) * (R.x - P.x);
  near(cross(d.pts[a], d.pts[p], d.pts[b]), 0, 1e-5, 'a-p-b alineados');
  near(cross(d.pts[a], d.pts[p], d.pts[m]), 0, 1e-5, 'm sobre la recta');
});

t('dividir: circulo con 1 punto pasa a arco de 360 con extremos coincidentes y reposicionables', () => {
  const d = newDoc();
  const o = addPoint(d, 0, 0), p = addPoint(d, 10, 0);
  d.pts[o].fixed = true;
  const C = addCircle(d, o, 10, { color: '#2563eb', ltype: 'continua', w: 2 });
  addCon(d, { t: 'RAD', refs: [C], v: 10 });
  addCon(d, { t: 'PONC', refs: [p, C] });
  const r = splitElement(d, C, [p]);
  assert.ok(r.ok && r.pieces.length === 1 && !(C in d.circles));
  const A = d.arcs[r.pieces[0]];
  assert.equal(A.color, '#2563eb');
  near(arcOf(d, A).sweep, TAU, 1e-9, '360');
  assert.ok(Object.values(d.cons).some((k) => k.t === 'RAD' && k.refs[0] === r.pieces[0]), 'RAD heredado');
  assert.ok(solve(d).ok);
  const e = A.b;
  assert.ok(solve(d, [{ id: e, x: -8, y: 8 }]).ok);
  near(onCircle(d, o, e, 10), 0, 1e-4);
  const sw = arcOf(d, d.arcs[r.pieces[0]]).sweep;
  assert.ok(sw < TAU - 0.1, 'el extremo se separo: arco de ' + (sw / D2R).toFixed(0) + ' grados');
});

t('dividir: circulo con 3 puntos da 3 arcos con radios iguales; arco con 2 puntos da 3', () => {
  const d = newDoc();
  const o = addPoint(d, 0, 0);
  d.pts[o].fixed = true;
  const pts = [0, 100, 250].map((g) => addPoint(d, 10 * Math.cos(g * D2R), 10 * Math.sin(g * D2R)));
  const C = addCircle(d, o, 10, {});
  const r = splitElement(d, C, pts);
  assert.ok(r.ok && r.pieces.length === 3);
  assert.equal(Object.values(d.cons).filter((k) => k.t === 'EQR').length, 2);
  assert.ok(solve(d).ok);
  const sweeps = r.pieces.map((id) => arcOf(d, d.arcs[id]).sweep / D2R);
  near(sweeps.reduce((s, v) => s + v, 0), 360, 1e-3, 'suman 360');
  const e = arcDoc();
  const m1 = addPoint(e.d, 10 * Math.cos(30 * D2R), 10 * Math.sin(30 * D2R));
  const m2 = addPoint(e.d, 10 * Math.cos(60 * D2R), 10 * Math.sin(60 * D2R));
  const r2 = splitElement(e.d, e.A, [m1, m2]);
  assert.ok(r2.ok && r2.pieces.length === 3);
  assert.ok(solve(e.d, [{ id: e.b, x: -6, y: 9 }]).ok);
});

t('dividir: errores claros y relleno con cadena de arcos', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 10, 0), far = addPoint(d, 5, 5);
  const L = addLine(d, a, b, {});
  assert.equal(splitElement(d, L, [far]).ok, false);
  assert.equal(splitElement(d, L, []).ok, false);
  const e = arcDoc();
  const l1 = addLine(e.d, e.b, e.o, {}), l2 = addLine(e.d, e.o, e.a, {});
  const loops = hatchLoops(e.d, { ids: [e.A, l1, l2] });
  assert.equal(loops.length, 1);
  assert.ok(loops[0].pts.length > 20, 'el arco se muestrea');
});


// ---------------------------------------------------------------- cotas y textos
const VIEW = { s: 10, ox: 0, oy: 0 };

t('cotas: distancia con flechas, lineas de extension y etiqueta reposicionable', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 10, 0);
  const k = { t: 'DIST', refs: [a, b], v: 10 };
  let L = layoutDim(d, k, VIEW);
  assert.equal(L.arrows.length, 2);
  assert.equal(L.lines.length, 3, '2 extension + linea de cota');
  assert.equal(L.label.text, '10');
  // flechas hacia fuera (hacia las lineas de extension) cuando cabe
  assert.ok(L.arrows[0].dx < 0 && L.arrows[1].dx > 0);
  const y0 = L.label.y;
  assert.ok(dragDim(d, k, VIEW, { x: 50, y: -60 }));
  L = layoutDim(d, k, VIEW);
  assert.ok(Math.abs(L.label.y - y0) > 20, 'la cota se desplazo');
  near(k.lt, 0.5, 1e-9, 'etiqueta en el medio');
  // cota corta: flechas por fuera apuntando hacia dentro
  const e = addPoint(d, 1, 0);
  const short = layoutDim(d, { t: 'DIST', refs: [a, e], v: 1 }, VIEW);
  assert.ok(short.arrows[0].dx > 0 && short.arrows[1].dx < 0, 'flechas exteriores');
  // etiqueta arrastrada fuera del tramo prolonga la linea de cota
  dragDim(d, k, VIEW, { x: 200, y: -60 });
  assert.ok(k.lt > 1);
  const L2 = layoutDim(d, k, VIEW);
  assert.ok(Math.max(...L2.lines.flatMap((l) => [l[0], l[2]])) > 105, 'linea prolongada hasta la etiqueta');
});

t('cotas: angulo con arco, flechas, lineas de extension y radio ajustable', () => {
  const d = newDoc();
  const o = addPoint(d, 0, 0), a = addPoint(d, 4, 0), b = addPoint(d, 0, 4);
  const l1 = addLine(d, o, a, {}), l2 = addLine(d, o, b, {});
  const k = { t: 'ANG', refs: [l1, l2], v: 90 };
  const L = layoutDim(d, k, VIEW);
  assert.equal(L.arcs.length, 1);
  assert.equal(L.arrows.length, 2);
  assert.equal(L.label.text, '90°');
  assert.ok(L.lines.length >= 1, 'las rectas son cortas: hay extensiones');
  assert.ok(dragDim(d, k, VIEW, { x: 200, y: -200 }));
  assert.ok(layoutDim(d, k, VIEW).arcs[0].r > L.arcs[0].r, 'el radio crecio');
  const p1 = addPoint(d, 0, 5), p2 = addPoint(d, 4, 5);
  const l3 = addLine(d, p1, p2, {});
  assert.equal(layoutDim(d, { t: 'ANG', refs: [l1, l3], v: 0 }, VIEW).arcs.length, 0, 'paralelas: solo etiqueta');
});

t('cotas: circulo muestra phi con el diametro y arco muestra R', () => {
  const d = newDoc();
  const o = addPoint(d, 0, 0), p = addPoint(d, 5, 0), q = addPoint(d, 0, 5);
  const c = addCircle(d, o, 5, {});
  const A = addArc(d, o, p, q, 5, {});
  const kc = { t: 'RAD', refs: [c], v: 5 };
  const Lc = layoutDim(d, kc, VIEW);
  assert.equal(Lc.label.text, '⌀10');
  assert.equal(Lc.arrows.length, 2);
  const ka = { t: 'RAD', refs: [A], v: 5 };
  const La = layoutDim(d, ka, VIEW);
  assert.equal(La.label.text, 'R5');
  assert.equal(La.arrows.length, 1);
  assert.equal(La.arcs.length, 0, 'por defecto cae dentro del tramo');
  dragDim(d, ka, VIEW, { x: -100, y: 100 }); // fuera del tramo del arco (cuadrante opuesto)
  assert.ok(layoutDim(d, ka, VIEW).arcs.some((x) => x.dashed), 'arco de extension');
  assert.ok(dragDim(d, kc, VIEW, { x: 0, y: -80 }));
  near(kc.lp, 8, 1e-9);
  const lc2 = layoutDim(d, kc, VIEW);
  assert.ok(lc2.lines[0].some((v) => Math.abs(v) > 60), 'linea extendida hasta una etiqueta fuera del circulo');
});

const measure = (l) => 0.6 * l.length;

t('texto: caja segun el punto de insercion (esquinas, medios y centro)', () => {
  const d = newDoc();
  const p = addPoint(d, 10, 20);
  const T = { pt: p, text: 'ABCDE', h: 2, ang: 0, anchor: 'bl' };
  let f = textFrame(T, measure);
  near(f.w, 6); near(f.hh, 2.4);
  near(f.xmin, 0); near(f.ymin, 0);
  f = textFrame({ ...T, anchor: 'mc' }, measure);
  near(f.xmin, -3); near(f.ymin, -1.2); near(f.ymax, 1.2);
  f = textFrame({ ...T, anchor: 'tr' }, measure);
  near(f.xmin, -6); near(f.ymax, 0); near(f.ymin, -2.4);
  f = textFrame({ ...T, anchor: 'ml' }, measure);
  near(f.xmin, 0); near(f.ymax, 1.2);
  const two = textFrame({ ...T, text: 'AB\nABCDEF' }, measure);
  near(two.w, 7.2); near(two.hh, 4.8);
});

t('texto: la orientacion gira la caja alrededor del punto de insercion y el golpe la respeta', () => {
  const d = newDoc();
  const p = addPoint(d, 0, 0);
  const T = { pt: p, text: 'ABCDE', h: 2, ang: 90, anchor: 'bl' };
  const cs = textCorners(d, T, measure);
  // 90 grados: el ancho (6) queda a lo largo de +y y la altura (2.4) hacia -x
  near(cs[1].x, 0, 1e-9); near(cs[1].y, 6, 1e-9);
  near(cs[3].x, -2.4, 1e-9); near(cs[3].y, 0, 1e-9);
  assert.ok(textHit(d, T, { x: -1, y: 3 }, measure));
  assert.ok(!textHit(d, T, { x: 3, y: 1 }, measure), 'sin girar estaria dentro; girado, no');
  assert.ok(textHit(d, { ...T, ang: 0 }, { x: 3, y: 1 }, measure));
});

t('texto: el punto de insercion es un punto real y admite restricciones; borrar el punto borra el texto', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 10, 0), p = addPoint(d, 3, 4, false);
  d.pts[a].fixed = d.pts[b].fixed = true;
  const L = addLine(d, a, b, {});
  const tid = addText(d, p, 'hola', { h: 2, ang: 30, anchor: 'mc' });
  addCon(d, { t: 'PONL', refs: [p, L] });
  assert.ok(solve(d).ok);
  near(d.pts[p].y, 0, 1e-6);
  assert.ok(tid in d.texts);
  deleteItems(d, [{ k: 'pt', id: p }]);
  assert.ok(!(tid in d.texts), 'el texto desaparece con su punto');
});


t('exportar: SVG y DXF incluyen arcos, textos con rotacion y escala de patron', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 10, 5), c = addPoint(d, 0, 10), e = addPoint(d, 5, 5);
  addLine(d, a, b, { color: '#dc2626', ltype: 'eje', w: 2, ls: 0.5 });
  addArc(d, a, b, c, 11.18, { color: 'auto', ltype: 'oculta', w: 2 });
  addText(d, e, 'Hola <A>\nlinea 2', { h: 2, ang: 30, anchor: 'mc' });
  const svg = exportSVG(d, 1);
  assert.ok(svg.includes('<text transform="translate('), 'texto en SVG');
  assert.ok(svg.includes('rotate(-30)'), 'rotacion del texto');
  assert.ok(svg.includes('&lt;A&gt;'), 'se escapa el texto');
  assert.equal(svg.split('<tspan').length - 1, 2, 'una tspan por linea');
  assert.ok(svg.includes('A'), 'arco como path');
  const d1 = svg.match(/stroke="#dc2626"[^>]*stroke-dasharray="([^"]+)"/)[1].split(' ').map(Number);
  near(d1[0], 14 * 3 * 0.5, 1e-6, 'la escala del patron por elemento se aplica');
  const rows = exportDXF(d).trim().split('\r\n');
  assert.equal(rows.length % 2, 0, 'pares codigo/valor');
  assert.equal(rows.filter((r) => r === 'TEXT').length, 2);
  assert.equal(rows.filter((r) => r === 'ARC').length, 1);
});


t('exportar cotas: SVG y DXF llevan flechas, extension, arcos de angulo y etiquetas; el lienzo no las recorta', () => {
  const d = newDoc();
  const o = addPoint(d, 0, 0), a = addPoint(d, 40, 0), b = addPoint(d, 0, 30), c0 = addPoint(d, 80, 10), c1 = addPoint(d, 80, 20);
  const l1 = addLine(d, o, a, {}), l2 = addLine(d, o, b, {});
  const C = addCircle(d, c0, 10, {});
  addCon(d, { t: 'DIST', refs: [o, a], v: 40, off: 8, lt: 0.3 });
  addCon(d, { t: 'ANG', refs: [l1, l2], v: 90 });
  addCon(d, { t: 'RAD', refs: [C], v: 10 });
  addCon(d, { t: 'H', refs: [l1], hidden: true }); // las relaciones no se exportan
  const view = { s: 6, ox: 0, oy: 0 };
  const L = dimLayouts(d, view);
  assert.equal(L.length, 3, 'solo cotas');
  const nArrows = L.reduce((s, x) => s + x.arrows.length, 0);
  const svg = exportSVG(d, 1);
  assert.equal(svg.split('<polygon').length - 1, nArrows, 'una flecha por cabeza');
  assert.ok(svg.includes('>40</text>') && svg.includes('>90°</text>') && svg.includes('>⌀20</text>'), 'etiquetas');
  assert.ok(/<path d="M[^"]+ A[^"]+" fill="none" stroke="#000000" stroke-width="1"\/>/.test(svg), 'arco de la cota angular');
  const W = Number(svg.match(/width="([\d.]+)"/)[1]), H = Number(svg.match(/height="([\d.]+)"/)[1]);
  const tr = svg.match(/<g transform="translate\(([\d.-]+) ([\d.-]+)\)">/);
  assert.ok(tr, 'grupo con desplazamiento');
  const ex = extraExtents(d, { s: 6, ox: 20, oy: 20 + 30 * 6 }); // y1 del contenido = 30
  assert.ok(ex.maxX + 8 + Number(tr[1]) <= W + 1e-6, 'caben las cotas en x');
  assert.ok(ex.maxY + 8 + Number(tr[2]) <= H + 1e-6, 'caben las cotas en y');
  assert.ok(ex.minX + Number(tr[1]) >= 8 - 1e-6 || Number(tr[1]) === 0, 'no se recorta por la izquierda');
  const rows = exportDXF(d, 6).trim().split('\r\n');
  assert.equal(rows.length % 2, 0);
  assert.equal(rows.filter((r) => r === 'SOLID').length, nArrows, 'flechas SOLID');
  const labels = rows.filter((r, i) => rows[i - 1] === '1');
  assert.ok(['40', '90°', '%%c20'].every((t) => labels.includes(t)), 'etiquetas en DXF');
  assert.ok(rows.filter((r) => r === 'ARC').length >= 1, 'arco de la cota angular');
  // coordenadas del DXF en unidades del dibujo: la cota de 40 queda cerca de y=-8/6.. (sobre el eje, desplazada)
  const idx = rows.findIndex((r, i) => r === 'LINE' && rows[i + 5] === '20');
  assert.ok(idx >= 0);
});


t('exportar: respeta los interruptores de cotas y textos', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 30, 0), e = addPoint(d, 10, 10);
  addLine(d, a, b, {});
  addCon(d, { t: 'DIST', refs: [a, b], v: 30 });
  addText(d, e, 'Hola', { h: 2 });
  const full = exportSVG(d, 1);
  assert.ok(full.includes('<polygon') && full.includes('<text transform'));
  const noDims = exportSVG(d, 1, { dims: false });
  assert.ok(!noDims.includes('<polygon') && noDims.includes('<text transform'));
  const noTexts = exportSVG(d, 1, { texts: false });
  assert.ok(noTexts.includes('<polygon') && !noTexts.includes('<text transform'));
  const rows = (v) => exportDXF(d, 5, v).trim().split('\r\n');
  assert.equal(rows({ dims: false }).filter((r) => r === 'SOLID').length, 0);
  assert.ok(rows({ texts: false }).filter((r) => r === 'TEXT').length === 1, 'solo la etiqueta de la cota');
});


t('texto: alineado con una linea sigue su direccion y se gira si cambia', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 10, 10), p = addPoint(d, 5, 5);
  const L = addLine(d, a, b, {});
  const T = { pt: p, text: 'AB', h: 2, ang: 0, anchor: 'bl', ref: L, readable: true };
  near(rawAngle(d, T), 45, 1e-9);
  assert.equal(textPose(d, T).ang, 45);
  d.pts[b].x = 0; d.pts[b].y = 10; // la linea pasa a vertical (90 grados)
  near(rawAngle(d, T), 90, 1e-9);
  const pz = textPose(d, { ...T, ang: 30 }); // 90 + 30 = 120: boca abajo, se gira 180
  near(pz.ang, 300, 1e-9);
  assert.equal(pz.anchor, 'tr');
  near(rawAngle(d, { ...T, ang: 90 }), 180, 1e-9, 'el desfase se suma al de la linea');
  assert.equal(textPose(d, { ...T, ref: 'no-existe', ang: 20 }).ang, 20, 'referencia perdida: usa su angulo');
});

t('texto: legible gira 180 y cambia el punto de insercion, la caja queda en el mismo sitio', () => {
  const d = newDoc();
  const p = addPoint(d, 3, 4);
  const T = { pt: p, text: 'ABCDE', h: 2, ang: 200, anchor: 'bl', readable: true };
  const pose = textPose(d, T);
  near(pose.ang, 20, 1e-9);
  assert.equal(pose.anchor, 'tr');
  const box = (cs) => [Math.min(...cs.map((c) => c.x)), Math.max(...cs.map((c) => c.x)), Math.min(...cs.map((c) => c.y)), Math.max(...cs.map((c) => c.y))];
  const flipped = box(textCorners(d, T, measure));
  const raw = box(textCorners(d, { ...T, readable: false }, measure));
  flipped.forEach((v, i) => near(v, raw[i], 1e-9, 'misma region de la hoja'));
  assert.equal(textPose(d, { ...T, readable: false }).ang, 200, 'sin legibilidad no se toca');
  assert.equal(textPose(d, { ...T, ang: 90 }).ang, 90, 'vertical hacia arriba se queda');
  assert.equal(textPose(d, { ...T, ang: 270 }).ang, 90, 'vertical hacia abajo se gira');
  assert.equal(textPose(d, { ...T, ang: 359, anchor: 'mc' }).anchor, 'mc', 'sin giro no cambia el ancla');
  assert.ok(textHit(d, T, { x: 3 - 1, y: 4 - 1 }, measure), 'el golpe usa la pose legible');
});

t('cotas de referencia: miden en vivo, no entran al solver y salen en cursiva', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 3, 4), c = addPoint(d, 10, 0);
  d.pts[a].fixed = d.pts[c].fixed = true;
  const l1 = addLine(d, a, b, {}), l2 = addLine(d, a, c, {});
  const ref = addCon(d, { t: 'DIST', refs: [a, b], v: 99, ref: true });
  const ang = addCon(d, { t: 'ANG', refs: [l2, l1], v: 1, ref: true });
  assert.ok(solve(d).ok, 'una cota que no cumple la geometria no es conflicto si es de referencia');
  near(dimValue(d, d.cons[ref]), 5, 1e-9);
  assert.equal(dimText(d, d.cons[ref]), '5');
  near(dimValue(d, d.cons[ang]), (Math.atan2(4, 3) * 180) / Math.PI, 1e-9);
  assert.equal(layoutDim(d, d.cons[ref], { s: 10, ox: 0, oy: 0 }).label.italic, true);
  d.pts[b].x = 6; d.pts[b].y = 8;
  assert.equal(dimText(d, d.cons[ref]), '10', 'sigue a la geometria');
  addCon(d, { t: 'DIST', refs: [a, b], v: 10 });
  assert.ok(solve(d).ok);
  const drive = addCon(d, { t: 'DIST', refs: [a, b], v: 7 });
  assert.equal(solve(d).ok, false, 'la misma cota como restriccion si entra en conflicto');
  assert.equal(layoutDim(d, d.cons[drive], { s: 10, ox: 0, oy: 0 }).label.italic, false);
  const circ = addCircle(d, c, 4, {});
  const kc = { t: 'RAD', refs: [circ], v: 1, ref: true };
  assert.equal(dimText(d, kc), '⌀8');
});


t('spline: pasa por todos los puntos, cierra y no hace picos', () => {
  const P = [{ x: 0, y: 0 }, { x: 10, y: 8 }, { x: 20, y: 0 }, { x: 30, y: 8 }];
  const S = splineSamples(P, false, 16);
  assert.equal(S.length, 3 * 16 + 1);
  P.forEach((q) => assert.ok(S.some((r) => Math.hypot(r.x - q.x, r.y - q.y) < 1e-9), 'pasa por el punto'));
  assert.ok(S.every((r) => r.y > -3 && r.y < 11), 'sin oscilaciones grandes (centripeta)');
  assert.deepEqual(splineSamples([P[0], P[1]], false), [P[0], P[1]], 'con 2 puntos es un segmento');
  const C = splineSamples([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }], true, 16);
  assert.equal(C.length, 4 * 16 + 1);
  near(C[0].x, C[C.length - 1].x, 1e-9); near(C[0].y, C[C.length - 1].y, 1e-9);
  const dup = splineSamples([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 5, y: 5 }], false, 8);
  assert.ok(dup.every((r) => Number.isFinite(r.x) && Number.isFinite(r.y)), 'puntos repetidos no dan NaN');
});

t('spline: entidad ligada a puntos reales; borrar un punto lo quita de la curva; relleno de curva cerrada', () => {
  const d = newDoc();
  const ids = [[0, 0], [10, 0], [10, 10], [0, 10], [5, 14]].map(([x, y]) => addPoint(d, x, y, false));
  const sp = addSpline(d, ids, { color: 'auto', ltype: 'continua', w: 2 }, true);
  assert.equal(splinePolyline(d, d.splines[sp]).length, 5 * 16 + 1);
  const loops = hatchLoops(d, { ids: [sp] });
  assert.equal(loops.length, 1);
  assert.equal(loops[0].pts.length, 5 * 12, "curva cerrada muestreada sin repetir el primer punto");
  deleteItems(d, [{ k: 'pt', id: ids[4] }]);
  assert.equal(d.splines[sp].pts.length, 4);
  deleteItems(d, [{ k: 'pt', id: ids[3] }, { k: 'pt', id: ids[2] }, { k: 'pt', id: ids[1] }]);
  assert.ok(!(sp in d.splines), 'con menos de 2 puntos la curva desaparece');
});

t('trazado: el punto del seguidor deja su trayectoria al simular el mecanismo', () => {
  const d = newDoc();
  const o2 = addPoint(d, 0, 0), o4 = addPoint(d, 8, 0);
  d.pts[o2].fixed = d.pts[o4].fixed = true;
  const a = addPoint(d, 0, 3), b = addPoint(d, 8, 4), m = addPoint(d, 4, 6);
  addLine(d, o2, a, {}); addLine(d, a, b, {}); addLine(d, o4, b, {});
  addCon(d, { t: 'DIST', refs: [o2, a], v: 3 }); addCon(d, { t: 'DIST', refs: [a, b], v: 9 }); addCon(d, { t: 'DIST', refs: [o4, b], v: 5 });
  addCon(d, { t: 'DIST', refs: [a, m], v: 4 }); addCon(d, { t: 'DIST', refs: [b, m], v: 6 });
  assert.ok(startTrace(d, m));
  assert.ok(!startTrace(d, m), 'no duplica el trazado');
  let n = 0;
  for (let i = 0; i <= 40; i++) {
    const th = Math.PI / 6 + (i * Math.PI) / 40;
    const r = solve(d, [{ id: a, x: 3 * Math.cos(th), y: 3 * Math.sin(th) }]);
    if (r.ok) n += recordTraces(d, 0.05);
  }
  const tr = d.traces[m];
  assert.ok(tr.pts.length > 25, 'muestras: ' + tr.pts.length);
  assert.equal(tr.pts.length, n + 1);
  // cada muestra cumple la geometria del acoplador (trayectoria fisicamente valida)
  const A = (q) => q; void A;
  const d2 = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
  const last = tr.pts[tr.pts.length - 1];
  near(d2(last, d.pts[m]), 0, 1e-3, 'la ultima muestra es la posicion actual');
  assert.ok(Math.hypot(tr.pts[0].x - last.x, tr.pts[0].y - last.y) > 1, 'la trayectoria se movio');
  const before = tr.pts.length;
  recordTraces(d, 0.05);
  assert.equal(tr.pts.length, before, 'sin movimiento no agrega');
});

t('trazado: convertir a spline reparte puntos por longitud y detecta trayectorias cerradas', () => {
  const d = newDoc();
  const m = addPoint(d, 10, 0);
  startTrace(d, m);
  for (let i = 1; i <= 120; i++) { const th = (i / 120) * Math.PI * 2; d.pts[m].x = 10 * Math.cos(th); d.pts[m].y = 10 * Math.sin(th); recordTraces(d, 0.01); }
  const sid = traceToSpline(d, m, 12);
  const sp = d.splines[sid];
  assert.equal(sp.closed, true);
  assert.equal(sp.pts.length, 12);
  assert.ok(sp.pts.every((p) => d.pts[p].splOnly && d.pts[p].auto), 'puntos de control propios de la curva');
  // los puntos estan sobre la circunferencia y bien repartidos
  const angs = sp.pts.map((p) => Math.atan2(d.pts[p].y, d.pts[p].x));
  sp.pts.forEach((p) => near(Math.hypot(d.pts[p].x, d.pts[p].y), 10, 0.05));
  const gaps = angs.map((a, i) => ((angs[(i + 1) % angs.length] - a + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
  gaps.forEach((g) => near(Math.abs(g), (2 * Math.PI) / 12, 0.1, 'reparto uniforme'));
  deleteItems(d, [{ k: 'sp', id: sid }]);
  assert.equal(Object.keys(d.pts).length, 1, 'al borrar la curva se van sus puntos de control');
  // trayectoria abierta
  const e = newDoc(), q = addPoint(e, 0, 0);
  startTrace(e, q);
  for (let i = 1; i <= 50; i++) { e.pts[q].x = i; e.pts[q].y = Math.sin(i / 8) * 3; recordTraces(e, 0.01); }
  const s2 = e.splines[traceToSpline(e, q, 8)];
  assert.equal(s2.closed, false);
  assert.equal(s2.pts.length, 8);
  near(e.pts[s2.pts[0]].x, 0, 1e-9); near(e.pts[s2.pts[7]].x, 50, 1e-9);
  assert.equal(traceToSpline(newDoc(), 'nada'), null);
});

t('exportar: splines y trazados salen en SVG y DXF', () => {
  const d = newDoc();
  const ids = [[0, 0], [10, 6], [20, 0]].map(([x, y]) => addPoint(d, x, y, false));
  addSpline(d, ids, { color: '#2563eb', ltype: 'eje', w: 2, ls: 1 }, false);
  const m = addPoint(d, 5, 5); startTrace(d, m); d.pts[m].x = 9; recordTraces(d, 0.1); d.pts[m].y = 8; recordTraces(d, 0.1);
  const svg = exportSVG(d, 1);
  assert.equal(svg.split('<path d="M').length - 1, 2, 'spline + trazado');
  assert.ok(svg.includes('stroke="#2563eb"') && svg.includes('stroke="#db2777"'));
  const rows = exportDXF(d, 5).trim().split('\r\n');
  assert.equal(rows.length % 2, 0);
  assert.equal(rows.filter((r) => r === 'POLYLINE').length, 2);
  assert.equal(rows.filter((r) => r === 'SEQEND').length, 2);
  assert.equal(rows.filter((r) => r === 'VERTEX').length, 2 * 0 + 2 * 16 + 1 + 3);
});


t('spline a Bezier: cada tramo coincide con la curva muestreada (abierta y cerrada)', () => {
  const P = [{ x: 0, y: 0 }, { x: 10, y: 8 }, { x: 25, y: 2 }, { x: 31, y: 12 }, { x: 45, y: 4 }];
  for (const closed of [false, true]) {
    const S = splineSamples(P, closed, 16), B = splineBezier(P, closed);
    assert.equal(B.length, closed ? P.length : P.length - 1);
    B.forEach((b, i) => {
      for (let k = 0; k <= 16; k++) {
        const u = k / 16, w = 1 - u;
        const x = w * w * w * b.p0.x + 3 * w * w * u * b.c1.x + 3 * w * u * u * b.c2.x + u * u * u * b.p1.x;
        const y = w * w * w * b.p0.y + 3 * w * w * u * b.c1.y + 3 * w * u * u * b.c2.y + u * u * u * b.p1.y;
        near(x, S[i * 16 + k].x, 1e-9, 'x'); near(y, S[i * 16 + k].y, 1e-9, 'y');
      }
    });
  }
  assert.equal(splineBezier([P[0]], false).length, 0);
  assert.equal(splineBezier([P[0], P[1]], false).length, 1);
});

t('corte laser: escala real en mm, solo trazo continuo, curvas Bezier, sin cotas ni textos', () => {
  const d = newDoc();
  const ids = [[0, 0], [30, 10], [60, 0], [30, -10]].map(([x, y]) => addPoint(d, x, y, false));
  addSpline(d, ids, { color: 'auto', ltype: 'continua', w: 2, ls: 1 }, true);
  const c = addPoint(d, 30, 0, false);
  addCircle(d, c, 5, { color: 'auto', ltype: 'continua', w: 2 });
  const e = addPoint(d, 0, 20, false), f = addPoint(d, 60, 20, false);
  addLine(d, e, f, { color: 'auto', ltype: 'eje', w: 2 }); // eje: no se corta
  addCon(d, { t: 'DIST', refs: [e, f], v: 60 });
  addText(d, c, 'no sale', { h: 3 });
  const L = exportSVGLaser(d, { unit: 2, stroke: 0.1, color: '#ff0000' });
  assert.ok(L.svg.includes('<path d="M') && L.svg.includes(' C') && L.svg.includes(' Z'), 'spline cerrada como Bezier');
  assert.ok(L.svg.includes('<circle'));
  assert.equal(L.count, 2, 'spline + circulo; el eje se omite');
  assert.ok(!L.svg.includes('<text') && !L.svg.includes('<polygon'));
  assert.ok(L.svg.includes('stroke="#ff0000"') && L.svg.includes('stroke-width="0.1"'));
  assert.ok(/width="[\d.]+mm" height="[\d.]+mm"/.test(L.svg), 'dimensiones en mm');
  // la spline cerrada abarca 60 x ~20 unidades => 120 x ~40 mm con unit=2
  near(L.width, 120, 0.5); assert.ok(L.height > 30 && L.height < 50);
  const all = exportSVGLaser(d, { onlyContinuous: false });
  assert.equal(all.count, 3, 'sin filtro entra tambien el eje');
  assert.equal(exportSVGLaser(newDoc()), null);
});

t('equidistante: circulo hacia afuera/adentro y deteccion de socavado', () => {
  const circle = (r, n = 120) => Array.from({ length: n }, (_, i) => ({ x: r * Math.cos((i / n) * 2 * Math.PI), y: r * Math.sin((i / n) * 2 * Math.PI) }));
  const out = offsetPolyline(circle(10), 3, true);
  out.pts.forEach((q) => near(Math.hypot(q.x, q.y), 13, 0.02, 'hacia afuera'));
  assert.equal(out.undercut, 0);
  const inn = offsetPolyline(circle(10), -4, true);
  inn.pts.forEach((q) => near(Math.hypot(q.x, q.y), 6, 0.02, 'hacia adentro'));
  assert.equal(inn.undercut, 0);
  near(inn.minRadius, 10, 0.1, 'radio minimo ~ el del circulo');
  // sentido horario: mismo resultado (d>0 sigue siendo hacia afuera)
  const cw = offsetPolyline(circle(10).reverse(), 3, true);
  cw.pts.forEach((q) => near(Math.hypot(q.x, q.y), 13, 0.02));
  // radio de offset mayor que el de curvatura => socavado
  const bad = offsetPolyline(circle(10), -12, true);
  assert.ok(bad.undercut > 50, 'se invierte: ' + bad.undercut);
});



function splDoc() {
  const d = newDoc();
  const ids = [[0, 0], [10, 8], [20, 0], [30, 8], [40, 0]].map(([x, y]) => addPoint(d, x, y, false));
  ids.forEach((i) => { d.pts[i].fixed = true; });
  const sp = addSpline(d, ids, { color: 'auto', ltype: 'continua', w: 2, ls: 1 }, false);
  return { d, ids, sp };
}
const distToSpl = (d, sp, p) => closestOnPolyline(splinePolyline(d, d.splines[sp], 400), p).d; // muestreo fino: el punto queda sobre la curva exacta

t('geometria: cruces de poligonales y punto mas cercano', () => {
  const P = [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 }];
  const f = closestOnPolyline(P, { x: 10, y: 20 });
  near(f.x, 10); near(f.y, 10);
  assert.equal(polylineLine(P, { x: 0, y: 5 }, { x: 1, y: 5 }).length, 2);
  assert.equal(polylineCircle(P, { x: 10, y: 10 }, 5).length, 2);
  const q = polylinePolyline(P, [{ x: 0, y: 8 }, { x: 20, y: 8 }]);
  assert.equal(q.length, 2); near(q[0].y, 8);
});

t('relacion: punto sobre spline se mantiene al arrastrar y al mover la curva', () => {
  const { d, ids, sp } = splDoc();
  const p = addPoint(d, 25, 3, false);
  addCon(d, { t: 'PONS', refs: [p, sp] });
  let r = solve(d, []);
  assert.ok(r.ok, 'converge');
  assert.ok(distToSpl(d, sp, d.pts[p]) < 1e-4, 'quedo sobre la curva: ' + distToSpl(d, sp, d.pts[p]));
  // arrastrar el punto hacia otro lado: sigue sobre la curva
  for (let i = 0; i < 10; i++) { r = solve(d, [{ id: p, x: 25 - i * 1.5, y: 20 }]); assert.ok(r.ok); }
  assert.ok(distToSpl(d, sp, d.pts[p]) < 1e-4, 'tras arrastrar');
  // mover la curva (liberar un punto de control): el punto la sigue
  d.pts[ids[2]].fixed = false;
  r = solve(d, [{ id: ids[2], x: 20, y: 14 }]);
  assert.ok(r.ok); d.pts[ids[2]].fixed = true;
  assert.ok(distToSpl(d, sp, d.pts[p]) < 1e-4, 'tras mover la curva');
});

t('relacion: interseccion recta-spline con ambas relaciones y fijando la recta', () => {
  const { d, sp } = splDoc();
  const a = addPoint(d, 5, 20, false), b = addPoint(d, 35, -10, false);
  d.pts[a].fixed = d.pts[b].fixed = true;
  const l = addLine(d, a, b, {});
  const X = polylineLine(splinePolyline(d, d.splines[sp], 24), d.pts[a], d.pts[b]);
  assert.ok(X.length >= 1);
  const p = addPoint(d, X[0].x + 0.3, X[0].y - 0.2, false);
  addCon(d, { t: 'PONL', refs: [p, l] }); addCon(d, { t: 'PONS', refs: [p, sp] });
  const r = solve(d, []);
  assert.ok(r.ok);
  assert.ok(distToSpl(d, sp, d.pts[p]) < 1e-4);
  const cr = (d.pts[b].x - d.pts[a].x) * (d.pts[p].y - d.pts[a].y) - (d.pts[b].y - d.pts[a].y) * (d.pts[p].x - d.pts[a].x);
  near(cr, 0, 1e-5, 'sobre la recta');
});

t('relacion: punto fijo fuera de la curva da conflicto (no se acepta en silencio)', () => {
  const { d, sp } = splDoc();
  const p = addPoint(d, 20, 30, false); d.pts[p].fixed = true;
  addCon(d, { t: 'PONS', refs: [p, sp] });
  assert.equal(solve(d, []).ok, false);
});

t('relacion: recta tangente a spline', () => {
  const { d, sp } = splDoc();
  const a = addPoint(d, 5, 12, false), b = addPoint(d, 35, 12, false);
  const l = addLine(d, a, b, {});
  d.pts[a].fixed = true; // un extremo fijo, el otro libre: la recta gira hasta ser tangente
  const T = addPoint(d, 10, 8, true);
  addCon(d, { t: 'TANLS', refs: [l, sp, T] });
  const r = solve(d, []);
  assert.ok(r.ok, 'converge');
  assert.ok(distToSpl(d, sp, d.pts[T]) < 1e-4, 'contacto sobre la curva');
  // el contacto esta sobre la recta y la recta es tangente a la poligonal en ese punto
  const A = d.pts[a], B = d.pts[b], Tp = d.pts[T];
  near((B.x - A.x) * (Tp.y - A.y) - (B.y - A.y) * (Tp.x - A.x), 0, 1e-4, 'T sobre la recta');
  const f = closestOnPolyline(splinePolyline(d, d.splines[sp], 32), Tp);
  const L = Math.hypot(B.x - A.x, B.y - A.y);
  near(Math.abs(((B.x - A.x) * f.tx + (B.y - A.y) * f.ty) / L), 1, 1e-3, 'direcciones paralelas');
});

t('relacion: circulo tangente a spline y borrado limpia las relaciones', () => {
  const { d, sp, ids } = splDoc();
  const c = addPoint(d, 10, 16, false); d.pts[c].fixed = true;
  const ci = addCircle(d, c, 6, {}); // radio libre: crece/decrece hasta tocar la curva
  const T = addPoint(d, 10, 8, true);
  addCon(d, { t: 'TANCS', refs: [ci, sp, T] });
  const r = solve(d, []);
  assert.ok(r.ok, 'converge');
  assert.ok(distToSpl(d, sp, d.pts[T]) < 1e-4);
  near(Math.hypot(d.pts[T].x - d.pts[c].x, d.pts[T].y - d.pts[c].y), d.circles[ci].r, 1e-4, 'T sobre el circulo');
  // tangente: el radio hacia el contacto es perpendicular a la curva
  const f = closestOnPolyline(splinePolyline(d, d.splines[sp], 32), d.pts[T]);
  const rx = d.pts[T].x - d.pts[c].x, ry = d.pts[T].y - d.pts[c].y;
  near((rx * f.tx + ry * f.ty) / Math.hypot(rx, ry), 0, 2e-3, 'radio perpendicular a la curva');
  deleteItems(d, [{ k: 'sp', id: sp }]);
  assert.equal(Object.values(d.cons).filter((k) => k.t === 'TANCS').length, 0, 'la relacion muere con el spline');
  assert.ok(solve(d, []).ok);
});


t('trazado a spline: varias vueltas usan solo la primera (sin enredarse)', () => {
  const d = newDoc();
  const p = addPoint(d, 30, 0, false);
  startTrace(d, p);
  // 4 vueltas a una elipse 30 x 18, con desfase y ruido distinto en cada vuelta
  for (let lap = 0; lap < 4; lap++) {
    for (let i = 1; i <= 90; i++) {
      const a = ((i + lap * 0.37) / 90) * 2 * Math.PI;
      d.pts[p].x = 30 * Math.cos(a) + 0.05 * Math.sin(7 * a + lap); d.pts[p].y = 18 * Math.sin(a);
      recordTraces(d, 0.01);
    }
  }
  const sp = traceToSpline(d, p, 16);
  const S = d.splines[sp];
  assert.equal(S.closed, true);
  // 16 puntos de una sola vuelta: todos sobre la elipse y avanzando en un solo sentido
  const ang = S.pts.map((id) => Math.atan2(d.pts[id].y / 18, d.pts[id].x / 30));
  S.pts.forEach((id) => near(Math.hypot(d.pts[id].x / 30, d.pts[id].y / 18), 1, 0.03, 'sobre la elipse'));
  let turns = 0;
  for (let i = 0; i < ang.length; i++) { let da = ang[(i + 1) % ang.length] - ang[i]; while (da < -Math.PI) da += 2 * Math.PI; while (da > Math.PI) da -= 2 * Math.PI; assert.ok(da > 0, 'avanza siempre'); turns += da; }
  near(turns, 2 * Math.PI, 1e-6, 'una sola vuelta');
});

t('trazado a spline: ida y vuelta sale abierta y una vuelta incompleta usa todo el trazado', () => {
  const line = Array.from({ length: 60 }, (_, i) => ({ x: i, y: 0.01 * (i % 3) }));
  const back = line.slice(0, -1).reverse();
  const lap = firstLap([...line, ...back, ...line]);
  assert.equal(lap.closed, false);
  near(lap.pts[lap.pts.length - 1].x, 59, 1e-9, 'llega al extremo');
  assert.equal(firstLap(line), null, 'una trayectoria abierta no tiene vuelta');
});

t('arrastrar un punto ligado a un spline deforma la curva y el punto llega al destino', () => {
  const d = newDoc();
  const ids = [[0, 0], [10, 8], [20, 0], [30, 8], [40, 0]].map(([x, y]) => addPoint(d, x, y, false));
  const sp = addSpline(d, ids, { color: 'auto', ltype: 'continua', w: 2, ls: 1 }, false);
  d.pts[ids[0]].fixed = d.pts[ids[4]].fixed = true;
  const f = closestOnPolyline(splinePolyline(d, d.splines[sp], 32), { x: 15, y: 5 });
  const p = addPoint(d, f.x, f.y, false);
  addCon(d, { t: 'PONS', refs: [p, sp] });
  assert.ok(solve(d, []).ok);
  const before = ids.map((i) => ({ ...d.pts[i] }));
  const tx = f.x, ty = f.y + 6;
  for (let i = 1; i <= 6; i++) assert.ok(solve(d, [{ id: p, x: tx, y: f.y + i }]).ok);
  assert.ok(distToSpl(d, sp, d.pts[p]) < 1e-3, 'sigue sobre la curva');
  near(d.pts[p].y, ty, 0.5, 'llega cerca del destino: ' + d.pts[p].y);
  assert.ok(ids.some((i, k) => Math.hypot(d.pts[i].x - before[k].x, d.pts[i].y - before[k].y) > 1), 'la curva se deformo');
  near(d.pts[ids[0]].x, 0, 1e-9); near(d.pts[ids[4]].y, 0, 1e-9);
});


t('arbol de elementos: grupos, puntos de cada elemento y relaciones', () => {
  const { d, a, b, e, l1, l2 } = lineDoc();
  addCon(d, { t: 'PAR', refs: [l1, l2] });
  addCon(d, { t: 'DIST', refs: [a, b], v: 14.14 });
  const ids = [[0, 0], [5, 3], [9, 0]].map(([x, y]) => addPoint(d, x, y, true));
  ids.forEach((i) => { d.pts[i].splOnly = true; });
  const sp = addSpline(d, ids, { color: 'auto', ltype: 'continua', w: 2, ls: 1 }, false);
  const p = addPoint(d, 4, 3, false); addCon(d, { t: 'PONS', refs: [p, sp] });
  const tree = buildTree(d);
  const g = (k) => tree.find((x) => x.key === k);
  assert.equal(g('g:ln').children.length, 2);
  const ln1 = g('g:ln').children.find((n) => n.sel.id === l1);
  const rels = ln1.children.find((c) => c.sub);
  assert.ok(rels.children.some((c) => c.link && c.con && /Paralelas/.test(c.label)), 'la linea enlaza sus relaciones');
  assert.ok(rels.children.some((c) => /Distancia/.test(c.label)), 'y las de sus puntos (la cota entre a y b)');
  assert.ok(rels.children.every((c) => !c.children), 'los enlaces no repiten hijos');
  assert.equal(ln1.children.filter((c) => c.sel?.k === 'pt').length, 2, 'y sus dos puntos');
  assert.ok(ln1.children.filter((c) => c.sel?.k === 'pt').every((c) => !c.children.length), 'un punto con dueño no repite relaciones');
  const spn = g('g:sp').children[0];
  assert.equal(spn.children.find((c) => c.key.startsWith('spp:')).children.length, 3, 'puntos de control del spline');
  assert.ok(spn.children.find((c) => c.sub).children.some((c) => /punto sobre spline/.test(c.label)));
  // solo los puntos sueltos: p (sobre el spline) si; a, b, c, e (de las lineas) y los de control no
  assert.deepEqual(g('g:pt').children.map((c) => c.sel.id), [p]);
  assert.ok(g('g:pt').children[0].children.some((c) => c.link && /punto sobre spline/.test(c.label)), 'el punto suelto enlaza sus relaciones');
  const co = g('g:co');
  assert.equal(co.label, 'Relaciones y cotas (3)');
  assert.deepEqual(co.children.map((c) => c.key), ['g:co:dim', 'g:co:geo']);
  assert.equal(co.children[1].children.length, 2, 'paralelas y punto sobre spline');
  // un punto compartido por dos lineas vive en la primera y en la segunda es un enlace
  const l3 = addLine(d, b, e, {});
  const t2 = buildTree(d);
  const ln3 = t2.find((x) => x.key === 'g:ln').children.find((n) => n.sel.id === l3);
  assert.deepEqual(ln3.children.filter((c) => c.sel?.k === 'pt').map((c) => [c.link || false, c.sel.id]), [[true, b], [true, e]]);
  assert.match(ln3.children.find((c) => c.sel?.id === b).label, new RegExp(`en Línea ${l1}`));
  // las automaticas van aparte y se cuentan en la fila del elemento
  addCon(d, { t: 'EQD', refs: [a, b, a, e], hidden: true });
  const t3 = buildTree(d);
  const ln1b = t3.find((x) => x.key === 'g:ln').children.find((n) => n.sel.id === l1);
  assert.match(ln1b.children.find((c) => c.sub).label, /\+1 automática\)/);
  assert.equal(t3.find((x) => x.key === 'g:co').children.find((c) => c.key === 'g:co:auto').children.length, 1);
  assert.equal(conLabel(d, { t: 'DIST', refs: [a, b], v: 14.14, ref: true }), 'Distancia = 14.14 (referencia)');
  assert.deepEqual(buildTree(newDoc()), []);
});


t('nombres de archivo: limpia caracteres invalidos y la extension tecleada', () => {
  assert.equal(cleanFileBase('mecanismo 4 barras', 'json'), 'mecanismo 4 barras');
  assert.equal(cleanFileBase('leva.JSON', 'json'), 'leva');
  assert.equal(cleanFileBase('a/b|c:d*e?', 'svg'), 'a b c d e');
  assert.equal(cleanFileBase('  ..oculto.. ', 'png'), 'oculto');
  assert.equal(cleanFileBase('   ', 'dxf'), '');
  assert.equal(cleanFileBase('dibujo.svg.svg', 'svg'), 'dibujo.svg');
});


// el caso del dibujo: dos segmentos cortos a la izquierda cuyo punto de corte queda lejos, a la derecha
function angCase() {
  const d = newDoc();
  const a1 = addPoint(d, 0, 0), b1 = addPoint(d, 10, 0), a2 = addPoint(d, 0, 4), b2 = addPoint(d, 10, 2);
  const l1 = addLine(d, a1, b1, {}), l2 = addLine(d, a2, b2, {});
  return { d, l1, l2, V0: { x: 20, y: 0 } };
}
t('cota angular: siempre positiva, sin importar el orden de seleccion', () => {
  const { d, l1, l2 } = angCase();
  const A = Math.atan2(2 - 4, 10) ; // l2 respecto a l1: negativa
  for (const refs of [[l1, l2], [l2, l1]]) {
    const k = { t: 'ANG', refs, ref: true };
    const v = dimValue(d, k);
    assert.ok(v > 0 && v < 180, 'positiva: ' + v);
    near(v, (Math.abs(A) * 180) / Math.PI, 1e-6, 'sector que une los segmentos');
    assert.match(dimText(d, k), /^11\.31/);
  }
  void A;
});
t('cota angular: el sector donde se coloca decide 11.3 o 168.7 sin cambiar la geometria', () => {
  const { d, l1, l2, V0 } = angCase();
  const k = { t: 'ANG', refs: [l1, l2], v: (Math.atan2(2 - 4, 10) * 180) / Math.PI };
  const VIEW = { s: 10, ox: 0, oy: 0 };
  const C = { x: V0.x * 10, y: -V0.y * 10 };
  const base = angSector(d, k).val;
  near(base, 11.3099, 1e-3);
  // el arco por defecto y sus extensiones: las rectas terminan antes del vertice, debe haber lineas de extension
  const L0 = layoutDim(d, k, VIEW);
  assert.equal(L0.arcs.length, 1);
  assert.ok(L0.lines.length >= 2, 'lineas de extension hasta el arco');
  // colocar la cota del otro lado del vertice (hacia la derecha): sector suplementario
  assert.ok(dragDim(d, k, VIEW, { x: C.x + 150, y: C.y }));
  near(dimValue(d, k), 180 - base, 1e-3, 'suplementario');
  // y arriba (entre una recta y la prolongacion de la otra) el otro sector agudo/obtuso
  dragDim(d, k, VIEW, { x: C.x - 150, y: C.y - 20 });
  near(dimValue(d, k), base, 1e-3, 'de vuelta al sector de los segmentos');
  assert.ok(dimValue(d, k) > 0);
});
t('cota angular: editar el valor del sector elegido y resolver', () => {
  const d = newDoc();
  const o = addPoint(d, 0, 0), a = addPoint(d, 10, 0), b = addPoint(d, 8, 6);
  d.pts[o].fixed = d.pts[a].fixed = true;
  const l1 = addLine(d, o, a, {}), l2 = addLine(d, o, b, {});
  const k = { t: 'ANG', refs: [l1, l2], v: 36.87 };
  const S = angSector(d, k);
  near(S.val, 36.87, 1e-6);
  // el usuario ve el sector suplementario (143.13) y pide 150: la geometria debe quedar con 30 grados entre las rectas
  k.s1 = 1; k.s2 = -1;
  near(dimValue(d, k), 143.13, 1e-2);
  k.v = angTrue(d, k, 150);
  const id = addCon(d, k);
  d.cons[id] = k;
  assert.ok(solve(d, []).ok);
  const ang = Math.abs((Math.atan2(d.pts[b].y, d.pts[b].x) * 180) / Math.PI);
  near(ang, 30, 1e-3, 'rectas a 30 grados');
  near(dimValue(d, k), 150, 1e-3, 'se sigue mostrando el sector suplementario');
});


t('expresiones en cotas: formulas, constantes, funciones y errores', () => {
  const v = (s, o) => parseValue(s, o);
  near(v('10+1/3'), 10 + 1 / 3, 1e-9);
  near(v('10*sin(30)'), 5, 1e-9, 'sin en grados');
  near(v('10sin(30)'), 5, 1e-9, 'producto implicito');
  near(v('sin(π/6)'), 0.5, 1e-9, 'con π, radianes');
  near(v('3π/4'), (3 * Math.PI) / 4, 1e-9, 'en longitud es un numero');
  near(v('3π/4', { angle: true }), 135, 1e-9, 'en angulo pasa a grados');
  near(v('2π*5', { angle: true }), 1800, 1e-6);
  near(v('45', { angle: true }), 45, 1e-12, 'un numero simple no se convierte');
  near(v('2(3+1)'), 8); near(v('√2'), Math.SQRT2, 1e-9); near(v('2^-1'), 0.5); near(v('2**3'), 8); near(v('1,5*2'), 3);
  near(v('-3+10'), 7); near(v('atan(1)'), 45, 1e-9); near(v('log(1000)'), 3); near(v('ln(e)'), 1);
  near(v('sqrt(16)+abs(-4)'), 8);
  for (const bad of ['', '1/0', '(1+2', '3+', 'foo(2)', 'sin 30', '2 $ 3', 'sqrt(-4)', '1)']) assert.throws(() => evalExpr(bad), undefined, 'debe fallar: ' + bad);
  assert.ok(isPlainNumber('12.5') && isPlainNumber(' -3,2 ') && !isPlainNumber('3π') && !isPlainNumber('1+2'));
});


t('angulos en radianes: selector de unidad en expresiones y etiqueta', () => {
  near(parseValue('2.35619449', { angle: true, radians: true }), 135, 1e-6, 'numero simple en radianes');
  near(parseValue('3π/4', { angle: true, radians: true }), 135, 1e-9);
  near(parseValue('sin(π/6)*2', { radians: false }), 1, 1e-9);
  near(parseValue('asin(0.5)', { angle: true, radians: true }), 30, 1e-9, 'asin en radianes -> 30 grados');
  near(parseValue('asin(0.5)', { angle: true }), 30, 1e-9, 'asin en grados');
  near(parseValue('1', { angle: true, radians: true }), 57.2957795131, 1e-6);
  near(parseValue('10*sin(30)', { radians: false }), 5, 1e-9);
  const { d, l1, l2 } = (() => { const d = newDoc(); const o = addPoint(d, 0, 0), a = addPoint(d, 4, 0), b = addPoint(d, 0, 4); return { d, l1: addLine(d, o, a, {}), l2: addLine(d, o, b, {}) }; })();
  assert.equal(dimText(d, { t: 'ANG', refs: [l1, l2], v: 90 }), '90°');
  assert.equal(dimText(d, { t: 'ANG', refs: [l1, l2], v: 90, unit: 'rad' }), '1.571 rad');
});

t('cotas de radio y diametro (ANSI): dentro = linea por el interior; fuera = llamada radial con flecha desde afuera', () => {
  const d = newDoc();
  const c = addPoint(d, 0, 0), e = addPoint(d, 10, 0);
  const ci = addCircle(d, c, 10, {});
  const VIEW = { s: 10, ox: 0, oy: 0 }; // radio en pantalla: 100 px
  const kin = { t: 'RAD', refs: [ci], v: 10, lp: 0, ang: 0 };
  const Lin = layoutDim(d, kin, VIEW);
  assert.equal(Lin.arrows.length, 2, 'diametro dentro: dos flechas');
  assert.equal(Lin.lines.length, 1, 'una sola linea de lado a lado');
  near(Math.abs(Lin.lines[0][2] - Lin.lines[0][0]), 200, 1e-6, 'abarca el diametro');
  assert.ok(Lin.arrows.every((a) => Math.abs(Math.hypot(a.x, a.y) - 100) < 1e-6), 'flechas sobre la circunferencia');
  const kout = { t: 'RAD', refs: [ci], v: 10, lp: 15, ang: 0 }; // texto fuera (150 px > 100 px)
  const Lout = layoutDim(d, kout, VIEW);
  assert.equal(Lout.arrows.length, 1, 'fuera: una flecha');
  near(Lout.arrows[0].x, 100, 1e-6); near(Lout.arrows[0].dx, -1, 1e-9, 'apunta hacia el centro');
  assert.equal(Lout.lines.length, 2, 'llamada + tramo horizontal');
  assert.ok(Lout.lines[0][0] >= 100 - 1e-6 && Lout.lines[0][2] >= 150 - 1e-6, 'la llamada no cruza el circulo');
  assert.ok(Lout.label.x > Lout.lines[1][2], 'texto junto al tramo horizontal');
  // por defecto, un circulo diminuto en pantalla pone el texto fuera
  const small = layoutDim(d, { t: 'RAD', refs: [ci], v: 10 }, { s: 1, ox: 0, oy: 0 });
  assert.equal(small.arrows.length, 1, 'no cabe: fuera');
  // radio de arco: dentro, una flecha desde el centro; fuera, llamada
  const arc = addArc(d, c, e, addPoint(d, 0, 10), 10, {});
  const ra = layoutDim(d, { t: 'RAD', refs: [arc], v: 10, lp: 5, ang: Math.PI / 4 }, VIEW);
  assert.equal(ra.arrows.length, 1); assert.equal(ra.lines.length, 1);
  const rb = layoutDim(d, { t: 'RAD', refs: [arc], v: 10, lp: 14, ang: Math.PI / 4 }, VIEW);
  assert.equal(rb.lines.length, 2); assert.ok(rb.arrows[0].dx * Math.cos(Math.PI / 4) < 0 || rb.arrows[0].dx < 0);
});


t('bloqueo suave: horizontal, vertical y 45 grados solo cerca de la direccion', () => {
  const d = newDoc(); const S = { x: 0, y: 0 }, free = { type: 'free' }, none = { lines: [], curves: [] };
  const h = lineLock(d, S, none, free, { x: 10, y: 0.3 }, 10);
  assert.equal(h.kind, 'H'); near(h.y, 0); near(h.x, 10, 0.01);
  assert.equal(lineLock(d, S, none, free, { x: 0.2, y: 8 }, 10).kind, 'V');
  const dd = lineLock(d, S, none, free, { x: 7, y: 7.4 }, 10);
  assert.equal(dd.kind, 'ANG'); assert.equal(dd.deg, 45); assert.equal(dd.label, '45°'); near(dd.x, dd.y, 1e-9);
  assert.equal(lineLock(d, S, none, free, { x: 10, y: 4.5 }, 10), null, 'entre dos bloqueos de 15 grados: libre');
  assert.equal(lineLock(d, S, none, free, { x: 0.5, y: 0.1 }, 10), null, 'muy cerca del inicio no bloquea');
  assert.equal(lineLock(d, S, none, { type: 'pt', id: 'x' }, { x: 10, y: 0.3 }, 10), null, 'si cae sobre un punto, manda el punto');
  assert.deepEqual(lockConstraints(h, 'l1'), [{ t: 'H', refs: ['l1'] }]);
  assert.deepEqual(lockConstraints(dd, 'l1'), [], '45 no lleva restriccion');
});
t('bloqueo suave: desde otra linea, paralela y perpendicular con su restriccion', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 10, 6);
  const l = addLine(d, a, b, {});
  const m = addPoint(d, 5, 3); addCon(d, { t: 'PONL', refs: [m, l] });
  const o = originsOfPoint(d, m);
  assert.deepEqual(o.lines, [l]);
  const S = d.pts[m];
  const perp = lineLock(d, S, o, { type: 'free' }, { x: 5 - 6 * 0.5, y: 3 + 10 * 0.5 + 0.3 }, 10); // direccion (-0.51, 0.86) ~ perpendicular a (10,6)
  assert.equal(perp.kind, 'PERP'); assert.equal(perp.ref, l);
  near(perp.u.x * 10 + perp.u.y * 6, 0, 1e-9);
  assert.deepEqual(lockConstraints(perp, 'n'), [{ t: 'PERP', refs: ['n', l] }]);
  const par = lineLock(d, S, o, { type: 'free' }, { x: 5 + 8.6, y: 3 + 5.2 }, 10);
  assert.equal(par.kind, 'PAR');
  assert.deepEqual(originsOfSnap(d, { type: 'ln', id: l }).lines, [l]);
  assert.deepEqual(originsOfPoint(d, a).lines, [l], 'extremo de una linea');
});
t('bloqueo suave: tangente desde un circulo y tangente al terminar sobre un circulo', () => {
  const d = newDoc(); const c = addPoint(d, 0, 10); const ci = addCircle(d, c, 10, {});
  // inicio sobre el circulo en (0,0): la tangente es horizontal y gana a la H generica
  const o = originsOfSnap(d, { type: 'ci', id: ci });
  const t1 = lineLock(d, { x: 0, y: 0 }, o, { type: 'free' }, { x: 12, y: 0.4 }, 10);
  assert.equal(t1.kind, 'TAN'); assert.equal(t1.ref, ci);
  assert.deepEqual(lockConstraints(t1, 'n'), [{ t: 'TANLC', refs: ['n', ci] }]);
  // final sobre el circulo: la linea desde S pasa a ser tangente
  const S = { x: 30, y: 10 };
  const T = { x: 10 * Math.cos(Math.acos(10 / 30)), y: 10 + 10 * Math.sin(Math.acos(10 / 30)) };
  const t2 = lineLock(d, S, { lines: [], curves: [] }, { type: 'ci', id: ci }, { x: T.x + 0.2, y: T.y + 0.1 }, 10);
  assert.equal(t2.kind, 'TAN'); assert.deepEqual(t2.end, { type: 'ci', id: ci });
  near(Math.hypot(t2.x - 0, t2.y - 10), 10, 1e-9, 'sobre el circulo');
  near((t2.x - 0) * (t2.x - S.x) + (t2.y - 10) * (t2.y - S.y), 0, 1e-6, 'radio perpendicular a la linea');
  assert.notEqual(lineLock(d, S, { lines: [], curves: [] }, { type: 'ci', id: ci }, { x: -9.9, y: 10 }, 10)?.kind, 'TAN', 'lejos de las tangentes: no es tangente (queda el bloqueo H)');
});
t('dividir en n partes iguales: lineas, arcos y circulos', () => {
  // linea
  let d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 12, 0);
  const l = addLine(d, a, b, {});
  const P = [1, 2, 3].map((i) => addPoint(d, (12 * i) / 4, 0, true));
  const r = splitElement(d, l, P);
  assert.ok(r.ok && r.pieces.length === 4);
  for (let i = 1; i < r.pieces.length; i++) addCon(d, { t: 'EQL', refs: [r.pieces[i - 1], r.pieces[i]], hidden: true });
  d.pts[a].fixed = true; d.pts[b].fixed = true;
  b && (d.pts[b].x = 20);
  assert.ok(solve(d, []).ok);
  r.pieces.forEach((pid) => { const q = d.lines[pid]; near(Math.hypot(d.pts[q.b].x - d.pts[q.a].x, d.pts[q.b].y - d.pts[q.a].y), 5, 1e-6, 'partes iguales tras estirar'); });
  // circulo en 6 partes
  d = newDoc();
  const c = addPoint(d, 0, 0), ci = addCircle(d, c, 5, {});
  const Q = Array.from({ length: 6 }, (_, i) => addPoint(d, 5 * Math.cos((i * Math.PI) / 3), 5 * Math.sin((i * Math.PI) / 3), true));
  const r2 = splitElement(d, ci, Q);
  assert.ok(r2.ok); assert.equal(r2.pieces.length, 6);
  assert.ok(solve(d, []).ok);
  r2.pieces.forEach((id) => near(arcOf(d, d.arcs[id]).sweep, Math.PI / 3, 1e-6));
});


t('recortar: tramo de una linea entre dos cruces', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 30, 0);
  const l = addLine(d, a, b, {});
  const v1 = addLine(d, addPoint(d, 10, -5), addPoint(d, 10, 5), {});
  const v2 = addLine(d, addPoint(d, 20, -5), addPoint(d, 20, 5), {});
  const r = trimAt(d, 'ln', l, { x: 15, y: 0 });
  assert.ok(r.ok && !r.deleted && r.pieces.length === 2);
  assert.ok(solve(d, []).ok);
  const xs = r.pieces.map((id) => [d.pts[d.lines[id].a].x, d.pts[d.lines[id].b].x].sort((m, n) => m - n));
  near(xs[0][0], 0); near(xs[0][1], 10, 1e-6); near(xs[1][0], 20, 1e-6); near(xs[1][1], 30);
  assert.ok(Object.values(d.cons).some((k) => k.t === 'PONL' && k.refs[1] === v1));
  assert.ok(Object.values(d.cons).some((k) => k.t === 'PONL' && k.refs[1] === v2));
  assert.ok(!(l in d.lines));
});
t('recortar: un extremo, sin cruces y circulo', () => {
  let d = newDoc();
  const l = addLine(d, addPoint(d, 0, 0), addPoint(d, 30, 0), {});
  addLine(d, addPoint(d, 10, -5), addPoint(d, 10, 5), {});
  let r = trimAt(d, 'ln', l, { x: 25, y: 0 }); // a la derecha del unico cruce: queda el tramo izquierdo
  assert.ok(r.ok && r.pieces.length === 1);
  const q = d.lines[r.pieces[0]];
  near(Math.max(d.pts[q.a].x, d.pts[q.b].x), 10, 1e-6);
  // sin cruces: se borra completo
  d = newDoc();
  const l2 = addLine(d, addPoint(d, 0, 0), addPoint(d, 5, 0), {});
  r = trimAt(d, 'ln', l2, { x: 2, y: 0 });
  assert.ok(r.ok && r.deleted); assert.equal(Object.keys(d.lines).length, 0);
  // circulo cortado por una recta: queda un arco
  d = newDoc();
  const c = addPoint(d, 0, 0), ci = addCircle(d, c, 10, {});
  addLine(d, addPoint(d, -20, 0), addPoint(d, 20, 0), {});
  r = trimAt(d, 'ci', ci, { x: 0, y: -10 }); // quita la mitad inferior
  assert.ok(r.ok && r.pieces.length === 1);
  assert.ok(solve(d, []).ok);
  near(arcOf(d, d.arcs[r.pieces[0]]).sweep, Math.PI, 1e-6);
});
t('recortar: arco entre dos lineas', () => {
  const d = newDoc();
  const c = addPoint(d, 0, 0), a = addPoint(d, 10, 0), b = addPoint(d, -10, 0);
  const ar = addArc(d, c, a, b, 10, {});
  addLine(d, addPoint(d, 7.0710678, -2), addPoint(d, 7.0710678, 20), {});
  addLine(d, addPoint(d, -7.0710678, -2), addPoint(d, -7.0710678, 20), {});
  const r = trimAt(d, 'ar', ar, { x: 0, y: 10 }); // la parte alta, entre las dos verticales
  assert.ok(r.ok && r.pieces.length === 2);
  assert.ok(solve(d, []).ok);
  r.pieces.forEach((id) => near(arcOf(d, d.arcs[id]).sweep, Math.PI / 4, 1e-4));
});
t('extender: segmento hasta otra linea (punto compartido => punto nuevo)', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 10, 0);
  const l = addLine(d, a, b, {});
  const other = addLine(d, b, addPoint(d, 10, 8), {}); // b es compartido con otra linea
  const wall = addLine(d, addPoint(d, 25, -5), addPoint(d, 25, 5), {});
  const r = extendEnd(d, 'ln', l, { x: 9, y: 0 });
  assert.ok(r.ok);
  assert.ok(solve(d, []).ok);
  assert.notEqual(d.lines[l].b, b, 'se creo un punto nuevo');
  near(d.pts[d.lines[l].b].x, 25, 1e-6); near(d.pts[d.lines[l].b].y, 0, 1e-6);
  near(d.pts[b].x, 10); // el punto compartido no se movio
  assert.ok(Object.values(d.cons).some((k) => k.t === 'PONL' && k.refs[1] === wall));
  void other;
});
t('extender: extremo libre se mueve; arco hasta una linea; sin destino avisa', () => {
  let d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 10, 0);
  const l = addLine(d, a, b, {});
  addLine(d, addPoint(d, 18, -5), addPoint(d, 18, 5), {});
  assert.ok(extendEnd(d, 'ln', l, { x: 10, y: 0 }).ok);
  assert.equal(d.lines[l].b, b, 'mismo punto');
  near(d.pts[b].x, 18, 1e-6);
  assert.equal(extendEnd(d, 'ln', l, { x: 0, y: 0 }).ok, false, 'hacia la izquierda no hay nada');
  // arco 0..90 grados que se alarga hasta la recta x = -5
  d = newDoc();
  const c = addPoint(d, 0, 0), s = addPoint(d, 10, 0), e = addPoint(d, 0, 10);
  const ar = addArc(d, c, s, e, 10, {});
  addLine(d, addPoint(d, -5, -20), addPoint(d, -5, 20), {});
  const r = extendEnd(d, 'ar', ar, { x: 0, y: 9 });
  assert.ok(r.ok && r.field === 'b');
  assert.ok(solve(d, []).ok);
  near(d.pts[d.arcs[ar].b].x, -5, 1e-4);
  assert.equal(extendEnd(d, 'ci', 'x', { x: 0, y: 0 }).ok, false);
});
t('matriz lineal: una y dos direcciones, con restricciones internas', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 4, 0);
  const l = addLine(d, a, b, {});
  addCon(d, { t: 'H', refs: [l] });
  const c = addPoint(d, 0, 2), ci = addCircle(d, c, 1, {});
  const r = linearArray(d, [{ k: 'ln', id: l }, { k: 'ci', id: ci }], [{ u: { x: 1, y: 0 }, s: 10, n: 2 }]);
  assert.ok(r.ok); assert.equal(r.made.length, 4);
  assert.equal(Object.keys(d.lines).length, 3); assert.equal(Object.keys(d.circles).length, 3);
  assert.equal(Object.values(d.cons).filter((k) => k.t === 'H').length, 3, 'la restriccion se copia');
  const xs = Object.values(d.lines).map((q) => d.pts[q.a].x).sort((m, n) => m - n);
  assert.deepEqual(xs, [0, 10, 20]);
  assert.ok(solve(d, []).ok);
  // dos direcciones: cuadricula 3 x 2 menos el original = 5 copias
  const d2 = newDoc();
  const l2 = addLine(d2, addPoint(d2, 0, 0), addPoint(d2, 1, 0), {});
  const r2 = linearArray(d2, [{ k: 'ln', id: l2 }], [{ u: { x: 1, y: 0 }, s: 5, n: 2 }, { u: { x: 0, y: 1 }, s: 3, n: 1 }]);
  assert.ok(r2.ok); assert.equal(r2.made.length, 5); assert.equal(Object.keys(d2.lines).length, 6);
  assert.equal(linearArray(d2, [{ k: 'ln', id: l2 }], [{ u: { x: 1, y: 0 }, s: 1, n: 500 }]).ok, false);
  void cutsOf;
});


t('copia espejo: puntos, arco (sigue antihorario), cota angular y puntos sobre el eje compartidos', () => {
  const d = newDoc();
  const o = addPoint(d, 0, 0), a = addPoint(d, 10, 0), b = addPoint(d, 4, 6);
  const l1 = addLine(d, o, a, {}), l2 = addLine(d, o, b, {});
  addCon(d, { t: 'H', refs: [l1] });
  const ang = (Math.atan2(6, 4) * 180) / Math.PI;
  addCon(d, { t: 'ANG', refs: [l1, l2], v: ang });
  const c = addPoint(d, 5, 5), s = addPoint(d, 8, 5), e = addPoint(d, 5, 8);
  const ar = addArc(d, c, s, e, 3, {});
  const axA = addPoint(d, 0, -20), axB = addPoint(d, 0, 20);
  const axis = addLine(d, axA, axB, {}); // eje: la recta x = 0
  const r = mirrorCopy(d, [{ k: 'ln', id: l1 }, { k: 'ln', id: l2 }, { k: 'ar', id: ar }], d.pts[axA], d.pts[axB]);
  assert.ok(r.ok);
  assert.ok(solve(d, []).ok);
  const nl1 = r.made.filter((m) => m.k === 'ln').map((m) => d.lines[m.id]);
  // el punto o esta sobre el eje: se comparte
  assert.ok(nl1.every((q) => q.a === o || q.b === o));
  const far = nl1.map((q) => d.pts[q.a === o ? q.b : q.a]).sort((m, n) => m.y - n.y);
  near(far[0].x, -10, 1e-6); near(far[0].y, 0, 1e-6); near(far[1].x, -4, 1e-6); near(far[1].y, 6, 1e-6);
  const na = d.arcs[r.made.find((m) => m.k === 'ar').id];
  near(arcOf(d, na).sweep, Math.PI / 2, 1e-6, 'sigue siendo un cuarto de arco');
  near(d.pts[na.c].x, -5, 1e-6);
  // la cota angular copiada cambia de signo y el solver la acepta
  const angs = Object.values(d.cons).filter((k) => k.t === 'ANG');
  assert.equal(angs.length, 2); near(angs[0].v, -angs[1].v, 1e-6);
  void axis;
});


t('SVG corte laser: clases de linea a corte, marcado u omitir', () => {
  const d = newDoc();
  const cut = addLine(d, addPoint(d, 0, 0), addPoint(d, 10, 0), { ltype: 'continua', w: 2 });
  const fold = addLine(d, addPoint(d, 0, 5), addPoint(d, 10, 5), { ltype: 'continua', w: 1 }); // mismo tipo, otro grosor
  const dashed = addLine(d, addPoint(d, 0, 8), addPoint(d, 10, 8), { ltype: 'discontinua', w: 2 });
  const cls = laserClasses(d);
  assert.equal(cls.length, 3);
  const k = (id) => styleKey(d.lines[id]);
  const r = exportSVGLaser(d, { unit: 1, stroke: 0.1, cutColor: '#ff0000', markColor: '#0000ff', modes: { [k(cut)]: 'cut', [k(fold)]: 'mark', [k(dashed)]: 'skip' } });
  assert.equal(r.cut, 1); assert.equal(r.mark, 1); assert.equal(r.count, 2);
  assert.match(r.svg, /<g id="corte" fill="none" stroke="#ff0000"/);
  assert.match(r.svg, /<g id="marcado" fill="none" stroke="#0000ff"/);
  assert.equal(exportSVGLaser(d, { modes: { [k(cut)]: 'skip' } }), null);
});


t('matriz circular: 4 instancias a 90, restricciones H/V se intercambian, omitir y centro compartido', () => {
  const d = newDoc();
  const o = addPoint(d, 0, 0), a = addPoint(d, 10, 0);
  const l = addLine(d, o, a, {});
  addCon(d, { t: 'H', refs: [l] });
  const r = circularArray(d, [{ k: 'ln', id: l }], { c: { x: 0, y: 0 }, step: Math.PI / 2, n: 4, skip: new Set([3]) });
  assert.ok(r.ok); assert.equal(r.made.length, 2, 'copias 2 y 4; la 3 se omite');
  assert.ok(solve(d, []).ok);
  const ends = r.made.map((m) => d.pts[d.lines[m.id].b]).sort((p, q) => p.y - q.y);
  near(ends[0].x, 0, 1e-6); near(ends[0].y, -10, 1e-6); near(ends[1].x, 0, 1e-6); near(ends[1].y, 10, 1e-6);
  assert.ok(r.made.every((m) => d.lines[m.id].a === o), 'el centro se comparte');
  assert.equal(Object.values(d.cons).filter((k) => k.t === 'V').length, 2, 'H pasa a V a 90 y 270 grados');
  // angulo cualquiera: no se copia H/V
  const d2 = newDoc();
  const l2 = addLine(d2, addPoint(d2, 5, 0), addPoint(d2, 8, 0), {});
  addCon(d2, { t: 'H', refs: [l2] });
  const r2 = circularArray(d2, [{ k: 'ln', id: l2 }], { c: { x: 0, y: 0 }, step: (30 * Math.PI) / 180, n: 3 });
  assert.ok(r2.ok && solve(d2, []).ok);
  assert.equal(Object.values(d2.cons).filter((k) => k.t === 'H' || k.t === 'V').length, 1);
  const q = d2.pts[d2.lines[r2.made[1].id].a];
  near(Math.hypot(q.x, q.y), 5, 1e-9);
});


t('B-spline: pasa por los puntos (abierto y cerrado) con parametros dados o calculados', () => {
  const Q = [{ x: 0, y: 0 }, { x: 10, y: 8 }, { x: 22, y: 10 }, { x: 34, y: 3 }, { x: 44, y: -4 }];
  for (const closed of [false, true]) {
    const bs = bsplineThrough(Q, closed);
    assert.equal(bs.G.length, closed ? Q.length : Q.length + 2);
    Q.forEach((q, k) => { const e = bsplinePoint(bs, bs.ts[k]); near(e.x, q.x, 1e-9); near(e.y, q.y, 1e-9); });
    if (closed) { const a = bsplinePoint(bs, bs.ts[0]), b = bsplinePoint(bs, bs.ts[0] + 1); near(a.x, b.x, 1e-9, 'periodico'); }
    else { near(bs.G[1].x, (bs.G[0].x + bs.G[2].x) / 2, 1e-9, 'curvatura nula al inicio'); }
  }
  assert.equal(bsplineThrough([Q[0]], false), null);
});
t('spline cerrado nativo: punto sobre la curva, arrastre del punto y de la curva, tangentes', () => {
  const d = newDoc();
  const ids = [[20, 0], [14, 14], [0, 18], [-14, 14], [-20, 0], [-14, -14], [0, -18], [14, -14]].map(([x, y]) => addPoint(d, x, y, false));
  ids.forEach((i) => { d.pts[i].fixed = true; });
  const sp = addSpline(d, ids, {}, true);
  const p = addPoint(d, 19, 6, false);
  addCon(d, { t: 'PONS', refs: [p, sp] });
  assert.ok(solve(d, []).ok);
  assert.ok(distToSpl(d, sp, d.pts[p]) < 5e-5, 'sobre la curva ' + distToSpl(d, sp, d.pts[p]));
  // da la vuelta completa (pasa por la union del periodo) sin perder la curva
  for (let i = 1; i <= 48; i++) {
    const a = (i / 48) * 2 * Math.PI + 0.3;
    assert.ok(solve(d, [{ id: p, x: 30 * Math.cos(a), y: 30 * Math.sin(a) }]).ok, 'paso ' + i);
    assert.ok(distToSpl(d, sp, d.pts[p]) < 5e-5, 'sobre la curva en el paso ' + i);
  }
  // un punto de la curva libre: arrastrarlo la deforma y el punto ligado sigue sobre ella
  d.pts[ids[1]].fixed = false;
  for (let i = 1; i <= 10; i++) assert.ok(solve(d, [{ id: ids[1], x: 14 + i, y: 14 + i }]).ok);
  near(d.pts[ids[1]].x, 24, 1e-6);
  assert.ok(distToSpl(d, sp, d.pts[p]) < 5e-5);
  assert.ok(Array.isArray(d.splines[sp].ts), 'con relaciones conserva sus parametros');
  // reparametrizar tras el arrastre y seguir cumpliendo
  reparamSplines(d);
  assert.ok(distToSpl(d, sp, d.pts[p]) < 5e-5, 'tras reparametrizar');
  // recta horizontal tangente por arriba y circulo tangente por fuera
  const a = addPoint(d, -30, 25, false), b = addPoint(d, 30, 25, false);
  const l = addLine(d, a, b, {}); addCon(d, { t: 'H', refs: [l] });
  // como en la app: el contacto arranca en el punto de la curva mas cercano a la recta
  const q0 = splinePolyline(d, d.splines[sp], 32).reduce((m, q) => (q.y > m.y ? q : m));
  const T = addPoint(d, q0.x, q0.y, true);
  addCon(d, { t: 'TANLS', refs: [l, sp, T] });
  assert.ok(solve(d, []).ok, 'tangente con recta');
  assert.ok(distToSpl(d, sp, d.pts[T]) < 5e-5);
  near(d.pts[a].y, d.pts[T].y, 1e-6, 'la recta toca en T');
  const top = Math.max(...splinePolyline(d, d.splines[sp], 200).map((q) => q.y));
  near(d.pts[T].y, top, 1e-3, 'toca en el punto mas alto');
  // sin relaciones, el spline deja de guardar parametros
  deleteItems(d, Object.keys(d.cons).map((id) => ({ k: 'co', id })));
  assert.equal(d.splines[sp].ts, undefined);
});


t('seleccion por cuadro: ventana (dentro) y cruce (toca)', () => {
  const d = newDoc();
  const a = addPoint(d, 1, 1), b = addPoint(d, 4, 1), c = addPoint(d, 8, 8), e = addPoint(d, 20, 20);
  const inL = addLine(d, a, b, {}), crossL = addLine(d, b, c, {}), outL = addLine(d, c, e, {});
  const cc = addPoint(d, 3, 3), inC = addCircle(d, cc, 1, {}), bigC = addCircle(d, cc, 3.5, {}), farC = addCircle(d, addPoint(d, 40, 40), 2, {});
  const ids = (r, o) => boxSelect(d, r, o).map((x) => x.id);
  const box = { x0: 0, y0: 0, x1: 5, y1: 5 };
  const win = ids(box, { cross: false });
  assert.ok(win.includes(inL) && win.includes(inC) && win.includes(a) && win.includes(b));
  assert.ok(!win.includes(crossL) && !win.includes(bigC) && !win.includes(outL) && !win.includes(farC));
  const cr = ids(box, { cross: true });
  assert.ok(cr.includes(crossL) && cr.includes(inL) && cr.includes(inC), 'el cruce incluye lo de dentro');
  assert.ok(cr.includes(bigC), 'una circunferencia que cruza el borde');
  assert.ok(!cr.includes(outL) && !cr.includes(farC));
  const ring = addCircle(d, cc, 8, {});
  assert.ok(!ids(box, { cross: true }).includes(ring), 'rodear sin tocar no cuenta');
  assert.deepEqual(ids({ x0: 5, y0: 5, x1: 0, y1: 0 }, { cross: false }), win);
  assert.ok(!ids(box, { shown: new Set([a]) }).includes(b));
  assert.ok(!ids({ x0: 2.5, y0: 2.5, x1: 3.5, y1: 3.5 }, { cross: true }).includes(bigC));
});


t('bloqueo suave: por defecto H, V y 45; con paso 15 cada 15 grados', () => {
  const d = newDoc(), S = { x: 0, y: 0 }, none = { lines: [], curves: [] }, free = { type: 'free' };
  for (const deg of [15, 30, 60, 75, 105, 120, 135, 165]) {
    const r = (deg * Math.PI) / 180, k = lineLock(d, S, none, free, { x: 12 * Math.cos(r) + 0.05, y: 12 * Math.sin(r) - 0.04 }, 10, 9, { step: 15 });
    assert.ok(k, deg + ' grados'); assert.equal(k.deg, deg); assert.equal(k.kind, 'ANG'); assert.equal(k.label, deg + '°');
    near(Math.atan2(k.y, k.x), r, 1e-9);
    assert.deepEqual(lockConstraints(k, 'n'), [], 'solo H y V llevan restriccion');
  }
  assert.equal(lineLock(d, S, none, free, { x: 12 * Math.cos(0.5236) + 0.05, y: 12 * Math.sin(0.5236) - 0.04 }, 10), null, 'por defecto 30 grados no bloquea');
  assert.equal(lineLock(d, S, none, free, { x: 12 * Math.cos(0.7854) + 0.05, y: 12 * Math.sin(0.7854) - 0.04 }, 10).deg, 45);
  const k20 = lineLock(d, S, none, free, { x: 12 * Math.cos(0.35), y: 12 * Math.sin(0.35) }, 10, 9, { step: 10 });
  assert.equal(k20.deg, 20, 'con paso de 10 grados, 20 existe');
  assert.equal(lineLock(d, S, none, free, { x: 12 * Math.cos(0.35), y: 12 * Math.sin(0.35) }, 10), null, 'con 15 no');
  assert.equal(lineLock(d, S, none, free, { x: 12, y: 0.02 }, 10).kind, 'H');
  assert.equal(lineLock(d, S, none, free, { x: -12, y: 0.02 }, 10).kind, 'H', 'hacia el otro lado');
});
t('bloqueo suave: no se pierde cerca de otra linea; da perpendicular, paralela y termina en el cruce', () => {
  const d = newDoc();
  const a = addPoint(d, 20, -20), b = addPoint(d, 20, 40);
  const wall = addLine(d, a, b, {}); // pared vertical en x = 20
  const none = { lines: [], curves: [] }, S = { x: 0, y: 0 };
  // el cursor cae sobre la pared (endSnap 'ln'): antes se perdia el bloqueo; ahora la linea a 45 grados sigue y termina en la pared
  const r = (45 * Math.PI) / 180, X = 20, Y = X * Math.tan(r);
  const k = lineLock(d, S, none, { type: 'ln', id: wall }, { x: X + 0.1, y: Y + 0.15 }, 10);
  assert.ok(k && k.kind === 'ANG' && k.deg === 45);
  assert.deepEqual(k.end, { type: 'ln', id: wall }); near(k.x, X, 1e-9); near(k.y, Y, 1e-9);
  // perpendicular a la pared (horizontal): el final cae en el pie, sobre la pared
  const p = lineLock(d, S, none, { type: 'ln', id: wall }, { x: 19.9, y: 0.2 }, 10);
  assert.ok(p && (p.kind === 'PERP' || p.kind === 'H'));
  assert.deepEqual(p.end, { type: 'ln', id: wall }); near(p.y, 0, 1e-9);
  assert.equal(p.kind, 'PERP', 'a igual distancia gana la relacion con la linea'); assert.equal(p.ref, wall);
  // paralela a una linea cercana al cursor (no es origen): 70 grados
  const c = addPoint(d, 5, 20), e = addPoint(d, 5 + 6, 20 + 6 * Math.tan((70 * Math.PI) / 180));
  const slope = addLine(d, c, e, {});
  const q = lineLock(d, S, none, { type: 'free' }, { x: 6.89, y: 18.79 }, 10); // sobre la direccion de 70 grados y cerca de la linea
  assert.ok(q && q.kind === 'PAR' && q.ref === slope, 'paralela a la linea cercana: ' + JSON.stringify(q));
  assert.deepEqual(lockConstraints(q, 'n'), [{ t: 'PAR', refs: ['n', slope] }]);
  // un punto existente sigue mandando
  assert.equal(lineLock(d, S, none, { type: 'pt', id: a }, { x: 20, y: 11.5 }, 10), null);
  assert.equal(lineLock(d, S, none, { type: 'int', refs: [] }, { x: 20, y: 11.5 }, 10), null);
});
t('bloqueo suave: tangente a un circulo cercano al cursor aunque el cursor no este sobre el', () => {
  const d = newDoc(); const c = addPoint(d, 30, 10); const ci = addCircle(d, c, 10, {});
  const S = { x: 0, y: 0 }, dd = Math.hypot(30, 10), al = Math.acos(10 / dd), base = Math.atan2(S.y - 10, S.x - 30);
  const T = { x: 30 + 10 * Math.cos(base + al), y: 10 + 10 * Math.sin(base + al) };
  const k = lineLock(d, S, { lines: [], curves: [] }, { type: 'free' }, { x: T.x + 0.3, y: T.y - 0.2 }, 10);
  assert.ok(k && k.kind === 'TAN' && k.ref === ci);
  assert.deepEqual(k.end, { type: 'ci', id: ci });
});
t('interseccion para iman: cruces dentro de cada elemento (linea, circulo, arco y spline)', () => {
  const d = newDoc();
  const l1 = addLine(d, addPoint(d, 0, 0), addPoint(d, 10, 10), {}), l2 = addLine(d, addPoint(d, 0, 10), addPoint(d, 10, 0), {});
  const far = addLine(d, addPoint(d, 20, 0), addPoint(d, 20, 10), {});
  const P = crossPoints(d, { k: 'ln', id: l1 }, { k: 'ln', id: l2 });
  assert.equal(P.length, 1); near(P[0].x, 5); near(P[0].y, 5);
  assert.equal(crossPoints(d, { k: 'ln', id: l1 }, { k: 'ln', id: far }).length, 0, 'las rectas se cortan fuera de los segmentos');
  const c = addCircle(d, addPoint(d, 5, 5), 3, {});
  assert.equal(crossPoints(d, { k: 'ci', id: c }, { k: 'ln', id: l1 }).length, 2);
  assert.equal(crossPoints(d, { k: 'ln', id: l1 }, { k: 'ci', id: c }).length, 2, 'simetrico');
  const arc = addArc(d, d.circles[c].c, addPoint(d, 8, 5), addPoint(d, 5, 8), 3, {}); // cuarto de arco superior derecho
  assert.equal(crossPoints(d, { k: 'ar', id: arc }, { k: 'ln', id: l1 }).length, 1, 'solo el cruce dentro del tramo');
  assert.equal(crossPoints(d, { k: 'ci', id: c }, { k: 'ci', id: c }).length, 0);
  const sp = addSpline(d, [addPoint(d, 0, 5), addPoint(d, 5, 5), addPoint(d, 10, 5)], {}, false);
  assert.ok(crossPoints(d, { k: 'sp', id: sp }, { k: 'ln', id: l1 }).length >= 1);
});


t('recortar: solo quita el tramo, el resto no se divide en los demas cruces', () => {
  const d = newDoc();
  const l = addLine(d, addPoint(d, 0, 0), addPoint(d, 60, 0), {});
  for (const x of [10, 30, 50]) addLine(d, addPoint(d, x, -5), addPoint(d, x, 5), {});
  const nPts = Object.keys(d.pts).length;
  // recortar a la izquierda del primer cruce: queda UNA sola linea de x = 10 a x = 60
  const r = trimAt(d, 'ln', l, { x: 4, y: 0 });
  assert.ok(r.ok && r.pieces.length === 1, 'una sola pieza restante');
  const q = d.lines[r.pieces[0]], xs = [d.pts[q.a].x, d.pts[q.b].x].sort((m, n) => m - n);
  near(xs[0], 10, 1e-6); near(xs[1], 60, 1e-6);
  assert.equal(Object.keys(d.pts).length, nPts + 1, 'solo se crea el punto del cruce en x = 10');
  const horizontals = Object.values(d.lines).filter((m) => Math.abs(d.pts[m.a].y) < 1e-9 && Math.abs(d.pts[m.b].y) < 1e-9);
  assert.equal(horizontals.length, 1);
  // un tramo del medio entre cruces: quedan dos lineas (izquierda y derecha), sin mas divisiones
  const d2 = newDoc();
  const l2 = addLine(d2, addPoint(d2, 0, 0), addPoint(d2, 60, 0), {});
  for (const x of [10, 20, 30, 50]) addLine(d2, addPoint(d2, x, -5), addPoint(d2, x, 5), {});
  const r2 = trimAt(d2, 'ln', l2, { x: 25, y: 0 }); // entre x = 20 y x = 30
  assert.equal(r2.pieces.length, 2);
  const spans = r2.pieces.map((id) => [d2.pts[d2.lines[id].a].x, d2.pts[d2.lines[id].b].x].sort((m, n) => m - n)).sort((m, n) => m[0] - n[0]);
  near(spans[0][0], 0); near(spans[0][1], 20, 1e-6); near(spans[1][0], 30, 1e-6); near(spans[1][1], 60);
});


t('numeracion de restricciones: por tipo, compartida entre elementos, sin reutilizar; coincidente unifica punto sobre', () => {
  const d = newDoc();
  const l1 = addLine(d, addPoint(d, 0, 0), addPoint(d, 10, 0), {}), l2 = addLine(d, addPoint(d, 0, 5), addPoint(d, 10, 5), {}), l3 = addLine(d, addPoint(d, 3, 0), addPoint(d, 3, 9), {});
  const k1 = addCon(d, { t: 'H', refs: [l1] }), k2 = addCon(d, { t: 'H', refs: [l2] });
  const kp = addCon(d, { t: 'PERP', refs: [l1, l3] });
  addCon(d, { t: 'PONL', refs: [d.lines[l3].a, l1], hidden: true });
  const kc = addCon(d, { t: 'PONL', refs: [d.lines[l3].b, l2] });
  assert.equal(conTag(d.cons[k1]), 'H1'); assert.equal(conTag(d.cons[k2]), 'H2');
  assert.equal(conTag(d.cons[kp]), '⟂1', 'una sola numeracion para las dos lineas');
  assert.equal(conTag(d.cons[kc]), '●1', 'las ocultas no se numeran; el punto sobre linea es coincidente');
  delete d.cons[k1];
  const k3 = addCon(d, { t: 'H', refs: [l3] });
  assert.equal(conTag(d.cons[k3]), 'H3', 'no se reutiliza el numero borrado');
  // dibujos viejos sin numeros: se numeran en el orden de creacion
  const old = newDoc();
  const a = addLine(old, addPoint(old, 0, 0), addPoint(old, 1, 0), {});
  old.cons.k5 = { t: 'V', refs: [a] }; old.cons.k9 = { t: 'V', refs: [a] }; delete old.cn;
  ensureNumbers(old);
  assert.equal(old.cons.k5.n, 1); assert.equal(old.cons.k9.n, 2);
});
t('matriz lineal vinculada: la copia sigue al original (distancia + direccion); cota visible opcional', () => {
  for (const dims of [false, true]) {
    const d = newDoc();
    const a = addPoint(d, 0, 0), b = addPoint(d, 4, 0);
    const l = addLine(d, a, b, {});
    d.pts[a].fixed = true;
    const r = linearArray(d, [{ k: 'ln', id: l }], [{ u: { x: 0, y: 1 }, s: 10, n: 2 }], { link: true, dims });
    assert.ok(r.ok && solve(d, []).ok);
    const dimK = Object.values(d.cons).filter((k) => k.t === 'DIST' && !k.hidden);
    assert.equal(dimK.length, dims ? 2 : 0, 'una cota visible por copia solo si se pide');
    // al girar el original (mover su otro extremo), las copias se mueven rigidamente y no cambian de forma
    assert.ok(solve(d, [{ id: b, x: 4, y: 3 }]).ok);
    near(d.pts[b].x, 4, 1e-3); near(d.pts[b].y, 3, 1e-3);
    const copies = r.made.map((m) => d.lines[m.id]);
    copies.forEach((c, i) => {
      const A = d.pts[c.a], B = d.pts[c.b];
      near(B.x - A.x, 4, 1e-4, 'misma forma'); near(B.y - A.y, 3, 1e-4);
      near(A.x, 0, 1e-4); near(A.y, 10 * (i + 1), 1e-4, 'en su lugar');
    });
  }
});
t('matriz lineal vinculada con linea de direccion: sigue a la linea si esta gira', () => {
  const d = newDoc();
  const l = addLine(d, addPoint(d, 0, 0), addPoint(d, 4, 0), {});
  const dir = addLine(d, addPoint(d, 20, 20), addPoint(d, 30, 20), {}); // direccion horizontal
  d.pts[d.lines[l].a].fixed = true; d.pts[d.lines[dir].a].fixed = true;
  const r = linearArray(d, [{ k: 'ln', id: l }], [{ u: { x: 1, y: 0 }, s: 10, n: 1, line: dir }], { link: true });
  assert.ok(r.ok && solve(d, []).ok);
  assert.ok(solve(d, [{ id: d.lines[dir].b, x: 20, y: 30 }]).ok, 'la linea de direccion se pone vertical');
  const c = d.lines[r.made[0].id];
  near(d.pts[c.a].x, 0, 1e-3); near(d.pts[c.a].y, 10, 1e-3, 'la copia ahora esta arriba');
});
t('matriz circular vinculada: copias a igual distancia del centro y con el angulo; siguen al original', () => {
  const d = newDoc();
  const c = addPoint(d, 0, 0), p = addPoint(d, 10, 0);
  d.pts[c].fixed = true;
  const l = addLine(d, c, p, {});
  const r = circularArray(d, [{ k: 'ln', id: l }], { c: { x: 0, y: 0 }, step: Math.PI / 2, n: 3, link: true, cid: c, dims: true });
  assert.ok(r.ok && solve(d, []).ok);
  assert.equal(Object.values(d.cons).filter((k) => k.t === 'ANG4' && !k.hidden).length, 2, 'cota angular visible');
  assert.ok(solve(d, [{ id: p, x: 6, y: 8 }]).ok); // el original gira y se acorta
  r.made.forEach((m, i) => {
    const q = d.pts[d.lines[m.id].b];
    near(Math.hypot(q.x, q.y), 10, 1e-3, 'mismo radio');
    const want = Math.atan2(8, 6) + (Math.PI / 2) * (i + 1);
    near(Math.atan2(Math.sin(Math.atan2(q.y, q.x) - want), Math.cos(Math.atan2(q.y, q.x) - want)), 0, 1e-3, 'angulo de la copia');
  });
});
t('copia espejo vinculada: simetria con el eje; sigue al original', () => {
  const d = newDoc();
  const ax = addPoint(d, 0, -10), bx = addPoint(d, 0, 10);
  d.pts[ax].fixed = d.pts[bx].fixed = true;
  const axis = addLine(d, ax, bx, {});
  const a = addPoint(d, 5, 0), b = addPoint(d, 8, 3);
  const l = addLine(d, a, b, {});
  const ci = addCircle(d, addPoint(d, 5, 6), 2, {});
  const r = mirrorCopy(d, [{ k: 'ln', id: l }, { k: 'ci', id: ci }], d.pts[ax], d.pts[bx], { axis });
  assert.ok(r.ok && solve(d, []).ok);
  assert.ok(solve(d, [{ id: b, x: 9, y: 5 }]).ok);
  const m = d.lines[r.made.find((x) => x.k === 'ln').id];
  near(d.pts[m.b].x, -9, 1e-3); near(d.pts[m.b].y, 5, 1e-3);
  const mc = d.circles[r.made.find((x) => x.k === 'ci').id];
  assert.ok(solve(d, [{ id: d.circles[ci].c, x: 7, y: 6 }]).ok);
  near(d.pts[mc.c].x, -7, 1e-3);
  d.circles[ci].r = 3; assert.ok(solve(d, []).ok); near(mc.r, 3, 1e-3, 'igual radio');
});


t('elipse: semiejes desde el centro y dos puntos, cierra, se copia, se exporta y se borra con sus puntos', () => {
  const d = newDoc();
  const c = addPoint(d, 10, 5), a = addPoint(d, 16, 5), b = addPoint(d, 10, 8);
  const e = addEllipse(d, c, a, b, { color: 'auto', ltype: 'continua', w: 2, ls: 1 });
  addCon(d, { t: 'ANG4', refs: [c, a, c, b], v: 90, hidden: true });
  const g = ellipseOf(d, d.ellipses[e]);
  near(g.ra, 6); near(g.rb, 3); near(g.ux, 1); near(g.uy, 0, 1e-12);
  const P = ellipsePolyline(d, d.ellipses[e], 96);
  near(P[0].x, 16); near(P[0].y, 5); near(P[24].x, 10, 1e-9); near(P[24].y, 8, 1e-9, 'extremo del eje 2');
  near(P[96].x, P[0].x, 1e-9, 'cerrada');
  // el 2.o eje se mantiene perpendicular al mover el extremo del 1.o
  d.pts[c].fixed = true;
  assert.ok(solve(d, [{ id: a, x: 10, y: 11 }]).ok);
  const g2 = ellipseOf(d, d.ellipses[e]);
  near(g2.ra, 6, 1e-4); near(g2.uy, 1, 1e-4, 'el eje gira'); near(d.pts[b].y, 5, 1e-3, 'b sigue perpendicular al eje girado (a la altura del centro)');
  // copias (lineal) y exportacion
  const r = linearArray(d, [{ k: 'el', id: e }], [{ u: { x: 1, y: 0 }, s: 30, n: 1 }], {});
  assert.ok(r.ok && r.made[0].k === 'el' && Object.keys(d.ellipses).length === 2);
  assert.match(exportSVG(d, 1, {}), /<path d="M[^"]+ Z"/);
  assert.ok(exportDXF(d, 5, {}).includes('POLYLINE'));
  assert.ok(exportSVGLaser(d, { modes: { [styleKey(d.ellipses[e])]: 'cut' } }).svg.includes('id="corte"'));
  assert.equal(boxSelect(d, { x0: 0, y0: -5, x1: 30, y1: 25 }, {}).filter((x) => x.k === 'el').length, 1, 'cuadro: solo la elipse que cae dentro');
  deleteItems(d, [{ k: 'pt', id: a }]);
  assert.equal(Object.keys(d.ellipses).length, 1, 'al borrar un punto de la elipse, se borra la elipse');
});


t('extension sucesiva: el extremo se desplaza, sin dejar puntos nuevos', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 10, 0);
  const h = addLine(d, a, b, { color: 'auto', ltype: 'continua', w: 2, ls: 1 });
  const cross = [30, 60, 90].map((x) => { const p = addPoint(d, x, -10), q = addPoint(d, x, 10); return addLine(d, p, q, { color: 'auto', ltype: 'continua', w: 2, ls: 1 }); });
  const n0 = Object.keys(d.pts).length;
  for (let i = 0; i < 3; i++) {
    const r = extendEnd(d, 'ln', h, { x: d.pts[d.lines[h].b].x, y: 0 });
    assert.ok(r.ok, r.msg);
    assert.ok(solve(d, []).ok);
  }
  near(d.pts[d.lines[h].b].x, 90, 1e-6, 'llega al 3.er cruce');
  assert.equal(Object.keys(d.pts).length, n0, 'no se crearon puntos');
  assert.equal(d.lines[h].b, b, 'sigue siendo el mismo extremo');
  const on = Object.values(d.cons).filter((k) => k.t === 'PONL' && k.refs[0] === b);
  assert.equal(on.length, 1, 'solo queda la restriccion con la ultima linea');
  assert.equal(on[0].refs[1], cross[2]);
});

t('rectangulo: 4 lineas H/V, se mantiene al mover una esquina; de centro con punto medio', () => {
  const d = newDoc();
  const p1 = addPoint(d, 0, 0), p3 = addPoint(d, 8, 5), p2 = addPoint(d, 8, 0), p4 = addPoint(d, 0, 5);
  addRectangle(d, [p1, p2, p3, p4], { color: 'auto', ltype: 'continua', w: 2, ls: 1 });
  assert.equal(Object.keys(d.lines).length, 4);
  assert.ok(solve(d, [{ id: p3, x: 12, y: 9 }]).ok);
  near(d.pts[p2].x, 12, 1e-5); near(d.pts[p2].y, 0, 1e-5); near(d.pts[p4].x, 0, 1e-5); near(d.pts[p4].y, 9, 1e-5);
  // de centro
  const e = newDoc();
  const c = addPoint(e, 5, 5), q1 = addPoint(e, 1, 2), q3 = addPoint(e, 9, 8), q2 = addPoint(e, 9, 2), q4 = addPoint(e, 1, 8);
  addRectangle(e, [q1, q2, q3, q4], { color: 'auto', ltype: 'continua', w: 2, ls: 1 });
  addCon(e, { t: 'MID', refs: [q1, q3, c], hidden: true });
  assert.ok(solve(e, [{ id: q3, x: 13, y: 10 }]).ok);
  near(e.pts[c].x, (e.pts[q1].x + e.pts[q3].x) / 2, 1e-5); near(e.pts[c].y, (e.pts[q1].y + e.pts[q3].y) / 2, 1e-5);
});

t('circulo por 3 puntos: centro y radio; colineales se rechazan', () => {
  const g = circleThrough3({ x: 5, y: 0 }, { x: 0, y: 5 }, { x: -5, y: 0 });
  near(g.c.x, 0); near(g.c.y, 0); near(g.r, 5);
  assert.equal(circleThrough3({ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }), null);
});

t('poligono regular: inscrito y circunscrito, orientacion por el radio, se mantiene regular al arrastrar', () => {
  const C = { x: 0, y: 0 };
  const vi = polygonVertices(C, { x: 10, y: 0 }, 6, false);
  near(vi[0].x, 10); near(vi[1].x, 5, 1e-9); near(vi[1].y, 8.660254037844386, 1e-9);
  const vc = polygonVertices(C, { x: 10, y: 0 }, 4, true); // apotema 10: cuadrado de lado 20
  near(Math.hypot(vc[0].x - vc[3].x, vc[0].y - vc[3].y), 20, 1e-9);
  near((vc[0].x + vc[3].x) / 2, 10, 1e-9, 'el radio llega al medio de un lado');
  const vo = polygonVertices(C, { x: 0, y: 10 }, 3, false);
  near(vo[0].x, 0, 1e-9); near(vo[0].y, 10, 1e-9);
  const d = newDoc();
  const c = addPoint(d, 0, 0), ids = vi.map((q) => addPoint(d, q.x, q.y));
  addPolygon(d, c, ids, { color: 'auto', ltype: 'continua', w: 2, ls: 1 });
  assert.equal(Object.keys(d.lines).length, 6);
  assert.ok(solve(d, [{ id: ids[0], x: 14, y: 6 }]).ok);
  const r = ids.map((i) => Math.hypot(d.pts[i].x - d.pts[c].x, d.pts[i].y - d.pts[c].y));
  r.forEach((v) => near(v, r[0], 1e-4, 'vertices equidistantes'));
  const side = (i) => Math.hypot(d.pts[ids[(i + 1) % 6]].x - d.pts[ids[i]].x, d.pts[ids[(i + 1) % 6]].y - d.pts[ids[i]].y);
  for (let i = 1; i < 6; i++) near(side(i), side(0), 1e-4, 'lados iguales');
});

t('copiar y pegar: el centro del cuadro va al destino, lleva sus restricciones y sobrevive a borrar el original', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 10, 0);
  const l = addLine(d, a, b, { color: '#dc2626', ltype: 'eje', w: 2, ls: 1 });
  addCon(d, { t: 'H', refs: [l] });
  const cc = addPoint(d, 5, 10), ci = addCircle(d, cc, 4, { color: 'auto', ltype: 'continua', w: 2, ls: 1 });
  const items = [{ k: 'ln', id: l }, { k: 'ci', id: ci }];
  const bb = bboxOf(d, items);
  near(bb.x0, 0); near(bb.x1, 10); near(bb.y0, 0); near(bb.y1, 14);
  const clip = clipOf(d, items);
  deleteItems(d, items);
  const r = pasteClip(d, clip, { x: 100, y: 50 });
  assert.ok(r.ok && r.made.length === 2);
  const nl = r.made.find((m) => m.k === 'ln').id, nc = r.made.find((m) => m.k === 'ci').id;
  assert.equal(d.lines[nl].ltype, 'eje');
  assert.ok(Object.values(d.cons).some((k) => k.t === 'H' && k.refs[0] === nl), 'la H se copia');
  const A = d.pts[d.lines[nl].a], B = d.pts[d.lines[nl].b];
  near((Math.min(A.x, B.x) + Math.max(A.x, B.x)) / 2 - 5 + 5, 100 - 0, 1e-9, 'la linea queda centrada en x=100 (cuadro 0..10 en x)');
  near(d.pts[d.circles[nc].c].y, 50 + 3, 1e-9, 'el circulo queda a 10-7=3 sobre el centro');
  assert.ok(solve(d, []).ok);
  const r2 = pasteClip(d, clip, { x: 0, y: 0 });
  assert.ok(r2.ok, 'se puede pegar varias veces');
});

t('arbol por capa: capas primero, cada una con sus grupos por tipo; sin capas, por tipo', () => {
  const { d, a, b, l1, l2 } = lineDoc();
  assert.deepEqual(buildTree(d, { by: 'layer' }).map((g) => g.key), buildTree(d).map((g) => g.key), 'sin capas no cambia nada');
  const y1 = addLayer(d, 'construcción'), y2 = addLayer(d, 'vacía');
  d.lines[l1].layer = y1;
  const cc = addPoint(d, 30, 30); d.pts[cc].layer = y1;
  const ci = addCircle(d, cc, 5, {}); d.circles[ci].layer = y1;
  addCon(d, { t: 'PAR', refs: [l1, l2] });
  d.layers[y1].on = false;
  const t = buildTree(d, { by: 'layer' });
  assert.deepEqual(t.map((g) => g.key), [`g:y:${y1}`, `g:y:${y2}`, 'g:y:-', 'g:co']);
  assert.equal(t[0].layerId, y1);
  assert.equal(t[0].label, 'construcción (2) · apagada', 'la linea y el circulo; el centro sigue a su circulo');
  assert.deepEqual(t[0].children.map((g) => g.key), ['g:ln', 'g:ci']);
  assert.equal(t[0].children[0].children[0].sel.id, l1);
  assert.equal(t[1].label, 'vacía (0)'); assert.equal(t[1].children.length, 0, 'una capa vacia se ve igual');
  assert.equal(t[2].label, 'Sin capa (1)'); assert.equal(t[2].children[0].children[0].sel.id, l2);
  // un elemento con una capa que ya no existe va a «Sin capa»
  d.lines[l2].layer = 'y999';
  assert.equal(buildTree(d, { by: 'layer' })[2].label, 'Sin capa (1)');
  // por tipo, las capas no cambian nada
  assert.deepEqual(buildTree(d).map((g) => g.key), ['g:ln', 'g:ci', 'g:co']);
});

t('contornos: cerrado, abierto y ramificado; coincidencias, uniones sin restriccion, constructivas y vectores', () => {
  const d = newDoc();
  const P = (x, y) => addPoint(d, x, y);
  // cuadrado cerrado con una esquina hecha de dos puntos atados por COI
  const a = P(0, 0), b = P(10, 0), c = P(10, 10), e = P(0, 10), e2 = P(0, 10);
  const sq = [addLine(d, a, b, {}), addLine(d, b, c, {}), addLine(d, c, e, {}), addLine(d, e2, a, {})];
  addCon(d, { t: 'COI', refs: [e, e2] });
  // abierto: linea y arco encadenados
  const f = P(30, 0), g = P(40, 0), cen = P(45, 0), h = P(50, 0);
  const ol = addLine(d, f, g, {}), oa = addArc(d, cen, g, h, 5, {});
  // ramificado: tres lineas en un mismo punto
  const o = P(80, 0), r1 = P(90, 0), r2 = P(80, 10), r3 = P(70, 0);
  const br = [addLine(d, o, r1, {}), addLine(d, o, r2, {}), addLine(d, o, r3, {})];
  // sueltos que no forman contorno: una linea sola, una constructiva y un vector pegados al cuadrado, un circulo
  addLine(d, P(100, 100), P(110, 100), {});
  addLine(d, b, P(20, 0), { ltype: 'constructiva' });
  const v = addLine(d, c, P(20, 20), {}); d.lines[v].vec = { m: null };
  addCircle(d, P(60, 60), 3, {});
  // dos lineas que se tocan en el mismo lugar con puntos distintos y sin COI: se unen, pero contadas aparte
  const lz = [addLine(d, P(200, 0), P(210, 0), {}), addLine(d, P(210, 0), P(210, 10), {})];
  // triangulo que casi se cierra (abertura 0.01) y dos trazos separados por 0.5
  const tri = [addLine(d, P(300, 0), P(310, 0), {})]; tri.push(addLine(d, d.lines[tri[0]].b, P(305, 8), {})); tri.push(addLine(d, d.lines[tri[1]].b, P(300.01, 0), {}));
  // dos «L» que se quedan a 0.5: (400,10)-(400,0)-(410,0) y (410.5,0)-(420,0)-(420,10)
  const q0 = P(400, 0), q1 = P(420, 0);
  addLine(d, P(400, 10), q0, {}); addLine(d, q0, P(410, 0), {});
  addLine(d, P(410.5, 0), q1, {}); addLine(d, q1, P(420, 10), {});
  const cs = contours(d);
  assert.equal(cs.length, 7);
  near(cs[4].gap.d, 0.01, 1e-9); assert.equal(cs[4].gap.with, 4, 'casi se cierra solo');
  near(cs[5].gap.d, 0.5, 1e-9); assert.equal(cs[5].gap.with, 6); assert.equal(cs[6].gap.with, 5);
  assert.ok(!cs[1].gap && !cs[2].gap && !cs[3].gap, 'extremos lejanos (mas del 1 % del dibujo) no son una abertura');
  assert.deepEqual(cs[3].items.map((i) => i.id), lz); assert.equal(cs[3].loose, 1);
  assert.equal(cs[0].loose, 0, 'la esquina con COI no cuenta como suelta');
  const [cq, co, cb] = cs;
  assert.ok(cq.closed && !cq.branched);
  assert.deepEqual(cq.items.map((i) => i.id), sq, 'el cuadrado se recorre en orden y la esquina por COI lo cierra');
  assert.ok(!co.closed && !co.branched);
  assert.deepEqual(co.items.map((i) => i.k), ['ln', 'ar']);
  assert.ok(cb.branched && !cb.closed);
  assert.deepEqual(cb.items.map((i) => i.id).sort(), [...br].sort());
  // en el arbol
  const g0 = buildTree(d).find((x) => x.key === 'g:ct');
  assert.deepEqual(g0.children.map((n) => n.label), ['Contorno 1 · cerrado · 4 líneas', 'Contorno 2 · abierto · 1 línea, 1 arco', 'Contorno 3 · ramificado · 3 líneas', 'Contorno 4 · abierto · 1 unión sin restricción · 2 líneas',
    'Contorno 5 · abierto · abertura 0.01 entre sus extremos · 3 líneas', 'Contorno 6 · abierto · abertura 0.5 con el 7 · 2 líneas', 'Contorno 7 · abierto · abertura 0.5 con el 6 · 2 líneas']);
  assert.deepEqual(g0.children[0].selMany.map((i) => i.id), sq, 'tocar el contorno selecciona sus elementos');
  assert.ok(g0.children[0].children.every((n) => n.link && !n.children));
  assert.ok(buildTree(d, { by: 'layer' }).some((x) => x.key === 'g:ct'), 'tambien en la vista por capa');
  assert.deepEqual(contours(newDoc()), []);
});

t('operaciones: las relaciones automaticas guardan su origen y el arbol las agrupa', () => {
  const d = newDoc();
  const c = addPoint(d, 0, 0), p = addPoint(d, 10, 0);
  d.pts[c].fixed = true;
  const l = addLine(d, c, p, {});
  const r1 = circularArray(d, [{ k: 'ln', id: l }], { c: { x: 0, y: 0 }, step: Math.PI / 2, n: 3, link: true, cid: c });
  assert.ok(r1.ok);
  const op1 = Object.keys(d.ops)[0];
  assert.deepEqual(d.ops[op1], { t: 'MATC', n: 1 });
  const hid = Object.values(d.cons).filter((k) => k.hidden);
  assert.ok(hid.length > 0 && hid.every((k) => k.op === op1), 'todas las relaciones de la matriz llevan su operacion');
  const r2 = circularArray(d, [{ k: 'ln', id: l }], { c: { x: 0, y: 0 }, step: Math.PI / 3, n: 2, link: true, cid: c });
  assert.ok(r2.ok);
  assert.deepEqual(Object.values(d.ops).map((o) => o.n), [1, 2], 'cada matriz con su numero');
  // una operacion que no crea relaciones no queda registrada ni gasta numero
  withOp(d, 'MATC', () => {});
  assert.equal(Object.keys(d.ops).length, 2); assert.equal(d.opn.MATC, 2);
  // una operacion dentro de otra pertenece a la de fuera
  const kin = withOp(d, 'RED', () => withOp(d, 'CHA', () => addCon(d, { t: 'EQL', refs: [l, r1.made[0].id], hidden: true })));
  assert.equal(d.ops[d.cons[kin].op].t, 'RED');
  // fuera de una operacion no se marca nada, y una copia pegada no hereda la operacion del original
  const kout = addCon(d, { t: 'EQD', refs: [c, p, c, p], hidden: true, op: op1 });
  assert.equal(d.cons[kout].op, undefined);
  const nOp = Object.values(d.cons).filter((k) => k.op).length;
  const items = [{ k: 'ln', id: r1.made[0].id }, { k: 'ln', id: r1.made[1].id }];
  assert.ok(pasteClip(d, clipOf(d, items), { x: 50, y: 50 }).ok);
  assert.equal(Object.values(d.cons).filter((k) => k.op).length, nOp, 'lo pegado no se suma a la matriz');
  // arbol: primero las operaciones, en orden, y luego las de por tipo (sin origen)
  const auto = buildTree(d).find((x) => x.key === 'g:co').children.find((x) => x.key === 'g:co:auto');
  const labels = auto.children.map((g) => g.label);
  assert.match(labels[0], /^Matriz circular 1 \(\d+\)$/);
  assert.match(labels[1], /^Matriz circular 2 \(\d+\)$/);
  assert.match(labels[2], /^Redondeo 1 \(1\)$/);
  assert.ok(labels.slice(3).some((x) => /^Igual distancia \(\d+\)$/.test(x)), 'sin origen: por tipo');
  assert.equal(auto.label, `Automáticas (${auto.children.reduce((s, g) => s + g.children.length, 0)})`);
  assert.equal(auto.children.reduce((s, g) => s + g.children.length, 0), Object.values(d.cons).filter((k) => k.hidden).length);
});

t('linea constructiva: estilo propio y no sale en el SVG de corte por defecto', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 10, 0), c = addPoint(d, 0, 5);
  addLine(d, a, b, { color: 'auto', ltype: 'continua', w: 2, ls: 1 });
  addLine(d, a, c, { ...CLINE_STYLE });
  assert.equal(CLINE_STYLE.color, '#C3C3C3'); assert.equal(CLINE_STYLE.w, 1);
  const cls = laserClasses(d);
  assert.equal(cls.length, 2);
  const r = exportSVGLaser(d, { onlyContinuous: true });
  assert.equal(r.cut, 1, 'solo la continua se corta');
});

t('fuentes de texto: lista con generica y se mide por fuente', () => {
  assert.ok(FONTS.length >= 8);
  assert.match(fontCss('mono'), /monospace/);
  assert.equal(fontCss(undefined), FONTS[0][2]);
  const d = newDoc(); const p = addPoint(d, 0, 0);
  const id = addText(d, p, 'Hola', { h: 2, font: 'serif' });
  assert.equal(d.texts[id].font, 'serif');
  const seen = [];
  textFrame(d.texts[id], (ln, f) => { seen.push(f); return ln.length * 0.6; }, 'bl');
  assert.deepEqual(seen, ['serif']);
  const e = exportSVG(d, 1, {});
  assert.ok(e.includes('Times'), 'el SVG lleva la fuente');
});


t('concentrica: los centros coinciden, se numera y no hace nada si ya comparten centro', () => {
  const d = newDoc();
  const c1 = addPoint(d, 0, 0), c2 = addPoint(d, 7, 3), c3 = addPoint(d, -4, 2);
  const a = addCircle(d, c1, 5, { color: 'auto', ltype: 'continua', w: 2, ls: 1 });
  const b = addCircle(d, c2, 2, { color: 'auto', ltype: 'continua', w: 2, ls: 1 });
  const e = addArc(d, c3, addPoint(d, -1, 2), addPoint(d, -4, 5), 3, { color: 'auto', ltype: 'continua', w: 2, ls: 1 });
  d.pts[c1].fixed = true;
  const k1 = addCon(d, { t: 'CONC', refs: [a, b] }), k2 = addCon(d, { t: 'CONC', refs: [a, e] });
  assert.ok(solve(d, []).ok);
  near(d.pts[c2].x, 0, 1e-5); near(d.pts[c2].y, 0, 1e-5); near(d.pts[c3].x, 0, 1e-5); near(d.pts[c3].y, 0, 1e-5);
  assert.equal(conTag(d.cons[k1]), '◎1'); assert.equal(conTag(d.cons[k2]), '◎2');
  const d2 = newDoc(); const p = addPoint(d2, 0, 0);
  const x = addCircle(d2, p, 1, {}), y = addCircle(d2, p, 2, {});
  addCon(d2, { t: 'CONC', refs: [x, y] });
  assert.ok(solve(d2, []).ok, 'mismo centro: restriccion vacia, no falla');
});

t('linea de punto medio: crece simetrica y sigue siendolo al mover el extremo', () => {
  const d = newDoc();
  const m = addPoint(d, 10, 10), b = addPoint(d, 16, 12), a = addPoint(d, 4, 8);
  addLine(d, a, b, { color: 'auto', ltype: 'continua', w: 2, ls: 1 });
  addCon(d, { t: 'MID', refs: [a, b, m] });
  d.pts[m].fixed = true;
  assert.ok(solve(d, [{ id: b, x: 20, y: 10 }]).ok);
  near(d.pts[a].x, 0, 1e-5); near(d.pts[a].y, 10, 1e-5);
});


t('sentido del arco: sigue el movimiento; con un toque, el arco corto', () => {
  const C = { x: 0, y: 0 }, S = { x: 10, y: 0 };
  assert.equal(arcIsClockwise(1.2, C, S, { x: 0, y: 10 }), false, 'se movio antihorario');
  assert.equal(arcIsClockwise(-1.2, C, S, { x: 0, y: 10 }), true, 'se movio horario aunque el extremo este arriba: arco largo horario');
  assert.equal(arcIsClockwise(0, C, S, { x: 0, y: 10 }), false, 'toque: corto, antihorario');
  assert.equal(arcIsClockwise(0, C, S, { x: 0, y: -10 }), true, 'toque: corto, horario');
});

t('arco constructivo: punto, hueco, trazo, hueco, punto; continuo si es muy corto', () => {
  const d = constructionArcDash(100, 2, 3.5);
  assert.equal(d.length, 5); near(d.reduce((a, b) => a + b, 0), 100);
  assert.deepEqual(constructionArcDash(8, 2, 3.5), []);
});

t('arco horario: el arco antihorario va del extremo al inicio y barre lo mismo', () => {
  const d = newDoc();
  const c = addPoint(d, 0, 0), s0 = addPoint(d, 10, 0), e0 = addPoint(d, 0, 10);
  const id = addArc(d, c, e0, s0, 10, { color: 'auto', ltype: 'continua', w: 2, ls: 1 }); // horario de s0 a e0
  near(arcOf(d, d.arcs[id]).sweep, (3 * Math.PI) / 2, 1e-9);
});

// ---------------------------------------------------------------- v1.1.0: elipses y splines
const ST = { color: 'auto', ltype: 'continua', w: 2, ls: 1 };
const mkEll = (d, cx = 0, cy = 0, ra = 10, rb = 5, p1 = null, p2 = null) => {
  const c = addPoint(d, cx, cy), a = addPoint(d, cx + ra, cy), b = addPoint(d, cx, cy + rb);
  const e = addEllipse(d, c, a, b, ST, p1, p2);
  addCon(d, { t: 'ANG4', refs: [c, a, c, b], v: 90, hidden: true });
  return { e, c, a, b };
};
const offEll = (d, e, pid) => { const g = ellipseOf(d, d.ellipses[e]), P = d.pts[pid], q = ellipsePoint(g, ellipseParam(g, P)); return Math.hypot(q.x - P.x, q.y - P.y); };

t('arco eliptico: tramo antihorario de p1 a p2, sus extremos siguen a la elipse, se copia, se refleja y se exporta abierto', () => {
  const d = newDoc();
  const p1 = addPoint(d, 10 * Math.cos(0.3), 5 * Math.sin(0.3), true), p2 = addPoint(d, 10 * Math.cos(2), 5 * Math.sin(2), true);
  const { e, c, a } = mkEll(d, 0, 0, 10, 5, p1, p2);
  assert.ok(isPartial(d.ellipses[e]));
  const r0 = ellipseRange(d, d.ellipses[e]);
  near(r0.t0, 0.3, 1e-9); near(r0.sweep, 1.7, 1e-9);
  const P = ellipsePolyline(d, d.ellipses[e], 96);
  near(P[0].x, d.pts[p1].x, 1e-9); near(P[P.length - 1].x, d.pts[p2].x, 1e-9, 'la poligonal va de p1 a p2');
  d.pts[c].fixed = true;
  assert.ok(solve(d, [{ id: a, x: 14, y: 3 }]).ok);
  near(offEll(d, e, p1), 0, 1e-6, 'p1 sobre la elipse'); near(offEll(d, e, p2), 0, 1e-6, 'p2 sobre la elipse');
  assert.ok(solve(d, [{ id: p2, x: -20, y: 0 }]).ok, 'el extremo se desliza por la elipse');
  near(offEll(d, e, p2), 0, 1e-6);
  const m = mirrorCopy(d, [{ k: 'el', id: e }], { x: 30, y: -5 }, { x: 30, y: 5 });
  assert.ok(m.ok);
  const me = d.ellipses[m.made[0].id];
  near(ellipseRange(d, me).sweep, ellipseRange(d, d.ellipses[e]).sweep, 1e-6, 'el reflejo ocupa el mismo tramo');
  const svg = exportSVG(d, 1, {});
  assert.ok(!/ Z"/.test(svg), 'los arcos elipticos no se cierran en el SVG');
  assert.ok(JSON.stringify(buildTree(d)).includes('Arco elíptico'));
  deleteItems(d, [{ k: 'pt', id: p1 }]);
  assert.ok(!d.ellipses[e], 'borrar un extremo borra el arco eliptico');
});

t('coincidente con elipse (PONE): el punto queda sobre la elipse, tambien si el 2.o eje pasa a ser el mayor', () => {
  const d = newDoc(); const { e, c, a, b } = mkEll(d);
  const p = addPoint(d, 7, 7);
  const k = addCon(d, { t: 'PONE', refs: [p, e] });
  assert.equal(conTag(d.cons[k]), '●1');
  assert.ok(solve(d, []).ok); near(offEll(d, e, p), 0, 1e-7);
  assert.ok(solve(d, [{ id: a, x: 14, y: 3 }]).ok); near(offEll(d, e, p), 0, 1e-7);
  d.pts[c].fixed = d.pts[a].fixed = true;
  assert.ok(solve(d, [{ id: b, x: d.pts[b].x * 4, y: d.pts[b].y * 4 }]).ok);
  const g = ellipseOf(d, d.ellipses[e]);
  assert.ok(g.rb > g.ra, 'el segundo eje es ahora el mayor'); near(offEll(d, e, p), 0, 1e-7);
});

t('tangente con elipse: recta, circulo y otra elipse', () => {
  const d = newDoc(); const { e, c, a, b } = mkEll(d);
  d.pts[c].fixed = d.pts[a].fixed = d.pts[b].fixed = true;
  const l1 = addPoint(d, -3, 8), l2 = addPoint(d, 12, 6), L = addLine(d, l1, l2, ST);
  const T = addPoint(d, 3, 4.8, true);
  const k = addCon(d, { t: 'TANLE', refs: [L, e, T] });
  assert.equal(conTag(d.cons[k]), 'T1');
  assert.ok(solve(d, []).ok);
  near(offEll(d, e, T), 0, 1e-7);
  // en coordenadas de la elipse (circulo unitario) la recta queda a distancia 1 del centro
  const u = (P) => ({ x: P.x / 10, y: P.y / 5 }), A = u(d.pts[l1]), B = u(d.pts[l2]);
  near(Math.abs((B.x - A.x) * A.y - (B.y - A.y) * A.x) / Math.hypot(B.x - A.x, B.y - A.y), 1, 1e-6, 'recta tangente');
  const cc = addPoint(d, 15, 6), ci = addCircle(d, cc, 3, ST), T2 = addPoint(d, 9.5, 2, true);
  addCon(d, { t: 'TANCE', refs: [ci, e, T2] });
  assert.ok(solve(d, []).ok);
  near(offEll(d, e, T2), 0, 1e-7); near(Math.hypot(d.pts[T2].x - d.pts[cc].x, d.pts[T2].y - d.pts[cc].y), d.circles[ci].r, 1e-7);
  // la normal de la elipse en T2 pasa por el centro del circulo
  const q = d.pts[T2], nrm = { x: q.x / 100, y: q.y / 25 }, v = { x: d.pts[cc].x - q.x, y: d.pts[cc].y - q.y };
  near((nrm.x * v.y - nrm.y * v.x) / (Math.hypot(nrm.x, nrm.y) * Math.hypot(v.x, v.y)), 0, 1e-6, 'circulo tangente');
  const o = mkEll(d, 18, -9, 6, 3), T3 = addPoint(d, 11, -6, true);
  addCon(d, { t: 'TANEE', refs: [e, o.e, T3] });
  assert.ok(solve(d, []).ok);
  near(offEll(d, e, T3), 0, 1e-6); near(offEll(d, o.e, T3), 0, 1e-6);
});

t('recortar elipse: queda un arco eliptico, luego se parte y al final se borra', () => {
  const d = newDoc(); const { e } = mkEll(d);
  addLine(d, addPoint(d, 4, -8), addPoint(d, 4, 8), ST); addLine(d, addPoint(d, -4, -8), addPoint(d, -4, 8), ST);
  assert.equal(curveCuts(d, 'el', e).cuts.length, 4);
  assert.ok(trimAt(d, 'el', e, { x: 0, y: 5 }).ok && solve(d, []).ok);
  const el = d.ellipses[e];
  assert.ok(isPartial(el));
  near(d.pts[el.p1].x, -4, 1e-6); near(d.pts[el.p1].y, 4.5826, 1e-3); near(d.pts[el.p2].x, 4, 1e-6);
  near(ellipseRange(d, el).sweep, TAU - (Math.PI - 2 * Math.acos(0.4)), 1e-6);
  const r = trimAt(d, 'el', e, { x: 0, y: -5 });
  assert.ok(r.ok && solve(d, []).ok); assert.equal(r.pieces.length, 2);
  const [x, y] = r.pieces.map((i) => d.ellipses[i]);
  assert.ok(x.c === y.c && x.a === y.a && x.b === y.b, 'los trozos comparten centro y ejes');
  near(ellipseRange(d, x).sweep, 2 * Math.acos(0.4), 1e-6);
  const r3 = trimAt(d, 'el', e, { x: -10, y: 0 });
  assert.ok(r3.ok && solve(d, []).ok);
  assert.equal(Object.keys(d.ellipses).length, 1, 'un trozo sin mas cruces se quita entero');
  // una elipse con un solo cruce se borra completa
  const d2 = newDoc(); const o = mkEll(d2);
  addLine(d2, addPoint(d2, 0, 0), addPoint(d2, 20, 0), ST);
  assert.ok(trimAt(d2, 'el', o.e, { x: 0, y: 5 }).deleted);
});

t('recortar spline: los trozos conservan la forma y las relaciones pasan al trozo que corresponde', () => {
  const d = newDoc();
  const ids = [[0, 0], [10, 8], [20, 0], [30, -8], [40, 0], [50, 6]].map(([x, y]) => addPoint(d, x, y));
  const s = addSpline(d, ids, ST, false);
  const orig = splinePolyline(d, d.splines[s], 24).map((q) => ({ ...q }));
  const l1 = addLine(d, addPoint(d, 14, -20), addPoint(d, 14, 20), ST); addLine(d, addPoint(d, 33, -20), addPoint(d, 33, 20), ST);
  const on = closestOnPolyline(orig, { x: 45, y: 3 }), pp = addPoint(d, on.x, on.y);
  addCon(d, { t: 'PONS', refs: [pp, s] });
  const r = trimAt(d, 'sp', s, { x: 22, y: -1 });
  assert.ok(r.ok && solve(d, []).ok); assert.equal(r.pieces.length, 2); assert.ok(!d.splines[s]);
  const [A, B] = r.pieces.map((i) => d.splines[i]);
  assert.equal(A.pts[0], ids[0]); assert.equal(B.pts[B.pts.length - 1], ids[5]);
  near(d.pts[A.pts[A.pts.length - 1]].x, 14, 1e-6, 'el trozo termina en el corte'); near(d.pts[B.pts[0]].x, 33, 1e-6);
  assert.ok(Object.values(d.cons).some((k) => k.t === 'PONL' && k.refs[0] === A.pts[A.pts.length - 1] && k.refs[1] === l1 && k.hidden));
  assert.ok(Object.values(d.cons).some((k) => k.t === 'PONS' && k.refs[0] === pp && k.refs[1] === r.pieces[1]), 'el punto sobre el spline pasa al 2.o trozo');
  let dev = 0;
  for (const sp of [A, B]) for (const q of splinePolyline(d, sp, 24)) dev = Math.max(dev, closestOnPolyline(orig, q).d);
  assert.ok(dev < 0.05, 'desviacion ' + dev);
  // cerrado: con 2 cruces queda abierto; sin cruces se borra
  const d2 = newDoc();
  const c2 = [[10, 0], [7, 7], [0, 10], [-7, 7], [-10, 0], [-7, -7], [0, -10], [7, -7]].map(([x, y]) => addPoint(d2, x, y));
  const s2 = addSpline(d2, c2, ST, true);
  const d3 = JSON.parse(JSON.stringify(d2));
  addLine(d2, addPoint(d2, -20, 3), addPoint(d2, 20, 3), ST);
  const r2 = trimAt(d2, 'sp', s2, { x: 0, y: 10 });
  assert.ok(r2.ok && solve(d2, []).ok);
  const rest = d2.splines[r2.pieces[0]];
  assert.ok(!rest.closed); near(Math.max(...splinePolyline(d2, rest, 24).map((q) => q.y)), 3, 1e-3, 'se quito la parte de arriba');
  assert.ok(trimAt(d3, 'sp', s2, { x: 0, y: 10 }).deleted);
});

t('recortar spline: conserva el numero de puntos y los reparte a distancias iguales sobre lo que queda', () => {
  const mk = () => {
    const d = newDoc();
    const ids = Array.from({ length: 16 }, (_, i) => { const a = (i * Math.PI) / 30; return addPoint(d, 100 * Math.cos(a), 100 * Math.sin(a)); });
    const s = addSpline(d, ids, ST, false);
    const orig = splinePolyline(d, d.splines[s], 24).map((q) => ({ ...q }));
    addLine(d, addPoint(d, -10, 60), addPoint(d, 110, 60), ST);
    return { d, ids, s, orig };
  };
  const { d, ids, s, orig } = mk();
  const r = trimAt(d, 'sp', s, { x: 50, y: 86 });
  assert.ok(r.ok); const sp = d.splines[r.pieces[0]];
  assert.equal(sp.pts.length, 16, 'los mismos 16 puntos');
  assert.equal(sp.pts[0], ids[0]); near(d.pts[sp.pts[15]].y, 60, 1e-6, 'termina en el corte');
  assert.ok(ids.filter((i) => sp.pts.includes(i)).length >= 6, 'reutiliza los puntos que quedaban');
  const P = sp.pts.map((p) => d.pts[p]), g = P.slice(1).map((q, i) => Math.hypot(q.x - P[i].x, q.y - P[i].y));
  assert.ok(Math.max(...g) / Math.min(...g) < 1.02, 'pasos parejos: ' + Math.min(...g) + ' a ' + Math.max(...g));
  let dev = 0; for (const q of splinePolyline(d, sp, 24)) dev = Math.max(dev, closestOnPolyline(orig, q).d);
  assert.ok(dev < 0.05, 'desviacion ' + dev);
  // un punto sujeto (fijo) no se mueve: ese trozo conserva sus puntos y agrega pocos junto al corte
  const b = mk(); b.d.pts[b.ids[3]].fixed = true;
  const rb = trimAt(b.d, 'sp', b.s, { x: 50, y: 86 }), sb = b.d.splines[rb.pieces[0]];
  assert.ok(sb.pts.includes(b.ids[3])); near(b.d.pts[b.ids[3]].x, 100 * Math.cos((3 * Math.PI) / 30), 1e-12);
  const kb = b.ids.filter((i) => sb.pts.includes(i)).length;
  assert.ok(kb >= 6 && sb.pts.length <= kb + 8, `${sb.pts.length} puntos, ${kb} originales`);
});

t('trazado a spline: el spline llega al extremo de la trayectoria aunque el punto retroceda despues', () => {
  const d = newDoc(), p = addPoint(d, 0, 0);
  startTrace(d, p);
  const go = (x) => { d.pts[p].x = x; d.pts[p].y = (x * x) / 40; recordTraces(d, 0.3); };
  for (let x = 0.25; x <= 20; x += 0.25) go(x);
  for (let x = 19.75; x >= 15; x -= 0.25) go(x); // llega al extremo y retrocede por el mismo camino
  const U = unfoldPath(d.traces[p].pts);
  assert.ok(U.length < d.traces[p].pts.length);
  const sp = d.splines[traceToSpline(d, p, 12)], e = d.pts[sp.pts[sp.pts.length - 1]];
  assert.ok(Math.hypot(e.x - 20, e.y - 10) < 0.31, `termina en (${e.x}, ${e.y})`);
  near(d.pts[sp.pts[0]].x, 0, 1e-9);
  // sin retroceso la trayectoria no cambia
  const P = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 1 }, { x: 3, y: 3 }];
  assert.equal(unfoldPath(P), P);
});

t('recortar spline: con un punto sujeto conserva los que quedan y agrega pocos junto al corte', () => {
  const d = newDoc();
  const ids = Array.from({ length: 16 }, (_, i) => { const a = (i * Math.PI) / 30; return addPoint(d, 100 * Math.cos(a), 100 * Math.sin(a)); });
  const s = addSpline(d, ids, ST, false);
  const orig = splinePolyline(d, d.splines[s], 24).map((q) => ({ ...q }));
  addLine(d, addPoint(d, -10, 60), addPoint(d, 110, 60), ST);
  d.pts[ids[2]].fixed = true;
  const r = trimAt(d, 'sp', s, { x: 50, y: 86 });
  assert.ok(r.ok); const sp = d.splines[r.pieces[0]];
  const kept = ids.filter((i) => sp.pts.includes(i)).length;
  assert.ok(kept >= 6 && sp.pts.length <= kept + 8, `${sp.pts.length} puntos, ${kept} originales`);
  let dev = 0; for (const q of splinePolyline(d, sp, 24)) dev = Math.max(dev, closestOnPolyline(orig, q).d);
  assert.ok(dev < 0.1, 'desviacion ' + dev);
});

t('copias vinculadas: cientos de puntos copiados no agotan el solver y siguen a su fuente (giro y reflejo)', () => {
  const d = newDoc();
  const C = addPoint(d, 0, 0, false); d.pts[C].fixed = true;
  const A = addPoint(d, 10, 0, false);
  addCon(d, { t: 'DIST', refs: [C, A], v: 10, hidden: true });
  const copies = [];
  for (let k = 1; k <= 320; k++) { // 320 copias: con 2 restricciones e incognitas cada una superaba la memoria del solver
    const a = (k * 1.1 * Math.PI) / 180, q = addPoint(d, 10 * Math.cos(a), 10 * Math.sin(a), false);
    addCon(d, { t: 'EQD', refs: [C, A, C, q], hidden: true }); addCon(d, { t: 'ANG4', refs: [C, A, C, q], v: k * 1.1, hidden: true });
    copies.push(q);
  }
  const ax = addLine(d, addPoint(d, 0, -5, false), addPoint(d, 0, 20, false), {}); d.pts[d.lines[ax].a].fixed = true; d.pts[d.lines[ax].b].fixed = true;
  const M = addPoint(d, -10, 0, false); // reflejo de A respecto al eje vertical
  addCon(d, { t: 'SYM', refs: [A, M, ax], hidden: true });
  assert.ok(solve(d, []).ok);
  const r = solveSteps(d, [{ id: A, x: 0, y: 10 }]); // se arrastra la fuente: A pasa a 90°
  assert.ok(r.ok);
  near(d.pts[A].x, 0, 1e-4); near(d.pts[A].y, 10, 1e-4);
  copies.forEach((q, i) => { const a = Math.PI / 2 + ((i + 1) * 1.1 * Math.PI) / 180; near(d.pts[q].x, 10 * Math.cos(a), 1e-4); near(d.pts[q].y, 10 * Math.sin(a), 1e-4); });
  near(d.pts[M].x, 0, 1e-4); near(d.pts[M].y, 10, 1e-4, 'el reflejo de un punto sobre el eje es el mismo punto');
  // arrastrar una copia arrastra la fuente (como hacian las restricciones)
  const q = copies[9], rot = (10 * 1.1 * Math.PI) / 180;
  assert.ok(solveSteps(d, [{ id: q, x: 10 * Math.cos(rot + 0.2), y: 10 * Math.sin(rot + 0.2) }]).ok);
  near(Math.atan2(d.pts[A].y, d.pts[A].x), 0.2, 1e-3);
  // una copia con otra restriccion propia no es seguidora: la respeta
  const E = addPoint(d, 3, 0, false), F2 = addPoint(d, 3, 1, false);
  addCon(d, { t: 'DIST', refs: [C, E], v: 3, hidden: true });
  addCon(d, { t: 'EQD', refs: [C, E, C, F2], hidden: true }); addCon(d, { t: 'ANG4', refs: [C, E, C, F2], v: 30, hidden: true });
  addCon(d, { t: 'DIST', refs: [F2, A], v: 8, hidden: true });
  assert.ok(solve(d, []).ok);
  near(Math.hypot(d.pts[F2].x - d.pts[A].x, d.pts[F2].y - d.pts[A].y), 8, 1e-4, 'F2 sigue sujeta a su cota');
});

t('redundantes: se detectan, no se confunden con una restriccion distinta y quitarlas no cambia la geometria', () => {
  const d = newDoc();
  const A = addPoint(d, 0, 0, false), B = addPoint(d, 10, 1, false), C = addPoint(d, 5, 5, false);
  d.pts[A].fixed = true;
  const l = addLine(d, A, B, {});
  const h1 = addCon(d, { t: 'H', refs: [l] }), h2 = addCon(d, { t: 'H', refs: [A, B], hidden: true }); // la 2.a repite a la 1.a
  const k = addCon(d, { t: 'DIST', refs: [A, B], v: 10 });
  addCon(d, { t: 'DIST', refs: [A, C], v: 7 });
  assert.ok(solve(d, []).ok);
  const red = redundantCons(d);
  assert.equal(red.length, 1, 'solo una de las dos horizontales: ' + red);
  assert.ok(red[0] === h1 || red[0] === h2);
  assert.ok(!red.includes(k));
  const antes = JSON.stringify(d.pts);
  delete d.cons[red[0]];
  assert.ok(solve(d, []).ok); assert.deepEqual(redundantCons(d), []);
  assert.equal(JSON.stringify(d.pts), antes, 'la geometria no cambia');
});
t('solver: una restriccion entre puntos fijos que ya se cumple se omite sin cambiar nada', () => {
  const d = newDoc();
  const A = addPoint(d, 0, 0, false), B = addPoint(d, 3, 4, false);
  d.pts[A].fixed = true; d.pts[B].fixed = true;
  addCon(d, { t: 'DIST', refs: [A, B], v: 5 });
  assert.ok(solve(d, []).ok);
  assert.deepEqual(redundantCons(d), [], 'no es redundante para el usuario: el solver nunca la vio');
  const antes = JSON.stringify(d.pts);
  assert.ok(solve(d, []).ok); assert.equal(JSON.stringify(d.pts), antes);
});
t('solver: un arco con centro y extremos inmoviles se omite y su radio se actualiza solo', () => {
  const d = newDoc();
  const C = addPoint(d, 0, 0, false), P = addPoint(d, 5, 0, false), Q = addPoint(d, 0, 5, false), X = addPoint(d, 20, 0, false);
  [C, P, Q].forEach((i) => { d.pts[i].fixed = true; });
  const a = addArc(d, C, P, Q, 5, {});
  d.arcs[a].r = 99; // radio desfasado
  assert.ok(solve(d, []).ok);
  near(d.arcs[a].r, 5, 1e-9, 'el radio sale de la geometria');
  const Y = addPoint(d, 21, 0, false); addCon(d, { t: 'DIST', refs: [X, Y], v: 3 });
  assert.ok(solve(d, [{ id: Y, x: 25, y: 2 }]).ok);
});
// dos engranajes de centro fijo: cada uno es un cuerpo rigido (un punto marcador a distancia fija del centro) y una linea centro-marcador
function dosEngranes(ratio, fase = 0.4) {
  const d = newDoc(), r1 = 17, r2 = 34, D = r1 + r2;
  const c1 = addPoint(d, 0, 0, false), c2 = addPoint(d, D, 0, false); d.pts[c1].fixed = true; d.pts[c2].fixed = true;
  const m1 = addPoint(d, r1, 0, false), m2 = addPoint(d, D + r2 * Math.cos(fase), r2 * Math.sin(fase), false);
  const q1 = addPoint(d, 0, r1 / 2, false), q2 = addPoint(d, D, r2 / 2, false); // un segundo punto rigido por engranaje (el cuerpo es una forma, no un punto)
  addCon(d, { t: 'DIST', refs: [c1, m1], v: r1, hidden: true }); addCon(d, { t: 'DIST', refs: [c2, m2], v: r2, hidden: true });
  addCon(d, { t: 'DIST', refs: [c1, q1], v: r1 / 2, hidden: true }); addCon(d, { t: 'DIST', refs: [c2, q2], v: r2 / 2, hidden: true });
  addCon(d, { t: 'DIST', refs: [m1, q1], v: Math.hypot(r1, r1 / 2), hidden: true }); addCon(d, { t: 'DIST', refs: [m2, q2], v: Math.hypot(d.pts[m2].x - d.pts[q2].x, d.pts[m2].y - d.pts[q2].y), hidden: true });
  const l1 = addLine(d, c1, m1, {}), l2 = addLine(d, c2, m2, {});
  const k = addCon(d, makeGear(d, l1, l2, ratio));
  return { d, c1, c2, m1, m2, q1, q2, l1, l2, k, r1, r2, D };
}
t('engranaje: un maestro fijo hace girar al otro con la razon, varias vueltas, y se arrastra cualquiera de los dos', () => {
  const g = dosEngranes(-0.5);
  const { d, c1, c2, m1, m2, k, D } = g;
  assert.ok(solve(d, []).ok);
  const ang = (c, p) => Math.atan2(d.pts[p].y - d.pts[c].y, d.pts[p].x - d.pts[c].x);
  const wrap = (x) => x - 2 * Math.PI * Math.round(x / (2 * Math.PI));
  const a1_0 = ang(c1, m1), a2_0 = ang(c2, m2);
  // arrastrar el marcador del engranaje 1, 3 vueltas, con el raton un poco fuera del circulo
  for (let i = 1; i <= 216; i++) {
    const a = a1_0 + (i * 5 * Math.PI) / 180;
    const r = solve(d, [{ id: m1, x: 19 * Math.cos(a), y: 19 * Math.sin(a) }]);
    assert.ok(r.ok, 'paso ' + i);
    near(wrap(ang(c1, m1) - a), 0, 1e-6); // el marcador sigue el angulo del raton
    near(wrap(ang(c2, m2) - (a2_0 - 0.5 * (a - a1_0))), 0, 1e-6, 'el 2 gira -1/2 del giro del 1 (paso ' + i + ')');
  }
  near(d.cons[k].cur[0] - d.cons[k].a0[0], (216 * 5 * Math.PI) / 180, 1e-6, 'el angulo continuo acumula las 3 vueltas');
  // ahora se arrastra el engranaje 2 (la razon se invierte)
  const b0 = ang(c2, m2), a1b = d.cons[k].cur[0];
  for (let i = 1; i <= 72; i++) {
    const b = b0 + (i * 5 * Math.PI) / 180;
    assert.ok(solve(d, [{ id: m2, x: D + 40 * Math.cos(b), y: 40 * Math.sin(b) }]).ok, 'paso b' + i);
    near(wrap(ang(c2, m2) - b), 0, 1e-6);
    near(d.cons[k].cur[0] - a1b, -2 * (b - b0), 1e-6, 'el 1 gira -2 veces el giro del 2');
  }
});
t('engranaje: sin arrastre conserva la postura y un punto del cuerpo que no es la linea tambien lo arrastra', () => {
  const g = dosEngranes(-0.5);
  const { d, c1, c2, m1, m2, q1 } = g;
  assert.ok(solve(d, []).ok);
  const antes = JSON.stringify(d.pts);
  assert.ok(solve(d, []).ok); assert.equal(JSON.stringify(d.pts), antes, 'ya engranados: no se mueve nada');
  // arrastrar q1 (otro punto del cuerpo 1): su angulo respecto al centro lleva al cuerpo
  const a = Math.atan2(d.pts[q1].y, d.pts[q1].x) + 0.5;
  assert.ok(solve(d, [{ id: q1, x: 3 * Math.cos(a), y: 3 * Math.sin(a) }]).ok);
  near(Math.atan2(d.pts[q1].y, d.pts[q1].x), a, 1e-6);
  const girado1 = Math.atan2(d.pts[m1].y, d.pts[m1].x) - 0;
  assert.ok(Math.abs(girado1 - 0.5) < 1e-6, 'm1 giro 0.5 con q1');
  near(Math.atan2(d.pts[m2].y, d.pts[m2].x - g.D), 0.4 - 0.25, 1e-6, 'el 2 giro -0.25');
});
t('engranaje: un tren A-B, B-C, C-D con constantes en vueltas distintas no desfasa la rueda de salida', () => {
  // cuatro ruedas de centro fijo en fila (A y D fijas por su centro, B y C solidarias por la linea de B a C); cada rueda se representa
  // por una linea radial. Las constantes a0 de B estan en vueltas distintas en cada relacion (180 y -180), como en un archivo real.
  const d = newDoc();
  const mk = (cx, r, a) => { const c = addPoint(d, cx, 0, false); d.pts[c].fixed = true; const m = addPoint(d, cx + r * Math.cos(a), r * Math.sin(a), false); addCon(d, { t: 'DIST', refs: [c, m], v: r, hidden: true }); return { c, m, l: addLine(d, c, m, {}) }; };
  const A = mk(0, 10, 0), B = mk(30, 20, Math.PI), C = mk(30 + 1e-9, 10, 0), D = mk(60, 20, Math.PI); // D esta a 180 grados: con las constantes en ramas distintas la formula absoluta la mandaba a 0
  addCon(d, { t: 'GEAR', refs: [A.l, B.l], ratio: -0.5, a0: [0, Math.PI], cur: [0, Math.PI] });
  addCon(d, { t: 'GEAR', refs: [B.l, C.l], ratio: 1, a0: [-Math.PI, 0], cur: [-Math.PI, 0] });
  addCon(d, { t: 'GEAR', refs: [C.l, D.l], ratio: -0.5, a0: [0, Math.PI], cur: [0, Math.PI] });
  const dir = (g) => (Math.atan2(d.pts[g.m].y - d.pts[g.c].y, d.pts[g.m].x - d.pts[g.c].x) * 180) / Math.PI;
  const wrapD = (x) => x - 360 * Math.round(x / 360);
  assert.ok(solve(d, []).ok);
  near(wrapD(dir(D) - 180), 0, 1e-6, 'en reposo nada se mueve (la postura actual es la referencia)');
  for (let grados = 5; grados <= 400; grados += 5) { // el arrastre avanza en pasos cortos (un salto de mas de 180 grados es ambiguo)
    const ang = (grados * Math.PI) / 180;
    assert.ok(solve(d, [{ id: A.m, x: 12 * Math.cos(ang), y: 12 * Math.sin(ang) }]).ok, 'A a ' + grados);
    if (grados % 40 !== 0 && grados !== 400) continue;
    near(wrapD(dir(A) - grados), 0, 1e-6);
    near(wrapD(dir(B) - (180 - 0.5 * grados)), 0, 1e-6, 'B a ' + grados);
    near(wrapD(dir(C) - (-0.5 * grados)), 0, 1e-6, 'C a ' + grados);
    near(wrapD(dir(D) - (180 + 0.25 * grados)), 0, 1e-6, 'D a ' + grados);
  }
});

t('rueda y cremallera: una rueda que rueda sin deslizar por el suelo; arrastrar la rueda la hace girar lo que avanza', () => {
  const d = newDoc(), r = 10;
  const g1 = addPoint(d, -200, 0, false), g2 = addPoint(d, 200, 0, false); d.pts[g1].fixed = true; d.pts[g2].fixed = true;
  const ground = addLine(d, g1, g2, {});
  const f = addPoint(d, 0, r, false); d.pts[f].fixed = true;
  const q = addPoint(d, 0, r, false), m = addPoint(d, 0, 2 * r, false); // centro de la rueda y un punto de su borde (arriba)
  addCon(d, { t: 'H', refs: [q, f], hidden: true }); addCon(d, { t: 'DIST', refs: [q, m], v: r, hidden: true });
  const wheel = addLine(d, q, m, {});
  const k = addCon(d, makeRack(d, wheel, q, ground, -r)); // avanza hacia +x girando en sentido horario
  assert.ok(solve(d, []).ok);
  const th0 = Math.atan2(d.pts[m].y - d.pts[q].y, d.pts[m].x - d.pts[q].x);
  let mx = d.pts[m].x, my = d.pts[m].y;
  for (let i = 1; i <= 30; i++) { // el raton arrastra el punto del borde hacia +x, 2 unidades por paso (60 en total: casi 6 radios)
    assert.ok(solve(d, [{ id: m, x: mx + 2, y: my }]).ok, 'paso ' + i);
    mx = d.pts[m].x; my = d.pts[m].y;
  }
  near(d.pts[q].x, 60, 1e-6, 'el centro avanzo lo que el raton');
  near(d.pts[q].y, r, 1e-6, 'sigue sobre el suelo');
  const th = Math.atan2(d.pts[m].y - d.pts[q].y, d.pts[m].x - d.pts[q].x);
  const giro = th - th0 + 2 * Math.PI * Math.round((-60 / r - (th - th0)) / (2 * Math.PI));
  near(giro, -60 / r, 1e-6, 'gira -avance/radio (sin deslizar: el punto de contacto no se mueve)');
  assert.equal(d.cons[k].t, 'RACK');
});
t('rueda y cremallera: un piñon de centro fijo mueve la cremallera y la cremallera mueve al piñon', () => {
  const d = newDoc(), r = 10;
  const c = addPoint(d, 0, 0, false); d.pts[c].fixed = true;
  const m = addPoint(d, r, 0, false); addCon(d, { t: 'DIST', refs: [c, m], v: r, hidden: true });
  const pinion = addLine(d, c, m, {});
  const r1 = addPoint(d, -100, -r, false), r2 = addPoint(d, 100, -r, false); d.pts[r1].fixed = true; d.pts[r2].fixed = true;
  const rack = addLine(d, r1, r2, {});
  const q = addPoint(d, 0, -r, false); addCon(d, { t: 'PONL', refs: [q, rack], hidden: true });
  addCon(d, makeRack(d, pinion, q, rack, r)); // cremallera debajo: el piñon antihorario la mueve hacia +x
  assert.ok(solve(d, []).ok);
  // se gira el piñon 90 grados en pasos de 5: la cremallera avanza r * pi/2
  for (let i = 1; i <= 18; i++) { const a = (i * 5 * Math.PI) / 180; assert.ok(solve(d, [{ id: m, x: r * 1.2 * Math.cos(a), y: r * 1.2 * Math.sin(a) }]).ok); }
  near(d.pts[q].x, (r * Math.PI) / 2, 1e-6, 'la cremallera avanza r*theta');
  near(Math.atan2(d.pts[m].y, d.pts[m].x), Math.PI / 2, 1e-6);
  // ahora se arrastra la cremallera 10 unidades hacia -x: el piñon gira -1 rad
  const q0 = d.pts[q].x, a0 = Math.atan2(d.pts[m].y, d.pts[m].x);
  for (let i = 1; i <= 5; i++) assert.ok(solve(d, [{ id: q, x: d.pts[q].x - 2, y: -r }]).ok);
  near(d.pts[q].x, q0 - 10, 1e-6);
  near(Math.atan2(d.pts[m].y, d.pts[m].x) - a0, -1, 1e-6, 'el piñon gira -avance/r');
});
t('rueda y cremallera: el punto que avanza debe ser el centro de la rueda o un punto de la cremallera (no uno del borde)', () => {
  // el dibujo del usuario: suelo horizontal, rueda de radio 10 tangente a el, marcador en el borde
  const d = newDoc();
  const g1 = addPoint(d, -150, -4, false), g2 = addPoint(d, -60, -4, false); d.pts[g1].fixed = true; d.pts[g2].fixed = true;
  const ground = addLine(d, g1, g2, {});
  const c = addPoint(d, -140, 6, false), m = addPoint(d, -130.2, 8.1, false); // m a distancia 10 del centro
  const wheel = addLine(d, c, m, {});
  // el marcador (borde) no vale; el centro si
  const r1 = checkRack(d, wheel, m, ground, -10);
  assert.ok(r1.ok && r1.q === c && r1.changed, 'el borde se cambia por el centro (el otro extremo de la linea de la rueda)');
  assert.ok(checkRack(d, wheel, c, ground, -10).ok && !checkRack(d, wheel, c, ground, -10).changed, 'el centro vale tal cual');
  const rackPt = addPoint(d, -100, -4, false);
  assert.ok(checkRack(d, wheel, rackPt, ground, 10).ok, 'un punto de la cremallera vale');
  const lejos = addPoint(d, -100, 30, false);
  const r2 = checkRack(d, wheel, lejos, ground, -10);
  assert.ok(!r2.ok && Math.abs(r2.dist - 34) < 1e-9, 'un punto cualquiera no vale y se informa su distancia');
  addCon(d, makeRack(d, wheel, c, ground, -10)); // con el centro, funciona
  assert.ok(solve(d, [{ id: c, x: -135, y: 6 }]).ok);
  near(d.pts[c].x, -135, 1e-6);
});

t('relacion finita: un punto sobre un segmento solo esta ligado dentro de los extremos del segmento', () => {
  const mk = (finite) => {
    const d = newDoc();
    const A = addPoint(d, 0, 0, false), B = addPoint(d, 10, 0, false); d.pts[A].fixed = true; d.pts[B].fixed = true;
    const l = addLine(d, A, B, {}), P = addPoint(d, 5, 0, false);
    const k = addCon(d, { t: 'PONL', refs: [P, l], ...(finite ? { finite: true } : {}) });
    return { d, P, k };
  };
  // por defecto la linea es infinita: P se queda sobre ella aunque pase del extremo
  const a = mk(false);
  assert.ok(solve(a.d, [{ id: a.P, x: 15, y: 3 }]).ok);
  near(a.d.pts[a.P].y, 0, 1e-6); near(a.d.pts[a.P].x, 15, 1e-3);
  // finita: dentro del segmento esta ligado; fuera, libre
  const b = mk(true);
  assert.ok(solve(b.d, [{ id: b.P, x: 5, y: 3 }]).ok);
  near(b.d.pts[b.P].y, 0, 1e-6, 'dentro del segmento sigue sobre la linea');
  assert.ok(solve(b.d, [{ id: b.P, x: 15, y: 3 }]).ok);
  near(b.d.pts[b.P].x, 15, 1e-3); near(b.d.pts[b.P].y, 3, 1e-3, 'pasado el extremo queda libre');
  assert.ok(finiteInactive(b.d).has(b.k));
  // libre y lejos del segmento: aunque se proyecte dentro de el no esta en contacto, asi que no vale (no sigue al punto una ranura lejana)
  for (let x = 14; x >= 5; x--) assert.ok(solve(b.d, [{ id: b.P, x, y: 3 }]).ok, 'paso ' + x); // pasos de 1: a 3 del segmento nunca se toca
  near(b.d.pts[b.P].x, 5, 1e-2); near(b.d.pts[b.P].y, 3, 1e-2, 'a 3 del segmento no esta en contacto: sigue libre');
  assert.ok(finiteInactive(b.d).has(b.k));
  // al atravesar el segmento se captura: queda sobre la linea
  assert.ok(solve(b.d, [{ id: b.P, x: 5, y: -2 }]).ok);
  near(b.d.pts[b.P].y, 0, 1e-6, 'al atravesar el segmento se liga'); near(b.d.pts[b.P].x, 5, 1e-2);
  assert.ok(!finiteInactive(b.d).has(b.k));
});
t('relacion finita: tangencia circulo-segmento y punto sobre arco solo valen dentro de sus limites', () => {
  // tangencia con un segmento: el centro Q solo esta a r de la recta mientras el pie de la perpendicular cae en el segmento
  const d = newDoc();
  const A = addPoint(d, 0, 0, false), B = addPoint(d, 10, 0, false); d.pts[A].fixed = true; d.pts[B].fixed = true;
  const l = addLine(d, A, B, {}), Q = addPoint(d, 5, 4, false), c = addCircle(d, Q, 4, {});
  addCon(d, { t: 'RAD', refs: [c], v: 4, hidden: true }); addCon(d, { t: 'TANLC', refs: [l, c], finite: true });
  assert.ok(solve(d, [{ id: Q, x: 5, y: 6 }]).ok);
  near(d.pts[Q].y, 4, 1e-4, 'sobre el segmento: tangente, el centro se queda a r');
  assert.ok(solve(d, [{ id: Q, x: 15, y: 6 }]).ok);
  near(d.pts[Q].x, 15, 1e-3); near(d.pts[Q].y, 6, 1e-3, 'pasado el extremo: sin tangencia, libre');
  // punto sobre un arco de 90 grados: solo dentro del barrido
  const e = newDoc();
  const O = addPoint(e, 0, 0, false), S = addPoint(e, 10, 0, false), E = addPoint(e, 0, 10, false); e.pts[O].fixed = true; // (con el arco entero fijo, planegcs reporta conflicto en su regla: no es de esta prueba)
  const arc = addArc(e, O, S, E, 10, {}), P = addPoint(e, 7, 7, false);
  addCon(e, { t: 'RAD', refs: [arc], v: 10, hidden: true }); addCon(e, { t: 'PONC', refs: [P, arc], finite: true });
  assert.ok(solve(e, [{ id: P, x: 9, y: 9 }]).ok);
  near(Math.hypot(e.pts[P].x, e.pts[P].y), 10, 1e-6, 'dentro del barrido: sobre el arco');
  assert.ok(solve(e, [{ id: P, x: -8, y: -8 }]).ok);
  near(e.pts[P].x, -8, 1e-2); near(e.pts[P].y, -8, 1e-2, 'fuera del barrido: libre');
});
t('relacion finita con tope en bordes: el elemento se detiene en el borde en vez de quedar libre, y puede volver', () => {
  // punto sobre un segmento: se detiene en el extremo
  const d = newDoc();
  const A = addPoint(d, 0, 0, false), B = addPoint(d, 10, 0, false); d.pts[A].fixed = true; d.pts[B].fixed = true;
  const l = addLine(d, A, B, {}), P = addPoint(d, 5, 0, false);
  const k = addCon(d, { t: 'PONL', refs: [P, l], finite: true, stop: true });
  assert.ok(solve(d, [{ id: P, x: 15, y: 3 }]).ok);
  near(d.pts[P].x, 10, 1e-3, 'se detiene en el extremo'); near(d.pts[P].y, 0, 1e-3);
  assert.ok(solve(d, [{ id: P, x: 15, y: 3 }]).ok); // insistir no lo saca
  near(d.pts[P].x, 10, 1e-3); near(d.pts[P].y, 0, 1e-3);
  assert.ok(solve(d, [{ id: P, x: 7, y: 3 }]).ok);
  near(d.pts[P].x, 7, 1e-3); near(d.pts[P].y, 0, 1e-3, 'al volver hacia dentro vuelve a seguir la linea');
  assert.ok(solve(d, [{ id: P, x: -4, y: 2 }]).ok);
  near(d.pts[P].x, 0, 1e-3); near(d.pts[P].y, 0, 1e-3, 'y se detiene tambien en el otro extremo');
  // sin tope sigue igual que antes: libre fuera del segmento
  delete d.cons[k].stop;
  assert.ok(solve(d, [{ id: P, x: 6, y: 0 }]).ok);
  assert.ok(solve(d, [{ id: P, x: 15, y: 3 }]).ok);
  near(d.pts[P].x, 15, 1e-3); near(d.pts[P].y, 3, 1e-3);
  // tangencia circulo-segmento: el extremo del segmento se apoya en el circulo
  const e = newDoc();
  const A2 = addPoint(e, 0, 0, false), B2 = addPoint(e, 10, 0, false); e.pts[A2].fixed = true; e.pts[B2].fixed = true;
  const l2 = addLine(e, A2, B2, {}), Q = addPoint(e, 5, 4, false), c = addCircle(e, Q, 4, {});
  addCon(e, { t: 'RAD', refs: [c], v: 4, hidden: true }); addCon(e, { t: 'TANLC', refs: [l2, c], finite: true, stop: true });
  assert.ok(solve(e, [{ id: Q, x: 15, y: 6 }]).ok);
  near(Math.hypot(e.pts[Q].x - 10, e.pts[Q].y), 4, 1e-3, 'el extremo del segmento toca el circulo');
  assert.ok(e.pts[Q].x < 15 - 1, 'el circulo no llego al destino');
  // punto sobre un arco: se detiene en el extremo del arco
  const f = newDoc();
  const O = addPoint(f, 0, 0, false), S = addPoint(f, 10, 0, false), E = addPoint(f, 0, 10, false); f.pts[O].fixed = true;
  const arc = addArc(f, O, S, E, 10, {}), P2 = addPoint(f, 7, 7, false);
  addCon(f, { t: 'RAD', refs: [arc], v: 10, hidden: true }); addCon(f, { t: 'PONC', refs: [P2, arc], finite: true, stop: true });
  assert.ok(solve(f, [{ id: P2, x: 9, y: 9 }]).ok); // primero se liga al arco
  assert.ok(solve(f, [{ id: P2, x: -3, y: -9 }]).ok);
  near(f.pts[P2].x, f.pts[S].x, 1e-2); near(f.pts[P2].y, f.pts[S].y, 1e-2, 'queda en el extremo del arco mas cercano');
});
t('tope en bordes: si el tope no cabe con las demas restricciones la resolucion falla y el dibujo queda como estaba (no fuera del limite)', () => {
  const d = newDoc();
  const A = addPoint(d, 0, 0, false), B = addPoint(d, 10, 0, false), Qp = addPoint(d, 5, 5, false);
  for (const p of [A, B, Qp]) d.pts[p].fixed = true;
  const l = addLine(d, A, B, {}), P = addPoint(d, 8, 0, false);
  addCon(d, { t: 'PONL', refs: [P, l], finite: true, stop: true });
  const dist = addCon(d, { t: 'DIST', refs: [Qp, P], v: Math.hypot(3, 5) });
  assert.ok(solve(d, []).ok);
  near(d.pts[P].x, 8, 1e-4);
  d.cons[dist].v = 9; // pediria P en x ~ 12,5, mas alla del extremo
  assert.ok(!solve(d, []).ok, 'con el tope la distancia 9 no cabe');
  near(d.pts[P].x, 8, 1e-4, 'P no queda fuera del segmento'); near(d.pts[P].y, 0, 1e-6);
});
t('tope en bordes al arrastrar: lo que empuja con una distancia dura lleva el punto hasta el extremo, no se queda antes', () => {
  const mk = () => {
    const d = newDoc();
    const A = addPoint(d, 0, 0, false), B = addPoint(d, 10, 0, false), R1 = addPoint(d, -20, 5, false), R2 = addPoint(d, 40, 5, false);
    for (const p of [A, B, R1, R2]) d.pts[p].fixed = true;
    const l = addLine(d, A, B, {}), rail = addLine(d, R1, R2, {}), P = addPoint(d, 5, 0, false), Q = addPoint(d, 8, 5, false);
    addCon(d, { t: 'PONL', refs: [P, l], finite: true, stop: true }); addCon(d, { t: 'PONL', refs: [Q, rail] });
    addCon(d, { t: 'DIST', refs: [Q, P], v: Math.hypot(3, 5) });
    assert.ok(solve(d, []).ok);
    return { d, P, Q };
  };
  for (const exact of [true, false]) { // exact: el tope engranado se resuelve directo; si no, por biseccion del paso
    const { d, P, Q } = mk();
    for (const x of [10, 12, 16, 22]) dragToStops(d, [{ id: Q, x, y: 5 }], (tg) => solveSteps(d, tg), exact); // Q solo puede llegar a x = 13
    near(d.pts[P].x, 10, 2e-3, 'P llega al extremo (exact=' + exact + ')'); near(d.pts[P].y, 0, 1e-6);
    near(d.pts[Q].x, 13, 2e-3, 'y Q hasta donde el tope lo deja');
    for (const x of [12.5, 12, 11.5, 11, 10.5, 10, 9.5, 9]) assert.ok(dragToStops(d, [{ id: Q, x, y: 5 }], (tg) => solveSteps(d, tg), exact).ok, 'vuelta ' + x); // pasos cortos: de un salto la distancia admite la otra rama
    near(d.pts[Q].x, 9, 1e-3, 'de vuelta se mueve libre'); near(d.pts[P].x, 6, 1e-3);
  }
});
t('solo lo conectado al arrastre: con muchas relaciones sin relacion con el mecanismo el resultado es el mismo y lo demas no se toca', () => {
  const mk = () => {
    const d = newDoc();
    const c = addPoint(d, 0, 0, false); d.pts[c].fixed = true;
    const m = addPoint(d, 10, 0, false), n = addPoint(d, 20, 0, false);
    addCon(d, { t: 'DIST', refs: [c, m], v: 10 }); addCon(d, { t: 'DIST', refs: [m, n], v: 10 });
    const ajenas = [];
    for (let i = 0; i < 40; i++) { // tangencias y distancias lejanas, sin ninguna conexion con la manivela
      const a = addPoint(d, 100 + i * 7, 50, false), b = addPoint(d, 100 + i * 7, 70, false); d.pts[a].fixed = true; d.pts[b].fixed = true;
      const l = addLine(d, a, b, {}), q = addPoint(d, 104 + i * 7, 60, false), ci = addCircle(d, q, 4, {});
      addCon(d, { t: 'TANLC', refs: [l, ci] }); addCon(d, { t: 'DIST', refs: [a, q], v: Math.hypot(4, 10) });
      ajenas.push(q);
    }
    return { d, m, n, ajenas };
  };
  const a = mk(), b = mk();
  assert.ok(solve(a.d, []).ok && solve(b.d, []).ok);
  const antes = JSON.stringify(a.ajenas.map((q) => a.d.pts[q]));
  beginSession(a.d, true);
  for (let i = 1; i <= 24; i++) { // a: con sesion (solo se resuelve la manivela); b: todo el dibujo
    const ang = (i * 7 * Math.PI) / 180, T = [{ id: a.m, x: 14 * Math.cos(ang), y: 14 * Math.sin(ang) }], T2 = [{ id: b.m, x: 14 * Math.cos(ang), y: 14 * Math.sin(ang) }];
    assert.ok(solve(a.d, T).ok && solve(b.d, T2).ok);
  }
  endSession();
  for (const id of [a.m, a.n]) { near(a.d.pts[id].x, b.d.pts[id === a.m ? b.m : b.n].x, 1e-4); near(a.d.pts[id].y, b.d.pts[id === a.m ? b.m : b.n].y, 1e-4); } // (el sistema chico y el grande convergen con diferencias de ~1e-5)
  assert.equal(JSON.stringify(a.ajenas.map((q) => a.d.pts[q])), antes, 'las partes sin relacion no se tocan');
  // una parte conectada si se resuelve: la manivela es un cuerpo con dos puntos
  assert.ok(Math.hypot(a.d.pts[a.m].x, a.d.pts[a.m].y) > 9.99 && Math.hypot(a.d.pts[a.m].x - a.d.pts[a.n].x, a.d.pts[a.m].y - a.d.pts[a.n].y) > 9.99);
});

t('cruz de malta: 4 ranuras como relaciones finitas, el impulsor da vueltas y la cruz avanza 90 grados por vuelta sin fallar', () => {
  const n = 4, D = 25, a = D * Math.sin(Math.PI / n), Rw = Math.sqrt(D * D - a * a), r0 = D - a; // geometria ideal: a/d = sen(pi/n)
  const d = newDoc();
  const c1 = addPoint(d, 0, 0, false), c2 = addPoint(d, D, 0, false); d.pts[c1].fixed = true; d.pts[c2].fixed = true;
  const pin = addPoint(d, a, 0, false); addCon(d, { t: 'DIST', refs: [c1, pin], v: a });
  const ends = [];
  for (let k = 0; k < n; k++) { // ranuras como segmentos radiales de la cruz, de r0 (fondo) a Rw (boca); una apunta al impulsor
    const ang = Math.PI + (k * 2 * Math.PI) / n;
    ends.push([addPoint(d, D + r0 * Math.cos(ang), r0 * Math.sin(ang), false), addPoint(d, D + Rw * Math.cos(ang), Rw * Math.sin(ang), false)]);
  }
  ends.forEach(([p, q], k) => { // cuerpo rigido: cada extremo a su radio y las ranuras a 90 grados entre si
    addCon(d, { t: 'DIST', refs: [c2, p], v: r0, hidden: true }); addCon(d, { t: 'DIST', refs: [c2, q], v: Rw, hidden: true });
    addCon(d, { t: 'ANG4', refs: [c2, p, c2, q], v: 0, hidden: true });
    if (k > 0) addCon(d, { t: 'ANG4', refs: [c2, ends[0][1], c2, q], v: (k * 360) / n, hidden: true });
    addCon(d, { t: 'PONL', refs: [pin, addLine(d, p, q, {})], finite: true }); // el perno solo esta ligado a la ranura que toca
  });
  assert.ok(solve(d, []).ok);
  const wheel = () => (Math.atan2(d.pts[ends[0][1]].y - d.pts[c2].y, d.pts[ends[0][1]].x - d.pts[c2].x) * 180) / Math.PI;
  let prev = wheel(), acc = 0, fails = 0;
  beginSession(d);
  for (let i = 1; i <= 360; i++) { // 2 vueltas del impulsor, de 2 grados en 2 grados
    const t = (i * 2 * Math.PI) / 180, R = a + 0.2;
    if (!solve(d, [{ id: pin, x: R * Math.cos(t), y: R * Math.sin(t) }]).ok) fails++;
    const w = wheel(); acc += ((w - prev + 540) % 360) - 180; prev = w;
    if (i === 180) near(acc, -90, 0.5, 'tras 1 vuelta la cruz avanzo una ranura');
  }
  endSession();
  assert.equal(fails, 0);
  near(acc, -180, 0.5, 'tras 2 vueltas, dos ranuras (en sentido contrario al impulsor)');
});

t('arrastre con alcance: un punto libre sin restricciones (el ancla de un texto) se mueve', () => {
  const d = newDoc();
  const c = addPoint(d, 0, 0, false); d.pts[c].fixed = true;
  const m = addPoint(d, 10, 0, false); addCon(d, { t: 'DIST', refs: [c, m], v: 10 });
  const libre = addPoint(d, -20, 5, false); // sin ninguna restriccion
  assert.ok(solve(d, []).ok);
  beginSession(d, true);
  for (let i = 1; i <= 5; i++) assert.ok(solve(d, [{ id: libre, x: -20 + 2 * i, y: 5 + i }]).ok);
  endSession();
  near(d.pts[libre].x, -10, 1e-2); near(d.pts[libre].y, 10, 1e-2, 'el punto libre llego a donde se arrastro');
});
t('indicadores: engranaje (G) y cremallera (Cr) tienen etiqueta numerada, tambien en archivos que ya las tenian', () => {
  const d = newDoc();
  const c1 = addPoint(d, 0, 0, false), m1 = addPoint(d, 10, 0, false), c2 = addPoint(d, 30, 0, false), m2 = addPoint(d, 40, 0, false);
  const l1 = addLine(d, c1, m1, {}), l2 = addLine(d, c2, m2, {});
  const g = addCon(d, makeGear(d, l1, l2, -1)), r = addCon(d, makeRack(d, l1, m1, l2, -10));
  assert.equal(conTag(d.cons[g]), 'G1'); assert.equal(conTag(d.cons[r]), 'Cr1');
  delete d.cons[g].n; delete d.cons[r].n; d.cn = {}; // un archivo guardado antes de tener etiqueta
  ensureNumbers(d);
  assert.equal(conTag(d.cons[g]), 'G1'); assert.equal(conTag(d.cons[r]), 'Cr1');
});

t('yugo escoces: una manivela con su perno en una ranura se resuelve con las restricciones de siempre, vueltas completas', () => {
  const d = newDoc(), r = 10;
  const c = addPoint(d, 0, 0, false); d.pts[c].fixed = true;
  const p = addPoint(d, r, 0, false); addCon(d, { t: 'DIST', refs: [c, p], v: r }); addLine(d, c, p, {});
  const y = addPoint(d, r, 0, false), z = addPoint(d, r, 15, false); // el yugo: Y en el eje x, la ranura vertical de Y a Z
  addCon(d, { t: 'H', refs: [y, c] });
  const slot = addLine(d, y, z, {}); addCon(d, { t: 'V', refs: [slot] }); addCon(d, { t: 'DIST', refs: [y, z], v: 15 });
  addCon(d, { t: 'PONL', refs: [p, slot] });
  assert.ok(solve(d, []).ok);
  for (let i = 1; i <= 144; i++) { // dos vueltas
    const a = (i * 5 * Math.PI) / 180;
    assert.ok(solve(d, [{ id: p, x: 12 * Math.cos(a), y: 12 * Math.sin(a) }]).ok, 'paso ' + i);
    near(d.pts[y].x, d.pts[p].x, 1e-6, 'el yugo sigue al perno (paso ' + i + ')');
    near(d.pts[y].x, r * Math.cos(Math.atan2(d.pts[p].y, d.pts[p].x)), 1e-6);
    near(Math.atan2(d.pts[p].y, d.pts[p].x) - a + 2 * Math.PI * Math.round((a - Math.atan2(d.pts[p].y, d.pts[p].x)) / (2 * Math.PI)), 0, 1e-3, 'el perno sigue al raton');
  }
});

t('engranaje: conserva sus datos al copiar el archivo y se borra con sus lineas', () => {
  const g = dosEngranes(-1);
  const copia = JSON.parse(JSON.stringify(g.d));
  assert.equal(copia.cons[g.k].t, 'GEAR'); assert.equal(copia.cons[g.k].ratio, -1);
  delete g.d.lines[g.l1]; cleanup(g.d);
  assert.equal(g.d.cons[g.k], undefined, 'sin una de sus lineas la relacion desaparece');
});

t('sesion de arrastre: el resultado es el mismo con y sin la cache estructural, tambien si cambian los puntos fijos o la estructura', () => {
  const a = dosEngranes(-0.5), b = dosEngranes(-0.5);
  assert.ok(solve(a.d, []).ok && solve(b.d, []).ok);
  beginSession(a.d);
  const mover = (g, i) => { const ang = (i * 3 * Math.PI) / 180; return solve(g.d, [{ id: g.m1, x: 19 * Math.cos(ang), y: 19 * Math.sin(ang) }]); };
  for (let i = 1; i <= 30; i++) { assert.ok(mover(a, i).ok && mover(b, i).ok); }
  for (const id of Object.keys(a.d.pts)) { near(a.d.pts[id].x, b.d.pts[id].x, 1e-9); near(a.d.pts[id].y, b.d.pts[id].y, 1e-9); }
  // cambia un punto fijo en plena sesion: la cache se descarta por su firma
  a.d.pts[a.q1].fixed = true; b.d.pts[b.q1].fixed = true;
  assert.equal(mover(a, 31).ok, mover(b, 31).ok);
  for (const id of Object.keys(a.d.pts)) { near(a.d.pts[id].x, b.d.pts[id].x, 1e-9); near(a.d.pts[id].y, b.d.pts[id].y, 1e-9); }
  // cambia la estructura (otra restriccion): la sesion se descarta sola
  addCon(a.d, { t: 'DIST', refs: [a.c1, a.q2], v: 99, hidden: true }); addCon(b.d, { t: 'DIST', refs: [b.c1, b.q2], v: 99, hidden: true });
  assert.equal(solve(a.d, []).ok, solve(b.d, []).ok);
  endSession();
  assert.ok(solve(a.d, []) !== undefined);
});

t('extender spline: se alarga por la tangente de su extremo hasta el primer elemento, con un solo punto nuevo', () => {
  for (const [at, ln] of [[{ x: 50, y: 6 }, [58, -30, 58, 40]], [{ x: 0, y: 0 }, [-6, -30, -6, 40]]]) {
    const d = newDoc();
    const ids = [[0, 0], [10, 8], [20, 0], [30, -8], [40, 0], [50, 6]].map(([x, y]) => addPoint(d, x, y));
    const s = addSpline(d, ids, ST, false);
    const O = splinePolyline(d, d.splines[s], 96).map((q) => ({ ...q }));
    const atEnd = at.x > 25, E = atEnd ? O[O.length - 1] : O[0], pv = atEnd ? O[O.length - 2] : O[1];
    const L = Math.hypot(E.x - pv.x, E.y - pv.y), dx = (E.x - pv.x) / L, dy = (E.y - pv.y) / L;
    const l = addLine(d, addPoint(d, ln[0], ln[1]), addPoint(d, ln[2], ln[3]), ST);
    addLine(d, addPoint(d, atEnd ? 70 : -20, -30), addPoint(d, atEnd ? 70 : -20, 40), ST); // mas lejos: no llega hasta esta
    const r = extendEnd(d, 'sp', s, at);
    assert.ok(r.ok && solve(d, []).ok);
    const sp = d.splines[s];
    assert.equal(sp.pts.length, 7, 'un punto nuevo');
    const e = d.pts[atEnd ? sp.pts[6] : sp.pts[0]];
    near(e.x, ln[0], 1e-6); // sobre la primera linea
    assert.ok(Math.abs((e.x - E.x) * dy - (e.y - E.y) * dx) < 1e-6, 'el punto nuevo esta sobre la tangente del extremo');
    assert.ok(Object.values(d.cons).some((k) => k.t === 'PONL' && k.refs[0] === (atEnd ? sp.pts[6] : sp.pts[0]) && k.refs[1] === l && k.hidden));
    // la prolongacion sigue la recta tangente
    let off = 0;
    for (const q of splinePolyline(d, sp, 96)) if ((q.x - E.x) * dx + (q.y - E.y) * dy > 0) off = Math.max(off, Math.abs((q.x - E.x) * dy - (q.y - E.y) * dx));
    assert.ok(off < 1e-3, 'fuera de la tangente ' + off);
  }
  // cerrado, con relaciones o sin nada delante: no se extiende
  const d = newDoc(), c = [[10, 0], [0, 10], [-10, 0], [0, -10]].map(([x, y]) => addPoint(d, x, y));
  assert.equal(extendEnd(d, 'sp', addSpline(d, c, ST, true), { x: 10, y: 0 }).ok, false);
  const o = addSpline(d, [[20, 0], [30, 5], [40, 0]].map(([x, y]) => addPoint(d, x, y)), ST, false);
  assert.equal(extendEnd(d, 'sp', o, { x: 40, y: 0 }).ok, false, 'no hay nada en esa direccion');
});

t('extender hasta elipses y splines: la linea y el arco llegan a la curva y quedan sobre ella', () => {
  const d = newDoc(); const { e } = mkEll(d);
  const l = addLine(d, addPoint(d, -30, 2), addPoint(d, -20, 2), ST);
  assert.ok(extendEnd(d, 'ln', l, { x: -20, y: 2 }).ok && solve(d, []).ok);
  near(d.pts[d.lines[l].b].x, -Math.sqrt(100 * (1 - 4 / 25)), 1e-6);
  assert.ok(Object.values(d.cons).some((k) => k.t === 'PONE' && k.hidden && k.refs[0] === d.lines[l].b));
  const n0 = Object.keys(d.pts).length;
  assert.ok(extendEnd(d, 'ln', l, { x: -9, y: 2 }).ok && solve(d, []).ok);
  near(d.pts[d.lines[l].b].x, Math.sqrt(100 * (1 - 4 / 25)), 1e-6, 'la extension sucesiva llega al otro lado');
  assert.equal(Object.keys(d.pts).length, n0, 'sin puntos nuevos');
  const cc = addPoint(d, 0, 12), ar = addArc(d, cc, addPoint(d, 8, 12), addPoint(d, 0, 20), 8, ST);
  assert.ok(extendEnd(d, 'ar', ar, { x: 8, y: 12 }).ok && solve(d, []).ok);
  near(offEll(d, e, d.arcs[ar].a), 0, 1e-6, 'el arco termina sobre la elipse');
  near(Math.hypot(d.pts[d.arcs[ar].a].x, d.pts[d.arcs[ar].a].y - 12), 8, 1e-6);
  // arco eliptico: solo cuenta el tramo que ocupa
  const d2 = newDoc();
  const p1 = addPoint(d2, 0, 5, true), p2 = addPoint(d2, -10, 0, true);
  mkEll(d2, 0, 0, 10, 5, p1, p2);
  const l2 = addLine(d2, addPoint(d2, 30, 2), addPoint(d2, 20, 2), ST);
  assert.ok(extendEnd(d2, 'ln', l2, { x: 20, y: 2 }).ok);
  assert.ok(d2.pts[d2.lines[l2].b].x < 0, 'pasa de largo por el lado que el arco no ocupa');
  // spline
  const d3 = newDoc();
  const s = addSpline(d3, [[0, 0], [10, 8], [20, 0], [30, -8]].map(([x, y]) => addPoint(d3, x, y)), ST, false);
  const l3 = addLine(d3, addPoint(d3, 25, 30), addPoint(d3, 25, 20), ST);
  assert.ok(extendEnd(d3, 'ln', l3, { x: 25, y: 20 }).ok && solve(d3, []).ok);
  const end = d3.pts[d3.lines[l3].b];
  near(end.x, 25, 1e-6); near(closestOnPolyline(splinePolyline(d3, d3.splines[s], 48), end).d, 0, 1e-2);
});

t('coincidente entre dos puntos lejanos con arcos tangentes: se resuelve acercandolos por pasos (caso del iPad)', () => {
  const d = JSON.parse(readFileSync(new URL('./fixtures/arcos-tangentes-coincidente.json', import.meta.url), 'utf8'));
  assert.ok(solve(d, []).ok);
  // directo, de golpe, el solver pierde el hilo aunque el caso tiene solucion
  const directo = JSON.parse(JSON.stringify(d)); addCon(directo, { t: 'COI', refs: ['p3', 'p8'] });
  assert.equal(solve(directo, []).ok, false);
  const r = addConsSolved(d, [{ t: 'COI', refs: ['p3', 'p8'] }]);
  assert.ok(r.ok);
  near(d.pts.p3.x, d.pts.p8.x, 1e-6); near(d.pts.p3.y, d.pts.p8.y, 1e-6);
  assert.ok(Object.values(d.cons).some((k) => k.t === 'COI'));
  assert.ok(solve(d, []).ok);
  // sin solucion: el documento queda como estaba
  const e = JSON.parse(JSON.stringify(d)), n = Object.keys(e.cons).length;
  e.pts.p1.fixed = e.pts.p9.fixed = true;
  const bad = addConsSolved(e, [{ t: 'COI', refs: ['p1', 'p2'] }, { t: 'COI', refs: ['p9', 'p3'] }]);
  assert.equal(bad.ok, false); assert.equal(Object.keys(e.cons).length, n, 'sin restricciones nuevas');
});

// ---- capas
const mkLayerDoc = () => {
  const d = newDoc();
  const l0 = addLine(d, addPoint(d, 0, 0, true), addPoint(d, 10, 0, true), { color: 'auto', ltype: 'continua', w: 2, ls: 1 }); // sin capa
  const A = addLayer(d, 'A'); // queda como capa actual
  const l1 = addLine(d, addPoint(d, 0, 5, true), addPoint(d, 10, 5, true), { color: 'auto', ltype: 'continua', w: 2, ls: 1 });
  const c1 = addCircle(d, addPoint(d, 20, 20, false), 3, { color: 'auto', ltype: 'continua', w: 2, ls: 1 });
  const tx = addText(d, addPoint(d, 1, 1, true), 'hola');
  return { d, l0, l1, c1, tx, A };
};
t('capas: por defecto no hay ninguna y lo nuevo no lleva capa', () => {
  const d = newDoc();
  assert.deepEqual(d.layers, {}); assert.equal(d.curLayer, null);
  const l = addLine(d, addPoint(d, 0, 0, true), addPoint(d, 1, 0, true), { color: 'auto', ltype: 'continua', w: 2, ls: 1 });
  assert.equal(d.lines[l].layer, undefined);
});
t('capas: al crearla queda activa y lo que se dibuja va a ella', () => {
  const { d, l0, l1, c1, tx, A } = mkLayerDoc();
  assert.equal(d.curLayer, A);
  assert.equal(d.lines[l0].layer, undefined); assert.equal(d.lines[l1].layer, A); assert.equal(d.circles[c1].layer, A); assert.equal(d.texts[tx].layer, A);
  assert.equal(layerCount(d, A), 3);
  const B = addLayer(d, 'B'); assert.equal(d.curLayer, B);
});
t('capas: apagar oculta elementos, puntos, restricciones y exportacion', () => {
  const { d, l0, l1, A } = mkLayerDoc();
  addCon(d, { t: 'H', refs: [l1] }); addCon(d, { t: 'H', refs: [l0] });
  d.layers[A].on = false;
  assert.ok(isHidden(d, d.lines[l1])); assert.ok(!isHidden(d, d.lines[l0]));
  assert.deepEqual(shownEntries(d, 'lines').map(([id]) => id), [l0]);
  const hp = layerHiddenPoints(d);
  assert.ok(hp.has(d.lines[l1].a) && hp.has(d.lines[l1].b) && !hp.has(d.lines[l0].a));
  const cons = Object.values(d.cons);
  assert.ok(consHidden(d, cons[0], hp)); assert.ok(!consHidden(d, cons[1], hp));
  const v = visibleDoc(d);
  assert.deepEqual(Object.keys(v.lines), [l0]); assert.equal(Object.keys(v.circles).length, 0); assert.equal(Object.keys(v.texts).length, 0);
  assert.equal(Object.keys(v.cons).length, 1);
  const svg = exportSVG(d);
  assert.ok(svg && !svg.includes('<circle'), 'el circulo oculto no se exporta');
  d.layers[A].on = true;
  assert.equal(visibleDoc(d), d, 'sin capas apagadas es el mismo documento');
});
t('capas: borrar una capa deja sus elementos en ninguna', () => {
  const { d, l1, c1, tx, A } = mkLayerDoc();
  assert.equal(deleteLayer(d, A), 3);
  assert.equal(d.layers[A], undefined); assert.equal(d.curLayer, null);
  assert.equal(d.lines[l1].layer, undefined); assert.equal(d.circles[c1].layer, undefined); assert.equal(d.texts[tx].layer, undefined);
  assert.equal(deleteLayer(d, A), 0);
});
t('capas: recortar y dividir conservan la capa de la linea', () => {
  const d = newDoc(), A = addLayer(d, 'A');
  const a = addPoint(d, 0, 0, true), b = addPoint(d, 10, 0, true), m = addPoint(d, 5, 0, false);
  const l = addLine(d, a, b, { color: 'auto', ltype: 'continua', w: 2, ls: 1 });
  d.curLayer = null;
  const r = splitElement(d, l, [m]);
  assert.ok(r.ok);
  for (const id of r.pieces) assert.equal(d.lines[id].layer, A);
});

t('cotas con nombre: D, A, R, O numeradas por letra y sin repetir', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 10, 0), c = addPoint(d, 0, 10), cc = addPoint(d, 20, 0);
  const l1 = addLine(d, a, b, {}), l2 = addLine(d, a, c, {});
  const ci = addCircle(d, cc, 3, {});
  const k1 = addCon(d, { t: 'DIST', refs: [a, b], v: 10 }), k2 = addCon(d, { t: 'DIST', refs: [a, c], v: 10 });
  const k3 = addCon(d, { t: 'ANG', refs: [l1, l2], v: 90 }), k4 = addCon(d, { t: 'RAD', refs: [ci], v: 3 });
  assert.deepEqual([k1, k2, k3, k4].map((k) => d.cons[k].name), ['D1', 'D2', 'A1', 'O1']);
  addCon(d, { t: 'H', refs: [l1] });
  assert.equal(d.cons[addCon(d, { t: 'DIST', refs: [b, c], v: 14, hidden: true })].name, undefined);
  delete d.cons[k2];
  assert.equal(d.cons[addCon(d, { t: 'DIST', refs: [b, c], v: 14 })].name, 'D3', 'no se reutiliza D2');
  for (const k of Object.values(d.cons)) delete k.name; // dibujo viejo sin nombres
  delete d.cnd;
  nameDims(d);
  assert.equal(d.cons[k1].name, 'D1');
  assert.equal(d.cons[k3].name, 'A1');
});
t('formulas con variables: evalExpr, referencias y renombrado', () => {
  const vars = { D1: { v: 10, r: false }, A1: { v: Math.PI / 6, r: true }, L: { v: 4, r: false } };
  near(parseValue('D1*sin(A1)', { vars }), 5);
  near(parseValue('D1*sin(3π/4)', { vars }), 10 * Math.sin((3 * Math.PI) / 4));
  near(parseValue('2L+D1/2', { vars }), 13);
  near(parseValue('A1', { angle: true, vars }), 30); // un angulo en una cota angular vuelve a grados
  assert.throws(() => parseValue('D9*2', { vars }), /D9/);
  assert.deepEqual(exprRefs('D1*sin(A1)+L2+3π').sort(), ['A1', 'D1', 'L2']);
  assert.equal(renameInExpr('D1*sin(A1)+D10', 'D1', 'Ancho'), 'Ancho*sin(A1)+D10');
});
t('formulas entre cotas: recalculo en cadena, ciclos y referencias', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 10, 0), c = addPoint(d, 0, 6);
  d.pts[a].fixed = true;
  const l1 = addLine(d, a, b, {}), l2 = addLine(d, a, c, {});
  addCon(d, { t: 'H', refs: [l1] }); addCon(d, { t: 'V', refs: [l2] });
  const kA = addCon(d, { t: 'DIST', refs: [a, b], v: 10 });
  const kB = addCon(d, { t: 'DIST', refs: [a, c], v: 6, expr: 'D1/2+1' });
  assert.ok(solve(d, []).ok);
  d.cons[kA].v = 20;
  const r = recompute(d);
  assert.ok(r.ok); near(d.cons[kB].v, 11);
  assert.ok(solve(d, []).ok);
  near(Math.hypot(d.pts[c].x - d.pts[a].x, d.pts[c].y - d.pts[a].y), 11, 1e-4);
  // ciclo
  d.cons[kA].expr = 'D2*2';
  const rc = recompute(d);
  assert.ok(!rc.ok && /círculo/.test(rc.error), rc.error);
  delete d.cons[kA].expr;
  // una cota de referencia tambien sirve de variable (se lee su medida)
  d.cons[kA].ref = true;
  assert.deepEqual(pruneFormulas(d), []);
  assert.equal(d.cons[kB].expr, 'D1/2+1');
  assert.ok('D1' in varsOf(d));
  // valor imposible (negativo) no modifica nada
  d.cons[kA].ref = false; d.cons[kB].expr = 'D1-100';
  const bad = recompute(d);
  assert.ok(!bad.ok); near(d.cons[kB].v, 11);
});
t('cotas de referencia en formulas: se resuelve y recalcula hasta estabilizar', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 10, 0), c = addPoint(d, 0, 6);
  d.pts[a].fixed = true;
  const l1 = addLine(d, a, b, {}), l2 = addLine(d, a, c, {});
  addCon(d, { t: 'H', refs: [l1] }); addCon(d, { t: 'V', refs: [l2] });
  const kIn = addCon(d, { t: 'DIST', refs: [a, b], v: 10 });                 // D1 (conductora)
  const kRef = addCon(d, { t: 'DIST', refs: [a, b], v: 10, ref: true });     // D2 (solo lectura): mide la linea 1
  const kOut = addCon(d, { t: 'DIST', refs: [a, c], v: 6, expr: 'D2*2+1' }); // D3 lee la medida
  assert.equal(d.cons[kRef].name, 'D2');
  assert.ok(hasReactive(d));
  const r1 = settle(d, solve, []);
  assert.ok(r1.ok, r1.error); near(d.cons[kOut].v, 21);
  // cambiar la entrada: la geometria cambia, la medida cambia, la salida la sigue
  d.cons[kIn].v = 30;
  const r2 = settle(d, solve, []);
  assert.ok(r2.ok, r2.error);
  near(d.cons[kOut].v, 61, 1e-4);
  near(Math.hypot(d.pts[c].x - d.pts[a].x, d.pts[c].y - d.pts[a].y), 61, 1e-3);
  // realimentacion que diverge: una cota que se alimenta de su propia medida +1
  const dd = newDoc();
  const p0 = addPoint(dd, 0, 0), p1 = addPoint(dd, 5, 0);
  dd.pts[p0].fixed = true;
  const ll = addLine(dd, p0, p1, {});
  addCon(dd, { t: 'H', refs: [ll] });
  addCon(dd, { t: 'DIST', refs: [p0, p1], v: 5, expr: 'D2+1' });
  addCon(dd, { t: 'DIST', refs: [p0, p1], v: 5, ref: true });
  const bad = settle(dd, solve, [], { maxIter: 15 });
  assert.ok(!bad.ok && /estabiliz/.test(bad.error), JSON.stringify(bad));
});
t('rueda que rueda: la distancia lee el angulo medido y el punto sigue la cicloide al arrastrarlo', () => {
  const R = 10, th0 = 0.6, cyc = (t) => ({ x: R * (t - Math.sin(t)), y: R * (1 - Math.cos(t)) });
  const d = newDoc();
  const O = addPoint(d, 0, 0), G1 = addPoint(d, 120, 0); d.pts[O].fixed = true; d.pts[G1].fixed = true;
  const ground = addLine(d, O, G1, {});
  const T = addPoint(d, R * th0, 0), C = addPoint(d, R * th0, R), P = addPoint(d, R * th0 - R * Math.sin(th0), R - R * Math.cos(th0));
  const wheel = addCircle(d, C, R, {}), lCT = addLine(d, C, T, {}), lCP = addLine(d, C, P, {});
  for (const k of [{ t: 'PONL', refs: [T, ground] }, { t: 'V', refs: [C, T] }, { t: 'RAD', refs: [wheel], v: R }, { t: 'TANLC', refs: [ground, wheel] }, { t: 'PONC', refs: [P, wheel] }]) addCon(d, k);
  const kA = addCon(d, { t: 'ANG', refs: [lCT, lCP], v: (th0 * 180) / Math.PI, ref: true });   // A1: solo lectura, mide el giro
  addCon(d, { t: 'DIST', refs: [O, T], v: R * th0, expr: 'O1/2*A1' });                           // D1 = r * A1 (rueda sin deslizar)
  assert.ok(hasReactive(d));
  assert.ok(settle(d, solve, []).ok);
  for (const th of [0.7, 0.9, 1.1, 1.3, 1.5]) {
    const s = settle(d, solve, [{ id: P, x: d.pts[C].x - R * Math.sin(th), y: d.pts[C].y - R * Math.cos(th) }], { maxIter: 20 });
    assert.ok(s.ok, 'th ' + th + ' ' + s.error);
    const A = (dimValue(d, d.cons[kA]) * Math.PI) / 180, e = cyc(A);
    near(d.pts[T].x, R * A, 1e-3, 'rueda sin deslizar');
    near(d.pts[P].x, e.x, 1e-3, 'P en la cicloide'); near(d.pts[P].y, e.y, 1e-3);
  }
});
t('rueda gobernada por el punto de tangencia: arrastrar T da varias vueltas y P queda en la cicloide', () => {
  const R = 10, x0 = 7.377, cyc = (t) => ({ x: R * (t - Math.sin(t)), y: R * (1 - Math.cos(t)) });
  const d = newDoc();
  const O = addPoint(d, 0, 0), G1 = addPoint(d, 150, 0); d.pts[O].fixed = true; d.pts[G1].fixed = true;
  const ground = addLine(d, O, G1, {});
  const T = addPoint(d, x0, 0), C = addPoint(d, x0, R), q = cyc(x0 / R), P = addPoint(d, q.x, q.y);
  const wheel = addCircle(d, C, R, {}), lCT = addLine(d, C, T, {}), lCP = addLine(d, C, P, {});
  for (const k of [{ t: 'PONL', refs: [T, ground] }, { t: 'V', refs: [C, T] }, { t: 'RAD', refs: [wheel], v: R }, { t: 'TANLC', refs: [ground, wheel] }, { t: 'PONC', refs: [P, wheel] }]) addCon(d, k);
  addCon(d, { t: 'DIST', refs: [O, T], v: x0, ref: true });                                                   // D1: medida (solo lectura)
  const tdeg = (signedAngle({ x: 0, y: -R }, { x: d.pts[P].x - d.pts[C].x, y: d.pts[P].y - d.pts[C].y }) * 180) / Math.PI;
  const kA = addCon(d, { t: 'ANG', refs: [lCT, lCP], s1: 1, s2: 1, v: tdeg, sg: tdeg < 0 ? -1 : 1, cur: Math.abs(tdeg), unit: 'rad', expr: 'D1/(O1/2)' });
  assert.ok(settle(d, solveSteps, []).ok);
  let maxIt = 0;
  for (let x = x0 + 0.7; x <= 70; x += 0.7) {                       // casi dos vueltas arrastrando T por el suelo
    const s = settle(d, solveSteps, [{ id: T, x, y: 0 }], { maxIter: 20 });
    assert.ok(s.ok, 'x ' + x.toFixed(1) + ' ' + (s.error || 'solver'));
    maxIt = Math.max(maxIt, s.iter);
    near(d.pts[T].x, x, 1e-4, 'T llega a donde se arrastra');
    const A = (d.cons[kA].cur * Math.PI) / 180, e = cyc(A);
    near(A, x / R, 1e-4, 'A1 = D1/r'); near(d.pts[P].x, e.x, 1e-3, 'P en la cicloide'); near(d.pts[P].y, e.y, 1e-3);
  }
  assert.ok(maxIt <= 8, 'converge en pocas vueltas: ' + maxIt);
  assert.ok(d.cons[kA].cur > 360, 'paso de una vuelta');
});
t('evolvente: la cuerda D1 = R*A1 lee el angulo del punto tangente y este no se mueve al alargarla', () => {
  const R = 25, c = { x: -30.6, y: 4.481 }, th0 = 0.3694;
  const d = newDoc();
  const p1 = addPoint(d, c.x, c.y); d.pts[p1].fixed = true;
  const p4 = addPoint(d, c.x - R * Math.sin(th0), c.y + R * Math.cos(th0)), p11 = addPoint(d, c.x, c.y + R);
  const p8 = addPoint(d, c.x - R * Math.sin(th0) + 25 * Math.cos(th0), c.y + R * Math.cos(th0) + 25 * Math.sin(th0));
  const circ = addCircle(d, p1, R, {}), l6 = addLine(d, p1, p4, {}), l9 = addLine(d, p4, p8, {}), l13 = addLine(d, p1, p11, {});
  for (const k of [{ t: 'RAD', refs: [circ], v: R }, { t: 'PONC', refs: [p4, circ], hidden: true }, { t: 'PERP', refs: [l9, l6] }, { t: 'PONC', refs: [p11, circ], hidden: true }, { t: 'V', refs: [l13] }]) addCon(d, k);
  const tdeg = (signedAngle({ x: d.pts[p4].x - c.x, y: d.pts[p4].y - c.y }, { x: 0, y: 1 }) * 180) / Math.PI; // de l6 a l13
  const kA = addCon(d, { t: 'ANG', refs: [l6, l13], s1: 1, s2: 1, v: tdeg, sg: tdeg < 0 ? -1 : 1, cur: Math.abs(tdeg), unit: 'rad', ref: true });   // A1: giro del radio (solo lectura)
  const kD = addCon(d, { t: 'DIST', refs: [p4, p8], v: 25, expr: 'A1*25' });                                                                    // D1 = R*A1 (cuerda)
  const p4x = d.pts[p4].x, p4y = d.pts[p4].y;
  const r0 = settle(d, solveSteps, []);
  assert.ok(r0.ok, r0.error || 'no cerro');
  near(d.cons[kD].v, 25 * th0, 2e-3); near(d.pts[p4].x, p4x, 1e-6, 'el punto tangente no se mueve'); near(d.pts[p4].y, p4y, 1e-6);
  let worst = 0;
  for (let th = 0.45; th <= 5.5; th += 0.05) {                      // arrastrar el punto tangente alrededor: la cuerda sigue la evolvente
    const s = settle(d, solveSteps, [{ id: p4, x: c.x - R * Math.sin(th), y: c.y + R * Math.cos(th) }], { maxIter: 20 });
    assert.ok(s.ok, 'th ' + th.toFixed(2) + ' ' + (s.error || 'solver'));
    const A = (d.cons[kA].cur * Math.PI) / 180;
    worst = Math.max(worst, Math.hypot(d.pts[p8].x - (c.x + R * (-Math.sin(A) + A * Math.cos(A))), d.pts[p8].y - (c.y + R * (Math.cos(A) + A * Math.sin(A)))));
  }
  assert.ok(worst < 1e-2, 'sobre la evolvente: ' + worst);
});
t('cotas con nombre: renombrar actualiza formulas y valida el nombre', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 10, 0), c = addPoint(d, 0, 6);
  const k1 = addCon(d, { t: 'DIST', refs: [a, b], v: 10 }), k2 = addCon(d, { t: 'DIST', refs: [a, c], v: 20, expr: 'D1*2' });
  assert.equal(checkName(d, 'D1', k2) !== null, true);
  assert.equal(checkName(d, 'sin', k1) !== null, true);
  assert.equal(checkName(d, '2x', k1) !== null, true);
  assert.equal(checkName(d, 'Ancho', k1), null);
  const P = addPoint(d, 1, 1), tx = addText(d, P, 'D1 vale $D1=$ y $D1*D10=$, no D1', {});
  renameDim(d, k1, 'Ancho');
  assert.equal(d.texts[tx].text, 'D1 vale $Ancho=$ y $Ancho*D10=$, no D1', 'las salidas de los textos siguen al nombre');
  assert.equal(d.cons[k2].expr, 'Ancho*2');
  assert.ok(recompute(d).ok); near(d.cons[k2].v, 20);
  delete d.cons[k1];
  assert.deepEqual(pruneFormulas(d), ['D2']);
});

t('angulo continuo: una conductora de 250 queda a 250 y una de 400 vale una vuelta y 40', () => {
  for (const [val, deg] of [[250, 250], [400, 40], [-30, -30]]) {
    const d = newDoc();
    const a = addPoint(d, 0, 0), b = addPoint(d, 10, 0), c = addPoint(d, 5, 5);
    d.pts[a].fixed = true; d.pts[b].fixed = true;
    const l1 = addLine(d, a, b, {}), l2 = addLine(d, a, c, {});
    const k = { t: 'ANG', refs: [l1, l2], s1: 1, s2: 1, sg: 1, cur: val };
    k.v = angTrue(d, k, val);
    const id = addCon(d, k);
    assert.ok(solve(d, []).ok);
    const ang = (Math.atan2(d.pts[c].y, d.pts[c].x) * 180) / Math.PI;
    near(((ang - deg) % 360 + 540) % 360 - 180, 0, 1e-3, `direccion ${val}`);
    near(dimValue(d, d.cons[id]), val, 1e-9, 'el valor mostrado es el que se puso');
    assert.match(dimText(d, d.cons[id]), new RegExp('^' + String(val).replace('-', '\\-') + '°'));
  }
});
t('angulo continuo: una cota de referencia sigue la vuelta completa sin saltar de 180° a 0°', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 10, 0), c = addPoint(d, 10 * Math.cos(0.5), 10 * Math.sin(0.5));
  const l1 = addLine(d, a, b, {}), l2 = addLine(d, a, c, {});
  const id = addCon(d, { t: 'ANG', refs: [l1, l2], s1: 1, s2: 1, v: (0.5 * 180) / Math.PI, ref: true });
  trackAngles(d);
  near(d.cons[id].cur, (0.5 * 180) / Math.PI, 1e-9);
  for (let deg = 35; deg <= 760; deg += 25) { // dos vueltas y poco mas, en pasos de 25°
    const r = (deg * Math.PI) / 180;
    d.pts[c].x = 10 * Math.cos(r); d.pts[c].y = 10 * Math.sin(r);
    trackAngles(d);
    near(dimValue(d, d.cons[id]), deg, 1e-6, 'vuelta ' + deg);
  }
  // y de vuelta hacia atras
  for (let deg = 735; deg >= 10; deg -= 25) {
    const r = (deg * Math.PI) / 180;
    d.pts[c].x = 10 * Math.cos(r); d.pts[c].y = 10 * Math.sin(r);
    trackAngles(d);
    near(dimValue(d, d.cons[id]), deg, 1e-6, 'regreso ' + deg);
  }
});
t('angulo continuo: una formula puede dar mas de 360 y entra en otras como radianes', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 10, 0), c = addPoint(d, 5, 5), e = addPoint(d, 0, 20);
  d.pts[a].fixed = true; d.pts[b].fixed = true;
  const l1 = addLine(d, a, b, {}), l2 = addLine(d, a, c, {});
  const kA = addCon(d, { t: 'ANG', refs: [l1, l2], s1: 1, s2: 1, sg: 1, cur: 90, v: 90 });            // A1 = 90
  const kB = addCon(d, { t: 'DIST', refs: [a, e], v: 1, expr: 'A1*2' });                               // D1 = 2 * (π/2)
  assert.ok(settle(d, solve, []).ok);
  near(d.cons[kB].v, Math.PI, 1e-9);
  d.cons[kA].cur = 450; d.cons[kA].v = angTrue(d, d.cons[kA], 450); // 450° = 1 vuelta y 90°
  assert.ok(recompute(d).ok);
  near(d.cons[kB].v, 2 * (450 * Math.PI) / 180, 1e-9);
});

t('textos con salidas: $expresion=$ usa los nombres de las cotas y las funciones', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 4, 0), c = addPoint(d, 0, 3), cc = addPoint(d, 20, 0);
  const ci = addCircle(d, cc, 5, {}), l1 = addLine(d, a, b, {}), l2 = addLine(d, a, c, {});
  addCon(d, { t: 'DIST', refs: [a, b], v: 4 });                                 // D1
  addCon(d, { t: 'DIST', refs: [a, c], v: 3 });                                 // D2
  addCon(d, { t: 'RAD', refs: [ci], v: 5 });                                    // O1 (diametro 10)
  addCon(d, { t: 'ANG', refs: [l1, l2], s1: 1, s2: 1, sg: 1, cur: 720, v: 0 }); // A1 = 720° = 4π rad
  const P = addPoint(d, 1, 1);
  const T = (txt) => textValue(d, d.texts[addText(d, P, txt, {})]);
  assert.equal(T('El diámetro es $O1=$ cm'), 'El diámetro es $O1=10$ cm');
  assert.equal(T('El área es $D1*D2=$ mm^2'), 'El área es $D1*D2=12$ mm^2');
  assert.equal(T('vueltas: $A1/(2π)=$'), 'vueltas: $A1/(2π)=2$');
  assert.equal(T('$D1=$ y $D2/3=$ y $sin(30)*D1=$'), '$D1=4$ y $D2/3=1$ y $sin(30)*D1=2$');
  assert.equal(T('sin salidas'), 'sin salidas');
  assert.equal(T('$D9=$'), '$D9=⚠$');
  assert.equal(T('$2+=$'), '$2+=⚠$');
  // el ancho de la caja es el del texto ya calculado
  const t = d.texts[addText(d, P, 'x $O1=$', { h: 2 })];
  const w = textFrame(shownText(d, t), (ln) => ln.length * 0.5).w;
  const lit = d.texts[addText(d, P, 'x $`O1=10`$', { h: 2 })]; // lo mismo escrito a mano, como literal
  near(w, textFrame(shownText(d, lit), (ln) => ln.length * 0.5).w, 1e-9);
  assert.ok(w > textFrame(shownText(d, d.texts[addText(d, P, 'x $`O1=`$', { h: 2 })]), (ln) => ln.length * 0.5).w);
  assert.equal(shownText(d, d.texts[addText(d, P, 'hola', {})]).text, 'hola');
});
t('vector: linea con flecha, magnitud como cota de referencia y texto en el punto medio', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0, false), b = addPoint(d, 6, 8, false);
  const l = addLine(d, a, b, { color: '#2563eb', ltype: 'continua', w: 2, ls: 1 });
  assert.ok(makeVector(d, l, { h: 3 }));
  assert.ok(!makeVector(d, l), 'no se convierte dos veces');
  const v = d.lines[l].vec;
  assert.ok(isVector(d.lines[l]));
  const dim = d.cons[v.d];
  assert.deepEqual([dim.t, dim.ref, dim.hidden, dim.name], ['DIST', true, true, 'D1']);
  near(dimValue(d, dim), 10);
  assert.equal(d.texts[v.t].text, '$D1=$');
  assert.equal(d.texts[v.t].anchor, 'tc');
  assert.equal(d.texts[v.t].ref, l, 'alineado con la linea del vector');
  near(rawAngle(d, d.texts[v.t]), (Math.atan2(8, 6) * 180) / Math.PI, 1e-9);
  assert.equal(d.texts[v.t].pt, v.m);
  near(d.pts[v.m].x, 3); near(d.pts[v.m].y, 4);
  assert.equal(textValue(d, d.texts[v.t]), '10');
  assert.ok(Object.values(d.cons).some((k) => k.t === 'MID' && k.refs[2] === v.m), 'el texto sigue al punto medio');
  // el texto sigue el punto medio al mover la cabeza
  d.pts[a].fixed = true;
  assert.ok(solve(d, [{ id: b, x: 16, y: 8 }]).ok);
  near(d.pts[v.m].x, 8); near(d.pts[v.m].y, 4);
  near(Number(textValue(d, d.texts[v.t])), Math.hypot(16, 8), 1e-3);
  const A = vecArrow(d, d.lines[l]);
  near(A.tip.x, 16); near(Math.hypot(A.dir.x, A.dir.y), 1);
  // la magnitud se puede usar en formulas de otras cotas
  assert.deepEqual(Object.keys(varsOf(d)).filter((k) => !k.includes('.')), ['D1']);
  // cola en b: la cabeza queda en a
  const l2 = addLine(d, a, b, {});
  makeVector(d, l2, { rev: true });
  assert.equal(vecEnds(d.lines[l2]).head, a);
  const A2 = vecArrow(d, d.lines[l2]);
  near(A2.tip.x, 0); assert.ok(A2.dir.x < 0);
});
t('vector: convertir a linea quita el texto, la cota y el punto medio; borrarlo tambien', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0, false), b = addPoint(d, 6, 8, false);
  const l = addLine(d, a, b, {});
  makeVector(d, l);
  const nPts = Object.keys(d.pts).length;
  assert.equal(nPts, 3);
  assert.ok(unmakeVector(d, l));
  assert.equal(d.lines[l].vec, undefined);
  assert.equal(Object.keys(d.texts).length, 0);
  assert.equal(Object.keys(d.cons).length, 0);
  assert.equal(Object.keys(d.pts).length, 2, 'el punto medio (auto) se va');
  makeVector(d, l);
  deleteItems(d, [{ k: 'ln', id: l }]);
  cleanup(d);
  assert.equal(Object.keys(d.texts).length, 0, 'borrar el vector borra su texto');
  assert.equal(Object.values(d.cons).filter((k) => k.vec).length, 0, 'y su cota');
});
t('vector: al cambiar un extremo (recortar o extender) la magnitud sigue a la linea; las copias son vectores nuevos', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0, false), b = addPoint(d, 6, 8, false), b2 = addPoint(d, 3, 4, false);
  const l = addLine(d, a, b, {});
  makeVector(d, l);
  d.lines[l].b = b2; // como al recortar: la linea pasa a terminar en otro punto
  syncVectors(d);
  assert.deepEqual(d.cons[d.lines[l].vec.d].refs, [a, b2]);
  near(dimValue(d, d.cons[d.lines[l].vec.d]), 5);
  const r = linearArray(d, [{ k: 'ln', id: l }], [{ u: { x: 1, y: 0 }, s: 10, n: 1 }]);
  assert.ok(r.ok);
  const vecs = Object.entries(d.lines).filter(([, x]) => x.vec);
  assert.equal(vecs.length, 2, 'la copia es otro vector');
  assert.notEqual(vecs[0][1].vec.t, vecs[1][1].vec.t);
  assert.notEqual(vecs[0][1].vec.d, vecs[1][1].vec.d);
  assert.equal(Object.keys(d.texts).length, 2, 'cada vector con su propio texto');
  assert.deepEqual(Object.values(d.cons).filter((k) => k.vec).map((k) => k.name).sort(), ['D1', 'D2']);
});
t('vector: la flecha sale en el SVG y en el DXF, y el texto con su valor', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0, false), b = addPoint(d, 10, 0, false);
  const l = addLine(d, a, b, { color: '#2563eb', ltype: 'continua', w: 2, ls: 1 });
  makeVector(d, l, { h: 2 });
  const svg = exportSVG(d, 1, { dims: false, texts: true });
  assert.match(svg, /<polygon/);
  assert.match(svg, />10</, 'el valor de la magnitud');
  const dxf = exportDXF(d, 5, { dims: false, texts: true });
  assert.ok(dxf.split(/\r?\n/).filter((v) => v === 'LINE').length >= 3, 'la linea y dos trazos de la cabeza');
  assert.match(dxf, /\r?\n1\r?\n10\r?\n/);
});

t('marca de referencia: el solver no la mueve, se desliza por su linea y se limpia sola', () => {
  const d = newDoc();
  const A = addPoint(d, 0, 0, false), B = addPoint(d, 10, 0, false), M = addPoint(d, 4, 3, false);
  const L = addLine(d, A, B, {}); d.pts[A].fixed = true; d.pts[M].mark = L;
  assert.ok(isMark(d, M));
  addCon(d, { t: 'DIST', refs: [A, B], v: 10 });
  assert.ok(solve(d, []).ok);
  near(d.pts[M].x, 4); near(d.pts[M].y, 0);                                       // se proyecta sobre la linea
  assert.ok(solve(d, [{ id: B, x: 6, y: 8 }]).ok);                                 // al girar la linea la marca la sigue (proyeccion de (4,0))
  near(d.pts[B].x, 6, 1e-3); near(d.pts[B].y, 8, 1e-3);
  near(d.pts[M].x, 1.44, 1e-3); near(d.pts[M].y, 1.92, 1e-3);
  assert.ok(solve(d, [{ id: M, x: 50, y: 50 }]).ok);                              // arrastrarla no la saca de la linea
  near(d.pts[M].x, 1.44, 1e-3); near(d.pts[M].y, 1.92, 1e-3);
  d.lines[L].a = M;
  assert.ok(!isMark(d, M), 'si es extremo de su linea no es marca');
  d.lines[L].a = A;
  deleteItems(d, [{ k: 'ln', id: L }]); cleanup(d);
  assert.equal(d.pts[M].mark, undefined, 'sin su linea deja de ser marca');
});
t('marca de referencia: las copias reasignan la marca a la copia de su linea', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0, false), b = addPoint(d, 10, 0, false), m = addPoint(d, 3, 0, false);
  const l = addLine(d, a, b, {}); d.pts[m].mark = l;
  const r = linearArray(d, [{ k: 'ln', id: l }, { k: 'pt', id: m }], [{ u: { x: 0, y: 1 }, s: 5, n: 1 }]);
  assert.ok(r.ok);
  const marks = Object.entries(d.pts).filter(([, p]) => p.mark);
  assert.equal(marks.length, 2);
  assert.notEqual(marks[0][1].mark, marks[1][1].mark, 'cada copia con su propia linea');
  for (const [id] of marks) assert.ok(isMark(d, id));
});
t('planimetro: una marca en el riel acumula el recorrido y la lectura da el area del cuadrado', () => {
  const d = newDoc();
  const O = addPoint(d, 0, 0, false), E = addPoint(d, 60, 80, false), P = addPoint(d, 60, -20, false), Q = addPoint(d, -240, -20, false), M = addPoint(d, 160, -20, false);
  d.pts[O].fixed = true;
  addLine(d, O, E, {});
  const l2 = addLine(d, E, P, {}), rail = addLine(d, P, Q, {});
  d.pts[M].mark = rail;
  addCon(d, { t: 'DIST', refs: [O, E], v: 100 });
  addCon(d, { t: 'DIST', refs: [E, P], v: 100 });
  addCon(d, { t: 'DIST', refs: [P, Q], v: 300 });
  addCon(d, { t: 'PERP', refs: [l2, rail] });
  const kD = addCon(d, { t: 'DIST', refs: [M, P], v: 100, ref: true });
  assert.ok(solve(d, []).ok);
  const tvec = () => { const ux = d.pts[P].x - d.pts[E].x, uy = d.pts[P].y - d.pts[E].y, L = Math.hypot(ux, uy); return { x: uy / L, y: -ux / L }; };
  const D0 = dimValue(d, d.cons[kD]);
  let W = 0, area = 0, prev = { ...d.pts[P] }, tp = tvec(), cur = { ...prev };
  for (const [dx, dy] of [[30, 0], [0, 30], [-30, 0], [0, -30]]) {
    const a = { ...cur }, N = 60;
    for (let i = 1; i <= N; i++) {
      assert.ok(solveSteps(d, [{ id: P, x: a.x + (dx * i) / N, y: a.y + (dy * i) / N }]).ok);
      const now = { ...d.pts[P] }, tn = tvec();
      W += ((now.x - prev.x) * (tn.x + tp.x)) / 2 + ((now.y - prev.y) * (tn.y + tp.y)) / 2;
      area += (prev.x * now.y - now.x * prev.y) / 2;
      prev = now; tp = tn;
    }
    cur = { ...d.pts[P] };
  }
  const dD = dimValue(d, d.cons[kD]) - D0;
  assert.ok(Math.abs(W) > 7, 'el brazo da una integral no nula: ' + W);
  assert.ok(Math.abs(dD - W) < 0.06 * Math.abs(W), `la marca lee lo que debe (${dD.toFixed(3)} vs ${W.toFixed(3)})`);
  assert.ok(Math.abs(Math.abs(area) - 900) < 45, 'el recorrido es el cuadrado de 30: ' + area);
  assert.ok(Math.abs(Math.abs(100 * dD) - Math.abs(area)) < 0.08 * Math.abs(area), `area leida ${Math.abs(100 * dD).toFixed(0)} vs real ${Math.abs(area).toFixed(0)}`);
});

t('marca: la referencia se guarda al asignar y reiniciar la devuelve, en cualquier pose del mecanismo', () => {
  const d = newDoc();
  const A = addPoint(d, 0, 0, false), B = addPoint(d, 10, 0, false), M = addPoint(d, 4, 3, false);
  const ln = addLine(d, A, B, {});
  assignMark(d, M, ln);
  near(d.pts[M].x, 4); near(d.pts[M].y, 0); near(d.pts[M].mark0, 4);
  // el mecanismo se pone en otro lugar y gira: la marca queda donde la deje la linea
  Object.assign(d.pts[A], { x: 20, y: 5 }); Object.assign(d.pts[B], { x: 20, y: 15 });
  projectMarks(d);
  near(d.pts[M].x, 20); near(d.pts[M].y, 0);
  assert.equal(resetMarks(d, [M]), 1);
  near(d.pts[M].x, 20); near(d.pts[M].y, 9, 1e-9, 'vuelve a 4 de A, sobre la linea nueva');
  // tomar la actual como referencia
  Object.assign(d.pts[M], { y: 12 }); assert.ok(setMarkRef(d, M)); near(d.pts[M].mark0, 7);
  Object.assign(d.pts[M], { y: 6 }); resetMarks(d); near(d.pts[M].y, 12);
  // sin linea, deja de ser marca y pierde la referencia
  delete d.lines[ln]; cleanup(d);
  assert.equal(d.pts[M].mark, undefined); assert.equal(d.pts[M].mark0, undefined);
});
t('marca: un archivo sin referencia la toma de donde esta al abrirlo', () => {
  const d = newDoc();
  const A = addPoint(d, 0, 0, false), B = addPoint(d, 10, 0, false), M = addPoint(d, 6, 0, false);
  const ln = addLine(d, A, B, {});
  d.pts[M].mark = ln;
  assert.equal(resetMarks(d, [M]), 0, 'sin referencia no mueve nada');
  assert.equal(d.pts[M].mark0, 6);
  d.pts[M].x = 9; ensureMarkRefs(d); near(d.pts[M].mark0, 6, 1e-9, 'ya tenia: no se pisa');
  d.pts[M].mark0 = undefined; delete d.pts[M].mark0; ensureMarkRefs(d); near(d.pts[M].mark0, 9);
});
t('planimetro: reiniciar la marca en otro lugar del dibujo deja la lectura en cero', () => {
  const d = newDoc();
  const O = addPoint(d, 0, 0, false), E = addPoint(d, 60, 80, false), P = addPoint(d, 60, -20, false), Q = addPoint(d, -240, -20, false), M = addPoint(d, 160, -20, false);
  d.pts[O].fixed = true;
  addLine(d, O, E, {});
  const l2 = addLine(d, E, P, {}), rail = addLine(d, P, Q, {});
  assignMark(d, M, rail);
  addCon(d, { t: 'DIST', refs: [O, E], v: 100 });
  addCon(d, { t: 'DIST', refs: [E, P], v: 100 });
  addCon(d, { t: 'DIST', refs: [P, Q], v: 300 });
  addCon(d, { t: 'PERP', refs: [l2, rail] });
  const kD = addCon(d, { t: 'DIST', refs: [M, P], v: 100, ref: true });
  assert.ok(solve(d, []).ok);
  const D0 = dimValue(d, d.cons[kD]);
  near(D0, 100, 1e-6);
  const drag = (dx, dy, N = 60) => { const a = { ...d.pts[P] }; for (let i = 1; i <= N; i++) assert.ok(solveSteps(d, [{ id: P, x: a.x + (dx * i) / N, y: a.y + (dy * i) / N }]).ok); };
  drag(30, 0); drag(0, 30); drag(-30, 0); drag(0, -30); // recorre un cuadrado
  assert.ok(Math.abs(dimValue(d, d.cons[kD]) - D0) > 1, 'la marca acumulo lectura');
  drag(40, 25); // se lleva el planimetro a otra area
  resetMarks(d, [M]);
  assert.ok(solve(d, []).ok);
  near(dimValue(d, d.cons[kD]), D0, 1e-6, 'la lectura vuelve a su valor de partida');
  drag(30, 0); assert.ok(Math.abs(dimValue(d, d.cons[kD]) - D0) > 1, 'y desde ahi vuelve a acumular');
});

t('formulas: redondeo, comparacion y trigonometria extra', () => {
  const v = (src, o) => evalExpr(src, o).value;
  near(v('round(2.675; 2)'), 2.68); near(v('round(-2.5)'), -3); near(v('redondear(7.456;1)'), 7.5); near(v('round(7.4)'), 7);
  near(v('floor(-1.2)'), -2); near(v('ceil(1.2)'), 2); near(v('trunc(-1.7)'), -1); near(v('sign(-5)'), -1); near(v('piso(2.9)+techo(2.1)'), 5);
  near(v('min(3; 1; 2)'), 1); near(v('max(3, 8)'), 8); near(v('mod(-1; 5)'), 4); near(v('clamp(15; 0; 10)'), 10); near(v('clamp(-3; 0; 10)'), 0); near(v('hypot(3; 4)'), 5);
  near(v('atan2(1; 1)'), 45); near(v('atan2(1; -1)'), 135); near(v('atan2(1; 1)', { radians: true }), Math.PI / 4);
  near(v('sinh(1)'), Math.sinh(1)); near(v('cosh(0)'), 1); near(v('tanh(0)'), 0); near(v('asinh(1)'), Math.asinh(1)); near(v('atanh(0.5)'), Math.atanh(0.5));
  near(v('sec(60)'), 2); near(v('csc(30)'), 2); near(v('cot(45)'), 1); near(v('sec(π/3)'), 2);
  near(v('deg(π)'), 180); near(v('rad(180)'), Math.PI); near(v('sin(rad(30))'), 0.5);
  // un valor que viene de π sigue siendo radianes tras redondear
  assert.equal(evalExpr('round(π; 2)').rad, true);
  // comparaciones: 1 si se cumple, 0 si no (== y != toleran el redondeo)
  assert.equal(v('3<5'), 1); assert.equal(v('3>=5'), 0); assert.equal(v('2==2.0000000001'), 1); assert.equal(v('2!=3'), 1); assert.equal(v('5≤5'), 1);
  near(v('2*(3<4)+1'), 3);
  // si(condicion; verdadero; falso) solo evalua la rama elegida
  near(v('si(1<2; 10; 20)'), 10); near(v('si(0; 1/0; 7)'), 7); near(v('if(2>1; 3; sqrt(-1)/0)'), 3);
  assert.throws(() => evalExpr('si(1; 1/0; 7)'), /cero/);
  // errores
  near(evalExpr('max(2,5)').value, 5); // «2,5» se lee decimal (un solo valor, error) y se reintenta con punto: max(2; 5)
  assert.throws(() => evalExpr('max(2,5,)'), /./);
  assert.throws(() => evalExpr('min(4)'), /valores/); assert.throws(() => evalExpr('atan2(1)'), /2 valores/); assert.throws(() => evalExpr('round(1;2;3)'), /valores/);
  assert.throws(() => evalExpr('mod(7; 0)'), /cero/); assert.throws(() => evalExpr('round(1; 1.5)'), /entero/); assert.throws(() => evalExpr('1<2<3'), /Sobra/);
  assert.throws(() => evalExpr('sin(30; 5)'), /solo valor/);
  // con variables y coma tras un valor
  near(v('max(a, 5)+b', { vars: { a: { v: 9, r: false }, b: { v: 1, r: false } } }), 10);
  // nombres reservados: no se pueden usar como nombre de cota
  for (const n of ['round', 'max', 'atan2', 'si', 'if', 'deg', 'sinh']) assert.ok(checkName(newDoc(), n, null), 'reservado: ' + n);
  assert.deepEqual(exprRefs('max(D1; round(L2; 1))'), ['D1', 'L2']);
  // «t» esta reservada para el tiempo (solo en minuscula): no es nombre de cota ni de variable y todavia no vale nada
  assert.match(checkName(newDoc(), 't', null), /tiempo/); assert.equal(checkName(newDoc(), 'T', null), null);
  assert.throws(() => evalExpr('2*t'), /reservada para el tiempo/);
  for (const n of ['j', 'ω', 'θ', 'α']) { assert.match(checkName(newDoc(), n, null), /uso futuro/); assert.throws(() => evalExpr('2*' + n), /uso futuro/); }
  for (const n of ['J', 'Ω', 'Θ', 'Α', 'β', 'i']) assert.equal(checkName(newDoc(), n, null), null, n); // solo esas minusculas exactas
  for (const n of ['π', 'pi', 'e']) assert.match(checkName(newDoc(), n, null), /constante/);
  const dt = newDoc(); addText(dt, addPoint(dt, 0, 0), '$t:5$  $T:2$', {});
  assert.deepEqual(textVarErrors(dt).map((e) => e.msg), ['«t» está reservada para el tiempo']);
  assert.equal(varsOf(dt).T.v, 2); assert.ok(!('t' in varsOf(dt)));
});
t('variables de texto: $x:valor$ se lee en salidas, en cursiva, se puede redefinir y no puede chocar con una cota', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 4, 0); d.pts[a].fixed = true;
  const l = addLine(d, a, b, {}); addCon(d, { t: 'H', refs: [l] });
  addCon(d, { t: 'DIST', refs: [a, b], v: 4 }); // D1
  const P = addPoint(d, 1, 1);
  const def = addText(d, P, '$k:D1*2+1$', {}), out = addText(d, P, 'k vale $k=$ y dos k $2*k=$', {});
  assert.deepEqual(runsOf(textValue(d, d.texts[def])), [{ s: '$', it: false }, { s: 'k:=D1*2+1', it: true }, { s: '$', it: false }]); // se ve «k:=valor» en cursiva
  assert.equal(plainText(textValue(d, d.texts[def])), '$k:=D1*2+1$');
  assert.equal(textValue(d, d.texts[out]), 'k vale $k=9$ y dos k $2*k=18$');
  // mezclado con texto normal: solo la definicion va en cursiva
  const mix = addText(d, P, 'Dato: $n:3$  ok', {});
  assert.deepEqual(runsOf(textValue(d, d.texts[mix])), [{ s: 'Dato: $', it: false }, { s: 'n:=3', it: true }, { s: '$  ok', it: false }]);
  assert.equal(varsOf(d).n.v, 3); assert.equal(varsOf(d).k.v, 9);
  assert.ok(varsList(d).includes('k = 9 (texto)'));
  // una variable puede usar otras variables (en cualquier orden) y los angulos de π son radianes
  addText(d, P, '$m:n+k$  $q:π/2$', {});
  assert.equal(varsOf(d).m.v, 12); near(varsOf(d).q.v, Math.PI / 2); assert.equal(varsOf(d).q.r, true);
  assert.equal(textVarErrors(d).length, 0);
  // el valor sigue a la cota
  d.cons[Object.keys(d.cons).find((k) => d.cons[k].t === 'DIST')].v = 10;
  assert.equal(textValue(d, d.texts[out]), 'k vale $k=21$ y dos k $2*k=42$');
  // multiples lineas y varias definiciones en un texto
  const multi = addText(d, P, '$r1:1$\n$r2:2$', {});
  assert.equal(varsOf(d).r1.v + varsOf(d).r2.v, 3);
  assert.equal(textValue(d, d.texts[multi]).split('\n').length, 2);
  // redefinida (orden de lectura): la que se lee despues manda a partir de ahi; no es un error
  const dup = addText(d, P, '$n:99$', {});
  assert.equal(varsOf(d).n.v, 99); // al final de la pagina
  assert.equal(textVarErrors(d).length, 0);
  assert.ok(!plainText(textValue(d, d.texts[dup])).includes('⚠'));
  assert.ok(!plainText(textValue(d, d.texts[mix])).includes('⚠'));
  delete d.texts[dup];
  assert.equal(varsOf(d).n.v, 3);
  assert.equal(textVarErrors(d).length, 0);
  // choca con una cota: gana la cota
  const clash = addText(d, P, '$D1:5$', {});
  assert.ok(textVarErrors(d).some((e) => /nombre de una cota/.test(e.msg)));
  assert.equal(varsOf(d).D1.v, 10);
  delete d.texts[clash];
  // funcion o constante como nombre, y expresion invalida o desconocida
  const f = addText(d, P, '$sin:5$  $pi:3$  $z:2+$  $w:nada*2$', {});
  const msgs = textVarErrors(d).map((e) => e.msg).join(' | ');
  assert.ok(/«sin» es una función/.test(msgs) && /«pi» es una función/.test(msgs) && /«z»/.test(msgs) && /«w»/.test(msgs), msgs);
  assert.ok((plainText(textValue(d, d.texts[f]))).split('⚠').length === 5);
  delete d.texts[f];
  // un nombre de cota no puede coincidir con una variable de texto
  assert.match(checkName(d, 'k', null), /variable de texto/);
  assert.equal(checkName(d, 'Ancho', null), null);
  // un uso antes de definir falla (no hay ciclos: se lee en orden) y lo que depende de lo que fallo tambien
  const cyc = addText(d, P, '$c1:c2+1$  $c2:c1+1$', {});
  assert.ok(textVarErrors(d).length >= 2); assert.ok(!('c1' in varsOf(d))); assert.ok(!('c2' in varsOf(d)));
  assert.match(textVarErrors(d)[0].msg, /se define más abajo/);
  delete d.texts[cyc];
  assert.equal(textVarErrors(d).length, 0);
});
t('variables de texto: las leen las cotas con formula, se recalculan en orden y no admiten ciclos', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 10, 0), c = addPoint(d, 0, 6), e = addPoint(d, 0, -3); d.pts[a].fixed = true;
  const l1 = addLine(d, a, b, {}), l2 = addLine(d, a, c, {}), l3 = addLine(d, a, e, {});
  addCon(d, { t: 'H', refs: [l1] }); addCon(d, { t: 'V', refs: [l2] }); addCon(d, { t: 'V', refs: [l3] });
  const k1 = addCon(d, { t: 'DIST', refs: [a, b], v: 10 }); // D1
  const k2 = addCon(d, { t: 'DIST', refs: [a, c], v: 6, expr: 'x+1' }); // D2 = x + 1
  const k3 = addCon(d, { t: 'DIST', refs: [a, e], v: 3, expr: 'D2*2' }); // D3 = 2*D2
  nameDims(d);
  const P = addPoint(d, 5, 60); // por encima de todas las cotas: en el orden de lectura las variables se definen antes que ellas
  addText(d, P, '$x:D1/2$', {}); // x depende de D1
  assert.ok(usesTextVars(d));
  assert.ok(solve(d, []).ok);
  const rc = recompute(d); assert.ok(rc.ok, rc.error);
  near(d.cons[k2].v, 6); near(d.cons[k3].v, 12); // 10/2+1 y 2*6
  d.cons[k1].v = 20;
  assert.ok(recompute(d).ok);
  near(d.cons[k2].v, 11); near(d.cons[k3].v, 22); // D1 -> x -> D2 -> D3 en orden
  assert.ok(solve(d, []).ok);
  near(Math.hypot(d.pts[c].x - d.pts[a].x, d.pts[c].y - d.pts[a].y), 11, 1e-4);
  // una variable que depende de una cota con formula tambien va despues de ella
  addText(d, P, '$y:D3+1$', {});
  d.cons[k2].expr = 'x+y'; // D2 = x + y, y = D3 + 1, D3 = 2*D2: en circulo
  const bad = recompute(d); assert.ok(!bad.ok); assert.match(bad.error, /círculo|propia fórmula/);
  d.cons[k2].expr = 'x+1';
  { const rr = recompute(d); assert.ok(rr.ok, rr.error); }
  // sin la variable, la formula pierde su base y se avisa
  d.texts = {};
  assert.ok(!recompute(d).ok);
  assert.ok(pruneFormulas(d).includes('D2'));
  assert.equal(d.cons[k2].expr, undefined);
  // la variable que lee una cota de solo lectura la vuelve reactiva (la entrada se mantiene fija al resolver)
  const d2 = newDoc();
  const p0 = addPoint(d2, 0, 0), p1 = addPoint(d2, 8, 0), p2 = addPoint(d2, 0, 5); d2.pts[p0].fixed = true;
  const m1 = addLine(d2, p0, p1, {}), m2 = addLine(d2, p0, p2, {});
  addCon(d2, { t: 'H', refs: [m1] }); addCon(d2, { t: 'V', refs: [m2] });
  addCon(d2, { t: 'DIST', refs: [p0, p1], v: 8, ref: true }); // D1 de lectura
  const kk = addCon(d2, { t: 'DIST', refs: [p0, p2], v: 5, expr: 'w' });
  nameDims(d2);
  assert.equal(hasReactive(d2), false);
  addText(d2, addPoint(d2, 3, 3), '$w:D1/2$', {});
  assert.equal(hasReactive(d2), true);
  void kk;
});
t('variables de texto: renombrar una cota las actualiza y el texto se mide por tramos (cursiva) y se exporta', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 4, 0); d.pts[a].fixed = true;
  const l = addLine(d, a, b, {}); addCon(d, { t: 'H', refs: [l] });
  const k = addCon(d, { t: 'DIST', refs: [a, b], v: 4 }); nameDims(d);
  const P = addPoint(d, 1, 1);
  const tx = addText(d, P, '$w:D1*2$  $w=$', { h: 2 });
  renameDim(d, k, 'Ancho');
  assert.equal(d.texts[tx].text, '$w:Ancho*2$  $w=$');
  assert.equal(plainText(textValue(d, d.texts[tx])), '$w:=Ancho*2$  $w=8$');
  // es una formula: se mide simbolo a simbolo, las letras en cursiva con su propia funcion
  const calls = [];
  const w = textFrame(shownText(d, d.texts[tx]), (s, f, it) => { calls.push([s, it]); return s.length * (it ? 1 : 0.5); }).w;
  assert.ok(calls.some(([s, it]) => s === 'w' && it) && calls.some(([s, it]) => s === ':=' && !it) && calls.some(([s, it]) => s === '8' && !it), JSON.stringify(calls));
  assert.ok(w > 0);
  assert.equal(lineWidth((s) => s.length, 'plano', ''), 5);
  // exportar: SVG con la variable en cursiva y DXF sin marcas
  const svg = exportSVG(d, 1);
  assert.match(svg, /font-style="italic">w<\/text>/);
  assert.ok(!/[\uE000-\uE00F]/.test(svg));
  const dxf = exportDXF(d, 5);
  assert.ok(dxf.includes('\r\n:=\r\n') && dxf.includes('\r\n8\r\n') && !/[\uE000-\uE00F]/.test(dxf));
});

const rectDoc = (W = 10, H = 6) => { // rectangulo fijo en (0,0), con sus cotas de ancho y alto
  const d = newDoc();
  const p = [addPoint(d, 0, 0), addPoint(d, W, 0), addPoint(d, W, H), addPoint(d, 0, H)];
  d.pts[p[0]].fixed = true;
  const l = addRectangle(d, p, {});
  const kw = addCon(d, { t: 'DIST', refs: [p[0], p[1]], v: W }), kh = addCon(d, { t: 'DIST', refs: [p[1], p[2]], v: H });
  return { d, p, l, kw, kh };
};
const distPL = (P, A, B) => Math.abs(((P.x - A.x) * (B.y - A.y) - (P.y - A.y) * (B.x - A.x)) / Math.hypot(B.x - A.x, B.y - A.y));
t('redondeo: un arco tangente a las dos lineas, con el radio como cota editable y el vertice virtual en su lugar', () => {
  const { d, p, l, kw, kh } = rectDoc();
  const r = filletCorner(d, p[2], 2); // esquina superior derecha
  assert.ok(r.ok, r.msg);
  assert.ok(solve(d, []).ok);
  const arc = d.arcs[r.arc], C = d.pts[arc.c];
  near(arc.r, 2, 1e-6); near(C.x, 8, 1e-6); near(C.y, 4, 1e-6); // centro a r de cada lado
  const [q1, q2] = r.pts, Q1 = d.pts[q1], Q2 = d.pts[q2];
  for (const [Q, id] of [[Q1, 0], [Q2, 1]]) { near(Math.hypot(Q.x - C.x, Q.y - C.y), 2, 1e-6); void id; }
  assert.ok(Math.abs(Q1.x - 10) < 1e-6 || Math.abs(Q1.y - 6) < 1e-6);
  // las lineas del rectangulo terminan en los puntos de tangencia y siguen horizontal y vertical
  const ends = [d.lines[l[1]].b, d.lines[l[2]].a].sort();
  assert.deepEqual(ends, [q1, q2].sort());
  near(d.pts[p[2]].x, 10, 1e-6); near(d.pts[p[2]].y, 6, 1e-6); // el vertice virtual sigue en la esquina
  near(dimValue(d, d.cons[kw]), 10, 1e-6); near(dimValue(d, d.cons[kh]), 6, 1e-6); // y las cotas del rectangulo valen
  near(distPL(C, d.pts[d.lines[l[1]].a], d.pts[d.lines[l[1]].b]), 2, 1e-6);
  // el radio es una cota: cambiarla mueve el arco
  const kr = Object.keys(d.cons).find((k) => d.cons[k].t === 'RAD');
  assert.ok(/^R\d+$/.test(d.cons[kr].name));
  d.cons[kr].v = 3;
  assert.ok(solve(d, []).ok);
  near(d.arcs[r.arc].r, 3, 1e-6); near(d.pts[d.arcs[r.arc].c].x, 7, 1e-6); near(d.pts[d.arcs[r.arc].c].y, 3, 1e-6);
  // y el rectangulo se puede cambiar de tamano: el redondeo lo sigue
  d.cons[kw].v = 14;
  assert.ok(solve(d, []).ok);
  near(d.pts[p[2]].x, 14, 1e-4); near(d.pts[d.arcs[r.arc].c].x, 11, 1e-4); near(d.pts[d.arcs[r.arc].c].y, 3, 1e-4);
  // dos redondeos en la misma linea
  const r2 = filletCorner(d, p[1], 1.5);
  assert.ok(r2.ok, r2.msg); assert.ok(solve(d, []).ok);
  near(d.arcs[r2.arc].r, 1.5, 1e-6);
});
t('redondeo: la igualdad de longitudes pasa a distancias hasta el vertice virtual y las cotas de longitud siguen valiendo', () => {
  const d = newDoc();
  const c = addPoint(d, 0, 0), v = [];
  d.pts[c].fixed = true;
  for (let i = 0; i < 6; i++) v.push(addPoint(d, 10 * Math.cos((i * Math.PI) / 3), 10 * Math.sin((i * Math.PI) / 3)));
  const ls = addPolygon(d, c, v, {}); // hexagono: EQL oculta entre todos los lados
  const kl = addCon(d, { t: 'DIST', refs: [v[2], v[3]], v: 10 }); // cota de longitud de un lado
  assert.ok(solve(d, []).ok);
  const r = filletCorner(d, v[2], 1);
  assert.ok(r.ok, r.msg);
  assert.ok(solve(d, []).ok, 'el hexagono con un vertice redondeado resuelve');
  assert.deepEqual(d.cons[kl].refs, [v[2], v[3]]); // la cota de longitud sigue entre los vertices (el virtual no se mueve)
  near(Math.hypot(d.pts[v[2]].x - d.pts[v[3]].x, d.pts[v[2]].y - d.pts[v[3]].y), 10, 1e-4);
  assert.ok(Object.values(d.cons).some((k) => k.t === 'EQD' && k.refs.length === 4 && k.refs.includes(v[2])));
  // redondear los seis vertices
  for (const q of [v[0], v[1], v[3], v[4], v[5]]) { const x = filletCorner(d, q, 1); assert.ok(x.ok, x.msg); }
  assert.ok(solve(d, []).ok);
  assert.equal(Object.keys(d.arcs).length, 6);
});
t('redondeo: esquinas con lineas libres, rellenos y errores', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 10, 2), c = addPoint(d, 8, 12);
  d.pts[a].fixed = true; d.pts[c].fixed = true;
  const l1 = addLine(d, a, b, {}), l2 = addLine(d, b, c, {});
  const h = d.hatches ||= {}; void h;
  const C = cornerOf(d, b);
  assert.ok(C.ok); assert.ok(C.theta > 0.2 && C.theta < 3);
  assert.ok(maxFillet(C) > 1);
  const bad = filletCorner(d, b, 100); assert.ok(!bad.ok); assert.match(bad.msg, /máximo/);
  assert.ok(!filletCorner(d, b, 0).ok);
  assert.match(filletCorner(d, a, 1).msg, /no es la esquina/); // solo una linea llega ahi
  const r = filletCorner(d, b, 2);
  assert.ok(r.ok, r.msg); assert.ok(solve(d, []).ok);
  const arc = d.arcs[r.arc], cen = d.pts[arc.c];
  near(distPL(cen, d.pts[d.lines[l1].a], d.pts[d.lines[l1].b]), 2, 1e-5);
  near(distPL(cen, d.pts[d.lines[l2].a], d.pts[d.lines[l2].b]), 2, 1e-5);
  // el vertice virtual se queda donde estaba la esquina, sobre las dos rectas
  near(d.pts[b].x, 10, 1e-5); near(d.pts[b].y, 2, 1e-5);
  assert.ok(!filletCorner(d, b, 1).ok); // ya no es esquina: nadie termina ahi
  // alineadas: no hay esquina
  const e = newDoc();
  const p0 = addPoint(e, 0, 0), p1 = addPoint(e, 5, 0), p2 = addPoint(e, 10, 0);
  addLine(e, p0, p1, {}); addLine(e, p1, p2, {});
  assert.match(filletCorner(e, p1, 1).msg, /alineadas/);
  // un relleno que usaba las dos lineas incluye el arco
  const f = rectDoc();
  f.d.hatches = { h1: { ids: [...f.l], kind: 'lineas' } };
  const fr = filletCorner(f.d, f.p[0], 1.5);
  assert.ok(fr.ok, fr.msg); assert.ok(f.d.hatches.h1.ids.includes(fr.arc));
});
t('chaflan: una linea entre las dos, con una cota por tramo que se puede editar', () => {
  const { d, p, l, kw, kh } = rectDoc();
  const r = chamferCorner(d, p[2], 2);
  assert.ok(r.ok, r.msg);
  assert.ok(solve(d, []).ok);
  const [q1, q2] = r.pts, L = d.lines[r.line];
  assert.deepEqual([L.a, L.b], [q1, q2]);
  // q1 y q2 quedan sobre los lados del rectangulo, uno en el superior y otro en el derecho, a 2 de la esquina (10, 6)
  assert.ok([d.pts[q1], d.pts[q2]].some((q) => Math.abs(q.y - 6) < 1e-6 && Math.abs(q.x - 8) < 1e-6) && [d.pts[q1], d.pts[q2]].some((q) => Math.abs(q.x - 10) < 1e-6 && Math.abs(q.y - 4) < 1e-6));
  near(Math.hypot(d.pts[q1].x - 10, d.pts[q1].y - 6), 2, 1e-6); near(Math.hypot(d.pts[q2].x - 10, d.pts[q2].y - 6), 2, 1e-6);
  near(dimValue(d, d.cons[kw]), 10, 1e-6); near(dimValue(d, d.cons[kh]), 6, 1e-6);
  const dists = r.dims;
  assert.equal(dists.length, 2);
  assert.ok(dists.every((k) => d.cons[k].t === 'DIST' && d.cons[k].refs.includes(p[2]) && /^D\d+$/.test(d.cons[k].name)));
  d.cons[dists[0]].v = 3; // un tramo mas largo: el chaflan deja de ser simetrico
  assert.ok(solve(d, []).ok);
  const far = d.cons[dists[0]].refs.find((x) => x !== p[2]);
  near(Math.hypot(d.pts[far].x - 10, d.pts[far].y - 6), 3, 1e-6);
  // distancias distintas, y demasiado grande
  const g = rectDoc();
  const r2 = chamferCorner(g.d, g.p[0], 1, 2.5); assert.ok(r2.ok, r2.msg); assert.ok(solve(g.d, []).ok);
  assert.ok(!chamferCorner(g.d, g.p[1], 50).ok); assert.match(chamferCorner(g.d, g.p[1], 50).msg, /máximo/);
  assert.ok(!chamferCorner(g.d, g.p[1], -1).ok);
  void l;
});

t('variables de texto: $x:valor$ se ve, se lee, se renombra y valida; la sintaxis vieja x[:=valor] ya no es una definicion', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 4, 0); d.pts[a].fixed = true;
  const l = addLine(d, a, b, {}); addCon(d, { t: 'H', refs: [l] });
  const k = addCon(d, { t: 'DIST', refs: [a, b], v: 4 }); nameDims(d);
  const P = addPoint(d, 1, 1);
  const tx = addText(d, P, '$w:D1*2$  $z:w+1$  $w=$ $z=$', { h: 2 });
  assert.equal(plainText(textValue(d, d.texts[tx])), '$w:=D1*2$  $z:=w+1$  $w=8$ $z=9$');
  renameDim(d, k, 'Ancho');
  assert.equal(d.texts[tx].text, '$w:Ancho*2$  $z:w+1$  $w=$ $z=$');
  // redefinir una variable vale (orden de lectura); chocar con el nombre de una cota no
  const dup = addText(d, P, '$w:1$  $Ancho:2$', {});
  assert.equal(plainText(textValue(d, d.texts[dup])), '$w:=1$  $Ancho:=2 ⚠$');
  // llaves sin nombre delante o sin "=" son texto normal
  assert.equal(textValue(d, d.texts[addText(d, P, '{=3} y {5} y x{4}', {})]), '{=3} y {5} y x{4}');
  assert.equal(textValue(d, d.texts[addText(d, P, 'q[:=3]', {})]), 'q[:=3]');
});

t('forma fija de un spline: sus puntos giran y se mueven como un cuerpo rigido; quitarla la libera; se borra con el spline', () => {
  const mk = () => {
    const d = newDoc();
    const c = addPoint(d, 0, 0); d.pts[c].fixed = true;
    const pts = [[10, 0], [9, 4], [7, 7], [4, 9], [0, 10], [5, 5.5]].map(([x, y]) => addPoint(d, x, y, true));
    const sp = addSpline(d, pts, { color: 'auto', ltype: 'continua', w: 2 }, false);
    return { d, c, pts, sp };
  };
  const spread = (d, pts) => pts.map((p) => ({ x: d.pts[p].x, y: d.pts[p].y }));
  const dists = (a) => a.flatMap((p, i) => a.slice(i + 1).map((q) => Math.hypot(p.x - q.x, p.y - q.y)));
  // sin forma fija: arrastrar un punto deforma la curva
  const f = mk();
  f.d.cons.kx = { t: 'DIST', refs: [f.c, f.pts[0]], v: 10 };
  const d0 = dists(spread(f.d, f.pts));
  assert.ok(solve(f.d, [{ id: f.pts[0], x: 8, y: 6 }]).ok);
  assert.ok(Math.max(...dists(spread(f.d, f.pts)).map((v, i) => Math.abs(v - d0[i]))) > 0.5);
  // con forma fija: se conservan todas las distancias entre sus puntos
  const g = mk();
  const r = rigidShape(g.d, g.sp);
  assert.ok(r.ok && isRigid(g.d, g.sp));
  assert.ok(Object.values(g.d.cons).every((k) => k.hidden && k.t === 'DIST' && k.shape === g.sp));
  g.d.cons.kx = { t: 'DIST', refs: [g.c, g.pts[0]], v: 10 };
  const e0 = dists(spread(g.d, g.pts));
  assert.ok(solve(g.d, []).ok);
  for (const tgt of [{ x: 8, y: 6 }, { x: 0, y: 10 }]) {
    assert.ok(solve(g.d, [{ id: g.pts[0], ...tgt }]).ok);
    const e1 = dists(spread(g.d, g.pts));
    near(Math.max(...e1.map((v, i) => Math.abs(v - e0[i]))), 0, 1e-4);
  }
  // quitarla libera los puntos; borrar el spline borra sus restricciones
  looseShape(g.d, g.sp); assert.ok(!isRigid(g.d, g.sp));
  const h = mk(); rigidShape(h.d, h.sp); assert.ok(isRigid(h.d, h.sp));
  deleteItems(h.d, [{ k: 'sp', id: h.sp }]);
  assert.equal(Object.keys(h.d.cons).length, 0);
  // casos que no valen
  const z = newDoc(); const a1 = addPoint(z, 0, 0), a2 = addPoint(z, 1, 0); const s2 = addSpline(z, [a1, a2], { color: 'auto', ltype: 'continua', w: 2 }, false);
  assert.ok(!rigidShape(z, s2).ok);
  // puntos en una recta: bastan dos anclas
  const q = newDoc(); const qp = [0, 1, 2, 3].map((x) => addPoint(q, x, 0, true)); const qs = addSpline(q, qp, { color: 'auto', ltype: 'continua', w: 2 }, false);
  assert.ok(rigidShape(q, qs).ok); assert.ok(solve(q, []).ok);
});

t('campos enteros de matrices y dividir: aceptan variables y formulas (se redondean) y rechazan lo invalido', () => {
  const d = newDoc();
  addText(d, addPoint(d, 0, 0), '$z:17.4$  $m:3$  $k:2.5$', {});
  assert.equal(readInt(d, '12', 'N', 2, 200).n, 12);
  assert.equal(readInt(d, '2,0', 'N', 2, 200).n, 2);
  assert.ok(readInt(d, '2.5', 'N', 2, 200).err); // un numero simple debe ser entero
  assert.equal(readInt(d, 'z', 'N', 2, 200).n, 17); // variable: se redondea
  assert.equal(readInt(d, 'z/2', 'N', 2, 200).n, 9);
  assert.equal(readInt(d, 'round(z;0)+m', 'N', 2, 200).n, 20);
  assert.equal(readInt(d, 'k', 'N', 2, 200).n, 3);
  assert.match(readInt(d, 'z*100', 'N', 2, 200).err, /entero de 2 a 200/);
  assert.match(readInt(d, 'nada', 'N', 2, 200).err, /^N:/);
  assert.deepEqual(splitTop('3, 5; round(z/2;0) 7'), ['3', '5', 'round(z/2;0)', '7']);
  assert.deepEqual(splitTop('  '), []);
});

t('varsInfo: lista las variables con su tipo (dimension, angulo, variable de texto) y excluye la cota indicada', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 4, 0), c = addPoint(d, 0, 3); d.pts[a].fixed = true;
  const l1 = addLine(d, a, b, {}), l2 = addLine(d, a, c, {});
  const kd = addCon(d, { t: 'DIST', refs: [a, b], v: 4 }), ka = addCon(d, { t: 'ANG', refs: [l1, l2], v: 90, s1: 1, s2: 1, sg: 1 });
  nameDims(d);
  addText(d, addPoint(d, 5, 5), '$z:17$', {});
  const all = varsInfo(d);
  assert.deepEqual(all.map((x) => [x.name, x.kind]), [[d.cons[kd].name, 'dim'], [d.cons[ka].name, 'ang'], ['z', 'var']]);
  assert.equal(all[2].text, 'z = 17');
  assert.ok(!varsInfo(d, kd).some((x) => x.name === d.cons[kd].name));
});

// ---- redondeo entre elementos que no se juntan en una esquina
const dPL = (P, A, B) => Math.abs(((P.x - A.x) * (B.y - A.y) - (P.y - A.y) * (B.x - A.x)) / Math.hypot(B.x - A.x, B.y - A.y));
const radKey = (d) => Object.keys(d.cons).find((k) => d.cons[k].t === 'RAD');
const polyDist = (P, c) => { let m = Infinity; for (let i = 0; i + 1 < P.length; i++) { const a = P[i], b = P[i + 1], vx = b.x - a.x, vy = b.y - a.y, u = Math.max(0, Math.min(1, ((c.x - a.x) * vx + (c.y - a.y) * vy) / (vx * vx + vy * vy))); m = Math.min(m, Math.hypot(c.x - a.x - u * vx, c.y - a.y - u * vy)); } return m; };
t('redondeo entre elementos: dos lineas que se cruzan sin compartir punto, del lado tocado', () => {
  const d = newDoc();
  const l1 = addLine(d, addPoint(d, -5, 0), addPoint(d, 10, 0), {}), l2 = addLine(d, addPoint(d, 0, -5), addPoint(d, 0, 10), {});
  const r = filletBetween(d, { k: 'ln', id: l1, p: { x: 8, y: 0 } }, { k: 'ln', id: l2, p: { x: 0, y: 8 } }, 2);
  assert.ok(r.ok, r.msg); assert.ok(solve(d, []).ok);
  const C = d.pts[d.arcs[r.arc].c];
  near(C.x, 2, 1e-6); near(C.y, 2, 1e-6);
  near(d.pts[d.lines[l1].a].x, 2, 1e-6); near(d.pts[d.lines[l1].a].y, 0, 1e-6); near(d.pts[d.lines[l1].b].x, 10, 1e-6); // se conserva el lado tocado
  near(d.pts[d.lines[l2].a].y, 2, 1e-6);
  near(arcOf(d, d.arcs[r.arc]).sweep, Math.PI / 2, 1e-6);
  // otro lado: el cuadrante contrario
  const e = newDoc();
  const m1 = addLine(e, addPoint(e, -5, 0), addPoint(e, 10, 0), {}), m2 = addLine(e, addPoint(e, 0, -5), addPoint(e, 0, 10), {});
  const r2 = filletBetween(e, { k: 'ln', id: m1, p: { x: -8, y: 0 } }, { k: 'ln', id: m2, p: { x: 0, y: -3 } }, 2);
  assert.ok(r2.ok, r2.msg); assert.ok(solve(e, []).ok);
  near(e.pts[e.arcs[r2.arc].c].x, -2, 1e-6); near(e.pts[e.arcs[r2.arc].c].y, -2, 1e-6);
  near(e.pts[e.lines[m1].b].x, -2, 1e-6); // el trozo de la derecha se descarta: el extremo pasa al contacto
  // el radio es una cota: cambiarla desliza el arco por las lineas
  d.cons[radKey(d)].v = 3;
  assert.ok(solve(d, []).ok);
  near(d.arcs[r.arc].r, 3, 1e-6); near(d.pts[d.arcs[r.arc].c].x, 3, 0.05); near(d.pts[d.arcs[r.arc].c].y, 3, 0.05);
});
t('redondeo entre elementos: lineas que no se tocan se alargan hasta la tangencia', () => {
  const d = newDoc();
  const l1 = addLine(d, addPoint(d, 5, 0), addPoint(d, 12, 0), {}), l2 = addLine(d, addPoint(d, 0, 6), addPoint(d, 0, 12), {});
  assert.deepEqual(filletReach(d, { k: 'ln', id: l1 }, { k: 'ln', id: l2 }), { len: 6 }); // el menor de los dos
  const r = filletBetween(d, { k: 'ln', id: l1, p: { x: 10, y: 0 } }, { k: 'ln', id: l2, p: { x: 0, y: 10 } }, 2);
  assert.ok(r.ok, r.msg); assert.ok(solve(d, []).ok);
  near(d.pts[d.lines[l1].a].x, 2, 1e-6); near(d.pts[d.lines[l2].a].y, 2, 1e-6);
});
t('redondeo entre elementos: quita las cotas de longitud de los segmentos recortados y rechaza lo imposible', () => {
  const d = newDoc();
  const l1 = addLine(d, addPoint(d, -5, 0), addPoint(d, 10, 0), {}), l2 = addLine(d, addPoint(d, 0, -5), addPoint(d, 0, 10), {});
  addCon(d, { t: 'DIST', refs: [l1], v: 15 });
  const r = filletBetween(d, { k: 'ln', id: l1, p: { x: 8, y: 0 } }, { k: 'ln', id: l2, p: { x: 0, y: 8 } }, 2);
  assert.ok(r.ok && r.dropped === 1, r.msg);
  assert.ok(!Object.values(d.cons).some((k) => k.t === 'DIST'));
  // paralelas: no hay redondeo de un radio cualquiera
  const e = newDoc();
  const a = addLine(e, addPoint(e, 0, 0), addPoint(e, 10, 0), {}), b = addLine(e, addPoint(e, 0, 3), addPoint(e, 10, 3), {});
  assert.ok(!filletBetween(e, { k: 'ln', id: a, p: { x: 5, y: 0 } }, { k: 'ln', id: b, p: { x: 5, y: 3 } }, 1).ok);
  assert.ok(!filletBetween(e, { k: 'ln', id: a, p: { x: 5, y: 0 } }, { k: 'ln', id: a, p: { x: 6, y: 0 } }, 1).ok);
  const ci = addCircle(e, addPoint(e, 20, 20), 2, {});
  assert.match(filletBetween(e, { k: 'ln', id: a, p: { x: 5, y: 0 } }, { k: 'ci', id: ci, p: { x: 22, y: 20 } }, 1).msg, /círculo/);
});
t('redondeo entre elementos: dos segmentos con un extremo comun usan el redondeo de esquina', () => {
  const d = newDoc();
  const o = addPoint(d, 0, 0), a = addPoint(d, 10, 0), b = addPoint(d, 0, 10);
  const l1 = addLine(d, o, a, {}), l2 = addLine(d, o, b, {});
  const r = filletBetween(d, { k: 'ln', id: l1, p: { x: 7, y: 0 } }, { k: 'ln', id: l2, p: { x: 0, y: 7 } }, 2);
  assert.ok(r.ok, r.msg); assert.ok(solve(d, []).ok);
  near(d.pts[o].x, 0, 1e-6); // el vertice virtual de siempre
  assert.equal(Object.values(d.cons).filter((k) => k.t === 'PONL').length, 2);
});
t('redondeo entre elementos: arco y segmento, y arco con arco (tangencia en el extremo comun)', () => {
  const d = newDoc();
  const ar = addArc(d, addPoint(d, 0, 0), addPoint(d, 6, 0), addPoint(d, 0, 6), 6, {});
  const l = addLine(d, addPoint(d, 1, 8), addPoint(d, 10, 8), {});
  const r = filletBetween(d, { k: 'ar', id: ar, p: { x: 4.2, y: 4.2 } }, { k: 'ln', id: l, p: { x: 8, y: 8 } }, 1.5);
  assert.ok(r.ok, r.msg); assert.ok(solve(d, []).ok);
  let C = d.pts[d.arcs[r.arc].c];
  near(Math.hypot(C.x, C.y), 6 + 1.5, 1e-5, 'tangente por fuera del arco');
  near(dPL(C, d.pts[d.lines[l].a], d.pts[d.lines[l].b]), 1.5, 1e-5);
  const e = newDoc();
  const a1 = addArc(e, addPoint(e, 0, 0), addPoint(e, 5, 0), addPoint(e, 0, 5), 5, {}), a2 = addArc(e, addPoint(e, 12, 0), addPoint(e, 12, 5), addPoint(e, 7, 0), 5, {});
  const r2 = filletBetween(e, { k: 'ar', id: a1, p: { x: 3.5, y: 3.5 } }, { k: 'ar', id: a2, p: { x: 8.5, y: 3.5 } }, 1.5);
  assert.ok(r2.ok, r2.msg); assert.ok(solve(e, []).ok);
  C = e.pts[e.arcs[r2.arc].c];
  near(Math.hypot(C.x, C.y), 5 + 1.5, 1e-5); near(Math.hypot(C.x - 12, C.y), 5 + 1.5, 1e-5);
  e.cons[radKey(e)].v = 2;
  assert.ok(solve(e, []).ok);
  C = e.pts[e.arcs[r2.arc].c];
  near(e.arcs[r2.arc].r, 2, 1e-6);
  const c1 = e.pts[e.arcs[a1].c], s1 = e.pts[e.arcs[a1].a];
  near(Math.hypot(C.x - c1.x, C.y - c1.y), Math.hypot(s1.x - c1.x, s1.y - c1.y) + 2, 1e-5, 'sigue tangente al cambiar el radio');
});
t('redondeo entre elementos: arco eliptico y segmento, tangentes tambien despues de cambiar el radio', () => {
  for (const variant of [0, 1]) {
    const d = newDoc();
    const c = addPoint(d, 0, 0), a = addPoint(d, 6, 0), b = addPoint(d, 0, 3);
    const el = addEllipse(d, c, a, b, {}, addPoint(d, 6, 0), addPoint(d, variant ? -6 : 0, variant ? 0 : 3));
    addCon(d, { t: 'ANG4', refs: [c, a, c, b], v: 90, hidden: true });
    const l = variant ? addLine(d, addPoint(d, 3, -2), addPoint(d, 3, 6), {}) : addLine(d, addPoint(d, 1, 5), addPoint(d, 12, 5), {});
    assert.ok(solve(d, []).ok);
    const r = variant ? filletBetween(d, { k: 'el', id: el, p: { x: 1, y: 2.9 } }, { k: 'ln', id: l, p: { x: 3, y: 5 } }, 0.8) : filletBetween(d, { k: 'el', id: el, p: { x: 4, y: 2.2 } }, { k: 'ln', id: l, p: { x: 9, y: 5 } }, 1.2);
    assert.ok(r.ok, r.msg);
    for (const rr of [d.cons[radKey(d)].v, 1.5, 0.6]) {
      d.cons[radKey(d)].v = rr;
      assert.ok(solve(d, []).ok, 'resuelve con r=' + rr);
      const C = d.pts[d.arcs[r.arc].c];
      near(polyDist(ellipsePolyline(d, d.ellipses[el], 720), C), rr, 2e-4, 'tangente al arco eliptico');
      near(dPL(C, d.pts[d.lines[l].a], d.pts[d.lines[l].b]), rr, 1e-5, 'tangente al segmento');
    }
  }
  const e = newDoc();
  const full = addEllipse(e, addPoint(e, 0, 0), addPoint(e, 6, 0), addPoint(e, 0, 3), {});
  const ln = addLine(e, addPoint(e, 1, 5), addPoint(e, 12, 5), {});
  assert.match(filletBetween(e, { k: 'el', id: full, p: { x: 0, y: 3 } }, { k: 'ln', id: ln, p: { x: 9, y: 5 } }, 1).msg, /elipse completa/);
});

t('chaflan y redondeo entre elementos: sin puntos tocados usa el medio de cada uno; chaflan entre elementos que se cortan', () => {
  const d = newDoc();
  const l1 = addLine(d, addPoint(d, -5, 0), addPoint(d, 10, 0), {}), l2 = addLine(d, addPoint(d, 0, -5), addPoint(d, 0, 10), {});
  const r = chamferBetween(d, { k: 'ln', id: l1 }, { k: 'ln', id: l2, p: { x: 0, y: 8 } }, 2);
  assert.ok(r.ok, r.msg); assert.ok(solve(d, []).ok);
  const q = r.pts.map((id) => d.pts[id]);
  near(q[0].x, 2, 1e-6); near(q[0].y, 0, 1e-6); near(q[1].x, 0, 1e-6); near(q[1].y, 2, 1e-6); // el medio de l1 esta a la derecha del cruce
  assert.equal(r.dims.length, 2);
  const e = newDoc();
  const ar = addArc(e, addPoint(e, 0, 0), addPoint(e, 6, 0), addPoint(e, 0, 6), 6, {});
  const ln = addLine(e, addPoint(e, 3, -2), addPoint(e, 3, 8), {});
  const r2 = chamferBetween(e, { k: 'ar', id: ar, p: { x: 0, y: 6 } }, { k: 'ln', id: ln, p: { x: 3, y: 7 } }, 1);
  assert.ok(r2.ok, r2.msg); assert.ok(solve(e, []).ok);
  const V = { x: 3, y: Math.sqrt(27) }, Q = r2.pts.map((id) => e.pts[id]);
  for (const P of Q) near(Math.hypot(P.x - V.x, P.y - V.y), 1, 1e-4);
  const f = newDoc();
  const a = addLine(f, addPoint(f, 0, 0), addPoint(f, 10, 0), {}), b = addLine(f, addPoint(f, 0, 3), addPoint(f, 10, 3), {});
  assert.match(chamferBetween(f, { k: 'ln', id: a }, { k: 'ln', id: b }, 1).msg, /no se cortan/);
  // redondeo sin puntos: usa el medio
  const g = newDoc();
  const m1 = addLine(g, addPoint(g, -5, 0), addPoint(g, 10, 0), {}), m2 = addLine(g, addPoint(g, 0, -5), addPoint(g, 0, 10), {});
  const r3 = filletBetween(g, { k: 'ln', id: m1 }, { k: 'ln', id: m2 }, 2);
  assert.ok(r3.ok, r3.msg); near(g.pts[g.arcs[r3.arc].c].x, 2, 1e-6); near(g.pts[g.arcs[r3.arc].c].y, 2, 1e-6);
});

t('redondeo: esquina entre un segmento y un arco con una linea constructiva en el mismo punto (plantilla-engranes)', () => {
  const d = newDoc();
  const c = addPoint(d, 2.6310140816402012, -7.1535425526073375);
  d.pts[c].fixed = true;
  const p139 = addPoint(d, 7.801812639149062, 6.393148640361678), p162 = addPoint(d, 5.224571992842092, 7.1126222214740995), p51 = addPoint(d, 5.488359110778653, 8.563613723730201);
  const arc = addArc(d, c, p139, p162, 14.5, { ltype: 'continua' });
  const ln = addLine(d, p51, p162, { ltype: 'continua' });
  const cons = addLine(d, c, p162, { ltype: 'constructiva' });
  addCon(d, { t: 'PONC', refs: [p162, addCircle(d, c, 14.5, { ltype: 'constructiva' })], hidden: true });
  assert.ok(solve(d, []).ok);
  const pair = cornerPair(d, p162);
  assert.deepEqual(pair.map((e) => e.k).sort(), ['ar', 'ln']);
  assert.ok(!pair.some((e) => e.id === cons));
  const r = filletBetween(d, pair[0], pair[1], 0.76);
  assert.ok(r.ok, r.msg);
  assert.ok(solve(d, []).ok);
  const a = d.arcs[r.arc], C = d.pts[a.c];
  near(a.r, 0.76, 1e-6);
  assert.ok(arcOf(d, a).sweep < Math.PI / 2 + 0.2, 'el redondeo es un arco corto, no un lazo'); // 295894d daba un arco de unos 270 grados
  near(Math.hypot(C.x - d.pts[c].x, C.y - d.pts[c].y), 14.5 + 0.76, 1e-4, 'tangente por fuera del arco (el lado del segmento)');
  const L = d.lines[ln], A = d.pts[L.a], B = d.pts[L.b];
  near(Math.abs(((C.x - A.x) * (B.y - A.y) - (C.y - A.y) * (B.x - A.x)) / Math.hypot(B.x - A.x, B.y - A.y)), 0.76, 1e-4);
  // el segmento ya no llega a la esquina, el arco original tampoco
  assert.ok(Math.hypot(d.pts[L.b].x - 5.2246, d.pts[L.b].y - 7.1126) > 0.1 && Math.hypot(d.pts[d.arcs[arc].b].x - 5.2246, d.pts[d.arcs[arc].b].y - 7.1126) > 0.1);
  // el resultado no depende del orden en que se eligen los elementos
  const d3 = JSON.parse(JSON.stringify(d)); void d3;
  const sw = newDoc(), s0 = addPoint(sw, 2.6310140816402012, -7.1535425526073375);
  const s139 = addPoint(sw, 7.801812639149062, 6.393148640361678), s162 = addPoint(sw, 5.224571992842092, 7.1126222214740995), s51 = addPoint(sw, 5.488359110778653, 8.563613723730201);
  const sa = addArc(sw, s0, s139, s162, 14.5, {}), sl = addLine(sw, s51, s162, {});
  const sw2 = JSON.parse(JSON.stringify(sw));
  const o1 = filletBetween(sw, { k: 'ar', id: sa }, { k: 'ln', id: sl }, 0.76), o2 = filletBetween(sw2, { k: 'ln', id: sl }, { k: 'ar', id: sa }, 0.76);
  assert.ok(o1.ok && o2.ok);
  near(sw.pts[sw.arcs[o1.arc].c].x, sw2.pts[sw2.arcs[o2.arc].c].x, 1e-9); near(sw.pts[sw.arcs[o1.arc].c].y, sw2.pts[sw2.arcs[o2.arc].c].y, 1e-9);
  // chaflan en la misma esquina
  const e = newDoc();
  const c2 = addPoint(e, 2.631, -7.1535); e.pts[c2].fixed = true;
  const q139 = addPoint(e, 7.8018, 6.3931), q162 = addPoint(e, 5.2246, 7.1126), q51 = addPoint(e, 5.4884, 8.5636);
  addArc(e, c2, q139, q162, 14.5, {}); addLine(e, q51, q162, {}); addLine(e, c2, q162, { ltype: 'constructiva' });
  const pr = cornerPair(e, q162), ch = chamferBetween(e, pr[0], pr[1], 0.5);
  assert.ok(ch.ok, ch.msg); assert.ok(solve(e, []).ok);
  for (const id of ch.pts) near(Math.hypot(e.pts[id].x - 5.2246, e.pts[id].y - 7.1126), 0.5, 1e-3);
});

t('redondeo: segmento casi tangente a un arco eliptico (pruebas-redondeo.json): el arco menor mas cerca de la esquina, no uno lejano', () => {
  const d = newDoc();
  const c = addPoint(d, -27.7, 13.28125), a = addPoint(d, 1.6, 21.78125), b = addPoint(d, -31.69027118207018, 27.035949486430155);
  const p4 = addPoint(d, -2.4293719594597025, 26.565809404710908), p5 = addPoint(d, -30.458487127618294, 27.380184207826805), p10 = addPoint(d, -2.429, 1.823);
  const el = addEllipse(d, c, a, b, {}, p4, p5);
  addCon(d, { t: 'ANG4', refs: [c, a, c, b], v: 90, hidden: true });
  const ln = addLine(d, p4, p10, {});
  assert.ok(solve(d, []).ok);
  for (const r of [1.5, 3, 6]) {
    const e = JSON.parse(JSON.stringify(d));
    const x = filletBetween(e, { k: 'ln', id: ln }, { k: 'el', id: el }, r), y = filletBetween(JSON.parse(JSON.stringify(d)), { k: 'el', id: el }, { k: 'ln', id: ln }, r);
    assert.ok(x.ok && y.ok, x.msg);
    const C = e.pts[e.arcs[x.arc].c];
    assert.ok(Math.hypot(C.x - d.pts[p4].x, C.y - d.pts[p4].y) < 4 * r, 'cerca de la esquina');
    assert.ok(arcOf(e, e.arcs[x.arc]).sweep < Math.PI, 'arco menor');
  }
});

t('redondeo: las 12 esquinas de pruebas-redondeo.json, por esquina y todas a la vez, sin depender del orden de los elementos', () => {
  const base = JSON.parse(readFileSync(new URL('./fixtures/pruebas-redondeo.json', import.meta.url), 'utf8')).doc;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const labels = Object.values(base.texts).map((x) => x.pt);
  assert.equal(labels.length, 12);
  const dispatch = (d, pid, r) => { const pair = cornerPair(d, pid); if (pair) return filletBetween(d, pair[0], pair[1], r); return filletCorner(d, pid, r); };
  for (const r of [1.5, 4]) {
    for (const pid of labels) {
      const els = cornerElements(base, pid);
      assert.equal(els.length, 2, 'dos elementos en la esquina ' + pid); // la esquina J une dos puntos coincidentes (COI)
      const d = clone(base), d1 = clone(base), d2 = clone(base);
      const res = dispatch(d, pid, r), x = filletBetween(d1, els[0], els[1], r), y = filletBetween(d2, els[1], els[0], r);
      assert.ok(res.ok && x.ok && y.ok, res.msg);
      assert.ok(solve(d, []).ok);
      const C = d.pts[d.arcs[res.arc].c], Cx = d1.pts[d1.arcs[x.arc].c], Cy = d2.pts[d2.arcs[y.arc].c];
      near(Cx.x, Cy.x, 1e-9); near(Cx.y, Cy.y, 1e-9); near(C.x, Cx.x, 1e-9); near(C.y, Cx.y, 1e-9);
      assert.ok(arcOf(d, d.arcs[res.arc]).sweep < Math.PI, 'arco menor');
      assert.ok(Math.hypot(C.x - base.pts[pid].x, C.y - base.pts[pid].y) < 4 * r, 'cerca de la esquina ' + pid);
    }
    const d = clone(base), seen = new Set();
    for (const pid of labels) { if (seen.has(pid)) continue; for (const q of coincidentIds(d, pid)) seen.add(q); assert.ok(dispatch(d, pid, r).ok); }
    assert.ok(solve(d, []).ok, 'todas a la vez');
  }
});

t('rangos: $x:a..b;n$ y $x:a..paso..b$ son vectores', () => {
  const d = newDoc(), P = addPoint(d, 0, 0);
  addText(d, P, '$v:0..1;5$  $w:1..2..10$  $u:10..-3..0$  $s:2*2..3*3;2$', {});
  const vs = varsOf(d);
  assert.deepEqual(vs.v.vec, [0, 0.25, 0.5, 0.75, 1]);
  assert.deepEqual(vs.w.vec, [1, 3, 5, 7, 9]);
  assert.deepEqual(vs.u.vec, [10, 7, 4, 1]);
  assert.deepEqual(vs.s.vec, [4, 9]);
  const o = addText(d, P, 'a $v=$ b $w+1=$ c $w*w=$', {});
  assert.equal(plainText(textValue(d, d.texts[o])), 'a $v=[0, 0.25, 0.5, 0.75, 1]$ b $w+1=[2, 4, 6, 8, 10]$ c $w*w=⚠$'); // un numero se suma a cada elemento; vector por vector (1×5 por 1×5) no cuadra
  const e = newDoc(), Q = addPoint(e, 0, 0);
  addText(e, Q, '$a:1..2..0$  $b:1..0;3.5$  $c:1..2..3..4$  $d:1..0..5$', {});
  assert.equal(Object.keys(varsOf(e)).filter((k) => !k.includes('.')).length, 0);
  assert.equal(textVarErrors(e).length, 4);
});

t('actuadores: MR gira una linea, ML estira entre dos puntos, la simulacion no toca el dibujo', () => {
  const d = newDoc(), a = addPoint(d, 0, 0), b = addPoint(d, 10, 0), l = addLine(d, a, b);
  d.pts[a].fixed = true; addCon(d, { t: 'DIST', refs: [a, b], v: 10 });
  const m = addRotary(d, l, a, { mode: 'disp', expr: '90*t' });
  assert.equal(actName(d.acts[m]), 'MR1');
  const before = JSON.stringify(d);
  const sim = simBegin(d);
  assert.ok(simStep(d, sim, 1, solve).ok);
  assert.ok(Math.abs(d.pts[b].x) < 1e-3 && Math.abs(d.pts[b].y - 10) < 1e-3, 'a 90 grados');
  assert.ok(simStep(d, sim, 2, solve).ok);
  assert.ok(Math.abs(d.pts[b].x + 10) < 1e-3, 'a 180 grados (pasa por varios subpasos)');
  simEnd(d, sim);
  assert.equal(JSON.stringify(d), before, 'el dibujo queda igual');
  // velocidad constante y tabla dan el mismo giro; en sentido horario va al reves
  d.acts[m].mode = 'vel'; d.acts[m].expr = '90'; d.acts[m].cw = true;
  assert.equal(actName(d.acts[m]), 'MR1');
  assert.ok(Math.abs(actDisp(d, d.acts[m], 2) - 180) < 1e-6);
  d.acts[m].src = 'table'; d.acts[m].table = parseTable('0; 90\n4; 90');
  assert.ok(Math.abs(actDisp(d, d.acts[m], 2) - 180) < 1e-6);
  d.acts[m].mode = 'disp'; d.acts[m].table = parseTable('0; 0\n2; 180');
  assert.ok(Math.abs(actDisp(d, d.acts[m], 1) - 90) < 1e-9);
  const s2 = simBegin(d);
  assert.ok(simStep(d, s2, 1, solve).ok);
  assert.ok(Math.abs(d.pts[b].y + 10) < 1e-3, 'horario: hacia abajo');
  simEnd(d, s2);
  // lineal
  const e = newDoc(), p = addPoint(e, 0, 0), q = addPoint(e, 10, 0); e.pts[p].fixed = true;
  addLine(e, p, q); addCon(e, { t: 'AZ', refs: [p, q], v: 0, hidden: true });
  const ml = addLinear(e, p, q, { mode: 'vel', expr: '2' });
  const s3 = simBegin(e);
  assert.ok(simStep(e, s3, 3, solve).ok);
  assert.ok(Math.abs(Math.hypot(e.pts[q].x, e.pts[q].y) - 16) < 1e-3, 'longitud 10 + 2*3');
  simEnd(e, s3);
  assert.equal(actError(e, e.acts[ml]), null);
  e.acts[ml].expr = 'zz+1';
  assert.ok(actError(e, e.acts[ml]));
  deleteItems(d, [{ k: 'ln', id: l }]); // borrar la linea elimina el actuador
  assert.equal(Object.keys(d.acts).length, 0);
});

t('graficas: variable1 vs variable2 con varias series, actuadores y vectores', () => {
  const d = newDoc(), a = addPoint(d, 0, 0), b = addPoint(d, 10, 0), l = addLine(d, a, b);
  d.pts[a].fixed = true; addCon(d, { t: 'DIST', refs: [a, b], v: 10 });
  addRotary(d, l, a, { mode: 'vel', expr: '30' });
  const g = addGraph(d, 0, 0, 100, 60, ['MR1 vs t', 'MR1.v vs t', 'MR1.d vs t']);
  d.tEnd = 4; d.graphs[g].n = 5;
  const r = computeGraph(d, d.graphs[g], solve);
  assert.equal(r.error, null);
  assert.equal(r.series.length, 3);
  assert.deepEqual(r.series[0].pts.map((p) => Math.round(p[1])), [0, 30, 60, 90, 120]);
  assert.ok(r.series[1].pts.every((p) => Math.abs(p[1] - 30) < 1e-3), 'velocidad constante');
  assert.deepEqual(r.series[2].pts, r.series[0].pts);
  assert.equal(JSON.stringify(d.acts).includes('"x"'), false);
  d.graphs[g].series = ['zz vs t'];
  assert.match(computeGraph(d, d.graphs[g], solve).error, /zz/);
  d.graphs[g].series = ['mala'];
  assert.match(computeGraph(d, d.graphs[g], solve).error, /vs/);
  const e = newDoc(), P = addPoint(e, 0, 0);
  addText(e, P, '$x:0..1;3$  $y:0..2..4$  $z:1..2;4$', {});
  const h = addGraph(e, 0, 0, 100, 60, ['y vs x']);
  assert.deepEqual(computeGraph(e, e.graphs[h], solve).series[0].pts, [[0, 0], [0.5, 2], [1, 4]]);
  e.graphs[h].series = ['z vs x'];
  assert.match(computeGraph(e, e.graphs[h], solve).error, /distinto/);
  // un lado con una expresion que da un vector (una funcion propia, «.^», un vector columna) tambien se grafica contra otro vector
  const fv = newDoc(), Q = addPoint(fv, 0, 0);
  addText(fv, Q, '$$x:0..1;3\nf(x):x.^2\nv:[1;2;3]$$', {});
  const k = addGraph(fv, 0, 0, 100, 60, ['f(x) vs x', 'x.^2 vs x', 'v vs v.^2']);
  const rv = computeGraph(fv, fv.graphs[k], solve);
  assert.equal(rv.error, null);
  assert.deepEqual(rv.series.map((s) => s.pts), [[[0, 0], [0.5, 0.25], [1, 1]], [[0, 0], [0.5, 0.25], [1, 1]], [[1, 1], [4, 2], [9, 3]]]);
  // dibujo en radianes (doc.angles): sin(x)./x es la funcion sinc, como en el tutorial; en grados (por defecto) seria sin(x°)/x
  const sc = newDoc(), S0 = addPoint(sc, 0, 0);
  addText(sc, S0, '$$x:1..3;3\nf(x):sin(x)./x$$', {});
  const ks = addGraph(sc, 0, 0, 100, 60, ['f(x) vs x']);
  const ys = (r) => r.series[0].pts.map((q) => Number(q[1].toFixed(4)));
  assert.deepEqual(ys(computeGraph(sc, sc.graphs[ks], solve)), [0.0175, 0.0174, 0.0174]);
  sc.angles = 'rad';
  assert.deepEqual(ys(computeGraph(sc, sc.graphs[ks], solve)), [0.8415, 0.4546, 0.047]);
  // un angulo suelto (con π) se grafica en radianes en un dibujo en radianes, en grados en uno en grados
  addText(sc, S0, '$$a:0..π;3$$', {});
  sc.graphs[ks].series = ['a vs a'];
  assert.deepEqual(computeGraph(sc, sc.graphs[ks], solve).series[0].pts.map((q) => Number(q[0].toFixed(4))), [0, 1.5708, 3.1416]);
  delete sc.angles;
  computeGraph(sc, sc.graphs[ks], solve); // deja el modo en grados para lo que sigue
  // la grafica puede tener su propia opcion (g.angles), por encima de la del documento
  sc.graphs[ks].series = ['sin(x)./x vs x'];
  sc.graphs[ks].angles = 'rad';
  assert.deepEqual(ys(computeGraph(sc, sc.graphs[ks], solve)), [0.8415, 0.4546, 0.047]);
  sc.angles = 'rad'; sc.graphs[ks].angles = 'deg';
  assert.deepEqual(ys(computeGraph(sc, sc.graphs[ks], solve)), [0.0175, 0.0174, 0.0174]);
  delete sc.angles; delete sc.graphs[ks].angles;
  computeGraph(sc, sc.graphs[ks], solve);
  fv.graphs[k].series = ['f(x) vs t'];
  assert.match(computeGraph(fv, fv.graphs[k], solve).error, /otro vector/);
  fv.graphs[k].series = ['x.^2 + [1, 2] vs x'];
  assert.ok(computeGraph(fv, fv.graphs[k], solve).error);
  // con unidades, cada lado se grafica en su unidad (la de la variable, o la del SI con prefijo) y la leyenda la dice
  const fu = newDoc(), U = addPoint(fu, 0, 0);
  addText(fu, U, "$$x:5..10;3'mm\nF:[1,2,3]'kN\nk:2'N/mm\nL:250'mm$$", {});
  const ku = addGraph(fu, 0, 0, 100, 60, ['F vs x', 'k*x vs x', 'F./x vs x', 'L vs t']);
  fu.tEnd = 1; fu.graphs[ku].n = 2;
  const ru = computeGraph(fu, fu.graphs[ku], solve);
  assert.equal(ru.error, null);
  assert.deepEqual(ru.series.map((s) => s.label), ['F (kN) vs x (mm)', 'k*x (N) vs x (mm)', 'F./x (N/m) vs x (mm)', 'L (mm) vs t']);
  assert.deepEqual(ru.series[0].pts, [[5, 1], [7.5, 2], [10, 3]]);
  assert.deepEqual(ru.series[1].pts.map((p) => p.map((v) => Math.round(v * 1e9) / 1e9)), [[5, 10], [7.5, 15], [10, 20]]);
  assert.deepEqual(ru.series[3].pts.map((p) => p[1]), [250, 250]);
  assert.deepEqual(parseSeries('A1  vs  t'), { y: 'A1', x: 't', ax: 'x1', ay: 'y1' });
  const tk = niceTicks(0, 97);
  assert.ok(tk.lo <= 0 && tk.hi >= 97 && tk.ticks.length >= 3);
});

t('notacion punto: p12.x, l1.len, c1.r en formulas, textos, cotas, actuadores y graficas', () => {
  const d = newDoc(), a = addPoint(d, 1, 2), b = addPoint(d, 4, 6), l = addLine(d, a, b), cc = addCircle(d, a, 3);
  const v = varsOf(d);
  assert.equal(v[a + '.x'].v, 1); assert.equal(v[b + '.y'].v, 6);
  assert.equal(v[l + '.len'].v, 5); assert.equal(v[l + '.L'].v, 5);
  assert.ok(v[l + '.ang'].r && Math.abs(v[l + '.ang'].v - Math.atan2(4, 3)) < 1e-12);
  assert.equal(v[cc + '.r'].v, 3); assert.equal(v[cc + '.d'].v, 6); assert.equal(v[cc + '.x'].v, 1);
  assert.equal(evalExpr(`${a}.x + ${b}.x*2`, { vars: v }).value, 9);
  assert.equal(evalExpr(`${l}.len/${cc}.r`, { vars: v }).value, 5 / 3);
  assert.throws(() => evalExpr('p99.x', { vars: v }), /No reconozco/);
  assert.throws(() => evalExpr(`${a}.zz`, { vars: v }), /No reconozco/);
  assert.deepEqual(exprRefs(`${a}.x+1`), [a + '.x']);
  // texto
  const T = addText(d, a, '$' + b + '.x=$ $' + l + '.len=$', {});
  assert.equal(plainText(textValue(d, d.texts[T])), '$' + b + '.x=4$ $' + l + '.len=5$');
  // variable de texto que usa una propiedad
  const T2 = addText(d, a, '$k:' + b + '.y*2$ $k=$', {});
  assert.match(textValue(d, d.texts[T2]), /12/);
  // cota con formula que lee la geometria: D1 = q.x*2
  const e = newDoc(), o = addPoint(e, 0, 0), q = addPoint(e, 3, 0), r = addPoint(e, 3, 5);
  e.pts[o].fixed = true; e.pts[q].fixed = true;
  const h = addCon(e, { t: 'DIST', refs: [o, r], v: 5 });
  e.cons[h].name = 'D1'; e.cons[h].expr = `${q}.x*2`;
  assert.equal(hasReactive(e), true);
  assert.equal(pruneFormulas(e).length, 0);
  const st = settle(e, solve, []);
  assert.ok(st.ok, st.error);
  assert.ok(Math.abs(dimValue(e, e.cons[h]) - 6) < 1e-3);
  // actuador y grafica de una coordenada contra el tiempo
  const f = newDoc(), A = addPoint(f, 0, 0), B = addPoint(f, 10, 0), L = addLine(f, A, B);
  f.pts[A].fixed = true; addCon(f, { t: 'DIST', refs: [A, B], v: 10 });
  addRotary(f, L, A, { mode: 'disp', expr: '9*t' });
  const g = addGraph(f, 0, 0, 100, 60, [B + '.y vs t']);
  f.tEnd = 10; f.graphs[g].n = 3;
  const rr = computeGraph(f, f.graphs[g], solve);
  assert.equal(rr.error, null);
  assert.ok(Math.abs(rr.series[0].pts[2][1] - 10 * Math.sin((90 * Math.PI) / 180)) < 1e-3);
});

t('graficas: el tiempo final es el del documento (doc.tEnd), el mismo del reproductor', () => {
  const d = newDoc(), a = addPoint(d, 0, 0), b = addPoint(d, 10, 0), l = addLine(d, a, b);
  d.pts[a].fixed = true; addCon(d, { t: 'DIST', refs: [a, b], v: 10 });
  addRotary(d, l, a, { mode: 'disp', expr: '10*t' });
  const g = addGraph(d, 0, 0, 100, 60, ['MR1 vs t']);
  d.graphs[g].n = 3;
  d.tEnd = 4;
  assert.equal(computeGraph(d, d.graphs[g], solve).tEnd, 4);
  d.tEnd = 8;
  const r = computeGraph(d, d.graphs[g], solve);
  assert.equal(r.tEnd, 8); assert.equal(Math.round(r.series[0].pts[2][1]), 80);
});


t('graficas: expresiones, ejes secundarios y escalas', () => {
  assert.deepEqual(parseSeries('MR1.v vs t @y2'), { y: 'MR1.v', x: 't', ax: 'x1', ay: 'y2' });
  assert.deepEqual(parseSeries('a/b vs t @ x2, y2'), { y: 'a/b', x: 't', ax: 'x2', ay: 'y2' });
  assert.throws(() => parseSeries('a vs t @z9'), /ejes son/);
  const f = newDoc(), A = addPoint(f, 0, 0), B = addPoint(f, 10, 0), L = addLine(f, A, B);
  f.pts[A].fixed = true; addCon(f, { t: 'DIST', refs: [A, B], v: 10 });
  const m = addRotary(f, L, A, { mode: 'disp', expr: '9*t' });
  const g = addGraph(f, 0, 0, 100, 60, [`${B}.x*2+1 vs t`, `MR1.d-${B}.y vs t @y2`, `${B}.y/${B}.x vs t`, 'q vs t']);
  f.tEnd = 10; f.graphs[g].n = 3;
  assert.match(computeGraph(f, f.graphs[g], solve).error, /No reconozco «q»/);
  f.graphs[g].series.pop();
  const rr = computeGraph(f, f.graphs[g], solve);
  assert.equal(rr.error, null);
  assert.ok(Math.abs(rr.series[0].pts[0][1] - 21) < 1e-6);        // x*2+1 en t=0
  assert.equal(rr.series[1].ay, 'y2');
  assert.ok(Math.abs(rr.series[1].pts[2][1] - (90 - 10)) < 1e-3);  // 90° - y(90°)
  // ejes
  const lg = axisLayout({ scale: 'log', minor: 1 }, 0.5, 700);
  assert.deepEqual(lg.ticks, [0.1, 1, 10, 100, 1000]); assert.ok(lg.minors.includes(20) && lg.f(10) > lg.f(1) && Number.isNaN(lg.f(-1)));
  const fx = axisLayout({ min: 0, max: 10, major: 5, minor: 2 }, 3, 4);
  assert.deepEqual(fx.ticks, [0, 2, 4, 6, 8, 10]); assert.equal(fx.minors.length, 5); assert.equal(fx.f(5), 0.5);
  assert.ok(axisLayout({}, 0, 97).hi >= 97);
});

// computeGraphAsync: mismo resultado que computeGraph, cede el hilo, y se puede cancelar o pausar
{
  const f = newDoc(), A = addPoint(f, 0, 0), B = addPoint(f, 10, 0), L = addLine(f, A, B);
  f.pts[A].fixed = true; addCon(f, { t: 'DIST', refs: [A, B], v: 10 });
  addRotary(f, L, A, { mode: 'disp', expr: '9*t' });
  const g = addGraph(f, 0, 0, 100, 60, [B + '.y vs t']);
  f.tEnd = 10; f.graphs[g].n = 40;
  const sync = computeGraph(f, f.graphs[g], solve);
  let steps = 0, last = 0;
  const asy = await computeGraphAsync(f, f.graphs[g], solve, { onStep: (x) => { steps++; last = x; } });
  assert.deepEqual(asy.series[0].pts, sync.series[0].pts);
  assert.equal(steps, 40); assert.equal(last, 1);
  assert.equal(await computeGraphAsync(f, f.graphs[g], solve, { stale: () => true }), null);
  let waits = 0;
  const rr = await computeGraphAsync(f, f.graphs[g], solve, { busy: () => waits++ < 1 });
  assert.equal(rr.series[0].pts.length, 40);
  passed++; console.log('ok  computeGraphAsync');
}

console.log(`\n${passed} pruebas pasaron`);
