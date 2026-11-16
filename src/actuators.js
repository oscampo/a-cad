// Actuadores (motores): «MR» rotacional sobre una linea (uno de sus extremos es el centro de giro) y «ML» lineal entre dos
// puntos (el primero es la cola). Sin DOM.
// doc.acts[id] = { kind, n, mode, src, expr, table, ... }
//   MR: { line, c (punto centro, extremo de la linea), cw (horario; por defecto antihorario) }
//   ML: { p1, p2 }
//   mode: 'disp' (desplazamiento respecto al tiempo) o 'vel' (velocidad); src: 'expr' (expresion de t) o 'table' (tabla [[t, valor]...]).
// Unidades: MR en grados (°, °/s); ML en unidades del dibujo (y por segundo). El desplazamiento se suma a la posicion inicial.
// La simulacion no toca el dibujo: simBegin guarda una copia, anade restricciones conductoras ocultas (angulo de la linea / distancia
// entre los dos puntos), simStep las mueve a su valor en el tiempo t y simEnd restaura el dibujo tal como estaba.
import { addCon } from './model.js';
import { evalExpr } from './expr.js';
import { varsOf, settle } from './params.js';

export const actName = (a) => (a.kind === 'MR' ? (a.cw ? '⟳' : '⟲') : '') + a.kind + a.n;
export const actUnit = (a) => (a.kind === 'MR' ? (a.mode === 'vel' ? '°/s' : '°') : a.mode === 'vel' ? '/s' : '');

function addAct(doc, a) {
  doc.acts ||= {}; doc.cnAct ||= {};
  doc.n += 1;
  const id = 'm' + doc.n;
  a.n = doc.cnAct[a.kind] = (doc.cnAct[a.kind] || 0) + 1;
  doc.acts[id] = { mode: 'disp', src: 'expr', expr: '0', table: [], ...a };
  return id;
}
// MR: lid = linea, cid = su extremo que hace de centro.
export function addRotary(doc, lid, cid, o = {}) {
  const l = doc.lines[lid];
  if (!l || (cid !== l.a && cid !== l.b)) return null;
  return addAct(doc, { kind: 'MR', line: lid, c: cid, cw: !!o.cw, ...(o.mode ? { mode: o.mode } : {}), ...(o.expr !== undefined ? { expr: o.expr } : {}) });
}
// ML: p1 = cola, p2 = cabeza.
export function addLinear(doc, p1, p2, o = {}) {
  if (!doc.pts[p1] || !doc.pts[p2] || p1 === p2) return null;
  return addAct(doc, { kind: 'ML', p1, p2, ...(o.mode ? { mode: o.mode } : {}), ...(o.expr !== undefined ? { expr: o.expr } : {}) });
}
// Referencias que siguen existiendo: un actuador cuya linea o puntos ya no estan se elimina.
export function pruneActs(doc) {
  let changed = false;
  for (const [id, a] of Object.entries(doc.acts || {})) {
    const ok = a.kind === 'MR' ? doc.lines[a.line] && (a.c === doc.lines[a.line].a || a.c === doc.lines[a.line].b) : doc.pts[a.p1] && doc.pts[a.p2];
    if (!ok) { delete doc.acts[id]; changed = true; }
  }
  return changed;
}
export const actPoints = (a) => (a.kind === 'MR' ? [a.c] : [a.p1, a.p2]);

// ---- valor en el tiempo
const sortedTable = (a) => (a.table || []).filter((r) => Array.isArray(r) && Number.isFinite(r[0]) && Number.isFinite(r[1])).slice().sort((x, y) => x[0] - y[0]);
// «0 1; 1 2.5» o una fila por linea: «t; valor» (tambien con tabulador, espacio o coma entre columnas).
export function parseTable(src) {
  const rows = [];
  for (const line of String(src ?? '').split(/\n|\|/)) {
    if (!line.trim()) continue;
    const c = line.trim().split(/[;\t ]+|,(?=\s)/).map((x) => Number(x.replace(',', '.')));
    if (c.length !== 2 || !c.every(Number.isFinite)) throw new Error(`Fila no válida «${line.trim()}»: escribe «tiempo; valor»`);
    rows.push([c[0], c[1]]);
  }
  if (rows.length < 2) throw new Error('La tabla necesita al menos 2 filas');
  rows.sort((x, y) => x[0] - y[0]);
  for (let i = 1; i < rows.length; i++) if (rows[i][0] === rows[i - 1][0]) throw new Error('Dos filas tienen el mismo tiempo');
  return rows;
}
export const tableText = (rows) => (rows || []).map((r) => r[0] + '; ' + r[1]).join('\n');

// f(t): la funcion de la definicion (la tabla se interpola linealmente y fuera de su rango conserva el ultimo valor).
function funcOf(doc, a) {
  if (a.src === 'table') {
    const T = sortedTable(a);
    if (T.length < 2) throw new Error('La tabla necesita al menos 2 filas');
    return { f: (t) => { if (t <= T[0][0]) return T[0][1]; for (let i = 1; i < T.length; i++) if (t <= T[i][0]) return T[i - 1][1] + ((T[i][1] - T[i - 1][1]) * (t - T[i - 1][0])) / (T[i][0] - T[i - 1][0]); return T[T.length - 1][1]; }, T };
  }
  const vars = { ...varsOf(doc) };
  return { f: (t) => evalExpr(a.expr, { vars: { ...vars, t: { v: t, r: false } } }).value };
}
// Desplazamiento (° o unidades) en el tiempo t. En modo velocidad es la integral de 0 a t.
export function actDisp(doc, a, t) {
  const { f, T } = funcOf(doc, a);
  if (a.mode !== 'vel') return f(t);
  if (!(t > 0)) return 0;
  if (T) { // integral exacta de la tabla: trapecios por tramos, con el valor final constante
    let s = 0;
    const g = (x) => f(x), pts = [0, ...T.map((r) => r[0]).filter((x) => x > 0 && x < t), t];
    for (let i = 1; i < pts.length; i++) s += ((g(pts[i - 1]) + g(pts[i])) / 2) * (pts[i] - pts[i - 1]);
    return s;
  }
  const n = Math.min(20000, Math.max(200, Math.ceil(t * 200)) * 2); // Simpson
  const h = t / n;
  let s = f(0) + f(t);
  for (let i = 1; i < n; i++) s += f(i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
}
// Valida la definicion (error de la expresion o de la tabla); null si vale.
export function actError(doc, a) {
  try { const v = actDisp(doc, a, 0); if (!Number.isFinite(v)) return 'El resultado no es un número'; actDisp(doc, a, 1); return null; } catch (e) { return e.message; }
}

// ---- simulacion
export function simBegin(doc) {
  const snap = JSON.stringify(doc), items = {};
  for (const [id, a] of Object.entries(doc.acts || {})) {
    if (a.kind === 'MR') {
      const l = doc.lines[a.line], o = a.c === l.a ? l.b : l.a, C = doc.pts[a.c], O = doc.pts[o];
      const base = (Math.atan2(O.y - C.y, O.x - C.x) * 180) / Math.PI;
      items[id] = { cid: addCon(doc, { t: 'AZ', refs: [a.c, o], v: base, hidden: true }), base, sign: a.cw ? -1 : 1 };
    } else {
      const P = doc.pts[a.p1], Q = doc.pts[a.p2], base = Math.hypot(Q.x - P.x, Q.y - P.y);
      items[id] = { cid: addCon(doc, { t: 'DIST', refs: [a.p1, a.p2], v: base, hidden: true }), base, sign: 1 };
    }
  }
  return { snap, items, t: 0 };
}
// Lleva el dibujo al tiempo t (subpasos para no saltar de rama al mover mucho). { ok, error }.
export function simStep(doc, sim, t, solveFn) {
  const goal = {};
  try { for (const [id, it] of Object.entries(sim.items)) goal[id] = it.base + it.sign * actDisp(doc, doc.acts[id], t); } catch (e) { return { ok: false, error: e.message }; }
  const from = {};
  for (const [id, it] of Object.entries(sim.items)) from[id] = doc.cons[it.cid].v;
  let n = 1;
  for (const [id, it] of Object.entries(sim.items)) {
    const d = Math.abs(goal[id] - from[id]), a = doc.acts[id], unit = a.kind === 'MR' ? 5 : Math.max(0.05 * (it.base + 1), 1e-6);
    n = Math.max(n, Math.ceil(d / unit));
  }
  n = Math.min(n, 60);
  for (let s = 1; s <= n; s++) {
    for (const [id, it] of Object.entries(sim.items)) doc.cons[it.cid].v = from[id] + ((goal[id] - from[id]) * s) / n;
    const r = settle(doc, solveFn, []);
    if (!r.ok) return { ok: false, error: r.error || 'El mecanismo no se puede mover a ese tiempo: el actuador entra en conflicto con las restricciones (por ejemplo, una línea fijada en horizontal o vertical, o una longitud que no puede cambiar)' };
  }
  sim.t = t;
  return { ok: true };
}
// Restaura el dibujo tal como estaba antes de simular.
export function simEnd(doc, sim) {
  const o = JSON.parse(sim.snap);
  for (const k of Object.keys(doc)) delete doc[k];
  Object.assign(doc, o);
}
