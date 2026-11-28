// Datos de wfile()/rfile() (como en SMath): un almacen de archivos de texto de A-CAD, comun a todos los dibujos del dispositivo (en SMath es
// la carpeta «user» de su configuracion). Cada archivo guarda un valor escrito con la sintaxis de A-CAD y punto decimal: «12'kN»,
// «[1, 2; 3, 4]», «"texto"», «3+4j».
// Durante un calculo, rfile() lee lo guardado y wfile() solo anota lo que hay que escribir; main.js lo graba al confirmar un cambio del
// dibujo (no al arrastrar ni en la simulacion), asi cada cambio avanza un paso, como cada recalculo de SMath. Sin DOM: el almacen real
// (localStorage) lo pone main.js; en las pruebas es un Map.
import { autoUnit } from './units.js';
let store = new Map(); // nombre -> texto
let ver = 0; // cambia cuando cambia lo guardado: el calculo de los textos lo usa en su memoria (ver textVarState)
const pending = new Map();
export function setDataBackend(b) { store = b; ver++; }
export const dataVersion = () => ver;
export const dataChanged = () => { ver++; }; // quien escribe o borra en el almacen lo avisa
export const dataStore = () => store;
// entered(nombre): los nombres que define el texto que se acaba de confirmar con Enter; valen solo durante ese paso (main.js los pone y los quita)
let entered = new Set();
export function setEntered(names) { entered = new Set(names); ver++; }
export const isEntered = (name) => entered.has(name);
// rfile lee siempre lo guardado: lo que muestra un dibujo despues de un paso es lo que ese paso guardo. Para ver el resultado de un paso,
// muestra lo que lees (q:rfile(E)), no lo que calculas para guardar (que ya es el paso siguiente).
export const dataRead = (name) => store.get(name) ?? null;
// play("nombre"): como wfile, solo actua en el paso que confirma un cambio del dibujo (main.js lo activa mientras lo calcula): en un redibujo o al
// arrastrar no suena nada. Los nombres se anotan y main.js los reproduce al terminar el paso, cada uno una vez.
let soundsOn = false, soundHas = () => true;
const soundQ = new Set();
export const setSoundsActive = (on) => { soundsOn = !!on; if (!on) soundQ.clear(); };
export const setSoundCatalog = (fn) => { soundHas = fn; }; // fn(nombre): 1 si el dibujo tiene ese sonido
export function soundPlay(name) { if (!soundHas(name)) return 0; if (soundsOn) soundQ.add(name); return 1; }
export function takeSounds() { const a = [...soundQ]; soundQ.clear(); return a; }
export function dataWrite(name, text) { pending.set(name, text); }
export const clearDataWrites = () => pending.clear();
export function takeDataWrites() { const w = [...pending]; pending.clear(); return w; }

// Un nombre de archivo valido: sin carpetas ni caracteres que un sistema de archivos no acepta.
export function dataName(s) {
  const n = String(s ?? '').trim();
  if (!n || n.length > 80 || /[\\/:*?"<>|\u0000-\u001f]/.test(n) || /^\.+$/.test(n)) throw new Error(`«${n}» no sirve como nombre de archivo: sin barras, comillas ni los signos : * ? < > |, y hasta 80 caracteres`);
  return n;
}

// Un numero con todas sus cifras utiles, en la forma que vuelve a leer el evaluador («1.2e-5»).
export const numText = (x) => String(Number(x.toPrecision(15))).replace('e+', 'e');
const cplxText = (re, im) => (!im ? numText(re) : !re ? numText(im) + 'j' : numText(re) + (im < 0 ? '-' : '+') + numText(Math.abs(im)) + 'j');
const unitTail = (name) => "'" + (/^[A-Za-zµμΩ°%]+[²³]?$/.test(name) ? name : '(' + name + ')');
// Las unidades base de una magnitud cualquiera: «(m^2·kg·s^-3)».
const BASE_U = ['m', 'kg', 's', 'A', 'K', 'mol', 'cd'];
const baseUnit = (d) => ({ name: d.map((e, i) => (e ? BASE_U[i] + (e !== 1 ? '^' + numText(e) : '') : '')).filter(Boolean).join('·'), f: 1 });

// El texto de un valor del evaluador ({ v, im, d } | { m, mi, d } | { str } | { strs }). units: las unidades candidatas en orden
// ({ name, f }); se usa la primera con la que el texto vuelve a dar el mismo valor (check), y si ninguna, las unidades base.
// Una matriz con celdas: «[“texto”, 5'mm; 2, "x"]», cada celda con su propia unidad (la de su variable si la tiene; si no, las unidades base).
const cellText = (c) => {
  if (c.str !== undefined) return '"' + c.str.replace(/"/g, '""') + '"';
  if (!c.d || c.d.every((e) => !e)) return cplxText(c.v, c.im || 0);
  const u0 = c.pu && c.pf ? { name: c.pu, f: c.pf, o: c.po } : (autoUnit(Math.hypot(c.v, c.im || 0), c.d) || baseUnit(c.d)); // la de su variable, o la habitual (5'mm); si no, las unidades base
  const u = { ...u0, o: u0.o || 0 }, s = cplxText((c.v - u.o) / u.f, (c.im || 0) / u.f);
  return (c.im ? '(' + s + ')' : s) + unitTail(u.name);
};
export function valueText(a, units, check) {
  if (a?.cells) return '[' + a.cells.map((r) => r.map(cellText).join(', ')).join('; ') + ']';
  if (typeof a?.str === 'string') return '"' + a.str.replace(/"/g, '""') + '"';
  if (a?.strs) return '[' + a.strs.map((s) => '"' + s.replace(/"/g, '""') + '"').join(', ') + ']';
  const body = (f, o = 0) => { // o: el cero de la escala (°C, °F)
    if (a.m) { const rows = a.m.map((r, i) => r.map((x, q) => (a.mi ? cplxText(x / f, a.mi[i][q] / f) : numText((x - o) / f))).join(', ')); return '[' + rows.join('; ') + ']'; }
    const s = cplxText((a.v - o) / f, (a.im || 0) / f);
    return a.im && a.d ? '(' + s + ')' : s;
  };
  if (!a.d || a.d.every((e) => !e)) return body(1);
  const cands = [...units.filter(Boolean), baseUnit(a.d)];
  for (const u of cands) { const t = body(u.f, u.o || 0) + unitTail(u.name); if (!check || check(t)) return t; }
  return body(1) + unitTail(baseUnit(a.d).name);
}
