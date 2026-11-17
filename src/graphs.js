// Graficas: objetos del dibujo que muestran «variable1 vs variable2» (la 1.a en el eje vertical, la 2.a en el horizontal), una o
// varias relaciones por grafica. Sin DOM.
// doc.graphs[id] = { x, y (esquina inferior izquierda en el modelo), w, h, title, series: ['D1 vs t', ...], t1 (tiempo final), n (muestras) }
// Variables: «t» (tiempo), el desplazamiento de cada actuador por su nombre («MR1», «ML2»), su velocidad («MR1.v»; «MR1.d» es su desplazamiento, igual que «MR1»), las cotas con nombre
// (D1, A1...), las variables de los textos y los vectores de rangos (x{=0..1;5}). Si una grafica usa variables que cambian con el tiempo,
// se simula el dibujo (en una copia) de t = 0 a t1; si solo usa vectores, se grafican tal cual.
import { varsOf } from './params.js';
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
// «y vs x» -> { y, x }
export function parseSeries(s) {
  const m = /^\s*(.+?)\s+vs\.?\s+(.+?)\s*$/i.exec(String(s ?? ''));
  if (!m) throw new Error(`«${String(s).trim()}»: escribe «variable1 vs variable2»`);
  return { y: m[1], x: m[2] };
}
// Nombres de actuadores: «MR1», «ML2» (sin el simbolo de giro).
const actKey = (a) => a.kind + a.n;

export function graphVarNames(doc) {
  const names = ['t'];
  for (const a of Object.values(doc.acts || {})) names.push(actKey(a), actKey(a) + '.d', actKey(a) + '.v');
  for (const [n, x] of Object.entries(varsOf(doc))) if (!n.includes('.')) names.push(x.vec ? n + ' (vector)' : n);
  return names;
}

// Calcula los datos: { series: [{ label, pts: [[x, y]...], color }], error, tEnd }. solveFn: el solver del dibujo.
export function computeGraph(doc, g, solveFn) {
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
  const isVec = (nm) => !!base[nm]?.vec;
  const timeVar = (nm) => nm === 't' || nm in acts || (/.[vd]$/.test(nm) && nm.slice(0, -2) in acts);
  const names = [...new Set(specs.flatMap((s) => [s.x, s.y]))];
  for (const nm of names) if (!timeVar(nm) && !(nm in base)) { out.error = `No reconozco «${nm}»`; return out; }
  const used = new Set(names);
  const needSim = names.some((nm) => !isVec(nm));
  const samples = []; // por muestra: { nombre: valor }
  if (needSim) {
    let sim = null;
    if (Object.keys(clone.acts || {}).length) sim = simBegin(clone);
    const dt = t1 / (n - 1), h = Math.max(dt / 20, 1e-5);
    for (let i = 0; i < n; i++) {
      const t = i * dt;
      if (sim) { const r = simStep(clone, sim, t, solveFn); if (!r.ok) { out.error = `Se detuvo en t = ${Math.round(t * 1000) / 1000}: ${r.error}`; break; } }
      const vals = { t }, vs = varsOf(clone);
      try {
        for (const [k, a] of Object.entries(acts)) {
          vals[k] = actDisp(clone, a, t);
          vals[k + '.v'] = (actDisp(clone, a, t + h) - actDisp(clone, a, Math.max(0, t - h))) / (t + h - Math.max(0, t - h));
          vals[k + '.d'] = vals[k];
        }
      } catch (e) { out.error = e.message; break; }
      for (const [nm, x] of Object.entries(vs)) if (!x.vec && (!nm.includes('.') || used.has(nm))) vals[nm] = x.r ? x.v * DEG : x.v;
      samples.push(vals);
    }
    out.tEnd = samples.length ? samples[samples.length - 1].t : 0;
  }
  specs.forEach((s, i) => {
    const pts = [];
    if (isVec(s.x) && isVec(s.y)) {
      const X = base[s.x].vec, Y = base[s.y].vec;
      if (X.length !== Y.length) { out.error = `«${s.y}» y «${s.x}» tienen distinto número de elementos`; return; }
      X.forEach((x, j) => pts.push([x, Y[j]]));
    } else if (isVec(s.x) || isVec(s.y)) { out.error = `«${s.y} vs ${s.x}»: un vector solo se grafica contra otro vector del mismo tamaño`; return; }
    else for (const v of samples) if (Number.isFinite(v[s.x]) && Number.isFinite(v[s.y])) pts.push([v[s.x], v[s.y]]);
    out.series.push({ label: `${s.y} vs ${s.x}`, pts, color: GRAPH_COLORS[i % GRAPH_COLORS.length] });
  });
  return out;
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
