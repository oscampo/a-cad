// Arbol de elementos del documento (sin DOM): cada elemento con sus puntos y sus relaciones.
import { dist } from './geom.js';
import { conRefs, conTag } from './model.js';
import { dimValue, dimText, DIAM } from './dims.js';

const f = (v, d = 2) => String(Math.round(v * 10 ** d) / 10 ** d);

const CON_NAMES = {
  H: 'Horizontal', V: 'Vertical', DSH: 'Distribución horizontal', DSV: 'Distribución vertical', PAR: 'Paralelas', PERP: 'Perpendiculares', EQL: 'Igual longitud', EQR: 'Igual radio',
  COI: 'Coincidentes', PONL: 'Coincidente (punto sobre línea)', PONC: 'Coincidente (punto sobre círculo/arco)', PONS: 'Coincidente (punto sobre spline)', PONE: 'Coincidente (punto sobre elipse)',
  COL: 'Colineales', MID: 'Punto medio', CONC: 'Concéntricos', TANLC: 'Tangente', TANEP: 'Tangente en el extremo', TANCC: 'Tangente', TANLS: 'Tangente a spline', TANCS: 'Tangente a spline', TANLE: 'Tangente a elipse', TANCE: 'Tangente a elipse', TANEE: 'Tangente entre elipses',
  DIST: 'Distancia', DISTPL: 'Distancia a recta', ANG: 'Ángulo', ANG4: 'Ángulo', RAD: 'Radio', LEAD: 'Línea indicativa',
  AZ: 'Dirección', EQD: 'Igual distancia', SYM: 'Simetría', GEAR: 'Engranaje', RACK: 'Rueda y cremallera',
};

export function conLabel(doc, k) {
  const tag = conTag(k);
  let s = (tag ? tag + ' · ' : k.name ? k.name + ' · ' : '') + (CON_NAMES[k.t] || k.t);
  if (k.t === 'DIST' || k.t === 'DISTPL') s += ` = ${f(dimValue(doc, k))}`;
  else if (k.t === 'ANG' || k.t === 'ANG4') s += ` = ${dimText(doc, k)}`;
  else if (k.t === 'RAD') s += (k.refs[0] in doc.circles ? ` ${DIAM} = ${f(k.v * 2)}` : ` R = ${f(k.v)}`);
  else if (k.t === 'LEAD') s += ` «${dimText(doc, k)}»`;
  else if (k.t === 'GEAR') s += ` (giro 2 / giro 1 = ${f(k.ratio)})`;
  else if (k.t === 'RACK') s += ` (avance / giro = ${f(k.ratio)})`;
  if (k.finite) s += k.stop ? ' (solo en los límites, con tope)' : ' (solo en los límites)';
  if (k.expr && !k.ref) s += ` (= ${k.expr})`;
  if (k.ref) s += ' (referencia)';
  if (k.hidden) s += k.vec ? ' (magnitud de vector)' : ' (auto)';
  return s;
}

const kindOf = (doc, id) => (id in doc.pts ? 'pt' : id in doc.lines ? 'ln' : id in doc.circles ? 'ci' : id in doc.arcs ? 'ar' : id in (doc.splines || {}) ? 'sp' : id in (doc.ellipses || {}) ? 'el' : null);
export { kindOf };

const KIND_NAME = { pt: 'Punto', ln: 'Línea', ci: 'Círculo', ar: 'Arco', sp: 'Spline', el: 'Elipse', tx: 'Texto', ac: 'Actuador' };
// Tipos de relacion por grupo dentro de «Relaciones y cotas» (las ocultas van a «Automáticas»).
const DIM_T = new Set(['DIST', 'DISTPL', 'ANG', 'ANG4', 'RAD', 'LEAD']);
const MECH_T = new Set(['GEAR', 'RACK']);
export const OP_NAMES = { MATL: 'Matriz lineal', MATC: 'Matriz circular', ESP: 'Copia espejo', RED: 'Redondeo', CHA: 'Chaflán', DIV: 'División', POL: 'Polígono' };
// origen de una relacion automatica: { key, label, ord? } (ord: orden en que se hizo la operacion)
export function autoOrigin(doc, k) {
  const op = k.op && doc.ops?.[k.op];
  if (op) return { key: k.op, label: `${OP_NAMES[op.t] || op.t} ${op.n}`, ord: Number(k.op.slice(1)) || 0 };
  if (k.shape) return { key: `shape:${k.shape}`, label: `Forma fija del spline ${k.shape}` };
  if (k.vec) return { key: `vec:${k.vec}`, label: `Vector ${k.vec}` };
  return { key: `t:${k.t}`, label: CON_NAMES[k.t] || k.t };
}
export const conCategory = (k) => (k.hidden ? 'auto' : DIM_T.has(k.t) ? 'dim' : MECH_T.has(k.t) ? 'mech' : 'geo');

// Contornos: elementos de trazo encadenados por sus extremos (lineas y arcos no constructivos, arcos elipticos y splines
// abiertas). Dos extremos se tocan si son el mismo punto, puntos atados por una coincidencia (COI) o puntos en el mismo
// lugar sin nada que los ate (loose: cuantas uniones asi tiene el contorno). Cada grupo conectado
// de dos o mas elementos es un contorno: cerrado si cada nudo junta exactamente dos extremos, ramificado si alguno junta
// tres o mas, abierto si no. Devuelve [{ items: [{k,id}] en el orden en que se recorren, closed, branched, loose, gap? }].
export function contours(doc) {
  const solid = (o) => o.ltype !== 'constructiva';
  const edges = [];
  for (const [id, l] of Object.entries(doc.lines)) if (solid(l) && !l.vec) edges.push({ k: 'ln', id, ends: [l.a, l.b] });
  for (const [id, a] of Object.entries(doc.arcs)) if (solid(a)) edges.push({ k: 'ar', id, ends: [a.a, a.b] });
  for (const [id, e] of Object.entries(doc.ellipses || {})) if (solid(e) && e.p1 && e.p2) edges.push({ k: 'el', id, ends: [e.p1, e.p2] });
  for (const [id, sp] of Object.entries(doc.splines || {})) if (solid(sp) && !sp.closed && sp.pts.length > 1) edges.push({ k: 'sp', id, ends: [sp.pts[0], sp.pts[sp.pts.length - 1]] });
  if (edges.length < 2) return [];
  // puntos atados por COI: union-find en una sola pasada por las relaciones
  const up = new Map();
  const root = (p) => { let r = p; while (up.has(r)) r = up.get(r); while (up.has(p)) { const n = up.get(p); up.set(p, r); p = n; } return r; };
  for (const k of Object.values(doc.cons)) {
    if (k.t !== 'COI' || k.ref || k.refs.length !== 2 || !(k.refs[0] in doc.pts) || !(k.refs[1] in doc.pts)) continue;
    const a = root(k.refs[0]), b = root(k.refs[1]);
    if (a !== b) up.set(a, b);
  }
  // extremos en el mismo lugar sin relacion que los ate (tolerancia: una millonesima del tamaño del dibujo): se unen
  // igual, porque asi se ve el contorno, pero se cuentan aparte; al mover el dibujo esas uniones se pueden abrir
  const ends = [...new Set(edges.flatMap((e) => e.ends))].filter((p) => doc.pts[p]);
  const xs = ends.map((p) => doc.pts[p].x), ys = ends.map((p) => doc.pts[p].y);
  const size = Math.max(1, Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const tol = 1e-6 * size;
  const cell = new Map(), loose = [];
  const ck = (x, y) => `${Math.floor(x / tol)},${Math.floor(y / tol)}`;
  for (const p of ends) {
    const q = doc.pts[p], cx = Math.floor(q.x / tol), cy = Math.floor(q.y / tol);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const o of cell.get(`${cx + i},${cy + j}`) || []) {
      const w = doc.pts[o];
      if (Math.hypot(w.x - q.x, w.y - q.y) > tol) continue;
      const a = root(p), b = root(o);
      if (a !== b) { up.set(a, b); loose.push(p); }
    }
    const k = ck(q.x, q.y); if (!cell.has(k)) cell.set(k, []); cell.get(k).push(p);
  }
  for (const e of edges) e.ends = e.ends.map(root);
  const looseAt = new Map(); for (const p of loose) { const r = root(p); looseAt.set(r, (looseAt.get(r) || 0) + 1); }
  const at = new Map(); // nudo -> aristas que llegan (una arista cerrada sobre si misma llega dos veces)
  for (const e of edges) for (const n of e.ends) { if (!at.has(n)) at.set(n, []); at.get(n).push(e); }
  const seen = new Set(), out = [];
  for (const e0 of edges) {
    if (seen.has(e0)) continue;
    // grupo conectado
    const comp = [], nodes = new Set(), stack = [e0];
    seen.add(e0);
    while (stack.length) {
      const e = stack.pop(); comp.push(e);
      for (const n of e.ends) { nodes.add(n); for (const f of at.get(n)) if (!seen.has(f)) { seen.add(f); stack.push(f); } }
    }
    if (comp.length < 2) continue;
    const deg = [...nodes].map((n) => at.get(n).length);
    const branched = deg.some((d) => d > 2), closed = !branched && deg.every((d) => d === 2);
    // orden de recorrido: desde un extremo libre (abierto) o desde cualquiera (cerrado); ramificado, en el orden del dibujo
    let items = comp;
    if (!branched) {
      let cur = closed ? comp[0].ends[0] : [...nodes].find((n) => at.get(n).length === 1);
      const used = new Set(); items = [];
      for (;;) {
        const e = at.get(cur).find((f) => !used.has(f));
        if (!e) break;
        used.add(e); items.push(e);
        cur = e.ends[0] === cur ? e.ends[1] : e.ends[0];
      }
    }
    const looseN = [...nodes].reduce((n, x) => n + (looseAt.get(x) || 0), 0);
    const free = [...nodes].filter((n) => at.get(n).length === 1 && doc.pts[n]); // extremos libres (un nudo es un punto)
    out.push({ items: items.map(({ k, id }) => ({ k, id })), closed, branched, loose: looseN, free });
  }
  // abertura: para cada contorno con extremos libres, el extremo libre mas cercano a uno de los suyos (de otro contorno o
  // el otro extremo del mismo). Solo cuenta hasta el 1 % del tamaño del dibujo: mas lejos no es una abertura, es un trazo
  // abierto. gap: { d, with } (with: indice del otro contorno, o el propio si casi se cierra solo).
  const fr = out.flatMap((c, i) => c.free.map((n) => ({ i, n, x: doc.pts[n].x, y: doc.pts[n].y }))).sort((a, b) => a.x - b.x);
  const lim = 0.01 * size;
  for (let a = 0; a < fr.length; a++) {
    for (let b = a + 1; b < fr.length && fr[b].x - fr[a].x <= lim; b++) { // barrido por x: solo los vecinos posibles
      const d = Math.hypot(fr[b].x - fr[a].x, fr[b].y - fr[a].y);
      if (d > lim) continue;
      for (const [u, v] of [[fr[a], fr[b]], [fr[b], fr[a]]]) {
        const c = out[u.i];
        if (!c.gap || d < c.gap.d) c.gap = { d, with: v.i };
      }
    }
  }
  for (const c of out) delete c.free;
  return out;
}

// Nodo: { key, label, sel?: {k,id}, con?: id, lock?: boolean|undefined, link?: true, sub?: true, group?: true, children?: [] }
// Cada cosa tiene un solo lugar propio en el arbol; en los demas aparece como enlace (link: true, sin hijos).
// - Una relacion vive en «Relaciones y cotas»; bajo un elemento hay una sola fila «Relaciones (n)» con enlaces.
// - Un punto vive en el primer elemento que lo usa (circulos, lineas, arcos, elipses, splines, textos, actuadores);
//   en los demas es un enlace y en «Puntos» solo quedan los sueltos, que no son de nadie.
// Con { by: 'layer' } el primer nivel son las capas («Sin capa» al final) y dentro de cada una los mismos grupos por tipo;
// contornos, relaciones, actuadores, graficas y trazados no tienen capa y van despues. Un punto con dueño sigue a su elemento.
export function buildTree(doc, { by = 'type' } = {}) {
  const compact = (a) => a.filter(Boolean);
  const group = (key, label, items) => ({ key, label: `${label} (${items.length})`, group: true, children: items });

  // indice de relaciones por elemento, una sola pasada (antes se recorrian todas por cada elemento)
  const consBy = new Map();
  for (const [cid, k] of Object.entries(doc.cons)) {
    for (const r of new Set(conRefs(k))) { if (!consBy.has(r)) consBy.set(r, []); consBy.get(r).push(cid); }
  }

  // dueño de cada punto: el primer elemento que lo usa (circulos, lineas, arcos, elipses, splines, textos, actuadores)
  const owner = new Map();
  const own = (pid, k, id, name) => { if (pid && doc.pts[pid] && !owner.has(pid)) owner.set(pid, { k, id, name }); };
  // los circulos primero: su centro es mas suyo que de una linea que llega hasta el (el eje de un engrane)
  for (const [id, c] of Object.entries(doc.circles)) own(c.c, 'ci', id, `Círculo ${id}`);
  for (const [id, l] of Object.entries(doc.lines)) { const nm = `${l.vec ? 'Vector' : 'Línea'} ${id}`; own(l.a, 'ln', id, nm); own(l.b, 'ln', id, nm); }
  for (const [id, a] of Object.entries(doc.arcs)) for (const p of [a.c, a.a, a.b]) own(p, 'ar', id, `Arco ${id}`);
  for (const [id, e] of Object.entries(doc.ellipses || {})) for (const p of [e.c, e.a, e.b, e.p1, e.p2]) own(p, 'el', id, `Elipse ${id}`);
  for (const [id, s] of Object.entries(doc.splines || {})) for (const p of s.pts) own(p, 'sp', id, `Spline ${id}`);
  for (const [id, t] of Object.entries(doc.texts || {})) own(t.pt, 'tx', id, `Texto ${id}`);
  for (const [id, a] of Object.entries(doc.acts || {})) for (const p of a.kind === 'MR' ? [a.c] : [a.p1, a.p2]) own(p, 'ac', id, `${a.kind}${a.n}`);

  const conLink = (cid) => ({ key: `lk:co:${cid}`, label: `↗ ${conLabel(doc, doc.cons[cid])}`, con: cid, sel: { k: 'co', id: cid }, link: true });
  // fila «Relaciones (n)» de un elemento: las suyas y las de los puntos que le pertenecen, sin las automaticas
  // (esas se cuentan aparte y viven en «Relaciones y cotas › Automáticas»)
  const relsNode = (key, ids) => {
    const seen = new Set();
    for (const id of ids) for (const cid of consBy.get(id) || []) seen.add(cid);
    const all = [...seen];
    const vis = all.filter((cid) => !doc.cons[cid].hidden);
    const auto = all.length - vis.length;
    if (!all.length) return null;
    const label = vis.length ? `Relaciones (${vis.length}${auto ? `, +${auto} automática${auto > 1 ? 's' : ''}` : ''})` : `Relaciones: solo ${auto} automática${auto > 1 ? 's' : ''}`;
    return { key: `rl:${key}`, sub: true, label, children: vis.map(conLink) };
  };
  const ownedPts = (k, id, pts) => pts.filter((p) => { const o = owner.get(p); return o && o.k === k && o.id === id; });

  const ptNode = (id, role, k, oid) => {
    const p = doc.pts[id];
    if (!p) return null;
    const o = owner.get(id);
    const pre = role ? role + ' ' : '';
    if (o && !(o.k === k && o.id === oid)) {
      return { key: `lk:pt:${id}`, label: `${pre}↗ Punto ${id} (en ${o.name})`, sel: { k: 'pt', id }, link: true };
    }
    // un punto suelto (sin dueño) lleva sus relaciones directo; uno con dueño las deja en la fila de su elemento
    const kids = o ? [] : (consBy.get(id) || []).filter((cid) => !doc.cons[cid].hidden).map(conLink);
    return { key: `pt:${id}`, label: `${pre}Punto ${id} (${f(p.x)}, ${f(p.y)})`, sel: { k: 'pt', id }, lock: !!p.fixed, children: kids };
  };
  const elem = (k, id, label, pts, extra = []) => ({
    key: `${k}:${id}`, label, sel: { k, id },
    children: compact([relsNode(`${k}:${id}`, [id, ...ownedPts(k, id, pts.map(([p]) => p))]), ...pts.map(([p, role]) => ptNode(p, role, k, id)), ...extra]),
  });

  const lines = Object.entries(doc.lines).map(([id, l]) => elem('ln', id, `${l.vec ? 'Vector' : 'Línea'} ${id} · ${l.vec ? '|v|' : 'L'} = ${f(dist(doc.pts[l.a], doc.pts[l.b]))}`, [[l.a, 'A:'], [l.b, 'B:']]));
  const circles = Object.entries(doc.circles).map(([id, c]) => elem('ci', id, `Círculo ${id} · ${DIAM} = ${f(2 * c.r)}`, [[c.c, 'Centro:']]));
  const arcs = Object.entries(doc.arcs).map(([id, a]) => elem('ar', id, `Arco ${id} · R = ${f(a.r)}`, [[a.c, 'Centro:'], [a.a, 'Inicio:'], [a.b, 'Fin:']]));
  const splines = Object.entries(doc.splines || {}).map(([id, s]) => {
    const n = elem('sp', id, `Spline ${id} · ${s.pts.length} puntos${s.closed ? ', cerrada' : ''}`, []);
    n.children = compact([relsNode(`sp:${id}`, [id, ...ownedPts('sp', id, s.pts)]), { key: `spp:${id}`, sub: true, label: `Puntos de control (${s.pts.length})`, children: compact(s.pts.map((p) => ptNode(p, '', 'sp', id))) }]);
    return n;
  });
  const ellipses = Object.entries(doc.ellipses || {}).map(([id, e]) => elem('el', id, `${e.p1 && e.p2 ? 'Arco elíptico' : 'Elipse'} ${id}`,
    [[e.c, 'Centro:'], [e.a, 'Eje 1:'], [e.b, 'Eje 2:'], ...(e.p1 && e.p2 ? [[e.p1, 'Inicio:'], [e.p2, 'Fin:']] : [])]));
  const texts = Object.entries(doc.texts || {}).map(([id, t]) => ({
    key: `tx:${id}`, label: `Texto ${id} · «${String(t.text).split('\n')[0].slice(0, 24)}»`, sel: { k: 'tx', id }, // con su nombre (t29), como «Línea l5»
    children: compact([ptNode(t.pt, 'Inserción:', 'tx', id)]),
  }));
  const hatches = Object.entries(doc.hatches || {}).map(([id, h]) => ({ key: `ha:${id}`, label: `Relleno ${id} (${h.ids.length} contornos)`, sel: { k: 'ha', id } }));
  // solo los puntos sueltos: los que tienen dueño cuelgan de el (los de control, de su spline)
  const pts = Object.entries(doc.pts).filter(([id, p]) => !p.splOnly && !owner.has(id)).map(([id]) => ptNode(id));
  // grupos por tipo de los elementos que pueden tener capa: [clave, nombre, nodos, coleccion del documento]
  const LAYERED = [['g:ln', 'Líneas', lines, 'lines'], ['g:ci', 'Círculos', circles, 'circles'], ['g:ar', 'Arcos', arcs, 'arcs'], ['g:el', 'Elipses', ellipses, 'ellipses'],
    ['g:sp', 'Splines', splines, 'splines'], ['g:tx', 'Textos', texts, 'texts'], ['g:ha', 'Rellenos', hatches, 'hatches'], ['g:pt', 'Puntos sueltos', pts, 'pts']];
  const layOf = (coll, n) => { const l = doc[coll]?.[n.sel.id]?.layer; return l && doc.layers?.[l] ? l : null; };
  const typeGroups = (inLayer) => LAYERED.map(([key, label, items, coll]) => group(key, label, inLayer ? items.filter((n) => layOf(coll, n) === inLayer.id) : items));

  // relaciones por tipo; dentro de cada una, sus elementos como enlaces (sin repetir)
  const conNode = (cid, k) => ({
    key: `co:${cid}`, label: conLabel(doc, k), con: cid, sel: { k: 'co', id: cid },
    children: [...new Set(conRefs(k))].map((r) => {
      const kd = kindOf(doc, r);
      return kd ? { key: `lk:${kd}:${r}`, label: `↗ ${KIND_NAME[kd]} ${r}`, sel: { k: kd, id: r }, link: true } : null;
    }).filter(Boolean),
  });
  const cats = { dim: [], geo: [], mech: [], auto: [] };
  // las automaticas, agrupadas por su origen (la operacion que las creo, la forma fija o el vector);
  // sin origen (dibujos anteriores, o al dibujar sobre un elemento), por tipo
  const autoBy = new Map();
  for (const [cid, k] of Object.entries(doc.cons)) {
    const c = conCategory(k);
    if (c !== 'auto') { cats[c].push(conNode(cid, k)); continue; }
    const o = autoOrigin(doc, k);
    if (!autoBy.has(o.key)) autoBy.set(o.key, { ...o, items: [] });
    autoBy.get(o.key).items.push(conNode(cid, k));
  }
  // primero las operaciones (en el orden en que se hicieron), luego las de por tipo
  const autoGroups = [...autoBy.values()].sort((a, b) => (a.ord ?? 1e15) - (b.ord ?? 1e15))
    .map((o) => ({ key: `g:co:auto:${o.key}`, sub: true, label: `${o.label} (${o.items.length})`, children: o.items }));
  const nAuto = autoGroups.reduce((s, g) => s + g.children.length, 0);
  const cons = compact([
    cats.dim.length && group('g:co:dim', 'Cotas', cats.dim),
    cats.geo.length && group('g:co:geo', 'Geométricas', cats.geo),
    cats.mech.length && group('g:co:mech', 'Mecánicas', cats.mech),
    nAuto && { key: 'g:co:auto', label: `Automáticas (${nAuto})`, group: true, children: autoGroups },
  ]);
  const nCons = Object.keys(doc.cons).length;
  const traces = Object.entries(doc.traces || {}).map(([id, t]) => ({ key: `tr:${id}`, label: `Trazado del punto ${id} · ${t.pts.length} muestras`, sel: doc.pts[id] ? { k: 'pt', id } : null }));

  const acts = Object.entries(doc.acts || {}).map(([id, a]) => ({
    key: `ac:${id}`, act: id, label: `${a.kind}${a.n} · ${a.mode === 'vel' ? 'velocidad' : 'desplazamiento'} = ${a.src === 'table' ? `tabla (${(a.table || []).length} filas)` : a.expr}`,
    children: a.kind === 'MR'
      ? compact([doc.lines[a.line] ? { key: `lk:ln:${a.line}`, label: `↗ Línea ${a.line}`, sel: { k: 'ln', id: a.line }, link: true } : null, ptNode(a.c, 'Centro:', 'ac', id)])
      : compact([ptNode(a.p1, 'Cola:', 'ac', id), ptNode(a.p2, 'Cabeza:', 'ac', id)]),
  }));
  const graphs = Object.entries(doc.graphs || {}).map(([id, g]) => ({ key: `gr:${id}`, act: id, label: `Gráfica ${id} · ${(g.series || []).join(', ') || 'sin relaciones'}` }));
  // contornos: el contorno selecciona todos sus elementos; dentro, sus elementos como enlaces en el orden del recorrido
  // abertura con tres cifras significativas (0.0143), con quien: el otro contorno, o «entre sus extremos» si casi se cierra solo
  const gapText = (c, i) => (c.gap ? ` · abertura ${Number(c.gap.d.toPrecision(3))} ${c.gap.with === i ? 'entre sus extremos' : `con el ${c.gap.with + 1}`}` : '');
  const KN = { ln: ['línea', 'líneas'], ar: ['arco', 'arcos'], el: ['arco elíptico', 'arcos elípticos'], sp: ['spline', 'splines'] };
  const ctNodes = contours(doc).map((c, i) => {
    const cnt = {}; for (const it of c.items) cnt[it.k] = (cnt[it.k] || 0) + 1;
    const what = Object.entries(cnt).map(([k, n]) => `${n} ${KN[k][n > 1 ? 1 : 0]}`).join(', ');
    return {
      key: `ct:${c.items[0].k}:${c.items[0].id}`, selMany: c.items,
      // el aviso va antes de la composicion: en el panel angosto la etiqueta se corta por el final
      label: `Contorno ${i + 1} · ${c.closed ? 'cerrado' : c.branched ? 'ramificado' : 'abierto'}${gapText(c, i)}${c.loose ? ` · ${c.loose} ${c.loose > 1 ? 'uniones' : 'unión'} sin restricción` : ''} · ${what}`,
      children: c.items.map((it) => ({ key: `lk:${it.k}:${it.id}`, label: `↗ ${KIND_NAME[it.k]} ${it.id}`, sel: it, link: true })),
    };
  });
  const rest = [group('g:ct', 'Contornos', ctNodes), group('g:ac', 'Actuadores', acts), group('g:gr', 'Gráficas', graphs), { key: 'g:co', label: `Relaciones y cotas (${nCons})`, group: true, children: cons }, group('g:tr', 'Trazados', traces)];
  const nonEmpty = (a) => a.filter((g) => g.children.length);
  if (by !== 'layer' || !Object.keys(doc.layers || {}).length) return nonEmpty([...typeGroups(null), ...rest]);
  // por capa: todas las capas (tambien las vacias, para verlas y encenderlas) y «Sin capa» si tiene algo
  const layerGroups = [...Object.entries(doc.layers).map(([id, l]) => ({ id, l })), { id: null }].map(({ id, l }) => {
    const kids = nonEmpty(typeGroups({ id }));
    const n = kids.reduce((s, g) => s + g.children.length, 0);
    if (!id && !n) return null;
    return { key: `g:y:${id ?? '-'}`, group: true, layerId: id, label: id ? `${l.name} (${n})${l.on ? '' : ' · apagada'}` : `Sin capa (${n})`, children: kids };
  });
  return [...compact(layerGroups), ...nonEmpty(rest)];
}
