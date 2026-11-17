// Matematica en los textos: «$formula$» (en linea) y «$$formula$$» (en bloque, una ecuacion por linea), escritas en AsciiMath.
// Sin DOM: la formula se reparte en cajas y sale como una lista de primitivas (texto y trazos) que el lienzo y las exportaciones dibujan igual.
// Unidades: em (altura de texto 1). En una caja: x a la derecha desde su borde, y hacia ABAJO desde su linea base (a: alto sobre ella, d: bajo ella).
import { parse } from './asciimath.js';
import { runsOf, plainText } from './tvars.js';

const MF = 'serif'; // fuente de la formula (claves de FONTS en text.js)
const AXIS = 0.26; // altura del eje (barra de fraccion, signo menos) sobre la linea base

export const hasMath = (s) => typeof s === 'string' && s.includes('$');

// ---- reparto del texto en tramos ----
// «\$» es un signo de pesos literal. «$$...$$» (puede abarcar lineas) o «$...$» (una sola linea; sin espacio tras el de apertura ni antes
// del de cierre, y el de cierre sin una cifra detras: «cuesta $5 y $6» no es una formula, como en pandoc). Un «$$» sin cierre queda tal cual con ⚠.
export function splitMath(s) {
  const out = [];
  let buf = '', i = 0;
  const n = s.length;
  const flush = () => { if (buf) { out.push({ t: 'txt', s: buf }); buf = ''; } };
  const closeBlock = (from) => { let j = s.indexOf('$$', from); while (j > 0 && s[j - 1] === '\\') j = s.indexOf('$$', j + 2); return j; };
  const closeInline = (from) => {
    if (from >= n || /\s/.test(s[from])) return -1;
    for (let j = from; j < n; j++) {
      const ch = s[j];
      if (ch === '\n') return -1;
      if (ch === '\\' && s[j + 1] === '$') { j++; continue; }
      if (ch === '$' && !/\s/.test(s[j - 1]) && !/\d/.test(s[j + 1] ?? '')) return j;
    }
    return -1;
  };
  while (i < n) {
    const ch = s[i];
    if (ch === '\\' && s[i + 1] === '$') { buf += '$'; i += 2; continue; }
    if (ch === '$') {
      if (s[i + 1] === '$') {
        const j = closeBlock(i + 2);
        if (j >= 0) { flush(); out.push({ t: 'math', src: s.slice(i + 2, j), disp: true }); i = j + 2; continue; }
        buf += '$$⚠'; i += 2; continue;
      }
      const j = closeInline(i + 1);
      if (j >= 0) { flush(); out.push({ t: 'math', src: s.slice(i + 1, j), disp: false }); i = j + 1; continue; }
    }
    buf += ch; i++;
  }
  flush();
  return out;
}

// ---- cajas ----
const XH = /^[acemnorsuvwxzαειμνοπρστυω]+$/; // solo altura de x
const DESC = /[gjpqyβγζμξρφχψ,;∫∑∏]/;
function glyph(ctx, s, it = false, sz = ctx.sz) {
  const a = XH.test(s) ? 0.46 : /^[()[\]{}|]$/.test(s) ? 0.75 : 0.7;
  const d = /^[()[\]{}|]$/.test(s) ? 0.25 : DESC.test(s) ? 0.22 : 0;
  return { w: ctx.measure(s, MF, it) * sz, a: a * sz, d: d * sz, ops: s ? [{ k: 't', s, x: 0, y: 0, sz, it, font: MF }] : [] };
}
const shift = (ops, dx, dy) => ops.map((o) => (o.k === 't' ? { ...o, x: o.x + dx, y: o.y + dy } : { ...o, pts: o.pts.map(([x, y]) => [x + dx, y + dy]) }));
const pad = (b, l, r) => ({ ...b, w: b.w + l + r, ops: shift(b.ops, l, 0) });
const stroke = (pts, lw) => ({ k: 'p', pts, lw });

function layRow(n, ctx) {
  let x = 0, a = 0, d = 0, prev = 'start';
  const ops = [];
  for (const c of n.c) {
    const b = lay(c, ctx, prev);
    ops.push(...shift(b.ops, x, 0));
    x += b.w; a = Math.max(a, b.a); d = Math.max(d, b.d);
    prev = b.kind || 'ord';
  }
  return { w: x, a, d, ops };
}

function frac(n, ctx) {
  const sz = ctx.sz, cs = { ...ctx, sz: ctx.disp ? sz : Math.max(0.5, sz * 0.8), disp: false };
  const N = lay(n.a, cs), D = lay(n.b, cs);
  const bar = 0.045 * sz, gap = 0.1 * sz, edge = 0.06 * sz;
  const w = Math.max(N.w, D.w) + 2 * edge, ax = AXIS * sz;
  const yn = -ax - bar / 2 - gap - N.d, yd = -ax + bar / 2 + gap + D.a;
  return {
    w, a: ax + bar / 2 + gap + N.d + N.a, d: -ax + bar / 2 + gap + D.a + D.d,
    ops: [...shift(N.ops, (w - N.w) / 2, yn), stroke([[0, -ax], [w, -ax]], bar), ...shift(D.ops, (w - D.w) / 2, yd)],
  };
}

function scripts(B, S, U, ctx) {
  const sz = ctx.sz;
  let up = 0, dn = 0;
  if (S) up = Math.max(0.38 * sz, B.a - 0.28 * sz, S.d + 0.25 * sz);
  if (U) dn = Math.max(0.16 * sz, B.d + 0.1 * sz, U.a - 0.4 * sz);
  if (S && U) { const def = 0.2 * sz - ((up - S.d) - (U.a - dn)); if (def > 0) { up += def / 2; dn += def / 2; } }
  const x = B.w + 0.03 * sz;
  return {
    w: x + Math.max(S?.w || 0, U?.w || 0), a: Math.max(B.a, S ? up + S.a : 0), d: Math.max(B.d, U ? dn + U.d : 0),
    ops: [...B.ops, ...(S ? shift(S.ops, x, -up) : []), ...(U ? shift(U.ops, x, dn) : [])],
  };
}

function sqrt(n, ctx) {
  const sz = ctx.sz, B = lay(n.body, ctx), lw = 0.04 * sz, gap = 0.1 * sz;
  const yt = -(B.a + gap), yb = B.d + 0.03 * sz, H = yb - yt;
  const I = n.idx ? lay(n.idx, { ...ctx, sz: Math.max(0.5, sz * 0.6), disp: false }) : null;
  const sh = I ? Math.max(0, I.w - 0.2 * sz) : 0, rw = 0.45 * sz;
  const x0 = sh, x1 = sh + rw, w = x1 + B.w + 0.05 * sz;
  const ops = [
    stroke([[x0, yb - 0.42 * H], [x0 + 0.1 * sz, yb - 0.47 * H], [x0 + 0.27 * sz, yb], [x1, yt], [w, yt]], lw),
    ...shift(B.ops, x1, 0),
  ];
  if (I) ops.push(...shift(I.ops, 0, yb - 0.55 * H));
  return { w, a: B.a + gap + lw, d: B.d + 0.03 * sz, ops };
}

// Un cierre «:}» o un abre «{:» no se dibujan.
const stretchy = { '(': 1, ')': 1, '[': 1, ']': 1, '{': 1, '}': 1, '|': 1, '‖': 1 };
function bracketOps(ch, bw, cy, hh, lw) {
  const top = cy - hh, bot = cy + hh, left = '([{'.includes(ch) || ch === '|' || ch === '‖';
  const mir = (pts) => (left || ch === '|' || ch === '‖' ? pts : pts.map(([x, y]) => [bw - x, y]));
  if (ch === '(' || ch === ')') {
    const pts = [];
    for (let k = 0; k <= 16; k++) { const u = (k / 16) * 2 - 1; pts.push([bw * (0.55 * u * u + 0.45 * u ** 4), cy + u * hh]); }
    return [stroke(mir(pts), lw)];
  }
  if (ch === '[' || ch === ']') return [stroke(mir([[bw, top], [0.1 * bw, top], [0.1 * bw, bot], [bw, bot]]), lw)];
  if (ch === '{' || ch === '}') {
    const r = bw * 0.5;
    return [stroke(mir([[bw, top], [0.62 * bw, top + 0.3 * r], [0.5 * bw, top + r], [0.5 * bw, cy - r], [0.3 * bw, cy - 0.3 * r], [0, cy], [0.3 * bw, cy + 0.3 * r], [0.5 * bw, cy + r], [0.5 * bw, bot - r], [0.62 * bw, bot - 0.3 * r], [bw, bot]]), lw)];
  }
  if (ch === '|') return [stroke([[bw / 2, top], [bw / 2, bot]], lw)];
  if (ch === '‖') return [stroke([[bw * 0.25, top], [bw * 0.25, bot]], lw), stroke([[bw * 0.75, top], [bw * 0.75, bot]], lw)];
  return [];
}
const bracketW = (ch, sz, hh) => ({ '(': 0.12 * sz + 0.03 * hh, ')': 0.12 * sz + 0.03 * hh, '[': 0.12 * sz, ']': 0.12 * sz, '{': 0.2 * sz + 0.04 * hh, '}': 0.2 * sz + 0.04 * hh, '|': 0.08 * sz, '‖': 0.16 * sz }[ch] || 0);

function group(n, ctx) {
  const sz = ctx.sz, B = lay(n.body, ctx), l = n.l === '{:' ? '' : n.l, r = n.r === ':}' ? '' : n.r || '';
  const lw = 0.045 * sz, m = 0.04 * sz;
  if (B.a + B.d <= 1.12 * sz || (!stretchy[l] && !stretchy[r])) { // tamano natural: los signos son letras de la fuente
    const L = l ? glyph(ctx, l) : { w: 0, a: 0, d: 0, ops: [] }, R = r ? glyph(ctx, r) : { w: 0, a: 0, d: 0, ops: [] };
    return { w: L.w + B.w + R.w, a: Math.max(L.a, B.a, R.a), d: Math.max(L.d, B.d, R.d), ops: [...L.ops, ...shift(B.ops, L.w, 0), ...shift(R.ops, L.w + B.w, 0)] };
  }
  const ax = AXIS * sz, hh = Math.max(B.a - ax, B.d + ax) + 0.06 * sz, cy = -ax;
  const lwid = l ? bracketW(l, sz, hh) : 0, rwid = r ? bracketW(r, sz, hh) : 0;
  const bx = lwid + (l ? m : 0), rx = bx + B.w + (r ? m : 0);
  return {
    w: rx + rwid, a: ax + hh, d: hh - ax,
    ops: [...(l ? shift(bracketOps(l, lwid, cy, hh, lw), 0, 0) : []), ...shift(B.ops, bx, 0), ...(r ? shift(bracketOps(r, rwid, cy, hh, lw), rx, 0) : [])],
  };
}

function big(n, ctx) {
  const sz = ctx.sz;
  let G;
  if (n.s === 'lim') { G = glyph(ctx, 'lim'); G.w += 0.1 * sz; } else {
    const k = ctx.disp ? 1.35 : 1.0, ch = { sum: '∑', prod: '∏', int: '∫' }[n.s];
    G = glyph(ctx, ch, false, sz * k);
    G.a = (n.s === 'int' ? 0.8 : 0.75) * k * sz; G.d = (n.s === 'int' ? 0.3 : 0.2) * k * sz;
    G.w += 0.08 * sz;
  }
  const sc = { ...ctx, sz: Math.max(0.5, sz * 0.7), disp: false };
  const S = n.sup ? lay(n.sup, sc) : null, U = n.sub ? lay(n.sub, sc) : null;
  G.kind = 'ord';
  if (!S && !U) return G;
  if (ctx.disp && n.s !== 'int') { // limites encima y debajo
    const gap = 0.1 * sz, w = Math.max(G.w, S?.w || 0, U?.w || 0);
    const ops = [...shift(G.ops, (w - G.w) / 2, 0)];
    let a = G.a, d = G.d;
    if (S) { ops.push(...shift(S.ops, (w - S.w) / 2, -(G.a + gap + S.d))); a = G.a + gap + S.d + S.a; }
    if (U) { ops.push(...shift(U.ops, (w - U.w) / 2, G.d + gap + U.a)); d = G.d + gap + U.a + U.d; }
    return { w, a, d, ops, kind: 'ord' };
  }
  return { ...scripts(G, S, U, ctx), kind: 'ord' };
}

function accent(n, ctx) {
  const sz = ctx.sz, B = lay(n.body, ctx), lw = 0.04 * sz, y = -(B.a + 0.06 * sz), cx = B.w / 2;
  let ops;
  if (n.k === 'hat') ops = [stroke([[cx - 0.13 * sz, y], [cx, y - 0.12 * sz], [cx + 0.13 * sz, y]], lw)];
  else if (n.k === 'bar') ops = [stroke([[0, y - 0.04 * sz], [B.w, y - 0.04 * sz]], lw)];
  else ops = [stroke([[0, y - 0.05 * sz], [B.w, y - 0.05 * sz]], lw), stroke([[B.w - 0.1 * sz, y - 0.1 * sz], [B.w, y - 0.05 * sz], [B.w - 0.1 * sz, y]], lw)];
  return { w: B.w, a: B.a + 0.2 * sz, d: B.d, ops: [...B.ops, ...ops] };
}

const OPPAD = { bin: 0.2, rel: 0.26, ord: 0, punct: 0 };
function lay(n, ctx, prev = 'start') {
  const sz = ctx.sz;
  switch (n.t) {
    case 'row': return layRow(n, ctx);
    case 'n': case 'sym': case 'txt': return glyph(ctx, n.s, false);
    case 'v': return glyph(ctx, n.s, true);
    case 'fn': return pad(glyph(ctx, n.s, false), 0, 0.12 * sz);
    case 'o': {
      let k = n.k;
      if (k === 'bin' && ['start', 'bin', 'rel', 'open', 'punct'].includes(prev)) k = 'ord'; // «-x»: menos unario, sin espacios
      const g = glyph(ctx, n.s, false), p = (sz >= 0.99 ? OPPAD[k] : OPPAD[k] / 2) * sz;
      return { ...(k === 'punct' ? pad(g, 0, 0.15 * sz) : pad(g, p, p)), kind: k };
    }
    case 'frac': return frac(n, ctx);
    case 'ss': {
      const B = lay(n.base, ctx), sc = { ...ctx, sz: Math.max(0.5, sz * 0.7), disp: false };
      return scripts(B, n.sup ? lay(n.sup, sc) : null, n.sub ? lay(n.sub, sc) : null, ctx);
    }
    case 'sqrt': return sqrt(n, ctx);
    case 'group': return group(n, ctx);
    case 'big': return big(n, ctx);
    case 'acc': return accent(n, ctx);
    default: return { w: 0, a: 0, d: 0, ops: [] };
  }
}

// Una formula AsciiMath -> caja { w, a, d, ops }. disp: en bloque (fracciones y sumatorias a tamano pleno).
export function layoutMath(src, disp, measure) {
  try { return layRow(parse(src), { measure, sz: 1, disp }); } catch (e) { return layRow({ c: [{ t: 'txt', s: String(src) + ' ⚠' }] }, { measure, sz: 1, disp }); }
}

// ---- texto completo ----
// Devuelve { w, hh, prims } en unidades de altura de texto, con el origen en la esquina superior izquierda de la caja (y hacia abajo):
//  { k:'t', s, x, y, sz, it, font } (y = linea base) y { k:'p', pts:[[x,y]...], lw } (trazo abierto).
// Las lineas sin formulas conservan su altura de siempre (1.2); las que llevan formulas crecen lo que necesiten.
const CACHE = new WeakMap();
export function layoutText(text, measure, font) {
  let m = CACHE.get(measure);
  if (!m) { m = new Map(); CACHE.set(measure, m); }
  const key = (font || '') + '\u0001' + text;
  let r = m.get(key);
  if (!r) { if (m.size > 300) m.clear(); r = compute(text, measure, font); m.set(key, r); }
  return r;
}

function compute(text, measure, font) {
  const rows = [];
  let cur = [], skipNL = false;
  for (const tk of splitMath(text)) {
    if (tk.t === 'txt') {
      let s = tk.s;
      if (skipNL && s[0] === '\n') s = s.slice(1);
      skipNL = false;
      s.split('\n').forEach((p, i) => { if (i > 0) { rows.push({ items: cur }); cur = []; } if (p) cur.push({ k: 't', s: p }); });
    } else if (!tk.disp) {
      cur.push({ k: 'm', box: layoutMath(plainText(tk.src), false, measure) }); skipNL = false;
    } else {
      if (cur.length) { rows.push({ items: cur }); cur = []; }
      const src = plainText(tk.src).replace(/^[ \t]*\n/, '').replace(/\n[ \t]*$/, '');
      for (const ln of src.split('\n')) rows.push({ items: ln.trim() ? [{ k: 'm', box: layoutMath(ln, true, measure) }] : [], center: true });
      skipNL = true;
    }
  }
  if (!(skipNL && !cur.length)) rows.push({ items: cur });
  for (const r of rows) {
    let w = 0, a = 0.98, d = 0.22;
    for (const it of r.items) {
      if (it.k === 't') it.w = runsOf(it.s).reduce((s, x) => s + measure(x.s, font, x.it), 0);
      else { it.w = it.box.w; a = Math.max(a, it.box.a + 0.04); d = Math.max(d, it.box.d + 0.04); }
      w += it.w;
    }
    if (r.center && r.items.length) { a += 0.06; d += 0.06; }
    r.w = w; r.a = a; r.d = d;
  }
  const W = Math.max(0.0001, ...rows.map((r) => r.w));
  const prims = [];
  let y = 0;
  for (const r of rows) {
    const base = y + r.a;
    let x = r.center ? (W - r.w) / 2 : 0;
    for (const it of r.items) {
      if (it.k === 't') {
        let xx = x;
        for (const u of runsOf(it.s)) { prims.push({ k: 't', s: u.s, x: xx, y: base, sz: 1, it: u.it, font }); xx += measure(u.s, font, u.it); }
      } else prims.push(...shift(it.box.ops, x, base));
      x += it.w;
    }
    y += r.a + r.d;
  }
  return { w: W, hh: Math.max(y, 1.2), prims };
}
