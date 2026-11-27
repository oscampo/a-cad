// Nombres de usuario de puntos, grupos y contornos (names.js): se llaman en las formulas por su nombre como por su id; el nombre se comprueba; la ejecucion manual nombra
// su grupo funcion_N.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newDoc, addPoint, addLine, addText, addCtr, addGrp, addCon } from '../src/model.js';
import { textVars, checkElName, varsOf } from '../src/params.js';
import { elementNames } from '../src/geo.js';
import { isValidElName } from '../src/names.js';
import { runGen, runName } from '../src/gen.js';
import { setAngleMode } from '../src/expr.js';
import { clipOf, pasteClip } from '../src/edit.js';
import { setDecimal } from '../src/locale.js';

setDecimal('.');
let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };

// un rectangulo 40x30 (contorno «Brida» dentro del grupo «EjePrincipal»); puntos con nombre: ini, p_(fin), Origen
function mk() {
  const d = newDoc();
  const p = [addPoint(d, 0, 0), addPoint(d, 40, 0), addPoint(d, 40, 30), addPoint(d, 0, 30)];
  d.pts[p[0]].name = 'ini'; d.pts[p[2]].name = 'p_(fin)'; d.pts[p[1]].name = 'Esquina';
  const l = [addLine(d, p[0], p[1]), addLine(d, p[1], p[2]), addLine(d, p[2], p[3]), addLine(d, p[3], p[0])];
  const { id: k } = addCtr(d, l.map((id) => ({ k: 'ln', id })), 'Brida');
  const tx = addText(d, addPoint(d, 5, 5), 'Vista', {}); // dentro del rectangulo: no cambia la caja
  const g = addGrp(d, [{ k: 'ct', id: k }, { k: 'tx', id: tx }], 'EjePrincipal').id; // un grupo necesita 2 miembros
  return { d, p, l, k, g };
}
function run(d, ...texts) {
  const dd = JSON.parse(JSON.stringify(d)); let y = 0;
  for (const s of texts) addText(dd, addPoint(dd, 0, (y -= 40)), s, {});
  const st = textVars(dd);
  return { err: [...st.errs.values()].join(' | '), v: (n) => st.vals?.[n]?.v ?? st.vals?.[n] };
}

t('un punto con nombre: ini.x, p_(fin).y y el id dan lo mismo', () => {
  const { d, p } = mk();
  const r = run(d, '$$a:ini.x+p_(fin).y=$$', '$$b:Esquina.x=$$', `$$c:${p[2]}.y=$$`);
  assert.equal(r.err, ''); assert.equal(r.v('a'), 30); assert.equal(r.v('b'), 40); assert.equal(r.v('c'), 30);
});

t('un contorno y un grupo por su nombre: Brida.L, EjePrincipal.n/w/h (tambien por id)', () => {
  const { d, k, g } = mk();
  const r = run(d, '$$a:Brida.L=$$', '$$b:EjePrincipal.n=$$', '$$c:EjePrincipal.w=$$', '$$s:EjePrincipal.h=$$', `$$f:${k}.L=$$`, `$$h:${g}.w=$$`);
  assert.equal(r.err, ''); assert.deepEqual(['a', 'b', 'c', 's', 'f', 'h'].map(r.v), [140, 2, 40, 30, 140, 40]);
});

t('como valor de una funcion propia y de typeof: el elemento', () => {
  const { d } = mk();
  const r = run(d, '%f(o):\n  o.x+o.y', '%g(o):\n  typeof(o)', '%h(o):\n  o.L', '$$a:f(Esquina)=$$', '$$b:g(ini)=$$', '$$c:h(Brida)=$$', '$$q:f(p_(fin))=$$');
  assert.equal(r.err, ''); assert.equal(r.v('a'), 40); assert.equal(r.v('b').str ?? r.v('b'), 'point'); assert.equal(r.v('c'), 140); assert.equal(r.v('q'), 70);
});

t('una cota con el nombre de un elemento gana (un dibujo anterior no cambia); una variable de texto da aviso al definirse', () => {
  const { d } = mk();
  const r = run(d, '$$ini:7$$', '$$a:ini+1=$$');
  assert.match(r.err, /«ini» ya es el nombre del punto/); // nada comparte nombre: la variable no se define (antes ganaba en silencio)
  const d2 = JSON.parse(JSON.stringify(d)); addCon(d2, { t: 'DIST', refs: [Object.keys(d2.pts)[0], Object.keys(d2.pts)[1]], v: 40, name: 'Esquina' });
  assert.equal(elementNames(d2).has('Esquina'), false, 'la cota ya tenia ese nombre');
});

t('un nombre desconocido o renombrado: error claro; el id sigue valiendo', () => {
  const { d, p } = mk();
  assert.match(run(d, '$$a:zzz.x=$$').err, /No reconozco/);
  d.pts[p[0]].name = 'origen';
  assert.match(run(d, '$$a:ini.x=$$').err, /No reconozco/);
  assert.equal(run(d, '$$a:origen.x=$$', `$$b:${p[0]}.x=$$`).err, '');
});

t('las cotas y variables ven ini.x (varsOf)', () => {
  const { d } = mk();
  const v = varsOf(d);
  assert.equal(v['ini.x'].v, 0); assert.equal(v['Esquina.x'].v, 40); assert.equal(v['EjePrincipal.n'].v, 2);
});

t('la forma del nombre', () => {
  for (const ok of ['ini', 'Pinion', 'eje2', 'iso_1', 'p_(ini)', 'α', 'a_b']) assert.equal(isValidElName(ok), true, ok);
  for (const no of ['', '1a', 'p12', 'k7', 'a b', 'a-b', 'x.y', 'Vista frontal', 'f(x)']) assert.equal(isValidElName(no), false, no);
});

t('checkElName: reservadas, ids, duplicados, cotas y variables', () => {
  const { d, p } = mk();
  assert.equal(checkElName(d, 'otro'), null);
  assert.match(checkElName(d, 'p12'), /parece un id/); assert.match(checkElName(d, 'and'), /operador lógico/); assert.match(checkElName(d, 'sin'), /función o constante/);
  assert.match(checkElName(d, 'ini'), /Ya hay un punto/); assert.equal(checkElName(d, 'ini', p[0]), null, 'el mismo elemento puede conservar su nombre');
  assert.match(checkElName(d, 'Brida'), /Ya hay un contorno/); assert.match(checkElName(d, 'EjePrincipal'), /Ya hay un grupo/);
  addCon(d, { t: 'DIST', refs: [p[0], p[1]], v: 40, name: 'Ancho' });
  assert.match(checkElName(d, 'Ancho'), /cota/);
  addText(d, addPoint(d, 0, 100), '$$ancho:40$$', {}); addText(d, addPoint(d, 0, 80), '$$v:[1,2,3]$$', {}); addText(d, addPoint(d, 0, 60), '%ort2iso(a):\n  a+1', {});
  assert.match(checkElName(d, 'ancho'), /variable o función/);
  assert.match(checkElName(d, 'v_1'), /se leería como su elemento/); // v es un vector: v_1 seria su elemento
  assert.equal(checkElName(d, 'ort2iso_1'), null); // una funcion no se indexa
});

t('un nombre que no es de la forma de un nombre no llama a nada (queda de etiqueta)', () => {
  const { d, g } = mk();
  d.grps[g].name = 'Vista frontal';
  assert.equal(elementNames(d).has('Vista frontal'), false); assert.equal(elementNames(d).has('EjePrincipal'), false);
  assert.match(run(d, '$$a:EjePrincipal.n=$$').err, /No reconozco/);
});

const ORT2ISO = readFileSync(new URL('./fixtures/iso-contorno.txt', import.meta.url), 'utf8').replace('%iso(', '%ort2iso(').replace(/\biso\(vista/g, 'ort2iso(vista');

t('Ejecucion manual nombra su grupo funcion_N, sin repetirse, y se puede llamar por ese nombre', () => {
  const d = newDoc(); d.angles = 'rad'; setAngleMode(d);
  const A = addPoint(d, 0, 0), B = addPoint(d, 40, 0), C = addPoint(d, 40, 30), D = addPoint(d, 0, 30);
  const l = [addLine(d, A, B), addLine(d, B, C), addLine(d, C, D), addLine(d, D, A)];
  const g = addGrp(d, l.map((id) => ({ k: 'ln', id })), 'Vista').id;
  addText(d, addPoint(d, 0, -50), ORT2ISO, {});
  const tf = addText(d, addPoint(d, 0, -80), `$$F:ort2iso("L"; ${g}; 0; 0)$$`, {}); d.texts[tf].manual = true;
  const r1 = runGen(d, tf), r2 = runGen(d, tf);
  assert.equal(r1.ok, true, r1.errs.join()); assert.equal(d.grps[r1.group].name, 'ort2iso_1'); assert.equal(d.grps[r2.group].name, 'ort2iso_2');
  addText(d, addPoint(d, 0, -120), '$$n:ort2iso_1.n=$$', {}); addText(d, addPoint(d, 0, -140), '$$w:ort2iso_2.w=$$', {});
  const st = textVars(d);
  assert.deepEqual([...st.errs.values()], []); assert.equal(st.vals.n.v, 4);
  assert.ok(st.vals.w.v > 30 && st.vals.w.v < 60, 'ancho de la figura isometrica: ' + st.vals.w.v);
});

t('runName: sin funcion, script_N; el numero salta los nombres ocupados', () => {
  const d = newDoc(), g = addGrp(d, [{ k: 'pt', id: addPoint(d, 0, 0) }, { k: 'pt', id: addPoint(d, 1, 1) }], 'script_1').id;
  void g;
  assert.equal(runName(d, '$$a:point("A"; 0; 0)$$'), 'script_2');
});

t('copiar y pegar: la copia de un punto no hereda el nombre (y un grupo copiado tampoco, ver grupos.test)', () => {
  const { d, p, l, g } = mk();
  const all = [...p.map((id) => ({ k: 'pt', id })), ...l.map((id) => ({ k: 'ln', id }))];
  const r = pasteClip(d, clipOf(d, all), { x: 200, y: 200 });
  assert.equal(r.ok, true);
  const nuevos = Object.entries(d.pts).filter(([, q]) => q.x > 100); // las copias (pegadas lejos)
  assert.equal(nuevos.length, 4); assert.ok(nuevos.every(([, q]) => q.name === undefined), 'la copia no repite el nombre');
  assert.equal(d.pts[p[0]].name, 'ini'); assert.equal(elementNames(d).get('ini'), p[0]);
  void g;
});

t('dos elementos con el mismo nombre (solo un archivo editado a mano puede tenerlos): ninguno se llama por el', () => {
  const { d, g } = mk();
  const tx2 = addText(d, addPoint(d, 6, 6), 'otra', {}), tx3 = addText(d, addPoint(d, 7, 7), 'otra2', {});
  const g2 = addGrp(d, [{ k: 'tx', id: tx2 }, { k: 'tx', id: tx3 }], 'EjePrincipal').id;
  assert.ok(g2 && g2 !== g);
  assert.equal(elementNames(d).has('EjePrincipal'), false);
  assert.match(run(d, '$$a:EjePrincipal.n=$$').err, /No reconozco/);
  assert.equal(run(d, '$$a:' + g + '.n=$$').err, '', 'por id sigue');
});

t('definir una variable o funcion con el nombre de un elemento da aviso (nada comparte nombre); lo local de un programa no cuenta', () => {
  const { d, p } = mk();
  assert.match(run(d, '$$ini:7$$').err, /«ini» ya es el nombre del punto/);
  assert.match(run(d, '$$Brida:5$$').err, /«Brida» ya es el nombre del contorno/);
  assert.match(run(d, '$$EjePrincipal:1$$').err, /«EjePrincipal» ya es el nombre del grupo/);
  assert.match(run(d, '%ini(x):\n  x+1').err, /ya es el nombre del punto/);
  const ok = run(d, '%f(a):\n  ini:3\n  ini+a', '$$r:f(1)=$$');
  assert.equal(ok.err, '', 'una variable local de un programa es local: no choca'); assert.equal(ok.v('r'), 4);
  assert.equal(run(d, '$$otra:7$$', '$$r:otra+1=$$').err, '');
  d.pts[p[0]].name = 'origen'; // al renombrar el punto, el nombre queda libre
  assert.equal(run(d, '$$ini:7$$').err, '');
});

console.log(passed + ' pruebas de nombres de elementos');
