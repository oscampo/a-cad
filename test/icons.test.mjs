// Iconos de la app dentro de los textos: ![Linea](icon:line) se dibuja como trazos del icono, a la altura de la letra.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setIconSource, iconStrokes, pathPolys, svgStrokes, hasIcon } from '../src/iconpaths.js';
import { mdInline, LINK_COLOR } from '../src/markdown.js';
import { layoutText } from '../src/mathlayout.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} vs ${b}`);
const S = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${inner}</svg>`;
const lucide = (n) => readFileSync(new URL(`../node_modules/lucide-static/icons/${n}.svg`, import.meta.url), 'utf8');

setIconSource({
  line: S('<path d="M5 19 19 5"/><circle cx="5" cy="19" r="2" fill="currentColor"/>'),
  'con-h': S('<path d="M3 12h18"/><path d="M9 6h6" opacity=".35"/>'),
  save: lucide('save'), trash: lucide('trash-2'), help: lucide('circle-help'),
});

t('rutas SVG: rectas, relativas, H/V, cierre y arcos', () => {
  const [a] = pathPolys('M3 12h18');
  assert.deepEqual(a.pts, [[3, 12], [21, 12]]);
  const [b] = pathPolys('m2 2 l2 0v3H0z');
  assert.deepEqual(b.pts, [[2, 2], [4, 2], [4, 5], [0, 5], [2, 2]]);
  assert.ok(b.closed);
  // medio circulo de radio 5 alrededor de (5, 0): todos los puntos a 5 del centro
  const [c] = pathPolys('M0 0a5 5 0 0 1 10 0');
  for (const [x, y] of c.pts) near(Math.hypot(x - 5, y), 5, 1e-9);
  near(c.pts.at(-1)[0], 10); near(c.pts.at(-1)[1], 0);
  // banderas pegadas («0 011 1») como las escribe Lucide a veces
  const [d] = pathPolys('M0 0a1 1 0 011 1');
  near(d.pts.at(-1)[0], 1); near(d.pts.at(-1)[1], 1);
  // curva cubica: termina donde dice
  const [e] = pathPolys('M0 0C0 10 10 10 10 0');
  assert.deepEqual(e.pts.at(-1), [10, 0]);
});

t('iconos: rellenos, tenues y los de Lucide', () => {
  const L = iconStrokes('line');
  assert.equal(L.length, 2);
  assert.ok(L[1].fill && !L[0].fill);
  assert.equal(iconStrokes('con-h')[1].op, 0.35);
  for (const n of ['save', 'trash', 'help']) {
    const st = iconStrokes(n);
    assert.ok(st.length >= 2, n);
    for (const s of st) for (const [x, y] of s.pts) assert.ok(x > -1 && x < 25 && y > -1 && y < 25, `${n} ${x},${y}`);
  }
  assert.equal(iconStrokes('nada'), null);
  // un hueco con el color del fondo del boton no se dibuja como relleno
  assert.ok(!svgStrokes(S('<circle cx="12" cy="12" r="3" fill="var(--btn, #fff)"/>'))[0].fill);
});

t('Markdown: un tramo de icono; si no existe, imagen', () => {
  const r = mdInline('Pulsa ![Línea](icon:line) y ![x](icon:nada).');
  const ic = r.find((u) => u.icon);
  assert.equal(ic.icon, 'line'); assert.equal(ic.alt, 'Línea'); assert.equal(ic.s, '￼');
  assert.ok(r.some((u) => u.img && u.s === '▣ x'));
  // dos iconos seguidos no se juntan, ni con el texto que sigue
  const two = mdInline('![a](icon:line)![b](icon:save)c');
  assert.deepEqual(two.map((u) => u.icon || u.s), ['line', 'save', 'c']);
  assert.ok(hasIcon('save') && !hasIcon('toString'));
});

t('maquetacion: ancho fijo, trazos a la altura de la letra, color del enlace', () => {
  const m = (s) => s.length * 0.5;
  const A = layoutText('ab ![L](icon:line) cd', m, ''), B = layoutText('ab  cd', m, '');
  near(A.w - B.w, 1.15); // el icono ocupa 1.15 alturas de letra
  const ps = A.prims.filter((p) => p.k === 'p');
  assert.equal(ps.length, 2);
  assert.ok(ps[1].fill);
  const ys = ps.flatMap((p) => p.pts.map((q) => q[1])), base = A.prims.find((p) => p.k === 't').y;
  assert.ok(Math.min(...ys) >= base - 0.78 - 1e-9 && Math.max(...ys) <= base + 0.2, 'entre la altura de una mayuscula y poco bajo la base');
  const ln = layoutText('[ver ![L](icon:line)](#x)', m, '');
  const icp = ln.prims.filter((p) => p.k === 'p' && p.pts.length > 2);
  assert.ok(icp.length && icp.every((p) => p.col === LINK_COLOR), 'dentro de un enlace, el icono va en azul');
  // al ajustar a la pagina el icono no se parte ni se pierde
  const W = layoutText('uno dos ![L](icon:line) tres cuatro', m, '', { maxW: 4 });
  assert.equal(W.prims.filter((p) => p.k === 'p').length, 2);
});

console.log(`\n${passed} pruebas de iconos en textos`);
