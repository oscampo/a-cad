// Variables definidas en los textos: «nombre:valor» (dentro de una formula) asigna a «nombre» el valor de una expresion (sin DOM).
// Se leen en el orden de la pagina (arriba a abajo, izquierda a derecha; ver textOrder): una variable vale lo de su ultima definicion anterior,
// y las cotas ven lo que valen al final. El valor puede usar cotas y variables definidas antes. El texto la muestra en cursiva como «nombre:=valor».
import { argChar, decimalMode } from './locale.js';
const paramSep = () => (decimalMode() === ',' ? /;/ : /[;,]/); // parametros de una funcion: con coma decimal solo «;»
import { evalExpr, convertExpr, setAngleMode, angleRad, exprRefs, isReservedName, reservedWhy, TEXT_NAME_RE, NAME_RE, normName } from './expr.js';
import { splitMath } from './mathlayout.js';
import { parseUnit, sameDim, unitMsg, setUserUnits, addUserUnit, onDocUnits, unitsVersion, UNIT_NAME_RE } from './units.js';
import { solveEqs, splitEq, eqResiduals } from './nsolve.js';
// Tolerancia de una meta sobre el dibujo («solve(D5 == 40'mm; D1)=»): el solver geometrico no es exacto.
export const GOAL_TOL = 1e-6;

// Marcas de cursiva dentro de un texto ya expandido (caracteres de uso privado: no se escriben a mano).
export const IT0 = '', IT1 = '';
// Vector de un texto dentro de una formula ($...$): lo que va entre VB0 y VB1 se dibuja como vector fila; en un texto plano solo se ven los corchetes.
export const VB0 = '', VB1 = '';
// Nombre de variable con subindice dentro de una formula: lo que va entre NM0 y NM1 se dibuja como nombre (cursiva) con el subindice como texto.
export const NM0 = '', NM1 = '';
const MARKS = /[-]/g;
const VBM = /[-]/g;
export const plainText = (s) => String(s).replace(MARKS, '');
// Tramos de una linea: [{ s, it }] (it: cursiva).
export function runsOf(line) {
  line = String(line).replace(VBM, '');
  if (!/[]/.test(line)) return [{ s: line, it: false }];
  const out = [];
  let it = false, cur = '';
  for (const ch of line) {
    if (ch === IT0 || ch === IT1) { if (cur) out.push({ s: cur, it }); cur = ''; it = ch === IT0; } else cur += ch;
  }
  if (cur) out.push({ s: cur, it });
  return out;
}

// ---- Calculo en los textos (estilo SMath) ----
// Solo dentro de una formula ($...$ o $$...$$; la entrada por defecto es una formula), un enunciado por linea:
//  «x:valor» asigna (se dibuja «x:=valor»; tambien se acepta «x:=valor»), «f(x; y):expr» define una funcion, «x:0..1;10» un rango;
//  «expr=» al final pide el valor (se dibuja «expr=valor»; no cuentan «==», «<=», «>=», «!=» ni «:=»);
//  «x:expr=» hace las dos cosas: asigna y muestra el valor (se dibuja «x:=expr=valor»; en una funcion el «=» final no cuenta);
//  `...` entre acentos graves es un literal: se dibuja como formula pero nunca se calcula (`f:RR->RR`). Parte la linea en trozos y cada
//  trozo de codigo entre literales es un enunciado aparte. Un acento grave sin cierre queda tal cual con ⚠.
// El texto plano (lo que va fuera de $...$) se dibuja caracter por caracter: ahi nada se calcula.
// Nombre: letras, numeros y _, con un subindice de texto opcional «var_(texto)».
export const NAME_SRC = '[A-Za-zα-ωΑ-Ωϑϕϖɛ_][A-Za-z0-9α-ωΑ-Ωϑϕϖɛ_]*?(?:_\\([^(){}\\n]+\\))?';
const DEF_LINE = new RegExp('^(\\s*)(' + NAME_SRC + ')(?:\\(([^()\\n]*)\\))?(\\s*:=?)([\\s\\S]*?)(\\s*)$');
const OUT_LINE = /^(\s*)([\s\S]*?\S)(\s*)=(\s*)$/;
// Un trozo de codigo: { k:'def', pre, name, params, sep, expr, eq, post } | { k:'out', pre, expr, mid, post } | { k:'code', s }.
// eq: en «x:expr=», lo que sigue a la expresion («=» con sus espacios); asigna y ademas muestra el valor.
const EQ_TAIL = /^([\s\S]*?\S)(\s*=)$/;
// «x:valor'unidad»: el valor (sin unidades) va en esa unidad; si ya trae unidades, se muestra en ella (deben ser de la misma magnitud).
// Tambien en una salida: «F='kN». uq: «'unidad» tal como se escribio. Si lo de antes ya lleva «'» («2'kN+300'N»), no es una cola: son unidades dentro de la expresion.
const OUT_UNIT = /^(\s*)([\s\S]*?\S)(\s*)=(\s*'\s*([^'"`=\s](?:[^'"`=]*[^'"`=\s])?))(\s*)$/;
const UNIT_TAIL = /^([\s\S]*?\S)(\s*'\s*([^'"`=\s](?:[^'"`=]*[^'"`=\s])?))$/;
const unitOk = (u) => { try { parseUnit(u); return true; } catch (e) { return false; } }; // «(250'N)/m» no es «(250» en «N)/m»
function stmtOf(s) {
  let m = DEF_LINE.exec(s);
  if (m && m[5].trim()) {
    const d = { k: 'def', pre: m[1], name: m[2], params: m[3], sep: m[4], expr: m[5], post: m[6] };
    const e = EQ_TAIL.exec(m[5]); // tambien en una funcion: «f(x):x^2=» define f y muestra f(x) con las variables de ese punto
    if (e && !/[<>=!:≤≥≠]$/.test(e[1])) { d.expr = e[1]; d.eq = e[2]; }
    const u = d.params === undefined ? UNIT_TAIL.exec(d.expr) : null;
    if (u && !u[1].includes("'") && unitOk(u[3])) { d.expr = u[1]; d.uq = u[2]; d.unit = u[3]; }
    return d;
  }
  m = OUT_UNIT.exec(s);
  if (m) return { k: 'out', pre: m[1], expr: m[2], mid: m[3], uq: m[4], unit: m[5], post: m[6] };
  m = OUT_LINE.exec(s);
  if (m && !/[<>=!:≤≥≠]$/.test(m[2])) return { k: 'out', pre: m[1], expr: m[2], mid: m[3], post: m[4] };
  return { k: 'code', s };
}
// Trozos de una linea de formula: literales `...` ({ k:'lit', s, closed }) y codigo (ver stmtOf).
export function calcPieces(line) {
  const out = [];
  let i = 0;
  for (;;) {
    const j = line.indexOf('`', i);
    const code = line.slice(i, j < 0 ? line.length : j);
    if (code) out.push(stmtOf(code));
    if (j < 0) break;
    const k = line.indexOf('`', j + 1);
    if (k < 0) { out.push({ k: 'lit', s: line.slice(j + 1), closed: false }); break; }
    out.push({ k: 'lit', s: line.slice(j + 1, k), closed: true });
    i = k + 1;
  }
  return out;
}
export const pieceSrc = (p) => (p.k === 'lit' ? '`' + p.s + (p.closed ? '`' : '') : p.k === 'code' ? p.s
  : p.k === 'def' ? p.pre + p.name + (p.params !== undefined ? '(' + p.params + ')' : '') + p.sep + p.expr + (p.uq ?? '') + (p.eq ?? '') + p.post : p.pre + p.expr + p.mid + '=' + (p.uq ?? '') + p.post);
// Filtro rapido: ¿puede llevar enunciados?
export const hasCalc = (s) => typeof s === 'string' && s.includes('$') && /[:=]/.test(s);
// Un texto partido en tramos: { t:'txt', raw } y { t:'math', disp, lines: [[trozo]] }. calcSrc lo vuelve a escribir tal cual.
const PARSED = new Map();
export function calcParse(s) {
  s = String(s ?? '');
  let r = PARSED.get(s);
  if (r) return r;
  r = splitMath(s).map((tk) => {
    if (tk.t === 'txt') return { t: 'txt', raw: tk.raw };
    const conts = [], src = tk.src.replace(CONT, (m) => (conts.push(m), CONT_MARK));
    return { t: 'math', disp: tk.disp, lines: src.split('\n').map(calcPieces), ...(conts.length ? { conts } : {}) };
  });
  if (PARSED.size > 2000) PARSED.clear();
  PARSED.set(s, r);
  return r;
}
export const calcSrc = (toks) => toks.map((tk) => (tk.t === 'txt' ? tk.raw : (tk.disp ? '$$' : '$') + contBack(tk, tk.lines.map((l) => l.map(pieceSrc).join('')).join('\n')) + (tk.disp ? '$$' : '$'))).join('');
// Una formula larga sigue en la linea siguiente como en Python: «...» al final de una linea (y, si se quiere, al comienzo de la
// siguiente). Para calcular, las dos lineas son un solo enunciado: el corte se cambia por CONT_MARK (un espacio para el calculo);
// tk.conts guarda los cortes tal como estaban y contBack los devuelve al reescribir o mostrar la formula.
const CONT = /[ \t]*\.\.\.[ \t]*\n[ \t]*(?:\.\.\.)?[ \t]*/g;
export const CONT_MARK = '　';
export const contBack = (tk, s) => { let i = 0; return tk.conts ? s.replace(/　/g, () => tk.conts[i++] ?? ' ') : s; };
// Enunciados (asignaciones y salidas) de un texto, en orden.
export const calcStmts = (s) => (hasCalc(s) ? calcParse(s).flatMap((tk) => (tk.t === 'math' ? tk.lines.flat().filter((p) => p.k === 'def' || p.k === 'out') : [])) : []);

// ---- Cambio de indicador decimal (doc.decimal): reescribe las expresiones de un texto de calculo ----
// Un rango «x:0.5..2,10» (punto) o «x:0,5..2;10» (coma) se convierte parte por parte, con el separador de «n» del indicador nuevo; los parametros de una funcion se separan con el separador nuevo.
const convRange = (expr, from, to) => {
  if (!expr.includes('..')) return convertExpr(expr, from, to);
  const p = expr.split('..'), cv = (q) => convertExpr(q, from, to);
  if (p.length === 2) { const q = splitRangeN(p[1], from); return q.length === 2 ? cv(p[0]) + '..' + cv(q[0]) + rangeSep(to) + cv(q[1]) : expr; }
  return p.map(cv).join('..');
};
export function convertCalcText(s, from, to) {
  if (!hasCalc(s) || from === to) return s;
  const piece = (p) => (p.k === 'def' ? { ...p, expr: convRange(p.expr, from, to), ...(p.params !== undefined ? { params: p.params.split(from === ',' ? /;/ : /[;,]/).map((q) => q.trim()).join(argChar(to) + ' ') } : {}) }
    : p.k === 'out' ? { ...p, expr: convRange(p.expr, from, to) } : p);
  return calcSrc(calcParse(s).map((tk) => (tk.t === 'math' ? { ...tk, lines: tk.lines.map((l) => l.map(piece)) } : tk)));
}

// ---- Migracion de la sintaxis anterior (antes de la v2): «x{=valor}» y «[=expr]» ----
const OLD_RE = () => new RegExp('(' + NAME_SRC + ')(?:\\(([^(){}\\n]*)\\))?\\{=([^}]*)\\}|\\[=((?:[^\\[\\]]|\\[[^\\[\\]]*\\])*)\\]', 'g');
const oldStmt = (m) => (m[1] !== undefined ? m[1] + (m[2] !== undefined ? '(' + m[2].trim() + ')' : '') + ':' + m[3].trim() : m[4].trim() + '=');
const litOf = (x) => { // lo que no es enunciado pasa a literal `...` (los espacios de los bordes quedan fuera)
  const a = x.match(/^\s*/)[0], c = x.slice(a.length).trimEnd();
  return c ? a + '`' + c + '`' + x.slice(a.length + c.length) : x;
};
// Lo que precede a una salida vieja: «e = [=e]» ya se escribe «e=», asi que la «e =» de delante sobra (no repetir la expresion).
const dropEcho = (pre, m) => {
  if (m[4] === undefined) return pre;
  const e = m[4].trim(), k = pre.trimEnd();
  const body = k.endsWith('=') ? k.slice(0, -1).trimEnd() : '';
  return e && body.endsWith(e) && !/[\p{L}\p{N}_.]/u.test(body[body.length - e.length - 1] ?? '') ? body.slice(0, body.length - e.length) : pre;
};
// Un texto con la sintaxis anterior, escrito con la nueva: en el texto plano cada definicion o salida pasa a ser una formula («$x:v$», «$e=$»);
// dentro de una formula cada una queda en su sitio y lo demas de esa linea pasa a literal `...` (para que no se calcule). Una linea de formula
// sin nada que migrar que ahora se leeria como enunciado (p. ej. «a:b» o «x=») pasa entera a literal.
export function migrateCalc(s) {
  if (typeof s !== 'string' || !(s.includes('{=') || s.includes('[=') || hasCalc(s))) return s;
  return splitMath(s).map((tk) => {
    if (tk.t === 'txt') {
      const src = tk.raw;
      let res = '', last = 0;
      for (const m of src.matchAll(OLD_RE())) {
        const end = m.index + m[0].length;
        res += dropEcho(src.slice(last, m.index), m) + '$' + oldStmt(m) + '$' + (/\d/.test(src[end] ?? '') ? ' ' : ''); // un digito pegado detras se separa
        last = end;
      }
      return res + src.slice(last);
    }
    const lines = tk.src.split('\n').map((ln) => {
      const ms = [...ln.matchAll(OLD_RE())];
      if (!ms.length) return calcPieces(ln).some((p) => p.k === 'def' || p.k === 'out') ? litOf(ln) : ln;
      let res = '', last = 0;
      for (const m of ms) {
        res += litOf(dropEcho(ln.slice(last, m.index), m)) + oldStmt(m); last = m.index + m[0].length;
      }
      return res + litOf(ln.slice(last));
    });
    return (tk.disp ? '$$' : '$') + lines.join('\n') + (tk.disp ? '$$' : '$');
  }).join('');
}
// Un dibujo anterior a la v2 (sin doc.calc): migra sus textos una sola vez. Devuelve cuantos textos cambiaron.
export const CALC_VERSION = 2;
export function migrateCalcDoc(doc) {
  if (!doc || doc.calc >= CALC_VERSION) return 0;
  let n = 0;
  for (const t of Object.values(doc.texts || {})) { const s = migrateCalc(t.text); if (s !== t.text) { t.text = s; n++; } }
  doc.calc = CALC_VERSION;
  return n;
}

// Rangos (vectores de numeros igualmente espaciados): «x:inicio..fin;n» (n elementos entre inicio y fin, ambos incluidos) y
// «x:inicio..paso..fin» (inicio, inicio+paso, ... sin pasar de fin). Cada parte puede ser una formula.
// Devuelve { kind: 'n'|'step', parts } o null si la definicion no es un rango. Un decimal «1.5» no cuenta como «..».
// El separador de «fin» y «n»: «;» siempre; «,» tambien con punto decimal (la coma, a nivel de la expresion, no es parte de un parentesis ni de un decimal).
export const rangeSep = (m = decimalMode()) => (m === '.' ? ',' : ';');
export function splitRangeN(s, mode = decimalMode()) {
  const out = []; let d = 0, cur = '';
  for (const ch of s) {
    if ('([{'.includes(ch)) d++; else if (')]}'.includes(ch)) d--;
    if (d === 0 && (ch === ';' || (ch === ',' && mode === '.'))) { out.push(cur); cur = ''; } else cur += ch;
  }
  return [...out, cur];
}
export function parseRange(src) {
  const s = String(src ?? '');
  if (!s.includes('..')) return null;
  const p = s.split('..');
  if (p.length === 2) { const q = splitRangeN(p[1]); return q.length === 2 ? { kind: 'n', parts: [p[0], q[0], q[1]] } : { kind: 'bad', parts: [] }; }
  if (p.length === 3) return { kind: 'step', parts: p };
  return { kind: 'bad', parts: [] };
}
export const MAX_RANGE = 10000;
// Elementos del rango; ev evalua cada parte a un numero.
export function rangeValues(rg, ev) {
  if (rg.kind === 'bad') throw new Error(`un rango se escribe inicio..fin${rangeSep(decimalMode() ?? ',')}n o inicio..paso..fin`);
  const [a, b, c] = rg.parts.map(ev);
  const out = [];
  if (rg.kind === 'n') { // a..b;c  ->  c elementos
    if (!Number.isInteger(c) || c < 1) throw new Error('n debe ser un entero de 1 o más');
    if (c > MAX_RANGE) throw new Error(`un rango admite hasta ${MAX_RANGE} elementos`);
    for (let i = 0; i < c; i++) out.push(c === 1 ? a : a + ((b - a) * i) / (c - 1));
    return out;
  }
  const step = b, span = c - a; // a..paso..c
  if (step === 0) { if (span === 0) return [a]; throw new Error('el paso no puede ser 0'); }
  if (span !== 0 && Math.sign(span) !== Math.sign(step)) throw new Error('el paso lleva el sentido contrario al de inicio a fin');
  const n = Math.floor(span / step + 1e-9) + 1;
  if (n > MAX_RANGE) throw new Error(`un rango admite hasta ${MAX_RANGE} elementos`);
  for (let i = 0; i < n; i++) out.push(a + step * i);
  return out;
}

// ---- Orden de lectura y solucion ----
// La pagina se lee en orden: de arriba a abajo y, en una misma fila, de izquierda a derecha; dentro de un texto, linea por linea. Una variable vale lo
// que se le dio en la ultima definicion que se leyo ANTES (arriba o a la izquierda): se puede redefinir, y cada salida o definicion posterior usa
// el valor nuevo. Una variable que aun no se definio no existe (avisa de que se define mas abajo). Como en SMath.
// Los textos se ordenan por su esquina superior izquierda (aproximada: caja segun el punto de insercion, el ancla, la altura y las lineas).
// Las cotas con formula tambien van en la pagina: se leen en el lugar de su etiqueta y ven las variables tal como estaban ahi (probes: [{ id, x, y, len }]).
// Las graficas igual, en su esquina superior izquierda (probes: [{ id, top, left }]).
const ROW_TOL = 0.5; // dos elementos estan en la misma fila si sus bordes superiores difieren menos de esta fraccion de su altura
function readingItems(doc, probes = []) {
  const items = [];
  let n = 0;
  for (const [tid, t] of Object.entries(doc.texts || {})) {
    const s = String(t.text ?? '');
    if (!calcStmts(s).length) continue;
    const P = doc.pts?.[t.pt] || { x: 0, y: 0 }, h = t.h > 0 ? t.h : 1, lines = s.split('\n');
    const hh = lines.length * 1.2 * h, w = Math.max(1, ...lines.map((l) => l.length)) * 0.55 * h, an = t.anchor || 'bl';
    items.push({ tid, t, h, n: n++, top: P.y + { t: 0, m: hh / 2, b: hh }[an[0]], left: P.x - { l: 0, c: w / 2, r: w }[an[1]] });
  }
  if (probes.length) {
    const hs = items.map((i) => i.h).sort((a, b) => a - b), hm = hs.length ? hs[hs.length >> 1] : 1; // una cota pesa como un texto de altura tipica
    // una gráfica da su esquina superior izquierda (top, left); una cota, el centro de su etiqueta (x, y, len)
    for (const p of probes) items.push({ probe: p.id, h: hm, n: n++, top: p.top ?? p.y + 0.6 * hm, left: p.left ?? p.x - (p.len * 0.55 * hm) / 2 });
  }
  items.sort((a, b) => b.top - a.top || a.n - b.n);
  const rows = [];
  for (const it of items) {
    const row = rows.at(-1);
    if (row && row[0].top - it.top < ROW_TOL * Math.min(row[0].h, it.h)) row.push(it); else rows.push([it]);
  }
  return rows.flatMap((r) => r.sort((a, b) => a.left - b.left || a.n - b.n));
}
// Los textos (con definiciones o salidas) en orden de lectura: [[id, texto]].
export const textOrder = (doc) => readingItems(doc).map((it) => [it.tid, it.t]);

// Definiciones, salidas y cotas de toda la pagina, en orden de lectura: [{ kind: 'def'|'out'|'dim', tid, idx, ... }]. idx: lugar de esa clase dentro de su texto.
function readingEvents(doc, probes = []) {
  const out = [];
  for (const it of readingItems(doc, probes)) {
    if (it.probe !== undefined) { out.push({ kind: 'dim', id: it.probe }); continue; }
    let di = 0, oi = 0;
    for (const p of calcStmts(it.t.text)) {
      if (p.k === 'def') out.push({ kind: 'def', tid: it.tid, idx: di++, name: normName(p.name), expr: p.expr.trim(), params: p.params === undefined ? null : p.params.split(paramSep()).map((q) => normName(q.trim())), ...(p.eq !== undefined && p.params !== undefined ? { eq: true } : {}), ...(p.unit ? { unit: p.unit } : {}) });
      else out.push({ kind: 'out', tid: it.tid, idx: oi++, expr: p.expr });
    }
  }
  return out;
}
// Definiciones de todos los textos, en orden de lectura: [{ tid, idx, name, expr, params }].
export const textDefs = (doc) => readingEvents(doc).filter((e) => e.kind === 'def');

// Estado de las variables de texto, leyendo la pagina en orden. dimVars: variables de las cotas ({ nombre: { v, r } }); dimNames: nombres de TODAS las
// cotas (aunque alguna se excluya de dimVars). Devuelve:
//  vals: { nombre: valor } lo que vale cada variable (o funcion, { fn }) al final de la pagina (lo que ven las cotas)
//  errs: Map(nombre -> motivo) de las definiciones que fallan
//  bad: Set('tid:idx') de las definiciones que no valen (nombre reservado, de una cota, invalido, o que fallan)
//  names: Set con los nombres de las definiciones validas (aunque fallen)
//  defs: las definiciones (en orden de lectura); win: Map(nombre -> su ultima definicion); byName: Map(nombre -> todas sus definiciones)
//  defVal: Map('tid:idx' -> valor que esa definicion dio); outEnv: Map('tid:idx' -> variables que ve esa salida «expr=»)
//  fnEnv: Map('tid:idx' -> variables que ve «f(x):expr=», para mostrar f(x) ahi mismo)
//  dimEnv: Map(id de cota -> variables de texto que ve esa cota en su lugar de la pagina)
// «x:expr'unidad»: si expr no lleva unidades, vale expr en esa unidad; si las lleva, deben ser de la misma magnitud y se muestra en ella (pu, pf: unidad y su factor al SI).
// Si no cuadran, se prueba la unidad como parte de la expresion («L1+3'mm» es L1 + 3 mm). Un vector o una matriz lleva una sola unidad
// para todos sus elementos («v:[1, 2, 3]'mm»).
export function evalDef(expr, unit, vars) {
  const all = (s) => evalExpr(s, { vars, allowMat: true });
  if (!unit) return all(expr);
  const u = parseUnit(unit);
  let r;
  try { r = all(expr); } catch (e) {
    try { return finish(all(expr + "'" + unit)); } catch (e2) { throw e; } // «L1+3'mm»: 3 sin unidades no se suma a L1, 3 mm si
  }
  function finish(w) { return w.dim && sameDim(w.dim, u.d) ? { ...w, pu: unit, pf: u.f } : w; }
  const fit = withUnit(r, unit, u);
  if (fit) return fit;
  let w = null;
  try { w = all(expr + "'" + unit); } catch (e) { /* no cuadra de ninguna forma */ }
  if (w && w.dim) return finish(w);
  throw new Error(`da ${unitMsg(r.dim)}, que no se puede expresar en ${unit} (${unitMsg(u.d)})`);
}
// La cola «'unidad» sobre un valor ya calculado: sin unidades, vale el valor en esa unidad; con la misma magnitud, solo dice en que unidad
// mostrarlo; si no cuadra, null.
function withUnit(r, unit, u) {
  if (!r.dim) return r.mat ? { ...r, mat: r.mat.map((row) => row.map((x) => x * u.f)), dim: u.d, pu: unit, pf: u.f } : { value: r.value * u.f, rad: r.rad || !!u.r, dim: u.d, pu: unit, pf: u.f };
  return sameDim(r.dim, u.d) ? { ...r, pu: unit, pf: u.f } : null;
}
// Un rango, con unidades si las llevan sus extremos («0'mm..10'mm;5») o la cola («0..10;5'mm»).
export function evalRangeDef(rg, unit, vars) {
  const dims = [], vec = rangeValues(rg, (s) => { const w = evalExpr(s, { vars }); dims.push(w.dim); return w.value; });
  const ends = rg.kind === 'n' ? [dims[0], dims[1]] : dims; // en «a..b;n», n es un numero sin unidades
  if (rg.kind === 'n' && dims[2]) throw new Error('n (el número de elementos) va sin unidades');
  if (ends.some((d) => !sameDim(d, ends[0]))) throw new Error(`los extremos${rg.kind === 'step' ? ' y el paso' : ''} deben tener las mismas unidades (hay ${ends.map(unitMsg).join(', ')})`);
  const r = { mat: [vec], value: NaN, rad: false, dim: ends[0] };
  if (!unit) return r;
  const u = parseUnit(unit), fit = withUnit(r, unit, u);
  if (!fit) throw new Error(`da ${unitMsg(r.dim)}, que no se puede expresar en ${unit} (${unitMsg(u.d)})`);
  return fit;
}
let memoKey = null, memoSt = null;
// Unidades de usuario: una linea de un texto de calculo «1'vuelta:2π'rad», «1.70'm:1'persona» o «1'persona:'persona» (una unidad base
// nueva). Es una igualdad entre dos cantidades con exactamente una unidad nueva, en cualquiera de los dos lados; valen en todo el
// documento (no siguen el orden de lectura) y no aceptan prefijos. No puede redefinir una unidad que ya existe (con o sin prefijo: «mm»).
const UDEF_RE = /^\s*([^:']*?)\s*'\s*([^:']+?)\s*:\s*([^:']*?)\s*'\s*([^:']+?)\s*$/;
export const unitDefOf = (s) => { const m = UDEF_RE.exec(String(s ?? '')); return m ? { lb: m[1], lu: m[2].trim(), rb: m[3], ru: m[4].trim() } : null; };
let UKEY = null;
export const UDEF_ERR = new Map(); // linea de la definicion -> motivo por el que no vale
export function syncUserUnits(doc) {
  const srcs = [];
  for (const t of Object.values(doc?.texts || {})) {
    const x = String(t.text ?? '');
    if (!x.includes("'") || !x.includes(':') || !x.includes('$')) continue;
    for (const tk of calcParse(x)) if (tk.t === 'math') for (const l of tk.lines) for (const p of l) if (p.k === 'code' && unitDefOf(p.s)) srcs.push(p.s.trim());
  }
  const key = srcs.join('\n');
  if (key === UKEY) return;
  const had = UKEY !== null && UKEY !== '';
  UKEY = key; UDEF_ERR.clear(); setUserUnits([]);
  if (!srcs.length) { if (had) PARSED.clear(); return; }
  const known = (u) => { try { parseUnit(u); return true; } catch (e) { return false; } };
  const num = (b) => { const s = b.trim(); if (!s) return 1; const r = evalExpr(s, {}); if (r.dim || !(r.value > 0)) throw new Error(`«${s}» debe ser un número mayor que cero`); return r.value; };
  const ok = [], by = new Map(), dup = new Set();
  let pending = srcs.map((s) => ({ s, ...unitDefOf(s) })), progress = true;
  const done = (d, msg) => { if (msg) UDEF_ERR.set(d.s, msg); pending = pending.filter((x) => x !== d); progress = true; };
  while (progress && pending.length) {
    progress = false;
    for (const d of [...pending]) {
      try {
        if (d.lu === d.ru && !d.rb.trim()) { // «1'persona:'persona»: una unidad base nueva
          if (!UNIT_NAME_RE.test(d.lu)) { done(d, `«${d.lu}» no es un nombre de unidad (letras, _ y números, sin empezar por número)`); continue; }
          if (known(d.lu)) { if (by.has(d.lu)) dup.add(d.lu); done(d, `La unidad «${d.lu}» ya existe`); continue; }
          const u = { name: d.lu, base: true }; addUserUnit(u); ok.push(u); by.set(d.lu, d.s); done(d); continue;
        }
        const kl = known(d.lu), kr = known(d.ru);
        if (kl && kr) { for (const n of [d.lu, d.ru]) if (by.has(n)) dup.add(n); done(d, `«${d.lu}» y «${d.ru}» ya existen: una definición de unidad necesita una unidad nueva`); continue; }
        if (!kl && !kr) continue; // quiza la define otra linea: se reintenta en la siguiente vuelta
        const [n, nb, ou, ob] = kl ? [d.ru, d.rb, d.lu, d.lb] : [d.lu, d.lb, d.ru, d.rb];
        if (!UNIT_NAME_RE.test(n)) { done(d, `«${n}» no es un nombre de unidad (letras, _ y números, sin empezar por número)`); continue; }
        const o = parseUnit(ou), f = (num(ob) * o.f) / num(nb);
        const u = { name: n, f, d: o.d, r: o.r }; addUserUnit(u); ok.push(u); by.set(n, d.s); done(d);
      } catch (e) { done(d, e.message); }
    }
  }
  for (const d of pending) UDEF_ERR.set(d.s, `No conozco «${d.lu}» ni «${d.ru}»: una de las dos unidades debe existir`);
  PARSED.clear(); // como se parte «x:5'kg/persona» depende de las unidades que existen: se vuelve a leer
  if (dup.size) { // definida dos veces: ninguna de las dos vale
    for (const n of dup) for (const s of srcs) { const d = unitDefOf(s); if (d.lu === n || d.ru === n) UDEF_ERR.set(s, `La unidad «${n}» se define más de una vez`); }
    setUserUnits(ok.filter((u) => !dup.has(u.name)));
  }
}
onDocUnits(syncUserUnits);

// «clear(all)=» o «clear(a; b)=» (con punto decimal tambien «clear(a, b)=»): borra variables desde ese punto del orden de lectura: las de
// texto (numeros, vectores, matrices, funciones), y tambien una cota o una medida del dibujo («D1», «l3.len»), que deja de leerse mas abajo
// (sigue gobernando el dibujo). «all» borra todo: variables de texto, cotas y medidas del dibujo.
const GEO_NAME_RE = /^[A-Za-z]+\d+\.[A-Za-zα-ωΑ-Ωϑϕϖɛ]\w*$/;
// Devuelve null si la salida no es un clear, o { all } / { names } / { err }.
export function clearCall(expr) {
  const m = /^\s*clear\s*\(([\s\S]*)\)\s*$/i.exec(String(expr ?? ''));
  if (!m) return null;
  const parts = m[1].split(decimalMode() === ',' ? /;/ : /[;,]/).map((s) => s.trim());
  if (parts.length === 1 && parts[0].toLowerCase() === 'all') return { all: true };
  if (parts.some((q) => !q)) return { err: `clear(…) lleva all o nombres de variables separados por «${argChar() === ',' ? ',' : ';'}»` };
  const bad = parts.find((q) => !TEXT_NAME_RE.test(q) && !GEO_NAME_RE.test(q));
  if (bad !== undefined) return { err: `«${bad}» no es un nombre de variable` };
  return { names: parts.map((q) => (GEO_NAME_RE.test(q) ? q : normName(q))) };
}

// Los argumentos de una llamada, separados por «;» (o por «,» con punto decimal) fuera de parentesis y corchetes.
function splitArgs(s, bar = false) {
  const out = [];
  let d = 0, from = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(' || c === '[') d++;
    else if (c === ')' || c === ']') d--;
    else if (d === 0 && (c === ';' || (bar && c === '|' && decimalMode() === ',') || (c === ',' && decimalMode() !== ',' && !(decimalMode() === null && /\d/.test(s[i - 1] || '') && /\d/.test(s[i + 1] || ''))))) { out.push(s.slice(from, i)); from = i + 1; }
  }
  out.push(s.slice(from));
  return out.map((x) => x.trim());
}
// «solve(ec1; ec2; x; y)=»: resuelve las ecuaciones (las que llevan «==») para las incognitas (los nombres sueltos), que deben estar definidas
// antes con su valor inicial; desde ese punto del orden de lectura valen la solucion. Devuelve null si la salida no es un solve, o
// { eqs, names, vec } / { err }. Dos formas: «solve(ec1; ec2; x; y)=» (una lista) o «solve([ec1; ec2], [x; y])=» (dos vectores; en una pagina
// angosta un sistema grande se lee mejor en columnas; con coma decimal, «solve([ec1 | ec2]; [x | y])=»). La salida de la segunda es un vector columna.
const wholeBracket = (q) => {
  if (q[0] !== '[' || q[q.length - 1] !== ']') return false;
  let d = 0;
  for (let i = 0; i < q.length; i++) { if (q[i] === '[') d++; else if (q[i] === ']') { d--; if (d === 0 && i < q.length - 1) return false; } }
  return d === 0;
};
export function solveCall(expr) {
  const m = /^\s*solve\s*\(([\s\S]*)\)\s*$/i.exec(String(expr ?? ''));
  if (!m) return null;
  let parts = splitArgs(m[1]), vec = false;
  if (parts.some(wholeBracket)) { // la forma de dos vectores: [ecuaciones], [incognitas]
    const sep = argChar() === ',' ? ',' : ';';
    if (parts.length !== 2 || !parts.every(wholeBracket)) return { err: `solve([ecuaciones]${sep} [incógnitas]) lleva dos vectores: las ecuaciones (con «==») y los nombres de las incógnitas` };
    const [a, b] = parts.map((q) => splitArgs(q.slice(1, -1), true));
    parts = [...a, ...b]; vec = true;
  }
  const eqs = [], names = [];
  for (const q of parts) {
    if (!q) return { err: `solve(…) lleva las ecuaciones (con «==») y los nombres de las incógnitas, separados por «${argChar() === ',' ? ',' : ';'}»` };
    if (splitEq(q)) eqs.push(q);
    else if (TEXT_NAME_RE.test(q)) names.push(normName(q));
    else return { err: `«${q}» no es una ecuación (le falta «==») ni el nombre de una incógnita` };
  }
  if (!eqs.length) return { err: 'solve(…) necesita al menos una ecuación con «==», p. ej. solve(x^2 == 2; x)' };
  if (!names.length) return { err: 'solve(…) necesita el nombre de las incógnitas, p. ej. solve(x^2 == 2; x)' };
  if (new Set(names).size !== names.length) return { err: 'solve(…) nombra una incógnita dos veces' };
  return { eqs, names, vec };
}

export function textVarState(doc, dimVars = {}, dimNames = new Set(), probes = []) {
  setAngleMode(doc);
  const st = { vals: {}, errs: new Map(), bad: new Set(), names: new Set(), defs: [], win: new Map(), byName: new Map(), defVal: new Map(), outEnv: new Map(), fnEnv: new Map(), dimEnv: new Map(), clearRes: new Map(), cleared: new Set(), dimHide: new Map(), openEnd: new Set(), at: new Map(), solveRes: new Map(), goals: [] };
  const events = readingEvents(doc, probes);
  if (!events.some((e) => e.kind !== 'dim')) return st; // sin definiciones ni salidas: nada que leer
  const key = JSON.stringify([events, dimVars, [...dimNames], angleRad(), unitsVersion()]);
  if (key === memoKey) return memoSt; // las mismas definiciones, posiciones y cotas: el mismo resultado
  const check = (d) => { // ¿vale la definicion? (motivo si no)
    if (isReservedName(d.name)) return reservedWhy(d.name);
    if (!TEXT_NAME_RE.test(d.name)) return `«${d.name}» no es un nombre válido`;
    if (d.params) {
      const ps = d.params, badName = ps.find((q) => !NAME_RE.test(q)), reserved = ps.find((q) => isReservedName(q));
      if (!ps.length || ps.some((q) => !q)) return `«${d.name}(…)»: necesita al menos un parámetro, separados por «;»`;
      if (badName !== undefined) return `«${d.name}(…)»: el parámetro «${badName}» no es un nombre válido`;
      if (new Set(ps).size !== ps.length) return `«${d.name}(…)»: tiene parámetros repetidos`;
      if (reserved !== undefined) return `«${d.name}(…)»: ${reservedWhy(reserved)}`;
    }
    return null;
  };
  const defs = events.filter((e) => e.kind === 'def');
  for (const d of defs) d.why = check(d);
  // Una variable de texto puede llamarse como una cota si se borra con clear() mas abajo: entre su definicion y el clear el nombre es la
  // variable de texto; antes y despues, la cota. openEnd: variables cuya ultima definicion no se borra (siguen vivas al final).
  // Una cota borrada antes con clear() deja libre su nombre: la variable de texto que se define despues no choca con ella (e.freed).
  const open = new Map(), gone = new Set();
  for (const e of events) {
    if (e.kind === 'def' && !e.why) { e.freed = gone.has(e.name); (open.get(e.name) || open.set(e.name, []).get(e.name)).push(e); }
    else if (e.kind === 'out') { const cl = clearCall(e.expr); if (cl?.all) { open.clear(); for (const q of dimNames) gone.add(q); } else if (cl?.names) for (const n of cl.names) { if (open.has(n)) open.delete(n); else if (dimNames.has(n)) gone.add(n); } }
  }
  for (const [n, es] of open) { st.openEnd.add(n); if (dimNames.has(n)) for (const d of es) if (!d.freed) d.why = `«${n}» ya es el nombre de una cota: para usarlo antes en un texto, bórralo con clear(${n}) más abajo`; }
  for (const d of defs) if (!d.why) st.names.add(d.name);
  st.defs = defs;
  const cur = { ...dimVars }, env = st.vals; // cur: lo que ve una expresion en este punto de la lectura (cotas + variables de texto)
  const hid = new Set(); // cotas y medidas del dibujo borradas con clear() hasta este punto: ya no se leen
  const later = st.names; // para avisar «se define mas abajo»
  const hint = (msg) => { const m = /No reconozco «(.+?)»/.exec(msg); return m && later.has(m[1]) && !(m[1] in cur) ? `«${m[1]}» se define más abajo o más a la derecha: en el orden de lectura debe definirse antes` : msg; };
  for (const e of events) {
    const k = e.tid + ':' + e.idx;
    if (e.kind === 'dim') { st.dimEnv.set(e.id, { ...env }); st.dimHide.set(e.id, new Set(hid)); continue; } // una cota ve las variables de texto de este punto de la lectura
    const back = (n) => { delete env[n]; if (n in dimVars && !hid.has(n)) cur[n] = dimVars[n]; else delete cur[n]; };
    if (e.kind === 'out' || e.kind === 'def') st.at.set(k, { live: new Set(Object.keys(env)), expr: e.expr });
    if (e.kind === 'out') {
      st.outEnv.set(k, { ...cur });
      const cl = clearCall(e.expr);
      if (cl) { // clear: 1 si todas las que nombra existian aqui (las que existian se borran), 0 si alguna no
        let res;
        if (cl.err) res = { err: cl.err };
        else if (cl.all) { // todo: las cotas y medidas del dibujo (dejan de leerse; siguen gobernando el dibujo) y las variables de texto
          for (const n of Object.keys(dimVars)) if (!hid.has(n)) { hid.add(n); st.cleared.add(n); }
          for (const n of Object.keys(cur)) { delete env[n]; delete cur[n]; st.cleared.add(n); }
          res = { v: 1 };
        }
        else { // una variable de texto con ese nombre se borra primero; si no hay (o ya se borro), la cota o medida del dibujo del mismo nombre
          let all = true;
          for (const n of cl.names) {
            if (n in env) { back(n); st.cleared.add(n); }
            else if (n in dimVars && !hid.has(n)) { hid.add(n); delete cur[n]; st.cleared.add(n); }
            else all = false;
          }
          res = { v: all ? 1 : 0 };
        }
        st.clearRes.set(k, res);
      }
      const sv = !cl && solveCall(e.expr);
      if (sv) { // solve: las incognitas valen la solucion desde aqui (su unidad y su marca de radianes son las del valor inicial)
        let res;
        try {
          if (sv.err) throw new Error(sv.err);
          const dimU = sv.names.filter((n) => !(n in env) && n in dimVars && !hid.has(n));
          if (dimU.length) { // incognitas que son cotas: una meta para el dibujo (la resuelve settle, en params.js, moviendo esas cotas)
            if (dimU.length !== sv.names.length) throw new Error('las incógnitas son todas cotas o todas variables de texto, no mezcladas');
            st.goals.push({ k, eqs: sv.eqs, names: sv.names });
            const calc = (s, vv) => { const r = evalExpr(s, { vars: vv, allowMat: true }); if (r.mat) throw new Error(`«${s.trim()}» da un vector o una matriz: cada ecuación es entre números`); return r; };
            const bad = eqResiduals(sv.eqs, calc)(cur).findIndex((q) => !(Math.abs(q.r) <= GOAL_TOL * q.c || Math.abs(q.r) < 1e-12));
            if (bad >= 0) throw new Error(`la ecuación ${bad + 1} no se cumple en el dibujo (¿no hay una solución cerca de las cotas actuales?)`);
            res = { vec: sv.vec, vals: sv.names.map((n) => ({ name: n, val: dimVars[n] })) };
            st.solveRes.set(k, res);
            continue;
          }
          const us = sv.names.map((n) => {
            const x = env[n];
            if (!x) throw new Error(`define «${n}» antes del solve, con su valor inicial (p. ej. ${n}:1)`);
            if (x.fn || x.vec || x.mat) throw new Error(`«${n}» debe ser un número (el valor inicial), no una función, un vector ni una matriz`);
            return { name: n, v: x.v, r: !!x.r, d: x.d };
          });
          const calc = (s, vv) => { const r = evalExpr(s, { vars: vv, allowMat: true }); if (r.mat) throw new Error(`«${s.trim()}» da un vector o una matriz: cada ecuación es entre números`); return r; };
          const xs = solveEqs(us, sv.eqs, calc, cur);
          res = { vec: sv.vec, vals: us.map((u, i) => { const old = env[u.name], val = { ...old, v: xs[i] }; cur[u.name] = val; env[u.name] = val; return { name: u.name, val }; }) };
          for (const u of us) (st.byName.get(u.name) || st.byName.set(u.name, []).get(u.name)).push({ name: u.name, expr: sv.eqs.map((q) => { const [a, b] = splitEq(q); return `(${a})-(${b})`; }).join('+') }); // dependencias: lo que leen las ecuaciones
        } catch (err) { res = { err: err.message }; st.errs.set('solve(' + sv.names?.join(', ') + ')', `solve(…): ${hint(err.message)}`); }
        st.solveRes.set(k, res);
      }
      continue;
    }
    if (e.why) { st.bad.add(k); st.errs.set(e.name, e.why); continue; }
    st.win.set(e.name, e);
    (st.byName.get(e.name) || st.byName.set(e.name, []).get(e.name)).push(e);
    let val = null;
    if (e.params) val = { fn: { params: e.params, body: e.expr } }; // una funcion no se calcula: se calcula al llamarla (con las variables de ese punto)
    else {
      try {
        const rg = parseRange(e.expr);
        const r = rg ? evalRangeDef(rg, e.unit, cur) : evalDef(e.expr, e.unit, cur);
        const u = { ...(r.dim ? { d: r.dim } : {}), ...(r.pu ? { pu: r.pu, pf: r.pf } : {}) };
        val = r.mat ? (r.mat.length === 1 ? { vec: r.mat[0], r: false, ...u } : { mat: r.mat, r: false, ...u }) : { v: r.value, r: r.rad, ...u }; // un vector fila sigue siendo «vec»; el resto de matrices, «mat»
      } catch (err) { st.bad.add(k); st.errs.set(e.name, `«${e.name}»: ${hint(err.message)}`); }
    }
    if (val) { cur[e.name] = val; env[e.name] = val; st.defVal.set(k, val); if (e.eq) st.fnEnv.set(k, { ...cur }); } else back(e.name); // una definicion que falla deja la variable sin definir (o vuelve a la cota del mismo nombre)
  }
  memoKey = key; memoSt = st;
  return st;
}
