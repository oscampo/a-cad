// Variables definidas en los textos: «nombre{=valor}» asigna a «nombre» el valor de una expresion (sin DOM).
// Valen para todo el dibujo: las lee cualquier salida de texto ([=nombre]) y cualquier formula de una cota. El valor puede
// usar cotas y otras variables de texto. El texto la muestra en cursiva como «nombre:=valor».
import { evalExpr, exprRefs, isReservedName, reservedWhy, NAME_RE } from './expr.js';

// Marcas de cursiva dentro de un texto ya expandido (caracteres de uso privado: no se escriben a mano).
export const IT0 = '', IT1 = '';
// Vector de un texto dentro de una formula ($...$): lo que va entre VB0 y VB1 se dibuja como vector fila; en un texto plano solo se ven los corchetes.
export const VB0 = '', VB1 = '';
const MARKS = /[-]/g;
const VBM = /[]/g;
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
export const DEF_SRC = '([A-Za-zα-ωΑ-Ω_][A-Za-z0-9α-ωΑ-Ω_]*)\\{=([^}]*)\\}';
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

// Definiciones de todos los textos, en orden: [{ tid, idx, name, expr }]. idx: lugar dentro de su texto.
export function textDefs(doc) {
  const out = [];
  for (const [tid, t] of Object.entries(doc.texts || {})) {
    const s = t.text;
    if (!hasDefMark(s)) continue;
    let idx = 0;
    for (const m of s.matchAll(DEF_RE())) out.push({ tid, idx: idx++, name: m[1], expr: m[2] });
  }
  return out;
}

// Estado de las variables de texto. dimVars: variables de las cotas ({ nombre: { v, r } }); dimNames: nombres de TODAS las
// cotas (aunque alguna se excluya de dimVars). Devuelve:
//  vals: { nombre: { v, r } } de las que se pudieron evaluar (r: el valor viene de π, es decir esta en radianes)
//  errs: Map(nombre -> motivo) de las que no
//  bad: Set('tid:idx') de las definiciones que no valen (repetidas, con error o que chocan con una cota)
//  names: Set con los nombres que alguna definicion ganadora usa (aunque fallen)
export function textVarState(doc, dimVars = {}, dimNames = new Set()) {
  const defs = textDefs(doc);
  const st = { vals: {}, errs: new Map(), bad: new Set(), names: new Set(), defs, win: new Map() };
  if (!defs.length) return st;
  const win = st.win;
  for (const d of defs) {
    const key = d.tid + ':' + d.idx;
    if (win.has(d.name)) { st.bad.add(key); if (!st.errs.has(d.name)) st.errs.set(d.name, `«${d.name}» está definida más de una vez`); continue; }
    if (isReservedName(d.name)) { st.bad.add(key); st.errs.set(d.name, reservedWhy(d.name)); continue; }
    if (dimNames.has(d.name)) { st.bad.add(key); st.errs.set(d.name, `«${d.name}» ya es el nombre de una cota`); continue; }
    if (!NAME_RE.test(d.name)) { st.bad.add(key); st.errs.set(d.name, `«${d.name}» no es un nombre válido`); continue; }
    win.set(d.name, { ...d, key });
  }
  for (const n of win.keys()) st.names.add(n);
  const state = new Map(); // 1: evaluando, 2: listo
  const ev = (name) => {
    if (name in st.vals) return true;
    const s = state.get(name);
    if (s === 2) return false;
    if (s === 1) return false; // ciclo: quien lo cierra queda con error
    state.set(name, 1);
    const d = win.get(name), vars = { ...dimVars }, rg = parseRange(d.expr);
    let ok = true;
    for (const n of new Set((rg ? rg.parts : [d.expr]).flatMap(exprRefs))) {
      if (win.has(n)) { if (ev(n)) vars[n] = st.vals[n]; else { ok = false; st.errs.set(name, `«${name}» depende de «${n}», que no se puede calcular`); } }
    }
    if (ok) {
      try {
        if (rg) st.vals[name] = { vec: rangeValues(rg, (s) => evalExpr(s, { vars }).value), r: false };
        else {
          const r = evalExpr(d.expr, { vars, allowMat: true });
          st.vals[name] = r.mat ? (r.mat.length === 1 ? { vec: r.mat[0], r: false } : { mat: r.mat, r: false }) : { v: r.value, r: r.rad }; // un vector fila sigue siendo «vec»; el resto de matrices, «mat»
        }
      } catch (e) { ok = false; st.errs.set(name, `«${name}»: ${e.message}`); }
    }
    state.set(name, 2);
    if (!ok) st.bad.add(d.key);
    return ok;
  };
  for (const n of win.keys()) ev(n);
  // un ciclo marca a todos sus miembros: si alguno quedo sin valor, su definicion es mala
  for (const [n, d] of win) if (!(n in st.vals)) { st.bad.add(d.key); if (!st.errs.has(n)) st.errs.set(n, `«${n}» se define en círculo`); }
  return st;
}
