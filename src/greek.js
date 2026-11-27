// Escribir letras griegas sin teclado griego (en el PC, o en el iPad sin cambiar de teclado):
//  - «\» y una letra: al teclear la letra, «\a» se vuelve «α». Retroceso justo despues lo deshace («\a» queda tal cual).
//    «\\a» no se convierte (la barra esta escapada).
//  - Ctrl+G (tambien en el Mac, no Cmd: Cmd+G es «buscar siguiente»), como en SMath: convierte la letra antes del cursor (a -> α);
//    otra vez la devuelve (α -> a). Con texto seleccionado convierte todo lo seleccionado: si hay letras latinas, a griegas; si no,
//    las griegas a latinas.
// La tabla es la del teclado Symbol que usa SMath (a α, q θ, f φ, j ϕ, v ϖ...), salvo las mayusculas que se ven igual que una latina
// (A, B, E, Z, H, I, K, M, N, O, R, T, U, X: Α, Β, Ε, Ζ, Η, Ι, Κ, Μ, Ν, Ο, Ρ, Τ, Υ, Χ) y la omicron «ο»: una variable con ellas se veria igual que su gemela latina y no se
// encontraria. Esas letras no se convierten.
// Calculo y dibujo usan la misma letra: «α» y «alpha» son la misma variable (ver normName en expr.js).

import { symbolWords, GREEK, GREEK_UP, BS_LOGIC } from './asciimath.js';

export const TO_GREEK = {
  a: 'α', b: 'β', c: 'χ', d: 'δ', e: 'ε', f: 'φ', g: 'γ', h: 'η', i: 'ι', j: 'ϕ', k: 'κ', l: 'λ', m: 'μ',
  n: 'ν', p: 'π', q: 'θ', r: 'ρ', s: 'σ', t: 'τ', u: 'υ', v: 'ϖ', w: 'ω', x: 'ξ', y: 'ψ', z: 'ζ',
  D: 'Δ', F: 'Φ', G: 'Γ', J: 'ϑ', L: 'Λ', P: 'Π', Q: 'Θ', S: 'Σ', V: 'ς', W: 'Ω', X: 'Ξ', Y: 'Ψ',
};
export const TO_LATIN = Object.fromEntries(Object.entries(TO_GREEK).map(([l, g]) => [g, l]));

// Al teclear ch con la seleccion [s, e): si cierra un «\letra», { v, s, e, undo } (undo: lo que vuelve Retroceso); si no, null.
export function backslashGreek(v, s, e, ch) {
  if (s !== e || s < 1 || v[s - 1] !== '\\' || v[s - 2] === '\\' || !TO_GREEK[ch]) return null;
  const g = TO_GREEK[ch], nv = v.slice(0, s - 1) + g + v.slice(s);
  return { v: nv, s, e: s, undo: { v: nv, at: s, back: v.slice(0, s - 1) + '\\' + ch + v.slice(s), s: s + 1 } };
}

// Simbolos de AsciiMath con «\» («\in» ∈, «\to» →, «\angle» ∠; ver asciimath.js): «\i» se vuelve ι al instante, pero si la letra
// siguiente puede seguir un simbolo o el nombre de una griega («\in», «\al…»), vuelve a «\i» y la palabra se escribe tal cual. Al
// terminarla (un caracter que no es letra): el nombre de una griega se vuelve la letra («\alpha» α), un simbolo se queda («\in»), y
// cualquier otra cosa es la griega de la primera letra mas el resto, como antes («\apx» αpx).
// fresh: el caracter antes del cursor es una griega recien convertida desde «\letra». Devuelve { v, s, e } o null (nada que hacer).
let SW = null;
const words = () => (SW ||= { sym: [...new Set([...symbolWords(), ...BS_LOGIC])].filter((w) => /^[A-Za-z]+$/.test(w)), greek: { ...GREEK, ...GREEK_UP } });
const isLetter = (c) => /^[A-Za-z]$/.test(c);
const canGrow = (w) => { const W = words(); return W.sym.some((x) => x.startsWith(w)) || Object.keys(W.greek).some((x) => x.startsWith(w)); };
const symHead = (w) => words().sym.some((x) => w.startsWith(x)); // AsciiMath toma el simbolo mas largo al comienzo: «\inx» es ∈x
const settle = (w) => { const W = words(); if (W.greek[w]) return W.greek[w]; if (symHead(w)) return null; return TO_GREEK[w[0]] ? TO_GREEK[w[0]] + w.slice(1) : null; };
export function backslashWord(v, s, e, ch, fresh = false) {
  if (s !== e) return null;
  const before = v.slice(0, s), after = v.slice(s);
  const m = /(^|[^\\])\\([A-Za-z]+)$/.exec(before);
  if (m) {
    const w = m[2], at = before.length - w.length - 1;
    if (isLetter(ch)) {
      if (canGrow(w + ch) || symHead(w + ch)) return null; // la palabra sigue: se escribe tal cual
      const g = TO_GREEK[w[0]];
      if (!g) return null;
      const ns = at + w.length + 1;
      return { v: v.slice(0, at) + g + w.slice(1) + ch + after, s: ns, e: ns };
    }
    const to = settle(w);
    if (to === null) return null;
    const ns = at + to.length + ch.length;
    return { v: v.slice(0, at) + to + ch + after, s: ns, e: ns };
  }
  if (fresh && isLetter(ch)) { // «\i» ya es ι y llega «n»: vuelve a «\in»
    const l = TO_LATIN[v[s - 1]];
    if (l && canGrow(l + ch)) return { v: v.slice(0, s - 1) + '\\' + l + ch + after, s: s + 2, e: s + 2 };
  }
  return null;
}

// Ctrl+G con la seleccion [s, e): { v, s, e } o null (nada que convertir).
export function toggleGreek(v, s, e) {
  if (s === e) {
    const c = v[s - 1], to = TO_GREEK[c] || TO_LATIN[c];
    return to ? { v: v.slice(0, s - 1) + to + v.slice(s), s, e } : null;
  }
  const part = v.slice(s, e), map = [...part].some((c) => TO_GREEK[c]) ? TO_GREEK : TO_LATIN;
  const out = [...part].map((c) => map[c] || c).join('');
  return out === part ? null : { v: v.slice(0, s) + out + v.slice(e), s, e: s + out.length };
}

// Activa las dos cosas en todos los campos de texto de la pagina (textarea e input de texto), salvo los que esten dentro de skip
// (un selector: la configuracion de GitHub, donde un «\» o una letra griega no tienen sentido). Escucha en la fase de captura: la
// entrada del lienzo detiene sus teclas para que no lleguen a los atajos del dibujo.
export function attachGreek(root = document, skip = '') {
  let last = null; // la ultima conversion de «\letra», para deshacerla con Retroceso
  const ok = (el) => el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type === 'text')) && !(skip && el.closest(skip));
  const put = (el, r) => {
    el.value = r.v;
    el.setSelectionRange(r.s, r.e);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  root.addEventListener('beforeinput', (ev) => {
    const el = ev.target;
    if (!ok(el) || ev.isComposing || ev.defaultPrevented) return;
    if (ev.inputType === 'deleteContentBackward' && last && last.el === el && el.value === last.v && el.selectionStart === last.at && el.selectionEnd === last.at) {
      ev.preventDefault(); const u = last; last = null; put(el, { v: u.back, s: u.s, e: u.s }); return;
    }
    const fresh = !!(last && last.el === el && el.value === last.v && el.selectionStart === last.at && el.selectionEnd === last.at);
    last = null;
    const ch = ev.inputType === 'insertLineBreak' || ev.inputType === 'insertParagraph' ? '\n' : ev.inputType === 'insertText' ? ev.data : null;
    if (!ch || ch.length !== 1) return;
    const w = backslashWord(el.value, el.selectionStart, el.selectionEnd, ch, fresh);
    if (w) { ev.preventDefault(); put(el, w); return; }
    if (ch === '\n') return;
    const r = backslashGreek(el.value, el.selectionStart, el.selectionEnd, ch);
    if (!r) return;
    ev.preventDefault(); put(el, r); last = { el, ...r.undo };
  }, true);
  root.addEventListener('keydown', (ev) => {
    const el = ev.target;
    if (!ok(el) || !ev.ctrlKey || ev.metaKey || ev.altKey || ev.key.toLowerCase() !== 'g') return;
    ev.preventDefault(); // en el navegador, Ctrl+G es «buscar siguiente»
    last = null;
    const r = toggleGreek(el.value, el.selectionStart, el.selectionEnd);
    if (r) put(el, r);
  }, true);
}
