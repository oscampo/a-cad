// Cierre automatico de delimitadores al escribir un texto. «|» marca el cursor; «‹x›», una seleccion.
import assert from 'node:assert/strict';
import { pairInsert, pairDelete, inMathAt } from '../src/autopair.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };

// teclea ch en el estado escrito con | o ‹›; devuelve el estado nuevo con la misma notacion (o «=» si el navegador lo escribe normal)
const parse = (st) => { const v = st.replace(/[|‹›]/g, ''); if (st.includes('‹')) return { v, s: st.indexOf('‹'), e: st.indexOf('›') - 1 }; const k = st.indexOf('|'); return { v, s: k, e: k }; };
const show = (r) => (r.s === r.e ? r.v.slice(0, r.s) + '|' + r.v.slice(r.s) : r.v.slice(0, r.s) + '‹' + r.v.slice(r.s, r.e) + '›' + r.v.slice(r.e));
const key = (st, ch, math = false) => { const p = parse(st), r = pairInsert(p.v, p.s, p.e, ch, math); return r ? show(r) : '='; };
const back = (st) => { const p = parse(st), r = pairDelete(p.v, p.s, p.e); return r ? show(r) : '='; };

t('abrir pone el cierre y el cursor en medio', () => {
  assert.equal(key('"ver |', '['), '"ver [|]');
  assert.equal(key('|', '('), '(|)');
  assert.equal(key('f(x):|', '{'), 'f(x):{|}');
  assert.equal(key('"a |', '$'), '"a $|$');
  assert.equal(key('"correo |', '<'), '"correo <|>');
  assert.equal(key('"usa |', '`'), '"usa `|`');
  assert.equal(key('"[a|]', '('), '"[a(|)]'); // delante de un cierre tambien
});

t('teclear el cierre que ya esta solo avanza', () => {
  assert.equal(key('"[a|]', ']'), '"[a]|');
  assert.equal(key('f(x|)', ')'), 'f(x)|');
  assert.equal(key('"$x|$', '$'), '"$x$|');
  assert.equal(key('"`c|`', '`'), '"`c`|');
  assert.equal(key('"<a|>', '>'), '"<a>|');
  assert.equal(key('"a|b', ']'), '='); // sin cierre delante: normal
});

t('$ dentro de $|$ da formula en bloque', () => {
  assert.equal(key('"$|$', '$'), '"$$|$$');
  assert.equal(key('"$$|$$', '$'), '"$$$|$'); // ya en bloque: avanza
});

t('con seleccion, la encierra', () => {
  assert.equal(key('"‹hola›', '['), '"[‹hola›]');
  assert.equal(key('a+‹b›', '('), 'a+(‹b›)', true);
  assert.equal(key('"‹x^2›', '$'), '"$‹x^2›$');
});

t('cuando no se cierra solo', () => {
  assert.equal(key('|x+1', '('), '='); // delante de una letra o numero
  assert.equal(key('"$x|', '$'), '='); // cierra la formula abierta
  assert.equal(key('"$x| y', '$'), '=');
  assert.equal(key('if(x|', '<', true), '='); // menor que en una entrada de formula
  assert.equal(key('"$a|', '<'), '='); // menor que dentro de $...$
  assert.equal(key('a|', '$', true), '='); // $ en una entrada de formula
  assert.equal(key('"US|', '$'), '='); // pegado a una palabra
  assert.equal(key('"`co|', '`'), '='); // cierra el codigo abierto
  for (const ch of ['"', "'", '*', '_', '~', 'a']) assert.equal(key('"x |', ch), '=', ch);
});

t('borrar en un par vacio borra los dos', () => {
  assert.equal(back('"[|]'), '"|');
  assert.equal(back('(|)'), '|');
  assert.equal(back('"$$|$$'), '"$|$');
  assert.equal(back('"<|>'), '"|');
  assert.equal(back('"[a|]'), '=');
  assert.equal(back('"[|a'), '=');
  assert.equal(back('|'), '=');
  assert.equal(back('"‹ab›'), '=');
});

t('dentro de una formula: $...$, $$...$$ y \\$', () => {
  const at = (st) => { const p = parse(st); return inMathAt(p.v, p.s); };
  assert.equal(at('a $x|'), true);
  assert.equal(at('a $x$ |'), false);
  assert.equal(at('$$x|'), true);
  assert.equal(at('$$x$$ |'), false);
  assert.equal(at('$$ a $ b|'), true); // un $ suelto no cierra un $$
  assert.equal(at('\\$ |'), false);
  assert.equal(at('a $x$ y $z|'), true);
});

console.log(`\n${passed} pruebas de cierre automatico`);
