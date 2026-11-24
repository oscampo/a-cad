// Dibujos de ejemplo (las guias del manual): lo que un dibujo necesita que este encendido en Vista para verse como se explica. Sin DOM.
import { DIM_TYPES } from './model.js';

// { texts, dims, cons, pts }: textos si hay alguno; cotas si hay alguna visible (o linea indicativa); restricciones si hay alguna visible que no
// es una cota; puntos solo si se piden (la guia manda arrastrar o elegir un punto).
export function viewNeeds(doc, { points = false } = {}) {
  const v = {};
  if (Object.keys(doc.texts || {}).length) v.texts = true;
  const cons = Object.values(doc.cons || {}).filter((k) => !k.hidden);
  if (cons.some((k) => DIM_TYPES.includes(k.t) || k.t === 'LEAD')) v.dims = true;
  if (cons.some((k) => !DIM_TYPES.includes(k.t) && k.t !== 'LEAD')) v.cons = true;
  if (points) v.pts = true;
  return v;
}
