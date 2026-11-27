// Los operadores logicos con barra («\and» ∧, «\or» ∨, «\not» ¬, «\xor» ⊕): se calculan, se dibujan como simbolo y el editor no los vuelve letras griegas.
import assert from 'node:assert/strict';
import { evalExpr } from '../src/expr.js';
import { parse } from '../src/asciimath.js';
import { backslashGreek, backslashWord } from '../src/greek.js';
import { setDecimal } from '../src/locale.js';

setDecimal('.');
let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const v = (s) => evalExpr(s, { vars: {}, allowMat: true }).value;

t('el evaluador entiende \\and \\or \\not \\xor y sus nombres de LaTeX (\\wedge \\vee \\neg \\land \\lor \\lnot \\oplus)', () => {
  const casos = [['1 \\and 0', 0], ['1 \\and 1', 1], ['1 \\wedge 1', 1], ['1 \\land 0', 0],
    ['0 \\or 1', 1], ['0 \\vee 0', 0], ['0 \\lor 1', 1],
    ['\\not 0', 1], ['\\neg 1', 0], ['\\lnot 0', 1], ['\\not 1 \\and 0', 0],
    ['1 \\xor 1', 0], ['1 \\xor 0', 1], ['1 \\oplus 0', 1], ['1 ⊕ 1', 0], ['0 ⊕ 1', 1]];
  for (const [s, want] of casos) assert.equal(v(s), want, s);
});

t('con barra y sin barra dan lo mismo; se pueden mezclar', () => {
  assert.equal(v('2 > 1 \\and not 3 < 2'), v('2 > 1 and not 3 < 2'));
  assert.equal(v('1 and 0 \\or 1'), 1);
});

t('una palabra con barra que no es operador sigue sin valer en el calculo', () => {
  assert.throws(() => v('1 \\le 2'), /Carácter no válido/);
});

const flat = (n) => (n.c ? n.c.map(flat).join('|') : n.t === 'o' ? n.s + (n.k === 'word' ? '(palabra)' : '') : n.s ?? '?');

t('se dibuja: sin barra la palabra, con barra el simbolo', () => {
  assert.equal(flat(parse('a and b')), 'a|and(palabra)|b');
  assert.equal(flat(parse('a or b')), 'a|or(palabra)|b');
  assert.equal(flat(parse('a xor b')), 'a|xor(palabra)|b');
  assert.equal(flat(parse('not a')), 'not(palabra)|a');
  assert.equal(flat(parse('a \\and b')), 'a|∧|b');
  assert.equal(flat(parse('a \\or b')), 'a|∨|b');
  assert.equal(flat(parse('a \\xor b')), 'a|⊕|b');
  assert.equal(flat(parse('\\not a')), '¬|a');
  assert.equal(flat(parse('a \\land b \\lor c')), 'a|∧|b|∨|c');
  assert.equal(flat(parse('\\lnot a')), '¬|a');
});

// teclear una palabra con barra en el editor: backslashGreek (\letra) y backslashWord; un espacio la termina
function type(word) {
  let v = '', s = 0, fresh = false;
  for (const ch of word + ' ') {
    let r = backslashGreek(v, s, s, ch);
    if (r) { v = r.v; s = r.s; fresh = true; continue; }
    r = backslashWord(v, s, s, ch, fresh);
    if (r) { v = r.v; s = r.s; fresh = false; continue; }
    v = v.slice(0, s) + ch + v.slice(s); s++; fresh = false;
  }
  return v.slice(0, -1);
}

t('el editor no vuelve griegas las palabras con barra (antes \\and era «αnd» y \\xor «ξor»)', () => {
  for (const w of ['and', 'or', 'not', 'xor', 'land', 'lor', 'lnot', 'wedge', 'vee', 'neg', 'oplus']) assert.equal(type('\\' + w), '\\' + w, w);
});

t('y las letras griegas de siempre siguen igual', () => {
  assert.equal(type('\\a'), 'α'); assert.equal(type('\\alpha'), 'α'); assert.equal(type('\\in'), '\\in'); assert.equal(type('\\apx'), 'αpx');
});

console.log(passed + ' pruebas de operadores logicos con barra');
