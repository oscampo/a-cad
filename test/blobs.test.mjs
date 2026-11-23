// Carpeta de datos binarios (blobs.js): guardar incrusta solo lo que el dibujo lee por nombre; abrir restaura lo que falta sin pisar lo que hay.
import assert from 'node:assert/strict';
import { newDoc } from '../src/model.js';
import { docForSave } from '../src/images.js';
import { blobPut, blobGet, blobHas, blobDel, blobClear, blobLoad, blobEntries, setBlobSink, referencedBlobs, embedBlobs, takeEmbedded, restoreEmbedded } from '../src/blobs.js';

let passed = 0;
const t = (name, fn) => { blobClear(); setBlobSink(null); fn(); passed++; console.log('ok  ' + name); };
const url = (s) => 'data:audio/wav;base64,' + s;
const withText = (d, id, text, defs) => { (d.texts ||= {})[id] = { text, ...(defs ? { lib: { defs: defs.map((expr) => ({ expr })) } } : {}) }; return d; };

t('poner, leer, borrar y listar; cada dato recibe un hash de su contenido', () => {
  const log = []; setBlobSink({ put: (n, e) => log.push(['put', n, e.kind]), del: (n) => log.push(['del', n]) });
  const e = blobPut('warp', { kind: 'audio', url: url('AAAA'), ms: 900 });
  assert.ok(e.a.startsWith('s') && e.at > 0);
  assert.equal(blobPut('copia', { kind: 'audio', url: url('AAAA') }).a, e.a); // mismo contenido, mismo hash
  assert.ok(blobHas('warp') && blobHas('warp', 'audio') && !blobHas('warp', 'imagen') && !blobHas('nada'));
  assert.deepEqual(blobEntries().map(([n]) => n), ['copia', 'warp']);
  blobDel('copia'); blobDel('copia'); // borrar dos veces avisa una sola
  assert.deepEqual(log, [['put', 'warp', 'audio'], ['put', 'copia', 'audio'], ['del', 'copia']]);
});

t('lo ya guardado en el dispositivo (IndexedDB) no pisa lo que ya llego a memoria', () => {
  blobPut('warp', { kind: 'audio', url: url('NUEVO') });
  blobLoad([['warp', { kind: 'audio', url: url('VIEJO'), a: 'sx' }], ['otro', { kind: 'audio', url: url('B'), a: 'sy' }]]);
  assert.equal(blobGet('warp').url, url('NUEVO')); assert.equal(blobGet('otro').a, 'sy');
});

t('lo que el dibujo lee: nombres entre comillas en textos y en funciones de bibliotecas; una variable no cuenta', () => {
  blobPut('warp', { kind: 'audio', url: url('A') }); blobPut('torpedo', { kind: 'audio', url: url('B') }); blobPut('alarma', { kind: 'audio', url: url('C') });
  const d = withText(withText(newDoc(), 't1', '$play("warp")$'), 't2', 'x', ["if(1; play('torpedo'); 0)"]);
  withText(d, 't3', '$n:"alar"+"ma"; play(n)$');
  assert.deepEqual(referencedBlobs(d).sort(), ['torpedo', 'warp']);
});

t('guardar: solo viajan los leidos; en memoria el dibujo no cambia', () => {
  blobPut('warp', { kind: 'audio', url: url('A'), ms: 1200 }); blobPut('sin uso', { kind: 'audio', url: url('B') });
  const d = withText(newDoc(), 't1', '$play("warp")$');
  const s = docForSave(embedBlobs(d));
  assert.deepEqual(Object.keys(s.sounds), ['warp']); assert.equal(s.sounds.warp.ms, 1200); assert.equal(Object.keys(s.assets).length, 1);
  assert.equal(d.sounds, undefined); assert.equal(d.assets, undefined);
  assert.equal(embedBlobs(withText(newDoc(), 't1', 'nada')).sounds, undefined); // sin referencias: el mismo dibujo
});

t('abrir: lo incrustado sale del dibujo y pasa a la carpeta solo si falta; uno distinto con el mismo nombre no se pisa', () => {
  blobPut('warp', { kind: 'audio', url: url('A'), ms: 1200 }); blobPut('torpedo', { kind: 'audio', url: url('B') });
  const d = withText(newDoc(), 't1', '$play("warp") + play("torpedo") + play("nuevo")$');
  const saved = JSON.parse(JSON.stringify(embedBlobs(d)));
  addToSaved(saved, 'nuevo', url('N'), 300);
  blobPut('torpedo', { kind: 'audio', url: url('OTRO') }); // en este dispositivo hay otro torpedo
  const emb = takeEmbedded(saved);
  assert.equal(saved.sounds, undefined); assert.equal(saved.assets, undefined); // la copia en memoria no lleva bytes
  const r = restoreEmbedded(emb);
  assert.deepEqual(r.added, ['nuevo']); assert.deepEqual(r.differs, ['torpedo']);
  assert.equal(blobGet('torpedo').url, url('OTRO')); assert.equal(blobGet('nuevo').url, url('N')); assert.equal(blobGet('nuevo').ms, 300);
  assert.equal(blobGet('warp').url, url('A')); // igual: ni agregado ni distinto
});

t('un dibujo de antes (sonidos incrustados sin carpeta) se abre y deja sus sonidos en la carpeta', () => {
  const d = newDoc(); d.assets = { sh1: url('H1') }; d.sounds = { intro: { a: 'sh1', ms: 5000 }, roto: { a: 'falta' } };
  const emb = takeEmbedded(d);
  assert.deepEqual(emb.map((e) => e.name), ['intro']); // un sonido sin sus bytes se ignora
  assert.deepEqual(restoreEmbedded(emb).added, ['intro']);
  assert.ok(blobHas('intro', 'audio')); assert.equal(d.assets, undefined);
});

function addToSaved(saved, name, u, ms) { (saved.assets ||= {})['sN'] = u; (saved.sounds ||= {})[name] = { a: 'sN', ms }; }

console.log(`\n${passed} pruebas de datos binarios pasaron`);
