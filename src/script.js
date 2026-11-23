// Scripts: un texto que empieza con «%» define UNA funcion (o variable) con un programa escrito por sangria, como en Python:
//
//   %suma2(n):
//     s:0
//     for i in 1..n:
//       s:s+i^2
//     s
//
// La primera linea es la firma («%nombre(parametros):», o «%nombre:» para una variable). Dentro: «x:valor» asigna una variable local,
// «for v in a..b:» (o «for v in vector:»), «while condicion:» e «if c: / elif c: / else:» abren un bloque con mas sangria, «g(x): …»
// define una funcion local (solo en el nivel principal), «#» comenta hasta el final de la linea, y la ultima linea es el valor.
// Se traduce a las funciones del motor (line, for, while, if) y se evalua con ellas: el script no es JavaScript ni se ejecuta como tal.
// Sin DOM.
import { TEXT_NAME_RE, normName, isReservedName, reservedWhy } from './expr.js';

export const isScript = (s) => typeof s === 'string' && s[0] === '%';
const NAME = "[A-Za-zα-ωΑ-Ωϑϕϖɛ_][A-Za-z0-9α-ωΑ-Ωϑϕϖɛ_]*(?:_\\([^()]*\\))?'*"; // con subindice de varias letras: «C_(surf)»
const HEAD_RE = new RegExp('^%\\s*(' + NAME + ')(?<!_)\\s*(?:\\(([^()]*)\\))?\\s*:=?\\s*(.*)$');
const FOR_RE = new RegExp('^for\\s+(' + NAME + ')\\s+in\\s+(.+?)\\s*:$');
const WHILE_RE = /^while\s+(.+?)\s*:$/;
const IF_RE = /^if\s+(.+?)\s*:$/;
const ELIF_RE = /^elif\s+(.+?)\s*:$/;
const FN_RE = new RegExp('^(' + NAME + ')(?<!_)\\s*\\(([^()]*)\\)\\s*:=?\\s*(.*)$'); // «k_(x):…» es la variable k_(x), no la funcion k_
const ASG_RE = new RegExp('^(' + NAME + ')\\s*:=?\\s*(.*)$');
const S = '; '; // separador de los argumentos que arma la traduccion: «;» separa en cualquier indicador decimal

const splitParams = (s) => String(s).split(/[;,]/).map((q) => normName(q.trim()));

// { name, params (array o null si es variable), body (formula del motor), lib ({ nombre: { fn } } funciones locales), err, sig }
export function parseScript(src) {
  const raw = String(src ?? '').split('\n').map((l) => l.replace(/\t/g, '  ').replace(/\r$/, ''));
  const head = HEAD_RE.exec(raw[0] || '');
  if (!head) return { err: 'línea 1: un script empieza con su firma, p. ej. %f(x): (y debajo, con sangría, el programa)', sig: (raw[0] || '%').slice(1).trim() || '…' };
  const name = normName(head[1]), params = head[2] !== undefined ? splitParams(head[2]) : null;
  const sig = name + (params ? '(' + params.join(', ') + ')' : '');
  const out = { name, params, sig, lib: {} };
  if (params && params.some((q) => !q || !TEXT_NAME_RE.test(q))) return { ...out, err: 'línea 1: los parámetros son nombres separados por «,»' };
  // las lineas del cuerpo: { n (numero de linea), ind (sangria), s (sin comentario ni espacios) }
  const lines = [];
  // «#» comenta hasta el final de la linea, salvo dentro de una cadena («"#1"»)
  const noCom = (l) => { let q = null; for (let i = 0; i < l.length; i++) { const c = l[i]; if (q) { if (c === q || (q === '“' && c === '”')) q = null; } else if (c === '"' || c === '“') q = c; else if (c === '#') return l.slice(0, i); } return l; };
  if (head[3].trim()) lines.push({ n: 1, ind: 1, s: noCom(head[3]).trim() }); // «%f(x): x^2» en una linea
  raw.slice(1).forEach((l, k) => { const s = noCom(l); if (s.trim()) lines.push({ n: k + 2, ind: /^ */.exec(s)[0].length, s: s.trim() }); });
  if (!lines.length) return { ...out, err: 'línea 2: falta el programa (con sangría, debajo de la firma)' };
  if (head[3].trim() && lines.length > 1) return { ...out, err: `línea ${lines[1].n}: con el programa en la misma línea de la firma no puede haber más líneas` };
  const fail = (ln, msg) => { const e = new Error(`línea ${ln.n}: ${msg}`); e.script = true; throw e; };
  let i = 0;
  // un bloque: las lineas con la sangria de la primera (top: el nivel principal, donde van las funciones locales)
  function block(min, top) {
    const first = lines[i];
    if (!first || first.ind <= min) return null;
    const ind = first.ind, stmts = [];
    while (i < lines.length && lines[i].ind >= ind) {
      const ln = lines[i];
      if (ln.ind > ind) fail(ln, 'sangría de más: solo después de una línea que termina en «:» (for, while, if)');
      i++;
      let m;
      const sub = (what) => { const b = block(ind, false); if (!b) fail(ln, `falta el cuerpo de ${what} (las líneas de debajo, con más sangría)`); return b; };
      if ((m = FOR_RE.exec(ln.s))) stmts.push(`for(${normName(m[1])}${S}${m[2]}${S}${sub('for')})`);
      else if ((m = WHILE_RE.exec(ln.s))) stmts.push(`while(${m[1]}${S}${sub('while')})`);
      else if ((m = IF_RE.exec(ln.s))) {
        const arms = [[m[1], sub('if')]];
        let other = '0';
        while (i < lines.length && lines[i].ind === ind) {
          const nx = lines[i];
          if ((m = ELIF_RE.exec(nx.s))) { i++; arms.push([m[1], block(ind, false) || fail(nx, 'falta el cuerpo de elif')]); continue; }
          if (/^else\s*:$/.test(nx.s)) { i++; other = block(ind, false) || fail(nx, 'falta el cuerpo de else'); }
          break;
        }
        stmts.push(arms.reduceRight((acc, [c, b]) => `if(${c}${S}${b}${S}${acc})`, other));
      } else if (/^(elif\b|else\s*:)/.test(ln.s)) fail(ln, '«elif» y «else» van después de un «if», con la misma sangría');
      else if (/^(for|while|if)(\s|$)/.test(ln.s)) fail(ln, `«${ln.s.split(/\s/)[0]}» lleva la forma ${ln.s.startsWith('for') ? '«for i in 1..n:»' : ln.s.startsWith('while') ? '«while condición:»' : '«if condición:»'}`);
      else if ((m = FN_RE.exec(ln.s)) && !/^\s*=/.test(m[3])) { // funcion local: g(x): expr (o con el cuerpo debajo)
        if (!top) fail(ln, 'las funciones locales van en el nivel principal del script, no dentro de un for, while o if');
        const gn = normName(m[1]), ps = splitParams(m[2]);
        if (isReservedName(gn)) fail(ln, reservedWhy(gn)); // una funcion local tampoco puede llamarse como una funcion de la app
        if (ps.some((q) => !q || !TEXT_NAME_RE.test(q))) fail(ln, `los parámetros de «${gn}» son nombres separados por «,»`);
        const body = m[3].trim() ? m[3].trim() : sub(`«${gn}»`);
        out.lib[gn] = { fn: { params: ps, body } };
      } else if ((m = ASG_RE.exec(ln.s)) && !/^=/.test(m[2])) {
        if (!m[2].trim()) fail(ln, `a «${normName(m[1])}» le falta el valor (${normName(m[1])}:valor)`);
        stmts.push(`${normName(m[1])}:${m[2].trim()}`);
      } else if (/:\s*$/.test(ln.s)) fail(ln, 'una línea que termina en «:» abre un bloque: for i in …:, while …:, if …: o una función g(x):');
      else stmts.push(ln.s);
    }
    if (!stmts.length) return top ? fail(lines[i - 1] || first, 'el script no tiene ningún paso que dé un valor (la última línea es el valor)') : null;
    return stmts.length === 1 ? stmts[0] : `line(${stmts.join(S)})`;
  }
  try {
    const body = block(0, true);
    if (i < lines.length) fail(lines[i], 'esta línea queda fuera del programa: revisa la sangría (el programa va con sangría, debajo de la firma)');
    out.body = body;
    // las funciones locales se ven entre ellas (no enumerable: el estado del dibujo se compara con JSON.stringify y esto haria un ciclo)
    for (const g of Object.values(out.lib)) Object.defineProperty(g.fn, 'lib', { value: out.lib, enumerable: false });
    return out;
  } catch (e) {
    if (!e.script) throw e;
    return { ...out, err: e.message };
  }
}

// Ayuda de un script: las lineas «#» que siguen a la firma (como en MATLAB y Python). '' si no tiene.
export function scriptHelp(src) {
  const lines = String(src ?? '').split('\n'), out = [];
  for (let i = 1; i < lines.length; i++) { const t = lines[i].trim(); if (!t) { if (out.length) break; continue; } if (!t.startsWith('#')) break; out.push(t.replace(/^#+\s?/, '')); }
  return out.join('\n');
}
