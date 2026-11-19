// Selector de color: muestras rapidas y un boton rectangular que abre una ventana con una cuadricula escalonada como la
// pestaña «Cuadrícula» de iOS (una fila de grises y nueve de matices, de oscuro a claro) y «Personalizado», con matiz,
// saturación y luminosidad, R G B y el código hexadecimal.
// Lo usan el panel de estilo, las propiedades de un objeto y el color de un texto.
import { PALETTE } from './model.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const hexToRgb = (h) => {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(String(h || '').trim());
  if (!m) return null;
  const s = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};
export const rgbToHex = (r, g, b) => '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
// h 0-360, s y l 0-100
export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l * 100];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s * 100, l * 100];
}
export function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
}
export const hslHex = (h, s, l) => rgbToHex(...hslToRgb(h, s, l));

// 10 filas x 12 columnas: grises de blanco a negro y luego cada matiz de oscuro a claro.
const HUES = [196, 214, 232, 262, 290, 330, 4, 18, 32, 44, 54, 80];
const LIGHT = [14, 22, 30, 40, 50, 60, 70, 80, 88];
export const GRID = [
  Array.from({ length: 12 }, (_, i) => { const v = Math.round(255 * (1 - i / 11)); return rgbToHex(v, v, v); }),
  ...LIGHT.map((l) => HUES.map((h) => hslHex(h, l < 25 || l > 82 ? 85 : 95, l))),
];

const el = (tag, cls, props = {}) => Object.assign(document.createElement(tag), cls ? { className: cls } : {}, props);

// Muestras rapidas: las de siempre (Auto y nueve colores) y, al final, un boton rectangular que abre la cuadricula.
export const QUICK = PALETTE.filter(([v]) => v !== 'auto');
const RAINBOW = 'conic-gradient(from 90deg,#f33,#fd3,#3d5,#3cf,#36f,#c3f,#f33)';

// value(): color actual ('auto', '#rrggbb' o ''); pick(v): aplica un color. auto: muestra el boton Auto.
// extra: botones que van despues de las muestras (p. ej. «Sin fondo»). Devuelve el elemento, con .refresh() para volver a marcar.
export function colorPicker({ value, pick, auto = true, extra = [], autoTitle = 'Auto' }) {
  const root = el('div', 'cp');
  const quick = el('div', 'cp-quick');
  const autoB = el('button', 'cp-sw cp-auto', { type: 'button', title: autoTitle });
  autoB.dataset.val = 'auto';
  autoB.onclick = () => { pick('auto'); refresh(); };
  if (auto) quick.append(autoB);
  for (const [hex, name] of QUICK) {
    const b = el('button', 'cp-sw', { type: 'button', title: name });
    b.dataset.val = hex;
    b.style.background = hex;
    b.onclick = () => { pick(hex); refresh(); };
    quick.append(b);
  }
  const moreB = el('button', 'cp-sw cp-more', { type: 'button', title: 'Más colores y personalizado' });
  moreB.setAttribute('aria-haspopup', 'dialog');
  quick.append(moreB, ...extra);

  // Ventana emergente con la cuadricula y «Personalizado»
  const pop = el('dialog', 'cp-pop');
  pop.setAttribute('aria-label', 'Colores');
  const head = el('div', 'cp-head');
  const customB = el('button', 'cp-custom-b', { type: 'button', textContent: 'Personalizado', title: 'Elegir un color con matiz, saturación, luminosidad, RGB o código' });
  customB.setAttribute('aria-expanded', 'false');
  const closeB = el('button', 'cp-close', { type: 'button', textContent: 'Listo' });
  closeB.onclick = () => pop.close();
  head.append(el('strong', '', { textContent: 'Colores' }), customB, closeB);
  // tocar fuera de la ventana (en el fondo) la cierra
  pop.addEventListener('click', (e) => { if (e.target === pop) pop.close(); });
  moreB.onclick = () => {
    refresh();
    pop.showModal();
    // junto al boton, sin salirse de la pantalla
    const r = moreB.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
    const vw = window.innerWidth, vh = window.innerHeight;
    pop.style.left = clamp(r.left + r.width / 2 - w / 2, 8, Math.max(8, vw - w - 8)) + 'px';
    pop.style.top = (r.bottom + 8 + h <= vh - 8 ? r.bottom + 8 : clamp(r.top - 8 - h, 8, Math.max(8, vh - h - 8))) + 'px';
  };
  const grid = el('div', 'cp-grid');
  grid.setAttribute('role', 'listbox');
  grid.setAttribute('aria-label', 'Colores');
  GRID.forEach((row, ri) => row.forEach((hex, ci) => {
    const b = el('button', 'cp-cell', { type: 'button', title: hex });
    b.dataset.val = hex;
    b.style.background = hex;
    if (ri === 0 && ci === 0) b.classList.add('tl');
    if (ri === 0 && ci === 11) b.classList.add('tr');
    if (ri === GRID.length - 1 && ci === 0) b.classList.add('bl');
    if (ri === GRID.length - 1 && ci === 11) b.classList.add('br');
    b.onclick = () => { pick(hex); refresh(); pop.close(); };
    grid.appendChild(b);
  }));

  // Personalizado
  const cus = el('div', 'cp-custom');
  cus.hidden = true;
  const prev = el('div', 'cp-prev');
  const hex = el('input', 'cp-hex', { type: 'text', maxLength: 7, spellcheck: false, title: 'Código hexadecimal (#rrggbb)' });
  hex.setAttribute('aria-label', 'Código hexadecimal');
  const slider = (name, max, title) => {
    const r = el('input', 'cp-range', { type: 'range', min: 0, max, step: 1, title });
    r.setAttribute('aria-label', title);
    const n = el('input', 'cp-num', { type: 'number', min: 0, max, step: 1, title });
    n.setAttribute('aria-label', title);
    const row = el('div', 'cp-row');
    row.append(el('span', '', { textContent: name }), r, n);
    return { r, n, row };
  };
  const H = slider('M', 360, 'Matiz (0-360)'), S = slider('S', 100, 'Saturación (%)'), L = slider('L', 100, 'Luminosidad (%)');
  const rgbIn = ['R', 'G', 'B'].map((c) => { const n = el('input', 'cp-num', { type: 'number', min: 0, max: 255, step: 1, title: c + ' (0-255)' }); n.setAttribute('aria-label', c); return n; });
  const rgbRow = el('div', 'cp-row cp-rgb');
  ['R', 'G', 'B'].forEach((c, i) => rgbRow.append(el('span', '', { textContent: c }), rgbIn[i]));
  const hexRow = el('div', 'cp-row');
  hexRow.append(prev, hex);
  cus.append(hexRow, H.row, S.row, L.row, rgbRow);

  let hsl = [214, 95, 50];
  const curHex = () => hslHex(...hsl);
  // pinta los controles con hsl; skip: el control que se esta moviendo (no se le reescribe el valor)
  const paint = (skip) => {
    const [h, s, l] = hsl, x = curHex(), rgb = hexToRgb(x);
    prev.style.background = x;
    if (skip !== hex) hex.value = x;
    [[H, h], [S, s], [L, l]].forEach(([c, v]) => { if (skip !== c.r) c.r.value = Math.round(v); if (skip !== c.n) c.n.value = Math.round(v); });
    rgbIn.forEach((n, i) => { if (skip !== n) n.value = rgb[i]; });
    H.r.style.background = 'linear-gradient(to right,' + [0, 60, 120, 180, 240, 300, 360].map((a) => hslHex(a, s, l)).join(',') + ')';
    S.r.style.background = `linear-gradient(to right,${hslHex(h, 0, l)},${hslHex(h, 100, l)})`;
    L.r.style.background = `linear-gradient(to right,#000,${hslHex(h, s, 50)},#fff)`;
  };
  const commit = () => { pick(curHex()); refresh(); };
  [[H, 0], [S, 1], [L, 2]].forEach(([c, i]) => {
    for (const inp of [c.r, c.n]) {
      inp.oninput = () => { const v = Number(inp.value); if (!Number.isFinite(v)) return; hsl[i] = clamp(v, 0, Number(inp.max)); paint(inp); };
      inp.onchange = commit;
    }
  });
  rgbIn.forEach((n) => {
    n.oninput = () => { const v = rgbIn.map((k) => clamp(Number(k.value) || 0, 0, 255)); hsl = rgbToHsl(...v); paint(n); };
    n.onchange = commit;
  });
  hex.oninput = () => { const rgb = hexToRgb(hex.value); if (rgb) { hsl = rgbToHsl(...rgb); paint(hex); } };
  hex.onchange = () => { if (hexToRgb(hex.value)) commit(); else paint(); };
  customB.onclick = () => {
    cus.hidden = !cus.hidden;
    customB.setAttribute('aria-expanded', String(!cus.hidden));
    customB.classList.toggle('on', !cus.hidden);
  };

  function refresh() {
    const v = String(value() || '').toLowerCase();
    quick.querySelectorAll('.cp-sw[data-val]').forEach((b) => b.classList.toggle('on', b.dataset.val === v));
    grid.querySelectorAll('.cp-cell').forEach((b) => b.classList.toggle('on', b.dataset.val === v));
    const rgb = hexToRgb(v);
    // el boton rectangular muestra el color elegido cuando no es una de las muestras; si no, el arcoiris
    const other = !!rgb && !QUICK.some(([q]) => q === v);
    moreB.style.background = other ? v : RAINBOW;
    moreB.classList.toggle('on', other);
    if (rgb) { hsl = rgbToHsl(...rgb); }
    paint();
  }
  pop.append(head, grid, cus);
  root.append(quick, pop);
  root.refresh = refresh;
  refresh();
  return root;
}
