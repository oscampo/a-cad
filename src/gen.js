// Dibujo generado por scripts. Un texto de calculo puede llamar a point("A"; x; y), line("A"; "B"), circle("A"; r), arc("O"; "A"; "B") y
// spline(["A", "B", "C"]) (ver expr.js): durante la REGENERACION (regenerate), esas llamadas se recogen y se reconcilian con el dibujo. Lo
// generado lo gobierna el script: sus puntos quedan fijos (la definicion del script es su restriccion), se identifica por su nombre (local al
// texto que lo genera) y se reemplaza al regenerar, de modo que las cotas y restricciones que el usuario le puso siguen ahi. Sin DOM: lo prueba
// test/gen.test.mjs. doc.gen = { map: { 'texto/nombre': id } } es la fuente de verdad de que es generado (no una marca en cada elemento: una
// copia tiene un id nuevo y por eso ya no lo es).
import { setGenSink, GEN_RE } from './expr.js';
import { textVars } from './params.js';
import { calcStmts } from './tvars.js';
import { addPoint, addLine, addCircle, addArc, addSpline, allLtypes, deleteItems, nextId, dissolveCtr } from './model.js';

const EPS = 1e-9;
const DIM = new Set(['DIST', 'DISTPL', 'ANG', 'ANG4', 'RAD']);
const fmt = (x) => String(Math.round(x * 1000) / 1000);

// ¿Algun texto llama a las funciones de dibujo? (barato: se mira antes de gastar una evaluacion)
export const hasGenCalls = (doc) => Object.values(doc.texts || {}).some((t) => typeof t.text === 'string' && GEN_RE.test(t.text));
// Los ids de lo generado, y si un id lo es.
export const genSet = (doc) => new Set(Object.values(doc.gen?.map || {}));
export const isGen = (doc, id) => !!doc.gen?.map && Object.values(doc.gen.map).includes(id);
// Soltar: lo seleccionado que genero un script pasa a ser un elemento normal (se puede mover, borrar y restringir). El texto no se toca: su
// llamada sigue ahi pero ya no dibuja eso (doc.gen.rel = { llave: id } guarda lo soltado; al regenerar se salta, y un punto soltado sigue
// sirviendo de extremo a lo que el script aun dibuje). Las cotas y restricciones que tenia se quedan como estan. Devuelve cuantos soltó.
export function releaseGen(doc, sel) {
  const map = doc.gen?.map;
  if (!map) return 0;
  const ids = new Set((sel || []).map((s) => s.id));
  let n = 0;
  doc.gen.rel ||= {};
  for (const [key, id] of Object.entries(map)) {
    if (!ids.has(id)) continue;
    doc.gen.rel[key] = id; delete map[key]; n++;
    if (doc.pts[id]) doc.pts[id].fixed = false;
  }
  if (!Object.keys(doc.gen.rel).length) delete doc.gen.rel;
  if (!Object.keys(map).length && !doc.gen.rel) delete doc.gen;
  return n;
}
// Los textos que generaron lo seleccionado (ids de texto, sin repetir): para decirle al usuario de donde viene y resaltarlos.
export function genOwners(doc, sel) {
  const rev = new Map(Object.entries(doc.gen?.map || {}).map(([k, id]) => [id, k.split('/')[0]]));
  return [...new Set((sel || []).map((s) => rev.get(s.id)).filter(Boolean))];
}

// Lo que piden las llamadas, por texto. Llaves: «texto/nombre» (punto), «texto/a|b» (linea, sin orden), «texto/o:centro#i» (i-esimo circulo de
// ese centro), «texto/a:centro|a|b» (arco) y «texto/s:a|b|c» (spline).
function collector() {
  const req = { pts: new Map(), lines: new Map(), circles: new Map(), arcs: new Map(), splines: new Map(), contours: new Map(), errs: [] };
  let ns = null; const radii = new Map(), cnt = new Map();
  // Un punto que viene de OTRO texto (la variable que lo guarda lleva su texto de origen, o): en la llave se escribe «origen.nombre» para no confundirlo con uno local.
  const qn = (name, o) => (o && o !== ns ? o + '.' + name : name);
  const sink = {
    at: (t) => { ns = t; },
    cur: () => ns,
    point(name, x, y) {
      const key = ns + '/' + name, o = req.pts.get(key);
      if (o && (Math.abs(o.x - x) > EPS || Math.abs(o.y - y) > EPS)) req.errs.push({ ns, msg: `el punto «${name}» se define dos veces con coordenadas distintas` });
      else if (!o) req.pts.set(key, { ns, name, x, y });
    },
    line(a, b, style, o) {
      const key = ns + '/' + [qn(a, o?.a), qn(b, o?.b)].sort().join('|');
      if (!req.lines.has(key)) req.lines.set(key, { ns, a, b, oa: o?.a, ob: o?.b, style });
      else if (style !== undefined) req.lines.get(key).style = style;
    },
    circle(c, r, style, o) {
      const cq = qn(c, o?.c);
      const rs = radii.get(ns + '/' + cq) || radii.set(ns + '/' + cq, []).get(ns + '/' + cq);
      let i = rs.findIndex((q) => Math.abs(q - r) < EPS);
      if (i < 0) { rs.push(r); i = rs.length - 1; }
      const key = ns + '/o:' + cq + '#' + i;
      if (!req.circles.has(key)) req.circles.set(key, { ns, c, oc: o?.c, r, style });
    },
    arc(c, a, b, style, o) {
      const key = ns + '/a:' + [qn(c, o?.c), qn(a, o?.a), qn(b, o?.b)].join('|');
      if (!req.arcs.has(key)) req.arcs.set(key, { ns, c, a, b, oc: o?.c, oa: o?.a, ob: o?.b, style });
      else if (style !== undefined) req.arcs.get(key).style = style;
    },
    spline(names, closed, style) {
      const key = ns + '/s:' + names.join('|') + (closed ? '|cerrado' : '');
      if (!req.splines.has(key)) req.splines.set(key, { ns, names, closed, style });
      else if (style !== undefined) req.splines.get(key).style = style;
    },
    // contour(elementos…): cada elemento viene con su origen (ref); la llave del elemento es la misma que la de su peticion (line, arc, spline).
    // El grupo se identifica por el orden de la llamada dentro del texto («texto/k:#i»), no por sus miembros: cambiar sus elementos no lo reemplaza.
    contour(refs, name) {
      const q2 = (n, o, at) => (o && o !== at ? o + '.' + n : n);
      const keyOf = (r) => (r.k === 'ln' ? r.ns + '/' + [q2(r.a, r.oa, r.ns), q2(r.b, r.ob, r.ns)].sort().join('|')
        : r.k === 'ar' ? r.ns + '/a:' + [q2(r.c, r.oc, r.ns), q2(r.a, r.oa, r.ns), q2(r.b, r.ob, r.ns)].join('|')
          : r.ns + '/s:' + r.names.join('|') + (r.closed ? '|cerrado' : ''));
      const n = (cnt.get(ns) || 0) + 1; cnt.set(ns, n);
      req.contours.set(ns + '/k:#' + n, { ns, keys: refs.map(keyOf), name });
    },
  };
  return { req, sink };
}

// Los nombres que lee un texto (sin lo que va entre comillas). Es una lista de identificadores, de sobra a proposito.
const ID_RE = /[A-Za-z_À-￿][A-Za-z0-9_À-￿]*/g;
function readNames(text) {
  const out = new Set();
  for (const p of calcStmts(text)) for (const m of String(p.expr || '').replace(/"[^"]*"|“[^”]*”/g, ' ').matchAll(ID_RE)) out.add(m[0]);
  return out;
}
// Textos que leen una cota de referencia que mide algo que ellos mismos generaron: el texto depende de la cota y la cota de lo que dibuja el texto.
// Sin esto el dibujo deriva en silencio (cada cambio vuelve a leer una medida distinta). Solo el caso directo: un lazo por otros textos, una
// funcion de otro texto o un punto del usuario ligado a lo generado no se detecta. Devuelve Map(texto -> nombre de la cota).
function loops(doc) {
  const bad = new Map(), byNs = {};
  for (const [key, id] of Object.entries(doc.gen?.map || {})) (byNs[key.split('/')[0]] ||= new Set()).add(id);
  const dims = Object.values(doc.cons || {}).filter((k) => k.ref && k.name && DIM.has(k.t));
  if (!dims.length) return bad;
  for (const [ns, ids] of Object.entries(byNs)) {
    const t = doc.texts?.[ns];
    if (!t || typeof t.text !== 'string') continue;
    const names = readNames(t.text), hit = dims.find((k) => names.has(k.name) && (k.refs || []).some((r) => ids.has(r)));
    if (hit) bad.set(ns, hit.name);
  }
  return bad;
}

// Hace que el dibujo diga lo que piden los textos. Devuelve { changed, errs, notes }: changed = se movio o se creo/borro algo (hay que volver a
// resolver el dibujo); errs: lo que no se pudo (se muestra al usuario); notes: avisos (p. ej. un punto que dejo de generarse pero otros usan).
export function regenerate(doc) {
  const out = { changed: false, errs: [], notes: [] };
  const had = Object.keys(doc.gen?.map || {}).length > 0 || Object.keys(doc.gen?.rel || {}).length > 0;
  if (!had && !hasGenCalls(doc)) return out;
  const { req, sink } = collector();
  let st = null;
  setGenSink(sink);
  try { st = textVars(doc); } catch (e) { out.errs.push(`regenerar el dibujo: ${e.message}`); return out; } finally { setGenSink(null); }
  const badNs = new Set([...(st.genBad || []), ...[...(st.bad || [])].map((k) => String(k).split(':')[0]), ...req.errs.map((e) => e.ns)]); // un texto que falla no borra lo que ya generaba
  for (const e of req.errs) out.errs.push(e.msg);
  // un enunciado con «=» solo muestra: si llama a una funcion propia que dibuja, no genera nada; se avisa para que se asigne (r:f(x))
  const drawers = [...(st.win?.values() || [])].filter((w) => w.kind === 'def' && w.script && GEN_RE.test(String(w.expr || ''))).map((w) => w.name);
  if (drawers.length) {
    for (const t of Object.values(doc.texts || {})) {
      for (const p of calcStmts(t.text)) {
        if (p.k !== 'out' || GEN_RE.test(p.expr)) continue;
        const hit = drawers.find((nm) => new RegExp('(?:^|[^A-Za-z0-9_.])' + String(nm).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\(').test(p.expr));
        if (hit) out.notes.push(`«${p.expr.trim()}=» llama a «${hit}», que dibuja, pero un enunciado con «=» solo muestra: asígnalo (v:${p.expr.trim()}) para que dibuje`);
      }
    }
  }
  // un texto en lazo con una cota de referencia: lo que genera se queda como estaba
  for (const [ns, dimName] of loops(doc)) {
    out.errs.push(`La cota «${dimName}» mide algo que este texto dibuja y el mismo texto la lee: dependencia circular; lo generado queda como estaba`);
    badNs.add(ns);
    for (const m of [req.pts, req.lines, req.circles, req.arcs, req.splines, req.contours]) for (const key of [...m.keys()]) if (key.startsWith(ns + '/')) m.delete(key);
  }
  doc.gen ||= { map: {} };
  // lo soltado: lo que ya no existe se olvida (el script lo vuelve a generar si sigue llamandolo); lo que se pide y esta soltado no se genera
  const rel = doc.gen.rel || {}, alive = (id) => !!(doc.pts[id] || doc.lines[id] || doc.circles[id] || doc.arcs[id] || doc.splines?.[id] || doc.ctrs?.[id]);
  for (const [key, id] of Object.entries(rel)) if (!alive(id)) { delete rel[key]; out.changed = true; }
  const asked = (key) => [req.pts, req.lines, req.circles, req.arcs, req.splines, req.contours].some((m) => m.has(key));
  for (const key of Object.keys(rel)) if (!asked(key) && !badNs.has(key.split('/')[0])) delete rel[key]; // el script (o su texto) ya no lo llama: es un elemento normal del todo
  for (const m of [req.pts, req.lines, req.circles, req.arcs, req.splines, req.contours]) for (const key of [...m.keys()]) if (key in rel) m.delete(key);
  const map = doc.gen.map, seen = new Set(), note = (m) => out.errs.push(m);
  const ltOk = (s) => s === undefined || s in allLtypes(doc);
  const STYLE = (s) => ({ color: 'auto', ltype: s || 'continua', w: 2, ls: 1 });
  // puntos
  for (const [key, r] of req.pts) {
    seen.add(key);
    let id = map[key];
    if (!(id && doc.pts[id])) { id = addPoint(doc, r.x, r.y); map[key] = id; out.changed = true; }
    const p = doc.pts[id];
    if (Math.abs(p.x - r.x) > EPS || Math.abs(p.y - r.y) > EPS) { p.x = r.x; p.y = r.y; out.changed = true; }
    if (!p.fixed) { p.fixed = true; out.changed = true; }
  }
  const pid = (ns, name, from) => map[(from || ns) + '/' + name] || rel[(from || ns) + '/' + name] || (doc.pts[name] ? name : undefined), // from: el texto de origen del punto (si la variable lo trae)
    has = (id) => !!(id && doc.pts[id]); // pid: lo de este texto primero; si no, un punto del dibujo (p5)
  // lineas
  for (const [key, r] of req.lines) {
    const a = pid(r.ns, r.a, r.oa), b = pid(r.ns, r.b, r.ob);
    if (!(has(a) && has(b))) { note(`line("${r.a}"; "${r.b}"): falta un punto: créalo antes con point("${!has(a) ? r.a : r.b}"; x; y)`); continue; }
    if (!ltOk(r.style)) { note(`line("${r.a}"; "${r.b}"): «${r.style}» no es un tipo de línea`); continue; }
    seen.add(key);
    let id = map[key];
    if (!(id && doc.lines[id])) { id = addLine(doc, a, b, STYLE(r.style)); map[key] = id; out.changed = true; }
    const l = doc.lines[id];
    if (l.a !== a || l.b !== b) { l.a = a; l.b = b; out.changed = true; }
    if (r.style !== undefined && l.ltype !== r.style) { l.ltype = r.style; out.changed = true; }
  }
  // circulos
  for (const [key, r] of req.circles) {
    const c = pid(r.ns, r.c, r.oc);
    if (!has(c)) { note(`circle("${r.c}"; r): falta el centro: créalo antes con point("${r.c}"; x; y)`); continue; }
    if (!ltOk(r.style)) { note(`circle("${r.c}"; r): «${r.style}» no es un tipo de línea`); continue; }
    seen.add(key);
    let id = map[key];
    if (!(id && doc.circles[id])) { id = addCircle(doc, c, r.r, STYLE(r.style)); map[key] = id; out.changed = true; }
    const o = doc.circles[id];
    if (o.c !== c) { o.c = c; out.changed = true; }
    if (Math.abs(o.r - r.r) > EPS) { o.r = r.r; out.changed = true; }
    if (r.style !== undefined && o.ltype !== r.style) { o.ltype = r.style; out.changed = true; }
  }
  // arcos: centro y dos extremos (antihorario de a a b); los extremos deben estar a la misma distancia del centro, que es el radio
  for (const [key, r] of req.arcs) {
    const c = pid(r.ns, r.c, r.oc), a = pid(r.ns, r.a, r.oa), b = pid(r.ns, r.b, r.ob);
    if (!(has(c) && has(a) && has(b))) { note(`arc("${r.c}"; "${r.a}"; "${r.b}"): falta un punto: créalo antes con point(nombre; x; y)`); continue; }
    if (!ltOk(r.style)) { note(`arc("${r.c}"; "${r.a}"; "${r.b}"): «${r.style}» no es un tipo de línea`); continue; }
    const C = doc.pts[c], ra = Math.hypot(doc.pts[a].x - C.x, doc.pts[a].y - C.y), rb = Math.hypot(doc.pts[b].x - C.x, doc.pts[b].y - C.y);
    if (!(ra > EPS) || Math.abs(ra - rb) > 1e-6 * Math.max(1, ra)) { note(`arc("${r.c}"; "${r.a}"; "${r.b}"): «${r.a}» y «${r.b}» no están a la misma distancia de «${r.c}» (${fmt(ra)} y ${fmt(rb)})`); continue; }
    seen.add(key);
    let id = map[key];
    if (!(id && doc.arcs[id])) { id = addArc(doc, c, a, b, ra, STYLE(r.style)); map[key] = id; out.changed = true; }
    const o = doc.arcs[id];
    if (o.c !== c || o.a !== a || o.b !== b) { o.c = c; o.a = a; o.b = b; out.changed = true; }
    if (Math.abs(o.r - ra) > EPS) { o.r = ra; out.changed = true; }
    if (r.style !== undefined && o.ltype !== r.style) { o.ltype = r.style; out.changed = true; }
  }
  // splines: por puntos creados con point (al menos 2; 3 si es cerrado)
  for (const [key, r] of req.splines) {
    const ids = r.names.map((n) => pid(r.ns, n)), miss = r.names.find((n, i) => !has(ids[i]));
    if (miss !== undefined) { note(`spline: falta el punto «${miss}»: créalo antes con point("${miss}"; x; y)`); continue; }
    if (!ltOk(r.style)) { note(`spline: «${r.style}» no es un tipo de línea`); continue; }
    seen.add(key);
    let id = map[key];
    if (!(id && doc.splines[id])) { id = addSpline(doc, ids, STYLE(r.style), r.closed); map[key] = id; out.changed = true; }
    const o = doc.splines[id];
    if (o.pts.join('|') !== ids.join('|')) { o.pts = [...ids]; delete o.ts; out.changed = true; }
    if (!!o.closed !== !!r.closed) { o.closed = !!r.closed; delete o.ts; out.changed = true; }
    if (r.style !== undefined && o.ltype !== r.style) { o.ltype = r.style; out.changed = true; }
  }
  // contornos: agrupan los elementos que el script dio (lineas, arcos, splines generados); el grupo (doc.ctrs) tambien es generado
  const CT = { ln: 'lines', ar: 'arcs', sp: 'splines' };
  const kindOf = (id) => (doc.lines[id] ? 'ln' : doc.arcs[id] ? 'ar' : doc.splines?.[id] ? 'sp' : null);
  for (const [key, r] of req.contours) {
    const members = [];
    let bad = null;
    for (const k of r.keys) {
      const eid = map[k] || rel[k], kd = eid && kindOf(eid);
      if (kd) { if (!members.some((m) => m.id === eid)) members.push({ k: kd, id: eid }); } else { bad = k; break; }
    }
    if (bad) { note(`contour: «${bad.split('/').slice(1).join('/')}» no se dibujó (revisa su llamada): el contorno no se crea`); continue; }
    if (members.length < 2) { note('contour: un contorno necesita al menos 2 elementos distintos'); continue; }
    const free = (m) => { const o = doc[CT[m.k]][m.id]; return !o.ctr || !doc.ctrs?.[o.ctr] || o.ctr === map[key]; }; // libre o ya de este grupo
    if (members.filter(free).length < 2) { for (const m of members) if (!free(m)) note(`contour: «${m.id}» ya está en otro grupo (${doc[CT[m.k]][m.id].ctr}); el contorno no se crea`); continue; }
    seen.add(key);
    let id = map[key];
    if (!(id && doc.ctrs?.[id])) { doc.ctrs ||= {}; id = nextId(doc, 'k'); doc.ctrs[id] = {}; map[key] = id; out.changed = true; }
    if (r.name !== undefined && doc.ctrs[id].name !== r.name) { doc.ctrs[id].name = r.name; out.changed = true; }
    const want = new Set(members.map((m) => m.id));
    for (const m of members) {
      const o = doc[CT[m.k]][m.id];
      if (o.ctr === id) continue;
      if (o.ctr && doc.ctrs[o.ctr]) note(`contour: «${m.id}» ya está en otro grupo (${o.ctr}); se deja ahí`);
      else { o.ctr = id; out.changed = true; }
    }
    for (const list of [doc.lines, doc.arcs, doc.splines || {}]) for (const [eid, o] of Object.entries(list)) if (o.ctr === id && !want.has(eid)) { delete o.ctr; out.changed = true; }
  }
  // lo que dejo de pedirse: lineas, circulos, arcos y splines se borran; un punto que otros elementos o cotas usan se suelta (queda como un punto normal)
  const stale = Object.entries(map).filter(([key]) => !seen.has(key) && (!badNs.has(key.split('/')[0]) || !doc.texts?.[key.split('/')[0]]));
  const staleIds = new Set(stale.map(([, id]) => id));
  const usedByOthers = (id) => {
    const gone = (x) => staleIds.has(x);
    return Object.entries(doc.lines).some(([lid, l]) => (l.a === id || l.b === id) && !gone(lid))
      || Object.entries(doc.circles).some(([cid, c]) => c.c === id && !gone(cid))
      || Object.entries(doc.arcs).some(([aid, a]) => (a.c === id || a.a === id || a.b === id) && !gone(aid))
      || Object.values(doc.ellipses || {}).some((e) => [e.c, e.a, e.b, e.p1, e.p2].includes(id))
      || Object.entries(doc.splines || {}).some(([sid, sp]) => sp.pts.includes(id) && !gone(sid))
      || Object.values(doc.texts || {}).some((t) => t.pt === id)
      || Object.values(doc.cons || {}).some((k) => (k.refs || []).includes(id));
  };
  const items = [];
  for (const [key, id] of stale) {
    delete map[key];
    if (doc.lines[id]) items.push({ k: 'ln', id });
    else if (doc.circles[id]) items.push({ k: 'ci', id });
    else if (doc.arcs[id]) items.push({ k: 'ar', id });
    else if (doc.splines?.[id]) items.push({ k: 'sp', id });
    else if (doc.ctrs?.[id]) { dissolveCtr(doc, id); out.changed = true; } // el script ya no pide el contorno: sus elementos quedan sin grupo
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
  if (!Object.keys(rel).length) delete doc.gen.rel;
  if (!Object.keys(map).length && !doc.gen.rel) delete doc.gen;
  return out;
}
