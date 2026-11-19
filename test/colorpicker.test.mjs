import assert from 'node:assert/strict';
import { hexToRgb, rgbToHex, rgbToHsl, hslToRgb, GRID } from '../src/colorpicker.js';

const tests = [];
const t = (name, fn) => tests.push([name, fn]);

t('hex <-> rgb', () => {
  assert.deepEqual(hexToRgb('#2563eb'), [37, 99, 235]);
  assert.deepEqual(hexToRgb('#fff'), [255, 255, 255]);
  assert.equal(hexToRgb('auto'), null);
  assert.equal(rgbToHex(37, 99, 235), '#2563eb');
  assert.equal(rgbToHex(300, -4, 0.4), '#ff0000');
});

t('rgb <-> hsl ida y vuelta', () => {
  for (const hex of ['#2563eb', '#dc2626', '#16a34a', '#808080', '#000000', '#ffffff', '#ca8a04']) {
    assert.equal(rgbToHex(...hslToRgb(...rgbToHsl(...hexToRgb(hex)))), hex, hex);
  }
  assert.deepEqual(hslToRgb(0, 100, 50), [255, 0, 0]);
  assert.deepEqual(hslToRgb(120, 100, 50), [0, 255, 0]);
});

t('cuadricula: 10 filas de 12, grises arriba, sin repetidos', () => {
  assert.equal(GRID.length, 10);
  GRID.forEach((r) => assert.equal(r.length, 12));
  assert.equal(GRID[0][0], '#ffffff');
  assert.equal(GRID[0][11], '#000000');
  const all = GRID.flat();
  assert.equal(new Set(all).size, all.length);
  // cada columna de matiz va de oscuro a claro
  for (let c = 0; c < 12; c++) for (let r = 2; r < 10; r++) assert.ok(rgbToHsl(...hexToRgb(GRID[r][c]))[2] > rgbToHsl(...hexToRgb(GRID[r - 1][c]))[2]);
});

let fail = 0;
for (const [name, fn] of tests) { try { fn(); console.log('ok ', name); } catch (e) { fail++; console.log('not ok', name, '\n', e.message); } }
if (fail) process.exit(1);
