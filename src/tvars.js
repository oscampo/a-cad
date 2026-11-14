// Variables definidas en los textos: «nombre[:=valor]» asigna a «nombre» el valor de una expresion (sin DOM).
// Valen para todo el dibujo: las lee cualquier salida de texto ([=nombre]) y cualquier formula de una cota. El valor puede
// usar cotas y otras variables de texto. El texto la muestra en cursiva como «nombre:=valor».
import { evalExpr, exprRefs, isReservedName, reservedWhy, NAME_RE } from './expr.js';

// Marcas de cursiva dentro de un texto ya expandido (caracteres de uso privado: no se escriben a mano).
export const IT0 = '', IT1 = '';
const MARKS = /[]/g;
export const plainText = (s) => String(s).replace(MARKS, '');
// Tramos de una linea: [{ s, it }] (it: cursiva).
export function runsOf(line) {
  if (!/[]/.test(line)) return [{ s: line, it: false }];
  const out = [];
  let it = false, cur = '';
  for (const ch of line) {
    if (ch === IT0 || ch === IT1) { if (cur) out.push({ s: cur, it }); cur = ''; it = ch === IT0; } else cur += ch;
  }
  if (cur) out.push({ s: cur, it });
  return out;
}

export const DEF_SRC = '([A-Za-zα-ωΑ-Ω_][A-Za-z0-9α-ωΑ-Ω_]*)\\[:=([^\\]]*)\\]';
const DEF_RE = () => new RegExp(DEF_SRC, 'g');

// Definiciones de todos los textos, en orden: [{ tid, idx, name, expr }]. idx: lugar dentro de su texto.
export function textDefs(doc) {
  const out = [];
  for (const [tid, t] of Object.entries(doc.texts || {})) {
    const s = t.text;
    if (typeof s !== 'string' || !s.includes('[:=')) continue;
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
    const d = win.get(name), vars = { ...dimVars };
    let ok = true;
    for (const n of exprRefs(d.expr)) {
      if (win.has(n)) { if (ev(n)) vars[n] = st.vals[n]; else { ok = false; st.errs.set(name, `«${name}» depende de «${n}», que no se puede calcular`); } }
    }
    if (ok) {
      try { const r = evalExpr(d.expr, { vars }); st.vals[name] = { v: r.value, r: r.rad }; } catch (e) { ok = false; st.errs.set(name, `«${name}»: ${e.message}`); }
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
