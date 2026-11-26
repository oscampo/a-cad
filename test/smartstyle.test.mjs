// SmartStyle: una propiedad se escribe solo en los elementos de la seleccion a los que aplica.
import assert from 'node:assert/strict';
import { newDoc, addPoint, addLine, addCircle, addText, addCon, addLayer } from '../src/model.js';
import { STYLE_PROPS, styleObjects, targetsOf, styleState, applyStyleProp, kindsOf, applyLayer, layerState, layerObjects } from '../src/smartstyle.js';
import { CLINE_STYLE } from '../src/shapes.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };

// Un dibujo con un elemento de cada tipo con estilo
function mixto() {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 10, 0), c = addPoint(d, 5, 5), tp = addPoint(d, 20, 20);
  const ln = addLine(d, a, b, { color: '#ff0000', ltype: 'oculta', w: 3.5, ls: 1 });
  const ci = addCircle(d, c, 3, { color: '#00ff00', ltype: 'continua', w: 2, ls: 1 });
  const tx = addText(d, tp, 'hola', { h: 4, color: '#0000ff', font: 'serif' });
  d.hatches.h1 = { ids: [ci], kind: 'lines', angle: 45, spacing: 8, alpha: 0.4, color: 'auto' };
  const sel = [{ k: 'ln', id: ln }, { k: 'ci', id: ci }, { k: 'tx', id: tx }, { k: 'ha', id: 'h1' }, { k: 'pt', id: a }];
  return { d, ln, ci, tx, sel };
}

t('el color llega a lineas, circulos, textos y rellenos; el punto suelto no tiene estilo', () => {
  const { d, ln, ci, tx, sel } = mixto();
  assert.equal(applyStyleProp(d, sel, 'color', '#123456'), 4);
  assert.equal(d.lines[ln].color, '#123456'); assert.equal(d.circles[ci].color, '#123456');
  assert.equal(d.texts[tx].color, '#123456'); assert.equal(d.hatches.h1.color, '#123456');
});

t('el tipo de linea y el grosor no tocan ni el texto ni el relleno', () => {
  const { d, ln, ci, tx, sel } = mixto();
  const antes = JSON.stringify([d.texts[tx], d.hatches.h1]);
  assert.equal(applyStyleProp(d, sel, 'ltype', 'eje'), 2);
  assert.equal(d.lines[ln].ltype, 'eje'); assert.equal(d.circles[ci].ltype, 'eje');
  assert.equal(applyStyleProp(d, sel, 'w', 1), 2);
  assert.equal(applyStyleProp(d, sel, 'ls', 2), 2);
  assert.equal(JSON.stringify([d.texts[tx], d.hatches.h1]), antes, 'el texto y el relleno quedan como estaban');
  assert.equal('ltype' in d.texts[tx], false);
});

t('la fuente y la altura solo aplican al texto', () => {
  const { d, ln, ci, tx, sel } = mixto();
  assert.equal(applyStyleProp(d, sel, 'font', 'monospace'), 1);
  assert.equal(applyStyleProp(d, sel, 'h', 7), 1);
  assert.equal(d.texts[tx].font, 'monospace'); assert.equal(d.texts[tx].h, 7);
  assert.equal('font' in d.lines[ln] || 'h' in d.lines[ln] || 'font' in d.circles[ci] || 'h' in d.circles[ci], false);
});

t('una seleccion sin nadie a quien aplicarle la propiedad no cambia nada', () => {
  const { d, tx } = mixto();
  assert.equal(applyStyleProp(d, [{ k: 'tx', id: tx }], 'ltype', 'eje'), 0);
  assert.equal(applyStyleProp(d, [], 'color', '#fff'), 0);
  assert.equal(applyStyleProp(d, [{ k: 'pt', id: 'p1' }], 'color', '#fff'), 0, 'un punto suelto no tiene estilo');
});

t('«constructiva» toma su color y grosor solo en los gráficos; el texto sigue con lo suyo', () => {
  const { d, ln, ci, tx, sel } = mixto();
  applyStyleProp(d, sel, 'ltype', 'constructiva');
  for (const o of [d.lines[ln], d.circles[ci]]) { assert.equal(o.ltype, 'constructiva'); assert.equal(o.color, CLINE_STYLE.color); assert.equal(o.w, CLINE_STYLE.w); }
  assert.equal(d.texts[tx].color, '#0000ff');
});

t('valores mixtos: la propiedad dice si todos la tienen igual', () => {
  const { d, tx, sel } = mixto();
  const c = styleState(d, sel, 'color');
  assert.equal(c.n, 4); assert.equal(c.mixed, true);
  applyStyleProp(d, sel, 'color', '#abcdef');
  const c2 = styleState(d, sel, 'color');
  assert.equal(c2.mixed, false); assert.equal(c2.value, '#abcdef');
  assert.deepEqual(styleState(d, sel, 'font'), { n: 1, mixed: false, value: 'serif' });
  assert.equal(styleState(d, [{ k: 'tx', id: tx }], 'w').n, 0, 'el texto no tiene grosor: no aplica');
});

t('lo que no trae la propiedad cuenta como su valor por omisión al comparar', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 1, 0), c = addPoint(d, 2, 0);
  const l1 = addLine(d, a, b, {}), l2 = addLine(d, b, c, { ltype: 'continua', w: 2, color: 'auto' });
  assert.equal(styleState(d, [{ k: 'ln', id: l1 }, { k: 'ln', id: l2 }], 'ltype').mixed, false);
  assert.equal(styleState(d, [{ k: 'ln', id: l1 }, { k: 'ln', id: l2 }], 'color').mixed, false);
});

t('una linea indicativa con cuerpo recibe el estilo en su cuerpo; un trazado, en el suyo', () => {
  const d = newDoc();
  const a = addPoint(d, 0, 0), b = addPoint(d, 10, 0), tip = addPoint(d, 5, 5);
  const body = addLine(d, a, b, { color: 'auto', ltype: 'continua', w: 2, ls: 1 });
  const k = addCon(d, { t: 'LEAD', refs: [tip, body], on: true });
  assert.equal(styleObjects(d, [{ k: 'co', id: k }])[0].obj, d.lines[body]);
  assert.equal(applyStyleProp(d, [{ k: 'co', id: k }], 'w', 3.5), 1);
  assert.equal(d.lines[body].w, 3.5);
  d.traces[tip] = { color: 'auto', ltype: 'continua', w: 2 };
  assert.equal(applyStyleProp(d, [{ k: 'pt', id: tip }], 'color', '#fa0'), 1);
  assert.equal(d.traces[tip].color, '#fa0');
  assert.equal(applyStyleProp(d, [{ k: 'co', id: addCon(d, { t: 'DIST', refs: [a, b], v: 10 }) }], 'color', '#fff'), 0, 'una cota no es de estas propiedades');
});

t('kindsOf dice que tipos hay en la seleccion', () => {
  const { d, sel } = mixto();
  assert.deepEqual([...kindsOf(d, sel)].sort(), ['ci', 'ha', 'ln', 'tx']);
});

t('la tabla cubre todos los tipos de elemento del dibujo: uno nuevo obliga a decidir que propiedades le tocan', () => {
  const d = newDoc();
  const SIN_ESTILO = ['pts', 'cons', 'ltypes', 'cn', 'layers', 'traces']; // puntos, relaciones, y los registros del propio dibujo; el trazado entra por su punto
  const CON_ESTILO = { lines: 'ln', circles: 'ci', arcs: 'ar', ellipses: 'el', texts: 'tx', splines: 'sp', hatches: 'ha' };
  for (const [key, v] of Object.entries(d)) {
    if (typeof v !== 'object' || v === null) continue;
    assert.ok(SIN_ESTILO.includes(key) || CON_ESTILO[key], `el tipo «${key}» del dibujo no esta en SmartStyle: decide si tiene estilo y a que propiedades aplica`);
  }
  for (const kind of Object.values(CON_ESTILO)) assert.ok(Object.values(STYLE_PROPS).some((ks) => ks.includes(kind)), `«${kind}» no aplica a ninguna propiedad`);
});

// ---- Capa
t('capa: se asigna a lineas, circulos, textos, rellenos y cotas; un punto suelto no la lleva', () => {
  const { d, ln, ci, tx, sel } = mixto();
  const y = addLayer(d, 'Cotas');
  const dim = addCon(d, { t: 'DIST', refs: Object.keys(d.pts).slice(0, 2), v: 10 });
  const all = [...sel, { k: 'co', id: dim }];
  assert.equal(applyLayer(d, all, y), 5);
  for (const o of [d.lines[ln], d.circles[ci], d.texts[tx], d.hatches.h1, d.cons[dim]]) assert.equal(o.layer, y);
  assert.equal(Object.values(d.pts).some((p) => p.layer), false);
});

t('capa: estado de la seleccion (una, varias, ninguna) y quitar la capa', () => {
  const { d, ln, ci, sel } = mixto();
  const y1 = addLayer(d, 'A'), y2 = addLayer(d, 'B');
  assert.deepEqual(layerState(d, sel), { n: 4, mixed: false, value: '' });
  applyLayer(d, [{ k: 'ln', id: ln }], y1);
  applyLayer(d, [{ k: 'ci', id: ci }], y2);
  assert.equal(layerState(d, sel).mixed, true);
  assert.equal(layerState(d, [{ k: 'ln', id: ln }]).value, y1);
  applyLayer(d, sel, '');
  assert.equal(d.lines[ln].layer, undefined);
  assert.equal(layerState(d, sel).mixed, false);
});

t('capa: una capa que no existe no se asigna; una restriccion que no es cota no entra', () => {
  const { d, ln } = mixto();
  assert.equal(applyLayer(d, [{ k: 'ln', id: ln }], 'y99'), 0);
  assert.equal(d.lines[ln].layer, undefined);
  const k = addCon(d, { t: 'H', refs: [ln] });
  assert.equal(layerObjects(d, [{ k: 'co', id: k }]).length, 0);
});

console.log(`${passed} pruebas de SmartStyle`);
