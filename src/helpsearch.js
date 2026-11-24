// Buscador de la ayuda (sin DOM): de un conjunto de unidades de texto (un punto de una lista, un parrafo, una fila de una tabla de funciones)
// saca las que contienen todas las palabras (sin distinguir mayusculas ni tildes), ordenadas por relevancia, y prepara el fragmento que se muestra.
// Una unidad: { ch, chTitle, topic, text, key?, row? }: capitulo y tema donde esta, su texto, y para una fila de tabla, su primera celda (el nombre).

// Texto sin tildes ni mayusculas, con el indice del caracter original de cada caracter del resultado (para marcar en el texto original)
export function normMap(s) {
  let n = '';
  const map = [];
  let i = 0;
  for (const ch of s) {
    const d = ch.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    for (let k = 0; k < d.length; k++) map.push(i);
    n += d;
    i += ch.length;
  }
  return { n, map };
}
export const norm = (s) => normMap(s).n;
export const wordsOf = (q) => norm(q).split(/\s+/).filter(Boolean);

const count = (hay, w) => { let c = 0, i = hay.indexOf(w); while (i >= 0 && c < 20) { c++; i = hay.indexOf(w, i + w.length); } return c; };
const startsWord = (hay, w) => new RegExp('(^|[^a-z0-9])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(hay);

// 0 si falta alguna palabra (en el texto, el tema o el capitulo); si no, mas es mejor
export function scoreUnit(words, u) {
  const t = u._n ?? (u._n = norm(u.text)), tp = u._t ?? (u._t = norm(u.topic || '')), c = u._c ?? (u._c = norm(u.chTitle || '')), k = u._k ?? (u._k = norm(u.key || ''));
  let s = 0;
  for (const w of words) {
    const inT = t.includes(w), inTp = tp.includes(w), inC = c.includes(w);
    if (!inT && !inTp && !inC) return 0;
    if (inT) s += 4 + Math.min(count(t, w), 5) + (startsWord(t, w) ? 3 : 0);
    if (inTp) s += 14;
    if (inC) s += 6;
    if (k) { if (k === w) s += 60; else if (k.startsWith(w)) s += 30; else if (k.includes(w)) s += 14; }
  }
  if (words.length > 1 && t.includes(words.join(' '))) s += 12; // la frase tal cual, junta
  return s / Math.sqrt(1 + t.length / 400); // a igual coincidencia, mejor la unidad corta (mas precisa)
}
export function search(units, query, limit = 400) {
  const words = wordsOf(query);
  if (!words.length) return { words, hits: [] };
  const hits = [];
  for (const u of units) { const s = scoreUnit(words, u); if (s > 0) hits.push({ u, s }); }
  hits.sort((a, b) => b.s - a.s);
  return { words, hits: hits.slice(0, limit), total: hits.length };
}

// El fragmento de un texto alrededor de la primera coincidencia, como trozos { t, m }: m = true si va marcado
export function snippet(text, words, width = 170) {
  const { n, map } = normMap(text);
  const ranges = [];
  for (const w of words) { for (let i = n.indexOf(w); i >= 0; i = n.indexOf(w, i + w.length)) ranges.push([map[i], map[i + w.length - 1] + 1]); }
  ranges.sort((a, b) => a[0] - b[0]);
  const first = ranges.length ? ranges[0][0] : 0;
  let a = Math.max(0, first - Math.floor(width / 3)), b = Math.min(text.length, a + width);
  if (b - a < width) a = Math.max(0, b - width);
  if (a > 0) { const sp = text.indexOf(' ', a); if (sp >= 0 && sp < first) a = sp + 1; } // sin cortar una palabra a la izquierda
  if (b < text.length) { const sp = text.lastIndexOf(' ', b); if (sp > first + 1) b = sp; }
  const out = [];
  let pos = a;
  for (const [s, e] of ranges) {
    if (e <= pos) continue;
    if (s >= b) break;
    const s2 = Math.max(s, pos), e2 = Math.min(e, b);
    if (s2 > pos) out.push({ t: text.slice(pos, s2), m: false });
    out.push({ t: text.slice(s2, e2), m: true });
    pos = e2;
  }
  if (pos < b) out.push({ t: text.slice(pos, b), m: false });
  if (a > 0) out.unshift({ t: '…', m: false });
  if (b < text.length) out.push({ t: '…', m: false });
  return out;
}
