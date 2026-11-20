// Cotas con unidad: el dibujo mide lo real (una longitud en mm, otra magnitud en el SI) y la etiqueta lo dice en la unidad de la cota
// («126'in» mide 3200,4 y dice «126 in»); en las formulas una cota con unidad entra como cantidad, sin la escala.
import assert from 'node:assert/strict';
import { newDoc, addPoint, addLine, addCon, addText } from '../src/model.js';
import { shownText } from '../src/text.js';
import { dimText, dimUnit, dimShown, isScaledDim, layoutDim } from '../src/dims.js';
import { initSolver, solve } from '../src/solver.js';
import { settle, splitUnit, dimEval, varValue, varsList, scaleEval, noScaleWarn, textVarErrors } from '../src/params.js';
import { setDecimal } from '../src/locale.js';
import { evalExpr } from '../src/expr.js';

await initSolver();
setDecimal('.');
let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) <= e, `${a} != ${b}`);
const L = [1, 0, 0, 0, 0, 0, 0];
const vd = (r) => ({ v: r.v, du: r.du });
const clean = (s) => s.replace(/[-]/g, ''); // marcas internas de las salidas (uso privado)

t('splitUnit: la unidad del final se separa; una formula que sigue despues no es unidad', () => {
  assert.deepEqual(splitUnit("126'in"), { body: '126', unit: 'in' });
  assert.deepEqual(splitUnit("D2*2'ft"), { body: 'D2*2', unit: 'ft' });
  assert.deepEqual(splitUnit("3'(m/s)"), { body: '3', unit: 'm/s' });
  assert.deepEqual(splitUnit("9.8'm/s^2"), { body: '9.8', unit: 'm/s^2' });
  assert.equal(splitUnit("2'm*D1"), null);
  assert.equal(splitUnit("D1'mm+D2"), null);
  assert.equal(splitUnit("'in"), null);
  assert.equal(splitUnit('126'), null);
  assert.equal(splitUnit("3'xyz"), null); // unidad que no existe
});

t('dimEval: el dibujo mide lo real y la etiqueta dice la unidad escrita, la de una cota de la formula o la del SI', () => {
  const vars = { D2: { v: 3.2004, d: L, pu: 'in', pf: 0.0254 }, D4: { v: 0.508, d: L, pu: 'in', pf: 0.0254 }, D1: { v: 50 } };
  assert.deepEqual(vd(dimEval("126'in", vars)), { v: 3200.4, du: 'in' });
  assert.deepEqual(vd(dimEval('126', vars)), { v: 126, du: null });
  assert.deepEqual(vd(dimEval("2'cm", vars)), { v: 20, du: 'cm' }); // como siempre: 2 cm miden 20
  assert.deepEqual(vd(dimEval("12'V", vars)), { v: 12, du: 'V' }); // otra magnitud: en el SI
  assert.deepEqual(vd(dimEval("5'kN", vars)), { v: 5000, du: 'kN' });
  assert.deepEqual(vd(dimEval('D2*2', vars)), { v: 6400.8, du: 'in' }); // la unidad de D2
  assert.deepEqual(vd(dimEval("D2*2'ft", vars)), { v: 6400.8, du: 'ft' }); // ya trae unidades: solo dice en cual mostrarla
  assert.deepEqual(vd(dimEval("D1'mm+D2", vars)), { v: 3250.4, du: 'in' });
  assert.deepEqual(vd(dimEval('D1+3', vars)), { v: 53, du: null }); // sin unidades, un numero como siempre
  assert.throws(() => dimEval('D1+D2', vars)); // numero mas longitud
});

const mkLine = (len, extra) => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, len, 0);
  addLine(d, a, b, {});
  const k = addCon(d, { t: 'DIST', refs: [a, b], v: len, ...extra });
  return { d, a, b, k };
};

t("una cota «126'in» mide 3200,4 y dice «126 in»; con [*k] el dibujo cambia y la cota sigue diciendo 126 in", () => {
  const { d, k, a, b } = mkLine(100, { expr: "126'in" });
  assert.ok(settle(d, solve, []).ok);
  near(Math.hypot(d.pts[b].x - d.pts[a].x, d.pts[b].y - d.pts[a].y), 3200.4, 1e-4);
  assert.equal(d.cons[k].du, 'in');
  assert.equal(dimText(d, d.cons[k]), '126 in');
  const s = mkLine(100, { expr: "126'in", scale: 1 / 25.4 });
  assert.ok(settle(s.d, solve, []).ok);
  near(Math.hypot(s.d.pts[s.b].x - s.d.pts[s.a].x, s.d.pts[s.b].y - s.d.pts[s.a].y), 126, 1e-4); // a escala: 126 unidades
  assert.equal(dimText(s.d, s.d.cons[s.k]), '126 in');
});

t('en las formulas una cota con unidad entra como cantidad (sin la escala); su area sale en m²', () => {
  const d = newDoc();
  const p = [addPoint(d, 0, 0), addPoint(d, 100, 0), addPoint(d, 0, 50), addPoint(d, 100, 50)];
  addLine(d, p[0], p[1], {}); addLine(d, p[2], p[3], {});
  const k2 = addCon(d, { t: 'DIST', refs: [p[0], p[1]], v: 100, expr: "126'in", scale: 0.1 });
  const k4 = addCon(d, { t: 'DIST', refs: [p[2], p[3]], v: 50, expr: "20'in" });
  assert.ok(settle(d, solve, []).ok);
  const v2 = varValue(d, d.cons[k2]);
  near(v2.v, 3.2004); assert.deepEqual(v2.d, L); assert.equal(v2.pu, 'in');
  const n2 = d.cons[k2].name, n4 = d.cons[k4].name;
  const area = dimEval(`${n2}*${n4}`, { [n2]: v2, [n4]: varValue(d, d.cons[k4]) });
  near(area.v, 3.2004 * 0.508); assert.equal(area.du, 'm²');
  assert.match(varsList(d), new RegExp(`${n2} = 126 in`));
});

t('una cota de solo lectura con unidad dice la medida en ella; sin unidad, todo como antes', () => {
  const { d, k } = mkLine(254, { ref: true, du: 'in' });
  near(dimShown(d, d.cons[k]), 10);
  assert.equal(dimText(d, d.cons[k]), '10 in');
  const o = mkLine(254, {});
  assert.equal(dimText(o.d, o.d.cons[o.k]), '254');
  assert.deepEqual(varValue(o.d, o.d.cons[o.k]), { v: 254, r: false });
  assert.equal(dimUnit('xyz'), null); assert.equal(dimUnit('in').g, 25.4); assert.equal(dimUnit('V').g, 1);
});

t('escala con unidades: la magnitud por la escala da la longitud del dibujo y la cota no va subrayada', () => {
  const F = dimEval("30'kN", {}).d;
  assert.deepEqual(scaleEval("1'mm/kN", {}, F), { sc: 0.001, rep: true });
  assert.deepEqual(scaleEval("1'(mm/kN)", {}, F), { sc: 0.001, rep: true });
  assert.deepEqual(scaleEval('10', {}, F), { sc: 10, rep: false }); // sin unidades: fuera de escala, como siempre
  assert.throws(() => scaleEval("2'mm", {}, F), /no una longitud/); // kN por mm no es una longitud
  assert.deepEqual(scaleEval("2'mm", {}, undefined), { sc: 2, rep: true }); // un numero por mm, si
  assert.ok(noScaleWarn(F, 'kN', 30000, false)); assert.equal(noScaleWarn(F, 'kN', 30, true), null); assert.equal(noScaleWarn(L, 'in', 30, false), null);
  const { d, k, a, b } = mkLine(10, { expr: "30'kN", scaleExpr: "1'mm/kN" });
  assert.ok(settle(d, solve, []).ok);
  near(Math.hypot(d.pts[b].x - d.pts[a].x, d.pts[b].y - d.pts[a].y), 30, 1e-4);
  const q = d.cons[k];
  assert.equal(q.srep, true); assert.equal(isScaledDim(q), false); assert.equal(dimText(d, q), '30 kN');
  assert.equal(layoutDim(d, q, { s: 5, ox: 0, oy: 0 }).label.underline, false);
  const v = varValue(d, q); near(v.v, 30000); assert.equal(v.pu, 'kN'); // en las formulas: 30 kN
});

t('solo lectura con unidad de otra magnitud: sin escala con unidades dice ⚠; con ella, la medida entre la escala', () => {
  const { d, k } = mkLine(45, { ref: true, du: 'kN' });
  assert.equal(dimText(d, d.cons[k]), '⚠ kN');
  d.cons[k].scaleExpr = "1'mm/kN";
  assert.ok(settle(d, solve, []).ok); // las escalas de solo lectura se recalculan
  assert.equal(d.cons[k].srep, true); assert.equal(dimText(d, d.cons[k]), '45 kN');
  near(varValue(d, d.cons[k]).v, 45000);
  d.cons[k].scaleExpr = "1'mm"; settle(d, solve, []);
  assert.ok(d.cons[k].serr); assert.equal(dimText(d, d.cons[k]), '⚠ kN');
});

t('sistema de unidades del documento: decide la unidad de las salidas sin unidad pedida; la etiqueta de la cota no manda', () => {
  const { d, k } = mkLine(100, { expr: "126'in", scale: 1 / 25.4 });
  addText(d, addPoint(d, 0, -50), "$D1=$\n$F:30'kN$\n$M:F*D1=$\n$d:5'cm$\n$d=$\n$A:d^2=$\n$D1='in$", {});
  assert.ok(settle(d, solve, []).ok);
  const tx = Object.values(d.texts)[0];
  assert.equal(dimText(d, d.cons[k]), '126 in'); // la etiqueta no cambia
  assert.equal(clean(shownText(d, tx).text), "$D1=3.2 \" m\"$\n$F:=30 \" kN\"$\n$M:=F*D1=96.012 \" kN·m\"$\n$d:=5 \" cm\"$\n$d=5 \" cm\"$\n$A:=d^2=2500 \" mm²\"$\n$D1=126 \" in\"$");
  d.units = 'US';
  assert.equal(clean(shownText(d, tx).text), "$D1=126 \" in\"$\n$F:=30 \" kN\"$\n$M:=F*D1=849.778 \" kip·in\"$\n$d:=5 \" cm\"$\n$d=5 \" cm\"$\n$A:=d^2=3.875 \" in²\"$\n$D1=126 \" in\"$");
  delete d.units; shownText(d, tx); // deja el SI activo para lo que siga
});

t('el 0 sin unidades vale con cualquier unidad: se compara, se suma y va en una matriz; otro numero no', () => {
  const vars = { x: { v: 0.508, d: L } };
  const e = (s) => evalExpr(s, { vars, allowMat: true });
  assert.equal(e('x>0').value, 1); assert.equal(e('0<x').value, 1); assert.equal(e('x<=0').value, 0);
  assert.deepEqual(e('x+0').dim, L); assert.deepEqual(e('0-x').dim, L);
  assert.deepEqual(e('[0, x]').dim, L); assert.deepEqual(e('[x, 0]').dim, L); assert.deepEqual(e('[0; 0; x]').dim, L);
  assert.deepEqual(e('if(x>0; x; 0)').dim, L);
  assert.throws(() => e('x+1')); assert.throws(() => e('x>1')); assert.throws(() => e('[1, x]')); assert.throws(() => e('[0, x, 1]'));
});

t('clear(): una cota o un vector debajo de clear(eF) ya no ve la escala; encima si', () => {
  const mk = (clearY) => {
    const r = mkLine(30, { ref: true, du: 'kN', scaleExpr: 'eF' });
    addText(r.d, addPoint(r.d, 0, 80), "$eF:1'mm/kN$", {});
    addText(r.d, addPoint(r.d, 0, clearY), '$clear(eF)=$', {});
    assert.ok(settle(r.d, solve, []).ok);
    return r;
  };
  const below = mk(-80); // clear despues de la cota: no la afecta
  assert.equal(dimText(below.d, below.d.cons[below.k]), '30 kN');
  assert.equal(clean(shownText(below.d, Object.values(below.d.texts)[1]).text), '$clear(eF)=1$');
  const above = mk(40); // clear antes de la cota: la escala ya no existe ahi
  assert.equal(dimText(above.d, above.d.cons[above.k]), '⚠ kN');
  const drv = mkLine(30, { expr: "30'kN", scaleExpr: 'eF' });
  addText(drv.d, addPoint(drv.d, 0, 80), "$eF:1'mm/kN$", {});
  addText(drv.d, addPoint(drv.d, 0, 40), '$clear(eF)=$', {});
  const r = settle(drv.d, solve, []);
  assert.equal(r.ok, false); assert.match(r.error, /se borró con clear/);
});

t('unidades de usuario: valen en todo el dibujo, una sola unidad nueva por linea, sin redefinir las que existen', () => {
  const page = (...texts) => {
    const d = newDoc();
    texts.forEach((x, i) => addText(d, addPoint(d, 0, -10 * i), '$$' + x + '$$', {}));
    return { d, show: () => Object.values(d.texts).map((t) => clean(shownText(d, t).text)), errs: () => textVarErrors(d).map((e) => e.msg) };
  };
  const a = page("1'vuelta:2π'rad", "a:0.25'vuelta\nsin(a)=\na='deg");
  assert.deepEqual(a.show()[1], "$$a:=0.25 \" vuelta\"\nsin(a)=1\na=90 \" deg\"$$"); assert.deepEqual(a.errs(), []);
  const b = page("x:2'persona\nx='m", "1.70'm:1'persona"); // la definicion puede estar despues: vale en todo el dibujo
  assert.equal(b.show()[0], "$$x:=2 \" persona\"\nx=3.4 \" m\"$$");
  const c = page("1'persona:'persona", "c:5'kg/persona\ng:3'persona\nc*g=\ng+1=");
  assert.equal(c.show()[1], "$$c:=5 \" kg/persona\"\ng:=3 \" persona\"\nc*g=15 \" kg\"\ng+1=⚠$$"); // magnitud nueva: no se mezcla
  const e = page("1'in:30'mm", "1'mm:'mm");
  assert.ok(e.show()[0].includes('⚠') && e.show()[1].includes('⚠')); assert.equal(e.errs().length, 2);
  const f = page("1'persona:'persona", "1.70'm:1'persona"); // la misma unidad dos veces: ninguna vale
  assert.ok(f.errs().every((m) => /más de una vez/.test(m))); assert.equal(f.errs().length, 2);
  const g = page("2'caja:1'paq", "1'paq:6'u_x", "1'u_x:'u_x", "q:1'caja\nq='u_x"); // en cadena, en cualquier orden
  assert.equal(g.show()[3], "$$q:=1 \" caja\"\nq=3 \" u_x\"$$");
  // una cota en una unidad de usuario: longitud en mm, otra magnitud en el SI
  const h = page("1.70'm:1'persona");
  const p0 = addPoint(h.d, 0, 50), p1 = addPoint(h.d, 10, 50); addLine(h.d, p0, p1, {});
  const k = addCon(h.d, { t: 'DIST', refs: [p0, p1], v: 10, expr: "2'persona" });
  assert.ok(settle(h.d, solve, []).ok);
  near(h.d.pts[p1].x - h.d.pts[p0].x, 3400, 1e-6); assert.equal(dimText(h.d, h.d.cons[k]), '2 persona');
  newDoc(); shownText(newDoc(), { text: '' }); // deja el registro sin unidades de usuario para lo que siga
});

console.log(`\n${passed} pruebas de cotas con unidad pasaron`);
