// Enlaces de los textos: el destino que guarda cada tramo, que destinos se abren, anclas, rutas en el repositorio y la caja que se toca.
import assert from 'node:assert/strict';
import { mdInline } from '../src/markdown.js';
import { linkTarget, resolveRepoPath, findAnchor, headingsOf, anchorKey } from '../src/links.js';
import { textLinkAt, textLinkBoxes, textCorners } from '../src/text.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };

t('cada tramo de enlace guarda su destino', () => {
  const g = (s, ctx) => mdInline(s, ctx).filter((r) => r.link).map((r) => r.s + '->' + r.link).join(' | ');
  assert.equal(g('[A-CAD](https://github.com/oscampo/a-cad) es'), 'A-CAD->https://github.com/oscampo/a-cad');
  assert.equal(g('_Prof_ <oicampo@uao.edu.co>'), 'oicampo@uao.edu.co->mailto:oicampo@uao.edu.co');
  assert.equal(g('<tel:+57 300>'), ''); // con espacio no es un autoenlace
  assert.equal(g('<tel:+573001234567>'), 'tel:+573001234567->tel:+573001234567');
  assert.equal(g('[uno][r]', { refs: new Map([['r', '#graficas']]) }), 'uno->#graficas');
  assert.equal(g('[la **guia**](a.json)'), 'la ->a.json | guia->a.json'); // la negrita parte el tramo, el destino sigue
  // dos enlaces pegados a destinos distintos no se juntan
  assert.equal(g('[a](#x)[b](#y)'), 'a->#x | b->#y');
  assert.equal(g('[a](#x)[b](#x)'), 'ab->#x');
});

t('que destinos se abren', () => {
  const k = (u) => linkTarget(u).kind;
  assert.equal(k('https://github.com/oscampo/a-cad'), 'web');
  assert.equal(k('HTTP://x.org'), 'web');
  assert.equal(k('www.uao.edu.co'), 'web');
  assert.equal(linkTarget('www.uao.edu.co').href, 'https://www.uao.edu.co/');
  assert.equal(k('mailto:a@b.co'), 'mail');
  assert.equal(k('tel:+57 (2) 318-8000'), 'tel');
  assert.equal(linkTarget('tel:+57 (2) 318-8000').href, 'tel:+5723188000');
  assert.equal(k('#graficas'), 'anchor');
  assert.equal(k('cicloide.json'), 'file');
  assert.deepEqual([linkTarget('sub/a%20b.json#Gráficas').path, linkTarget('sub/a%20b.json#Gr%C3%A1ficas').anchor], ['sub/a b.json', 'Gráficas']);
  for (const bad of ['javascript:alert(1)', 'JavaScript:alert(1)', ' javascript:x', 'data:text/html,hi', 'file:///C:/x', 'vbscript:x', 'C:\\x.json', '//evil.org/a', 'notas.pdf', '', '#', 'tel:abc', 'mailto:', 'https://']) {
    assert.equal(k(bad), 'bad', bad);
    assert.ok(linkTarget(bad).why, bad);
  }
});

t('lo que muestra la pastilla de una direccion web', () => {
  const L = linkTarget('https://github.com/oscampo/a-cad?tab=readme#uso');
  assert.equal(L.host, 'github.com');
  assert.equal(L.label, 'github.com/oscampo/a-cad?tab=readme#uso');
  assert.equal(linkTarget('https://uao.edu.co/').label, 'uao.edu.co');
});

t('rutas de otro dibujo en el repositorio', () => {
  assert.equal(resolveRepoPath('dibujos', 'cicloide.json'), 'dibujos/cicloide.json');
  assert.equal(resolveRepoPath('dibujos/', './sub/a.json'), 'dibujos/sub/a.json');
  assert.equal(resolveRepoPath('dibujos', '../otros/b.json'), 'otros/b.json');
  assert.equal(resolveRepoPath('dibujos', '/raiz.json'), 'raiz.json');
  assert.equal(resolveRepoPath('', 'a.json'), 'a.json');
  assert.equal(resolveRepoPath('dibujos', '../../fuera.json'), null);
  assert.equal(resolveRepoPath('', '../a.json'), null);
});

const doc = {
  pts: { p1: { x: 0, y: 0 }, p2: { x: 0, y: -50 }, p3: { x: 10, y: 10 } },
  lines: { l4: { a: 'p1', b: 'p3' } }, circles: {}, arcs: {}, ellipses: {}, splines: {}, hatches: {},
  graphs: { g9: { x: 0, y: -100, w: 50, h: 30 } },
  texts: {
    t1: { pt: 'p1', text: '# TUTORIAL A-CAD\n[A-CAD](https://github.com/oscampo/a-cad) y [ir](#graficas)', h: 4, ang: 0, anchor: 'bl' },
    t2: { pt: 'p2', text: '**Tu primera entrada**\n```\n# no es titulo\n```\n## Gráficas !!!', h: 4, ang: 0, anchor: 'bl' },
  },
};

t('anclas: id de un elemento, titulo o primera linea de un texto', () => {
  assert.deepEqual(findAnchor(doc, 'l4'), { k: 'ln', id: 'l4' });
  assert.deepEqual(findAnchor(doc, 'g9'), { k: 'gr', id: 'g9' });
  assert.deepEqual(findAnchor(doc, 't2'), { k: 'tx', id: 't2' });
  for (const a of ['graficas', 'Gráficas', 'gráficas-', 'GRAFICAS']) assert.deepEqual(findAnchor(doc, a), { k: 'tx', id: 't2' }, a);
  assert.deepEqual(findAnchor(doc, 'tutorial-a-cad'), { k: 'tx', id: 't1' });
  assert.deepEqual(findAnchor(doc, 'tu-primera-entrada'), { k: 'tx', id: 't2' }); // primera linea, sin ser titulo
  assert.equal(findAnchor(doc, 'no-es-titulo'), null); // dentro de un bloque de codigo
  assert.equal(findAnchor(doc, 'nada'), null);
  assert.equal(findAnchor(doc, '!!!'), null);
  assert.deepEqual(headingsOf('# A\n####### no\n#sin espacio\n## B ##'), ['A', 'B']);
  assert.equal(anchorKey('Ñandú 2'), 'nandu2');
});

// medida aproximada: cada caracter mide 0,5 alturas
const measure = (s) => s.length * 0.5;
t('la caja de cada enlace, tambien con el texto girado', () => {
  const T = doc.texts.t1, boxes = textLinkBoxes(doc, T, measure);
  assert.deepEqual(boxes.map((b) => b.url), ['https://github.com/oscampo/a-cad', '#graficas']);
  // el centro de cada caja da su destino; fuera de los enlaces, nada
  const mid = (b) => ({ x: b.poly.reduce((s, q) => s + q.x, 0) / 4, y: b.poly.reduce((s, q) => s + q.y, 0) / 4 });
  for (const b of boxes) assert.equal(textLinkAt(doc, T, mid(b), measure), b.url);
  const box = textCorners(doc, T, measure), top = Math.max(...box.map((q) => q.y));
  assert.equal(textLinkAt(doc, T, { x: 1, y: top - 1 }, measure), null); // sobre el titulo
  assert.equal(textLinkAt(doc, T, { x: 500, y: 0 }, measure), null);
  // girado 90°: las cajas giran con el texto
  const R = { ...T, ang: 90 }, rb = textLinkBoxes(doc, R, measure);
  for (const b of rb) assert.equal(textLinkAt(doc, R, mid(b), measure), b.url);
  assert.ok(Math.abs(mid(rb[0]).x) < Math.abs(mid(rb[0]).y), 'la caja queda sobre el eje vertical');
  // un texto sin enlaces
  assert.deepEqual(textLinkBoxes(doc, doc.texts.t2, measure), []);
});

t('un enlace partido por el ajuste al margen da dos cajas con el mismo destino', () => {
  const T = { pt: 'p1', text: 'uno dos [un enlace bastante largo que se parte](#t2) fin', h: 4, ang: 0, anchor: 'bl' };
  const d = { ...doc, texts: { ...doc.texts, tw: T }, page: { w: 60, m: 0, x0: 0 } };
  const b = textLinkBoxes(d, T, measure);
  assert.ok(b.length >= 2, 'se parte en varias lineas: ' + b.length);
  assert.ok(b.every((x) => x.url === '#t2'));
});

console.log(`\n${passed} pruebas de enlaces`);
