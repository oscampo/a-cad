// Iconos de la app dentro de los textos: ![Linea](icon:line) dibuja el icono de la herramienta en la linea, a la altura de la letra y
// con el color del texto. Cada icono (un SVG de 24x24 de icons.js: Lucide o propio, trazo 2) se convierte a polilineas, asi que el
// lienzo y la exportacion (SVG y DXF) lo dibujan como cualquier otro trazo de un texto, sin codigo aparte.
// La fuente de los iconos se registra desde fuera (setIconSource, en main.js): icons.js importa los SVG de Lucide con «?raw» de Vite,
// que Node no entiende, y asi el Markdown y la maquetacion siguen funcionando en las pruebas sin el navegador.

let SRC = {};
const cache = new Map();
export function setIconSource(map) { SRC = map || {}; cache.clear(); }
export const hasIcon = (name) => typeof name === 'string' && Object.prototype.hasOwnProperty.call(SRC, name);
export const iconNames = () => Object.keys(SRC);

// Trazos del icono en su caja de 24x24 (y hacia abajo): [{ pts: [[x, y]...], fill, op }]. fill: relleno con el color del trazo (los
// puntos de «point», «palette»...); op: opacidad (las lineas de ayuda, mas tenues). Un relleno con otro color (el «hueco» del color de
// fondo del boton) no se puede reproducir sobre un fondo cualquiera y se omite. null si no existe.
export function iconStrokes(name) {
  if (!hasIcon(name)) return null;
  if (!cache.has(name)) cache.set(name, svgStrokes(SRC[name]));
  return cache.get(name);
}

const attrsOf = (s) => { const a = {}; for (const m of s.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) a[m[1]] = m[2]; return a; };
const num = (v, d = 0) => { const x = parseFloat(v); return Number.isFinite(x) ? x : d; };

export function svgStrokes(svg) {
  const out = [];
  const body = String(svg).replace(/<svg[^>]*>|<\/svg>/g, '');
  const groups = []; // opacidad heredada de un <g>
  for (const m of body.matchAll(/<(\/?)(g|path|circle|ellipse|rect|line|polyline|polygon)\b([^>]*?)\/?>/g)) {
    const [, close, tag, rest] = m;
    if (tag === 'g') { if (close) groups.pop(); else if (!m[0].endsWith('/>')) groups.push(num(attrsOf(rest).opacity, 1)); continue; }
    if (close) continue;
    const a = attrsOf(rest);
    if (a.stroke === 'none' && (!a.fill || a.fill === 'none')) continue;
    const fill = a.fill === 'currentColor';
    if (a.fill && a.fill !== 'none' && !fill && a.stroke === 'none') continue; // solo relleno de otro color: hueco
    const op = groups.reduce((s, o) => s * o, num(a.opacity, 1) * num(a['stroke-opacity'], 1));
    const add = (pts, closed) => { if (pts.length < 2) return; if (closed) pts.push(pts[0]); out.push({ pts, fill: fill && closed, ...(op < 1 ? { op } : {}) }); };
    if (tag === 'circle' || tag === 'ellipse') {
      const cx = num(a.cx), cy = num(a.cy), rx = num(tag === 'circle' ? a.r : a.rx), ry = num(tag === 'circle' ? a.r : a.ry);
      const n = Math.max(16, Math.ceil(Math.max(rx, ry) * 4));
      add(Array.from({ length: n }, (_, i) => [cx + rx * Math.cos((2 * Math.PI * i) / n), cy + ry * Math.sin((2 * Math.PI * i) / n)]), true);
    } else if (tag === 'rect') {
      const x = num(a.x), y = num(a.y), w = num(a.width), h = num(a.height);
      let rx = num(a.rx, NaN), ry = num(a.ry, NaN);
      if (!Number.isFinite(rx)) rx = Number.isFinite(ry) ? ry : 0;
      if (!Number.isFinite(ry)) ry = rx;
      rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2);
      if (!rx || !ry) add([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], true);
      else {
        const pts = [], q = (cx, cy, a0) => { for (let i = 0; i <= 6; i++) { const t = a0 + (Math.PI / 2) * (i / 6); pts.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]); } };
        q(x + w - rx, y + ry, -Math.PI / 2); q(x + w - rx, y + h - ry, 0); q(x + rx, y + h - ry, Math.PI / 2); q(x + rx, y + ry, Math.PI);
        add(pts, true);
      }
    } else if (tag === 'line') add([[num(a.x1), num(a.y1)], [num(a.x2), num(a.y2)]], false);
    else if (tag === 'polyline' || tag === 'polygon') {
      const v = (a.points || '').trim().split(/[\s,]+/).map(Number), pts = [];
      for (let i = 0; i + 1 < v.length; i += 2) pts.push([v[i], v[i + 1]]);
      add(pts, tag === 'polygon');
    } else if (tag === 'path') for (const sp of pathPolys(a.d || '')) add(sp.pts, sp.closed);
  }
  return out;
}

// Una ruta SVG (atributo d) a subrutas de polilineas: [{ pts, closed }]. Curvas de Bezier y arcos se aproximan con tramos cortos.
export function pathPolys(d) {
  const subs = [];
  let i = 0, cmd = '', cur = null, x = 0, y = 0, sx = 0, sy = 0, cx = null, cy = null, qx = null, qy = null;
  const skip = () => { while (i < d.length && /[\s,]/.test(d[i])) i++; };
  const isNum = () => { skip(); return i < d.length && /[-+.\d]/.test(d[i]); };
  const N = () => { skip(); const m = /^[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/.exec(d.slice(i)); if (!m) throw new Error('ruta'); i += m[0].length; return parseFloat(m[0]); };
  const F = () => { skip(); const c = d[i++]; return c === '1' ? 1 : 0; }; // banderas de arco: un solo digito, a veces pegadas («a2 2 0 011 1»)
  const to = (nx, ny) => { cur.push([nx, ny]); x = nx; y = ny; };
  const cubic = (x1, y1, x2, y2, x3, y3) => { const x0 = x, y0 = y; for (let k = 1; k <= 8; k++) { const t = k / 8, u = 1 - t; to(u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3); } };
  const quad = (x1, y1, x2, y2) => { const x0 = x, y0 = y; for (let k = 1; k <= 6; k++) { const t = k / 6, u = 1 - t; to(u * u * x0 + 2 * u * t * x1 + t * t * x2, u * u * y0 + 2 * u * t * y1 + t * t * y2); } };
  const arc = (rx, ry, phi, fa, fs, x2, y2) => {
    const x1 = x, y1 = y;
    if ((x1 === x2 && y1 === y2)) return;
    rx = Math.abs(rx); ry = Math.abs(ry);
    if (!rx || !ry) { to(x2, y2); return; }
    const p = (phi * Math.PI) / 180, c = Math.cos(p), s = Math.sin(p);
    const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2, x1p = c * dx + s * dy, y1p = -s * dx + c * dy;
    const L = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
    if (L > 1) { rx *= Math.sqrt(L); ry *= Math.sqrt(L); }
    const num2 = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p, den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
    const k = (fa === fs ? -1 : 1) * Math.sqrt(Math.max(0, num2 / den));
    const cxp = (k * rx * y1p) / ry, cyp = (-k * ry * x1p) / rx;
    const ccx = c * cxp - s * cyp + (x1 + x2) / 2, ccy = s * cxp + c * cyp + (y1 + y2) / 2;
    const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
    let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if (!fs && dt > 0) dt -= 2 * Math.PI; else if (fs && dt < 0) dt += 2 * Math.PI;
    const n = Math.max(4, Math.ceil((Math.abs(dt) / (Math.PI / 2)) * 6));
    for (let j = 1; j <= n; j++) {
      const t = t1 + (dt * j) / n, ex = rx * Math.cos(t), ey = ry * Math.sin(t);
      if (j === n) to(x2, y2); else to(c * ex - s * ey + ccx, s * ex + c * ey + ccy);
    }
  };
  const start = (nx, ny) => { cur = [[nx, ny]]; subs.push({ pts: cur, closed: false }); x = sx = nx; y = sy = ny; };
  try {
    while (i < d.length) {
      skip();
      if (i >= d.length) break;
      if (/[a-zA-Z]/.test(d[i])) cmd = d[i++];
      else if (!cmd) break;
      const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase(), ox = rel ? x : 0, oy = rel ? y : 0;
      if (C !== 'M' && C !== 'Z' && !cur) start(x, y);
      if (C === 'M') { start(N() + ox, N() + oy); cmd = rel ? 'l' : 'L'; cx = qx = null; continue; }
      if (C === 'Z') { cur.push([sx, sy]); subs.at(-1).closed = true; x = sx; y = sy; cur = null; cx = qx = null; continue; }
      if (C === 'L') to(N() + ox, N() + oy);
      else if (C === 'H') to(N() + ox, y);
      else if (C === 'V') to(x, N() + oy);
      else if (C === 'C') { const a1 = N() + ox, b1 = N() + oy, a2 = N() + ox, b2 = N() + oy, a3 = N() + ox, b3 = N() + oy; cubic(a1, b1, a2, b2, a3, b3); cx = a2; cy = b2; qx = null; continue; }
      else if (C === 'S') { const r1 = cx === null ? x : 2 * x - cx, s1 = cx === null ? y : 2 * y - cy, a2 = N() + ox, b2 = N() + oy, a3 = N() + ox, b3 = N() + oy; cubic(r1, s1, a2, b2, a3, b3); cx = a2; cy = b2; qx = null; continue; }
      else if (C === 'Q') { const a1 = N() + ox, b1 = N() + oy, a2 = N() + ox, b2 = N() + oy; quad(a1, b1, a2, b2); qx = a1; qy = b1; cx = null; continue; }
      else if (C === 'T') { const a1 = qx === null ? x : 2 * x - qx, b1 = qx === null ? y : 2 * y - qy, a2 = N() + ox, b2 = N() + oy; quad(a1, b1, a2, b2); qx = a1; qy = b1; cx = null; continue; }
      else if (C === 'A') { const rx = N(), ry = N(), ph = N(), fa = F(), fs = F(), a2 = N() + ox, b2 = N() + oy; arc(rx, ry, ph, fa, fs, a2, b2); }
      else break;
      cx = qx = null;
      if (!isNum() && i < d.length && !/[a-zA-Z]/.test(d[i])) break;
    }
  } catch { /* ruta mal formada: se queda con lo leido */ }
  return subs.filter((s) => s.pts.length > 1);
}
