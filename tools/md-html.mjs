// Markdown del manual (docs/*.md) -> HTML de la ayuda de la app. Solo lo que usan los capitulos: titulos, parrafos, listas, tablas,
// reglas, negrita, cursiva, codigo, enlaces y <br>/<u>. Sin dependencias; lo usa tools/build-help.mjs.
const GH = 'https://github.com/oscampo/a-cad/blob/main/'; // los enlaces a archivos del repositorio («../CHANGELOG.md») apuntan a GitHub
// La carpeta del capitulo que se convierte (docs/ o docs/en/): un enlace «../x» se resuelve desde ella hasta la raiz del repositorio
let DIR = ['docs'];
export const setDir = (d) => { DIR = d; };
const resolveUp = (u) => { const parts = DIR.slice(); const rest = u.split('/'); while (rest[0] === '..') { rest.shift(); parts.pop(); } return parts.concat(rest).join('/'); };
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (s) => esc(s).replace(/"/g, '&quot;');

// Una linea de navegacion entre capitulos («← 10. Estilo · Índice · 12. Atajos →») solo sirve en GitHub
export const isNav = (l) => /^\[(←|Índice)/.test(l.trim()) && /\]\([^)]*\)\s*$/.test(l.trim());

export function inline(src) {
  const codes = [];
  let s = src.replace(/(`+)\s?([\s\S]*?[^`])\s?\1(?!`)/g, (_, _q, c) => { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
  s = s.replace(/<br\s*\/?>/gi, '\u0001').replace(/<(\/?)u>/gi, '\u0002$1\u0002');
  s = esc(s);
  s = s.replace(/\\([|*_`\\])/g, (_, c) => '\u0003' + c.charCodeAt(0) + '\u0003'); // escapes de Markdown
  s = s.replace(/\*\*([^*]+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<i>$2</i>');
  s = s.replace(/!\[([^\]]*)\]\(([^)]*)\)/g, '$1').replace(/\[([^\]]+)\]\(([^)]*)\)/g, (_, t, u0) => { const u = u0.startsWith('../') ? GH + resolveUp(u0) : u0; return (/^https?:/.test(u) ? `<a href="${attr(u.replace(/&amp;/g, '&'))}" target="_blank" rel="noopener">${t}</a>` : t); });
  s = s.replace(/\u0001/g, '<br>').replace(/\u0002(\/?)\u0002/g, '<$1u>').replace(/\u0003(\d+)\u0003/g, (_, n) => '&#' + n + ';');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => '<code>' + esc(codes[+i]) + '</code>');
}

const cells = (l) => { const t = l.trim().replace(/^\|/, '').replace(/\|$/, ''), out = []; let cur = ''; for (let i = 0; i < t.length; i++) { if (t[i] === '\\' && t[i + 1] === '|') { cur += '\\|'; i++; } else if (t[i] === '|') { out.push(cur.trim()); cur = ''; } else cur += t[i]; } out.push(cur.trim()); return out; };
const isSep = (l) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l) && l.includes('-');

// Bloques de un trozo de Markdown -> HTML (parrafos, listas, tablas)
export function blocks(lines) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim() || /^-{3,}\s*$/.test(l.trim()) || isNav(l) || /^<!--.*-->\s*$/.test(l.trim())) { i++; continue; }
    if (/^```/.test(l)) { const body = []; i++; while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++]); i++; out.push('<pre>' + esc(body.join('\n')) + '</pre>'); continue; }
    if (/^\s*\|/.test(l) && i + 1 < lines.length && isSep(lines[i + 1])) {
      const head = cells(l); i += 2; const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(cells(lines[i++]));
      out.push(`<table class="fref"><thead><tr>${head.map((h) => `<th>${inline(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('')}</tbody></table>`);
      continue;
    }
    const hd = /^#{3,6}\s+(.*)$/.exec(l); // un subtema («### Cerca de una linea»): un titulo pequeño dentro del tema
    if (hd) { out.push('<h4>' + inline(hd[1].trim()) + '</h4>'); i++; continue; }
    const li = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(l);
    if (li) {
      const ord = /\d/.test(li[2]), items = [];
      while (i < lines.length) {
        const m = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(lines[i]);
        if (m && (/\d/.test(m[2]) === ord)) { items.push(m[3]); i++; while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*]|\d+\.)\s/.test(lines[i])) items[items.length - 1] += ' ' + lines[i++].trim(); }
        else if (!lines[i].trim() && i + 1 < lines.length && new RegExp('^\\s*' + (ord ? '\\d+\\.' : '[-*]') + '\\s').test(lines[i + 1])) i++;
        else break;
      }
      const tag = ord ? 'ol' : 'ul';
      out.push(`<${tag}>${items.map((x) => '<li>' + inline(x) + '</li>').join('')}</${tag}>`);
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^#{3,6}\s/.test(lines[i]) && !/^```/.test(lines[i]) && !/^\s*([-*]|\d+\.)\s/.test(lines[i]) && !(/^\s*\|/.test(lines[i]) && i + 1 < lines.length && isSep(lines[i + 1])) && !isNav(lines[i]) && !/^-{3,}\s*$/.test(lines[i].trim())) para.push(lines[i++].trim());
    out.push('<p>' + inline(para.join(' ')) + '</p>');
  }
  return out.join('\n');
}

// Un capitulo -> { title, intro, topics: [{ h, html }] }: el titulo (sin «7. »), el texto antes del primer «##» y un tema por cada «##»
export function parseChapter(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  while (/^<!--.*-->\s*$/.test(lines[0] || '')) lines.shift(); // el resumen del español de una traduccion (build-help.mjs)
  let title = '', i = 0;
  if (/^#\s/.test(lines[0] || '')) { title = lines[0].replace(/^#\s+(\d+\.\s+)?/, '').trim(); i = 1; }
  const intro = [], topics = [];
  let cur = null;
  for (; i < lines.length; i++) {
    const h = /^##\s+(.*)$/.exec(lines[i]);
    if (h) { cur = { h: h[1].trim(), lines: [] }; topics.push(cur); } else (cur ? cur.lines : intro).push(lines[i]);
  }
  return { title, intro: blocks(intro), topics: topics.map((t) => ({ h: t.h, html: blocks(t.lines) })) };
}
export const chapterHtml = (md, id) => {
  const { title, intro, topics } = parseChapter(md);
  return `<details data-ch="${id}"><summary>${inline(title)}</summary>\n${intro}\n${topics.map((t) => `<details><summary>${inline(t.h)}</summary>\n${t.html}\n</details>`).join('\n')}\n</details>`;
};

// La estructura de un capitulo (para comprobar que una traduccion lo sigue): temas, filas de tabla, puntos de lista y bloques de codigo
export const shape = (md) => {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  return {
    topics: lines.filter((l) => /^## /.test(l)).length,
    rows: lines.filter((l) => /^\s*\|/.test(l)).length,
    items: lines.filter((l) => /^\s*([-*]|\d+\.)\s/.test(l)).length,
    codes: (md.match(/^```/gm) || []).length,
  };
};
