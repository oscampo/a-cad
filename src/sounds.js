// Sonidos del dibujo: archivos de audio que viajan dentro del dibujo y se reproducen con play("nombre") (ver expr.js y datastore.js).
// doc.sounds = { nombre: { a: clave, ms: duracion, ... } } y los bytes van aparte, en doc.assets (dataURL), como los de las imagenes (ver images.js):
// dos sonidos iguales comparten los datos y el historial de deshacer no los copia. Sin DOM.
//
// Para que un dibujo con sonidos siga pesando poco (se guarda en el .json y en GitHub), cada sonido se reduce al importarlo: un solo canal,
// 16 kHz y 8 bits (un WAV sin comprimir que decodifica cualquier navegador): unos 16 KB por segundo, con el sonido de una consola antigua.
import { hashStr } from './images.js';

export const SND_RATE = 16000; // Hz con que se guarda un sonido
export const SND_MAX_S = 60; // un sonido mas largo se rechaza (no es un efecto)
const NAME_RE = /^[\p{L}\p{N}_ -]{1,40}$/u;

// Un nombre de sonido valido (letras, numeros, _, - y espacios; hasta 40); el que se usa en play("nombre").
export function soundName(raw) {
  const n = String(raw ?? '').trim();
  if (!NAME_RE.test(n)) throw new Error(`«${n}» no sirve como nombre de sonido: letras, números, _, - y espacios, hasta 40 caracteres`);
  return n;
}
// Un nombre propuesto a partir del nombre de un archivo («tng_warp6_clean.wav» -> «tng_warp6_clean»)
export const suggestName = (file) => String(file ?? '').replace(/\.[A-Za-z0-9]{1,5}$/, '').replace(/[^\p{L}\p{N}_ -]+/gu, '_').slice(0, 40).trim() || 'sonido';

export function addSound(doc, name, dataUrl, info = {}) {
  const n = soundName(name), a = 's' + hashStr(dataUrl);
  (doc.assets ||= {})[a] = dataUrl;
  (doc.sounds ||= {})[n] = { a, ...info };
  return n;
}
export const soundSrc = (doc, name) => doc.assets?.[doc.sounds?.[name]?.a] || null;
export const hasSound = (doc, name) => !!soundSrc(doc, name);
export function removeSound(doc, name) {
  if (!doc.sounds) return;
  delete doc.sounds[name];
  if (!Object.keys(doc.sounds).length) delete doc.sounds;
}
// Las claves de doc.assets que usan los sonidos (images.js las suma a las de las imagenes al guardar)
export const soundAssetKeys = (doc) => new Set(Object.values(doc.sounds || {}).map((s) => s.a));
// Para la lista del cuadro de sonidos: [{ name, ms, bytes }] en orden alfabetico
export const soundList = (doc) => Object.entries(doc.sounds || {}).map(([name, s]) => ({ name, ms: s.ms || 0, bytes: Math.round(((doc.assets?.[s.a]?.length || 0) * 3) / 4) })).sort((a, b) => a.name.localeCompare(b.name, 'es'));

// ---- audio (matematica pura; en el navegador los canales vienen de decodeAudioData, en las pruebas de parseWav) ----
// Un solo canal: el promedio de los canales
export function toMono(chs) {
  if (chs.length === 1) return chs[0];
  const n = chs[0].length, out = new Float32Array(n);
  for (const c of chs) for (let i = 0; i < n; i++) out[i] += c[i] / chs.length;
  return out;
}
// Cambia la frecuencia de muestreo: al bajarla, cada muestra nueva es el promedio de lo que cubre (filtro de caja, contra el aliasing);
// al subirla, interpolacion lineal
export function resample(x, from, to) {
  if (from === to) return x;
  const n = Math.max(1, Math.floor((x.length * to) / from)), out = new Float32Array(n), r = from / to;
  for (let i = 0; i < n; i++) {
    if (r > 1) {
      const a = i * r, b = Math.min(x.length, (i + 1) * r);
      let s = 0, w = 0;
      for (let k = Math.floor(a); k < Math.ceil(b); k++) { const ov = Math.min(k + 1, b) - Math.max(k, a); s += x[k] * ov; w += ov; }
      out[i] = w ? s / w : 0;
    } else {
      const p = i * r, k = Math.floor(p), f = p - k;
      out[i] = x[k] * (1 - f) + (x[Math.min(k + 1, x.length - 1)] ?? 0) * f;
    }
  }
  return out;
}
// Un WAV de 8 bits sin signo, un canal. Con ruido triangular (dither) para que la cuantizacion no suene a arena.
export function wavBytes8(x, rate) {
  const n = x.length, out = new Uint8Array(44 + n), dv = new DataView(out.buffer);
  const tag = (o, s) => { for (let i = 0; i < s.length; i++) out[o + i] = s.charCodeAt(i); };
  tag(0, 'RIFF'); dv.setUint32(4, 36 + n, true); tag(8, 'WAVE'); tag(12, 'fmt '); dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, rate, true); dv.setUint32(28, rate, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true);
  tag(36, 'data'); dv.setUint32(40, n, true);
  let seed = 12345; const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; // determinista: el mismo sonido da los mismos bytes
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, x[i])) * 127 + (rnd() - rnd()) * 0.5; // dither de +-1/2 escalon
    out[44 + i] = Math.max(0, Math.min(255, Math.round(v + 128)));
  }
  return out;
}
export function bytesToDataUrl(bytes, mime = 'audio/wav') {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${mime};base64,` + btoa(s);
}
export function dataUrlBytes(url) {
  const b = atob(String(url).split(',')[1] || ''), out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}
// Los canales de un WAV de 8 o 16 bits sin comprimir: { rate, chs: [Float32Array] } (para las pruebas y para quien prepara sonidos sin navegador)
export function parseWav(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const str = (o, n) => String.fromCharCode(...bytes.subarray(o, o + n));
  if (str(0, 4) !== 'RIFF' || str(8, 4) !== 'WAVE') throw new Error('no es un WAV');
  let o = 12, fmt = null, data = null;
  while (o + 8 <= bytes.length) {
    const id = str(o, 4), len = dv.getUint32(o + 4, true);
    if (id === 'fmt ') fmt = { tag: dv.getUint16(o + 8, true), ch: dv.getUint16(o + 10, true), rate: dv.getUint32(o + 12, true), bits: dv.getUint16(o + 22, true) };
    else if (id === 'data') { data = { at: o + 8, len: Math.min(len, bytes.length - o - 8) }; break; }
    o += 8 + len + (len & 1);
  }
  if (!fmt || !data) throw new Error('WAV incompleto');
  if (fmt.tag !== 1 || (fmt.bits !== 8 && fmt.bits !== 16)) throw new Error('solo WAV sin comprimir de 8 o 16 bits');
  const bps = fmt.bits / 8, n = Math.floor(data.len / (bps * fmt.ch)), chs = Array.from({ length: fmt.ch }, () => new Float32Array(n));
  for (let i = 0; i < n; i++) for (let c = 0; c < fmt.ch; c++) {
    const p = data.at + (i * fmt.ch + c) * bps;
    chs[c][i] = fmt.bits === 16 ? dv.getInt16(p, true) / 32768 : (bytes[p] - 128) / 128;
  }
  return { rate: fmt.rate, chs };
}
// De los canales y la frecuencia de un sonido al que se guarda: { url, ms, bytes }
export function reduceSound(chs, rate) {
  const ms = Math.round((chs[0].length / rate) * 1000);
  if (ms > SND_MAX_S * 1000) throw new Error(`El sonido dura ${Math.round(ms / 1000)} s: se admiten hasta ${SND_MAX_S} s`);
  const wav = wavBytes8(resample(toMono(chs), rate, SND_RATE), SND_RATE);
  return { url: bytesToDataUrl(wav), ms, bytes: wav.length };
}
