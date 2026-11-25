// Dibujo generado por scripts. Un texto de calculo puede llamar a point("A"; x; y), line("A"; "B") y circle("A"; r) (ver expr.js): durante la
// REGENERACION (regenerate), esas llamadas se recogen y se reconcilian con el dibujo. Lo generado lo gobierna el script: sus puntos quedan
// fijos (la definicion del script es su restriccion), se identifica por su nombre (local al texto que lo genera) y se reemplaza al regenerar,
// de modo que las cotas y restricciones que el usuario le puso siguen ahi. Sin DOM: lo prueba test/gen.test.mjs.
// doc.gen = { map: { 'texto/nombre': id } } es la fuente de verdad de que es generado (no una marca en cada elemento: una copia tiene un id nuevo y
// por eso ya no lo es).
import { setGenSink, GEN_RE } from './expr.js';
import { textVars } from './params.js';
import { addPoint, addLine, addCircle, allLtypes, deleteItems } from './model.js';

const EPS = 1e-9;
const DIM = new Set(['DIST', 'DISTPL', 'ANG', 'ANG4', 'RAD']);

// ¿Algun texto llama a las funciones de dibujo? (barato: se mira antes de gastar una evaluacion)
export const hasGenCalls = (doc) => Object.values(doc.texts || {}).some((t) => typeof t.text === 'string' && GEN_RE.test(t.text));
// Los ids de lo generado, y si un id lo es.
export const genSet = (doc) => new Set(Object.values(doc.gen?.map || {}));
export const isGen = (doc, id) => !!doc.gen?.map && Object.values(doc.gen.map).includes(id);

// Lo que piden las llamadas, por texto. Llaves: «texto/nombre» (punto), «texto/a|b» (linea, sin orden), «texto/o:centro#i» (i-esimo circulo de ese centro).
function collector() {
  const req = { pts: new Map(), lines: new Map(), circles: new Map(), errs: [] };
  let ns = null; const radii = new Map();
  const sink = {
    at: (t) => { ns = t; },
    point(name, x, y) {
      const key = ns + '/' + name, o = req.pts.get(key);
      if (o && (Math.abs(o.x - x) > EPS || Math.abs(o.y - y) > EPS)) req.errs.push({ ns, msg: `el punto «${name}» se define dos veces con coordenadas distintas` });
      else if (!o) req.pts.set(key, { ns, name, x, y });
    },
    line(a, b, style) {
      const key = ns + '/' + [a, b].sort().join('|');
      if (!req.lines.has(key)) req.lines.set(key, { ns, a, b, style });
      else if (style !== undefined) req.lines.get(key).style = style;
    },
    circle(c, r, style) {
      const rs = radii.get(ns + '/' + c) || radii.set(ns + '/' + c, []).get(ns + '/' + c);
      let i = rs.findIndex((q) => Math.abs(q - r) < EPS);
      if (i < 0) { rs.push(r); i = rs.length - 1; }
      const key = ns + '/o:' + c + '#' + i;
      if (!req.circles.has(key)) req.circles.set(key, { ns, c, r, style });
    },
  };
  return { req, sink };
}

// Hace que el dibujo diga lo que piden los textos. Devuelve { changed, errs, notes }: changed = se movio o se creo/borro algo (hay que volver a
// resolver el dibujo); errs: lo que no se pudo (se muestra al usuario); notes: avisos (p. ej. un punto que dejo de generarse pero otros usan).
export function regenerate(doc) {
  const out = { changed: false, errs: [], notes: [] };
  const had = Object.keys(doc.gen?.map || {}).length > 0;
  if (!had && !hasGenCalls(doc)) return out;
  const { req, sink } = collector();
  let st = null;
  setGenSink(sink);
  try { st = textVars(doc); } catch (e) { out.errs.push(`regenerar el dibujo: ${e.message}`); return out; } finally { setGenSink(null); }
  const badNs = new Set([...(st.genBad || []), ...[...(st.bad || [])].map((k) => String(k).split(':')[0]), ...req.errs.map((e) => e.ns)]); // un texto que falla no borra lo que ya generaba
  for (const e of req.errs) out.errs.push(e.msg);
  doc.gen ||= { map: {} };
  const map = doc.gen.map, seen = new Set(), note = (m) => out.errs.push(m);
  const ltOk = (s) => s === undefined || s in allLtypes(doc);
  // puntos
  for (const [key, r] of req.pts) {
    seen.add(key);
    let id = map[key];
    if (!(id && doc.pts[id])) { id = addPoint(doc, r.x, r.y); map[key] = id; out.changed = true; }
    const p = doc.pts[id];
    if (Math.abs(p.x - r.x) > EPS || Math.abs(p.y - r.y) > EPS) { p.x = r.x; p.y = r.y; out.changed = true; }
    if (!p.fixed) { p.fixed = true; out.changed = true; }
  }
  const pid = (ns, name) => map[ns + '/' + name];
  // lineas
  for (const [key, r] of req.lines) {
    const a = pid(r.ns, r.a), b = pid(r.ns, r.b);
    if (!(a && doc.pts[a] && b && doc.pts[b])) { note(`line("${r.a}"; "${r.b}"): falta un punto: créalo antes con point("${!(a && doc.pts[a]) ? r.a : r.b}"; x; y)`); continue; }
    if (!ltOk(r.style)) { note(`line("${r.a}"; "${r.b}"): «${r.style}» no es un tipo de línea`); continue; }
    seen.add(key);
    let id = map[key];
    if (!(id && doc.lines[id])) { id = addLine(doc, a, b, { color: 'auto', ltype: r.style || 'continua', w: 2, ls: 1 }); map[key] = id; out.changed = true; }
    const l = doc.lines[id];
    if (l.a !== a || l.b !== b) { l.a = a; l.b = b; out.changed = true; }
    if (r.style !== undefined && l.ltype !== r.style) { l.ltype = r.style; out.changed = true; }
  }
  // circulos
  for (const [key, r] of req.circles) {
    const c = pid(r.ns, r.c);
    if (!(c && doc.pts[c])) { note(`circle("${r.c}"; r): falta el centro: créalo antes con point("${r.c}"; x; y)`); continue; }
    if (!ltOk(r.style)) { note(`circle("${r.c}"; r): «${r.style}» no es un tipo de línea`); continue; }
    seen.add(key);
    let id = map[key];
    if (!(id && doc.circles[id])) { id = addCircle(doc, c, r.r, { color: 'auto', ltype: r.style || 'continua', w: 2, ls: 1 }); map[key] = id; out.changed = true; }
    const o = doc.circles[id];
    if (o.c !== c) { o.c = c; out.changed = true; }
    if (Math.abs(o.r - r.r) > EPS) { o.r = r.r; out.changed = true; }
    if (r.style !== undefined && o.ltype !== r.style) { o.ltype = r.style; out.changed = true; }
  }
  // lo que dejo de pedirse: lineas y circulos se borran; un punto que otros elementos o cotas usan se suelta (queda como un punto normal)
  const stale = Object.entries(map).filter(([key]) => !seen.has(key) && (!badNs.has(key.split('/')[0]) || !doc.texts?.[key.split('/')[0]]));
  const staleIds = new Set(stale.map(([, id]) => id));
  const usedByOthers = (id) => {
    const gone = (x) => staleIds.has(x);
    return Object.entries(doc.lines).some(([lid, l]) => (l.a === id || l.b === id) && !gone(lid))
      || Object.entries(doc.circles).some(([cid, c]) => c.c === id && !gone(cid))
      || Object.values(doc.arcs).some((a) => a.c === id || a.a === id || a.b === id)
      || Object.values(doc.ellipses || {}).some((e) => [e.c, e.a, e.b, e.p1, e.p2].includes(id))
      || Object.values(doc.splines || {}).some((sp) => sp.pts.includes(id))
      || Object.values(doc.texts || {}).some((t) => t.pt === id)
      || Object.values(doc.cons || {}).some((k) => (k.refs || []).includes(id));
  };
  const items = [];
  for (const [key, id] of stale) {
    delete map[key];
    if (doc.lines[id]) items.push({ k: 'ln', id });
    else if (doc.circles[id]) items.push({ k: 'ci', id });
  }
  if (items.length) { deleteItems(doc, items); out.changed = true; }
  const ptsGone = [];
  for (const [key, id] of stale) {
    if (!doc.pts[id]) continue;
    if (usedByOthers(id)) { doc.pts[id].fixed = false; out.notes.push(`«${key.split('/').slice(1).join('/')}» ya no lo genera el script y otros elementos lo usan: queda como un punto normal`); out.changed = true; }
    else ptsGone.push({ k: 'pt', id });
  }
  if (ptsGone.length) { deleteItems(doc, ptsGone); out.changed = true; }
  // lo que el usuario relaciono SOLO entre cosas generadas: una cota pasa a ser de referencia (solo mide) y una restriccion geometrica sobra
  const gs = genSet(doc), dead = [];
  for (const [id, k] of Object.entries(doc.cons || {})) {
    const refs = k.refs || [];
    if (!refs.length || !refs.every((r) => gs.has(r))) continue;
    if (DIM.has(k.t)) { if (!k.ref) { k.ref = true; delete k.expr; out.changed = true; out.notes.push('una cota entre cosas generadas por un script pasó a ser de referencia (solo mide)'); } }
    else if (k.t !== 'LEAD') dead.push({ k: 'co', id });
  }
  if (dead.length) { deleteItems(doc, dead); out.changed = true; }
  if (!Object.keys(map).length) delete doc.gen;
  return out;
}
