// Ventana de una grafica (zoom y paneo de sus ejes). Sin DOM.
// La ventana de un eje es [lo, hi] (en escala logaritmica se mueve y se acerca en log10). Se guarda en los limites del eje (g.axes[k].min / max).
// El deslizador de zoom va de -1 (alejado) a +1 (acercado) respecto del ancho «de partida» (home): ZOOM_R veces menor o mayor.
export const ZOOM_R = 100;
const L = Math.log10;

const toW = (lo, hi, log) => (log ? [L(lo), L(hi)] : [lo, hi]);
const fromW = (a, b, log) => (log ? [10 ** a, 10 ** b] : [a, b]);

// Mueve la ventana una fraccion de su ancho (frac > 0: hacia valores mayores).
export function panWin(lo, hi, frac, log = false) {
  const [a, b] = toW(lo, hi, log), d = (b - a) * frac;
  return fromW(a + d, b + d, log);
}
// Acerca (factor > 1) o aleja (factor < 1) la ventana alrededor de un punto (0 = lo, 1 = hi; 0.5 = el centro).
export function zoomWin(lo, hi, factor, log = false, at = 0.5) {
  const [a, b] = toW(lo, hi, log), w = (b - a) / factor, c = a + (b - a) * at;
  return fromW(c - w * at, c + w * (1 - at), log);
}
// Zoom «elastico»: el deslizador, mientras se mantiene desplazado s (-1..1) del centro, acerca (s > 0) o aleja la ventana de forma continua;
// al soltarlo vuelve al centro y se puede seguir. A deflexion completa la ventana cambia ZOOM_RATE e-veces por segundo (~12x/s).
export const ZOOM_RATE = 2.5;
export const zoomStep = (lo, hi, s, dt, log = false) => zoomWin(lo, hi, Math.exp(s * ZOOM_RATE * dt), log);
// Paneo «elastico»: igual, el deslizador desplazado s (-1..1) mueve la ventana de forma continua (s > 0: hacia valores mayores).
// La velocidad crece con el cuadrado del desplazamiento (cerca del centro va lento, para afinar): a deflexion completa, PAN_RATE anchos por segundo.
export const PAN_RATE = 1.5;
export const panStep = (lo, hi, s, dt, log = false) => panWin(lo, hi, s * Math.abs(s) * PAN_RATE * dt, log);

// Posicion del deslizador de zoom (-1..1) de una ventana respecto del ancho de partida.
export function zoomPos(lo, hi, home, log = false) {
  const [a, b] = toW(lo, hi, log), [h0, h1] = toW(home[0], home[1], log);
  const s = Math.log((h1 - h0) / (b - a)) / Math.log(ZOOM_R);
  return Number.isFinite(s) ? Math.max(-1, Math.min(1, s)) : 0;
}
// Ventana con el centro de otra y el ancho que da la posicion s del deslizador.
export function zoomFromPos(center, home, s, log = false) {
  const [h0, h1] = toW(home[0], home[1], log), w = (h1 - h0) * ZOOM_R ** -s, c = log ? L(center) : center;
  return fromW(c - w / 2, c + w / 2, log);
}
export const winCenter = (lo, hi, log = false) => { const [a, b] = toW(lo, hi, log); return log ? 10 ** ((a + b) / 2) : (a + b) / 2; };

// Cambia la ventana del eje k de la grafica g: guarda sus limites (la escala y las demas opciones del eje se conservan).
export function setWindow(g, k, lo, hi) {
  g.axes = g.axes || {};
  g.axes[k] = { name: '', scale: 'lin', major: null, minor: 0, ...(g.axes[k] || {}), min: lo, max: hi };
}
// Vuelve el eje a limites automaticos.
export function clearWindow(g, k) {
  if (g.axes?.[k]) { g.axes[k].min = null; g.axes[k].max = null; }
}
// Vista guardada de la grafica (g.home = { x1: [lo, hi], y1: [lo, hi] }): el usuario la fija con el boton de la esquina, tras mover y acercar
// la grafica a su gusto; el doble toque en un deslizador elastico vuelve ese eje a ella (sin vista guardada, a limites automaticos).
const okWin = (w) => Array.isArray(w) && w.length === 2 && w.every(Number.isFinite) && w[1] > w[0];
export function saveHome(g, wins) {
  const h = {};
  for (const [k, w] of Object.entries(wins)) if (okWin(w)) h[k] = [w[0], w[1]];
  if (Object.keys(h).length) g.home = h; else delete g.home;
  return !!g.home;
}
export const homeWin = (g, k) => (okWin(g?.home?.[k]) ? g.home[k].slice() : null);
export const forgetHome = (g) => { delete g.home; };
// Doble toque en el deslizador del eje k: a la vista guardada, o a limites automaticos si no hay. Devuelve la ventana puesta (o null).
export function resetAxis(g, k) {
  const w = homeWin(g, k);
  if (w) setWindow(g, k, w[0], w[1]); else clearWindow(g, k);
  return w;
}
