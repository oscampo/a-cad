// Imagenes: datos aparte (doc.assets) por contenido, guardar solo lo usado, historial sin los datos, reduccion y proporcion.
import assert from 'node:assert/strict';
import * as MODEL from '../src/model.js';
import { newDoc, addLayer, visibleDoc, layerCount, deleteLayer } from '../src/model.js';
import { boxSelect } from '../src/boxsel.js';
import { addImage, docForSave, withoutAssets, unsnap, fitPixels, keepAspect, imageSrc, imgRect, syncImages, ensureImagePoints, anchorPoint } from '../src/images.js';
import { varsOf } from '../src/params.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const SRC = 'data:image/png;base64,' + 'A'.repeat(5000), SRC2 = 'data:image/jpeg;base64,' + 'B'.repeat(3000);

t('dos imágenes iguales comparten los datos; guardar lleva solo los usados', () => {
  const d = newDoc();
  const a = addImage(d, SRC, 0, 0, 10, 5), b = addImage(d, SRC, 20, 0, 10, 5), c = addImage(d, SRC2, 0, 20, 4, 3);
  assert.equal(Object.keys(d.assets).length, 2); assert.equal(d.images[a].a, d.images[b].a); assert.equal(imageSrc(d, d.images[c]), SRC2);
  delete d.images[c];
  const s = docForSave(d); assert.equal(Object.keys(s.assets).length, 1); assert.equal(Object.keys(d.assets).length, 2); // en memoria siguen (para deshacer)
  delete d.images[a]; delete d.images[b]; assert.equal(docForSave(d).assets, undefined);
});

t('el historial no copia los datos y unsnap los repone', () => {
  const d = newDoc(); addImage(d, SRC, 0, 0, 10, 5);
  const snap = JSON.stringify(withoutAssets(d)); assert.ok(snap.length < 600 && !snap.includes('AAAA'));
  const back = unsnap(snap, d.assets); assert.equal(Object.values(back.images)[0].a in back.assets, true);
  assert.equal(unsnap(JSON.stringify(newDoc()), undefined).assets, undefined);
});

t('reducción a 1600 px de lado mayor y redimensión con la proporción', () => {
  assert.deepEqual(fitPixels(4000, 3000), { w: 1600, h: 1200 }); assert.deepEqual(fitPixels(800, 600), { w: 800, h: 600 });
  const o = { x: 0, y: 0, w: 20, h: 10 };
  assert.deepEqual(keepAspect(o, { r: true }, { x: 0, y: 0, w: 30, h: 10 }), { x: 0, y: 0, w: 30, h: 15 });
  assert.deepEqual(keepAspect(o, { l: true, b: true }, { x: -10, y: -4, w: 30, h: 14 }), { x: -10, y: -5, w: 30, h: 15 }); // la esquina opuesta queda fija
  assert.deepEqual(keepAspect(o, { t: true }, { x: 0, y: 0, w: 20, h: 20 }), { x: 0, y: 0, w: 40, h: 20 });
});

t('capa y transparencia: una imagen nueva toma la capa actual; apagada no se exporta ni entra en un cuadro de selección', () => {
  const d = newDoc(), ly = addLayer(d, 'Fotos'); // addLayer la deja como capa actual
  const id = addImage(d, SRC, 0, 0, 10, 5);
  assert.equal(d.images[id].layer, ly); assert.equal(layerCount(d, ly), 1);
  d.images[id].alpha = 0.4;
  const r = { x0: -1, y0: -1, x1: 20, y1: 20 };
  assert.deepEqual(boxSelect(d, r, false).filter((x) => x.k === 'gr').map((x) => x.id), [id]);
  d.layers[ly].on = false;
  assert.deepEqual(Object.keys(visibleDoc(d).images), []); assert.deepEqual(boxSelect(d, r, false).filter((x) => x.k === 'gr'), []);
  d.layers[ly].on = true; deleteLayer(d, ly); assert.equal(d.images[id].layer, undefined); // al borrar la capa pasa a «ninguna»
});

t('cuadro de selección: un texto por su caja (ventana: entero dentro; cruce: basta tocarlo); una imagen bloqueada no entra', () => {
  const d = newDoc(); const { addText, addPoint } = MODEL;
  const tid = addText(d, addPoint(d, 0, 0), 'abc', { h: 4 });
  const box = () => [{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 4 }, { x: 0, y: 4 }]; // la caja que da la medida del dibujo
  const tx = (r, cross) => boxSelect(d, r, { cross, textBox: box }).filter((x) => x.k === 'tx').map((x) => x.id);
  assert.deepEqual(tx({ x0: 10, y0: -1, x1: 40, y1: 5 }, false), []); // ventana sobre parte del texto: no
  assert.deepEqual(tx({ x0: -1, y0: -1, x1: 40, y1: 5 }, false), [tid]); // ventana que lo encierra: si
  assert.deepEqual(tx({ x0: 10, y0: -1, x1: 40, y1: 5 }, true), [tid]); // cruce que lo toca (sin su punto de insercion): si
  assert.deepEqual(tx({ x0: 10, y0: 1, x1: 12, y1: 2 }, true), [tid]); // cruce dentro del texto: si
  const im = addImage(d, SRC, 50, 0, 10, 5); d.images[im].locked = true;
  assert.deepEqual(boxSelect(d, { x0: 40, y0: -5, x1: 70, y1: 10 }, { cross: true }).filter((x) => x.k === 'gr'), []);
});

t('punto de inserción: un punto real con anclaje (9 posiciones); la imagen lo sigue; dibujos anteriores reciben el suyo; se lee en fórmulas', () => {
  const d = newDoc(); const id = addImage(d, SRC, 10, 20, 40, 20), im = d.images[id];
  assert.ok(d.pts[im.pt] && d.pts[im.pt].txOnly); assert.equal(im.anchor, 'bl');
  assert.deepEqual(imgRect(d, im), { x: 10, y: 20, w: 40, h: 20 });
  im.anchor = 'mc'; assert.deepEqual(imgRect(d, im), { x: -10, y: 10, w: 40, h: 20 }); // el punto es el centro
  im.anchor = 'tr'; assert.deepEqual(imgRect(d, im), { x: -30, y: 0, w: 40, h: 20 });
  assert.deepEqual(anchorPoint({ x: 0, y: 0, w: 40, h: 20 }, 'mc'), { x: 20, y: 10 });
  im.anchor = 'bl'; d.pts[im.pt].x = 100; syncImages(d); assert.equal(im.x, 100); // la imagen sigue a su punto (p. ej. movido por el mecanismo)
  assert.equal(varsOf(d)[im.pt + '.x'].v, 100); // se lee en las formulas como p12.x
  const old = newDoc(); old.images = { im1: { x: 5, y: 6, w: 10, h: 5, a: 'z' } };
  assert.equal(ensureImagePoints(old), 1); assert.deepEqual(old.pts[old.images.im1.pt], { x: 5, y: 6, fixed: false, auto: false, txOnly: true });
  assert.equal(ensureImagePoints(old), 0); // una sola vez
});

console.log(`\n${passed} pruebas de imágenes pasaron`);
