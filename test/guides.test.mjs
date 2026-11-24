// Guias por tarea (docs/guias.md): sus dibujos de ejemplo (ejemplos/guias/) se abren, se resuelven y hacen lo que la guia dice; y cada ejemplo que
// nombra el manual existe (en español y en ingles) y la app puede abrirlo.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { initSolver, solve } from '../src/solver.js';
import { settle, textVarErrors } from '../src/params.js';
import { shownText } from '../src/text.js';
import { ensureNumbers } from '../src/model.js';
import { simBegin, simStep, simEnd } from '../src/actuators.js';
import { vecEnds } from '../src/vectors.js';
import { laserClasses } from '../src/export.js';
import { EXAMPLE_NAMES } from '../tools/build-guide-examples.mjs';
import { viewNeeds } from '../src/examples.js';

await initSolver();
let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const root = new URL('../', import.meta.url);
const load = (name, lang = 'es') => { const d = JSON.parse(readFileSync(new URL(`ejemplos/guias/${name}${lang === 'en' ? '.en' : ''}.json`, root), 'utf8')).doc; ensureNumbers(d); return d; };
const dims = (d) => Object.values(d.cons).filter((k) => k.t === 'DIST' || k.t === 'RAD');

t('cada ejemplo existe en español y en ingles, se abre, se resuelve y no tiene errores de calculo', () => {
  assert.ok(EXAMPLE_NAMES.length >= 6);
  for (const name of EXAMPLE_NAMES) for (const lang of ['es', 'en']) {
    const d = load(name, lang);
    assert.ok(Object.keys(d.texts).length > 0, `${name} (${lang}) sin textos de ayuda`);
    assert.equal(settle(d, solve, []).ok !== false, true, `${name} (${lang}) no se resuelve`);
    assert.deepEqual(textVarErrors(d), [], `${name} (${lang}) tiene errores de calculo`);
  }
  assert.notEqual(JSON.stringify(load('pieza-parametrica').texts), JSON.stringify(load('pieza-parametrica', 'en').texts)); // el ingles lleva sus textos
});

t('cada ejemplo declara lo que hay que encender en Vista para ver lo que la guia nombra (cotas, restricciones, textos)', () => {
  for (const name of EXAMPLE_NAMES) for (const lang of ['es', 'en']) {
    const j = JSON.parse(readFileSync(new URL(`ejemplos/guias/${name}${lang === 'en' ? '.en' : ''}.json`, root), 'utf8'));
    const want = viewNeeds(j.doc, { points: !!j.view.pts });
    assert.deepEqual(j.view, want, `${name} (${lang}): view no coincide con lo que el dibujo muestra`);
    assert.ok(Object.keys(j.view).every((k) => ['texts', 'dims', 'cons', 'pts'].includes(k)));
  }
  assert.deepEqual(viewNeeds({ texts: {}, cons: { k1: { t: 'DIST' }, k2: { t: 'H' }, k3: { t: 'MID', hidden: true } } }), { dims: true, cons: true }); // las ocultas no cuentan, y sin textos no se pide ver textos
  assert.deepEqual(viewNeeds({ texts: { t1: {} }, cons: {} }), { texts: true });
  assert.deepEqual(viewNeeds({ texts: {}, cons: {} }, { points: true }), { pts: true });
});

t('pieza parametrica: el agujero queda en el centro y su diametro sigue al alto (D2/3)', () => {
  const d = load('pieza-parametrica');
  const [c] = Object.values(d.circles), P = d.pts[c.c];
  assert.deepEqual([P.x, P.y, c.r], [50, 30, 10]);
  const alto = dims(d).find((k) => k.name === 'D2');
  alto.v = 90; assert.ok(settle(d, solve, [alto]).ok !== false);
  assert.ok(Math.abs(d.circles[Object.keys(d.circles)[0]].r - 15) < 1e-6, 'con alto 90 el diametro es 30 (radio 15)');
  const cc = d.pts[c.c]; assert.ok(Math.abs(cc.x - 50) < 1e-6 && Math.abs(cc.y - 45) < 1e-6, 'el agujero sigue en el centro');
});

t('calculo y cotas: las cotas leen los textos (ancho, alto) y el area se calcula', () => {
  const d = load('calculo-y-cotas');
  const [w, h] = dims(d);
  assert.deepEqual([w.v, h.v], [120, 60]);
  const area = Object.values(d.texts).map((x) => shownText(d, x).text).find((s) => s.includes('area'));
  assert.match(area, /7200/);
  const t0 = Object.values(d.texts).find((x) => x.text === '$$ancho:120$$'); t0.text = '$$ancho:200$$';
  settle(d, solve, []);
  assert.deepEqual([dims(d)[0].v, dims(d)[1].v], [200, 100]); // al cambiar «ancho» se recalcula todo
});

t('ecuaciones: los dos sistemas dan lo que dice la guia', () => {
  const d = load('ecuaciones');
  const shown = Object.values(d.texts).map((x) => shownText(d, x).text).join('\n');
  assert.match(shown, /solve\(x\+y==10; x-y==2; x; y\)=x=6; y=4/);
  assert.match(shown, /solve\(a\*b==12; a\+b==7; a; b\)=a=4; b=3/);
});

t('poligono de fuerzas: cuatro vectores, con la cabeza en el extremo final', () => {
  const d = load('poligono-de-fuerzas');
  const vs = Object.values(d.lines).filter((l) => l.vec);
  assert.equal(vs.length, 4);
  for (const l of vs) assert.equal(vecEnds(l).head, l.b);
  assert.deepEqual(dims(d).filter((k) => k.ref).map((k) => k.name), ['D1', 'D2', 'D3', 'D4']);
});

t('manivela: el actuador MR1 la gira un cuarto de vuelta por segundo, y la grafica usa p2', () => {
  const d = load('manivela-y-grafica');
  assert.equal(Object.values(d.acts)[0].expr, '90*t');
  assert.deepEqual(Object.values(d.graphs)[0].series, ['p2.y vs t', 'p2.x vs t']);
  const sim = simBegin(d);
  assert.ok(simStep(d, sim, 1, solve).ok);
  assert.ok(Math.abs(d.pts.p2.x) < 1e-6 && Math.abs(d.pts.p2.y - 30) < 1e-6, 'en t=1 el extremo esta arriba');
  simEnd(d, sim);
  assert.deepEqual([d.pts.p2.x, d.pts.p2.y], [30, 0]); // al detener, el dibujo vuelve a como estaba
  assert.equal(d.tEnd, 4);
});

t('corte laser: dos clases de linea (corte rojo continua, marcado azul discontinua)', () => {
  const cl = laserClasses(load('corte-laser'));
  assert.equal(cl.length, 2);
  assert.deepEqual(cl.map((c) => [c.ltype, c.count]), [['continua', 8], ['discontinua', 1]]);
});

t('consola: el vector de cadenas se ve como tres lineas, en monoespaciada y con fondo', () => {
  const d = load('consola-de-texto');
  const c = Object.values(d.texts).find((x) => x.valOnly);
  assert.equal(shownText(d, c).text, 'ESTADO\nVidas: 3\nPuntos: 300');
  assert.deepEqual([c.font, c.bg], ['mono', '#0b1020']);
  Object.values(d.texts).find((x) => x.text === '$$n:3$$').text = '$$n:5$$';
  assert.equal(shownText(d, c).text, 'ESTADO\nVidas: 5\nPuntos: 500'); // al cambiar n se actualiza
});

t('contador: lee con valor inicial 0, guarda c+1 y reproduce un sonido', () => {
  const d = load('contador-y-sonido');
  const shown = Object.values(d.texts).map((x) => shownText(d, x).text.replace(/[-]/g, '')).join('\n');
  assert.match(shown, /\$\$c=0\$\$/);
  assert.match(shown, /wfile\(c\+1; contador\)=1/);
  assert.match(shown, /play\(.*ding.*\)=1/);
});

t('patron circular: seis agujeros iguales a 60° que siguen al cambiar la cota o el radio', () => {
  const d = load('patron-circular');
  const holes = () => Object.values(d.circles).filter((c) => c.r < 20);
  assert.equal(holes().length, 6);
  const ang = holes().map((c) => Math.round((Math.atan2(d.pts[c.c].y, d.pts[c.c].x) * 180) / Math.PI + 360) % 360).sort((a, b) => a - b);
  assert.deepEqual(ang, [0, 60, 120, 180, 240, 300]);
  Object.values(d.cons).find((k) => k.t === 'DIST' && !k.hidden).v = 30; // la distancia de O al agujero
  Object.values(d.cons).find((k) => k.t === 'RAD' && !k.hidden).v = 8;
  assert.equal(settle(d, solve, []).ok !== false, true);
  for (const c of holes()) { assert.ok(Math.abs(Math.hypot(d.pts[c.c].x, d.pts[c.c].y) - 30) < 1e-4, 'todos a 30 de O'); assert.ok(Math.abs(c.r - 8) < 1e-4, 'todos de radio 8'); }
});

t('cada ejemplo que nombra el manual existe y la app puede abrirlo', () => {
  const main = readFileSync(new URL('src/main.js', root), 'utf8');
  const globs = /import\.meta\.glob\(\[([^\]]*)\]/.exec(main)?.[1] || '';
  for (const [lang, file] of [['es', 'docs/guias.md'], ['en', 'docs/en/guias.md']]) {
    const md = readFileSync(new URL(file, root), 'utf8');
    for (const m of md.matchAll(/\(((?:\.\.\/)+ejemplos\/(guias\/)?([\w-]+)\.json)\)/g)) {
      const [, , guia, name] = m;
      assert.ok(existsSync(new URL(`ejemplos/${guia ? 'guias/' : ''}${name}.json`, root)), `${file}: falta el ejemplo ${name}`);
      if (guia) assert.ok(existsSync(new URL(`ejemplos/guias/${name}.en.json`, root)), `falta ${name}.en.json`);
      assert.ok(guia ? globs.includes('ejemplos/guias/*.json') : globs.includes(`ejemplos/${name}.json`), `${file}: la app no puede abrir ${name} (revisa import.meta.glob en main.js)`);
    }
  }
});

console.log(`\n${passed} pruebas de las guias pasaron`);
