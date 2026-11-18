// Variables definidas en los textos: «nombre{=valor}» asigna a «nombre» el valor de una expresion (sin DOM).
// Se leen en el orden de la pagina (arriba a abajo, izquierda a derecha; ver textOrder): una variable vale lo de su ultima definicion anterior,
// y las cotas ven lo que valen al final. El valor puede usar cotas y variables definidas antes. El texto la muestra en cursiva como «nombre:=valor».
import { evalExpr, exprRefs, isReservedName, reservedWhy, TEXT_NAME_RE, NAME_RE, normName } from './expr.js';

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

// Definicion: «x{=valor}» (asignar) frente a «[=expr]» (leer). Se teclea sin cambiar de pagina en el teclado del telefono.
// Grupos: 1 nombre, 2 valor.
// Grupos: 1 nombre, 2 parametros (solo una funcion: «f(x; y){=x+y}»), 3 valor. El nombre puede llevar subindice de texto: «var_(texto){=valor}».
export const DEF_SRC = '([A-Za-zα-ωΑ-Ω_][A-Za-z0-9α-ωΑ-Ω_]*?(?:_\\([^(){}\\n]+\\))?)(?:\\(([^(){}\\n]*)\\))?\\{=([^}]*)\\}';
const DEF_RE = () => new RegExp(DEF_SRC, 'g');
// Salida «[=expresion]»: la expresion puede llevar corchetes (una matriz literal) con un nivel de anidacion. Grupo 1: la expresion.
export const OUT_SRC = '\\[=((?:[^\\[\\]]|\\[[^\\[\\]]*\\])*)\\]';
export const hasDefMark = (s) => typeof s === 'string' && s.includes('{=');

// Rangos (vectores de numeros igualmente espaciados): «x{=inicio..fin;n}» (n elementos entre inicio y fin, ambos incluidos) y
// «x{=inicio..paso..fin}» (inicio, inicio+paso, ... sin pasar de fin). Cada parte puede ser una formula.
// Devuelve { kind: 'n'|'step', parts } o null si la definicion no es un rango. Un decimal «1.5» no cuenta como «..».
export function parseRange(src) {
  const s = String(src ?? '');
  if (!s.includes('..')) return null;
  const p = s.split('..');
  if (p.length === 2) { const q = p[1].split(';'); return q.length === 2 ? { kind: 'n', parts: [p[0], q[0], q[1]] } : { kind: 'bad', parts: [] }; }
  if (p.length === 3) return { kind: 'step', parts: p };
  return { kind: 'bad', parts: [] };
}
export const MAX_RANGE = 10000;
// Elementos del rango; ev evalua cada parte a un numero.
export function rangeValues(rg, ev) {
  if (rg.kind === 'bad') throw new Error('un rango se escribe inicio..fin;n o inicio..paso..fin');
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
const ROW_TOL = 0.5; // dos elementos estan en la misma fila si sus bordes superiores difieren menos de esta fraccion de su altura
function readingItems(doc, probes = []) {
  const items = [];
  let n = 0;
  for (const [tid, t] of Object.entries(doc.texts || {})) {
    const s = String(t.text ?? '');
    if (!hasDefMark(s) && !s.includes('[=')) continue;
    const P = doc.pts?.[t.pt] || { x: 0, y: 0 }, h = t.h > 0 ? t.h : 1, lines = s.split('\n');
    const hh = lines.length * 1.2 * h, w = Math.max(1, ...lines.map((l) => l.length)) * 0.55 * h, an = t.anchor || 'bl';
    items.push({ tid, t, h, n: n++, top: P.y + { t: 0, m: hh / 2, b: hh }[an[0]], left: P.x - { l: 0, c: w / 2, r: w }[an[1]] });
  }
  if (probes.length) {
    const hs = items.map((i) => i.h).sort((a, b) => a - b), hm = hs.length ? hs[hs.length >> 1] : 1; // una cota pesa como un texto de altura tipica
    for (const p of probes) items.push({ probe: p.id, h: hm, n: n++, top: p.y + 0.6 * hm, left: p.x - (p.len * 0.55 * hm) / 2 });
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
const EVT_RE = () => new RegExp(DEF_SRC + '|' + OUT_SRC, 'g');
function readingEvents(doc, probes = []) {
  const out = [];
  for (const it of readingItems(doc, probes)) {
    if (it.probe !== undefined) { out.push({ kind: 'dim', id: it.probe }); continue; }
    let di = 0, oi = 0;
    for (const m of String(it.t.text ?? '').matchAll(EVT_RE())) {
      if (m[1] !== undefined) out.push({ kind: 'def', tid: it.tid, idx: di++, name: normName(m[1]), expr: m[3], params: m[2] === undefined ? null : m[2].split(/[;,]/).map((q) => q.trim()) });
      else out.push({ kind: 'out', tid: it.tid, idx: oi++, expr: m[4] });
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
//  defVal: Map('tid:idx' -> valor que esa definicion dio); outEnv: Map('tid:idx' -> variables que ve esa salida [=...])
//  dimEnv: Map(id de cota -> variables de texto que ve esa cota en su lugar de la pagina)
let memoKey = null, memoSt = null;
export function textVarState(doc, dimVars = {}, dimNames = new Set(), probes = []) {
  const st = { vals: {}, errs: new Map(), bad: new Set(), names: new Set(), defs: [], win: new Map(), byName: new Map(), defVal: new Map(), outEnv: new Map(), dimEnv: new Map() };
  const events = readingEvents(doc, probes);
  if (!events.some((e) => e.kind !== 'dim')) return st; // sin definiciones ni salidas: nada que leer
  const key = JSON.stringify([events, dimVars, [...dimNames]]);
  if (key === memoKey) return memoSt; // las mismas definiciones, posiciones y cotas: el mismo resultado
  const check = (d) => { // ¿vale la definicion? (motivo si no)
    if (isReservedName(d.name)) return reservedWhy(d.name);
    if (dimNames.has(d.name)) return `«${d.name}» ya es el nombre de una cota`;
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
  for (const d of defs) { d.why = check(d); if (!d.why) st.names.add(d.name); }
  st.defs = defs;
  const cur = { ...dimVars }, env = st.vals; // cur: lo que ve una expresion en este punto de la lectura (cotas + variables de texto)
  const later = st.names; // para avisar «se define mas abajo»
  const hint = (msg) => { const m = /No reconozco «(.+?)»/.exec(msg); return m && later.has(m[1]) && !(m[1] in cur) ? `«${m[1]}» se define más abajo o más a la derecha: en el orden de lectura debe definirse antes` : msg; };
  for (const e of events) {
    const k = e.tid + ':' + e.idx;
    if (e.kind === 'dim') { st.dimEnv.set(e.id, { ...env }); continue; } // una cota ve las variables de texto de este punto de la lectura
    if (e.kind === 'out') { st.outEnv.set(k, { ...cur }); continue; }
    if (e.why) { st.bad.add(k); st.errs.set(e.name, e.why); continue; }
    st.win.set(e.name, e);
    (st.byName.get(e.name) || st.byName.set(e.name, []).get(e.name)).push(e);
    let val = null;
    if (e.params) val = { fn: { params: e.params, body: e.expr } }; // una funcion no se calcula: se calcula al llamarla (con las variables de ese punto)
    else {
      try {
        const rg = parseRange(e.expr);
        if (rg) val = { vec: rangeValues(rg, (s) => evalExpr(s, { vars: cur }).value), r: false };
        else {
          const r = evalExpr(e.expr, { vars: cur, allowMat: true });
          val = r.mat ? (r.mat.length === 1 ? { vec: r.mat[0], r: false } : { mat: r.mat, r: false }) : { v: r.value, r: r.rad }; // un vector fila sigue siendo «vec»; el resto de matrices, «mat»
        }
      } catch (err) { st.bad.add(k); st.errs.set(e.name, `«${e.name}»: ${hint(err.message)}`); }
    }
    if (val) { cur[e.name] = val; env[e.name] = val; st.defVal.set(k, val); } else { delete cur[e.name]; delete env[e.name]; } // una definicion que falla deja la variable sin definir
  }
  memoKey = key; memoSt = st;
  return st;
}
