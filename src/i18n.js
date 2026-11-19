// Idioma de la interfaz (por dispositivo: localStorage «a-cad-lang»). Las cadenas del programa estan escritas en español y el catalogo
// (i18n-en.js) las traduce al ingles: un texto exacto, o con huecos «{0}» (una cadena con datos: «Fila no válida «{0}»»).
// En el navegador, un observador del DOM traduce los textos y los atributos (title, aria-label, placeholder, data-hint) que aparecen o cambian,
// y conserva el original en español para volver a el. La ayuda y el manual (dlgH) siguen en español; los textos de los dibujos nunca se tocan.
import { EN } from './i18n-en.js';

const LS = 'a-cad-lang', LANGS = ['es', 'en'];
let lang = 'es';
export const getLang = () => lang;
export const LANG_LIST = LANGS;

// ---- catalogo: exactos y con huecos ----
const exact = new Map(), pats = [], frags = []; // frags: trozos de mensajes armados con «+» (clave con «~» delante en el catalogo), se reemplazan dentro del texto
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const norm = (s) => s.replace(/\s+/g, ' ');
for (const [es0, en0] of Object.entries(EN)) {
  if (es0[0] === '~') { frags.push(fragOf(es0.slice(1), en0)); continue; }
  const es = es0.trim(), en = en0.trim();
  if (/\{\d+\}/.test(es)) {
    const order = [];
    const re = new RegExp('^' + esc(norm(es)).replace(/\\\{(\d+)\\\}/g, (m, n) => { order.push(+n); return '([\\s\\S]*?)'; }) + '$');
    pats.push({ re, order, en });
  } else exact.set(norm(es), en);
}
pats.sort((a, b) => b.re.source.length - a.re.source.length); // primero los mas especificos
frags.sort((a, b) => b.len - a.len);

// Un trozo con datos («… y {0} más») se busca con una expresion; uno sin datos, como texto.
function fragOf(es, en) {
  if (!/\{\d+\}/.test(es)) return { len: es.length, apply: (t) => (t.includes(es) ? t.split(es).join(en) : t) };
  const order = [], re = new RegExp(esc(es).replace(/\\{(\d+)\\}/g, (m, n) => { order.push(+n); return '([^\n]+?)'; }), 'g');
  return { len: es.length, apply: (t) => t.replace(re, (...m) => en.replace(/\{(\d+)\}/g, (x, n) => { const i = order.indexOf(+n); return i >= 0 ? m[i + 1] : x; })) };
}
const cache = new Map();
// Traduce una cadena en español al idioma activo (sin cambios en español o si no esta en el catalogo).
export function tr(s) {
  if (lang === 'es' || typeof s !== 'string' || !s) return s;
  const lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0], core = norm(s.trim());
  if (!core) return s;
  let out = cache.get(core);
  if (out === undefined) {
    out = exact.get(core) ?? null;
    if (out === null) for (const p of pats) { const m = p.re.exec(core); if (m) { out = p.en.replace(/\{(\d+)\}/g, (x, n) => { const i = p.order.indexOf(+n); return i >= 0 ? tr(m[i + 1]) : x; }); break; } }
    if (out === null) { // trozos de mensajes armados con «+», y despues cada parte de «Línea (L) · toca de nuevo…» por su lado
      let t = core, hit = false;
      for (const f of frags) { const u = f.apply(t); if (u !== t) { t = u; hit = true; } }
      if (t.includes(' · ')) { const ps = t.split(' · '), tp = ps.map((x) => tr(x)); if (tp.some((x, k) => x !== ps[k])) { t = tp.join(' · '); hit = true; } }
      if (hit) out = t;
    }
    cache.set(core, out);
  }
  return out === null ? s : lead + out + trail;
}

// ---- DOM ----
const ATTRS = ['title', 'aria-label', 'placeholder', 'data-hint'];
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE', 'SVG', 'CANVAS']);
const textOrig = new WeakMap(), attrOrig = new WeakMap();
let obs = null;
const inHelp = (el) => !!el.closest?.('#dlgH, [data-i18n="skip"]');
const skipped = (el) => !el || el.nodeType !== 1 ? false : SKIP_TAGS.has(el.tagName.toUpperCase()) || inHelp(el); // para el texto
const attrSkipped = (el) => !el || el.nodeType !== 1 ? true : ['SCRIPT', 'STYLE'].includes(el.tagName.toUpperCase()) || inHelp(el); // los atributos (title, placeholder...) tambien se traducen en campos de formulario

function doText(n) {
  const p = n.parentElement; if (!p || skipped(p)) return;
  const rec = textOrig.get(n);
  if (rec && n.nodeValue === rec.en) return; // lo escribimos nosotros
  const en = tr(n.nodeValue);
  if (en !== n.nodeValue) { textOrig.set(n, { es: n.nodeValue, en }); n.nodeValue = en; } else if (rec) textOrig.delete(n);
}
function doAttrs(el) {
  if (attrSkipped(el)) return;
  for (const a of ATTRS) {
    const v = el.getAttribute?.(a); if (v == null) continue;
    let rec = attrOrig.get(el); if (rec?.[a] && rec[a].en === v) continue;
    const en = tr(v);
    if (en !== v) { rec = rec || {}; rec[a] = { es: v, en }; attrOrig.set(el, rec); el.setAttribute(a, en); } else if (rec?.[a]) delete rec[a];
  }
}
function doTree(root) {
  if (root.nodeType === 3) return doText(root);
  if (root.nodeType !== 1 || inHelp(root)) return;
  doAttrs(root);
  for (const el of root.querySelectorAll('*')) doAttrs(el);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) doText(n);
}
function undoTree(root) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) { const r = textOrig.get(n); if (r) { if (n.nodeValue === r.en) n.nodeValue = r.es; textOrig.delete(n); } }
  for (const el of root.querySelectorAll('*')) { const r = attrOrig.get(el); if (!r) continue; for (const a of Object.keys(r)) if (el.getAttribute(a) === r[a].en) el.setAttribute(a, r[a].es); attrOrig.delete(el); }
}
function watch() {
  if (obs || typeof MutationObserver === 'undefined') return;
  obs = new MutationObserver((ms) => {
    for (const m of ms) {
      if (m.type === 'childList') m.addedNodes.forEach(doTree);
      else if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') doAttrs(m.target);
    }
  });
  obs.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}

// ---- dialogos nativos: alert / confirm / prompt ----
let wrapped = false;
function wrapDialogs() {
  if (wrapped || typeof window === 'undefined') return;
  wrapped = true;
  for (const f of ['alert', 'confirm']) { const o = window[f]?.bind(window); if (o) window[f] = (m) => o(tr(String(m ?? ''))); }
  const op = window.prompt?.bind(window); if (op) window.prompt = (m, d) => op(tr(String(m ?? '')), d);
}

// Cambia el idioma: guarda la eleccion, el atributo lang y retraduce la pagina.
export function setLang(l, persist = true) {
  l = LANGS.includes(l) ? l : 'es';
  const dom = typeof document !== 'undefined' && !!document.body;
  if (l === lang && (!dom || document.documentElement.lang === l)) return;
  lang = l; cache.clear();
  if (persist) try { localStorage.setItem(LS, l); } catch (e) { /* sin almacenamiento */ }
  if (!dom) return;
  document.documentElement.lang = l;
  wrapDialogs();
  if (l === 'es') { undoTree(document.body); const t = document.documentElement.dataset.titleEs; if (t) document.title = t; }
  else { watch(); doTree(document.body); document.documentElement.dataset.titleEs ||= document.title; document.title = tr(document.documentElement.dataset.titleEs); }
  document.dispatchEvent(new CustomEvent('langchange', { detail: l }));
}

// Al arrancar: el idioma guardado en este dispositivo (español si no hay).
export function initLang() {
  let l = null;
  try { l = localStorage.getItem(LS); } catch (e) { /* sin almacenamiento */ }
  if (!LANGS.includes(l)) l = null;
  setLang(l || 'es', false);
}
