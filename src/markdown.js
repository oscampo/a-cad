// Markdown en los textos (sin DOM): lo que va fuera de las formulas ($...$) admite un subconjunto de Markdown.
// En linea: **negrita**, *cursiva* o _cursiva_, ***negrita y cursiva***, ~~tachado~~ y `codigo` (monoespaciada).
// Por linea (al comienzo): «# », «## », «### » titulos; «- », «* » o «+ » viñeta; «1. » o «1) » lista numerada (dos espacios
// de sangria por nivel); «> » cita; «---» (o «***», «___») sola en la linea es una raya horizontal.
// «\» antes de uno de esos signos lo deja tal cual: «\*». El _ dentro de una palabra no es cursiva (mi_archivo).
// Las marcas no cruzan una formula: «**a $x$ b**» no es negrita (se pone «**a** $x$ **b**»).

const ESC = '\\`*_~#>+-.)[]!|';
// ¿Puede llevar Markdown? Si no, el texto se dibuja como siempre.
export const hasMd = (s) => typeof s === 'string' && (/[*_~`\\]/.test(s) || /^[ \t]*(#{1,3} |[-*+] |\d+[.)] |> ?|(?:-{3,}|\*{3,}|_{3,})[ \t]*$)/m.test(s));

// Tramos de una cadena: [{ s, b, it, st, code }].
export function mdInline(s) {
  const out = [];
  const push = (t, st) => { if (!t) return; const l = out.at(-1); if (l && l.b === st.b && l.it === st.it && l.st === st.st && l.code === st.code) l.s += t; else out.push({ s: t, ...st }); };
  const ws = (c) => c === undefined || /\s/.test(c);
  const word = (c) => c !== undefined && /[\p{L}\p{N}]/u.test(c);
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
  const run = (from, to, st) => {
    let i = from;
    while (i < to) {
      const c = s[i];
      if (c === '\\' && i + 1 < to && ESC.includes(s[i + 1])) { push(s[i + 1], st); i += 2; continue; }
      if (c === '`') { const k = s.indexOf('`', i + 1); if (k > 0 && k < to && k > i + 1) { push(s.slice(i + 1, k), { ...st, code: true }); i = k + 1; continue; } }
      if (c === '~' && s[i + 1] === '~' && !ws(s[i + 2])) { const k = close('~~', i + 2, to); if (k > 0 && k + 2 <= to) { run(i + 2, k, { ...st, st: true }); i = k + 2; continue; } }
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
//  h: level 1-3; ul/ol: level de sangria (1, 2...), mark (la viñeta o el numero); quote: level (cuantos «>»).
export function mdBlock(line) {
  let m = /^[ \t]*(?:-{3,}|\*{3,}|_{3,})[ \t]*$/.exec(line);
  if (m) return { kind: 'hr' };
  m = /^[ \t]*(#{1,3}) (.*)$/.exec(line);
  if (m) return { kind: 'h', level: m[1].length, rest: m[2] };
  m = /^((?:[ \t]*>[ \t]?)+)(.*)$/.exec(line);
  if (m) return { kind: 'quote', level: (m[1].match(/>/g) || []).length, rest: m[2] };
  m = /^( *)([-*+]|\d+[.)]) (.*)$/.exec(line);
  if (m) return { kind: /\d/.test(m[2]) ? 'ol' : 'ul', level: 1 + Math.floor(m[1].length / 2), mark: /\d/.test(m[2]) ? m[2] : ['•', '◦', '▪'][Math.floor(m[1].length / 2) % 3], rest: m[3] };
  return { kind: 'p', rest: line };
}

export const H_SIZE = [1, 1.6, 1.35, 1.15]; // altura de un titulo # ## ### (en alturas de texto)
