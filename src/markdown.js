// Markdown en los textos (sin DOM): lo que va fuera de las formulas ($...$) admite Markdown, el de markdown.org/basics mas tablas,
// notas al pie y avisos («callouts» de Obsidian/GitHub).
// En linea: **negrita**, *cursiva* o _cursiva_, ***negrita y cursiva***, ~~tachado~~, `codigo` (monoespaciada), [enlace](url),
// [enlace][ref] (con «[ref]: url» en otra linea), <https://...> y <correo@dominio>, ![imagen](url) (se muestra su texto
// alternativo: el dibujo no carga imagenes), ![Linea](icon:line) (el icono de esa herramienta de la app, ver iconpaths.js) y [^1]
// (llamada a una nota al pie).
// Por linea (al comienzo): «# » a «###### » titulos; «- », «* » o «+ » viñeta, «- [ ] » / «- [x] » tarea; «1. » o «1) » lista
// numerada (dos espacios de sangria por nivel); «> » cita; «> [!note] Titulo» aviso; «---» (o «***», «___») sola en la linea es
// una raya horizontal. Los bloques que abarcan varias lineas (codigo, tablas, notas) los arma mathlayout.js.
// «\» antes de un signo de puntuacion lo deja tal cual: «\*». El _ dentro de una palabra no es cursiva (mi_archivo).
// Las marcas no cruzan una formula: «**a $x$ b**» no es negrita (se pone «**a** $x$ **b**»).

import { hasIcon } from './iconpaths.js';

const ESC = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';
// ¿Puede llevar Markdown? Si no, el texto se dibuja como siempre.
export const hasMd = (s) => typeof s === 'string' && (
  /[*_~`\\]|\[[^\]\n]*\]\s*[([:]|\[\^[^\]\n]+\]|<(?:https?:|ftp:|mailto:|tel:|!--)|<[^\s@<>()]+@[^\s@<>()]+\.[A-Za-z]{2,}>/.test(s) ||
  /^[ \t]*(#{1,6}(?: |$)|[-*+] |\d+[.)] |> ?|(?:-{3,}|\*{3,}|_{3,})[ \t]*$|=+[ \t]*$)|^(?: {4}|\t)\S|^[ \t]*\|?[ \t]*:?-+:?[ \t]*\|/m.test(s));

const LINK_TARGET = /^\(\s*<?([^\s<>()]*(?:\([^\s()]*\)[^\s<>()]*)*)>?(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/;

// Tramos de una cadena: [{ s, b, it, st, code, link, img, sup }]. link es el destino del enlace (la url tal como se escribio;
// «mailto:» delante en un correo suelto, <correo@dominio>), para abrirlo al tocarlo (ver links.js).
// ctx: { refs: Map(ref en minusculas -> url), fn: (id) => numero de la nota al pie }.
export function mdInline(s, ctx = {}) {
  const out = [];
  const K = ['b', 'it', 'st', 'code', 'link', 'img', 'sup'];
  // dos enlaces seguidos a destinos distintos no se juntan en un tramo
  const push = (t, st) => { if (!t) return; const l = out.at(-1); if (l && !l.icon && K.every((k) => !!l[k] === !!st[k]) && (l.link || null) === (st.link || null)) l.s += t; else out.push({ s: t, ...st }); };
  const ws = (c) => c === undefined || /\s/.test(c);
  const word = (c) => c !== undefined && /[\p{L}\p{N}]/u.test(c);
  const refs = ctx.refs || new Map();
  // cierre de la marca d desde j: no precedido de espacio; para _ no seguido de letra; salta las marcas dobles al buscar la simple
  const close = (d, j, lim) => {
    for (; j < lim; j++) {
      if (s[j] === '\\') { j++; continue; }
      if (s[j] === '`') { const k = s.indexOf('`', j + 1); if (k > 0) { j = k; continue; } }
      if (!s.startsWith(d, j)) continue;
      if (d.length === 1 && s[j + 1] === d && !ws(s[j + 2])) { const k = close(d + d, j + 2, lim); if (k > 0) { j = k + 1; continue; } } // «*a **b** c*»
      if (ws(s[j - 1])) continue;
      if (d[0] === '_' && word(s[j + d.length])) continue;
      let e = j; while (s[e + d.length] === d[0] && e + 1 + d.length <= lim) e++; // «***x***»: el cierre más largo se toma desde su final
      return e;
    }
    return -1;
  };
  // «]» que cierra el «[» de i (con corchetes anidados, escapes y codigo)
  const bracket = (i, lim) => {
    for (let j = i + 1, dep = 0; j < lim; j++) {
      if (s[j] === '\\') { j++; continue; }
      if (s[j] === '`') { const k = s.indexOf('`', j + 1); if (k > 0 && k < lim) { j = k; continue; } }
      if (s[j] === '[') dep++;
      else if (s[j] === ']') { if (!dep) return j; dep--; }
    }
    return -1;
  };
  // un enlace que empieza en el «[» de i: { tEnd (su «]»), end (tras el enlace) } o null
  const linkAt = (i, lim) => {
    const k = bracket(i, lim);
    if (k < 0 || k === i + 1) return null;
    const m = LINK_TARGET.exec(s.slice(k + 1, lim));
    if (m) return { tEnd: k, end: k + 1 + m[0].length, url: m[1] };
    if (s[k + 1] === '[') {
      const j = s.indexOf(']', k + 2);
      if (j > 0 && j < lim) { const ref = (s.slice(k + 2, j) || s.slice(i + 1, k)).toLowerCase(); if (refs.has(ref)) return { tEnd: k, end: j + 1, url: refs.get(ref) }; }
    }
    const ref = s.slice(i + 1, k).toLowerCase();
    return refs.has(ref) ? { tEnd: k, end: k + 1, url: refs.get(ref) } : null;
  };
  const run = (from, to, st) => {
    let i = from;
    while (i < to) {
      const c = s[i];
      if (c === '\\' && i + 1 < to && ESC.includes(s[i + 1])) { push(s[i + 1], st); i += 2; continue; }
      if (c === '`') { const k = s.indexOf('`', i + 1); if (k > 0 && k < to && k > i + 1) { push(s.slice(i + 1, k), { ...st, code: true }); i = k + 1; continue; } }
      if (c === '~' && s[i + 1] === '~' && !ws(s[i + 2])) { const k = close('~~', i + 2, to); if (k > 0 && k + 2 <= to) { run(i + 2, k, { ...st, st: true }); i = k + 2; continue; } }
      if (c === '!' && s[i + 1] === '[') { const L = linkAt(i + 1, to); if (L) {
        // ![Linea](icon:line): el icono de la app (ver iconpaths.js), un tramo propio de un solo caracter (no se parte al ajustar la linea).
        // Tambien dentro de un enlace: [![Guardar](icon:save) guardar](#guardar)
        const ic = /^icon:([\w-]+)$/i.exec(L.url || ''), alt = s.slice(i + 2, L.tEnd).replace(/\\(.)/g, '$1');
        if (ic && hasIcon(ic[1])) { out.push({ s: '￼', ...st, icon: ic[1], alt }); i = L.end; continue; }
        if (!st.link) { push('▣ ' + s.slice(i + 2, L.tEnd).replace(/\\(.)/g, '$1'), { ...st, img: true }); i = L.end; continue; } } }
      if (c === '[') {
        if (s[i + 1] === '^' && ctx.fn) { const k = s.indexOf(']', i + 2); if (k > i + 2 && k < to && !/\s/.test(s.slice(i + 2, k))) { push(String(ctx.fn(s.slice(i + 2, k))), { ...st, sup: true }); i = k + 1; continue; } }
        if (!st.link) { const L = linkAt(i, to); if (L) { run(i + 1, L.tEnd, { ...st, link: L.url || '#' }); i = L.end; continue; } }
      }
      if (c === '<' && !st.link) {
        const m = /^<((?:https?|ftp|mailto|tel):[^\s<>]+|[^\s@<>()]+@[^\s@<>()]+\.[A-Za-z]{2,})>/.exec(s.slice(i, to));
        if (m) { push(m[1], { ...st, link: /^[a-z]+:/i.test(m[1]) ? m[1] : 'mailto:' + m[1] }); i += m[0].length; continue; }
      }
      if (c === '*' || c === '_') {
        const dbl = s[i + 1] === c, d = dbl ? c + c : c, n = d.length;
        if (!ws(s[i + n]) && !(c === '_' && word(s[i - 1]))) {
          const k = close(d, i + n, to);
          if (k > 0 && k + n <= to) { run(i + n, k, dbl ? { ...st, b: true } : { ...st, it: true }); i = k + n; continue; }
        }
      }
      push(c, st); i++;
    }
  };
  run(0, s.length, { b: false, it: false, st: false, code: false });
  return out;
}

// El comienzo de una linea: { kind: 'h'|'ul'|'ol'|'quote'|'hr'|'p', level, mark, rest }.
//  h: level 1-6; ul/ol: level de sangria (1, 2...), mark (la viñeta, la casilla de una tarea o el numero);
//  quote: level (cuantos «>»), callout (tipo de aviso, «> [!note] Titulo»; rest es entonces el titulo).
export function mdBlock(line) {
  let m = /^[ \t]*(?:-{3,}|\*{3,}|_{3,})[ \t]*$/.exec(line);
  if (m) return { kind: 'hr' };
  m = /^[ \t]*(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/.exec(line);
  if (m) return { kind: 'h', level: m[1].length, rest: m[2] ?? '' };
  m = /^((?:[ \t]*>[ \t]?)+)(.*)$/.exec(line);
  if (m) {
    const level = (m[1].match(/>/g) || []).length, c = /^\[!([A-Za-z][\w-]*)\][+-]?[ \t]*(.*)$/.exec(m[2]);
    return c ? { kind: 'quote', level, rest: c[2], callout: c[1].toLowerCase() } : { kind: 'quote', level, rest: m[2] };
  }
  m = /^( *)([-*+]|\d+[.)]) (.*)$/.exec(line);
  if (m) {
    const ol = /\d/.test(m[2]), level = 1 + Math.floor(m[1].length / 2);
    const task = !ol && /^\[([ xX])\](?:[ \t]+(.*)|$)/.exec(m[3]);
    if (task) return { kind: 'ul', level, mark: task[1] === ' ' ? '☐' : '☑', rest: task[2] ?? '', task: true };
    return { kind: ol ? 'ol' : 'ul', level, mark: ol ? m[2] : ['•', '◦', '▪'][(level - 1) % 3], rest: m[3] };
  }
  return { kind: 'p', rest: line };
}

export const H_SIZE = [1, 1.6, 1.35, 1.15, 1.05, 1, 0.9]; // altura de un titulo # a ###### (en alturas de texto)
export const LINK_COLOR = '#2563eb';
export const MUTED_COLOR = '#6b7280';

// Avisos: «> [!tipo] Titulo». Sin titulo se muestra el nombre del tipo. Tipos de Obsidian y GitHub.
const CALLOUTS = {
  note: ['Nota', '#2563eb'], info: ['Información', '#0891b2'], todo: ['Pendiente', '#2563eb'],
  abstract: ['Resumen', '#0891b2'], summary: ['Resumen', '#0891b2'], tldr: ['Resumen', '#0891b2'],
  tip: ['Consejo', '#16a34a'], hint: ['Pista', '#16a34a'], important: ['Importante', '#7c3aed'],
  success: ['Hecho', '#16a34a'], check: ['Hecho', '#16a34a'], done: ['Hecho', '#16a34a'],
  question: ['Pregunta', '#ca8a04'], help: ['Ayuda', '#ca8a04'], faq: ['Preguntas', '#ca8a04'],
  warning: ['Advertencia', '#d97706'], caution: ['Precaución', '#d97706'], attention: ['Atención', '#d97706'],
  failure: ['Fallo', '#dc2626'], fail: ['Fallo', '#dc2626'], missing: ['Falta', '#dc2626'],
  danger: ['Peligro', '#dc2626'], error: ['Error', '#dc2626'], bug: ['Error', '#dc2626'],
  example: ['Ejemplo', '#7c3aed'], quote: ['Cita', MUTED_COLOR], cite: ['Cita', MUTED_COLOR],
};
export const calloutOf = (type) => {
  const c = CALLOUTS[type];
  return c ? { label: c[0], col: c[1] } : { label: type.charAt(0).toUpperCase() + type.slice(1), col: CALLOUTS.note[1] };
};
