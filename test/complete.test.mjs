// Completado de formulas: contexto en el cursor, lo que existe en ese lugar de la pagina (orden de lectura), orden de las sugerencias,
// llamada abierta y ayuda de las funciones de biblioteca.
import assert from 'node:assert/strict';
import { newDoc, addPoint, addText, addLine } from '../src/model.js';
import { completeContext, suggest, openCall, defSource, builtinInfo, scriptHelp, rankNames } from '../src/complete.js';
import { libPayload } from '../src/library.js';
import { setDecimal } from '../src/locale.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
setDecimal('.');

t('contexto: nombre, miembro tras «alias.», y nada en texto normal, cadenas ni comentarios', () => {
  assert.deepEqual(completeContext('k:UF.kt', 7), { scope: 'member', base: 'UF', q: 'kt', start: 5 });
  assert.deepEqual(completeContext('x:p1.', 5), { scope: 'member', base: 'p1', q: '', start: 5 });
  assert.deepEqual(completeContext('y:2*Su', 6), { scope: 'all', q: 'Su', start: 4 });
  assert.equal(completeContext('y:C_(su', 7).q, 'C_(su'); // un subindice a medio escribir
  assert.equal(completeContext("y:S_e'", 6).q, "S_e'");
  assert.equal(completeContext('y:2x', 4).q, ''); // «2x»: multiplicacion implicita, no un nombre
  assert.equal(completeContext('"hola mu', 8).none, 'texto');
  assert.equal(completeContext('m:"stee', 7).none, 'cadena');
  assert.equal(completeContext('m:"a" + Su', 10).q, 'Su'); // la cadena ya se cerro
  assert.equal(completeContext('  # nota Su', 11).none, 'texto');
  assert.equal(completeContext('a:1 # Su', 8).none, 'comentario');
});

// Pagina: bloque de la biblioteca arriba, «Sut» y «f(x)» debajo, el lugar del cursor, y «n_f» mas abajo
function page() {
  const lib = newDoc(); lib.decimal = '.';
  [['T_(st):[100, 200]', 0], ['C_(surf)(Sut, finish):Sut/1000', 1], ['Kt_(C2)(Dd, rd):1 + Dd*rd', 2], ['Kt_(C3)(Dd, rd):1 + rd', 3]].forEach(([q, i]) => addText(lib, addPoint(lib, 0, 300 - i * 10), '$$' + q + '$$', {}));
  addText(lib, addPoint(lib, 0, 200), '%fsn(x, a, n):\n  # Función de singularidad <x − a>^n\n  # (0 para x <= a)\n  if(x > a, (x - a)^n, 0)', {});
  lib.lib = { on: true, name: 'Utilidades', alias: 'UF', version: 1, exports: ['C_(surf)', 'Kt_(C2)', 'Kt_(C3)', 'fsn'] };
  const d = newDoc(); d.decimal = '.';
  const b = addText(d, addPoint(d, 0, 100), '▸ Utilidades', { anchor: 'tl' }); d.texts[b].lib = libPayload(lib);
  addText(d, addPoint(d, 0, 80), '$$Sut:520$$', {});
  addText(d, addPoint(d, 0, 70), '$$f(x):sin(x)/x$$', {});
  addText(d, addPoint(d, 0, 20), '$$n_f:2$$', {}); // mas abajo del cursor
  const p = addPoint(d, 5, 5), q = addPoint(d, 9, 5); addLine(d, p, q, {});
  return d;
}
const AT = [50, 0]; // top, left del cuadro donde se escribe: entre f(x) y n_f

t('orden de lectura: lo definido antes y las bibliotecas insertadas antes; nada de lo que se define más abajo', () => {
  const d = page(), names = (txt) => suggest(d, txt, txt.length, ...AT).items.map((x) => x.name);
  assert.ok(names('y:Su').includes('Sut'));
  assert.ok(names('y:f').includes('f'));
  assert.ok(!names('y:n_').includes('n_f')); // se define mas abajo: aqui todavia no existe
  assert.deepEqual(suggest(d, 'y:n_', 4, 10, 0).items.filter((x) => x.name === 'n_f').length, 1); // debajo de n_f, si
  assert.ok(names('y:U').includes('UF')); // el alias de la biblioteca (inserta «UF.»)
});

t('miembros: tras «UF.» los nombres públicos de la biblioteca; sin distinguir mayúsculas y con búsqueda difusa', () => {
  const d = page(), mem = (txt) => suggest(d, txt, txt.length, ...AT).items.map((x) => x.name);
  assert.deepEqual(mem('k:UF.kt'), ['Kt_(C2)', 'Kt_(C3)']); // «kt» encuentra Kt_(…)
  assert.equal(mem('k:UF.csu')[0], 'C_(surf)'); // las letras en orden: C_(surf)
  assert.ok(!mem('k:UF.').includes('T_(st)')); // privado: no se sugiere
  assert.ok(mem('k:UF.').includes('fsn'));
});

t('«n_» solo lo que empieza con «n_»; las letras en orden empiezan por la primera («lin» no trae polyint)', () => {
  const d = page(), names = (txt) => suggest(d, txt, txt.length, ...AT).items.map((x) => x.name);
  assert.deepEqual(names('y:n_'), []); // n_f se define más abajo, y norm o numel no empiezan con «n_»
  assert.ok(!names('y:lin').includes('polyint'));
});

t('clear(all) antes del cursor borra lo anterior', () => {
  const d = page(); addText(d, addPoint(d, 0, 60), '$$clear(all)=$$', {});
  const items = suggest(d, 'y:Su', 4, ...AT).items.map((x) => x.name);
  assert.ok(!items.includes('Sut'));
});

t('orden: lo que empieza igual primero; luego lo del documento antes que las funciones de A-CAD', () => {
  const d = page(), items = suggest(d, 'y:s', 3, ...AT).items.map((x) => x.name);
  assert.ok(items.indexOf('sin') >= 0 && items.indexOf('Sut') >= 0);
  assert.ok(items.indexOf('Sut') < items.indexOf('sqrt')); // «s»: Sut (del documento) antes que sqrt (de A-CAD)
  const r = rankNames([{ name: 'linspace', kind: 'builtin' }, { name: 'linea_2', kind: 'var' }, { name: 'line', kind: 'builtin' }], 'line');
  assert.deepEqual(r.map((x) => x.name), ['linea_2', 'line', 'linspace']); // como SMath: la variable del documento primero
});

t('los elementos del dibujo (p1, l3) solo cuando se escribe algo como «p» o «p1»; tras «p1.» sus medidas', () => {
  const d = page();
  assert.ok(!suggest(d, 'y:Su', 4, ...AT).items.some((x) => x.kind === 'el'));
  assert.ok(suggest(d, 'y:p', 3, ...AT).items.some((x) => x.kind === 'el' && x.insert.endsWith('.')));
  const pid = Object.keys(d.pts).find((k) => d.pts[k].x === 5);
  assert.deepEqual(suggest(d, `y:${pid}.`, pid.length + 3, ...AT).items.map((x) => x.name).sort(), ['x', 'y']);
});

t('llamada abierta: qué función y en qué argumento está el cursor', () => {
  assert.deepEqual(openCall('k:UF.Kt_(C2)(1.5, ', 18), { name: 'UF.Kt_(C2)', idx: 1, open: 12 });
  assert.equal(openCall('y:max(a, sin(b), ', 17).name, 'max');
  assert.equal(openCall('y:max(a, sin(b', 14).name, 'sin');
  assert.equal(openCall('y:[1, 2', 7), null); // dentro de un vector no es una llamada
  assert.equal(openCall('y:2+3', 5), null);
});

t('ayuda: las líneas «#» tras la firma de un script (también de una biblioteca insertada); una definición de una línea da su fórmula', () => {
  assert.equal(scriptHelp('%g(x):\n  # Primera\n  # segunda\n  x^2'), 'Primera\nsegunda');
  assert.equal(scriptHelp('%g(x):\n  x^2'), '');
  const d = page(), s = defSource(d, 'UF.fsn');
  assert.equal(s.script, true); assert.equal(s.help, 'Función de singularidad <x − a>^n\n(0 para x <= a)');
  const f = defSource(d, 'f'); assert.deepEqual(f.params, ['x']); assert.equal(f.expr, 'sin(x)/x');
  assert.equal(defSource(d, 'UF.Kt_(C2)').expr, '1 + Dd*rd');
});

t('funciones de A-CAD: todas con ayuda; firma y ejemplo de la referencia', () => {
  const b = builtinInfo();
  assert.ok(b.size >= 140);
  assert.ok([...b.values()].every((x) => x.desc));
  assert.equal(b.get('interp1').sig, 'interp1(xs; ys; x)');
  assert.match(b.get('linspace').ex, /^linspace\(/);
});

console.log(`\n${passed} pruebas de completado pasaron`);
