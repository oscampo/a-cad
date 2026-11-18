// Geometria de los textos: caja imaginaria, punto de insercion y orientacion. Sin DOM.
// measure(linea) -> ancho de la linea para una altura de texto de 1 (en el navegador sale
// de measureText; en las pruebas puede ser una aproximacion).
import { evalExpr } from './expr.js';
import { varsOf, textVars } from './params.js';
import { IT0, IT1, DEF_SRC, runsOf, hasDefMark } from './tvars.js';
export { runsOf, plainText } from './tvars.js';
import { fmtNum } from './dims.js';
import { hasMath, layoutText } from './mathlayout.js';
export { hasMath } from './mathlayout.js';

// Salidas en textos: [=expresion] se reemplaza por el valor de la expresion, que puede usar los nombres de las cotas
// (D1, A1, O2...) y funciones: "El diametro es [=O1] cm", "vueltas: [=A1/(2π)]". Un ángulo vale su medida en radianes.
// Si la expresion falla, queda ⚠ en su lugar.
// Definiciones de variables: «x{=valor}» se muestra como «x:=valor» en cursiva (entre marcas IT0 e IT1, ver runsOf); si la
// definicion no vale (repetida, choca con una cota, falla) lleva un ⚠ al final.
// Un vector en un texto: «[1, 2, 3]»; si tiene mas de 8 elementos, los 4 primeros y los 2 ultimos.
const vecText = (v) => '[' + (v.length > 8 ? [...v.slice(0, 4).map(fmtNum), '…', ...v.slice(-2).map(fmtNum)] : v.map(fmtNum)).join(', ') + ']';
const TEXT_RE = () => new RegExp(DEF_SRC + '|' + OUT_SRC, 'g');
const OUT_SRC = /\[=([^\]]*)\]/.source;
export function textValue(doc, t) {
  const s = String(t.text ?? '');
  const hasDef = hasDefMark(s), hasOut = s.includes('[=');
  if (!hasDef && !hasOut) return s;
  let vars = null, st = null, tid = null, idx = 0;
  if (hasDef) { tid = Object.keys(doc.texts || {}).find((k) => doc.texts[k] === t); st = textVars(doc); }
  return s.replace(TEXT_RE(), (m, name, ex, out) => {
    if (name !== undefined) { // definicion x{=valor}
      const bad = st.bad.has(tid + ':' + idx++);
      return IT0 + name + ':=' + ex +(bad ? ' ⚠' : '') + IT1;
    }
    try {
      vars ||= varsOf(doc);
      const nm = out.trim();
      if (vars[nm]?.vec) return vecText(vars[nm].vec); // [=x] con x vector: sus elementos
      return fmtNum(evalExpr(out, { vars }).value);
    } catch (e) { return '⚠'; }
  });
}
// El texto tal como se ve (con sus salidas calculadas): el mismo objeto si no hay ninguna.
export function shownText(doc, t) {
  const v = textValue(doc, t);
  return v === t.text ? t : { ...t, text: v };
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
export function textFrame(t, measure, anchor = t.anchor) {
  const src = String(t.text ?? '');
  const lines = src.split('\n');
  if (hasMath(src)) { // con formulas ($...$, $$...$$): las lineas tienen alturas propias
    const m = layoutText(src, measure, t.font);
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
// { k:'t', s, x, y (linea base), size, it, font } y { k:'p', pts, lw }. Vacio si el texto no lleva formulas.
export function framePrims(f, t) {
  if (!f.math) return [];
  const h = t.h, X = (x) => f.xmin + x * h, Y = (y) => f.ymax - y * h;
  return f.math.prims.map((p) => (p.k === 't' ? { k: 't', s: p.s, x: X(p.x), y: Y(p.y), size: p.sz * h, it: p.it, font: p.font, bold: p.bold, col: p.col } : { k: 'p', pts: p.pts.map(([x, y]) => [X(x), Y(y)]), lw: p.lw * h, col: p.col }));
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
