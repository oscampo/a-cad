// Redondeos y chaflanes en la esquina de dos lineas (sin DOM; quien llama hace undo y resuelve).
// El punto de la esquina NO se borra: queda como «vertice virtual» (la interseccion de las dos rectas), ligado a ambas
// lineas con restricciones ocultas. Asi siguen valiendo las cotas y relaciones que lo usaban (el ancho de un rectangulo,
// el radio de un poligono) y el redondeo es parametrico: el radio es una cota que se puede editar.
// Las cotas de longitud (que son distancias entre los dos puntos de la linea) siguen valiendo porque el vertice virtual no
// se mueve; la igualdad de longitudes entre lineas (EQL) no, porque la linea ahora es mas corta: se pasa a igualdad de
// distancias entre el otro extremo y el vertice virtual (EQD).
import { addPoint, addLine, addArc, addCon, withOp, arcOf, ellipseOf, ellipsePoint, ellipseParam, ellipseRange, isPartial } from './model.js';
import { norm, TAU } from './geom.js';
import { cutEnd } from './edit.js';

const fmt = (x) => String(Math.round(x * 1000) / 1000);

// El punto y los que la restriccion de coincidencia (COI) pone en el mismo sitio: dos elementos dibujados por separado que se
// juntan en una esquina terminan en puntos distintos.
export function coincidentIds(doc, pid) {
  const ids = new Set([pid]);
  for (let grew = true; grew;) {
    grew = false;
    for (const k of Object.values(doc.cons)) {
      if (k.t !== 'COI' || k.ref || k.refs.length !== 2 || !(k.refs[0] in doc.pts) || !(k.refs[1] in doc.pts)) continue;
      const [a, b] = k.refs;
      if (ids.has(a) !== ids.has(b)) { ids.add(a); ids.add(b); grew = true; }
    }
  }
  return ids;
}
// Elementos de trazo (no constructivos) que terminan en el punto pid (o en uno coincidente): segmentos, arcos y arcos elipticos.
export function cornerElements(doc, pid) {
  const out = [], solid = (o) => o.ltype !== 'constructiva', ids = coincidentIds(doc, pid);
  for (const [id, l] of Object.entries(doc.lines)) if ((ids.has(l.a) || ids.has(l.b)) && solid(l)) out.push({ k: 'ln', id });
  for (const [id, a] of Object.entries(doc.arcs)) if ((ids.has(a.a) || ids.has(a.b)) && solid(a)) out.push({ k: 'ar', id });
  for (const [id, e] of Object.entries(doc.ellipses || {})) if (isPartial(e) && (ids.has(e.p1) || ids.has(e.p2)) && solid(e)) out.push({ k: 'el', id });
  return out;
}
// Si en pid se juntan exactamente dos elementos de trazo y alguno no es un segmento (un arco, un arco eliptico), el par
// para redondear o achaflanar con filletBetween / chamferBetween; si no, null (esquina de dos segmentos: cornerOf).
export function cornerPair(doc, pid) {
  const els = cornerElements(doc, pid);
  if (els.length !== 2) return null;
  if (els.every((e) => e.k === 'ln') && doc.lines[els[0].id] && [doc.lines[els[0].id].a, doc.lines[els[0].id].b].some((p) => p === doc.lines[els[1].id].a || p === doc.lines[els[1].id].b)) return null; // dos segmentos con un extremo comun: cornerOf
  return els;
}

// Las dos lineas que se juntan en el punto pid y la geometria de la esquina. { ok, ... } o { ok: false, msg }.
export function cornerOf(doc, pid) {
  const P = doc.pts[pid];
  if (!P) return { ok: false, msg: 'No hay punto' };
  let ls = Object.entries(doc.lines).filter(([, l]) => l.a === pid || l.b === pid);
  const solid = ls.filter(([, l]) => l.ltype !== 'constructiva');
  if (solid.length >= 2) ls = solid; // las constructivas que pasan por la esquina no cuentan
  if (ls.length < 2) return { ok: false, msg: 'Ese punto no es la esquina de dos líneas' };
  if (ls.length > 2) return { ok: false, msg: 'En ese punto se juntan más de dos líneas' };
  if (ls.some(([, l]) => l.vec)) return { ok: false, msg: 'Un vector no se redondea ni se achaflana' };
  const arm = ([id, l]) => {
    const o = l.a === pid ? l.b : l.a, Q = doc.pts[o], len = Math.hypot(Q.x - P.x, Q.y - P.y);
    return { id, field: l.a === pid ? 'a' : 'b', other: o, len, u: { x: (Q.x - P.x) / len, y: (Q.y - P.y) / len } };
  };
  const A = arm(ls[0]), B = arm(ls[1]);
  if (A.id === B.id || !(A.len > 1e-9) || !(B.len > 1e-9)) return { ok: false, msg: 'Líneas sin longitud' };
  const cos = A.u.x * B.u.x + A.u.y * B.u.y, cross = A.u.x * B.u.y - A.u.y * B.u.x;
  if (Math.abs(cross) < 1e-6) return { ok: false, msg: cos > 0 ? 'Las dos líneas van en la misma dirección' : 'Las dos líneas están alineadas: no hay esquina' };
  return { ok: true, pid, P, A, B, theta: Math.atan2(Math.abs(cross), cos), cross };
}

// Estilo de la linea (color, tipo, grosor, capa) para lo que se crea junto a ella.
const styleOf = (l) => { const s = {}; for (const k of ['color', 'ltype', 'w', 'ls', 'layer']) if (l[k] !== undefined) s[k] = l[k]; return s; };

// Pasa la igualdad de longitud (EQL) de las lineas recortadas a igualdad de distancia (EQD) entre dos pares de puntos.
function keepLengths(doc, C) {
  const cut = new Map([[C.A.id, [C.A.other, C.pid]], [C.B.id, [C.B.other, C.pid]]]);
  const ends = (lid) => cut.get(lid) || [doc.lines[lid].a, doc.lines[lid].b];
  for (const k of Object.values(doc.cons)) {
    if (k.t === 'EQL' && k.refs.length === 2 && k.refs.some((x) => cut.has(x))) { k.t = 'EQD'; k.refs = [...ends(k.refs[0]), ...ends(k.refs[1])]; }
  }
}

// Sustituye en la linea el extremo de la esquina por el punto q, y deja el vertice virtual ligado a las dos rectas.
function cutArms(doc, C, q1, q2) {
  doc.lines[C.A.id][C.A.field] = q1; doc.lines[C.B.id][C.B.field] = q2;
  doc.pts[C.pid].auto = false;
  addCon(doc, { t: 'PONL', refs: [C.pid, C.A.id], hidden: true });
  addCon(doc, { t: 'PONL', refs: [C.pid, C.B.id], hidden: true });
}
// Un relleno cuyo contorno pasaba por las dos lineas incluye tambien lo nuevo.
function growHatches(doc, C, id) {
  for (const h of Object.values(doc.hatches || {})) if (h.ids.includes(C.A.id) && h.ids.includes(C.B.id)) h.ids.push(id);
}

// Radio maximo de un redondeo en esa esquina: el punto de tangencia no puede pasar del otro extremo de la linea mas corta.
export const maxFillet = (C) => Math.min(C.A.len, C.B.len) * Math.tan(C.theta / 2);

// Redondeo de radio r: un arco tangente a las dos lineas. Devuelve { ok, arc, pts } o { ok: false, msg }.
function filletCorner0(doc, pid, r) {
  const C = cornerOf(doc, pid);
  if (!C.ok) return C;
  if (!(r > 0) || !Number.isFinite(r)) return { ok: false, msg: 'El radio debe ser mayor que cero' };
  const t = r / Math.tan(C.theta / 2), tmax = Math.min(C.A.len, C.B.len);
  if (t >= tmax * (1 - 1e-9)) return { ok: false, msg: `El radio es demasiado grande para esa esquina (máximo ${fmt(maxFillet(C) * 0.999)})` };
  const { P, A, B } = C;
  const b = { x: A.u.x + B.u.x, y: A.u.y + B.u.y }, bl = Math.hypot(b.x, b.y), d = r / Math.sin(C.theta / 2);
  const q1 = addPoint(doc, P.x + A.u.x * t, P.y + A.u.y * t, true), q2 = addPoint(doc, P.x + B.u.x * t, P.y + B.u.y * t, true);
  const cen = addPoint(doc, P.x + (b.x / bl) * d, P.y + (b.y / bl) * d, true);
  keepLengths(doc, C);
  cutArms(doc, C, q1, q2);
  // el arco va de un punto de tangencia al otro en sentido antihorario (el solver lo exige): el corto
  const Q1 = doc.pts[q1], Q2 = doc.pts[q2], C0 = doc.pts[cen];
  const ccw = (Q1.x - C0.x) * (Q2.y - C0.y) - (Q1.y - C0.y) * (Q2.x - C0.x) > 0;
  const arc = ccw ? addArc(doc, cen, q1, q2, r, styleOf(doc.lines[A.id])) : addArc(doc, cen, q2, q1, r, styleOf(doc.lines[A.id]));
  addCon(doc, { t: 'TANEP', refs: [A.id, arc, q1] }); // tangentes en los puntos de contacto, que son extremos de la linea y del arco
  addCon(doc, { t: 'TANEP', refs: [B.id, arc, q2] });
  const dim = addCon(doc, { t: 'RAD', refs: [arc], v: r });
  growHatches(doc, C, arc);
  return { ok: true, arc, pts: [q1, q2, cen], dims: [dim] };
}

// Chaflan: una linea entre dos puntos de las lineas, a d1 y d2 de la esquina (la cota de cada tramo se puede editar).
function chamferCorner0(doc, pid, d1, d2 = d1) {
  const C = cornerOf(doc, pid);
  if (!C.ok) return C;
  if (!(d1 > 0) || !(d2 > 0) || !Number.isFinite(d1 + d2)) return { ok: false, msg: 'La distancia debe ser mayor que cero' };
  const { P, A, B } = C;
  if (d1 >= A.len * (1 - 1e-9) || d2 >= B.len * (1 - 1e-9)) return { ok: false, msg: `La distancia es demasiado grande para esa esquina (máximo ${fmt(Math.min(A.len, B.len) * 0.999)})` };
  const q1 = addPoint(doc, P.x + A.u.x * d1, P.y + A.u.y * d1, true), q2 = addPoint(doc, P.x + B.u.x * d2, P.y + B.u.y * d2, true);
  keepLengths(doc, C);
  cutArms(doc, C, q1, q2);
  const line = addLine(doc, q1, q2, styleOf(doc.lines[A.id]));
  const dims = [addCon(doc, { t: 'DIST', refs: [pid, q1], v: d1 }), addCon(doc, { t: 'DIST', refs: [pid, q2], v: d2 })];
  growHatches(doc, C, line);
  return { ok: true, line, pts: [q1, q2], dims };
}

// ---------------------------------------------------------------- redondeo entre dos elementos cualesquiera
// Un arco de radio r tangente a dos elementos (segmentos, arcos o arcos elipticos) que no tienen que juntarse en una
// esquina ni cortarse: cada uno se recorta o se alarga hasta su punto de tangencia, del lado que se toco (lo que queda es
// la parte que contiene el punto tocado). El centro del redondeo esta a distancia r de las dos curvas: se resuelve en
// numerico (Newton con varios arranques) sobre las curvas completas, y de las soluciones se queda la que une las partes
// tocadas sin cuspide y con los puntos de tangencia mas cerca de lo tocado.
const unit = (v) => { const L = Math.hypot(v.x, v.y) || 1; return { x: v.x / L, y: v.y / L }; };
const left = (u) => ({ x: -u.y, y: u.x });

// Curva (completa) de un elemento: P(t), tangente unitaria T(t), parametro tOf(punto), distancia dist(punto) y el tramo
// que ocupa (t0, sweep). { msg } si ese elemento no se puede redondear.
function curveOf(doc, k, id) {
  if (k === 'ln') {
    const l = doc.lines[id];
    if (!l) return { msg: 'No hay segmento' };
    if (l.vec) return { msg: 'Un vector no se redondea ni se achaflana' };
    const A = doc.pts[l.a], B = doc.pts[l.b], L = Math.hypot(B.x - A.x, B.y - A.y);
    if (!(L > 1e-9)) return { msg: 'Líneas sin longitud' };
    const u = { x: (B.x - A.x) / L, y: (B.y - A.y) / L };
    return { k, id, per: 0, t0: 0, sweep: L, mid: { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 }, len: L, fields: ['a', 'b'], P: (t) => ({ x: A.x + u.x * t, y: A.y + u.y * t }), T: () => u, tOf: (p) => (p.x - A.x) * u.x + (p.y - A.y) * u.y, dist: (p) => Math.abs((p.x - A.x) * u.y - (p.y - A.y) * u.x) };
  }
  if (k === 'ar') {
    const a = doc.arcs[id];
    if (!a) return { msg: 'No hay arco' };
    const C = doc.pts[a.c], S = doc.pts[a.a], R = Math.hypot(S.x - C.x, S.y - C.y), g = arcOf(doc, a);
    if (!(R > 1e-9) || g.sweep >= TAU - 1e-7) return { msg: 'Un arco de 360° no se redondea' };
    return { k, id, per: TAU, t0: g.a0, sweep: g.sweep, mid: { x: C.x + R * Math.cos(g.a0 + g.sweep / 2), y: C.y + R * Math.sin(g.a0 + g.sweep / 2) }, len: R * g.sweep, fields: ['a', 'b'], P: (t) => ({ x: C.x + R * Math.cos(t), y: C.y + R * Math.sin(t) }), T: (t) => ({ x: -Math.sin(t), y: Math.cos(t) }), tOf: (p) => Math.atan2(p.y - C.y, p.x - C.x), dist: (p) => Math.abs(Math.hypot(p.x - C.x, p.y - C.y) - R) };
  }
  if (k === 'el') {
    const e = doc.ellipses?.[id];
    if (!e) return { msg: 'No hay elipse' };
    if (!isPartial(e)) return { msg: 'Una elipse completa no se redondea: recórtala antes para dejar un arco elíptico' };
    const g = ellipseOf(doc, e), { t0, sweep } = ellipseRange(doc, e, g), N = 720;
    const ring = Array.from({ length: N }, (_, i) => ellipsePoint(g, (TAU * i) / N));
    const segDist = (p, a, b) => { const vx = b.x - a.x, vy = b.y - a.y, L2 = vx * vx + vy * vy, u = L2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / L2)) : 0; return Math.hypot(p.x - a.x - u * vx, p.y - a.y - u * vy); };
    return {
      k, id, per: TAU, t0, sweep, mid: ellipsePoint(g, t0 + sweep / 2), len: ((g.ra + g.rb) * sweep) / 2, fields: ['p1', 'p2'], approx: true,
      P: (t) => ellipsePoint(g, t),
      T: (t) => { const x = -g.ra * Math.sin(t), y = g.rb * Math.cos(t); return unit({ x: x * g.ux - y * g.uy, y: x * g.uy + y * g.ux }); },
      tOf: (p) => ellipseParam(g, p),
      dist: (p) => { let d = Infinity; for (let i = 0; i < N; i++) d = Math.min(d, segDist(p, ring[i], ring[(i + 1) % N])); return d; },
    };
  }
  return { msg: k === 'ci' ? 'Un círculo no se redondea: usa un arco' : 'Solo se redondean segmentos, arcos y arcos elípticos' };
}

// Posicion de t a lo largo del elemento (0 en su primer extremo), sin dar la vuelta: fuera del tramo, del lado del extremo mas cercano.
const rel = (c, t) => {
  if (!c.per) return t - c.t0;
  const w = norm(t - c.t0);
  return w <= c.sweep ? w : w - c.sweep < TAU - w ? w : w - TAU;
};

// Newton sobre los parametros (a, b) de las dos curvas: el centro O = P1(a) + s1 r N1(a) = P2(b) + s2 r N2(b).
function newton(c1, c2, s1, s2, r, a, b) {
  const F = (u, v) => {
    const P1 = c1.P(u), N1 = left(c1.T(u)), P2 = c2.P(v), N2 = left(c2.T(v));
    return [P1.x + s1 * r * N1.x - P2.x - s2 * r * N2.x, P1.y + s1 * r * N1.y - P2.y - s2 * r * N2.y];
  };
  const h = 1e-6, tol = 1e-10 * (1 + r), clamp = (d, c) => (c.per ? Math.max(-0.8, Math.min(0.8, d)) : d);
  for (let it = 0; it < 60; it++) {
    const f = F(a, b);
    if (Math.hypot(f[0], f[1]) < tol) return { a, b };
    const fa = F(a + h, b), fb = F(a, b + h);
    const j11 = (fa[0] - f[0]) / h, j21 = (fa[1] - f[1]) / h, j12 = (fb[0] - f[0]) / h, j22 = (fb[1] - f[1]) / h;
    const det = j11 * j22 - j12 * j21;
    if (!(Math.abs(det) > 1e-12)) return null;
    a -= clamp((f[0] * j22 - f[1] * j12) / det, c1);
    b -= clamp((j11 * f[1] - j21 * f[0]) / det, c2);
  }
  return null;
}

const startsOf = (c, tp, r) => (c.per ? [tp, ...Array.from({ length: 16 }, (_, i) => c.t0 + ((i + 0.5) * TAU) / 16)] : [tp, ...[-30, -10, -3, -1, 1, 3, 10, 30].map((m) => tp + m * (r + 0.1 * c.len))]);

// Los redondeos de radio r entre las curvas que unen las partes tocadas en p1 y p2; el mejor o null.
// De las soluciones que unen las partes que se conservan sin cuspide: primero las de arco menor que media vuelta; entre ellas gana la
// mas cerca del vertice V (donde se cortan los elementos; sin vertice, de lo tocado) y, a igual distancia, la de menor arco; si
// todas pasan de media vuelta, la de menor arco. No depende del orden de los elementos.
export function bestFillet(c1, c2, r, p1, p2, V = null) {
  const tp1 = c1.tOf(p1), tp2 = c2.tOf(p2), seen = [];
  let best = null;
  for (const s1 of [1, -1]) for (const s2 of [1, -1]) {
    for (const a0 of startsOf(c1, tp1, r)) for (const b0 of startsOf(c2, tp2, r)) {
      const sol = newton(c1, c2, s1, s2, r, a0, b0);
      if (!sol) continue;
      const T1 = c1.P(sol.a), T2 = c2.P(sol.b), N1 = left(c1.T(sol.a));
      const O = { x: T1.x + s1 * r * N1.x, y: T1.y + s1 * r * N1.y };
      const tolD = 1e-6 * (1 + r);
      if (seen.some((q) => Math.hypot(q.x - O.x, q.y - O.y) < tolD && Math.hypot(q.tx - T1.x, q.ty - T1.y) < tolD && Math.hypot(q.ux - T2.x, q.uy - T2.y) < tolD)) continue;
      seen.push({ x: O.x, y: O.y, tx: T1.x, ty: T1.y, ux: T2.x, uy: T2.y });
      if (Math.hypot(T1.x - T2.x, T1.y - T2.y) < 1e-9 * (1 + r)) continue;
      // la circunferencia no debe cortar a ninguna de las curvas (la distancia al elemento es r, no menos)
      const slack = (c) => (c.approx ? 2e-3 : 1e-6) * r + 1e-9;
      if (c1.dist(O) < r - slack(c1) || c2.dist(O) < r - slack(c2)) continue;
      // extremo que se reemplaza: el del lado donde cae la tangencia respecto de lo tocado; lo que queda es lo que contiene lo tocado
      const st1 = rel(c1, sol.a) < rel(c1, tp1), st2 = rel(c2, sol.b) < rel(c2, tp2);
      const away1 = c1.T(sol.a), away2 = c2.T(sol.b);
      const k1 = st1 ? 1 : -1, k2 = st2 ? 1 : -1; // direccion en que se aleja lo que queda
      // sentido del arco de T1 a T2: sigue la direccion con que se llega a T1 desde lo que queda (sin cuspide)
      const rot1 = left({ x: (T1.x - O.x) / r, y: (T1.y - O.y) / r }), rot2 = left({ x: (T2.x - O.x) / r, y: (T2.y - O.y) / r });
      const sigma = -(k1 * (away1.x * rot1.x + away1.y * rot1.y)) >= 0 ? 1 : -1;
      if (sigma * k2 * (away2.x * rot2.x + away2.y * rot2.y) <= 1e-9) continue; // cuspide en T2: no sirve
      const a1 = Math.atan2(T1.y - O.y, T1.x - O.x), a2 = Math.atan2(T2.y - O.y, T2.x - O.x), sweep = norm(sigma > 0 ? a2 - a1 : a1 - a2);
      const near = V ? Math.hypot(O.x - V.x, O.y - V.y) : Math.hypot(T1.x - p1.x, T1.y - p1.y) + Math.hypot(T2.x - p2.x, T2.y - p2.y);
      const minor = sweep < Math.PI - 1e-6, eps = 1e-6 * (1 + r);
      let win = !best;
      if (best) {
        if (minor !== best.minor) win = minor; // un arco menor que media vuelta antes que uno mayor
        else if (!minor) win = sweep < best.sweep - 1e-6 || (Math.abs(sweep - best.sweep) <= 1e-6 && near < best.near); // sin arcos menores: el menor
        else win = near < best.near - eps || (Math.abs(near - best.near) <= eps && sweep < best.sweep); // el mas cerca del vertice y, a igual distancia, el menor
      }
      if (win) best = { sweep, near, minor, O, T1, T2, start1: st1, start2: st2, ccw: sigma > 0 };
    }
  }
  return best;
}

// Extremos (campos) en que se juntan los dos elementos: el mismo punto o puntos coincidentes por restriccion. Null si no se juntan.
const ownOf = (doc, c) => (c.k === 'ln' ? doc.lines[c.id] : c.k === 'ar' ? doc.arcs[c.id] : doc.ellipses[c.id]);
function joinOf(doc, c1, c2) {
  const o1 = ownOf(doc, c1), o2 = ownOf(doc, c2);
  for (const f1 of c1.fields) for (const f2 of c2.fields) {
    const p = o1[f1], q = o2[f2];
    if (p === q || coincidentIds(doc, p).has(q)) return { f1, f2, pos: doc.pts[p] };
  }
  return null;
}
const sharedEnd = (doc, c1, c2) => joinOf(doc, c1, c2)?.pos || null;

// Vertice donde se juntan los dos elementos: su extremo comun o, si no lo hay, el corte de sus prolongaciones mas cerca del medio
// de ambos. Null si no se cortan.
function vertexOf(doc, c1, c2) {
  const s = sharedEnd(doc, c1, c2);
  if (s) return { x: s.x, y: s.y };
  const mid = { x: (c1.mid.x + c2.mid.x) / 2, y: (c1.mid.y + c2.mid.y) / 2 };
  return anchorOf(c1, c2, mid);
}
// Lado que se conserva cuando no se toco nada: el extremo de cada elemento mas lejos del vertice (el redondeo o el chaflan se
// come lo que esta junto al vertice) o, sin vertice, el medio del elemento.
function defaultPicks(doc, c1, c2, V) {
  const far = (c) => {
    if (!V) return c.mid;
    const ends = c.fields.map((f) => doc.pts[ownOf(doc, c)[f]]);
    return Math.hypot(ends[0].x - V.x, ends[0].y - V.y) >= Math.hypot(ends[1].x - V.x, ends[1].y - V.y) ? ends[0] : ends[1];
  };
  return [far(c1), far(c2)];
}

// Donde se cortan las dos curvas (completas) mas cerca de O: el vertice que tenian antes del redondeo. Null si no se cortan o
// casi no se cruzan (tangentes o paralelas: el vertice no quedaria bien determinado).
function anchorOf(c1, c2, O) {
  let best = null;
  for (const a0 of startsOf(c1, c1.tOf(O), 0.1)) for (const b0 of startsOf(c2, c2.tOf(O), 0.1)) {
    const sol = newton(c1, c2, 0, 0, 0, a0, b0);
    if (!sol) continue;
    const V = c1.P(sol.a), T1 = c1.T(sol.a), T2 = c2.T(sol.b);
    if (Math.abs(T1.x * T2.y - T1.y * T2.x) < 0.05) continue;
    const d = Math.hypot(V.x - O.x, V.y - O.y);
    if (!best || d < best.d) best = { x: V.x, y: V.y, d, a: sol.a, b: sol.b };
  }
  return best;
}
const PON = { ln: 'PONL', ar: 'PONC', el: 'PONE' };

// Redondeo de radio r entre dos elementos { k, id, p } (p: el punto del modelo que se toco en cada uno). Dos segmentos que
// se juntan en una esquina usan el redondeo de esquina. Devuelve { ok, arc, pts, dims, dropped } o { ok: false, msg }.
function filletBetween0(doc, A, B, r) {
  if (!(r > 0) || !Number.isFinite(r)) return { ok: false, msg: 'El radio debe ser mayor que cero' };
  if (A.k === B.k && A.id === B.id) return { ok: false, msg: 'Elige dos elementos distintos' };
  if (A.k === 'ln' && B.k === 'ln') {
    const la = doc.lines[A.id], lb = doc.lines[B.id], shared = la && lb && [la.a, la.b].find((q) => q === lb.a || q === lb.b);
    if (shared && cornerOf(doc, shared).ok) return filletCorner(doc, shared, r);
  }
  const c1 = curveOf(doc, A.k, A.id), c2 = curveOf(doc, B.k, B.id);
  if (c1.msg || c2.msg) return { ok: false, msg: c1.msg || c2.msg };
  const V0 = vertexOf(doc, c1, c2), dp = defaultPicks(doc, c1, c2, V0);
  const f = bestFillet(c1, c2, r, A.p || dp[0], B.p || dp[1], V0);
  if (!f) return { ok: false, msg: 'No hay un redondeo de ese radio entre esos dos elementos: prueba otro radio o toca el otro lado de cada uno' };
  const own = (c) => (c.k === 'ln' ? doc.lines[c.id] : c.k === 'ar' ? doc.arcs[c.id] : doc.ellipses[c.id]);
  const style = styleOf(own(c1));
  const q1 = addPoint(doc, f.T1.x, f.T1.y, true), q2 = addPoint(doc, f.T2.x, f.T2.y, true), cen = addPoint(doc, f.O.x, f.O.y, true);
  const dropped = cutEnd(doc, c1.k, c1.id, c1.fields[f.start1 ? 0 : 1], q1) + cutEnd(doc, c2.k, c2.id, c2.fields[f.start2 ? 0 : 1], q2);
  const arc = f.ccw ? addArc(doc, cen, q1, q2, r, style) : addArc(doc, cen, q2, q1, r, style);
  addCon(doc, { t: 'TANEP', refs: [c1.id, arc, q1] });
  addCon(doc, { t: 'TANEP', refs: [c2.id, arc, q2] });
  const dim = addCon(doc, { t: 'RAD', refs: [arc], v: r });
  // el vertice de antes queda como punto virtual sobre los dos elementos (como en el redondeo de esquina): sin el, al cambiar
  // el radio el solver gira los elementos en vez de deslizar el arco por ellos
  const V = anchorOf(c1, c2, V0 || f.O);
  if (V) {
    const v = addPoint(doc, V.x, V.y, true);
    addCon(doc, { t: PON[c1.k], refs: [v, c1.id], hidden: true });
    addCon(doc, { t: PON[c2.k], refs: [v, c2.id], hidden: true });
  }
  for (const h of Object.values(doc.hatches || {})) if (h.ids.includes(c1.id) && h.ids.includes(c2.id)) h.ids.push(arc);
  return { ok: true, arc, pts: [q1, q2, cen], dims: [dim], dropped };
}

// Chaflan entre dos elementos que se cortan (sus prolongaciones): una linea entre un punto de cada uno, a d1 y d2 (distancia en
// recta) del vertice donde se cortan, del lado de lo tocado. Cada elemento se recorta o se alarga hasta su punto; el vertice queda
// como punto virtual sobre los dos, con una cota por tramo. Devuelve { ok, line, pts, dims, dropped } o { ok: false, msg }.
function chamferBetween0(doc, A, B, d1, d2 = d1) {
  if (!(d1 > 0) || !(d2 > 0) || !Number.isFinite(d1 + d2)) return { ok: false, msg: 'La distancia debe ser mayor que cero' };
  if (A.k === B.k && A.id === B.id) return { ok: false, msg: 'Elige dos elementos distintos' };
  if (A.k === 'ln' && B.k === 'ln') {
    const la = doc.lines[A.id], lb = doc.lines[B.id], shared = la && lb && [la.a, la.b].find((q) => q === lb.a || q === lb.b);
    if (shared && cornerOf(doc, shared).ok) return chamferCorner(doc, shared, d1, d2);
  }
  const c1 = curveOf(doc, A.k, A.id), c2 = curveOf(doc, B.k, B.id);
  if (c1.msg || c2.msg) return { ok: false, msg: c1.msg || c2.msg };
  const V0 = vertexOf(doc, c1, c2), dp = defaultPicks(doc, c1, c2, V0), p1 = A.p || dp[0], p2 = B.p || dp[1];
  const V = anchorOf(c1, c2, V0 || { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 });
  if (!V) return { ok: false, msg: 'Esos dos elementos no se cortan (ni sus prolongaciones): no hay vértice para el chaflán' };
  const side = (c, tV, p, d) => { // parametro del punto a distancia d (en recta) del vertice, hacia lo tocado
    const dir = rel(c, c.tOf(p)) >= rel(c, tV) ? 1 : -1, Vp = { x: V.x, y: V.y };
    const f = (s) => { const q = c.P(tV + dir * s); return Math.hypot(q.x - Vp.x, q.y - Vp.y) - d; };
    const smax = c.per ? TAU : 4 * (d + c.len);
    let lo = 0, hi = 0, step = (c.per ? 0.01 : d / 8);
    while (hi < smax && f(hi) < 0) { lo = hi; hi += step; }
    if (!(hi < smax) && f(hi) < 0) return null;
    for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (f(m) < 0) lo = m; else hi = m; }
    const t = tV + dir * ((lo + hi) / 2), keptEnd = rel(c, t) - (dir > 0 ? c.sweep : 0); // si pasa del otro extremo, no cabe
    return { t, dir, ok: dir > 0 ? rel(c, t) < c.sweep - 1e-9 : rel(c, t) > 1e-9, keptEnd };
  };
  const s1 = side(c1, V.a, p1, d1), s2 = side(c2, V.b, p2, d2);
  if (!s1 || !s2 || !s1.ok || !s2.ok) return { ok: false, msg: 'La distancia es demasiado grande para esos elementos' };
  const Q1 = c1.P(s1.t), Q2 = c2.P(s2.t);
  const own = (c) => (c.k === 'ln' ? doc.lines[c.id] : c.k === 'ar' ? doc.arcs[c.id] : doc.ellipses[c.id]);
  const style = styleOf(own(c1));
  const q1 = addPoint(doc, Q1.x, Q1.y, true), q2 = addPoint(doc, Q2.x, Q2.y, true), v = addPoint(doc, V.x, V.y, true);
  addCon(doc, { t: PON[c1.k], refs: [v, c1.id], hidden: true });
  addCon(doc, { t: PON[c2.k], refs: [v, c2.id], hidden: true });
  // el extremo que se reemplaza es el que queda del lado del vertice: con dir > 0 lo tocado esta mas adelante, asi que es el primero
  const dropped = cutEnd(doc, c1.k, c1.id, c1.fields[s1.dir > 0 ? 0 : 1], q1) + cutEnd(doc, c2.k, c2.id, c2.fields[s2.dir > 0 ? 0 : 1], q2);
  const line = addLine(doc, q1, q2, style);
  const dims = [addCon(doc, { t: 'DIST', refs: [v, q1], v: d1 }), addCon(doc, { t: 'DIST', refs: [v, q2], v: d2 })];
  for (const h of Object.values(doc.hatches || {})) if (h.ids.includes(c1.id) && h.ids.includes(c2.id)) h.ids.push(line);
  return { ok: true, line, pts: [q1, q2], dims, dropped };
}

// Largo del mas corto de los dos elementos (para sugerir un radio inicial), o { msg } si alguno no se puede redondear.
export function filletReach(doc, A, B) {
  const a = curveOf(doc, A.k, A.id), b = curveOf(doc, B.k, B.id);
  return a.msg || b.msg ? { msg: a.msg || b.msg } : { len: Math.min(a.len, b.len) };
}

// cada una es una operacion: las relaciones que crea quedan agrupadas por su origen en el arbol (model.js, withOp)
export const filletCorner = (doc, ...a) => withOp(doc, 'RED', () => filletCorner0(doc, ...a));
export const filletBetween = (doc, ...a) => withOp(doc, 'RED', () => filletBetween0(doc, ...a));
export const chamferCorner = (doc, ...a) => withOp(doc, 'CHA', () => chamferCorner0(doc, ...a));
export const chamferBetween = (doc, ...a) => withOp(doc, 'CHA', () => chamferBetween0(doc, ...a));
