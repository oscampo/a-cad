// Nombres de una biblioteca dentro de un documento: cada nombre de la biblioteca entra como «alias.nombre» (UF.C_(surf), UF.Neuber_(steels)).
// qualify reescribe el cuerpo de una definicion de la biblioteca para que lea SUS nombres (Neuber_(steels) -> UF.Neuber_(steels)): asi una
// funcion de la biblioteca queda atada a sus propias tablas, y una variable del documento con el mismo nombre no la altera.
// No toca: parametros, variables locales de un programa o script, la variable de un for, funciones locales, unidades ('MPa), propiedades
// (p1.x), lo que ya va calificado ni el texto de una cadena. Sin DOM.
import { normName } from './expr.js';

const L0 = 'A-Za-zα-ωΑ-Ωϑϕϖɛ';
const NAME_AT = new RegExp(`^[${L0}_](?:[${L0}0-9]|_(?!\\())*(?:_\\([^()]*\\))?'*`); // un «_» seguido de «(» es del subindice: Neuber_(steels)
const ASG = new RegExp(`(?<![${L0}0-9_'.])([${L0}_](?:[${L0}0-9]|_(?!\\())*(?:_\\([^()]*\\))?'*)\\s*:(?!=)`, 'g');
const FORV = /(?:^|[^A-Za-z0-9_])for\s*\(\s*([A-Za-zα-ωΑ-Ωϑϕϖɛ_][A-Za-z0-9α-ωΑ-Ωϑϕϖɛ_]*'*)\s*[,;]/g; // la variable de un for

// Nombres locales de un cuerpo: parametros, asignaciones de un programa («s:…»), variable de un for, funciones locales de un script
export function localsOf(params, expr, lib) {
  const out = new Set(params || []);
  const scan = (s) => { for (const m of String(s ?? '').matchAll(ASG)) out.add(normName(m[1])); for (const m of String(s ?? '').matchAll(FORV)) out.add(normName(m[1])); };
  scan(expr);
  for (const [g, x] of Object.entries(lib || {})) { out.add(g); for (const q of x.fn?.params || []) out.add(q); scan(x.fn?.body); }
  out.add('nargin'); out.add('varargin');
  return out;
}

// Base de un nombre con indice: v_2 -> v, A_(i,j) -> A (si «v_2» no es un nombre por si mismo)
const indexBase = (raw) => {
  const k = raw.lastIndexOf('_(');
  if (k > 0 && raw.endsWith(')')) return raw.slice(0, k);
  const j = raw.lastIndexOf('_');
  return j > 0 && /^[A-Za-z0-9α-ωΑ-Ωϑϕϖɛ]+$/.test(raw.slice(j + 1)) ? raw.slice(0, j) : null;
};

// Reescribe expr: cada nombre de names (que no sea local) pasa a alias.nombre; «b_k» con b de la biblioteca, a alias.b_k
export function qualify(expr, names, alias, locals = new Set()) {
  const s = String(expr ?? '');
  let out = '', i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '"' || c === '“') { // una cadena se copia tal cual
      const close = c === '"' ? '"' : '”';
      let j = i + 1;
      while (j < s.length && s[j] !== close && !(c === '“' && s[j] === '"')) j++;
      out += s.slice(i, j + 1); i = j + 1; continue;
    }
    const prev = i ? s[i - 1] : '';
    if (new RegExp(`[${L0}_]`).test(c) && !new RegExp(`[${L0}0-9_'.]`).test(prev)) {
      const m = NAME_AT.exec(s.slice(i));
      const txt = m[0], raw = normName(txt), next = s[i + txt.length];
      const qualifiedAlready = next === '.' && new RegExp(`[${L0}]`).test(s[i + txt.length + 1] || ''); // «UF.x» u otra propiedad: se deja
      let rep = txt;
      if (!qualifiedAlready && !locals.has(raw)) {
        if (names.has(raw)) rep = alias + '.' + txt;
        else { const b = indexBase(raw); if (b && names.has(b) && !locals.has(b)) rep = alias + '.' + txt; }
      }
      out += rep; i += txt.length; continue;
    }
    out += c; i++;
  }
  return out;
}

// Una definicion de la biblioteca, reescrita: { expr, lib } (lib: las funciones locales de un script, tambien reescritas)
export function qualifyDef(d, names, alias) {
  const loc = localsOf(d.params, d.expr, d.lib);
  const expr = qualify(d.expr, names, alias, loc);
  let lib = null;
  if (d.lib && Object.keys(d.lib).length) {
    lib = {};
    for (const [g, x] of Object.entries(d.lib)) {
      const gl = new Set([...loc, ...(x.fn?.params || [])]);
      lib[g] = { fn: { params: x.fn.params, body: qualify(x.fn.body, names, alias, gl) } };
    }
    for (const g of Object.values(lib)) Object.defineProperty(g.fn, 'lib', { value: lib, enumerable: false }); // se ven entre ellas (como en script.js)
  }
  return { expr, lib };
}
