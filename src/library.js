// Bibliotecas: un documento normal que se declara biblioteca (doc.lib, en Configuracion) y se guarda en GitHub en MyLibrary/.
// doc.lib = { on, name, alias, author, desc, version, exports: [nombres publicos], decimal, angles }
// Lo que viaja al insertarla (fase 3) son sus nombres publicos y lo que esos necesitan (dependencias); los ejemplos y las salidas no.
// Aqui: las definiciones del documento, sus dependencias y la revision antes de guardar. Sin DOM.
import { textVars } from './params.js';
import { exprRefs, indexParts, isReservedName } from './expr.js';
import { localsOf } from './qualify.js';

export const LIB_DIR = 'MyLibrary';

// Las definiciones del documento (la ultima de cada nombre): { name, kind: 'fn' | 'script' | 'var', expr, params, lib, err }
export function libDefs(doc) {
  const st = textVars(doc), defs = new Map();
  for (const d of st.defs || []) {
    if (!d.name) continue;
    defs.delete(d.name); // la ultima definicion de cada nombre, en su lugar del orden de lectura
    defs.set(d.name, { name: d.name, kind: d.script ? 'script' : d.params ? 'fn' : 'var', expr: d.expr, params: d.params || null, lib: d.lib || null, ...(d.unit ? { unit: d.unit } : {}), err: st.errs.get(d.name) || null });
  }
  return { defs, st };
}

// Los nombres que lee una definicion (sin sus locales): v_2 y A_(i,j) cuentan como v y A
// known: los nombres definidos; «Neuber_(steels)» definido es ese nombre, no el elemento steels de un vector Neuber
export function refsOf(d, known = new Map()) {
  const loc = localsOf(d.params, d.expr, d.lib), out = new Set();
  const add = (s) => {
    for (const r of exprRefs(String(s ?? ''))) {
      if (!/^[A-Za-zα-ωΑ-Ωϑϕϖɛ]/.test(r)) continue; // restos que no son un nombre («_» de T_(st)_(1,2))
      if (known.has(r)) { if (!loc.has(r)) out.add(r); continue; }
      const ip = indexParts(r), n = ip && !r.includes('.') ? ip.base : r;
      if (!loc.has(n) && !loc.has(r)) out.add(n);
    }
  };
  add(d.expr);
  for (const x of Object.values(d.lib || {})) add(x.fn?.body);
  return out;
}

// Lo que viaja: los publicos y, de forma transitiva, las definiciones del documento que necesitan. Avisa de lo que no puede viajar:
// un publico que no existe, una definicion con error y una dependencia de una cota o de una medida del dibujo (p1.x, l3.len).
export function libClosure(doc, exports) {
  const { defs } = libDefs(doc), dims = new Set(Object.values(doc.cons || {}).filter((k) => k.name).map((k) => k.name)); // las cotas con nombre
  const names = new Set(), missing = [], measures = new Set(), errors = [];
  const todo = [...exports];
  while (todo.length) {
    const n = todo.pop();
    if (names.has(n)) continue;
    const d = defs.get(n);
    if (!d) { if (exports.includes(n)) missing.push(n); continue; }
    names.add(n);
    if (d.err) errors.push(d.err);
    for (const r of refsOf(d, defs)) {
      if (defs.has(r)) todo.push(r);
      else if (r.includes('.') || dims.has(r)) measures.add(`«${n}» lee ${r}`);
    }
  }
  return { names, missing, measures: [...measures], errors, defs };
}

export const defaultExports = (defs) => [...defs.values()].filter((d) => d.kind !== 'var').map((d) => d.name);

// Alias: corto, de letras y numeros, que no sea una funcion de la app ni se confunda con un punto, una linea, un arco… (p1, l3, c2)
export function aliasProblem(alias) {
  const a = String(alias ?? '').trim();
  if (!a) return 'falta el alias (p. ej. UF)';
  if (!/^[A-Za-z][A-Za-z0-9]{0,11}$/.test(a)) return 'el alias es de letras y números, empieza con letra y tiene hasta 12 caracteres';
  if (/^[plcaestgyD]\d+$/.test(a)) return `«${a}» se confunde con el nombre de un elemento del dibujo (p1, l3, D2…)`;
  if (isReservedName(a)) return `«${a}» es un nombre reservado de la app`;
  return null;
}
// Nombre del archivo en MyLibrary/: el de la biblioteca, sin caracteres que GitHub o un sistema de archivos no acepten
export const libFileName = (lib) => String(lib?.name || 'Biblioteca').trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ') + '.json';

// Revision antes de guardar: [] si esta lista; si no, los problemas, uno por linea
export function checkLibrary(doc) {
  const lib = doc.lib, out = [];
  if (!lib?.on) return ['el documento no está declarado como biblioteca'];
  if (!String(lib.name || '').trim()) out.push('falta el nombre de la biblioteca');
  const ap = aliasProblem(lib.alias); if (ap) out.push(ap);
  const ex = Array.isArray(lib.exports) ? lib.exports : [];
  if (!ex.length) out.push('no hay nada público: marca al menos una función, script o variable');
  const c = libClosure(doc, ex);
  for (const n of c.missing) out.push(`«${n}» está marcado como público pero ya no está definido en el documento`);
  for (const e of c.errors) out.push(e);
  for (const m of c.measures) out.push(`${m}: una biblioteca no debería depender de las cotas ni de las medidas de su dibujo`);
  return out;
}

// Lo que se guarda en el documento al insertar la biblioteca (fase 3): su ficha y lo que viaja, en orden de lectura
export function libPayload(doc, alias = doc.lib?.alias) {
  const L = doc.lib || {}, c = libClosure(doc, Array.isArray(L.exports) ? L.exports : []);
  const defs = [...c.defs.values()].filter((d) => c.names.has(d.name)).map(({ err, ...d }) => { // eslint-disable-line no-unused-vars
    const out = { ...d };
    if (!out.lib) delete out.lib; else out.lib = Object.fromEntries(Object.entries(out.lib).map(([g, x]) => [g, { fn: { params: x.fn.params, body: x.fn.body } }]));
    if (!out.params) delete out.params;
    return out;
  });
  return { name: L.name || '', alias, version: L.version || 0, exports: [...(L.exports || [])], decimal: L.decimal ?? doc.decimal ?? null, angles: L.angles ?? (doc.angles === 'rad' ? 'rad' : 'deg'), defs };
}
