// Matrices con celdas de distinto tipo (numeros con su unidad y cadenas): { cells: [[celda, …], …] }, una celda es { v, im?, d?, r? } o { str }.
// Una matriz numerica sigue siendo { m, mi?, d } (el camino rapido de siempre) y un vector de cadenas, { strs }: lo que se arma o se corta de una matriz con celdas
// vuelve a esas formas cuando todo es de un solo tipo (cellsToValue), asi nada de lo que ya funcionaba cambia. Sin DOM e independiente del evaluador.
import { sameDim } from './units.js';

const isNum = (c) => c.str === undefined;
const zero0 = (c) => isNum(c) && c.v === 0 && !c.im && !c.d; // un 0 sin unidades vale con cualquier unidad (como en las matrices numericas)

// Cualquier valor del evaluador como una cuadricula de celdas (para armar y juntar).
export function gridOf(a) {
  if (a.cells) return a.cells;
  if (a.strs) return [a.strs.map((s) => ({ str: s }))];
  if (a.str !== undefined) return [[{ str: a.str }]];
  if (a.m) return a.m.map((r, i) => r.map((v, j) => ({ v, ...(a.mi && a.mi[i][j] ? { im: a.mi[i][j] } : {}), ...(a.d ? { d: a.d } : {}), r: false })));
  return [[{ v: a.v, ...(a.im ? { im: a.im } : {}), ...(a.d ? { d: a.d } : {}), ...(a.pu ? { pu: a.pu, pf: a.pf } : {}), r: !!a.r }]];
}

// Una celda como valor del evaluador.
export const cellValue = (c) => (c.str !== undefined ? { str: c.str } : { v: c.v, ...(c.im ? { im: c.im } : {}), r: !!c.r, ...(c.d ? { d: c.d } : {}), ...(c.pu ? { pu: c.pu, pf: c.pf } : {}) });

// La cuadricula como el valor mas simple que la contiene: un numero, una matriz numerica, una cadena, un vector de cadenas o, si hay de todo, { cells }.
export function cellsToValue(grid) {
  const R = grid.length, C = grid[0].length, flat = grid.flat();
  if (flat.every(isNum)) {
    let d = null;
    for (const c of flat) { if (!zero0(c) && c.d && c.d.some((e) => e)) { if (d === null) d = c.d; else if (!sameDim(c.d, d)) return { cells: grid }; } }
    if (d !== null && flat.some((c) => !zero0(c) && !(c.d && c.d.some((e) => e)))) return { cells: grid }; // un numero sin unidad junto a otro con unidad
    const cplx = flat.some((c) => c.im);
    if (R === 1 && C === 1) return { v: flat[0].v, ...(flat[0].im ? { im: flat[0].im } : {}), r: !!flat[0].r, ...(d ? { d } : {}), ...(flat[0].pu ? { pu: flat[0].pu, pf: flat[0].pf } : {}) };
    return { m: grid.map((r) => r.map((c) => c.v)), ...(cplx ? { mi: grid.map((r) => r.map((c) => c.im || 0)) } : {}), ...(d ? { d } : {}) };
  }
  if (flat.every((c) => !isNum(c)) && (R === 1 || C === 1)) return flat.length === 1 ? { str: flat[0].str } : { strs: flat.map((c) => c.str) };
  return { cells: grid };
}

// La razon por la que una matriz con celdas no vale para una funcion u operador (what): { msg: plantilla, args } o null si si vale.
export function whyNotNumeric(grid, what) {
  const R = grid.length, C = grid[0].length;
  for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) if (!isNum(grid[i][j])) {
    if (grid.flat().every((c) => !isNum(c))) return [`«${what}» no recibe una matriz de texto de varias filas y columnas: elige una fila o una columna`, []];
    return [`«${what}» no recibe una matriz con texto y números mezclados (la celda de la fila ${i + 1}, columna ${j + 1} es texto): elige las filas y columnas que sean de un solo tipo, p. ej. C_(2..4,2)`, []];
  }
  const d = grid.flat().find((c) => !zero0(c) && c.d && c.d.some((e) => e))?.d;
  for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) { const c = grid[i][j]; if (!zero0(c) && (d ? !(c.d && sameDim(c.d, d)) : false)) return [`«${what}» no recibe celdas con unidades distintas (la celda de la fila ${i + 1}, columna ${j + 1} no es compatible con las demás)`, []]; }
  return null;
}

// El valor que recibe una funcion u operador: la matriz con celdas hecha numerica (o de cadenas) si se puede; si no, un error que dice por que.
export function needSimple(a, what) {
  const v = cellsToValue(a.cells);
  if (!v.cells) return v;
  const w = whyNotNumeric(a.cells, what);
  throw new Error(w ? w[0] : `«${what}» no recibe una matriz con celdas de distinto tipo`);
}

// Pega bloques: rows es una lista de filas, cada una una lista de cuadriculas. Los de una fila van lado a lado (misma altura) y las filas, una debajo de la otra (mismo ancho).
export function stackGrids(rows, sepRow = ';', sepEl = ',') {
  const out = [];
  rows.forEach((bs, i) => {
    const h = bs[0].length, odd = bs.find((b) => b.length !== h);
    if (odd) throw new Error(`Para poner lado a lado (con «${sepEl}») los bloques deben tener el mismo número de filas: en la fila ${i + 1} hay uno de ${h} y otro de ${odd.length}`);
    for (let r = 0; r < h; r++) out.push(bs.flatMap((b) => b[r]));
  });
  const w = out[0].length, bad = out.find((r) => r.length !== w);
  if (bad) throw new Error(`Para apilar (con «${sepRow}») las filas deben tener el mismo número de columnas: unas tienen ${w} y otras ${bad.length}`);
  if (out.length * w > 10000) throw new Error('Una matriz admite hasta 10000 elementos');
  return out;
}

export const transposeGrid = (g) => g[0].map((_, j) => g.map((r) => r[j]));
export const sizeOfGrid = (g) => [g.length, g[0].length];

// La unidad en la que mostrar un valor de dimension dim que viene de la variable x: la suya (pu) o la de alguna de sus celdas (30 K en una celda se muestra en K).
export function prefUnit(x, dim) {
  if (!x) return null;
  if (x.pu && (!x.dv) && sameDim(x.d, dim)) return { name: x.pu, f: x.pf };
  const c = x.cells?.flat().find((k) => k.pu && k.d && sameDim(k.d, dim));
  return c ? { name: c.pu, f: c.pf } : null;
}
