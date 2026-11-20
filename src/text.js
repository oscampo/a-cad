// Geometria de los textos: caja imaginaria, punto de insercion y orientacion. Sin DOM.
// measure(linea) -> ancho de la linea para una altura de texto de 1 (en el navegador sale
// de measureText; en las pruebas puede ser una aproximacion).
import { evalExpr, setAngleMode } from './expr.js';
import { varsOf, textVars } from './params.js';
import { IT0, IT1, VB0, VB1, NM0, NM1, runsOf, calcParse, calcStmts, contBack, clearCall, solveCall, unitDefOf, UDEF_ERR } from './tvars.js';
import { normName, exprRefs } from './expr.js';
import { parseUnit, sameDim, autoUnit } from './units.js';
export { runsOf, plainText } from './tvars.js';
import { fmtNum } from './dims.js';
import { hasMath, layoutText, splitMath } from './mathlayout.js';
import { hasMd } from './markdown.js';
import { localNum, elemChar, rowChar, argText } from './locale.js';
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
const showU = (seg) => (seg.includes("'") ? seg.replace(/'\s*(\([^()]*\)|[A-Za-zµμΩ°%áéíóúñÑ_][A-Za-zµμΩ°%áéíóúñÑ_0-9]*[²³]?)/g, (m, u) => unitMath(u.replace(/^\(|\)$/g, ''))) : seg);
// Un numero en una unidad: los muy pequeños con 4 cifras significativas (fmtNum los dejaria en 0); sin el «.0» de fmtNum en los miles.
const fmtQ = (x) => localNum(x !== 0 && Math.abs(x) < 1e-3 ? String(Number(x.toPrecision(4))) : String(Number(x.toFixed(Math.abs(x) >= 1000 ? 1 : 3))));
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
function qty(r, env, src, want, math) {
  if (want) { const u = pickUnit(r.dim, env, src, want, r.value); return u ? fmtQ(r.value / u.f) + tailOf(want, math) : '⚠'; }
  if (!r.dim) return Math.abs(r.value) > 1e-12 ? (Math.abs(r.value) < 1e-3 ? fmtQ(r.value) : fmtNum(r.value)) : fmtNum(r.value); // 3e-4 no sale como 0; el ruido de redondeo (sin(180)) si
  const u = pickUnit(r.dim, env, src, null, r.value);
  return fmtQ(r.value / u.f) + tailOf(u.name, math);
}
// Un vector o una matriz: dentro de una formula entre marcas VB0/VB1 (se dibuja como vector fila, sin comas). Con unidades, todos los
// elementos en la misma unidad, elegida como en qty (el prefijo automatico, segun el elemento mas grande).
function matQ(m, dim, env, src, want, math) {
  const box = (s) => (math ? VB0 + s + VB1 : s);
  if (!dim) return want ? '⚠' : box(matText(m));
  const u = pickUnit(dim, env, src, want, Math.max(...m.flat().map(Math.abs)));
  return u ? box(matText(m.map((r) => r.map((x) => x / u.f)), fmtQ)) + tailOf(want || u.name, math) : '⚠';
}
export function textValue(doc, t) {
  KEEP_DIM_UNIT = !!t?.vecOf;
  try { return textValue1(doc, t); } finally { KEEP_DIM_UNIT = false; }
}
function textValue1(doc, t) {
  setAngleMode(doc);
  const s = String(t.text ?? '');
  const hasSub = s.includes('$') && s.includes('_(');
  if (!hasSub && !(s.includes('$') && /[:=`]/.test(s))) return s;
  const toks = calcParse(s), pieces = toks.flatMap((tk) => (tk.t === 'math' ? tk.lines.flat() : []));
  const badU = (p) => p.k === 'code' && UDEF_ERR.has(String(p.s).trim()) && unitDefOf(p.s); // definicion de unidad que no vale: ⚠
  if (!hasSub && pieces.every((p) => p.k === 'code' && !badU(p))) return s;
  const hasDef = pieces.some((p) => p.k === 'def'), hasOut = pieces.some((p) => p.k === 'out');
  let vars = null, st = null, tid = null, idx = 0, oidx = 0;
  // Orden de lectura: cada salida y cada definicion ve las variables tal como estaban en ese punto de la pagina (ver textVarState)
  if (hasDef || (hasOut && Object.values(doc.texts || {}).some((x) => calcStmts(x.text).some((p) => p.k === 'def')))) { tid = Object.keys(doc.texts || {}).find((k) => doc.texts[k] === t); st = textVars(doc); }
  // Nombres con subindice («var_(texto)») dentro de una formula: se marcan para dibujarlos como nombre con subindice de texto
  // (sin marcar, AsciiMath leeria «texto» como letras y simbolos sueltos: «to» seria una flecha).
  let subNames = null;
  const wrapNames = (seg) => {
    if (!seg.includes('_(')) return seg;
    subNames ||= new Set([...(st ||= textVars(doc)).names].filter((n) => n.includes('_(')));
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
      return res.vals.map(({ name, val }) => name + '=' + qty({ value: val.v, rad: !!val.r, dim: val.d }, env, name, null, math)).join(argText() + ' ');
    }
    try {
      const env = st?.outEnv.get(tid + ':' + oidx++) || (vars ||= varsOf(doc)); // sin estado (un texto sin definiciones en el dibujo): las variables de siempre
      const r = evalExpr(p.expr, { vars: env, allowMat: true });
      return r.mat ? matQ(r.mat, r.dim, env, p.expr, p.unit, math) : qty(r, env, p.expr, p.unit, math);
    } catch (e) { return '⚠'; }
  };
  // La magnitud de un vector («$D3=$», ver vectors.js) muestra solo el valor, como texto.
  if (t.vecOf && toks.length === 1 && pieces.length === 1 && pieces[0].k === 'out') return outVal(pieces[0], false);
  // «f(x):expr=»: «=» y el valor de f(x) con las variables de ese punto; nada si algun parametro no es una variable ahi; ⚠ si falla el calculo
  const fnVal = (callSrc, params, env) => {
    if (!env || params.split(/[;,]/).some((q) => !(normName(q.trim()) in env))) return '';
    try {
      const r = evalExpr(callSrc, { vars: env, allowMat: true });
      return '=' + (r.mat ? matQ(r.mat, r.dim, env, '', null, true) : qty(r, env, '', null, true));
    } catch (e) { return '=⚠'; }
  };
  const piece = (p) => {
    if (p.k === 'lit') return p.closed ? p.s : '`' + p.s + ' ⚠'; // literal: se dibuja, no se calcula
    if (p.k === 'code') return badU(p) ? wrapNames(p.s) + ' ⚠' : wrapNames(p.s);
    if (p.k === 'out') return p.pre + showU(wrapNames(p.expr)) + '=' + outVal(p, true) + p.post; // expr= -> expr=valor
    const name = normName(p.name), shown = name.includes('_(') ? NM0 + name + NM1 : name; // x:valor -> x:=valor (en cursiva)
    const dk = tid + ':' + idx++, bad = st.bad.has(dk);
    const val = !bad ? st.defVal.get(dk) : null, mx = val?.vec ? [val.vec] : val?.mat;
    const call = p.params !== undefined ? '(' + p.params.trim() + ')' : ''; // funcion: f(x; y):=...
    // «x:expr=»: ademas del valor asignado, «=valor» (un vector o una matriz ya muestran su valor)
    const shownVal = p.eq === undefined || mx ? '' : val?.fn ? fnVal(name + call, p.params, st.fnEnv.get(dk)) : '=' + (val ? qty({ value: val.v, dim: val.d }, { [name]: val }, name, null, true) : '⚠');
    // «x:valor'unidad»: la unidad va detras del valor; con «=valor», el valor ya sale en esa unidad
    const un = p.unit && !(shownVal && !shownVal.endsWith('⚠')) ? unitMath(p.unit.replace(/^\((.*)\)$/, '$1')) : '';
    return p.pre + (mx ? IT0 + shown + ':=' + IT1 + matQ(mx, val.d, { [name]: val }, name, null, true) + (val.d ? '' : un) : IT0 + shown + call + ':=' + showU(wrapNames(p.expr.trim())) + (bad && !shownVal ? ' ⚠' : '') + IT1 + un + shownVal) + p.post;
  };
  return toks.map((tk) => (tk.t === 'txt' ? tk.raw : (tk.disp ? '$$' : '$') + contBack(tk, tk.lines.map((l) => l.map(piece).join('')).join('\n')) + (tk.disp ? '$$' : '$'))).join('');
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
