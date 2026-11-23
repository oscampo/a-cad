// Sonidos del dibujo: nombres, guardado con el dibujo, reduccion del audio (un canal, 16 kHz, 8 bits) y play("nombre") (solo suena al confirmar un paso).
import assert from 'node:assert/strict';
import { newDoc } from '../src/model.js';
import { docForSave, withoutAssets } from '../src/images.js';
import { addSound, soundSrc, hasSound, removeSound, soundList, soundName, suggestName, soundAssetKeys, toMono, resample, wavBytes8, parseWav, dataUrlBytes, reduceSound, SND_RATE } from '../src/sounds.js';
import { setSoundsActive, setSoundCatalog, takeSounds } from '../src/datastore.js';
import { evalExpr } from '../src/expr.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const tone = (hz, secs, rate, ch = 1) => Array.from({ length: ch }, () => Float32Array.from({ length: Math.round(secs * rate) }, (_, i) => 0.6 * Math.sin((2 * Math.PI * hz * i) / rate)));

t('nombres: letras, numeros, _, - y espacios; un nombre propuesto sale del nombre del archivo', () => {
  assert.equal(soundName('  warp 6_a-1 '), 'warp 6_a-1');
  assert.equal(soundName('explosión'), 'explosión');
  for (const bad of ['', 'a/b', 'x'.repeat(41), 'play("x")']) assert.throws(() => soundName(bad), /no sirve como nombre/);
  assert.equal(suggestName('tng_warp6_clean.wav'), 'tng_warp6_clean');
  assert.equal(suggestName('mi sonido (2).mp3'), 'mi sonido _2_');
  assert.equal(suggestName('.wav'), 'sonido');
});

t('guardar: los sonidos viajan con el dibujo (con sus bytes) y los datos sin uso no', () => {
  const d = newDoc();
  addSound(d, 'warp', 'data:audio/wav;base64,AAAA', { ms: 1500 });
  addSound(d, 'copia', 'data:audio/wav;base64,AAAA'); // los mismos bytes: un solo dato
  d.assets.huerfano = 'data:audio/wav;base64,BBBB';
  assert.equal(Object.keys(d.assets).length, 2);
  assert.equal(soundAssetKeys(d).size, 1);
  assert.ok(hasSound(d, 'warp') && !hasSound(d, 'otro'));
  assert.equal(soundSrc(d, 'warp'), 'data:audio/wav;base64,AAAA');
  const s = docForSave(d);
  assert.equal(Object.keys(s.assets).length, 1); assert.deepEqual(Object.keys(s.sounds).sort(), ['copia', 'warp']);
  assert.equal(withoutAssets(d).assets, undefined); assert.ok(withoutAssets(d).sounds); // el historial de deshacer lleva los nombres, no los bytes
  assert.deepEqual(soundList(d).map((x) => [x.name, x.ms]), [['copia', 0], ['warp', 1500]]);
  removeSound(d, 'warp'); removeSound(d, 'copia');
  assert.equal(d.sounds, undefined); assert.equal(docForSave(d).assets, undefined);
});

t('reducir: un canal, 16 kHz y 8 bits; la duracion y el tono se conservan', () => {
  const { url, ms, bytes } = reduceSound(tone(440, 1, 44100, 2), 44100);
  assert.equal(ms, 1000); assert.equal(bytes, 44 + 16000);
  const w = parseWav(dataUrlBytes(url));
  assert.equal(w.rate, SND_RATE); assert.equal(w.chs.length, 1); assert.equal(w.chs[0].length, 16000);
  // 440 Hz a 16 kHz: cruces por cero (hacia arriba) ~ 440 por segundo
  let up = 0; for (let i = 1; i < 16000; i++) if (w.chs[0][i - 1] < 0 && w.chs[0][i] >= 0) up++;
  assert.ok(Math.abs(up - 440) <= 2, 'cruces: ' + up);
  const peak = Math.max(...w.chs[0]); assert.ok(peak > 0.55 && peak < 0.65, 'amplitud ' + peak);
  assert.equal(reduceSound(tone(100, 0.5, 8000), 8000).bytes, 44 + 8000); // subir la frecuencia tambien
  assert.throws(() => reduceSound(tone(100, 61, 1000), 1000), /se admiten hasta 60 s/);
  assert.equal(reduceSound(tone(100, 1, 16000), 16000).url, reduceSound(tone(100, 1, 16000), 16000).url); // determinista
});

t('toMono, resample y el WAV de 8 bits', () => {
  const m = toMono([Float32Array.of(1, 0, -1), Float32Array.of(0, 1, -1)]);
  assert.deepEqual([...m], [0.5, 0.5, -1]);
  assert.equal(resample(Float32Array.of(1, 2, 3, 4), 4, 2).length, 2);
  assert.deepEqual([...resample(Float32Array.of(1, 3, 5, 7), 4, 2)], [2, 6]); // promedio de lo que cubre
  const w = wavBytes8(Float32Array.of(-2, -1, 0, 1, 2), 8000); // se recorta a [-1, 1]
  assert.equal(w.length, 49); assert.deepEqual([w[44], w[46], w[48]], [1, 128, 255]);
  assert.throws(() => parseWav(Uint8Array.of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12)), /no es un WAV/);
});

t('play("nombre"): 1 si existe, 0 si no; solo anota el sonido mientras se confirma un paso', () => {
  setSoundCatalog((n) => (n === 'warp' || n === 'torpedo' ? 1 : 0));
  setSoundsActive(false);
  assert.equal(evalExpr('play("warp")').value, 1);
  assert.deepEqual(takeSounds(), []); // redibujar o arrastrar: no suena
  setSoundsActive(true);
  assert.equal(evalExpr('play("warp")').value, 1);
  assert.equal(evalExpr('play("nada")').value, 0); // sin error: un sonido que falta no rompe el juego
  evalExpr('play("torpedo") + play("warp")');
  assert.deepEqual(takeSounds(), ['warp', 'torpedo']); // una vez cada uno, en el orden en que se pidieron
  assert.deepEqual(takeSounds(), []);
  assert.equal(evalExpr('if(1; play("warp"); 0)').value, 1);
  setSoundsActive(false);
  assert.deepEqual(takeSounds(), []);
  assert.throws(() => evalExpr('play(3)'), /entre comillas/);
  setSoundCatalog(() => 1);
});

console.log(`\n${passed} pruebas de sonidos pasaron`);
