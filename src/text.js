// Geometria de los textos: caja imaginaria, punto de insercion y orientacion. Sin DOM.
// measure(linea) -> ancho de la linea para una altura de texto de 1 (en el navegador sale
// de measureText; en las pruebas puede ser una aproximacion).
import { evalExpr, setAngleMode, rngSet, rngMix, rngReset, approxTol, cellsPlain } from './expr.js';
import { varsOf, textVars } from './params.js';
import { IT0, IT1, VB0, VB1, NM0, NM1, runsOf, calcParse, calcStmts, contBack, showFlat, scriptStmt, clearCall, solveCall, unitDefOf, UDEF_ERR } from './tvars.js';
import { normName, exprRefs } from './expr.js';
import { parseUnit, sameDim, autoUnit } from './units.js';
export { runsOf, plainText } from './tvars.js';
import { fmtNum } from './dims.js';
import { hasMath, layoutText, splitMath } from './mathlayout.js';
import { isWord } from './asciimath.js';
import { hasMd } from './markdown.js';
import { localNum, elemChar, rowChar, argText, sciFrom, sciText } from './locale.js';
export { hasMath } from './mathlayout.js';

// Calculo en los textos (dentro de una formula, ver tvars.js): una salida «expr=» se dibuja «expr=valor»; la expresion puede usar los nombres
// de las cotas (D1, A1, O2...) y funciones: «$O1=$», «$A1/(2π)=$». Un ángulo vale su medida en radianes. Si la expresion falla, el valor es ⚠.
// Definiciones de variables: «x:valor» se muestra como «x:=valor» en cursiva (entre marcas IT0 e IT1, ver runsOf); si la
// definicion no vale (repetida, choca con una cota, falla) lleva un ⚠ al final. Un literal `...` se dibuja sin los acentos y sin calcular.
// Un vector en un texto: «[1, 2, 3]»; si tiene mas de 8 elementos, los 4 primeros y los 2 ultimos.
// Una matriz en un texto: «[1, 2, 3]» (fila), «[1; 2; 3]» (columna), «[1, 2; 3, 4]»; con mas de 8 columnas o filas, las 4 primeras y las 2 ultimas.
const matText = (m, fmt = fmtNum) => {
  const row = (r) => (r.length > 8 ? [...r.slice(0, 4).map((x) => fmt(x)), '…', ...r.slice(-2).map((x) => fmt(x))] : r.map((x) => fmt(x)));
  let rows = m.map(row);
  if (rows.length > 8) rows = [...rows.slice(0, 4), rows[0].map(() => '⋮'), ...rows.slice(-2)];
  return '[' + rows.map((r) => r.join(elemChar() + ' ')).join(rowChar() === ';' ? '; ' : ' | ') + ']'; // «[1, 2; 3, 4]»; con coma decimal «[1; 2 | 3; 4]»
};
// Una unidad dentro de una formula: texto recto separado del valor («^2» y «^3» como superindices).
const unitMath = (u) => ' " ' + u.split('^2').join('²').split('^3').join('³') + '"';
// Unidades escritas dentro de una expresion («250'N», «3'(m/s)»): se dibujan como unidad, no como «'».
const showU = (seg) => (seg.includes("'") ? seg.replace(/'\s*(\([^()]*\)|[A-Za-zµμΩ°%áéíóúñÑ_][A-Za-zµμΩ°%áéíóúñÑ_0-9]*[²³]?)/g, (m, u, at) => {
  const v = u.replace(/^\(|\)$/g, '');
  // pegada a un nombre, la comilla es una prima si lo que sigue no es una unidad: «f'(3)», «σ'_(a)» (ver primesAt en expr.js)
  const keep = () => "'" + showU(m.slice(1)); // una prima: lo que sigue se sigue revisando («S_e'(500'MPa)»: la unidad de dentro si se dibuja)
  if (/[A-Za-z0-9α-ωΑ-Ωϑϕϖɛ_']/.test(seg[at - 1] || '')) { if (u[0] === '(' && !/[A-Za-zµμΩ°%]/.test(v)) return keep(); try { parseUnit(v); } catch (e) { return keep(); } }
  return unitMath(v);
}) : seg);
// Un numero en una unidad: los muy pequeños con 4 cifras significativas (fmtNum los dejaria en 0); sin el «.0» de fmtNum en los miles.
const fmtQ = (x) => (Math.abs(x) >= sciFrom() && Number.isFinite(x) ? sciText(x) : localNum(x !== 0 && Math.abs(x) < 1e-3 ? String(Number(x.toPrecision(4))) : String(Number(x.toFixed(Math.abs(x) >= 1000 ? 1 : 3)))));
// Una cantidad con unidades: en la unidad pedida («F='kN»), si no en la de la variable («F:250'N»), en la de una variable de la expresion
// de texto con la misma magnitud (no la de una cota), o en la habitual del sistema de unidades del documento (autoUnit). ⚠ si la unidad pedida no es de la misma magnitud.
// La unidad en que se muestra (con su factor al SI); null si la pedida no es de la misma magnitud. v: el valor que decide el prefijo automatico.
// La magnitud de un vector (su texto, t.vecOf) es su etiqueta: ahi si manda la unidad de su cota («30 kN»), como en la etiqueta de una cota.
let KEEP_DIM_UNIT = false;
function pickUnit(dim, env, src, want, v) {
  if (want) { const u = parseUnit(want); return sameDim(dim, u.d) ? { name: want, f: u.f } : null; }
  for (const n of [normName(String(src).trim()), ...exprRefs(src)]) { const x = env?.[n]; if (x?.pu && (!x.dv || KEEP_DIM_UNIT) && sameDim(x.d, dim)) return { name: x.pu, f: x.pf }; } // la de una cota no: manda el sistema de unidades
  return autoUnit(v, dim);
}
const tailOf = (n, math) => (math ? unitMath(n) : ' ' + n);
// Un numero complejo: «3+4j», «3-4j», «4j»; una parte que redondea a 0 no se muestra (exp(jπ) = -1). f: el formato de cada parte.
const numFmt = (x) => (Math.abs(x) > approxTol() ? (Math.abs(x) < 1e-3 ? fmtQ(x) : fmtNum(x)) : fmtNum(x));
// Un numero sin unidades distinto de 0 que es «≈ 0» (|x| <= tolerancia de ≈, la del dibujo) se muestra «≈0»: es ruido de redondeo, no un cero exacto.
const fmtPlain = (x) => (x !== 0 && Math.abs(x) <= approxTol() ? '≈0' : Math.abs(x) < 1e-3 && x !== 0 ? fmtQ(x) : fmtNum(x));
const isZeroTxt = (s) => /^-?0(?:[.,]0*)?$/.test(s);
function cfmt(re, im, f) {
  const R = f(re), I = f(Math.abs(im));
  if (isZeroTxt(I)) return R;
  if (isZeroTxt(R)) return (im < 0 ? '-' : '') + I + 'j';
  return R + (im < 0 ? '-' : '+') + I + 'j';
}
// Cadenas: se muestran entre comillas tipograficas, como texto recto («msg = “Cumple”»); un vector de cadenas, «[“a”, “b”]».
const STR_RE = /"(?:[^"]|"")*"|“[^”"]*[”"]|”[^“”"]*[“”"]/g;
const asText = (s) => '"' + String(s).replace(/"/g, '″') + '"'; // texto de AsciiMath (no puede llevar «"» dentro)
const showStr = (r, math) => { const q = (x) => '“' + x + '”', t = r.cells ? cellsPlain(r.cells) : r.strs ? '[' + r.strs.map(q).join(elemChar() + ' ') + ']' : q(r.str); return math ? asText(t) : t; };
// Una formula con cadenas literales: lo de afuera pasa por f (unidades, subindices); cada cadena se dibuja como texto, sin tocar su interior («"it's"» no tiene segundos)
const outStr = (seg, f) => { let out = '', at = 0; for (const m of seg.matchAll(STR_RE)) { out += f(seg.slice(at, m.index)) + asText('“' + m[0].slice(1, -1).replace(/""/g, '"') + '”'); at = m.index + m[0].length; } return out + f(seg.slice(at)); };
const parC = (s) => (/[+-]/.test(s.slice(1)) ? '(' + s + ')' : s); // «(3+4j) Ω»
function qty(r, env, src, want, math) {
  if (r.im) { // complejo: las dos partes en la misma unidad (el prefijo, segun el modulo)
    const mag = Math.hypot(r.value, r.im);
    if (want) { const u = pickUnit(r.dim, env, src, want, mag); return u ? parC(cfmt(r.value / u.f, r.im / u.f, fmtQ)) + tailOf(want, math) : '⚠'; }
    if (!r.dim) return cfmt(r.value, r.im, numFmt);
    const u = pickUnit(r.dim, env, src, null, mag);
    return parC(cfmt(r.value / u.f, r.im / u.f, fmtQ)) + tailOf(u.name, math);
  }
  if (want) { const u = pickUnit(r.dim, env, src, want, r.value); return u ? fmtQ(r.value / u.f) + tailOf(want, math) : '⚠'; }
  if (!r.dim) return fmtPlain(r.value); // 3e-4 no sale como 0; el ruido de redondeo (sin(180)) sale «≈0»
  const u = pickUnit(r.dim, env, src, null, r.value);
  return fmtQ(r.value / u.f) + tailOf(u.name, math);
}
// Un vector o una matriz: dentro de una formula entre marcas VB0/VB1 (se dibuja como vector fila, sin comas). Con unidades, todos los
// elementos en la misma unidad, elegida como en qty (el prefijo automatico, segun el elemento mas grande).
function matQ(m, dim, env, src, want, math, mi = null) {
  const box = (s) => (math ? VB0 + s + VB1 : s);
  if (mi) { // matriz compleja: cada elemento como «3+4j»
    const cell = (k, f) => m.map((r, i) => r.map((x, q) => cfmt(x / k, mi[i][q] / k, f)));
    if (!dim) return want ? '⚠' : box(matText(cell(1, numFmt), (x) => x));
    const u = pickUnit(dim, env, src, want, Math.max(...m.flat().map((x, q) => Math.hypot(x, mi.flat()[q]))));
    return u ? box(matText(cell(u.f, fmtQ), (x) => x)) + tailOf(want || u.name, math) : '⚠';
  }
  if (!dim) return want ? '⚠' : box(matText(m, fmtPlain));
  const u = pickUnit(dim, env, src, want, Math.max(...m.flat().map(Math.abs)));
  return u ? box(matText(m.map((r) => r.map((x) => x / u.f)), fmtQ)) + tailOf(want || u.name, math) : '⚠';
}
export function textValue(doc, t) {
  KEEP_DIM_UNIT = !!t?.vecOf;
  try { return textValue1(doc, t); } finally { KEEP_DIM_UNIT = false; }
}
// Un script («%f(x):» con su programa, ver script.js) se dibuja como un bloque de codigo: colapsado, solo su firma en un cuadro
// («▸ suma2(n)», con ⚠ si tiene un error); expandido (t.open), la firma y el programa tal como se escribio, y el error al final.
function scriptShown(doc, t, s) {
  const p = scriptStmt(s);
  let err = p.err || null;
  if (!err && p.name) { const e = textVars(doc).errs.get(p.name); if (e) err = e.replace(/^script «[^»]*»: /, ''); }
  const fence = (body) => '```\n' + body + '\n```';
  if (!t.open) return fence('▸ ' + p.sig + (err ? '  ⚠' : ''));
  const lines = s.split('\n'), head = lines[0].replace(/^%\s*/, '');
  return fence(['▾ ' + head, ...lines.slice(1), ...(err ? ['⚠ ' + err] : [])].join('\n'));
}
// Una biblioteca insertada (t.lib, ver library.js y tvars.js) se dibuja como un bloque: colapsado, «▸ Nombre (alias) · v3», con ⚠ si algo
// suyo falla o sus ángulos no son los del documento, y «⟳ v4» si en MyLibrary/ hay una versión nueva; expandido (t.open), sus nombres públicos.
function libShown(doc, t) {
  const L = t.lib, A = L.alias || '', fence = (body) => '```\n' + body + '\n```';
  const errs = [...textVars(doc).errs].filter(([n]) => n.startsWith(A + '.')).map(([, m]) => m);
  const angBad = L.angles && (L.angles === 'rad') !== (doc.angles === 'rad');
  const head = (L.name || 'Biblioteca') + ' (' + A + ') · v' + (L.version || 0) + (errs.length || angBad ? '  ⚠' : '') + (t.libNew > (L.version || 0) ? '  ⟳ v' + t.libNew : '');
  if (!t.open) return fence('▸ ' + head);
  const sig = (d) => A + '.' + d.name + (d.params ? '(' + d.params.join(', ') + ')' : '');
  const pub = (L.defs || []).filter((d) => (L.exports || []).includes(d.name)).map((d) => '  ' + sig(d));
  return fence(['▾ ' + head, ...pub, ...(angBad ? [`⚠ la biblioteca usa ángulos en ${L.angles === 'rad' ? 'radianes' : 'grados'} y este documento en ${doc.angles === 'rad' ? 'radianes' : 'grados'}`] : []), ...errs.map((m) => '⚠ ' + m)].join('\n'));
}
function textValue1(doc, t) {
  setAngleMode(doc);
  if (t.lib) return libShown(doc, t);
  const s = String(t.text ?? '');
  if (s[0] === '%') return scriptShown(doc, t, s);
  const hasSub = s.includes('$') && s.includes('_(');
  if (!hasSub && !(s.includes('$') && /[:=`]/.test(s))) return showFlat(s);
  const toks = calcParse(s), pieces = toks.flatMap((tk) => (tk.t === 'math' ? tk.lines.flat() : []));
  const badU = (p) => p.k === 'code' && UDEF_ERR.has(String(p.s).trim()) && unitDefOf(p.s); // definicion de unidad que no vale: ⚠
  if (!hasSub && pieces.every((p) => p.k === 'code' && !badU(p))) return showFlat(s);
  const hasDef = pieces.some((p) => p.k === 'def'), hasOut = pieces.some((p) => p.k === 'out');
  let vars = null, st = null, tid = null, idx = 0, oidx = 0;
  // Orden de lectura: cada salida y cada definicion ve las variables tal como estaban en ese punto de la pagina (ver textVarState)
  if (hasDef || (hasOut && Object.values(doc.texts || {}).some((x) => !!x.lib || calcStmts(x.text).some((p) => p.k === 'def' || (p.k === 'out' && (!!clearCall(p.expr) || /(?:^|[^A-Za-z0-9_.])rng\s*\(/.test(p.expr))))))) { tid = Object.keys(doc.texts || {}).find((k) => doc.texts[k] === t); st = textVars(doc); } // una biblioteca insertada tambien define
  // Nombres con subindice («var_(texto)») dentro de una formula: se marcan para dibujarlos como nombre con subindice de texto
  // (sin marcar, AsciiMath leeria «texto» como letras y simbolos sueltos: «to» seria una flecha).
  let subNames = null;
  // el prefijo de una biblioteca insertada («UF.» de UF.C_(surf)) se dibuja en gris: se ve que el nombre viene de la biblioteca
  let libRe;
  const libPre = (seg) => {
    if (!seg.includes('.')) return seg;
    if (libRe === undefined) { const al = [...new Set(Object.values(doc.texts || {}).map((x) => x.lib?.alias).filter((a) => /^[A-Za-z][A-Za-z0-9]{0,11}$/.test(a || '')))]; libRe = al.length ? new RegExp(`(?<![A-Za-z0-9_.'])(${al.join('|')})\\.(?=[A-Za-zα-ωΑ-Ωϑϕϖɛ_])`, 'g') : null; }
    return libRe ? seg.replace(libRe, 'color(gray)($1.)') : seg;
  };
  // Un nombre de varias letras («ancho», «D1», «area») es una sola variable, no letras sueltas: dentro de una fraccion («ancho/2») es el
  // numerador entero. Se marca como los nombres con subindice (NM0/NM1). No se tocan: lo que va entre comillas, lo ya marcado, los
  // simbolos con «\», las unidades («'mm»), text(...) y color(...), las palabras de AsciiMath o del calculo (sin, pi, mean…), un nombre
  // pegado a un numero («2e5»), a un punto («p1.x»), seguido de «_» (subindice de AsciiMath) ni el texto de un subindice «_(texto)».
  const PLAIN_ID = /("[^"]*")|(\uE004[^\uE005]*\uE005)|(\uE002[^\uE003]*\uE003)|((?:color|text)\([^()]*\))|(\\[A-Za-z]+)|('\s*[A-Za-zµμΩ°%áéíóúñÑ_][A-Za-zµμΩ°%áéíóúñÑ_0-9]*)|(?:_\([^(){}\n]*\))|((?<![A-Za-z0-9α-ωΑ-Ωϑϕϖɛ_.\\])[A-Za-z][A-Za-z0-9]*(?![A-Za-z0-9_]))(?=(\()?)/g;
  // Las funciones del documento («f(x):…», «area(r):…», las de una biblioteca): su nombre, seguido de «(», se marca como llamada (\uE006) para que
  // «1/f(x)» tome f(x) entero como denominador; un nombre que no es funcion seguido de «(» es un producto.
  let userFns = null;
  const isUserFn = (n) => (userFns ||= new Set([...(st ||= textVars(doc)).defs.filter((d) => d.params).map((d) => d.name), ...Object.values(doc.texts || {}).flatMap((x) => (x.lib?.defs || []).filter((d) => d.params).map((d) => d.name))])).has(n);
  const wrapPlain = (seg) => seg.replace(PLAIN_ID, (m, ...g) => {
    const nm = g[6];
    if (!nm || isWord(nm)) return m;
    const call = !!g[7] && isUserFn(nm);
    return nm.length < 2 && !call ? m : NM0 + nm + (call ? '\uE006' : '') + NM1;
  });
  const wrapNames = (seg0) => {
    const seg = wrapPlain(seg0);
    if (!seg.includes('_(')) return seg;
    subNames ||= new Set([...(st ||= textVars(doc)).names, ...Object.values(doc.texts || {}).flatMap((x) => (x.lib?.defs || []).map((d) => d.name))].filter((n) => n.includes('_('))); // tambien los de las bibliotecas insertadas (UF.Neuber_(steels)_(1,1) como Neuber_(steels)_(1,1))
    if (!subNames.size) return seg;
    return seg.replace(/(?<![A-Za-z0-9α-ωΑ-Ωϑϕϖɛ_])[A-Za-zα-ωΑ-Ωϑϕϖɛ_][A-Za-z0-9α-ωΑ-Ωϑϕϖɛ_]*?_\([^(){}\n]+\)/g, (m) => (subNames.has(normName(m)) ? NM0 + normName(m) + NM1 : m));
  };
  // Valor de una salida: dentro de una formula un vector sale entre marcas VB0/VB1 y se dibuja como vector fila (sin comas); fuera, como texto «[1, 2, 3]».
  const outVal = (p, math) => {
    if (clearCall(p.expr)) { // «clear(...)=»: lo resuelve el orden de lectura (textVarState): 1, 0 o ⚠
      if (!st) { st = textVars(doc); tid = Object.keys(doc.texts || {}).find((x) => doc.texts[x] === t); }
      const res = st.clearRes.get(tid + ':' + oidx++);
      return res && !res.err ? String(res.v) : '⚠';
    }
    if (solveCall(p.expr)) { // «solve(...)=»: «x = 3 m, y = 4 m» (lo resuelve el orden de lectura, textVarState)
      if (!st) { st = textVars(doc); tid = Object.keys(doc.texts || {}).find((x) => doc.texts[x] === t); }
      const res = st.solveRes.get(tid + ':' + oidx++);
      if (!res || res.err) return '⚠';
      const env = Object.fromEntries(res.vals.map(({ name, val }) => [name, val]));
      const cells = res.vals.map(({ name, val }) => name + '=' + qty({ value: val.v, rad: !!val.r, dim: val.d }, env, name, null, math));
      if (!res.vec) return cells.join(argText() + ' ');
      const col = '[' + cells.join(rowChar() === ';' ? '; ' : ' | ') + ']'; // un sistema con vectores da un vector columna «[x=3; y=4]»
      return math ? VB0 + col + VB1 : col;
    }
    try {
      const k0 = tid + ':' + oidx++, env = st?.outEnv.get(k0) || (vars ||= varsOf(doc)); // sin estado (un texto sin definiciones en el dibujo): las variables de siempre
      rngSet(st?.outRng?.get(k0) ?? rngMix(rngReset(), oidx)); // rand: la tirada de esta salida es siempre la misma (la pantalla se redibuja a menudo)
      if (st?.rngOut?.has(k0)) { const r0 = st.rngOut.get(k0); return qty(r0, env, p.expr, p.unit, math); } // «rng("shuffle")=»: la semilla que se uso al calcular, no una nueva en cada dibujo
      const r = evalExpr(p.expr, { vars: env, allowMat: true, allowCplx: true });
      if (r.str !== undefined || r.strs || r.cells) return showStr(r, math);
      return r.mat ? matQ(r.mat, r.dim, env, p.expr, p.unit, math, r.mi) : qty(r, env, p.expr, p.unit, math);
    } catch (e) { return '⚠'; }
  };
  // La magnitud de un vector («$D3=$», ver vectors.js) muestra solo el valor, como texto.
  if (t.vecOf && toks.length === 1 && pieces.length === 1 && pieces[0].k === 'out') return outVal(pieces[0], false);
  // «f(x):expr=»: «=» y el valor de f(x) con las variables de ese punto; nada si algun parametro no es una variable ahi; ⚠ si falla el calculo
  const fnVal = (callSrc, params, env) => {
    if (!env || params.split(/[;,]/).some((q) => !(normName(q.trim()) in env))) return '';
    try {
      const r = evalExpr(callSrc, { vars: env, allowMat: true, allowCplx: true });
      if (r.str !== undefined || r.strs || r.cells) return '=' + showStr(r, true);
      return '=' + (r.mat ? matQ(r.mat, r.dim, env, '', null, true, r.mi) : qty(r, env, '', null, true));
    } catch (e) { return '=⚠'; }
  };
  const piece = (p) => {
    if (p.k === 'lit') return p.closed ? p.s : '`' + p.s + ' ⚠'; // literal: se dibuja, no se calcula
    if (p.k === 'code') return badU(p) ? wrapNames(p.s) + ' ⚠' : wrapNames(p.s);
    if (p.k === 'out' && t.valOnly) return p.pre + outVal(p, true).replace(/^("?)“([^”]*)”("?)$/, '$1$2$3') + p.post; // «Mostrar solo el resultado»: expr= -> valor (un tablero, una tabla); una cadena, sin sus comillas
    if (p.k === 'out') return p.pre + outStr(p.expr, (q) => showU(wrapNames(libPre(q)))) + '=' + outVal(p, true) + p.post; // expr= -> expr=valor
    const name = normName(p.name), shown = name.includes('_(') ? NM0 + name + NM1 : name; // x:valor -> x:=valor (en cursiva)
    const dk = tid + ':' + idx++, bad = st.bad.has(dk);
    const val = !bad ? st.defVal.get(dk) : null, vm = val?.vec ? [val.vec] : val?.mat; // un vector o una matriz
    // escrito a mano («v:[1, 2, 3]») o un rango («a:1..5») se dibuja como vector; el resultado de una funcion («juego:mancala(…)»,
    // «v:linspace(…)»), su formula (como en SMath; con «v:expr=» tambien su valor)
    const mx = vm && (/^\s*\[/.test(p.expr) || !/[A-Za-zα-ωΑ-Ω_][\w.']*\s*\(/.test(p.expr)) ? vm : null;
    const call = p.params !== undefined ? '(' + p.params.trim() + ')' : ''; // funcion: f(x; y):=...
    // «x:expr=»: ademas del valor asignado, «=valor» (un vector escrito a mano ya muestra su valor)
    const shownVal = p.eq === undefined || mx ? '' : vm ? '=' + matQ(vm, val.d, { [name]: val }, name, null, true, val.mi) : val?.fn ? fnVal(name + call, p.params, st.fnEnv.get(dk)) : '=' + (val ? (val.str !== undefined || val.strs || val.cells ? showStr(val, true) : qty({ value: val.v, im: val.im, dim: val.d }, { [name]: val }, name, null, true)) : '⚠');
    // «x:valor'unidad»: la unidad va detras del valor; con «=valor», el valor ya sale en esa unidad
    const un = p.unit && !(shownVal && !shownVal.endsWith('⚠')) ? unitMath(p.unit.replace(/^\((.*)\)$/, '$1')) : '';
    return p.pre + (mx ? IT0 + shown + ':=' + IT1 + matQ(mx, val.d, { [name]: val }, name, null, true, val.mi) + (val.d ? '' : un) : IT0 + shown + call + ':=' + outStr(p.expr.trim(), (q) => showU(wrapNames(libPre(q)))) + (bad && !shownVal ? ' ⚠' : '') + IT1 + un + shownVal) + p.post;
  };
  // «Mostrar solo el resultado» con un bloque que es solo «expr=» y da una cadena: la cadena como texto normal, en la fuente del texto y con
  // sus espacios (un mensaje, una fila de una tabla alineada en monoespaciada); no como formula
  const plainStr = (tk) => {
    if (!t.valOnly || tk.t === 'txt' || tk.lines.length !== 1 || tk.lines[0].length !== 1 || tk.lines[0][0].k !== 'out') return null;
    const p = tk.lines[0][0];
    if (p.unit || st?.solveRes?.size && solveCall(p.expr)) return null;
    try {
      const k0 = tid + ':' + (oidx++), env = st?.outEnv.get(k0) || (vars ||= varsOf(doc));
      rngSet(st?.outRng?.get(k0) ?? rngMix(rngReset(), oidx));
      const r = evalExpr(p.expr, { vars: env, allowMat: true, allowCplx: true });
      if (typeof r.str === 'string') return r.str;
      if (r.strs) return r.strs.join('\n');
      oidx--; return null; // no es una cadena: la salida se dibuja como siempre (y se vuelve a contar)
    } catch (e) { oidx--; return null; }
  };
  return toks.map((tk) => { if (tk.t === 'txt') return tk.raw; const ps = plainStr(tk); return ps !== null ? ps : (tk.disp ? '$$' : '$') + contBack(tk, tk.lines.map((l) => l.map(piece).join('')).join('\n'), true) + (tk.disp ? '$$' : '$'); }).join('');
}
// El texto tal como se ve (con sus salidas calculadas): el mismo objeto si no hay ninguna.
export function shownText(doc, t) {
  const v = textValue(doc, t);
  const wrap = pageWrap(doc, t);
  return v === t.text && !wrap ? t : { ...t, text: v, ...(wrap ? { wrap } : {}) };
}
// Con pagina (doc.page = { w, m, x0 }, en mm): el texto une las lineas de sus parrafos y, si va horizontal, se ajusta al margen
// del lado hacia donde crece (desde su punto de insercion). Sin pagina («Sin limites»): cada salto de linea se respeta, sin ajuste.
export function pageWrap(doc, t) {
  const pg = doc?.page, P = pg && doc.pts?.[t.pt];
  if (!P || t.vecOf) return null;
  const { ang, anchor } = textPose(doc, t);
  if (Math.min(ang, 360 - ang) > 0.5) return { reflow: true };
  const L = (pg.x0 || 0) + pg.m, R = (pg.x0 || 0) + pg.w - pg.m, h = t.h || 1;
  const maxW = { l: R - P.x, r: P.x - L, c: 2 * Math.min(P.x - L, R - P.x) }[anchor[1]];
  return maxW > 2 * h ? { reflow: true, maxW: maxW / h } : { reflow: true };
}

// Con pagina, el margen izquierdo es un limite duro de los campos de texto, como lo es el derecho (donde el texto se parte): el punto de
// insercion de un texto horizontal no puede quedar a su izquierda. Devuelve ese x minimo (mm del dibujo) o null si el punto no es de un texto
// de esos: sin pagina, un texto en otro angulo (puede ir en el margen, p. ej. un rotulo vertical), un punto con restricciones, fijo, o
// que no es solo del texto (el extremo de una linea no se mueve porque un texto cuelgue de el). Los graficos pueden cruzar el margen.
export function textMarginX(doc, pid) {
  const pg = doc?.page, P = doc?.pts?.[pid];
  if (!pg || !P || !P.txOnly || P.fixed) return null;
  if (Object.values(doc.cons || {}).some((k) => (k.refs || []).includes(pid))) return null;
  const ts = Object.values(doc.texts || {}).filter((t) => t.pt === pid && !t.vecOf);
  if (!ts.length || ts.some((t) => { const { ang } = textPose(doc, t); return Math.min(ang, 360 - ang) > 0.5; })) return null;
  return (pg.x0 || 0) + pg.m;
}

export const ANCHORS = ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'];
export const ANCHOR_NAMES = {
  tl: 'esquina superior izquierda', tc: 'medio del lado superior', tr: 'esquina superior derecha',
  ml: 'medio del lado izquierdo', mc: 'centro', mr: 'medio del lado derecho',
  bl: 'esquina inferior izquierda', bc: 'medio del lado inferior', br: 'esquina inferior derecha',
};
export const LINE_SPACING = 1.2;

// Fuentes disponibles para los textos (las de iPad/Mac con alternativas genericas). '' = la del sistema.
export const FONTS = [
  ['', 'Predeterminada (sistema)', '-apple-system, system-ui, "Segoe UI", sans-serif'],
  ['sans', 'Helvetica / Arial', '"Helvetica Neue", Helvetica, Arial, sans-serif'],
  ['serif', 'Times / Georgia', '"Times New Roman", Times, Georgia, serif'],
  ['mono', 'Courier / Menlo', '"Courier New", Menlo, Consolas, monospace'],
  ['verdana', 'Verdana', 'Verdana, Geneva, sans-serif'],
  ['palatino', 'Palatino', 'Palatino, "Palatino Linotype", "Book Antiqua", serif'],
  ['optima', 'Optima', 'Optima, Candara, "Segoe UI", sans-serif'],
  ['futura', 'Futura', 'Futura, "Century Gothic", "Trebuchet MS", sans-serif'],
  ['typewriter', 'American Typewriter', '"American Typewriter", "Courier New", serif'],
  ['marker', 'Marker Felt (manuscrita)', '"Marker Felt", "Comic Sans MS", cursive'],
  ['bradley', 'Bradley Hand (manuscrita)', '"Bradley Hand", "Segoe Script", cursive'],
  ['snell', 'Snell Roundhand (cursiva)', '"Snell Roundhand", "Brush Script MT", cursive'],
];
export const fontCss = (key) => (FONTS.find((f) => f[0] === (key || '')) || FONTS[0])[2];

const norm360 = (a) => ((a % 360) + 360) % 360;
const flipAnchor = (a) => ({ t: 'b', b: 't', m: 'm' }[a[0]] + { l: 'r', r: 'l', c: 'c' }[a[1]]);

// Angulo del texto antes de aplicar la regla de legibilidad: absoluto, o el de la linea
// de referencia mas el desfase t.ang si el texto esta alineado con una linea (t.ref).
export function rawAngle(doc, t) {
  const l = t.ref && doc.lines?.[t.ref];
  if (!l) return norm360(t.ang || 0);
  const a = doc.pts[l.a], b = doc.pts[l.b];
  return norm360((Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + (t.ang || 0));
}

// Orientacion con la que realmente se dibuja. Si el texto es "legible" y quedaria boca abajo
// (entre 90 y 270 grados) se gira 180 y se cambia el punto de insercion por el opuesto de la
// caja: la caja queda en el mismo sitio de la hoja y el texto se lee de izquierda a derecha.
export function textPose(doc, t) {
  let ang = rawAngle(doc, t);
  let anchor = t.anchor ?? 'bl';
  if (t.readable !== false && ang > 90.0001 && ang <= 270.0001) {
    ang = norm360(ang + 180);
    anchor = flipAnchor(anchor);
  }
  return { ang, anchor };
}

// Ancho de una linea para altura 1: suma el de sus tramos (los de cursiva se miden aparte). measure(texto, fuente, cursiva).
export const lineWidth = (measure, line, font) => runsOf(line).reduce((w, r) => w + measure(r.s, font, r.it), 0);

// Caja en el sistema local del texto (x a la derecha, y arriba, origen en el punto de insercion).
// Margen del color de fondo de un texto alrededor de su caja (en alturas de letra).
export const TEXT_BG_PAD = 0.15;
export function textFrame(t, measure, anchor = t.anchor) {
  const src = String(t.text ?? '');
  const lines = src.split('\n');
  if (hasMath(src) || hasMd(src) || t.wrap) { // con formulas ($...$, $$...$$), Markdown o pagina: las lineas tienen alturas y estilos propios
    const m = layoutText(src, measure, t.font, t.wrap || {});
    const w = Math.max(0.0001, m.w * t.h), hh = Math.max(LINE_SPACING * t.h, m.hh * t.h);
    const ax = { l: 0, c: 0.5, r: 1 }[anchor?.[1] ?? 'l'], ay = { t: 0, m: 0.5, b: 1 }[anchor?.[0] ?? 'b'];
    const xmin = -ax * w, ymax = ay * hh;
    return { lines, w, hh, xmin, ymax, ymin: ymax - hh, math: m };
  }
  const w = Math.max(0.0001, ...lines.map((l) => lineWidth(measure, l, t.font) * t.h));
  const hh = lines.length * LINE_SPACING * t.h;
  const ax = { l: 0, c: 0.5, r: 1 }[anchor?.[1] ?? 'l'];
  const ay = { t: 0, m: 0.5, b: 1 }[anchor?.[0] ?? 'b'];
  const xmin = -ax * w, ymax = ay * hh;
  return { lines, w, hh, xmin, ymax, ymin: ymax - hh };
}

// Primitivas de un texto con formulas en el sistema local del texto (x a la derecha, y arriba, unidades del modelo):
// { k:'t', s, x, y (linea base), size, w (ancho medido; al dibujar no se pasa de el), it, font } y { k:'p', pts, lw }. Vacio si el texto no lleva formulas.
export function framePrims(f, t) {
  if (!f.math) return [];
  const h = t.h, X = (x) => f.xmin + x * h, Y = (y) => f.ymax - y * h;
  return f.math.prims.map((p) => (p.k === 't' ? { k: 't', s: p.s, x: X(p.x), y: Y(p.y), size: p.sz * h, ...(p.w > 0 ? { w: p.w * h } : {}), it: p.it, font: p.font, bold: p.bold, col: p.col } : { k: 'p', pts: p.pts.map(([x, y]) => [X(x), Y(y)]), lw: p.lw * h, col: p.col, ...(p.fill ? { fill: true } : {}), ...(p.op < 1 ? { op: p.op } : {}) }));
}

// Esquinas de la caja en coordenadas del modelo (antihorario).
export function textCorners(doc, t, measure) {
  const P = doc.pts[t.pt];
  const pose = textPose(doc, t);
  const f = textFrame(shownText(doc, t), measure, pose.anchor);
  const a = (pose.ang * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const to = (x, y) => ({ x: P.x + x * c - y * s, y: P.y + x * s + y * c });
  return [to(f.xmin, f.ymin), to(f.xmin + f.w, f.ymin), to(f.xmin + f.w, f.ymax), to(f.xmin, f.ymax)];
}

// Enlaces de un texto con su caja en coordenadas del modelo: [{ url, s (el texto visible), poly (4 esquinas, antihorario) }].
// Un enlace partido en dos lineas (por el ajuste al margen) da dos cajas con la misma url.
export function textLinkBoxes(doc, t, measure) {
  const P = doc.pts[t.pt];
  if (!P) return [];
  const pose = textPose(doc, t);
  const st = shownText(doc, t), f = textFrame(st, measure, pose.anchor);
  if (!f.math?.links?.length) return [];
  const h = st.h, a = (pose.ang * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const to = (x, y) => { const u = f.xmin + x * h, w = f.ymax - y * h; return { x: P.x + u * c - w * s, y: P.y + u * s + w * c }; };
  return f.math.links.map((L) => ({ url: L.url, s: L.s, poly: [to(L.x0, L.y1), to(L.x1, L.y1), to(L.x1, L.y0), to(L.x0, L.y0)] }));
}
// La url del enlace bajo el punto p (modelo), con un margen pad (unidades del modelo); null si no hay.
export function textLinkAt(doc, t, p, measure, pad = 0) {
  const P = doc.pts[t.pt];
  if (!P) return null;
  const pose = textPose(doc, t);
  const st = shownText(doc, t), f = textFrame(st, measure, pose.anchor);
  if (!f.math?.links?.length) return null;
  const a = (pose.ang * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), rx = p.x - P.x, ry = p.y - P.y;
  const x = (rx * c + ry * s - f.xmin) / st.h, y = (f.ymax - (-rx * s + ry * c)) / st.h, d = pad / st.h; // al sistema del layout
  const L = f.math.links.find((q) => x >= q.x0 - d && x <= q.x1 + d && y >= q.y0 - d && y <= q.y1 + d);
  return L ? L.url : null;
}

// ¿El punto p (modelo) cae dentro de la caja del texto, con un margen pad (unidades del modelo)?
export function textHit(doc, t, p, measure, pad = 0) {
  const P = doc.pts[t.pt];
  const pose = textPose(doc, t);
  const f = textFrame(shownText(doc, t), measure, pose.anchor);
  const a = (pose.ang * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const rx = p.x - P.x, ry = p.y - P.y;
  const u = rx * c + ry * s, w = -rx * s + ry * c; // al sistema local
  return u >= f.xmin - pad && u <= f.xmin + f.w + pad && w >= f.ymin - pad && w <= f.ymax + pad;
}
