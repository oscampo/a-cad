// Evaluador de expresiones matematicas para las cotas ("3π/4", "10*sin(30)", "10+1/3"). Sin eval.
// Devuelve { value, rad }: rad indica que el valor viene de π (esta en radianes), para que una cota angular
// lo convierta a grados. sin/cos/tan toman grados, salvo que su argumento contenga π (entonces radianes).
// Variables: las cotas con nombre (D1, A1, R2, O3 o el que les des) se pueden usar en las formulas: vars = { nombre: { v, r } }.
// Un angulo vale su medida en radianes (r = true), igual que π: sin(A1) funciona y R*A1 es la longitud de arco.

import { parseUnit, sameDim, mulDim, powDim, unitMsg, setUnitSystem, docUnitsHook, autoUnit } from './units.js';
import { solveEqs } from './nsolve.js';
import { GREEK, GREEK_UP, addCalcFns } from './asciimath.js';
import { setDecimal, decimalMode, elemChar, rowChar, argChar, argText, localNum, setSci } from './locale.js';

const TAU_DEG = 180 / Math.PI;
const FUNCS = {
  sin: (x, r) => Math.sin(r ? x : x / TAU_DEG), sen: (x, r) => Math.sin(r ? x : x / TAU_DEG),
  cos: (x, r) => Math.cos(r ? x : x / TAU_DEG), tan: (x, r) => Math.tan(r ? x : x / TAU_DEG),
  asin: (x, r, rm) => (rm ? Math.asin(x) : Math.asin(x) * TAU_DEG), acos: (x, r, rm) => (rm ? Math.acos(x) : Math.acos(x) * TAU_DEG), atan: (x, r, rm) => (rm ? Math.atan(x) : Math.atan(x) * TAU_DEG),
  sqrt: Math.sqrt, raiz: Math.sqrt, abs: Math.abs, exp: Math.exp, ln: Math.log, log: Math.log10, log10: Math.log10,
  // trigonometria extra: sec, csc y cot siguen la regla de sin/cos/tan; las hiperbolicas no llevan angulos
  sec: (x, r) => 1 / Math.cos(r ? x : x / TAU_DEG), csc: (x, r) => 1 / Math.sin(r ? x : x / TAU_DEG), cot: (x, r) => 1 / Math.tan(r ? x : x / TAU_DEG),
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, asinh: Math.asinh, acosh: Math.acosh, atanh: Math.atanh,
  deg: (x) => x * TAU_DEG, rad: (x) => x / TAU_DEG, // de radianes a grados y de grados a radianes
  // redondeo
  floor: Math.floor, piso: Math.floor, ceil: Math.ceil, techo: Math.ceil, trunc: Math.trunc, sign: Math.sign, signo: Math.sign,
  // numeros complejos (con un numero real: real(x) = x, imag(x) = 0, conj(x) = x, angle(x) = 0 o 180°)
  real: (x) => x, imag: () => 0, conj: (x) => x, angle: (x, r, rm) => (x < 0 ? (rm ? Math.PI : 180) : 0),
  // como en MATLAB: fix (hacia el cero), log2, factorial; las trigonometricas en grados valen igual en cualquier modo de angulos
  fix: Math.trunc, log2: Math.log2,
  factorial: (x) => { if (!Number.isInteger(x) || x < 0 || x > 170) throw new Error('factorial(n): n debe ser un entero de 0 a 170'); let f = 1; for (let k = 2; k <= x; k++) f *= k; return f; },
  sind: (x) => Math.sin(x / TAU_DEG), cosd: (x) => Math.cos(x / TAU_DEG), tand: (x) => Math.tan(x / TAU_DEG),
  asind: (x) => Math.asin(x) * TAU_DEG, acosd: (x) => Math.acos(x) * TAU_DEG, atand: (x) => Math.atan(x) * TAU_DEG,
};
const KEEP_U = new Set(['abs', 'floor', 'piso', 'ceil', 'techo', 'trunc', 'real', 'imag', 'conj', 'fix']); // con unidades, conservan las del argumento
const KEEP_RAD = new Set(['sqrt', 'raiz', 'abs', 'floor', 'piso', 'ceil', 'techo', 'trunc']); // conservan la marca de radianes del argumento
const MAKE_RAD = new Set(['rad']); // su resultado es un angulo en radianes
const CONSTS = { pi: Math.PI, π: Math.PI, e: Math.E };

// Funciones de varios valores (se separan con «;» o con «, »; «2,5» es un solo numero con coma decimal).
// r: el resultado viene de radianes si algun valor viene de radianes.
const anyR = (A) => A.some((a) => a.r);
const rnd = (x, n) => { const f = 10 ** n; return (Math.sign(x) * Math.round(Math.abs(x) * f * (1 + 1e-12))) / f; }; // 2.675 -> 2.68 (la mitad se aleja del cero)
const MULTI = {
  min: { n: [2], f: (A) => ({ v: Math.min(...A.map((a) => a.v)), r: anyR(A) }) },
  max: { n: [2], f: (A) => ({ v: Math.max(...A.map((a) => a.v)), r: anyR(A) }) },
  clamp: { n: [3, 3], f: (A) => ({ v: Math.min(Math.max(A[0].v, Math.min(A[1].v, A[2].v)), Math.max(A[1].v, A[2].v)), r: anyR(A) }) }, // clamp(x; minimo; maximo)
  hypot: { n: [2], f: (A) => ({ v: Math.hypot(...A.map((a) => a.v)), r: anyR(A) }) },
  atan2: { n: [2, 2], f: (A, rm) => { const v = Math.atan2(A[0].v, A[1].v); return { v: rm ? v : v * TAU_DEG, r: false }; } }, // atan2(y; x), en grados
  mod: { n: [2, 2], f: (A) => { if (A[1].v === 0) throw rt('División entre cero'); return { v: A[0].v - A[1].v * Math.floor(A[0].v / A[1].v), r: anyR(A) }; } }, // el resultado lleva el signo del divisor
  round: { n: [1, 2], f: (A) => { const d = A.length > 1 ? A[1].v : 0; if (!Number.isInteger(d) || d < 0 || d > 12) throw new Error('round(x; n): n debe ser un entero de 0 a 12'); return { v: rnd(A[0].v, d), r: A[0].r }; } },
};
MULTI.redondear = MULTI.round;
const intOf = (a, fn, what) => { if (!Number.isInteger(a.v)) throw new Error(`${fn}: ${what} debe ser un entero`); return a.v; };
const gcd2 = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
Object.assign(MULTI, {
  rem: { n: [2, 2], f: (A) => { if (A[1].v === 0) throw rt('División entre cero'); return { v: A[0].v - A[1].v * Math.trunc(A[0].v / A[1].v), r: anyR(A) }; } }, // el resto lleva el signo del dividendo (mod, el del divisor)
  gcd: { n: [2, 2], f: (A) => ({ v: gcd2(intOf(A[0], 'gcd(a, b)', 'a'), intOf(A[1], 'gcd(a, b)', 'b')), r: false }) },
  lcm: { n: [2, 2], f: (A) => { const a = intOf(A[0], 'lcm(a, b)', 'a'), b = intOf(A[1], 'lcm(a, b)', 'b'); return { v: a && b ? Math.abs(a * b) / gcd2(a, b) : 0, r: false }; } },
  nchoosek: { n: [2, 2], f: (A) => { const n = intOf(A[0], 'nchoosek(n, k)', 'n'), k = intOf(A[1], 'nchoosek(n, k)', 'k'); if (k < 0 || n < 0 || k > n) throw new Error('nchoosek(n, k): hace falta 0 ≤ k ≤ n'); let c = 1; for (let i = 1; i <= Math.min(k, n - k); i++) c = (c * (n - Math.min(k, n - k) + i)) / i; return { v: Math.round(c), r: false }; } },
  nthroot: { n: [2, 2], f: (A) => { const x = A[0].v, n = A[1].v; if (!Number.isInteger(n) || n === 0) throw new Error('nthroot(x, n): n debe ser un entero distinto de 0'); if (x < 0 && n % 2 === 0) throw rt('nthroot(x, n): con x negativo, n debe ser impar (para un complejo usa x^(1/n))'); return { v: Math.sign(x) * Math.abs(x) ** (1 / n), r: false }; } },
});
const LAZY = new Set(['if', 'si', 'fzero', 'line', 'for', 'while', 'integral']); // fzero(ecuacion; x; inicial): la ecuacion se calcula muchas veces (ver lazyFzero) // if(condicion; si_verdadero; si_falso), o si(...) como alias: solo se evalua la rama elegida
// Funciones de vectores y matrices (reciben un vector o una matriz): inv, det; resumenes (sobre todos los elementos): sum, prod, mean, median, std, variance, norm, len;
// forma: rows, cols, trace, diag, eye(n); acumuladas: cumsum, cumprod; entre dos vectores: dot, cross. min(x) y max(x) con un solo vector tambien resumen.
const MATFN = new Set(['inv', 'det', 'sum', 'prod', 'mean', 'median', 'std', 'variance', 'norm', 'len', 'rows', 'cols', 'trace', 'diag', 'eye', 'cumsum', 'cumprod', 'dot', 'cross']);
// error de calculo (division entre cero, raiz negativa): una rama de if() que no se elige no lo propaga
const rt = (m) => { const e = new Error(m); e.rt = true; return e; };

// Nombres que no puede llevar una cota: funciones y constantes del evaluador.
// Nombres reservados para uso futuro (solo en esa minuscula exacta; «T» o «Ω» siguen libres): «t» es el tiempo y «j», «ω», «θ» y «α»
// quedan guardadas para los motores, las animaciones y los calculos dinamicos. Todavia no valen nada.
export const TIME_VAR = 't';
export const FUTURE_VARS = new Set([TIME_VAR, 'j', 'ω', 'θ', 'α']);
export const isReservedName = (n) => { const l = String(n).toLowerCase(); return FUTURE_VARS.has(n) || l in FUNCS || l in MULTI || l in CONSTS || LAZY.has(l) || MATFN.has(l) || l in NF || l in SFL || l === 'log10' || l === 'clear' || l === 'all' || l === 'solve'; };
export const reservedWhy = (n) => (n === TIME_VAR ? `«${n}» está reservada para el tiempo` : n === 'j' ? '«j» es la unidad imaginaria (3+4j)' : FUTURE_VARS.has(n) ? `«${n}» está reservada para uso futuro` : String(n).toLowerCase() === 'all' ? `«${n}» está reservada para clear(all)` : `«${n}» es una función o constante`);
export const NAME_RE = /^[A-Za-zα-ωΑ-Ωϑϕϖɛ_][A-Za-z0-9α-ωΑ-Ωϑϕϖɛ_]*$/;
const ID_RE = /^[A-Za-zα-ωΑ-Ωϑϕϖɛ_][A-Za-z0-9α-ωΑ-Ωϑϕϖɛ_]*/;
// Variables de texto con subindice: «var_(texto-del-subindice)». El subindice es texto libre (sin parentesis ni llaves); espacios sobrantes no cuentan.
// Nombre con subindice o indice entre parentesis: «C_(surf)», «b_(14 - i)», y con parentesis dentro: «b_(k + 7*(j - 1))» (se cuentan).
const SUB_HEAD = /^[A-Za-zα-ωΑ-Ωϑϕϖɛ_][A-Za-z0-9α-ωΑ-Ωϑϕϖɛ_]*?'*_\(/;
// Desde k (justo despues de un «(»): donde termina el parentesis que lo cierra (indice siguiente), o -1 (sin cerrar, salto de linea o llaves)
function closeParen(s, k) { let d = 1; for (let q = k; q < s.length; q++) { const c = s[q]; if (c === '\n' || c === '{' || c === '}') return -1; if (c === '(') d++; else if (c === ')' && !--d) return q + 1; } return -1; }
const SUB_RE = { exec: (s) => { const h = SUB_HEAD.exec(s); if (!h) return null; const e = closeParen(s, h[0].length); return e > h[0].length + 1 ? [s.slice(0, e)] : null; } };
// Un nombre puede terminar en primas: «Se'», «Se''», «σ'_(a)» (ver primesAt para distinguirlas de una unidad).
export const TEXT_NAME_RE = /^[A-Za-zα-ωΑ-Ωϑϕϖɛ_][A-Za-z0-9α-ωΑ-Ωϑϕϖɛ_]*?'*(?:_\([^(){}\n]+\))?$/;
// Indices de vectores y matrices con la notacion matematica: «v_2», «v_i» (un indice) y «A_(fila,columna)», «v_(i+1)» (entre parentesis, con formulas).
// Un nombre que existe como variable (p. ej. «k_(total)» o «x_1») es esa variable: solo es un indice si el nombre entero no existe y su base si.
export function indexParts(raw) {
  if (raw.endsWith(')')) { // el «(» que cierra el «)» final: «b_(k + 7*(j - 1))» es b con el indice «k + 7*(j - 1)»
    let d = 0, k = raw.length - 1;
    for (; k >= 0; k--) { if (raw[k] === ')') d++; else if (raw[k] === '(' && !--d) break; }
    if (k > 1 && raw[k - 1] === '_') return { base: raw.slice(0, k - 1), src: raw.slice(k + 1, -1) };
  }
  const j = raw.lastIndexOf('_');
  if (j > 0 && /^[A-Za-z0-9α-ωΑ-Ωϑϕϖɛ]+$/.test(raw.slice(j + 1))) return { base: raw.slice(0, j), src: raw.slice(j + 1) };
  return null;
}
function indexOfVar(raw, vars) {
  const ip = indexParts(raw), x = ip && Object.prototype.hasOwnProperty.call(vars, ip.base) ? vars[ip.base] : null;
  return x && (x.vec || x.mat || x.loc || x.strs) ? ip : null;
}
const splitIdx = (s, mode = decimalMode()) => { // «i, j+1» -> ['i', 'j+1'] (las comas de dentro de parentesis no separan)
  const out = []; let d = 0, cur = '';
  for (const ch of s) {
    if ('([' .includes(ch)) d++; else if (')]'.includes(ch)) d--;
    if (((ch === ',' && mode !== ',') || ch === ';') && d === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  out.push(cur.trim());
  return out;
};
// Letras griegas: un nombre se escribe con su letra o con su nombre de AsciiMath y es la misma variable («alpha» y «α», «Delta_1» y
// «Δ_1»): se guarda y se busca con la letra, la misma que se dibuja (phi es ϕ y varphi es φ, como en asciimath.js). «pi» no cambia:
// es la constante (π ya lo es).
const GREEK_CHAR = { ...GREEK, ...GREEK_UP };
export const greekName = (s) => String(s).replace(/^[A-Za-z]+(?=_|'|$)/, (w) => (w !== 'pi' && Object.prototype.hasOwnProperty.call(GREEK_CHAR, w) ? GREEK_CHAR[w] : w));
export const normName = (s) => greekName(String(s).replace(/_\(\s*([^()]*?)\s*\)$/, '_($1)'));

// Numeros segun el indicador decimal del dibujo: «.» solo punto; «,» punto o coma (la coma decimal vale tambien dentro de corchetes);
// sin indicador (dibujos anteriores) los dos, y dentro de corchetes solo el punto.
const SCI = '([eE][+-]?\\d+(?![A-Za-z_\\d]))?';
const RE_DOT = new RegExp('^(\\d+(\\.\\d+)?|\\.\\d+)' + SCI), RE_ANY = new RegExp('^(\\d+([.,]\\d+)?|[.,]\\d+)' + SCI);
const numRe = (depth) => { const m = decimalMode(); return m === '.' ? RE_DOT : m === ',' ? RE_ANY : depth > 0 ? RE_DOT : RE_ANY; };
// Primas al final de un nombre («Se'», «Se''»): la comilla que sigue a un nombre es una prima si lo que viene despues no puede empezar
// una unidad («Se'=», «Se'*2», «Se':»); si puede, la ultima comilla es la de la unidad («Se'MPa» es Se en MPa, como siempre).
// «f'(3)» es la funcion f' si ya existe; si no, «'(…)» sigue siendo una unidad entre parentesis. Devuelve cuantas primas son del nombre.
const IDX_TAIL = { exec: (s) => { if (s.startsWith('_(')) { const e = closeParen(s, 2); return e > 3 ? [s.slice(0, e)] : null; } return /^_[A-Za-z0-9α-ωΑ-Ωϑϕϖɛ]+/.exec(s); } }; // indice despues de un nombre con subindice: «_(1,2)», «_(i+(1))» o «_k»
function primesAt(src, k, name, vars) {
  let q = 0;
  while (src[k + q] === "'") q++;
  if (!q) return 0;
  const after = /^\s*(.?)/.exec(src.slice(k + q))[1];
  if (!/[A-Za-zµμΩ°%áéíóúñÑ_(]/.test(after)) return q;
  if (after === '(' && vars && Object.prototype.hasOwnProperty.call(vars, normName(name + "'".repeat(q)))) return q;
  return q - 1;
}
// loose: no falla con identificadores desconocidos (para listar las variables de una formula)
function tokenize(src, vars = null, loose = false) {
  const toks = [];
  let i = 0, depth = 0; // depth: corchetes abiertos (dentro de [ ] la coma siempre separa: «[1,2,3]»; la coma decimal solo vale fuera)
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '"' || c === '“' || c === '”') { // cadena: «"texto"» (tambien con las comillas “ ” del teclado del iPad); «""» dentro es una comilla
      let j = i + 1, out = '';
      for (; j < src.length; j++) {
        const q = src[j];
        if (q === '"' && src[j + 1] === '"') { out += '"'; j++; continue; }
        if (q === '"' || q === '”' || q === '“') break;
        out += q;
      }
      if (j >= src.length) { if (loose) { i = src.length; continue; } throw new Error('Falta cerrar una cadena (")'); }
      toks.push({ t: 'str', v: out, i, j: j + 1 }); i = j + 1; continue;
    }
    const last = toks[toks.length - 1], afterValue = !!last && (last.t === 'num' || last.t === 'var' || last.t === 'ufn' || last.t === 'str' || (last.t === 'id' && last.v in CONSTS) || (last.t === 'idx') || last.t === 'unit' || (last.t === 'op' && (last.v === ')' || last.v === ']')));
    // separador de argumentos: «;», o una coma tras un valor («max(a, 5)»); «2,5» ya lo tomo el numero como decimal
    if (c === ';' || (c === ',' && afterValue && decimalMode() !== ',')) { // con coma decimal la coma no separa: los argumentos van con «;»
      toks.push({ t: 'sep', c, d: depth, i, j: i + 1 }); i++; continue; }
    if (c === '|' && depth > 0 && decimalMode() === ',') { toks.push({ t: 'sep', c, d: depth, i, j: i + 1 }); i++; continue; } // con coma decimal, «|» separa las filas de una matriz
    if (c === "'") { // unidad: «250'N», «3'(m/s)», «20'°»
      const um = /^'\s*(\([^()]*\)|[A-Za-zµμΩ°%áéíóúñÑ_][A-Za-zµμΩ°%áéíóúñÑ_0-9]*[²³]?)/.exec(src.slice(i));
      if (!um) throw new Error("Después de «'» va una unidad, p. ej. 250'N o 3'(m/s)");
      let u;
      try { u = parseUnit(um[1].replace(/^\((.*)\)$/, '$1')); } catch (e) { if (!loose) throw e; u = { f: 1 }; }
      toks.push({ t: 'unit', u, i, j: i + um[0].length }); i += um[0].length; continue;
    }
    const cm = /^(<=|>=|==|!=|~~|<|>|≤|≥|≠|≈)/.exec(src.slice(i));
    if (cm) { toks.push({ t: 'cmp', v: { '≤': '<=', '≥': '>=', '≠': '!=', '~~': '≈' }[cm[0]] || cm[0], i, j: i + cm[0].length }); i += cm[0].length; continue; } // ≈ (o ~~): casi igual
    // Notacion cientifica: 2.5e6, 3e-4, 1E3 («e» y «E» no pueden ser nombres de variable: son la constante e). «2E3» es 2000 aunque
    // exista una variable E3: para multiplicar, «2*E3».
    let m = numRe(depth).exec(src.slice(i));
    if (m) {
      const L = m[0].length, sx = src[i + L];
      if ((sx === 'i' || sx === 'j') && !/[A-Za-z0-9_α-ωΑ-Ωϑϕϖɛ']/.test(src[i + L + 1] || '')) { toks.push({ t: 'num', v: 0, im: Number(m[0].replace(',', '.')), i, j: i + L + 1 }); i += L + 1; continue; } // «3j», «2.5i»: un imaginario
      toks.push({ t: 'num', v: Number(m[0].replace(',', '.')), i, j: i + L }); i += L; continue;
    }
    if (c === '√') { toks.push({ t: 'sqrt', i, j: i + 1 }); i++; continue; }
    if (c === 'π') { toks.push({ t: 'id', v: 'π', i, j: i + 1 }); i++; continue; }
    m = SUB_RE.exec(src.slice(i)) || ID_RE.exec(src.slice(i));
    if (m && m[0].endsWith(')')) { const ex = IDX_TAIL.exec(src.slice(i + m[0].length)); if (ex) m = [m[0] + ex[0]]; } // «T_(st)_(1,2)»: el indice de un nombre con subindice
    if (m && !m[0].endsWith(')')) { const q = primesAt(src, i + m[0].length, m[0], vars); if (q) m = [m[0] + "'".repeat(q)]; } // «Se'»: primas del nombre
    if (m) {
      let ix = null;
      const L = m[0].length; // largo escrito (el nombre se normaliza: «a_( b )» es «a_(b)»)
      let raw = normName(m[0]), name = raw.toLowerCase();
      // propiedad de un elemento: p12.x, l3.len (nombre + «.» + propiedad)
      const dm = /^[A-Za-z]+\d+$/.test(raw) ? /^\.([A-Za-zα-ωΑ-Ωϑϕϖɛ]\w*)/.exec(src.slice(i + raw.length)) : null; // solo nombres como p12, l3, c1
      if (dm) {
        const full = raw + '.' + dm[1];
        if (loose || (vars && Object.prototype.hasOwnProperty.call(vars, full))) { toks.push({ t: 'var', v: full, i, j: i + full.length }); i += full.length; continue; }
        if (!(vars && Object.prototype.hasOwnProperty.call(vars, raw))) throw new Error(`No reconozco «${full}» (propiedades: p1.x, p1.y, l1.len, l1.ang, c1.r, c1.d)`);
      }
      // nombre de una biblioteca insertada: «UF.C_(surf)», «UF.S_e'», «UF.b_k» (alias + «.» + nombre; ver qualify.js y tvars.js)
      if (/^[A-Za-z][A-Za-z0-9]{0,11}$/.test(raw) && src[i + L] === '.' && /[A-Za-zα-ωΑ-Ωϑϕϖɛ_]/.test(src[i + L + 1] || '')) {
        let m2 = SUB_RE.exec(src.slice(i + L + 1)) || ID_RE.exec(src.slice(i + L + 1));
        if (m2 && m2[0].endsWith(')')) { const ex = IDX_TAIL.exec(src.slice(i + L + 1 + m2[0].length)); if (ex) m2 = [m2[0] + ex[0]]; }
        if (m2 && !m2[0].endsWith(')')) { // primas: «UF.S_e'(…)» es la funcion S_e' de la biblioteca si existe
          const k2 = i + L + 1 + m2[0].length; let q = 0; while (src[k2 + q] === "'") q++;
          if (q) { const after = /^\s*(.?)/.exec(src.slice(k2 + q))[1]; if (/[A-Za-zµμΩ°%áéíóúñÑ_(]/.test(after) && !(after === '(' && vars && Object.prototype.hasOwnProperty.call(vars, raw + '.' + normName(m2[0] + "'".repeat(q))))) q--; }
          if (q) m2 = [m2[0] + "'".repeat(q)];
        }
        if (m2) {
          const full = raw + '.' + normName(m2[0]), LL = L + 1 + m2[0].length;
          if (loose) { toks.push({ t: 'var', v: full, i, j: i + LL }); i += LL; continue; }
          if (vars && Object.prototype.hasOwnProperty.call(vars, full)) { toks.push({ t: vars[full]?.fn ? 'ufn' : 'var', v: full, i, j: i + LL }); i += LL; continue; }
          if (vars && (ix = indexOfVar(full, vars))) { toks.push({ t: 'idx', base: ix.base, src: ix.src, i, j: i + LL }); i += LL; continue; }
          if (vars && Object.keys(vars).some((k) => k.startsWith(raw + '.'))) throw new Error(`La biblioteca «${raw}» no tiene «${normName(m2[0])}»`);
        }
      }
      if (vars && Object.prototype.hasOwnProperty.call(vars, raw)) toks.push({ t: vars[raw]?.fn ? 'ufn' : 'var', v: raw, i, j: i + L }); // ufn: funcion definida en un texto
      else if (vars && (ix = indexOfVar(raw, vars))) toks.push({ t: 'idx', base: ix.base, src: ix.src, i, j: i + L }); // v_2, v_i, A_(1,2): un elemento de un vector o matriz
      else if (raw === 'T' && last?.t === 'op' && last.v === '^') toks.push({ t: 'tr', i, j: i + 1 }); // x^T: la transpuesta
      else if (raw === 'j') toks.push({ t: 'num', v: 0, im: 1, i, j: i + L }); // la unidad imaginaria (solo «j» minuscula)
      else if (name in FUNCS || name in MULTI || name in CONSTS || LAZY.has(name) || MATFN.has(name) || name in NF) toks.push({ t: 'id', v: name, i, j: i + L });
      else if (name in SFL) toks.push({ t: 'id', v: SFL[name], i, j: i + L }); // funciones de cadenas (startsWith o startswith)
      else if (loose) toks.push({ t: 'var', v: raw, i, j: i + L });
      else if (FUTURE_VARS.has(raw)) throw new Error(`${reservedWhy(raw)} (todavía no tiene valor)`);
      else if (/^(nargin|varargin)(_|$)/.test(raw)) throw new Error(raw.startsWith('nargin') ? '«nargin» solo vale dentro de una función: es cuántos valores recibió' : '«varargin» solo vale dentro de una función que lo tenga como último parámetro: f(a, varargin):…');
      else throw new Error(`No reconozco «${raw}»` + (/\d/.test(raw) || raw.length === 1 ? ' (no hay una cota con ese nombre)' : ''));
      i += L; continue;
    }
    if (c === '.' && src[i + 1] === '.') { toks.push({ t: 'op', v: '..', i, j: i + 2 }); i += 2; continue; } // rango de for: 1..n
    if (c === ':') { toks.push({ t: 'asg', i, j: i + 1 }); i++; continue; } // asignacion: solo dentro de line(), for() o while()
    if (c === '*' && src[i + 1] === '*') { toks.push({ t: 'op', v: '^', i, j: i + 2 }); i += 2; continue; }
    if (c === '.' && '*/^'.includes(src[i + 1] ?? ' ')) { toks.push({ t: 'op', v: '.' + src[i + 1], i, j: i + 2 }); i += 2; continue; } // elemento a elemento: .* ./ .^
    if (c === '[') depth++; else if (c === ']') depth = Math.max(0, depth - 1);
    if ('+-*/^()[]×÷·−'.includes(c)) { toks.push({ t: 'op', v: c === '×' || c === '·' ? '*' : c === '÷' ? '/' : c === '−' ? '-' : c, i, j: i + 1 }); i++; continue; }
    if (c === ',' && decimalMode() === ',') throw new Error('Con coma decimal los argumentos se separan con «;» (la coma es el decimal)');
    throw new Error(`Carácter no válido «${c}»`);
  }
  return toks;
}

// Reescribe una expresion de un indicador decimal a otro (null: dibujos anteriores): decimales, separadores de argumentos y, dentro de corchetes,
// de elementos y de filas. Devuelve la misma cadena si no se puede leer.
export function convertExpr(src, from, to) {
  src = String(src ?? '');
  if (from === to) return src;
  const prev = decimalMode();
  let toks;
  setDecimal(from);
  try { toks = tokenize(src, null, true); } catch (e) { return src; } finally { setDecimal(prev); }
  const dc = to === ',' ? ',' : '.';
  let out = '', at = 0;
  for (const k of toks) {
    let rep = null;
    if (k.t === 'num') rep = src.slice(k.i, k.j).replace(/[.,]/, dc);
    else if (k.t === 'sep') rep = k.d > 0 ? (k.c === rowChar(from) ? rowChar(to) : elemChar(to)) : argChar(to);
    else if (k.t === 'var' && /_\(.*\)$/.test(src.slice(k.i, k.j))) { // A_(i,j): los separadores del indice
      const w = src.slice(k.i, k.j), a = w.lastIndexOf('_(') + 2;
      rep = w.slice(0, a) + splitIdx(w.slice(a, -1), from).join(argChar(to)) + ')';
    }
    if (rep !== null && rep !== src.slice(k.i, k.j)) {
      let pre = src.slice(at, k.i);
      if (k.t === 'sep' && k.d > 0 && k.c === rowChar(from) && from === ',') pre = pre.replace(/ $/, ''); // «2 | 3» -> «2; 3»
      else if (k.t === 'sep' && k.d > 0 && k.c === rowChar(from) && to === ',' && !/\s$/.test(pre)) rep = ' ' + rep; // «2; 3» -> «2 | 3»
      out += pre + rep; at = k.j;
    }
  }
  return out + src.slice(at);
}

// Variables que usa una formula (nombres que no son numeros, funciones ni constantes).
// has(nombre): ¿existe esa variable? Si se da, un nombre con indice («v_2», «A_(i,j)») cuenta como la variable indexada y las variables de sus indices.
export function exprRefs(src, has = null) {
  try {
    const out = [];
    for (const k of tokenize(String(src ?? ''), null, true)) {
      if (k.t !== 'var') continue;
      const ip = has && !has(k.v) ? indexParts(k.v) : null;
      if (ip && has(ip.base)) out.push(ip.base, ...splitIdx(ip.src).filter((s) => s && s !== ':').flatMap((s) => exprRefs(s, has))); else out.push(k.v);
    }
    return [...new Set(out)];
  } catch (e) { return []; }
}
// Cambia el nombre de una variable dentro de una formula (solo la palabra entera).
export function renameInExpr(src, from, to) {
  let out = '', last = 0;
  try {
    for (const k of tokenize(String(src ?? ''), null, true)) if (k.t === 'var' && k.v === from) { out += src.slice(last, k.i) + to; last = k.j; }
  } catch (e) { return src; }
  return out + src.slice(last);
}

// Matrices: un valor puede ser una matriz { m: [[...], ...] } (un vector fila es de 1 x n; la transpuesta de un vector fila, de n x 1).
const isM = (a) => !!a?.m;
// Un 0 sin unidades vale con cualquier unidad (0 m = 0 kN = 0): se puede sumar, restar y comparar con una cantidad, y estar en una matriz
// con elementos que la tienen («x>0» con x en in, «if(x>a; x-a; 0)»). Solo el cero exacto: 1 + 2 m sigue siendo ⚠.
const zero0 = (a) => !isM(a) && !a?.d && a?.v === 0 && !a?.im;
const dimsOf = (a) => `${a.m.length}×${a.m[0].length}`;
const nameM = (a) => (a.m.length === 1 ? `un vector fila de ${a.m[0].length}` : a.m[0].length === 1 ? `un vector columna de ${a.m.length}` : `una matriz de ${dimsOf(a)}`);
const mapM = (a, f) => ({ m: a.m.map((r) => r.map(f)) });
const transposeM = (a) => ({ m: a.m[0].map((_, k) => a.m.map((r) => r[k])) });
function addM(a, b, s) {
  if (!isM(a) || !isM(b)) return isM(a) ? mapM(a, (x) => x + s * b.v) : mapM(b, (y) => a.v + s * y); // un numero se suma a (o se resta de) cada elemento
  if (a.m.length !== b.m.length || a.m[0].length !== b.m[0].length) throw new Error(`No se puede ${s > 0 ? 'sumar' : 'restar'} ${nameM(a)} y ${nameM(b)}: deben tener el mismo tamaño`);
  return { m: a.m.map((r, i) => r.map((x, k) => x + s * b.m[i][k])) };
}
function mulM(a, b) {
  if (!isM(a)) return mapM(b, (x) => a.v * x);
  if (!isM(b)) return mapM(a, (x) => x * b.v);
  const n = a.m[0].length;
  if (n !== b.m.length) throw new Error(`No se puede multiplicar ${nameM(a)} por ${nameM(b)}: las columnas de la primera (${n}) deben ser las filas de la segunda (${b.m.length})` + (a.m.length === 1 && b.m.length === 1 ? '. Para el producto punto de dos vectores fila usa v*w^T' : ''));
  const out = a.m.map((r) => b.m[0].map((_, k) => r.reduce((s, x, j) => s + x * b.m[j][k], 0)));
  return out.length === 1 && out[0].length === 1 ? { v: out[0][0], r: false } : { m: out };
}

// Inversa por Gauss-Jordan con pivote parcial.
function invM(m) {
  const n = m.length;
  if (m[0].length !== n) throw new Error(`Solo las matrices cuadradas tienen inversa (esta es de ${n}×${m[0].length})`);
  const big = Math.max(1e-300, ...m.flat().map(Math.abs));
  const a = m.map((r, i) => [...r, ...Array.from({ length: n }, (_, k) => (k === i ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let q = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[q][c])) q = r;
    if (Math.abs(a[q][c]) <= 1e-12 * big) throw new Error('La matriz es singular: no tiene inversa');
    [a[c], a[q]] = [a[q], a[c]];
    const d = a[c][c];
    for (let k = 0; k < 2 * n; k++) a[c][k] /= d;
    for (let r = 0; r < n; r++) if (r !== c) { const f = a[r][c]; if (f !== 0) for (let k = 0; k < 2 * n; k++) a[r][k] -= f * a[c][k]; }
  }
  return a.map((r) => r.slice(n));
}
// Determinante: formulas exactas hasta 3x3 (los enteros dan enteros) y eliminacion con pivote parcial despues.
function detM(m) {
  const n = m.length;
  if (m[0].length !== n) throw new Error(`Solo las matrices cuadradas tienen determinante (esta es de ${n}×${m[0].length})`);
  if (n === 1) return m[0][0];
  if (n === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0];
  if (n === 3) return m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const a = m.map((r) => [...r]);
  let det = 1;
  for (let c = 0; c < n; c++) {
    let q = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[q][c])) q = r;
    if (a[q][c] === 0) return 0;
    if (q !== c) { [a[c], a[q]] = [a[q], a[c]]; det = -det; }
    det *= a[c][c];
    for (let r = c + 1; r < n; r++) { const f = a[r][c] / a[c][c]; for (let k = c; k < n; k++) a[r][k] -= f * a[c][k]; }
  }
  return det;
}
const eyeM = (n) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, k) => (i === k ? 1 : 0)));
const mulRaw = (a, b) => a.map((r) => b[0].map((_, k) => r.reduce((s, x, j) => s + x * b[j][k], 0)));
// A^n con n entero (A cuadrada): A^0 = I, A^(-1) = inversa, A^(-2) = inversa al cuadrado...
function powM(a, n) {
  const sq = a.m.length;
  if (a.m[0].length !== sq) throw new Error(`Solo las matrices cuadradas se elevan a una potencia (esta es de ${dimsOf(a)}); la potencia elemento a elemento es .^`);
  if (!Number.isInteger(n)) throw new Error('La potencia de una matriz debe ser un número entero (A^2, A^(-1)); la potencia elemento a elemento es .^');
  if (Math.abs(n) > 1000) throw new Error('La potencia de una matriz admite hasta ±1000');
  let base = n < 0 ? invM(a.m) : a.m, e = Math.abs(n), out = eyeM(sq);
  while (e > 0) { if (e & 1) out = mulRaw(out, base); base = mulRaw(base, base); e >>= 1; }
  return { m: out };
}
// Operaciones elemento a elemento (.* ./ .^ y las funciones): un escalar se extiende a todos los elementos; dos matrices deben tener el mismo tamano.
function sameShape(a, b, what) {
  if (a.m.length !== b.m.length || a.m[0].length !== b.m[0].length) throw new Error(`No se puede ${what} ${nameM(a)} y ${nameM(b)}: deben tener el mismo tamaño`);
}
function elementwise(a, b, f, what) {
  if (isM(a) && isM(b)) { sameShape(a, b, what); return { m: a.m.map((r, i) => r.map((x, k) => f(x, b.m[i][k]))) }; }
  return isM(a) ? mapM(a, (x) => f(x, b.v)) : mapM(b, (y) => f(a.v, y));
}
const divEl = (x, y) => { if (y === 0) throw rt('División entre cero'); return x / y; };

// ---- Cadenas ----
// Una cadena es { str: 'texto' }; un vector de cadenas, { strs: ['a', 'b'] }. Se unen con «+» (o strcat) y se comparan con == y !=;
// en cualquier otra operacion numerica avisan (un numero se convierte con num2str).
const isS = (a) => typeof a?.str === 'string' || !!a?.strs;
const strErr = (what) => new Error(`${what}: para un número dentro de una cadena usa num2str(…)`);
function strAdd(a, b, s) {
  if (s < 0) throw new Error('Las cadenas no se restan');
  if (!isS(a) || !isS(b)) throw strErr('No se puede sumar una cadena con un número');
  if (a.strs && b.strs) { if (a.strs.length !== b.strs.length) throw new Error(`No se pueden unir vectores de cadenas de distinto tamaño (${a.strs.length} y ${b.strs.length})`); return { strs: a.strs.map((x, i) => x + b.strs[i]) }; }
  if (a.strs) return { strs: a.strs.map((x) => x + b.str) };
  if (b.strs) return { strs: b.strs.map((x) => a.str + x) };
  return { str: a.str + b.str };
}
// ---- Numeros complejos ----
// Un escalar complejo es { v (parte real), im (parte imaginaria), r, d }; una matriz compleja, { m (partes reales), mi (imaginarias) }.
// Sin im (o mi) el valor es real y todo va por el camino de siempre. Aqui se opera con pares [re, im].
const isC = (a) => (isM(a) ? !!a.mi : !!a?.im);
const cpair = (a) => [a.v, a.im || 0];
const cval = (z, r = false, d) => { const o = { v: z[0], r }; if (z[1]) o.im = z[1]; if (d) o.d = d; return o; };
const cadd = (a, b) => [a[0] + b[0], a[1] + b[1]];
const csub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cdiv = (a, b) => { const q = b[0] * b[0] + b[1] * b[1]; if (q === 0) throw rt('División entre cero'); return [(a[0] * b[0] + a[1] * b[1]) / q, (a[1] * b[0] - a[0] * b[1]) / q]; };
const cabs = (a) => Math.hypot(a[0], a[1]);
const carg = (a) => Math.atan2(a[1], a[0]);
const cexp = (a) => { const e = Math.exp(a[0]); return a[1] ? [e * Math.cos(a[1]), e * Math.sin(a[1])] : [e, 0]; };
const clog = (a) => { if (a[0] === 0 && a[1] === 0) throw rt('Logaritmo de cero'); return [Math.log(cabs(a)), carg(a)]; };
const csqrt = (a) => { const r = cabs(a); if (r === 0) return [0, 0]; const re = Math.sqrt(Math.max(0, (r + a[0]) / 2)), im = Math.sqrt(Math.max(0, (r - a[0]) / 2)); return [re, a[1] < 0 ? -im : im]; };
function cpow(a, b) {
  if (a[0] === 0 && a[1] === 0) { if (b[0] === 0 && b[1] === 0) return [1, 0]; if (b[0] > 0) return [0, 0]; throw rt('División entre cero'); }
  if (!b[1] && Number.isInteger(b[0]) && Math.abs(b[0]) <= 64) { // potencia entera: por multiplicaciones (exacta: (3+4j)^2 = -7+24j)
    let out = [1, 0], base = b[0] < 0 ? cdiv([1, 0], a) : a, e = Math.abs(b[0]);
    while (e > 0) { if (e & 1) out = cmul(out, base); base = cmul(base, base); e >>= 1; }
    return out;
  }
  return cexp(cmul(b, clog(a)));
}
const csin = (a) => [Math.sin(a[0]) * Math.cosh(a[1]), Math.cos(a[0]) * Math.sinh(a[1])];
const ccos = (a) => [Math.cos(a[0]) * Math.cosh(a[1]), -Math.sin(a[0]) * Math.sinh(a[1])];
const csinh = (a) => [Math.sinh(a[0]) * Math.cos(a[1]), Math.cosh(a[0]) * Math.sin(a[1])];
const ccosh = (a) => [Math.cosh(a[0]) * Math.cos(a[1]), Math.sinh(a[0]) * Math.sin(a[1])];
const casin = (z) => { const l = clog(cadd([-z[1], z[0]], csqrt(csub([1, 0], cmul(z, z))))); return [l[1], -l[0]]; }; // -j·ln(jz + √(1-z²))
const cacos = (z) => csub([Math.PI / 2, 0], casin(z));
const catan = (z) => { const jz = [-z[1], z[0]], l = csub(clog(csub([1, 0], jz)), clog(cadd([1, 0], jz))); return [-l[1] / 2, l[0] / 2]; };
const casinh = (z) => clog(cadd(z, csqrt(cadd(cmul(z, z), [1, 0]))));
const cacosh = (z) => clog(cadd(z, cmul(csqrt(cadd(z, [1, 0])), csqrt(csub(z, [1, 0])))));
const catanh = (z) => { const l = csub(clog(cadd([1, 0], z)), clog(csub([1, 0], z))); return [l[0] / 2, l[1] / 2]; };
const cscale = (a, k) => [a[0] * k, a[1] * k];
// Funciones con un argumento complejo: f(z, radianes) -> z. Las trigonometricas siguen la regla de los angulos (en grados si no son radianes).
const DEG_IN = (f) => (z, rm) => f(rm ? z : cscale(z, 1 / TAU_DEG)), DEG_OUT = (f) => (z, rm) => (rm ? f(z) : cscale(f(z), TAU_DEG));
const CF = {
  sqrt: csqrt, raiz: csqrt, exp: cexp, ln: clog, log: (z) => cscale(clog(z), 1 / Math.LN10), log10: (z) => cscale(clog(z), 1 / Math.LN10),
  sin: DEG_IN(csin), sen: DEG_IN(csin), cos: DEG_IN(ccos), tan: DEG_IN((z) => cdiv(csin(z), ccos(z))),
  sec: DEG_IN((z) => cdiv([1, 0], ccos(z))), csc: DEG_IN((z) => cdiv([1, 0], csin(z))), cot: DEG_IN((z) => cdiv(ccos(z), csin(z))),
  sinh: csinh, cosh: ccosh, tanh: (z) => cdiv(csinh(z), ccosh(z)), asinh: casinh, acosh: cacosh, atanh: catanh,
  asin: DEG_OUT(casin), acos: DEG_OUT(cacos), atan: DEG_OUT(catan),
  sign: (z) => { const r = cabs(z); return r ? cscale(z, 1 / r) : [0, 0]; }, signo: (z) => { const r = cabs(z); return r ? cscale(z, 1 / r) : [0, 0]; },
};
// Funciones que con un numero real fuera de su dominio real dan un complejo (como en MATLAB): √(-4) = 2j, ln(-1) = πj, acos(2).
const DOM_C = new Set(['sqrt', 'raiz', 'ln', 'log', 'log10', 'asin', 'acos', 'acosh', 'atanh']);
// Matrices complejas: como matrices de pares
const cm = (a) => a.m.map((r, i) => r.map((x, k) => [x, a.mi ? a.mi[i][k] : 0]));
const fromCm = (P) => { const m = P.map((r) => r.map((z) => z[0])), mi = P.map((r) => r.map((z) => z[1])); return mi.some((r) => r.some((x) => x !== 0)) ? { m, mi } : { m }; };
const cmapM = (a, f) => fromCm(cm(a).map((r) => r.map(f)));
const ctransposeM = (a) => ({ m: a.m[0].map((_, k) => a.m.map((r) => r[k])), ...(a.mi ? { mi: a.mi[0].map((_, k) => a.mi.map((r) => r[k])) } : {}) });
function celementwise(a, b, f, what) {
  if (isM(a) && isM(b)) { sameShape(a, b, what); const B = cm(b); return fromCm(cm(a).map((r, i) => r.map((z, k) => f(z, B[i][k])))); }
  return isM(a) ? cmapM(a, (z) => f(z, cpair(b))) : cmapM(b, (z) => f(cpair(a), z));
}
function caddM(a, b, s) { // suma (s = 1) o resta (s = -1) con matrices complejas; un numero se suma a cada elemento
  if (isM(a) && isM(b)) { if (a.m.length !== b.m.length || a.m[0].length !== b.m[0].length) throw new Error(`No se puede ${s > 0 ? 'sumar' : 'restar'} ${nameM(a)} y ${nameM(b)}: deben tener el mismo tamaño`); const B = cm(b); return fromCm(cm(a).map((r, i) => r.map((z, k) => cadd(z, cscale(B[i][k], s))))); }
  return isM(a) ? cmapM(a, (z) => cadd(z, cscale(cpair(b), s))) : cmapM(b, (z) => cadd(cpair(a), cscale(z, s)));
}
const cmulRaw = (A, B) => A.map((r) => B[0].map((_, k) => r.reduce((s, z, j) => cadd(s, cmul(z, B[j][k])), [0, 0])));
function cmulM(a, b) {
  if (!isM(a)) return cmapM(b, (z) => cmul(cpair(a), z));
  if (!isM(b)) return cmapM(a, (z) => cmul(z, cpair(b)));
  const n = a.m[0].length;
  if (n !== b.m.length) throw new Error(`No se puede multiplicar ${nameM(a)} por ${nameM(b)}: las columnas de la primera (${n}) deben ser las filas de la segunda (${b.m.length})`);
  const out = cmulRaw(cm(a), cm(b));
  return out.length === 1 && out[0].length === 1 ? cval(out[0][0]) : fromCm(out);
}
function cinvRaw(P) { // Gauss-Jordan con pivote parcial (por el modulo)
  const n = P.length;
  if (P[0].length !== n) throw new Error(`Solo las matrices cuadradas tienen inversa (esta es de ${n}×${P[0].length})`);
  const big = Math.max(1e-300, ...P.flat().map(cabs));
  const a = P.map((r, i) => [...r, ...Array.from({ length: n }, (_, k) => [k === i ? 1 : 0, 0])]);
  for (let c = 0; c < n; c++) {
    let q = c;
    for (let r = c + 1; r < n; r++) if (cabs(a[r][c]) > cabs(a[q][c])) q = r;
    if (cabs(a[q][c]) <= 1e-12 * big) throw new Error('La matriz es singular: no tiene inversa');
    [a[c], a[q]] = [a[q], a[c]];
    const d = a[c][c];
    for (let k = 0; k < 2 * n; k++) a[c][k] = cdiv(a[c][k], d);
    for (let r = 0; r < n; r++) if (r !== c) { const f = a[r][c]; if (f[0] || f[1]) for (let k = 0; k < 2 * n; k++) a[r][k] = csub(a[r][k], cmul(f, a[c][k])); }
  }
  return a.map((r) => r.slice(n));
}
function cdetRaw(P) {
  const n = P.length;
  if (P[0].length !== n) throw new Error(`Solo las matrices cuadradas tienen determinante (esta es de ${n}×${P[0].length})`);
  const a = P.map((r) => r.map((z) => [...z]));
  let det = [1, 0];
  for (let c = 0; c < n; c++) {
    let q = c;
    for (let r = c + 1; r < n; r++) if (cabs(a[r][c]) > cabs(a[q][c])) q = r;
    if (!a[q][c][0] && !a[q][c][1]) return [0, 0];
    if (q !== c) { [a[c], a[q]] = [a[q], a[c]]; det = [-det[0], -det[1]]; }
    det = cmul(det, a[c][c]);
    for (let r = c + 1; r < n; r++) { const f = cdiv(a[r][c], a[c][c]); for (let k = c; k < n; k++) a[r][k] = csub(a[r][k], cmul(f, a[c][k])); }
  }
  return det;
}
function cpowM(a, n) {
  const sq = a.m.length;
  if (a.m[0].length !== sq) throw new Error(`Solo las matrices cuadradas se elevan a una potencia (esta es de ${dimsOf(a)}); la potencia elemento a elemento es .^`);
  if (!Number.isInteger(n)) throw new Error('La potencia de una matriz debe ser un número entero (A^2, A^(-1)); la potencia elemento a elemento es .^');
  if (Math.abs(n) > 1000) throw new Error('La potencia de una matriz admite hasta ±1000');
  let base = n < 0 ? cinvRaw(cm(a)) : cm(a), e = Math.abs(n), out = Array.from({ length: sq }, (_, i) => Array.from({ length: sq }, (_, k) => [i === k ? 1 : 0, 0]));
  while (e > 0) { if (e & 1) out = cmulRaw(out, base); base = cmulRaw(base, base); e >>= 1; }
  return fromCm(out);
}
// Funciones de vectores y matrices con complejos (las que tienen sentido; las demas avisan)
function cmatFn(name, A) {
  const [a, b] = A, P = isM(a) ? cm(a).flat() : [cpair(a)];
  const csum = (L) => L.reduce(cadd, [0, 0]);
  switch (name) {
    case 'inv': return isM(a) ? fromCm(cinvRaw(cm(a))) : cval(cdiv([1, 0], cpair(a)));
    case 'det': return cval(isM(a) ? cdetRaw(cm(a)) : cpair(a));
    case 'sum': return cval(csum(P));
    case 'prod': return cval(P.reduce(cmul, [1, 0]));
    case 'mean': return cval(cscale(csum(P), 1 / P.length));
    case 'norm': return { v: Math.sqrt(P.reduce((s, z) => s + z[0] * z[0] + z[1] * z[1], 0)), r: false };
    case 'len': return { v: P.length, r: false };
    case 'rows': return { v: isM(a) ? a.m.length : 1, r: false };
    case 'cols': return { v: isM(a) ? a.m[0].length : 1, r: false };
    case 'trace': { if (!isM(a)) return a; if (a.m.length !== a.m[0].length) throw new Error(`Solo las matrices cuadradas tienen traza (esta es de ${dimsOf(a)})`); const Q = cm(a); return cval(csum(Q.map((r, i) => r[i]))); }
    case 'diag': {
      if (!isM(a)) return fromCm([[cpair(a)]]);
      const Q = cm(a);
      if (a.m.length === 1 || a.m[0].length === 1) { const v = Q.flat(); return fromCm(v.map((z, i) => v.map((_, k) => (i === k ? z : [0, 0])))); }
      return fromCm(Array.from({ length: Math.min(a.m.length, a.m[0].length) }, (_, i) => [Q[i][i]]));
    }
    case 'cumsum': case 'cumprod': {
      if (isM(a) && a.m.length !== 1 && a.m[0].length !== 1) throw new Error(`«${name}» es para vectores (fila o columna), no para ${nameM(a)}`);
      let acc = name === 'cumsum' ? [0, 0] : [1, 0];
      const out = P.map((z) => (acc = name === 'cumsum' ? cadd(acc, z) : cmul(acc, z)));
      return !isM(a) ? cval(out[0]) : fromCm(a.m.length > 1 ? out.map((z) => [z]) : [out]);
    }
    case 'dot': { // como en MATLAB: conjuga el primero
      const Q = isM(b) ? cm(b).flat() : [cpair(b)];
      if (P.length !== Q.length) throw new Error(`«dot» pide dos vectores del mismo tamaño (${P.length} y ${Q.length})`);
      return cval(csum(P.map((z, i) => cmul([z[0], -z[1]], Q[i]))));
    }
    default: throw new Error(`«${name}» todavía no admite números complejos`);
  }
}

const flatOf = (a) => (isM(a) ? a.m.flat() : [a.v]);
// Un vector (fila o columna) o un numero, como lista.
function vectorOf(a, name) {
  if (!isM(a)) return [a.v];
  if (a.m.length !== 1 && a.m[0].length !== 1) throw new Error(`«${name}» es para vectores (fila o columna), no para ${nameM(a)}`);
  return a.m.flat();
}
// Una lista como vector con la orientacion de a (columna si a es columna, si no fila).
const likeVec = (a, arr) => (isM(a) && a.m.length > 1 && a.m[0].length === 1 ? { m: arr.map((x) => [x]) } : { m: [arr] });
const sum = (arr) => arr.reduce((s, x) => s + x, 0);
// Funciones de vectores y matrices (MATFN).
const dotArgs = () => argText() === ','; // los mensajes nombran el separador del modo
function matFn(name, A) {
  const need = name === 'dot' || name === 'cross' ? 2 : 1;
  if (A.length !== need) throw new Error(need === 1 ? `«${name}» recibe un valor (un vector o una matriz)` : dotArgs() ? `«${name}» recibe dos vectores separados por «,»: ${name}(a, b)` : `«${name}» recibe dos vectores separados por «;»: ${name}(a; b)`);
  const [a, b] = A, flat = flatOf(a);
  switch (name) {
    case 'inv': // inversa de una matriz cuadrada (de un numero, su inverso)
      if (!isM(a)) { if (a.v === 0) throw rt('División entre cero'); return { v: 1 / a.v, r: false }; }
      return { m: invM(a.m) };
    case 'det': return { v: isM(a) ? detM(a.m) : a.v, r: false };
    case 'sum': return { v: sum(flat), r: isM(a) ? false : a.r };
    case 'prod': return { v: flat.reduce((s, x) => s * x, 1), r: false };
    case 'mean': return { v: sum(flat) / flat.length, r: false };
    case 'median': { const s = [...flat].sort((x, y) => x - y), h = s.length >> 1; return { v: s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2, r: false }; }
    case 'variance': case 'std': { // muestral (entre n-1); con un solo elemento, 0
      const n = flat.length;
      if (n < 2) return { v: 0, r: false };
      const mu = sum(flat) / n, v = sum(flat.map((x) => (x - mu) ** 2)) / (n - 1);
      return { v: name === 'std' ? Math.sqrt(v) : v, r: false };
    }
    case 'norm': { // euclidiana (de Frobenius en una matriz), sin desbordar
      const big = Math.max(...flat.map(Math.abs));
      return { v: big === 0 ? 0 : big * Math.sqrt(sum(flat.map((x) => (x / big) ** 2))), r: false };
    }
    case 'len': return { v: flat.length, r: false };
    case 'rows': return { v: isM(a) ? a.m.length : 1, r: false };
    case 'cols': return { v: isM(a) ? a.m[0].length : 1, r: false };
    case 'trace': {
      if (!isM(a)) return a;
      if (a.m.length !== a.m[0].length) throw new Error(`Solo las matrices cuadradas tienen traza (esta es de ${dimsOf(a)})`);
      return { v: sum(a.m.map((r, i) => r[i])), r: false };
    }
    case 'diag': { // de un vector: la matriz diagonal; de una matriz: su diagonal como columna
      if (!isM(a)) return { m: [[a.v]] };
      if (a.m.length === 1 || a.m[0].length === 1) { const v = a.m.flat(); return { m: v.map((x, i) => v.map((_, k) => (i === k ? x : 0))) }; }
      return { m: Array.from({ length: Math.min(a.m.length, a.m[0].length) }, (_, i) => [a.m[i][i]]) };
    }
    case 'eye': {
      if (isM(a) || !Number.isInteger(a.v) || a.v < 1 || a.v > 100) throw new Error('eye(n): n debe ser un entero de 1 a 100');
      return { m: eyeM(a.v) };
    }
    case 'cumsum': case 'cumprod': {
      const v = vectorOf(a, name);
      let acc = name === 'cumsum' ? 0 : 1;
      const out = v.map((x) => (acc = name === 'cumsum' ? acc + x : acc * x));
      return isM(a) ? likeVec(a, out) : { v: out[0], r: false };
    }
    case 'dot': {
      const x = vectorOf(a, 'dot'), y = vectorOf(b, 'dot');
      if (x.length !== y.length) throw new Error(`«dot» pide dos vectores del mismo tamaño (${x.length} y ${y.length})`);
      return { v: sum(x.map((q, i) => q * y[i])), r: false };
    }
    case 'cross': {
      const x = vectorOf(a, 'cross'), y = vectorOf(b, 'cross');
      if (x.length !== 3 || y.length !== 3) throw new Error('«cross» (producto vectorial) pide dos vectores de 3 elementos');
      return likeVec(a, [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]]);
    }
    default: throw new Error(`«${name}» no está disponible`);
  }
}


// ---- Funciones de MATLAB (tanda 1): vectores, matrices, algebra lineal, polinomios, interpolacion e integracion numerica ----
// Cada una recibe los valores ya calculados (A) y devuelve un valor; maneja las unidades y los complejos donde tienen sentido.
const withD = (x, d) => { if (d) x.d = d; else delete x.d; return x; };
const vecErr = (name, a) => new Error(`«${name}» es para vectores (fila o columna), no para ${nameM(a)}`);
function intArg(a, name, what, lo, hi) {
  if (isM(a) || isC(a) || a.d || !Number.isInteger(a.v) || a.v < lo || a.v > hi) throw new Error(`${name}: ${what} debe ser un entero de ${lo} a ${hi}`);
  return a.v;
}
function realVec(a, name) { // { arr, col, d } de un vector real (o un numero)
  if (isC(a)) throw new Error(`«${name}» no admite números complejos`);
  if (!isM(a)) return { arr: [a.v], col: false, d: a.d };
  if (a.m.length !== 1 && a.m[0].length !== 1) throw vecErr(name, a);
  return { arr: a.m.flat(), col: a.m.length > 1 && a.m[0].length === 1, d: a.d };
}
function anyVec(a, name) { // { arr: [[re, im]], col, d } de un vector (real o complejo)
  if (!isM(a)) return { arr: [cpair(a)], col: false, d: a.d };
  if (a.m.length !== 1 && a.m[0].length !== 1) throw vecErr(name, a);
  return { arr: cm(a).flat(), col: a.m.length > 1 && a.m[0].length === 1, d: a.d };
}
const vecOut = (arr, col, d) => withD(col ? { m: arr.map((x) => [x]) } : { m: [arr] }, d);
const cvecOut = (arr, col, d) => withD(fromCm(col ? arr.map((z) => [z]) : [arr]), d);
const asMat = (a) => (isM(a) ? a : { m: [[a.v]], ...(a.im ? { mi: [[a.im]] } : {}), d: a.d });
const noU = (a, name) => { if (a?.d) throw new Error(`«${name}» necesita valores sin unidades (recibió ${unitMsg(a.d)})`); };
const sizeLim = (n, m, name) => { if (n * m > 10000) throw new Error(`${name}: una matriz admite hasta 10000 elementos`); };
// Matriz real (sin complejos) como arreglo
function realMat(a, name) { if (isC(a)) throw new Error(`«${name}» todavía no admite números complejos`); return isM(a) ? a.m : [[a.v]]; }

// SVD por rotaciones de Jacobi (de un lado): A = U·diag(S)·Vᵀ. Para rank, cond y pinv.
function svdJ(A0) {
  let A = A0, tr = false;
  if (A.length < A[0].length) { A = A[0].map((_, k) => A.map((r) => r[k])); tr = true; }
  const m = A.length, n = A[0].length, U = A.map((r) => [...r]), V = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, k) => (i === k ? 1 : 0)));
  for (let sweep = 0; sweep < 80; sweep++) {
    let off = 0;
    for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
      let al = 0, be = 0, ga = 0;
      for (let i = 0; i < m; i++) { al += U[i][p] * U[i][p]; be += U[i][q] * U[i][q]; ga += U[i][p] * U[i][q]; }
      if (Math.abs(ga) <= 1e-15 * Math.sqrt(al * be) || ga === 0) continue;
      off++;
      const ze = (be - al) / (2 * ga), t = Math.sign(ze || 1) / (Math.abs(ze) + Math.sqrt(1 + ze * ze)), c = 1 / Math.sqrt(1 + t * t), sn = c * t;
      for (let i = 0; i < m; i++) { const x = U[i][p], y = U[i][q]; U[i][p] = c * x - sn * y; U[i][q] = sn * x + c * y; }
      for (let i = 0; i < n; i++) { const x = V[i][p], y = V[i][q]; V[i][p] = c * x - sn * y; V[i][q] = sn * x + c * y; }
    }
    if (!off) break;
  }
  const S = Array.from({ length: n }, (_, k) => Math.hypot(...U.map((r) => r[k])));
  for (let k = 0; k < n; k++) if (S[k] > 0) for (let i = 0; i < m; i++) U[i][k] /= S[k];
  return tr ? { U: V, S, V: U } : { U, S, V };
}
const svdTol = (A, S) => Math.max(A.length, A[0].length) * Number.EPSILON * Math.max(0, ...S);
// Raices de un polinomio (coeficientes [re, im], del mayor grado al menor) por Durand-Kerner, pulidas con Newton.
function polyRoots(c0) {
  let c = c0.map((z) => [...z]);
  while (c.length && !c[0][0] && !c[0][1]) c.shift();
  const out = [];
  while (c.length > 1 && !c[c.length - 1][0] && !c[c.length - 1][1]) { c.pop(); out.push([0, 0]); } // raices en 0
  const n = c.length - 1;
  if (n < 1) return out;
  const a = c.map((z) => cdiv(z, c[0])); // monico
  const ev = (z) => a.reduce((acc, q) => cadd(cmul(acc, z), q), [0, 0]);
  const R = 1 + Math.max(...a.slice(1).map(cabs));
  let z = Array.from({ length: n }, (_, k) => cmul([R, 0], cpow([0.4, 0.9], [k, 0])));
  for (let it = 0; it < 1000; it++) {
    let worst = 0;
    z = z.map((zk, k) => {
      let den = [1, 0];
      for (let j = 0; j < n; j++) if (j !== k) den = cmul(den, csub(zk, z[j]));
      const step = cabs(den) ? cdiv(ev(zk), den) : [1e-8, 1e-8];
      worst = Math.max(worst, cabs(step) / Math.max(1, cabs(zk)));
      return csub(zk, step);
    });
    if (worst < 1e-15) break;
  }
  const d = a.slice(0, -1).map((q, i) => cscale(q, n - i)); // derivada, para pulir
  const evd = (x) => d.reduce((acc, q) => cadd(cmul(acc, x), q), [0, 0]);
  z = z.map((x) => { for (let k = 0; k < 3; k++) { const dd = evd(x); if (!cabs(dd)) break; x = csub(x, cdiv(ev(x), dd)); } return x; });
  const all = [...z, ...out].map((x) => { const sc = Math.max(1, cabs(x)); return [Math.abs(x[0]) < 1e-12 * sc ? 0 : x[0], Math.abs(x[1]) < 1e-9 * sc ? 0 : x[1]]; });
  return all.sort((p, q) => q[0] - p[0] || q[1] - p[1]);
}
// Polinomio caracteristico det(λI - A) por Faddeev-LeVerrier (con complejos): coeficientes del mayor grado al menor.
function charPoly(P) {
  const n = P.length, I = (k) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, q) => [i === q ? k[0] : 0, i === q ? k[1] : 0]));
  const coef = [[1, 0]];
  let M = I([0, 0]);
  for (let k = 1; k <= n; k++) {
    M = cmulRaw(P, M).map((r, i) => r.map((z, q) => (i === q ? cadd(z, coef[k - 1]) : z)));
    const AM = cmulRaw(P, M);
    coef.push(cscale(AM.reduce((s, r, i) => cadd(s, r[i]), [0, 0]), -1 / k));
  }
  return coef;
}
// Valores propios de una matriz simetrica real por Jacobi (mas precisos que con el polinomio)
function eigSym(A0) {
  const n = A0.length, A = A0.map((r) => [...r]);
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p][q] * A[p][q];
    if (off < 1e-30) break;
    for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(A[p][q]) < 1e-300) continue;
      const th = (A[q][q] - A[p][p]) / (2 * A[p][q]), t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), sn = t * c;
      for (let k = 0; k < n; k++) { const x = A[k][p], y = A[k][q]; A[k][p] = c * x - sn * y; A[k][q] = sn * x + c * y; }
      for (let k = 0; k < n; k++) { const x = A[p][k], y = A[q][k]; A[p][k] = c * x - sn * y; A[q][k] = sn * x + c * y; }
    }
  }
  return A.map((r, i) => r[i]).sort((x, y) => x - y);
}
// Integral numerica adaptativa (Gauss-Kronrod 7-15) de f en [a, b]
const GK_X = [0.991455371120813, 0.949107912342759, 0.864864423359769, 0.741531185599394, 0.586087235467691, 0.405845151377397, 0.207784955007898, 0];
const GK_WK = [0.022935322010529, 0.063092092629979, 0.104790010322250, 0.140653259715525, 0.169004726639267, 0.190350578064785, 0.204432940075298, 0.209482141084728];
const GK_WG = [0, 0.129484966168870, 0, 0.279705391489277, 0, 0.381830050505119, 0, 0.417959183673469];
function gk(f, a, b) {
  const c = (a + b) / 2, h = (b - a) / 2;
  let k = 0, g = 0;
  for (let i = 0; i < 8; i++) {
    if (i === 7) { const y = f(c); k += GK_WK[7] * y; g += GK_WG[7] * y; continue; }
    const y1 = f(c - h * GK_X[i]), y2 = f(c + h * GK_X[i]);
    k += GK_WK[i] * (y1 + y2); g += GK_WG[i] * (y1 + y2);
  }
  return { v: k * h, e: Math.abs((k - g) * h) };
}
function integrate(f, a, b) {
  let segs = [{ a, b, ...gk(f, a, b) }];
  for (let it = 0; it < 200; it++) {
    const tot = segs.reduce((s, q) => s + q.v, 0), err = segs.reduce((s, q) => s + q.e, 0);
    if (err <= Math.max(1e-10 * Math.abs(tot), 1e-14)) return tot;
    segs.sort((p, q) => q.e - p.e);
    const w = segs.shift(), m = (w.a + w.b) / 2;
    segs.push({ a: w.a, b: m, ...gk(f, w.a, m) }, { a: m, b: w.b, ...gk(f, m, w.b) });
  }
  return segs.reduce((s, q) => s + q.v, 0);
}

// Numeros aleatorios (rand, randn, randi, como en MATLAB): una secuencia REPRODUCIBLE. El dibujo se recalcula con cada cambio; con azar de
// verdad una nube de puntos cambiaria al mover cualquier cosa y una salida no coincidiria con su grafica. Cada calculo del dibujo empieza la
// secuencia desde la misma semilla (rngReset, en textVarState); rng(n) en un texto la cambia desde ese punto de la lectura.
let RNG = 0;
export function rngReset(seed = 1) { RNG = (Math.abs(Math.round(seed)) * 2654435761 + 1013904223) >>> 0; return RNG; }
// Punto de la secuencia: cada salida «…=» y cada grafica parte del suyo (tvars.js lo guarda en el orden de lectura), asi se ve siempre lo
// mismo aunque la pantalla se redibuje; rngMix da un punto distinto para la salida k (dos salidas no repiten la tirada)
export const rngState = () => RNG;
export const rngSet = (s) => { RNG = s >>> 0; };
export function rngMix(s, k) { let h = (s ^ Math.imul((k >>> 0) + 1, 0x9e3779b9)) >>> 0; h = Math.imul(h ^ (h >>> 16), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); return (h ^ (h >>> 16)) >>> 0; }
rngReset();
function rnd01() { RNG = (RNG + 0x6d2b79f5) >>> 0; let t = RNG; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; } // mulberry32
const gauss = () => { let u = 0; while (u === 0) u = rnd01(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd01()); };
const randDims = (A, name, from = 0) => { const n = A[from] ? intArg(A[from], `${name}(n, m)`, 'n', 1, 10000) : 1, m = A[from + 1] ? intArg(A[from + 1], `${name}(n, m)`, 'm', 1, 10000) : A[from] ? n : 1; sizeLim(n, m, name); return [n, m]; };
const randOut = ([n, m], f) => (n === 1 && m === 1 ? { v: f(), r: false } : { m: Array.from({ length: n }, () => Array.from({ length: m }, f)) });
const NF = {
  rand: { n: [0, 2], f: (A) => randOut(randDims(A, 'rand'), rnd01) }, // uniforme en [0, 1): rand(), rand(n) (n×n), rand(1, n) (una fila)
  randn: { n: [0, 2], f: (A) => randOut(randDims(A, 'randn'), gauss) }, // normal estandar (media 0, desviacion 1)
  randi: { n: [1, 3], f: (A) => { // enteros: randi(imax, …) de 1 a imax, randi([a, b], …) de a a b
    const lim = isM(A[0]) ? A[0].m.flat() : [1, A[0].v];
    if (lim.length !== 2 || !lim.every(Number.isInteger) || lim[1] < lim[0]) throw new Error('randi(imax, n, m) o randi([a, b], n, m): imax, a y b son enteros, con a ≤ b');
    return randOut(randDims(A, 'randi', 1), () => lim[0] + Math.floor(rnd01() * (lim[1] - lim[0] + 1)));
  } },
  rng: { n: [1, 1], opts: 0, f: (A) => { if (typeof A[0].str === 'string') { if (A[0].str.toLowerCase() !== 'shuffle') throw new Error('rng(semilla) o rng("shuffle")'); const sd = (Date.now() ^ Math.floor(Math.random() * 2147483647)) % 2147483647; rngReset(sd); return { v: sd, r: false }; } const v = A[0].v; if (!Number.isInteger(v) || v < 0) throw new Error('rng(semilla): la semilla es un entero ≥ 0'); rngReset(v); return { v, r: false }; } }, // cambia la secuencia desde aqui
  zeros: { n: [1, 2], f: (A) => { const n = intArg(A[0], 'zeros(n, m)', 'n', 1, 10000), m = A[1] ? intArg(A[1], 'zeros(n, m)', 'm', 1, 10000) : n; sizeLim(n, m, 'zeros'); return { m: Array.from({ length: n }, () => Array(m).fill(0)) }; } },
  ones: { n: [1, 2], f: (A) => { const n = intArg(A[0], 'ones(n, m)', 'n', 1, 10000), m = A[1] ? intArg(A[1], 'ones(n, m)', 'm', 1, 10000) : n; sizeLim(n, m, 'ones'); return { m: Array.from({ length: n }, () => Array(m).fill(1)) }; } },
  linspace: { n: [2, 3], f: (A) => {
    const [a, b] = A;
    if (isM(a) || isM(b) || isC(a) || isC(b)) throw new Error('linspace(a, b, n): a y b son números reales');
    if (!sameDim(a.d, b.d) && !zero0(a) && !zero0(b)) throw new Error(`linspace(a, b, n): a y b deben tener las mismas unidades (${unitMsg(a.d)} y ${unitMsg(b.d)})`);
    const n = A[2] ? intArg(A[2], 'linspace(a, b, n)', 'n', 1, 10000) : 100;
    return withD({ m: [Array.from({ length: n }, (_, i) => (n === 1 ? b.v : a.v + ((b.v - a.v) * i) / (n - 1)))] }, a.d || b.d);
  } },
  logspace: { n: [2, 3], f: (A) => {
    const [a, b] = A; noU(a, 'logspace'); noU(b, 'logspace');
    if (isM(a) || isM(b) || isC(a) || isC(b)) throw new Error('logspace(a, b, n): a y b son números reales (los exponentes)');
    const n = A[2] ? intArg(A[2], 'logspace(a, b, n)', 'n', 1, 10000) : 50;
    return { m: [Array.from({ length: n }, (_, i) => 10 ** (n === 1 ? b.v : a.v + ((b.v - a.v) * i) / (n - 1)))] };
  } },
  numel: { n: [1, 1], f: (A) => ({ v: isM(A[0]) ? A[0].m.length * A[0].m[0].length : 1, r: false }) },
  size: { n: [1, 1], f: (A) => ({ m: [isM(A[0]) ? [A[0].m.length, A[0].m[0].length] : [1, 1]] }) },
  transpose: { n: [1, 1], f: (A) => { const a = A[0]; return isM(a) ? withD(isC(a) ? ctransposeM(a) : transposeM(a), a.d) : a; } },
  sort: { n: [1, 1], f: (A) => { const v = realVec(A[0], 'sort'); return isM(A[0]) ? vecOut([...v.arr].sort((x, y) => x - y), v.col, v.d) : A[0]; } },
  flip: { n: [1, 1], f: (A) => { const a = A[0]; if (!isM(a)) return a; const P = cm(a); return withD(fromCm(a.m.length === 1 ? [P[0].slice().reverse()] : P.slice().reverse()), a.d); } },
  fliplr: { n: [1, 1], f: (A) => { const a = A[0]; if (!isM(a)) return a; return withD(fromCm(cm(a).map((r) => r.slice().reverse())), a.d); } },
  flipud: { n: [1, 1], f: (A) => { const a = A[0]; if (!isM(a)) return a; return withD(fromCm(cm(a).slice().reverse()), a.d); } },
  repmat: { n: [2, 3], f: (A) => {
    const a = asMat(A[0]), n = intArg(A[1], 'repmat(A, n, m)', 'n', 1, 10000), m = A[2] ? intArg(A[2], 'repmat(A, n, m)', 'm', 1, 10000) : n, P = cm(a);
    sizeLim(P.length * n, P[0].length * m, 'repmat');
    return withD(fromCm(Array.from({ length: P.length * n }, (_, i) => Array.from({ length: P[0].length * m }, (_, k) => P[i % P.length][k % P[0].length]))), a.d);
  } },
  reshape: { n: [3, 3], f: (A) => { // como en MATLAB: por columnas
    const a = asMat(A[0]), n = intArg(A[1], 'reshape(A, n, m)', 'n', 1, 10000), m = intArg(A[2], 'reshape(A, n, m)', 'm', 1, 10000), P = cm(a), R = P.length, C = P[0].length;
    if (n * m !== R * C) throw new Error(`reshape(A, n, m): A tiene ${R * C} elementos y ${n}×${m} son ${n * m}`);
    const col = []; for (let k = 0; k < C; k++) for (let i = 0; i < R; i++) col.push(P[i][k]);
    return withD(fromCm(Array.from({ length: n }, (_, i) => Array.from({ length: m }, (_, k) => col[k * n + i]))), a.d);
  } },
  horzcat: { n: [1, 100], f: (A) => catM(A, true) },
  vertcat: { n: [1, 100], f: (A) => catM(A, false) },
  kron: { n: [2, 2], f: (A) => {
    const a = asMat(A[0]), b = asMat(A[1]), P = cm(a), Q = cm(b), R = Q.length, C = Q[0].length;
    sizeLim(P.length * R, P[0].length * C, 'kron');
    return withD(fromCm(Array.from({ length: P.length * R }, (_, i) => Array.from({ length: P[0].length * C }, (_, k) => cmul(P[Math.floor(i / R)][Math.floor(k / C)], Q[i % R][k % C])))), mulDim(a.d, b.d));
  } },
  any: { n: [1, 1], f: (A) => { const a = A[0], P = isM(a) ? cm(a).flat() : [cpair(a)]; return { v: P.some((z) => z[0] !== 0 || z[1] !== 0) ? 1 : 0, r: false }; } },
  rank: { n: [1, 1], f: (A) => { const M = realMat(A[0], 'rank'), { S } = svdJ(M), tol = svdTol(M, S); return { v: S.filter((x) => x > tol).length, r: false }; } },
  cond: { n: [1, 1], f: (A) => {
    const M = realMat(A[0], 'cond'), { S } = svdJ(M), mx = Math.max(...S), mn = Math.min(...S);
    if (!(mn > svdTol(M, S))) throw new Error('cond(A): la matriz es singular (su número de condición es infinito)');
    return { v: mx / mn, r: false };
  } },
  pinv: { n: [1, 1], f: (A) => {
    const a = A[0], M = realMat(a, 'pinv'), { U, S, V } = svdJ(M), tol = svdTol(M, S);
    const out = V.map((vr) => U.map((ur) => vr.reduce((s, x, k) => s + (S[k] > tol ? (x * ur[k]) / S[k] : 0), 0)));
    return withD(out.length === 1 && out[0].length === 1 ? { v: out[0][0], r: false } : { m: out }, powDim(a.d, -1));
  } },
  linsolve: { n: [2, 2], f: (A) => { // x tal que A·x = b (como A\b): cuadrada, por eliminacion; si no, minimos cuadrados (pinv)
    const a = asMat(A[0]), b = asMat(A[1]);
    if (a.m.length !== b.m.length) throw new Error(`linsolve(A, b): A tiene ${a.m.length} filas y b ${b.m.length}: deben ser las mismas`);
    const d = mulDim(b.d, a.d, -1);
    let X;
    if (a.m.length === a.m[0].length) X = isC(a) || isC(b) ? fromCm(cmulRaw(cinvRaw(cm(a)), cm(b))) : { m: mulRaw(invM(a.m), b.m) };
    else { const p = NF.pinv.f([a]); X = { m: mulRaw(p.m || [[p.v]], realMat(b, 'linsolve')) }; }
    return withD(X.m.length === 1 && X.m[0].length === 1 ? cval([X.m[0][0], X.mi ? X.mi[0][0] : 0]) : X, d);
  } },
  eig: { n: [1, 1], f: (A) => { // valores propios (columna); complejos si los hay
    const a = asMat(A[0]), n = a.m.length;
    if (a.m[0].length !== n) throw new Error(`Solo las matrices cuadradas tienen valores propios (esta es de ${dimsOf(a)})`);
    if (n > 12) throw new Error('eig(A): admite matrices de hasta 12×12');
    const sym = !isC(a) && a.m.every((r, i) => r.every((x, k) => Math.abs(x - a.m[k][i]) <= 1e-12 * Math.max(1, Math.abs(x))));
    const vals = sym ? eigSym(a.m).map((x) => [x, 0]) : polyRoots(charPoly(cm(a))).reverse();
    return withD(fromCm(vals.map((z) => [z])), a.d);
  } },
  diff: { n: [1, 1], f: (A) => { const v = anyVec(A[0], 'diff'); if (v.arr.length < 2) throw new Error('diff(v): el vector necesita al menos 2 elementos'); return cvecOut(v.arr.slice(1).map((z, i) => csub(z, v.arr[i])), v.col, v.d); } },
  cummax: { n: [1, 1], f: (A) => { const v = realVec(A[0], 'cummax'); let m = -Infinity; return vecOut(v.arr.map((x) => (m = Math.max(m, x))), v.col, v.d); } },
  cummin: { n: [1, 1], f: (A) => { const v = realVec(A[0], 'cummin'); let m = Infinity; return vecOut(v.arr.map((x) => (m = Math.min(m, x))), v.col, v.d); } },
  mode: { n: [1, 1], f: (A) => { // el mas repetido; con empate, el menor
    const a = A[0]; if (isC(a)) throw new Error('«mode» no admite números complejos');
    const xs = isM(a) ? a.m.flat() : [a.v], cnt = new Map();
    for (const x of xs) cnt.set(x, (cnt.get(x) || 0) + 1);
    let best = null; for (const [x, c] of cnt) if (best === null || c > cnt.get(best) || (c === cnt.get(best) && x < best)) best = x;
    return withD({ v: best, r: false }, a.d);
  } },
  trapz: { n: [1, 2], f: (A) => { // trapz(y) (paso 1) o trapz(x, y)
    const y = anyVec(A.length === 1 ? A[0] : A[1], 'trapz'), x = A.length === 1 ? null : realVec(A[0], 'trapz');
    if (x && x.arr.length !== y.arr.length) throw new Error(`trapz(x, y): x tiene ${x.arr.length} elementos e y ${y.arr.length}`);
    let s = [0, 0]; for (let i = 1; i < y.arr.length; i++) s = cadd(s, cscale(cadd(y.arr[i], y.arr[i - 1]), (x ? x.arr[i] - x.arr[i - 1] : 1) / 2));
    return cval(s, false, x ? mulDim(x.d, y.d) : y.d);
  } },
  cumtrapz: { n: [1, 2], f: (A) => {
    const y = anyVec(A.length === 1 ? A[0] : A[1], 'cumtrapz'), x = A.length === 1 ? null : realVec(A[0], 'cumtrapz');
    if (x && x.arr.length !== y.arr.length) throw new Error(`cumtrapz(x, y): x tiene ${x.arr.length} elementos e y ${y.arr.length}`);
    let s = [0, 0]; const out = y.arr.map((z, i) => (i ? (s = cadd(s, cscale(cadd(z, y.arr[i - 1]), (x ? x.arr[i] - x.arr[i - 1] : 1) / 2))) : [0, 0]));
    return cvecOut(out, y.col, x ? mulDim(x.d, y.d) : y.d);
  } },
  interp1: { n: [3, 5], opts: 3, f: (A) => { // interpolacion lineal: interp1(xs, ys, x), x un numero o un vector; con "extrap" (como en MATLAB) extrapola fuera de la tabla
    const xs = realVec(A[0], 'interp1'), ys = realVec(A[1], 'interp1'), q = A[2];
    let extrap = false;
    for (const o of A.slice(3)) { const w = typeof o.str === 'string' ? o.str.toLowerCase() : null; if (w === 'extrap') extrap = true; else if (w !== 'linear') throw new Error('interp1(xs, ys, x, "linear", "extrap"): por ahora solo interpolación lineal; "extrap" extrapola fuera de la tabla'); }
    if (xs.arr.length !== ys.arr.length || xs.arr.length < 2) throw new Error('interp1(xs, ys, x): xs e ys deben tener el mismo número de elementos (al menos 2)');
    if (!sameDim(xs.d, q.d) && !zero0(q)) throw new Error(`interp1(xs, ys, x): x debe tener las unidades de xs (${unitMsg(xs.d)})`);
    const idx = xs.arr.map((_, i) => i).sort((i, k) => xs.arr[i] - xs.arr[k]), X = idx.map((i) => xs.arr[i]), Y = idx.map((i) => ys.arr[i]);
    const one = (x) => {
      if (!extrap && (x < X[0] - 1e-12 * Math.abs(X[0]) || x > X[X.length - 1] + 1e-12 * Math.abs(X[X.length - 1]))) throw rt(`interp1: ${x} está fuera de la tabla (de ${X[0]} a ${X[X.length - 1]}); para extrapolar: interp1(xs, ys, x, "extrap")`);
      let k = 1; while (k < X.length - 1 && X[k] < x) k++; // fuera de la tabla, con el primer o el ultimo tramo
      const t = X[k] === X[k - 1] ? 0 : (x - X[k - 1]) / (X[k] - X[k - 1]);
      return Y[k - 1] + t * (Y[k] - Y[k - 1]);
    };
    if (isC(q)) throw new Error('«interp1» no admite números complejos');
    return withD(isM(q) ? { m: q.m.map((r) => r.map(one)) } : { v: one(q.v), r: false }, ys.d);
  } },
  polyval: { n: [2, 2], f: (A) => {
    const p = anyVec(A[0], 'polyval'), x = A[1]; noU(A[0], 'polyval'); noU(x, 'polyval');
    const ev = (z) => p.arr.reduce((acc, q) => cadd(cmul(acc, z), q), [0, 0]);
    return isM(x) ? cmapM(x, ev) : cval(ev(cpair(x)));
  } },
  roots: { n: [1, 1], f: (A) => { const p = anyVec(A[0], 'roots'); noU(A[0], 'roots'); const r = polyRoots(p.arr); if (!r.length) throw new Error('roots(p): el polinomio es constante, no tiene raíces'); return r.length === 1 ? cval(r[0]) : fromCm(r.map((z) => [z])); } },
  polyfit: { n: [3, 3], f: (A) => { // minimos cuadrados: coeficientes del mayor grado al menor
    const x = realVec(A[0], 'polyfit'), y = realVec(A[1], 'polyfit'), n = intArg(A[2], 'polyfit(x, y, n)', 'n', 0, 20);
    noU(A[0], 'polyfit'); noU(A[1], 'polyfit');
    if (x.arr.length !== y.arr.length) throw new Error(`polyfit(x, y, n): x tiene ${x.arr.length} elementos e y ${y.arr.length}`);
    if (x.arr.length < n + 1) throw new Error(`polyfit(x, y, n): para un grado ${n} hacen falta al menos ${n + 1} puntos`);
    const V = x.arr.map((xi) => Array.from({ length: n + 1 }, (_, k) => xi ** (n - k)));
    const p = NF.pinv.f([{ m: V }]), P = p.m || [[p.v]];
    return { m: [P.map((r) => r.reduce((s, q, i) => s + q * y.arr[i], 0))] };
  } },
  conv: { n: [2, 2], f: (A) => { // producto de polinomios (convolucion)
    const p = anyVec(A[0], 'conv'), q = anyVec(A[1], 'conv');
    const out = Array.from({ length: p.arr.length + q.arr.length - 1 }, () => [0, 0]);
    p.arr.forEach((a, i) => q.arr.forEach((b, k) => { out[i + k] = cadd(out[i + k], cmul(a, b)); }));
    return cvecOut(out, p.col && q.col, mulDim(p.d, q.d));
  } },
  polyder: { n: [1, 1], f: (A) => { const p = anyVec(A[0], 'polyder'), n = p.arr.length - 1; if (n < 1) return { m: [[0]] }; return cvecOut(p.arr.slice(0, -1).map((z, i) => cscale(z, n - i)), p.col, p.d); } },
  polyint: { n: [1, 1], f: (A) => { const p = anyVec(A[0], 'polyint'), n = p.arr.length; return cvecOut([...p.arr.map((z, i) => cscale(z, 1 / (n - i))), [0, 0]], p.col, p.d); } },
  dist: { n: [2, 2], f: (A) => { // distancia entre dos puntos (vectores del mismo tamaño)
    const p = realVec(A[0], 'dist'), q = realVec(A[1], 'dist');
    if (p.arr.length !== q.arr.length) throw new Error(`dist(p, q): p tiene ${p.arr.length} coordenadas y q ${q.arr.length}`);
    if (!sameDim(p.d, q.d)) throw new Error(`dist(p, q): p y q deben tener las mismas unidades (${unitMsg(p.d)} y ${unitMsg(q.d)})`);
    return withD({ v: Math.hypot(...p.arr.map((x, i) => x - q.arr[i])), r: false }, p.d);
  } },
};

// ---- Funciones de cadenas (con los nombres de MATLAB) ----
// Un numero como texto, como lo muestra la app: hasta 3 decimales (los muy pequeños con 4 cifras), con la coma decimal del dibujo y su unidad
// (la habitual del sistema de unidades: 210254000 Pa es «210.254 MPa»). n: decimales fijos.
const fmtPlain = (x, n) => localNum(n !== undefined ? x.toFixed(n) : x !== 0 && Math.abs(x) < 1e-3 ? String(Number(x.toPrecision(4))) : Math.abs(x) >= 1000 ? String(Number(x.toFixed(1))) : String(Math.round(x * 1000) / 1000));
function numText(a, n) {
  if (isS(a)) return a.str ?? a.strs.join(' ');
  const one = (re, im, d) => {
    let f = 1, name = '';
    if (d) { const u = autoUnit(Math.hypot(re, im), d); if (u) { f = u.f; name = ' ' + u.name; } }
    const R = fmtPlain(re / f, n), I = fmtPlain(Math.abs(im) / f, n), z = (t) => /^-?0(?:[.,]0*)?$/.test(t);
    const core = !im || z(I) ? R : z(R) ? (im < 0 ? '-' : '') + I + 'j' : R + (im < 0 ? '-' : '+') + I + 'j';
    return (name && /[+-]/.test(core.slice(1)) ? '(' + core + ')' : core) + name;
  };
  if (!isM(a)) return one(a.v, a.im || 0, a.d);
  return '[' + a.m.map((r, i) => r.map((x, k) => one(x, a.mi ? a.mi[i][k] : 0, a.d)).join(elemChar() + ' ')).join(rowChar() === ';' ? '; ' : ' | ') + ']';
}
const strArg = (a, fn, what = 'el texto') => { if (typeof a?.str !== 'string') throw new Error(`${fn}: ${what} debe ser una cadena`); return a.str; };
const strOrVec = (a, fn, f) => { if (a?.strs) return { strs: a.strs.map(f) }; return { str: f(strArg(a, fn)) }; };
const bool = (x) => ({ v: x ? 1 : 0, r: false });
// sprintf(formato, valores…): %d %i %f %e %g %s y %% (con ancho y decimales: %8.3f); los valores se recorren en orden (un vector, elemento por elemento) y el formato se repite si sobran
function sprintfA(A) {
  const fmt = strArg(A[0], 'sprintf(formato, …)', 'el formato');
  const vals = [];
  for (const a of A.slice(1)) {
    if (isS(a)) { vals.push(...(a.strs || [a.str])); continue; }
    if (isC(a)) throw new Error('sprintf: no admite números complejos (usa num2str)');
    if (a.d) throw new Error(`sprintf: un valor tiene unidades (${unitMsg(a.d)}); divide por la unidad que quieres, p. ej. F/1'kN, o usa num2str`);
    vals.push(...(isM(a) ? a.m.flat() : [a.v]));
  }
  const RE = /%([-+0 ]*)(\d+)?(?:\.(\d+))?([difeEgGs%])/g;
  let out = '', k = 0, guard = 0;
  do {
    out += fmt.replace(RE, (m, fl, w, pr, c) => {
      if (c === '%') return '%';
      const v = vals[k++];
      if (v === undefined) return '';
      let t;
      if (c === 's') t = typeof v === 'string' ? v : fmtPlain(v);
      else {
        if (typeof v === 'string') throw new Error(`sprintf: «%${c}» espera un número y recibió la cadena «${v}»`);
        const p = pr !== undefined ? Number(pr) : undefined;
        t = c === 'd' || c === 'i' ? (Number.isInteger(v) ? String(v) : v.toExponential(p ?? 4)) : c === 'f' ? v.toFixed(p ?? 6) : c === 'e' || c === 'E' ? v.toExponential(p ?? 6) : String(Number(v.toPrecision(p || 6)));
        if (c === 'E') t = t.toUpperCase();
        if (fl.includes('+') && v >= 0) t = '+' + t; else if (fl.includes(' ') && v >= 0) t = ' ' + t;
        t = localNum(t);
      }
      const W = Number(w || 0);
      if (t.length < W) t = fl.includes('-') ? t.padEnd(W) : fl.includes('0') && c !== 's' ? t.padStart(W, '0') : t.padStart(W);
      return t;
    });
  } while (k > 0 && k < vals.length && ++guard < 1000);
  return { str: out };
}
const SF = {
  num2str: { n: [1, 2], f: (A) => ({ str: numText(A[0], A[1] !== undefined ? intArg(A[1], 'num2str(x, n)', 'n', 0, 12) : undefined) }) },
  string: { n: [1, 1], f: (A) => (A[0].strs ? A[0] : { str: numText(A[0]) }) },
  str2double: { n: [1, 1], f: (A) => { const t = strArg(A[0], 'str2double(s)').trim().replace(',', '.'), v = Number(t); if (!t || !Number.isFinite(v)) throw rt(`str2double: «${A[0].str}» no es un número`); return { v, r: false }; } },
  str2num: { n: [1, 1], f: (A) => SF.str2double.f(A) },
  sprintf: { n: [1, 50], f: sprintfA },
  strcat: { n: [1, 50], f: (A) => A.reduce((acc, a) => (acc ? strAdd(acc, a, 1) : (isS(a) ? a : (() => { throw strErr('strcat une cadenas'); })())), null) },
  upper: { n: [1, 1], f: (A) => strOrVec(A[0], 'upper(s)', (x) => x.toUpperCase()) },
  lower: { n: [1, 1], f: (A) => strOrVec(A[0], 'lower(s)', (x) => x.toLowerCase()) },
  strtrim: { n: [1, 1], f: (A) => strOrVec(A[0], 'strtrim(s)', (x) => x.trim()) },
  reverse: { n: [1, 1], f: (A) => strOrVec(A[0], 'reverse(s)', (x) => [...x].reverse().join('')) },
  strrep: { n: [3, 3], f: (A) => { const o = strArg(A[1], 'strrep(s, viejo, nuevo)', 'viejo'), nw = strArg(A[2], 'strrep(s, viejo, nuevo)', 'nuevo'); if (!o) throw new Error('strrep: el texto a reemplazar no puede estar vacío'); return strOrVec(A[0], 'strrep(s, viejo, nuevo)', (x) => x.split(o).join(nw)); } },
  strsplit: { n: [1, 2], f: (A) => { const t = strArg(A[0], 'strsplit(s, separador)'), d = A[1] ? strArg(A[1], 'strsplit(s, separador)', 'el separador') : null; return { strs: d ? t.split(d) : t.trim().split(/\s+/) }; } },
  strjoin: { n: [1, 2], f: (A) => { if (!A[0].strs && typeof A[0].str !== 'string') throw new Error('strjoin(v, separador): v es un vector de cadenas'); const d = A[1] ? strArg(A[1], 'strjoin(v, separador)', 'el separador') : ' '; return { str: (A[0].strs || [A[0].str]).join(d) }; } },
  strlength: { n: [1, 1], f: (A) => (A[0].strs ? { m: [A[0].strs.map((x) => [...x].length)] } : { v: [...strArg(A[0], 'strlength(s)')].length, r: false }) },
  contains: { n: [2, 2], f: (A) => bool(strArg(A[0], 'contains(s, patrón)').includes(strArg(A[1], 'contains(s, patrón)', 'el patrón'))) },
  startsWith: { n: [2, 2], f: (A) => bool(strArg(A[0], 'startsWith(s, patrón)').startsWith(strArg(A[1], 'startsWith(s, patrón)', 'el patrón'))) },
  endsWith: { n: [2, 2], f: (A) => bool(strArg(A[0], 'endsWith(s, patrón)').endsWith(strArg(A[1], 'endsWith(s, patrón)', 'el patrón'))) },
  strfind: { n: [2, 2], f: (A) => { // posiciones (desde 1) donde aparece el patron; 0 si no aparece
    const t = strArg(A[0], 'strfind(s, patrón)'), q = strArg(A[1], 'strfind(s, patrón)', 'el patrón'), out = [];
    if (q) for (let i = t.indexOf(q); i >= 0; i = t.indexOf(q, i + 1)) out.push(i + 1);
    return !out.length ? { v: 0, r: false } : out.length === 1 ? { v: out[0], r: false } : { m: [out] };
  } },
  strcmp: { n: [2, 2], f: (A) => cmpStr(A, (x) => x) },
  strcmpi: { n: [2, 2], f: (A) => cmpStr(A, (x) => x.toLowerCase()) },
  extractBefore: { n: [2, 2], f: (A) => ({ str: cut(A, 'extractBefore(s, patrón)', true) }) },
  extractAfter: { n: [2, 2], f: (A) => ({ str: cut(A, 'extractAfter(s, patrón)', false) }) },
  extractBetween: { n: [3, 3], f: (A) => { const t = strArg(A[0], 'extractBetween(s, inicio, fin)'), a = strArg(A[1], 'extractBetween(s, inicio, fin)', 'inicio'), b = strArg(A[2], 'extractBetween(s, inicio, fin)', 'fin'), i = t.indexOf(a); if (i < 0) throw rt(`extractBetween: «${a}» no aparece`); const j = t.indexOf(b, i + a.length); if (j < 0) throw rt(`extractBetween: «${b}» no aparece después de «${a}»`); return { str: t.slice(i + a.length, j) }; } },
};
function cmpStr(A, norm) { // strcmp(a, b): 1 si son iguales (0 si alguna no es cadena); con un vector, elemento por elemento
  const [a, b] = A, eq = (x, y) => (typeof x === 'string' && typeof y === 'string' && norm(x) === norm(y) ? 1 : 0);
  if (a.strs || b.strs) { const L = a.strs || b.strs.map(() => a.str), R = b.strs || a.strs.map(() => b.str); if (L.length !== R.length) throw new Error('strcmp: los vectores de cadenas deben tener el mismo tamaño'); return { m: [L.map((x, i) => eq(x, R[i]))] }; }
  return bool(eq(a.str, b.str));
}
function cut(A, fn, before) { // extractBefore / extractAfter con un patron (cadena) o una posicion (numero)
  const t = strArg(A[0], fn), q = A[1];
  if (isS(q)) { const i = t.indexOf(q.str); if (i < 0) throw rt(`${fn.split('(')[0]}: «${q.str}» no aparece`); return before ? t.slice(0, i) : t.slice(i + q.str.length); }
  const k = intArg(q, fn, 'la posición', 1, [...t].length);
  return before ? [...t].slice(0, k - 1).join('') : [...t].slice(k).join('');
}
const SFL = Object.fromEntries(Object.keys(SF).map((k) => [k.toLowerCase(), k])); // los nombres se escriben sin importar mayusculas (startsWith, startswith)

// Todos los nombres de funciones y constantes del evaluador (la referencia de la ayuda debe nombrarlos todos: test/funcref.test.mjs).
export const FUNC_NAMES = [...Object.keys(FUNCS), ...Object.keys(MULTI), ...MATFN, ...LAZY, ...Object.keys(NF), ...Object.keys(SF), ...Object.keys(CONSTS)];
addCalcFns([...Object.keys(FUNCS), ...Object.keys(MULTI), ...MATFN, ...LAZY, ...Object.keys(NF), ...Object.keys(SF), 'solve']); // se dibujan como funcion (ver asciimath.js)
// horzcat(A, B, …) y vertcat(A, B, …): como [A, B] y [A; B]
function catM(A, horiz) {
  const Ms = A.map(asMat), d0 = Ms.find((a) => !zero0(a) && a.d)?.d;
  for (const a of Ms) if (!sameDim(a.d, d0) && !(a.m.every((r) => r.every((x) => x === 0)) && !a.d)) throw new Error(`${horiz ? 'horzcat' : 'vertcat'}: los bloques deben tener las mismas unidades`);
  const Ps = Ms.map(cm);
  if (horiz) {
    const h = Ps[0].length; if (Ps.some((P) => P.length !== h)) throw new Error('horzcat: los bloques deben tener el mismo número de filas');
    return withD(fromCm(Array.from({ length: h }, (_, i) => Ps.flatMap((P) => P[i]))), d0);
  }
  const w = Ps[0][0].length; if (Ps.some((P) => P[0].length !== w)) throw new Error('vertcat: los bloques deben tener el mismo número de columnas');
  return withD(fromCm(Ps.flat()), d0);
}

// Ángulos del dibujo (opción «Ángulos en: grados / radianes» del documento, doc.angles): los textos de cálculo y las gráficas
// evalúan con este valor por defecto; las cotas y los actuadores lo fijan explícito (siempre en grados).
let DEF_RAD = false;
// Tolerancia de «≈» (opción del dibujo doc.approxTol, en Configuración): a ≈ b si |a − b| ≤ tol·máx(1, |a|, |b|)
export const APPROX_TOL = 1e-12;
let TOL = APPROX_TOL;
export const approxTol = () => TOL;
export const setAngleMode = (doc) => { DEF_RAD = doc?.angles === 'rad'; TOL = Number(doc?.approxTol) > 0 ? Number(doc.approxTol) : APPROX_TOL; setSci(doc?.sciAt); setDecimal(doc?.decimal); setUnitSystem(doc?.units); docUnitsHook(doc); }; // el indicador decimal del dibujo va con la opcion de angulos: se activan juntos
export const angleRad = () => DEF_RAD;

// Dibujos anteriores (sin indicador decimal) leen «0,0» como un decimal: «f(0.7,0,0)» daba error. Si la lectura de siempre falla y la expresion
// tiene comas, se reintenta con punto decimal (la coma separa); lo que ya funcionaba no cambia.
export function evalExpr(src, opts = {}) {
  if (evalDepth === 0) { loopN = 0; loopT0 = 0; }
  evalDepth++;
  try { return evalExpr0(src, opts); } finally { evalDepth--; }
}
function evalExpr0(src, opts) {
  try { return evalExpr1(src, opts); } catch (e) {
    if (decimalMode() !== null || typeof src !== 'string' || !src.includes(',')) throw e;
    setDecimal('.');
    try { return evalExpr1(src, opts); } catch (e2) { throw e; } finally { setDecimal(null); }
  }
}
// Programas en las formulas (como en SMath): line(a, b, …, r) hace todo en orden y vale lo ultimo; for(i, a..b, cuerpo) y
// while(condicion, cuerpo) repiten. Dentro, «s:valor» asigna una variable LOCAL: vale solo en esa formula (no crea variables del
// documento ni cambia el orden de lectura). withLocals copia las variables (para no tocar las de afuera) y da un lugar a cada nombre que se
// asigna o que es la variable de un for, para poder leer la formula antes de que tenga valor.
const PROG_RE = /(?:^|[^A-Za-z0-9_])(?:line|for|while)\s*\(/i;
const ASG_RE = /(?<![A-Za-z0-9α-ωΑ-Ωϑϕϖɛ_'.])([A-Za-zα-ωΑ-Ωϑϕϖɛ_][A-Za-z0-9α-ωΑ-Ωϑϕϖɛ_]*'*)\s*:(?!=)/g;
const FOR_RE = /(?:^|[^A-Za-z0-9_])for\s*\(\s*([A-Za-zα-ωΑ-Ωϑϕϖɛ_][A-Za-z0-9α-ωΑ-Ωϑϕϖɛ_]*'*)\s*[,;]/g;
function withLocals(s, vars) {
  if (!PROG_RE.test(s)) return vars;
  const out = { ...(vars || {}) }, names = new Set();
  for (const re of [ASG_RE, FOR_RE]) for (const m of s.matchAll(re)) names.add(normName(m[1]));
  const has = (n) => Object.prototype.hasOwnProperty.call(out, n) || names.has(n);
  for (const n of names) {
    const ip = indexParts(n);
    if (ip && ip.base !== n && has(ip.base) && !Object.prototype.hasOwnProperty.call(out, n)) continue; // «v_1:…»: un elemento de v, no una variable nueva (stmt avisa)
    if (!Object.prototype.hasOwnProperty.call(out, n)) out[n] = { v: NaN, r: false, loc: true, unset: true };
    else if (!out[n]?.fn && !out[n]?.loc) out[n] = { ...out[n], loc: true }; // ya existe afuera (b:-0.113) y el programa lo asigna (b:[…]): b_k es un indice aunque afuera b sea un numero; conserva su valor por si se lee antes
  }
  return out;
}
// Tope de los ciclos: un while que no termina congelaria la app (todo se recalcula al arrastrar, al escribir, en cada paso de una
// simulacion). Se cuentan las vueltas de toda una evaluacion (tambien las de las funciones que llama) y el tiempo.
export const LOOP_MAX = 100000, LOOP_MS = 1500;
let loopN = 0, loopT0 = 0, evalDepth = 0;
function loopTick() {
  if (++loopN > LOOP_MAX) throw new Error(`El ciclo pasó de ${LOOP_MAX.toLocaleString('es')} vueltas: revisa la condición del while o el rango del for`);
  if (!loopT0) loopT0 = Date.now();
  else if ((loopN & 255) === 0 && Date.now() - loopT0 > LOOP_MS) throw new Error(`El ciclo tardó más de ${LOOP_MS / 1000} s: revisa la condición del while o el rango del for`);
}
// La incognita de fzero(…; x; …) puede no existir todavia: se le da un lugar para poder leer la formula (no tiene valor; lo pone fzero).
function withUnknowns(s, vars) {
  if (!/fzero|integral/i.test(s)) return vars;
  let out = vars;
  const lt = tokenize(s, vars, true);
  for (let i = 0; i < lt.length; i++) {
    if (!(lt[i].t === 'id' && (lt[i].v === 'fzero' || lt[i].v === 'integral') && lt[i + 1]?.t === 'op' && lt[i + 1].v === '(')) continue; // la incognita de fzero o la variable de integral
    let d = 0, j = i + 2;
    for (; j < lt.length; j++) { const t = lt[j]; if (t.t === 'op' && (t.v === '(' || t.v === '[')) d++; else if (t.t === 'op' && (t.v === ')' || t.v === ']')) { if (d === 0) break; d--; } else if (t.t === 'sep' && d === 0) break; }
    const x = lt[j]?.t === 'sep' ? lt[j + 1] : null;
    // una funcion definida antes con el mismo nombre (F(x) y luego fzero(…; F; …)) tambien queda tapada: dentro de fzero, F es la incognita
    if ((x?.t === 'var' || x?.t === 'ufn') && !(vars && Object.prototype.hasOwnProperty.call(vars, x.v) && !vars[x.v]?.fn)) { out = { ...(out || {}) }; out[x.v] = { v: NaN, r: false, unk: true }; }
  }
  return out;
}
function evalExpr1(src, { radians = DEF_RAD, vars = null, allowMat = false, allowCplx = false, depth = 0, globals = null } = {}) {
  const S = String(src ?? '');
  vars = withLocals(S, withUnknowns(S, vars));
  const toks = tokenize(S, vars);
  if (!toks.length) throw new Error('Escribe un valor');
  let p = 0;
  const peek = () => toks[p];
  const isOp = (v) => peek()?.t === 'op' && peek().v === v;
  const startsFactor = () => { const k = peek(); return k && (k.t === 'num' || k.t === 'id' || k.t === 'var' || k.t === 'ufn' || k.t === 'idx' || k.t === 'unit' || k.t === 'sqrt' || (k.t === 'op' && (k.v === '(' || k.v === '['))); };
  const bin = (a, b, v) => ({ v, r: a.r || b.r });
  // Unidades: d es la dimension de un escalar (sin d, un numero sin unidades). Sumar pide la misma; multiplicar y dividir las combinan.
  // Un vector o una matriz lleva una sola dimension para todos sus elementos (d); wd la pone en un resultado.
  const wd = (x, d) => { if (d) x.d = d; else delete x.d; return x; };
  // Funciones de un argumento con unidades (escalar o elemento a elemento): la raiz las parte a la mitad, abs y el redondeo las conservan,
  // signo no las lleva; el resto pide un numero sin unidades.
  const fnDim = (name, a) => {
    if (!a.d) return undefined;
    if (name === 'sqrt' || name === 'raiz') return powDim(a.d, 0.5);
    if (KEEP_U.has(name)) return a.d;
    if (name === 'sign' || name === 'signo') return undefined;
    throw new Error(`«${name}» necesita un número sin unidades (recibió ${unitMsg(a.d)})`);
  };
  // Funciones de varios argumentos con unidades: los valores deben tener la misma dimension; el resultado la conserva (atan2 da un angulo).
  const multiDim = (name, A) => {
    if (!A.some((x) => x.d)) return undefined;
    if (name === 'round' || name === 'redondear') { if (A[1]?.d) throw new Error('round(x; n): n es un número sin unidades'); return A[0].d; }
    if (name === 'nthroot') { if (A[1].d) throw new Error('nthroot(x, n): n es un número sin unidades'); return powDim(A[0].d, 1 / A[1].v); } // nthroot(27'm^3, 3) = 3 m
    if (name === 'gcd' || name === 'lcm' || name === 'nchoosek') throw new Error(`«${name}» necesita números enteros sin unidades`);
    if (A.some((x) => !sameDim(x.d, A[0].d))) throw new Error(`«${name}» necesita valores con las mismas unidades (recibió ${A.map((x) => unitMsg(x.d)).join(', ')})`);
    return name === 'atan2' ? undefined : A[0].d;
  };
  // Funciones de vectores y matrices con unidades: la dimension del resultado.
  const matDim = (name, A) => {
    const [a, b] = A;
    if (!a?.d && !b?.d) return undefined;
    switch (name) {
      case 'inv': return powDim(a.d, -1);
      case 'det': return powDim(a.d, isM(a) ? a.m.length : 1);
      case 'prod': return powDim(a.d, isM(a) ? a.m.flat().length : 1);
      case 'variance': return powDim(a.d, 2);
      case 'len': case 'rows': case 'cols': return undefined;
      case 'dot': case 'cross': return mulDim(a?.d, b?.d);
      case 'eye': throw new Error('eye(n): n es un número sin unidades');
      case 'cumprod': throw new Error('«cumprod» todavía no funciona con unidades');
      default: return a.d; // sum, mean, median, std, norm, trace, diag, cumsum
    }
  };
  const addU = (a, b, s) => { if (!sameDim(a.d, b.d)) { if (zero0(b)) return a.d; if (zero0(a)) return b.d; throw new Error(`No se puede ${s > 0 ? 'sumar' : 'restar'} ${unitMsg(a.d)} y ${unitMsg(b.d)}`); } return a.d || b.d; };
  // 0 (sin unidades) por cualquier cosa es el 0 que vale con cualquier unidad: «P*0» o el 0 de una rama de if() no se vuelve «0 N» y se
  // puede sumar a un momento. Salvo con una unidad escrita (asUnit): «0'mm» y «0*'m» siguen siendo 0 mm y 0 m.
  const mulU = (a, b, s, v, asUnit = false) => (!asUnit && (zero0(a) || (s > 0 && zero0(b))) ? { v: 0, r: false } : { v, r: a.r || b.r, d: mulDim(a.d, b.d, s) });

  // comparacion (la de menor precedencia): da 1 si se cumple y 0 si no. «==» y «!=» toleran el error de redondeo.
  const ASG_MSG = () => `«:» asigna un valor solo dentro de line(), for() o while(), p. ej. line(s:0${argText()} s:s+1${argText()} s)`;
  // un enunciado de un programa: «nombre:valor» (asigna la variable local y vale ese valor) o una expresion
  function stmt() {
    const k = peek(), n = toks[p + 1];
    if (n?.t === 'asg') {
      if (k.t === 'idx') { p += 2; return assignElem(k, cmp()); } // p_i:valor, A_(i,j):valor (sobre una copia local)
      if (k.t !== 'var' && k.t !== 'ufn') throw new Error(ASG_MSG());
      if (vars[k.v]?.fn && !vars[k.v].loc) throw new Error(`«${k.v}» es una función: dentro de un programa no se le puede asignar un valor`);
      p += 2;
      const a = cmp();
      vars[k.v] = isS(a) ? { ...a, loc: true } : isM(a) ? wd({ mat: a.m, ...(a.mi ? { mi: a.mi } : {}), loc: true }, a.d) : { v: a.v, ...(a.im ? { im: a.im } : {}), r: !!a.r, d: a.d, loc: true };
      return a;
    }
    return cmp();
  }
  // Asignar a un elemento dentro de un programa: «p_i:p_i + 1», «A_(i,j):0», «s_2:"x"». Se trabaja sobre una copia local (la variable
  // del documento no cambia fuera del programa). Como en MATLAB, un indice mas alla del final agranda el vector (o la matriz) con ceros.
  // El valor tiene la magnitud del vector; un vector de ceros sin unidades toma la del primer valor que recibe. Vale el valor asignado.
  function assignElem(k, a) {
    const x = vars[k.base], name = `${k.base}_(${k.src})`;
    if (!x || (!x.vec && !x.mat && !x.strs)) throw new Error(x?.unset ? `«${k.base}» se usa antes de darle un valor` : `«${k.base}» no es un vector ni una matriz: no se le asigna un elemento`);
    const ix = splitIdx(k.src).map((s0) => {
      if (!s0 || s0 === ':') throw new Error(`Para asignar, «${name}» lleva índices enteros (no «:»)`);
      const v = evalExpr(s0, { vars, depth: depth + 1, globals }).value;
      if (!Number.isInteger(Math.round(v * 1e9) / 1e9) || Math.round(v) < 1) throw new Error(`El índice «${s0}» de «${k.base}» debe ser un entero desde 1 (vale ${Math.round(v * 1e6) / 1e6})`);
      return Math.round(v);
    });
    if (ix.length > 2) throw new Error('Un elemento lleva un índice (vector) o dos (matriz): A_(fila,columna)');
    const grow = (n) => { if (n > LOOP_MAX) throw new Error(`«${name}»: el vector no puede pasar de ${LOOP_MAX.toLocaleString('es')} elementos`); };
    if (x.strs) { // vector de cadenas
      if (ix.length !== 1) throw new Error(`«${k.base}» es un vector de cadenas: lleva un índice`);
      if (!isS(a) || a.strs) throw new Error(`«${k.base}» es un vector de cadenas: a «${name}» se le asigna una cadena`);
      grow(ix[0]); const L = [...x.strs]; while (L.length < ix[0]) L.push(''); L[ix[0] - 1] = a.str;
      vars[k.base] = { strs: L, loc: true };
      return a;
    }
    if (isS(a)) throw new Error(`«${k.base}» es de números: a «${name}» no se le asigna una cadena`);
    if (isM(a)) throw new Error(`A «${name}» se le asigna un número, no un vector ni una matriz`);
    const m = (x.mat || [x.vec]).map((r) => [...r]), mi = x.mi ? x.mi.map((r) => [...r]) : null;
    let R = m.length, C = m[0].length;
    if (ix.length === 1 && R > 1 && C > 1) throw new Error(`«${k.base}» es una matriz de ${R}×${C}: lleva dos índices, ${k.base}_(fila,columna)`);
    const [i, j] = ix.length === 2 ? ix : R === 1 ? [1, ix[0]] : [ix[0], 1];
    let d = x.d;
    if (!sameDim(d, a.d) && !zero0(a)) {
      if (!d && m.every((r) => r.every((v) => v === 0))) d = a.d; // vector de ceros sin unidades: toma la del valor
      else throw new Error(`«${name}» lleva ${unitMsg(d)}: no se le asigna ${unitMsg(a.d)}`);
    }
    grow(i * j);
    while (m.length < i) { m.push(new Array(C).fill(0)); if (mi) mi.push(new Array(C).fill(0)); }
    R = m.length;
    if (j > C) { for (const r of m) while (r.length < j) r.push(0); if (mi) for (const r of mi) while (r.length < j) r.push(0); C = j; }
    m[i - 1][j - 1] = a.v;
    let mi2 = mi;
    if (a.im) { mi2 ||= m.map((r) => r.map(() => 0)); mi2[i - 1][j - 1] = a.im; } else if (mi2) mi2[i - 1][j - 1] = 0;
    const cplx = mi2 && mi2.some((r) => r.some((v) => v)) ? { mi: mi2 } : {};
    vars[k.base] = R === 1 && !x.mat ? { vec: m[0], ...cplx, r: false, d, loc: true } : { mat: m, ...cplx, d, loc: true };
    return a;
  }
  const progSep = (msg) => { if (peek()?.t !== 'sep') throw new Error(msg()); p++; };
  const closeP = (msg) => { if (!isOp(')')) throw new Error(peek()?.t === 'sep' ? msg() : 'Falta cerrar un paréntesis'); p++; };
  const LINE_MSG = () => `line(a${argText()} b${argText()} …) lleva los pasos separados por «${argText()}»; vale el último`;
  const FOR_MSG = () => `for(i${argText()} inicio..fin${argText()} cuerpo) o for(i${argText()} vector${argText()} cuerpo): la variable, lo que recorre y lo que repite`;
  const WHILE_MSG = () => `while(condición${argText()} cuerpo): repite el cuerpo mientras la condición se cumpla`;
  function lazyLine() { // ya se leyo «line(»
    if (isOp(')')) throw new Error(LINE_MSG());
    let last;
    for (;;) { last = stmt(); if (peek()?.t === 'sep') { p++; continue; } break; }
    closeP(LINE_MSG);
    return last;
  }
  function lazyFor() { // ya se leyo «for(»
    const xt = peek();
    if (xt?.t !== 'var' || toks[p + 1]?.t !== 'sep') throw new Error(FOR_MSG());
    p += 2;
    const a = cmp();
    let seq;
    if (isS(a)) { if (isOp('..')) throw new Error('El rango de for va entre números, no entre cadenas'); seq = a.strs ? a.strs.map((x) => ({ str: x })) : [a]; } // recorre las cadenas de un vector
    else if (isOp('..')) {
      p++;
      const b = cmp();
      if (isM(a) || isM(b) || isC(a) || isC(b)) throw new Error(`El rango de for va entre dos números reales: for(i${argText()} 1..n${argText()} …)`);
      if (!sameDim(a.d, b.d) && !zero0(a) && !zero0(b)) throw new Error(`El rango de for va de ${unitMsg(a.d)} a ${unitMsg(b.d)}: deben tener las mismas unidades`);
      const d = a.d || b.d, n = Math.floor(b.v - a.v + 1e-9) + 1;
      if (n > LOOP_MAX) throw new Error(`El rango de for tiene ${n} valores: el tope es ${LOOP_MAX.toLocaleString('es')}`);
      seq = Array.from({ length: Math.max(0, n) }, (_, q) => ({ v: a.v + q, r: !!a.r, d }));
    } else if (isM(a)) seq = a.m.flat().map((v, q) => ({ v, r: false, d: a.d, ...(a.mi && a.mi.flat()[q] ? { im: a.mi.flat()[q] } : {}) })); // recorre los elementos de un vector (o de una matriz, fila por fila)
    else seq = [a];
    progSep(FOR_MSG);
    const p0 = p;
    let last = { v: 0, r: false };
    for (const x of seq) { loopTick(); vars[xt.v] = { ...x, loc: true }; p = p0; last = stmt(); }
    if (!seq.length) { p = p0; skipArg(); }
    closeP(FOR_MSG);
    return last;
  }
  function lazyWhile() { // ya se leyo «while(»
    const p0 = p;
    let last = { v: 0, r: false };
    for (;;) {
      p = p0;
      const c = cmp();
      if (isM(c)) throw new Error('La condición de while es un número, no un vector ni una matriz');
      if (isC(c)) throw new Error('La condición de while no puede ser un número complejo: usa abs(…), real(…) o imag(…)');
      if (isS(c)) throw new Error('La condición de while no puede ser una cadena');
      progSep(WHILE_MSG);
      if (c.v === 0) { skipArg(); break; }
      loopTick();
      last = stmt();
    }
    closeP(WHILE_MSG);
    return last;
  }
  function cmp() {
    const a = expr(), k = peek();
    if (k?.t === 'asg') throw new Error(ASG_MSG());
    if (!k || k.t !== 'cmp') return a;
    p++;
    const b = expr();
    if (isS(a) || isS(b)) { // cadenas: solo == y != entre dos cadenas
      if (!isS(a) || !isS(b)) throw new Error('Una cadena solo se compara con otra cadena (para un número, num2str(…))');
      if (k.v !== '==' && k.v !== '!=') throw new Error(`Las cadenas se comparan con == y !=, no con «${k.v}»`);
      if (a.strs || b.strs) throw new Error('Para comparar vectores de cadenas usa strcmp(…)');
      return { v: (a.str === b.str) === (k.v === '==') ? 1 : 0, r: false };
    }
    if (isM(a) || isM(b)) throw new Error('No se pueden comparar vectores o matrices');
    if (isC(a) || isC(b)) { // con complejos solo == y != (no hay orden): para comparar tamaños, abs() o real()
      if (k.v !== '==' && k.v !== '!=' && k.v !== '≈') throw new Error(`No se pueden comparar números complejos con «${k.v}»: usa abs(…) o real(…)`);
      if (!sameDim(a.d, b.d) && !zero0(a) && !zero0(b)) throw new Error(`No se puede comparar ${unitMsg(a.d)} con ${unitMsg(b.d)}`);
      const x = cpair(a), y = cpair(b), eq = k.v === '≈' ? cabs(csub(x, y)) <= TOL * Math.max(1, cabs(x), cabs(y)) : cabs(csub(x, y)) <= 1e-9 * Math.max(a.d ? 0 : 1, cabs(x), cabs(y));
      return { v: (k.v !== '!=') === eq ? 1 : 0, r: false };
    }
    if (!sameDim(a.d, b.d) && !zero0(a) && !zero0(b)) throw new Error(`No se puede comparar ${unitMsg(a.d)} con ${unitMsg(b.d)}`);
    const x = a.v, y = b.v, eq = Math.abs(x - y) <= 1e-9 * Math.max(a.d ? 0 : 1, Math.abs(x), Math.abs(y)); // con unidades, la tolerancia es relativa (3'pF no es 0)
    const ok = { '<': x < y && !eq, '>': x > y && !eq, '<=': x < y || eq, '>=': x > y || eq, '==': eq, '!=': !eq, '≈': Math.abs(x - y) <= TOL * Math.max(1, Math.abs(x), Math.abs(y)) }[k.v];
    return { v: ok ? 1 : 0, r: false };
  }
  // if(condicion; si_verdadero; si_falso) (o si): solo se evalua la rama elegida (la otra se salta sin evaluarla; asi una funcion de usuario puede llamarse a si misma)
  const SI_MSG = () => (dotArgs() ? 'if(condición, si_verdadero, si_falso) lleva 3 valores separados por «,»' : 'if(condición; si_verdadero; si_falso) lleva 3 valores separados por «;»');
  function skipArg() { // avanza hasta el final del argumento actual (una «;» o un «)» fuera de parentesis y corchetes)
    let d = 0;
    for (; p < toks.length; p++) {
      const t = toks[p];
      if (t.t === 'op' && (t.v === '(' || t.v === '[')) d++;
      else if (t.t === 'op' && (t.v === ')' || t.v === ']')) { if (d === 0) return; d--; } else if (t.t === 'sep' && d === 0) return;
    }
  }
  function lazyIf(name) { // ya se leyo «if(» (o «si(»)
    if (isOp(')')) throw new Error(`«${name}» necesita al menos un valor`);
    const c = cmp();
    if (isM(c)) throw new Error('La condición de if() es un número, no un vector ni una matriz');
    if (isC(c)) throw new Error('La condición de if() no puede ser un número complejo: usa abs(…), real(…) o imag(…)');
    if (isS(c)) throw new Error('La condición de if() no puede ser una cadena: compárala, p. ej. s == "sí"');
    const sep = () => { if (peek()?.t !== 'sep') throw new Error(SI_MSG()); p++; };
    const yes = c.v !== 0;
    let pick;
    sep();
    if (yes) { pick = stmt(); sep(); skipArg(); } else { skipArg(); sep(); pick = stmt(); }
    if (!isOp(')')) throw new Error(peek()?.t === 'sep' ? SI_MSG() : 'Falta cerrar un paréntesis');
    p++;
    return pick;
  }
  // fzero(ecuacion; x) o fzero(ecuacion; x; inicial): el valor de x que cumple la ecuacion («a == b», o una expresion que vale 0).
  // Sin valor inicial usa el de x en ese punto (si x es una variable) o 1. La x de la ecuacion es la incognita, no la variable de afuera.
  const FZ_MSG = () => `fzero(ecuación${argText()} x${argText()} inicial): la ecuación, el nombre de la incógnita y (si quieres) su valor inicial`;
  function lazyFzero() { // ya se leyo «fzero(»
    const a0 = p; skipArg(); const a1 = p;
    if (a1 === a0 || peek()?.t !== 'sep') throw new Error(FZ_MSG());
    p++;
    const xt = peek();
    if (xt?.t !== 'var' || (toks[p + 1] && !(toks[p + 1].t === 'sep' || (toks[p + 1].t === 'op' && toks[p + 1].v === ')')))) throw new Error(FZ_MSG());
    p++;
    let g = null;
    if (peek()?.t === 'sep') { p++; g = cmp(); }
    if (!isOp(')')) throw new Error(FZ_MSG());
    p++;
    const name = xt.v, here = vars?.[name];
    if (!g) g = here && !here.unk && !here.fn && Number.isFinite(here.v) ? { v: here.v, r: !!here.r, d: here.d } : { v: 1, r: false };
    if (isM(g)) throw new Error('fzero busca un número: el valor inicial no puede ser un vector');
    const calc = (s, vv) => { const r = evalExpr(s, { radians, vars: vv, depth: depth + 1, globals: globals || vars }); if (r.mat) throw new Error('la ecuación da un vector: fzero resuelve una ecuación de una incógnita'); if (r.im) throw new Error('la ecuación da un número complejo: fzero resuelve ecuaciones reales'); if (r.str !== undefined || r.strs) throw new Error('la ecuación da una cadena'); return r; };
    try {
      const [x] = solveEqs([{ name, v: g.v, r: g.r, d: g.d }], [S.slice(toks[a0].i, toks[a1 - 1].j)], calc, vars || {});
      return wd({ v: x, r: g.r }, g.d);
    } catch (e) { throw new Error(`fzero: ${e.message}`); }
  }
  // Funciones con numeros complejos: con un argumento complejo, o con uno real fuera del dominio real (√(-4) = 2j). null: va por el camino real.
  function cplxCall(name, A) {
    const anyC = A.some(isC);
    if (!anyC) { // ¿un real fuera de su dominio? (solo las de DOM_C, con un argumento)
      if (!DOM_C.has(name) || A.length !== 1) return null;
      const a = A[0], xs = isM(a) ? a.m.flat() : [a.v];
      if (!xs.some((x) => Number.isFinite(x) && Number.isNaN(FUNCS[name](x, a.r || radians, radians)))) return null;
    }
    if (MATFN.has(name)) { const d = matDim(name, A); return wd(cmatFn(name, A), d); }
    if (name in MULTI) throw new Error(`«${name}» no admite números complejos (usa abs(…), real(…) o imag(…))`);
    if (A.length !== 1) throw new Error(`«${name}» recibe un solo valor`);
    const a = A[0], d = name === 'angle' ? undefined : fnDim(name, a);
    const one = (z) => {
      switch (name) {
        case 'abs': return [cabs(z), 0];
        case 'real': return [z[0], 0];
        case 'imag': return [z[1], 0];
        case 'conj': return [z[0], -z[1]];
        case 'angle': return [radians ? carg(z) : carg(z) * TAU_DEG, 0];
        default: if (!CF[name]) throw new Error(`«${name}» no admite números complejos`); return CF[name](z, radians);
      }
    };
    if (isM(a)) return wd(cmapM(a, one), d);
    return cval(one(cpair(a)), name === 'angle' ? false : a.r, d);
  }
  // integral(expr; x; a; b): la integral de expr (con la variable x) entre a y b, numerica (Gauss-Kronrod adaptativa). Como fzero, la x de la
  // expresion es la variable de integracion, no la de afuera. Con unidades: las de expr por las de x.
  const INT_MSG = () => `integral(expresión${argText()} x${argText()} a${argText()} b): la expresión, el nombre de la variable y los límites`;
  function lazyIntegral() { // ya se leyo «integral(»
    const a0 = p; skipArg(); const a1 = p;
    if (a1 === a0 || peek()?.t !== 'sep') throw new Error(INT_MSG());
    p++;
    const xt = peek();
    if (xt?.t !== 'var' && xt?.t !== 'ufn') throw new Error(INT_MSG());
    p++;
    if (peek()?.t !== 'sep') throw new Error(INT_MSG());
    p++;
    const lo = cmp();
    if (peek()?.t !== 'sep') throw new Error(INT_MSG());
    p++;
    const hi = cmp();
    if (!isOp(')')) throw new Error(INT_MSG());
    p++;
    if (isM(lo) || isM(hi) || isC(lo) || isC(hi)) throw new Error('integral: los límites son números reales');
    if (!sameDim(lo.d, hi.d) && !zero0(lo) && !zero0(hi)) throw new Error(`integral: los límites deben tener las mismas unidades (${unitMsg(lo.d)} y ${unitMsg(hi.d)})`);
    const xd = lo.d || hi.d, src = S.slice(toks[a0].i, toks[a1 - 1].j), name = xt.v;
    let fd, nev = 0;
    const f = (x) => {
      if (++nev > 20000) throw new Error('integral: la función necesita demasiadas evaluaciones (¿tiene una singularidad en el intervalo?)');
      const r = evalExpr(src, { radians, vars: { ...(vars || {}), [name]: { v: x, r: false, d: xd } }, depth: depth + 1, globals: globals || vars });
      if (r.mat) throw new Error('integral: la expresión da un vector; integra un número');
      if (r.im) throw new Error('integral: la expresión da un número complejo; integra real(…) e imag(…) por separado');
      if (r.str !== undefined || r.strs) throw new Error('integral: la expresión da una cadena');
      if (fd === undefined) fd = r.dim || null;
      return r.value;
    };
    const v = integrate(f, lo.v, hi.v);
    if (!Number.isFinite(v)) throw rt('integral: no converge (¿una singularidad en el intervalo?)');
    return wd({ v, r: false }, mulDim(fd || undefined, xd));
  }
  function call(name, A) {
    const sep = decimalMode() === '.' ? ' (sepáralos con «,»)' : decimalMode() === ',' ? ' (sepáralos con «;»)' : ' (sepáralos con «;»: «2,5» es un solo número)';
    if (name in SF) { // funciones de cadenas
      const [lo, hi] = SF[name].n;
      if (A.length < lo || A.length > hi) throw new Error(`«${name}» recibe ${hi === lo ? `${lo} ${lo === 1 ? 'valor' : 'valores'}` : `de ${lo} a ${hi} valores`}${sep}`);
      return SF[name].f(A, { radians });
    }
    if (A.some((a, k) => isS(a) && !(NF[name]?.opts !== undefined && k >= NF[name].opts))) throw new Error(`«${name}» no recibe cadenas`); // opts: desde que argumento acepta opciones de texto («"extrap"»)
    if (name in NF) { // funciones de MATLAB (tanda 1)
      const [lo, hi] = NF[name].n;
      if (A.length < lo || A.length > hi) throw new Error(`«${name}» recibe ${hi === lo ? `${lo} ${lo === 1 ? 'valor' : 'valores'}` : `de ${lo} a ${hi} valores`}${sep}`);
      return NF[name].f(A, { radians });
    }
    const cr = cplxCall(name, A);
    if (cr) return cr;
    if (MATFN.has(name)) { const d = matDim(name, A); return wd({ ...matFn(name, A) }, d); }
    if ((name === 'min' || name === 'max') && A.length === 1) { // min(x), max(x): el menor o el mayor de todos los elementos
      if (!isM(A[0])) throw new Error(dotArgs() ? `«${name}» recibe dos valores (${name}(a, b)) o un vector` : `«${name}» recibe dos valores (${name}(a; b)) o un vector`);
      return wd({ v: Math[name](...A[0].m.flat()), r: false }, A[0].d);
    }
    if (A.some((a) => isM(a))) { // funciones sobre vectores y matrices: a cada elemento (los escalares se extienden)
      if (name in FUNCS) {
        if (A.length !== 1) throw new Error(`«${name}» recibe un solo valor`);
        const d = fnDim(name, A[0]), u = !!A[0].d; // con unidades, el valor va sin la regla de los angulos
        return wd(mapM(A[0], (x) => (u ? FUNCS[name](x) : FUNCS[name](x, radians, radians))), d);
      }
      const M = MULTI[name], [lo, hi] = [M.n[0], M.n[1] ?? Infinity];
      if (A.length < lo || A.length > hi) throw new Error(`«${name}» recibe ${hi === Infinity ? `${lo} valores o más` : lo === hi ? `${lo} valores` : `${lo} o ${hi} valores`}${sep}`);
      const d = multiDim(name, A), ms = A.filter(isM);
      for (const m of ms.slice(1)) sameShape(ms[0], m, `aplicar «${name}» a`);
      return wd({ m: ms[0].m.map((row, i) => row.map((_, k) => M.f(A.map((a) => ({ v: isM(a) ? a.m[i][k] : a.v, r: false })), radians).v)) }, d);
    }
    if (name in FUNCS) {
      if (A.length !== 1) throw new Error(`«${name}» recibe un solo valor`);
      const a = A[0];
      if (a.d) return wd({ v: FUNCS[name](a.v), r: false }, fnDim(name, a)); // con unidades: ver fnDim
      return { v: FUNCS[name](A[0].v, A[0].r || radians, radians), r: MAKE_RAD.has(name) || (KEEP_RAD.has(name) && A[0].r) };
    }
    const M = MULTI[name], [lo, hi] = [M.n[0], M.n[1] ?? Infinity];
    if (A.length < lo || A.length > hi) throw new Error(`«${name}» recibe ${hi === Infinity ? `${lo} valores o más` : lo === hi ? `${lo} valores` : `${lo} o ${hi} valores`}${sep}`);
    if (A.some((x) => x.d)) { const d = multiDim(name, A); return wd({ ...M.f(A, radians) }, d); }
    return M.f(A, radians);
  }

  // Funcion definida en un texto: sus parametros valen lo que se le pasa; lo demas (cotas y variables) es lo de todo el dibujo, no lo del que la llama.
  function callUser(name, A) {
    const f = vars[name].fn, va = f.params[f.params.length - 1] === 'varargin', nFix = va ? f.params.length - 1 : f.params.length;
    // varargin (el ultimo parametro, como en MATLAB): recibe los valores que sobran, de cualquier tipo (varargin_1, varargin_(k));
    // nargin: cuantos valores recibio la funcion
    if (va && A.length < nFix) throw new Error(`«${name}» recibe al menos ${nFix}: ${name}(${f.params.join(argText() + ' ')})`);
    if (!va && A.length !== f.params.length) throw new Error(`«${name}» recibe ${f.params.length === 1 ? 'un valor' : dotArgs() ? `${f.params.length} valores separados por «,»` : `${f.params.length} valores separados por «;»`}: ${name}(${f.params.join(argText() + ' ')})`);
    if (depth >= 200) throw new Error(`«${name}» se llama a sí misma demasiadas veces (200 niveles)`);
    const g = globals || vars, local = { ...g, ...(f.lib || {}) }; // f.lib: las funciones locales de un script (ver script.js)
    const keep = (a) => isS(a) ? { ...a } : isM(a) ? wd({ mat: a.m, ...(a.mi ? { mi: a.mi } : {}) }, a.d) : { v: a.v, ...(a.im ? { im: a.im } : {}), r: !!a.r, d: a.d };
    if (va) local.varargin = { args: A.slice(nFix).map(keep), loc: true };
    local.nargin = { v: A.length, r: false, loc: true };
    f.params.slice(0, nFix).forEach((q, i) => { local[q] = isS(A[i]) ? { ...A[i] } : isM(A[i]) ? wd({ mat: A[i].m, ...(A[i].mi ? { mi: A[i].mi } : {}) }, A[i].d) : { v: A[i].v, ...(A[i].im ? { im: A[i].im } : {}), r: !!A[i].r, d: A[i].d }; });
    try {
      const r = evalExpr(f.body, { radians, vars: local, allowMat: true, allowCplx: true, depth: depth + 1, globals: g });
      if (typeof r.str === 'string') return { str: r.str };
      if (r.strs) return { strs: r.strs };
      return r.mat ? wd({ m: r.mat, ...(r.mi ? { mi: r.mi } : {}) }, r.dim) : { v: r.value, ...(r.im ? { im: r.im } : {}), r: r.rad, d: r.dim };
    } catch (e) {
      if (/^En «/.test(e.message)) throw e;
      const ne = new Error(`En «${name}»: ${e.message}`); ne.rt = e.rt; throw ne;
    }
  }

  function expr() {
    let a = term();
    while (isOp('+') || isOp('-')) {
      const o = toks[p++].v, s = o === '+' ? 1 : -1; const b = term();
      if (isS(a) || isS(b)) { a = strAdd(a, b, s); continue; } // cadenas: «+» las une
      if (isC(a) || isC(b)) { const d = addU(a, b, s); a = isM(a) || isM(b) ? wd(caddM(a, b, s), d) : cval(cadd(cpair(a), cscale(cpair(b), s)), a.r || b.r, d); continue; }
      a = isM(a) || isM(b) ? wd(addM(a, b, s), addU(a, b, s)) : { v: a.v + s * b.v, r: a.r || b.r, d: addU(a, b, s) };
    }
    return a;
  }
  // producto (o='*'), cociente ('/') o elemento a elemento ('.*', './') con algun complejo
  function cMulDiv(a, b, o) {
    const s = o === '*' || o === '.*' ? 1 : -1, d = mulDim(a.d, b.d, s);
    if (o === '/' && isM(b)) throw new Error('No se puede dividir entre un vector o una matriz');
    if (!isM(a) && !isM(b)) return cval((s > 0 ? cmul : cdiv)(cpair(a), cpair(b)), a.r || b.r, d);
    if (o === '*') return wd(cmulM(a, b), d);
    if (o === '/') return wd(cmapM(a, (z) => cdiv(z, cpair(b))), d);
    return wd(celementwise(a, b, s > 0 ? cmul : cdiv, s > 0 ? 'multiplicar elemento a elemento' : 'dividir elemento a elemento'), d);
  }
  function term() {
    let a = unary();
    for (;;) {
      if (isOp('.*') || isOp('./')) { // elemento a elemento
        const o = toks[p++].v, b = unary();
        if (isS(a) || isS(b)) throw new Error('Una cadena no se multiplica ni se divide');
        if (isC(a) || isC(b)) { a = cMulDiv(a, b, o); continue; }
        if (!isM(a) && !isM(b)) { if (o === './' && b.v === 0) throw rt('División entre cero'); a = mulU(a, b, o === '.*' ? 1 : -1, o === '.*' ? a.v * b.v : a.v / b.v); } else a = wd(o === '.*' ? elementwise(a, b, (x, y) => x * y, 'multiplicar elemento a elemento') : elementwise(a, b, divEl, 'dividir elemento a elemento'), mulDim(a.d, b.d, o === '.*' ? 1 : -1));
      } else if (isOp('*') || isOp('/')) {
        const o = toks[p++].v, asUnit = peek()?.t === 'unit'; const b = unary();
        if (isS(a) || isS(b)) throw new Error('Una cadena no se multiplica ni se divide');
        if (isC(a) || isC(b)) { a = cMulDiv(a, b, o); continue; }
        if (o === '/') {
          if (isM(b)) throw new Error('No se puede dividir entre un vector o una matriz');
          if (b.v === 0) throw rt('División entre cero');
          a = isM(a) ? wd(mapM(a, (x) => x / b.v), mulDim(a.d, b.d, -1)) : mulU(a, b, -1, a.v / b.v, asUnit);
        } else a = isM(a) || isM(b) ? wd(mulM(a, b), mulDim(a.d, b.d)) : mulU(a, b, 1, a.v * b.v, asUnit);
      } else if (startsFactor()) { // multiplicacion implicita: 2π, 3(4+1)
        const asUnit = peek()?.t === 'unit', b = unary();
        if (isS(a) || isS(b)) throw new Error('Una cadena no se multiplica ni se divide');
        if (isC(a) || isC(b)) { a = cMulDiv(a, b, '*'); continue; }
        a = isM(a) || isM(b) ? wd(mulM(a, b), mulDim(a.d, b.d)) : mulU(a, b, 1, a.v * b.v, asUnit);
      } else return a;
    }
  }
  function unary() {
    if (isOp('-')) { p++; const a = unary(); if (isS(a)) throw new Error('Una cadena no lleva signo'); if (isC(a)) return isM(a) ? wd(cmapM(a, (z) => [-z[0], -z[1]]), a.d) : cval([-a.v, -a.im], a.r, a.d); return isM(a) ? wd(mapM(a, (x) => -x), a.d) : { v: -a.v, r: a.r, d: a.d }; }
    if (isOp('+')) { p++; return unary(); }
    return power();
  }
  function power() {
    const a = primary();
    if (isS(a) && (isOp('^') || isOp('.^')) && toks[p + 1]?.t !== 'tr') throw new Error('Una cadena no se eleva a una potencia');
    if (isOp('^')) {
      p++;
      if (peek()?.t === 'tr') { p++; return isM(a) ? wd(isC(a) ? ctransposeM(a) : transposeM(a), a.d) : a; } // x^T (un vector de cadenas queda igual)
      const b = unary();
      if (isS(b)) throw new Error('El exponente no puede ser una cadena');
      if (b.d) throw new Error(`El exponente no puede llevar unidades (lleva ${unitMsg(b.d)})`);
      if (isC(b) && (isM(a) || a.d)) throw new Error('Un exponente complejo solo vale con un número sin unidades');
      if (isM(a) && !isM(b) && isC(a)) return wd(cpowM(a, b.v), powDim(a.d, b.v));
      if (!isM(a) && !isM(b) && (isC(a) || isC(b) || (a.v < 0 && !Number.isInteger(b.v)))) return cval(cpow(cpair(a), cpair(b)), a.r, isC(b) ? undefined : powDim(a.d, b.v)); // (-8)^(1/3), (3+4j)^2, 2^j
      if (isM(a) && !isM(b)) return wd(powM(a, b.v), powDim(a.d, b.v)); // A^2, A^(-1)
      if (isM(b)) throw new Error('El exponente no puede ser un vector ni una matriz (para elevar elemento a elemento usa .^)');
      return { v: Math.pow(a.v, b.v), r: a.r, d: powDim(a.d, b.v) };
    }
    if (isOp('.^')) { // elemento a elemento
      p++;
      const b = unary();
      if (b.d) throw new Error(`El exponente no puede llevar unidades (lleva ${unitMsg(b.d)})`);
      const neg = (q) => (isM(q) ? q.m.some((r) => r.some((x) => x < 0)) : q.v < 0), frac = (q) => (isM(q) ? q.m.some((r) => r.some((x) => !Number.isInteger(x))) : !Number.isInteger(q.v));
      if (isC(a) || isC(b) || (neg(a) && frac(b))) { // complejos (o una base negativa con exponente no entero): como en MATLAB
        if (isC(b) && a.d) throw new Error('Un exponente complejo solo vale con un número sin unidades');
        if (isM(b) && a.d) throw new Error('Con unidades, el exponente de .^ es un número, no un vector');
        const d = isM(b) || isC(b) ? undefined : powDim(a.d, b.v);
        return !isM(a) && !isM(b) ? cval(cpow(cpair(a), cpair(b)), a.r, d) : wd(celementwise(a, b, cpow, 'elevar elemento a elemento'), d);
      }
      return !isM(a) && !isM(b) ? { v: Math.pow(a.v, b.v), r: a.r, d: powDim(a.d, b.v) } : wd(elementwise(a, b, Math.pow, 'elevar elemento a elemento'), isM(b) ? (a.d ? (() => { throw new Error('Con unidades, el exponente de .^ es un número, no un vector'); })() : undefined) : powDim(a.d, b.v));
    }
    return a;
  }
  function primary() {
    const k = toks[p++];
    if (!k) throw new Error('Expresión incompleta');
    if (k.t === 'str') return { str: k.v };
    if (k.t === 'num') {
      const a = k.im ? { v: 0, im: k.im, r: false } : { v: k.v, r: false };
      if (peek()?.t !== 'unit') return a;
      // un numero con su unidad es UNA cantidad: se une antes que / y * («10'kN/2'm» es 10 kN entre 2 m; antes daba 10 kN/2·m). El
      // exponente que sigue es de la unidad («2'm^2» son 2 m², no (2 m)²).
      const uk = toks[p++];
      let u = { v: uk.u.f, r: !!uk.u.r, d: uk.u.d };
      if (isOp('^') && toks[p + 1]?.t !== 'tr') { p++; const e = unary(); if (isM(e) || isC(e) || isS(e) || e.d) throw new Error('El exponente de una unidad es un número'); u = { v: u.v ** e.v, r: u.r, d: powDim(u.d, e.v) }; }
      return a.im ? cval([0, a.im * u.v], false, u.d) : wd({ v: a.v * u.v, r: u.r }, u.d);
    }
    if (k.t === 'unit') return { v: k.u.f, r: !!k.u.r, d: k.u.d }; // 'N, 'mm: vale su factor al SI, con su dimension
    if (k.t === 'idx' && vars[k.base]?.args) { // varargin_k: el k-esimo valor de sobra, del tipo que sea
      const L = vars[k.base].args, ix = splitIdx(k.src);
      if (ix.length !== 1) throw new Error(`«${k.base}» lleva un índice: ${k.base}_k`);
      const q = evalExpr(ix[0], { vars, depth: depth + 1, globals }).value;
      if (!(Number.isInteger(q) && q >= 1 && q <= L.length)) throw new Error(L.length ? `Pides «${k.base}_${q}», pero «${k.base}» trae ${L.length} (revisa nargin)` : `«${k.base}» está vacío: la función no recibió valores de más (revisa nargin)`);
      const x = L[q - 1];
      if (typeof x.str === 'string') return { str: x.str };
      if (x.mat) return wd({ m: x.mat, ...(x.mi ? { mi: x.mi } : {}) }, x.d);
      return { v: x.v, ...(x.im ? { im: x.im } : {}), r: !!x.r, d: x.d };
    }
    if (k.t === 'idx' && vars[k.base]?.strs) { // un elemento de un vector de cadenas: s_2
      const L = vars[k.base].strs, ix = splitIdx(k.src);
      if (ix.length !== 1) throw new Error(`«${k.base}» es un vector de cadenas: lleva un índice`);
      const q = Math.round(evalExpr(ix[0], { vars, depth: depth + 1, globals }).value);
      if (!(q >= 1 && q <= L.length)) throw new Error(`Índice fuera de rango: «${k.base}» tiene ${L.length} cadenas y pides la ${q}`);
      return { str: L[q - 1] };
    }
    if (k.t === 'idx') { // v_2, A_(i,j), A_(i,:), A_(:,j): un elemento, una fila o una columna (los indices empiezan en 1)
      if (!vars[k.base].vec && !vars[k.base].mat) throw new Error(vars[k.base].unset ? `«${k.base}» se usa antes de darle un valor` : `«${k.base}» no es un vector ni una matriz: no lleva índice`);
      const x = vars[k.base], xd = x.d, m = x.mat || [x.vec], R = m.length, C = m[0].length, name = `${k.base}_(${k.src})`;
      const ix = splitIdx(k.src).map((s) => {
        if (!s) throw new Error(`Falta un índice en «${name}»`);
        if (s === ':') return ':';
        const v = evalExpr(s, { vars, depth: depth + 1, globals }).value;
        if (!Number.isInteger(Math.round(v * 1e9) / 1e9)) throw new Error(`El índice «${s}» de «${k.base}» debe ser un entero (vale ${Math.round(v * 1e6) / 1e6})`);
        return Math.round(v);
      });
      if (ix.length > 2) throw new Error('Un elemento lleva un índice (vector) o dos (matriz): A_(fila,columna)');
      if (ix.length === 1 && (ix[0] === ':' || (R > 1 && C > 1))) throw new Error(ix[0] === ':' ? 'Un «:» solo no vale: usa A_(fila,:) o A_(:,columna)' : `«${k.base}» es una matriz de ${R}×${C}: lleva dos índices, ${k.base}_(fila,columna)`);
      const [i, j] = ix.length === 2 ? ix : R === 1 ? [1, ix[0]] : [ix[0], 1];
      const out = (q, lim) => q !== ':' && (q < 1 || q > lim);
      if (out(i, R) || out(j, C)) throw new Error(`Índice fuera de rango: «${k.base}» es ${R === 1 ? `un vector de ${C}` : C === 1 ? `un vector de ${R}` : `una matriz de ${R}×${C}`}` + (ix.length === 2 ? ` y pides la fila ${i}, columna ${j}` : ` y pides el elemento ${ix[0]}`));
      const mi = x.mi; // parte imaginaria (una matriz compleja)
      if (i === ':' && j === ':') return wd({ m, ...(mi ? { mi } : {}) }, xd);
      if (i === ':') return wd(mi ? fromCm(m.map((r, q) => [[r[j - 1], mi[q][j - 1]]])) : { m: m.map((r) => [r[j - 1]]) }, xd); // la columna j
      if (j === ':') return wd(mi ? fromCm([m[i - 1].map((v, q) => [v, mi[i - 1][q]])]) : { m: [m[i - 1]] }, xd); // la fila i
      return wd(mi && mi[i - 1][j - 1] ? { v: m[i - 1][j - 1], im: mi[i - 1][j - 1], r: false } : { v: m[i - 1][j - 1], r: false }, xd);
    }
    if (k.t === 'ufn') { // funcion definida en un texto: foo(x; y):...
      if (!isOp('(')) throw new Error(`«${k.v}» es una función: escríbela con paréntesis, p. ej. ${k.v}(…)`);
      p++;
      const A = [];
      const fp = vars[k.v].fn.params;
      if (isOp(')') && !(fp.length === 1 && fp[0] === 'varargin')) throw new Error(`«${k.v}» necesita al menos un valor`);
      if (!isOp(')')) for (;;) { A.push(cmp()); if (peek()?.t === 'sep') { p++; continue; } break; } // f() solo con f(varargin)
      if (!isOp(')')) throw new Error('Falta cerrar un paréntesis');
      p++;
      return callUser(k.v, A);
    }
    if (k.t === 'var') {
      const x = vars[k.v];
      if (x.unset) throw new Error(`«${k.v}» se usa antes de darle un valor (dentro del programa: ${k.v}:valor)`);
      if (typeof x.str === 'string') return { str: x.str };
      if (x.strs) return { strs: x.strs };
      if (x.fn) throw new Error(`«${k.v}» es una función: escríbela con paréntesis, p. ej. ${k.v}(…)`);
      if (x.args) throw new Error(`«${k.v}» es la lista de los valores de más: usa ${k.v}_1, ${k.v}_(k) y nargin`);
      if (x.mat) return wd({ m: x.mat, ...(x.mi ? { mi: x.mi } : {}) }, x.d);
      if (x.vec) return wd({ m: [x.vec] }, x.d);
      return { v: x.v, ...(x.im ? { im: x.im } : {}), r: !!x.r, d: x.d };
    }
    if (k.t === 'sqrt') { const a = primary(); if (isC(a) || (isM(a) ? a.m.some((r) => r.some((x) => x < 0)) : a.v < 0)) return isM(a) ? wd(cmapM(a, csqrt), powDim(a.d, 0.5)) : cval(csqrt(cpair(a)), a.r, powDim(a.d, 0.5)); if (isM(a)) { if (a.m.some((r) => r.some((x) => x < 0))) throw rt('Raíz de un número negativo'); return wd(mapM(a, Math.sqrt), powDim(a.d, 0.5)); } if (a.v < 0) throw rt('Raíz de un número negativo'); return { v: Math.sqrt(a.v), r: a.r, d: powDim(a.d, 0.5) }; }
    if (k.t === 'op' && k.v === '[') {
      // matriz: [1, 2, 3] (fila) o [1, 2; 3, 4] (filas separadas por «;»). Como en MATLAB, un elemento puede ser un vector o una
      // matriz (por bloques): «,» pone los bloques lado a lado (mismo numero de filas) y «;» uno debajo del otro (mismo numero de
      // columnas): con V y M filas de 2, [V; M] es la matriz de 2×2 y [V, M] una fila de 4.
      if (isOp(']')) throw new Error('Una matriz no puede estar vacía');
      const brow = [[]]; // filas de bloques; cada bloque, una matriz (un numero es de 1×1)
      let d0 = null, z0 = true; // todos los elementos con la misma dimension (la de la matriz); z0: hasta aqui solo ceros sin unidades
      const strEls = []; let numEls = 0, rowsN = 1;
      for (;;) {
        const a = cmp();
        if (isS(a)) { if (a.strs) throw new Error('Un vector de cadenas no va dentro de otro: usa horzcat o strjoin'); strEls.push(a.str); const s2 = peek(); if (s2?.t === 'sep') { p++; if (s2.c === rowChar()) rowsN++; continue; } break; }
        numEls++;
        if (d0 === null || (z0 && !zero0(a))) { if (!zero0(a) || d0 === null) d0 = a.d; } else if (!sameDim(a.d, d0) && !zero0(a)) throw new Error(`Los elementos de una matriz deben tener las mismas unidades (hay ${unitMsg(d0)} y ${unitMsg(a.d)})`);
        if (!zero0(a)) z0 = false;
        brow.at(-1).push(isM(a) ? a : { m: [[a.v]], ...(a.im ? { mi: [[a.im]] } : {}) });
        const s = peek();
        if (s?.t === 'sep') { p++; if (s.c === rowChar()) brow.push([]); continue; } // filas: «;» (o «|» con coma decimal); elementos: «,» (o «;»)
        break;
      }
      if (!isOp(']')) throw new Error('Falta cerrar un corchete');
      p++;
      if (strEls.length) { // ["a", "b"]: un vector de cadenas (fila; sin numeros mezclados)
        if (numEls) throw new Error('Un vector no mezcla cadenas y números (para un número, num2str(…))');
        if (rowsN > 1) throw new Error('Un vector de cadenas es una sola fila: ["a", "b"]');
        return { strs: strEls };
      }
      const blocky = brow.some((r) => r.some((b) => b.m.length !== 1 || b.m[0].length !== 1));
      const rows = [], rowsI = [], cplx = brow.some((r) => r.some((b) => b.mi));
      brow.forEach((bs, i) => {
        const h = bs[0].m.length;
        const odd = bs.find((b) => b.m.length !== h);
        if (odd) throw new Error(`Para poner lado a lado (con «${elemChar()}») los bloques deben tener el mismo número de filas: en la fila ${i + 1} hay ${nameM(bs[0])} y ${nameM(odd)}`);
        for (let r = 0; r < h; r++) { rows.push(bs.flatMap((b) => b.m[r])); if (cplx) rowsI.push(bs.flatMap((b) => (b.mi ? b.mi[r] : b.m[r].map(() => 0)))); }
      });
      const w = rows[0].length, bad = rows.find((r) => r.length !== w);
      if (bad) {
        if (!blocky) throw new Error('Todas las filas de una matriz deben tener el mismo número de elementos');
        const wOf = (bs) => bs.reduce((s, b) => s + b.m[0].length, 0), j = brow.findIndex((bs) => wOf(bs) !== wOf(brow[0]));
        throw new Error(`Para apilar (con «${rowChar()}») las filas deben tener el mismo número de columnas: la 1.ª tiene ${wOf(brow[0])} y la ${j + 1}.ª ${wOf(brow[j])}`);
      }
      if (rows.length * w > 10000) throw new Error('Una matriz admite hasta 10000 elementos');
      return wd(cplx ? { m: rows, mi: rowsI } : { m: rows }, d0);
    }
    if (k.t === 'op' && k.v === '(') {
      const a = cmp();
      if (!isOp(')')) throw new Error('Falta cerrar un paréntesis');
      p++;
      return a;
    }
    if (k.t === 'id') {
      if (k.v in CONSTS) return { v: CONSTS[k.v], r: k.v === 'pi' || k.v === 'π' };
      if (!isOp('(')) throw new Error(`«${k.v}» necesita paréntesis, p. ej. ${k.v}(30)`);
      p++;
      if (k.v === 'fzero') return lazyFzero();
      if (k.v === 'integral') return lazyIntegral();
      if (k.v === 'line') return lazyLine();
      if (k.v === 'for') return lazyFor();
      if (k.v === 'while') return lazyWhile();
      if (LAZY.has(k.v)) return lazyIf(k.v);
      const A = [];
      if (isOp(')') && (k.v === 'rand' || k.v === 'randn')) { p++; return call(k.v, A); } // rand() y randn(): un numero
      if (isOp(')')) throw new Error(`«${k.v}» necesita al menos un valor`);
      for (;;) {
        A.push(cmp());
        if (peek()?.t === 'sep') { p++; continue; }
        break;
      }
      if (!isOp(')')) throw new Error('Falta cerrar un paréntesis');
      p++;
      return call(k.v, A);
    }
    throw new Error('Expresión no válida');
  }
  const res = cmp();
  if (p < toks.length) throw new Error('Sobra algo al final de la expresión');
  // un complejo solo sale donde se acepta (los textos de calculo y las funciones); una cota, un actuador o una grafica necesitan un real
  if (isS(res)) { // una cadena solo sale en los textos de calculo (y las funciones); una cota o una grafica necesitan un numero
    if (!allowCplx) throw new Error('El resultado es una cadena: aquí hace falta un número');
    return res.strs ? { strs: res.strs, value: NaN } : { str: res.str, value: NaN };
  }
  if (isC(res) && !allowCplx) throw new Error('El resultado es un número complejo: aquí hace falta un número real (usa abs(…), angle(…), real(…) o imag(…))');
  if (isM(res)) {
    if (!allowMat) throw new Error(`El resultado es ${nameM(res)}, no un número`);
    if (!res.m.every((r) => r.every(Number.isFinite)) || (res.mi && !res.mi.every((r) => r.every(Number.isFinite)))) throw new Error('El resultado no es un número');
    return { mat: res.m, ...(res.mi ? { mi: res.mi } : {}), value: NaN, rad: false, dim: res.d };
  }
  if (!Number.isFinite(res.v) || (res.im !== undefined && !Number.isFinite(res.im))) throw new Error('El resultado no es un número');
  return { value: res.v, ...(res.im ? { im: res.im } : {}), rad: res.r, dim: res.d };
}

// ¿El texto es un numero sin mas? (entonces no se guarda como formula)
export const isPlainNumber = (s) => /^\s*[-+]?(\d+([.,]\d+)?|[.,]\d+)\s*$/.test(String(s));

// Valor numerico de lo que escribio el usuario; angle: lo que viene de π se pasa de radianes a grados.
// radians: la cota angular se escribe en radianes (los numeros y sin/cos/tan van en radianes); si no, en grados.
export function parseValue(src, { angle = false, radians = false, vars = null } = {}) {
  let { value, rad, dim } = evalExpr(src, { radians: angle && radians, vars });
  if (dim && dim[0] === 1 && dim.slice(1).every((x) => x === 0)) value *= 1000; // una longitud con unidades («2'cm») va al dibujo en mm; otras magnitudes, en el SI
  return Number((angle && (rad || radians) ? value * TAU_DEG : value).toPrecision(12));
}
