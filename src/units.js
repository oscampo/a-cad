// Unidades físicas de los cálculos de texto: «F:250'N», «a:F/m='km/h», «L:2'm+30'cm».
// Cada cantidad lleva su valor en unidades del SI y su dimensión, un vector de exponentes de las 7 magnitudes base.
// Tabla propia (no copiada de ningún programa): unidades del SI con sus prefijos, más las usuales de ingeniería.
// Límites: sin unidades con cero desplazado (°C, °F): la temperatura va en K; las unidades no entran en vectores ni matrices.

export const BASE = ['m', 'kg', 's', 'A', 'K', 'mol', 'cd'];
const D = (m = 0, kg = 0, s = 0, A = 0, K = 0, mol = 0, cd = 0) => [m, kg, s, A, K, mol, cd];
const DEG = Math.PI / 180;

// nombre -> { f: factor al SI, d: dimensión, p: admite prefijo, r: es un ángulo (su valor queda en radianes) }
const U = {
  m: { f: 1, d: D(1), p: 1 }, g: { f: 1e-3, d: D(0, 1), p: 1 }, s: { f: 1, d: D(0, 0, 1), p: 1 }, A: { f: 1, d: D(0, 0, 0, 1), p: 1 },
  K: { f: 1, d: D(0, 0, 0, 0, 1), p: 1 }, mol: { f: 1, d: D(0, 0, 0, 0, 0, 1), p: 1 }, cd: { f: 1, d: D(0, 0, 0, 0, 0, 0, 1), p: 1 },
  N: { f: 1, d: D(1, 1, -2), p: 1 }, Pa: { f: 1, d: D(-1, 1, -2), p: 1 }, J: { f: 1, d: D(2, 1, -2), p: 1 }, W: { f: 1, d: D(2, 1, -3), p: 1 },
  C: { f: 1, d: D(0, 0, 1, 1), p: 1 }, V: { f: 1, d: D(2, 1, -3, -1), p: 1 }, Ω: { f: 1, d: D(2, 1, -3, -2), p: 1 }, ohm: { f: 1, d: D(2, 1, -3, -2), p: 1 },
  S: { f: 1, d: D(-2, -1, 3, 2), p: 1 }, F: { f: 1, d: D(-2, -1, 4, 2), p: 1 }, Wb: { f: 1, d: D(2, 1, -2, -1), p: 1 }, T: { f: 1, d: D(0, 1, -2, -1), p: 1 },
  H: { f: 1, d: D(2, 1, -2, -2), p: 1 }, Hz: { f: 1, d: D(0, 0, -1), p: 1 }, L: { f: 1e-3, d: D(3), p: 1 }, l: { f: 1e-3, d: D(3), p: 1 },
  bar: { f: 1e5, d: D(-1, 1, -2), p: 1 }, eV: { f: 1.602176634e-19, d: D(2, 1, -2), p: 1 }, t: { f: 1000, d: D(0, 1) },
  min: { f: 60, d: D(0, 0, 1) }, h: { f: 3600, d: D(0, 0, 1) }, día: { f: 86400, d: D(0, 0, 1) }, day: { f: 86400, d: D(0, 0, 1) },
  rpm: { f: 1 / 60, d: D(0, 0, -1) }, atm: { f: 101325, d: D(-1, 1, -2) }, psi: { f: 6894.757293168, d: D(-1, 1, -2), p: 1 },
  ksi: { f: 6894757.293168, d: D(-1, 1, -2) }, kip: { f: 4448.2216152605, d: D(1, 1, -2) },
  mmHg: { f: 133.322387415, d: D(-1, 1, -2) }, kgf: { f: 9.80665, d: D(1, 1, -2) }, lbf: { f: 4.4482216152605, d: D(1, 1, -2) },
  lb: { f: 0.45359237, d: D(0, 1) }, oz: { f: 0.028349523125, d: D(0, 1) }, in: { f: 0.0254, d: D(1) }, ft: { f: 0.3048, d: D(1) },
  yd: { f: 0.9144, d: D(1) }, mi: { f: 1609.344, d: D(1) }, cal: { f: 4.184, d: D(2, 1, -2), p: 1 }, Wh: { f: 3600, d: D(2, 1, -2), p: 1 },
  hp: { f: 745.69987158227, d: D(2, 1, -3) }, gal: { f: 0.003785411784, d: D(3) },
  deg: { f: DEG, d: D(), r: 1 }, '°': { f: DEG, d: D(), r: 1 }, rad: { f: 1, d: D(), r: 1 }, '%': { f: 0.01, d: D() },
};
const PRE = { Y: 1e24, Z: 1e21, E: 1e18, P: 1e15, T: 1e12, G: 1e9, M: 1e6, k: 1e3, h: 1e2, da: 10, d: 0.1, c: 1e-2, m: 1e-3, µ: 1e-6, μ: 1e-6, u: 1e-6, n: 1e-9, p: 1e-12, f: 1e-15, a: 1e-18 };
export const UNIT_NAMES = Object.keys(U);

// Una unidad por su nombre («kN», «mm», «MPa»): primero el nombre exacto, después prefijo + unidad.
export function unitByName(n) {
  if (Object.prototype.hasOwnProperty.call(U, n)) return U[n];
  for (const k of ['da', ...Object.keys(PRE).filter((x) => x !== 'da')]) {
    if (n.length > k.length && n.startsWith(k)) { const b = U[n.slice(k.length)]; if (b?.p) return { f: PRE[k] * b.f, d: b.d }; }
  }
  return null;
}

const zero = (d) => !d || d.every((x) => x === 0);
export const norm = (d) => (zero(d) ? undefined : d.map((x) => Math.round(x * 1e9) / 1e9));
export const sameDim = (a, b) => (zero(a) && zero(b)) || (!zero(a) && !zero(b) && a.every((x, i) => Math.abs(x - b[i]) < 1e-9));
export const mulDim = (a, b, s = 1) => norm(D().map((_, i) => (a?.[i] ?? 0) + s * (b?.[i] ?? 0)));
export const powDim = (a, n) => (zero(a) ? undefined : norm(a.map((x) => x * n)));

// Una expresión de unidades: «m/s^2», «kg*m^2», «N·m», «N m», «kg/(m*s^2)», «m²», «1/s». Devuelve { f, d, r } o lanza un error.
export function parseUnit(src) {
  const s = String(src).trim();
  let i = 0;
  const ws = () => { while (s[i] === ' ') i++; };
  const fail = (m) => { throw new Error(m || `No entiendo la unidad «${s}»`); };
  function atom() {
    ws();
    if (s[i] === '(') { i++; const u = prod(); ws(); if (s[i] !== ')') fail(); i++; return u; }
    const m = /^(\d+(\.\d+)?|[A-Za-zµμΩ°%áéíóú]+)/.exec(s.slice(i));
    if (!m) fail();
    i += m[0].length;
    if (/^\d/.test(m[0])) return { f: Number(m[0]), d: undefined };
    const u = unitByName(m[0]);
    if (!u) fail(`No conozco la unidad «${m[0]}»`);
    return { f: u.f, d: norm(u.d), r: u.r };
  }
  function pow() {
    const a = atom();
    ws();
    let n = null;
    if (s[i] === '²' || s[i] === '³') { n = s[i] === '²' ? 2 : 3; i++; } else if (s[i] === '^') {
      i++; ws();
      const m = /^(?:\(\s*(-?\d+(?:\.\d+)?)\s*\)|(-?\d+(?:\.\d+)?))/.exec(s.slice(i));
      if (!m) fail();
      i += m[0].length; n = Number(m[1] ?? m[2]);
    }
    return n === null ? a : { f: a.f ** n, d: powDim(a.d, n), r: a.r };
  }
  function prod() {
    let a = pow();
    for (;;) {
      ws();
      const c = s[i];
      if (c === '*' || c === '·' || c === '.') { i++; const b = pow(); a = { f: a.f * b.f, d: mulDim(a.d, b.d), r: a.r || b.r }; } else if (c === '/') { i++; const b = pow(); a = { f: a.f / b.f, d: mulDim(a.d, b.d, -1), r: a.r || b.r }; } else if (c && c !== ')' && /[A-Za-zµμΩ°%(]/.test(c)) { const b = pow(); a = { f: a.f * b.f, d: mulDim(a.d, b.d), r: a.r || b.r }; } // «N m»: un espacio también multiplica
      else return a;
    }
  }
  if (!s) fail('Falta la unidad');
  const u = prod();
  ws();
  if (i < s.length) fail();
  return u;
}

// La dimensión escrita con unidades del SI: «N», «Pa», «m/s²», «kg·m²».
const NAMED = ['N', 'Pa', 'J', 'W', 'C', 'V', 'Ω', 'F', 'Wb', 'T', 'H', 'S'];
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '.': '·' };
const sup = (n) => (n === 1 ? '' : Number.isInteger(n) ? [...String(n)].map((c) => SUP[c]).join('') : '^' + n);
export function dimName(d) {
  if (zero(d)) return '';
  for (const n of NAMED) if (sameDim(U[n].d, d)) return n;
  if (sameDim(mulDim(U.N.d, U.m.d, -1), d)) return 'N/m'; // rigidez de un resorte, mejor que «kg/s²»
  const pos = [], neg = [];
  d.forEach((x, i) => { if (x > 0) pos.push(BASE[i] + sup(x)); else if (x < 0) neg.push(BASE[i] + sup(-x)); });
  return (pos.length ? pos.join('·') : '1') + (neg.length ? '/' + (neg.length > 1 ? '(' + neg.join('·') + ')' : neg[0]) : '');
}

// Unidad con que se muestra una cantidad sin unidad pedida: la del SI y, si es una sola unidad con nombre (N, Pa, m, m²...), con el prefijo
// que deja el número entre 1 y 1000 (2,5e6 Pa -> 2,5 MPa). La masa usa g (kg, t no) para el prefijo.
const AUTO_PRE = ['G', 'M', 'k', '', 'm', 'µ', 'n'];
export function autoUnit(v, d) {
  const name = dimName(d);
  if (!name) return null;
  const m = /^(m|kg|s|A|K|mol|cd|N|Pa|J|W|C|V|Ω|F|Wb|T|H|S)([²³]?)$/.exec(name);
  if (!m || m[1] === 's' || m[1] === 'K' || m[1] === 'mol' || m[1] === 'cd' || !v) return { name, f: 1 };
  const base = m[1] === 'kg' ? 'g' : m[1], bf = m[1] === 'kg' ? 1e-3 : 1, n = m[2] === '²' ? 2 : m[2] === '³' ? 3 : 1;
  const list = m[1] === 'm' ? ['k', '', 'm', 'µ'] : m[1] === 'kg' ? ['', 'k', 'm', 'µ'] : AUTO_PRE;
  for (const p of list.slice().sort((a, b) => (PRE[b] ?? 1) - (PRE[a] ?? 1))) {
    const f = ((PRE[p] ?? 1) * bf) ** n;
    if (Math.abs(v) / f >= 1 - 1e-12) return { name: p + base + m[2], f };
  }
  const p = list.at(-1), f = ((PRE[p] ?? 1) * bf) ** n;
  return { name: p + base + m[2], f };
}

export const unitMsg = (d) => dimName(d) || 'un número sin unidades';
