// Imagenes: datos aparte (doc.assets) por contenido, guardar solo lo usado, historial sin los datos, reduccion y proporcion.
import assert from 'node:assert/strict';
import { newDoc, addLayer, visibleDoc, layerCount, deleteLayer } from '../src/model.js';
import { boxSelect } from '../src/boxsel.js';
import { addImage, docForSave, withoutAssets, unsnap, fitPixels, keepAspect, imageSrc } from '../src/images.js';

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

console.log(`\n${passed} pruebas de imágenes pasaron`);
