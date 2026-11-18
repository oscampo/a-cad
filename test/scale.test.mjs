// Cotas a escala: «valor[*k]» (el dibujo mide valor por k; la cota dice valor y va subrayada, ISO 129) y la entrada de texto matematica.
import assert from 'node:assert/strict';
import { newDoc, addPoint, addLine, addCon } from '../src/model.js';
import { dimText, dimScale, dimValue, isScaledDim, splitScale, layoutDim } from '../src/dims.js';
import { exportSVG, exportDXF } from '../src/export.js';
import { initSolver, solve } from '../src/solver.js';
import { settle } from '../src/params.js';

await initSolver();
let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) <= e, `${a} != ${b}`);

t('splitScale: valor[*k] se separa (k numero o formula); sin corchetes no cambia; escalas invalidas dan error', () => {
  assert.deepEqual(splitScale('4[*10]'), { body: '4', src: '10', scale: 10 });
  assert.deepEqual(splitScale('4[*0.1]'), { body: '4', src: '0.1', scale: 0.1 });
  assert.deepEqual(splitScale('2*D1 + 1 [ * 25 ]'), { body: '2*D1 + 1', src: '25', scale: 25 });
  assert.deepEqual(splitScale('4[*0,5]'), { body: '4', src: '0,5', scale: 0.5 });
  assert.deepEqual(splitScale('30[*k]'), { body: '30', src: 'k' }); // formula: la evalua quien llama, con sus variables
  assert.deepEqual(splitScale('30[* 2*D1 ]'), { body: '30', src: '2*D1' });
  assert.deepEqual(splitScale('3+4'), { body: '3+4' });
  assert.deepEqual(splitScale('[1,2]'), { body: '[1,2]' }); // una matriz no es una escala
  for (const bad of ['4[*0]', '4[*-2]', '4[*]']) assert.ok(splitScale(bad).err, bad);
});

const mkLine = (len) => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, len, 0);
  const l = addLine(d, a, b, {});
  const k = addCon(d, { t: 'DIST', refs: [a, b], v: len });
  return { d, a, b, l, k };
};

t('la cota a escala dice el valor y el dibujo mide valor por k', () => {
  const { d, k } = mkLine(40);
  d.cons[k].v = 40; d.cons[k].scale = 10; // 4[*10]
  assert.equal(dimText(d, d.cons[k]), '4');
  assert.equal(dimScale(d.cons[k]), 10); assert.ok(isScaledDim(d.cons[k]));
  assert.equal(layoutDim(d, d.cons[k], { s: 5, ox: 0, oy: 0 }).label.underline, true);
  const s = mkLine(0.4); s.d.cons[s.k].scale = 0.1; // 4[*0.1]: dibujo de 0.4 unidades, cota 4
  assert.equal(dimText(s.d, s.d.cons[s.k]), '4');
});

t('sin escala (o escala 1) la cota es la de siempre y no se subraya; los angulos nunca llevan escala', () => {
  const { d, k } = mkLine(40);
  assert.equal(dimText(d, d.cons[k]), '40'); assert.equal(isScaledDim(d.cons[k]), false);
  assert.equal(layoutDim(d, d.cons[k], { s: 5, ox: 0, oy: 0 }).label.underline, false);
  d.cons[k].scale = 1; assert.equal(isScaledDim(d.cons[k]), false);
  assert.equal(dimScale({ t: 'ANG', scale: 10 }), 1);
});

t('el solver respeta la longitud del dibujo, y la formula de una cota a escala se multiplica por su escala', () => {
  const { d, a, b, k } = mkLine(40);
  d.cons[k].scale = 10;
  assert.ok(settle(d, solve, []).ok);
  near(Math.hypot(d.pts[b].x - d.pts[a].x, d.pts[b].y - d.pts[a].y), 40);
  assert.equal(dimText(d, d.cons[k]), '4');
  // D1 = 10 (sin escala); D2 = D1/2 con escala 10: el valor «5» por 10 = 50 de dibujo, y la cota dice «5»
  const e = newDoc();
  const p = [addPoint(e, 0, 0), addPoint(e, 10, 0), addPoint(e, 0, 5), addPoint(e, 20, 5)];
  addLine(e, p[0], p[1], {}); addLine(e, p[2], p[3], {});
  const k1 = addCon(e, { t: 'DIST', refs: [p[0], p[1]], v: 10, name: 'D1' });
  const k2 = addCon(e, { t: 'DIST', refs: [p[2], p[3]], v: 20, name: 'D2', expr: 'D1/2', scale: 10 });
  const r = settle(e, solve, []);
  assert.ok(r.ok, r.error);
  near(e.cons[k2].v, 50);
  near(Math.hypot(e.pts[p[3]].x - e.pts[p[2]].x, e.pts[p[3]].y - e.pts[p[2]].y), 50);
  assert.equal(dimText(e, e.cons[k2]), '5');
  e.cons[k1].v = 20; // al cambiar D1, D2 sigue la formula: 20/2 = 10, por 10 = 100
  assert.ok(settle(e, solve, []).ok);
  near(e.cons[k2].v, 100);
  assert.equal(dimText(e, e.cons[k2]), '10');
});

t('cota de solo lectura a escala: la cota dice la medida entre la escala (subrayada)', () => {
  const { d, k } = mkLine(13.333);
  d.cons[k].ref = true; d.cons[k].scale = 10;
  assert.equal(dimText(d, d.cons[k]), '1.333');
  assert.equal(layoutDim(d, d.cons[k], { s: 5, ox: 0, oy: 0 }).label.underline, true);
  assert.equal(layoutDim(d, d.cons[k], { s: 5, ox: 0, oy: 0 }).label.italic, true); // y sigue en cursiva
  assert.ok(settle(d, solve, []).ok);
  near(dimValue(d, d.cons[k]), 13.333); // no restringe: mide
});

t('escala con formula: «30[*k]» sigue a la variable $k:25$ y recalcula el dibujo', () => {
  const { d, a, b, k } = mkLine(750);
  d.texts.t1 = { pt: a, text: '$k:25$', h: 1, ang: 0, anchor: 'bl', color: 'auto', readable: true };
  Object.assign(d.cons[k], { name: 'D1', expr: '30', scale: 25, scaleExpr: 'k' });
  const r = settle(d, solve, []);
  assert.ok(r.ok, r.error);
  near(d.cons[k].v, 750); assert.equal(dimText(d, d.cons[k]), '30');
  d.texts.t1.text = '$k:10$'; // la escala cambia: el valor (30) no, el dibujo si
  assert.ok(settle(d, solve, []).ok);
  near(d.cons[k].scale, 10); near(d.cons[k].v, 300); assert.equal(dimText(d, d.cons[k]), '30');
  near(Math.hypot(d.pts[b].x - d.pts[a].x, d.pts[b].y - d.pts[a].y), 300);
  d.texts.t1.text = '$k:-1$'; // escala invalida: se rechaza y no se toca nada
  const bad = settle(d, solve, []);
  assert.equal(bad.ok, false); assert.match(bad.error, /escala/);
});

t('SVG y DXF: la cota a escala sale subrayada', () => {
  const { d, k } = mkLine(40);
  d.cons[k].scale = 10;
  const svg = exportSVG(d, 1, {});
  assert.match(svg, /text-decoration="underline"[^>]*>4<\/text>/);
  const dxf = exportDXF(d, 5, {});
  assert.ok(dxf.includes('%%u4'), 'DXF con %%u');
  const plain = mkLine(40);
  assert.ok(!/text-decoration="underline"/.test(exportSVG(plain.d, 1, {})));
});

console.log(`\n${passed} pruebas de cotas a escala pasaron`);
