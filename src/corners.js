// Redondeos y chaflanes en la esquina de dos lineas (sin DOM; quien llama hace undo y resuelve).
// El punto de la esquina NO se borra: queda como «vertice virtual» (la interseccion de las dos rectas), ligado a ambas
// lineas con restricciones ocultas. Asi siguen valiendo las cotas y relaciones que lo usaban (el ancho de un rectangulo,
// el radio de un poligono) y el redondeo es parametrico: el radio es una cota que se puede editar.
// Las cotas de longitud (que son distancias entre los dos puntos de la linea) siguen valiendo porque el vertice virtual no
// se mueve; la igualdad de longitudes entre lineas (EQL) no, porque la linea ahora es mas corta: se pasa a igualdad de
// distancias entre el otro extremo y el vertice virtual (EQD).
import { addPoint, addLine, addArc, addCon } from './model.js';

const fmt = (x) => String(Math.round(x * 1000) / 1000);

// Las dos lineas que se juntan en el punto pid y la geometria de la esquina. { ok, ... } o { ok: false, msg }.
export function cornerOf(doc, pid) {
  const P = doc.pts[pid];
  if (!P) return { ok: false, msg: 'No hay punto' };
  const ls = Object.entries(doc.lines).filter(([, l]) => l.a === pid || l.b === pid);
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
export function filletCorner(doc, pid, r) {
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
export function chamferCorner(doc, pid, d1, d2 = d1) {
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
