// Arbol de elementos del documento (sin DOM): cada elemento con sus puntos y sus relaciones.
import { dist } from './geom.js';
import { conRefs, conTag } from './model.js';
import { dimValue, dimText, DIAM } from './dims.js';

const f = (v, d = 2) => String(Math.round(v * 10 ** d) / 10 ** d);

const CON_NAMES = {
  H: 'Horizontal', V: 'Vertical', PAR: 'Paralelas', PERP: 'Perpendiculares', EQL: 'Igual longitud', EQR: 'Igual radio',
  COI: 'Coincidentes', PONL: 'Coincidente (punto sobre línea)', PONC: 'Coincidente (punto sobre círculo/arco)', PONS: 'Coincidente (punto sobre spline)', PONE: 'Coincidente (punto sobre elipse)',
  COL: 'Colineales', MID: 'Punto medio', CONC: 'Concéntricos', TANLC: 'Tangente', TANEP: 'Tangente en el extremo', TANCC: 'Tangente', TANLS: 'Tangente a spline', TANCS: 'Tangente a spline', TANLE: 'Tangente a elipse', TANCE: 'Tangente a elipse', TANEE: 'Tangente entre elipses',
  DIST: 'Distancia', DISTPL: 'Distancia a recta', ANG: 'Ángulo', ANG4: 'Ángulo', RAD: 'Radio',
  AZ: 'Dirección', EQD: 'Igual distancia', SYM: 'Simetría', GEAR: 'Engranaje', RACK: 'Rueda y cremallera',
};

export function conLabel(doc, k) {
  const tag = conTag(k);
  let s = (tag ? tag + ' · ' : k.name ? k.name + ' · ' : '') + (CON_NAMES[k.t] || k.t);
  if (k.t === 'DIST' || k.t === 'DISTPL') s += ` = ${f(dimValue(doc, k))}`;
  else if (k.t === 'ANG' || k.t === 'ANG4') s += ` = ${dimText(doc, k)}`;
  else if (k.t === 'RAD') s += (k.refs[0] in doc.circles ? ` ${DIAM} = ${f(k.v * 2)}` : ` R = ${f(k.v)}`);
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
const DIM_T = new Set(['DIST', 'DISTPL', 'ANG', 'ANG4', 'RAD']);
const MECH_T = new Set(['GEAR', 'RACK']);
export const conCategory = (k) => (k.hidden ? 'auto' : DIM_T.has(k.t) ? 'dim' : MECH_T.has(k.t) ? 'mech' : 'geo');

// Nodo: { key, label, sel?: {k,id}, con?: id, lock?: boolean|undefined, link?: true, sub?: true, group?: true, children?: [] }
// Cada cosa tiene un solo lugar propio en el arbol; en los demas aparece como enlace (link: true, sin hijos).
// - Una relacion vive en «Relaciones y cotas»; bajo un elemento hay una sola fila «Relaciones (n)» con enlaces.
// - Un punto vive en el primer elemento que lo usa (circulos, lineas, arcos, elipses, splines, textos, actuadores);
//   en los demas es un enlace y en «Puntos» solo quedan los sueltos, que no son de nadie.
export function buildTree(doc) {
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
    key: `tx:${id}`, label: `Texto «${String(t.text).split('\n')[0].slice(0, 24)}»`, sel: { k: 'tx', id },
    children: compact([ptNode(t.pt, 'Inserción:', 'tx', id)]),
  }));
  const hatches = Object.entries(doc.hatches || {}).map(([id, h]) => ({ key: `ha:${id}`, label: `Relleno ${id} (${h.ids.length} contornos)`, sel: { k: 'ha', id } }));
  // solo los puntos sueltos: los que tienen dueño cuelgan de el (los de control, de su spline)
  const pts = Object.entries(doc.pts).filter(([id, p]) => !p.splOnly && !owner.has(id)).map(([id]) => ptNode(id));

  // relaciones por tipo; dentro de cada una, sus elementos como enlaces (sin repetir)
  const conNode = (cid, k) => ({
    key: `co:${cid}`, label: conLabel(doc, k), con: cid, sel: { k: 'co', id: cid },
    children: [...new Set(conRefs(k))].map((r) => {
      const kd = kindOf(doc, r);
      return kd ? { key: `lk:${kd}:${r}`, label: `↗ ${KIND_NAME[kd]} ${r}`, sel: { k: kd, id: r }, link: true } : null;
    }).filter(Boolean),
  });
  const cats = { dim: [], geo: [], mech: [], auto: [] };
  for (const [cid, k] of Object.entries(doc.cons)) cats[conCategory(k)].push(conNode(cid, k));
  const cons = compact([
    cats.dim.length && group('g:co:dim', 'Cotas', cats.dim),
    cats.geo.length && group('g:co:geo', 'Geométricas', cats.geo),
    cats.mech.length && group('g:co:mech', 'Mecánicas', cats.mech),
    cats.auto.length && group('g:co:auto', 'Automáticas', cats.auto),
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
  const out = [
    group('g:ln', 'Líneas', lines), group('g:ci', 'Círculos', circles), group('g:ar', 'Arcos', arcs), group('g:el', 'Elipses', ellipses), group('g:sp', 'Splines', splines),
    group('g:tx', 'Textos', texts), group('g:ha', 'Rellenos', hatches), group('g:pt', 'Puntos sueltos', pts),
    group('g:ac', 'Actuadores', acts), group('g:gr', 'Gráficas', graphs), { key: 'g:co', label: `Relaciones y cotas (${nCons})`, group: true, children: cons }, group('g:tr', 'Trazados', traces),
  ];
  return out.filter((g) => g.children.length);
}
