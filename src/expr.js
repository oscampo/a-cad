// Evaluador de expresiones matematicas para las cotas ("3π/4", "10*sin(30)", "10+1/3"). Sin eval.
// Devuelve { value, rad }: rad indica que el valor viene de π (esta en radianes), para que una cota angular
// lo convierta a grados. sin/cos/tan toman grados, salvo que su argumento contenga π (entonces radianes).
// Variables: las cotas con nombre (D1, A1, R2, O3 o el que les des) se pueden usar en las formulas: vars = { nombre: { v, r } }.
// Un angulo vale su medida en radianes (r = true), igual que π: sin(A1) funciona y R*A1 es la longitud de arco.

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
const LAZY = new Set(['if', 'si']); // si(condicion; si_verdadero; si_falso): solo se evalua la rama elegida
// error de calculo (division entre cero, raiz negativa): una rama de si() que no se elige no lo propaga
const rt = (m) => { const e = new Error(m); e.rt = true; return e; };

// Nombres que no puede llevar una cota: funciones y constantes del evaluador.
// Nombres reservados para uso futuro (solo en esa minuscula exacta; «T» o «Ω» siguen libres): «t» es el tiempo y «j», «ω», «θ» y «α»
// quedan guardadas para los motores, las animaciones y los calculos dinamicos. Todavia no valen nada.
export const TIME_VAR = 't';
export const FUTURE_VARS = new Set([TIME_VAR, 'j', 'ω', 'θ', 'α']);
export const isReservedName = (n) => { const l = String(n).toLowerCase(); return FUTURE_VARS.has(n) || l in FUNCS || l in MULTI || l in CONSTS || LAZY.has(l) || l === 'log10'; };
export const reservedWhy = (n) => (n === TIME_VAR ? `«${n}» está reservada para el tiempo` : FUTURE_VARS.has(n) ? `«${n}» está reservada para uso futuro` : `«${n}» es una función o constante`);
export const NAME_RE = /^[A-Za-zα-ωΑ-Ω_][A-Za-z0-9α-ωΑ-Ω_]*$/;
const ID_RE = /^[A-Za-zα-ωΑ-Ω_][A-Za-z0-9α-ωΑ-Ω_]*/;

// loose: no falla con identificadores desconocidos (para listar las variables de una formula)
function tokenize(src, vars = null, loose = false) {
  const toks = [];
  let i = 0, depth = 0; // depth: corchetes abiertos (dentro de [ ] la coma siempre separa: «[1,2,3]»; la coma decimal solo vale fuera)
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    const last = toks[toks.length - 1], afterValue = !!last && (last.t === 'num' || last.t === 'var' || (last.t === 'id' && last.v in CONSTS) || (last.t === 'op' && (last.v === ')' || last.v === ']')));
    // separador de argumentos: «;», o una coma tras un valor («max(a, 5)»); «2,5» ya lo tomo el numero como decimal
    if (c === ';' || (c === ',' && afterValue)) { toks.push({ t: 'sep', c, i, j: i + 1 }); i++; continue; }
    const cm = /^(<=|>=|==|!=|<|>|≤|≥|≠)/.exec(src.slice(i));
    if (cm) { toks.push({ t: 'cmp', v: { '≤': '<=', '≥': '>=', '≠': '!=' }[cm[0]] || cm[0], i, j: i + cm[0].length }); i += cm[0].length; continue; }
    let m = (depth > 0 ? /^(\d+(\.\d+)?|\.\d+)/ : /^(\d+([.,]\d+)?|[.,]\d+)/).exec(src.slice(i));
    if (m) { toks.push({ t: 'num', v: Number(m[0].replace(',', '.')), i, j: i + m[0].length }); i += m[0].length; continue; }
    if (c === '√') { toks.push({ t: 'sqrt', i, j: i + 1 }); i++; continue; }
    if (c === 'π') { toks.push({ t: 'id', v: 'π', i, j: i + 1 }); i++; continue; }
    m = ID_RE.exec(src.slice(i));
    if (m) {
      let raw = m[0], name = raw.toLowerCase();
      // propiedad de un elemento: p12.x, l3.len (nombre + «.» + propiedad)
      const dm = /^[A-Za-z]+\d+$/.test(raw) ? /^\.([A-Za-zα-ωΑ-Ω]\w*)/.exec(src.slice(i + raw.length)) : null; // solo nombres como p12, l3, c1
      if (dm) {
        const full = raw + '.' + dm[1];
        if (loose || (vars && Object.prototype.hasOwnProperty.call(vars, full))) { toks.push({ t: 'var', v: full, i, j: i + full.length }); i += full.length; continue; }
        if (!(vars && Object.prototype.hasOwnProperty.call(vars, raw))) throw new Error(`No reconozco «${full}» (propiedades: p1.x, p1.y, l1.len, l1.ang, c1.r, c1.d)`);
      }
      if (vars && Object.prototype.hasOwnProperty.call(vars, raw)) toks.push({ t: 'var', v: raw, i, j: i + raw.length });
      else if (raw === 'T' && last?.t === 'op' && last.v === '^') toks.push({ t: 'tr', i, j: i + 1 }); // x^T: la transpuesta
      else if (name in FUNCS || name in MULTI || name in CONSTS || LAZY.has(name)) toks.push({ t: 'id', v: name, i, j: i + raw.length });
      else if (loose) toks.push({ t: 'var', v: raw, i, j: i + raw.length });
      else if (FUTURE_VARS.has(raw)) throw new Error(`${reservedWhy(raw)} (todavía no tiene valor)`);
      else throw new Error(`No reconozco «${raw}»` + (/\d/.test(raw) || raw.length === 1 ? ' (no hay una cota con ese nombre)' : ''));
      i += raw.length; continue;
    }
    if (c === '*' && src[i + 1] === '*') { toks.push({ t: 'op', v: '^', i, j: i + 2 }); i += 2; continue; }
    if (c === '[') depth++; else if (c === ']') depth = Math.max(0, depth - 1);
    if ('+-*/^()[]×÷·−'.includes(c)) { toks.push({ t: 'op', v: c === '×' || c === '·' ? '*' : c === '÷' ? '/' : c === '−' ? '-' : c, i, j: i + 1 }); i++; continue; }
    throw new Error(`Carácter no válido «${c}»`);
  }
  return toks;
}

// Variables que usa una formula (nombres que no son numeros, funciones ni constantes).
export function exprRefs(src) {
  try { return [...new Set(tokenize(String(src ?? ''), null, true).filter((k) => k.t === 'var').map((k) => k.v))]; } catch (e) { return []; }
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
  if (!isM(a) || !isM(b)) throw new Error(`No se puede ${s > 0 ? 'sumar' : 'restar'} un número y ${nameM(isM(a) ? a : b)}`);
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

export function evalExpr(src, { radians = false, vars = null, allowMat = false } = {}) {
  const toks = tokenize(String(src ?? ''), vars);
  if (!toks.length) throw new Error('Escribe un valor');
  let p = 0;
  const peek = () => toks[p];
  const isOp = (v) => peek()?.t === 'op' && peek().v === v;
  const startsFactor = () => { const k = peek(); return k && (k.t === 'num' || k.t === 'id' || k.t === 'var' || k.t === 'sqrt' || (k.t === 'op' && (k.v === '(' || k.v === '['))); };
  const bin = (a, b, v) => ({ v, r: a.r || b.r });

  // comparacion (la de menor precedencia): da 1 si se cumple y 0 si no. «==» y «!=» toleran el error de redondeo.
  function cmp() {
    const a = expr(), k = peek();
    if (!k || k.t !== 'cmp') return a;
    p++;
    const b = expr();
    if (isM(a) || isM(b)) throw new Error('No se pueden comparar vectores o matrices');
    const x = a.v, y = b.v, eq = Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(x), Math.abs(y));
    const ok = { '<': x < y && !eq, '>': x > y && !eq, '<=': x < y || eq, '>=': x > y || eq, '==': eq, '!=': !eq }[k.v];
    return { v: ok ? 1 : 0, r: false };
  }
  // argumento de una rama de si(): si falla por un calculo imposible (1/0, raiz negativa) se guarda el error y se salta
  // hasta el final del argumento: solo importa si esa rama es la elegida
  function branch() {
    const start = p;
    try { return cmp(); } catch (e) {
      if (!e.rt) throw e;
      let d = 0;
      for (p = start; p < toks.length; p++) {
        const t = toks[p];
        if (t.t === 'op' && t.v === '(') d++;
        else if (t.t === 'op' && t.v === ')') { if (d === 0) break; d--; } else if (t.t === 'sep' && d === 0) break;
      }
      return { err: e };
    }
  }
  function call(name, A) {
    if (LAZY.has(name)) {
      if (A.length !== 3) throw new Error('si(condición; si_verdadero; si_falso) lleva 3 valores separados por «;»');
      const pick = A[0].v !== 0 ? A[1] : A[2];
      if (pick.err) throw pick.err;
      return pick;
    }
    if (A.some((a) => isM(a))) throw new Error(`«${name}» todavía no acepta vectores ni matrices`);
    const sep = ' (sepáralos con «;»: «2,5» es un solo número)';
    if (name in FUNCS) {
      if (A.length !== 1) throw new Error(`«${name}» recibe un solo valor`);
      return { v: FUNCS[name](A[0].v, A[0].r || radians, radians), r: MAKE_RAD.has(name) || (KEEP_RAD.has(name) && A[0].r) };
    }
    const M = MULTI[name], [lo, hi] = [M.n[0], M.n[1] ?? Infinity];
    if (A.length < lo || A.length > hi) throw new Error(`«${name}» recibe ${hi === Infinity ? `${lo} valores o más` : lo === hi ? `${lo} valores` : `${lo} o ${hi} valores`}${sep}`);
    return M.f(A, radians);
  }

  function expr() {
    let a = term();
    while (isOp('+') || isOp('-')) { const o = toks[p++].v, s = o === '+' ? 1 : -1; const b = term(); a = isM(a) || isM(b) ? addM(a, b, s) : bin(a, b, a.v + s * b.v); }
    return a;
  }
  function term() {
    let a = unary();
    for (;;) {
      if (isOp('*') || isOp('/')) {
        const o = toks[p++].v; const b = unary();
        if (o === '/') {
          if (isM(b)) throw new Error('No se puede dividir entre un vector o una matriz');
          if (b.v === 0) throw rt('División entre cero');
          a = isM(a) ? mapM(a, (x) => x / b.v) : bin(a, b, a.v / b.v);
        } else a = isM(a) || isM(b) ? mulM(a, b) : bin(a, b, a.v * b.v);
      } else if (startsFactor()) { const b = unary(); a = isM(a) || isM(b) ? mulM(a, b) : bin(a, b, a.v * b.v); } // multiplicacion implicita: 2π, 3(4+1)
      else return a;
    }
  }
  function unary() {
    if (isOp('-')) { p++; const a = unary(); return isM(a) ? mapM(a, (x) => -x) : { v: -a.v, r: a.r }; }
    if (isOp('+')) { p++; return unary(); }
    return power();
  }
  function power() {
    const a = primary();
    if (isOp('^')) {
      p++;
      if (peek()?.t === 'tr') { p++; return isM(a) ? transposeM(a) : a; } // x^T
      const b = unary();
      if (isM(a) || isM(b)) throw new Error('La potencia de un vector o una matriz todavía no está disponible (^T es la transpuesta)');
      return { v: Math.pow(a.v, b.v), r: a.r };
    }
    return a;
  }
  function primary() {
    const k = toks[p++];
    if (!k) throw new Error('Expresión incompleta');
    if (k.t === 'num') return { v: k.v, r: false };
    if (k.t === 'var') {
      const x = vars[k.v];
      if (x.mat) return { m: x.mat };
      if (x.vec) return { m: [x.vec] };
      return { v: x.v, r: !!x.r };
    }
    if (k.t === 'sqrt') { const a = primary(); if (isM(a)) throw new Error('«√» todavía no acepta vectores ni matrices'); if (a.v < 0) throw rt('Raíz de un número negativo'); return { v: Math.sqrt(a.v), r: a.r }; }
    if (k.t === 'op' && k.v === '[') { // matriz: [1, 2, 3] (fila) o [1, 2; 3, 4] (filas separadas por «;»)
      if (isOp(']')) throw new Error('Una matriz no puede estar vacía');
      const rows = [[]];
      for (;;) {
        const a = cmp();
        if (isM(a)) throw new Error('Los elementos de una matriz son números');
        rows.at(-1).push(a.v);
        const s = peek();
        if (s?.t === 'sep') { p++; if (s.c === ';') rows.push([]); continue; }
        break;
      }
      if (!isOp(']')) throw new Error('Falta cerrar un corchete');
      p++;
      if (rows.some((r) => r.length !== rows[0].length)) throw new Error('Todas las filas de una matriz deben tener el mismo número de elementos');
      if (rows.length * rows[0].length > 10000) throw new Error('Una matriz admite hasta 10000 elementos');
      return { m: rows };
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
      const A = [];
      if (isOp(')')) throw new Error(`«${k.v}» necesita al menos un valor`);
      for (;;) {
        A.push(LAZY.has(k.v) && A.length ? branch() : cmp());
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
    return { mat: res.m, value: NaN, rad: false };
  }
  if (!Number.isFinite(res.v)) throw new Error('El resultado no es un número');
  return { value: res.v, rad: res.r };
}

// ¿El texto es un numero sin mas? (entonces no se guarda como formula)
export const isPlainNumber = (s) => /^\s*[-+]?(\d+([.,]\d+)?|[.,]\d+)\s*$/.test(String(s));

// Valor numerico de lo que escribio el usuario; angle: lo que viene de π se pasa de radianes a grados.
// radians: la cota angular se escribe en radianes (los numeros y sin/cos/tan van en radianes); si no, en grados.
export function parseValue(src, { angle = false, radians = false, vars = null } = {}) {
  const { value, rad } = evalExpr(src, { radians: angle && radians, vars });
  return Number((angle && (rad || radians) ? value * TAU_DEG : value).toPrecision(12));
}
