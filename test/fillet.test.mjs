// Redondeo entre dos elementos tocados: el lado que se conserva se decide respecto del vertice (no de la tangencia) y una linea
// que atraviesa el vertice (union en T) conserva lo del otro lado como un segmento propio.
import assert from 'node:assert/strict';
import { newDoc, addPoint, addLine, addCon } from '../src/model.js';
import { filletBetween } from '../src/corners.js';
import { initSolver, solve } from '../src/solver.js';

let passed = 0;
const t = async (name, fn) => { await fn(); passed++; console.log('ok  ' + name); };
await initSolver();
const near = (p, x, y) => Math.abs(p.x - x) < 1e-6 && Math.abs(p.y - y) < 1e-6;

// Escalon de un eje (mm): cara del hombro x = 0 de y = -12.5 a 12.5, el tramo chico de radio 8.5 hacia la derecha
function shaft() {
  const d = newDoc(), P = (x, y) => addPoint(d, x, y);
  const top = P(0, 12.5), up = P(0, 8.5), lo = P(0, -8.5), bot = P(0, -12.5), ru = P(22, 8.5), rl = P(22, -8.5);
  const face = addLine(d, top, bot, {}); // la cara del hombro: una sola linea que atraviesa las dos uniones
  const h1 = addLine(d, up, ru, {}), h2 = addLine(d, rl, lo, {});
  for (const l of [face, h1, h2]) addCon(d, { t: l === face ? 'V' : 'H', refs: [l] });
  return { d, face, h1, h2 };
}

await t('un toque cerca de la esquina (donde cae la tangencia) conserva la rama tocada: el arco va en la esquina correcta', () => {
  for (const [tv, th] of [[-10.5, 1.5], [-10.4, 2.05], [-11.9, 18], [-10.6, 2.1]]) for (const order of [0, 1]) {
    const { d, face, h2 } = shaft();
    const A = { k: 'ln', id: face, p: { x: 0, y: tv } }, B = { k: 'ln', id: h2, p: { x: th, y: -8.5 } };
    const r = order ? filletBetween(d, B, A, 2) : filletBetween(d, A, B, 2);
    assert.ok(r.ok, r.msg);
    assert.ok(near(d.pts[d.arcs[r.arc].c], 2, -10.5), `centro con toques ${tv}, ${th}`); // antes: (-2, -10.5), con la horizontal alargada
    const H = d.lines[h2]; assert.ok([H.a, H.b].every((q) => d.pts[q].x > 1.99)); // la horizontal se recorta, no se alarga
  }
});

await t('una línea que atraviesa el vértice (unión en T) conserva lo del otro lado como segmento propio; el solver lo acepta', () => {
  const { d, face, h1, h2 } = shaft();
  const r1 = filletBetween(d, { k: 'ln', id: face, p: { x: 0, y: 11 } }, { k: 'ln', id: h1, p: { x: 5, y: 8.5 } }, 2);
  assert.ok(r1.ok && solve(d, []).ok);
  const verts = () => Object.entries(d.lines).filter(([, l]) => Math.abs(d.pts[l.a].x) < 1e-6 && Math.abs(d.pts[l.b].x) < 1e-6);
  const low = verts().find(([, l]) => [l.a, l.b].some((q) => near(d.pts[q], 0, -12.5)));
  assert.ok(low, 'el tramo de abajo de la cara sigue existiendo'); // antes se borraba entero
  const r2 = filletBetween(d, { k: 'ln', id: low[0], p: { x: 0, y: -10.5 } }, { k: 'ln', id: h2, p: { x: 3.5, y: -8.5 } }, 2);
  assert.ok(r2.ok && solve(d, []).ok);
  assert.ok(near(d.pts[d.arcs[r2.arc].c], 2, -10.5));
  assert.ok(verts().some(([, l]) => [l.a, l.b].some((q) => near(d.pts[q], 0, 8.5)) && [l.a, l.b].some((q) => near(d.pts[q], 0, -8.5)))); // la cara entre los dos escalones queda
});

console.log(`\n${passed} pruebas de redondeo pasaron`);
