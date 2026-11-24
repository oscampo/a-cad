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
import { settle } from '../src/params.js';
import { viewNeeds } from '../src/examples.js';

const VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
const DIR = fileURLToPath(new URL('../ejemplos/guias/', import.meta.url));

// Un texto suelto: esquina superior izquierda en (x, y) (el eje y sube)
const txt = (doc, x, y, text, h = 3.2) => addText(doc, addPoint(doc, x, y), text, { h, anchor: 'tl' });
const note = (doc, x, y, lines, h = 3) => lines.forEach((l, i) => txt(doc, x, y - i * h * 1.5, l, h));
const rectangle = (doc, x0, y0, w, h, style) => {
  const p = [addPoint(doc, x0, y0), addPoint(doc, x0 + w, y0), addPoint(doc, x0 + w, y0 + h), addPoint(doc, x0, y0 + h)];
  return { p, l: addRectangle(doc, p, style) };
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
    txt(d, 0, 100, '$$c:rfile(contador; 0)$$');
    txt(d, 0, 92, '$$wfile(c+1; contador)=$$');
    txt(d, 0, 84, '$$c=$$');
    txt(d, 0, 76, '$$play("ding")=$$');
    const A = addPoint(d, 0, 0), B = addPoint(d, 40, 0);
    addLine(d, A, B);
    note(d, 0, 50, L.es ? [
      'c lee el dato «contador» (0 si no existe) y wfile lo guarda sumándole 1 cada vez que confirmas un cambio.',
      'Para oír «ding», importa un sonido llamado ding en Archivo → Datos. Arrastra B para provocar un cambio.',
    ] : [
      'c reads the data "contador" (0 if missing) and wfile stores it plus 1 each time you confirm a change.',
      'To hear "ding", import a sound named ding in File → Data. Drag B to trigger a change.',
    ]);
    return d;
  },
  // 10. Una placa con las esquinas redondeadas (redondeo con cota de radio)
  'placa-redondeada': (L) => {
    const d = newDoc(), { p } = rectangle(d, 0, 0, 100, 60);
    d.pts[p[0]].fixed = true;
    addCon(d, { t: 'DIST', refs: [p[0], p[1]], v: 100 });
    addCon(d, { t: 'DIST', refs: [p[1], p[2]], v: 60 });
    for (const q of p) { const r = filletCorner(d, q, 8); if (!r.ok) throw new Error('redondeo: ' + r.msg); }
    const rads = Object.values(d.cons).filter((k) => k.t === 'RAD'); // R1 manda: R2, R3 y R4 valen R1 (una formula en la cota)
    rads.slice(1).forEach((k) => { k.expr = 'R1'; });
    note(d, 0, 80, L.es ? [
      'Placa con las cuatro esquinas redondeadas (radio 8). Cada arco lleva su cota de radio (R1…R4).',
      'Cambia R1 con doble toque: las cuatro esquinas lo siguen, porque R2, R3 y R4 valen R1. Cambia D1 o D2 y la placa sigue redondeada.',
    ] : [
      'Plate with its four corners rounded (radius 8). Each arc carries its radius dimension.',
      'Change R1 with a double tap: the four corners follow, because R2, R3 and R4 equal R1. Change D1 or D2 and the plate stays rounded.',
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
      const doc = make({ es: lang === 'es' });
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
  const doc = EXAMPLES[name]({ es: lang === 'es' });
  ensureNumbers(doc);
  settle(doc, solve, []);
  return { doc, view: viewNeeds(doc, { points: SHOW_POINTS.has(name) }) };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  buildAll().then((o) => console.log(Object.keys(o).length + ' ejemplos en ejemplos/guias/'));
}
