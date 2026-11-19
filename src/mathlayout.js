// Matematica en los textos: «$formula$» (en linea) y «$$formula$$» (en bloque, una ecuacion por linea), escritas en AsciiMath.
// Sin DOM: la formula se reparte en cajas y sale como una lista de primitivas (texto y trazos) que el lienzo y las exportaciones dibujan igual.
// Unidades: em (altura de texto 1). En una caja: x a la derecha desde su borde, y hacia ABAJO desde su linea base (a: alto sobre ella, d: bajo ella).
import { parse } from './asciimath.js';
import { runsOf } from './tvars.js';
import { hasMd, mdInline, mdBlock, H_SIZE, calloutOf, LINK_COLOR, MUTED_COLOR } from './markdown.js';
const noIT = (s) => s.replace(/[\uE000\uE001]/g, ''); // las marcas de cursiva no van a la formula; las de vector (VB0/VB1) si

const MF = 'serif'; // fuente de la formula (claves de FONTS en text.js)
const AXIS = 0.26; // altura del eje (barra de fraccion, signo menos) sobre la linea base

export const hasMath = (s) => typeof s === 'string' && s.includes('$');

// ---- reparto del texto en tramos ----
// «\$» es un signo de pesos literal. «$$...$$» (puede abarcar lineas) o «$...$» (una sola linea; sin espacio tras el de apertura ni antes
// del de cierre, y el de cierre sin una cifra detras: «cuesta $5 y $6» no es una formula, como en pandoc). Un «$$» sin cierre queda tal cual con ⚠.
export function splitMath(s) {
  const out = [];
  let buf = '', raw = '', i = 0;
  const n = s.length;
  const flush = () => { if (buf || raw) { out.push({ t: 'txt', s: buf, raw }); buf = ''; raw = ''; } };
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
    if (ch === '\\' && s[i + 1] === '$') { buf += '$'; raw += '\\$'; i += 2; continue; }
    if (ch === '$') {
      if (s[i + 1] === '$') {
        const j = closeBlock(i + 2);
        if (j >= 0) { flush(); out.push({ t: 'math', src: s.slice(i + 2, j), disp: true }); i = j + 2; continue; }
        buf += '$$⚠'; raw += '$$'; i += 2; continue;
      }
      const j = closeInline(i + 1);
      if (j >= 0) { flush(); out.push({ t: 'math', src: s.slice(i + 1, j), disp: false }); i = j + 1; continue; }
    }
    buf += ch; raw += ch; i++;
  }
  flush();
  return out;
}

// ---- cajas ----
const XH = /^[acemnorsuvwxzαειμνοπρστυω]+$/; // solo altura de x
const DESC = /[gjpqyβγζμξρφχψ,;∫∑∏∮]/;
const BR = /^[()[\]{}|‖⟨⟩⌊⌋⌈⌉]$/;
// Alfabetos matematicos (negrita doble «bbb», caligrafico «cc», gotico «fr») por codigo Unicode; algunas letras viven aparte.
const ALPHA = {
  bbb: { up: 0x1d538, lo: 0x1d552, dg: 0x1d7d8, ex: { C: 'ℂ', H: 'ℍ', N: 'ℕ', P: 'ℙ', Q: 'ℚ', R: 'ℝ', Z: 'ℤ' } },
  cc: { up: 0x1d49c, lo: 0x1d4b6, ex: { B: 'ℬ', E: 'ℰ', F: 'ℱ', H: 'ℋ', I: 'ℐ', L: 'ℒ', M: 'ℳ', R: 'ℛ', e: 'ℯ', g: 'ℊ', o: 'ℴ' } },
  fr: { up: 0x1d504, lo: 0x1d51e, ex: { C: 'ℭ', H: 'ℌ', I: 'ℑ', R: 'ℜ', Z: 'ℨ' } },
};
function alphaMap(s, k) {
  const m = ALPHA[k];
  return [...s].map((ch) => {
    if (m.ex[ch]) return m.ex[ch];
    if (/[A-Z]/.test(ch)) return String.fromCodePoint(m.up + ch.charCodeAt(0) - 65);
    if (/[a-z]/.test(ch)) return String.fromCodePoint(m.lo + ch.charCodeAt(0) - 97);
    if (m.dg && /\d/.test(ch)) return String.fromCodePoint(m.dg + ch.charCodeAt(0) - 48);
    return ch;
  }).join('');
}
function glyph(ctx, s, it = false, sz = ctx.sz) {
  if (ctx.alpha) s = alphaMap(s, ctx.alpha);
  if (ctx.upright) it = false;
  const font = ctx.fam || MF, br = BR.test(s);
  const a = XH.test(s) ? 0.46 : br ? 0.75 : 0.7;
  const d = br ? 0.25 : DESC.test(s) ? 0.22 : 0;
  return { w: ctx.measure(s, font, it) * sz * (ctx.bold ? 1.06 : 1), a: a * sz, d: d * sz, ops: s ? [{ k: 't', s, x: 0, y: 0, sz, it, font, ...(ctx.bold ? { bold: true } : {}) }] : [] };
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
  // Puntal fijo (como TeX): la posicion de numerador y denominador no depende de si llevan solo letras bajas («x») o cifras y mayusculas.
  const nd = Math.max(N.d, 0.22 * cs.sz), da = Math.max(D.a, 0.7 * cs.sz);
  const yn = -ax - bar / 2 - gap - nd, yd = -ax + bar / 2 + gap + da;
  return {
    w, a: ax + bar / 2 + gap + nd + N.a, d: -ax + bar / 2 + gap + da + D.d,
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
const stretchy = new Set(['(', ')', '[', ']', '{', '}', '|', '‖', '⟨', '⟩', '⌊', '⌋', '⌈', '⌉']);
const CLOSERS = new Set([')', ']', '}', '⟩', '⌋', '⌉']);
function bracketOps(ch, bw, cy, hh, lw) {
  const top = cy - hh, bot = cy + hh, right = CLOSERS.has(ch);
  const mir = (pts) => (right ? pts.map(([x, y]) => [bw - x, y]) : pts);
  if (ch === '(' || ch === ')') {
    const pts = [];
    for (let k = 0; k <= 16; k++) { const u = (k / 16) * 2 - 1; pts.push([bw * (0.55 * u * u + 0.45 * u ** 4), cy + u * hh]); }
    return [stroke(mir(pts), lw)];
  }
  if (ch === '[' || ch === ']') return [stroke(mir([[bw, top], [0.1 * bw, top], [0.1 * bw, bot], [bw, bot]]), lw)];
  if (ch === '⌊' || ch === '⌋') return [stroke(mir([[0.1 * bw, top], [0.1 * bw, bot], [bw, bot]]), lw)];
  if (ch === '⌈' || ch === '⌉') return [stroke(mir([[bw, top], [0.1 * bw, top], [0.1 * bw, bot]]), lw)];
  if (ch === '⟨' || ch === '⟩') return [stroke(mir([[bw, top], [0.1 * bw, cy], [bw, bot]]), lw)];
  if (ch === '{' || ch === '}') {
    const r = bw * 0.5;
    return [stroke(mir([[bw, top], [0.62 * bw, top + 0.3 * r], [0.5 * bw, top + r], [0.5 * bw, cy - r], [0.3 * bw, cy - 0.3 * r], [0, cy], [0.3 * bw, cy + 0.3 * r], [0.5 * bw, cy + r], [0.5 * bw, bot - r], [0.62 * bw, bot - 0.3 * r], [bw, bot]]), lw)];
  }
  if (ch === '|') return [stroke([[bw / 2, top], [bw / 2, bot]], lw)];
  if (ch === '‖') return [stroke([[bw * 0.25, top], [bw * 0.25, bot]], lw), stroke([[bw * 0.75, top], [bw * 0.75, bot]], lw)];
  return [];
}
const bracketW = (ch, sz, hh) => ({ '(': 0.12 * sz + 0.03 * hh, ')': 0.12 * sz + 0.03 * hh, '[': 0.12 * sz, ']': 0.12 * sz, '{': 0.2 * sz + 0.04 * hh, '}': 0.2 * sz + 0.04 * hh, '|': 0.08 * sz, '‖': 0.16 * sz,
  '⟨': 0.16 * sz, '⟩': 0.16 * sz, '⌊': 0.12 * sz, '⌋': 0.12 * sz, '⌈': 0.12 * sz, '⌉': 0.12 * sz }[ch] || 0);

// Rodea la caja B con los signos l y r (cadenas; '' = ninguno). Si B es mas alta que una linea (o force), los signos se dibujan como trazos del alto de B.
function wrap(B, l, r, ctx, force) {
  const sz = ctx.sz, lw = 0.045 * sz, m = 0.04 * sz;
  l = l === '{:' ? '' : l || ''; r = r === ':}' ? '' : r || '';
  if (!(force || B.a + B.d > 1.12 * sz) || (!stretchy.has(l) && !stretchy.has(r))) { // tamano natural: los signos son letras de la fuente
    const L = l ? glyph(ctx, l) : { w: 0, a: 0, d: 0, ops: [] }, R = r ? glyph(ctx, r) : { w: 0, a: 0, d: 0, ops: [] };
    return { w: L.w + B.w + R.w, a: Math.max(L.a, B.a, R.a), d: Math.max(L.d, B.d, R.d), ops: [...L.ops, ...shift(B.ops, L.w, 0), ...shift(R.ops, L.w + B.w, 0)] };
  }
  const ax = AXIS * sz, hh = Math.max(B.a - ax, B.d + ax) + 0.06 * sz, cy = -ax;
  const lwid = l ? bracketW(l, sz, hh) : 0, rwid = r ? bracketW(r, sz, hh) : 0;
  const bx = lwid + (l ? m : 0), rx = bx + B.w + (r ? m : 0);
  return {
    w: rx + rwid, a: ax + hh, d: hh - ax,
    ops: [...(l ? bracketOps(l, lwid, cy, hh, lw) : []), ...shift(B.ops, bx, 0), ...(r ? shift(bracketOps(r, rwid, cy, hh, lw), rx, 0) : [])],
  };
}
const group = (n, ctx) => wrap(lay(n.body, ctx), n.l, n.r, ctx, false);

// Matriz: columnas centradas, filas con puntal; lineas verticales en las columnas «|» (matriz aumentada); los signos crecen con su alto.
function matrix(n, ctx) {
  const sz = ctx.sz, cs = { ...ctx, disp: false };
  const cells = n.rows.map((r) => r.map((c) => lay(c, cs)));
  const nc = cells[0].length, colW = Array.from({ length: nc }, (_, k) => Math.max(...cells.map((r) => r[k].w)));
  const rowA = cells.map((r) => Math.max(0.7 * sz, ...r.map((c) => c.a))), rowD = cells.map((r) => Math.max(0.22 * sz, ...r.map((c) => c.d)));
  const gapX = (n.rows.length === 1 ? 0.55 : 0.8) * sz, gapY = 0.28 * sz, ax = AXIS * sz;
  const xs = []; let x = 0;
  colW.forEach((w, k) => { xs.push(x); x += w + (k < nc - 1 ? gapX : 0); });
  const W = x;
  const ys = []; let y = 0;
  rowA.forEach((a, i) => { y += a; ys.push(y); y += rowD[i] + (i < rowA.length - 1 ? gapY : 0); });
  const H = y, top = -ax - H / 2;
  const ops = [];
  cells.forEach((r, i) => r.forEach((c, k) => ops.push(...shift(c.ops, xs[k] + (colW[k] - c.w) / 2, top + ys[i]))));
  for (const b of n.bars) { const bx = b === 0 ? -gapX / 2 : b >= nc ? W + gapX / 2 : xs[b] - gapX / 2; ops.push(stroke([[bx, top], [bx, top + H]], 0.04 * sz)); }
  const body = { w: W, a: ax + H / 2, d: H / 2 - ax, ops };
  return wrap(body, n.l, n.r, ctx, n.rows.length > 1);
}

const BIG = { sum: '∑', prod: '∏', int: '∫', oint: '∮', bigwedge: '⋀', bigvee: '⋁', bigcap: '⋂', bigcup: '⋃' };
function big(n, ctx) {
  const sz = ctx.sz, side = n.s === 'int' || n.s === 'oint';
  let G;
  if (n.s === 'lim') { G = glyph({ ...ctx, upright: true }, 'lim'); G.w += 0.1 * sz; } else {
    const k = ctx.disp ? 1.35 : 1.0;
    G = glyph(ctx, BIG[n.s], false, sz * k);
    G.a = (side ? 0.8 : 0.75) * k * sz; G.d = (side ? 0.3 : 0.2) * k * sz;
    G.w += 0.08 * sz;
  }
  const sc = { ...ctx, sz: Math.max(0.5, sz * 0.7), disp: false };
  const S = n.sup ? lay(n.sup, sc) : null, U = n.sub ? lay(n.sub, sc) : null;
  G.kind = 'ord';
  if (!S && !U) return G;
  if (ctx.disp && !side) { // limites encima y debajo
    const gap = 0.1 * sz, w = Math.max(G.w, S?.w || 0, U?.w || 0);
    const ops = [...shift(G.ops, (w - G.w) / 2, 0)];
    let a = G.a, d = G.d;
    if (S) { ops.push(...shift(S.ops, (w - S.w) / 2, -(G.a + gap + S.d))); a = G.a + gap + S.d + S.a; }
    if (U) { ops.push(...shift(U.ops, (w - U.w) / 2, G.d + gap + U.a)); d = G.d + gap + U.a + U.d; }
    return { w, a, d, ops, kind: 'ord' };
  }
  return { ...scripts(G, S, U, ctx), kind: 'ord' };
}

// Una anotacion (caja A) centrada encima (up) o debajo de la caja B.
function annotate(B, A, up, gap, ctx) {
  const w = Math.max(B.w, A.w), ops = shift(B.ops, (w - B.w) / 2, 0);
  if (up) { ops.push(...shift(A.ops, (w - A.w) / 2, -(B.a + gap + A.d))); return { w, a: B.a + gap + A.d + A.a, d: B.d, ops }; }
  ops.push(...shift(A.ops, (w - A.w) / 2, B.d + gap + A.a));
  return { w, a: B.a, d: B.d + gap + A.a + A.d, ops };
}
function stack(n, ctx) {
  const sz = ctx.sz, B = lay(n.base, ctx), A = lay(n.top, { ...ctx, sz: Math.max(0.5, sz * 0.7), disp: false });
  return annotate(B, A, n.k === 'over', 0.06 * sz, ctx);
}

// Llave horizontal debajo («ubrace») o encima («obrace») de una expresion, con una anotacion opcional.
function brace(n, ctx) {
  const sz = ctx.sz, B = lay(n.body, ctx), lw = 0.04 * sz, h = 0.12 * sz, r = Math.min(0.15 * sz, B.w / 4), under = n.k === 'u';
  const y0 = under ? B.d + 0.08 * sz : -(B.a + 0.08 * sz), s = under ? 1 : -1, w = B.w, ops = [...B.ops];
  ops.push(stroke([[0, y0], [r, y0 + s * h], [w / 2 - r, y0 + s * h], [w / 2, y0 + s * 2 * h], [w / 2 + r, y0 + s * h], [w - r, y0 + s * h], [w, y0]], lw));
  const lab = under ? n.sub : n.sup;
  let R = { w, a: under ? B.a : B.a + 0.08 * sz + 2 * h, d: under ? B.d + 0.08 * sz + 2 * h : B.d, ops };
  if (lab) R = annotate(R, lay(lab, { ...ctx, sz: Math.max(0.5, sz * 0.7), disp: false }), !under, 0.04 * sz, ctx);
  return R;
}

function accent(n, ctx) {
  const sz = ctx.sz, B = lay(n.body, ctx), lw = 0.04 * sz, y = -(B.a + 0.06 * sz), cx = B.w / 2, w = B.w;
  let ops = [], a = B.a + 0.2 * sz, d = B.d;
  switch (n.k) {
    case 'hat': ops = [stroke([[cx - 0.13 * sz, y], [cx, y - 0.12 * sz], [cx + 0.13 * sz, y]], lw)]; break;
    case 'bar': ops = [stroke([[0, y - 0.04 * sz], [w, y - 0.04 * sz]], lw)]; break;
    case 'vec': ops = [stroke([[0, y - 0.05 * sz], [w, y - 0.05 * sz]], lw), stroke([[w - 0.1 * sz, y - 0.1 * sz], [w, y - 0.05 * sz], [w - 0.1 * sz, y]], lw)]; break;
    case 'tilde': { const p = []; for (let k = 0; k <= 12; k++) p.push([cx - 0.15 * sz + (0.3 * sz * k) / 12, y - 0.07 * sz - 0.04 * sz * Math.sin((k / 12) * 2 * Math.PI)]); ops = [stroke(p, lw)]; break; }
    case 'dot': ops = [stroke([[cx, y - 0.04 * sz], [cx + 0.001, y - 0.04 * sz]], 0.08 * sz)]; break;
    case 'ddot': ops = [stroke([[cx - 0.07 * sz, y - 0.04 * sz], [cx - 0.069 * sz, y - 0.04 * sz]], 0.08 * sz), stroke([[cx + 0.07 * sz, y - 0.04 * sz], [cx + 0.071 * sz, y - 0.04 * sz]], 0.08 * sz)]; break;
    case 'ul': ops = [stroke([[0, B.d + 0.07 * sz], [w, B.d + 0.07 * sz]], lw)]; a = B.a; d = B.d + 0.1 * sz; break;
    case 'arc': { const p = []; for (let k = 0; k <= 16; k++) { const u = k / 16; p.push([u * w, y - 0.04 * sz - 0.1 * sz * Math.sin(u * Math.PI)]); } ops = [stroke(p, lw)]; break; }
    case 'cancel': ops = [stroke([[-0.07 * sz, B.d + 0.08 * sz], [w + 0.07 * sz, -(B.a + 0.08 * sz)]], lw)]; a = B.a + 0.08 * sz; d = B.d + 0.08 * sz; break;
    default: break;
  }
  return { w, a, d, ops: [...B.ops, ...ops] };
}

const OPPAD = { bin: 0.2, rel: 0.26, ord: 0, punct: 0, word: 0.3 };
const FONTS_CTX = { bb: { bold: true, upright: true }, tt: { fam: 'mono', upright: true }, sf: { fam: 'sans', upright: true }, bbb: { alpha: 'bbb' }, cc: { alpha: 'cc' }, fr: { alpha: 'fr' } };
function lay(n, ctx, prev = 'start') {
  const sz = ctx.sz;
  switch (n.t) {
    case 'row': return layRow(n, ctx);
    case 'n': case 'sym': case 'txt': return glyph(ctx, n.s, false);
    case 'v': return glyph(ctx, n.s, true);
    case 'fn': return pad(glyph({ ...ctx, upright: true }, n.s, false), 0, 0.12 * sz);
    case 'space': return { w: n.w * sz, a: 0, d: 0, ops: [] };
    case 'o': {
      let k = n.k;
      if (k === 'bin' && ['start', 'bin', 'rel', 'open', 'punct'].includes(prev)) k = 'ord'; // «-x»: menos unario, sin espacios
      const g = glyph({ ...ctx, upright: true }, n.s, false), p = (sz >= 0.99 ? OPPAD[k] : OPPAD[k] / 2) * sz;
      return { ...(k === 'punct' ? pad(g, 0, 0.15 * sz) : pad(g, p, p)), kind: k };
    }
    case 'frac': return frac(n, ctx);
    case 'ss': {
      const B = lay(n.base, ctx), sc = { ...ctx, sz: Math.max(0.5, sz * 0.7), disp: false };
      return scripts(B, n.sup ? lay(n.sup, sc) : null, n.sub ? lay(n.sub, sc) : null, ctx);
    }
    case 'sqrt': return sqrt(n, ctx);
    case 'group': return group(n, ctx);
    case 'mat': return matrix(n, ctx);
    case 'big': return big(n, ctx);
    case 'acc': return accent(n, ctx);
    case 'brace': return brace(n, ctx);
    case 'stack': return stack(n, ctx);
    case 'font': return lay(n.body, { ...ctx, ...FONTS_CTX[n.k] });
    case 'color': {
      const B = lay(n.body, ctx);
      return n.col ? { ...B, ops: B.ops.map((o) => ({ ...o, col: o.col ?? n.col })) } : B;
    }
    default: return { w: 0, a: 0, d: 0, ops: [] };
  }
}

// Una formula AsciiMath -> caja { w, a, d, ops }. disp: en bloque (fracciones y sumatorias a tamano pleno).
export function layoutMath(src, disp, measure) {
  try { return layRow(parse(src), { measure, sz: 1, disp }); } catch (e) { return layRow({ c: [{ t: 'txt', s: String(src) + ' ⚠' }] }, { measure, sz: 1, disp }); }
}


// ---- texto completo ----
// Devuelve { w, hh, prims } en unidades de altura de texto, con el origen en la esquina superior izquierda de la caja (y hacia abajo):
//  { k:'t', s, x, y, sz, it, font, bold?, col? } (y = linea base) y { k:'p', pts:[[x,y]...], lw, col? } (trazo abierto).
// Las lineas sin formulas conservan su altura de siempre (1.2); las que llevan formulas crecen lo que necesiten.
// opt.reflow: las lineas seguidas de un parrafo se unen en una (Markdown estandar; una linea en blanco separa parrafos y dos
// espacios o «\» al final de una linea la cortan). Sin reflow, cada salto de linea es un salto de linea.
const CACHE = new WeakMap();
export function layoutText(text, measure, font, opt = {}) {
  let m = CACHE.get(measure);
  if (!m) { m = new Map(); CACHE.set(measure, m); }
  const key = (font || '') + '\u0001' + (opt.reflow ? 'r' : '') + '\u0001' + text;
  let r = m.get(key);
  if (!r) { if (m.size > 300) m.clear(); r = compute(text, measure, font, opt); m.set(key, r); }
  return r;
}

// cuantos «$$» sin escapar tiene una linea (si es impar, abre o cierra una formula en bloque)
const countDD = (ln) => { let n = 0; for (let i = ln.indexOf('$$'); i >= 0; i = ln.indexOf('$$', i + 2)) if (ln[i - 1] !== '\\') n++; return n; };
const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const DELIM = /^[ \t]*\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;
const INDENT = /^(?: {4}|\t)/;
const isList = (ln) => /^ *(?:[-*+]|\d+[.)]) /.test(ln);
const hardEnd = (ln) => /(?:^|[^\\])(?:\\\\)*\\$/.test(ln); // termina en «\» sin escapar

// Celdas de una fila de tabla: separadas por «|» fuera de `codigo` y de $formulas$; «\|» es una barra dentro de la celda.
export function tableCells(ln) {
  let s = ln.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  const out = [];
  let cur = '', q = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\' && s[i + 1] === '|') { cur += '|'; i++; continue; }
    if ((c === '`' || c === '$') && s[i - 1] !== '\\') { if (q === c) q = null; else if (!q) q = c; }
    if (c === '|' && !q) { out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

// Reparte el texto en bloques: { t:'md', lines } (parrafos, listas, citas, titulos y formulas), { t:'code', lines } (cercado con ``` o
// ~~~, o sangrado con 4 espacios tras una linea en blanco) y { t:'table', head, al, body }. Quita los comentarios <!-- -->, las
// definiciones de enlaces «[ref]: url» (van a refs) y las de notas al pie «[^id]: texto» (van a notes; las lineas que siguen con
// sangria son parte de la nota). «Texto» seguido de una linea «===» es un titulo; «---» bajo un texto es siempre una raya (no un
// titulo), porque asi se usa en los dibujos.
function blocks(text) {
  const refs = new Map(), notes = new Map(), chunks = [];
  const lines = text.replace(/<!--[\s\S]*?-->/g, '\u0000').split('\n').filter((l) => !/^[ \t]*\u0000[\s\u0000]*$/.test(l)).map((l) => l.replace(/\u0000/g, ''));
  let md = [], inMath = false, lastNB = '';
  const flush = () => { if (md.length) { chunks.push({ t: 'md', lines: md }); md = []; } };
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (inMath) { md.push(ln); if (countDD(ln) % 2) inMath = false; continue; }
    let m = FENCE.exec(ln);
    if (m && !(m[1][0] === '`' && m[2].includes('`'))) {
      const body = [];
      let j = i + 1;
      for (; j < lines.length; j++) { const e = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(lines[j]); if (e && e[1][0] === m[1][0] && e[1].length >= m[1].length) break; body.push(lines[j]); }
      flush(); chunks.push({ t: 'code', lines: body }); i = j; lastNB = ''; continue;
    }
    if (ln.includes('|') && lines[i + 1]?.includes('|') && DELIM.test(lines[i + 1])) {
      const head = tableCells(ln), al = tableCells(lines[i + 1]).map((c) => (/^:-+:$/.test(c) ? 'c' : /-:$/.test(c) ? 'r' : 'l'));
      if (head.length === al.length) {
        const body = [];
        let j = i + 2;
        for (; j < lines.length && lines[j].trim() && lines[j].includes('|'); j++) body.push(tableCells(lines[j]));
        flush(); chunks.push({ t: 'table', head, al, body }); i = j - 1; lastNB = ''; continue;
      }
    }
    m = /^ {0,3}\[\^([^\]\s]+)\]:[ \t]?(.*)$/.exec(ln);
    if (m) { let s = m[2]; while (i + 1 < lines.length && /^(?: {2,}|\t)\S/.test(lines[i + 1])) s += ' ' + lines[++i].trim(); notes.set(m[1], s); continue; }
    m = /^ {0,3}\[([^\]^][^\]]*)\]:[ \t]*<?([^\s<>]+)>?(?:[ \t]+(?:"[^"]*"|'[^']*'|\([^)]*\)))?[ \t]*$/.exec(ln);
    if (m) { refs.set(m[1].toLowerCase(), m[2]); continue; }
    if (INDENT.test(ln) && ln.trim() && !isList(ln) && (i === 0 || !lines[i - 1].trim()) && !isList(lastNB)) {
      const body = [];
      let j = i;
      while (j < lines.length) {
        if (INDENT.test(lines[j]) || (!lines[j].trim() && lines.slice(j).find((l) => l.trim())?.match(INDENT))) { body.push(lines[j].replace(INDENT, '')); j++; } else break;
      }
      while (body.length && !body.at(-1).trim()) { body.pop(); j--; }
      flush(); chunks.push({ t: 'code', lines: body }); i = j - 1; lastNB = ''; continue;
    }
    if (/^=+[ \t]*$/.test(ln) && md.length && md.at(-1).trim() && mdBlock(md.at(-1)).kind === 'p' && !countDD(md.at(-1))) { md[md.length - 1] = '# ' + md.at(-1).trim(); continue; }
    md.push(ln);
    if (ln.trim()) lastNB = ln;
    if (countDD(ln) % 2) inMath = true;
  }
  flush();
  return { chunks, refs, notes };
}

// Saltos de linea de un bloque de Markdown. Quita la «\» final (corte forzado). Con reflow une cada linea de un parrafo a la
// anterior (tambien la que sigue a una viñeta o a una cita del mismo nivel), salvo tras una linea en blanco, un titulo, una
// raya, una formula en bloque o un corte forzado (dos espacios o «\» al final).
function joinLines(lines, reflow) {
  const out = [];
  let inM = false, open = false, prev = null;
  for (const ln of lines) {
    const wasM = inM, dd = countDD(ln);
    if (dd % 2) inM = !inM;
    const hard = hardEnd(ln), s = hard ? ln.slice(0, -1) : ln;
    if (reflow && open && !wasM && !dd && ln.trim()) {
      const b = mdBlock(s);
      if (b.kind === 'p') { out[out.length - 1] += ' ' + s.trim(); open = !hard && !/ {2,}$/.test(ln); continue; }
      if (b.kind === 'quote' && !b.callout && prev.kind === 'quote' && prev.level === b.level && b.rest.trim()) { out[out.length - 1] += ' ' + b.rest.trim(); open = !hard && !/ {2,}$/.test(ln); continue; }
    }
    out.push(s);
    prev = mdBlock(s);
    open = !!ln.trim() && !hard && !/ {2,}$/.test(ln) && !wasM && !inM && !dd && ['p', 'ul', 'ol', 'quote'].includes(prev.kind);
  }
  return out;
}

const PADC = 0.4; // margen de una celda de tabla y de un bloque de codigo
function compute(text, measure, font, opt = {}) {
  const md = hasMd(text);
  const rows = [];
  // notas al pie: numeradas en el orden en que se las llama
  const fnNum = new Map();
  const ictx = { refs: new Map(), fn: (id) => { if (!fnNum.has(id)) fnNum.set(id, fnNum.size + 1); return fnNum.get(id); } };
  const txtItem = (p) => ({ k: 't', runs: md ? mdInline(p, ictx).flatMap((r) => runsOf(r.s).map((u) => ({ ...r, s: u.s, it: r.it || u.it }))) : runsOf(p).map((u) => ({ s: u.s, it: u.it })) });
  // los tramos de una sola linea (celdas, notas): texto y formulas en linea
  const itemsOf = (str) => splitMath(str).flatMap((tk) => (tk.t === 'txt' ? (tk.s ? [txtItem(tk.s)] : []) : [{ k: 'm', box: layoutMath(noIT(tk.src), false, measure) }]));

  // un bloque de texto: parrafos, listas, citas y formulas
  const mdRows = (src) => {
    let cur = [], skipNL = false, blk = null;
    // un trozo de texto plano; al comienzo de una linea, su forma de bloque (titulo, lista, cita, raya)
    const addTxt = (p) => {
      if (md && !cur.length && !blk) { blk = mdBlock(p); p = blk.callout ? blk.rest || calloutOf(blk.callout).label : blk.rest ?? ''; }
      if (p) cur.push(txtItem(p));
    };
    const endRow = (o = {}) => { rows.push({ items: cur, blk, ...o }); cur = []; blk = null; };
    for (const tk of splitMath(src)) {
      if (tk.t === 'txt') {
        let s = tk.s;
        if (skipNL && s[0] === '\n') s = s.slice(1);
        skipNL = false;
        s.split('\n').forEach((p, i) => { if (i > 0) endRow(); addTxt(p); });
      } else if (!tk.disp) {
        if (!cur.length && !blk) blk = { kind: 'p' };
        cur.push({ k: 'm', box: layoutMath(noIT(tk.src), false, measure) }); skipNL = false;
      } else {
        if (cur.length || blk) endRow();
        const ms = noIT(tk.src).replace(/^[ \t]*\n/, '').replace(/\n[ \t]*$/, '');
        for (const ln of ms.split('\n')) rows.push({ items: ln.trim() ? [{ k: 'm', box: layoutMath(ln, true, measure) }] : [], center: true });
        skipNL = true;
      }
    }
    if (!(skipNL && !cur.length)) endRow();
  };

  if (!md) mdRows(text);
  else {
    const B = blocks(text);
    ictx.refs = B.refs;
    for (const c of B.chunks) {
      if (c.t === 'md') mdRows(joinLines(c.lines, opt.reflow).join('\n'));
      else if (c.t === 'code') {
        const ls = c.lines.length ? c.lines : [''];
        ls.forEach((ln, i) => rows.push({ items: ln ? [{ k: 't', runs: [{ s: noIT(ln).replace(/\t/g, '    '), code: true }] }] : [], code: { first: i === 0, last: i === ls.length - 1 } }));
      } else {
        const T = { al: c.al, n: c.head.length, colW: [] };
        [c.head, ...c.body].forEach((cs, ri) => rows.push({ tbl: T, hdr: ri === 0, cells: Array.from({ length: T.n }, (_, k) => itemsOf(cs[k] ?? '')), items: [] }));
      }
    }
    // notas al pie al final, en letra mas pequeña bajo una raya corta (las que nadie llama van al final)
    if (B.notes.size) {
      for (const id of B.notes.keys()) ictx.fn(id); // numera las que nadie llamo (tras las llamadas)
      const ns = [...B.notes.entries()].map(([id, s]) => [ictx.fn(id), s]).sort((a, b) => a[0] - b[0]);
      rows.push({ items: [], blk: { kind: 'hr', short: true } });
      for (const [n, s] of ns) rows.push({ items: [{ k: 't', runs: [{ s: n + '. ' }] }, ...itemsOf(s)], foot: true });
    }
  }

  const runSz = (u, sz) => sz * (u.sup ? 0.62 : 1);
  const runW = (r, sz) => measure(r.s, r.code ? 'mono' : font, r.it) * runSz(r, sz) * (r.b ? 1.06 : 1);
  const itemsW = (items, sz) => items.reduce((w, it) => w + (it.k === 't' ? (it.w = it.runs.reduce((s, u) => s + runW(u, sz), 0)) : (it.w = it.box.w)), 0);
  const vert = (items, a, d) => { for (const it of items) if (it.k === 'm') { a = Math.max(a, it.box.a + 0.04); d = Math.max(d, it.box.d + 0.04); } return [a, d]; };
  // los avisos (callouts): su color sigue en las lineas de cita que vienen detras
  let co = null;
  for (const r of rows) {
    if (r.blk?.kind === 'quote') { if (r.blk.callout) co = calloutOf(r.blk.callout); r.co = co; } else co = null;
  }
  for (const r of rows) {
    const b = r.blk || { kind: 'p' };
    r.sz = b.kind === 'h' ? H_SIZE[b.level] : r.foot ? 0.8 : 1;
    r.x0 = b.kind === 'ul' || b.kind === 'ol' ? b.level * 1.4 : b.kind === 'quote' ? b.level * 0.8 + (r.co ? 0.2 : 0) : r.code ? PADC : 0;
    let a = 0.98 * r.sz, d = 0.22 * r.sz;
    if (b.kind === 'hr') { a = 0.6; d = 0.6; }
    if (r.tbl) {
      if (r.hdr) r.cells.forEach((items) => items.forEach((it) => it.runs?.forEach((u) => { u.b = true; })));
      r.cells.forEach((items, k) => { r.tbl.colW[k] = Math.max(r.tbl.colW[k] || 0, itemsW(items, 1)); [a, d] = vert(items, a, d); });
      a += 0.15; d += 0.15;
      r.a = a; r.d = d;
      continue;
    }
    for (const it of r.items) if (it.k === 't' && (b.kind === 'h' || b.callout)) it.runs.forEach((u) => { u.b = true; if (b.callout) u.col = r.co.col; });
    [a, d] = vert(r.items, a, d);
    if (r.center && r.items.length) { a += 0.06; d += 0.06; }
    if (r.code?.first) a += 0.25;
    if (r.code?.last) d += 0.25;
    r.w = itemsW(r.items, r.sz) + r.x0 + (r.code ? PADC : 0); r.a = a; r.d = d;
  }
  for (const r of rows) if (r.tbl) { r.w =r.tbl.colW.reduce((s, w) => s + w + 2 * PADC, 0); }
  const W = Math.max(rows.some((r) => r.blk?.kind === 'hr' || r.code) ? 2 : 0.0001, ...rows.map((r) => r.w));
  const prims = [];
  // los tramos de una linea, desde x sobre la linea base
  const emit = (items, x, base, sz) => {
    for (const it of items) {
      if (it.k === 't') {
        let xx = x;
        for (const u of it.runs) {
          const uw = runW(u, sz), col = u.col || (u.link ? LINK_COLOR : u.img ? MUTED_COLOR : undefined);
          prims.push({ k: 't', s: u.s, x: xx, y: u.sup ? base - 0.4 * sz : base, sz: runSz(u, sz), it: u.it, font: u.code ? 'mono' : font, ...(u.b ? { bold: true } : {}), ...(col ? { col } : {}) });
          if (u.st) prims.push({ k: 'p', pts: [[xx, base - 0.3 * sz], [xx + uw, base - 0.3 * sz]], lw: 0.06 * sz });
          if (u.link) prims.push({ k: 'p', pts: [[xx, base + 0.1 * sz], [xx + uw, base + 0.1 * sz]], lw: 0.05 * sz, col: LINK_COLOR });
          xx += uw;
        }
      } else prims.push(...shift(it.box.ops, x, base));
      x += it.w;
    }
  };
  let y = 0, codeTop = 0, tblTop = 0;
  rows.forEach((r, ri) => {
    const base = y + r.a, b = r.blk || { kind: 'p' }, y1 = y + r.a + r.d;
    if (r.tbl) {
      const T = r.tbl, first = rows[ri - 1]?.tbl !== T, last = rows[ri + 1]?.tbl !== T;
      if (first) tblTop = y;
      let x = 0;
      r.cells.forEach((items, k) => {
        const cw = T.colW[k], iw = items.reduce((s, it) => s + it.w, 0);
        emit(items, x + PADC + (T.al[k] === 'c' ? (cw - iw) / 2 : T.al[k] === 'r' ? cw - iw : 0), base, 1);
        x += cw + 2 * PADC;
      });
      prims.push({ k: 'p', pts: [[0, y1], [r.w, y1]], lw: r.hdr ? 0.08 : 0.04 });
      if (first) prims.push({ k: 'p', pts: [[0, y], [r.w, y]], lw: 0.06 });
      if (last) {
        let xv = 0;
        prims.push({ k: 'p', pts: [[0, tblTop], [0, y1]], lw: 0.04 });
        for (const cw of T.colW) { xv += cw + 2 * PADC; prims.push({ k: 'p', pts: [[xv, tblTop], [xv, y1]], lw: 0.04 }); }
      }
      y = y1;
      return;
    }
    if (r.code?.first) codeTop = y;
    if (r.code?.last) prims.push({ k: 'p', pts: [[0, codeTop + 0.08], [W, codeTop + 0.08], [W, y1 - 0.08], [0, y1 - 0.08], [0, codeTop + 0.08]], lw: 0.04, col: MUTED_COLOR });
    if (b.kind === 'hr') prims.push({ k: 'p', pts: [[0, y + r.a], [b.short ? Math.min(W, 6) : W, y + r.a]], lw: b.short ? 0.05 : 0.07 });
    if (b.kind === 'quote') for (let q = 0; q < b.level; q++) prims.push({ k: 'p', pts: [[0.25 + q * 0.8, y], [0.25 + q * 0.8, y1]], lw: r.co ? 0.14 : 0.1, ...(r.co ? { col: r.co.col } : {}) });
    if (b.mark) prims.push({ k: 't', s: b.mark, x: r.x0 - 0.35 - measure(b.mark, font, false), y: base, sz: 1, it: false, font });
    emit(r.items, r.center ? (W - r.w) / 2 : r.x0, base, r.sz);
    y = y1;
  });
  return { w: W, hh: Math.max(y, 1.2), prims };
}
