// Vector, actuador lineal y linea indicativa se definen igual: una linea y uno de sus extremos, que es la CABEZA. El texto va, por defecto,
// en el punto medio de la linea.
import assert from 'node:assert/strict';
import { newDoc, addPoint, addLine, addCon } from '../src/model.js';
import { makeVector, revForHead, vecEnds } from '../src/vectors.js';
import { addLinearOnLine } from '../src/actuators.js';
import { endOfElement, leadSpots, leadAtDefault, leadAnchorDefault } from '../src/dims.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const mk = (ax, ay, bx, by) => { const d = newDoc(), a = addPoint(d, ax, ay), b = addPoint(d, bx, by), l = addLine(d, a, b); return { d, a, b, l }; };

t('vector: el extremo elegido es la cabeza (antes era la cola); sin elegir, la cabeza es el final', () => {
  const { d, a, b, l } = mk(0, 0, 10, 0);
  assert.equal(revForHead(d.lines[l], [a]), true); // elijo a: la cabeza esta en a
  assert.equal(revForHead(d.lines[l], [b]), false); // elijo b: la cabeza esta en b (el final)
  assert.equal(revForHead(d.lines[l], []), false);
  assert.equal(revForHead(d.lines[l], [a, b]), false); // los dos: ninguno elegido
  makeVector(d, l, { rev: revForHead(d.lines[l], [a]), h: 2 });
  assert.deepEqual(vecEnds(d.lines[l]), { tail: b, head: a });
  const m = d.lines[l].vec.m; assert.deepEqual([d.pts[m].x, d.pts[m].y], [5, 0]); // el texto de la magnitud, en el punto medio
});

t('actuador lineal: el extremo elegido es la cabeza y el otro la cola (se guarda como p1 = cola, p2 = cabeza)', () => {
  const { d, a, b, l } = mk(0, 0, 10, 0);
  const id = addLinearOnLine(d, l, b);
  assert.deepEqual([d.acts[id].p1, d.acts[id].p2], [a, b]);
  const id2 = addLinearOnLine(d, l, a);
  assert.deepEqual([d.acts[id2].p1, d.acts[id2].p2], [b, a]);
  const c = addPoint(d, 3, 3);
  assert.equal(addLinearOnLine(d, l, c), null); // un punto que no es extremo de la linea no vale
  assert.equal(addLinearOnLine(d, 'nada', a), null);
});

t('linea indicativa: la punta es el extremo elegido; con la etiqueta en el punto medio queda al lado de la recta', () => {
  const { d, a, b, l } = mk(0, 0, 10, 0);
  assert.equal(endOfElement(d, a, l), true);
  const k = { t: 'LEAD', refs: [b, l], on: 1, at: 'm' };
  assert.ok(leadSpots(d, k).some((x) => x.key === 'm'));
  assert.equal(leadAtDefault(d, { ...k, at: undefined }), 'a'); // lo que se guardo sin «at» sigue como antes (el otro extremo)
  assert.equal(leadAnchorDefault(d, k), 'bc'); // recta horizontal: el texto, arriba y centrado en el punto medio
  const v = mk(0, 0, 0, 10);
  assert.equal(leadAnchorDefault(v.d, { t: 'LEAD', refs: [v.b, v.l], on: 1, at: 'm' }), 'ml'); // vertical: a la derecha
  const dg = mk(0, 0, 10, 10);
  assert.equal(leadAnchorDefault(dg.d, { t: 'LEAD', refs: [dg.b, dg.l], on: 1, at: 'm' }).length, 2); // oblicua: una esquina
  assert.equal(leadAnchorDefault(d, { t: 'LEAD', refs: [b, l], on: 1 }), 'mr'); // sin «at»: como siempre (el texto sigue la direccion de la recta)
});

console.log(`\n${passed} pruebas de cabeza y cola pasaron`);
