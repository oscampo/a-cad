// Parser de AsciiMath (sin DOM), con la sintaxis de https://asciimath.org/ : «3/4 = 1/x», «sqrt(x^2+y^2)», «sum_(i=1)^n i», «[[a,b],[c,d]]».
// parse(src) -> arbol de nodos; nunca lanza: lo que no entiende se muestra tal cual.
// Nodos: { t:'row', c:[...] } | 'n' numero | 'v' variable (cursiva) | 'sym' simbolo recto | 'txt' texto recto | 'fn' funcion recta
//   | 'o' operador { s, k:'bin'|'rel'|'ord'|'punct'|'word' } | 'space' { w } | 'frac' { a, b } | 'ss' { base, sub, sup }
//   | 'sqrt' { body, idx } | 'group' { l, r, body } (r null: sin cierre) | 'mat' { l, r, rows, bars }
//   | 'big' { s, sub, sup } (sum, prod, int, lim...) | 'acc' { k, body } | 'brace' { k:'u'|'o', body, sub, sup }
//   | 'stack' { k:'over'|'under', top, base } | 'font' { k, body } | 'color' { col, body }.

import { commaMode, elemChar, rowChar } from './locale.js';
import { parseUnit } from './units.js';

export const GREEK = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ɛ', zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ', iota: 'ι',
  kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'ϕ', varphi: 'φ',
  chi: 'χ', psi: 'ψ', omega: 'ω',
};
export const GREEK_UP = { Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω' };
const FUNCS = ['arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh', 'sech', 'csch', 'coth', 'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'log', 'ln', 'exp', 'det', 'dim', 'mod', 'gcd', 'lcm', 'lub', 'glb', 'max', 'min'];
// Palabras que toman argumentos: unarias (S), binarias (SS), operadores grandes y fuentes.
const KW = {
  sqrt: 'sqrt', root: 'root', frac: 'frac', abs: 'abs', norm: 'norm', floor: 'floor', ceil: 'ceil',
  hat: 'acc:hat', bar: 'acc:bar', overline: 'acc:bar', vec: 'acc:vec', tilde: 'acc:tilde', dot: 'acc:dot', ddot: 'acc:ddot',
  ul: 'acc:ul', underline: 'acc:ul', overarc: 'acc:arc', overparen: 'acc:arc', cancel: 'acc:cancel',
  overset: 'stack:over', stackrel: 'stack:over', underset: 'stack:under',
  ubrace: 'brace:u', underbrace: 'brace:u', obrace: 'brace:o', overbrace: 'brace:o',
  bb: 'font:bb', mathbf: 'font:bb', bbb: 'font:bbb', mathbb: 'font:bbb', cc: 'font:cc', mathcal: 'font:cc',
  tt: 'font:tt', mathtt: 'font:tt', fr: 'font:fr', mathfrak: 'font:fr', sf: 'font:sf', mathsf: 'font:sf',
  sum: 'big:sum', prod: 'big:prod', int: 'big:int', oint: 'big:oint', lim: 'big:lim',
  bigwedge: 'big:bigwedge', bigvee: 'big:bigvee', bigcap: 'big:bigcap', bigcup: 'big:bigcup',
};
const SYM = { // simbolos rectos sin espacios propios
  oo: '∞', infty: '∞', aleph: 'ℵ', partial: '∂', del: '∂', nabla: '∇', grad: '∇', deg: '°', cdots: '⋯', ldots: '…', dots: '…', vdots: '⋮', ddots: '⋱',
  'O/': '∅', emptyset: '∅', therefore: '∴', because: '∵', angle: '∠', frown: '⌢', triangle: '△', diamond: '⋄', square: '□',
  CC: 'ℂ', NN: 'ℕ', QQ: 'ℚ', RR: 'ℝ', ZZ: 'ℤ', AA: '∀', forall: '∀', EE: '∃', exists: '∃', bot: '⊥', top: '⊤', TT: '⊤', not: '¬', neg: '¬',
};
const BIN = { cdot: '⋅', ast: '∗', star: '⋆', times: '×', xx: '×', div: '÷', pm: '±', mp: '∓', circ: '∘', oplus: '⊕', ox: '⊗', otimes: '⊗', odot: '⊙',
  setminus: '∖', backslash: '∖', ltimes: '⋉', rtimes: '⋊', wedge: '∧', vee: '∨', vv: '∨', cap: '∩', nn: '∩', cup: '∪', uu: '∪' };
const REL = { ne: '≠', lt: '<', gt: '>', le: '≤', ge: '≥', ll: '≪', gg: '≫', mlt: '≪', mgt: '≫', prec: '≺', preceq: '⪯', succ: '≻', succeq: '⪰',
  in: '∈', notin: '∉', sub: '⊂', subset: '⊂', sup: '⊃', supset: '⊃', sube: '⊆', subseteq: '⊆', supe: '⊇', supseteq: '⊇',
  equiv: '≡', cong: '≅', approx: '≈', propto: '∝', prop: '∝', implies: '⇒', iff: '⇔', to: '→', mapsto: '↦', bowtie: '⋈', vdash: '⊢', models: '⊨',
  uarr: '↑', uparrow: '↑', darr: '↓', downarrow: '↓', rarr: '→', rightarrow: '→', larr: '←', leftarrow: '←', harr: '↔', leftrightarrow: '↔',
  rArr: '⇒', Rightarrow: '⇒', lArr: '⇐', Leftarrow: '⇐', hArr: '⇔', Leftrightarrow: '⇔', rightarrowtail: '↣', twoheadrightarrow: '↠' };
const WORD = { and: 'and', or: 'or', if: 'if' }; // se escriben como palabra, con espacios a los lados
const OPEN = { langle: '⟨', lfloor: '⌊', lceiling: '⌈' }, CLOSE = { rangle: '⟩', rfloor: '⌋', rceiling: '⌉' };

const WORDS = new Map();
for (const [k, v] of Object.entries(GREEK)) WORDS.set(k, { t: 'var', v });
for (const [k, v] of Object.entries(GREEK_UP)) WORDS.set(k, { t: 'sym', v });
for (const k of FUNCS) WORDS.set(k, { t: 'fn', v: k });
WORDS.set('clear', { t: 'fn', v: 'clear' });
for (const [k, v] of Object.entries(KW)) WORDS.set(k, { t: 'kw', v });
for (const [k, v] of Object.entries(SYM)) WORDS.set(k, { t: 'sym', v });
for (const [k, v] of Object.entries(BIN)) WORDS.set(k, { t: 'op', v, k: 'bin' });
for (const [k, v] of Object.entries(REL)) WORDS.set(k, { t: 'op', v, k: 'rel' });
for (const [k, v] of Object.entries(WORD)) WORDS.set(k, { t: 'op', v, k: 'word' });
for (const [k, v] of Object.entries(OPEN)) WORDS.set(k, { t: 'open', v });
for (const [k, v] of Object.entries(CLOSE)) WORDS.set(k, { t: 'close', v });
WORDS.set('vvv', { t: 'kw', v: 'big:bigvee' }); WORDS.set('nnn', { t: 'kw', v: 'big:bigcap' }); WORDS.set('uuu', { t: 'kw', v: 'big:bigcup' });
WORDS.set('quad', { t: 'space', w: 1 }); WORDS.set('qquad', { t: 'space', w: 2 });
WORDS.set('text', { t: 'raw', v: 'text' }); WORDS.set('color', { t: 'raw', v: 'color' });
// Con «\» delante, cualquier palabra de AsciiMath: «\in» (∈), «\to» (→), «\angle» (∠), «\xx» (×), «\sum», «\hat x», «\o+» (⊕).
const BS_KEYS = [...WORDS.keys()].sort((a, b) => b.length - a.length);
// Sin «\», una palabra solo se convierte si es ENTERA (las letras seguidas) una de estas: letras griegas, funciones (las de AsciiMath y las
// del calculo, ver addCalcFns), if/and/or, text(...)/color(...) y las que toman argumentos y tambien son del calculo (sqrt, abs, norm...).
// Cualquier otra se dibuja letra por letra: «total», «line», «gain», «cell» o «num» ya no tienen →, ∈, ≪ ni ν dentro.
const PLAIN = new Set([...Object.keys(GREEK), ...Object.keys(GREEK_UP), ...FUNCS, 'clear', ...Object.keys(WORD), 'text', 'color',
  'sqrt', 'root', 'frac', 'abs', 'norm', 'floor', 'ceil']);
// Funciones del calculo (expr.js las registra al cargar): «mean(v)», «cumsum(v)», «dot(a, b)» se dibujan como funcion (rectas), no como letras
// ni como un acento (dot) o un operador grande (sum).
export function addCalcFns(names) {
  for (const k of names) if (/^[A-Za-z]{2,}$/.test(k) && !PLAIN.has(k)) { PLAIN.add(k); CALC_FN.add(k); }
}
const CALC_FN = new Set();
const plainTok = (k) => (CALC_FN.has(k) ? { t: 'fn', v: k } : { ...WORDS.get(k) });
// Palabras que piden «\» para ser simbolo (el editor las usa para no convertir «\i» en ι al teclear «\in»).
export const symbolWords = () => [...WORDS.keys()].filter((k) => (!PLAIN.has(k) || (CALC_FN.has(k) && WORDS.get(k)?.t !== 'fn')) && /^[A-Za-z]/.test(k)) // una funcion del calculo que tambien es simbolo con «\» (angle: ∠) sigue contando.concat(SYMS.map(([w]) => w).filter((w) => /^[A-Za-z]/.test(w)));

const op = (v, k) => ({ t: 'op', v, k });
const SYMS = [
  ['<=>', op('⇔', 'rel')], ['|->', op('↦', 'rel')], ['...', { t: 'sym', v: '…' }], ['>->>', op('⤖', 'rel')],
  ['!in', op('∉', 'rel')], ['==', op('=', 'rel')], ['!=', op('≠', 'rel')], ['<=', op('≤', 'rel')], ['>=', op('≥', 'rel')], ['->', op('→', 'rel')], ['=>', op('⇒', 'rel')], ['<-', op('←', 'rel')],
  ['~~', op('≈', 'rel')], ['~=', op('≅', 'rel')], ['-=', op('≡', 'rel')], [':=', op(':=', 'rel')], ['-<=', op('⪯', 'rel')], ['-<', op('≺', 'rel')],
  ['>-=', op('⪰', 'rel')], ['>-', op('≻', 'rel')], ['>->', op('↣', 'rel')], ['->>', op('↠', 'rel')], ['|--', op('⊢', 'rel')], ['|==', op('⊨', 'rel')],
  // operadores elemento a elemento: el punto antecede a la operacion (antes de la raya de la fraccion, antes del ⋅); .^ es una potencia
  ['./', { t: 'slash', ew: true }], ['.*', op('.⋅', 'bin')], ['.^', { t: 'sup' }],
  ['-:', op('÷', 'bin')], ['+-', op('±', 'bin')], ['-+', op('∓', 'bin')], ['***', op('⋆', 'bin')], ['**', op('∗', 'bin')], ['//', { t: 'sym', v: '/' }],
  ['\\\\', op('∖', 'bin')], ['|><|', op('⋈', 'bin')], ['|><', op('⋉', 'bin')], ['><|', op('⋊', 'bin')], ['o+', op('⊕', 'bin')], ['o.', op('⊙', 'bin')],
  ['^^^', { t: 'kw', v: 'big:bigwedge' }],
  ['^^', op('∧', 'bin')], [':.', { t: 'sym', v: '∴' }], [":'", { t: 'sym', v: '∵' }], ['/_\\', { t: 'sym', v: '△' }], ['/_', { t: 'sym', v: '∠' }], ['_|_', { t: 'sym', v: '⊥' }],
  ['|__', { t: 'open', v: '⌊' }], ['__|', { t: 'close', v: '⌋' }], ['|~', { t: 'open', v: '⌈' }], ['~|', { t: 'close', v: '⌉' }],
  ['(:', { t: 'open', v: '⟨' }], [':)', { t: 'close', v: '⟩' }], ['<<', { t: 'open', v: '⟨' }], ['>>', { t: 'close', v: '⟩' }],
  ['{:', { t: 'open', v: '{:' }], [':}', { t: 'close', v: ':}' }],
  ['+', op('+', 'bin')], ['-', op('−', 'bin')], ['*', op('⋅', 'bin')], ['@', op('∘', 'bin')], ['=', op('=', 'rel')], ['<', op('<', 'rel')], ['>', op('>', 'rel')],
  ['/', { t: 'slash' }], ['_', { t: 'sub' }], ['^', { t: 'sup' }],
  ['(', { t: 'open', v: '(' }], ['[', { t: 'open', v: '[' }], ['{', { t: 'open', v: '{' }],
  [')', { t: 'close', v: ')' }], [']', { t: 'close', v: ']' }], ['}', { t: 'close', v: '}' }],
  [',', { t: 'punct', v: ',' }], [';', { t: 'punct', v: ';' }], ["'", { t: 'sym', v: '′' }],
].sort((a, b) => b[0].length - a[0].length);

const NUM_RE = /(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+(?![\p{L}\d_]))?/uy; // con notacion cientifica (2.5e6, 3e-4), como en expr.js
const NUM_RE_COMMA = /(?:\d+(?:[.,]\d+)?|[.,]\d+)(?:[eE][+-]?\d+(?![\p{L}\d_]))?/uy; // con coma decimal (doc.decimal = «,»): 1,5 es un numero
const LETTER = /\p{L}/u;
// «'in», «'mm^2», «'(m/s)»: una unidad que existe se dibuja como texto (si no, «in» seria ∈ y «'» una prima); si no es unidad, «'» es una prima (f'(x))
const UNIT_RE = /\s*(?:\(([^()]*)\)|([A-Za-zµμΩ°%áéíóúñÑ_][A-Za-zµμΩ°%áéíóúñÑ_0-9]*(?:\^[23](?!\d)|[²³])?))/y;
const isUnit = (u) => { try { parseUnit(u); return true; } catch (e) { return false; } };
const COLOR_RE = /^(#[0-9a-fA-F]{3,8}|[A-Za-z]{3,20})$/;

export function tokenize(s) {
  const out = [];
  let i = 0, angle = 0; // angle: «(:» (abre ⟨) sin cerrar
  const n = s.length;
  while (i < n) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '\\' && s[i + 1] === ' ') { out.push({ t: 'space', w: 0.28 }); i += 2; continue; }
    if (ch === '\uE004') { let j = s.indexOf('\uE005', i + 1); if (j < 0) j = n; out.push({ t: 'name', v: s.slice(i + 1, j) }); i = j + 1; continue; } // nombre con subindice de texto
    if (ch === '\uE002') { let j = s.indexOf('\uE003', i + 1); if (j < 0) j = n; out.push({ t: 'vec', v: s.slice(i + 1, j) }); i = j + 1; continue; } // vector de un texto (salida x=)
    if (ch === '"') { let j = s.indexOf('"', i + 1); if (j < 0) j = n; out.push({ t: 'str', v: s.slice(i + 1, j) }); i = j + 1; continue; }
    if (ch === "'") {
      UNIT_RE.lastIndex = i + 1;
      const um = UNIT_RE.exec(s), u = um && (um[1] ?? um[2]);
      if (u && isUnit(u)) { out.push({ t: 'str', v: (out.length ? ' ' : '') + u.replace(/\^2(?!\d)/g, '²').replace(/\^3(?!\d)/g, '³') }); i = UNIT_RE.lastIndex; continue; }
    }
    const NR = commaMode() ? NUM_RE_COMMA : NUM_RE;
    NR.lastIndex = i;
    const m = NR.exec(s);
    if (m) { out.push({ t: 'num', v: m[0].replace('-', '−') }); i += m[0].length; continue; } // 3e−4: el signo del exponente es un menos, sin espacios
    const cp = String.fromCodePoint(s.codePointAt(i));
    // una palabra: text(...) y color(...) leen su contenido tal cual; false si no lleva parentesis (entonces son letras)
    const word = (tk, at) => {
      if (tk.t !== 'raw') { out.push(tk); i = at; return true; }
      let j = at; while (j < n && s[j] === ' ') j++;
      const close = { '(': ')', '{': '}' }[s[j]];
      if (!close) return false;
      let e = s.indexOf(close, j + 1); if (e < 0) e = n;
      const arg = s.slice(j + 1, e).trim();
      i = e + 1;
      if (tk.v === 'text') out.push({ t: 'str', v: arg }); else out.push({ t: 'kw', v: 'color', arg: COLOR_RE.test(arg) ? arg : null });
      return true;
    };
    if (ch === '\\' && /[A-Za-z]/.test(s[i + 1] || '')) { // «\in», «\angle», «\o+»: un simbolo de AsciiMath (la palabra mas larga que empieza ahi)
      const k = BS_KEYS.find((w) => s.startsWith(w, i + 1));
      if (k && word({ ...WORDS.get(k) }, i + 1 + k.length)) continue;
      const ls = SYMS.find(([w]) => /^[A-Za-z]/.test(w) && s.startsWith(w, i + 1)); // «\o+», «\o.»
      if (ls) { out.push({ ...ls[1] }); i += 1 + ls[0].length; continue; }
      out.push({ t: 'sym', v: '\\' }); i += 1; continue; // no es un simbolo: la barra se ve
    }
    if (LETTER.test(cp)) { // letras seguidas: una palabra entera conocida (PLAIN) o letra por letra
      let j = i;
      while (j < n) { const c2 = String.fromCodePoint(s.codePointAt(j)); if (!LETTER.test(c2)) break; j += c2.length; }
      const run = s.slice(i, j);
      if (PLAIN.has(run) && word(plainTok(run), j)) continue;
      for (const c2 of run) out.push({ t: 'var', v: c2 });
      i = j;
      continue;
    }
    let sy = SYMS.find(([k]) => s.startsWith(k, i));
    // «(:» y «:)» son los angulos ⟨ ⟩ solo si van en pareja; si no, son un «:» pegado a un parentesis: A_(i,:) y A_(:,j) (filas y columnas)
    if (sy && sy[0] === '(:' && !s.includes(':)', i + 2)) sy = SYMS.find(([k]) => k === '(');
    else if (sy && sy[0] === ':)' && angle <= 0) { out.push({ t: 'sym', v: ':' }); i += 1; continue; }
    else if (sy && sy[0] === '(:') angle++;
    else if (sy && sy[0] === ':)') angle--;
    if (sy) { out.push({ ...sy[1] }); i += sy[0].length; continue; }
    out.push({ t: 'sym', v: cp }); i += cp.length;
  }
  return out;
}

const EMPTY = () => ({ t: 'row', c: [] });
// Como en AsciiMath, los parentesis, corchetes y llaves que son el operando de una fraccion, raiz, indice... no se ven.
const unwrap = (n) => (n.t === 'group' && (n.l === '(' || n.l === '[' || n.l === '{' || n.l === '{:') && n.body ? n.body : n);

const isComma = (n) => n.t === 'o' && n.k === 'punct' && n.s === ',';
function splitCommas(nodes) {
  const out = [[]];
  for (const n of nodes) { if (isComma(n)) out.push([]); else out.at(-1).push(n); }
  return out;
}
// «[[a,b],[c,d]]», «((a),(b))», «{(x,+,y),(u,-,v):}»: un grupo cuyos elementos son grupos con el mismo numero de elementos es una matriz.
// Una columna formada solo por «|» es una linea vertical (matriz aumentada).
// «[a, b; c, d]», «[a; b]»: entre corchetes, «;» separa filas y «,» columnas (la misma escritura de las matrices calculadas).
const isSemi = (n) => n.t === 'o' && n.k === 'punct' && n.s === ';';
const isBar = (n) => n.t === 'sym' && n.s === '|';
function semiMatrix(g) {
  const comma = commaMode(); // con coma decimal: «;» separa los elementos de una fila y «|» las filas
  const isRow = comma ? isBar : isSemi, isCell = comma ? isSemi : isComma;
  if (g.l !== '[' || g.r !== ']' || !g.body.c.some((n) => isRow(n) || (comma && isSemi(n)))) return null;
  const rows = [[]];
  for (const n of g.body.c) { if (isRow(n)) rows.push([]); else rows.at(-1).push(n); }
  const split = (nodes) => { const o = [[]]; for (const n of nodes) { if (isCell(n)) o.push([]); else o.at(-1).push(n); } return o; };
  const cells = rows.map((r) => split(r).map((c) => ({ t: 'row', c: c.filter((n) => n.t !== 'space') })));
  if (cells.some((r) => r.length !== cells[0].length || r.some((c) => !c.c.length))) return null;
  return { t: 'mat', l: '[', r: ']', rows: cells, bars: [] };
}
function toMatrix(g) {
  const semi = semiMatrix(g);
  if (semi) return semi;
  const items = splitCommas(g.body.c);
  if (!items.length || !items.every((it) => it.length === 1 && it[0].t === 'group')) return null;
  const rows = items.map((it) => splitCommas(it[0].body.c).map((c) => ({ t: 'row', c })));
  const cols = rows[0].length;
  if (rows.some((r) => r.length !== cols) || (rows.length === 1 && cols === 1)) return null;
  const isBar = (cell) => cell.c.length === 1 && cell.c[0].t === 'sym' && cell.c[0].s === '|';
  const bars = [];
  const keep = [];
  for (let k = 0; k < cols; k++) { if (rows.every((r) => isBar(r[k]))) bars.push(keep.length); else keep.push(k); }
  if (!keep.length) return null;
  return { t: 'mat', l: g.l, r: g.r, rows: rows.map((r) => keep.map((k) => r[k])), bars };
}

function parseS(p) {
  const k = p.toks[p.i];
  if (!k) return EMPTY();
  if (k.t === 'close' && p.depth > 0) return EMPTY(); // el cierre lo consume el grupo
  p.i++;
  switch (k.t) {
    case 'num': return { t: 'n', s: k.v };
    case 'var': {
      const nx = p.toks[p.i];
      if (k.v === 'd' && nx?.t === 'var' && 'xyzt'.includes(nx.v)) { p.i++; return { t: 'row', c: [{ t: 'v', s: 'd' }, { t: 'v', s: nx.v }] }; } // dy/dx
      return { t: 'v', s: k.v };
    }
    case 'sym': return { t: 'sym', s: k.v };
    case 'name': { // «var_(texto)»: el nombre en cursiva y el subindice como texto
      const m = /^(.*?)_\((.*)\)$/.exec(k.v);
      return m ? { t: 'ss', base: { t: 'v', s: m[1] }, sub: { t: 'txt', s: m[2] }, sup: null, nm: true } : { t: 'v', s: k.v };
    }
    case 'vec': { // «[1, 2, 3]», «[1; 2]», «[1, 2; 3, 4]» (viene de una salida x=): matriz sin comas
      const rows = k.v.trim().replace(/^\[/, '').replace(/\]$/, '').split(rowChar()).map((r) => r.split(elemChar()).map((e) => parse(e.trim())).filter((c) => c.c.length)).filter((r) => r.length);
      return rows.length && rows.every((r) => r.length === rows[0].length) ? { t: 'mat', l: '[', r: ']', rows, bars: [] } : EMPTY();
    }
    case 'str': return { t: 'txt', s: k.v };
    case 'fn': return { t: 'fn', s: k.v };
    case 'op': return { t: 'o', s: k.v, k: k.k };
    case 'punct': return { t: 'o', s: k.v, k: 'punct' };
    case 'space': return { t: 'space', w: k.w };
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
      const g = { t: 'group', l: k.v, r, body };
      return toMatrix(g) || g;
    }
    case 'kw': {
      const [kind, arg] = k.v.split(':');
      switch (kind) {
        case 'sqrt': return { t: 'sqrt', body: unwrap(parseS(p)) };
        case 'root': { const idx = unwrap(parseS(p)); return { t: 'sqrt', idx, body: unwrap(parseS(p)) }; }
        case 'frac': { const a = unwrap(parseS(p)); return { t: 'frac', a, b: unwrap(parseS(p)) }; }
        case 'abs': return { t: 'group', l: '|', r: '|', body: unwrap(parseS(p)) };
        case 'norm': return { t: 'group', l: '‖', r: '‖', body: unwrap(parseS(p)) };
        case 'floor': return { t: 'group', l: '⌊', r: '⌋', body: unwrap(parseS(p)) };
        case 'ceil': return { t: 'group', l: '⌈', r: '⌉', body: unwrap(parseS(p)) };
        case 'acc': return { t: 'acc', k: arg, body: unwrap(parseS(p)) };
        case 'font': return { t: 'font', k: arg, body: unwrap(parseS(p)) };
        case 'brace': return { t: 'brace', k: arg, body: unwrap(parseS(p)), sub: null, sup: null };
        case 'stack': { const top = unwrap(parseS(p)); return { t: 'stack', k: arg, top, base: unwrap(parseS(p)) }; }
        case 'color': return { t: 'color', col: k.arg, body: unwrap(parseS(p)) };
        case 'big': return { t: 'big', s: arg, sub: null, sup: null };
        default: return EMPTY();
      }
    }
    default: return { t: 'sym', s: k.v ?? '' };
  }
}

const isT = (n) => (n.t === 'v' || n.t === 'txt' || n.t === 'sym') && n.s === 'T' || (n.t === 'row' && n.c.length === 1 && isT(n.c[0]));
function transpose(m) {
  const cols = m.rows[0].length;
  return { ...m, rows: Array.from({ length: cols }, (_, k) => m.rows.map((r) => r[k])), bars: [] };
}

function parseI(p) {
  const base = parseS(p);
  let sub = null, sup = null;
  for (let n = 0; n < 2; n++) {
    const k = p.toks[p.i];
    if (k?.t === 'sub' && !sub) { p.i++; sub = unwrap(parseS(p)); } else if (k?.t === 'sup' && !sup) { p.i++; sup = unwrap(parseS(p)); } else break;
  }
  if (!sub && !sup) return base;
  if (base.nm && sup && !sub && !base.sup) return { ...base, sup }; // var_(texto)^2: el exponente va junto al subindice
  if (base.t === 'mat' && !sub && isT(sup)) return transpose(base); // v^T, M^T: la transpuesta se dibuja transpuesta (fila <-> columna)
  if (base.t === 'big' || base.t === 'brace') return { ...base, sub, sup };
  return { t: 'ss', base, sub, sup };
}

function parseE(p) {
  let left = parseI(p);
  while (p.toks[p.i]?.t === 'slash') {
    const ew = !!p.toks[p.i].ew;
    p.i++;
    const right = parseI(p);
    left = { t: 'frac', a: unwrap(left), b: unwrap(right), ...(ew ? { ew } : {}) };
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
