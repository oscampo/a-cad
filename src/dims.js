// Geometria de las cotas (lineas de extension, flechas, posicion editable). Sin DOM.
// layoutDim devuelve instrucciones de dibujo en pixeles de pantalla; dragDim cambia la
// posicion de la cota (k.off, k.lt, k.ang, k.lp) sin tocar la geometria ni el solver.
import { lineLine, signedAngle, norm, TAU, inSweep, closestOnPolyline } from './geom.js';
import { arcOf, arcSamples, splinePolyline, ellipsePolyline } from './model.js';
import { localNum, sciFrom, sciText } from './locale.js';
import { parseUnit, unitsVersion } from './units.js';

// Cabeza de flecha segun ASME Y14.2: largo = altura de las cifras de cota (12 px por 12 px de letra) y base = largo / 3 (3:1),
// recta y rellena. ARROW_W: la mitad de la base.
export const ARROW = 12; const ARROW0 = ARROW; export const ARROW_HW = 1 / 6; // media base = largo / 6
// Tamaño de la letra de una cota (k.fs, en px; por defecto 12): flechas y separaciones escalan con ella
export const DIM_FS = 12;
export const dimGain = (k) => (k?.fs > 0 ? k.fs / DIM_FS : 1);
// Cotas con la letra de los textos (doc.dimText, en Configuracion): la altura va en unidades del dibujo, como la de un texto
// (k.th, o la del documento, doc.dimH) y todo escala con el zoom. Sin el ajuste, k.fs en px de pantalla (como antes).
export const DIM_H0 = 3.5; // altura por defecto (unidades del dibujo) si el documento no tiene una
export const dimH = (doc, k) => (k?.th > 0 ? k.th : doc?.dimH > 0 ? doc.dimH : DIM_H0);
export const dimGainV = (doc, k, view) => (doc?.dimText ? (dimH(doc, k) * view.s) / DIM_FS : dimGain(k));
export const DIAM = '\u2300'; // simbolo de diametro (U+2300)
// El simbolo \u2300 se dibuja como vector y no con el glifo de la fuente: cada fuente lo trae de otra altura (o lo pide a otra fuente), y la norma
// (ISO 129-1, UNE 1-039) lo quiere de la altura de las cifras de la cota. H = altura de las cifras; el trazo oblicuo ocupa exactamente H
// (de la linea base a la altura de las cifras) y el circulo es un poco menor, de modo que el trazo lo atraviesa y sobresale.
export const diamGeom = (H) => ({ H, w: 0.9 * H, r: 0.45 * H, dx: 0.21 * H, lw: Math.max(0.8, 0.12 * H), gap: 0.16 * H });
export const fmtNum = (v) => (Math.abs(v) >= sciFrom() && Number.isFinite(v) ? sciText(v) : localNum(Math.abs(v) >= 1000 ? String(Number(v.toFixed(1))) : String(Math.round(v * 1000) / 1000))); // con coma decimal (doc.decimal), «0,333»; sin «.0» en los miles (1000, no 1000.0); desde el umbral de Configuracion, «2.569e5»

const V = (view) => (p) => ({ x: p.x * view.s + view.ox, y: view.oy - p.y * view.s });

function footOnLine(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1;
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  return { x: a.x + t * dx, y: a.y + t * dy };
}

// Puntos que acota una distancia (DIST: 2 puntos; DISTPL: punto y su pie sobre la recta).
function distEnds(doc, k) {
  if (k.t === 'DIST') return [doc.pts[k.refs[0]], doc.pts[k.refs[1]]];
  const p = doc.pts[k.refs[0]], l = doc.lines[k.refs[1]];
  return [p, footOnLine(p, doc.pts[l.a], doc.pts[l.b])];
}

// ---- cota angular ----
// Dos rectas forman 4 sectores (a, 180-a, a, 180-a). k.v es el angulo "verdadero" que ve el solver (con
// signo, de la direccion de la 1.a recta a la de la 2.a); k.s1 y k.s2 (+1/-1) eligen con que semirrecta de
// cada recta se acota, es decir en que sector se coloca la cota. El valor que se muestra es siempre
// positivo (0 a 180): el del sector elegido. Mover la cota a otro sector cambia el valor mostrado
// (20 o 160) sin tocar la geometria.
// Angulo continuo: una cota con k.cur (grados, sin limite: 400 es una vuelta y 40°) y k.sg (+1 antihorario, -1 horario,
// el sentido en que se mide desde la 1.a semirrecta hasta la 2.a). Es la medida de siempre, pero sin el tope de 180°:
// las conductoras guardan el valor que pusiste y las de referencia (solo lectura) lo siguen de un cambio al siguiente
// tomando siempre el equivalente mas cercano al ultimo (trackAngles), asi pasan de 180° a 190° y a 400°.
// Sin k.cur (dibujos viejos) se muestra el valor de 0 a 180 como antes.
const normA = (a) => { while (a > Math.PI) a -= TAU; while (a <= -Math.PI) a += TAU; return a; };
const normD = (a) => { while (a > 180) a -= 360; while (a <= -180) a += 360; return a; };
export function angSector(doc, k) {
  const l1 = doc.lines[k.refs[0]], l2 = doc.lines[k.refs[1]];
  const a1 = doc.pts[l1.a], b1 = doc.pts[l1.b], a2 = doc.pts[l2.a], b2 = doc.pts[l2.b];
  const d1 = { x: b1.x - a1.x, y: b1.y - a1.y }, d2 = { x: b2.x - a2.x, y: b2.y - a2.y };
  const V0 = lineLine(a1, b1, a2, b2);
  const A = k.ref ? signedAngle(d1, d2) : ((k.v || 0) * Math.PI) / 180;
  let s1 = k.s1 === -1 ? -1 : 1, s2 = k.s2 === -1 ? -1 : 1;
  if (!k.s1 && !k.s2 && V0) {
    // por defecto las semirrectas que apuntan hacia donde estan los segmentos: asi las lineas de extension
    // unen los segmentos con el arco
    const m1 = { x: (a1.x + b1.x) / 2 - V0.x, y: (a1.y + b1.y) / 2 - V0.y }, m2 = { x: (a2.x + b2.x) / 2 - V0.x, y: (a2.y + b2.y) / 2 - V0.y };
    s1 = m1.x * d1.x + m1.y * d1.y >= 0 ? 1 : -1;
    s2 = m2.x * d2.x + m2.y * d2.y >= 0 ? 1 : -1;
  }
  const phi = normA(A + Math.PI * ((s2 < 0 ? 1 : 0) - (s1 < 0 ? 1 : 0)));
  let val = (Math.abs(phi) * 180) / Math.PI, psi = phi;
  if (k.cur !== undefined) {
    const sg = k.sg === -1 ? -1 : 1, m = (sg * phi * 180) / Math.PI; // medida en el sentido de la cota, de -180 a 180
    val = k.ref ? k.cur + normD(m - k.cur) : k.cur; // referencia: el equivalente mas cercano al ultimo valor
    psi = (sg * (val % 360) * Math.PI) / 180; // lo que se dibuja (el arco puede pasar de 180°)
  }
  return { V0, d1, d2, s1, s2, phi, psi, val, A };
}
// Da a una cota angular (conductora o de referencia) su valor continuo, con la medida y el sentido actuales.
export function initAngle(doc, k) {
  const S = angSector(doc, { ...k, cur: undefined, sg: undefined });
  k.sg = S.phi < 0 ? -1 : 1; k.cur = S.val;
}
// Despues de cada solucion: las cotas angulares de referencia siguen la medida sin saltar al volver de 180° a 0°.
export function trackAngles(doc) {
  for (const k of Object.values(doc.cons)) {
    if (k.t !== 'ANG' || !k.ref) continue;
    if (k.cur === undefined) initAngle(doc, k); else k.cur = angSector(doc, k).val;
  }
}
// Valor verdadero (grados, para k.v) que corresponde a un valor positivo del sector que se muestra.
export function angTrue(doc, k, valDeg) {
  const S = angSector(doc, k);
  const sg = k.cur !== undefined ? (k.sg === -1 ? -1 : 1) : S.phi < 0 ? -1 : 1;
  return (normA(sg * (valDeg * Math.PI) / 180 - Math.PI * ((S.s2 < 0 ? 1 : 0) - (S.s1 < 0 ? 1 : 0))) * 180) / Math.PI;
}

// Valor que muestra una cota. Las de referencia (k.ref) no restringen nada: miden en vivo.
// ANG4 (angulo entre dos segmentos de puntos) se acota como un angulo entre dos lineas virtuales.
const v4 = (doc, k) => ({
  d: { ...doc, lines: { ...doc.lines, __v1: { a: k.refs[0], b: k.refs[1] }, __v2: { a: k.refs[2], b: k.refs[3] } } },
  k: { ...k, t: 'ANG', refs: ['__v1', '__v2'] },
});
export function dimValue(doc, k) {
  if (k.t === 'ANG4') { const x = v4(doc, k); return dimValue(x.d, x.k); }
  if (k.t === 'ANG') return angSector(doc, k).val;
  if (!k.ref) return k.v;
  if (k.t === 'DIST' || k.t === 'DISTPL') { const [p1, p2] = distEnds(doc, k); return Math.hypot(p2.x - p1.x, p2.y - p1.y); }
  if (k.t === 'RAD') { const o = doc.circles[k.refs[0]] || doc.arcs[k.refs[0]]; return o ? o.r : k.v; }
  return k.v;
}

// Cota a escala: «4[*10]» da un dibujo de 4*10 = 40 unidades con la cota «4» (k.scale = 10: el dibujo mide el valor por la escala).
// La etiqueta lleva la medida real (la del dibujo entre la escala) y va subrayada (ISO 129, UNE 1-039). Solo en distancias, radios y diametros.
export const dimScale = (k) => (k.t !== 'ANG' && k.t !== 'ANG4' && k.scale > 0 && k.scale !== 1 ? k.scale : 1);
// Una escala de representacion (k.srep: con unidades, «30'kN[*1'mm/kN]») no es «fuera de escala»: la cota no va subrayada.
export const isScaledDim = (k) => dimScale(k) !== 1 && !k.srep;
// Etiqueta libre al final: «50["D"]», «50[$D/2$]», «50[$$\\frac{D}{2}$$]», combinable con la escala: «30[*k]["F"]». La cota sigue midiendo
// (y gobernando) lo mismo: la etiqueta solo cambia lo que se muestra. -> { body, lbl } (lbl con sus comillas o sus $, o undefined).
const LBL_RE = /^([\s\S]*?)\s*\[\s*("[^"]*"|“[^”]*”|\$\$[\s\S]*?\$\$|\$[^$]*\$)\s*\]\s*$/;
export function splitLabel(src) {
  const m = LBL_RE.exec(String(src ?? ''));
  return m ? { body: m[1], lbl: m[2].replace(/^“|”$/g, '"') } : { body: String(src ?? '') };
}
export const lblIsMath = (lbl) => typeof lbl === 'string' && lbl[0] === '$';
export const lblPlain = (lbl) => String(lbl).replace(/^"|"$/g, '').replace(/^\$\$?|\$\$?$/g, ''); // el texto de la etiqueta, sin comillas ni $
// «valor[*k]» -> { body: 'valor', src: 'k', scale: k }: k es un numero (scale) o una formula con cotas y variables (src; quien llama la evalua).
// Sin corchetes, { body }; con la escala vacia o un numero que no vale, { body, err }.
export function splitScale(src) {
  const m = /^([\s\S]*?)\s*\[\s*\*\s*([^\]]*?)\s*\]\s*$/.exec(String(src ?? ''));
  if (!m) return { body: String(src ?? '') };
  if (!m[2]) return { body: m[1], err: 'La escala debe ser un número mayor que cero, p. ej. 4[*10]' };
  if (/^[-+]?(\d+([.,]\d+)?|[.,]\d+)$/.test(m[2])) { // un numero simple
    const k = Number(m[2].replace(',', '.'));
    if (!(k > 0)) return { body: m[1], err: 'La escala debe ser un número mayor que cero, p. ej. 4[*10]' };
    return { body: m[1], src: m[2], scale: k };
  }
  return { body: m[1], src: m[2] }; // formula: «30[*k]», «4[*2*D1]»
}

// Donde esta la etiqueta de una cota (en el dibujo), para ordenarla en la pagina como a un texto (orden de lectura). layoutDim trabaja en pixeles
// de pantalla: con una escala enorme, sus desplazamientos fijos en pixeles se vuelven despreciables.
export function dimPos(doc, k) {
  try {
    const S = 1e4, L = layoutDim(doc, k, { s: S, ox: 0, oy: 0 });
    if (L.label) return { x: L.label.x / S, y: -L.label.y / S, len: String(L.label.text).length };
  } catch (e) { /* referencias rotas: se usa el primer punto */ }
  const p = doc.pts?.[k.refs?.[0]];
  return { x: p ? p.x : 0, y: p ? p.y : 0, len: 3 };
}

// Unidad de la etiqueta de una cota (k.du: «in», «kN», «V»): el dibujo mide lo real (una longitud en mm, otra magnitud en el SI, como
// «2'cm» mide 20) y la etiqueta lo dice en esa unidad («126'in» mide 3200,4 y dice «126 in»). { f: factor al SI, d: dimension,
// g: unidades del dibujo por unidad } o null (sin unidad, o una que ya no se entiende).
export const isLenDim = (d) => !!d && d[0] === 1 && d.slice(1).every((x) => x === 0);
const UCACHE = new Map();
export function dimUnit(du) {
  if (!du) return null;
  if (UCACHE.ver !== unitsVersion()) { UCACHE.clear(); UCACHE.ver = unitsVersion(); } // cambiaron las unidades de usuario
  if (!UCACHE.has(du)) {
    let u = null;
    try { const p = parseUnit(du); u = { f: p.f, d: p.d, g: p.f * (isLenDim(p.d) ? 1000 : 1) }; } catch (e) { /* unidad que no se entiende: sin unidad */ }
    UCACHE.set(du, u);
  }
  return UCACHE.get(du);
}
// El valor que dice la etiqueta (sin el simbolo R o ⌀): la medida (diametro en circulos) entre la escala, en la unidad de la cota.
export function dimShown(doc, k) {
  const v = dimValue(doc, k), w = k.t === 'RAD' && k.refs[0] in doc.circles ? 2 * v : v, u = dimUnit(k.du);
  return w / dimScale(k) / (u ? u.g : 1);
}

// Una cota de solo lectura no puede decir una medida del dibujo en otra magnitud (kN, V) sin una escala de representacion que la convierta
// (ni con una escala que no se pudo calcular, k.serr): su etiqueta dice ⚠.
export function dimUnreadable(k) {
  if (!k.ref) return false;
  if (k.serr) return true;
  const u = dimUnit(k.du);
  return !!(u && u.d && !isLenDim(u.d) && !k.srep);
}

// El valor de la cota como lo dice su etiqueta: { sym: el simbolo (⌀ o R, vacio si no lo lleva), q: el numero con su unidad }.
function dimBody(doc, k) {
  if (k.t === 'ANG4') { const x = v4(doc, k); return dimBody(x.d, x.k); }
  const v = dimValue(doc, k);
  if (k.t === 'ANG') return { sym: '', q: k.unit === 'rad' ? fmtNum((v * Math.PI) / 180) + ' rad' : fmtNum(v) + '°' };
  const tail = dimUnit(k.du) ? ' ' + k.du : '', q = (dimUnreadable(k) ? '⚠' : fmtNum(dimShown(doc, k))) + tail;
  return { sym: k.t === 'RAD' ? (k.refs[0] in doc.circles ? DIAM : 'R') : '', q };
}
// En una etiqueta libre entre comillas, «<>» es el valor de la cota (el numero con su unidad, sin el simbolo ⌀ o R): ["Diametro del acetabulo : <>"].
export const LBL_VALUE = '<>';
export function dimText(doc, k) {
  if (k.lbl) {
    if (lblIsMath(k.lbl)) return k.lbl; // una formula no sustituye el valor
    const t = lblPlain(k.lbl);
    return k.t !== 'LEAD' && t.includes(LBL_VALUE) ? t.split(LBL_VALUE).join(dimBody(doc, k).q) : t;
  }
  if (k.t === 'LEAD') return '…'; // sin etiqueta: se ve (y se puede tocar) // etiqueta libre: «D» o una formula ($…$, la dibuja quien llama)
  const { sym, q } = dimBody(doc, k);
  return sym + q;
}

// ---- Lineas indicativas (anotaciones): { t: 'LEAD', refs: [punto, elemento], lbl, ox, oy, fs, color, ltype, w }
// La punta va en el punto; la etiqueta, a (ox, oy) de el (unidades del dibujo), asi sigue a la geometria. El solver no la ve.
const PON = { PONL: 1, PONC: 1, PONS: 1, PONE: 1 };
// ¿El punto pertenece al elemento? Un extremo, el centro, un punto de control, un punto «sobre» (restriccion) o que cae en el.
export function pointOnElement(doc, pid, el) {
  const P = doc.pts[pid]; if (!P) return false;
  const o = doc.lines[el] || doc.circles[el] || doc.arcs[el] || doc.ellipses?.[el] || doc.splines?.[el];
  if (!o) return false;
  if ([o.a, o.b, o.c, o.p1, o.p2, ...(o.pts || [])].includes(pid)) return true;
  if (Object.values(doc.cons || {}).some((k) => PON[k.t] && k.refs[0] === pid && k.refs[1] === el)) return true;
  const tol = 1e-6 * (1 + Math.abs(P.x) + Math.abs(P.y));
  if (doc.lines[el]) { const A = doc.pts[o.a], B = doc.pts[o.b], L = Math.hypot(B.x - A.x, B.y - A.y); return L > 0 && Math.abs((B.x - A.x) * (A.y - P.y) - (A.x - P.x) * (B.y - A.y)) / L <= tol; }
  if (doc.circles[el] || doc.arcs[el]) { const C = doc.pts[o.c]; return Math.abs(Math.hypot(P.x - C.x, P.y - C.y) - o.r) <= tol; }
  const poly = doc.splines?.[el] ? splinePolyline(doc, o, 64) : ellipsePolyline(doc, o, 720);
  return (closestOnPolyline(poly, P)?.d ?? Infinity) <= 1e-3 * (1 + Math.abs(P.x) + Math.abs(P.y));
}
// ¿El punto es un extremo del elemento? Entonces el elemento mismo es el cuerpo de la linea indicativa (k.on): la flecha va en ese
// extremo, en la direccion de la curva, y la etiqueta junto al otro extremo. Un circulo, una elipse entera o un spline cerrado no tienen.
export function endOfElement(doc, pid, el) {
  const l = doc.lines[el] || doc.arcs[el]; if (l) return l.a === pid || l.b === pid;
  const sp = doc.splines?.[el]; if (sp) return !sp.closed && (sp.pts[0] === pid || sp.pts[sp.pts.length - 1] === pid);
  const e = doc.ellipses?.[el]; if (e) return !!(e.p1 && e.p2) && (e.p1 === pid || e.p2 === pid);
  return false;
}
export const leadBody = (doc, k) => (k.on ? doc.lines[k.refs[1]] || doc.arcs[k.refs[1]] || doc.splines?.[k.refs[1]] || doc.ellipses?.[k.refs[1]] || null : null);
// Los elementos que son cuerpo de una linea indicativa (no se cortan con laser)
export const leadBodies = (doc) => new Set(Object.values(doc.cons || {}).filter((k) => k.t === 'LEAD' && k.on).map((k) => k.refs[1]));
// Poligonal del cuerpo (unidades del dibujo) desde el otro extremo hasta la punta
function bodyPath(doc, k) {
  const [pid, el] = k.refs, P = doc.pts[pid];
  const l = doc.lines[el];
  let poly = l ? [doc.pts[l.a], doc.pts[l.b]] : doc.arcs[el] ? arcSamples(doc, doc.arcs[el]) : doc.splines?.[el] ? splinePolyline(doc, doc.splines[el], 16) : doc.ellipses?.[el] ? ellipsePolyline(doc, doc.ellipses[el], 180) : null;
  if (!P || !poly || poly.length < 2 || poly.some((q) => !q)) return null;
  const d = (q) => Math.hypot(q.x - P.x, q.y - P.y);
  return d(poly[0]) < d(poly[poly.length - 1]) ? [...poly].reverse() : poly;
}
// Direccion hacia afuera en el extremo final de una poligonal de pantalla (su ultimo tramo de al menos 1 px)
function outDir(S) {
  const E = S[S.length - 1];
  for (let i = S.length - 2; i >= 0; i--) { const dx = E.x - S[i].x, dy = E.y - S[i].y, d = Math.hypot(dx, dy); if (d >= 1 || i === 0) return d > 1e-9 ? { x: dx / d, y: dy / d } : { x: 1, y: 0 }; }
  return { x: 1, y: 0 };
}
// Extremos del cuerpo en pantalla: la punta T (con su direccion u) y el otro extremo F (con la suya, uf)
function bodyEnds(doc, k, v) {
  const poly = bodyPath(doc, k); if (!poly) return null;
  const S = poly.map(v);
  return { T: S[S.length - 1], u: outDir(S), F: S[0], uf: outDir([...S].reverse()) };
}

// ---- Etiqueta de la linea indicativa: un texto en unidades del dibujo (k.h), como los textos, anclado (k.anchor) a un punto.
// Con cuerpo, ese punto (k.at) es un extremo o el medio de una recta, un arco o un arco eliptico ('a', 'b', 'm'), o uno de
// los puntos de un spline por su indice ('i0', 'i1'…); sin cuerpo, la etiqueta va a (ox, oy) de la punta. La flecha mide segun la altura.
export const LEAD_GAP = 0.25; // separacion entre el punto y la caja del texto, en alturas
export const leadText = (k) => (k.lbl ? (lblIsMath(k.lbl) ? k.lbl : lblPlain(k.lbl)) : '…');
// Los lugares donde puede ir la etiqueta de una linea indicativa con cuerpo: [{ key, name, P }]
export function leadSpots(doc, k) {
  const el = k.refs[1], out = [], pt = (id) => doc.pts[id];
  const l = doc.lines[el], ar = doc.arcs[el], e = doc.ellipses?.[el], sp = doc.splines?.[el];
  if (l || ar) {
    const a = pt(l ? l.a : ar.a), b = pt(l ? l.b : ar.b);
    let m;
    if (l) m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    else { const c = pt(ar.c), g = arcOf(doc, ar), t = g.a0 + g.sweep / 2; m = { x: c.x + ar.r * Math.cos(t), y: c.y + ar.r * Math.sin(t) }; }
    out.push({ key: 'a', name: 'extremo ' + (l ? l.a : ar.a), P: a }, { key: 'm', name: 'punto medio', P: m }, { key: 'b', name: 'extremo ' + (l ? l.b : ar.b), P: b });
  } else if (e && e.p1 && e.p2) {
    const P = ellipsePolyline(doc, e, 180);
    out.push({ key: 'a', name: 'extremo ' + e.p1, P: pt(e.p1) }, { key: 'm', name: 'punto medio', P: P[P.length >> 1] }, { key: 'b', name: 'extremo ' + e.p2, P: pt(e.p2) });
  } else if (sp) sp.pts.forEach((id, i) => out.push({ key: 'i' + i, name: 'punto ' + id, P: pt(id) }));
  return out.filter((x) => x.P);
}
// Lugar por defecto: el otro extremo (no la punta)
export function leadAtDefault(doc, k) {
  const el = k.refs[1], tip = k.refs[0], l = doc.lines[el] || doc.arcs[el], e = doc.ellipses?.[el], sp = doc.splines?.[el];
  if (l) return l.a === tip ? 'b' : 'a';
  if (e) return e.p1 === tip ? 'b' : 'a';
  if (sp) return sp.pts[0] === tip ? 'i' + (sp.pts.length - 1) : 'i0';
  return 'a';
}
// Anclaje por defecto: el texto sigue la direccion de la curva en el otro extremo (a la derecha si sale hacia la derecha…)
export function leadAnchorDefault(doc, k) {
  if (!k.on) return 'mc';
  const poly = bodyPath(doc, k); if (!poly) return 'bl';
  const S = [...poly].reverse();
  let u = outDir(S); // en unidades del dibujo (y hacia arriba)
  if (k.at === 'm') { // en el punto medio el texto va al lado de la recta (arriba, o a la derecha si es vertical), no sobre ella
    let n = { x: -u.y, y: u.x };
    if (n.y < -1e-9 || (Math.abs(n.y) <= 1e-9 && n.x < 0)) n = { x: -n.x, y: -n.y };
    u = n;
  }
  return (u.y > 0.38 ? 'b' : u.y < -0.38 ? 't' : 'm') + (u.x > 0.38 ? 'l' : u.x < -0.38 ? 'r' : 'c');
}
const SX = { l: 1, c: 0, r: -1 }, SY = { b: 1, m: 0, t: -1 };
// Donde va el texto (unidades del dibujo): su punto de insercion P (con la separacion), el anclaje, la altura y su caja aproximada
export function leadLabelPlace(doc, k, h0) {
  const h = k.h > 0 ? k.h : h0, text = leadText(k), anchor = k.anchor || leadAnchorDefault(doc, k);
  let P;
  if (k.on) {
    const spots = leadSpots(doc, k), at = k.at ?? leadAtDefault(doc, k), q = (spots.find((x) => x.key === at) || spots[0])?.P;
    if (!q) return null;
    const g = LEAD_GAP * h; P = { x: q.x + SX[anchor[1]] * g, y: q.y + SY[anchor[0]] * g };
  } else {
    const T = doc.pts[k.refs[0]]; if (!T) return null;
    P = { x: T.x + (k.ox ?? 2 * h), y: T.y + (k.oy ?? 1.6 * h) };
  }
  const w = 0.6 * h * lblLen(text) + 0.3 * h, hh = 1.15 * h; // caja aproximada (el dibujo mide la real)
  return { P, anchor, h, text, w, hh, C: { x: P.x + (SX[anchor[1]] * w) / 2, y: P.y + (SY[anchor[0]] * hh) / 2 } };
}

// Lo que se teclea como etiqueta de una linea indicativa: «"texto"», «$formula$», «$$formula$$» (tambien entre corchetes, como en una
// cota) o texto suelto, que se toma como «"texto"». null si queda vacia.
export function leadLabel(src) {
  let t = String(src ?? '').trim();
  const m = /^\[([\s\S]*)\]$/.exec(t); if (m) t = m[1].trim();
  if (!t) return null;
  if (/^"[^"]*"$|^“[^”]*”$/.test(t)) return t.replace(/^“|”$/g, '"');
  if (/^\$\$[\s\S]+\$\$$|^\$[^$]+\$$/.test(t)) return t;
  return '"' + t.replace(/"/g, '\u201D') + '"';
}
// Desplazamiento inicial de la etiqueta: 40 px a la derecha y 32 hacia arriba (por 12 px de letra), en unidades del dibujo
export const leadOffset0 = (view, g = 1) => ({ ox: (40 * g) / view.s, oy: (32 * g) / view.s }); // g: crece con la letra
const lblLen = (t) => String(lblIsMath(t) ? lblPlain(t) : t).length;

function layoutDimBase(doc, k, view) {
  const s = view.s, v = V(view), G = dimGainV(doc, k, view), ARROW = ARROW0 * G; // G: tamaño de la letra de la cota respecto de 12 px (flechas y separaciones con ella)
  const out = { lines: [], arcs: [], arrows: [], label: null };
  const text = dimText(doc, k);

  if (k.t === 'LEAD') { // la etiqueta, un texto en unidades del dibujo; la flecha, con la altura del texto
    const Lp = leadLabelPlace(doc, k, DIM_FS / s); if (!Lp) return out;
    const Ps = v(Lp.P), C = v(Lp.C);
    // la flecha es la de las cotas (ASME Y14.2, 3:1): con la letra de las cotas del documento (px de pantalla, o unidades del dibujo
    // con «Cotas con la letra de los textos»), no con la altura de la etiqueta ni con el grosor de la linea
    const len = ARROW0 * dimGainV(doc, {}, view), hw = len * ARROW_HW; // la del documento: un fs o th propio de la linea indicativa no cuenta
    out.label = { x: Ps.x, y: Ps.y, text: Lp.text, model: true, h: Lp.h, anchor: Lp.anchor, ...(k.font ? { font: k.font } : {}) };
    if (k.on) { // el elemento es el cuerpo: flecha en la punta, en la direccion de la curva
      const B = bodyEnds(doc, k, v); if (!B) return out;
      out.arrows.push({ x: B.T.x, y: B.T.y, dx: B.u.x, dy: B.u.y, len, hw }); // la punta toca el punto (ASME), sin adelantarla
      return out;
    }
    const T = v(doc.pts[k.refs[0]]), dx = T.x - C.x, dy = T.y - C.y, d = Math.hypot(dx, dy); // sin cuerpo: recta desde el borde de la caja
    const bw = (Lp.w * s) / 2 + 2, bh = (Lp.hh * s) / 2 + 2;
    const cut = Math.min(dx ? bw / Math.abs(dx) : Infinity, dy ? bh / Math.abs(dy) : Infinity) * d;
    if (d > cut + len) {
      const u = { x: dx / d, y: dy / d };
      out.lines.push([C.x + u.x * cut, C.y + u.y * cut, T.x - u.x * len * 0.6, T.y - u.y * len * 0.6]);
      out.arrows.push({ x: T.x, y: T.y, dx: u.x, dy: u.y, len, hw });
    }
    return out;
  }

  if (k.t === 'DIST' || k.t === 'DISTPL') {
    const [p1, p2] = distEnds(doc, k);
    const A = v(p1), B = v(p2), L = Math.hypot(B.x - A.x, B.y - A.y);
    if (L < 1e-6) { out.label = { x: A.x + 16 * G, y: A.y - 16 * G, text }; return out; }
    const u = { x: (B.x - A.x) / L, y: (B.y - A.y) / L }, n = { x: -u.y, y: u.x };
    const off = (k.off ?? (16 * G) / s) * s, sg = off < 0 ? -1 : 1;
    const A2 = { x: A.x + n.x * off, y: A.y + n.y * off }, B2 = { x: B.x + n.x * off, y: B.y + n.y * off };
    if (Math.abs(off) > 7) {
      out.lines.push([A.x + n.x * sg * 3, A.y + n.y * sg * 3, A2.x + n.x * sg * 5, A2.y + n.y * sg * 5]);
      out.lines.push([B.x + n.x * sg * 3, B.y + n.y * sg * 3, B2.x + n.x * sg * 5, B2.y + n.y * sg * 5]);
    }
    const t = k.lt ?? 0.5;
    const lo = Math.min(0, t), hi = Math.max(1, t);
    const inside = L >= 2 * ARROW + 4;
    const tail = inside ? 0 : ARROW + 7;
    out.lines.push([A2.x + u.x * lo * L - u.x * tail, A2.y + u.y * lo * L - u.y * tail, A2.x + u.x * hi * L + u.x * tail, A2.y + u.y * hi * L + u.y * tail]);
    if (inside) {
      out.arrows.push({ x: A2.x, y: A2.y, dx: -u.x, dy: -u.y }, { x: B2.x, y: B2.y, dx: u.x, dy: u.y });
    } else {
      out.arrows.push({ x: A2.x, y: A2.y, dx: u.x, dy: u.y }, { x: B2.x, y: B2.y, dx: -u.x, dy: -u.y });
    }
    out.label = { x: A2.x + u.x * t * L + n.x * sg * 11 * G, y: A2.y + u.y * t * L + n.y * sg * 11 * G, text };
    return out;
  }

  if (k.t === 'ANG') {
    const l1 = doc.lines[k.refs[0]], l2 = doc.lines[k.refs[1]];
    const a1 = doc.pts[l1.a], b1 = doc.pts[l1.b], a2 = doc.pts[l2.a], b2 = doc.pts[l2.b];
    const S = angSector(doc, k), V0 = S.V0;
    if (!V0) {
      const m = v({ x: (a1.x + b1.x + a2.x + b2.x) / 4, y: (a1.y + b1.y + a2.y + b2.y) / 4 });
      out.label = { x: m.x + 14 * G, y: m.y - 14 * G, text };
      return out;
    }
    const th1 = Math.atan2(S.d1.y * S.s1, S.d1.x * S.s1), psi = S.psi, sgn = psi >= 0 ? 1 : -1;
    const R = Math.max(14 * G, (k.off ?? (50 * G) / s) * s);
    const C = v(V0);
    out.arcs.push({ cx: C.x, cy: C.y, r: R, a0: -th1, a1: -(th1 + psi), ccw: psi > 0 });
    const at = (th) => ({ x: C.x + R * Math.cos(th), y: C.y - R * Math.sin(th) });
    // flechas en los extremos del arco, apuntando hacia fuera del arco
    const tan = (th) => ({ x: -Math.sin(th), y: -Math.cos(th) }); // tangente en pantalla (th creciente en el modelo)
    const e1 = at(th1), e2 = at(th1 + psi), t1 = tan(th1), t2 = tan(th1 + psi);
    out.arrows.push({ x: e1.x, y: e1.y, dx: -sgn * t1.x, dy: -sgn * t1.y }, { x: e2.x, y: e2.y, dx: sgn * t2.x, dy: sgn * t2.y });
    // lineas de extension: prolongan cada recta hasta pasar el arco si no llega
    [[th1, a1, b1], [th1 + psi, a2, b2]].forEach(([th, pa_, pb_]) => {
      const ux = Math.cos(th), uy = Math.sin(th);
      const pa = ((pa_.x - V0.x) * ux + (pa_.y - V0.y) * uy) * s, pb = ((pb_.x - V0.x) * ux + (pb_.y - V0.y) * uy) * s;
      const near = Math.min(pa, pb), far = Math.max(pa, pb);
      // el arco queda mas alla del extremo del segmento: se prolonga la recta hasta pasarlo; si queda entre el
      // vertice y el segmento, se prolonga el segmento hacia el vertice
      if (far < R) { const from = Math.max(far, 0) + 3, to = R + 6; if (from < to) out.lines.push([C.x + ux * from, C.y - uy * from, C.x + ux * to, C.y - uy * to]); }
      else if (near > R) { const from = near - 3, to = Math.max(R - 6, 0); if (from > to) out.lines.push([C.x + ux * from, C.y - uy * from, C.x + ux * to, C.y - uy * to]); }
    });
    const thm = th1 + psi / 2;
    out.label = { x: C.x + (R + 13 * G) * Math.cos(thm), y: C.y - (R + 13 * G) * Math.sin(thm), text };
    return out;
  }

  if (k.t === 'RAD') {
    // Cotas de radio y diametro segun ANSI/ASME Y14.5: con el texto DENTRO, la linea de cota va por el
    // interior (diametro: de lado a lado con flecha en ambos extremos; radio: del centro al arco con una
    // flecha en el arco). Con el texto FUERA, una linea de llamada radial parte del arco con la flecha
    // tocandolo desde afuera y apuntando al centro, y termina en un tramo horizontal junto al texto.
    const circ = doc.circles[k.refs[0]], arc = circ ? null : doc.arcs[k.refs[0]];
    const o = circ || arc;
    if (!o) return out;
    const Cm = doc.pts[o.c], C = v(Cm), rs = o.r * s;
    let defAng = Math.PI / 4;
    if (arc) { const g = arcOf(doc, arc); defAng = g.a0 + g.sweep / 2; }
    let ang = k.ang ?? defAng;
    const tw = 0.6 * 12 * G * text.length + 8; // ancho aproximado del texto (px)
    let lp;
    if (k.lp !== undefined) lp = k.lp * s;
    else {
      const fits = circ ? 2 * rs >= tw + 2 * ARROW + 6 : rs >= tw + ARROW + 8;
      lp = fits ? (circ ? 0 : o.r * 0.5 * s) : rs + 26 * G; // por defecto dentro si cabe, fuera si no
    }
    if (lp < 0) { ang += Math.PI; lp = -lp; }
    const d = { x: Math.cos(ang), y: -Math.sin(ang) }, nrm = { x: -d.y, y: d.x };
    const P = { x: C.x + d.x * rs, y: C.y + d.y * rs };
    if (lp > rs + 2) {
      // texto fuera: llamada radial + tramo horizontal + texto
      const E = { x: C.x + d.x * lp, y: C.y + d.y * lp };
      const side = d.x >= 0 ? 1 : -1, E2 = { x: E.x + side * 10, y: E.y };
      out.lines.push([P.x, P.y, E.x, E.y], [E.x, E.y, E2.x, E2.y]);
      out.arrows.push({ x: P.x, y: P.y, dx: -d.x, dy: -d.y });
      out.label = { x: E2.x + side * (tw / 2 + 1), y: E2.y, text };
    } else {
      const L = { x: C.x + d.x * lp, y: C.y + d.y * lp };
      if (circ) {
        const P1 = { x: C.x - d.x * rs, y: C.y - d.y * rs };
        out.lines.push([P1.x, P1.y, P.x, P.y]);
        out.arrows.push({ x: P.x, y: P.y, dx: d.x, dy: d.y }, { x: P1.x, y: P1.y, dx: -d.x, dy: -d.y });
      } else {
        out.lines.push([C.x, C.y, P.x, P.y]);
        out.arrows.push({ x: P.x, y: P.y, dx: d.x, dy: d.y });
      }
      out.label = { x: L.x + nrm.x * 11 * G, y: L.y + nrm.y * 11 * G, text };
    }
    if (arc) {
      // si la cota cae fuera del tramo, prolonga el arco con una linea de extension
      const g = arcOf(doc, arc);
      if (!inSweep(Cm, g.a0, g.sweep, { x: Cm.x + Math.cos(ang), y: Cm.y + Math.sin(ang) }, 1e-6)) {
        const dd = norm(ang - g.a0), toEnd = dd - g.sweep, toStart = TAU - dd;
        if (toEnd <= toStart) out.arcs.push({ cx: C.x, cy: C.y, r: rs, a0: -(g.a0 + g.sweep), a1: -ang, ccw: true, dashed: true });
        else out.arcs.push({ cx: C.x, cy: C.y, r: rs, a0: -ang, a1: -(g.a0 + TAU), ccw: true, dashed: true });
      }
    }
    return out;
  }
  return out;
}

// Las cotas de referencia llevan la etiqueta en cursiva (label.italic).
export function layoutDim(doc, k, view) {
  if (k.t === 'ANG4') { const x = v4(doc, k); return layoutDim(x.d, x.k, view); }
  const L = layoutDimBase(doc, k, view);
  L.size = dimGainV(doc, k, view); // flechas y letra con el tamaño de la cota
  if (L.label) L.label.px = DIM_FS * L.size;
  if (L.label) { L.label.italic = !!k.ref; L.label.underline = isScaledDim(k); } // a escala: subrayada
  return L;
}

// El usuario arrastra la etiqueta: reposiciona la cota. Devuelve true si cambio algo.
export function dragDim(doc, k, view, p) {
  if (k.t === 'ANG4') {
    const x = v4(doc, k), ok = dragDim(x.d, x.k, view, p);
    for (const f of ['off', 'lt', 'ang', 'lp', 's1', 's2']) if (x.k[f] !== undefined) k[f] = x.k[f];
    return ok;
  }
  const s = view.s, v = V(view);
  if (k.t === 'LEAD' && k.on) { // la etiqueta salta al lugar permitido mas cercano (un extremo, el medio, un punto del spline)
    let best = null;
    for (const x of leadSpots(doc, k)) { const q = v(x.P), dd = Math.hypot(q.x - p.x, q.y - p.y); if (!best || dd < best.d) best = { d: dd, key: x.key }; }
    if (!best || best.key === (k.at ?? leadAtDefault(doc, k))) return false;
    k.at = best.key; return true;
  }
  if (k.t === 'LEAD') { const P = doc.pts[k.refs[0]]; if (!P) return false; const T = v(P); k.ox = (p.x - T.x) / s; k.oy = (T.y - p.y) / s; return true; }
  if (k.t === 'DIST' || k.t === 'DISTPL') {
    const [p1, p2] = distEnds(doc, k);
    const A = v(p1), B = v(p2), L = Math.hypot(B.x - A.x, B.y - A.y);
    if (L < 1e-6) return false;
    const u = { x: (B.x - A.x) / L, y: (B.y - A.y) / L }, n = { x: -u.y, y: u.x };
    const rx = p.x - A.x, ry = p.y - A.y;
    k.off = (rx * n.x + ry * n.y) / s;
    k.lt = Math.max(-1.5, Math.min(2.5, (rx * u.x + ry * u.y) / L));
    return true;
  }
  if (k.t === 'ANG') {
    const l1 = doc.lines[k.refs[0]], l2 = doc.lines[k.refs[1]];
    const V0 = lineLine(doc.pts[l1.a], doc.pts[l1.b], doc.pts[l2.a], doc.pts[l2.b]);
    if (!V0) return false;
    const C = v(V0);
    k.off = Math.max(14, Math.hypot(p.x - C.x, p.y - C.y) - 13) / s;
    // el sector donde cae la cota decide que angulo se acota (20 o 160, por ejemplo)
    const S = angSector(doc, k);
    const beta = Math.atan2(-(p.y - C.y), p.x - C.x), g1 = Math.atan2(S.d1.y, S.d1.x), g2 = Math.atan2(S.d2.y, S.d2.x);
    for (const s1 of [1, -1]) for (const s2 of [1, -1]) {
      const R1 = g1 + (s1 < 0 ? Math.PI : 0), R2 = g2 + (s2 < 0 ? Math.PI : 0);
      const phi = normA(R2 - R1), tb = normA(beta - R1);
      if (Math.abs(phi) < 1e-9 || Math.abs(phi) > Math.PI - 1e-9) continue;
      if (phi > 0 ? tb >= 0 && tb <= phi : tb <= 0 && tb >= phi) { k.s1 = s1; k.s2 = s2; }
    }
    if (k.cur !== undefined) initAngle(doc, k); // otro sector es otro angulo: empieza de nuevo (0 a 180) con la geometria igual
    return true;
  }
  if (k.t === 'RAD') {
    const o = doc.circles[k.refs[0]] || doc.arcs[k.refs[0]];
    if (!o) return false;
    const C = v(doc.pts[o.c]);
    const dx = p.x - C.x, dy = p.y - C.y, d = Math.hypot(dx, dy);
    if (d < 4) return false;
    k.ang = Math.atan2(-dy, dx);
    k.lp = d / s;
    return true;
  }
  return false;
}
