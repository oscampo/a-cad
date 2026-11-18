// Orden de lectura y solucion (como SMath): la pagina se lee de arriba a abajo y, en una fila, de izquierda a derecha; una variable vale lo de su
// ultima definicion leida antes, se puede redefinir, y lo que se lee antes de definirse no existe todavia.
import assert from 'node:assert/strict';
import { newDoc, addPoint, addLine, addCon, addText } from '../src/model.js';
import { textValue, plainText } from '../src/text.js';
import { textOrder } from '../src/tvars.js';
import { dimPos } from '../src/dims.js';
import { initSolver, solve } from '../src/solver.js';
import { addLinear, simBegin, simStep, simEnd } from '../src/actuators.js';
import { varsOf, textVarErrors, recompute, pruneFormulas, freezeDimOrder, thawDimOrder } from '../src/params.js';

await initSolver();

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
// Un documento con textos en (x, y); h = 1 y ancla «bl» (la caja sube desde el punto).
const mk = (items) => {
  const d = newDoc(), ids = [];
  for (const [x, y, text] of items) ids.push(addText(d, addPoint(d, x, y), text, { h: 1 }));
  return { d, ids, show: (i) => vals(plainText(textValue(d, d.texts[ids[i]]))) };
};
// Deja solo el valor de cada salida ($expr=valor$ -> valor): estas pruebas miran los valores, no como se dibujan.
const vals = (s) => s.replace(/(\$\$?)((?:(?!\$)[\s\S])*?[^:<>!=\s])=([^=$]*)\1/g, '$3');
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) <= e, `${a} != ${b}`);

t('el caso f(v): una funcion, un rango y f(v) con un vector (un numero se suma a cada elemento)', () => {
  const { d, ids, show } = mk([[0, 0, '$$f(y):3*y+2$$\n$$v:0..1;10$$\n$$f(v)=$$']]);
  assert.match(show(0), /\n\[2, 2\.333, 2\.667, 3, …, 4\.667, 5\]$/);
  assert.match(plainText(textValue(d, d.texts[ids[0]])), /^\$\$f\(y\):=3\*y\+2\$\$\n.*\n\$\$f\(v\)=\[2, 2\.333, 2\.667, 3, …, 4\.667, 5\]\$\$$/); // se dibuja f(v)=valor
  assert.equal(show(0).includes('⚠'), false);
});

t('redefinir: cada salida usa el valor definido justo antes; una variable puede usarse a si misma', () => {
  const { show } = mk([[0, 0, '$k:1$\n$k=$\n$k:2$\n$k=$\n$k:k+10$\n$k=$\n$n:1$\n$n:n+1$\n$n:n*5$\n$n=$']]);
  assert.equal(show(0).split('\n').filter((l, i) => [1, 3, 5, 9].includes(i)).join(','), '1,2,12,10');
});

t('las funciones leen las variables del punto desde el que se las llama', () => {
  const { show } = mk([[0, 0, '$k:1$\n$f(x):x*k$\n$f(3)=$\n$k:10$\n$f(3)=$']]);
  assert.deepEqual(show(0).split('\n').slice(2).filter((l) => /^\d/.test(l)), ['3', '30']);
});

t('de arriba a abajo entre textos distintos, sea cual sea el orden en que se crearon', () => {
  // se crean desordenados: salida de abajo, definicion de arriba, definicion del medio-abajo, salida del medio
  const { d, ids, show } = mk([[0, -20, '$k=$'], [0, 0, '$k:1$'], [0, -15, '$k:2$'], [0, -10, '$k=$']]);
  assert.equal(show(3), '1'); // entre la definicion de arriba (y = 0) y la de y = -15
  assert.equal(show(0), '2'); // por debajo de las dos
  assert.deepEqual(textOrder(d).map(([tid]) => tid), [ids[1], ids[3], ids[2], ids[0]]);
  assert.equal(varsOf(d).k.v, 2); // las cotas ven el valor final
});

t('de izquierda a derecha en una misma fila (aunque no esten exactamente a la misma altura)', () => {
  const { show } = mk([[0, 20, '$k:1$'], [50, 0.1, '$k=$'], [0, 0, '$k=$'], [30, 0, '$k:9$'], [0, -20, '$k=$']]);
  // fila y = 0: izquierda (x = 0) lee k = 1; luego la definicion k = 9 (x = 30); luego la salida de x = 50
  assert.equal(show(2), '1'); // a la izquierda de la definicion de la misma fila
  assert.equal(show(1), '9'); // a su derecha, aunque este 0.1 mas arriba
  assert.equal(show(4), '9'); // la fila de abajo
});

t('usar una variable antes de definirla avisa de que se define mas abajo; una definicion que falla deja la variable sin definir', () => {
  const { d, show } = mk([[0, 10, '$x:y+1$'], [0, 0, '$y:2$\n$x=$ $y=$']]);
  assert.match(textVarErrors(d).map((e) => e.msg).join('|'), /«y» se define más abajo o más a la derecha/);
  assert.equal(show(1).split('\n')[1], '⚠ 2'); // x no se pudo definir
  assert.ok(!('x' in varsOf(d)) && varsOf(d).y.v === 2);
  const e = mk([[0, 0, '$a:5$\n$a:nada$\n$a=$']]);
  assert.equal(e.show(0).split('\n')[2], '⚠'); // la segunda definicion fallo: a ya no existe
  assert.equal(textVarErrors(e.d).length, 1);
});

t('redefinir no es un error, pero chocar con una cota o con una funcion del programa si', () => {
  const d = newDoc(), a = addPoint(d, 0, 0), b = addPoint(d, 4, 0);
  addLine(d, a, b, {}); addCon(d, { t: 'DIST', refs: [a, b], v: 4, name: 'D1' });
  const tx = addText(d, addPoint(d, 0, 5), '$k:1$\n$k:2$\n$k:3$\n$sin:1$\n$D1:2$', { h: 1 });
  const msgs = textVarErrors(d).map((e) => e.msg);
  assert.equal(msgs.length, 2);
  assert.ok(msgs.some((m) => /«sin» es una función/.test(m)) && msgs.some((m) => /«D1» ya es el nombre de una cota/.test(m)), msgs.join('|'));
  const lines = plainText(textValue(d, d.texts[tx])).split('\n');
  assert.deepEqual(lines.map((l) => l.includes('⚠')), [false, false, false, true, true]);
  assert.equal(varsOf(d).k.v, 3);
});

t('una cota por debajo de todo ve el valor final de las variables, y las variables leen las cotas en su punto', () => {
  const d = newDoc(), a = addPoint(d, 0, 0), b = addPoint(d, 10, 0), c = addPoint(d, 0, 5), e = addPoint(d, 10, 5);
  d.pts[a].fixed = true;
  addLine(d, a, b, {}); addLine(d, c, e, {});
  const k1 = addCon(d, { t: 'DIST', refs: [a, b], v: 10, name: 'D1' });
  const k2 = addCon(d, { t: 'DIST', refs: [c, e], v: 3, name: 'D2', expr: 'k * 2' });
  addText(d, addPoint(d, 0, 20), '$k:1$\n$m:D1+k$', { h: 1 });
  addText(d, addPoint(d, 0, 10), '$k:7$', { h: 1 });
  const out = addText(d, addPoint(d, 0, 0), 'k vale $k=$ y m vale $m=$', { h: 1 });
  const r = recompute(d);
  assert.ok(r.ok, r.error);
  near(d.cons[k2].v, 14); // D2 = k*2 con k final = 7
  assert.equal(plainText(textValue(d, d.texts[out])), 'k vale $k=7$ y m vale $m=11$'); // m se calculo cuando k valia 1
  assert.deepEqual(pruneFormulas(d), []);
  d.cons[k1].v = 20;
  assert.equal(plainText(textValue(d, d.texts[out])), 'k vale $k=7$ y m vale $m=21$');
});

t('las cotas con formula se leen en el lugar de su etiqueta y ven las variables de ahi', () => {
  const d = newDoc();
  const dim = (y, name, expr) => { // una linea horizontal de 10 de largo a la altura y, con su cota
    const a = addPoint(d, 0, y), b = addPoint(d, 10, y);
    addLine(d, a, b, {});
    return addCon(d, { t: 'DIST', refs: [a, b], v: 10, name, expr });
  };
  addText(d, addPoint(d, 0, 30), '$k:1$', { h: 1 });
  addText(d, addPoint(d, 0, 10), '$k:7$', { h: 1 });
  const k2 = dim(20, 'D2', 'k*2'), k3 = dim(0, 'D3', 'k*2');
  const p2 = dimPos(d, d.cons[k2]);
  near(p2.x, 5, 1); near(p2.y, 20, 1); // la etiqueta de una cota horizontal esta sobre su linea
  const r = recompute(d);
  assert.ok(r.ok, r.error);
  near(d.cons[k2].v, 2); // entre k:1 y k:7: k vale 1
  near(d.cons[k3].v, 14); // por debajo de las dos: k vale 7
  // por encima de todo, k aun no existe
  const k4 = dim(40, 'D4', 'k*3');
  const bad = recompute(d);
  assert.ok(!bad.ok); assert.match(bad.error, /D4: «k» se define después de esta cota en el orden de lectura/);
  // mover la etiqueta de D2 por debajo de k:7 cambia lo que lee
  delete d.cons[k4];
  for (const off of [14, -14]) { d.cons[k2].off = off; if (dimPos(d, d.cons[k2]).y < 8) break; }
  assert.ok(dimPos(d, d.cons[k2]).y < 8);
  assert.ok(recompute(d).ok);
  near(d.cons[k2].v, 14);
});

t('mecanismos: durante una simulacion el orden de lectura de las cotas se congela (su etiqueta puede cruzar un texto)', () => {
  const d = newDoc(), p = addPoint(d, 0, 0), q = addPoint(d, 0, 10), r = addPoint(d, 5, 10);
  d.pts[p].fixed = true;
  addLine(d, p, q); addCon(d, { t: 'AZ', refs: [p, q], v: 90, hidden: true }); // q sube por el eje y
  addLine(d, q, r);
  const kk = addCon(d, { t: 'DIST', refs: [q, r], v: 5, name: 'D1', expr: 'k*5' }); // el eslabon q-r mide k*5 y sube con q
  addText(d, addPoint(d, 20, 13), '$k:1$', { h: 1 }); // la etiqueta empieza debajo de este texto y termina encima
  addLinear(d, p, q, { mode: 'vel', expr: '2' });
  assert.ok(recompute(d).ok);
  assert.ok(dimPos(d, d.cons[kk]).y < 13);
  // sin congelar, la etiqueta pasa por encima del texto: la cota deja de ver k y la simulacion se detiene
  const s0 = simBegin(d); thawDimOrder(d);
  const bad = simStep(d, s0, 3, solve);
  assert.equal(bad.ok, false); assert.match(bad.error, /se define después de esta cota/);
  simEnd(d, s0);
  // con el orden congelado (lo normal), la simulacion llega al final
  const s1 = simBegin(d);
  const ok = simStep(d, s1, 3, solve);
  assert.ok(ok.ok, ok.error);
  assert.ok(Math.abs(d.pts[q].y - 16) < 1e-3, 'q llego a y = 16');
  assert.ok(dimPos(d, d.cons[kk]).y > 14, 'la etiqueta quedo por encima del texto');
  assert.ok(Math.abs(Math.hypot(d.pts[r].x - d.pts[q].x, d.pts[r].y - d.pts[q].y) - 5) < 1e-3, 'el eslabon sigue midiendo k*5');
  simEnd(d, s1);
  assert.ok(dimPos(d, d.cons[kk]).y < 13); // al terminar vuelve al dibujo original, con su orden normal
  // arrastrar: congelar y soltar
  freezeDimOrder(d); d.pts[q].y = 16; d.pts[r].y = 16;
  assert.ok(recompute(d).ok); // sigue viendo k mientras se arrastra
  thawDimOrder(d);
  const after = recompute(d);
  assert.equal(after.ok, false); // al soltar, la etiqueta quedo por encima del texto: ahora si cuenta
});

t('las funciones de varios textos, vectores y funciones recursivas siguen valiendo en este orden', () => {
  const { show } = mk([[0, 20, '$fact(n):si(n<=1; 1; n*fact(n-1))$'], [0, 10, '$v:1..3;3$\n$sq(x):x.^2$'], [0, 0, '$fact(5)=$ $sq(v)=$ $sum(sq(v))=$']]);
  assert.equal(show(2), '120 [1, 4, 9] 14');
});

console.log(`\n${passed} pruebas de orden de lectura pasaron`);
