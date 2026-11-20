// Ecuaciones resueltas numericamente: fzero(ecuacion; x; inicial) (expr.js) y solve(ec1; ec2; x; y)= (tvars.js).
// El algoritmo es Levenberg-Marquardt de numopt-js; las ecuaciones se calculan con el evaluador de la app (unidades, funciones de usuario).
// Para que magnitudes muy distintas (mm y kN, en el SI 0.001 y 30000) pesen parecido, cada incognita se mide en su valor inicial y cada
// ecuacion en el tamaño de sus dos lados en ese punto.
import { levenbergMarquardt } from 'numopt-js';
import { sameDim, unitMsg } from './units.js';

// «a == b» -> ['a', 'b'] (el «==» de afuera, no el de un if(...) o una comparacion entre parentesis); sin «==», null.
export function splitEq(src) {
  let d = 0;
  for (let i = 0; i < src.length - 1; i++) {
    const c = src[i];
    if (c === '(' || c === '[') d++;
    else if (c === ')' || c === ']') d--;
    else if (d === 0 && c === '=' && src[i + 1] === '=' && src[i - 1] !== '!' && src[i - 1] !== '<' && src[i - 1] !== '>' && src[i + 2] !== '=') return [src.slice(0, i), src.slice(i + 2)];
  }
  return null;
}

// unknowns: [{ name, v, r, d }] (valor inicial en el SI, marca de radianes y dimension). eqs: fuentes «a == b» (o una expresion = 0).
// calc(src, vars): { value, dim } con el evaluador. base: las variables que ven las ecuaciones (sin las incognitas).
// Devuelve los valores en el SI, en el orden de unknowns; lanza un error claro si no hay solucion desde el valor inicial.
export function solveEqs(unknowns, eqs, calc, base) {
  const n = unknowns.length;
  if (!n) throw new Error('falta la incógnita');
  if (eqs.length < n) throw new Error(`hay ${eqs.length} ${eqs.length === 1 ? 'ecuación' : 'ecuaciones'} para ${n} incógnitas: hacen falta al menos tantas ecuaciones como incógnitas`);
  const parts = eqs.map((s) => splitEq(s) || [s, '0']);
  const varsAt = (xs) => { const v = { ...base }; unknowns.forEach((u, i) => { v[u.name] = { v: xs[i], r: u.r, ...(u.d ? { d: u.d } : {}) }; }); return v; };
  const side = (s, vars) => { const r = calc(s, vars); if (!Number.isFinite(r.value)) throw new Error(`«${s.trim()}» no es un número`); return r; };
  // residuos (lado izquierdo menos derecho, en el SI) y el tamaño de cada ecuacion
  const eval1 = (xs) => {
    const vars = varsAt(xs);
    return parts.map(([a, b], j) => {
      const L = side(a, vars), R = b === '0' ? { value: 0, dim: L.dim } : side(b, vars);
      if (!sameDim(L.dim, R.dim) && R.value !== 0 && L.value !== 0) throw new Error(`en la ecuación ${j + 1} los dos lados no tienen las mismas unidades (${unitMsg(L.dim)} y ${unitMsg(R.dim)})`);
      return { r: L.value - R.value, c: Math.abs(L.value) + Math.abs(R.value) };
    });
  };
  const x0 = unknowns.map((u) => u.v);
  const at0 = eval1(x0); // si falla en el valor inicial, ese es el error que se muestra
  const sx = x0.map((x) => (x !== 0 ? Math.abs(x) : 1)), sr = at0.map((e) => (e.c > 0 ? e.c : 1));
  const resid = (u) => {
    try {
      const e = eval1(Array.from(u, (ui, i) => ui * sx[i]));
      return new Float64Array(e.map((x, j) => x.r / sr[j]));
    } catch (err) { return new Float64Array(parts.length).fill(1e10); } // fuera del dominio (raiz de un negativo...): el paso se rechaza
  };
  const u0 = new Float64Array(x0.map((x, i) => x / sx[i]));
  const out = levenbergMarquardt(u0, resid, { maxIterations: 300, tolResidual: 1e-15, tolStep: 1e-15, tolGradient: 1e-15 });
  const xs = Array.from(out.finalParameters, (ui, i) => ui * sx[i]);
  const fin = eval1(xs);
  const bad = fin.findIndex((e, j) => !(Math.abs(e.r) <= 1e-9 * Math.max(e.c, sr[j]) || Math.abs(e.r) < 1e-300));
  if (bad >= 0) throw new Error(`no encontré una solución desde el valor inicial (la ecuación ${bad + 1} no se cumple); prueba otro valor inicial`);
  return xs;
}
