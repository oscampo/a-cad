// Letras griegas: «\letra» al escribir, Ctrl+G (como SMath) y la misma variable con la letra o con su nombre («α» y «alpha»).
import assert from 'node:assert/strict';
import { backslashGreek, toggleGreek, TO_GREEK, TO_LATIN } from '../src/greek.js';
import { normName, NAME_RE } from '../src/expr.js';
import { GREEK, GREEK_UP } from '../src/asciimath.js';
import { textValue, plainText } from '../src/text.js';
import { checkName, renameDim } from '../src/params.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };

const parse = (st) => { const v = st.replace(/[|‹›]/g, ''); if (st.includes('‹')) return { v, s: st.indexOf('‹'), e: st.indexOf('›') - 1 }; const k = st.indexOf('|'); return { v, s: k, e: k }; };
const show = (r) => (r.s === r.e ? r.v.slice(0, r.s) + '|' + r.v.slice(r.s) : r.v.slice(0, r.s) + '‹' + r.v.slice(r.s, r.e) + '›' + r.v.slice(r.e));
const bs = (st, ch) => { const p = parse(st), r = backslashGreek(p.v, p.s, p.e, ch); return r ? show(r) : '='; };
const cg = (st) => { const p = parse(st), r = toggleGreek(p.v, p.s, p.e); return r ? show(r) : '='; };

t('«\\» y una letra', () => {
  assert.equal(bs('x:\\|', 'a'), 'x:α|');
  assert.equal(bs('"angulo \\| de', 'q'), '"angulo θ| de');
  assert.equal(bs('\\|', 'D'), 'Δ|');
  assert.equal(bs('\\|', 'W'), 'Ω|');
  assert.equal(bs('\\\\|', 'a'), '='); // «\\» escapada
  assert.equal(bs('|', 'a'), '='); // sin barra
  assert.equal(bs('\\|', 'A'), '='); // se veria igual que la latina
  assert.equal(bs('\\|', 'o'), '='); // omicron
  assert.equal(bs('\\|', '1'), '=');
  // Retroceso justo despues: vuelve «\a»
  const p = parse('x:\\|'), r = backslashGreek(p.v, p.s, p.e, 'a');
  assert.equal(r.undo.back, 'x:\\a');
  assert.equal(r.undo.s, 4);
});

t('Ctrl+G: la letra antes del cursor, ida y vuelta, y la seleccion', () => {
  assert.equal(cg('a|'), 'α|');
  assert.equal(cg('α|'), 'a|');
  assert.equal(cg('x+w| y'), 'x+ω| y');
  assert.equal(cg('|a'), '='); // nada antes del cursor
  assert.equal(cg('1|'), '=');
  assert.equal(cg('‹abc›'), '‹αβχ›');
  assert.equal(cg('‹αβχ›'), '‹abc›');
  assert.equal(cg('‹a+β›'), '‹α+β›'); // hay latinas: todo a griego
  assert.equal(cg('‹123›'), '=');
});

t('la tabla: ida y vuelta sin perdidas, y toda letra griega es un nombre valido', () => {
  for (const [l, g] of Object.entries(TO_GREEK)) {
    assert.equal(TO_LATIN[g], l, l);
    assert.ok(NAME_RE.test(g) && NAME_RE.test(g + '_1'), g);
  }
  // las letras de AsciiMath tambien
  for (const g of [...Object.values(GREEK), ...Object.values(GREEK_UP)]) assert.ok(NAME_RE.test(g), g);
  // ninguna mayuscula que se confunda con una latina
  for (const g of 'ΑΒΕΖΗΙΚΜΝΟΡΤΥΧο') assert.ok(!(g in TO_LATIN), g);
});

t('«alpha» y «α» son la misma variable', () => {
  for (const [n, g] of [['alpha', 'α'], ['beta_1', 'β_1'], ['Delta_( a )', 'Δ_(a)'], ['phi', 'ϕ'], ['varphi', 'φ'], ['Omega', 'Ω']]) assert.equal(normName(n), g, n);
  for (const n of ['pi', 'alphabet', 'x_alpha', 'theta1', 'A', 'D1']) assert.equal(normName(n), n, n); // pi es la constante
  const page = (text) => {
    const d = { pts: { p: { x: 0, y: 0 } }, lines: {}, circles: {}, arcs: {}, cons: {}, ellipses: {}, splines: {}, hatches: {}, traces: {}, texts: {} };
    d.texts.t1 = { pt: 'p', h: 1, font: '', text };
    return plainText(textValue(d, d.texts.t1));
  };
  assert.equal(page('$$beta:2\nβ*3=$$'), '$$β:=2\nβ*3=6$$');
  assert.equal(page('$$β:2\nbeta*3=$$'), '$$β:=2\nbeta*3=6$$');
  assert.equal(page('$$Delta_1:4\nΔ_1+1=$$'), '$$Δ_1:=4\nΔ_1+1=5$$');
  assert.equal(page('$$f(lambda):λ*2\nf(3)=$$'), '$$f(lambda):=λ*2\nf(3)=6$$'); // parametro con nombre, cuerpo con letra
  assert.equal(page('$$varphi:2\nφ=$$'), '$$φ:=2\nφ=2$$');
  assert.equal(page('$$phi:1\nϕ=$$'), '$$ϕ:=1\nϕ=1$$');
  assert.equal(page('$$pi=$$'), '$$pi=3.142$$');
  // α sigue reservada (decision del 2026-11-14), escrita como sea
  assert.match(page('$$alpha:1$$'), /⚠/);
  assert.match(page('$$α:1$$'), /⚠/);
});

t('cotas: el nombre se guarda con la letra', () => {
  const d = { pts: {}, lines: {}, circles: {}, arcs: {}, ellipses: {}, splines: {}, hatches: {}, traces: {}, texts: {}, cons: { k1: { t: 'DIS', refs: [], name: 'D1' }, k2: { t: 'DIS', refs: [], name: 'β' } } };
  assert.match(checkName(d, 'alpha', 'k1'), /reservada/);
  assert.match(checkName(d, 'beta', 'k1'), /Ya existe una cota llamada «β»/);
  assert.equal(checkName(d, 'gamma', 'k1'), null);
  renameDim(d, 'k1', 'gamma');
  assert.equal(d.cons.k1.name, 'γ');
});

console.log(`\n${passed} pruebas de letras griegas`);
