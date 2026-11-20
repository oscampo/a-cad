// Graficas: objetos del dibujo que muestran «variable1 vs variable2» (la 1.a en el eje vertical, la 2.a en el horizontal), una o
// varias relaciones por grafica. Sin DOM.
// doc.graphs[id] = { x, y (esquina inferior izquierda en el modelo), w, h, title, series: ['D1 vs t', ...], n (muestras), axes }
// El tiempo «t» lo define solo el reproductor de la simulacion (doc.tEnd); una grafica ya no tiene tiempo final propio.
// Variables: «t» (tiempo), el desplazamiento de cada actuador por su nombre («MR1», «ML2»), su velocidad («MR1.v»; «MR1.d» es su desplazamiento, igual que «MR1»), las cotas con nombre
// (D1, A1...), las variables de los textos y los vectores de rangos (x:0..1;5). Si una grafica usa variables que cambian con el tiempo,
// se simula el dibujo (en una copia) de t = 0 a doc.tEnd; si solo usa vectores, se grafican tal cual.
// La variable independiente «x»: si el dibujo ya define x (un rango o un vector) se grafican esos valores, uno por uno; si no, cada grafica
// usa su propio vector generico de n valores entre los limites de su eje x1 (por defecto GEN_X), asi acercar o mover la ventana la vuelve a muestrear.
import { varsOf, varsAt } from './params.js';
import { evalExpr, exprRefs, setAngleMode, angleRad } from './expr.js';
import { actDisp, simBegin, simStep } from './actuators.js';
import { autoUnit, sameDim } from './units.js';

export const GRAPH_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#0891b2'];
const DEG = 180 / Math.PI;

export function addGraph(doc, x, y, w, h, series = []) {
  doc.graphs ||= {};
  doc.n += 1;
  const id = 'g' + doc.n;
  doc.graphs[id] = { x, y, w, h, title: '', series, n: 100 };
  return id;
}
// «y vs x» -> { y, x, ax, ay }. Cada lado es una variable o una expresion con ellas («p1.x/p1.y», «ML1.d-p2.x»).
// Al final se puede elegir los ejes con «@»: «MR1.v vs t @y2», «p3.y vs t @x2 y2» (por defecto x1 e y1).
export const AXES = ['x1', 'x2', 'y1', 'y2'];
// Intervalo por defecto del vector generico de «x» (sin limites en el eje). Cada grafica puede guardar el suyo en g.xdef = [lo, hi]:
// es el que usa con el eje x1 en automatico (y al que vuelve el doble toque en su deslizador horizontal).
export const GEN_X = [-10, 10];
export function genDefault(g) {
  const d = g?.xdef, lo = Number(d?.[0]), hi = Number(d?.[1]);
  return Array.isArray(d) && Number.isFinite(lo) && Number.isFinite(hi) && hi > lo ? [lo, hi] : GEN_X.slice();
}
// Valores de «x» de una grafica: n valores entre los limites de su eje k (escala lineal, o geometrica si el eje es logaritmico y los limites son positivos).
export function genericRange(g, k = 'x1') {
  const c = { min: null, max: null, scale: 'lin', ...(g.axes?.[k] || {}) }, num = (v) => (v !== null && v !== '' && v !== undefined && Number.isFinite(Number(v)) ? Number(v) : null);
  let lo = num(c.min), hi = num(c.max);
  const def = genDefault(g), w = def[1] - def[0];
  if (lo === null && hi === null) [lo, hi] = def; else if (lo === null) lo = hi - w; else if (hi === null) hi = lo + w;
  if (!(hi > lo)) [lo, hi] = def;
  return [lo, hi];
}
export function genericX(g, k = 'x1', n = 100) {
  const [lo, hi] = genericRange(g, k), log = g.axes?.[k]?.scale === 'log' && lo > 0;
  return Array.from({ length: n }, (_, i) => { const f = n > 1 ? i / (n - 1) : 0; return log ? lo * (hi / lo) ** f : lo + (hi - lo) * f; });
}
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
const bareRe = /^[A-Za-zα-ωΑ-Ωϑϕϖɛ_][\wα-ωΑ-Ωϑϕϖɛ]*(\.[A-Za-zα-ωΑ-Ωϑϕϖɛ]\w*)?$/;
function* graphGen(doc, g, solveFn) {
  setAngleMode(doc); // las variables de los textos se leen con la opcion del documento
  // La grafica puede tener su propia opcion (g.angles: 'rad' | 'deg'; sin ella, la del documento): con ella evalua sin/cos/tan
  // de sus relaciones y en esa unidad dibuja un angulo
  const rad = g.angles === 'rad' ? true : g.angles === 'deg' ? false : angleRad();
  const deg = rad ? 1 : DEG;
  const out = { series: [], error: null };
  let specs;
  try { specs = g.series.map(parseSeries); } catch (e) { out.error = e.message; return out; }
  if (!specs.length) { out.error = 'La gráfica no tiene relaciones'; return out; }
  const t1 = Number(doc.tEnd) > 0 ? Number(doc.tEnd) : 10, n = Math.min(2000, Math.max(2, Math.round(Number(g.n) || 100)));
  const clone = JSON.parse(JSON.stringify(doc));
  delete clone.graphs;
  const acts = {};
  for (const [id, a] of Object.entries(clone.acts || {})) acts[actKey(a)] = a;
  // la grafica se lee en su lugar de la pagina (su esquina superior izquierda), como una cota con formula: ve las variables definidas
  // ANTES en el orden de lectura. Una x que se define mas abajo no cuenta: la grafica usa su x generica.
  const at = () => varsAt(clone, g.y + g.h, g.x);
  const { vars: base, later } = at();
  // Un lado con unidades se grafica en una unidad fija: la de la variable, la de una variable de la expresion con la misma magnitud o
  // la del SI con prefijo (segun el primer valor, o el mayor de un vector). units: lado -> { name, f }; la leyenda la muestra.
  const units = new Map();
  const unitOf = (side, dim, v) => {
    if (units.has(side)) return units.get(side);
    let u = null;
    if (dim) for (const nm of [side, ...exprRefs(side)]) { const x = base[nm]; if (x?.pu && sameDim(x.d, dim)) { u = { name: x.pu, f: x.pf }; break; } }
    if (dim && !u) u = autoUnit(v, dim);
    units.set(side, u);
    return u;
  };
  // Un lado que da un vector: su nombre («x») o una expresion con vectores («f(x)», «x.^2»), que se calcula una vez con todos sus elementos.
  const vecs = new Map();
  const vecOf = (side) => {
    if (vecs.has(side)) return vecs.get(side);
    let v = null, d;
    if (bareRe.test(side) && base[side]?.vec) { v = base[side].vec; d = base[side].d; }
    else if (bareRe.test(side) ? base[side]?.mat : exprRefs(side).some((nm) => base[nm]?.vec || base[nm]?.mat)) {
      const r = bareRe.test(side) ? { mat: base[side].mat, dim: base[side].d } : evalExpr(side, { vars: base, allowMat: true, radians: rad }), m = r.mat;
      d = r.dim;
      if (!m) throw new Error('«' + side + '»: no da un vector');
      if (m.length === 1) v = m[0]; else if (m.every((row) => row.length === 1)) v = m.map((row) => row[0]);
      else throw new Error('«' + side + '»: da una matriz, no un vector');
    }
    if (v && d) { const u = unitOf(side, d, Math.max(...v.map(Math.abs))); v = v.map((x) => x / u.f); }
    vecs.set(side, v);
    return v;
  };
  const isVec = (side) => !!vecOf(side);
  const isTime = (nm) => nm === 't' || nm in acts || (/\.[vd]$/.test(nm) && nm.slice(0, -2) in acts);
  const known = (nm) => isTime(nm) || nm in base;
  // «x» sin definir: la grafica usa su propio vector generico; definida como vector (un rango), se evalua elemento por elemento si la formula no admite vectores.
  const xGen = !('x' in base) && !('x' in acts);
  const usesGen = (sp) => xGen && [sp.x, sp.y].some((s) => exprRefs(s).includes('x'));
  const elem = new Set();
  for (const sp of specs) {
    const gen = usesGen(sp);
    for (const side of [sp.x, sp.y]) {
      for (const r of exprRefs(side)) if (!known(r) && !(gen && r === 'x')) { out.error = later.has(r) ? `«${r}» se define después de la gráfica (más abajo, o a su derecha en la misma fila): la gráfica ve solo lo que está antes en el orden de lectura` : 'No reconozco «' + r + '»'; return out; }
      try { vecOf(side); } catch (e) {
        if (side === sp.y && bareRe.test(sp.x) && base[sp.x]?.vec) { elem.add(sp); vecs.set(side, null); } else { out.error = e.message; return out; }
      }
    }
    if (gen && [sp.x, sp.y].some((s) => exprRefs(s).some(isTime))) { out.error = `«${sp.y} vs ${sp.x}»: la x genérica no se combina con t ni con actuadores`; return out; }
  }
  const needSim = specs.some((sp) => !(isVec(sp.x) && isVec(sp.y)) && !usesGen(sp) && !elem.has(sp));
  if (specs.some(usesGen)) out.generic = true; // los limites del eje x1 definen los valores de x: cambiarlos vuelve a calcular
  const bufs = specs.map(() => []), errs = specs.map(() => null);
  // valor de una variable o expresion con el entorno env: un angulo suelto se muestra en grados
  const value = (src, env) => {
    let v, d;
    if (bareRe.test(src) && src in env) { const x = env[src]; if (x.r) return x.v * deg; v = x.v; d = x.d; }
    else { const r = evalExpr(src, { vars: env, radians: rad }); if (r.rad) return r.value * deg; v = r.value; d = r.dim; }
    return d && Number.isFinite(v) ? v / unitOf(src, d, v).f : v;
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
      for (const [nm, x] of Object.entries(at().vars)) if (!x.vec && !x.mat) env[nm] = x;
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
    if (usesGen(sp) || elem.has(sp)) { // «y vs x» con x generica o con un vector del dibujo: se evalua para cada valor de x
      const gen = usesGen(sp), list = gen ? genericX(g, sp.ax, n) : base[sp.x].vec, env0 = {};
      for (const [nm, v] of Object.entries(base)) if (!v.vec && !v.mat) env0[nm] = v;
      pts = [];
      for (const xi of list) {
        const env = { ...env0, [gen ? 'x' : sp.x]: gen ? { v: xi, r: false } : { v: xi, r: false, d: base[sp.x].d } };
        try { const X = value(sp.x, env), Y = value(sp.y, env); if (Number.isFinite(X) && Number.isFinite(Y)) pts.push([X, Y]); } catch (e) { errs[i] ||= e.message; }
      }
    } else if (isVec(sp.x) && isVec(sp.y)) {
      const X = vecOf(sp.x), Y = vecOf(sp.y);
      if (X.length !== Y.length) { out.error = '«' + sp.y + '» y «' + sp.x + '» tienen distinto número de elementos'; return; }
      pts = X.map((x, j) => [x, Y[j]]);
    } else if (isVec(sp.x) || isVec(sp.y)) { out.error = '«' + sp.y + ' vs ' + sp.x + '»: un vector solo se grafica contra otro vector del mismo tamaño'; return; }
    const un = (s) => (units.get(s) ? s + ' (' + units.get(s).name + ')' : s), label = un(sp.y) + ' vs ' + un(sp.x);
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
