// Datos de wfile()/rfile() (como en SMath): un almacen de archivos de texto de A-CAD, comun a todos los dibujos del dispositivo (en SMath es
// la carpeta «user» de su configuracion). Cada archivo guarda un valor escrito con la sintaxis de A-CAD y punto decimal: «12'kN»,
// «[1, 2; 3, 4]», «"texto"», «3+4j».
// Durante un calculo, rfile() lee lo guardado y wfile() solo anota lo que hay que escribir; main.js lo graba al confirmar un cambio del
// dibujo (no al arrastrar ni en la simulacion), asi cada cambio avanza un paso, como cada recalculo de SMath. Sin DOM: el almacen real
// (localStorage) lo pone main.js; en las pruebas es un Map.
let store = new Map(); // nombre -> texto
let view = null; // lo que lee rfile entre un paso y el siguiente (null: lo guardado ahora)
let ver = 0; // cambia cuando cambia lo que lee rfile: el calculo de los textos lo usa en su memoria (ver textVarState)
const pending = new Map();
export function setDataBackend(b) { store = b; view = null; ver++; }
export const dataVersion = () => ver;
export const dataStore = () => store;
// Un paso escribe lo nuevo, pero hasta el paso siguiente rfile sigue leyendo lo que leyo ese paso: asi lo que se ve es lo que se calculo
// en el (con «e:rfile(E)», «n:jugar(e, k)» y «wfile(n, E)» se ve n, no la jugada siguiente). setDataView(null): leer lo guardado.
// La vista vale solo mientras el dibujo sea el del ultimo paso (guard): un cambio se valida y se calcula con lo guardado ahora.
let viewOk = () => true;
export const setDataView = (m) => { view = m; ver++; };
export const setDataViewGuard = (f) => { viewOk = f; };
export const dataRead = (name) => (view && viewOk() ? view.get(name) : store.get(name)) ?? null;
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
export function valueText(a, units, check) {
  if (typeof a?.str === 'string') return '"' + a.str.replace(/"/g, '""') + '"';
  if (a?.strs) return '[' + a.strs.map((s) => '"' + s.replace(/"/g, '""') + '"').join(', ') + ']';
  const body = (f) => {
    if (a.m) { const rows = a.m.map((r, i) => r.map((x, q) => (a.mi ? cplxText(x / f, a.mi[i][q] / f) : numText(x / f))).join(', ')); return '[' + rows.join('; ') + ']'; }
    const s = cplxText(a.v / f, (a.im || 0) / f);
    return a.im && a.d ? '(' + s + ')' : s;
  };
  if (!a.d || a.d.every((e) => !e)) return body(1);
  const cands = [...units.filter(Boolean), baseUnit(a.d)];
  for (const u of cands) { const t = body(u.f) + unitTail(u.name); if (!check || check(t)) return t; }
  return body(1) + unitTail(baseUnit(a.d).name);
}
