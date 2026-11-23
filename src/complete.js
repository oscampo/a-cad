// Completado de formulas (sin DOM): que se puede escribir en un punto de la pagina y en que contexto esta el cursor.
// Sigue el orden de lectura: solo se sugiere lo que ya existe en ese lugar (varsAt: variables y funciones definidas antes, cotas,
// bibliotecas insertadas antes con sus nombres «alias.nombre», medidas del dibujo «p1.x»), nada de lo que se define mas abajo
// ni lo que un clear() anterior borro. Mas las funciones de A-CAD, con su firma, ayuda y ejemplo de la referencia (funcref.js).
import { FUNC_NAMES } from './expr.js';
import { FUNC_GROUPS } from './funcref.js';
import { varsAt, textVars } from './params.js';
import { textDefs } from './tvars.js';
import { scriptHelp } from './script.js';

// Un nombre: letras, numeros, primas y un subindice «_(texto)» (abierto mientras se escribe: «C_(su»)
const NAME = "[A-Za-zα-ωΑ-Ωϑϕϖɛ][A-Za-z0-9α-ωΑ-Ωϑϕϖɛ_']*?'*(?:_\\(?[A-Za-z0-9α-ωΑ-Ω]*\\)?)?";
const NAME_END = new RegExp(`(${NAME})$`);
const MEMBER_END = new RegExp(`([A-Za-z][A-Za-z0-9]*)\\.(${NAME})?$`);

// Para comparar: sin parentesis ni primas, en minusculas («C_(surf)» -> «c_surf»); el «_» cuenta («n_» no es cualquier «n…»)
export const normKey = (s) => String(s).replace(/[()'\s]/g, '').toLowerCase();
const subseq = (q, s) => { if (q[0] !== s[0]) return false; let i = 0; for (const ch of s) if (ch === q[i]) i++; return i === q.length; }; // las letras en orden, empezando por la primera («csu» -> «c_surf»; «lin» no es «polyint»)

// Contexto en la posicion pos del texto que se escribe. { none: motivo } donde no se sugiere (texto normal, dentro de una cadena o un
// comentario); { scope: 'member', base, q, start } tras «UF.» o «p1.»; { scope: 'all', q, start } en un nombre (q puede ser '').
// start: desde donde se reemplaza al aceptar.
export function completeContext(text, pos) {
  const s = String(text ?? ''), before = s.slice(0, pos);
  if (/^["“\s]/.test(s)) return { none: 'texto' }; // «"» o espacio al empezar: texto normal, no formula
  const line = before.slice(before.lastIndexOf('\n') + 1);
  let q = null;
  for (let i = 0; i < line.length; i++) { const c = line[i]; if (q) { if (c === q || (q === '“' && c === '”')) q = null; } else if (c === '"' || c === '“') q = c; else if (c === '#') return { none: 'comentario' }; }
  if (q) return { none: 'cadena' };
  let m = MEMBER_END.exec(before);
  if (m) { const name = m[2] || ''; return { scope: 'member', base: m[1], q: name, start: pos - name.length }; }
  m = NAME_END.exec(before);
  if (m && !/[0-9.]$/.test(before.slice(0, pos - m[1].length))) return { scope: 'all', q: m[1], start: pos - m[1].length }; // «2x» o «1.5e»: no es un nombre
  return { scope: 'all', q: '', start: pos };
}

// ---- Funciones de A-CAD: firma, ayuda corta y ejemplo, de la referencia (FUNC_GROUPS). Se arma una vez.
const stripHtml = (h) => String(h).replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
let BUILTIN = null;
export function builtinInfo() {
  if (BUILTIN) return BUILTIN;
  BUILTIN = new Map();
  const rows = FUNC_GROUPS.flatMap((g) => g.rows.map((r) => ({ codes: [...String(r[0]).matchAll(/<code>([\s\S]*?)<\/code>/g)].map((x) => stripHtml(x[1])), desc: stripHtml(r[1]), ex: r[2] && r[3] !== undefined && r[4] !== 't' && !String(r[2]).includes('\n') ? `${stripHtml(r[2])} = ${stripHtml(r[3])}` : '' })));
  for (const name of FUNC_NAMES) {
    const call = new RegExp(`(?:^|[^A-Za-z0-9_])${name}\\(([^)]*)\\)`), word = new RegExp(`(?:^|[^A-Za-z0-9_])${name}(?:[^A-Za-z0-9_]|$)`);
    let hit = null, sig = null;
    for (const r of rows) for (const c of r.codes) { const m = call.exec(c); if (m) { hit = r; sig = `${name}(${m[1]})`; break; } if (hit) break; }
    if (!hit) hit = rows.find((r) => r.codes.some((c) => word.test(c))) || null;
    BUILTIN.set(name, { sig: sig || `${name}(…)`, desc: hit?.desc || '', ex: sig && hit?.ex && hit.ex.includes(name + '(') ? hit.ex : '' });
  }
  return BUILTIN;
}

// Lo que se puede escribir en ese lugar de la pagina (top, left: esquina superior izquierda de lo que se escribe, en unidades del dibujo).
// [{ name, insert, kind, value?, params?, help? }] sin ordenar. kind: 'var' | 'fn' (del documento) | 'lib' (alias o miembro de biblioteca)
// | 'dim' (cota) | 'el' (elemento o medida del dibujo) | 'builtin'.
export function visibleNames(doc, top, left) {
  const { vars } = varsAt(doc, top, left), out = [], dims = new Set(Object.values(doc.cons || {}).filter((k) => k.name).map((k) => k.name));
  const aliases = new Set(Object.values(doc.texts || {}).filter((t) => t.lib?.alias).map((t) => t.lib.alias));
  const els = new Set();
  for (const [key, v] of Object.entries(vars)) {
    const dot = key.indexOf('.');
    if (dot > 0) { const base = key.slice(0, dot); if (!aliases.has(base)) els.add(base); continue; } // «UF.x» van por su alias; «p1.x» por su elemento
    out.push({ name: key, insert: key, kind: dims.has(key) ? 'dim' : v?.fn ? 'fn' : 'var', value: v, params: v?.fn?.params || null });
  }
  for (const a of aliases) if (Object.keys(vars).some((k) => k.startsWith(a + '.'))) out.push({ name: a, insert: a + '.', kind: 'lib', isAlias: true });
  for (const e of els) out.push({ name: e, insert: e + '.', kind: 'el', isAlias: true });
  for (const [name, b] of builtinInfo()) if (!(name in vars)) out.push({ name, insert: name, kind: 'builtin', sig: b.sig, help: b.desc, ex: b.ex, params: /\((.*)\)/.exec(b.sig)?.[1].split(/,\s*/).filter((p) => p && p !== '…') || null });
  return { all: out, vars };
}
// Los miembros de «base.»: los nombres publicos de una biblioteca o las medidas de un elemento del dibujo
export function memberNames(vars, base) {
  const pre = base + '.', out = [];
  for (const [key, v] of Object.entries(vars)) if (key.startsWith(pre)) out.push({ name: key.slice(pre.length), full: key, insert: key.slice(pre.length), kind: /^[plcaestgy]\d+$/.test(base) ? 'el' : 'lib', value: v, params: v?.fn?.params || null });
  return out;
}

// Orden: primero lo que empieza igual (sin distinguir mayusculas, como SMath), luego lo que empieza igual sin «_()'», luego lo que lo contiene y, desde
// 2 letras, lo que tiene esas letras en orden («csu» -> «C_(surf)»). A igual coincidencia: lo del documento, las cotas, las bibliotecas,
// las funciones de A-CAD y los elementos; y el nombre mas corto.
const RANK = { var: 0, fn: 0, dim: 1, lib: 2, builtin: 3, el: 4 };
export function rankNames(list, q, max = 50) {
  const nq = normKey(q), out = [];
  for (const it of list) {
    if (it.kind === 'el' && it.isAlias && !/^[a-z]\d*$/.test(q)) continue; // los elementos (p1, l3…) solo cuando se escribe algo como «p» o «l3»
    const n = normKey(it.name);
    let sc = -1;
    if (!q) sc = 1; else if (it.name.toLowerCase().startsWith(q.toLowerCase())) sc = 4; else if (n.startsWith(nq)) sc = 3; else if (nq && n.includes(nq)) sc = 2; else if (nq.length >= 2 && subseq(nq, n)) sc = 1;
    if (sc >= 0) out.push({ ...it, score: sc, exact: !!q && it.name.startsWith(q) });
  }
  out.sort((a, b) => b.score - a.score || RANK[a.kind] - RANK[b.kind] || b.exact - a.exact || a.name.length - b.name.length || a.name.localeCompare(b.name));
  return out.slice(0, max);
}

// Sugerencias en esa posicion del texto: { ctx, items } (items vacio donde no se sugiere)
export function suggest(doc, text, pos, top, left, { min = 1 } = {}) {
  const ctx = completeContext(text, pos);
  if (ctx.none) return { ctx, items: [] };
  const { all, vars } = visibleNames(doc, top, left);
  if (ctx.scope === 'member') return { ctx, items: rankNames(memberNames(vars, ctx.base), ctx.q) };
  if (ctx.q.length < min) return { ctx, items: [] };
  return { ctx, items: rankNames(all, ctx.q) };
}

// Llamada abierta en el cursor: { name, idx } (idx: el argumento en que esta el cursor). Null fuera de una llamada.
export function openCall(text, pos) {
  const s = String(text ?? '');
  let depth = 0, commas = 0;
  for (let i = pos - 1; i >= 0; i--) {
    const c = s[i];
    if (c === ')' || c === ']') depth++;
    else if (c === '(' || c === '[') {
      if (depth) { depth--; continue; }
      if (c === '[') return null;
      const m = new RegExp(`((?:[A-Za-z][A-Za-z0-9]*\\.)?${NAME})$`).exec(s.slice(0, i));
      return m ? { name: m[1], idx: commas, open: i } : null;
    } else if ((c === ',' || c === ';') && !depth) commas++;
    else if (c === '\n') return null;
  }
  return null;
}

// Fuente de una definicion por su nombre («f» o «UF.f»): { params, expr, script, help }. Del documento (la ultima con ese nombre) o de la
// biblioteca insertada con ese alias.
export function defSource(doc, name) {
  const dot = name.indexOf('.');
  if (dot > 0) {
    const alias = name.slice(0, dot), n = name.slice(dot + 1);
    const lib = Object.values(doc.texts || {}).find((t) => t.lib?.alias === alias)?.lib;
    const d = lib?.defs?.find((x) => x.name === n);
    return d ? { params: d.params || null, expr: d.expr, script: d.kind === 'script', help: d.help || '', lib: lib.name } : null; // help: guardada al insertar (el script viaja compilado, sin sus comentarios)
  }
  const d = textDefs(doc).filter((x) => x.name === name).pop();
  if (!d) return null;
  return { params: d.params || null, expr: d.expr, script: !!d.script, help: d.script ? scriptHelp(doc.texts?.[d.tid]?.text) : '' };
}
export { textVars, scriptHelp };
