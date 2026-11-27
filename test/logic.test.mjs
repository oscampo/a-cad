// Operadores logicos: and, or, not, xor (y ∧ ∨ ¬). Verdadero = distinto de 0; dan 1 o 0; and/or cortocircuitan.
import assert from 'node:assert/strict';
import { evalExpr, isReservedName, reservedWhy } from '../src/expr.js';
import { setDecimal } from '../src/locale.js';

setDecimal('.');
let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const ev = (s, vars = {}) => evalExpr(s, { vars, allowMat: true });
const v = (s, vars) => ev(s, vars).value;
const err = (s, re, vars = {}) => assert.throws(() => ev(s, vars), re);
const n = (x) => ({ v: x, r: false });

t('and, or, not y xor dan 1 o 0', () => {
  assert.equal(v('1 and 1'), 1); assert.equal(v('1 and 0'), 0); assert.equal(v('0 and 0'), 0);
  assert.equal(v('0 or 1'), 1); assert.equal(v('0 or 0'), 0); assert.equal(v('1 or 1'), 1);
  assert.equal(v('not 0'), 1); assert.equal(v('not 1'), 0); assert.equal(v('not 5'), 0);
  assert.equal(v('1 xor 0'), 1); assert.equal(v('1 xor 1'), 0); assert.equal(v('0 xor 0'), 0);
  assert.equal(v('5 and 3'), 1); // cualquier valor distinto de 0 es verdadero y el resultado es 1
});

t('precedencia: la comparacion antes que and, and antes que or, not entre las dos', () => {
  const x = { x: n(3), y: n(10) };
  assert.equal(v('x > 1 and y < 20', x), 1); assert.equal(v('x > 5 and y < 20', x), 0);
  assert.equal(v('x > 5 and y < 5 or y == 10', x), 1); // (x>5 and y<5) or (y==10)
  assert.equal(v('1 or 0 and 0'), 1); // 1 or (0 and 0)
  assert.equal(v('not x > 5', x), 1); // not (x > 5)
  assert.equal(v('not 1 and 0'), 0); // (not 1) and 0
  assert.equal(v('not (1 and 0)'), 1);
  assert.equal(v('1 xor 1 and 0'), 1); // xor al nivel de or: 1 xor (1 and 0)
  assert.equal(v('2 + 3 > 4 and 1 + 1 == 2'), 1); // la aritmetica antes que la comparacion
});

t('los simbolos ∧ ∨ ¬ son lo mismo', () => {
  assert.equal(v('1 ∧ 0'), 0); assert.equal(v('1 ∨ 0'), 1); assert.equal(v('¬0'), 1); assert.equal(v('¬(1 ∧ 0)'), 1);
});

t('cortocircuito: si el primer valor decide, el otro lado no se evalua (aunque daria error)', () => {
  assert.equal(v('0 and 1/0'), 0); assert.equal(v('1 or 1/0'), 1);
});

t('el otro lado se evalua cuando hace falta (y entonces sus errores salen)', () => {
  err('1 and 1/0', /ivisi/); err('0 or 1/0', /ivisi/);
});

t('dentro de if() y como condicion de while', () => {
  assert.equal(v('if(2 > 1 and 3 > 2; 10; 20)'), 10); assert.equal(v('if(2 > 1 and 3 < 2; 10; 20)'), 20);
  assert.equal(v('if(not (1 > 2); 7; 8)'), 7);
  assert.equal(v('seq(i:0, s:0, while(i < 10 and s < 6, seq(i:i+1, s:s+i)), s)'), 6);
});

t('el cortocircuito sirve a una funcion que se llama a si misma', () => {
  const vars = { f: { fn: { params: ['n'], body: 'if(n > 0 and f(n - 1) >= 0; 1; 0)' } } };
  vars.f.fn.body = 'if(n > 0 and f(n - 1) >= 0; 1; 0)';
  assert.equal(v('f(5)', vars), 1); assert.equal(v('f(0)', vars), 0); // f(0) no entra a f(-1): sin cortocircuito no terminaria
});

t('un valor que no es un numero da un error claro', () => {
  err('"a" and 1', /cadenas/); err('0 or "a"', /cadenas/); err('not "a"', /cadenas/);
  err('[1, 2] and 1', /vectores/); err('(1+2i) and 1', /complejos/);
});

t('no cambia lo que ya funcionaba: sin operadores todo vale igual (la comparacion devuelve 1 o 0, un numero queda como es)', () => {
  assert.equal(v('3 > 2'), 1); assert.equal(v('2 + 3'), 5); assert.equal(v('x', { x: n(7) }), 7);
  assert.equal(v('max(1, 2) > 1 and min(3, 4) == 3'), 1);
});

t('and, or, not y xor son nombres reservados (solo en minuscula)', () => {
  for (const w of ['and', 'or', 'not', 'xor']) { assert.equal(isReservedName(w), true, w); assert.match(reservedWhy(w), /operador lógico/); }
  assert.equal(isReservedName('And'), false); assert.equal(isReservedName('OR'), false); assert.equal(isReservedName('android'), false);
});

console.log(passed + ' pruebas de operadores logicos');
