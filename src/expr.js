// Evaluador de expresiones matematicas para las cotas ("3π/4", "10*sin(30)", "10+1/3"). Sin eval.
// Devuelve { value, rad }: rad indica que el valor viene de π (esta en radianes), para que una cota angular
// lo convierta a grados. sin/cos/tan toman grados, salvo que su argumento contenga π (entonces radianes).
// Variables: las cotas con nombre (D1, A1, R2, O3 o el que les des) se pueden usar en las formulas: vars = { nombre: { v, r } }.
// Un angulo vale su medida en radianes (r = true), igual que π: sin(A1) funciona y R*A1 es la longitud de arco.

import { parseUnit, sameDim, mulDim, powDim, unitMsg } from './units.js';
import { GREEK, GREEK_UP } from './asciimath.js';
import { setDecimal, decimalMode, elemChar, rowChar, argChar } from './locale.js';

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
};
const KEEP_U = new Set(['abs', 'floor', 'piso', 'ceil', 'techo', 'trunc']); // con unidades, conservan las del argumento
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
const LAZY = new Set(['if', 'si']); // if(condicion; si_verdadero; si_falso), o si(...) como alias: solo se evalua la rama elegida
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
export const isReservedName = (n) => { const l = String(n).toLowerCase(); return FUTURE_VARS.has(n) || l in FUNCS || l in MULTI || l in CONSTS || LAZY.has(l) || MATFN.has(l) || l === 'log10'; };
export const reservedWhy = (n) => (n === TIME_VAR ? `«${n}» está reservada para el tiempo` : FUTURE_VARS.has(n) ? `«${n}» está reservada para uso futuro` : `«${n}» es una función o constante`);
// Todos los nombres de funciones y constantes del evaluador (la referencia de la ayuda debe nombrarlos todos: test/funcref.test.mjs).
export const FUNC_NAMES = [...Object.keys(FUNCS), ...Object.keys(MULTI), ...MATFN, ...LAZY, ...Object.keys(CONSTS)];
export const NAME_RE = /^[A-Za-zα-ωΑ-Ωϑϕϖɛ_][A-Za-z0-9α-ωΑ-Ωϑϕϖɛ_]*$/;
const ID_RE = /^[A-Za-zα-ωΑ-Ωϑϕϖɛ_][A-Za-z0-9α-ωΑ-Ωϑϕϖɛ_]*/;
// Variables de texto con subindice: «var_(texto-del-subindice)». El subindice es texto libre (sin parentesis ni llaves); espacios sobrantes no cuentan.
const SUB_RE = /^[A-Za-zα-ωΑ-Ωϑϕϖɛ_][A-Za-z0-9α-ωΑ-Ωϑϕϖɛ_]*?_\([^(){}\n]+\)/;
export const TEXT_NAME_RE = /^[A-Za-zα-ωΑ-Ωϑϕϖɛ_][A-Za-z0-9α-ωΑ-Ωϑϕϖɛ_]*?(?:_\([^(){}\n]+\))?$/;
// Indices de vectores y matrices con la notacion matematica: «v_2», «v_i» (un indice) y «A_(fila,columna)», «v_(i+1)» (entre parentesis, con formulas).
// Un nombre que existe como variable (p. ej. «k_(total)» o «x_1») es esa variable: solo es un indice si el nombre entero no existe y su base si.
export function indexParts(raw) {
  const k = raw.lastIndexOf('_(');
  if (k > 0 && raw.endsWith(')')) return { base: raw.slice(0, k), src: raw.slice(k + 2, -1) };
  const j = raw.lastIndexOf('_');
  if (j > 0 && /^[A-Za-z0-9α-ωΑ-Ωϑϕϖɛ]+$/.test(raw.slice(j + 1))) return { base: raw.slice(0, j), src: raw.slice(j + 1) };
  return null;
}
function indexOfVar(raw, vars) {
  const ip = indexParts(raw), x = ip && Object.prototype.hasOwnProperty.call(vars, ip.base) ? vars[ip.base] : null;
  return x && (x.vec || x.mat) ? ip : null;
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
export const greekName = (s) => String(s).replace(/^[A-Za-z]+(?=_|$)/, (w) => (w !== 'pi' && Object.prototype.hasOwnProperty.call(GREEK_CHAR, w) ? GREEK_CHAR[w] : w));
export const normName = (s) => greekName(String(s).replace(/_\(\s*([^()]*?)\s*\)$/, '_($1)'));

// Numeros segun el indicador decimal del dibujo: «.» solo punto; «,» punto o coma (la coma decimal vale tambien dentro de corchetes);
// sin indicador (dibujos anteriores) los dos, y dentro de corchetes solo el punto.
const SCI = '([eE][+-]?\\d+(?![A-Za-z_\\d]))?';
const RE_DOT = new RegExp('^(\\d+(\\.\\d+)?|\\.\\d+)' + SCI), RE_ANY = new RegExp('^(\\d+([.,]\\d+)?|[.,]\\d+)' + SCI);
const numRe = (depth) => { const m = decimalMode(); return m === '.' ? RE_DOT : m === ',' ? RE_ANY : depth > 0 ? RE_DOT : RE_ANY; };
// loose: no falla con identificadores desconocidos (para listar las variables de una formula)
function tokenize(src, vars = null, loose = false) {
  const toks = [];
  let i = 0, depth = 0; // depth: corchetes abiertos (dentro de [ ] la coma siempre separa: «[1,2,3]»; la coma decimal solo vale fuera)
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    const last = toks[toks.length - 1], afterValue = !!last && (last.t === 'num' || last.t === 'var' || (last.t === 'id' && last.v in CONSTS) || (last.t === 'idx') || last.t === 'unit' || (last.t === 'op' && (last.v === ')' || last.v === ']')));
    // separador de argumentos: «;», o una coma tras un valor («max(a, 5)»); «2,5» ya lo tomo el numero como decimal
    if (c === ';' || (c === ',' && afterValue && decimalMode() !== ',')) { // con coma decimal la coma no separa: los argumentos van con «;»
      toks.push({ t: 'sep', c, d: depth, i, j: i + 1 }); i++; continue; }
    if (c === '|' && depth > 0 && decimalMode() === ',') { toks.push({ t: 'sep', c, d: depth, i, j: i + 1 }); i++; continue; } // con coma decimal, «|» separa las filas de una matriz
    if (c === "'") { // unidad: «250'N», «3'(m/s)», «20'°»
      const um = /^'\s*(\([^()]*\)|[A-Za-zµμΩ°%áéíóú]+[²³]?)/.exec(src.slice(i));
      if (!um) throw new Error("Después de «'» va una unidad, p. ej. 250'N o 3'(m/s)");
      let u;
      try { u = parseUnit(um[1].replace(/^\((.*)\)$/, '$1')); } catch (e) { if (!loose) throw e; u = { f: 1 }; }
      toks.push({ t: 'unit', u, i, j: i + um[0].length }); i += um[0].length; continue;
    }
    const cm = /^(<=|>=|==|!=|<|>|≤|≥|≠)/.exec(src.slice(i));
    if (cm) { toks.push({ t: 'cmp', v: { '≤': '<=', '≥': '>=', '≠': '!=' }[cm[0]] || cm[0], i, j: i + cm[0].length }); i += cm[0].length; continue; }
    // Notacion cientifica: 2.5e6, 3e-4, 1E3 («e» y «E» no pueden ser nombres de variable: son la constante e). «2E3» es 2000 aunque
    // exista una variable E3: para multiplicar, «2*E3».
    let m = numRe(depth).exec(src.slice(i));
    if (m) { toks.push({ t: 'num', v: Number(m[0].replace(',', '.')), i, j: i + m[0].length }); i += m[0].length; continue; }
    if (c === '√') { toks.push({ t: 'sqrt', i, j: i + 1 }); i++; continue; }
    if (c === 'π') { toks.push({ t: 'id', v: 'π', i, j: i + 1 }); i++; continue; }
    m = SUB_RE.exec(src.slice(i)) || ID_RE.exec(src.slice(i));
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
      if (vars && Object.prototype.hasOwnProperty.call(vars, raw)) toks.push({ t: vars[raw]?.fn ? 'ufn' : 'var', v: raw, i, j: i + L }); // ufn: funcion definida en un texto
      else if (vars && (ix = indexOfVar(raw, vars))) toks.push({ t: 'idx', base: ix.base, src: ix.src, i, j: i + L }); // v_2, v_i, A_(1,2): un elemento de un vector o matriz
      else if (raw === 'T' && last?.t === 'op' && last.v === '^') toks.push({ t: 'tr', i, j: i + 1 }); // x^T: la transpuesta
      else if (name in FUNCS || name in MULTI || name in CONSTS || LAZY.has(name) || MATFN.has(name)) toks.push({ t: 'id', v: name, i, j: i + L });
      else if (loose) toks.push({ t: 'var', v: raw, i, j: i + L });
      else if (FUTURE_VARS.has(raw)) throw new Error(`${reservedWhy(raw)} (todavía no tiene valor)`);
      else throw new Error(`No reconozco «${raw}»` + (/\d/.test(raw) || raw.length === 1 ? ' (no hay una cota con ese nombre)' : ''));
      i += L; continue;
    }
    if (c === '*' && src[i + 1] === '*') { toks.push({ t: 'op', v: '^', i, j: i + 2 }); i += 2; continue; }
    if (c === '.' && '*/^'.includes(src[i + 1] ?? ' ')) { toks.push({ t: 'op', v: '.' + src[i + 1], i, j: i + 2 }); i += 2; continue; } // elemento a elemento: .* ./ .^
    if (c === '[') depth++; else if (c === ']') depth = Math.max(0, depth - 1);
    if ('+-*/^()[]×÷·−'.includes(c)) { toks.push({ t: 'op', v: c === '×' || c === '·' ? '*' : c === '÷' ? '/' : c === '−' ? '-' : c, i, j: i + 1 }); i++; continue; }
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
function matFn(name, A) {
  const need = name === 'dot' || name === 'cross' ? 2 : 1;
  if (A.length !== need) throw new Error(need === 1 ? `«${name}» recibe un valor (un vector o una matriz)` : `«${name}» recibe dos vectores separados por «;»: ${name}(a; b)`);
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

// Ángulos del dibujo (opción «Ángulos en: grados / radianes» del documento, doc.angles): los textos de cálculo y las gráficas
// evalúan con este valor por defecto; las cotas y los actuadores lo fijan explícito (siempre en grados).
let DEF_RAD = false;
export const setAngleMode = (doc) => { DEF_RAD = doc?.angles === 'rad'; setDecimal(doc?.decimal); }; // el indicador decimal del dibujo va con la opcion de angulos: se activan juntos
export const angleRad = () => DEF_RAD;

export function evalExpr(src, { radians = DEF_RAD, vars = null, allowMat = false, depth = 0, globals = null } = {}) {
  const toks = tokenize(String(src ?? ''), vars);
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
  const addU = (a, b, s) => { if (!sameDim(a.d, b.d)) throw new Error(`No se puede ${s > 0 ? 'sumar' : 'restar'} ${unitMsg(a.d)} y ${unitMsg(b.d)}`); return a.d || b.d; };
  const mulU = (a, b, s, v) => ({ v, r: a.r || b.r, d: mulDim(a.d, b.d, s) });

  // comparacion (la de menor precedencia): da 1 si se cumple y 0 si no. «==» y «!=» toleran el error de redondeo.
  function cmp() {
    const a = expr(), k = peek();
    if (!k || k.t !== 'cmp') return a;
    p++;
    const b = expr();
    if (isM(a) || isM(b)) throw new Error('No se pueden comparar vectores o matrices');
    if (!sameDim(a.d, b.d)) throw new Error(`No se puede comparar ${unitMsg(a.d)} con ${unitMsg(b.d)}`);
    const x = a.v, y = b.v, eq = Math.abs(x - y) <= 1e-9 * Math.max(a.d ? 0 : 1, Math.abs(x), Math.abs(y)); // con unidades, la tolerancia es relativa (3'pF no es 0)
    const ok = { '<': x < y && !eq, '>': x > y && !eq, '<=': x < y || eq, '>=': x > y || eq, '==': eq, '!=': !eq }[k.v];
    return { v: ok ? 1 : 0, r: false };
  }
  // if(condicion; si_verdadero; si_falso) (o si): solo se evalua la rama elegida (la otra se salta sin evaluarla; asi una funcion de usuario puede llamarse a si misma)
  const SI_MSG = 'if(condición; si_verdadero; si_falso) lleva 3 valores separados por «;»';
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
    const sep = () => { if (peek()?.t !== 'sep') throw new Error(SI_MSG); p++; };
    const yes = c.v !== 0;
    let pick;
    sep();
    if (yes) { pick = cmp(); sep(); skipArg(); } else { skipArg(); sep(); pick = cmp(); }
    if (!isOp(')')) throw new Error(peek()?.t === 'sep' ? SI_MSG : 'Falta cerrar un paréntesis');
    p++;
    return pick;
  }
  function call(name, A) {
    const sep = ' (sepáralos con «;»: «2,5» es un solo número)';
    if (MATFN.has(name)) { const d = matDim(name, A); return wd({ ...matFn(name, A) }, d); }
    if ((name === 'min' || name === 'max') && A.length === 1) { // min(x), max(x): el menor o el mayor de todos los elementos
      if (!isM(A[0])) throw new Error(`«${name}» recibe dos valores (${name}(a; b)) o un vector`);
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
    const f = vars[name].fn;
    if (A.length !== f.params.length) throw new Error(`«${name}» recibe ${f.params.length === 1 ? 'un valor' : `${f.params.length} valores separados por «;»`}: ${name}(${f.params.join('; ')})`);
    if (depth >= 200) throw new Error(`«${name}» se llama a sí misma demasiadas veces (200 niveles)`);
    const g = globals || vars, local = { ...g };
    f.params.forEach((q, i) => { local[q] = isM(A[i]) ? wd({ mat: A[i].m }, A[i].d) : { v: A[i].v, r: !!A[i].r, d: A[i].d }; });
    try {
      const r = evalExpr(f.body, { radians, vars: local, allowMat: true, depth: depth + 1, globals: g });
      return r.mat ? wd({ m: r.mat }, r.dim) : { v: r.value, r: r.rad, d: r.dim };
    } catch (e) {
      if (/^En «/.test(e.message)) throw e;
      const ne = new Error(`En «${name}»: ${e.message}`); ne.rt = e.rt; throw ne;
    }
  }

  function expr() {
    let a = term();
    while (isOp('+') || isOp('-')) { const o = toks[p++].v, s = o === '+' ? 1 : -1; const b = term(); a = isM(a) || isM(b) ? wd(addM(a, b, s), addU(a, b, s)) : { v: a.v + s * b.v, r: a.r || b.r, d: addU(a, b, s) }; }
    return a;
  }
  function term() {
    let a = unary();
    for (;;) {
      if (isOp('.*') || isOp('./')) { // elemento a elemento
        const o = toks[p++].v, b = unary();
        if (!isM(a) && !isM(b)) { if (o === './' && b.v === 0) throw rt('División entre cero'); a = mulU(a, b, o === '.*' ? 1 : -1, o === '.*' ? a.v * b.v : a.v / b.v); } else a = wd(o === '.*' ? elementwise(a, b, (x, y) => x * y, 'multiplicar elemento a elemento') : elementwise(a, b, divEl, 'dividir elemento a elemento'), mulDim(a.d, b.d, o === '.*' ? 1 : -1));
      } else if (isOp('*') || isOp('/')) {
        const o = toks[p++].v; const b = unary();
        if (o === '/') {
          if (isM(b)) throw new Error('No se puede dividir entre un vector o una matriz');
          if (b.v === 0) throw rt('División entre cero');
          a = isM(a) ? wd(mapM(a, (x) => x / b.v), mulDim(a.d, b.d, -1)) : mulU(a, b, -1, a.v / b.v);
        } else a = isM(a) || isM(b) ? wd(mulM(a, b), mulDim(a.d, b.d)) : mulU(a, b, 1, a.v * b.v);
      } else if (startsFactor()) { const b = unary(); a = isM(a) || isM(b) ? wd(mulM(a, b), mulDim(a.d, b.d)) : mulU(a, b, 1, a.v * b.v); } // multiplicacion implicita: 2π, 3(4+1)
      else return a;
    }
  }
  function unary() {
    if (isOp('-')) { p++; const a = unary(); return isM(a) ? wd(mapM(a, (x) => -x), a.d) : { v: -a.v, r: a.r, d: a.d }; }
    if (isOp('+')) { p++; return unary(); }
    return power();
  }
  function power() {
    const a = primary();
    if (isOp('^')) {
      p++;
      if (peek()?.t === 'tr') { p++; return isM(a) ? wd(transposeM(a), a.d) : a; } // x^T
      const b = unary();
      if (b.d) throw new Error(`El exponente no puede llevar unidades (lleva ${unitMsg(b.d)})`);
      if (isM(a) && !isM(b)) return wd(powM(a, b.v), powDim(a.d, b.v)); // A^2, A^(-1)
      if (isM(b)) throw new Error('El exponente no puede ser un vector ni una matriz (para elevar elemento a elemento usa .^)');
      return { v: Math.pow(a.v, b.v), r: a.r, d: powDim(a.d, b.v) };
    }
    if (isOp('.^')) { // elemento a elemento
      p++;
      const b = unary();
      if (b.d) throw new Error(`El exponente no puede llevar unidades (lleva ${unitMsg(b.d)})`);
      return !isM(a) && !isM(b) ? { v: Math.pow(a.v, b.v), r: a.r, d: powDim(a.d, b.v) } : wd(elementwise(a, b, Math.pow, 'elevar elemento a elemento'), isM(b) ? (a.d ? (() => { throw new Error('Con unidades, el exponente de .^ es un número, no un vector'); })() : undefined) : powDim(a.d, b.v));
    }
    return a;
  }
  function primary() {
    const k = toks[p++];
    if (!k) throw new Error('Expresión incompleta');
    if (k.t === 'num') return { v: k.v, r: false };
    if (k.t === 'unit') return { v: k.u.f, r: !!k.u.r, d: k.u.d }; // 'N, 'mm: vale su factor al SI, con su dimension
    if (k.t === 'idx') { // v_2, A_(i,j), A_(i,:), A_(:,j): un elemento, una fila o una columna (los indices empiezan en 1)
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
      if (i === ':' && j === ':') return wd({ m }, xd);
      if (i === ':') return wd({ m: m.map((r) => [r[j - 1]]) }, xd); // la columna j
      if (j === ':') return wd({ m: [m[i - 1]] }, xd); // la fila i
      return wd({ v: m[i - 1][j - 1], r: false }, xd);
    }
    if (k.t === 'ufn') { // funcion definida en un texto: foo(x; y):...
      if (!isOp('(')) throw new Error(`«${k.v}» es una función: escríbela con paréntesis, p. ej. ${k.v}(…)`);
      p++;
      const A = [];
      if (isOp(')')) throw new Error(`«${k.v}» necesita al menos un valor`);
      for (;;) { A.push(cmp()); if (peek()?.t === 'sep') { p++; continue; } break; }
      if (!isOp(')')) throw new Error('Falta cerrar un paréntesis');
      p++;
      return callUser(k.v, A);
    }
    if (k.t === 'var') {
      const x = vars[k.v];
      if (x.fn) throw new Error(`«${k.v}» es una función: escríbela con paréntesis, p. ej. ${k.v}(…)`);
      if (x.mat) return wd({ m: x.mat }, x.d);
      if (x.vec) return wd({ m: [x.vec] }, x.d);
      return { v: x.v, r: !!x.r, d: x.d };
    }
    if (k.t === 'sqrt') { const a = primary(); if (isM(a)) { if (a.m.some((r) => r.some((x) => x < 0))) throw rt('Raíz de un número negativo'); return wd(mapM(a, Math.sqrt), powDim(a.d, 0.5)); } if (a.v < 0) throw rt('Raíz de un número negativo'); return { v: Math.sqrt(a.v), r: a.r, d: powDim(a.d, 0.5) }; }
    if (k.t === 'op' && k.v === '[') { // matriz: [1, 2, 3] (fila) o [1, 2; 3, 4] (filas separadas por «;»)
      if (isOp(']')) throw new Error('Una matriz no puede estar vacía');
      const rows = [[]];
      let d0 = null; // todos los elementos con la misma dimension (la de la matriz)
      for (;;) {
        const a = cmp();
        if (isM(a)) throw new Error('Los elementos de una matriz son números');
        if (d0 === null) d0 = a.d; else if (!sameDim(a.d, d0)) throw new Error(`Los elementos de una matriz deben tener las mismas unidades (hay ${unitMsg(d0)} y ${unitMsg(a.d)})`);
        rows.at(-1).push(a.v);
        const s = peek();
        if (s?.t === 'sep') { p++; if (s.c === rowChar()) rows.push([]); continue; } // filas: «;» (o «|» con coma decimal); elementos: «,» (o «;»)
        break;
      }
      if (!isOp(']')) throw new Error('Falta cerrar un corchete');
      p++;
      if (rows.some((r) => r.length !== rows[0].length)) throw new Error('Todas las filas de una matriz deben tener el mismo número de elementos');
      if (rows.length * rows[0].length > 10000) throw new Error('Una matriz admite hasta 10000 elementos');
      return wd({ m: rows }, d0);
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
      if (LAZY.has(k.v)) return lazyIf(k.v);
      const A = [];
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
  if (isM(res)) {
    if (!allowMat) throw new Error(`El resultado es ${nameM(res)}, no un número`);
    if (!res.m.every((r) => r.every(Number.isFinite))) throw new Error('El resultado no es un número');
    return { mat: res.m, value: NaN, rad: false, dim: res.d };
  }
  if (!Number.isFinite(res.v)) throw new Error('El resultado no es un número');
  return { value: res.v, rad: res.r, dim: res.d };
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
