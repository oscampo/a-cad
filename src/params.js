// Cotas con nombre y formulas entre cotas (sin DOM).
// Una cota conductora (no de referencia) puede definirse con una formula que use el nombre de otras: D2 = D1*sin(A1).
// Al cambiar una cota se recalculan en orden las que dependen de ella (grafo sin ciclos) y luego se resuelve la geometria.
// Las cotas de referencia (solo lectura) tambien se pueden leer en una formula: su valor sale de la geometria, asi que
// resolver y recalcular se repite hasta que ya nada cambia (settle). Si no se estabiliza se avisa y se deshace.
import { isNamedDim, dimLetter, DIM_KIND } from './model.js';
import { dimPos, dimValue, angTrue, initAngle, trackAngles, dimUnit, dimShown, isLenDim, dimUnreadable } from './dims.js';
import { convertExpr, parseValue, isPlainNumber, exprRefs, renameInExpr, isReservedName, reservedWhy, NAME_RE, normName, evalExpr } from './expr.js';
import { convertCalcText, textVarState, clearCall, calcStmts, calcParse, calcSrc, evalDef, syncUserUnits, UDEF_ERR, GOAL_TOL } from './tvars.js';
import { eqResiduals, lmRoots } from './nsolve.js';
import { parseUnit, sameDim, autoUnit, mulDim, unitMsg, dimName } from './units.js';
import { geoVars, isGeoName, geoPoints, propOf, elementNames } from './geo.js';
import { isValidElName, ID_LIKE, NAMED, renameWord } from './names.js';
import { setTopo } from './expr.js';
import { elementValue } from './topo.js';

const DEG = Math.PI / 180;
const named = (doc) => Object.entries(doc.cons).filter(([, k]) => isNamedDim(k) && k.name);
const drivers = (doc) => named(doc).filter(([, k]) => !k.ref);

// Valor con el que una cota entra en una formula: la medida que muestra (diametro para circulos, grados convertidos a radianes).
// Una cota con unidad (k.du) entra como cantidad: lo que dice su etiqueta, con su magnitud y sin la escala («126'in[*k]» es 126 in).
export function varValue(doc, k) {
  const v = dimValue(doc, k);
  if (k.t === 'ANG') return { v: v * DEG, r: true };
  const u = dimUnit(k.du);
  if (k.t !== 'ANG' && dimUnreadable(k)) return { v: NaN, r: false, ...(u?.d ? { d: u.d } : {}), pu: k.du, pf: u?.f ?? 1 }; // en kN sin escala de representacion no vale nada: las salidas dicen ⚠
  if (u && !dimUnreadable(k)) { const q = dimShown(doc, k); return { v: q * u.f, r: false, ...(u.d ? { d: u.d } : {}), pu: k.du, pf: u.f, dv: true }; } // dv: de una cota (en las salidas de los textos manda el sistema de unidades, no su etiqueta)
  if (k.t === 'RAD' && k.refs[0] in doc.circles) return { v: 2 * v, r: false };
  return { v, r: false };
}
// La unidad escrita al final de un valor: «126'in», «D2*2'ft», «3'(m/s)», «9,8'm/s^2». { body, unit } o null.
const UW = /[A-Za-zµμΩ°%áéíóúñÑ_][A-Za-zµμΩ°%áéíóúñÑ_0-9]*(?:[²³]|\^\(?-?\d+(?:[.,]\d+)?\)?)?/.source;
const UNIT_TAIL = new RegExp(`^([\\s\\S]*?)'\\s*(\\([^()]*\\)|${UW}(?:\\s*[*/·]\\s*${UW})*)\\s*$`);
export function splitUnit(src) {
  const m = UNIT_TAIL.exec(String(src ?? ''));
  if (!m || !m[1].trim()) return null;
  const unit = m[2].replace(/^\((.*)\)$/, '$1').trim();
  try { parseUnit(unit); } catch (e) { return null; }
  return { body: m[1], unit };
}
// Valor de una cota de distancia, radio o diametro (src sin la escala). v: lo que mide el dibujo (una longitud con unidades en mm, otra
// magnitud en el SI, igual que parseValue). du: la unidad que dice su etiqueta: la escrita al final («126'in»; si la formula ya trae unidades,
// solo dice en cual mostrarla: «D2*2'ft»), si no la de una cota o variable de la formula con la misma magnitud («D2*2» con D2 en in), si no
// la del SI con prefijo. Sin unidades, du es null y la cota es un numero, como siempre.
export function dimEval(src, vars) {
  const t = splitUnit(src);
  const r = t ? evalDef(t.body, t.unit, vars) : evalExpr(src, { vars });
  if (r.mat) throw new Error('El resultado es una matriz, no un número');
  if (!Number.isFinite(r.value)) throw new Error('El resultado no es un número');
  const v = Number((r.value * (isLenDim(r.dim) ? 1000 : 1)).toPrecision(12));
  if (!r.dim) return { v, du: r.pu || null, d: undefined }; // «50'%»
  let du = r.pu || null;
  if (!du) for (const n of exprRefs(src)) { const x = vars?.[n]; if (x?.pu && sameDim(x.d, r.dim)) { du = x.pu; break; } }
  if (!du) du = autoUnit(r.value, r.dim)?.name ?? null;
  return { v, du: dimUnit(du) ? du : null, d: r.dim };
}
// Escala de una cota («valor[*escala]» o el campo Escala). Sin unidades («10», «k») es «fuera de escala»: el dibujo mide el valor por la
// escala y la cota va subrayada (ISO 129). Con unidades es una escala de representacion: la magnitud por la escala da la longitud del dibujo
// («30'kN[*1'mm/kN]» mide 30 mm y dice «30 kN», sin subrayar); si no da una longitud, error. qd: dimension de la magnitud de la cota
// (undefined: un numero). Devuelve { sc: factor de lo que mide la cota (en unidades del dibujo) a lo que mide el dibujo, rep } o lanza un error.
export function scaleEval(src, vars, qd) {
  const t = splitUnit(src), r = t ? evalDef(t.body, t.unit, vars) : evalExpr(src, { vars }); // «1'mm/kN»: la unidad del final entera
  if (!Number.isFinite(r.value) || !(r.value > 0)) throw new Error('La escala debe ser un número mayor que cero, p. ej. 4[*10]');
  if (r.mat) throw new Error('La escala debe ser un número mayor que cero, p. ej. 4[*10]');
  if (!r.dim) return { sc: r.value, rep: false };
  const pd = mulDim(qd, r.dim);
  if (!isLenDim(pd)) throw new Error(`La escala (${unitMsg(r.dim)}) por la magnitud de la cota (${unitMsg(qd)}) da ${unitMsg(pd)}, no una longitud: para una fuerza en kN, p. ej. 1'mm/kN`);
  return { sc: Number(((r.value * 1000) / (isLenDim(qd) ? 1000 : 1)).toPrecision(12)), rep: true };
}
// Aviso para una cota conductora de otra magnitud (kN, V) sin escala de representacion: mide su valor en el SI (30 kN, 30000). null si no aplica.
export function noScaleWarn(d, du, v, rep) {
  if (!d || isLenDim(d) || rep) return null;
  return `Sin escala de representación el dibujo mide ${Math.round(v * 1000) / 1000} (en el SI). Usa una escala con unidades, p. ej. [*1'mm/${du || dimName(d)}]`;
}
// Escalas con formula de las cotas de solo lectura («Escala: eF»): se reevaluan con las variables de su lugar de la pagina. Si no se puede,
// la cota dice ⚠ (k.serr) en vez de detener todo.
export function refScales(doc) {
  for (const [id, k] of named(doc)) {
    if (!k.ref || !k.scaleExpr || k.t === 'ANG') continue;
    try { const s = scaleEval(k.scaleExpr, varsOf(doc, id), dimUnit(k.du)?.d); k.scale = s.sc; if (s.rep) k.srep = true; else delete k.srep; delete k.serr; } catch (e) { k.serr = e.message; }
  }
}
// Estado de las variables de los textos («x:valor») con los valores actuales de las cotas.
// Las cotas con formula se leen en el lugar de su etiqueta (orden de lectura): ven las variables tal como estaban ahi.
// Mientras algo se mueve (una simulacion o un arrastre) el orden de lectura de las cotas se congela: sus etiquetas se mueven con el dibujo y,
// si cruzaran un texto a mitad del movimiento, la cota cambiaria de valor (o se detendria con un error) sin que nadie la haya tocado.
const FROZEN = new WeakMap();
export const freezeDimOrder = (doc) => { FROZEN.set(doc, new Map(probesOf(doc).map((p) => [p.id, p]))); };
export const thawDimOrder = (doc) => { FROZEN.delete(doc); };
const probesOf = (doc) => {
  const fz = FROZEN.get(doc);
  // tambien las cotas que se llaman como una variable de texto, y todas si hay un clear(): tras un clear(), la cota vuelve a leerse en su lugar de la pagina
  const defs = new Set();
  let cl = false;
  for (const t of Object.values(doc.texts || {})) for (const p of calcStmts(t.text)) { if (p.k === 'def') defs.add(normName(p.name)); else if (p.k === 'out' && clearCall(p.expr)) cl = true; }
  return named(doc).filter(([, k]) => cl || (!k.ref && k.expr) || k.scaleExpr || defs.has(k.name)).map(([id, k]) => (fz?.get(id) ?? { id, name: k.name, ...dimPos(doc, k) }));
};
// Mientras se evalua un texto, un elemento del dibujo (l5, c2, a8, s3, k1) puede llegar por su nombre a una funcion propia o a typeof: se arma con topo.js.
function withTopo(doc, fn) {
  const prev = setTopo((name) => elementValue(doc, name, (id, p) => propOf(doc, id, p)));
  try { return fn(); } finally { setTopo(prev); }
}
export function textVars(doc, exceptId = null) {
  const dimVars = geoVars(doc);
  for (const [id, k] of named(doc)) if (id !== exceptId) dimVars[k.name] = varValue(doc, k);
  return withTopo(doc, () => textVarState(doc, dimVars, new Set(named(doc).map(([, k]) => k.name)), probesOf(doc)));
}
const hasDefs = (doc) => Object.values(doc.texts || {}).some((t) => !!t.lib || calcStmts(t.text).some((p) => p.k === 'def' || (p.k === 'out' && (!!clearCall(p.expr) || /(?:^|[^A-Za-z0-9_.])rng\s*\(/.test(p.expr))))); // rng() tambien: su resultado se fija en el orden de lectura // un clear() tambien pone en juego el orden de lectura (borra cotas)
const NO_TV = { win: new Map(), byName: new Map(), names: new Set(), vals: {}, errs: new Map(), dimEnv: new Map() };
const tvOf = (doc) => (hasDefs(doc) ? textVars(doc) : NO_TV);
// Variables disponibles (sin la cota exceptId, que no puede usarse a si misma): las de las cotas y las de los textos.
export function varsOf(doc, exceptId = null) {
  const out = geoVars(doc);
  for (const [id, k] of named(doc)) if (id !== exceptId) out[k.name] = varValue(doc, k);
  if (!hasDefs(doc)) return out;
  const st = withTopo(doc, () => textVarState(doc, out, new Set(named(doc).map(([, k]) => k.name)), probesOf(doc)));
  for (const n of st.dimHide?.get(exceptId) || []) delete out[n]; // las cotas borradas con clear() antes de su lugar de la pagina ya no se leen
  return Object.assign(out, exceptId != null && st.dimEnv.has(exceptId) ? st.dimEnv.get(exceptId) : st.vals); // una cota con formula ve las variables de su lugar de la pagina
}
// Variables que ve algo que esta en la pagina en (top, left) (una grafica: su esquina superior izquierda): las de las cotas y las de
// los textos definidas ANTES en el orden de lectura, como una cota con formula. later: las que se definen mas abajo (para avisar).
const AT = '\u0000at';
export function varsAt(doc, top, left) {
  const out = geoVars(doc);
  for (const [, k] of named(doc)) out[k.name] = varValue(doc, k);
  if (!hasDefs(doc)) return { vars: out, later: new Set() };
  const st = withTopo(doc, () => textVarState(doc, { ...out }, new Set(named(doc).map(([, k]) => k.name)), [...probesOf(doc), { id: AT, top, left }]));
  const here = st.dimEnv.get(AT) || {};
  for (const n of st.dimHide.get(AT) || []) delete out[n]; // cotas borradas con clear() antes de este lugar
  return { vars: Object.assign(out, here), later: new Set(Object.keys(st.vals).filter((n) => !(n in here))) };
}
// Texto corto de las variables para mostrarlas al escribir una formula: "D1 = 25, A1 = 45°".
export function varsList(doc, exceptId = null) {
  const dims = named(doc).filter(([id]) => id !== exceptId).map(([, k]) => {
    const v = dimValue(doc, k), x = k.t === 'RAD' && k.refs[0] in doc.circles ? 2 * v : v, du = k.t !== 'ANG' && dimUnit(k.du);
    return `${k.name} = ${Math.round((du ? dimShown(doc, k) : x) * 1000) / 1000}${k.t === 'ANG' ? '°' : du ? ' ' + k.du : ''}${k.ref ? ' (lectura)' : ''}`;
  });
  const tv = hasDefs(doc) ? textVars(doc, exceptId).vals : {};
  return dims.concat(Object.entries(tv).map(([n, x]) => `${n} = ${x.fn ? `función de ${x.fn.params.length}` : x.vec ? `vector de ${x.vec.length}` : x.mat ? `matriz de ${x.mat.length}×${x.mat[0].length}` : Math.round(x.v * 1000) / 1000} (texto)`)).join(', ');
}
// Las mismas variables como lista para elegirlas en un menu: [{ name, text, kind }]. kind: 'dim' (distancias, radios, diametros),
// 'ang' (angulos) o 'var' (variables de los textos).
export function varsInfo(doc, exceptId = null) {
  const r3 = (x) => Math.round(x * 1000) / 1000;
  const out = named(doc).filter(([id]) => id !== exceptId).map(([, k]) => {
    const v = dimValue(doc, k), x = k.t === 'RAD' && k.refs[0] in doc.circles ? 2 * v : v, ang = k.t === 'ANG', du = !ang && dimUnit(k.du);
    return { name: k.name, text: `${k.name} = ${r3(du ? dimShown(doc, k) : x)}${ang ? '°' : du ? ' ' + k.du : ''}${k.ref ? ' (lectura)' : ''}`, kind: ang ? 'ang' : 'dim' };
  });
  const tv = hasDefs(doc) ? textVars(doc, exceptId).vals : {};
  for (const [n, x] of Object.entries(tv)) out.push({ name: n, text: x.fn ? `${n}(${x.fn.params.join('; ')}) = función` : x.vec ? `${n} = vector de ${x.vec.length}` : x.mat ? `${n} = matriz de ${x.mat.length}×${x.mat[0].length}` : `${n} = ${r3(x.v)}`, kind: 'var' });
  return out;
}
// Nombres de las variables definidas en textos (las que alguna definicion valida usa).
// Una serie «y vs x @y2» con sus dos lados reescritos de un indicador decimal a otro (los ejes no cambian).
export function convertSeries(s, from, to) {
  const src = String(s ?? ''), am = /\s@\s*[A-Za-z0-9 ,]*$/.exec(src), tail = am ? src.slice(am.index) : '', body = am ? src.slice(0, am.index) : src;
  const m = /^(\s*)(.+?)(\s+vs\.?\s+)(.+?)(\s*)$/i.exec(body);
  return m ? m[1] + convertExpr(m[2], from, to) + m[3] + convertExpr(m[4], from, to) + m[5] + tail : src;
}
// Cambia el indicador decimal del dibujo y reescribe lo ya escrito con el nuevo (cotas con formula, textos de calculo, actuadores y graficas).
// Sin conversion (convert = false) solo cambia la opcion. Devuelve cuantas formulas cambiaron.
export function setDocDecimal(doc, to, convert = true) {
  const from = doc.decimal ?? null;
  to = to === ',' || to === '.' ? to : null;
  let n = 0;
  const set = (o, key, f) => { if (typeof o[key] === 'string') { const v = f(o[key]); if (v !== o[key]) { o[key] = v; n++; } } };
  if (convert && from !== to) {
    for (const k of Object.values(doc.cons || {})) { set(k, 'expr', (s) => convertExpr(s, from, to)); set(k, 'scaleExpr', (s) => convertExpr(s, from, to)); }
    for (const t of Object.values(doc.texts || {})) set(t, 'text', (s) => convertCalcText(s, from, to));
    for (const a of Object.values(doc.acts || {})) set(a, 'expr', (s) => convertExpr(s, from, to));
    for (const g of Object.values(doc.graphs || {})) if (Array.isArray(g.series)) g.series = g.series.map((s) => { const v = convertSeries(s, from, to); if (v !== s) n++; return v; });
  }
  if (to) doc.decimal = to; else delete doc.decimal;
  return n;
}
export const textVarNames = (doc) => (hasDefs(doc) ? textVars(doc).names : new Set());
// Fuente de las formulas de una cota (el valor y, si la lleva, la escala): de ahi salen sus dependencias.
// (sin la unidad del final: en «1'mm/kN» el «kN» no es una variable)
const noTail = (s) => (s ? splitUnit(s)?.body ?? s : s);
const srcOf = (k) => (k.scaleExpr ? `${noTail(k.expr) ?? ''};${noTail(k.scaleExpr)}` : noTail(k.expr));
// Cotas (por nombre) de las que depende una formula, directamente o a traves de variables de texto.
function dimRefs(doc, expr, st = tvOf(doc), seen = new Set()) {
  const dn = new Set(named(doc).map(([, k]) => k.name)), has = (q) => st.win.has(q) || dn.has(q) || isGeoName(doc, q), out = new Set();
  const walk = (src, skip) => { // una funcion de texto cuenta por lo que lee su cuerpo (menos sus parametros)
    for (const n of exprRefs(src, has)) {
      if (skip.includes(n)) continue;
      const es = st.byName?.get(n); // una variable puede tener varias definiciones (se redefine): depende de todo lo que leen
      if (dn.has(n)) out.add(n); // tambien una cota (la variable de texto se borro con clear)
      if (es) { if (seen.has(n)) continue; seen.add(n); for (const e of es) walk(e.expr, e.params || []); } else out.add(n);
    }
  };
  walk(expr, []);
  return out;
}
// ¿Alguna formula de una cota lee una variable de texto?
export function usesTextVars(doc) {
  if (!hasDefs(doc)) return false;
  const st = tvOf(doc);
  return drivers(doc).some(([, k]) => k.expr && exprRefs(srcOf(k), (q) => st.names.has(q)).some((n) => st.names.has(n)));
}
// Problemas de las definiciones de los textos: [{ key, msg }] (repetidas, que chocan con una cota, que fallan o se piden en circulo).
export function textVarErrors(doc) {
  syncUserUnits(doc);
  const ue = [...UDEF_ERR].map(([s, msg]) => ({ key: 'u|' + s + '|' + msg, msg: `${s}: ${msg}` })); // definiciones de unidad que no valen
  const sv = Object.values(doc.texts || {}).some((t) => /solve\s*\(/i.test(String(t.text ?? '')));
  if (!hasDefs(doc) && !sv) return ue;
  const out = ue.concat([...textVars(doc).errs].map(([n, msg]) => ({ key: n + '|' + msg, msg })));
  const g = sv && goalsOf(doc); // una meta con una incognita que no puede moverse (de solo lectura, con formula)
  if (g?.err && !out.some((e) => e.msg === g.err)) out.push({ key: 'g|' + g.err, msg: g.err });
  return out;
}

// Cambia el nombre de un punto, linea, circulo, arco, grupo o contorno (vacio: lo quita) y actualiza las formulas que lo llamaban por el nombre viejo: las cotas, las
// salidas y definiciones de los textos, los actuadores y las graficas. Sin nombre nuevo, las formulas vuelven a llamarlo por su id. Los programas (%f(x):…) no se
// tocan solos: un nombre ahi puede ser una variable local; se cuentan para avisar. Devuelve { n: formulas cambiadas, scripts: programas que usan el nombre viejo }.
export function renameElement(doc, id, raw) {
  const coll = NAMED.find(([c]) => doc[c]?.[id])?.[0];
  if (!coll) return { n: 0, scripts: 0 };
  const o = doc[coll][id], old = o.name, v = String(raw ?? '').trim();
  const active = !!old && isValidElName(old) && elementNames(doc).get(normName(old)) === id; // el nombre viejo llamaba de verdad a este elemento
  if (v) o.name = v; else delete o.name;
  if (!active || old === v) return { n: 0, scripts: 0 };
  const to = isValidElName(v) ? v : id;
  let n = 0, scripts = 0;
  const swap = (s) => { const r = renameWord(s, old, to); if (r !== s) n++; return r; };
  for (const k of Object.values(doc.cons)) { if (k.expr) k.expr = swap(k.expr); if (k.scaleExpr) k.scaleExpr = swap(k.scaleExpr); }
  for (const a of Object.values(doc.acts || {})) if (typeof a.expr === 'string') a.expr = swap(a.expr);
  for (const g of Object.values(doc.graphs || {})) if (Array.isArray(g.series)) g.series = g.series.map((s) => (typeof s === 'string' ? swap(s) : s));
  const ren = (p) => (p.k === 'def' || p.k === 'out' ? { ...p, expr: swap(p.expr) } : p);
  for (const t of Object.values(doc.texts || {})) {
    if (typeof t.text !== 'string') continue;
    if (t.text.startsWith('%')) { if (renameWord(t.text, old, to) !== t.text) scripts++; continue; }
    if (!calcStmts(t.text).length) continue;
    t.text = calcSrc(calcParse(t.text).map((tk) => (tk.t === 'math' ? { ...tk, lines: tk.lines.map((l) => l.map(ren)) } : tk)));
  }
  return { n, scripts };
}
// El nombre que el usuario le pone a un elemento para llamarlo en las formulas (names.js). Devuelve el motivo si no vale, o null. exceptId: el elemento que se renombra.
export function checkElName(doc, raw, exceptId) {
  if (!isValidElName(raw)) return ID_LIKE.test(String(raw)) ? `«${raw}» parece un id (p12, g3, k7): usa otro nombre` : 'El nombre usa letras y números, empieza con una letra y puede llevar un subíndice (iso_1, p_(ini)); no puede parecer un id (p12)';
  const name = normName(raw);
  if (isReservedName(name)) return reservedWhy(name);
  for (const [coll] of NAMED) {
    const hit = Object.entries(doc[coll] || {}).find(([id, o]) => id !== exceptId && o.name && isValidElName(o.name) && normName(o.name) === name);
    if (hit) return coll === 'pts' ? `Ya hay un punto llamado «${raw}»` : coll === 'lines' ? `Ya hay una línea llamada «${raw}»` : coll === 'circles' ? `Ya hay un círculo llamado «${raw}»` : coll === 'arcs' ? `Ya hay un arco llamado «${raw}»` : coll === 'ellipses' ? `Ya hay una elipse llamada «${raw}»` : coll === 'splines' ? `Ya hay un spline llamado «${raw}»` : coll === 'grps' ? `Ya hay un grupo llamado «${raw}»` : `Ya hay un contorno llamado «${raw}»`;
  }
  if (Object.values(doc.cons).some((k) => k.name === name)) return `Ya existe una cota llamada «${name}»`;
  const tv = hasDefs(doc) ? textVars(doc) : null;
  if (tv?.names.has(name)) return `Ya existe una variable o función de texto llamada «${name}»`;
  const base = /^(.+?)_[A-Za-z0-9α-ωΑ-Ω]+$/.exec(name)?.[1]; // «iso_1» podria ser el elemento 1 del vector «iso»
  if (base && tv?.names.has(base) && !tv.vals?.[base]?.fn) return `«${base}» es una variable de texto: «${name}» se leería como su elemento`; // (una funcion no se indexa: ort2iso_1 vale)
  return null;
}
// El nombre se compara como se guarda: «alpha» es «α» (ver normName).
export function checkName(doc, raw, exceptId) {
  if (!NAME_RE.test(raw)) return 'El nombre usa letras, números y _, y empieza con una letra';
  const name = normName(raw);
  if (isReservedName(name)) return reservedWhy(name);
  if (Object.entries(doc.cons).some(([id, k]) => id !== exceptId && k.name === name)) return `Ya existe una cota llamada «${name}»`;
  const tv = hasDefs(doc) ? textVars(doc) : null;
  if (tv?.names.has(name)) { // solo si la variable de texto se borra con clear() mas abajo (ver textVarState)
    if (tv.openEnd.has(name)) return `Ya existe una variable de texto llamada «${name}» (para usar el nombre en una cota, bórrala con clear(${name}) más abajo)`;
    const old = exceptId != null && doc.cons[exceptId]?.name, uses = (s) => !!old && !!s && renameInExpr(s, old, '\u0001') !== s;
    // al cambiar el nombre, las formulas que leen la cota pasan a decir «name»: donde la variable de texto sigue viva leerian la variable
    for (const { live, expr } of tv.at.values()) if (live.has(name) && uses(expr)) return `«${old}» se lee en un texto donde «${name}» todavía es la variable de texto (antes de clear(${name}))`;
    for (const [id, env] of tv.dimEnv) { const o = doc.cons[id]; if (o && name in env && (uses(o.expr) || uses(o.scaleExpr))) return `La cota ${o.name || ''} lee «${old}» donde «${name}» todavía es la variable de texto (antes de clear(${name}))`; }
  }
  return null;
}

// Cambia el nombre de una cota y lo actualiza en las formulas de las demas.
export function renameDim(doc, id, raw) {
  const k = doc.cons[id], old = k.name, name = normName(raw); // «alpha» se guarda como «α»
  if (!old || old === name) { k.name = name; return; }
  k.name = name;
  for (const o of Object.values(doc.cons)) { if (o.expr) o.expr = renameInExpr(o.expr, old, name); if (o.scaleExpr) o.scaleExpr = renameInExpr(o.scaleExpr, old, name); }
  // las salidas de los textos («D1=») y los valores de sus variables («x:2*D1») tambien siguen al nombre (los literales `...` no)
  const ren = (p) => (p.k === 'def' || p.k === 'out' ? { ...p, expr: renameInExpr(p.expr, old, name) } : p);
  for (const t of Object.values(doc.texts || {})) {
    if (!calcStmts(t.text).length) continue;
    t.text = calcSrc(calcParse(t.text).map((tk) => (tk.t === 'math' ? { ...tk, lines: tk.lines.map((l) => l.map(ren)) } : tk)));
  }
}

// Al abrir un dibujo: las cotas con formula que todavia no tienen la unidad de su etiqueta (anteriores a las cotas con unidad, «2'cm») la
// toman de su formula. No cambia la geometria (2 cm siguen midiendo 20), solo lo que dice la etiqueta («2 cm»). Devuelve cuantas cambiaron.
// all: tambien las que ya la tienen (al cambiar el sistema de unidades: «D2*2» toma la unidad habitual del nuevo sistema).
export function fillDimUnits(doc, all = false) {
  syncUserUnits(doc);
  let n = 0;
  for (const [id, k] of drivers(doc)) {
    if (!k.expr || (k.du && !all) || k.t === 'ANG' || k.t === 'ANG4') continue;
    try { const r = dimEval(k.expr, varsOf(doc, id)); if (r.du) { k.du = r.du; n++; } } catch (e) { /* formula que hoy no se puede evaluar: sigue sin unidad */ }
  }
  refScales(doc);
  return n;
}

// Evalua en orden las cotas definidas con formula. { ok: true } o { ok: false, error } sin dejar nada a medias:
// si algo falla no se modifica ninguna cota.
// omega < 1 amortigua (subrelajacion): el valor nuevo solo avanza esa fraccion hacia el de la formula; evita que una
// realimentacion con pendiente -1 oscile para siempre al repetir.
// hook(id, viejo, formula): si se da, decide el valor nuevo (settle lo usa para aplicar el metodo de la secante).
export function recompute(doc, omega = 1, hook = null) {
  syncUserUnits(doc); // las unidades de usuario del dibujo («2'persona») antes de evaluar
  for (const [, k] of drivers(doc)) if (k.t === 'ANG' && k.expr && k.cur === undefined) initAngle(doc, k); // las angulares con formula usan valor continuo
  refScales(doc); // las de solo lectura con escala con formula («Escala: eF») siguen a sus variables
  const dr = drivers(doc), byName = new Map(named(doc).map(([id, k]) => [k.name, id])), f = dr.filter(([, k]) => k.expr);
  const deps = new Map(), tv = tvOf(doc);
  // una variable de texto que se define despues de la cota (mas abajo o mas a la derecha) todavia no existe para ella
  const hintLate = (m) => { const q = /No reconozco «(.+?)»/.exec(m); if (q && tv.cleared?.has(q[1])) return `«${q[1]}» no está definida en el lugar de esta cota: se borró con clear() antes o se define más abajo`; return q && tv.names.has(q[1]) ? `«${q[1]}» se define después de esta cota en el orden de lectura (más abajo o más a la derecha de su etiqueta)` : m; };
  for (const [id, k] of f) {
    const ids = [];
    for (const n of exprRefs(srcOf(k), (q) => byName.has(q) || tv.names.has(q) || isGeoName(doc, q))) {
      if (n === k.name) return { ok: false, error: `${k.name} no puede usarse en su propia fórmula` };
      if (!byName.has(n) && !tv.names.has(n) && !isGeoName(doc, n)) return { ok: false, error: `En la fórmula de ${k.name}: «${n}» no es una cota ni una variable` };
    }
    for (const n of dimRefs(doc, srcOf(k), tv)) { // tambien las cotas de las que dependen las variables de texto que lee
      if (n === k.name) return { ok: false, error: `${k.name} no puede usarse en su propia fórmula (la lee a través de una variable de texto)` };
      if (byName.has(n)) ids.push(byName.get(n));
    }
    deps.set(id, ids);
  }
  const order = [], state = new Map();
  let cycle = null;
  const visit = (id, path) => {
    if (cycle) return;
    if (state.get(id) === 2) return;
    if (state.get(id) === 1) { cycle = [...path.slice(path.indexOf(id)), id].map((x) => doc.cons[x].name).join(' → '); return; }
    state.set(id, 1);
    for (const d of deps.get(id) || []) if (deps.has(d)) visit(d, [...path, id]);
    state.set(id, 2);
    order.push(id);
  };
  for (const [id] of f) visit(id, []);
  if (cycle) return { ok: false, error: `Las cotas se definen en círculo: ${cycle}` };
  const bak = JSON.stringify(doc.cons);
  let resid = 0; // cuanto se aleja cada valor actual de lo que dice su formula (antes de amortiguar)
  for (const id of order) {
    const k = doc.cons[id];
    let val, qd;
    try {
      if (k.t === 'ANG') val = parseValue(k.expr, { angle: true, radians: k.unit === 'rad', vars: varsOf(doc, id) });
      else { const r = dimEval(k.expr, varsOf(doc, id)); val = r.v; qd = r.d; if (r.du) k.du = r.du; else delete k.du; } // la etiqueta dice la unidad de la formula
    } catch (e) { doc.cons = JSON.parse(bak); return { ok: false, error: `${k.name}: ${hintLate(e.message)}` }; }
    if (k.scaleExpr && k.t !== 'ANG') { // escala con formula: «30[*k]», «30'kN[*eF]»; se reevalua con las variables de ahora
      try { const s = scaleEval(k.scaleExpr, varsOf(doc, id), qd); k.scale = s.sc; if (s.rep) k.srep = true; else delete k.srep; } catch (e) { doc.cons = JSON.parse(bak); return { ok: false, error: `${k.name}: ${hintLate(e.message)}` }; }
    }
    if (k.scale > 0 && k.t !== 'ANG') val *= k.scale; // cota a escala: el dibujo mide el valor por la escala
    if (k.t === 'ANG') { // el angulo no tiene limite (400° = una vuelta y 40°): se trabaja con el valor continuo
      const old = k.cur;
      resid = Math.max(resid, Math.abs(val - old) / (1 + Math.abs(val)));
      k.cur = hook ? hook(id, old, val, false) : omega === 1 ? val : old + omega * (val - old);
      k.v = angTrue(doc, { ...k, ref: false }, k.cur);
    } else {
      if (!(val > 0)) { doc.cons = JSON.parse(bak); return { ok: false, error: `${k.name} quedaría en ${Math.round(val * 1000) / 1000}: debe ser mayor que cero` }; }
      const tv = k.t === 'RAD' && k.refs[0] in doc.circles ? val / 2 : val;
      resid = Math.max(resid, Math.abs(tv - k.v) / (1 + Math.abs(tv)));
      k.v = hook ? hook(id, k.v, tv, true) : omega === 1 ? tv : k.v + omega * (tv - k.v);
    }
  }
  return { ok: true, count: order.length, resid };
}

// Quita la formula (queda el valor actual) de las cotas cuyas variables ya no existen.
// Devuelve los nombres afectados.
export function pruneFormulas(doc) {
  const names = new Set([...named(doc).map(([, k]) => k.name), ...textVarNames(doc)]), out = [];
  for (const k of Object.values(doc.cons)) {
    if (!k.expr) continue;
    if (!isNamedDim(k) || k.ref || exprRefs(srcOf(k), (q) => names.has(q) || isGeoName(doc, q)).some((n) => !(names.has(n) || isGeoName(doc, n)) || n === k.name)) { delete k.expr; delete k.scaleExpr; if (k.name) out.push(k.name); }
  }
  return out;
}

// ¿Alguna cota con formula lee una cota de solo lectura? Entonces cada cambio de la geometria puede mover esas cotas.
export function hasReactive(doc) {
  return hasGoals(doc) || hasReactiveBase(doc); // una meta «solve(…; D1)=» se vuelve a cumplir con cada cambio
}
function hasReactiveBase(doc) {
  const refs = new Set(named(doc).filter(([, k]) => k.ref).map(([, k]) => k.name));
  const st = tvOf(doc);
  return drivers(doc).some(([, k]) => k.expr && [...dimRefs(doc, srcOf(k), st)].some((n) => refs.has(n) || isGeoName(doc, n))); // una propiedad de la geometria (p1.x) tambien se lee del dibujo
}

// Puntos que miden las cotas de solo lectura que leen las formulas (las entradas del sistema).
function measuredPoints(doc) {
  const want = new Set(), st = tvOf(doc);
  for (const [, k] of drivers(doc)) if (k.expr) for (const n of dimRefs(doc, srcOf(k), st)) want.add(n);
  const pts = new Set();
  for (const n of want) for (const q of geoPoints(doc, n)) pts.add(q);
  const endsOf = (lid) => { const l = doc.lines[lid]; if (l) { pts.add(l.a); pts.add(l.b); } };
  for (const [, k] of named(doc)) {
    if (!k.ref || !want.has(k.name)) continue;
    if (k.t === 'DIST') k.refs.forEach((p) => pts.add(p));
    else if (k.t === 'DISTPL') { pts.add(k.refs[0]); endsOf(k.refs[1]); }
    else if (k.t === 'ANG') k.refs.forEach(endsOf);
    else if (k.t === 'RAD') { const o = doc.circles[k.refs[0]] || doc.arcs[k.refs[0]]; if (o) pts.add(o.c); }
  }
  return pts;
}

// ¿La geometria cumple las cotas con formula? (con puntos fijos, el solver puede dar por buena una cota que no se cumple)
function formulasHold(doc) {
  for (const [, k] of drivers(doc)) {
    if (!k.expr) continue;
    const m = dimValue(doc, { ...k, ref: true }), tv = k.t === 'ANG' ? k.cur : k.v;
    if (Math.abs(m - tv) > 2e-3 * (1 + Math.abs(tv))) return false;
  }
  return true;
}

// Recalcula las formulas y resuelve la geometria; si alguna lee cotas de solo lectura, repite hasta que las formulas
// concuerden con lo medido. Es un punto fijo x = g(x) (x: valor de la cota, g: lo que da su formula con la geometria
// ya resuelta). La primera vuelta es directa; despues se usa el metodo de la secante por cota (converge en pocas
// vueltas aunque la pendiente de g sea -1, donde la repeticion simple oscilaria) y, si la secante no sirve, se
// amortigua a la mitad. solveFn(doc, targets) devuelve { ok }. Resultado: { ok, error?, iter, count }.
// Metas sobre el dibujo: «solve(ecuaciones; D1; D2)=» en un texto con cotas como incognitas. Las cotas deben mover el dibujo (no de solo
// lectura) y no tener formula. Devuelve null (no hay), { err } o { ids, goals }.
const hasGoals = (doc) => Object.values(doc.texts || {}).some((t) => /solve\s*\(/i.test(String(t.text ?? ''))) && textVars(doc).goals?.length > 0;
function goalsOf(doc) {
  if (!hasGoals(doc)) return null;
  const st = textVars(doc), byName = new Map(named(doc).map(([id, k]) => [k.name, id])), ids = [], seen = new Set();
  for (const g of st.goals) for (const n of g.names) {
    const id = byName.get(n), k = id && doc.cons[id];
    if (!k) return { err: `solve(…): «${n}» no es una cota con nombre` };
    if (k.ref) return { err: `solve(…): ${n} es de solo lectura; la incógnita debe ser una cota que mueve el dibujo` };
    if (k.expr) return { err: `solve(…): ${n} tiene fórmula; quítasela para que la meta la mueva` };
    if (seen.has(id)) return { err: `solve(…): ${n} es incógnita de dos solve` };
    seen.add(id); ids.push(id);
  }
  return { ids, goals: st.goals };
}
// Con metas: un Levenberg-Marquardt por fuera del solver geometrico. Cada prueba pone las cotas incognita, resuelve el dibujo (con las
// cotas que leen medidas, settleBase) y mide las ecuaciones en el lugar de su solve. Si no se cumplen, el dibujo queda como estaba.
export function settle(doc, solveFn, targets = [], opts = {}) {
  const gs = goalsOf(doc);
  if (!gs) return settleBase(doc, solveFn, targets, opts);
  if (gs.err) return { ok: false, error: gs.err, iter: 1 };
  const bak = JSON.stringify(doc);
  const restore = () => { const o = JSON.parse(bak); for (const k of Object.keys(doc)) delete doc[k]; Object.assign(doc, o); };
  const calc = (s, vv) => { const r = evalExpr(s, { vars: vv, allowMat: true }); if (r.mat) throw new Error(`«${s.trim()}» da un vector o una matriz: cada ecuación es entre números`); return r; };
  const evals = gs.goals.map((g) => ({ k: g.k, f: eqResiduals(g.eqs, calc) })), m = gs.goals.reduce((s, g) => s + g.eqs.length, 0);
  let iter = 0, last = null;
  const evalFn = (xs) => {
    xs.forEach((x, i) => { if (!(x > 0)) throw new Error('una cota quedaría en cero o negativa'); doc.cons[gs.ids[i]].v = x; });
    const r = settleBase(doc, solveFn, targets, opts);
    iter += r.iter || 1;
    if (!r.ok) throw new Error(r.error || 'el dibujo no se pudo resolver');
    last = r;
    const st = textVars(doc);
    return evals.flatMap((e) => e.f(st.outEnv.get(e.k) || {}));
  };
  try {
    const x0 = gs.ids.map((id) => doc.cons[id].v);
    const xs = lmRoots(x0, evalFn, m, { tol: GOAL_TOL, step: 1e-5, maxIterations: 60 });
    evalFn(xs); // el dibujo queda con la solucion
    return { ok: true, iter, count: last?.count ?? 0 };
  } catch (e) {
    restore();
    return { ok: false, error: `solve(…): ${e.message}`, iter };
  }
}
function settleBase(doc, solveFn, targets = [], { maxIter = 40, tol = 1e-5 } = {}) {
  const loop = hasReactiveBase(doc);
  if (!loop) {
    const rc = recompute(doc);
    if (!rc.ok) return { ok: false, error: rc.error, iter: 1 };
    const r = solveFn(doc, targets);
    if (r.ok) trackAngles(doc);
    return r.ok ? { ok: true, iter: 1, count: rc.count } : { ok: false, error: null, iter: 1, count: rc.count };
  }
  const bak = JSON.stringify(doc);
  const restoreTo = (json) => { const o = JSON.parse(json); for (const k of Object.keys(doc)) delete doc[k]; Object.assign(doc, o); };
  const restore = () => restoreTo(bak);
  // Tres estrategias, de la mas fiel a la mas tolerante (la primera que cierra gana):
  //  1. «entradas fijas»: los puntos que miden las cotas de solo lectura de las formulas (las entradas) y el punto arrastrado
  //     que ya llego a su destino se dejan fijos mientras se resuelve. Asi la salida no puede "empujar" a la entrada (en una
  //     evolvente, mover el punto tangente en vez de alargar la cuerda) y la formula no persigue su propia cola.
  //  2. secante con el punto arrastrado ya llegado fijo y, si no, el objetivo suave de siempre (casos donde la entrada tiene
  //     que moverse para cumplir la salida).
  //  3. repeticion amortiguada.
  const near = (t) => doc.pts[t.id] && Math.hypot(doc.pts[t.id].x - t.x, doc.pts[t.id].y - t.y) <= 1e-5;
  const solvePinned = (ids, tg) => {
    ids.forEach((id) => { doc.pts[id].fixed = true; });
    try { return solveFn(doc, tg); } finally { ids.forEach((id) => { if (doc.pts[id]) doc.pts[id].fixed = false; }); }
  };
  // Un destino que la geometria no puede alcanzar del todo (el punto esta sobre un circulo y el raton no) nunca queda
  // «llegado»: cada vuelta lo seguiria atrayendo y las formulas corren detras de un punto que se mueve un poco en
  // cada una, con una resolucion cara por vuelta. Desde la 2.a vuelta ese punto se deja donde la 1.a lo puso (el
  // siguiente movimiento del raton lo vuelve a atraer): las vueltas siguientes solo ajustan las formulas.
  let pulled = false;
  const run = (withInputs) => {
    const live = (t) => doc.pts[t.id] && !doc.pts[t.id].fixed;
    const moving = new Set(pulled ? [] : targets.filter((t) => !near(t)).map((t) => t.id));
    const arrived = targets.filter((t) => live(t) && (pulled || near(t))).map((t) => t.id);
    const tg = pulled ? [] : targets.filter((t) => !near(t));
    if (withInputs) {
      const inputs = [...measuredPoints(doc)].filter((id) => doc.pts[id] && !doc.pts[id].fixed && !moving.has(id));
      const r = solvePinned([...new Set([...inputs, ...arrived])], tg);
      return r.ok && formulasHold(doc) ? r : { ok: false, conflicts: r.conflicts || [] }; // con puntos fijos, el solver puede dar por buena una cota que no se cumple
    }
    if (arrived.length) { const r = solvePinned(arrived, tg); if (r.ok) return r; }
    return solveFn(doc, targets);
  };
  let last = null;
  const modes = measuredPoints(doc).size ? ['pinned', 'secant', 'damped'] : ['secant', 'damped'];
  for (const mode of modes) {
    const hist = new Map();
    const hook = (id, old, tv, positive) => {
      if (mode === 'damped') return old + 0.5 * (tv - old);
      const h = hist.get(id);
      hist.set(id, { x: old, g: tv });
      if (!h) return tv;
      const dx = old - h.x;
      if (Math.abs(dx) > 1e-12) {
        const d = (tv - h.g) / dx - 1; // pendiente de g(x) - x
        if (Number.isFinite(d) && Math.abs(d) > 1e-3) {
          const nx = old - (tv - old) / d;
          if (Number.isFinite(nx) && (!positive || nx > 0) && Math.abs(nx - old) <= 20 * Math.abs(tv - old) + 1e-9) return nx;
        }
      }
      return old + 0.5 * (tv - old);
    };
    if (mode !== modes[0]) restore();
    last = null; // el motivo del fallo es el de la ultima estrategia
    pulled = false;
    for (let i = 1; i <= (mode === 'damped' ? 2 * maxIter : maxIter); i++) {
      const snap = JSON.stringify(doc);
      const rc = recompute(doc, 1, hook);
      if (!rc.ok) { restore(); return { ok: false, error: rc.error, iter: i }; }
      if (i > 1 && rc.resid <= tol) return { ok: true, iter: i, count: rc.count };
      let r = run(mode === 'pinned');
      if (!r.ok) { // un cambio grande de golpe: se reintenta avanzando solo una fraccion hacia el valor de las formulas
        for (const w of [0.5, 0.25, 0.125, 0.0625]) {
          restoreTo(snap); recompute(doc, w);
          r = run(mode === 'pinned');
          if (r.ok) break;
        }
      }
      if (!r.ok) { last = { ok: false, error: null, iter: i, count: rc.count }; break; }
      pulled = true;
      trackAngles(doc); // los angulos de referencia siguen la medida (sin saltos de 180° a 0°)
    }
  }
  restore();
  return last || { ok: false, error: 'Las cotas con fórmulas que leen medidas no se estabilizan: una depende de otra que cambia al resolverla (¿se realimentan?)', iter: maxIter };
}

export { DIM_KIND, dimLetter };

// Campos enteros de las herramientas (matrices, dividir) que aceptan variables: cotas y variables de los textos.
// Un entero tecleado como numero simple debe ser entero; una formula o variable se redondea al entero mas cercano
// (como round(formula;0)). Devuelve { n } o { err }.
export function readInt(doc, txt, label, min, max) {
  const t = String(txt).trim();
  let n;
  if (isPlainNumber(t)) { n = Number(t.replace(',', '.')); if (!Number.isInteger(n)) return { err: `${label}: debe ser un entero de ${min} a ${max}` }; }
  else { try { n = Math.round(parseValue(t, { vars: varsOf(doc) })); } catch (e) { return { err: `${label}: ${e.message}` }; } }
  if (!(n >= min && n <= max)) return { err: `${label}: debe ser un entero de ${min} a ${max}` };
  return { n };
}
// Parte una lista de enteros por espacios, comas o punto y coma fuera de parentesis (round(z/2;0) es un solo elemento).
export function splitTop(txt) {
  const out = []; let cur = '', depth = 0;
  for (const ch of String(txt)) {
    if (ch === '(') depth++; else if (ch === ')') depth = Math.max(0, depth - 1);
    if (depth === 0 && /[\s,;]/.test(ch)) { if (cur) out.push(cur); cur = ''; } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}
