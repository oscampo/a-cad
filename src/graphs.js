// Graficas: objetos del dibujo que muestran «variable1 vs variable2» (la 1.a en el eje vertical, la 2.a en el horizontal), una o
// varias relaciones por grafica. Sin DOM.
// doc.graphs[id] = { x, y (esquina inferior izquierda en el modelo), w, h, title, series: ['D1 vs t', ...], t1 (tiempo final), n (muestras) }
// Variables: «t» (tiempo), el desplazamiento de cada actuador por su nombre («MR1», «ML2»), su velocidad («MR1.v»; «MR1.d» es su desplazamiento, igual que «MR1»), las cotas con nombre
// (D1, A1...), las variables de los textos y los vectores de rangos (x:0..1;5). Si una grafica usa variables que cambian con el tiempo,
// se simula el dibujo (en una copia) de t = 0 a t1; si solo usa vectores, se grafican tal cual.
import { varsOf } from './params.js';
import { evalExpr, exprRefs } from './expr.js';
import { actDisp, simBegin, simStep } from './actuators.js';

export const GRAPH_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#0891b2'];
const DEG = 180 / Math.PI;

export function addGraph(doc, x, y, w, h, series = []) {
  doc.graphs ||= {};
  doc.n += 1;
  const id = 'g' + doc.n;
  doc.graphs[id] = { x, y, w, h, title: '', series, t1: 10, n: 100 };
  return id;
}
// «y vs x» -> { y, x, ax, ay }. Cada lado es una variable o una expresion con ellas («p1.x/p1.y», «ML1.d-p2.x»).
// Al final se puede elegir los ejes con «@»: «MR1.v vs t @y2», «p3.y vs t @x2 y2» (por defecto x1 e y1).
export const AXES = ['x1', 'x2', 'y1', 'y2'];
export function parseSeries(s) {
  let src = String(s ?? ''), ax = 'x1', ay = 'y1';
  const am = /\s@\s*([A-Za-z0-9 ,]*)$/.exec(src);
  if (am) {
    for (const k of am[1].toLowerCase().split(/[\s,]+/).filter(Boolean)) {
      if (k === 'x1' || k === 'x2') ax = k; else if (k === 'y1' || k === 'y2') ay = k;
      else throw new Error('«' + k + '»: los ejes son x1, x2, y1 e y2');
    }
    src = src.slice(0, am.index);
  }
  const m = /^\s*(.+?)\s+vs\.?\s+(.+?)\s*$/i.exec(src);
  if (!m) throw new Error('«' + String(s).trim() + '»: escribe «variable1 vs variable2»');
  return { y: m[1], x: m[2], ax, ay };
}
// Nombres de actuadores: «MR1», «ML2» (sin el simbolo de giro).
const actKey = (a) => a.kind + a.n;

export function graphVarNames(doc) {
  const names = ['t'];
  for (const a of Object.values(doc.acts || {})) names.push(actKey(a), actKey(a) + '.d', actKey(a) + '.v');
  for (const [n, x] of Object.entries(varsOf(doc))) if (!n.includes('.')) names.push(x.fn ? n + '(…)' : x.vec || x.mat ? n + ' (vector)' : n);
  return names;
}

// Calcula los datos: { series: [{ label, pts: [[x, y]...], color, ax, ay, tx }], error, tEnd }. solveFn: el solver del dibujo.
const bareRe = /^[A-Za-zα-ωΑ-Ω_][\wα-ωΑ-Ω]*(\.[A-Za-zα-ωΑ-Ω]\w*)?$/;
function* graphGen(doc, g, solveFn) {
  const out = { series: [], error: null };
  let specs;
  try { specs = g.series.map(parseSeries); } catch (e) { out.error = e.message; return out; }
  if (!specs.length) { out.error = 'La gráfica no tiene relaciones'; return out; }
  const t1 = Number(doc.tEnd) > 0 ? Number(doc.tEnd) : Number(g.t1) > 0 ? Number(g.t1) : 10, n = Math.min(2000, Math.max(2, Math.round(Number(g.n) || 100)));
  const clone = JSON.parse(JSON.stringify(doc));
  delete clone.graphs;
  const acts = {};
  for (const [id, a] of Object.entries(clone.acts || {})) acts[actKey(a)] = a;
  const base = varsOf(clone);
  const isVec = (nm) => bareRe.test(nm) && !!base[nm]?.vec;
  const known = (nm) => nm === 't' || nm in acts || (/\.[vd]$/.test(nm) && nm.slice(0, -2) in acts) || (nm in base);
  for (const sp of specs) {
    for (const side of [sp.x, sp.y]) {
      for (const r of exprRefs(side)) if (!known(r)) { out.error = 'No reconozco «' + r + '»'; return out; }
      if (!bareRe.test(side) && exprRefs(side).some(isVec)) { out.error = '«' + side + '»: un vector solo se grafica solo, sin operaciones'; return out; }
    }
  }
  const needSim = specs.some((sp) => !(isVec(sp.x) && isVec(sp.y)));
  const bufs = specs.map(() => []), errs = specs.map(() => null);
  // valor de una variable o expresion con el entorno env: un angulo suelto se muestra en grados
  const value = (src, env) => {
    if (bareRe.test(src) && src in env) { const x = env[src]; return x.r ? x.v * DEG : x.v; }
    const r = evalExpr(src, { vars: env });
    return r.rad ? r.value * DEG : r.value;
  };
  if (needSim) {
    let sim = null;
    if (Object.keys(clone.acts || {}).length) sim = simBegin(clone);
    const dt = t1 / (n - 1), h = Math.max(dt / 20, 1e-5), cch = sim ? sim.cache : new Map();
    let lastT = 0;
    for (let i = 0; i < n; i++) {
      const t = i * dt;
      if (sim) { const r = simStep(clone, sim, t, solveFn); if (!r.ok) { out.error = 'Se detuvo en t = ' + Math.round(t * 1000) / 1000 + ': ' + r.error; break; } }
      const env = { t: { v: t, r: false } };
      for (const [nm, x] of Object.entries(varsOf(clone))) if (!x.vec && !x.mat) env[nm] = x;
      try {
        for (const [k, a] of Object.entries(acts)) {
          const d = actDisp(clone, a, t, cch);
          env[k] = { v: d, r: false }; env[k + '.d'] = { v: d, r: false };
          env[k + '.v'] = { v: (actDisp(clone, a, t + h, cch) - actDisp(clone, a, Math.max(0, t - h), cch)) / (t + h - Math.max(0, t - h)), r: false };
        }
      } catch (e) { out.error = e.message; break; }
      specs.forEach((sp, j) => {
        try { const X = value(sp.x, env), Y = value(sp.y, env); if (Number.isFinite(X) && Number.isFinite(Y)) bufs[j].push([X, Y]); } catch (e) { errs[j] ||= e.message; }
      });
      lastT = t;
      yield (i + 1) / n; // punto de cesion: computeGraphAsync devuelve aqui el control al navegador
    }
    out.tEnd = lastT;
  }
  specs.forEach((sp, i) => {
    let pts = bufs[i];
    if (isVec(sp.x) && isVec(sp.y)) {
      const X = base[sp.x].vec, Y = base[sp.y].vec;
      if (X.length !== Y.length) { out.error = '«' + sp.y + '» y «' + sp.x + '» tienen distinto número de elementos'; return; }
      pts = X.map((x, j) => [x, Y[j]]);
    } else if (isVec(sp.x) || isVec(sp.y)) { out.error = '«' + sp.y + ' vs ' + sp.x + '»: un vector solo se grafica contra otro vector del mismo tamaño'; return; }
    const label = sp.y + ' vs ' + sp.x;
    if (!pts.length && errs[i] && !out.error) out.error = '«' + label + '»: ' + errs[i];
    out.series.push({ label, pts, color: GRAPH_COLORS[i % GRAPH_COLORS.length], ax: sp.ax, ay: sp.ay, tx: sp.x === 't' });
  });
  return out;
}

export function computeGraph(doc, g, solveFn) {
  const it = graphGen(doc, g, solveFn);
  for (;;) { const s = it.next(); if (s.done) return s.value; }
}
// Mismo calculo, pero cede el hilo cada ~25 ms para que la pagina no quede congelada (en un iPad el solver puede tardar segundos).
// stale(): true si el resultado ya no sirve (devuelve null); busy(): true mientras algo mas usa el solver (p. ej. un arrastre), se espera;
// onStep(fraccion): progreso. La copia del dibujo se toma de forma sincrona al llamar, asi que editar despues no la afecta.
export function computeGraphAsync(doc, g, solveFn, { stale = () => false, busy = () => false, onStep = () => {} } = {}) {
  return new Promise((resolve) => {
    const it = graphGen(doc, g, solveFn);
    const run = () => {
      try {
        const t0 = performance.now();
        for (;;) {
          if (stale()) return resolve(null);
          if (busy()) return void setTimeout(run, 100);
          const s = it.next();
          if (s.done) return resolve(s.value);
          onStep(s.value);
          if (performance.now() - t0 > 25) return void setTimeout(run, 0);
        }
      } catch (e) { resolve({ series: [], error: e.message }); }
    };
    run();
  });
}

// Configuracion de un eje (x1, x2, y1, y2): nombre libre, escala lineal o logaritmica, limites (vacios = automaticos) y divisiones.
export const axisCfg = (g, k) => ({ name: '', scale: 'lin', min: null, max: null, major: null, minor: 0, ...(g.axes?.[k] || {}) });
// Rango de los datos de las series que usan el eje k (en escala log solo cuentan los valores positivos).
export function axisRange(series, k, log) {
  const isX = k[0] === 'x';
  let lo = Infinity, hi = -Infinity;
  for (const s of series) {
    if ((isX ? s.ax : s.ay) !== k) continue;
    for (const p of s.pts) { const v = isX ? p[0] : p[1]; if (!Number.isFinite(v) || (log && !(v > 0))) continue; lo = Math.min(lo, v); hi = Math.max(hi, v); }
  }
  return Number.isFinite(lo) ? { lo, hi } : null;
}
// Marcas de un eje: { lo, hi, ticks (mayores), minors (menores), log, f(v) -> fraccion 0..1 del eje (NaN si no se puede ubicar) }.
export function axisLayout(cfg, lo, hi) {
  const log = cfg.scale === 'log', num = (v) => (v !== null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);
  const mn = num(cfg.min), mx = num(cfg.max), major = Math.round(num(cfg.major) || 0), minor = Math.round(num(cfg.minor) || 0);
  if (log) {
    let a = mn > 0 ? mn : lo > 0 ? 10 ** Math.floor(Math.log10(lo) + 1e-9) : 1;
    let b = mx > 0 ? mx : hi > 0 ? 10 ** Math.ceil(Math.log10(hi) - 1e-9) : 10;
    if (!(b > a)) b = a * 10;
    const ticks = [], minors = [], la = Math.log10(a), lb = Math.log10(b);
    for (let e = Math.ceil(la - 1e-9); 10 ** e <= b * (1 + 1e-9); e++) ticks.push(10 ** e);
    if (minor > 0) for (let e = Math.floor(la); 10 ** e <= b; e++) for (let k = 2; k < 10; k++) { const v = k * 10 ** e; if (v > a && v < b) minors.push(v); }
    return { lo: a, hi: b, ticks, minors, log, f: (v) => (v > 0 ? (Math.log10(v) - la) / (lb - la) : NaN) };
  }
  let a, b, ticks;
  if (mn === null && mx === null) {
    const nt = niceTicks(lo, hi, major || 5);
    a = nt.lo; b = nt.hi; ticks = nt.ticks;
  } else {
    a = mn !== null ? mn : lo; b = mx !== null ? mx : hi;
    if (!(b > a)) b = a + 1;
    if (major > 0) ticks = Array.from({ length: major + 1 }, (_, i) => a + ((b - a) * i) / major);
    else { const e = (b - a) * 1e-9; ticks = niceTicks(a, b, 5).ticks.filter((v) => v >= a - e && v <= b + e); }
  }
  const minors = [];
  if (minor >= 2) for (let i = 1; i < ticks.length; i++) for (let j = 1; j < minor; j++) minors.push(ticks[i - 1] + ((ticks[i] - ticks[i - 1]) * j) / minor);
  return { lo: a, hi: b, ticks, minors, log, f: (v) => (v - a) / (b - a) };
}

// Limites de los ejes con margen y marcas «agradables».
export function niceTicks(lo, hi, count = 5) {
  if (!(hi > lo)) { const c = Number.isFinite(lo) ? lo : 0; lo = c - 1; hi = c + 1; }
  const raw = (hi - lo) / count, p = 10 ** Math.floor(Math.log10(raw)), f = raw / p;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  const a = Math.floor(lo / step + 1e-9) * step, b = Math.ceil(hi / step - 1e-9) * step, ticks = [];
  for (let v = a; v <= b + step * 1e-6; v += step) ticks.push(Math.abs(v) < step * 1e-9 ? 0 : Math.round(v / step * 1e6) / 1e6 * step);
  return { lo: a, hi: b, ticks, step };
}
export function dataBounds(series) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const s of series) for (const [x, y] of s.pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return Number.isFinite(x0) ? { x0, x1, y0, y1 } : null;
}
