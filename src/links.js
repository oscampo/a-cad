// Enlaces de los textos (Markdown «[texto](destino)», «[texto][ref]», «<https://...>», «<correo@dominio>»): que destino es y si
// se puede abrir. Sin DOM: main.js los abre (ver openLink alli).
// Destinos permitidos:
//  - web: http:// y https:// (en otra pestaña o, en la app instalada, en el navegador del sistema). «www.algo» se toma como https.
//  - correo (mailto:) y telefono (tel:): los abre la app de correo o de llamadas.
//  - ancla «#nombre»: el id de un elemento del dibujo (t17, g94, p5...) o un titulo de un texto («## Gráficas» se alcanza con
//    #graficas, #Gráficas o #gráficas: se comparan sin tildes, mayusculas, espacios ni signos); centra la vista en el.
//  - otro dibujo .json del repositorio de GitHub configurado, con ruta relativa a su carpeta («cicloide.json», «sub/a.json»,
//    «../otra/b.json», «/raiz.json» desde la raiz del repositorio); con «#nombre» al final, ademas va a ese lugar.
// Todo lo demas (javascript:, data:, file:, rutas a otros archivos...) no se abre: un dibujo compartido es contenido ajeno, y la app
// guarda el token de GitHub en el dispositivo.

const dec = (s) => { try { return decodeURIComponent(s); } catch (e) { return s; } };

// Que es un destino: { kind: 'web'|'mail'|'tel'|'anchor'|'file'|'bad', href, label, anchor, path, why }.
export function linkTarget(raw) {
  const u = String(raw ?? '').trim();
  if (!u || u === '#') return { kind: 'bad', label: '(sin destino)', why: 'El enlace no tiene destino' };
  if (u[0] === '#') { const a = dec(u.slice(1)).trim(); return { kind: 'anchor', anchor: a, label: a }; }
  const sch = /^([a-z][a-z0-9+.-]*):/i.exec(u);
  if (sch) {
    const s = sch[1].toLowerCase();
    if (s === 'http' || s === 'https') {
      let url;
      try { url = new URL(u); } catch (e) { return { kind: 'bad', label: u, why: 'La dirección no es válida' }; }
      if (!url.hostname) return { kind: 'bad', label: u, why: 'La dirección no es válida' };
      const rest = (url.pathname === '/' ? '' : dec(url.pathname)) + (url.search || '') + (url.hash ? dec(url.hash) : '');
      return { kind: 'web', href: url.href, host: url.host, label: url.host + rest };
    }
    if (s === 'mailto') {
      const addr = dec(u.slice(7)).split('?')[0].trim();
      return addr ? { kind: 'mail', href: u, label: addr } : { kind: 'bad', label: u, why: 'El correo no tiene dirección' };
    }
    if (s === 'tel') {
      const n = dec(u.slice(4)).trim();
      if (!/^\+?[\d\s().-]{3,}$/.test(n)) return { kind: 'bad', label: u, why: 'El número de teléfono no es válido' };
      return { kind: 'tel', href: 'tel:' + n.replace(/[\s().-]/g, ''), label: n };
    }
    return { kind: 'bad', label: u, why: `No se abren enlaces «${s}:» (solo web, correo, teléfono, lugares del dibujo y dibujos .json)` };
  }
  if (u.startsWith('//')) return { kind: 'bad', label: u, why: 'Escribe la dirección completa, con https://' };
  if (/^www\.[^\s/]+\.[^\s/]+/i.test(u)) return linkTarget('https://' + u);
  const k = u.indexOf('#'), p = dec(k >= 0 ? u.slice(0, k) : u).trim(), a = k >= 0 ? dec(u.slice(k + 1)).trim() : '';
  if (/\.json$/i.test(p)) return { kind: 'file', path: p, anchor: a, label: p.split('/').pop() + (a ? ' #' + a : '') };
  return { kind: 'bad', label: u, why: 'Solo se abren páginas web (https://…), correo, teléfono, lugares del dibujo (#…) y dibujos .json' };
}

// Ruta de un .json enlazado dentro del repositorio: relativa a la carpeta configurada (dir), o a la raiz si empieza con «/».
// null si se sale del repositorio con «..».
export function resolveRepoPath(dir, rel) {
  const out = String(rel).startsWith('/') ? [] : String(dir || '').split('/').filter(Boolean);
  for (const seg of String(rel).split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') { if (!out.length) return null; out.pop(); } else out.push(seg);
  }
  return out.length ? out.join('/') : null;
}

// Para comparar anclas y titulos: sin tildes, sin mayusculas, solo letras y numeros («## Gráficas !!!» -> «graficas»).
export const anchorKey = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

// Titulos («# » a «###### ») de un texto, fuera de los bloques de codigo.
export function headingsOf(text) {
  const out = [];
  let fence = null;
  for (const ln of String(text ?? '').split('\n')) {
    const f = /^ {0,3}(`{3,}|~{3,})/.exec(ln);
    if (f) { if (!fence) fence = f[1][0]; else if (f[1][0] === fence) fence = null; continue; }
    if (fence) continue;
    const m = /^[ \t]{0,3}#{1,6}[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/.exec(ln);
    if (m && m[1]) out.push(m[1]);
  }
  return out;
}

const COLS = [['texts', 'tx'], ['pts', 'pt'], ['lines', 'ln'], ['circles', 'ci'], ['arcs', 'ar'], ['ellipses', 'el'], ['splines', 'sp'], ['hatches', 'ha'], ['graphs', 'gr']];
// A que lleva un ancla: { k, id } (k 'gr' es una grafica) o null. Primero el id exacto de un elemento; luego un titulo de un texto;
// por ultimo la primera linea de un texto («**Tu primera entrada**» se alcanza con #tu-primera-entrada).
export function findAnchor(doc, name) {
  const n = String(name ?? '').trim();
  if (!n) return null;
  for (const [c, k] of COLS) if (doc?.[c] && Object.prototype.hasOwnProperty.call(doc[c], n)) return { k, id: n };
  const want = anchorKey(n);
  if (!want) return null;
  const texts = Object.entries(doc?.texts || {});
  for (const [id, t] of texts) if (headingsOf(t.text).some((h) => anchorKey(h) === want)) return { k: 'tx', id };
  for (const [id, t] of texts) {
    const first = String(t.text ?? '').split('\n').find((l) => l.trim());
    if (first && anchorKey(first.replace(/^[ \t]*(?:#{1,6}|[-*+>]|\d+[.)])[ \t]+/, '')) === want) return { k: 'tx', id };
  }
  return null;
}
