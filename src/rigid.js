// Forma fija de un spline (sin DOM): sus puntos de control quedan amarrados entre si con distancias ocultas, de modo que la
// curva se mueve y gira como un cuerpo rigido y no se deforma cuando algo arrastra uno de sus puntos.
// Se eligen tres puntos "ancla" que forman el triangulo mas grande (A, B, C); cada otro punto queda a distancia fija de los dos
// anclas con los que mejor queda determinado (los que forman el angulo mas cercano a 90 grados vistos desde el punto: dos
// distancias casi paralelas dejarian la posicion mal definida). Las restricciones llevan la marca shape = id del spline.
import { addCon } from './model.js';

export const shapeCons = (doc, sid) => Object.entries(doc.cons).filter(([, k]) => k.shape === sid).map(([id]) => id);
export const isRigid = (doc, sid) => shapeCons(doc, sid).length > 0;

export function rigidShape(doc, sid) {
  const sp = doc.splines?.[sid];
  if (!sp) return { ok: false, msg: 'No es un spline' };
  const ids = [...new Set(sp.pts)].filter((p) => doc.pts[p]);
  if (ids.length < 3) return { ok: false, msg: 'Hacen falta al menos 3 puntos' };
  const P = (i) => doc.pts[i], d = (a, b) => Math.hypot(P(a).x - P(b).x, P(a).y - P(b).y);
  const A = ids[0];
  const B = ids.reduce((m, p) => (d(A, p) > d(A, m) ? p : m), A);
  if (d(A, B) < 1e-9) return { ok: false, msg: 'Los puntos del spline coinciden' };
  const away = (p) => Math.abs((P(B).x - P(A).x) * (P(p).y - P(A).y) - (P(B).y - P(A).y) * (P(p).x - P(A).x)) / d(A, B); // distancia a la recta AB
  const C = ids.reduce((m, p) => (away(p) > away(m) ? p : m), A);
  const anchors = away(C) > 1e-6 * d(A, B) ? [A, B, C] : [A, B]; // todos en una recta: dos anclas bastan
  const made = [];
  const dist = (a, b) => made.push(addCon(doc, { t: 'DIST', refs: [a, b], v: d(a, b), hidden: true, shape: sid }));
  for (let i = 0; i < anchors.length; i++) for (let j = i + 1; j < anchors.length; j++) dist(anchors[i], anchors[j]);
  for (const p of ids) {
    if (anchors.includes(p)) continue;
    let best = null;
    for (let i = 0; i < anchors.length; i++) for (let j = i + 1; j < anchors.length; j++) {
      const a = anchors[i], b = anchors[j];
      const ux = P(a).x - P(p).x, uy = P(a).y - P(p).y, vx = P(b).x - P(p).x, vy = P(b).y - P(p).y;
      const s = Math.abs(ux * vy - uy * vx) / ((Math.hypot(ux, uy) * Math.hypot(vx, vy)) || 1); // seno del angulo en p
      if (!best || s > best.s) best = { a, b, s };
    }
    dist(best.a, p); dist(best.b, p);
  }
  return { ok: true, made, anchors };
}

// Quita la forma fija: borra las distancias ocultas que la sostenian.
export function looseShape(doc, sid) {
  for (const id of shapeCons(doc, sid)) delete doc.cons[id];
}
