// Sintaxis de calculo de los textos (v2): «x:valor» asigna, «expr=» muestra el valor, `...` es literal, y la migracion de los dibujos
// anteriores («x{=v}» -> «$x:v$», «[=e]» -> «$e=$»).
import assert from 'node:assert/strict';
import { migrateCalc, migrateCalcDoc, calcStmts, calcParse, calcSrc, CALC_VERSION } from '../src/tvars.js';
import { textValue, plainText } from '../src/text.js';
import { newDoc } from '../src/model.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };

const stmts = (s) => calcStmts(s).map((p) => (p.k === 'def' ? p.name + (p.params !== undefined ? '(' + p.params + ')' : '') + ':' + p.expr : p.expr + '='));
const page = (text, angles) => {
  const d = { angles, pts: { p: { x: 0, y: 0 } }, lines: {}, circles: {}, arcs: {}, cons: {}, ellipses: {}, splines: {}, hatches: {}, traces: {}, texts: {} };
  d.texts.t1 = { pt: 'p', h: 1, font: '', text };
  return plainText(textValue(d, d.texts.t1));
};

t('enunciados: «x:v» y «x:=v» asignan, «f(x;y):e» define una funcion, «expr=» es una salida', () => {
  assert.deepEqual(stmts('$$x:2$$'), ['x:2']);
  assert.deepEqual(stmts('$$k:=4$$'), ['k:4']);
  assert.deepEqual(stmts('$$f(x;y):x+y$$'), ['f(x;y):x+y']);
  assert.deepEqual(stmts('$$x*3=$$'), ['x*3=']);
  assert.deepEqual(stmts('texto $a:1$ y $a=$'), ['a:1', 'a=']);
});

t('«==», «<=», «>=», «!=» y «:=» al final no son salidas', () => {
  for (const s of ['$$x==3$$', '$$a<=$$', '$$b>=$$', '$$c!=$$', '$$k:=$$']) assert.deepEqual(stmts(s), [], s);
  assert.equal(page('$$x:2\nx==2=$$'), '$$x:=2\nx==2=1$$'); // una comparacion si se puede mostrar con «=» al final
});

t('el literal `...` no se evalua; sin cerrar se marca con ⚠', () => {
  assert.deepEqual(stmts('$$`a:1` b:2$$'), ['b:2']);
  assert.equal(page('$$`x:2` y:3\ny=$$'), '$$x:2 y:=3\ny=3$$');
  assert.equal(page('$$`abierto$$'), '$$`abierto ⚠$$');
});

t('«x:expr=» asigna y muestra el valor en la misma linea', () => {
  assert.deepEqual(stmts('$$x:2*3=$$'), ['x:2*3']);
  assert.equal(page('$$x:2*3=\ny:x+1 =\ny*2=$$'), '$$x:=2*3=6\ny:=x+1=7\ny*2=14$$');
  assert.equal(page('$$k:=4=$$'), '$$k:=4=4$$');
  assert.equal(page('$$v:1..3;3=$$'), '$$v:=[1, 2, 3]$$'); // un vector ya muestra su valor
  assert.equal(page('$$b:3==3$$'), '$$b:=3==3$$'); // «==» al final es una comparacion, no «=»
  assert.equal(page('$$q:sqrt(-1)=$$').includes('⚠'), true);
  assert.deepEqual(stmts('$f(x):x^2=$'), ['f(x):x^2']); // en una funcion el «=» tampoco es parte del cuerpo
  for (const s of ['$$x:2*3=$$', '$$y:x+1 = $$']) assert.equal(calcSrc(calcParse(s)), s);
});

t('«f(x):expr=» define la funcion y muestra f(x) con las variables de ese punto', () => {
  assert.equal(page('$$x:0..1;3\nf(x):x.^2=\nf(x)=\nf(3)=$$'), '$$x:=[0, 0.5, 1]\nf(x):=x.^2=[0, 0.25, 1]\nf(x)=[0, 0.25, 1]\nf(3)=9$$');
  assert.equal(page('$$a:2\nb:5\ng(a; b):a*b+1=$$'), '$$a:=2\nb:=5\ng(a; b):=a*b+1=11$$');
  assert.equal(page('$$f(x):x^2=\nf(3)=$$'), '$$f(x):=x^2\nf(3)=9$$'); // sin x no muestra nada, pero la funcion queda definida
  assert.equal(page('$$x:-1\nf(x):sqrt(x)=$$'), '$$x:=-1\nf(x):=sqrt(x)=⚠$$'); // con x, un calculo que falla si da ⚠
  for (const s of ['$$f(x):x^2=$$', '$$g(a; b):a+b = $$']) assert.equal(calcSrc(calcParse(s)), s);
});

t("«x:valor'unidad»: unidades reales, se convierten y se propagan", () => {
  const u = (s) => page(s).replace(/ " ([^"]*)"/g, ' $1'); // la unidad va como texto «" N"» dentro de la formula
  assert.deepEqual(stmts("$$F:250'N$$"), ['F:250']);
  assert.equal(u("$$F:250'N\nF=\nF*2=$$"), '$$F:=250 N\nF=250 N\nF*2=500 N$$'); // F*2 sigue en la unidad de F
  assert.equal(u("$$a:2*3 ' m/s^2=$$"), '$$a:=2*3=6 m/s²$$'); // con «=», detras del valor; «^2» como superindice
  assert.equal(u("$$q:sqrt(-1)'N=$$"), '$$q:=sqrt(-1) N=⚠$$');
  assert.equal(u("$$F:2'kN+300'N\nF=\nF='N\nF='m$$"), '$$F:=2 kN+300 N\nF=2.3 kN\nF=2300 N\nF=⚠$$'); // en la unidad pedida; ⚠ si no es de la misma magnitud
  assert.equal(u("$$m:2'kg\nF:250'N\na:F/m\na=\nb:(250'N)/m\nb=$$"), '$$m:=2 kg\nF:=250 N\na:=F/m\na=125 m/s²\nb:=(250 N)/m\nb=125 m/s²$$'); // sin unidad propia: la del SI
  assert.equal(u("$$k:250'N/m\nk=$$"), '$$k:=250 N/m\nk=250 N/m$$'); // «'N/m» al final es la unidad entera
  assert.equal(u("$$x:5'foo=$$").includes('⚠'), true); // unidad desconocida
  assert.equal(u("$$L:1.2'm\nd:L/4\nd=\nd='m\nL/4=$$"), '$$L:=1.2 m\nd:=L/4\nd=300 mm\nd=0.3 m\nL/4=0.3 m$$'); // la de una variable de la expresion (d no tiene unidad propia: SI con prefijo)
  assert.equal(u("$$F:35'kN\nd:1'in\nσ:F/(pi*d^2/4)\nσ='kpsi\nσ='ksi\nF='kip\np:2'Mpsi\np='ksi$$"), '$$F:=35 kN\nd:=1 in\nσ:=F/(pi*d^2/4)\nσ=10.018 kpsi\nσ=10.018 ksi\nF=7.868 kip\np:=2 Mpsi\np=2000 ksi$$'); // psi admite prefijo; ksi y kip
  assert.equal(u("$$F:5000'N\nA:2'cm^2\nF/A=$$"), '$$F:=5000 N\nA:=2 cm²\nF/A=25 MPa$$'); // prefijo automatico
  assert.equal(u("$$v:3'(m/s)\ndt:2'min\nv*dt=$$"), '$$v:=3 m/s\ndt:=2 min\nv*dt=360 m$$');
  assert.equal(u("$$L:1'm\nM:L'mm\nM=$$"), '$$L:=1 m\nM:=L mm\nM=1000 mm$$'); // con unidades, la cola solo dice en que unidad mostrarla
  assert.equal(u("$$L:1'm\nM:L+3'mm\nM=$$"), '$$L:=1 m\nM:=L+3 mm\nM=1003 mm$$'); // L+3 no cuadra: «3'mm» es parte de la expresion (y M se muestra en mm)
  assert.equal(u("$$x:2'N+3=$$").includes('⚠'), true); // N mas un numero sin unidades
  assert.equal(u("$$p:2.5e6'Pa\np='MPa\nq:3e-4=\nr:2E-3*1E3=\ns:sin(180)=$$"), '$$p:=2.5e6 Pa\np=2.5 MPa\nq:=3e-4=0.0003\nr:=2E-3*1E3=2\ns:=sin(180)=0$$'); // notacion cientifica; un numero muy pequeño no se muestra como 0, el ruido de redondeo si
  assert.equal(u("$$x:sin(30'deg)=$$"), '$$x:=sin(30 deg)=0.5$$'); // un ángulo con unidad
});

t('vectores y matrices con unidades: una sola unidad para todos los elementos', () => {
  const u = (s) => page(s).replaceAll(' " ', ' ').replaceAll('"', '');
  assert.equal(u("$$v:[1,2,3]'mm\nv=\nv*2=\nsum(v)=\nv='m\nv='N$$"), '$$v:=[1, 2, 3] mm\nv=[1, 2, 3] mm\nv*2=[2, 4, 6] mm\nsum(v)=6 mm\nv=[0.001, 0.002, 0.003] m\nv=⚠$$');
  assert.equal(u("$$w:[1'm,20'cm]\nw=$$"), '$$w:=[1, 0.2] m\nw=[1, 0.2] m$$'); // cada elemento con su unidad, se muestran en una
  assert.equal(u("$$x:0..10;5'mm\nx=\ny:1'm..3'm;3\ny=$$"), '$$x:=[0, 2.5, 5, 7.5, 10] mm\nx=[0, 2.5, 5, 7.5, 10] mm\ny:=[1, 2, 3] m\ny=[1, 2, 3] m$$'); // rangos
  assert.equal(u("$$a:[1'm,2'N]$$").includes('⚠'), true); // magnitudes mezcladas
  assert.equal(u("$$b:[1,2]'m+[1,2]'N=$$").includes('⚠'), true);
  assert.equal(u("$$F:[1,2,3]'N\nd:[1,0,0]'m\ndot(F;d)=\nmax(F)=$$"), '$$F:=[1, 2, 3] N\nd:=[1, 0, 0] m\ndot(F;d)=1 J\nmax(F)=3 N$$');
  assert.equal(u("$$M:[1,2;3,4]'m\ndet(M)=\ninv(M)=$$"), '$$M:=[1, 2; 3, 4] m\ndet(M)=-2 m²\ninv(M)=[-2, 1; 1.5, -0.5] 1/m$$');
  assert.equal(u("$$F:200'N\nx:4'mm\nF/x=$$"), '$$F:=200 N\nx:=4 mm\nF/x=50000 N/m$$'); // N/m en vez de kg/s²
  assert.equal(u("$$k:[1,2]\nk='m$$"), '$$k:=[1, 2]\nk=⚠$$'); // sin unidades no se puede pedir una
  assert.equal(u("$$s:[1,4]'m^2\nsqrt(s)=\nsin(s)=$$"), '$$s:=[1, 4] m²\nsqrt(s)=[1, 2] m\nsin(s)=⚠$$');
  for (const s of ["$$F='kN$$", "$$F = 'kN $$"]) assert.equal(calcSrc(calcParse(s)), s);
  assert.equal(page("$$f'(x)$$"), "$$f'(x)$$"); // fuera de una asignacion «'» sigue siendo la prima
  assert.deepEqual(stmts("$$g(x):x'N$$"), ["g(x):x'N"]); // una funcion no lleva unidad
  for (const s of ["$$F:250'N$$", "$$a:2*3 ' m/s^2=$$"]) assert.equal(calcSrc(calcParse(s)), s);
});

t('un enunciado por linea: lo que sobra en la linea da ⚠', () => {
  assert.equal(page('$$x:2  y:3$$'), '$$x:=2  y:3 ⚠$$');
});

t('calcSrc vuelve a escribir el texto tal cual', () => {
  for (const s of ['a $x:1$ b', '$$f(x):x^2\nf(2)=\n`nota` x:3$$', '$$`sin cerrar$$', 'nada']) assert.equal(calcSrc(calcParse(s)), s);
});

t('migracion: en el texto plano cada definicion o salida pasa a formula', () => {
  assert.equal(migrateCalc('El área vale A{=b*h} y da [=A] mm'), 'El área vale $A:b*h$ y da $A=$ mm');
  assert.equal(migrateCalc('f(x){=x^2}'), '$f(x):x^2$');
  assert.equal(migrateCalc('v{=0..1;3}'), '$v:0..1;3$');
  assert.equal(migrateCalc('r{=3}[=r]2'), '$r:3$$r=$ 2'); // un digito pegado detras se separa
  assert.equal(migrateCalc('sin nada'), 'sin nada');
  assert.equal(migrateCalc('z=[=z]'), '$z=$'); // «e = [=e]» tambien en el texto plano: no se repite la expresion
  assert.equal(migrateCalc('m = [=m] mm'), '$m=$ mm');
  assert.equal(migrateCalc('tz=[=z]'), 'tz=$z=$'); // «tz» no es «z»
});

t('migracion: dentro de una formula lo demas pasa a literal y «e = [=e]» queda «e=»', () => {
  assert.equal(migrateCalc('$$b = [=b]$$'), '$$b=$$');
  assert.equal(migrateCalc('$$A*x^T = [=A*x^T]$$'), '$$A*x^T=$$');
  assert.equal(migrateCalc('$$ab = [=b]$$'), '$$`ab =` b=$$'); // «ab» no es «b»: no se colapsa
  assert.equal(migrateCalc('$$x = [=D1]/[=D2]$$'), '$$`x =` D1=`/`D2=$$');
  assert.equal(migrateCalc('$$a:b$$'), '$$`a:b`$$'); // formula vieja que ahora seria una asignacion: queda como estaba
  assert.equal(migrateCalc('$x+1=$'), '$`x+1=`$');
});

t('migracion del dibujo: una sola vez, y los dibujos nuevos ya nacen en la v2', () => {
  const old = { texts: { a: { text: 'k{=2}' }, b: { text: '[=k]' }, c: { text: 'hola' } } };
  assert.equal(migrateCalcDoc(old), 2);
  assert.deepEqual(Object.values(old.texts).map((x) => x.text), ['$k:2$', '$k=$', 'hola']);
  assert.equal(old.calc, CALC_VERSION);
  assert.equal(migrateCalcDoc(old), 0);
  assert.equal(old.texts.a.text, '$k:2$'); // no se vuelve a migrar (si no, «$k:2$» pasaria a literal)
  const fresh = newDoc();
  fresh.texts.t = { text: '$$x:1$$' };
  assert.equal(migrateCalcDoc(fresh), 0);
});

t('angulos del dibujo: «angles: rad» lee sin/cos en radianes y asin en radianes; sin el campo, en grados', () => {
  assert.equal(page('$sin(30)=$'), '$sin(30)=0.5$');
  assert.equal(page('$sin(π/2)=$', 'rad'), '$sin(π/2)=1$');
  assert.equal(page('$sin(1)=$', 'rad'), '$sin(1)=0.841$');
  assert.equal(page('$asin(1)=$', 'rad'), '$asin(1)=1.571$');
  assert.equal(page('$asin(1)=$'), '$asin(1)=90$');
  assert.equal(page('$$x:2\nf(x):sin(x)./x\nf(x)=$$', 'rad').split('\n').at(-1), 'f(x)=0.455$$');
  assert.equal(page('$sin(90)=$'), '$sin(90)=1$'); // otro dibujo, sin el campo: vuelve a grados
});

console.log(`\n${passed} pruebas de la sintaxis de calculo`);
