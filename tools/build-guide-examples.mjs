// Los dibujos de ejemplo de las guias por tarea del manual (docs/guias.md): se arman aqui con la propia libreria de la app, se resuelven y se
// escriben en ejemplos/guias/<nombre>.json (español) y <nombre>.en.json (ingles). La ayuda los abre con «Abrir el ejemplo».
// Uso: npm run examples. Los comprueba test/guides.test.mjs (se abren, se resuelven y no tienen errores de calculo).
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { initSolver, solve } from '../src/solver.js';
import { newDoc, addPoint, addLine, addCircle, addCon, addText, addSpline, ensureNumbers } from '../src/model.js';
import { addRectangle, CLINE_STYLE } from '../src/shapes.js';
import { addRotary } from '../src/actuators.js';
import { addGraph } from '../src/graphs.js';
import { makeVector } from '../src/vectors.js';
import { circularArray } from '../src/edit.js';
import { filletCorner } from '../src/corners.js';
import { libPayload } from '../src/library.js';
import { parseWav, reduceSound, addSound } from '../src/sounds.js';
import { settle } from '../src/params.js';
import { viewNeeds } from '../src/examples.js';

const VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
const DIR = fileURLToPath(new URL('../ejemplos/guias/', import.meta.url));

// El sonido del ejemplo del contador: el WAV original (ejemplos/guias/aditional-files/ding.wav) reducido como lo hace la app al importar un audio
// (un canal, 16 kHz, 8 bits) e incrustado en el dibujo; al abrir el ejemplo la app lo copia a Archivo → Datos si no hay uno con ese nombre.
const dingSound = () => {
  const b = readFileSync(new URL('../ejemplos/guias/aditional-files/ding.wav', import.meta.url));
  const w = parseWav(new Uint8Array(b.buffer, b.byteOffset, b.byteLength));
  return reduceSound(w.chs, w.rate);
};

// Un texto suelto: esquina superior izquierda en (x, y) (el eje y sube)
const txt = (doc, x, y, text, h = 3.2) => addText(doc, addPoint(doc, x, y), text, { h, anchor: 'tl' });
const note = (doc, x, y, lines, h = 3) => lines.forEach((l, i) => txt(doc, x, y - i * h * 1.5, l, h));
const rectangle = (doc, x0, y0, w, h, style) => {
  const p = [addPoint(doc, x0, y0), addPoint(doc, x0 + w, y0), addPoint(doc, x0 + w, y0 + h), addPoint(doc, x0, y0 + h)];
  return { p, l: addRectangle(doc, p, style) };
};

// Como lo deja la app al dibujar (cur en main.js): lineas, circulos, arcos y splines siempre llevan color, tipo y grosor. Sin ellos la app los dibuja
// con grosor indefinido y no pinta el halo de seleccion (un spline sin w no se veia seleccionado).
const withStyle = (doc) => {
  for (const key of ['lines', 'circles', 'arcs', 'splines', 'ellipses']) for (const o of Object.values(doc[key] || {})) {
    if (o.color == null) o.color = 'auto';
    if (o.ltype == null) o.ltype = 'continua';
    if (o.w == null) o.w = 2;
    if (o.ls == null) o.ls = 1;
  }
  return doc;
};
// La biblioteca de ejemplo (el documento que la define); el dibujo que la usa lleva una copia de lo publico, como la deja «Insertar biblioteca…»
const geometryLib = (L) => {
  const d = newDoc(); d.decimal = '.';
  txt(d, 0, 100, '$AreaCirculo(Dext):pi*Dext^2/4$');
  txt(d, 0, 90, '$AreaAnillo(Dext; Dint):AreaCirculo(Dext)-AreaCirculo(Dint)$');
  txt(d, 0, 76, '$ejemplo:AreaAnillo(50; 30)=$'); // un ejemplo: no viaja con la biblioteca
  d.lib = { on: true, name: L.es ? 'Geometría básica' : 'Basic geometry', alias: 'GEO', author: 'A-CAD', desc: L.es ? 'Áreas de círculos y anillos' : 'Areas of circles and rings', version: 1, exports: ['AreaCirculo', 'AreaAnillo'] };
  return d;
};

const EXAMPLES = {
  // 1. Una pieza que se adapta a sus medidas: restricciones y cotas
  'pieza-parametrica': (L) => {
    const d = newDoc(), { p } = rectangle(d, 0, 0, 100, 60);
    d.pts[p[0]].fixed = true;
    const c = addPoint(d, 50, 30), hole = addCircle(d, c, 10);
    const diag = addLine(d, p[0], p[2], CLINE_STYLE);
    addCon(d, { t: 'MID', refs: [p[0], p[2], c] }); // el agujero, en el centro de la placa
    addCon(d, { t: 'DIST', refs: [p[0], p[1]], v: 100 }); // D1: el largo
    addCon(d, { t: 'DIST', refs: [p[1], p[2]], v: 60 }); // D2: el alto
    addCon(d, { t: 'RAD', refs: [hole], v: 20, expr: 'D2/3' }); // O1 (el diametro): un tercio del alto
    note(d, 0, 100, L.es ? [
      'Placa con agujero. Cambia la cota D1 (largo) o D2 (alto) con doble toque:',
      'la placa se ajusta, el agujero sigue en el centro y su diámetro vale un tercio del alto (O1 = D2/3).',
    ] : [
      'Plate with a hole. Change dimension D1 (length) or D2 (height) with a double tap:',
      'the plate adjusts, the hole stays at the center and its diameter is a third of the height (O1 = D2/3).',
    ]);
    void diag;
    return d;
  },
  // 2. Textos que calculan y gobiernan las cotas
  'calculo-y-cotas': (L) => {
    const d = newDoc();
    txt(d, 0, 150, '$$ancho:120$$');
    txt(d, 0, 140, '$$alto:ancho/2$$');
    txt(d, 0, 130, '$$area:ancho*alto=$$');
    const { p } = rectangle(d, 0, 0, 120, 60);
    d.pts[p[0]].fixed = true;
    addCon(d, { t: 'DIST', refs: [p[0], p[1]], v: 120, expr: 'ancho' });
    addCon(d, { t: 'DIST', refs: [p[1], p[2]], v: 60, expr: 'alto' });
    note(d, 0, -20, L.es ? [
      'Los textos de arriba definen variables (ancho:120, alto:ancho/2) y calculan el área (area:ancho*alto=).',
      'Las cotas del rectángulo leen esas variables. Toca «ancho», escribe otro valor y Enter: todo se recalcula.',
    ] : [
      'The texts above define variables (ancho:120, alto:ancho/2) and calculate the area (area:ancho*alto=).',
      'The rectangle dimensions read those variables. Tap "ancho", type another value and Enter: everything is recalculated.',
    ]);
    return d;
  },
  // 3. Resolver ecuaciones
  'ecuaciones': (L) => {
    const d = newDoc();
    txt(d, 0, 100, L.es ? '$$x:1$$' : '$$x:1$$');
    txt(d, 0, 92, '$$y:1$$');
    txt(d, 0, 84, '$$solve(x+y==10; x-y==2; x; y)=$$');
    txt(d, 0, 66, '$$a:2$$');
    txt(d, 0, 58, '$$b:2$$');
    txt(d, 0, 50, '$$solve(a*b==12; a+b==7; a; b)=$$');
    note(d, 0, 30, L.es ? [
      'Cada incógnita (x, y, a, b) se define antes con un valor inicial; solve(…)= da la solución.',
      'Cambia las ecuaciones o el valor inicial (en el segundo sistema hay dos soluciones: 3 y 4, o 4 y 3).',
    ] : [
      'Each unknown (x, y, a, b) is defined first with an initial value; solve(…)= gives the solution.',
      'Change the equations or the initial value (the second system has two solutions: 3 and 4, or 4 and 3).',
    ]);
    return d;
  },
  // 4. Un poligono de fuerzas con vectores
  'poligono-de-fuerzas': (L) => {
    const d = newDoc();
    const A = addPoint(d, 0, 0), B = addPoint(d, 40, 10), C = addPoint(d, 70, 40), D = addPoint(d, 100, 20);
    d.pts[A].fixed = true;
    const lines = [addLine(d, A, B), addLine(d, B, C), addLine(d, C, D), addLine(d, A, D)];
    lines.forEach((l) => makeVector(d, l, { h: 3 })); // la cabeza de cada vector, en su extremo final
    lines.forEach((l, i) => { // lineas gruesas (la resultante en rojo) y la etiqueta «F1=valor» sobre el vector, solo con el valor (valOnly)
      d.lines[l].w = 2; if (i === 3) d.lines[l].color = '#dc2626';
      const t = d.texts[d.lines[l].vec.t]; t.anchor = 'bc';
      if (i < 3) t.text = '`F' + (i + 1) + '=`' + t.text; // el texto del vector es «$Dn=$»
      t.valOnly = true;
      if (i === 3) t.color = '#dc2626'; // el valor de la resultante, del mismo rojo que su vector
    });
    [A, B, C, D].forEach((p, i) => { d.texts[addText(d, p, 'ABCD'[i], { h: 3.5277777777777777, anchor: 'bc' })]; });
    note(d, 0, 90, L.es ? [
      'Polígono de fuerzas: F1, F2 y F3 van punta con cola y el cuarto vector es su resultante (de A al final).',
      'Arrastra B, C o D: las magnitudes (D1…D4) se actualizan. Toca dos veces un vector para ver su magnitud, unidad y escala.',
    ] : [
      'Force polygon: F1, F2 and F3 go head to tail and the fourth vector is their resultant (from A to the end).',
      'Drag B, C or D: the magnitudes (D1…D4) update. Double tap a vector to see its magnitude, unit and scale.',
    ]);
    return d;
  },
  // 5. Un mecanismo que se mueve y una grafica de su movimiento
  'manivela-y-grafica': (L) => {
    const d = newDoc(), O = addPoint(d, 0, 0), A = addPoint(d, 30, 0); // O es p1 y A es p2: las graficas los llaman asi
    d.pts[O].fixed = true;
    const crank = addLine(d, O, A);
    addCon(d, { t: 'DIST', refs: [O, A], v: 30 });
    addRotary(d, crank, O, { mode: 'disp', expr: '90*t' }); // MR1: un cuarto de vuelta por segundo
    addGraph(d, 45, 25, 90, 50, ['p2.y vs t', 'p2.x vs t']);
    d.tEnd = 4;
    note(d, -5, 45, L.es ? [
      'Manivela: el actuador MR1 gira la línea alrededor de O con 90*t (grados, un cuarto de vuelta por segundo).',
      'Toca Simulación y ▶: A da vueltas y la gráfica dibuja su altura (p2.y) y su posición horizontal (p2.x) contra el tiempo.',
    ] : [
      'Crank: the MR1 actuator turns the line around O with 90*t (degrees, a quarter turn per second).',
      'Tap Simulation and ▶: A goes around and the graph plots its height (p2.y) and its horizontal position (p2.x) against time.',
    ], 2.6);
    return d;
  },
  // 6. Una pieza para corte laser: lineas de corte y de marcado
  'corte-laser': (L) => {
    const d = newDoc();
    const CUT = { color: '#e11d48', ltype: 'continua', w: 1 }, MARK = { color: '#2563eb', ltype: 'discontinua', w: 1 };
    const { p } = rectangle(d, 0, 0, 80, 50, CUT);
    for (const [x, y] of [[8, 8], [72, 8], [8, 42], [72, 42]]) addCircle(d, addPoint(d, x, y), 3, CUT);
    addLine(d, addPoint(d, 40, 0), addPoint(d, 40, 50), MARK); // el pliegue
    note(d, 0, 70, L.es ? [
      'Placa con cuatro agujeros y una línea de pliegue (azul, discontinua).',
      'Archivo → SVG para corte láser: elige «Corte» para las líneas rojas y «Marcado» para la azul.',
    ] : [
      'Plate with four holes and a fold line (blue, dashed).',
      'File → SVG for laser cutting: choose "Cut" for the red lines and "Mark" for the blue one.',
    ]);
    void p;
    return d;
  },
  // 7. Una consola de texto: un vector de cadenas mostrado solo como resultado
  'consola-de-texto': (L) => {
    const d = newDoc();
    txt(d, 0, 100, '$$n:3$$');
    txt(d, 0, 92, '$$consola:["ESTADO", "Vidas: "+num2str(n), "Puntos: "+num2str(n*100)]$$');
    const con = addText(d, addPoint(d, 0, 76), '$$consola=$$', { h: 4, anchor: 'tl', font: 'mono', color: '#4ade80' });
    Object.assign(d.texts[con], { valOnly: true, bg: '#0b1020' }); // addText no lleva estas dos propiedades
    note(d, 0, 40, L.es ? [
      'La consola de abajo muestra solo el resultado de «consola=» (doble toque → «Mostrar solo el resultado»).',
      'Cambia n (arriba) o las cadenas del vector: la consola se actualiza.',
    ] : [
      'The console below shows only the result of "consola=" (double tap → "Show only the result").',
      'Change n (above) or the strings of the vector: the console updates.',
    ]);
    return d;
  },
  // 8. Un valor que se recuerda entre cambios y un sonido
  'contador-y-sonido': (L) => {
    const d = newDoc();
    d.page = { w: 215.9, h: 279.4, m: 25, x0: -25, y0: 125 }; // hoja tamaño carta (la dejo Oscar al revisar el ejemplo)
    txt(d, 0, 100, '$$c:rfile(contador; 0)$$');
    txt(d, 0, 92, '$$wfile(c+1; contador)=$$');
    txt(d, 0, 84, '$$c=$$');
    txt(d, 0, 76, '$$play("ding")=$$');
    const A = addPoint(d, 0.27226494644253146, 43.016637325655886), B = addPoint(d, 40.27226494644294, 43.01663732565545);
    addLine(d, A, B);
    addText(d, B, 'B', { h: 4.2333333333333325, anchor: 'bc' }); // la B que nombra la guia, sobre el extremo
    txt(d, 0, 63.61286254728878, L.es
      ? 'c lee el dato «contador» (0 si no existe) y wfile lo guarda sumándole 1 cada vez que confirmas un cambio.'
      : 'c reads the data "contador" (0 if missing) and wfile stores it plus 1 each time you confirm a change.', 3);
    txt(d, 0, 59.11286254728878, L.es
      ? 'El ejemplo ya trae el sonido «ding» (al abrirlo pasa a Archivo → Datos). \nArrastra el punto debajo de B para provocar un cambio.'
      : 'The example already includes the "ding" sound (opening it copies it to File → Data). \nDrag the point below B to trigger a change.', 3);
    const ding = dingSound();
    addSound(d, 'ding', ding.url, { ms: ding.ms });
    return d;
  },
  // 10. Una placa con las esquinas redondeadas (redondeo con cota de radio)
  'placa-redondeada': (L) => {
    const d = newDoc(), { p } = rectangle(d, 0, 0, 100, 60);
    d.pts[p[0]].fixed = true;
    d.dimText = true; d.dimH = 4.2333333333333325; // cotas en puntos (12 pt), como las deja la app
    const k1 = addCon(d, { t: 'DIST', refs: [p[0], p[1]], v: 100 }), k2 = addCon(d, { t: 'DIST', refs: [p[1], p[2]], v: 60 });
    Object.assign(d.cons[k1], { off: 7.809186362934154, lt: 0.5026727480548098 }); // donde Oscar puso las etiquetas de D1 y D2
    Object.assign(d.cons[k2], { off: 9.8079561042524, lt: 0.5121170553269319 });
    for (const q of p) { const r = filletCorner(d, q, 8); if (!r.ok) throw new Error('redondeo: ' + r.msg); }
    const rads = Object.values(d.cons).filter((k) => k.t === 'RAD'); // R1 manda: R2, R3 y R4 valen R1, en mm (una formula en la cota)
    rads[0].lbl = '"R1"'; // la etiqueta de R1 dice su nombre
    rads.slice(1).forEach((k) => { k.expr = "R1'mm"; k.du = 'mm'; });
    Object.assign(rads[2], { ang: 0.9098533527149602, lp: 15.50537753389292 }); // la etiqueta de R3, donde Oscar la dejo
    note(d, 0, 80, L.es ? [
      'Placa con las cuatro esquinas redondeadas (radio 8). Cada arco lleva su cota de radio (R1…R4).',
      'Cambia R1 con doble toque: las cuatro esquinas lo siguen, porque R2, R3 y R4 valen R1. \nCambia D1 o D2 y la placa sigue redondeada.',
    ] : [
      'Plate with its four corners rounded (radius 8). Each arc carries its radius dimension (R1…R4).',
      'Change R1 with a double tap: the four corners follow, because R2, R3 and R4 equal R1. \nChange D1 or D2 and the plate stays rounded.',
    ]);
    return d;
  },
  // 11. Una curva suave por puntos (spline) que se deforma al arrastrar
  'curva-suave': (L) => {
    const d = newDoc();
    const xy = [[0, 0], [20, 25], [45, 32], [70, 12], [95, 22], [120, 0]];
    const ids = xy.map(([x, y]) => addPoint(d, x, y));
    d.pts[ids[0]].fixed = true; d.pts[ids[5]].fixed = true;
    addSpline(d, ids, {});
    note(d, 0, -15, L.es ? [
      'Un spline abierto por seis puntos; los extremos están fijos.',
      'Arrastra un punto del medio: la curva se deforma. Con el spline seleccionado, elige «Cerrar / abrir» en el desplegable de Spline.',
    ] : [
      'An open spline through six points; the ends are fixed.',
      'Drag a middle point: the curve deforms. With the spline selected, choose "Close / open" in the Spline dropdown.',
    ]);
    return d;
  },
  // 12. Cotas con unidad (pulgadas) y vista a escala
  'cotas-en-pulgadas': (L) => {
    const d = newDoc(), { p } = rectangle(d, 0, 0, 100, 50);
    d.pts[p[0]].fixed = true;
    d.page = { w: 215.9, h: 279.4, m: 25, x0: -25, y0: 115 }; // hoja tamaño carta: la linea larga tiene que caber en su area util (165,9 mm)
    d.dimText = true; d.dimH = 4.2333333333333325; // cotas en puntos (12 pt), como las deja la app con pagina
    addCon(d, { t: 'DIST', refs: [p[0], p[1]], v: 100, expr: "4'in" }); // la cota lo dice en pulgadas; el dibujo mide 101,6 (mm)
    addCon(d, { t: 'DIST', refs: [p[1], p[2]], v: 50, expr: "2'in" });
    const a = addPoint(d, 0, -30), b = addPoint(d, 160.02, -30);
    d.pts[a].fixed = true;
    addLine(d, a, b);
    addCon(d, { t: 'DIST', refs: [a, b], v: 160.02, expr: "126'in", scale: 0.05 }); // 126 in dibujadas a 1:20 (160,02 mm); la cota sigue diciendo 126 in
    txt(d, 0.29899257688229375, 89.31808059384942, L.es
      ? "En esta hoja tamaño carta, se tiene dibujada una placa que mide 4'in por 2'in: la cota lo dice en pulgadas y el dibujo (en mm) mide 101,6 por 50,8."
      : "On this letter-size sheet, a plate that measures 4'in by 2'in is drawn: the dimension says it in inches and the drawing (in mm) measures 101.6 by 50.8.", 3);
    txt(d, 0.29899257688229375, 78.17852598091197, L.es
      ? "La línea de abajo mide 126'in pero se dibuja a 1:20 con [*0.05], para que quepa dentro de la hoja: mide 160,02 mm y su cota sigue diciendo «126 in», subrayada."
      : "The line below measures 126'in but is drawn at 1:20 with [*0.05], so that it fits inside the sheet: it measures 160.02 mm and its dimension still says \"126 in\", underlined.", 3);
    return d;
  },
  // 13. Fuerzas dibujadas a escala con una escala de representacion en una variable
  'escala-de-fuerzas': (L) => {
    const d = newDoc();
    txt(d, 0, 40, "$eF:1'mm/kN$");
    const mk = (y, kN) => {
      const a = addPoint(d, 0, y), b = addPoint(d, kN, y);
      d.pts[a].fixed = true;
      const l = addLine(d, a, b);
      addCon(d, { t: 'H', refs: [l] });
      addCon(d, { t: 'DIST', refs: [a, b], v: kN, expr: kN + "'kN", scaleExpr: 'eF' });
    };
    mk(10, 30); mk(-5, 45);
    note(d, 0, -25, L.es ? [
      "eF vale 1'mm/kN: cada kN se dibuja con 1 mm. Las cotas dicen 30 kN y 45 kN, y las líneas miden 30 y 45 mm.",
      "Cambia eF a 2'mm/kN y las dos líneas se alargan al doble; las cotas siguen diciendo lo mismo.",
    ] : [
      "eF is 1'mm/kN: each kN is drawn with 1 mm. The dimensions say 30 kN and 45 kN, and the lines measure 30 and 45 mm.",
      "Change eF to 2'mm/kN and both lines double in length; the dimensions still say the same.",
    ]);
    return d;
  },
  // 14. Una biblioteca de funciones (el documento que la define)
  'biblioteca-geometria': (L) => {
    const d = geometryLib(L);
    note(d, 0, 55, L.es ? [
      'Este dibujo es una biblioteca: Configuración → Biblioteca marca «Es una biblioteca» (alias GEO).',
      'Sus funciones AreaCirculo y AreaAnillo son públicas; «ejemplo» es solo una prueba y no viaja.',
    ] : [
      'This drawing is a library: Settings → Library has "Is a library" checked (alias GEO).',
      'Its functions AreaCirculo and AreaAnillo are public; "ejemplo" is only a test and does not travel.',
    ]);
    return d;
  },
  // 15. Un dibujo que usa una biblioteca ya insertada
  'usar-biblioteca': (L) => {
    const d = newDoc(); d.decimal = '.';
    const blk = addText(d, addPoint(d, 0, 100), '▸ ' + (L.es ? 'Geometría básica' : 'Basic geometry'), { h: 3.2, anchor: 'tl' });
    d.texts[blk].lib = { ...libPayload(geometryLib(L)), decimal: '.', path: 'MyLibrary/GeometriaBasica.alib.json' }; // sin sha: no existe en GitHub, solo es un ejemplo
    txt(d, 0, 88, '$GEO.AreaCirculo(10)=$');
    txt(d, 0, 78, '$GEO.AreaAnillo(50; 30)=$');
    note(d, 0, 62, L.es ? [
      'El bloque de arriba es la biblioteca insertada (una copia: funciona sin red). Sus nombres se usan con el alias: GEO.AreaCirculo(…).',
      'Doble toque en el bloque para ver sus propiedades. Este ejemplo no viene de GitHub, así que «Actualizar» no encontrará nada.',
    ] : [
      'The block above is the inserted library (a copy: it works offline). Its names are used with the alias: GEO.AreaCirculo(…).',
      'Double tap the block to see its properties. This example does not come from GitHub, so "Update" will find nothing.',
    ]);
    return d;
  },
  // 9. Un agujero repetido alrededor de un centro (matriz circular con copias vinculadas)
  'patron-circular': (L) => {
    const d = newDoc();
    const O = addPoint(d, 0, 0); d.pts[O].fixed = true;
    addCircle(d, O, 60);
    const c = addPoint(d, 40, 0), hole = addCircle(d, c, 5);
    addCon(d, { t: 'DIST', refs: [O, c], v: 40 });
    addCon(d, { t: 'RAD', refs: [hole], v: 5 });
    circularArray(d, [{ k: 'ci', id: hole }], { c: { x: 0, y: 0 }, step: Math.PI / 3, n: 6, link: true, cid: O, dims: false });
    note(d, -60, -75, L.es ? [
      'Brida con seis agujeros iguales a 60° (matriz circular con copias vinculadas).',
      'Cambia la cota de distancia o el radio de un agujero: los seis cambian juntos.',
    ] : [
      'Flange with six equal holes at 60° (circular array with linked copies).',
      'Change the distance dimension or the radius of one hole: all six change together.',
    ]);
    return d;
  },
};
export const EXAMPLE_NAMES = Object.keys(EXAMPLES);
// Los puntos solo se muestran donde la guia pide arrastrar o elegir uno (el resto de lo que hay que ver lo calcula viewNeeds, de src/examples.js)
const SHOW_POINTS = new Set(['pieza-parametrica', 'poligono-de-fuerzas', 'curva-suave']);

export async function buildAll() {
  await initSolver();
  mkdirSync(DIR, { recursive: true });
  const out = {};
  for (const [name, make] of Object.entries(EXAMPLES)) {
    for (const lang of ['es', 'en']) {
      const doc = withStyle(make({ es: lang === 'es' }));
      ensureNumbers(doc);
      const r = settle(doc, solve, []);
      if (r && r.ok === false) throw new Error(`${name} (${lang}): no se pudo resolver: ${r.msg || ''}`);
      const file = DIR + name + (lang === 'es' ? '' : '.en') + '.json';
      writeFileSync(file, JSON.stringify({ app: 'ipad-cad', version: VERSION, doc, view: viewNeeds(doc, { points: SHOW_POINTS.has(name) }) }, null, 1) + '\n');
      out[name + (lang === 'es' ? '' : '.en')] = doc;
    }
  }
  return out;
}
// El dibujo que genera el script para un ejemplo (sin escribir nada): lo usa examples:diff para compararlo con un archivo guardado desde la app
export async function buildDoc(name, lang = 'es') {
  if (!EXAMPLES[name]) throw new Error(`no hay un ejemplo «${name}» (hay: ${EXAMPLE_NAMES.join(', ')})`);
  await initSolver();
  const doc = withStyle(EXAMPLES[name]({ es: lang === 'es' }));
  ensureNumbers(doc);
  settle(doc, solve, []);
  return { doc, view: viewNeeds(doc, { points: SHOW_POINTS.has(name) }) };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  buildAll().then((o) => console.log(Object.keys(o).length + ' ejemplos en ejemplos/guias/'));
}
