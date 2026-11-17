// Parser de un subconjunto de AsciiMath (sin DOM): «3/4 = 1/x», «sqrt(x^2+y^2)», «sum_(i=1)^n i», «alpha + beta».
// parse(src) -> arbol de nodos; nunca lanza: lo que no entiende se muestra tal cual.
// Nodos: { t:'row', c:[...] } | 'n' numero | 'v' variable (cursiva) | 'sym' simbolo recto | 'txt' texto recto | 'fn' funcion recta
//   | 'o' operador { s, k:'bin'|'rel'|'ord'|'punct' } | 'frac' { a, b } | 'ss' { base, sub, sup } | 'sqrt' { body, idx }
//   | 'group' { l, r, body } (r null: sin cierre) | 'big' { s, sub, sup } (sum, prod, int, lim) | 'acc' { k, body }.

const GREEK = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ', iota: 'ι',
  kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ', varphi: 'ϕ',
  chi: 'χ', psi: 'ψ', omega: 'ω',
};
const GREEK_UP = { Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω' };
const FUNCS = ['arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh', 'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'log', 'ln', 'exp', 'det', 'dim', 'gcd', 'lcm', 'max', 'min'];
const KW = ['sqrt', 'root', 'frac', 'abs', 'norm', 'hat', 'bar', 'vec', 'sum', 'prod', 'int', 'lim'];
const WORD_SYM = { oo: '∞', partial: '∂', nabla: '∇', deg: '°', cdots: '⋯', ldots: '…', dots: '…', cdot: '·', times: '×', div: '÷', pm: '±', mp: '∓' };
const WORD_OP = { xx: ['×', 'bin'], prop: ['∝', 'rel'], cdot: ['·', 'bin'], times: ['×', 'bin'], div: ['÷', 'bin'], pm: ['±', 'bin'], mp: ['∓', 'bin'] };

const WORDS = new Map();
for (const [k, v] of Object.entries(GREEK)) WORDS.set(k, { t: 'var', v });
for (const [k, v] of Object.entries(GREEK_UP)) WORDS.set(k, { t: 'sym', v });
for (const k of FUNCS) WORDS.set(k, { t: 'fn', v: k });
for (const k of KW) WORDS.set(k, { t: 'kw', v: k });
for (const [k, v] of Object.entries(WORD_SYM)) WORDS.set(k, { t: 'sym', v });
for (const [k, [v, kind]] of Object.entries(WORD_OP)) WORDS.set(k, { t: 'op', v, k: kind });
const WORD_KEYS = [...WORDS.keys()].sort((a, b) => b.length - a.length);

const SYMS = [
  ['<=>', { t: 'op', v: '⇔', k: 'rel' }], ['|->', { t: 'op', v: '↦', k: 'rel' }], ['...', { t: 'sym', v: '…' }],
  ['!=', { t: 'op', v: '≠', k: 'rel' }], ['<=', { t: 'op', v: '≤', k: 'rel' }], ['>=', { t: 'op', v: '≥', k: 'rel' }],
  ['->', { t: 'op', v: '→', k: 'rel' }], ['=>', { t: 'op', v: '⇒', k: 'rel' }], ['<-', { t: 'op', v: '←', k: 'rel' }],
  ['~~', { t: 'op', v: '≈', k: 'rel' }], ['~=', { t: 'op', v: '≅', k: 'rel' }], ['-=', { t: 'op', v: '≡', k: 'rel' }],
  [':=', { t: 'op', v: ':=', k: 'rel' }], ['-:', { t: 'op', v: '÷', k: 'bin' }], ['+-', { t: 'op', v: '±', k: 'bin' }],
  ['-+', { t: 'op', v: '∓', k: 'bin' }], ['**', { t: 'op', v: '∗', k: 'bin' }], ['//', { t: 'sym', v: '/' }],
  ['{:', { t: 'open', v: '{:' }], [':}', { t: 'close', v: ':}' }],
  ['+', { t: 'op', v: '+', k: 'bin' }], ['-', { t: 'op', v: '−', k: 'bin' }], ['*', { t: 'op', v: '·', k: 'bin' }],
  ['@', { t: 'op', v: '∘', k: 'bin' }], ['=', { t: 'op', v: '=', k: 'rel' }], ['<', { t: 'op', v: '<', k: 'rel' }], ['>', { t: 'op', v: '>', k: 'rel' }],
  ['/', { t: 'slash' }], ['_', { t: 'sub' }], ['^', { t: 'sup' }],
  ['(', { t: 'open', v: '(' }], ['[', { t: 'open', v: '[' }], ['{', { t: 'open', v: '{' }],
  [')', { t: 'close', v: ')' }], [']', { t: 'close', v: ']' }], ['}', { t: 'close', v: '}' }],
  [',', { t: 'punct', v: ',' }], [';', { t: 'punct', v: ';' }],
].sort((a, b) => b[0].length - a[0].length);

const NUM_RE = /(?:\d+(?:\.\d+)?|\.\d+)/y;
const LETTER = /\p{L}/u;

export function tokenize(s) {
  const out = [];
  let i = 0;
  const n = s.length;
  while (i < n) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '"') { let j = s.indexOf('"', i + 1); if (j < 0) j = n; out.push({ t: 'str', v: s.slice(i + 1, j) }); i = j + 1; continue; }
    NUM_RE.lastIndex = i;
    const m = NUM_RE.exec(s);
    if (m) { out.push({ t: 'num', v: m[0] }); i += m[0].length; continue; }
    const cp = String.fromCodePoint(s.codePointAt(i));
    if (LETTER.test(cp)) {
      const k = WORD_KEYS.find((w) => s.startsWith(w, i));
      if (k) { out.push({ ...WORDS.get(k) }); i += k.length; } else { out.push({ t: 'var', v: cp }); i += cp.length; }
      continue;
    }
    const sy = SYMS.find(([k]) => s.startsWith(k, i));
    if (sy) { out.push({ ...sy[1] }); i += sy[0].length; continue; }
    out.push({ t: 'sym', v: cp }); i += cp.length;
  }
  return out;
}

const EMPTY = () => ({ t: 'row', c: [] });
// En una fraccion, «(a+b)» como operando pierde sus parentesis.
const unwrap = (n) => (n.t === 'group' && (n.l === '(' || n.l === '[' || n.l === '{:') && n.body ? n.body : n);

function parseS(p) {
  const k = p.toks[p.i];
  if (!k) return EMPTY();
  if (k.t === 'close' && p.depth > 0) return EMPTY(); // el cierre lo consume el grupo
  p.i++;
  switch (k.t) {
    case 'num': return { t: 'n', s: k.v };
    case 'var': return { t: 'v', s: k.v };
    case 'sym': return { t: 'sym', s: k.v };
    case 'str': return { t: 'txt', s: k.v };
    case 'fn': return { t: 'fn', s: k.v };
    case 'op': return { t: 'o', s: k.v, k: k.k };
    case 'punct': return { t: 'o', s: k.v, k: 'punct' };
    case 'close': return { t: 'sym', s: k.v === ':}' ? '' : k.v };
    case 'slash': return { t: 'o', s: '/', k: 'ord' };
    case 'sub': return { t: 'o', s: '_', k: 'ord' };
    case 'sup': return { t: 'o', s: '^', k: 'ord' };
    case 'open': {
      p.depth++;
      const body = parseSeq(p);
      p.depth--;
      let r = null;
      if (p.toks[p.i]?.t === 'close') r = p.toks[p.i++].v;
      return { t: 'group', l: k.v, r, body };
    }
    case 'kw': {
      switch (k.v) {
        case 'sqrt': return { t: 'sqrt', body: unwrap(parseS(p)) };
        case 'root': { const idx = unwrap(parseS(p)); return { t: 'sqrt', idx, body: unwrap(parseS(p)) }; }
        case 'frac': { const a = unwrap(parseS(p)); return { t: 'frac', a, b: unwrap(parseS(p)) }; }
        case 'abs': return { t: 'group', l: '|', r: '|', body: unwrap(parseS(p)) };
        case 'norm': return { t: 'group', l: '‖', r: '‖', body: unwrap(parseS(p)) };
        case 'hat': case 'bar': case 'vec': return { t: 'acc', k: k.v, body: unwrap(parseS(p)) };
        default: return { t: 'big', s: k.v, sub: null, sup: null }; // sum prod int lim
      }
    }
    default: return { t: 'sym', s: k.v ?? '' };
  }
}

function parseI(p) {
  let base = parseS(p), sub = null, sup = null;
  for (let n = 0; n < 2; n++) {
    const k = p.toks[p.i];
    if (k?.t === 'sub' && !sub) { p.i++; sub = unwrap(parseS(p)); } else if (k?.t === 'sup' && !sup) { p.i++; sup = unwrap(parseS(p)); } else break;
  }
  if (!sub && !sup) return base;
  if (base.t === 'big') return { ...base, sub, sup };
  return { t: 'ss', base, sub, sup };
}

function parseE(p) {
  let left = parseI(p);
  while (p.toks[p.i]?.t === 'slash') {
    p.i++;
    const right = parseI(p);
    left = { t: 'frac', a: unwrap(left), b: unwrap(right) };
  }
  return left;
}

function parseSeq(p) {
  const c = [];
  while (p.i < p.toks.length) {
    if (p.toks[p.i].t === 'close' && p.depth > 0) break;
    c.push(parseE(p));
  }
  return { t: 'row', c };
}

export function parse(src) {
  try { return parseSeq({ toks: tokenize(String(src ?? '')), i: 0, depth: 0 }); } catch (e) { return { t: 'row', c: [{ t: 'txt', s: String(src ?? '') + ' ⚠' }] }; }
}
