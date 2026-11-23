import wasmUrl from '@salusoft89/planegcs/dist/planegcs_dist/planegcs.wasm?url';
import { initSolver, solve, solveSteps, reparamSplines, addConsSolved, projectMarks, isMark, assignMark, setMarkRef, resetMarks, ensureMarkRefs, redundantCons, makeGear, makeRack, checkRack, FINITE_TYPES, dragToStops, beginSession, endSession, perfStats } from './solver.js';
import {
  newDoc, addLayer, deleteLayer, layerCount, shownEntries, shownValues, layerHiddenPoints, consHidden, visibleDoc, isHidden, addPoint, addLine, addCircle, addArc, addText, addSpline, splinePolyline, addCon, cleanup, deleteItems, clone, hatchLoops,
  allLtypes, arcOf, conTag, ensureNumbers, addEllipse, ellipsePolyline, ellipseOf, ellipsePoint, ellipseParam, ellipseRange, isPartial, DIM_TYPES,
  withOp,
} from './model.js';
import {
  dist, closestOnSeg, lineLine, lineCircle, circleCircle, signedAngle, dashFromPattern, parsePattern,
  arcThrough3, inSweep, TAU, splineSamples, resamplePolyline, closestOnPolyline, polylineLine, polylineCircle, polylinePolyline,
} from './geom.js';
import { startTrace, recordTraces, traceToSpline, offsetPolyline } from './curves.js';
import { splitElement } from './split.js';
import { boxSelect } from './boxsel.js';
import { crossPoints } from './snapx.js';
import { trimAt, extendEnd, linearArray, mirrorCopy, circularArray, clipOf, pasteClip } from './edit.js';
import { cornerOf, filletCorner, chamferCorner, maxFillet, filletBetween, chamferBetween, filletReach, cornerPair, coincidentIds } from './corners.js';
import { rigidShape, looseShape, isRigid } from './rigid.js';
import { CLINE_STYLE, circleThrough3, addRectangle, polygonVertices, addPolygon, arcIsClockwise, constructionArcDash } from './shapes.js';
import { layoutDim, dragDim, dimValue, dimScale, splitScale, splitLabel, lblIsMath, DIM_FS, dimH, ARROW, ARROW_HW, pointOnElement, endOfElement, leadBody, leadLabel, leadSpots, leadAtDefault, leadAnchorDefault, angSector, angTrue, initAngle, trackAngles, DIAM, dimUnit, isLenDim, dimShown, dimUnreadable } from './dims.js';
import { makeVector, unmakeVector, syncVectors, vecArrow } from './vectors.js';
import { addRotary, addLinear, actName, actUnit, actError, parseTable, tableText, simBegin, simStep, simEnd } from './actuators.js';
import { TRACE_STYLE } from './curves.js';
import { parseLineSpec, splitSpec, withSpec, addGraph, computeGraphAsync, graphVarNames, dataBounds, axisCfg, axisLayout, axisRange, genericRange, GEN_X, AXES } from './graphs.js';
import { panStep, zoomStep, setWindow, clearWindow, saveHome, homeWin, forgetHome, resetAxis } from './graphview.js';
import { textFrame, textHit, textPose, shownText, textCorners, framePrims, runsOf, rawAngle, ANCHORS, ANCHOR_NAMES, LINE_SPACING, FONTS, fontCss, TEXT_BG_PAD, textLinkAt, textLinkBoxes } from './text.js';
import { linkTarget, resolveRepoPath, findAnchor } from './links.js';
import { attachAutoPair } from './autopair.js';
import { attachGreek } from './greek.js';
import { migrateCalcDoc } from './tvars.js';
import { codeKeyEvent } from './codeedit.js';
import { isScript, parseScript } from './script.js';
import { suggest, openCall, defSource, builtinInfo } from './complete.js';
import * as gh from './github.js';
import { setDataBackend, dataStore, clearDataWrites, takeDataWrites, dataName } from './datastore.js';
import { varsOf, varsList, varsInfo, readInt, splitTop, recompute, pruneFormulas, renameDim, checkName, settle, hasReactive, usesTextVars, textVarErrors, textVars, freezeDimOrder, thawDimOrder, setDocDecimal, splitUnit, dimEval, fillDimUnits, scaleEval, noScaleWarn } from './params.js';
import { exportSVG, exportSVGLaser, exportDXF, extraExtents, laserClasses } from './export.js';
import { iconSvg, ICONS } from './icons.js';
import { setIconSource } from './iconpaths.js';
setIconSource(ICONS); // los iconos de la app que un texto puede mostrar: ![Linea](icon:line)
import { buildTree, kindOf, conLabel } from './tree.js';
import { cleanFileBase } from './files.js';
import { LIB_DIR, libDefs, libClosure, defaultExports, checkLibrary, aliasProblem, libFileName, libPayload, legacyLibPath, newLibPath } from './library.js';
import { addImage, imageSrc, docForSave, withoutAssets, unsnap, fitPixels, keepAspect, IMG_MAX, imgRect, syncImages, ensureImagePoints, anchorPoint } from './images.js';
import { needsReload, reloadAllowed } from './update.js';
import { nearAll, describe as ovDescribe, OV_COLL } from './overlap.js';
import { parseValue, isPlainNumber, setAngleMode, APPROX_TOL, convertExpr } from './expr.js';
import { localNum, SCI_DEFAULT, sciFrom, decimalMode } from './locale.js';
import { getLang, setLang, initLang } from './i18n.js';
import { HELP_HTML } from './help.js';
import { colorPicker } from './colorpicker.js';
import { lineLock, lockConstraints, originsOfPoint, originsOfSnap } from './lock.js';

const VERSION = '2.9.3';
const BUILD = typeof __BUILD__ !== 'undefined' ? __BUILD__ : 'dev'; // commit de la compilacion: junto a la version, abajo a la izquierda del dibujo
const STORE = 'ipad-cad-v1';
const $ = (id) => document.getElementById(id);
const cv = $('cv');
const ctx = cv.getContext('2d');

// ---------------------------------------------------------------- estado
// Un dibujo nuevo calcula en radianes (los anteriores, sin «angles», siguen en grados) y trae pagina carta con margenes de 25 mm
// (los anteriores, sin «page», siguen «Sin limites»).
const PAGES = { letter: { w: 215.9, h: 279.4 }, a4: { w: 210, h: 297 } };
// El indicador decimal de un dibujo nuevo es el ultimo que se eligio en este dispositivo (sin eleccion: como los dibujos anteriores, se leen los dos).
const decPref = () => { try { const v = localStorage.getItem('a-cad-decimal'); return v === ',' || v === '.' ? v : null; } catch (e) { return null; } };
const freshDoc = () => ({ ...newDoc(), dimText: true, dimH: (12 * 25.4) / 72, angles: 'rad', ...(decPref() ? { decimal: decPref() } : {}), page: { w: PAGES.letter.w, h: PAGES.letter.h, m: 25, x0: 0, y0: 0 } });
const pageKind = (pg) => Object.keys(PAGES).find((k) => Math.abs(PAGES[k].w - pg.w) < 1e-6 && (pg.h == null || Math.abs(PAGES[k].h - pg.h) < 1e-6));
// Alto de la pagina: una pagina guardada antes de que existiera toma el de su formato, o la proporcion de A4 si el ancho es otro.
const pageH = (pg) => pg.h ?? PAGES[pageKind(pg)]?.h ?? +((pg.w * 297) / 210).toFixed(1);
// Borde superior (y del modelo) de la primera pagina: si falta (pagina de antes), queda un margen por encima de lo mas alto
// del dibujo y se guarda, para que no se mueva al editar.
function pageTop(pg) {
  if (pg.y0 == null) { const t = contentTop(); pg.y0 = isFinite(t) ? +(t + pg.m).toFixed(3) : 0; }
  return pg.y0;
}
let doc = freshDoc();
let pageExt = null, pageExtDoc = null; // lo que ocupa el dibujo en y, para la barra de desplazamiento de la pagina
const globalDoc = () => doc;
let view = { ox: 200, oy: 300, s: 3 }; // px por unidad; y del modelo hacia arriba
let tool = 'select';
let toolName = 'select'; // nombre en la interfaz (incluye los constructivos, que usan la herramienta base)
let consMode = false; // se dibuja con el estilo de linea constructiva
const CONS_TOOLS = { ccircle: 'circle', carcc: 'arcc', carc3: 'arc3' };
const BASE_TOOL = { ...CONS_TOOLS, earc: 'ellipse' }; // earc: elipse parcial (arco eliptico)
let sel = []; // [{k:'pt'|'ln'|'ci'|'ha', id}]
let cur = { color: 'auto', ltype: 'continua', w: 2, ls: 1, tx: { h: null, ang: 0, anchor: 'bl', readable: true } };
let txState = null, txHint = false; // entrada directa de texto abierta: { sUp } (donde va el texto, como un punto de toque)
const opts = { grid: true, snap: false, cons: true, pts: true, dims: true, texts: true, touch: false, ltScale: 1, labels: true, lock: true, lockDeg: 45, intMs: 80, arrLink: true, arrDims: false, filtKinds: [], filtLt: [], grp: {}, polyN: 6, polyCirc: false, sections: {} };
let undoStack = [], redoStack = [];
let pending = null; // estado de la herramienta en curso
let clip = null; // lo copiado (Copiar / Pegar)
let hover = null; // posicion del puntero en pantalla
let drag = null;
let labelHits = [];
let graphData = {}, graphSig = {}, graphTimer = 0, graphRun = 0, graphKey = '', graphProg = {};
// Si la pagina murio mientras calculaba una grafica (Chrome en iPad la cierra), queda una marca en localStorage: al abrir de nuevo no se calcula solo, para no entrar en un bucle de fallos.
const GCALC = 'ipadcad.gcalc';
let graphHold = null;
try { graphHold = JSON.parse(localStorage.getItem(GCALC) || 'null'); } catch { /* sin almacenamiento */ }
const gcalcMark = (v) => { try { if (v) localStorage.setItem(GCALC, JSON.stringify(v)); else localStorage.removeItem(GCALC); } catch { /* sin almacenamiento */ } };
addEventListener('pagehide', () => gcalcMark(null)); // cerrar o recargar a proposito no es un fallo; un cierre forzado por el sistema no dispara este evento
let simMode = 'none', simSpeed = 1, simDir = 1; // reproduccion: none | loop | pp (vaiven), escala de velocidad y sentido
let actHits = [], sim = null, simT = 0, graphStale = false, simRaf = 0, simPlayFrom = 0; // actuadores: zonas tocables y simulacion en curso
const pointers = new Map();
let gesture = null;
let spaceDown = false, shiftDown = false;
let theme = { fg: '#111', bg: '#fff', muted: '#888', grid: '#eee', grid2: '#ddd', accent: '#2563eb', sel: '#f59e0b', warn: '#dc2626' };

// ---------------------------------------------------------------- utilidades
const toScreen = (p) => ({ x: p.x * view.s + view.ox, y: view.oy - p.y * view.s });
const toModel = (sx, sy) => ({ x: (sx - view.ox) / view.s, y: (view.oy - sy) / view.s });
const same = (a, b) => a.k === b.k && a.id === b.id;
const isSel = (k, id) => sel.some((s) => s.k === k && s.id === id);
const fmt = (v) => localNum(Math.abs(v) >= 1000 ? v.toFixed(1) : String(Math.round(v * 1000) / 1000)); // con el indicador decimal del dibujo
let toastTimer = 0;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}
function readTheme() {
  const cs = getComputedStyle(document.documentElement);
  const g = (n, d) => cs.getPropertyValue(n).trim() || d;
  theme = { fg: g('--fg', '#111'), bg: g('--bg', '#fff'), muted: g('--muted', '#888'), grid: g('--grid', '#eee'), grid2: g('--grid2', '#ddd'), accent: g('--accent', '#2563eb'), sel: g('--sel', '#f59e0b'), warn: g('--warn', '#dc2626') };
}
const colorOf = (c, o) => (!c || c === 'auto' ? o.fg : c);

function snapshot() { return sim ? sim.snap : JSON.stringify(withoutAssets(doc)); } // durante la simulacion el dibujo es el guardado, sin las restricciones conductoras
function pushUndo() { undoStack.push(snapshot()); if (undoStack.length > 150) undoStack.shift(); redoStack = []; updateButtons(); }
function rollback() { if (undoStack.length) { doc = unsnap(undoStack.pop(), doc.assets); } updateButtons(); }
// la capa actual no se deshace: sigue siendo la que elegiste (si todavia existe y esta encendida)
function keepLayer(cl) { doc.curLayer = cl && doc.layers?.[cl]?.on ? cl : null; }
function undo() {
  endTextLive();
  if (sim) stopSim();
  if (!undoStack.length) return;
  const cl = doc.curLayer; redoStack.push(snapshot()); doc = unsnap(undoStack.pop(), doc.assets); keepLayer(cl);
  pending = null; sel = sel.filter(exists); afterChange();
}
function redo() {
  endTextLive();
  if (sim) stopSim();
  if (!redoStack.length) return;
  const cl = doc.curLayer; undoStack.push(snapshot()); doc = unsnap(redoStack.pop(), doc.assets); keepLayer(cl);
  pending = null; sel = sel.filter(exists); afterChange();
}
function exists(s) {
  return s.k === 'pt' ? s.id in doc.pts : s.k === 'ln' ? s.id in doc.lines : s.k === 'ci' ? s.id in doc.circles : s.k === 'ar' ? s.id in doc.arcs : s.k === 'tx' ? s.id in doc.texts : s.k === 'sp' ? s.id in doc.splines : s.k === 'el' ? s.id in doc.ellipses : s.k === 'ha' ? s.id in doc.hatches : s.id in doc.cons;
}
let saveTimer = 0, autosaveAt = 0, quotaWarned = false;
// ---- datos de wfile()/rfile() (ver datastore.js): en este navegador (localStorage «acad-data:nombre»), comunes a todos los dibujos.
// Se escriben al confirmar un cambio del dibujo (afterChange), no al arrastrar ni en la simulacion, y solo si el dibujo cambio desde la
// ultima escritura: tocar para seleccionar o mover la vista no avanza un paso (con «q:rfile(X)» y «wfile(q+1, X)», cada cambio suma 1).
const DATA_PRE = 'acad-data:';
const dataMem = new Map();
try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith(DATA_PRE)) { const v = JSON.parse(localStorage.getItem(k)); if (typeof v?.t === 'string') dataMem.set(k.slice(DATA_PRE.length), v); } } } catch { /* sin almacenamiento */ }
setDataBackend({
  get: (n) => dataMem.get(n)?.t,
  set: (n, t) => { const v = { t, at: Date.now() }; dataMem.set(n, v); try { localStorage.setItem(DATA_PRE + n, JSON.stringify(v)); } catch { toast(`No se pudo guardar «${n}»: el almacenamiento del navegador está lleno`); } },
  delete: (n) => { dataMem.delete(n); try { localStorage.removeItem(DATA_PRE + n); } catch { /* sin almacenamiento */ } },
  entries: () => [...dataMem].sort((a, b) => a[0].localeCompare(b[0])),
});
window.addEventListener('storage', (e) => { // otra pestaña escribio: rfile ve lo nuevo
  if (!e.key?.startsWith(DATA_PRE)) return;
  const n = e.key.slice(DATA_PRE.length);
  try { const v = e.newValue && JSON.parse(e.newValue); if (v?.t !== undefined) dataMem.set(n, v); else dataMem.delete(n); } catch { return; }
  draw();
});
let dataSig = null, dataDoc = null, dataToast = false;
const usesWfile = () => Object.values(doc.texts || {}).some((t) => /wfile\s*\(/i.test(String(t.text ?? '')));
function flushData() {
  if (sim || drag || !usesWfile()) return;
  if (dataDoc !== doc.texts) { dataDoc = doc.texts; dataToast = false; } // otro dibujo (abierto o deshecho): el aviso vuelve a salir una vez
  const sig = JSON.stringify(withoutAssets(doc));
  if (sig === dataSig) return;
  dataSig = sig;
  clearDataWrites();
  try { textVars(doc); for (const t of Object.values(doc.texts)) if (/wfile\s*\(/i.test(t.text)) shownText(doc, t); } catch { /* los errores ya se muestran en el dibujo */ }
  const st = dataStore(), done = [];
  for (const [n, t] of takeDataWrites()) if (st.get(n) !== t) { st.set(n, t); done.push(n); }
  if (done.length && !dataToast) { dataToast = true; setTimeout(() => toast(`Este dibujo guarda datos con wfile: ${done.join(', ')} (Archivo → Datos)`), 1600); } // despues del aviso «Abierto»
}
function openDataDlg() {
  const dlg = $('dlgData'), box = $('dataList');
  const render = () => {
    box.textContent = '';
    const all = dataStore().entries();
    $('dataCount').textContent = all.length ? `${all.length} archivo${all.length > 1 ? 's' : ''}` : '';
    if (!all.length) { box.textContent = 'Todavía no hay datos. Un texto con wfile(valor, Nombre) los guarda aquí; rfile(Nombre) los lee desde cualquier dibujo.'; return; }
    for (const [n, v] of all) {
      const row = document.createElement('div'); row.className = 'gm-row';
      const info = document.createElement('div'); info.style.cssText = 'flex:1 1 auto;min-width:0';
      const b = document.createElement('b'); b.textContent = n;
      const pre = document.createElement('code'); pre.style.cssText = 'display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px;color:var(--muted)'; pre.textContent = v.t.length > 200 ? v.t.slice(0, 200) + '…' : v.t;
      const sm = document.createElement('small'); sm.style.color = 'var(--muted)'; sm.textContent = new Date(v.at).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      info.append(b, ' ', sm, pre);
      const ex = document.createElement('button'); ex.type = 'button'; ex.textContent = 'Exportar'; ex.title = 'Descarga el archivo de texto';
      ex.onclick = () => download(n, new Blob([v.t], { type: 'text/plain' }));
      const del = document.createElement('button'); del.type = 'button'; del.textContent = 'Borrar';
      del.onclick = () => { if (!confirm(`¿Borrar los datos «${n}»? Los dibujos que lo leen con rfile darán ⚠ hasta que se vuelva a escribir.`)) return; dataStore().delete(n); dataSig = null; render(); draw(); };
      row.append(info, ex, del); box.appendChild(row);
    }
  };
  $('dataImport').onclick = () => $('dataIn').click();
  $('dataIn').onchange = async (e) => {
    const files = [...e.target.files]; e.target.value = '';
    const bad = [];
    for (const f of files) {
      try { const n = dataName(f.name), t = (await f.text()).trim(); if (dataStore().get(n) !== undefined && !confirm(`Ya hay datos «${n}». ¿Reemplazarlos?`)) continue; dataStore().set(n, t); } catch (err) { bad.push(`${f.name}: ${err.message}`); }
    }
    if (bad.length) toast(bad.join(' · '));
    render(); draw();
  };
  render(); dlg.showModal();
}
function persist() {
  clearTimeout(saveTimer);
  if (sim) return; // no se guarda el dibujo movido por la simulacion
  saveTimer = setTimeout(() => {
    autosaveAt = Date.now();
    try { localStorage.setItem(STORE, JSON.stringify({ doc: docForSave(doc), view, cur, opts, at: autosaveAt })); quotaWarned = false; } catch { if (doc.images && Object.keys(doc.images).length && !quotaWarned) { quotaWarned = true; toast('Las imágenes no caben en el guardado automático del navegador: guarda el archivo (.json) para no perder cambios'); } }
  }, 300);
}
// afterChange tambien mantiene al dia las cotas que leen medidas (si no se estabilizan, se deja como estaba)
// Nombre del archivo actual, arriba a la derecha del dibujo (con el estilo de la version). Se actualiza al abrir, guardar y empezar uno nuevo.
function updateFileTag() {
  const el = $('fileTag'), t = opts.fileBase ? opts.fileBase + '.json' : 'sin nombre';
  if (el && el.textContent !== t) el.textContent = t;
}
function afterChange() { syncImages(doc); pageExt = null; scheduleGraphs(); updateFileTag(); syncVectors(doc); trackAngles(doc); const fz = pruneFormulas(doc); if (hasReactive(doc)) { const bak = snapshot(), st = settle(doc, solve, []); if (!st.ok) doc = unsnap(bak, doc.assets); } if (fz.length) toast(`${fz.join(', ')}: la cota de la que dependía ya no existe o es de referencia; queda con su valor actual`); layerBtn(); updateButtons(); updateEnabled(); syncPanel(); flushData(); persist(); draw(); renderTree(); }

// Un boton de restriccion solo se activa si la seleccion actual le sirve (mismas reglas que applyCon).
function updateEnabled() {
  const n = { pt: 0, ln: 0, ci: 0, ar: 0, sp: 0, el: 0 };
  for (const x of sel) if (x.k in n) n[x.k]++;
  n.pt += sel.filter((x) => x.k === 'tx').length;
  const { pt, ln } = n;
  const crv = n.ci + n.ar;
  const rules = {
    H: ln >= 1 || pt >= 2, V: ln >= 1 || pt >= 2,
    DSH: pt >= 3, DSV: pt >= 3,
    PAR: ln >= 2, PERP: ln >= 2, COL: ln >= 2,
    // 2 puntos coincidentes, puntos sobre un elemento, o lineas/arcos con una elipse o spline (su extremo mas cercano)
    COI: (pt >= 2 && ln + crv + n.sp + n.el === 0) || (pt >= 1 && ln + crv + n.sp + n.el === 1) || (!pt && n.sp + n.el === 1 && ln + n.ar >= 1 && !n.ci),
    MID: pt === 1 && ln === 1,
    EQ: (ln >= 2 && !crv) || (crv >= 2 && !ln),
    CONC: crv >= 2 && !ln && !n.sp,
    TAN: (ln === 1 && crv === 1 && !n.sp && !n.el) || (crv === 2 && !ln && !n.sp && !n.el) || (n.sp === 1 && ln + crv === 1 && !n.el) || (n.el === 1 && ln + crv === 1 && !n.sp) || (n.el === 2 && !ln && !crv && !n.sp),
    FIX: pt + ln + crv > 0,
    DIM: (pt === 2 && !ln) || (ln === 1 && !pt) || (pt === 1 && ln === 1) || (ln === 2 && !pt && !crv && !n.sp && !n.el) || (crv >= 1 && pt + ln + crv + n.el === 2 && !n.sp) || (pt === 1 && n.sp + n.el === 1 && !ln && !crv), // punto + spline o elipse: línea indicativa
    ANG: ln === 2,
    GEAR: ln === 2 && !pt && !crv && !n.sp && !n.el,
    RACK: ln === 2 && pt === 1 && !crv && !n.sp && !n.el,
    RAD: crv >= 1,
  };
  document.querySelectorAll('[data-con]').forEach((b) => { b.disabled = !rules[b.dataset.con]; });
  $('mkint').disabled = ln + crv + n.sp !== 2;
  $('mksplit').disabled = !(ln + crv === 1 && !n.sp); // con puntos: divide en ellos; sin puntos: en n partes iguales
  $('mkhatch').disabled = ln + crv + n.sp < 1;
  $('mkarr').disabled = !sel.some((x) => ['pt', 'ln', 'ci', 'ar', 'sp', 'tx', 'el'].includes(x.k));
  $('mkmir').disabled = $('mkarr').disabled;
  $('mkcir').disabled = $('mkarr').disabled;
  const selPts = sel.filter((x) => x.k === 'pt').map((x) => x.id);
  $('trTrace').disabled = !selPts.length;
  $('mkReset').disabled = !Object.keys(doc.pts).some((id) => isMark(doc, id));
  $('trClear').disabled = !selPts.some((id) => doc.traces[id]?.pts.length > 1);
  $('trSpline').disabled = !(selPts.length === 1 && doc.traces[selPts[0]]?.pts.length >= 3);
  $('spClose').disabled = !n.sp;
  $('spOffset').disabled = !n.sp;
  $('del').disabled = !sel.length && !multiGraphs().size;
}

// ---------------------------------------------------------------- arbol de elementos y menu
const treeOpen = new Set();
let treeSelKey = '';
const selMatch = (n) => n.sel && sel.some((s) => s.k === n.sel.k && s.id === n.sel.id);
function renderTree() {
  if (!document.body.classList.contains('treeopen')) return;
  const body = $('treeBody');
  // agrupar por capa solo tiene sentido si hay capas: sin ellas el boton se oculta y el arbol va por tipo
  const hasLayers = Object.keys(doc.layers || {}).length > 0;
  $('treeBy').hidden = !hasLayers;
  $('treeBy').setAttribute('aria-pressed', String(hasLayers && opts.treeBy === 'layer'));
  const tree = buildTree(doc, { by: hasLayers && opts.treeBy === 'layer' ? 'layer' : 'type' });
  // al cambiar la seleccion desde el lienzo, se abre la rama que lleva al elemento
  const key = sel.map((s) => s.k + s.id).join(',');
  const reveal = key !== treeSelKey && sel.length > 0;
  treeSelKey = key;
  // lo que se revela: el elemento seleccionado, o la relacion elegida (que viene con sus elementos)
  const target = sel.length === 1 || sel[0]?.k === 'co' ? sel[0] : null;
  let focusEl = null;
  const lock = iconSvg('lock');
  const mk = (n, path, depth) => {
    const kids = n.children && n.children.length ? n.children : null;
    const p = path + '/' + n.key;
    const on = !n.group && selMatch(n);
    const head = document.createElement(kids ? 'summary' : 'div');
    head.className = 'row2' + (on ? ' on' : '') + (kids ? '' : ' leaf') + (n.link ? ' lnk' : '');
    const nm = document.createElement('span');
    nm.className = 'nm'; nm.textContent = n.label; nm.title = n.label;
    head.appendChild(nm);
    if (n.act) nm.onclick = (e) => { e.preventDefault(); e.stopPropagation(); treeEditAct(n.act); };
    if (n.sel || n.selMany) {
      nm.onclick = (e) => { e.preventDefault(); e.stopPropagation(); treeSelect(n); };
    }
    const act = (svg, title, fn) => {
      const b = document.createElement('button'); b.className = 'ab'; b.title = title; b.setAttribute('aria-label', title); b.innerHTML = svg;
      b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); fn(); };
      head.appendChild(b);
    };
    if (n.layerId) { const l = doc.layers[n.layerId]; act(iconSvg(l.on ? 'eye' : 'eye-off'), l.on ? 'Apagar capa' : 'Encender capa', () => toggleLayer(n.layerId)); }
    if (n.lock !== undefined) act(iconSvg(n.lock ? 'lock' : 'unlock'), n.lock ? 'Soltar punto' : 'Fijar punto', () => treeToggleFix(n.sel.id));
    if (n.con) {
      const k = doc.cons[n.con];
      if (k && ['DIST', 'DISTPL', 'ANG', 'RAD'].includes(k.t) && !k.ref) act(iconSvg('ruler'), 'Editar valor', () => editDimension(n.con));
      if (k?.t === 'LEAD') act(iconSvg('ruler'), 'Editar etiqueta', () => editLeader(n.con));
    }
    if (n.act) { act(iconSvg('props'), 'Editar', () => treeEditAct(n.act)); act(iconSvg('trash'), 'Borrar', () => { pushUndo(); delete doc.acts?.[n.act]; delete doc.graphs?.[n.act]; delete graphData[n.act]; afterChange(); }); }
    if (n.sel && !n.link && !String(n.key).startsWith('tr:')) act(iconSvg('trash'), 'Borrar', () => treeDelete(n.sel));
    if (!kids) return head;
    const d = document.createElement('details');
    d.className = n.group ? 'grp' : n.sub ? 'sub' : '';
    if (reveal && target && containsSel(n)) treeOpen.add(p);
    d.open = treeOpen.has(p);
    d.addEventListener('toggle', () => { if (d.open) treeOpen.add(p); else treeOpen.delete(p); });
    d.appendChild(head);
    const wrap = document.createElement('div'); wrap.className = 'kids';
    if (d.open) {
      const lim = n.children.slice(0, 300);
      lim.forEach((c) => wrap.appendChild(mk(c, p, depth + 1)));
      if (n.children.length > lim.length) { const m = document.createElement('div'); m.className = 'leaf'; m.textContent = `… ${n.children.length - lim.length} más`; wrap.appendChild(m); }
    } else {
      // se llena al abrir (el arbol puede tener cientos de nodos)
      d.addEventListener('toggle', function fill() {
        if (!d.open || wrap.childElementCount) return;
        n.children.slice(0, 300).forEach((c) => wrap.appendChild(mk(c, p, depth + 1)));
      });
    }
    d.appendChild(wrap);
    if (on && !n.link && !focusEl) focusEl = head;
    return d;
  };
  // solo el lugar propio de un elemento abre su rama; los enlaces (↗) no
  const containsSel = (n) => (n.sel && !n.link && !n.group && n.sel.k === target.k && n.sel.id === target.id) || (n.children || []).some(containsSel);
  body.textContent = '';
  if (!tree.length) { body.innerHTML = '<p style="padding:12px;color:var(--muted)">El dibujo está vacío.</p>'; return; }
  tree.forEach((g) => body.appendChild(mk(g, '', 0)));
  if (!focusEl) focusEl = body.querySelector('.row2.on:not(.lnk)');
  if (reveal && focusEl) focusEl.scrollIntoView({ block: 'nearest' });
}

function elementBounds(items) {
  const pts = [];
  for (const { k, id } of items) {
    if (k === 'pt' && doc.pts[id]) pts.push(doc.pts[id]);
    else if (k === 'ln' && doc.lines[id]) pts.push(doc.pts[doc.lines[id].a], doc.pts[doc.lines[id].b]);
    else if ((k === 'ci' && doc.circles[id]) || (k === 'ar' && doc.arcs[id])) { const o = doc.circles[id] || doc.arcs[id], c = doc.pts[o.c]; pts.push({ x: c.x - o.r, y: c.y - o.r }, { x: c.x + o.r, y: c.y + o.r }); }
    else if (k === 'sp' && doc.splines[id]) pts.push(...doc.splines[id].pts.map((p) => doc.pts[p]));
    else if (k === 'el' && doc.ellipses[id]) pts.push(...ellipsePolyline(doc, doc.ellipses[id], 24));
    else if (k === 'tx' && doc.texts[id]) pts.push(doc.pts[doc.texts[id].pt]);
  }
  return pts.filter(Boolean);
}
// Selecciona un nodo del arbol y, si queda fuera de la vista, centra el lienzo en el.
function treeSelect(n) {
  const s0 = n.sel;
  let items = n.selMany ? n.selMany.filter(exists) : [s0]; // un contorno selecciona todos sus elementos
  if (s0?.k === 'co') {
    const refs = (doc.cons[s0.id]?.refs || []).map((r) => { const k = kindOf(doc, r); return k ? { k, id: r } : null; }).filter(Boolean);
    items = [s0, ...refs];
  }
  sel = items;
  const b = elementBounds(items);
  if (b.length) {
    const r = cv.getBoundingClientRect();
    const out = b.some((p) => { const q = toScreen(p); return q.x < 8 || q.y < 8 || q.x > r.width - 8 || q.y > r.height - 8; });
    if (out) {
      const x0 = Math.min(...b.map((p) => p.x)), x1 = Math.max(...b.map((p) => p.x)), y0 = Math.min(...b.map((p) => p.y)), y1 = Math.max(...b.map((p) => p.y));
      view = { s: view.s, ox: r.width / 2 - ((x0 + x1) / 2) * view.s, oy: r.height / 2 + ((y0 + y1) / 2) * view.s };
    }
  }
  // no reabrir ramas: ya estamos en el arbol; un enlace (↗) si lleva al lugar propio del elemento
  treeSelKey = n.link ? '' : sel.map((s) => s.k + s.id).join(',');
  afterChange();
}
function treeToggleFix(id) {
  const p = doc.pts[id]; if (!p) return;
  pushUndo(); p.fixed = !p.fixed; afterChange();
}
// Actuador o grafica elegidos en el arbol: se resaltan sus elementos y se abre su cuadro.
function treeEditAct(id) {
  const a = doc.acts?.[id];
  if (a) sel = (a.kind === 'MR' ? [{ k: 'ln', id: a.line }, { k: 'pt', id: a.c }] : [{ k: 'pt', id: a.p1 }, { k: 'pt', id: a.p2 }]).filter(exists);
  draw(); editAct(id, false);
}
function treeDelete(s0) {
  pushUndo(); deleteItems(doc, [s0]); sel = sel.filter(exists);
  solve(doc, []);
  afterChange();
}
function applyChrome() {
  document.body.classList.toggle('nopanel', opts.panel === false);
  $('tPanel').setAttribute('aria-pressed', String(opts.panel !== false));
  document.body.classList.toggle('treeopen', !!opts.tree);
  $('tTree').setAttribute('aria-pressed', String(!!opts.tree));
  renderTree();
}
$('tPanel').onclick = () => { opts.panel = opts.panel === false; applyChrome(); persist(); };
$('tTree').onclick = () => { opts.tree = !opts.tree; applyChrome(); persist(); };
$('treeBy').onclick = () => { opts.treeBy = opts.treeBy === 'layer' ? 'type' : 'layer'; persist(); renderTree(); };
$('tHelp').onclick = () => {
  $('helpBody').innerHTML = HELP_HTML + `<p id="helpNone" hidden>Nada en la ayuda coincide con la búsqueda.</p><p style="color:var(--muted);font-size:12px">A-CAD v${VERSION}</p>`;
  fillIconRef();
  $('helpBody').querySelectorAll('details').forEach((d) => { d.dataset.open0 = d.open ? '1' : ''; });
  $('helpSearch').value = '';
  $('dlgH').showModal(); $('helpBody').scrollTop = 0;
};
// Buscador de la ayuda: sin tildes ni mayusculas, todas las palabras deben aparecer. Deja solo los puntos y parrafos que
// coinciden (una seccion cuyo titulo coincide se muestra entera) y abre sus secciones; vacio, vuelve a como estaba.
const helpNorm = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
function filterHelp(q) {
  const body = $('helpBody'), words = helpNorm(q).split(/\s+/).filter(Boolean);
  const hit = (el) => { const t = helpNorm(el.textContent); return words.every((w) => t.includes(w)); };
  const units = body.querySelectorAll('li, p:not(#helpNone), tbody tr');
  for (const el of units) el.hidden = words.length > 0 && !hit(el);
  body.querySelectorAll('details').forEach((d) => { d.hidden = false; }); // lo oculto en la busqueda anterior no cuenta
  // de adentro hacia afuera: una seccion anidada se resuelve antes que la que la contiene
  for (const d of [...body.querySelectorAll('details')].reverse()) {
    if (!words.length) { d.hidden = false; d.open = d.dataset.open0 === '1'; continue; }
    if (hit(d.querySelector(':scope > summary'))) {
      d.querySelectorAll('li, p, tbody tr, details').forEach((el) => { el.hidden = false; if (el.tagName === 'DETAILS') el.open = true; });
    }
    const any = [...d.querySelectorAll('li, p, tbody tr')].some((el) => !el.hidden && !el.closest('details[hidden]'));
    d.hidden = !any; d.open = any;
  }
  // una tabla sin filas visibles se oculta con su titulo
  body.querySelectorAll('table.fref').forEach((tb) => {
    const none = words.length > 0 && ![...tb.querySelectorAll('tbody tr')].some((tr) => !tr.hidden);
    tb.hidden = none;
    const note = tb.previousElementSibling?.tagName === 'P' ? tb.previousElementSibling : null;
    const h = note ? note.previousElementSibling : tb.previousElementSibling;
    if (h?.tagName === 'H4') h.hidden = none && (!note || note.hidden); // una nota que coincide conserva su titulo
  });
  $('helpNone').hidden = !words.length || !!body.querySelector(':scope > details:not([hidden])');
  body.scrollTop = 0;
}
$('helpSearch').addEventListener('input', (e) => filterHelp(e.target.value));
$('helpClose').onclick = () => $('dlgH').close();
$('treeClose').onclick = () => { opts.tree = false; applyChrome(); persist(); };

// Tabla de la ayuda «Íconos en los textos»: cada icono con la linea lista para copiar y los botones que lo usan (sacados de la
// interfaz, asi no se desactualiza). Primero los de los botones, en el orden en que aparecen; despues los demas.
function fillIconRef() {
  const box = $('iconRef');
  if (!box) return;
  const used = new Map();
  document.querySelectorAll('[data-icon]').forEach((el) => {
    const n = el.dataset.icon;
    if (!ICONS[n] || el.closest('#helpBody')) return;
    const lb = (el.querySelector(':scope > span')?.textContent || el.title || el.getAttribute('aria-label') || el.textContent || '').split(/:| · /)[0].replace(/\s+/g, ' ').trim(); // sin la explicacion ni la pista de mantener presionado; un titulo de seccion, por su texto
    if (!used.has(n)) used.set(n, []);
    if (lb && !used.get(n).includes(lb)) used.get(n).push(lb);
  });
  // las herramientas de los botones desplegables (solo una esta a la vista) y los iconos que pone el arbol de elementos
  const more = [...Object.values(GROUPS).flat().map(([, n, lb]) => [n, lb]), ['eye-off', 'Encender capa (árbol de elementos)'], ['unlock', 'Fijar punto (árbol de elementos)']];
  for (const [n, raw] of more) {
    const lb = raw.split(/:| · /)[0].trim();
    if (!ICONS[n]) continue;
    if (!used.has(n)) used.set(n, []);
    if (!used.get(n).includes(lb)) used.get(n).push(lb);
  }
  const names = [...used.keys(), ...Object.keys(ICONS).filter((n) => !used.has(n)).sort()];
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const line = (n) => `![${(used.get(n)?.[0] || n).replace(/[[\]]/g, '')}](icon:${n})`;
  box.innerHTML = `<table class="fref"><thead><tr><th></th><th>Escribe</th><th>Botón</th></tr></thead><tbody>${names.map((n) => `<tr data-copy="${esc(line(n))}" style="cursor:pointer"><td><span style="display:inline-block;width:22px;height:22px">${ICONS[n]}</span></td><td><code>${esc(line(n))}</code></td><td>${esc((used.get(n) || []).join(', ') || '(sin uso en la interfaz)')}</td></tr>`).join('')}</tbody></table>`;
  box.querySelectorAll('svg').forEach((s) => { s.setAttribute('width', '22'); s.setAttribute('height', '22'); });
  box.onclick = (e) => {
    const tr = e.target.closest('tr[data-copy]');
    if (!tr) return;
    navigator.clipboard?.writeText(tr.dataset.copy).then(() => toast('Copiado: ' + tr.dataset.copy), () => toast(tr.dataset.copy));
  };
}

function hydrateIcons() {
  document.querySelectorAll('[data-icon]').forEach((el) => {
    const slot = el.querySelector(':scope > i');
    if (slot) slot.innerHTML = iconSvg(el.dataset.icon);
  });
}

// En pantallas tactiles no hay hover: mantener presionado un boton de la barra muestra su nombre.
function wireLongPressHints() {
  let timer = 0, shown = false;
  const bar = $('bar');
  bar.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('button');
    if (!b || e.pointerType === 'mouse' || b.classList.contains('grp')) return;
    shown = false;
    timer = setTimeout(() => { shown = true; toast(b.title || b.getAttribute('aria-label')); }, 450);
  });
  const stop = () => clearTimeout(timer);
  bar.addEventListener('pointerup', stop); bar.addEventListener('pointercancel', stop); bar.addEventListener('pointerleave', stop);
  bar.addEventListener('click', (e) => { if (shown) { e.stopImmediatePropagation(); e.preventDefault(); shown = false; } }, true);
}

function wireSections() {
  document.querySelectorAll('details.sec').forEach((d) => {
    const saved = opts.sections?.[d.dataset.sec];
    if (typeof saved === 'boolean') d.open = saved;
    d.addEventListener('toggle', () => { opts.sections[d.dataset.sec] = d.open; persist(); });
  });
}
function updateButtons() { $('undo').disabled = !undoStack.length; $('redo').disabled = !redoStack.length; }

// ---------------------------------------------------------------- snap y hit-test
// Puntos que son vertices/centros de lineas, arcos o circulos.
function geometryPoints() {
  const s = new Set();
  for (const l of Object.values(doc.lines)) { s.add(l.a); s.add(l.b); }
  for (const a of Object.values(doc.arcs)) { s.add(a.c); s.add(a.a); s.add(a.b); }
  for (const c of Object.values(doc.circles)) s.add(c.c);
  return s;
}

const selectedTextPoints = () => new Set([...sel.filter((x) => x.k === 'tx').map((x) => doc.texts[x.id]?.pt), ...(selGraph && doc.images?.[selGraph] ? [doc.images[selGraph].pt] : [])].filter(Boolean)); // y el de la imagen seleccionada

// Puntos de insercion propios de un texto (txOnly) que ahora no se muestran: solo se ven con el texto seleccionado.
const selectedSplinePoints = () => new Set(sel.filter((x) => x.k === 'sp').flatMap((x) => doc.splines[x.id]?.pts || []));

function hiddenTextPoints() {
  const geom = geometryPoints(), selTx = selectedTextPoints(), selSp = selectedSplinePoints(), out = layerHiddenPoints(doc);
  for (const [id, p] of Object.entries(doc.pts)) {
    if (p.txOnly && !geom.has(id) && !selTx.has(id)) out.add(id);
    else if (p.splOnly && !geom.has(id) && !selSp.has(id)) out.add(id); // control de un spline trazado: se ve al seleccionar la curva
  }
  return out;
}

// Puntos que se dibujan y se pueden tocar: respeta el interruptor "Puntos" y la regla anterior.
function shownPoints() {
  const hidden = hiddenTextPoints(), selTx = selectedTextPoints(), selSp = selectedSplinePoints();
  const out = new Set();
  for (const id of Object.keys(doc.pts)) {
    if (hidden.has(id)) continue;
    if (opts.pts || selTx.has(id) || selSp.has(id) || isSel('pt', id)) out.add(id);
  }
  return out;
}

// ---- iman a intersecciones: la interseccion de dos elementos cercanos al cursor se toma como punto, una vez
// que el cursor se queda ahi opts.intMs milisegundos (un toque o el inicio de un arrastre la toman al instante).
const DRAW_TOOLS = new Set(['point', 'line', 'vector', 'cline', 'mline', 'circle', 'circle3', 'rect', 'rectc', 'polygon', 'paste', 'ellipse', 'arcc', 'arc3', 'spline', 'text']);
const intSeen = new Map();
let intTimer = 0;
function curvesNear(sx, sy, px) {
  const m = toModel(sx, sy), out = [], r = px / view.s;
  const here = { x: sx, y: sy };
  for (const [id, l] of shownEntries(doc, 'lines')) if (dist(toScreen(closestOnSeg(m, doc.pts[l.a], doc.pts[l.b])), here) <= px) out.push({ k: 'ln', id });
  for (const [id, c] of shownEntries(doc, 'circles')) if (Math.abs(dist(doc.pts[c.c], m) - c.r) <= r) out.push({ k: 'ci', id });
  for (const [id, a] of shownEntries(doc, 'arcs')) {
    const cp = doc.pts[a.c], g = arcOf(doc, a);
    if (Math.abs(dist(cp, m) - a.r) <= r && inSweep(cp, g.a0, g.sweep, m, (px + 2) / Math.max(a.r * view.s, 1))) out.push({ k: 'ar', id });
  }
  for (const [id, sp] of shownEntries(doc, 'splines')) if (closestOnPolyline(splinePolyline(doc, sp, 16), m)?.d <= r) out.push({ k: 'sp', id });
  return out;
}
function intersectionAt(sx, sy) {
  const px = opts.touch ? 16 : 12;
  const near = curvesNear(sx, sy, px + 6);
  if (near.length < 2) return null;
  let best = null;
  for (let i = 0; i < near.length; i++) for (let j = i + 1; j < near.length; j++) {
    for (const p of crossPoints(doc, near[i], near[j])) {
      const d = dist(toScreen(p), { x: sx, y: sy });
      if (d <= px && (!best || d < best.d)) best = { d, p, refs: [near[i], near[j]], key: `${near[i].id}|${near[j].id}|${p.x.toFixed(3)},${p.y.toFixed(3)}` };
    }
  }
  return best;
}
const intReady = (key) => !(opts.intMs > 0) || (intSeen.has(key) && performance.now() - intSeen.get(key) >= opts.intMs);
function trackIntersections(p) {
  if (!DRAW_TOOLS.has(tool)) return;
  const ix = intersectionAt(p.x, p.y);
  if (!ix) { if (intSeen.size) intSeen.clear(); return; }
  if (intSeen.has(ix.key)) return;
  intSeen.clear(); intSeen.set(ix.key, performance.now());
  clearTimeout(intTimer);
  if (opts.intMs > 0) intTimer = setTimeout(draw, opts.intMs + 10);
}

function snapAt(sx, sy, o = {}) {
  const m = toModel(sx, sy);
  const textOnlyHidden = hiddenTextPoints();
  let best = null, bd = 14;
  for (const [id, p] of Object.entries(doc.pts)) {
    if (o.skip === id || textOnlyHidden.has(id)) continue;
    const d = dist(toScreen(p), { x: sx, y: sy });
    if (d < bd) { bd = d; best = { type: 'pt', id, x: p.x, y: p.y }; }
  }
  if (best) return best;
  if (DRAW_TOOLS.has(tool)) {
    const ix = intersectionAt(sx, sy);
    if (ix && (o.press || intReady(ix.key))) return { type: 'int', x: ix.p.x, y: ix.p.y, refs: ix.refs };
  }
  if (DRAW_TOOLS.has(tool)) { // punto medio de una linea (tiene prioridad sobre el resto de la linea)
    let mb = null, md = 14;
    for (const [id, l] of shownEntries(doc, 'lines')) {
      const a = doc.pts[l.a], b = doc.pts[l.b], q = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const d = dist(toScreen(q), { x: sx, y: sy });
      if (d < md && dist(a, b) * view.s > 24) { md = d; mb = { type: 'mid', id, x: q.x, y: q.y }; } // en lineas diminutas estorba
    }
    if (mb) return mb;
  }
  bd = 9;
  for (const [id, l] of shownEntries(doc, 'lines')) {
    const a = doc.pts[l.a], b = doc.pts[l.b];
    const c = closestOnSeg(m, a, b);
    const d = dist(toScreen(c), { x: sx, y: sy });
    if (d < bd) { bd = d; best = { type: 'ln', id, x: c.x, y: c.y }; }
  }
  for (const [id, ci] of shownEntries(doc, 'circles')) {
    const cp = doc.pts[ci.c];
    const dc = dist(cp, m);
    if (dc < 1e-9) continue;
    const d = Math.abs(dc - ci.r) * view.s;
    if (d < bd) { bd = d; best = { type: 'ci', id, x: cp.x + ((m.x - cp.x) / dc) * ci.r, y: cp.y + ((m.y - cp.y) / dc) * ci.r }; }
  }
  for (const [id, ar] of shownEntries(doc, 'arcs')) {
    const cp = doc.pts[ar.c];
    const dc = dist(cp, m);
    if (dc < 1e-9) continue;
    const d = Math.abs(dc - ar.r) * view.s;
    const g = arcOf(doc, ar);
    if (d < bd && inSweep(cp, g.a0, g.sweep, m, 6 / (ar.r * view.s))) {
      bd = d; best = { type: 'ar', id, x: cp.x + ((m.x - cp.x) / dc) * ar.r, y: cp.y + ((m.y - cp.y) / dc) * ar.r };
    }
  }
  for (const [id, sp] of shownEntries(doc, 'splines')) {
    const f = closestOnPolyline(splinePolyline(doc, sp, 16), m);
    if (!f) continue;
    const d = dist(toScreen(f), { x: sx, y: sy });
    if (d < bd) { bd = d; best = { type: 'sp', id, x: f.x, y: f.y }; }
  }
  for (const [id, e] of shownEntries(doc, 'ellipses')) {
    const f = closestOnPolyline(ellipsePolyline(doc, e, 96), m);
    if (!f) continue;
    const d = dist(toScreen(f), { x: sx, y: sy });
    if (d < bd) { const g = ellipseOf(doc, e), q = ellipsePoint(g, ellipseParam(g, f)); bd = d; best = { type: 'el', id, x: q.x, y: q.y }; }
  }
  if (best) return best;
  if (opts.snap) { const g = gridStep(); return { type: 'free', x: Math.round(m.x / g) * g, y: Math.round(m.y / g) * g }; }
  return { type: 'free', x: m.x, y: m.y };
}

// Filtro de seleccion (boton Filtrar): entidades y tipos de linea que no se pueden seleccionar.
const fkOn = (k) => !(opts.filtKinds || []).includes(k);
const fltOk = (o) => !(opts.filtLt || []).includes(o.ltype ?? 'continua');
const selOk = (x) => {
  if (!fkOn(x.k)) return false;
  const o = x.k === 'ln' ? doc.lines[x.id] : x.k === 'ci' ? doc.circles[x.id] : x.k === 'ar' ? doc.arcs[x.id] : x.k === 'sp' ? doc.splines[x.id] : x.k === 'el' ? doc.ellipses[x.id] : null;
  return !o || fltOk(o);
};
function hitTest(sx, sy, noText = false) { // noText: lo que hay debajo de un texto (un toque no selecciona un texto)
  for (const h of labelHits) if (fkOn('co') && sx >= h.x && sx <= h.x + h.w && sy >= h.y && sy <= h.y + h.h) return { k: 'co', id: h.id };
  const m = toModel(sx, sy);
  let best = null, bd = 14;
  const shown = shownPoints();
  for (const [id, p] of Object.entries(doc.pts)) {
    if (!shown.has(id) || !fkOn('pt')) continue;
    const d = dist(toScreen(p), { x: sx, y: sy });
    if (d < bd) { bd = d; best = { k: 'pt', id }; }
  }
  if (best) return best;
  // un texto se toma por su caja (antes que las lineas que pasen por debajo)
  for (const [id, t] of noText ? [] : shownEntries(doc, 'texts')) {
    if (opts.texts && fkOn('tx') && doc.pts[t.pt] && textHit(doc, t, m, measureRel, 2 / view.s)) return { k: 'tx', id };
  }
  best = hitCurves(sx, sy, true);
  if (best) return best;
  for (const [id, h] of shownEntries(doc, 'hatches')) {
    const path = hatchPath(h);
    if (fkOn('ha') && path && ctx.isPointInPath(path, sx * dpr, sy * dpr, 'evenodd')) return { k: 'ha', id };
  }
  return null;
}

// Solo lineas, circulos, arcos y splines (sin puntos): para recortar, extender y elegir direcciones.
function hitCurves(sx, sy, filt = false) {
  const m = toModel(sx, sy);
  let best = null, bd = 11;
  for (const [id, l] of shownEntries(doc, 'lines')) {
    const c = closestOnSeg(m, doc.pts[l.a], doc.pts[l.b]);
    const d = dist(toScreen(c), { x: sx, y: sy });
    if (d < bd && (!filt || (fkOn('ln') && fltOk(l)))) { bd = d; best = { k: 'ln', id }; }
  }
  for (const [id, ci] of shownEntries(doc, 'circles')) {
    const d = Math.abs(dist(doc.pts[ci.c], m) - ci.r) * view.s;
    if (d < bd && (!filt || (fkOn('ci') && fltOk(ci)))) { bd = d; best = { k: 'ci', id }; }
  }
  for (const [id, ar] of shownEntries(doc, 'arcs')) {
    const cp = doc.pts[ar.c];
    const d = Math.abs(dist(cp, m) - ar.r) * view.s;
    const g = arcOf(doc, ar);
    if (d < bd && (!filt || (fkOn('ar') && fltOk(ar))) && inSweep(cp, g.a0, g.sweep, m, 8 / Math.max(ar.r * view.s, 1))) { bd = d; best = { k: 'ar', id }; }
  }
  for (const [id, sp] of shownEntries(doc, 'splines')) {
    const d = distToPolyline(splinePolyline(doc, sp, 12).map(toScreen), sx, sy);
    if (d < bd && (!filt || (fkOn('sp') && fltOk(sp)))) { bd = d; best = { k: 'sp', id }; }
  }
  for (const [id, e] of shownEntries(doc, 'ellipses')) {
    const d = distToPolyline(ellipsePolyline(doc, e, 72).map(toScreen), sx, sy);
    if (d < bd && (!filt || (fkOn('el') && fltOk(e)))) { bd = d; best = { k: 'el', id }; }
  }
  return best;
}

function gridStep() {
  const target = 24 / view.s;
  const p = Math.pow(10, Math.floor(Math.log10(target)));
  for (const m of [1, 2, 5, 10]) if (p * m >= target) return p * m;
  return p * 10;
}

// ---------------------------------------------------------------- dibujo
let dpr = 1;
function resize() {
  dpr = window.devicePixelRatio || 1;
  const r = cv.getBoundingClientRect();
  cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  draw();
}

function hatchPath(h, v = view) {
  const loops = hatchLoops(doc, h);
  if (!loops.length) return null;
  const path = new Path2D();
  const tx = (p) => ({ x: (p.x * v.s + v.ox) * dpr, y: (v.oy - p.y * v.s) * dpr });
  for (const lp of loops) {
    if (lp.pts) {
      lp.pts.forEach((p, i) => { const q = tx(p); if (i) path.lineTo(q.x, q.y); else path.moveTo(q.x, q.y); });
      path.closePath();
    } else {
      const c = tx(lp.c);
      path.moveTo(c.x + lp.r * v.s * dpr, c.y);
      path.arc(c.x, c.y, lp.r * v.s * dpr, 0, Math.PI * 2);
      path.closePath();
    }
  }
  return path;
}

function applyStroke(c, color, w, ltype, o, ls = 1) {
  // constructiva: circulos, elipses y splines se ven en "traza y punto"; las lineas y los arcos se dibujan aparte
  const lt = ltype === 'constructiva' ? allLtypes(doc).trazopunto : (allLtypes(doc)[ltype] || allLtypes(doc).continua);
  c.strokeStyle = colorOf(color, o);
  c.lineWidth = w * dpr;
  c.lineCap = 'butt';
  const k = (Number(opts.ltScale) || 1) * (Number(ls) || 1);
  const d = dashFromPattern(lt.pattern, 0.6).map((x) => Math.max(x, 0.01) * 3 * k * dpr);
  c.setLineDash(d);
  return d;
}

// Poligonal con patron dibujado tramo a tramo (px de dispositivo); sirve para splines y trazados.
function strokePolyline(c, P, dash) {
  c.setLineDash([]);
  c.beginPath();
  let total = 0;
  for (let i = 1; i < P.length; i++) total += Math.hypot(P[i].x - P[i - 1].x, P[i].y - P[i - 1].y);
  const period = dash.reduce((t, v) => t + v, 0);
  if (!dash.length || !(period > 0) || !(total > 0) || total / period > 20000) {
    c.lineCap = 'round';
    P.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)));
    c.stroke();
    return;
  }
  let i = 0, on = true, rem = dash[0];
  c.moveTo(P[0].x, P[0].y);
  for (let k = 1; k < P.length; k++) {
    let x = P[k - 1].x, y = P[k - 1].y, L = Math.hypot(P[k].x - x, P[k].y - y);
    if (!(L > 0)) continue;
    const ux = (P[k].x - x) / L, uy = (P[k].y - y) / L;
    while (L > 1e-9) {
      const take = Math.min(rem, L);
      x += ux * take; y += uy * take; L -= take; rem -= take;
      if (on) c.lineTo(x, y); else c.moveTo(x, y);
      if (rem <= 1e-9) { i++; on = !on; rem = dash[i % dash.length]; if (!(rem > 0)) rem = 1e-3; }
    }
  }
  c.stroke();
}

// Distancia (px) de (sx,sy) a una poligonal en pantalla.
function distToPolyline(P, sx, sy) {
  let best = Infinity;
  for (let i = 1; i < P.length; i++) best = Math.min(best, dist(closestOnSeg({ x: sx, y: sy }, P[i - 1], P[i]), { x: sx, y: sy }));
  return best;
}

// Linea constructiva: punto, hueco, trazo continuo, hueco, punto (px de dispositivo). El hueco es el de las
// lineas de extension de las cotas (unos 3 px).
// el punto es el mismo trazo corto del tipo "traza y punto" (mismo largo y mismo grosor); px de dispositivo
const consDot = (ls = 1) => Math.max(dashFromPattern(allLtypes(doc).trazopunto.pattern, 0.6)[2], 0.01) * 3 * (Number(opts.ltScale) || 1) * (Number(ls) || 1) * dpr;
function strokeConstruction(c, x1, y1, x2, y2, w, ls = 1) {
  c.setLineDash([]);
  const L = Math.hypot(x2 - x1, y2 - y1);
  if (!(L > 0)) return;
  const dot = consDot(ls);
  const ux = (x2 - x1) / L, uy = (y2 - y1) / L, e = dot + 3.5 * dpr;
  const seg = (a, b) => { c.beginPath(); c.moveTo(x1 + ux * a, y1 + uy * a); c.lineTo(x1 + ux * Math.min(b, L), y1 + uy * Math.min(b, L)); c.stroke(); };
  if (L <= 2 * dot + 2 * dpr) { seg(0, L); return; }
  seg(0, dot); seg(L - dot, L);
  if (L > 2 * e + 2 * dpr) seg(e, L - e);
}

// Segmento con patron dibujado tramo a tramo (px de dispositivo).
function strokeLine(c, x1, y1, x2, y2, dash) {
  c.setLineDash([]);
  const L = Math.hypot(x2 - x1, y2 - y1), period = dash.reduce((t, v) => t + v, 0);
  c.beginPath();
  if (!dash.length || !(period > 0) || !(L > 0) || L / period > 20000) {
    c.lineCap = 'round'; // trazo continuo: el remate redondo rellena la esquina donde se juntan dos lineas
    c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    return;
  }
  const ux = (x2 - x1) / L, uy = (y2 - y1) / L;
  let t = 0, i = 0;
  while (t < L) {
    const len = dash[i % dash.length];
    if (!(len > 0)) break;
    if (i % 2 === 0) { const t2 = Math.min(L, t + len); c.moveTo(x1 + ux * t, y1 + uy * t); c.lineTo(x1 + ux * t2, y1 + uy * t2); }
    t += len; i++;
  }
  c.stroke();
}

// Arco (o circulo completo) con patron, dibujado tramo a tramo: no depende del trazo
// punteado nativo sobre curvas, que en algunos navegadores (Safari) no se ve.
// Coordenadas en px de dispositivo; a0 y sweep en el sentido del modelo (antihorario).
function strokeArc(c, cx, cy, r, a0, sweep, dash) {
  c.setLineDash([]);
  const L = r * sweep, period = dash.reduce((t, v) => t + v, 0);
  c.beginPath();
  if (!dash.length || !(period > 0) || L / period > 20000) {
    c.lineCap = 'round';
    c.arc(cx, cy, r, -a0, -(a0 + sweep), true);
    c.stroke();
    return;
  }
  let t = 0, i = 0;
  while (t < L) {
    const len = dash[i % dash.length];
    if (!(len > 0)) break;
    if (i % 2 === 0) {
      const t1 = a0 + t / r, t2 = a0 + Math.min(L, t + len) / r;
      c.moveTo(cx + r * Math.cos(-t1), cy + r * Math.sin(-t1));
      c.arc(cx, cy, r, -t1, -t2, true);
    }
    t += len; i++;
  }
  c.stroke();
}

function draw() {
  if (!document.getElementById('ccPop').hidden) ccCheck(); // la lista de sugerencias no sobrevive a su entrada ni muestra un texto viejo
  setAngleMode(doc); // angulos e indicador decimal del dibujo activos para todo lo que se lea o se escriba
  render(ctx, cv.width, cv.height, view, { fg: theme.fg, bg: theme.bg, grid: opts.grid, cons: opts.cons, dims: opts.dims, texts: opts.texts, ui: true });
  drawHud();
  syncScrollbar();
  syncLinkChip();
}

// ---- encima del dibujo (solo en pantalla, nunca en lo exportado): la lupa del dedo
const LOUPE_R = 62, LOUPE_Z = 2, LOUPE_MS = 280;
let loupe = null, loupeTimer = null; // loupe: { x, y } posicion real del dedo; el circulo se dibuja desplazado para no taparlo
let loupeBuf = null;
function drawHud() {
  const c = ctx, W = cv.width / dpr, H = cv.height / dpr;
  if (!loupe) return;
  const R = LOUPE_R, side = (2 * R) / LOUPE_Z;
  let cx = Math.min(Math.max(loupe.x, R + 4), W - R - 4), cy = loupe.y - R - 34;
  if (cy < R + 4) cy = Math.min(loupe.y + R + 34, H - R - 4); // junto al borde de arriba: debajo del dedo
  const n = Math.max(1, Math.round(side * dpr));
  if (!loupeBuf) loupeBuf = document.createElement('canvas');
  if (loupeBuf.width !== n) { loupeBuf.width = n; loupeBuf.height = n; }
  const b = loupeBuf.getContext('2d');
  b.clearRect(0, 0, n, n);
  b.drawImage(cv, (loupe.x - side / 2) * dpr, (loupe.y - side / 2) * dpr, n, n, 0, 0, n, n); // copia limpia antes de pintar encima
  c.save();
  c.setLineDash([]);
  c.beginPath(); c.arc(cx * dpr, cy * dpr, R * dpr, 0, Math.PI * 2); c.clip();
  c.fillStyle = theme.bg; c.fillRect((cx - R) * dpr, (cy - R) * dpr, 2 * R * dpr, 2 * R * dpr);
  c.drawImage(loupeBuf, 0, 0, n, n, (cx - R) * dpr, (cy - R) * dpr, 2 * R * dpr, 2 * R * dpr);
  c.restore();
  c.save();
  c.setLineDash([]);
  c.strokeStyle = theme.bg; c.lineWidth = 5 * dpr; c.beginPath(); c.arc(cx * dpr, cy * dpr, R * dpr, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = theme.accent; c.lineWidth = 2 * dpr; c.stroke();
  c.lineWidth = dpr; c.beginPath(); // mira en el centro: ahi cae el toque
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { c.moveTo((cx + dx * 5) * dpr, (cy + dy * 5) * dpr); c.lineTo((cx + dx * 14) * dpr, (cy + dy * 14) * dpr); }
  c.stroke();
  c.restore();
}
function loupeCancel() { clearTimeout(loupeTimer); loupeTimer = null; if (loupe) { loupe = null; draw(); } }

// ---- elementos superpuestos: al tocar y sostener sobre varios elementos que comparten lugar (o quedan casi encima), una ventana
// flotante (movible) los lista; los marcados se resaltan en el dibujo y «Confirmar» los deja seleccionados.
const OV_MS = 650;
let ovTimer = null, ovList = [], ovHi = new Set(), ovPos = null;
const ovKey = (k, id) => k + ':' + id;
const ovSync = () => { $('ovProp').disabled = ovHi.size !== 1 || !ovList.some((x) => ovHi.has(ovKey(x.k, x.id)) && doc[OV_COLL[x.k]]?.[x.id] && PROP_NAMES[x.k]); };
const ovCancelTimer = () => { clearTimeout(ovTimer); ovTimer = null; };
function drawOv(c) {
  if (!ovHi.size) return;
  c.save(); c.setLineDash([]); c.lineJoin = 'round'; c.lineCap = 'round';
  c.strokeStyle = '#ff8a00cc'; c.fillStyle = '#ff8a0033';
  const poly = (P) => { c.beginPath(); P.forEach((q, i) => { const s = toScreen(q); if (i) c.lineTo(s.x * dpr, s.y * dpr); else c.moveTo(s.x * dpr, s.y * dpr); }); c.stroke(); };
  for (const key of ovHi) {
    const i = key.indexOf(':'), k = key.slice(0, i), id = key.slice(i + 1), o = doc[OV_COLL[k]]?.[id];
    if (!o) continue;
    c.lineWidth = ((o.w || 2) + 8) * dpr;
    if (k === 'pt') { const s = toScreen(o); c.lineWidth = 3 * dpr; c.beginPath(); c.arc(s.x * dpr, s.y * dpr, 11 * dpr, 0, 7); c.fill(); c.stroke(); }
    else if (k === 'ln') poly([doc.pts[o.a], doc.pts[o.b]]);
    else if (k === 'ci') { const s = toScreen(doc.pts[o.c]); c.beginPath(); c.arc(s.x * dpr, s.y * dpr, o.r * view.s * dpr, 0, 7); c.stroke(); }
    else if (k === 'ar') { const s = toScreen(doc.pts[o.c]), g = arcOf(doc, o); c.beginPath(); c.arc(s.x * dpr, s.y * dpr, o.r * view.s * dpr, -g.a0, -(g.a0 + g.sweep), true); c.stroke(); }
    else if (k === 'sp') poly(splinePolyline(doc, o, 16));
    else if (k === 'el') poly(ellipsePolyline(doc, o, 96));
  }
  c.restore();
}
function closeOverlap() { $('ovDlg').hidden = true; ovList = []; ovHi = new Set(); draw(); }
function openOverlap(cands, at) {
  const box = $('ovDlg'), list = $('ovList');
  ovList = cands.map(({ k, id }) => ({ k, id }));
  ovHi = new Set(ovList.filter((x) => isSel(x.k, x.id)).map((x) => ovKey(x.k, x.id)));
  list.textContent = '';
  ovList.forEach((x, i) => {
    const row = document.createElement('div'); row.className = 'ov-row';
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = 'ovc' + i; cb.checked = ovHi.has(ovKey(x.k, x.id));
    cb.onchange = () => { const key = ovKey(x.k, x.id); if (cb.checked) ovHi.add(key); else ovHi.delete(key); ovSync(); draw(); };
    const lb = document.createElement('label'); lb.htmlFor = cb.id; lb.textContent = ovDescribe(doc, x.k, x.id);
    row.append(cb, lb); list.appendChild(row);
  });
  $('ovCount').textContent = ovList.length + ' cerca';
  $('ovAll').textContent = ovList.every((x) => ovHi.has(ovKey(x.k, x.id))) ? 'Ninguno' : 'Todos';
  ovSync();
  box.hidden = false;
  if (!ovPos) { // al lado opuesto del toque, para no taparlo; el usuario la puede mover
    const r = cv.getBoundingClientRect(), w = box.offsetWidth, h = box.offsetHeight;
    const left = Math.min(Math.max(8, r.left + at.x - w / 2), innerWidth - w - 8);
    const top = at.y > r.height / 2 ? r.top + 8 : Math.max(8, Math.min(r.bottom - h - 8, innerHeight - h - 8));
    box.style.left = left + 'px'; box.style.top = top + 'px';
  } else { // donde la dejo el usuario, sin salirse de la pantalla (puede haber girado el iPad)
    box.style.left = Math.min(Math.max(0, ovPos.left), Math.max(0, innerWidth - box.offsetWidth)) + 'px';
    box.style.top = Math.min(Math.max(0, ovPos.top), Math.max(0, innerHeight - 60)) + 'px';
  }
}
function ovHold(id) {
  const q = pointers.get(id);
  if (!q || pointers.size !== 1 || dist(q, q.down) > 10 || (gesture && gesture.mode !== 'loupe' && !(gesture.mode === 'pan' && !gesture.moved))) return;
  if (drag?.started || drag?.graph || drag?.dim) return;
  const c = nearAll(doc, view, q.down.x, q.down.y, { pts: shownPoints(), entries: (k) => shownEntries(doc, k), ok: (k, o) => fkOn(k) && (k === 'pt' || fltOk(o)) });
  if (c.length < 2) return; // con uno solo no hay nada que elegir: sigue la lupa
  clearTimeout(loupeTimer); loupeTimer = null; loupe = null;
  drag = null; gesture = { mode: 'held', moved: true, last: q.down };
  openOverlap(c, q.down); draw();
}
function ovConfirm() {
  const chosen = ovList.filter((x) => ovHi.has(ovKey(x.k, x.id)) && doc[OV_COLL[x.k]]?.[x.id]);
  sel = [...sel.filter((s) => !ovList.some((x) => same(x, s))), ...chosen];
  selGraph = null;
  closeOverlap(); afterChange();
  toast(chosen.length ? `${chosen.length} elemento${chosen.length === 1 ? '' : 's'} seleccionado${chosen.length === 1 ? '' : 's'}` : 'Selección sin los elementos de la lista');
}
{
  const box = $('ovDlg'), head = $('ovHead');
  let mv = null;
  head.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; head.setPointerCapture(e.pointerId); const r = box.getBoundingClientRect(); mv = { dx: e.clientX - r.left, dy: e.clientY - r.top }; head.style.cursor = 'grabbing'; });
  head.addEventListener('pointermove', (e) => {
    if (!mv) return;
    const w = box.offsetWidth;
    const left = Math.min(Math.max(0, e.clientX - mv.dx), innerWidth - w), top = Math.min(Math.max(0, e.clientY - mv.dy), innerHeight - 40);
    box.style.left = left + 'px'; box.style.top = top + 'px'; ovPos = { left, top };
  });
  const end = () => { mv = null; head.style.cursor = ''; };
  head.addEventListener('pointerup', end); head.addEventListener('pointercancel', end);
  $('ovOk').onclick = ovConfirm;
  $('ovNo').onclick = closeOverlap; $('ovX').onclick = closeOverlap;
  $('ovAll').onclick = () => {
    const all = ovList.every((x) => ovHi.has(ovKey(x.k, x.id)));
    ovHi = new Set(all ? [] : ovList.map((x) => ovKey(x.k, x.id)));
    ovList.forEach((x, i) => { const cb = $('ovc' + i); if (cb) cb.checked = ovHi.has(ovKey(x.k, x.id)); });
    $('ovAll').textContent = all ? 'Todos' : 'Ninguno'; ovSync(); draw();
  };
  // Propiedades del elemento marcado: lo deja seleccionado (sin tocar el resto) y abre su ventana; esta lista sigue abierta al volver.
  $('ovProp').onclick = () => {
    const x = ovList.find((y) => ovHi.has(ovKey(y.k, y.id)) && doc[OV_COLL[y.k]]?.[y.id]);
    if (!x || ovHi.size !== 1) return;
    if (!isSel(x.k, x.id)) sel.push({ k: x.k, id: x.id });
    selGraph = null; afterChange(); openProps({ k: x.k, id: x.id });
  };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !box.hidden) { e.stopPropagation(); closeOverlap(); } });
}

// ctx en pixeles de dispositivo. o: {fg,bg,grid,cons,ui}
export function render(c, W, H, v, o) {
  const saveView = view;
  view = v;
  labelBg = o.bg;
  c.save();
  c.fillStyle = o.bg; c.fillRect(0, 0, W, H);
  if (o.grid) drawGrid(c, W, H);
  if (o.ui && globalDoc().page) drawPage(c, W, H, globalDoc().page);
  labelHits = [];
  drawImages(c, o);
  // rellenos
  for (const [id, h] of shownEntries(doc, 'hatches')) drawHatch(c, id, h, o);
  // circulos y lineas
  for (const [id, ci] of shownEntries(doc, 'circles')) {
    const p = doc.pts[ci.c];
    const s = toScreen(p);
    if (o.ui && isSel('ci', id)) { c.setLineDash([]); c.strokeStyle = theme.sel + '88'; c.lineWidth = (ci.w + 6) * dpr; c.beginPath(); c.arc(s.x * dpr, s.y * dpr, ci.r * v.s * dpr, 0, 7); c.stroke(); }
    const dsh = applyStroke(c, ci.color, ci.w, ci.ltype, o, ci.ls);
    strokeArc(c, s.x * dpr, s.y * dpr, ci.r * v.s * dpr, 0, Math.PI * 2, dsh);
  }
  for (const [id, ar] of shownEntries(doc, 'arcs')) {
    const sc = toScreen(doc.pts[ar.c]);
    const { a0, sweep } = arcOf(doc, ar);
    const trace = () => { c.beginPath(); c.arc(sc.x * dpr, sc.y * dpr, ar.r * v.s * dpr, -a0, -(a0 + sweep), true); };
    if (o.ui && isSel('ar', id)) { c.setLineDash([]); c.strokeStyle = theme.sel + '88'; c.lineWidth = (ar.w + 6) * dpr; trace(); c.stroke(); }
    const dsh = applyStroke(c, ar.color, ar.w, ar.ltype, o, ar.ls);
    strokeArc(c, sc.x * dpr, sc.y * dpr, ar.r * v.s * dpr, a0, sweep, ar.ltype === 'constructiva' ? constructionArcDash(ar.r * v.s * dpr * sweep, consDot(ar.ls), 3.5 * dpr) : dsh);
  }
  for (const [id, l] of shownEntries(doc, 'lines')) {
    const a = toScreen(doc.pts[l.a]), b = toScreen(doc.pts[l.b]);
    if (o.ui && isSel('ln', id)) { c.setLineDash([]); c.strokeStyle = theme.sel + '88'; c.lineWidth = (l.w + 6) * dpr; c.beginPath(); c.moveTo(a.x * dpr, a.y * dpr); c.lineTo(b.x * dpr, b.y * dpr); c.stroke(); }
    const dsh = applyStroke(c, l.color, l.w, l.ltype, o, l.ls);
    if (l.ltype === 'constructiva') strokeConstruction(c, a.x * dpr, a.y * dpr, b.x * dpr, b.y * dpr, l.w, l.ls);
    else strokeLine(c, a.x * dpr, a.y * dpr, b.x * dpr, b.y * dpr, dsh);
    const A = l.vec && vecArrow(doc, l); // cabeza de flecha del vector (en la cabeza; con rev, en el punto a)
    if (A) {
      const tp = toScreen(A.tip), ux = A.dir.x, uy = -A.dir.y, len = Math.min(11 + l.w * 2, dist(a, b) * 0.6), hw = len * 0.33;
      c.setLineDash([]); c.fillStyle = colorOf(l.color, o);
      c.beginPath(); c.moveTo(tp.x * dpr, tp.y * dpr);
      c.lineTo((tp.x - ux * len - uy * hw) * dpr, (tp.y - uy * len + ux * hw) * dpr); c.lineTo((tp.x - ux * len + uy * hw) * dpr, (tp.y - uy * len - ux * hw) * dpr);
      c.closePath(); c.fill();
    }
  }
  drawActs(c, o);
  drawGraphs(c, o);
  for (const [id, sp] of shownEntries(doc, 'splines')) {
    const P = splinePolyline(doc, sp, 16).map((q) => { const s = toScreen(q); return { x: s.x * dpr, y: s.y * dpr }; });
    if (o.ui && isSel('sp', id)) {
      c.setLineDash([]); c.strokeStyle = theme.sel + '88'; c.lineWidth = (sp.w + 6) * dpr; c.lineJoin = 'round';
      c.beginPath(); P.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y))); c.stroke();
    }
    const dsh = applyStroke(c, sp.color, sp.w, sp.ltype, o, sp.ls);
    c.lineJoin = 'round';
    strokePolyline(c, P, dsh);
  }
  for (const [id, e] of shownEntries(doc, 'ellipses')) {
    const P = ellipsePolyline(doc, e, 96).map((q) => { const s = toScreen(q); return { x: s.x * dpr, y: s.y * dpr }; });
    if (o.ui && isSel('el', id)) {
      c.setLineDash([]); c.strokeStyle = theme.sel + '88'; c.lineWidth = (e.w + 6) * dpr; c.lineJoin = 'round';
      c.beginPath(); P.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y))); c.stroke();
    }
    const dsh = applyStroke(c, e.color, e.w, e.ltype, o, e.ls);
    c.lineJoin = 'round';
    strokePolyline(c, P, dsh);
  }
  for (const tr of Object.values(doc.traces)) {
    if (tr.pts.length < 2) continue;
    const P = tr.pts.map((q) => { const s = toScreen(q); return { x: s.x * dpr, y: s.y * dpr }; });
    const dsh = applyStroke(c, tr.color, tr.w, tr.ltype, o, tr.ls);
    c.lineJoin = 'round';
    strokePolyline(c, P, dsh);
  }
  c.setLineDash([]);
  if (o.texts !== false) drawTexts(c, o);
  if (o.cons || o.dims) drawConstraints(c, o);
  if (o.ui) {
    const shown = shownPoints();
    for (const [id, p] of Object.entries(doc.pts)) {
      if (!shown.has(id)) continue;
      const s = toScreen(p);
      const selp = isSel('pt', id) || sel.some((x) => x.k === 'tx' && doc.texts[x.id]?.pt === id);
      c.fillStyle = selp ? theme.sel : p.color && p.color !== 'auto' ? p.color : o.fg;
      if (isMark(doc, id)) { // marca de referencia: una x
        const r = (selp ? 5.5 : 4.5) * dpr, x0 = s.x * dpr, y0 = s.y * dpr;
        c.save(); c.strokeStyle = c.fillStyle; c.lineWidth = 2 * dpr; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x0 - r, y0 - r); c.lineTo(x0 + r, y0 + r); c.moveTo(x0 + r, y0 - r); c.lineTo(x0 - r, y0 + r); c.stroke();
        c.restore();
      } else if (p.fixed) c.fillRect((s.x - 4) * dpr, (s.y - 4) * dpr, 8 * dpr, 8 * dpr);
      else { c.beginPath(); c.arc(s.x * dpr, s.y * dpr, (selp ? 5 : 3.2) * dpr, 0, 7); c.fill(); }
    }
    drawOv(c);
    if (o.ui && txState) txLayout(); // la entrada de texto acompana al dibujo al moverlo o ampliarlo
    drawPreview(c);
  }
  c.restore();
  view = saveView;
}

function drawGrid(c, W, H) {
  const g = gridStep();
  const tl = toModel(0, 0), br = toModel(W / dpr, H / dpr);
  c.lineWidth = dpr;
  for (let x = Math.floor(tl.x / g) * g; x <= br.x; x += g) {
    const major = Math.abs(Math.round(x / g)) % 5 === 0;
    c.strokeStyle = x === 0 ? theme.muted : major ? theme.grid2 : theme.grid;
    const sx = Math.round(toScreen({ x, y: 0 }).x * dpr) + 0.5;
    c.beginPath(); c.moveTo(sx, 0); c.lineTo(sx, H); c.stroke();
  }
  for (let y = Math.floor(br.y / g) * g; y <= tl.y; y += g) {
    const major = Math.abs(Math.round(y / g)) % 5 === 0;
    c.strokeStyle = y === 0 ? theme.muted : major ? theme.grid2 : theme.grid;
    const sy = Math.round(toScreen({ x: 0, y }).y * dpr) + 0.5;
    c.beginPath(); c.moveTo(0, sy); c.lineTo(W, sy); c.stroke();
  }
}

// La pagina: fuera de su ancho y por encima de la primera hoja el lienzo se sombrea; bordes continuos y margenes a trazos.
// Las hojas se repiten hacia abajo (cada salto de pagina es un borde inferior, una franja sombreada y el borde superior
// de la siguiente). Solo en pantalla; no limita nada: un dibujo o una formula mas ancha se ve desbordada, y un texto
// que cruza un salto no pasa solo a la hoja siguiente.
const PAGE_GAP = 8; // px de pantalla entre hojas
function drawPage(c, W, H, pg) {
  const X = (x) => Math.round(toScreen({ x, y: 0 }).x * dpr) + 0.5;
  const Y = (y) => Math.round(toScreen({ x: 0, y }).y * dpr) + 0.5;
  const x0 = pg.x0 || 0, a = X(x0), b = X(x0 + pg.w), ph = pageH(pg), top = pageTop(pg);
  const ma = X(x0 + pg.m), mb = X(x0 + pg.w - pg.m), gap = PAGE_GAP * dpr;
  // hojas visibles: k = 0 es la primera; por encima de ella no hay pagina
  const k0 = Math.max(0, Math.floor((top - toModel(0, 0).y) / ph));
  const k1 = Math.max(k0, Math.floor((top - toModel(0, H / dpr).y) / ph));
  c.save();
  c.globalAlpha = 0.07; c.fillStyle = theme.fg;
  if (a > 0) c.fillRect(0, 0, a, H);
  if (b < W) c.fillRect(b, 0, W - b, H);
  const yTop = Y(top);
  if (yTop > 0) c.fillRect(Math.max(a, 0), 0, Math.min(b, W) - Math.max(a, 0), yTop);
  for (let k = Math.max(1, k0); k <= k1 + 1; k++) { // franja entre hojas
    const y = Y(top - k * ph);
    c.fillRect(Math.max(a, 0), y - gap / 2, Math.min(b, W) - Math.max(a, 0), gap);
  }
  c.globalAlpha = 1; c.strokeStyle = theme.muted; c.lineWidth = dpr;
  c.setLineDash([]);
  const line = (x1, y1, x2, y2) => { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); };
  line(a, Math.max(yTop, 0), a, H); line(b, Math.max(yTop, 0), b, H);
  for (let k = k0; k <= k1 + 1; k++) {
    const y = Y(top - k * ph);
    if (k === 0) line(a, y, b, y);
    else { line(a, y - gap / 2, b, y - gap / 2); line(a, y + gap / 2, b, y + gap / 2); }
  }
  c.setLineDash([6 * dpr, 5 * dpr]); c.globalAlpha = 0.6;
  line(ma, Math.max(yTop, 0), ma, H); line(mb, Math.max(yTop, 0), mb, H);
  for (let k = k0; k <= k1; k++) {
    line(a, Y(top - k * ph - pg.m), b, Y(top - k * ph - pg.m));
    line(a, Y(top - (k + 1) * ph + pg.m), b, Y(top - (k + 1) * ph + pg.m));
  }
  c.restore();
}

function drawHatch(c, id, h, o) {
  const path = hatchPath(h);
  if (!path) return;
  c.save();
  const col = colorOf(h.color, o);
  if (o.ui && isSel('ha', id)) { c.fillStyle = theme.sel + '33'; c.fill(path, 'evenodd'); }
  if (h.kind === 'solid') {
    c.globalAlpha = h.alpha ?? 0.45; c.fillStyle = col; c.fill(path, 'evenodd');
  } else {
    c.clip(path, 'evenodd');
    c.strokeStyle = col; c.lineWidth = dpr; c.globalAlpha = Math.max(h.alpha ?? 1, 0.6); c.setLineDash([]);
    const loops = hatchLoops(doc, h);
    let minx = 1e18, miny = 1e18, maxx = -1e18, maxy = -1e18;
    for (const lp of loops) {
      const pts = lp.pts || [{ x: lp.c.x - lp.r, y: lp.c.y - lp.r }, { x: lp.c.x + lp.r, y: lp.c.y + lp.r }];
      for (const p of pts) { const s = toScreen(p); minx = Math.min(minx, s.x); maxx = Math.max(maxx, s.x); miny = Math.min(miny, s.y); maxy = Math.max(maxy, s.y); }
    }
    const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2, R = Math.hypot(maxx - minx, maxy - miny) / 2 + 2;
    const sp = Math.max(2, h.spacing || 8);
    const angs = h.kind === 'cross' ? [h.angle, h.angle + 90] : [h.angle];
    for (const a of angs) {
      const t = (-a * Math.PI) / 180, dx = Math.cos(t), dy = Math.sin(t);
      c.beginPath();
      for (let k = -R; k <= R; k += sp) {
        const px = cx - dy * k, py = cy + dx * k;
        c.moveTo((px - dx * R) * dpr, (py - dy * R) * dpr); c.lineTo((px + dx * R) * dpr, (py + dy * R) * dpr);
      }
      c.stroke();
    }
  }
  c.restore();
}

let labelBg = '#fff';
// Etiqueta de cota con formula («$D/2$», ver splitLabel): se dibuja con el motor de los textos, centrada en (x, y), de px de alto
function mathLabel(c, src, x, y, id, color, px = 12) {
  const t = { text: src, h: px / view.s, anchor: 'mc' }, f = textFrame(t, measureRel, 'mc'), sc = view.s;
  const w = f.w * sc + 8 * px / 12, h = Math.max(f.hh * sc + 4, 18 * px / 12), bx = x - w / 2, by = y - h / 2;
  c.save();
  c.fillStyle = labelBg; c.globalAlpha = 0.85; c.beginPath(); c.roundRect(bx * dpr, by * dpr, w * dpr, h * dpr, 4 * dpr); c.fill(); c.globalAlpha = 1;
  c.translate(x * dpr, y * dpr); c.textBaseline = 'alphabetic'; c.fillStyle = c.strokeStyle = color; c.lineCap = 'round'; c.lineJoin = 'round'; c.setLineDash([]);
  for (const p of framePrims(f, t)) {
    c.fillStyle = c.strokeStyle = p.col || color;
    if (p.k === 't') { c.font = `${p.it ? 'italic ' : ''}${p.bold ? 'bold ' : ''}${p.size * sc * dpr}px ${fontCss(p.font)}`; c.fillText(p.s, p.x * sc * dpr, -p.y * sc * dpr); }
    else { c.lineWidth = Math.max(p.lw * sc * dpr, dpr); c.beginPath(); p.pts.forEach(([px2, py2], k) => (k ? c.lineTo(px2 * sc * dpr, -py2 * sc * dpr) : c.moveTo(px2 * sc * dpr, -py2 * sc * dpr))); if (p.fill) c.fill(); c.stroke(); }
  }
  c.restore();
  if (id) labelHits.push({ x: bx, y: by, w, h, id });
}
function label(c, text, x, y, id, color, italic = false, underline = false, px = 12) {
  if (lblIsMath(text)) { mathLabel(c, text, x, y, id, color, px); return; }
  c.save();
  c.font = `${italic ? 'italic ' : ''}${px * dpr}px -apple-system, system-ui, sans-serif`;
  const w = c.measureText(text).width / dpr + 8 * px / 12, h = 18 * px / 12;
  const bx = x - w / 2, by = y - h / 2;
  c.fillStyle = labelBg; c.globalAlpha = 0.85;
  c.beginPath(); c.roundRect(bx * dpr, by * dpr, w * dpr, h * dpr, 4 * dpr); c.fill();
  c.globalAlpha = 1; c.fillStyle = color; c.textBaseline = 'middle'; c.textAlign = 'center';
  c.fillText(text, x * dpr, y * dpr + dpr);
  if (underline) { const tw = c.measureText(text).width; c.strokeStyle = color; c.lineWidth = dpr; c.beginPath(); c.moveTo(x * dpr - tw / 2, (y + 8 * px / 12) * dpr); c.lineTo(x * dpr + tw / 2, (y + 8 * px / 12) * dpr); c.stroke(); } // cota a escala: subrayada
  c.restore();
  if (id) labelHits.push({ x: bx, y: by, w, h, id });
}

// Posicion cercana a un elemento (punto, linea, circulo, arco, spline) donde se rotula una relacion.
function anchorOf(r) {
  if (r in doc.pts) return doc.pts[r];
  if (r in doc.lines) { const l = doc.lines[r], a = doc.pts[l.a], b = doc.pts[l.b]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
  if (r in doc.circles) { const o = doc.circles[r], c = doc.pts[o.c]; return { x: c.x + o.r * Math.SQRT1_2, y: c.y + o.r * Math.SQRT1_2 }; }
  if (r in doc.arcs) { const o = doc.arcs[r], c = doc.pts[o.c], g = arcOf(doc, o), t = g.a0 + g.sweep / 2; return { x: c.x + o.r * Math.cos(t), y: c.y + o.r * Math.sin(t) }; }
  if (r in (doc.splines || {})) { const P = splinePolyline(doc, doc.splines[r], 8); return P[Math.floor(P.length / 2)]; }
  if (r in (doc.ellipses || {})) { const P = ellipsePolyline(doc, doc.ellipses[r], 48); return P[Math.min(6, P.length >> 1)]; }
  return null;
}
// Donde se rotula una relacion: junto a cada elemento que involucra (el mismo numero en todos), tambien las de un punto con un
// elemento (punto y elemento) y las horizontales o verticales entre 2 puntos (los dos).
function conAnchors(k) {
  const r = k.refs;
  if (['PONL', 'PONC', 'PONS', 'PONE'].includes(k.t)) return [anchorOf(r[0]), anchorOf(r[1])]; // el punto Y el elemento: se ve con cual se relaciona
  if (k.t === 'COI') return [anchorOf(r[0])];
  if (k.t === 'MID') return [anchorOf(r[2])];
  return r.map(anchorOf); // horizontal o vertical entre 2 puntos: junto a los dos
}

const FONT = '-apple-system, system-ui, "Segoe UI", sans-serif';
let mctx = null;
// ancho de una linea de texto para altura 1 (se escala por la altura real del texto)
function measureRel(line, font, italic = false) {
  if (!mctx) mctx = document.createElement('canvas').getContext('2d');
  mctx.font = `${italic ? 'italic ' : ''}100px ${fontCss(font)}`;
  return mctx.measureText(line).width / 100;
}

// Dibuja el contenido de un texto ya ubicado (origen en su punto de insercion): formulas con sus trazos, o lineas con sus tramos
function paintFrame(c, f, t, color, sc = view.s) {
    c.font = `${t.h * sc * dpr}px ${fontCss(t.font)}`;
    c.fillStyle = color; c.textBaseline = 'top'; c.textAlign = 'left';
    if (f.math) { // con formulas ($...$, $$...$$): textos en su linea base y trazos (barras, raices, parentesis grandes)
      c.textBaseline = 'alphabetic'; c.strokeStyle = c.fillStyle; c.lineCap = 'round'; c.lineJoin = 'round'; c.setLineDash([]);
      const base = c.fillStyle;
      for (const p of framePrims(f, t)) {
        c.fillStyle = c.strokeStyle = p.col || base; // color(red)(x)
        // con el ancho medido como tope: en el iPad la letra del sistema (SF) cambia de proporciones con el tamaño (se mide a 100 px y se
        // dibuja a otro), y sin tope un tramo se monta sobre el siguiente; el tope solo lo estrecha un poco si se pasaria
        if (p.k === 't') { c.font = `${p.it ? 'italic ' : ''}${p.bold ? 'bold ' : ''}${p.size * sc * dpr}px ${fontCss(p.font)}`; if (p.w > 0) c.fillText(p.s, p.x * sc * dpr, -p.y * sc * dpr, p.w * sc * dpr); else c.fillText(p.s, p.x * sc * dpr, -p.y * sc * dpr); } else {
          c.lineWidth = Math.max(p.lw * sc * dpr, dpr); c.beginPath();
          p.pts.forEach(([x, y], k) => (k ? c.lineTo(x * sc * dpr, -y * sc * dpr) : c.moveTo(x * sc * dpr, -y * sc * dpr)));
          if (p.op < 1) c.globalAlpha = p.op; // iconos: lineas de ayuda tenues
          if (p.fill) c.fill();
          c.stroke(); c.globalAlpha = 1;
        }
      }
    } else f.lines.forEach((ln, i) => {
      let x = f.xmin; // las definiciones de variables («x:=valor») van en cursiva: cada tramo con su fuente
      for (const r of runsOf(ln)) {
        c.font = `${r.it ? 'italic ' : ''}${t.h * sc * dpr}px ${fontCss(t.font)}`;
        const rw = measureRel(r.s, t.font, r.it) * t.h; // tope: el ancho medido (ver el caso con formulas)
        c.fillText(r.s, x * sc * dpr, (-f.ymax * sc + (i * LINE_SPACING + 0.1) * t.h * sc) * dpr, Math.max(rw * sc * dpr, 1e-3));
        x += rw;
      }
    });
}

function drawTexts(c, o) {
  for (const [id, t] of shownEntries(doc, 'texts')) {
    const P = doc.pts[t.pt];
    if (!P || (o.ui && txState?.edit === id)) continue; // el que se edita en el lugar: la entrada ocupa su sitio
    const pose = textPose(doc, t);
    const S = toScreen(P), f = textFrame(shownText(doc, t), measureRel, pose.anchor), sc = view.s;
    c.save();
    c.translate(S.x * dpr, S.y * dpr);
    c.rotate(-(pose.ang * Math.PI) / 180);
    if (t.bg) { // color de fondo: un rectangulo bajo la caja del texto, con un margen
      const pad = TEXT_BG_PAD * t.h;
      c.fillStyle = t.bg === 'auto' ? o.bg : t.bg; c.fillRect((f.xmin - pad) * sc * dpr, (-f.ymax - pad) * sc * dpr, (f.w + 2 * pad) * sc * dpr, (f.hh + 2 * pad) * sc * dpr); // «auto»: el color del papel
    }
    paintFrame(c, f, t, colorOf(t.color, o));
    if (o.ui && isSel('tx', id)) {
      c.strokeStyle = theme.sel; c.lineWidth = 1.5 * dpr; c.setLineDash([5 * dpr, 3 * dpr]);
      c.strokeRect(f.xmin * sc * dpr, -f.ymax * sc * dpr, f.w * sc * dpr, f.hh * sc * dpr);
    }
    c.restore();
  }
}

// cabeza de flecha con la punta en (x,y) apuntando hacia (dx,dy); medidas en px de pantalla
function arrowHead(c, { x, y, dx, dy, len: l0, hw }, g = 1) {
  const len = l0 ?? ARROW * g, w = hw ?? ARROW * ARROW_HW * g, bx = x - dx * len, by = y - dy * len, nx = -dy, ny = dx; // ASME Y14.2: 3:1
  c.beginPath();
  c.moveTo(x * dpr, y * dpr); c.lineTo((bx + nx * w) * dpr, (by + ny * w) * dpr); c.lineTo((bx - nx * w) * dpr, (by - ny * w) * dpr);
  c.closePath(); c.fill();
}

function drawDim(c, id, k, col, o = null) {
  const L = layoutDim(doc, k, view);
  c.save();
  if (k.t === 'LEAD') { applyStroke(c, k.color ?? 'auto', k.w ?? 2, k.ltype, o || {}, k.ls ?? 1); c.strokeStyle = col; } else { c.strokeStyle = col; c.lineWidth = dpr; c.setLineDash([]); }
  c.fillStyle = col;
  for (const l of L.lines) { c.beginPath(); c.moveTo(l[0] * dpr, l[1] * dpr); c.lineTo(l[2] * dpr, l[3] * dpr); c.stroke(); }
  for (const a of L.arcs) {
    c.beginPath(); c.arc(a.cx * dpr, a.cy * dpr, a.r * dpr, a.a0, a.a1, a.ccw);
    c.setLineDash(a.dashed ? [4 * dpr, 3 * dpr] : []); c.stroke();
  }
  c.setLineDash([]);
  for (const ar of L.arrows) arrowHead(c, ar, ar.g || L.size);
  c.restore();
  if (L.label?.model) drawLeadLabel(c, L.label, id, col); // linea indicativa: un texto en unidades del dibujo
  else if (L.label) label(c, L.label.text, L.label.x, L.label.y, id, col, L.label.italic, L.label.underline, L.label.px);
}

// Etiqueta de una linea indicativa: un texto con altura en unidades del dibujo y su anclaje en (x, y) de pantalla
function drawLeadLabel(c, lab, id, color) {
  const t = { text: lab.text, h: lab.h, anchor: lab.anchor, ...(lab.font ? { font: lab.font } : {}) }, f = textFrame(t, measureRel, lab.anchor), sc = view.s;
  c.save(); c.translate(lab.x * dpr, lab.y * dpr); paintFrame(c, f, t, color); c.restore();
  const bx = lab.x + f.xmin * sc, by = lab.y - f.ymax * sc, bw = f.w * sc, bh = f.hh * sc, px = Math.max(0, (24 - bw) / 2), py = Math.max(0, (24 - bh) / 2); // se puede tocar aunque se vea chica
  if (id) labelHits.push({ x: bx - px, y: by - py, w: bw + 2 * px, h: bh + 2 * py, id });
}

function drawConstraints(c, o) {
  const used = {}, hp = Object.values(doc.layers || {}).some((l) => !l.on) ? layerHiddenPoints(doc) : null;
  for (const [id, k] of Object.entries(doc.cons)) {
    if (k.hidden || (hp && consHidden(doc, k, hp))) continue;
    // al exportar (sin interfaz) las cotas van en el color del dibujo y no se pintan los simbolos de relaciones
    const col = !o.ui ? o.fg : isSel('co', id) ? theme.sel : theme.accent;
    if (k.t === 'LEAD') { if (!(k.h > 0)) k.h = cur.tx.h ?? niceHeight(); /* una de antes, sin altura: la de los textos nuevos */ const lc = (leadBody(doc, k) || k).color ?? 'auto'; if (o.dims) drawDim(c, id, k, !o.ui ? colorOf(lc, o) : isSel('co', id) ? theme.sel : colorOf(lc, o), o); continue; } // línea indicativa: con su color, tipo y grosor
    if (k.t === 'DIST' || k.t === 'DISTPL' || k.t === 'ANG' || k.t === 'ANG4' || k.t === 'RAD') { if (o.dims) drawDim(c, id, k, col); continue; }
    if (!o.cons) continue;
    const text = conTag(k);
    if (!text) continue;
    for (const m of conAnchors(k)) {
      if (!m) continue;
      const sp = toScreen(m);
      const key = `${Math.round(sp.x)},${Math.round(sp.y)}`;
      used[key] = (used[key] || 0) + 1;
      label(c, text, sp.x + 12 + (used[key] - 1) * 26, sp.y + 14, id, col);
    }
  }
}

function drawPreview(c) {
  c.save();
  c.setLineDash([6 * dpr, 4 * dpr]); c.lineWidth = 1.5 * dpr; c.strokeStyle = theme.accent;
  const axis = (id, flip, color, tag) => {
    const l = doc.lines[id]; if (!l) return;
    let a = toScreen(doc.pts[l.a]), b = toScreen(doc.pts[l.b]);
    if (flip) [a, b] = [b, a];
    const L = Math.hypot(b.x - a.x, b.y - a.y) || 1, ux = (b.x - a.x) / L, uy = (b.y - a.y) / L;
    c.save(); c.setLineDash([]); c.strokeStyle = color; c.fillStyle = color; c.lineWidth = 4 * dpr; c.globalAlpha = 0.85; c.lineCap = 'round';
    c.beginPath(); c.moveTo(a.x * dpr, a.y * dpr); c.lineTo(b.x * dpr, b.y * dpr); c.stroke();
    const h = 11 * dpr; // punta de flecha en el extremo final (sentido de copiado)
    c.beginPath(); c.moveTo(b.x * dpr + ux * h, b.y * dpr + uy * h); c.lineTo(b.x * dpr - ux * h * 0.2 - uy * h * 0.7, b.y * dpr - uy * h * 0.2 + ux * h * 0.7); c.lineTo(b.x * dpr - ux * h * 0.2 + uy * h * 0.7, b.y * dpr - uy * h * 0.2 - ux * h * 0.7); c.closePath(); c.fill();
    c.globalAlpha = 1; c.font = `bold ${13 * dpr}px system-ui`; c.fillText(tag, ((a.x + b.x) / 2 + 8) * dpr, ((a.y + b.y) / 2 - 8) * dpr);
    c.restore();
  };
  if (arrAxes) { axis(arrAxes.l1, arrAxes.f1, theme.accent, '1'); axis(arrAxes.l2, arrAxes.f2, theme.warn, '2'); }
  if (circC) { // centro de la matriz circular
    const q = toScreen(circC);
    c.save(); c.setLineDash([]); c.strokeStyle = theme.warn; c.lineWidth = 2 * dpr;
    c.beginPath(); c.arc(q.x * dpr, q.y * dpr, 8 * dpr, 0, 7); c.moveTo((q.x - 13) * dpr, q.y * dpr); c.lineTo((q.x + 13) * dpr, q.y * dpr); c.moveTo(q.x * dpr, (q.y - 13) * dpr); c.lineTo(q.x * dpr, (q.y + 13) * dpr); c.stroke(); c.restore();
  }
  if (pickResolve && pickKind === 'ln' && hover) { const hl = hitCurves(hover.x, hover.y); if (hl?.k === 'ln') axis(hl.id, false, theme.sel, ''); }
  if (tool === 'select' && drag?.box && drag.boxOn && drag.p1) { // cuadro de seleccion
    const x = Math.min(drag.p0.x, drag.p1.x) * dpr, y = Math.min(drag.p0.y, drag.p1.y) * dpr, w = Math.abs(drag.p1.x - drag.p0.x) * dpr, h = Math.abs(drag.p1.y - drag.p0.y) * dpr;
    const crossing = drag.p1.x < drag.p0.x;
    c.save(); c.globalAlpha = 0.1; c.fillStyle = crossing ? theme.sel : theme.accent; c.fillRect(x, y, w, h); c.globalAlpha = 1;
    c.strokeStyle = crossing ? theme.sel : theme.accent; c.lineWidth = 1.5 * dpr; c.setLineDash(crossing ? [6 * dpr, 4 * dpr] : []); c.strokeRect(x, y, w, h); c.restore();
  }
  if (tool === 'trim' && drag?.trail?.length > 1) { // trazo de recorte
    c.strokeStyle = theme.warn; c.lineWidth = 2 * dpr; c.setLineDash([3 * dpr, 4 * dpr]);
    c.beginPath(); drag.trail.forEach((q, i) => (i ? c.lineTo(q.x * dpr, q.y * dpr) : c.moveTo(q.x * dpr, q.y * dpr))); c.stroke();
    c.strokeStyle = theme.accent; c.lineWidth = 1.5 * dpr; c.setLineDash([6 * dpr, 4 * dpr]);
  }
  if (hover) {
    let s = snapAt(hover.x, hover.y);
    // bloqueo suave de la linea que se esta dibujando (pendiente o arrastrando)
    const lref = tool === 'line' || tool === 'vector' || tool === 'cline' || tool === 'mline' || tool === 'polygon' ? lineStartRef() : null;
    const lk = lref ? lockFor(lref, hover) : null;
    if (lk) s = { type: lk.end ? lk.end.type : 'free', x: lk.x, y: lk.y };
    const sp = toScreen(s);
    if (s.type === 'int') label(c, '∩', sp.x + 14, sp.y - 14, null, theme.accent);
    if (s.type === 'mid') label(c, 'M', sp.x + 14, sp.y - 14, null, theme.accent);
    c.setLineDash([]); c.beginPath();
    if (tool === 'select') { c.arc(hover.x * dpr, hover.y * dpr, 7 * dpr, 0, 7); c.strokeStyle = theme.muted; } // seleccionar no usa iman: el aro marca el punto real
    else { c.arc(sp.x * dpr, sp.y * dpr, 7 * dpr, 0, 7); c.strokeStyle = s.type === 'free' ? theme.muted : theme.accent; }
    c.stroke();
    if (lref) {
      const S0 = lref.id ? doc.pts[lref.id] : lref.snap;
      const a = toScreen(S0);
      if (lk) { // guia de la direccion bloqueada
        c.save(); c.setLineDash([2 * dpr, 5 * dpr]); c.globalAlpha = 0.7; c.strokeStyle = theme.accent;
        c.beginPath(); c.moveTo((a.x - lk.u.x * 4000) * dpr, (a.y + lk.u.y * 4000) * dpr); c.lineTo((a.x + lk.u.x * 4000) * dpr, (a.y - lk.u.y * 4000) * dpr); c.stroke(); c.restore();
      }
      c.setLineDash([6 * dpr, 4 * dpr]); c.strokeStyle = theme.accent;
      c.beginPath(); c.moveTo(a.x * dpr, a.y * dpr); c.lineTo(sp.x * dpr, sp.y * dpr); c.stroke();
      label(c, fmt(dist(S0, s)), (a.x + sp.x) / 2, (a.y + sp.y) / 2 - 14, null, theme.accent);
      if (lk) label(c, lk.label, sp.x + 16, sp.y - 16, null, theme.accent);
    }
    if (tool === 'mline') { // la mitad que se ve crecer del otro lado
      const M0 = pending?.m ? doc.pts[pending.m] : (!pending && drag?.moved ? snapAt(drag.p0.x, drag.p0.y, { press: true }) : null);
      if (M0) {
        const a = toScreen({ x: 2 * M0.x - s.x, y: 2 * M0.y - s.y }), m = toScreen(M0);
        c.setLineDash([6 * dpr, 4 * dpr]); c.strokeStyle = theme.accent; c.beginPath(); c.moveTo(a.x * dpr, a.y * dpr); c.lineTo(m.x * dpr, m.y * dpr); c.stroke();
        c.setLineDash([]); c.beginPath(); c.arc(m.x * dpr, m.y * dpr, 4 * dpr, 0, 7); c.stroke();
        label(c, 'L = ' + fmt(2 * dist(M0, s)), (a.x + sp.x) / 2, (a.y + sp.y) / 2 + 16, null, theme.accent);
      }
    }
    if (tool === 'paste' && clip) { // cuadro de lo copiado, centrado en el cursor
      const b = clip.bbox, w = b.x1 - b.x0, h = b.y1 - b.y0, tl = toScreen({ x: s.x - w / 2, y: s.y + h / 2 });
      c.setLineDash([6 * dpr, 4 * dpr]); c.strokeStyle = theme.accent; c.strokeRect(tl.x * dpr, tl.y * dpr, w * view.s * dpr, h * view.s * dpr);
    }
    if (tool === 'circle3' && pending?.ids) {
      const A = doc.pts[pending.ids[0]];
      c.setLineDash([6 * dpr, 4 * dpr]); c.strokeStyle = theme.accent; c.beginPath();
      if (pending.ids.length === 1) { const a = toScreen(A); c.moveTo(a.x * dpr, a.y * dpr); c.lineTo(sp.x * dpr, sp.y * dpr); c.stroke(); }
      else {
        const g = circleThrough3(A, doc.pts[pending.ids[1]], s);
        if (g) { const cc = toScreen(g.c); c.arc(cc.x * dpr, cc.y * dpr, g.r * view.s * dpr, 0, 7); c.stroke(); label(c, 'R' + fmt(g.r), cc.x, cc.y - g.r * view.s - 14, null, theme.accent); }
      }
    }
    if (tool === 'rect' || tool === 'rectc') {
      const P0 = pending?.s ? doc.pts[pending.s] : (!pending && drag?.moved ? snapAt(drag.p0.x, drag.p0.y, { press: true }) : null);
      if (P0) {
        const A = tool === 'rectc' ? { x: 2 * P0.x - s.x, y: 2 * P0.y - s.y } : P0, a = toScreen(A), b = toScreen(s);
        c.setLineDash([6 * dpr, 4 * dpr]); c.strokeStyle = theme.accent; c.strokeRect(a.x * dpr, a.y * dpr, (b.x - a.x) * dpr, (b.y - a.y) * dpr);
        label(c, `${fmt(Math.abs(s.x - A.x))} × ${fmt(Math.abs(s.y - A.y))}`, (a.x + b.x) / 2, Math.min(a.y, b.y) - 14, null, theme.accent);
      }
    }
    if (tool === 'polygon') {
      const C0 = pending?.c ? doc.pts[pending.c] : (!pending && drag?.moved ? snapAt(drag.p0.x, drag.p0.y, { press: true }) : null);
      if (C0 && dist(C0, s) > 1e-9) {
        const V = polygonVertices(C0, s, opts.polyN, opts.polyCirc).map(toScreen);
        c.setLineDash([6 * dpr, 4 * dpr]); c.strokeStyle = theme.accent; c.beginPath();
        V.forEach((q, i) => (i ? c.lineTo(q.x * dpr, q.y * dpr) : c.moveTo(q.x * dpr, q.y * dpr))); c.closePath(); c.stroke();
      }
    }
    if (tool === 'ellipse' && pending?.g) { // elipse parcial: la elipse de referencia y el tramo que se va marcando
      const g = pending.g, path = (t0, sw, n) => {
        c.beginPath();
        for (let i = 0; i <= n; i++) { const q = toScreen(ellipsePoint(g, t0 + (sw * i) / n)); if (i) c.lineTo(q.x * dpr, q.y * dpr); else c.moveTo(q.x * dpr, q.y * dpr); }
        c.stroke();
      };
      c.setLineDash([6 * dpr, 4 * dpr]); c.strokeStyle = theme.accent; path(0, TAU, 96);
      if (pending.t1 !== undefined) {
        const a = earcSweep(hover ? ellipseParam(g, toModel(hover.x, hover.y)) : pending.t1);
        c.setLineDash([]); c.lineWidth = 3.5 * dpr; path(a.t0, a.sweep, 96);
        const q = toScreen(ellipsePoint(g, pending.t1));
        c.fillStyle = theme.accent; c.beginPath(); c.arc(q.x * dpr, q.y * dpr, 4.5 * dpr, 0, 7); c.fill();
        const cs = toScreen({ x: g.cx, y: g.cy });
        label(c, `${fmt((a.sweep * 180) / Math.PI)}° ${a.cw ? '↻' : '↺'}`, cs.x, cs.y - 18, null, theme.accent);
      }
    } else if (tool === 'ellipse' && pending?.c) {
      const C = doc.pts[pending.c], cs = toScreen(C);
      c.setLineDash([6 * dpr, 4 * dpr]); c.strokeStyle = theme.accent;
      if (!pending.a) {
        c.beginPath(); c.moveTo(cs.x * dpr, cs.y * dpr); c.lineTo(sp.x * dpr, sp.y * dpr); c.stroke();
        label(c, 'a = ' + fmt(dist(C, s)), (cs.x + sp.x) / 2, (cs.y + sp.y) / 2 - 14, null, theme.accent);
      } else {
        const A = doc.pts[pending.a], ra = dist(C, A) || 1e-9, ux = (A.x - C.x) / ra, uy = (A.y - C.y) / ra;
        const rb = Math.abs((s.x - C.x) * -uy + (s.y - C.y) * ux);
        const pts = [];
        for (let i = 0; i <= 72; i++) { const t = (i / 72) * 2 * Math.PI, x = ra * Math.cos(t), y = rb * Math.sin(t); pts.push(toScreen({ x: C.x + x * ux - y * uy, y: C.y + x * uy + y * ux })); }
        c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(q.x * dpr, q.y * dpr) : c.moveTo(q.x * dpr, q.y * dpr))); c.stroke();
        const as = toScreen(A);
        c.beginPath(); c.moveTo(cs.x * dpr, cs.y * dpr); c.lineTo(as.x * dpr, as.y * dpr); c.stroke();
        label(c, `a = ${fmt(ra)}   b = ${fmt(rb)}`, cs.x, cs.y - 18, null, theme.accent);
      }
    }
    if (tool === 'arcc' && pending?.center) {
      const cc = toScreen(doc.pts[pending.center]);
      if (!pending.start) {
        const r = dist(cc, sp);
        c.setLineDash([6 * dpr, 4 * dpr]); c.beginPath(); c.arc(cc.x * dpr, cc.y * dpr, r * dpr, 0, 7); c.stroke();
        label(c, 'R' + fmt(r / view.s), cc.x, cc.y - r - 14, null, theme.accent);
      } else {
        const C = doc.pts[pending.center], S = doc.pts[pending.start];
        const a0 = Math.atan2(S.y - C.y, S.x - C.x);
        const aE = Math.atan2(s.y - C.y, s.x - C.x);
        const cw = arcCW(s);
        let sw = (((cw ? a0 - aE : aE - a0) % TAU) + TAU) % TAU;
        if (sw < 1e-4) sw = TAU;
        c.setLineDash([6 * dpr, 4 * dpr]); c.beginPath();
        c.arc(cc.x * dpr, cc.y * dpr, dist(C, S) * view.s * dpr, -a0, -(cw ? a0 - sw : a0 + sw), !cw); c.stroke();
        label(c, (cw ? '↻ ' : '↺ ') + fmt((sw * 180) / Math.PI) + '°', cc.x, cc.y - dist(C, S) * view.s - 14, null, theme.accent);
      }
    }
    if (tool === 'arc3' && pending?.a) {
      const A = doc.pts[pending.a];
      c.setLineDash([6 * dpr, 4 * dpr]); c.beginPath();
      if (!pending.m) {
        const a = toScreen(A); c.moveTo(a.x * dpr, a.y * dpr); c.lineTo(sp.x * dpr, sp.y * dpr); c.stroke();
      } else {
        const g3 = arcThrough3(A, pending.m, s);
        if (g3) {
          const cc = toScreen(g3.c);
          const S0 = g3.startIsA ? A : s, E0 = g3.startIsA ? s : A;
          const a0 = Math.atan2(S0.y - g3.c.y, S0.x - g3.c.x), aE = Math.atan2(E0.y - g3.c.y, E0.x - g3.c.x);
          let sw = (((aE - a0) % TAU) + TAU) % TAU;
          if (sw < 1e-4) sw = TAU;
          c.arc(cc.x * dpr, cc.y * dpr, g3.r * view.s * dpr, -a0, -(a0 + sw), true); c.stroke();
          label(c, 'R' + fmt(g3.r), cc.x, cc.y - g3.r * view.s - 14, null, theme.accent);
        }
        const m = toScreen(pending.m);
        c.setLineDash([]); c.beginPath(); c.arc(m.x * dpr, m.y * dpr, 4 * dpr, 0, 7); c.stroke();
      }
    }
    if (tool === 'spline' && pending?.ids) {
      const Pm = pending.ids.map((id) => doc.pts[id]);
      if (!(s.type === 'pt' && s.id === pending.ids[pending.ids.length - 1])) Pm.push({ x: s.x, y: s.y });
      const Sm = splineSamples(Pm, false, 12).map(toScreen);
      c.setLineDash([6 * dpr, 4 * dpr]); c.beginPath();
      Sm.forEach((q, i) => (i ? c.lineTo(q.x * dpr, q.y * dpr) : c.moveTo(q.x * dpr, q.y * dpr)));
      c.stroke();
    }
    if (tool === 'circle' && pending?.center) {
      const cc = toScreen(doc.pts[pending.center]);
      const r = dist(cc, sp);
      c.setLineDash([6 * dpr, 4 * dpr]); c.beginPath(); c.arc(cc.x * dpr, cc.y * dpr, r * dpr, 0, 7); c.stroke();
      label(c, 'R' + fmt(r / view.s), cc.x, cc.y - r - 14, null, theme.accent);
    }
  }
  c.restore();
}

// ---------------------------------------------------------------- entrada
function pos(e) { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
const style = () => consMode ? { ...CLINE_STYLE } : ({ color: cur.color, ltype: cur.ltype === 'constructiva' ? 'continua' : cur.ltype, w: cur.w, ls: cur.ls });
const lineStyle = () => (tool === 'cline' ? { ...CLINE_STYLE } : style());

// ---- bloqueo suave de lineas ----
// Inicio de la linea en curso: un punto ya creado (clic-clic) o lo que se toco al empezar a arrastrar.
function lineStartRef() {
  const st = pending?.start ?? (tool === 'polygon' ? pending?.c : tool === 'mline' ? pending?.m : null);
  if (st && doc.pts[st]) return { id: st };
  if (!pending && drag?.moved && !drag.hit) return { snap: snapAt(drag.p0.x, drag.p0.y, { press: true }) };
  return null;
}
function lockFor(ref, scr, press = false) {
  if (opts.lock === false || !ref) return null;
  const S = ref.id ? doc.pts[ref.id] : ref.snap;
  const origins = ref.id ? originsOfPoint(doc, ref.id) : originsOfSnap(doc, ref.snap);
  return lineLock(doc, S, origins, snapAt(scr.x, scr.y, { press }), toModel(scr.x, scr.y), view.s, opts.touch ? 12 : 9, { step: opts.lockDeg });
}
const lockEnd = (lk) => (lk.end ? { type: lk.end.type, id: lk.end.id, x: lk.x, y: lk.y } : { type: 'free', x: lk.x, y: lk.y });
// Agrega las restricciones del bloqueo; si chocan con las existentes se quitan y la linea queda como esta.
function applyLock(lineId, lk) {
  const ids = lockConstraints(lk, lineId).map((k) => addCon(doc, k));
  if (!ids.length) return;
  if (!solve(doc, []).ok) ids.forEach((i) => { delete doc.cons[i]; });
}

function pointFrom(s) {
  if (s.type === 'pt') return s.id;
  const id = addPoint(doc, s.x, s.y, true);
  if (s.type === 'int') for (const r of s.refs) addCon(doc, { t: r.k === 'ln' ? 'PONL' : r.k === 'sp' ? 'PONS' : r.k === 'el' ? 'PONE' : 'PONC', refs: [id, r.id], hidden: true });
  if (s.type === 'ln') addCon(doc, { t: 'PONL', refs: [id, s.id], hidden: true });
  if (s.type === 'mid') addCon(doc, { t: 'MID', refs: [doc.lines[s.id].a, doc.lines[s.id].b, id], hidden: true });
  if (s.type === 'ci' || s.type === 'ar') addCon(doc, { t: 'PONC', refs: [id, s.id], hidden: true });
  if (s.type === 'sp') addCon(doc, { t: 'PONS', refs: [id, s.id], hidden: true });
  if (s.type === 'el') addCon(doc, { t: 'PONE', refs: [id, s.id], hidden: true });
  return id;
}

// Sentido del arco por centro y extremos: sigue el movimiento del cursor alrededor del centro desde el inicio.
function trackArc(p) {
  if (tool !== 'arcc' || !pending?.start || !pending.center) return;
  const C = doc.pts[pending.center], S = doc.pts[pending.start], m = toModel(p.x, p.y);
  if (dist(m, C) < 1e-9) return;
  if (!pending.dir) pending.dir = { last: Math.atan2(S.y - C.y, S.x - C.x), acc: 0 };
  const a = Math.atan2(m.y - C.y, m.x - C.x);
  const d = ((((a - pending.dir.last) + Math.PI) % TAU) + TAU) % TAU - Math.PI;
  pending.dir.acc += d; pending.dir.last = a;
}
const arcCW = (E) => { const C = doc.pts[pending.center], S = doc.pts[pending.start]; return arcIsClockwise(pending.dir?.acc ?? 0, C, S, E); };

// Elipse parcial: tramo que va de pending.t1 al parametro t2. El sentido lo da el movimiento acumulado del cursor
// sobre la elipse de referencia; si casi no hubo (dos toques), el tramo corto.
function earcSweep(t2) {
  const acc = pending.dir?.acc ?? 0, d = (((t2 - pending.t1) % TAU) + TAU) % TAU;
  const cw = Math.abs(acc) > 0.05 ? acc < 0 : d > Math.PI;
  const sweep = cw ? (TAU - d) % TAU : d;
  return { cw, sweep, t0: cw ? t2 : pending.t1 };
}
function trackEarc(p) {
  if (tool !== 'ellipse' || !pending?.g || pending.t1 === undefined) return;
  const a = ellipseParam(pending.g, toModel(p.x, p.y));
  const d = ((((a - pending.dir.last) + Math.PI) % TAU) + TAU) % TAU - Math.PI;
  pending.dir.acc += d; pending.dir.last = a;
}
function makeEarc(t2) {
  const g = pending.g, a = earcSweep(t2);
  if (a.sweep < 0.02) { toast('El tramo es demasiado corto: arrastra sobre la elipse o toca otro punto'); return; }
  pushUndo();
  const b = pending.b.id || addPoint(doc, pending.b.x, pending.b.y, false);
  const q1 = ellipsePoint(g, a.t0), q2 = ellipsePoint(g, a.t0 + a.sweep);
  const p1 = addPoint(doc, q1.x, q1.y, true), p2 = addPoint(doc, q2.x, q2.y, true);
  addEllipse(doc, pending.c, pending.a, b, style(), p1, p2);
  addCon(doc, { t: 'ANG4', refs: [pending.c, pending.a, pending.c, b], v: pending.b.rb > 0 ? 90 : -90, hidden: true });
  pending = null; finishEdit();
}

function cancelPending() {
  if (pending) { pending = null; cleanup(doc); }
  hover = hover; draw();
}

cv.addEventListener('contextmenu', (e) => e.preventDefault());
// Safari ignora user-scalable=no: el pellizco sobre la pagina (fuera del lienzo, que usa sus propios eventos) la agranda; se bloquea
for (const ev of ['gesturestart', 'gesturechange']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
cv.addEventListener('pointerdown', (e) => {
  cv.setPointerCapture(e.pointerId);
  const p = pos(e);
  pointers.set(e.pointerId, { ...p, type: e.pointerType, button: e.button, down: p });
  const touches = [...pointers.values()].filter((q) => q.type === 'touch');
  if (touches.length >= 2) { loupeCancel(); startGesture(); return; }
  if (e.pointerType === 'touch' && (opts.touch || tool === 'select')) {
    // tocar y sostener sin mover: aparece la lupa 2x (con el dedo en modo "mover" solo en Seleccion)
    const id = e.pointerId;
    clearTimeout(loupeTimer);
    loupeTimer = setTimeout(() => {
      loupeTimer = null;
      const q = pointers.get(id);
      if (!q || pointers.size !== 1 || dist(q, q.down) > 10) return;
      if (gesture) { if (gesture.mode !== 'pan' || gesture.moved) return; gesture.mode = 'loupe'; }
      else if (tool === 'select') { // dedo dibuja + Seleccionar: sostener es apuntar (suelta y selecciona), no mover ni hacer cuadro
        if (drag?.started) return;
        drag = { p0: q.down, hit: null, started: false };
      }
      loupe = { x: q.x, y: q.y }; draw();
    }, LOUPE_MS);
  }
  ovCancelTimer();
  if (tool === 'select' && !sim && !pickResolve && (e.pointerType !== 'mouse' || e.button === 0) && !spaceDown) { const id = e.pointerId; ovTimer = setTimeout(() => { ovTimer = null; ovHold(id); }, OV_MS); }
  if (e.pointerType === 'touch' && !opts.touch) { gesture = { mode: 'pan', last: p, moved: false }; return; }
  if (e.pointerType === 'mouse' && (e.button === 1 || e.button === 2 || spaceDown)) { gesture = { mode: 'pan', last: p, moved: true }; return; }
  trackIntersections(p);
  toolDown(p);
});
// Con «?perf» en la direccion se muestra, al mover, cuanto tarda cada parte (rastreo, calculo del solver, dibujo) en este
// dispositivo: sirve para saber que pesa en un iPad o un telefono sin adivinar.
const PERF = new URLSearchParams(location.search).has('perf');
const perfLog = [];
let perfSolveMs = 0; // lo que tardo solo la resolucion (solver) dentro del movimiento
function perfShow(tTrack, tMove, tDraw, dragging, tSolve = 0) {
  const perfWasm = [perfStats.push, perfStats.solve, perfStats.read], tWasm = perfWasm[0] + perfWasm[1] + perfWasm[2];
  let box = document.getElementById('perfBox');
  if (!box) { box = document.createElement('div'); box.id = 'perfBox'; box.style.cssText = 'position:fixed;top:4px;right:4px;max-width:calc(100vw - 8px);z-index:99;background:rgba(0,0,0,.72);color:#fff;font:11px/1.35 monospace;padding:4px 8px;border-radius:6px;pointer-events:none;white-space:pre'; document.body.appendChild(box); }
  const row = [tTrack, tMove, tDraw, tSolve]; if (dragging) perfLog.push(row); if (perfLog.length > 20) perfLog.shift();
  const avg = (i) => (perfLog.length ? perfLog.reduce((a, r) => a + r[i], 0) / perfLog.length : 0).toFixed(0);
  box.textContent = `${dragging ? 'arrastre' : 'mover'}: rastreo ${tTrack.toFixed(0)}, movimiento ${tMove.toFixed(0)}, dibujo ${tDraw.toFixed(0)} ms
resolver ${tSolve.toFixed(0)} = WASM ${tWasm.toFixed(0)} (carga ${perfWasm[0].toFixed(0)}, calculo ${perfWasm[1].toFixed(0)}, lectura ${perfWasm[2].toFixed(0)}) + JS ${(tSolve - tWasm).toFixed(0)}
media de ${perfLog.length}: rastreo ${avg(0)}, mov ${avg(1)} (resolver ${avg(3)}), dibujo ${avg(2)} ms (dpr ${window.devicePixelRatio})`;
}
cv.addEventListener('pointermove', (e) => {
  const p = pos(e);
  const q = pointers.get(e.pointerId);
  if (q) { q.x = p.x; q.y = p.y; }
  if (loupeTimer && q?.down && dist(p, q.down) > 10) { clearTimeout(loupeTimer); loupeTimer = null; } // se movio antes de tiempo: no es sostener
  if (ovTimer && q?.down && dist(p, q.down) > 10) ovCancelTimer();
  if (loupe && q) loupe = { x: p.x, y: p.y };
  if (gesture) { gestureMove(); return; }
  hover = p;
  const tp0 = PERF ? performance.now() : 0;
  perfSolveMs = 0; perfStats.push = perfStats.solve = perfStats.read = 0;
  trackIntersections(p);
  trackArc(p); trackEarc(p);
  const tp1 = PERF ? performance.now() : 0;
  if (q) toolMove(p);
  const tp2 = PERF ? performance.now() : 0;
  updateStatus(p);
  draw();
  if (PERF) perfShow(tp1 - tp0, tp2 - tp1, performance.now() - tp2, !!q, perfSolveMs);
});
function endPointer(e) {
  tapMod = !!(e.ctrlKey || e.metaKey); // Ctrl/Cmd + clic sobre un enlace lo abre sin seleccionar antes
  endSession(); thawDimOrder(doc); ovCancelTimer();
  const q = pointers.get(e.pointerId);
  pointers.delete(e.pointerId);
  const hadLoupe = !!loupe;
  clearTimeout(loupeTimer); loupeTimer = null; loupe = null;
  if (gesture?.mode === 'loupe') { // el dedo apuntaba con la lupa: al soltar se selecciona lo que habia bajo la mira
    if (!pointers.size) { gesture = null; if (e.type === 'pointerup') tapSelect(pos(e)); }
    draw();
    return;
  }
  if (hadLoupe) draw();
  if (gesture) {
    const wasTap = gesture.mode === 'pan' && !gesture.moved && e.pointerType === 'touch' && !opts.touch;
    if (!pointers.size) { gesture = null; if (wasTap && e.type === 'pointerup') tapSelect(pos(e)); }
    else if (gesture.mode === 'pinch') gesture = null;
    return;
  }
  if (q && e.type === 'pointerup') toolUp(pos(e), q);
  else if (q) { drag = null; }
}
cv.addEventListener('pointerup', endPointer);
cv.addEventListener('pointercancel', endPointer);
cv.addEventListener('pointerleave', () => { if (!pointers.size) { hover = null; draw(); } });
// Rueda: zoom sin pagina. Con pagina, recorre la hoja como un editor de texto (Mayús o la rueda horizontal, de lado);
// Ctrl+rueda (y el pellizco del trackpad, que llega asi) sigue siendo zoom.
cv.addEventListener('wheel', (e) => {
  e.preventDefault();
  const p = pos(e);
  if (globalDoc().page && !e.ctrlKey && !e.metaKey) {
    const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? cv.getBoundingClientRect().height : 1; // lineas o paginas -> px
    const dx = (e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) * k, dy = e.shiftKey && !e.deltaX ? 0 : e.deltaY * k;
    view.ox -= dx; view.oy -= dy;
    clampPage(); draw(); persist();
    return;
  }
  zoomAt(p, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
}, { passive: false });

function zoomAt(p, f) {
  const ns = Math.min(2000, Math.max(0.05, view.s * f));
  f = ns / view.s;
  view.ox = p.x - (p.x - view.ox) * f; view.oy = p.y - (p.y - view.oy) * f; view.s = ns;
  clampPage(); draw(); persist();
}
// Con pagina, el desplazamiento de lado se limita a la hoja: si cabe en la pantalla queda centrada; si no (con zoom), sus
// bordes no se despegan de los de la pantalla (PAGE_PAD px de holgura, como en Ajustar vista). Hacia arriba y abajo, libre.
const PAGE_PAD = 12;
function clampPage() {
  const pg = globalDoc().page;
  if (!pg) return;
  const W = cv.getBoundingClientRect().width, L = (pg.x0 || 0) * view.s, w = pg.w * view.s;
  if (w + 2 * PAGE_PAD <= W) view.ox = (W - w) / 2 - L;
  else view.ox = Math.min(PAGE_PAD - L, Math.max(W - PAGE_PAD - L - w, view.ox));
}

function startGesture() {
  drag = null; endSession(); thawDimOrder(doc); ovCancelTimer();
  const t = [...pointers.values()].filter((q) => q.type === 'touch').slice(0, 2);
  gesture = { mode: 'pinch', d0: dist(t[0], t[1]) || 1, s0: view.s, c0: { x: (t[0].x + t[1].x) / 2, y: (t[0].y + t[1].y) / 2 }, o0: { x: view.ox, y: view.oy } };
}
function gestureMove() {
  if (gesture.mode === 'loupe') {
    const q = [...pointers.values()][0];
    if (q) { loupe = { x: q.x, y: q.y }; draw(); }
    return;
  }
  if (gesture.mode === 'pan') {
    const q = [...pointers.values()][0];
    if (!q) return;
    if (!gesture.moved && dist(q, gesture.last) > 5) gesture.moved = true;
    if (gesture.moved) { view.ox += q.x - gesture.last.x; view.oy += q.y - gesture.last.y; gesture.last = { x: q.x, y: q.y }; clampPage(); draw(); persist(); }
  } else {
    const t = [...pointers.values()].filter((q) => q.type === 'touch').slice(0, 2);
    if (t.length < 2) return;
    const d = dist(t[0], t[1]), c = { x: (t[0].x + t[1].x) / 2, y: (t[0].y + t[1].y) / 2 };
    const ns = Math.min(2000, Math.max(0.05, gesture.s0 * (d / gesture.d0))), f = ns / gesture.s0;
    view.s = ns;
    view.ox = c.x - (gesture.c0.x - gesture.o0.x) * f; view.oy = c.y - (gesture.c0.y - gesture.o0.y) * f;
    clampPage(); draw(); persist();
  }
}

function tapSelect(p) {
  if (tool === 'select') selectAt(p);
}

let pickResolve = null, pickKind = 'ln'; // si hay una promesa esperando, el siguiente toque elige una linea o un punto
function pickLine(msg, kind = 'ln') {
  setTool('select');
  pickKind = kind;
  toast(msg + ' (Esc cancela)');
  $('status').textContent = msg;
  return new Promise((res) => { pickResolve = res; });
}

let lastCoTap = null, lastTap = null, lastGraphTap = null, lastTxTap = null, lastImgTap = null, txTapHint = false;
let selGraph = null; // grafica seleccionada (resaltada; se mueve y se redimensiona)
// Graficas elegidas con un cuadro de seleccion junto con otros elementos (o varias): valen mientras sel sea el mismo arreglo (owner); cualquier
// seleccion nueva (sel = [...]) las suelta sola. selGraph, la de un toque, tambien cuenta.
let selMulti = null;
const boxOf = (id) => doc.graphs?.[id] || doc.images?.[id]; // una grafica o una imagen: un rectangulo que se mueve y se redimensiona
const multiGraphs = () => {
  const s = new Set(selMulti && selMulti.owner === sel ? selMulti.ids : []);
  if (selGraph) s.add(selGraph);
  for (const id of [...s]) if (!boxOf(id)) s.delete(id);
  return s;
};

// ---- herramienta Acotar: una sola herramienta que elige la cota segun lo seleccionado
const DIMMABLE = ['pt', 'ln', 'ci', 'ar', 'el', 'sp', 'tx'];
const linesParallel = (l1, l2) => {
  const [a, b] = lineEnds(l1).map((i) => doc.pts[i]), [c, d] = lineEnds(l2).map((i) => doc.pts[i]);
  const L1 = dist(a, b), L2 = dist(c, d);
  return L1 > 1e-9 && L2 > 1e-9 && Math.abs((b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x)) / (L1 * L2) <= 0.0175;
};
// Que cota corresponde a la seleccion: { kind } si ya se puede acotar, { wait } si falta tocar algo, { err } si no se puede.
// pre: la seleccion ya estaba hecha al elegir la herramienta (una sola linea se acota por su longitud).
function dimPlan(pre) {
  const its = sel.filter((x) => DIMMABLE.includes(x.k));
  const cls = its.map((x) => (x.k === 'pt' || x.k === 'tx' ? 'P' : x.k === 'ln' ? 'L' : x.k === 'ci' || x.k === 'ar' ? 'C' : x.k === 'el' ? 'E' : 'S'));
  const has = (c) => cls.includes(c);
  if (!its.length) return { wait: true };
  if (its.length > 2) return { err: 'Acota de a uno o dos elementos' };
  if (its.length === 1) {
    if (cls[0] === 'C') return { kind: 'RAD' };
    if (cls[0] === 'L' && pre) return { kind: 'DIM' };
    return { wait: true };
  }
  if (has('P') && (has('S') || has('E'))) { // punto + spline o elipse: solo la línea indicativa, si el punto es suyo
    const pi = cls.indexOf('P'), q = its[pi].k === 'tx' ? doc.texts[its[pi].id]?.pt : its[pi].id;
    return pointOnElement(doc, q, its[1 - pi].id) ? { kind: 'DIM' } : { err: 'Un punto con un spline o una elipse: el punto debe pertenecerle (línea indicativa)' };
  }
  if (has('C')) return has('S') ? { err: 'Un spline no tiene centro: no se puede acotar contra un arco o círculo' } : { kind: 'DIM' };
  if (cls[0] === 'P' && cls[1] === 'P') return { kind: 'DIM' };
  if (has('P') && has('L')) return { kind: 'DIM' };
  if (cls[0] === 'L' && cls[1] === 'L') return { kind: linesParallel(its[0].id, its[1].id) ? 'DIM' : 'ANG' };
  return { err: 'Con ese par de elementos no hay una cota: usa puntos, líneas, arcos o círculos' };
}
let dimBusy = false;
async function runDim(kind) {
  if (dimBusy) return;
  dimBusy = true;
  try { await applyCon(kind); } finally { dimBusy = false; }
  sel = []; afterChange();
}
function dimTap(p) {
  const h = hitTest(p.x, p.y);
  if (!h || !DIMMABLE.includes(h.k)) { toast('Toca un punto o un elemento para acotarlo'); return; }
  const i = sel.findIndex((x) => same(x, h));
  if (i >= 0) { sel.splice(i, 1); afterChange(); return; }
  sel.push(h);
  const plan = dimPlan(false);
  if (plan.err) { sel.pop(); toast(plan.err); afterChange(); return; }
  if (plan.kind) { runDim(plan.kind); return; }
  afterChange();
}
function startDimTool() {
  sel = sel.filter((x) => DIMMABLE.includes(x.k));
  const plan = dimPlan(true);
  if (plan.err) { toast(plan.err); sel = []; afterChange(); return; }
  if (plan.kind) { runDim(plan.kind); return; }
  afterChange();
}
function selectAt(p) {
  if (pickResolve) {
    const r = pickResolve;
    pickResolve = null;
    if (pickKind === 'pt') { const q = snapAt(p.x, p.y); r({ x: q.x, y: q.y, id: q.type === 'pt' ? q.id : null }); return; }
    const h = hitCurves(p.x, p.y);
    r(h && h.k === 'ln' ? h : null);
    return;
  }
  selGraph = null;
  if (txState?.edit && !commitTextLive()) return; // tocar fuera guarda la edicion en el lugar (si da error, sigue abierta)
  let h = hitTest(p.x, p.y);
  // Un texto no se selecciona con un toque (en documentos con muchos textos se agarraban sin querer): se encierra con un cuadro.
  // Doble toque abre sus propiedades, y un toque sobre un enlace lo selecciona para mostrar su pastilla. Si no, el toque es de lo de debajo.
  if (h?.k === 'tx' && !tapMod && !sel.some((s) => same(s, h))) {
    const now = performance.now(), dblTx = lastTxTap && lastTxTap.id === h.id && now - lastTxTap.t < 450 && dist(lastTxTap, p) < 24;
    lastTxTap = dblTx ? null : { id: h.id, t: now, x: p.x, y: p.y };
    if (dblTx) { sel = [h]; lastTap = null; afterChange(); openProps(h); return; }
    if (textLinkAt(doc, doc.texts[h.id], toModel(p.x, p.y), measureRel, 4 / view.s)) { sel = [h]; afterChange(); return; }
    if (!doc.texts[h.id].lib && !sim) { sel = []; afterChange(); startTextEdit(h.id, p); return; } // un toque lo edita en el lugar (el cursor donde se toco)
    if (!txTapHint) { txTapHint = true; toast('Para seleccionar un texto, enciérralo con un cuadro (arrastra desde él o desde un lugar vacío); doble toque abre sus propiedades'); }
    h = hitTest(p.x, p.y, true);
  }
  if (!h) {
    const li = lockedImgAt(p.x, p.y); // una imagen bloqueada: el toque la ignora, el doble toque abre sus propiedades
    if (li) { const now = performance.now(), dbl = lastImgTap && lastImgTap.id === li && now - lastImgTap.t < 450 && dist(lastImgTap, p) < 24; lastImgTap = dbl ? null : { id: li, t: now, x: p.x, y: p.y }; if (dbl) { sel = []; afterChange(); editImage(li); return; } }
    sel = []; afterChange(); return;
  }
  if (h.k === 'co') { // un toque selecciona la cota (para borrarla, por ejemplo); doble toque la edita
    const now = performance.now(), dbl = lastCoTap && lastCoTap.id === h.id && now - lastCoTap.t < 450 && dist(lastCoTap, p) < 24;
    lastCoTap = dbl ? null : { id: h.id, t: now, x: p.x, y: p.y };
    sel = [h]; afterChange();
    if (dbl) { if (doc.cons[h.id]?.t === 'LEAD') editLeader(h.id); else editDimension(h.id); }
    return;
  }
  // doble toque sobre un elemento: ventana de propiedades
  const now = performance.now(), dbl = lastTap && same(lastTap, h) && now - lastTap.t < 450 && dist(lastTap, p) < 24;
  lastTap = dbl ? null : { k: h.k, id: h.id, t: now, x: p.x, y: p.y };
  if (dbl && PROP_NAMES[h.k]) {
    if (!sel.some((s) => same(s, h))) sel.push(h);
    afterChange(); openProps(h);
    return;
  }
  // un enlace de un texto se abre al tocarlo si el texto ya estaba seleccionado (su pastilla muestra a donde lleva),
  // o directo con Ctrl/Cmd + clic. El primer toque solo selecciona, y arrastrar sigue moviendo el texto.
  if (h.k === 'tx' && (tapMod || sel.some((s) => same(s, h)))) {
    const url = textLinkAt(doc, doc.texts[h.id], toModel(p.x, p.y), measureRel, 4 / view.s);
    if (url) { lastTap = null; openLink(url, tapMod); return; }
  }
  const i = sel.findIndex((s) => same(s, h));
  if (i >= 0) sel.splice(i, 1); else sel.push(h);
  afterChange();
}

// ---- enlaces de los textos (ver links.js): la pastilla sobre el texto seleccionado y la apertura de cada destino
var tapMod = false; // var: draw() y los eventos pueden llegar antes de esta linea al arrancar
var LINK_ICON = { web: '↗', mail: '✉', tel: '☎', anchor: '§', file: '▤', bad: '⚠' };
// Abre un destino. direct: llego por Ctrl/Cmd + clic, sin ver la pastilla (se avisa a donde va).
function openLink(raw, direct = false) {
  const L = linkTarget(raw);
  if (L.kind === 'bad') { toast(L.why); return; }
  if (L.kind === 'web') { if (direct) toast('Abriendo ' + L.host); window.open(L.href, '_blank', 'noopener,noreferrer'); return; }
  if (L.kind === 'mail' || L.kind === 'tel') { location.href = L.href; return; }
  if (L.kind === 'anchor') { goAnchor(L.anchor); return; }
  if (L.kind === 'file') openRepoLink(L);
}
// Lleva la vista a un lugar del dibujo (#id o #titulo) y lo selecciona.
function goAnchor(name) {
  const a = findAnchor(doc, name);
  if (!a) { toast(`No hay ningún lugar «#${name}» en este dibujo`); return false; }
  let pts;
  if (a.k === 'gr') { const g = doc.graphs[a.id]; selGraph = a.id; sel = []; pts = [{ x: g.x, y: g.y }, { x: g.x + g.w, y: g.y + g.h }]; }
  else { selGraph = null; sel = [{ k: a.k, id: a.id }]; pts = a.k === 'tx' ? textCorners(doc, doc.texts[a.id], measureRel) : a.k === 'ha' ? [] : elementBounds(sel); }
  if (pts.length) revealModel(pts);
  afterChange();
  return true;
}
// Mueve la vista (sin cambiar el zoom) para que se vean estos puntos: con pagina, su borde superior queda arriba de la pantalla,
// como al seguir un enlace en un documento; sin pagina, quedan al centro.
function revealModel(pts) {
  const r = cv.getBoundingClientRect(), s = view.s;
  const x0 = Math.min(...pts.map((q) => q.x)), x1 = Math.max(...pts.map((q) => q.x)), y0 = Math.min(...pts.map((q) => q.y)), y1 = Math.max(...pts.map((q) => q.y));
  const ox = view.ox + x0 * s < 8 || view.ox + x1 * s > r.width - 8 ? r.width / 2 - ((x0 + x1) / 2) * s : view.ox;
  const oy = globalDoc().page && (y1 - y0) * s < r.height * 0.8 ? r.height * 0.15 + y1 * s : r.height / 2 + ((y0 + y1) / 2) * s;
  view = { s, ox, oy }; persist();
}
// Abre otro dibujo .json del repositorio de GitHub (ruta relativa a la carpeta configurada) y, si el enlace lo pide, va a un lugar.
async function openRepoLink(L) {
  const c = gh.loadCfg();
  if (!gh.isReady(c)) { toast(`Para abrir «${L.path}» configura GitHub (Archivo → GitHub)`); return; }
  const path = resolveRepoPath(c.dir, L.path);
  if (!path) { toast(`«${L.path}» queda fuera del repositorio`); return; }
  if (!confirm(`¿Abrir «${path}» de GitHub? Se pierde lo no guardado de este dibujo.`)) return;
  try {
    toast('Abriendo de GitHub…');
    const [text, sha] = await Promise.all([gh.read(c, path), gh.currentSha(c, path)]);
    const j = JSON.parse(text);
    loadDoc(j.doc || j);
    if (sha) gh.rememberSha(c, path, sha);
    // el nombre para «Guardar en GitHub» solo si esta en la carpeta configurada (guardar siempre escribe alli)
    const name = path.split('/').pop(), inDir = path === gh.filePath(c, name);
    opts.fileBase = inDir ? cleanFileBase(name, 'json') || '' : '';
    fitView(); afterChange();
    toast('Abierto de GitHub: ' + path);
    if (L.anchor) goAnchor(L.anchor); // si no existe ese lugar, lo dice (y el dibujo queda abierto)
    setTimeout(warnRedundant, 2800);
  } catch (e) { toast(`No se pudo abrir «${path}»: ` + e.message); }
}
// La pastilla: con un solo texto seleccionado que tiene enlaces, un boton por destino (sin repetir) sobre el texto, con el
// destino real a la vista (el texto del enlace puede decir otra cosa). Se rehace solo si cambian los destinos.
var linkChipKey = '';
function syncLinkChip() {
  const linkChip = $('linkChip');
  const s0 = sel.length === 1 && sel[0].k === 'tx' ? sel[0] : null, t = s0 && doc.texts[s0.id];
  const boxes = t && doc.pts[t.pt] && opts.texts && !drag?.started && !gesture && !sim ? textLinkBoxes(doc, t, measureRel) : [];
  if (!boxes.length) { if (!linkChip.hidden) { linkChip.hidden = true; linkChipKey = ''; } return; }
  const urls = [...new Map(boxes.map((b) => [b.url, b.s])).entries()];
  const key = s0.id + '\u0001' + urls.map((u) => u[0]).join('\u0001');
  if (key !== linkChipKey) {
    linkChipKey = key; linkChip.textContent = '';
    for (const [url, shown] of urls.slice(0, 8)) {
      const L = linkTarget(url), ext = L.kind === 'web' || L.kind === 'mail' || L.kind === 'tel';
      const b = document.createElement(ext ? 'a' : 'button');
      b.className = 'lk' + (L.kind === 'bad' ? ' bad' : '');
      if (ext) { b.href = L.href; if (L.kind === 'web') { b.target = '_blank'; b.rel = 'noopener noreferrer'; } } else b.type = 'button';
      b.title = (L.kind === 'bad' ? L.why : L.kind === 'web' ? L.href : L.label) + (shown && shown !== L.label ? `\n(el texto dice «${shown}»)` : '');
      const ic = document.createElement('span'); ic.className = 'ic'; ic.textContent = LINK_ICON[L.kind];
      const tx = document.createElement('span'); tx.className = 'tx';
      if (L.kind === 'web') { const h = document.createElement('span'); h.className = 'host'; h.textContent = L.host; const r = document.createElement('span'); r.className = 'rest'; r.textContent = L.label.slice(L.host.length); tx.append(h, r); }
      else tx.textContent = L.kind === 'anchor' ? '#' + L.label : L.label;
      b.append(ic, tx);
      if (!ext) b.onclick = () => openLink(url);
      linkChip.appendChild(b);
    }
    if (urls.length > 8) { const m = document.createElement('span'); m.className = 'lk bad'; m.textContent = `+${urls.length - 8}`; linkChip.appendChild(m); }
    linkChip.hidden = false;
  }
  // encima del texto; si no cabe, debajo. Dentro del lienzo.
  const W = cv.clientWidth, H = cv.clientHeight, q = textCorners(doc, t, measureRel).map(toScreen);
  const top = Math.min(...q.map((v) => v.y)), bot = Math.max(...q.map((v) => v.y)), left = Math.min(...q.map((v) => v.x));
  const cw = linkChip.offsetWidth, ch = linkChip.offsetHeight;
  let y = top - ch - 8;
  if (y < 8) y = bot + 8 + ch < H - 8 ? bot + 8 : 8;
  linkChip.style.left = Math.max(8, Math.min(W - cw - 8, left)) + 'px';
  linkChip.style.top = Math.max(8, Math.min(H - ch - 8, y)) + 'px';
}

// Puntos que se mueven al arrastrar la seleccion entera: los de cada elemento seleccionado (extremos, centro, puntos de control,
// punto de insercion del texto), menos los fijos y las marcas de referencia, que se quedan donde estan.
function selPoints() {
  const out = new Set();
  for (const x of sel) {
    const o = x.k === 'pt' ? { pts: [x.id] } : x.k === 'ln' ? doc.lines[x.id] && { pts: [doc.lines[x.id].a, doc.lines[x.id].b] }
      : x.k === 'ci' ? doc.circles[x.id] && { pts: [doc.circles[x.id].c] } : x.k === 'ar' ? doc.arcs[x.id] && { pts: [doc.arcs[x.id].c, doc.arcs[x.id].a, doc.arcs[x.id].b] }
      : x.k === 'sp' ? doc.splines[x.id] && { pts: doc.splines[x.id].pts } : x.k === 'el' ? doc.ellipses?.[x.id] && { pts: ['c', 'a', 'b', 'p1', 'p2'].map((q) => doc.ellipses[x.id][q]) }
      : x.k === 'tx' ? doc.texts[x.id] && { pts: [doc.texts[x.id].pt] } : null;
    for (const id of o?.pts || []) if (id && doc.pts[id] && !doc.pts[id].fixed && !isMark(doc, id)) out.add(id);
  }
  return out;
}

function toolDown(p) {
  hover = p;
  if (tool === 'select') {
    const gz = !sim && fkOn('ac') ? graphCtlAt(p.x, p.y) : null;
    if (gz) { ctlDown(gz, p); return; }
    let gh = !sim && fkOn('ac') ? graphAt(p.x, p.y) : null;
    if (gh && doc.images?.[gh.id] && gh.mode.move && hitTest(p.x, p.y)) gh = null; // lo dibujado sobre una foto se toca antes que la foto (para calcarla); sus manijas, si esta seleccionada, siguen siendo de ella
    if (gh && graphHold && doc.graphs?.[gh.id]) { graphHold = null; gcalcMark(null); scheduleGraphs(); draw(); return; }
    if (gh) {
      const g = boxOf(gh.id), gs = multiGraphs();
      if (gh.mode.move && gs.has(gh.id) && (gs.size > 1 || sel.length > 0)) { // una grafica de una seleccion de varios: se mueve todo lo seleccionado
        const pts = selPoints();
        drag = { p0: p, gmove: true, gid: gh.id, m0: toModel(p.x, p.y), started: false, orig: Object.fromEntries([...pts].map((id) => [id, { ...doc.pts[id] }])), gorig: Object.fromEntries([...gs].filter((id) => !doc.images?.[id]?.pt).map((id) => [id, { x: boxOf(id).x, y: boxOf(id).y }])) };
        for (const id of gs) { const ip = doc.images?.[id]?.pt; if (ip && doc.pts[ip]) drag.orig[ip] = { ...doc.pts[ip] }; } // las imagenes, por su punto
        return;
      }
      if (gh.mode.move && g.pt && doc.pts[g.pt]) { drag = { p0: p, gmove: true, gid: gh.id, m0: toModel(p.x, p.y), started: false, orig: { [g.pt]: { ...doc.pts[g.pt] } }, gorig: {} }; return; } // una imagen se mueve por su punto de insercion
      drag = { p0: p, graph: gh.id, mode: gh.mode, orig: { x: g.x, y: g.y, w: g.w, h: g.h }, m0: toModel(p.x, p.y), started: false };
      return;
    }
    let h = hitTest(p.x, p.y);
    if (h?.k === 'tx' && !sel.some((s) => same(s, h))) h = null; // un texto no seleccionado no se agarra: arrastrar abre un cuadro (para moverlo, primero encerrarlo)
    drag = { p0: p, hit: h, started: false };
    if (!h || h.k === 'ha') drag.box = true; // arrastrar desde un lugar vacio: cuadro de seleccion
    if (h && (h.k === 'pt' || h.k === 'ln' || h.k === 'ci' || h.k === 'ar' || h.k === 'sp')) {
      const m = toModel(p.x, p.y);
      drag.m0 = m;
      drag.orig = h.k === 'pt' ? { [h.id]: { ...doc.pts[h.id] } }
        : h.k === 'ln' ? { [doc.lines[h.id].a]: { ...doc.pts[doc.lines[h.id].a] }, [doc.lines[h.id].b]: { ...doc.pts[doc.lines[h.id].b] } } : {};
      if (h.k === 'sp') for (const id of doc.splines[h.id].pts) drag.orig[id] = { ...doc.pts[id] }; // tocar la curva: se mueve el spline entero
      if (h.k === 'ci') drag.r0 = doc.circles[h.id].r;
      if (h.k === 'ar') drag.r0 = doc.arcs[h.id].r;
    }
    if (h && h.k === 'co' && (doc.cons[h.id]?.v !== undefined || doc.cons[h.id]?.t === 'LEAD')) drag.dim = true;
    if (h && h.k === 'tx') {
      const pid = doc.texts[h.id].pt;
      drag.m0 = toModel(p.x, p.y);
      drag.orig = { [pid]: { ...doc.pts[pid] } };
    }
    // arrastrar algo que esta dentro de una seleccion de varios elementos: se mueven todos (sus puntos libres) a la vez
    const gsel = multiGraphs();
    const many = h && sel.length + gsel.size > 1 ? selPoints() : null;
    if (many && many.size && (sel.some((x) => x.k === h.k && x.id === h.id) || (h.k === 'pt' && many.has(h.id)))) {
      drag.m0 = toModel(p.x, p.y); drag.multi = true; drag.box = false;
      drag.orig = Object.fromEntries([...many].map((id) => [id, { ...doc.pts[id] }]));
      if (gsel.size) { drag.gorig = Object.fromEntries([...gsel].filter((id) => !doc.images?.[id]?.pt).map((id) => [id, { x: boxOf(id).x, y: boxOf(id).y }])); for (const id of gsel) { const ip = doc.images?.[id]?.pt; if (ip && doc.pts[ip]) drag.orig[ip] = { ...doc.pts[ip] }; } } // las graficas seleccionadas se mueven con ellos
    }
  } else {
    drag = { p0: p, moved: false };
    if (tool === 'ellipse' && pending?.g && pending.t1 === undefined) { // elipse parcial: aqui empieza el tramo
      pending.t1 = ellipseParam(pending.g, toModel(p.x, p.y));
      pending.dir = { last: pending.t1, acc: 0 }; pending.fresh = true;
    }
    if (tool === 'trim') { drag.trail = [p]; drag.last = p; trimStep(p, drag); }
  }
}

// Recortar: cada vez que el trazo pasa sobre un elemento, se quita el tramo entre los cruces mas cercanos.
// Cuadro de seleccion: de izquierda a derecha toma lo que queda completamente dentro; de derecha a
// izquierda, lo que queda dentro o lo toca. Con Mayus se suma a la seleccion.
function finishBox(d, p) {
  const a = toModel(d.p0.x, d.p0.y), b = toModel(p.x, p.y);
  const all = boxSelect(doc, { x0: a.x, y0: a.y, x1: b.x, y1: b.y }, { cross: p.x < d.p0.x, shown: shownPoints(), textBox: (t) => textCorners(doc, t, measureRel) }).filter(selOk); // un texto, por su caja
  const found = all.filter((x) => x.k !== 'gr'), gfound = fkOn('ac') ? all.filter((x) => x.k === 'gr').map((x) => x.id) : []; // las graficas siguen el filtro de actuadores
  const keep = shiftDown ? sel.filter((x) => !found.some((f) => same(f, x))) : [];
  const gkeep = shiftDown ? [...multiGraphs()] : [], gids = [...new Set([...gkeep, ...gfound])];
  sel = [...keep, ...found];
  if (gids.length === 1 && !sel.length) { selGraph = gids[0]; selMulti = null; } // una sola grafica: como al tocarla (con manijas)
  else { selGraph = null; selMulti = gids.length ? { ids: new Set(gids), owner: sel } : null; }
  const n = found.length + gfound.length, g = gfound.length, pl = n === 1 ? '' : 's', gp = g === 1 ? '' : 's';
  toast(!n ? 'No hay elementos en el cuadro' : g ? `${n} elemento${pl} seleccionado${pl} (${g} gráfica${gp})` : `${n} elemento${pl} seleccionado${pl}`);
  afterChange();
}

function trimStep(p, d) {
  const h = hitCurves(p.x, p.y);
  if (!h) return;
  const bak = snapshot();
  if (!d.undone) { pushUndo(); d.undone = true; }
  const fail = (msg) => { doc = unsnap(bak, doc.assets); if (!d.trimmed) { undoStack.pop(); d.undone = false; } toast(msg); };
  const r = trimAt(doc, h.k, h.id, toModel(p.x, p.y));
  if (!r.ok) { fail(r.msg); return; }
  if (!solve(doc, []).ok) { fail('No se pudo recortar: conflicto con las restricciones'); return; }
  d.trimmed = true;
  sel = [];
  if (r.dropped?.length) toast('Se perdieron restricciones sobre el tramo recortado: ' + [...new Set(r.dropped)].join(', '));
  draw();
}

// toolMove solo se llama desde pointermove, que dibuja una vez al terminar: no se dibuja aqui (antes se dibujaba dos veces por movimiento)
function toolMove(p) {
  if (!drag) return;
  if (tool === 'trim') {
    const a = drag.last, n = Math.max(1, Math.ceil(dist(a, p) / 4));
    for (let i = 1; i <= n; i++) trimStep({ x: a.x + ((p.x - a.x) * i) / n, y: a.y + ((p.y - a.y) * i) / n }, drag);
    drag.last = p; drag.trail.push(p); drag.moved = true;
    return;
  }
  if (tool !== 'select') { if (dist(p, drag.p0) > 8) drag.moved = true; return; }
  if (drag.ctl) { ctlMove(p); return; } // deslizadores de zoom de una grafica
  if (drag.gmove) { // varias graficas (y lo seleccionado) a la vez
    if (!drag.started) { if (dist(p, drag.p0) < 6) return; drag.started = true; pushUndo(); if (Object.keys(drag.orig).length) { beginSession(doc, !hasReactive(doc)); freezeDimOrder(doc); } }
    const m = toModel(p.x, p.y), dx = m.x - drag.m0.x, dy = m.y - drag.m0.y;
    for (const [id, o] of Object.entries(drag.gorig)) { const g = boxOf(id); if (g) { g.x = o.x + dx; g.y = o.y + dy; } }
    const ids = Object.keys(drag.orig);
    if (ids.length) {
      const tg = ids.map((id) => ({ id, x: drag.orig[id].x + dx, y: drag.orig[id].y + dy })), reac = hasReactive(doc);
      const r = dragToStops(doc, tg, (t2) => (reac ? settle(doc, solveSteps, t2, { maxIter: 20 }) : solve(doc, t2)), !reac);
      if (r.ok) trackAngles(doc);
    }
    return;
  }
  if (drag.graph) { // mover o redimensionar la grafica
    if (!drag.started) { if (dist(p, drag.p0) < 6) return; drag.started = true; pushUndo(); selGraph = drag.graph; sel = []; }
    const g = boxOf(drag.graph), m = toModel(p.x, p.y), dx = m.x - drag.m0.x, dy = m.y - drag.m0.y, o = drag.orig, mn = 60 / view.s, M = drag.mode;
    if (M.move) { g.x = o.x + dx; g.y = o.y + dy; return; }
    let x = o.x, y = o.y, w = o.w, h = o.h;
    if (M.l) { w = Math.max(mn, o.w - dx); x = o.x + o.w - w; }
    if (M.r) w = Math.max(mn, o.w + dx);
    if (M.t) h = Math.max(mn, o.h + dy);
    if (M.b) { h = Math.max(mn, o.h - dy); y = o.y + o.h - h; }
    if (doc.images?.[drag.graph]) ({ x, y, w, h } = keepAspect(o, M, { x, y, w, h })); // una imagen no se deforma
    if (doc.images?.[drag.graph] && g.pt && doc.pts[g.pt]) { Object.assign(g, { w, h }); syncImages(doc); return; } // se agranda o achica desde su punto de insercion, que queda fijo
    Object.assign(g, { x, y, w, h });
    return;
  }
  if (drag.box) { // cuadro de seleccion
    drag.p1 = p;
    if (dist(p, drag.p0) > 6) drag.boxOn = true;
    return;
  }
  if (drag.dim) {
    if (!drag.started) { if (dist(p, drag.p0) < 5) return; drag.started = true; pushUndo(); }
    dragDim(doc, doc.cons[drag.hit.id], view, p);
    return;
  }
  if (!drag.hit || !drag.orig) return;
  if (!drag.started) {
    if (dist(p, drag.p0) < 6) return;
    drag.started = true; pushUndo(); beginSession(doc, !hasReactive(doc)); freezeDimOrder(doc); // al arrastrar, las cotas no cambian de lugar en el orden de lectura hasta soltar
  }
  const m = toModel(p.x, p.y);
  const h = drag.hit;
  if (!drag.multi && (h.k === 'ci' || h.k === 'ar')) {
    const ci = h.k === 'ci' ? doc.circles[h.id] : doc.arcs[h.id], c = doc.pts[ci.c];
    const r0 = ci.r; ci.r = Math.max(0.01, dist(c, m));
    const res = solve(doc, []);
    if (!res.ok) ci.r = r0;
  } else {
    // con trazados activos se interpola el movimiento en pasos cortos para que la trayectoria salga continua
    const cur2 = { dx: m.x - drag.m0.x, dy: m.y - drag.m0.y }, prev = drag.lastD || { dx: 0, dy: 0 };
    const tracing = Object.keys(doc.traces).length > 0;
    const steps = tracing ? Math.min(40, Math.max(1, Math.ceil((Math.hypot(cur2.dx - prev.dx, cur2.dy - prev.dy) * view.s) / 8))) : 1;
    for (let i = 1; i <= steps; i++) {
      const f = i / steps, dx = prev.dx + (cur2.dx - prev.dx) * f, dy = prev.dy + (cur2.dy - prev.dy) * f;
      const tg = Object.entries(drag.orig).map(([id, o]) => ({ id, x: o.x + dx, y: o.y + dy }));
      const ts0 = PERF ? performance.now() : 0;
      const reac = hasReactive(doc);
      const r = dragToStops(doc, tg, (t2) => (reac ? settle(doc, solveSteps, t2, { maxIter: 20 }) : solve(doc, t2)), !reac); // con cotas que leen medidas, se actualizan mientras arrastras; con «tope en bordes» el elemento llega hasta el borde
      if (PERF) perfSolveMs += performance.now() - ts0;
      if (r.ok) trackAngles(doc);
      if (r.ok && tracing) recordTraces(doc, r.stopped ? 2e-4 : 1.5 / view.s); // al llegar a un tope se guarda la posicion exacta, por corto que sea el ultimo paso
    }
    drag.lastD = cur2;
    if (drag.gorig) for (const [id, o] of Object.entries(drag.gorig)) { const g = boxOf(id); if (g) { g.x = o.x + cur2.dx; g.y = o.y + cur2.dy; } }
  }
}

function toolUp(p, q) {
  const d = drag; drag = null;
  if (sim) { if (tool === 'select' && !d?.started) selectAt(p); else if (tool !== 'select') toast('Detén la simulación para dibujar o editar'); return; }
  if (tool === 'mr' || tool === 'ml') { actTool(p); return; }
  if (tool === 'graph') { graphTool(p); return; }
  if (tool === 'select') {
    if (d?.ctl) { ctlUp(d); return; }
    if (d?.gmove) {
      if (d.started) { if (Object.keys(d.orig).length) { recordTraces(doc, 2e-4); reparamSplines(doc); } afterChange(); return; }
      const id = d.gid, now = performance.now(), dbl = lastGraphTap && lastGraphTap.id === id && now - lastGraphTap.t < 450 && dist(lastGraphTap, p) < 24;
      lastGraphTap = dbl ? null : { id, t: now, x: p.x, y: p.y };
      selGraph = id; selMulti = null; sel = []; // un toque sobre una grafica de la seleccion (o una imagen, que se mueve por su punto): queda ella sola
      if (dbl && doc.images?.[id]) { afterChange(); editImage(id); return; }
      afterChange(); return;
    }
    if (d?.graph) {
      if (d.started) { afterChange(); return; }
      const id = d.graph, now = performance.now(), dbl = lastGraphTap && lastGraphTap.id === id && now - lastGraphTap.t < 450 && dist(lastGraphTap, p) < 24;
      lastGraphTap = dbl ? null : { id, t: now, x: p.x, y: p.y };
      selGraph = id; sel = [];
      if (dbl && doc.graphs?.[id]) { afterChange(); editGraph(id, false); return; }
      if (dbl && doc.images?.[id]) { afterChange(); editImage(id); return; }
      afterChange(); return;
    }
    if (d?.box && d.boxOn) { finishBox(d, p); return; }
    if (d?.started) { // la trayectoria termina donde quedo el punto al soltar
      recordTraces(doc, 2e-4); reparamSplines(doc);
      // mover un texto o la etiqueta de una cota cambia su lugar en el orden de lectura: las cotas con formula que leen variables de texto se recalculan
      if (usesTextVars(doc)) { const st = settle(doc, solve, []); if (!st.ok) { rollback(); toast(st.error || 'No se pudo: queda donde estaba'); } }
      afterChange(); return;
    }
    const ah = fkOn('ac') ? actAt(p.x, p.y) : null;
    if (ah) { editAct(ah, false); return; }
    selectAt(p);
    return;
  }
  if (tool === 'trim') { if (d?.trimmed) afterChange(); else draw(); return; }
  if (tool === 'extend') { extendAt(p); return; }
  if (tool === 'fillet' || tool === 'chamfer') {
    const h = hitTest(p.x, p.y);
    if (h?.k === 'pt') { pending = null; cornerTool([h.id]); }
    else if (h && ['ln', 'ci', 'ar', 'el'].includes(h.k)) roundPick(h, toModel(p.x, p.y));
    else toast('Toca el punto de una esquina, o dos elementos (segmentos, arcos o arcos elípticos) en el lado que quieres conservar');
    return;
  }
  const moved = d?.moved;
  const sDown = snapAt(q.down.x, q.down.y, { press: true }), sUp = snapAt(p.x, p.y, { press: !moved });
  if (tool === 'point') {
    if (sUp.type === 'pt') { toast('Ya hay un punto aquí'); return; }
    pushUndo(); const id = pointFrom(sUp); doc.pts[id].auto = false; if (doc.curLayer && doc.layers?.[doc.curLayer]) doc.pts[id].layer = doc.curLayer; afterChange(); return;
  }
  if (tool === 'line' || tool === 'vector' || tool === 'cline') {
    if (moved && !pending) {
      pushUndo();
      const lk = lockFor({ snap: sDown }, p);
      const a = pointFrom(sDown), b = pointFrom(lk ? lockEnd(lk) : sUp);
      if (a === b) { rollback(); return; }
      const lid = addLine(doc, a, b, lineStyle());
      if (tool === 'vector') makeVector(doc, lid, { h: niceHeight() });
      if (lk) applyLock(lid, lk);
      finishEdit();
      return;
    }
    if (!pending) { pushUndo(); pending = { start: pointFrom(sUp) }; draw(); return; }
    if (sUp.type === 'pt' && sUp.id === pending.start) { cancelPending(); return; }
    pushUndo();
    const lk = lockFor({ id: pending.start }, p, !moved);
    const b = pointFrom(lk ? lockEnd(lk) : sUp);
    const lid = addLine(doc, pending.start, b, lineStyle());
    if (tool === 'vector') makeVector(doc, lid, { h: niceHeight() });
    if (lk) applyLock(lid, lk);
    pending = { start: b };
    finishEdit(true);
    return;
  }
  if (tool === 'circle') {
    if (!pending) { pushUndo(); pending = { center: pointFrom(sUp) }; draw(); return; }
    const c = doc.pts[pending.center];
    const r = dist(c, sUp);
    if (r < 1e-6) { toast('Radio nulo'); return; }
    pushUndo();
    const id = addCircle(doc, pending.center, r, style());
    if (sUp.type === 'pt') addCon(doc, { t: 'PONC', refs: [sUp.id, id], hidden: true });
    pending = null; finishEdit();
    return;
  }
  if (tool === 'paste') { pasteAt(sUp); return; }
  if (tool === 'mline') { // punto medio y un extremo: la linea crece igual hacia el otro lado
    if (!pending) {
      if (moved) { const lk = lockFor({ snap: sDown }, p); makeMline(sDown, lk ? lockEnd(lk) : sUp, lk); return; }
      pushUndo(); pending = { m: pointFrom(sUp) }; draw(); return;
    }
    if (sUp.type === 'pt' && sUp.id === pending.m) { cancelPending(); return; }
    const lk = lockFor({ id: pending.m }, p, !moved), M0 = doc.pts[pending.m];
    makeMline({ type: 'pt', id: pending.m, x: M0.x, y: M0.y }, lk ? lockEnd(lk) : sUp, lk);
    return;
  }
  if (tool === 'circle3') { // 3 puntos de la circunferencia
    if (!pending) { pushUndo(); pending = { ids: [pointFrom(sUp)] }; draw(); return; }
    if (sUp.type === 'pt' && pending.ids.includes(sUp.id)) { toast('Elige un punto distinto'); return; }
    if (pending.ids.length === 1) { pending.ids.push(pointFrom(sUp)); draw(); return; }
    const g = circleThrough3(doc.pts[pending.ids[0]], doc.pts[pending.ids[1]], sUp);
    if (!g) { toast('Los 3 puntos no deben ser colineales'); return; }
    pushUndo();
    const third = pointFrom(sUp);
    const cid = addPoint(doc, g.c.x, g.c.y, false);
    const id = addCircle(doc, cid, g.r, style());
    for (const pid of [...pending.ids, third]) addCon(doc, { t: 'PONC', refs: [pid, id], hidden: true });
    pending = null; finishEdit();
    return;
  }
  if (tool === 'rect' || tool === 'rectc') { // dos esquinas de la diagonal, o centro y una esquina
    if (!pending) {
      if (moved) { makeRect(sDown, sUp, tool === 'rectc'); return; }
      pushUndo(); pending = { s: pointFrom(sUp) }; draw(); return;
    }
    const P0 = doc.pts[pending.s];
    makeRect({ type: 'pt', id: pending.s, x: P0.x, y: P0.y }, sUp, tool === 'rectc');
    return;
  }
  if (tool === 'polygon') { // centro y radio (con bloqueo suave para la orientacion); luego lados y tipo
    if (!pending) {
      if (moved) { const lk = lockFor({ snap: sDown }, p); makePolygon(sDown, lk ? lockEnd(lk) : sUp); return; }
      pushUndo(); pending = { c: pointFrom(sUp) }; draw(); return;
    }
    if (sUp.type === 'pt' && sUp.id === pending.c) return;
    const lk = lockFor({ id: pending.c }, p, !moved), C0 = doc.pts[pending.c];
    makePolygon({ type: 'pt', id: pending.c, x: C0.x, y: C0.y }, lk ? lockEnd(lk) : sUp);
    return;
  }
  if (tool === 'ellipse') { // centro, extremo del 1.er eje y punto del 2.o eje (toques o arrastres)
    if (pending?.g) { // elipse parcial: arrastrar sobre la elipse de referencia, o tocar el inicio y luego el fin
      if (pending.t1 === undefined) return;
      const fresh = pending.fresh; pending.fresh = false;
      if (fresh && !(moved && Math.abs(pending.dir.acc) > 0.05)) { draw(); return; } // fue el toque del inicio
      makeEarc(ellipseParam(pending.g, toModel(p.x, p.y)));
      return;
    }
    if (!pending) {
      pushUndo();
      if (moved) {
        const c = pointFrom(sDown), a = pointFrom(sUp);
        if (c === a) { rollback(); return; }
        pending = { c, a };
      } else pending = { c: pointFrom(sUp) };
      draw(); return;
    }
    if (!pending.a) {
      if (sUp.type === 'pt' && sUp.id === pending.c) return;
      pending.a = pointFrom(sUp); draw(); return;
    }
    const C = doc.pts[pending.c], A = doc.pts[pending.a], ra = dist(C, A);
    if (ra < 1e-9) { cancelPending(); return; }
    const nx = -(A.y - C.y) / ra, ny = (A.x - C.x) / ra, rb = (sUp.x - C.x) * nx + (sUp.y - C.y) * ny;
    if (Math.abs(rb) < 1e-6) { toast('El segundo eje no puede ser nulo'); return; }
    if (toolName === 'earc') { // queda la elipse de referencia; falta marcar el tramo
      pending.b = sUp.type === 'pt' ? { id: sUp.id, rb } : { x: C.x + nx * rb, y: C.y + ny * rb, rb };
      pending.g = { cx: C.x, cy: C.y, ra, rb: Math.abs(rb), ux: (A.x - C.x) / ra, uy: (A.y - C.y) / ra };
      updateStatus(); draw(); return;
    }
    pushUndo();
    const b = sUp.type === 'pt' ? sUp.id : addPoint(doc, C.x + nx * rb, C.y + ny * rb, false);
    addEllipse(doc, pending.c, pending.a, b, style());
    addCon(doc, { t: 'ANG4', refs: [pending.c, pending.a, pending.c, b], v: rb > 0 ? 90 : -90, hidden: true });
    pending = null; finishEdit();
    return;
  }
  if (tool === 'spline') {
    if (!pending) { pushUndo(); pending = { ids: [pointFrom(sUp)] }; draw(); return; }
    const ids = pending.ids;
    if (sUp.type === 'pt' && sUp.id === ids[ids.length - 1]) { finishSpline(false); return; } // tocar de nuevo el ultimo punto termina
    if (sUp.type === 'pt' && sUp.id === ids[0] && ids.length >= 3) { finishSpline(true); return; } // tocar el primero cierra la curva
    ids.push(pointFrom(sUp)); draw();
    return;
  }
  if (tool === 'text') { placeText(sUp); return; }
  if (tool === 'arcc') {
    if (!pending) { pushUndo(); pending = { center: pointFrom(sUp) }; draw(); return; }
    if (!pending.start) {
      if (sUp.type === 'pt' && sUp.id === pending.center) return;
      if (dist(doc.pts[pending.center], sUp) < 1e-6) { toast('Radio nulo'); return; }
      pending.start = pointFrom(sUp); draw(); return;
    }
    trackArc(p);
    const C = doc.pts[pending.center], S = doc.pts[pending.start];
    const r = dist(C, S);
    let tap = sUp;
    if (tap.type !== 'pt') {
      // el extremo se proyecta sobre la circunferencia (ignora imanes a otros elementos)
      const d = dist(C, tap) || 1;
      tap = { type: 'free', x: C.x + ((tap.x - C.x) / d) * r, y: C.y + ((tap.y - C.y) / d) * r };
    }
    pushUndo();
    const endId = pointFrom(tap);
    if (endId === pending.start) { rollback(); toast('El extremo no puede ser el inicio'); return; }
    // sentido horario: el arco antihorario va del extremo al inicio
    if (arcCW(tap)) addArc(doc, pending.center, endId, pending.start, r, style());
    else addArc(doc, pending.center, pending.start, endId, r, style());
    pending = null; finishEdit();
    return;
  }
  if (tool === 'arc3') {
    if (!pending) { pushUndo(); pending = { a: pointFrom(sUp) }; draw(); return; }
    if (!pending.m) {
      if (sUp.type === 'pt' && sUp.id === pending.a) return;
      pending.m = { x: sUp.x, y: sUp.y }; draw(); return;
    }
    pushUndo();
    const bId = pointFrom(sUp);
    const g3 = arcThrough3(doc.pts[pending.a], pending.m, doc.pts[bId]);
    if (!g3 || bId === pending.a) { rollback(); toast('Los 3 puntos deben ser distintos y no colineales'); return; }
    const cid = addPoint(doc, g3.c.x, g3.c.y, false);
    addArc(doc, cid, g3.startIsA ? pending.a : bId, g3.startIsA ? bId : pending.a, g3.r, style());
    pending = null; finishEdit();
    return;
  }
  if (tool === 'dim') { if (!moved) dimTap(p); return; }
  if (tool === 'intersect') {
    const h = hitTest(p.x, p.y);
    if (!h || !['ln', 'ci', 'ar', 'sp'].includes(h.k)) { toast('Toca una línea, un arco, un círculo o un spline'); return; }
    pending = pending || { items: [] };
    if (pending.items.some((i) => same(i, h))) return;
    pending.items.push(h);
    sel = [...pending.items];
    if (pending.items.length === 2) { const it = pending.items; pending = null; sel = []; makeIntersections(it); }
    else { toast('Toca el segundo elemento'); afterChange(); }
  }
}

function makeMline(sM, sEnd, lk) {
  if (dist(sM, sEnd) < 1e-6) { toast('Longitud nula'); return; }
  pushUndo();
  const m = pointFrom(sM), b = pointFrom(sEnd), M = doc.pts[m], B = doc.pts[b];
  const a = addPoint(doc, 2 * M.x - B.x, 2 * M.y - B.y, true);
  const lid = addLine(doc, a, b, style());
  addCon(doc, { t: 'MID', refs: [a, b, m] }); // el punto inicial queda en medio de la linea
  if (lk) applyLock(lid, lk);
  pending = null; finishEdit();
}

function makeRect(sA, sB, centered) {
  const ax = centered ? 2 * sA.x - sB.x : sA.x, ay = centered ? 2 * sA.y - sB.y : sA.y;
  if (Math.abs(sB.x - ax) < 1e-6 || Math.abs(sB.y - ay) < 1e-6) { toast('El rectángulo no puede tener ancho o alto nulo'); return; }
  pushUndo();
  const cId = centered ? pointFrom(sA) : null;
  const p1 = centered ? addPoint(doc, ax, ay, true) : pointFrom(sA);
  const p3 = pointFrom(sB);
  const P1 = doc.pts[p1], P3 = doc.pts[p3];
  const p2 = addPoint(doc, P3.x, P1.y, true), p4 = addPoint(doc, P1.x, P3.y, true);
  addRectangle(doc, [p1, p2, p3, p4], style());
  if (centered) addCon(doc, { t: 'MID', refs: [p1, p3, cId], hidden: true }); // el centro sigue en medio de la diagonal
  pending = null; finishEdit();
}

function askPolygon() {
  return new Promise((resolve) => {
    const dlg = $('dlgP');
    $('polN').value = String(opts.polyN); $('polK').value = opts.polyCirc ? 'ci' : 'in';
    let done = false;
    const finish = (ok) => {
      if (done) return;
      if (ok) {
        const n = Math.round(Number($('polN').value));
        if (!(n >= 3 && n <= 64)) { toast('Número de lados: entero de 3 a 64'); return; }
        opts.polyN = n; opts.polyCirc = $('polK').value === 'ci'; persist();
      }
      done = true; dlg.close(); resolve(ok);
    };
    $('polOk').onclick = (ev) => { ev.preventDefault(); finish(true); };
    $('polCancel').onclick = () => finish(false);
    dlg.oncancel = () => finish(false);
    dlg.showModal(); $('polN').focus(); $('polN').select();
  });
}
async function makePolygon(sC, sEnd) {
  if (dist(sC, sEnd) < 1e-6) { toast('Radio nulo'); return; }
  if (!(await askPolygon())) return; // cancelado: si ya habia centro, se puede tocar otro radio
  pushUndo();
  const cId = pointFrom(sC);
  const V = polygonVertices(doc.pts[cId], sEnd, opts.polyN, opts.polyCirc);
  const ids = V.map((q, i) => (i === 0 && !opts.polyCirc && sEnd.type === 'pt' && sEnd.id !== cId ? sEnd.id : addPoint(doc, q.x, q.y, true)));
  addPolygon(doc, cId, ids, style());
  pending = null; finishEdit();
}

function copySel() {
  const c = clipOf(doc, sel);
  if (!c) { toast('Selecciona lo que quieres copiar (puntos, líneas, círculos, arcos, splines, elipses o textos)'); return; }
  clip = c; updateEnabled();
  opts.grp = opts.grp || {}; opts.grp.clip = 'paste'; refreshGroups(); persist(); // lo siguiente es pegar
  toast(`Copiado: ${c.items.length} elemento${c.items.length === 1 ? '' : 's'}. Pulsa Pegar y toca el punto donde va su centro`);
}
function pasteAt(s) {
  if (!clip) { toast('No hay nada copiado'); return; }
  pushUndo();
  const r = pasteClip(doc, clip, { x: s.x, y: s.y });
  if (!r.ok) { rollback(); toast(r.msg); return; }
  if (!solve(doc, []).ok) { rollback(); toast('Conflicto con las restricciones: se deshizo el pegado'); afterChange(); return; }
  sel = r.made;
  afterChange();
}
function pasteTool() { if (!clip) { toast('Primero copia algo (selecciona y usa Copiar)'); return; } setTool('paste'); }

// Extender: toca un segmento, arco o spline cerca del extremo que se alarga; llega hasta el primer elemento que encuentre.
// El spline se alarga en linea recta, en la direccion de su tangente en ese extremo.
function extendAt(p) {
  const h = hitCurves(p.x, p.y);
  if (!h) { toast('Toca el segmento, arco o spline cerca del extremo que quieres alargar'); return; }
  if (h.k === 'el') { toast('Las elipses no se extienden'); return; }
  if (h.k === 'ci') { toast('Un círculo no se extiende'); return; }
  const near = toModel(p.x, p.y), bak = snapshot();
  pushUndo();
  let r = extendEnd(doc, h.k, h.id, near);
  let ok = r.ok && solve(doc, []).ok;
  if (r.ok && !ok) { // quizá chocó con una cota de longitud: se reintenta liberándola
    doc = unsnap(bak, doc.assets);
    r = extendEnd(doc, h.k, h.id, near, { dropLength: true });
    ok = r.ok && solve(doc, []).ok;
    if (ok) toast('Se quitaron las restricciones de longitud del segmento para poder extenderlo');
  }
  if (!ok) { doc = unsnap(bak, doc.assets); undoStack.pop(); updateButtons(); toast(r.ok ? 'No se pudo extender: conflicto con las restricciones' : r.msg); draw(); return; }
  sel = [{ k: h.k, id: h.id }];
  afterChange();
}

// Redondeo entre dos elementos que no tienen que juntarse en una esquina: se tocan uno y luego el otro, del lado que se conserva.
function roundPick(h, m) {
  if (h.k === 'ci') { toast('Un círculo no se redondea ni se achaflana: usa un arco'); return; }
  const first = pending?.fil;
  if (!first) { pending = { fil: { k: h.k, id: h.id, p: m } }; sel = [{ k: h.k, id: h.id }]; toast('Toca el segundo elemento, del lado que quieres conservar'); afterChange(); return; }
  if (first.k === h.k && first.id === h.id) { toast('Toca otro elemento'); return; }
  pending = null; sel = [];
  roundTool(first, { k: h.k, id: h.id, p: m });
}
// A y B: { k, id, p }; sin p (elementos ya seleccionados) se toma el medio de cada uno como el lado que se conserva.
async function roundTool(A, B) {
  const fillet = toolName === 'fillet';
  const reach = filletReach(doc, A, B);
  if (reach.msg) { toast(reach.msg); afterChange(); return; }
  const last = fillet ? opts.cornerR : opts.chamferD;
  const initial = last > 0 ? last : Math.max(Math.round(reach.len * 25) / 100, 0.01); // un cuarto del tramo mas corto
  const ask = askNumber(fillet ? 'Radio del redondeo' : 'Distancia del chaflán', initial);
  $('dlgRefRow').style.display = 'none';
  const v = await ask;
  if (v === null) { afterChange(); return; }
  const expr = dlgExpr;
  pushUndo();
  const r = fillet ? filletBetween(doc, A, B, v) : chamferBetween(doc, A, B, v);
  if (!r.ok) { rollback(); toast(r.msg); afterChange(); return; }
  if (expr) for (const k of r.dims) doc.cons[k].expr = expr;
  const st = settle(doc, solve, []);
  if (!st.ok) { rollback(); toast(st.error || 'No se pudo: entra en conflicto con las restricciones del dibujo'); afterChange(); return; }
  if (fillet) opts.cornerR = v; else opts.chamferD = v;
  sel = [fillet ? { k: 'ar', id: r.arc } : { k: 'ln', id: r.line }];
  if (r.dropped) toast(`Se quitaron ${r.dropped} restricciones de longitud de los segmentos recortados`);
  afterChange();
}

// Redondeo o chaflan (segun la herramienta) en las esquinas dadas (puntos donde se juntan dos lineas), con un solo valor.
// El valor puede ser una formula: queda en la cota de cada esquina.
async function cornerTool(pids) {
  const fillet = toolName === 'fillet', seen = new Set(), items = [];
  for (const pid of pids) { // una esquina puede tener varios puntos coincidentes: se toma una sola vez
    if (seen.has(pid)) continue;
    for (const q of coincidentIds(doc, pid)) seen.add(q);
    const pair = cornerPair(doc, pid), c = pair ? null : cornerOf(doc, pid); // pair: esquina con un arco o un arco eliptico (o segmentos que no comparten punto)
    items.push({ pid, pair, c, msg: pair || c.ok ? null : c.msg });
  }
  const good = items.filter((it) => it.pair || it.c.ok);
  if (!good.length) { toast(items[0]?.msg || 'Toca el punto de una esquina'); return; }
  const lim = Math.min(...good.map((it) => {
    if (it.c) return fillet ? maxFillet(it.c) : Math.min(it.c.A.len, it.c.B.len);
    const r = filletReach(doc, it.pair[0], it.pair[1]);
    return r.msg ? Infinity : r.len;
  }));
  const last = fillet ? opts.cornerR : opts.chamferD;
  const initial = last > 0 && last < lim ? last : Math.max(Math.round((Number.isFinite(lim) ? lim : 4) * 25) / 100, 0.01); // un cuarto del maximo
  const ask = askNumber((fillet ? 'Radio del redondeo' : 'Distancia del chaflán') + (good.length > 1 ? ` (${good.length} esquinas)` : ''), initial);
  $('dlgRefRow').style.display = 'none'; // aqui no hay cota de solo lectura: el valor siempre manda
  const v = await ask;
  if (v === null) return;
  const expr = dlgExpr;
  pushUndo();
  let done = 0; const fails = [], made = [];
  for (const it of good) {
    const r = it.pair ? (fillet ? filletBetween(doc, it.pair[0], it.pair[1], v) : chamferBetween(doc, it.pair[0], it.pair[1], v)) : (fillet ? filletCorner(doc, it.pid, v) : chamferCorner(doc, it.pid, v));
    if (!r.ok) { fails.push(r.msg); continue; }
    if (expr) for (const k of r.dims) doc.cons[k].expr = expr;
    made.push(fillet ? { k: 'ar', id: r.arc } : { k: 'ln', id: r.line });
    done++;
  }
  if (!done) { rollback(); toast(fails[0]); afterChange(); return; }
  const st = settle(doc, solve, []);
  if (!st.ok) { rollback(); toast(st.error || 'No se pudo: entra en conflicto con las restricciones del dibujo'); afterChange(); return; }
  if (fillet) opts.cornerR = v; else opts.chamferD = v;
  sel = made;
  if (fails.length) toast(`${done} de ${good.length} esquinas: ${fails[0]}`);
  afterChange();
}

function finishSpline(closed) {
  const ids = pending?.ids || [];
  pending = null;
  if (ids.length < 2) { cleanup(doc); afterChange(); return; }
  const id = addSpline(doc, ids, style(), closed);
  sel = [{ k: 'sp', id }];
  afterChange();
}

// Con pagina, la altura de un texto se da en puntos, como en un editor de texto (1 pt = 1/72 in; en el modelo sigue en mm,
// que es la altura de la letra completa, el tamaño de la fuente): un texto nuevo va en 12 pt. Sin pagina, en unidades del dibujo.
const PT = 25.4 / 72;
const ptOf = (h) => Math.round((h / PT) * 100) / 100;
function niceHeight() {
  if (globalDoc().page) return 12 * PT;
  // altura "redonda" mas cercana a ~16 px en pantalla
  const raw = 16 / view.s, pw = Math.pow(10, Math.floor(Math.log10(raw)));
  const cand = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * pw);
  return cand.reduce((b, v) => (Math.abs(v - raw) < Math.abs(b - raw) ? v : b), cand[0]);
}

function askText(labelText, initial) {
  return new Promise((resolve) => {
    const dlg = $('dlgT'), inp = $('dlgTInput');
    $('dlgTLabel').textContent = labelText;
    inp.value = initial;
    let done = false;
    const finish = (v) => { if (done) return; done = true; dlg.close(); resolve(v); };
    $('dlgTOk').onclick = (ev) => { ev.preventDefault(); finish(inp.value); };
    $('dlgTCancel').onclick = () => finish(null);
    dlg.oncancel = () => finish(null);
    dlg.showModal(); inp.focus();
  });
}

// Tras cambiar un texto: las variables que define («x:valor») no pueden chocar con una cota, repetirse ni fallar (un problema
// que ya existia antes de la edicion no cuenta) y las cotas con formulas que las leen se recalculan. false: se deshizo todo.
function textEditOk(before) {
  const bad = textVarErrors(doc).find((e) => !before.some((b) => b.key === e.key));
  if (bad) { rollback(); toast(bad.msg); afterChange(); return false; }
  if (usesTextVars(doc)) {
    const st = settle(doc, solve, []);
    if (!st.ok) { rollback(); toast(st.error || 'No se pudo: entra en conflicto con otras restricciones'); afterChange(); return false; }
  }
  return true;
}

// ---------------------------------------------------------------- entrada directa de texto (herramienta Texto)
// Se escribe sobre el dibujo, sin ventana. Por defecto es una ecuacion AsciiMath y se guarda como bloque «$$...$$» (los delimitadores quedan
// en el texto: se ven en sus propiedades); ahi «x:valor» asigna y «expr=» muestra el valor. Si lo primero que se teclea es «"» (o las comillas
// «“ ”» que pone el teclado de iOS con la puntuacion inteligente) o un espacio, es texto normal: se dibuja tal cual, salvo lo que vaya entre «$...$» o «$$...$$».
// Enter lo dibuja (un texto por Enter) y abre otra entrada una linea mas abajo; Shift+Enter es salto de linea dentro del mismo texto;
// Esc, Enter en una entrada vacia o cambiar de herramienta terminan (lo ya escrito se dibuja al cambiar de herramienta).
const txLiveBox = $('txLiveBox'), txLive = $('txLive');
const TX_MARK = /^["“” ]/; // «'» queda para las unidades («x:valor'unidad»)
const txIsText = () => (txState?.edit ? txState.kind === 'text' : TX_MARK.test(txLive.value));
const txIsScript = () => (txState?.edit ? txState.kind === 'script' : txLive.value[0] === '%'); // «%f(x):» y el programa con sangria (ver script.js)
function txLayout() {
  if (!txState) return;
  if (txState.edit) { txEditLayout(); return; }
  const P = txState.sUp.type === 'pt' ? doc.pts[txState.sUp.id] : txState.sUp;
  if (!P) return;
  const S = toScreen(P), h = cur.tx.h ?? niceHeight(), px = Math.max(13, Math.min(56, h * view.s));
  txLive.style.fontSize = px + 'px';
  txLive.style.fontFamily = txIsText() ? fontCss(cur.tx.font) : fontCss('mono');
  const lines = txLive.value.split('\n'), mx = Math.max(8, ...lines.map((l) => l.length));
  const W = Math.min(cv.clientWidth * 0.92, Math.max(170, mx * px * 0.62 + 26)), Hh = lines.length * px * 1.25 + 6;
  txLive.rows = lines.length; txLive.style.height = Hh - 2 + 'px';
  txLiveBox.style.width = W + 'px';
  txLiveBox.dataset.tag = txIsScript() ? '{}' : txIsText() ? 'A' : 'α'; // insignia azul junto a la esquina: α ecuacion, A texto normal, {} script
  txLiveBox.title = txIsScript() ? 'Script · %nombre(x): y el programa con sangría · Enter otra línea (con sangría) · Tab sangra · Shift+Enter dibuja' : txIsText() ? 'Texto normal · Enter dibuja · Shift+Enter otra línea' : 'Ecuación · x:valor asigna · x:valor\'unidad · expr= calcula · " o espacio al empezar = texto';
  const an = cur.tx.anchor || 'bl', ax = { l: 0, c: 0.5, r: 1 }[an[1]], ay = txState.cursor ? 0 : { t: 0, m: 0.5, b: 1 }[an[0]]; // las entradas siguientes cuelgan de la linea anterior
  txLiveBox.style.left = Math.max(26, Math.min(S.x - ax * W, cv.clientWidth - W - 2)) + 'px'; // a la izquierda queda sitio para la insignia
  txLiveBox.style.top = Math.max(24, Math.min(S.y - ay * Hh, cv.clientHeight - Hh - 2)) + 'px';
}
function endTextLive() { const ed = txState?.edit; txState = null; txLiveBox.hidden = true; txLiveBox.classList.remove('edit'); txLive.value = ''; txLive.blur(); ccClose(); if (ed) draw(); }

// ---- edicion en el lugar: un toque sobre un texto abre la misma entrada encima de el, con su fuente (la ecuacion sin «$$», el texto
// normal tal cual, el script con su codigo) y el cursor donde se toco. Enter (Shift+Enter en un script) o tocar fuera lo guardan;
// Esc lo deja como estaba. Mientras se edita, el texto no se dibuja (la entrada ocupa su lugar). El doble toque sigue abriendo sus propiedades.
function textEditSrc(t) {
  if (isScript(t.text)) return { kind: 'script', src: t.text };
  const m = /^\$\$([\s\S]*)\$\$$/.exec(t.text);
  if (m && !m[1].includes('$$')) return { kind: 'eq', src: m[1] };
  return { kind: 'text', src: t.text };
}
// La esquina superior izquierda del texto en pantalla y su marco (sistema local: x a la derecha, y hacia abajo, en px de pantalla).
function textScreenFrame(t) {
  const pose = textPose(doc, t), f = textFrame(shownText(doc, t), measureRel, pose.anchor), S = toScreen(doc.pts[t.pt]);
  const a = (pose.ang * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a), sc = view.s;
  const toS = (x, y) => ({ x: S.x + x * co + y * si, y: S.y - x * si + y * co }); // como drawTexts: rotate(-ang)
  const toL = (p) => { const dx = p.x - S.x, dy = p.y - S.y; return { x: (dx * co - dy * si) / sc, y: (dx * si + dy * co) / sc }; }; // a unidades del modelo
  return { f, tl: toS(f.xmin * sc, -f.ymax * sc), toL };
}
// El lugar del cursor en la fuente para un toque en p (pantalla). Texto normal sin formulas: la linea y el caracter mas cercanos, medidos;
// con formulas o un script: la linea por la altura y la columna en proporcion al ancho (lo dibujado no coincide letra a letra con la fuente).
function textTapCaret(t, ed, p) {
  const { f, toL } = textScreenFrame(t), L = toL(p), lines = ed.src.split('\n');
  const u = Math.max(0, Math.min(1, (L.x - f.xmin) / f.w)), v = Math.max(0, Math.min(0.9999, (L.y + f.ymax) / f.hh));
  if (ed.kind === 'script' && !t.open) return lines[0].length; // colapsado: al final de la firma
  let li, col;
  if (ed.kind === 'text' && !f.math && f.lines.length === lines.length) {
    li = Math.min(lines.length - 1, Math.max(0, Math.floor((L.y + f.ymax) / (LINE_SPACING * t.h))));
    const x = (L.x - f.xmin) / t.h, ln = lines[li];
    col = 0; let best = Infinity;
    for (let k = 0; k <= ln.length; k++) { const d = Math.abs(measureRel(ln.slice(0, k), t.font) - x); if (d < best) { best = d; col = k; } }
  } else if (f.math && !(ed.kind === 'script')) {
    const k = mathTapCaret(t, f, ed, L);
    if (k != null) return k;
    li = Math.floor(v * lines.length); col = Math.round(u * lines[li].length);
  } else {
    li = Math.floor(v * lines.length);
    col = Math.round(u * lines[li].length);
  }
  return lines.slice(0, li).reduce((n, l) => n + l.length + 1, 0) + col;
}
// Con formulas: el tramo dibujado mas cercano al toque y su lugar en la fuente. Los tramos se buscan en orden en la fuente («a», «10», «=»
// de «a*10=»); los que no estan escritos (el valor de «=50», «·» por «*», «:=») toman el lugar del anterior.
const TAP_SYM = { '·': '*', '−': '-', '×': '*', '≤': '<=', '≥': '>=', '≠': '!=', ':=': ':' };
function mathTapCaret(t, f, ed, L) {
  const prims = framePrims(f, t).filter((q) => q.k === 't' && q.s.trim());
  if (!prims.length) return null;
  const src = ed.src;
  let pos = 0;
  const at = prims.map((q) => {
    const s = TAP_SYM[q.s] ?? q.s, k = src.indexOf(s, pos);
    if (k >= 0 && k - pos < 40) { pos = k + s.length; return { k, n: s.length }; }
    return { k: pos, n: 0 };
  });
  const x = L.x, y = -L.y; // y del modelo (arriba)
  let best = -1, bd = Infinity;
  prims.forEach((q, i) => {
    const w = q.w > 0 ? q.w : measureRel(q.s, q.font, q.it) * q.size;
    const dx = x < q.x ? q.x - x : x > q.x + w ? x - (q.x + w) : 0, dy = Math.abs(y - (q.y + q.size * 0.3));
    const d = dx + 2 * Math.max(0, dy - q.size * 0.5);
    if (d < bd) { bd = d; best = i; }
  });
  const q = prims[best], m = at[best], w = q.w > 0 ? q.w : measureRel(q.s, q.font, q.it) * q.size;
  if (!m.n) return m.k;
  return m.k + Math.max(0, Math.min(m.n, Math.round(((x - q.x) / w) * m.n)));
}
function startTextEdit(id, p) {
  if (txState && txLive.value.trim() && !commitTextLive()) return;
  const t = doc.texts[id], ed = textEditSrc(t);
  txState = { edit: id, kind: ed.kind, orig: t.text, t0: performance.now(), tap: { x: p.x, y: p.y } };
  txLive.value = ed.src; txLiveBox.hidden = false; txLiveBox.classList.add('edit');
  txLayout(); draw();
  const k = textTapCaret(t, ed, p);
  txLive.focus(); txLive.setSelectionRange(k, k); ccClose();
}
function txEditLayout() {
  const t = doc.texts[txState.edit];
  if (!t || !doc.pts[t.pt]) { endTextLive(); return; }
  const { tl } = textScreenFrame(t), px = Math.max(13, Math.min(56, t.h * view.s));
  txLive.style.fontSize = px + 'px';
  txLive.style.fontFamily = txIsText() ? fontCss(t.font) : fontCss('mono');
  const lines = txLive.value.split('\n'), mx = Math.max(4, ...lines.map((l) => l.length));
  const W = Math.min(cv.clientWidth * 0.92, Math.max(120, mx * px * (txIsText() ? 0.55 : 0.62) + 26)), Hh = lines.length * px * 1.25 + 6;
  txLive.rows = lines.length; txLive.style.height = Hh - 2 + 'px';
  txLiveBox.style.width = W + 'px';
  txLiveBox.dataset.tag = txIsScript() ? '{}' : txIsText() ? 'A' : 'α';
  txLiveBox.title = txIsScript() ? 'Editando el script · Shift+Enter guarda · Esc lo deja como estaba' : 'Editando el texto · Enter guarda, Shift+Enter otra línea · Esc lo deja como estaba';
  txLiveBox.style.left = Math.max(26, Math.min(tl.x - 7, cv.clientWidth - W - 2)) + 'px';
  txLiveBox.style.top = Math.max(2, Math.min(tl.y - 4, cv.clientHeight - Hh - 2)) + 'px';
}
// Guarda la edicion en el lugar. false: lo escrito da un error (se deshizo, con su aviso) y la entrada sigue abierta para corregirlo.
function commitTextEdit() {
  const id = txState.edit, t = doc.texts[id], kind = txState.kind;
  if (!t) { endTextLive(); return true; }
  const raw = txLive.value.replace(/\s+$/, '');
  const text = kind === 'eq' ? '$$' + raw.trim() + '$$' : raw;
  if (!raw.trim() || text === t.text) { endTextLive(); return true; } // vacio: queda como estaba (para borrarlo, seleccionalo)
  const before = textVarErrors(doc);
  pushUndo(); t.text = text;
  if (!textEditOk(before)) { txLayout(); return false; }
  endTextLive(); afterChange();
  return true;
}
// Dibuja lo escrito como un texto nuevo y abre la entrada siguiente. false: no se pudo (la entrada sigue abierta para corregirla).
function commitTextLive() {
  if (!txState) return false;
  if (txState.edit) return commitTextEdit();
  const raw = txLive.value.replace(/\s+$/, ''), asText = TX_MARK.test(raw), body = asText ? raw.slice(1) : raw;
  if (!body.trim()) { endTextLive(); return true; }
  const text = raw[0] === '%' ? raw : asText ? body : '$$' + body.trim() + '$$'; // un script se guarda tal cual (colapsado al dibujarlo)
  pushUndo();
  const before = textVarErrors(doc), sUp = txState.sUp, reuse = sUp.type === 'pt';
  const pid = pointFrom(sUp); // el punto de insercion es un punto real: admite restricciones
  if (!reuse) doc.pts[pid].txOnly = true; // punto propio del texto: solo se ve al seleccionarlo
  const id = addText(doc, pid, text, { h: cur.tx.h ?? niceHeight(), ang: cur.tx.ang, anchor: text[0] === '%' ? 'tl' : cur.tx.anchor, color: cur.color, readable: cur.tx.readable, font: cur.tx.font }); // un script cuelga de su esquina superior: al expandirlo crece hacia abajo
  if (!textEditOk(before)) return false;
  // La siguiente entrada va justo debajo de este texto (sea cual sea su altura): las entradas siguientes cuelgan de un cursor, y su texto se
  // coloca con el borde superior en el cursor.
  const t = doc.texts[id], P = doc.pts[pid], pose = textPose(doc, t), f = textFrame(shownText(doc, t), measureRel, pose.anchor);
  const a = (pose.ang * Math.PI) / 180, ux = -Math.sin(a), uy = Math.cos(a), gap = 0.3 * t.h; // u: la «arriba» del texto
  let next;
  if (txState.cursor) { P.x = sUp.x - ux * f.ymax; P.y = sUp.y - uy * f.ymax; next = { x: sUp.x - ux * (f.hh + gap), y: sUp.y - uy * (f.hh + gap) }; }
  else next = { x: P.x + ux * (f.ymin - gap), y: P.y + uy * (f.ymin - gap) };
  txState = { sUp: { type: 'free', ...next }, cursor: true };
  sel = []; txLive.value = ''; ccClose();
  finishEdit();
  txLayout(); txLive.focus(); ccClose(); // la entrada nueva empieza sin lista
  return true;
}
function startTextLive(sUp) {
  if (txState && txLive.value.trim() && !commitTextLive()) return; // lo escrito se dibuja antes de mover la entrada
  txState = { sUp }; txLive.value = ''; txLiveBox.hidden = false; txLayout(); txLive.focus(); ccClose();
  if (!txHint) { txHint = true; toast('Escribe una ecuación (AsciiMath): Enter la dibuja, Shift+Enter hace otra línea; empezar con " (o un espacio) escribe texto normal, y con % un script'); }
}
txLive.addEventListener('keydown', (e) => {
  e.stopPropagation(); // ningun atajo del dibujo mientras se escribe
  if (ccKey(e)) return; // la lista de sugerencias abierta: flechas, Enter/Tab aceptan, Esc la cierra
  if (e.key === 'Escape') { e.preventDefault(); endTextLive(); return; }
  if (txState?.edit && e.key === 'Enter' && !txIsScript() && !e.shiftKey && !e.isComposing) { e.preventDefault(); commitTextLive(); return; }
  if (txIsScript()) { // en un script Enter hace otra linea (con su sangria) y Tab sangra; Shift+Enter (o Ctrl/Cmd+Enter) lo dibuja
    if (e.key === 'Enter' && (e.shiftKey || e.ctrlKey || e.metaKey) && !e.isComposing) { e.preventDefault(); commitTextLive(); return; }
    if (codeKeyEvent(e, txLive)) return;
    return;
  }
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (txLive.value.trim()) commitTextLive(); else endTextLive(); }
});
txLive.addEventListener('input', () => { txLayout(); ccUpdate(); });
// el segundo toque de un doble toque cae sobre la entrada que abrio el primero: deja el texto como estaba y abre sus propiedades
txLiveBox.addEventListener('pointerdown', (e) => {
  if (!txState?.edit || performance.now() - txState.t0 > 450) return;
  const r = cv.getBoundingClientRect(), q = { x: e.clientX - r.left, y: e.clientY - r.top };
  if (dist(q, txState.tap) > 24) return;
  e.preventDefault();
  const id = txState.edit; endTextLive(); lastTxTap = null; sel = [{ k: 'tx', id }]; afterChange(); openProps(sel[0]);
});
txLive.addEventListener('click', () => ccUpdate(true));
txLive.addEventListener('keyup', (e) => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) ccUpdate(true); else ccCheck(); });
txLive.addEventListener('compositionend', () => setTimeout(ccUpdate, 0));
txLive.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== txLive) ccClose(); }, 120));

// ---- Sugerencias al escribir en el cuadro de ecuacion (ver complete.js): lo que existe en ese lugar de la pagina (orden de lectura),
// con su detalle (la definicion dibujada, el valor, la ayuda) y la firma de la funcion en que esta el cursor. Automaticas (con 2 letras)
// o a pedido (boton ƒx junto al cuadro o Ctrl+Espacio); por defecto automaticas en pantallas anchas y a pedido en el celular.
const CC_KEY = 'acad-cc';
const ccMode = () => { try { const m = localStorage.getItem(CC_KEY); if (m === 'auto' || m === 'demand') return m; } catch { /* sin almacenamiento */ } return window.matchMedia?.('(min-width: 700px)').matches ? 'auto' : 'demand'; };
const ccPop = $('ccPop'), ccList = $('ccList'), ccDet = $('ccDet'), ccParam = $('ccParam');
let cc = null; // { items, hot, ctx, forced }
const CC_K = { var: 'x', fn: 'ƒ', lib: 'B', dim: 'D', el: 'p', builtin: 'ƒ' };
const CC_KIND = { var: 'Variable del documento', fn: 'Función del documento', lib: 'Biblioteca', dim: 'Cota', el: 'Elemento del dibujo', builtin: 'Función de A-CAD' };
// esquina superior izquierda del cuadro, en el dibujo: el lugar de lo que se escribe en el orden de lectura
const ccWhere = () => { const P = toModel(txLiveBox.offsetLeft, txLiveBox.offsetTop); return [P.y, P.x]; };
const ccArg = () => (decimalMode() === ',' ? '; ' : ', ');
function ccUpdate(keep = false) {
  if (!txState || txIsText()) { ccClose(); return; }
  const pos = txLive.selectionStart, auto = ccMode() === 'auto', forced = !!cc?.forced;
  const r = suggest(doc, txLive.value, pos, ...ccWhere(), { min: forced ? 0 : 2 });
  const want = r.items.length && (forced || (auto && (r.ctx.scope === 'member' || r.ctx.q.length >= 2)));
  if (!want) { if (!keep || !forced) ccHide(); ccParamShow(); return; }
  cc = { items: r.items, hot: 0, ctx: r.ctx, forced };
  ccRender(); ccParamShow();
}
function ccHide() { ccPop.hidden = true; if (cc) cc.items = []; }
function ccClose() { cc = null; ccPop.hidden = true; ccParam.hidden = true; }
// La lista se valida sola: si el texto o el cursor ya no son los de cuando se armo (el teclado del iPad con prediccion no siempre avisa
// cada cambio; el cierre automatico de parentesis o las letras griegas cambian el texto por codigo), se vuelve a calcular; vacia, se cierra.
function ccCheck() {
  if (ccPop.hidden && ccParam.hidden) return;
  if (!txState || txLiveBox.hidden || !txLive.value) { ccClose(); return; }
  if (!ccPop.hidden && cc?.snap !== txLive.value + '\u0000' + txLive.selectionStart) ccUpdate(true);
}
setInterval(ccCheck, 250);
document.addEventListener('selectionchange', () => { if (document.activeElement === txLive) ccCheck(); });
// posicion del cursor en el lienzo: la letra de una ecuacion es monoespaciada (columna × ancho de letra, linea × alto de linea)
function ccCaret() {
  const px = parseFloat(txLive.style.fontSize) || 16, lh = px * 1.25;
  if (!mctx) mctx = document.createElement('canvas').getContext('2d');
  mctx.font = `${px}px ${fontCss('mono')}`;
  const lines = txLive.value.slice(0, txLive.selectionStart).split('\n'), cw = mctx.measureText('M').width;
  return { x: txLiveBox.offsetLeft + 6 + lines.at(-1).length * cw, y: txLiveBox.offsetTop + 3 + lines.length * lh, top: txLiveBox.offsetTop };
}
function ccRender() {
  cc.snap = txLive.value + '\u0000' + txLive.selectionStart; // lo que muestra la lista corresponde a este texto y este cursor
  const shown = cc.items.slice(0, 40);
  ccList.textContent = '';
  shown.forEach((it, i) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option'); li.setAttribute('aria-selected', String(i === cc.hot));
    li.innerHTML = `<span class="k k-${it.kind}">${CC_K[it.kind]}</span>`;
    li.append(it.isAlias ? it.insert : it.name);
    li.onpointerdown = (e) => e.preventDefault(); // no quita el foco del cuadro (ni cierra el teclado del iPad)
    li.onclick = () => ccAccept(it);
    ccList.appendChild(li);
  });
  ccDetail(shown[cc.hot]);
  ccPop.hidden = false;
  const c = ccCaret(), W = cv.clientWidth, H = cv.clientHeight, pw = ccPop.offsetWidth, ph = ccPop.offsetHeight;
  ccPop.style.left = Math.max(4, Math.min(c.x - 28, W - pw - 4)) + 'px';
  ccPop.style.top = (c.y + 4 + ph > H - 4 ? Math.max(4, c.top - ph - 4) : c.y + 4) + 'px'; // si no cabe debajo, encima del cuadro
  ccList.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
}
// Una formula dibujada con el motor de los textos en un canvas (el detalle: «f(x):=sin(x)/x», «Sut=520 MPa»)
function ccFormula(src) {
  const [top, left] = ccWhere(), PID = '\u0000cc';
  const d2 = { ...doc, pts: { ...doc.pts, [PID]: { x: left, y: top } }, texts: { ...doc.texts, [PID]: { pt: PID, text: src, h: 15, anchor: 'tl' } } };
  let shown; try { shown = shownText(d2, d2.texts[PID]); } catch { shown = { text: src, h: 15, anchor: 'tl' }; }
  const t = { ...shown, h: 15, anchor: 'tl' }, f = textFrame(t, measureRel, 'tl'), r = window.devicePixelRatio || 1;
  const cnv = document.createElement('canvas'), w = Math.ceil(f.w + 4), h = Math.ceil(f.hh + 4);
  cnv.width = w * r; cnv.height = h * r; cnv.style.width = w + 'px'; cnv.style.height = h + 'px';
  const c = cnv.getContext('2d'); c.scale(r, r); c.translate(2 - f.xmin, 2 + f.ymax);
  const sdpr = dpr; dpr = 1; try { paintFrame(c, f, t, getComputedStyle(document.body).color, 1); } finally { dpr = sdpr; }
  return cnv;
}
function ccDetail(it) {
  ccDet.textContent = '';
  if (!it) return;
  const add = (cls, txt) => { const p = document.createElement('p'); p.className = cls; p.textContent = txt; ccDet.appendChild(p); return p; };
  const base = cc.ctx.scope === 'member' ? cc.ctx.base + '.' : '';
  if (it.kind === 'builtin') {
    const b = builtinInfo().get(it.name);
    const sg = document.createElement('div'); sg.className = 'sig'; sg.textContent = b.sig.replace(/;\s*/g, ccArg()); ccDet.appendChild(sg);
    if (b.desc) add('', b.desc);
    if (b.ex) add('ex', b.ex.replace(/;\s*/g, ccArg()));
  } else if (it.isAlias) {
    add('', it.kind === 'lib' ? `Biblioteca insertada: escribe ${it.insert} para ver sus nombres públicos.` : `Escribe ${it.insert} para ver sus medidas.`);
  } else {
    const full = base + it.name, src = it.kind === 'fn' || it.value?.fn ? defSource(doc, full) : null;
    try {
      if (src && src.params) ccDet.appendChild(ccFormula(`$$${it.name}(${src.params.join(ccArg())}):${src.script ? '…' : src.expr}$$`)); // la definicion, como SMath
      else ccDet.appendChild(ccFormula(`$$${full}=$$`)); // su valor en ese lugar de la pagina
    } catch { add('sig', full); }
    if (src?.help) add('', src.help);
  }
  add('src', base && it.kind === 'lib' ? `Biblioteca ${cc.ctx.base}` : CC_KIND[it.kind]);
}
// firma de la funcion en que esta el cursor, con el argumento actual resaltado
function ccParamShow() {
  const call = txState && !txIsText() ? openCall(txLive.value, txLive.selectionStart) : null;
  let ps = null;
  if (call) {
    const b = !call.name.includes('.') && builtinInfo().get(call.name);
    if (b) ps = (/\((.*)\)/.exec(b.sig)?.[1] || '').split(/;\s*/);
    else ps = defSource(doc, call.name)?.params || null;
  }
  if (!ps || !ps[0]) { ccParam.hidden = true; return; }
  ccParam.textContent = '';
  ccParam.append(call.name + '(');
  ps.forEach((p, i) => { if (i) ccParam.append(ccArg()); if (i === call.idx) { const b = document.createElement('b'); b.textContent = p; ccParam.append(b); } else ccParam.append(p); });
  ccParam.append(')');
  ccParam.hidden = false;
  ccParam.style.left = Math.max(4, Math.min(txLiveBox.offsetLeft, cv.clientWidth - ccParam.offsetWidth - 4)) + 'px';
  ccParam.style.top = Math.max(2, txLiveBox.offsetTop - ccParam.offsetHeight - 4) + 'px';
}
function ccAccept(it) {
  if (!it || !cc) return;
  const v = txLive.value, pos = txLive.selectionStart, start = cc.ctx.start;
  const call = !it.isAlias && (it.kind === 'builtin' || (it.params && it.params.length)) && v[pos] !== '(';
  const ins = it.insert + (call ? '()' : ''), caret = start + it.insert.length + (call ? 1 : 0);
  txLive.value = v.slice(0, start) + ins + v.slice(pos);
  txLive.focus(); txLive.setSelectionRange(caret, caret);
  const again = it.isAlias; // «UF.» o «p1.»: sigue con sus miembros
  cc = again ? { forced: true, items: [] } : null; ccPop.hidden = true;
  txLayout(); if (again) ccUpdate(); else ccParamShow();
}
function ccKey(e) {
  if ((e.ctrlKey || e.metaKey) && (e.key === ' ' || e.code === 'Space')) { e.preventDefault(); cc = { forced: true, items: [] }; ccUpdate(); return true; }
  ccCheck(); // antes de aceptar con Enter o Tab: que la lista sea la del texto actual
  if (!cc || ccPop.hidden || !cc.items.length) return false;
  const n = Math.min(40, cc.items.length);
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); cc.hot = (cc.hot + (e.key === 'ArrowDown' ? 1 : n - 1)) % n; ccRender(); return true; }
  if ((e.key === 'Enter' || e.key === 'Tab') && !e.shiftKey && !e.isComposing) { e.preventDefault(); ccAccept(cc.items[cc.hot]); return true; } // con la lista abierta, Enter acepta (como SMath)
  if (e.key === 'Escape') { e.preventDefault(); cc.forced = false; ccHide(); return true; } // cierra la lista sin descartar lo escrito
  return false;
}
document.addEventListener('pointerdown', (e) => { // un toque fuera de la lista y de la entrada la cierra (y la firma de la funcion)
  if ((!ccPop.hidden || !ccParam.hidden) && !ccPop.contains(e.target) && !txLiveBox.contains(e.target)) { if (cc) cc.forced = false; ccPop.hidden = true; ccParam.hidden = true; }
}, true);
$('txCc').onpointerdown = (e) => e.preventDefault();
$('txCc').onclick = () => { if (cc && !ccPop.hidden) { ccClose(); return; } cc = { forced: true, items: [] }; ccUpdate(); txLive.focus(); };
attachAutoPair(txLive, () => !txIsText()); // [] () {} $$ <> `` se cierran solos (ver autopair.js)
attachGreek(document, '#dlgGc'); // «\a» -> α y Ctrl+G en todos los campos de texto, menos la configuracion de GitHub (ver greek.js)
function placeText(sUp) { startTextLive(sUp); }

function finishEdit(keepPending) {
  const r = solve(doc, []);
  if (!r.ok) { rollback(); pending = keepPending ? null : pending; toast('Restricciones en conflicto: se deshizo la acción'); }
  afterChange();
}

function makeIntersections(items) {
  const [a, b] = items;
  const pts = [];
  const ln = (id) => { const l = doc.lines[id]; return [doc.pts[l.a], doc.pts[l.b]]; };
  const ci = (id) => { const c = doc.circles[id] || doc.arcs[id]; return [doc.pts[c.c], c.r]; };
  if (a.k === 'sp' || b.k === 'sp') {
    const sA = a.k === 'sp' ? a : b, o = a.k === 'sp' ? b : a;
    const P = splinePolyline(doc, doc.splines[sA.id], 24);
    if (o.k === 'sp') pts.push(...polylinePolyline(P, splinePolyline(doc, doc.splines[o.id], 24)));
    else if (o.k === 'ln') pts.push(...polylineLine(P, ...ln(o.id)));
    else pts.push(...polylineCircle(P, ...ci(o.id)));
  } else if (a.k === 'ln' && b.k === 'ln') {
    const p = lineLine(...ln(a.id), ...ln(b.id));
    if (!p) { toast('Las rectas son paralelas'); afterChange(); return; }
    pts.push(p);
  } else if (a.k !== 'ln' && b.k !== 'ln') pts.push(...circleCircle(...ci(a.id), ...ci(b.id)));
  else { const l = a.k === 'ln' ? a : b, c = a.k === 'ln' ? b : a; pts.push(...lineCircle(...ln(l.id), ...ci(c.id))); }
  // en un arco solo valen los puntos dentro de su tramo
  for (let i = pts.length - 1; i >= 0; i--) {
    for (const it of items) {
      if (it.k !== 'ar') continue;
      const ar = doc.arcs[it.id], g = arcOf(doc, ar);
      if (!inSweep(doc.pts[ar.c], g.a0, g.sweep, pts[i], 1e-3)) { pts.splice(i, 1); break; }
    }
  }
  if (!pts.length) { toast(items.some((it) => it.k === 'ar') ? 'No se intersectan (dentro del tramo del arco)' : 'No se intersectan'); afterChange(); return; }
  pushUndo();
  const created = [];
  for (const q of pts) {
    const id = addPoint(doc, q.x, q.y, false);
    for (const it of items) addCon(doc, { t: it.k === 'ln' ? 'PONL' : it.k === 'sp' ? 'PONS' : 'PONC', refs: [id, it.id], hidden: true });
    created.push(id);
  }
  const r = solve(doc, []);
  if (!r.ok) { rollback(); toast('No se pudo crear la intersección (conflicto)'); afterChange(); return; }
  sel = created.map((id) => ({ k: 'pt', id }));
  toast(pts.length === 1 ? 'Punto de intersección creado' : `${pts.length} puntos de intersección creados`);
  afterChange();
}

// ---------------------------------------------------------------- restricciones
// Ultimo estado del interruptor "Solo lectura" del dialogo de cotas.
// Menu de variables para los cuadros con formulas: un filtro (todas, dimensiones, angulos, variables de texto) y la lista; al elegir
// una se inserta su nombre en el campo donde se estaba escribiendo (el ultimo que tuvo el foco, entre inputIds).
function mountVarPicker(boxId, dlgId, inputIds, exceptId) {
  const box = $(boxId), dlg = $(dlgId);
  const items = varsInfo(doc, exceptId);
  box.textContent = '';
  box.style.display = items.length ? 'flex' : 'none';
  if (!items.length) return;
  const style = 'min-height:36px;padding:2px 6px;border:1px solid var(--line);border-radius:8px;background:var(--btn);color:var(--fg);font:inherit;min-width:0';
  const mk = (opts, flex) => { const sl = document.createElement('select'); sl.style.cssText = style + (flex ? ';flex:1 1 140px' : ';flex:none'); for (const [v, t] of opts) { const o = document.createElement('option'); o.value = v; o.textContent = t; sl.appendChild(o); } return sl; };
  const count = (k) => items.filter((x) => k === 'all' || x.kind === k).length;
  const flt = mk([['all', `Todas (${count('all')})`], ['dim', `Dimensiones (${count('dim')})`], ['ang', `Ángulos (${count('ang')})`], ['var', `Variables (${count('var')})`]], false);
  const lst = mk([], true);
  const fill = () => {
    lst.textContent = '';
    const shown = items.filter((x) => flt.value === 'all' || x.kind === flt.value);
    const o0 = document.createElement('option'); o0.value = ''; o0.textContent = shown.length ? 'Insertar variable…' : '(ninguna de este tipo)'; lst.appendChild(o0);
    for (const x of shown) { const o = document.createElement('option'); o.value = x.name; o.textContent = x.text; lst.appendChild(o); }
  };
  fill();
  flt.onchange = fill;
  let last = $(inputIds[0]);
  const track = (e) => { if (inputIds.includes(e.target.id)) last = e.target; };
  if (dlg._vpTrack) dlg.removeEventListener('focusin', dlg._vpTrack);
  dlg._vpTrack = track; dlg.addEventListener('focusin', track);
  lst.onchange = () => {
    const name = lst.value; lst.value = '';
    if (!name || !last) return;
    const s0 = last.selectionStart ?? last.value.length, s1 = last.selectionEnd ?? s0;
    last.value = last.value.slice(0, s0) + name + last.value.slice(s1);
    last.focus(); last.setSelectionRange(s0 + name.length, s0 + name.length);
    last.dispatchEvent(new Event('input', { bubbles: true }));
  };
  box.append(flt, lst);
}

let dlgRef = false;
let dlgUnit = null; // unidad elegida en la ultima cota angular ('deg' | 'rad')
let dlgCtx = null, dlgName = null; // dlgCtx (lo fija quien llama): { vars, list, name?, check? } para formulas con nombres y el campo Nombre
let dlgExpr = null; // formula tecleada en la ultima cota (null si fue un numero simple)
let dlgScale = null; // escala de «valor[*k]» en la ultima cota (null si no la llevaba)
let dlgScaleExpr = null; // la escala como formula («k», «2*D1»), null si era un numero
let dlgSrep = false; // la escala de la ultima cota es de representacion (con unidades): no se subraya
let dlgFs = null, dlgFsAsk = null; // tamaño de letra de la cota: dlgFsAsk (lo fija quien llama) muestra el campo; dlgFs, el elegido
let dlgLabel = null; // etiqueta libre de la ultima cota («"D"», «$D/2$»), null si no lleva
let dlgDU = null; // unidad de la etiqueta de la ultima cota de distancia, radio o diametro («in»), null si no lleva
const LEN_UNITS = ['mm', 'cm', 'm', 'in', 'ft'];
const KEYS = [['π', 'π'], ['√', '√('], ['sin', 'sin('], ['cos', 'cos('], ['tan', 'tan('], ['^', '^'], ['(', '('], [')', ')'], ['×', '*'], ['÷', '/']];
// kind: 'len' (distancias, radios) o 'angle' (grados; lo que lleve π se pasa de radianes a grados)
// sopt: false (sin escala) o { scale0: escala actual como texto, measured: medida del dibujo } (cotas de distancia, radio y diametro).
function askNumber(labelText, initial, refState = false, kind = 'len', unit0 = 'deg', sopt = false) {
  dlgScale = null; dlgScaleExpr = null; dlgDU = null; dlgSrep = false; dlgLabel = null; dlgFs = null;
  const fsAsk = dlgFsAsk; dlgFsAsk = null;
  const scaleOk = !!sopt;
  const raw = () => splitLabel($('dlgInput').value).body, lblTail = () => { const l = splitLabel($('dlgInput').value).lbl; return l ? `[${l}]` : ''; }; // la etiqueta libre va aparte de la escala y del valor
  return new Promise((resolve) => {
    const dlg = $('dlg'), inp = $('dlgInput'), chk = $('dlgRef'), prev = $('dlgPrev');
    const ctx = dlgCtx || { vars: varsOf(doc), list: varsList(doc) }; dlgCtx = null; dlgName = null;
    const nameRow = $('dlgNameRow'), nameInp = $('dlgName'), varsBox = $('dlgVars');
    varsBox.style.display = 'none'; // la lista de variables es un menu que inserta en el campo (mountVarPicker)
    mountVarPicker('dlgPick', 'dlg', ['dlgInput'], ctx?.except ?? null);
    nameRow.style.display = ctx && ctx.name !== undefined ? 'flex' : 'none';
    if (ctx && ctx.name !== undefined) nameInp.value = ctx.name;
    $('dlgLabel').textContent = labelText;
    $('dlgFsRow').style.display = fsAsk ? 'flex' : 'none'; if (fsAsk) { $('dlgFs').value = String(fsAsk); $('dlgFsLabel').textContent = dimFsLabel('Letra de la cota'); }
    inp.value = String(initial);
    chk.checked = refState; inp.disabled = refState;
    const unitSel = $('dlgUnit');
    $('dlgRefRow').style.display = kind === 'int' ? 'none' : 'flex';
    $('dlgHelp').style.display = kind === 'int' ? 'none' : 'block';
    $('dlgUnitRow').style.display = kind === 'angle' ? 'flex' : 'none';
    unitSel.value = unit0;
    // Unidad de la cota (distancias, radios y diametros): la etiqueta dice el valor en ella y el dibujo mide lo real («126'in» mide 3200,4).
    // Cambiarla reescribe el valor: un numero se convierte («126'in» -> «3200,4'mm»); en una formula solo cambia la unidad del final.
    const luSel = $('dlgLUnit'), duOk = !!sopt;
    $('dlgLUnitRow').style.display = duOk ? 'flex' : 'none';
    const setLU = (du) => {
      luSel.textContent = '';
      for (const u of ['', ...LEN_UNITS, ...(du && !LEN_UNITS.includes(du) ? [du] : [])]) { const o = document.createElement('option'); o.value = u; o.textContent = u || 'sin unidad'; luSel.appendChild(o); }
      luSel.value = du || '';
    };
    let luPrev = duOk ? sopt.du0 || '' : '';
    if (duOk) setLU(luPrev);
    luSel.onchange = () => {
      const nu = luSel.value, ou = luPrev; luPrev = nu;
      if (chk.checked) { showPrev(); return; } // solo lectura: la unidad solo cambia la etiqueta
      const sp = splitScale(raw()), t = splitUnit(sp.body), body = t ? t.body : sp.body, old = t ? t.unit : ou;
      let nb;
      if (isPlainNumber(body)) {
        const g0 = dimUnit(old)?.g ?? 1, g1 = dimUnit(nu)?.g ?? 1, n = Number(body.replace(',', '.'));
        nb = localNum(String(Number(((n * g0) / g1).toPrecision(10))));
      } else nb = body.trim();
      inp.value = (nu ? `${nb}'${nu}` : nb) + (sp.src !== undefined ? `[*${sp.src}]` : '') + lblTail();
      showPrev();
    };
    unitSel.onchange = () => { // un numero simple se convierte al cambiar de unidad
      if (isPlainNumber(inp.value)) { const n = Number(inp.value.replace(',', '.')); inp.value = String(Math.round(n * (unitSel.value === 'rad' ? Math.PI / 180 : 180 / Math.PI) * 1e10) / 1e10); }
      showPrev();
    };
    const keys = $('dlgKeys');
    keys.textContent = '';
    for (const [lab, ins] of (kind === 'int' ? [] : KEYS)) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = lab; b.style.cssText = 'min-height:36px;min-width:40px;padding:2px 8px';
      b.onpointerdown = (e) => e.preventDefault(); // no quita el foco del campo (ni cierra el teclado)
      b.onclick = () => {
        const s0 = inp.selectionStart ?? inp.value.length, s1 = inp.selectionEnd ?? s0;
        inp.value = inp.value.slice(0, s0) + ins + inp.value.slice(s1);
        inp.setSelectionRange(s0 + ins.length, s0 + ins.length); inp.focus(); showPrev();
      };
      keys.appendChild(b);
    }
    // Escala de una cota: un numero o una formula con cotas y variables («10», «k», «2*D1»). { sc, src } o { err }.
    // Con unidades («1'mm/kN», «eF») es una escala de representacion (rep): la magnitud por la escala da la longitud del dibujo. qd: dimension de la magnitud.
    const scaleOf = (src, qd) => {
      try {
        const s = scaleEval(src, ctx?.vars, qd);
        return { sc: s.sc, rep: s.rep, src: isPlainNumber(src) ? null : src.trim() };
      } catch (e) { return { err: 'Escala: ' + e.message }; }
    };
    // «valor[*k]»: cota a escala (el dibujo mide valor por k y la cota dice valor); solo donde scaleOk
    const evalNow = () => {
      const sp = splitScale(raw());
      if (sp.err) return { err: sp.err };
      if (sp.src !== undefined && !scaleOk) return { err: 'La escala [*k] solo vale en distancias, radios y diámetros' };
      let so = null, v, du = null, d;
      try {
        if (duOk) ({ v, du, d } = dimEval(sp.body, ctx?.vars)); // con su unidad: la etiqueta la dice y el dibujo mide lo real
        else v = parseValue(sp.body, { angle: kind === 'angle', radians: kind === 'angle' && unitSel.value === 'rad', vars: ctx?.vars });
      } catch (e) { return { err: e.message }; }
      if (sp.src !== undefined) { so = scaleOf(sp.src, d); if (so.err) return { err: so.err }; }
      const warn = duOk ? noScaleWarn(d, du, v, so?.rep) : null; // otra magnitud sin escala de representacion: mide su valor en el SI
      return !so ? { v, du, warn } : { v: Number((v * so.sc).toPrecision(12)), shown: v, scale: so.sc, scaleSrc: so.src, rep: so.rep, body: sp.body, du, warn };
    };
    // Solo lectura: campo «Escala (×)» (vacio = sin escala); la cota dice medida ÷ escala
    const scRow = $('dlgScaleRow'), scInp = $('dlgScale');
    scInp.value = scaleOk ? String(sopt.scale0 ?? '') : '';
    const refScale = () => { const s = scInp.value.trim(); return s ? scaleOf(s, dimUnit(luSel.value)?.d) : null; };
    // solo lectura con una unidad de otra magnitud (kN, V) y sin escala de representacion: no se puede leer del dibujo
    const refUnreadable = (so) => { const u = dimUnit(luSel.value); return !!(u?.d && !isLenDim(u.d) && !so?.rep); };
    const showPrev = () => {
      if (chk.checked && scaleOk) { // solo lectura con escala: la cota dice la medida entre la escala
        const so = refScale(), m = sopt.measured, rd6 = (x) => Math.round(x * 1e6) / 1e6, lu = dimUnit(luSel.value), tl = lu ? ' ' + luSel.value : '';
        const bad = !so?.err && refUnreadable(so);
        prev.style.color = so?.err || bad ? 'var(--warn)' : 'var(--muted)';
        prev.textContent = so?.err ? so.err : bad ? `⚠ Para leer la medida en ${luSel.value} hace falta una escala con unidades, p. ej. 1'mm/${luSel.value}` : so ? `Cota «${rd6(m / so.sc / (lu?.g ?? 1))}${tl}»${so.rep ? '' : ' (subrayada)'} · medida ${rd6(m)} ÷ ${rd6(so.sc)}` : lu ? `Cota «${rd6(m / lu.g)}${tl}» · medida ${rd6(m)}` : '';
        return;
      }
      if (chk.checked || (isPlainNumber(inp.value) && kind !== 'angle')) { prev.textContent = ''; if (duOk && !chk.checked) { luPrev = ''; luSel.value = ''; } return; }
      const r = evalNow();
      prev.style.color = r.err || r.warn ? 'var(--warn)' : 'var(--muted)';
      const rd6 = (x) => Math.round(x * 1e6) / 1e6;
      if (duOk && !r.err) { luPrev = r.du || ''; if (r.du && ![...luSel.options].some((o) => o.value === r.du)) setLU(r.du); else luSel.value = r.du || ''; } // el selector sigue a lo escrito
      const g = dimUnit(r.du)?.g, tl = g ? ' ' + r.du : '';
      prev.textContent = r.err ? r.err : (r.scale !== undefined ? `Cota «${rd6(g ? r.shown / g : r.shown)}${tl}»${r.rep ? '' : ' (subrayada)'} · dibujo = ${rd6(r.v)}` : kind === 'angle' ? `= ${rd6(r.v)}° = ${rd6((r.v * Math.PI) / 180)} rad` : g ? `Cota «${rd6(r.v / g)}${tl}» · dibujo = ${rd6(r.v)}` : '= ' + rd6(r.v)) + (r.warn ? ' · ⚠ ' + r.warn : '');
    };
    const sync = () => { inp.disabled = chk.checked; keys.style.display = chk.checked ? 'none' : 'flex'; scRow.style.display = chk.checked && scaleOk ? 'flex' : 'none'; showPrev(); };
    chk.onchange = () => { // la escala pasa de un campo al otro al marcar o desmarcar «Solo lectura»
      if (scaleOk) {
        if (chk.checked) { const tl = lblTail(), sp = splitScale(raw()); if (sp.src !== undefined && !scInp.value.trim()) scInp.value = sp.src; inp.value = splitScale(raw()).body + tl; }
        else if (scInp.value.trim() && splitScale(raw()).src === undefined) { const tl = lblTail(); inp.value = `${raw().trim()}[*${scInp.value.trim()}]${tl}`; }
      }
      sync();
    };
    inp.oninput = showPrev; scInp.oninput = showPrev; sync();
    let done = false;
    const finish = (v) => { if (done) return; done = true; if (fsAsk && v !== null) { const f = Number(String($('dlgFs').value).replace(',', '.')); dlgFs = doc.dimText ? (f > 0 ? f : null) : f >= 6 && f <= 48 ? f : null; } dlgRef = chk.checked; dlgUnit = kind === 'angle' ? unitSel.value : null; dlg.close(); resolve(v); };
    $('dlgOk').onclick = (ev) => {
      ev.preventDefault();
      if (ctx && ctx.name !== undefined) {
        const nm = nameInp.value.trim();
        if (nm !== ctx.name) { const er = ctx.check(nm); if (er) { prev.style.color = 'var(--warn)'; prev.textContent = er; return; } }
        dlgName = nm;
      }
      if (chk.checked) { // cota de referencia: no se teclea valor, pero si su escala
        const so = scaleOk ? refScale() : null;
        if (so?.err) { prev.style.color = 'var(--warn)'; prev.textContent = so.err; return; }
        dlgExpr = null; dlgScale = so ? so.sc : null; dlgScaleExpr = so ? so.src : null; dlgDU = duOk && luSel.value ? luSel.value : null; dlgSrep = !!so?.rep; dlgLabel = splitLabel(inp.value).lbl ?? null;
        finish(Number(initial)); return;
      }
      const r = evalNow();
      if (r.err) { prev.style.color = 'var(--warn)'; prev.textContent = r.err; return; } // se queda abierto para corregir
      const sp = splitScale(raw()); dlgLabel = splitLabel(inp.value).lbl ?? null;
      dlgExpr = isPlainNumber(sp.body) && !r.scaleSrc ? null : sp.body.trim(); // con la escala como formula, el valor tambien se guarda: «30[*k]» sigue a k
      dlgScale = r.scale ?? null; dlgScaleExpr = r.scaleSrc ?? null; dlgDU = r.du ?? null; dlgSrep = !!r.rep;
      if (r.warn) toast(r.warn);
      finish(r.v);
    };
    $('dlgCancel').onclick = () => finish(null);
    dlg.oncancel = () => finish(null);
    dlg.showModal(); inp.focus(); inp.select();
  });
}

function selBy() {
  const ids = (k) => sel.filter((x) => x.k === k).map((x) => x.id);
  const crv = sel.filter((x) => x.k === 'ci' || x.k === 'ar').map((x) => x.id);
  // un texto seleccionado aporta su punto de insercion a las restricciones
  const txPts = sel.filter((x) => x.k === 'tx').map((x) => doc.texts[x.id]?.pt).filter((q) => q && !ids('pt').includes(q));
  return { pts: [...ids('pt'), ...txPts], lns: ids('ln'), cis: ids('ci'), ars: ids('ar'), sps: ids('sp'), els: ids('el'), crv };
}
const lineEnds = (id) => [doc.lines[id].a, doc.lines[id].b];
const curveOf = (id) => doc.circles[id] || doc.arcs[id];

async function applyCon(kind) {
  const { pts, lns, crv, sps, els, cis, ars } = selBy();
  const list = [];
  let pre = null; // ajuste previo del dibujo (despues de guardar el estado para deshacer)
  const bad = (m) => { toast(m); return null; };
  switch (kind) {
    case 'H': case 'V':
      if (lns.length) lns.forEach((l) => list.push({ t: kind, refs: [l] }));
      else if (pts.length >= 2) for (let i = 1; i < pts.length; i++) list.push({ t: kind, refs: [pts[0], pts[i]] });
      else return bad('Selecciona líneas o 2 puntos');
      break;
    case 'DSH': case 'DSV': { // distribuir: puntos (o textos, por su punto de insercion) igualmente espaciados entre los extremos
      const c = kind === 'DSH' ? 'x' : 'y', ids = [...new Set(pts)];
      if (ids.length < 3) return bad('Selecciona 3 o más puntos o textos');
      const ord = ids.map((id, i) => ({ id, i, v: doc.pts[id][c] })).sort((a, b) => a.v - b.v || a.i - b.i).map((o) => o.id);
      const key = [...ord].sort().join();
      if (Object.values(doc.cons).some((k) => k.t === kind && [...k.refs].sort().join() === key)) return bad('Ya están distribuidos así');
      list.push({ t: kind, refs: ord });
      // los de en medio se llevan a su lugar antes de resolver: los extremos no se mueven
      pre = () => { const a = doc.pts[ord[0]][c], b = doc.pts[ord[ord.length - 1]][c]; ord.forEach((id, i) => { if (i && i < ord.length - 1 && !doc.pts[id].fixed) doc.pts[id][c] = a + ((b - a) * i) / (ord.length - 1); }); };
      break;
    }
    case 'PAR': case 'PERP':
      if (lns.length < 2) return bad('Selecciona 2 líneas');
      for (let i = 1; i < lns.length; i++) list.push({ t: kind, refs: [lns[0], lns[i]] });
      break;
    case 'GEAR': {
      if (lns.length !== 2) return bad('Selecciona 2 líneas: una rígida con cada engranaje (por ejemplo la radial de cada uno)');
      if (doc.cons && Object.values(doc.cons).some((k) => k.t === 'GEAR' && k.refs.includes(lns[0]) && k.refs.includes(lns[1]))) return bad('Esas dos líneas ya tienen una relación de engranaje');
      const val = await askNumber('Giro de la 2.ª línea por cada giro de la 1.ª (negativo si giran en sentido contrario; admite fórmula, ej. -17/34)', -1);
      if (val === null || !Number.isFinite(val) || val === 0) return;
      list.push(makeGear(doc, lns[0], lns[1], val));
      toast('Engranaje: la postura actual es el punto de partida; arrastra cualquiera de los dos');
      break;
    }
    case 'RACK': {
      if (lns.length !== 2 || pts.length !== 1) return bad('Selecciona la línea radial de la rueda, luego la línea de la cremallera (o el suelo) y el punto que avanza (el centro de la rueda, o un punto de la cremallera)');
      const [wl, rl] = lns, [wa, wb] = lineEnds(wl).map((i) => doc.pts[i]);
      const val = await askNumber('Avance del punto por cada radián que gira la rueda (con signo: radio de la rueda; una rueda que rueda hacia la derecha por el suelo, −radio; admite fórmula)', -Math.round(dist(wa, wb) * 1000) / 1000);
      if (val === null || !Number.isFinite(val) || val === 0) return;
      const chk = checkRack(doc, wl, pts[0], rl, val);
      if (!chk.ok) return bad(`El punto que avanza debe ser el centro de la rueda (a ${Math.round(Math.abs(val) * 1000) / 1000} de la línea de la cremallera) o un punto de la cremallera; el elegido está a ${Math.round(chk.dist * 1000) / 1000}. Un punto del borde no sirve`);
      list.push(makeRack(doc, wl, chk.q, rl, val));
      toast(chk.changed ? `Se usó el otro extremo de la línea de la rueda (${chk.q}): es su centro, y el punto del borde no avanza a ritmo uniforme` : 'Rueda y cremallera: arrastra la rueda, la cremallera o el punto; el otro se mueve con la razón');
      break;
    }
    case 'COL':
      if (lns.length < 2) return bad('Selecciona 2 o más líneas');
      for (let i = 1; i < lns.length; i++) list.push({ t: 'COL', refs: [lns[0], lns[i]] });
      break;
    case 'EQ':
      if (lns.length >= 2 && !crv.length) for (let i = 1; i < lns.length; i++) list.push({ t: 'EQL', refs: [lns[0], lns[i]] });
      else if (crv.length >= 2 && !lns.length) for (let i = 1; i < crv.length; i++) list.push({ t: 'EQR', refs: [crv[0], crv[i]] });
      else return bad('Selecciona 2 líneas, o 2 círculos/arcos');
      break;
    case 'CONC':
      if (crv.length < 2 || lns.length) return bad('Selecciona 2 o más círculos o arcos');
      for (let i = 1; i < crv.length; i++) {
        const c0 = (doc.circles[crv[0]] || doc.arcs[crv[0]]).c, ci = (doc.circles[crv[i]] || doc.arcs[crv[i]]).c;
        if (c0 !== ci) list.push({ t: 'CONC', refs: [crv[0], crv[i]] });
      }
      if (!list.length) return bad('Ya son concéntricos (comparten el centro)');
      break;
    case 'COI': {
      // 1 linea, arco, circulo, elipse o spline + puntos: los puntos quedan sobre el elemento; 2 o mas puntos:
      // coincidentes; lineas o arcos + 1 elipse o spline: el extremo mas cercano de cada uno queda sobre la curva
      const nOther = lns.length + crv.length + sps.length + els.length;
      if (pts.length && nOther === 1) {
        const t = sps.length ? 'PONS' : els.length ? 'PONE' : lns.length ? 'PONL' : 'PONC', o = [...sps, ...els, ...lns, ...crv][0];
        pts.forEach((p) => list.push({ t, refs: [p, o] }));
      } else if (pts.length >= 2 && !nOther) for (let i = 1; i < pts.length; i++) list.push({ t: 'COI', refs: [pts[0], pts[i]] });
      else if (!pts.length && sps.length + els.length === 1 && lns.length + ars.length >= 1 && !cis.length) {
        const cid = sps[0] || els[0], poly = sps.length ? splinePolyline(doc, doc.splines[cid], 32) : ellipsePolyline(doc, doc.ellipses[cid], 360);
        const dd = (pid) => closestOnPolyline(poly, doc.pts[pid])?.d ?? Infinity;
        for (const o of [...lns, ...ars]) {
          const ends = o in doc.lines ? lineEnds(o) : [doc.arcs[o].a, doc.arcs[o].b];
          const e = dd(ends[0]) <= dd(ends[1]) ? ends[0] : ends[1];
          if (sps.length && doc.splines[cid].pts.includes(e)) continue; // ya es un punto del spline
          list.push({ t: sps.length ? 'PONS' : 'PONE', refs: [e, cid] });
        }
        if (!list.length) return bad('Ese extremo ya es un punto del spline');
      } else return bad('Selecciona 2 o más puntos; punto(s) y una línea, arco, círculo, elipse o spline; o líneas/arcos y una elipse o spline');
      break;
    }
    case 'MID':
      if (pts.length !== 1 || lns.length !== 1) return bad('Selecciona 1 punto y 1 línea');
      list.push({ t: 'MID', refs: [...lineEnds(lns[0]), pts[0]] });
      break;
    case 'TAN':
      if (sps.length === 1 && lns.length + crv.length === 1) {
        // punto de contacto: el punto del spline mas cercano a la recta (o a la circunferencia)
        const poly = splinePolyline(doc, doc.splines[sps[0]], 32);
        let score;
        if (lns.length) { const [a, b] = lineEnds(lns[0]).map((i) => doc.pts[i]); const L = dist(a, b) || 1; score = (q) => Math.abs((b.x - a.x) * (a.y - q.y) - (a.x - q.x) * (b.y - a.y)) / L; }
        else { const o = curveOf(crv[0]), c = doc.pts[o.c]; score = (q) => Math.abs(dist(c, q) - o.r); }
        const q0 = poly.reduce((m, q) => (score(q) < score(m) ? q : m), poly[0]);
        const tp = addPoint(doc, q0.x, q0.y, true);
        list.push({ t: lns.length ? 'TANLS' : 'TANCS', refs: [lns.length ? lns[0] : crv[0], sps[0], tp] });
        pre = () => seedTangent(lns[0], sps[0], tp, poly);
      } else if (els.length === 1 && lns.length + crv.length === 1 && !sps.length) {
        // punto de contacto: el punto de la elipse mas cercano a la recta (o a la circunferencia)
        const poly = ellipsePolyline(doc, doc.ellipses[els[0]], 360);
        let score;
        if (lns.length) { const [a, b] = lineEnds(lns[0]).map((i) => doc.pts[i]); const L = dist(a, b) || 1; score = (q) => Math.abs((b.x - a.x) * (a.y - q.y) - (a.x - q.x) * (b.y - a.y)) / L; }
        else { const o = curveOf(crv[0]), c = doc.pts[o.c]; score = (q) => Math.abs(dist(c, q) - o.r); }
        const q0 = poly.reduce((m, q) => (score(q) < score(m) ? q : m), poly[0]);
        const tp = addPoint(doc, q0.x, q0.y, true);
        list.push({ t: lns.length ? 'TANLE' : 'TANCE', refs: [lns.length ? lns[0] : crv[0], els[0], tp] });
      } else if (els.length === 2 && !lns.length && !crv.length && !sps.length) {
        // dos elipses: el punto de contacto arranca en el punto de la 2.a mas cercano a la 1.a
        const P1 = ellipsePolyline(doc, doc.ellipses[els[0]], 180), P2 = ellipsePolyline(doc, doc.ellipses[els[1]], 180);
        let q0 = P2[0], bd = Infinity;
        for (const q of P2) { const f = closestOnPolyline(P1, q); if (f && f.d < bd) { bd = f.d; q0 = { x: (q.x + f.x) / 2, y: (q.y + f.y) / 2 }; } }
        const tp = addPoint(doc, q0.x, q0.y, true);
        list.push({ t: 'TANEE', refs: [els[0], els[1], tp] });
      } else if (els.length || sps.length) return bad('Selecciona una elipse + línea/círculo/arco, 2 elipses, o un spline + línea/círculo/arco');
      else if (lns.length === 1 && crv.length === 1) list.push({ t: 'TANLC', refs: [lns[0], crv[0]] });
      else if (crv.length === 2 && !lns.length) list.push({ t: 'TANCC', refs: [crv[0], crv[1]] });
      else return bad('Selecciona línea + círculo/arco, 2 círculos/arcos, o una elipse o spline + línea/círculo/arco');
      break;
    case 'FIX': {
      const ids = new Set(pts);
      lns.forEach((l) => lineEnds(l).forEach((p) => ids.add(p)));
      crv.forEach((c) => { const o = curveOf(c); ids.add(o.c); if (o.a) { ids.add(o.a); ids.add(o.b); } });
      if (!ids.size) return bad('Selecciona puntos o elementos a fijar');
      pushUndo();
      const allFixed = [...ids].every((i) => doc.pts[i].fixed);
      ids.forEach((i) => { doc.pts[i].fixed = !allFixed; });
      toast(allFixed ? 'Soltado' : 'Fijado'); afterChange();
      return;
    }
    case 'DIM': {
      { // un punto + el elemento al que pertenece (un extremo, su centro o un punto sobre el): línea indicativa (anotación)
        const els1 = [...lns, ...crv, ...sps, ...els];
        if (pts.length === 1 && els1.length === 1 && pointOnElement(doc, pts[0], els1[0])) { await addLeader(pts[0], els1[0]); return; }
      }
      let refs, t, v, parallelPair = null;
      if (crv.length) {
        // un arco o circulo con otro elemento: distancia desde ese elemento hasta el centro del arco o circulo
        if (crv.length + pts.length + lns.length + els.length + sps.length !== 2) return bad('Con un arco o círculo, selecciona un solo elemento más');
        if (sps.length) return bad('Un spline no tiene centro: no se puede acotar contra un arco o círculo');
        const c0 = curveOf(crv[0]).c;
        if (pts.length) { refs = [pts[0], c0]; t = 'DIST'; v = dist(doc.pts[pts[0]], doc.pts[c0]); }
        else if (lns.length) {
          const [a, b] = lineEnds(lns[0]).map((i) => doc.pts[i]), q = doc.pts[c0];
          refs = [c0, lns[0]]; t = 'DISTPL'; v = Math.abs((b.x - a.x) * (a.y - q.y) - (a.x - q.x) * (b.y - a.y)) / (dist(a, b) || 1);
        } else {
          const c1 = crv.length === 2 ? curveOf(crv[1]).c : doc.ellipses[els[0]].c;
          refs = [c0, c1]; t = 'DIST'; v = dist(doc.pts[c0], doc.pts[c1]);
        }
      } else if (pts.length === 2 && !lns.length) { refs = pts; t = 'DIST'; v = dist(doc.pts[pts[0]], doc.pts[pts[1]]); }
      else if (lns.length === 1 && !pts.length) { refs = lineEnds(lns[0]); t = 'DIST'; v = dist(doc.pts[refs[0]], doc.pts[refs[1]]); }
      else if (pts.length === 1 && lns.length === 1) {
        const [a, b] = lineEnds(lns[0]).map((i) => doc.pts[i]), p = doc.pts[pts[0]];
        refs = [pts[0], lns[0]]; t = 'DISTPL';
        v = Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / (dist(a, b) || 1);
      } else if (lns.length === 2 && !pts.length && !crv.length && !sps.length && !els.length) {
        // distancia entre dos lineas paralelas: la de un extremo de la 2.a a la recta de la 1.a
        const [a, b] = lineEnds(lns[0]).map((i) => doc.pts[i]), [c, d] = lineEnds(lns[1]).map((i) => doc.pts[i]);
        const L1 = dist(a, b), L2 = dist(c, d);
        if (L1 < 1e-9 || L2 < 1e-9) return bad('Hay una línea sin longitud');
        const sin = Math.abs((b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x)) / (L1 * L2);
        if (sin > 0.0175) return bad('Las dos líneas no son paralelas (más de 1° de diferencia). Hazlas paralelas con la restricción Paralela');
        const tOf = (q) => ((q.x - a.x) * (b.x - a.x) + (q.y - a.y) * (b.y - a.y)) / (L1 * L1);
        const [e0, e1] = lineEnds(lns[1]), pick = Math.abs(tOf(c) - 0.5) <= Math.abs(tOf(d) - 0.5) ? e0 : e1, p = doc.pts[pick];
        refs = [pick, lns[0]]; t = 'DISTPL';
        v = Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / L1;
        parallelPair = [lns[0], lns[1]];
      } else return bad('Selecciona 2 puntos, 1 línea, 1 punto + 1 línea, o 2 líneas paralelas');
      if (v < 1e-9) return bad('La distancia es cero (coinciden o comparten el centro): no hay nada que acotar');
      const val = await askNumber('Distancia', Math.round(v * 1000) / 1000, false, 'len', 'deg', { scale0: '', measured: v });
      if (val === null || val <= 0) return;
      // para que sigan siendo paralelas (si ya no lo estaban por restriccion), se agrega la restriccion Paralela
      if (parallelPair && !dlgRef && !Object.values(doc.cons).some((k) => k.t === 'PAR' && parallelPair.every((x) => k.refs.includes(x)))) {
        list.push({ t: 'PAR', refs: parallelPair });
        toast('Se agregó también la restricción Paralela entre las dos líneas');
      }
      list.push({ t, refs, v: val, ...(dlgExpr ? { expr: dlgExpr } : {}), ...(dlgScale ? { scale: dlgScale, ...(dlgScaleExpr ? { scaleExpr: dlgScaleExpr } : {}) } : {}), ...(dlgDU ? { du: dlgDU } : {}), ...(dlgScale && dlgSrep ? { srep: true } : {}), ...(dlgRef ? { ref: true } : {}), ...(dlgLabel ? { lbl: dlgLabel } : {}), ...newFs() });
      break;
    }
    case 'ANG': {
      if (lns.length !== 2) return bad('Selecciona 2 líneas');
      const dir = (l) => { const [a, b] = lineEnds(l).map((i) => doc.pts[i]); return { x: b.x - a.x, y: b.y - a.y }; };
      const v = (signedAngle(dir(lns[0]), dir(lns[1])) * 180) / Math.PI;
      // sector que se acota: el que une los dos segmentos; luego se puede mover la cota a otro (20° o 160°)
      const tmp = { t: 'ANG', refs: [lns[0], lns[1]], v };
      const S = angSector(doc, tmp);
      tmp.s1 = S.V0 ? S.s1 : 1; tmp.s2 = S.V0 ? S.s2 : 1;
      tmp.sg = angSector(doc, tmp).phi < 0 ? -1 : 1; // sentido en que se mide (antihorario o horario)
      const u0 = opts.angUnit === 'rad' ? 'rad' : 'deg';
      const shownDeg = angSector(doc, tmp).val;
      const val = await askNumber('Ángulo entre las dos líneas (sin límite: 400° = una vuelta y 40°)', u0 === 'rad' ? Math.round(((shownDeg * Math.PI) / 180) * 1e10) / 1e10 : Math.round(shownDeg * 100) / 100, false, 'angle', u0);
      if (val === null) return;
      opts.angUnit = dlgUnit; persist();
      list.push({ t: 'ANG', refs: [lns[0], lns[1]], v: angTrue(doc, { ...tmp, cur: val }, val), s1: tmp.s1, s2: tmp.s2, sg: tmp.sg, cur: val, ...(dlgUnit === 'rad' ? { unit: 'rad' } : {}), ...(dlgExpr ? { expr: dlgExpr } : {}), ...(dlgRef ? { ref: true } : {}), ...newFs() });
      break;
    }
    case 'RAD': {
      if (!crv.length) return bad('Selecciona un círculo o arco');
      // si el arco o el circulo ya tiene su cota de radio (por ejemplo la de un redondeo), el boton Radio cambia esa cota:
      // una segunda cota con otro valor entraria en conflicto con la primera
      const have = crv.length === 1 ? Object.entries(doc.cons).find(([, k]) => k.t === 'RAD' && !k.ref && k.refs[0] === crv[0]) : null;
      if (have) { await editDimension(have[0]); return; }
      const allC = crv.every((id) => id in doc.circles), allA = crv.every((id) => id in doc.arcs);
      if (!allC && !allA) return bad('Selecciona solo círculos o solo arcos');
      const r0 = curveOf(crv[0]).r;
      const val0 = await askNumber(allC ? `Diámetro (${DIAM})` : 'Radio (R)', Math.round((allC ? 2 * r0 : r0) * 1000) / 1000, false, 'len', 'deg', { scale0: '', measured: allC ? 2 * r0 : r0 });
      if (val0 === null || val0 <= 0) return;
      const sc = dlgScale, scx = dlgScaleExpr, du = dlgDU, srep = dlgSrep, lb = dlgLabel;
      crv.forEach((c) => list.push({ t: 'RAD', refs: [c], v: allC ? val0 / 2 : val0, ...(lb ? { lbl: lb } : {}), ...(dlgExpr ? { expr: dlgExpr } : {}), ...(sc ? { scale: sc, ...(scx ? { scaleExpr: scx } : {}), ...(srep ? { srep: true } : {}) } : {}), ...(du ? { du } : {}), ...(dlgRef ? { ref: true } : {}), ...newFs() }));
      break;
    }
    default: return;
  }
  commitCons(list, pre);
}

// Arranque de la tangencia recta-spline: si la recta tiene un extremo fijo, busca la tangente exacta desde
// ese extremo y gira el otro hasta ella, para que el solver parta cerca de la solucion (Newton).
function seedTangent(lnId, spId, tp, poly) {
  if (!lnId) return;
  const l = doc.lines[lnId], A = doc.pts[l.a], B = doc.pts[l.b];
  if (!!A.fixed === !!B.fixed) return;
  const piv = A.fixed ? A : B, fr = A.fixed ? B : A;
  const len = dist(piv, fr) || 1;
  const g = (i) => { const a = poly[i], b = poly[i + 1], L = dist(a, b) || 1; return ((b.x - a.x) * (a.y - piv.y) - (b.y - a.y) * (a.x - piv.x)) / L; };
  let best = null;
  for (let i = 0; i < poly.length - 2; i++) {
    const g0 = g(i), g1 = g(i + 1);
    if (g0 * g1 > 0 || g0 === g1) continue;
    const u = g0 / (g0 - g1), q = { x: poly[i + 1].x * u + poly[i].x * (1 - u), y: poly[i + 1].y * u + poly[i].y * (1 - u) };
    const ang = Math.abs(signedAngle({ x: fr.x - piv.x, y: fr.y - piv.y }, { x: q.x - piv.x, y: q.y - piv.y }));
    if (!best || ang < best.ang) best = { q, ang };
  }
  if (!best) return;
  const d = dist(piv, best.q) || 1;
  doc.pts[tp].x = best.q.x; doc.pts[tp].y = best.q.y;
  fr.x = piv.x + ((best.q.x - piv.x) / d) * len; fr.y = piv.y + ((best.q.y - piv.y) / d) * len;
}

const SPLIT_LOST = { EQL: 'igual longitud', ANG: 'ángulo', COL: 'colineal', DISTPL: 'distancia a recta' };
// Divide el elemento seleccionado en n partes iguales: crea los n-1 puntos de division (n en un circulo) y
// parte en ellos. En lineas las partes quedan con restriccion de igual longitud (oculta).
async function splitEqual(el) {
  const n = Math.round(await askNumber('Número de partes iguales', 2, false, 'int'));
  if (!(n >= 2) || n > 500) { if (n) toast('Escribe un entero entre 2 y 500'); return; }
  const P = [];
  if (el.k === 'ln') {
    const l = doc.lines[el.id], A = doc.pts[l.a], B = doc.pts[l.b];
    for (let i = 1; i < n; i++) P.push({ x: A.x + ((B.x - A.x) * i) / n, y: A.y + ((B.y - A.y) * i) / n });
  } else if (el.k === 'ar') {
    const ar = doc.arcs[el.id], c = doc.pts[ar.c], g = arcOf(doc, ar);
    for (let i = 1; i < n; i++) { const a = g.a0 + (g.sweep * i) / n; P.push({ x: c.x + ar.r * Math.cos(a), y: c.y + ar.r * Math.sin(a) }); }
  } else {
    const ci = doc.circles[el.id], c = doc.pts[ci.c];
    for (let i = 0; i < n; i++) { const a = (TAU * i) / n; P.push({ x: c.x + ci.r * Math.cos(a), y: c.y + ci.r * Math.sin(a) }); }
  }
  pushUndo();
  const ids = P.map((q) => addPoint(doc, q.x, q.y, true));
  // una sola operacion: los tramos iguales quedan en la misma «División» que el corte
  const res = withOp(doc, 'DIV', () => {
    const r0 = splitElement(doc, el.id, ids);
    if (r0.ok && el.k === 'ln') for (let i = 1; i < r0.pieces.length; i++) addCon(doc, { t: 'EQL', refs: [r0.pieces[i - 1], r0.pieces[i]], hidden: true });
    return r0;
  });
  if (!res.ok) { rollback(); toast(res.msg); afterChange(); return; }
  const r = solve(doc, []);
  if (!r.ok) { rollback(); toast('No se pudo dividir: conflicto con las restricciones'); afterChange(); return; }
  sel = res.pieces.map((id) => ({ k: el.k === 'ln' ? 'ln' : 'ar', id }));
  toast(`Dividido en ${res.pieces.length} partes iguales` + (el.k === 'ln' ? '' : ' (las restricciones de igual ángulo entre arcos no existen: si mueves el centro o los extremos, las partes ya no serán iguales)'));
  afterChange();
}

function splitSelected() {
  const els = sel.filter((x) => x.k === 'ln' || x.k === 'ci' || x.k === 'ar');
  const pts = sel.filter((x) => x.k === 'pt').map((x) => x.id);
  if (els.length !== 1) { toast('Selecciona 1 segmento, arco o círculo (y, si quieres, los puntos que lo dividen)'); return; }
  if (!pts.length) { splitEqual(els[0]); return; }
  pushUndo();
  const res = splitElement(doc, els[0].id, pts);
  if (!res.ok) { rollback(); toast(res.msg); afterChange(); return; }
  const r = solve(doc, []);
  if (!r.ok) { rollback(); toast('No se pudo dividir: conflicto con las restricciones'); afterChange(); return; }
  sel = res.pieces.map((id) => ({ k: els[0].k === 'ln' ? 'ln' : 'ar', id }));
  const lost = [...new Set(res.dropped)].map((t) => SPLIT_LOST[t] || t);
  toast(`Dividido en ${res.pieces.length}` + (lost.length ? `. No se pudo heredar: ${lost.join(', ')}` : ''));
  afterChange();
}

// Línea indicativa: la punta en el punto, la etiqueta arrastrable (sigue a la geometría); estilo y letra del menú de estilo
// Línea indicativa: en un extremo, el elemento mismo es el cuerpo; en el centro o un punto intermedio, una recta propia.
// La etiqueta es un texto en unidades del dibujo (altura y punto de inserción como los textos); con cuerpo va en un extremo,
// el medio o un punto del spline. Al crearla y con doble toque se abre su ventana.
async function addLeader(pt, el) {
  const k = { t: 'LEAD', refs: [pt, el], h: cur.tx.h ?? niceHeight(), ...(cur.tx.font ? { font: cur.tx.font } : {}) }; // la altura y la fuente de los textos nuevos
  if (endOfElement(doc, pt, el)) k.on = 1;
  else { const st = style(); Object.assign(k, { color: st.color ?? 'auto', ltype: st.ltype || 'continua', w: st.w ?? 2, ...(st.ls && st.ls !== 1 ? { ls: st.ls } : {}) }); }
  const r = await askLeader(k, true);
  if (!r) return;
  pushUndo();
  const id = addCon(doc, Object.assign(k, r));
  sel = [{ k: 'co', id }]; afterChange();
}
async function editLeader(id) {
  const k = doc.cons[id]; if (!k) return;
  const r = await askLeader(k, false);
  if (!r) return;
  pushUndo();
  for (const [f, v] of Object.entries(r)) if (v === undefined) delete k[f]; else k[f] = v;
  afterChange();
}
// Ventana de la línea indicativa: etiqueta, dónde va (con cuerpo), punto de inserción y altura. Devuelve los campos o null.
function askLeader(k, isNew) {
  return new Promise((resolve) => {
    const dlg = $('dlgLead'), inp = $('leadText'), posSel = $('leadAt'), hIn = $('leadH'), box = $('leadAnchor');
    $('dlgLeadTitle').textContent = isNew ? 'Nueva línea indicativa' : 'Línea indicativa';
    inp.value = k.lbl || '';
    $('leadAtRow').style.display = k.on ? 'flex' : 'none';
    posSel.textContent = '';
    if (k.on) for (const x of leadSpots(doc, k)) { const op = document.createElement('option'); op.value = x.key; op.textContent = x.name[0].toUpperCase() + x.name.slice(1); posSel.appendChild(op); }
    posSel.value = k.at ?? leadAtDefault(doc, k);
    const inPt = !!globalDoc().page, h0 = k.h || cur.tx.h || niceHeight(); // con hoja, en puntos, como los textos
    $('leadHLabel').textContent = inPt ? 'Altura (pt)' : 'Altura';
    hIn.value = String(inPt ? ptOf(h0) : Math.round(h0 * 1000) / 1000);
    const fSel = $('leadFont'); if (!fSel.options.length) for (const [fk, fn] of FONTS) { const op = document.createElement('option'); op.value = fk; op.textContent = fn; op.style.fontFamily = fontCss(fk); fSel.appendChild(op); }
    fSel.value = k.font || '';
    let anchor = k.anchor || leadAnchorDefault(doc, k);
    const paint = () => {
      box.textContent = '';
      for (const a of ANCHORS) {
        const b = document.createElement('button');
        b.type = 'button'; b.title = 'Punto de inserción: ' + ANCHOR_NAMES[a]; b.setAttribute('aria-label', b.title); b.setAttribute('aria-pressed', String(a === anchor));
        const x = { l: 5, c: 12, r: 19 }[a[1]], y = { t: 5, m: 12, b: 19 }[a[0]];
        b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="5" y="5" width="14" height="14" rx="1" opacity=".55"/><circle cx="${x}" cy="${y}" r="3" fill="currentColor"/></svg>`;
        b.onclick = () => { anchor = a; paint(); };
        box.appendChild(b);
      }
    };
    paint();
    let done = false;
    const finish = (v) => { if (done) return; done = true; dlg.close(); resolve(v); };
    $('leadOk').onclick = (ev) => {
      ev.preventDefault();
      const hv = Number(String(hIn.value).replace(',', '.'));
      if (!(hv > 0)) { toast('La altura debe ser un número mayor que cero'); return; }
      const h = inPt ? hv * PT : hv;
      finish({ lbl: leadLabel(inp.value) ?? undefined, h, font: fSel.value || undefined, anchor, ...(k.on ? { at: posSel.value } : {}) });
    };
    $('leadCancel').onclick = () => finish(null);
    dlg.oncancel = () => finish(null);
    dlg.showModal(); inp.focus();
  });
}

// Tamaño de letra de una cota nueva: el del menú de estilo (12 px no se guarda)
const newFs = () => (!doc.dimText && cur.dimFs && cur.dimFs !== DIM_FS ? { fs: cur.dimFs } : {}); // con la letra de los textos, la nueva toma la del documento
// Letra de las cotas como la de los textos (doc.dimText): se muestra en pt con página y en unidades del dibujo sin ella; sin el ajuste, en px
const dimFsUnit = () => (doc.dimText ? (globalDoc().page ? 'pt' : '') : 'px');
const dimFsShow = (k) => (!doc.dimText ? (k?.fs || DIM_FS) : globalDoc().page ? ptOf(dimH(doc, k)) : Math.round(dimH(doc, k) * 1000) / 1000);
const dimFsRead = (v) => (globalDoc().page ? v * PT : v); // de lo que se escribe (pt o unidades) a unidades del dibujo
const dimFsLabel = (base) => base + (dimFsUnit() ? ` (${dimFsUnit()})` : '');

function commitCons(list, pre) {
  pushUndo();
  if (pre) pre();
  const r = addConsSolved(doc, list);
  if (!r.ok) { rollback(); toast('No se pudo: entra en conflicto con otras restricciones. Si solo quieres medir, usa «Solo lectura»'); afterChange(); return; }
  if (hasReactive(doc)) { const st = settle(doc, solve, []); if (!st.ok) { rollback(); toast(st.error || 'No se pudo: entra en conflicto con otras restricciones'); afterChange(); return; } }
  afterChange();
}

async function editDimension(id) {
  const k = doc.cons[id];
  if (!k || k.v === undefined) return;
  if (k.t === 'ANG4') { toast('Esta cota es de una matriz circular: para cambiarla, rehaz la matriz'); return; }
  const isC = k.t === 'RAD' && k.refs[0] in doc.circles;
  if (k.t === 'ANG' && k.cur === undefined) initAngle(doc, k); // dibujo viejo: pasa a angulo continuo con el mismo valor
  const now = dimValue(doc, k); // las de referencia muestran el valor medido en este momento
  const shown = isC ? 2 * now : now;
  // si la cota se definio con una formula, se vuelve a mostrar la formula (siempre que siga dando el valor actual)
  const u0 = k.t === 'ANG' && (k.unit === 'rad' || (!k.expr && !k.unit && false)) ? 'rad' : 'deg';
  const sc0 = dimScale(k); // cota a escala: se muestra «valor[*k]»
  const lu = k.t !== 'ANG' ? dimUnit(k.du) : null; // cota con unidad: el valor se muestra en ella («126'in»)
  let initial = u0 === 'rad' ? Math.round(((shown * Math.PI) / 180) * 1e10) / 1e10 : Math.round((shown / sc0 / (lu?.g ?? 1)) * 1000) / 1000;
  if (lu && !k.ref) initial = `${initial}'${k.du}`;
  if (k.expr && !k.ref) { try { const ev = k.t === 'ANG' ? parseValue(k.expr, { angle: true, radians: u0 === 'rad', vars: varsOf(doc, id) }) : dimEval(k.expr, varsOf(doc, id)).v; if (Math.abs(ev * sc0 - shown) <= 1e-6 * Math.max(1, Math.abs(shown))) initial = k.expr; } catch { /* formula invalida: valor */ } }
  if (sc0 !== 1 && !k.ref) initial = `${initial}[*${k.scaleExpr ?? sc0}]`;
  if (k.lbl) initial = `${initial}[${k.lbl}]`; // su etiqueta libre, al final
  dlgFsAsk = dimFsShow(k);
  dlgCtx = { vars: varsOf(doc, id), list: varsList(doc, id), except: id, ...(k.name ? { name: k.name, check: (n) => checkName(doc, n, id) } : {}) };
  const val0 = await askNumber((k.name ? k.name + ' · ' : '') + (k.t === 'ANG' ? 'Ángulo (°)' : k.t === 'RAD' ? (isC ? `Diámetro (${DIAM})` : 'Radio (R)') : 'Distancia'), initial, !!k.ref, k.t === 'ANG' ? 'angle' : 'len', u0, k.t !== 'ANG' ? { scale0: k.scale > 0 && k.scale !== 1 ? (k.scaleExpr ?? String(k.scale)) : '', measured: shown, du0: lu ? k.du : '' } : false);
  if (val0 === null || (!dlgRef && k.t !== 'ANG' && val0 <= 0)) return;
  pushUndo();
  if (dlgName && dlgName !== k.name) renameDim(doc, id, dlgName);
  if (dlgLabel) k.lbl = dlgLabel; else delete k.lbl;
  if (dlgFs && doc.dimText) { const th = dimFsRead(dlgFs); if (Math.abs(th - dimH(doc, {})) > 1e-9) k.th = th; else delete k.th; } // igual a la del documento: la sigue
  else if (dlgFs && dlgFs !== DIM_FS) k.fs = dlgFs; else if (dlgFs) delete k.fs;
  if (k.t === 'ANG') { if (dlgUnit === 'rad') k.unit = 'rad'; else delete k.unit; opts.angUnit = dlgUnit; persist(); }
  else if (dlgDU) k.du = dlgDU; else delete k.du;
  if (dlgRef) { // es (o pasa a ser) cota de referencia: no toca el solver; su escala si cuenta (la cota dice medida ÷ escala)
    k.ref = true;
    if (k.t !== 'ANG' && dlgScale) { k.scale = dlgScale; if (dlgScaleExpr) k.scaleExpr = dlgScaleExpr; else delete k.scaleExpr; } else { delete k.scale; delete k.scaleExpr; }
    if (k.scale && dlgSrep) k.srep = true; else delete k.srep;
    delete k.serr; delete k.expr;
    afterChange(); return;
  }
  const val = isC ? val0 / 2 : k.t === 'ANG' ? angTrue(doc, { ...k, ref: false, v: k.ref ? (angSector(doc, k).A * 180) / Math.PI : k.v }, val0) : val0;
  k.v = val; delete k.ref;
  if (k.t === 'ANG') k.cur = val0;
  if (dlgExpr) k.expr = dlgExpr; else delete k.expr;
  if (dlgScale && k.t !== 'ANG') { k.scale = dlgScale; if (dlgScaleExpr) k.scaleExpr = dlgScaleExpr; else delete k.scaleExpr; } else { delete k.scale; delete k.scaleExpr; }
  if (k.scale && dlgSrep) k.srep = true; else delete k.srep;
  const r = settle(doc, solve, []); // las cotas definidas con formulas se actualizan con el nuevo valor (y se repite si leen medidas)
  if (!r.ok) { rollback(); toast(r.error || (r.count ? 'Imposible con las restricciones actuales (con las cotas que dependen de esta). Usa «Solo lectura» para solo medirla' : 'Valor imposible con las restricciones actuales. Usa «Solo lectura» para solo medirla')); }
  afterChange();
}

// ---------------------------------------------------------------- estilo, tipos de linea, rellenos
function applyStyle(prop, value) {
  cur[prop] = value;
  let touched = false;
  if (sel.length) pushUndo();
  for (const s of sel) {
    const o = s.k === 'ln' ? doc.lines[s.id] : s.k === 'ci' ? doc.circles[s.id] : s.k === 'ar' ? doc.arcs[s.id] : s.k === 'sp' ? doc.splines[s.id] : s.k === 'el' ? doc.ellipses[s.id] : (s.k === 'ha' || s.k === 'tx') && prop === 'color' ? (s.k === 'ha' ? doc.hatches[s.id] : doc.texts[s.id]) : null;
    if (o) { o[prop] = value; touched = true; if (prop === 'ltype' && value === 'constructiva') { o.color = CLINE_STYLE.color; o.w = CLINE_STYLE.w; } } // convertir a constructiva toma su color y grosor
    else if (s.k === 'co' && doc.cons[s.id]?.t === 'LEAD' && ['color', 'ltype', 'w', 'ls'].includes(prop)) { (leadBody(doc, doc.cons[s.id]) || doc.cons[s.id])[prop] = value; touched = true; } // con cuerpo: el estilo es el del elemento // línea indicativa: color, tipo y grosor
    else if (prop === 'dimFs' && s.k === 'co' && doc.cons[s.id]?.v !== undefined) { const k = doc.cons[s.id]; if (doc.dimText) k.th = dimFsRead(value); else if (value !== DIM_FS) k.fs = value; else delete k.fs; touched = true; } // letra de una cota seleccionada
    else if (s.k === 'pt' && doc.traces[s.id]) { doc.traces[s.id][prop] = value; touched = true; } // el estilo de un punto con trazado es el de su trayectoria
  }
  if (sel.length && !touched) undoStack.pop();
  afterChange();
}

let panelColor = 'auto', panelPicker = null; // el color que muestra el panel de estilo (el de la seleccion o el de lo nuevo)
function buildSwatches() {
  const box = $('swatches');
  box.innerHTML = '';
  panelPicker = colorPicker({ value: () => panelColor, pick: (v) => applyStyle('color', v) });
  box.appendChild(panelPicker);
}

function fillLtypes(cl = cur.ltype) {
  const s = $('ltype');
  const lt = allLtypes(doc);
  s.innerHTML = '';
  for (const [k, v] of Object.entries(lt)) { const o = document.createElement('option'); o.value = k; o.textContent = v.label; s.appendChild(o); }
  s.value = cl in lt ? cl : 'continua';
}

function drawSample(canvas, pattern, color) {
  const w = canvas.clientWidth || 200, h = 24;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const c = canvas.getContext('2d');
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.strokeStyle = color; c.lineWidth = 2 * dpr;
  c.setLineDash(dashFromPattern(pattern, 0.6).map((x) => Math.max(x, 0.01) * 3 * opts.ltScale * dpr));
  c.beginPath(); c.moveTo(6 * dpr, 12 * dpr); c.lineTo((w - 6) * dpr, 12 * dpr); c.stroke();
}

function syncPanel() {
  $('cfgCc').value = ccMode();
  $('cfgLang').value = getLang(); $('cfgDec').value = doc.decimal === ',' || doc.decimal === '.' ? doc.decimal : ''; // sin elegir: dibujos anteriores
  $('docAngles').value = doc.angles === 'rad' ? 'rad' : 'deg';
  $('docUnits').value = doc.units === 'US' ? 'US' : 'SI';
  $('docSci').value = String(doc.sciAt ?? SCI_DEFAULT);
  renderLibCfg();
  $('docDimText').checked = !!doc.dimText;
  $('docTol').value = String(Number(doc.approxTol) > 0 ? Number(doc.approxTol) : APPROX_TOL);
  const pg = doc.page;
  $('docPage').value = !pg ? 'none' : pageKind(pg) || 'custom';
  $('docPageW').value = pg ? +pg.w.toFixed(1) : ''; $('docPageH').value = pg ? +pageH(pg).toFixed(1) : ''; $('docMargin').value = pg ? pg.m : '';
  $('docPageW').disabled = $('docPageH').disabled = $('docMargin').disabled = !pg;
  const first = sel.map((s) => (s.k === 'ln' ? doc.lines[s.id] : s.k === 'ci' ? doc.circles[s.id] : s.k === 'ar' ? doc.arcs[s.id] : s.k === 'sp' ? doc.splines[s.id] : s.k === 'el' ? doc.ellipses[s.id] : null)).find(Boolean);
  const hat = sel.map((s) => (s.k === 'ha' ? doc.hatches[s.id] : null)).find(Boolean);
  const txt = sel.map((s) => (s.k === 'tx' ? doc.texts[s.id] : null)).find(Boolean);
  // una linea constructiva se muestra en el panel sin cambiar el estilo de lo que se dibuje despues
  const csel = first && first.ltype === 'constructiva' ? { color: first.color, ltype: first.ltype, w: first.w, ls: first.ls ?? 1 } : null;
  if (first && !csel) { cur.color = first.color; cur.ltype = first.ltype; cur.w = first.w; cur.ls = first.ls ?? 1; }
  else if (hat) cur.color = hat.color;
  else if (txt) cur.color = txt.color;
  else if (sel.some((s) => s.k === 'co' && doc.cons[s.id]?.t === 'LEAD')) { const ld0 = doc.cons[sel.find((s) => s.k === 'co' && doc.cons[s.id]?.t === 'LEAD').id], ld = leadBody(doc, ld0) || ld0; cur.color = ld.color ?? cur.color; cur.ltype = ld.ltype ?? cur.ltype; cur.w = ld.w ?? cur.w; cur.ls = ld.ls ?? 1; } // línea indicativa: su estilo
  else if (sel.some((s) => s.k === 'pt' && doc.traces[s.id])) { const tr = doc.traces[sel.find((s) => s.k === 'pt' && doc.traces[s.id]).id]; cur.color = tr.color; cur.ltype = tr.ltype; cur.w = tr.w; cur.ls = tr.ls ?? 1; }
  const sv = csel || cur;
  $('ltEl').value = String(sv.ls ?? 1);
  fillLtypes(sv.ltype);
  $('weight').value = String(sv.w);
  { const dk = sel.map((s) => (s.k === 'co' ? doc.cons[s.id] : null)).find((k) => k && k.v !== undefined); $('dimFs').value = String(dk ? dimFsShow(dk) : doc.dimText ? dimFsShow(null) : cur.dimFs || DIM_FS); $('dimFsLabel').textContent = dimFsLabel('Letra de cotas'); } // la de la cota seleccionada o la de las nuevas
  panelColor = sv.color || 'auto';
  panelPicker?.refresh();
  if (hat) { $('hKind').value = hat.kind; $('hAngle').value = hat.angle; $('hSpace').value = hat.spacing; $('hAlpha').value = hat.alpha; }
  drawSample($('ltprev'), (allLtypes(doc)[sv.ltype] || allLtypes(doc).continua).pattern, theme.fg);
  const hasDimOrCon = sel.some((s) => s.k === 'co');
  $('del').title = hasDimOrCon ? 'Borrar cota o restricción (Supr)' : 'Borrar selección (Supr)';
}

function updateHatchFromPanel() {
  const hs = sel.filter((s) => s.k === 'ha');
  if (!hs.length) return;
  pushUndo();
  for (const s of hs) Object.assign(doc.hatches[s.id], { kind: $('hKind').value, angle: Number($('hAngle').value) || 0, spacing: Math.max(2, Number($('hSpace').value) || 8), alpha: Number($('hAlpha').value) });
  afterChange();
}

function createHatch() {
  const ids = sel.filter((s) => s.k === 'ln' || s.k === 'ci' || s.k === 'ar' || s.k === 'sp').map((s) => s.id);
  if (!ids.length) { toast('Selecciona las líneas, arcos o círculos que forman el contorno'); return; }
  const h = { ids, kind: $('hKind').value, angle: Number($('hAngle').value) || 0, spacing: Math.max(2, Number($('hSpace').value) || 8), alpha: Number($('hAlpha').value), color: cur.color, ...(doc.curLayer && doc.layers?.[doc.curLayer] ? { layer: doc.curLayer } : {}) };
  if (!hatchLoops(doc, h).length) { toast('El contorno debe ser cerrado (líneas y arcos encadenados) o un círculo'); return; }
  pushUndo();
  const id = 'h' + (++doc.n);
  doc.hatches[id] = h;
  sel = [{ k: 'ha', id }];
  afterChange();
}

// ---------------------------------------------------------------- estado / ayuda
const HINTS = {
  select: 'Toca para seleccionar (varios). Arrastra puntos, líneas o el borde de un círculo para moverlos (con varios seleccionados, arrastrar uno mueve todos); arrastra desde un lugar vacío para seleccionar con un cuadro.',
  point: 'Toca para colocar un punto (sobre una línea o círculo queda restringido a él).',
  line: 'Toca inicio y fin (encadena); o arrastra un segmento. Esc/Seleccionar termina.',
  circle: 'Toca el centro y luego un punto del borde.',
  mline: 'Línea de punto medio: toca el punto medio y luego un extremo (o arrastra); la línea crece igual hacia el otro lado. Hay bloqueo suave.',
  graph: 'Gráfica: toca donde va su esquina inferior izquierda. Escribe las relaciones como «variable1 vs variable2» (una por línea): t, actuadores (MR1, MR1.v), cotas, variables y vectores de rangos.',
  mr: 'Actuador rotacional (MR): toca la línea y su extremo que será el centro de giro (o selecciónalos antes); define su desplazamiento o velocidad angular respecto al tiempo (t).',
  ml: 'Actuador lineal (ML): toca el punto de la cola y el de la cabeza; define su desplazamiento o velocidad respecto al tiempo (t).',
  vector: 'Vector: como Línea, con cabeza de flecha en el punto final y su magnitud como texto en el punto medio. Con una línea (y uno de sus extremos, que será la cola) seleccionada, pulsar Vector la convierte en vector.',
  cline: 'Línea constructiva (gris, fina, con un punto en cada extremo): toca inicio y fin, o arrastra. No sale en el SVG de corte láser salvo que lo elijas.',
  circle3: 'Círculo perimetral: toca 3 puntos no colineales por donde pasa la circunferencia.',
  rect: 'Rectángulo: toca (o arrastra entre) dos esquinas opuestas de la diagonal.',
  rectc: 'Rectángulo de centro: toca el centro y luego una esquina (o arrastra del centro a la esquina).',
  polygon: 'Polígono: toca el centro y el radio (el ángulo del radio da la orientación; hay bloqueo suave); luego eliges el número de lados.',
  paste: 'Pegar: toca el punto donde va el centro del cuadro de lo copiado. Esc o Seleccionar termina.',
  dim: 'Acotar: toca 2 puntos (distancia), punto y línea (distancia), un punto y el elemento al que pertenece (línea indicativa con etiqueta), 2 líneas (paralelas: distancia; si no, ángulo), un arco (radio), un círculo (diámetro), o un arco/círculo y otro elemento (distancia al centro). Si ya había algo seleccionado, acota eso.',
  intersect: 'Toca dos elementos (línea, arco o círculo) para crear su punto de intersección.',
  text: 'Toca donde va el punto de insercion del texto (puede ser un punto existente).',
  spline: 'Spline por puntos: toca los puntos por donde pasa la curva. Tocar de nuevo el último (o Esc) termina; tocar el primero la cierra.',
  arcc: 'Arco por centro y extremos: toca el centro, el inicio y el fin. El sentido (horario o antihorario) sale de hacia dónde mueves el cursor o arrastras; con un toque directo, el arco corto.',
  arc3: 'Arco por 3 puntos: toca el inicio, un punto intermedio y el fin.',
  earc: 'Elipse parcial: toca el centro, el extremo del primer eje y un punto del segundo eje; después arrastra sobre la elipse punteada para marcar el tramo (o toca el inicio y luego el fin). El sentido es el de tu movimiento.',
  ellipse: 'Elipse: toca el centro; luego toca (o arrastra hasta) el extremo del primer eje y, por último, un punto del segundo eje. Se puede arrastrar desde el centro.',
  trim: 'Recortar: mantén presionado y arrastra sobre los tramos que quieres quitar (entre cruces con otros elementos). Un toque recorta un solo tramo.',
  extend: 'Extender: toca un segmento o arco cerca del extremo que quieres alargar hasta el primer elemento que encuentre.',
  fillet: 'Redondeo: toca el punto de una esquina (donde se juntan dos líneas) y teclea el radio. Con varias esquinas seleccionadas antes de elegir la herramienta, las redondea todas con el mismo radio. Con dos elementos seleccionados antes de elegir la herramienta, los redondea (o achaflana) conservando la parte central de cada uno. También redondea dos elementos que no se tocan en una esquina (segmentos, arcos o arcos elípticos): toca uno y luego el otro, del lado que quieres conservar. El radio queda como cota editable.',
  chamfer: 'Chaflán: toca el punto de una esquina (donde se juntan dos líneas) y teclea la distancia desde la esquina. Con varias esquinas seleccionadas antes de elegir la herramienta, las achaflana todas. También achaflana dos elementos que se cortan sin compartir esquina (segmentos, arcos o arcos elípticos): toca uno y luego el otro, del lado que quieres conservar, o selecciónalos antes de elegir la herramienta. Cada tramo queda como cota editable.',
};
function ltLabel(o) {
  const lt = allLtypes(doc)[o.ltype] || allLtypes(doc).continua;
  return `línea ${lt.label.toLowerCase()}${o.ls && o.ls !== 1 ? ' ×' + o.ls : ''}`;
}

function updateStatus(p) {
  let txt = (toolName === 'earc' && (pending?.g ? 'Elipse parcial: arrastra sobre la elipse punteada desde donde empieza el tramo hasta donde termina (o toca el inicio y luego el fin). Esc cancela.' : HINTS.earc)) || HINTS[tool];
  if (sel.length === 1) {
    const s = sel[0];
    if (s.k === 'pt') { const q = doc.pts[s.id]; txt = `Punto (${fmt(q.x)}, ${fmt(q.y)})${q.fixed ? ' fijo' : ''}${isMark(doc, s.id) ? ' · marca de referencia en ' + q.mark : ''}`; }
    else if (s.k === 'ln') { const [a, b] = lineEnds(s.id).map((i) => doc.pts[i]); txt = `${doc.lines[s.id].vec ? 'Vector' : 'Línea'}: ${doc.lines[s.id].vec ? 'magnitud' : 'longitud'} ${fmt(dist(a, b))}, ángulo ${fmt((Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI)}°, ${ltLabel(doc.lines[s.id])}`; }
    else if (s.k === 'ci') txt = `Círculo: radio ${fmt(doc.circles[s.id].r)}, ${ltLabel(doc.circles[s.id])}`;
    else if (s.k === 'tx') { const t = doc.texts[s.id]; txt = `Texto: “${t.text.split('\n')[0].slice(0, 24)}”, ${fmt(t.ang)}°, insercion ${t.anchor}${t.ref ? ', alineado con una línea' : ''}`; }
    else if (s.k === 'sp') { const sp = doc.splines[s.id]; txt = `Spline: ${sp.pts.length} puntos, ${sp.closed ? 'cerrada' : 'abierta'}, ${ltLabel(sp)}`; }
    else if (s.k === 'el') { const g = ellipseOf(doc, doc.ellipses[s.id]); txt = `${isPartial(doc.ellipses[s.id]) ? `Arco elíptico de ${fmt((ellipseRange(doc, doc.ellipses[s.id], g).sweep * 180) / Math.PI)}°` : 'Elipse'}: semiejes ${fmt(g.ra)} y ${fmt(g.rb)}, ${ltLabel(doc.ellipses[s.id])}`; }
    else if (s.k === 'ar') { const g = arcOf(doc, doc.arcs[s.id]); txt = `Arco: radio ${fmt(doc.arcs[s.id].r)}, ${fmt((g.sweep * 180) / Math.PI)}°, ${ltLabel(doc.arcs[s.id])}`; }
    else if (s.k === 'ha') txt = 'Relleno seleccionado';
    else if (s.k === 'co') txt = 'Restricción/cota seleccionada';
  } else if (sel.length > 1) txt = `${sel.length} elementos seleccionados`;
  const gn = selMulti && selMulti.owner === sel ? multiGraphs().size : 0;
  if (gn && (sel.length || gn > 1)) txt = `${sel.length + gn} elementos seleccionados (${gn} gráfica${gn === 1 ? '' : 's'})`;
  if (p && tool !== 'select') { const m = snapAt(p.x, p.y); txt += `   (${fmt(m.x)}, ${fmt(m.y)})${m.type !== 'free' ? ' ' + { pt: 'punto', ln: 'sobre línea', ci: 'sobre círculo' }[m.type] : ''}`; }
  $('status').textContent = txt;
}

// ---------------------------------------------------------------- archivo
// Pide el nombre del archivo (Safari guarda sin preguntar). Devuelve el nombre completo o null si se cancela.
// El nombre base se recuerda para la siguiente exportacion; suffix distingue variantes (p. ej. "-laser").
function askFileName(ext, suffix = '') {
  return new Promise((resolve) => {
    const dlg = $('dlgN'), inp = $('nameInput');
    $('nameExt').textContent = '.' + ext;
    inp.value = (opts.fileBase || 'dibujo') + suffix;
    let done = false;
    const finish = (full, base) => { if (done) return; done = true; dlg.close(); if (base) { opts.fileBase = suffix && base.endsWith(suffix) ? base.slice(0, -suffix.length) || base : base; persist(); } resolve(full); };
    $('nameOk').onclick = (ev) => {
      ev.preventDefault();
      const base = cleanFileBase(inp.value, ext);
      if (!base) { toast('Escribe un nombre'); return; }
      finish(base + '.' + ext, base);
    };
    $('nameCancel').onclick = () => finish(null);
    dlg.oncancel = () => finish(null);
    dlg.showModal(); inp.focus(); inp.select();
  });
}
async function saveFile(ext, suffix, makeBlob) {
  const name = await askFileName(ext, suffix);
  if (!name) return;
  const bl = makeBlob();
  if (bl) download(name, bl);
}

function download(name, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function contentBounds(withGraphs = false) {
  const gr = withGraphs ? Object.values(globalDoc().graphs || {}) : [];
  const doc = visibleDoc(globalDoc());
  const xs = [], ys = [];
  for (const g of [...gr, ...Object.values(globalDoc().images || {}).filter((im) => !isHidden(globalDoc(), im))]) { xs.push(g.x, g.x + g.w); ys.push(g.y, g.y + g.h); }
  for (const p of Object.values(doc.pts)) { xs.push(p.x); ys.push(p.y); }
  for (const c of Object.values(doc.circles)) { const p = doc.pts[c.c]; xs.push(p.x - c.r, p.x + c.r); ys.push(p.y - c.r, p.y + c.r); }
  for (const a of Object.values(doc.arcs)) { const p = doc.pts[a.c]; xs.push(p.x - a.r, p.x + a.r); ys.push(p.y - a.r, p.y + a.r); }
  for (const sp of Object.values(doc.splines)) for (const q of splinePolyline(doc, sp, 8)) { xs.push(q.x); ys.push(q.y); }
  for (const e of Object.values(doc.ellipses)) for (const q of ellipsePolyline(doc, e, 48)) { xs.push(q.x); ys.push(q.y); }
  for (const tr of Object.values(doc.traces)) for (const q of tr.pts) { xs.push(q.x); ys.push(q.y); }
  if (!xs.length) return null;
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}
// y mas alta y mas baja de lo dibujado, contando los textos (-Infinity/Infinity si no hay nada)
function contentYs() {
  const b = contentBounds(true), vd = visibleDoc(globalDoc());
  let top = b ? b.y1 : -Infinity, bot = b ? b.y0 : Infinity;
  for (const t of Object.values(vd.texts || {})) if (vd.pts[t.pt]) for (const q of textCorners(vd, t, measureRel)) { top = Math.max(top, q.y); bot = Math.min(bot, q.y); }
  return { top, bot };
}
const contentTop = () => contentYs().top;

// ---- barra de desplazamiento vertical (solo con pagina): recorre desde el borde superior de la primera hoja hasta el
// final de la ultima hoja con contenido. Arrastrar la barra mueve la vista; tocar el canal salta una pantalla.
// Lo que ocupa el dibujo se recalcula solo cuando cambia (afterChange o cambio de dibujo), no en cada cuadro.
function pageRange(pg) {
  if (!pageExt || pageExtDoc !== globalDoc()) { pageExt = contentYs(); pageExtDoc = globalDoc(); }
  const top = pageTop(pg), ph = pageH(pg);
  const n = Math.max(1, isFinite(pageExt.bot) ? Math.ceil((top - pageExt.bot) / ph - 1e-9) : 1);
  return { top: Math.max(top, pageExt.top) + PAGE_PAD / view.s, bot: top - n * ph - PAGE_PAD / view.s };
}
const sbar = $('pgScroll'), sthumb = $('pgThumb');
function syncScrollbar() {
  const sbar = $('pgScroll'), sthumb = $('pgThumb'); // tambien sirve si se dibuja antes de que el modulo termine de cargar
  const pg = globalDoc().page;
  sbar.hidden = !pg;
  if (!pg) return;
  const H = cv.getBoundingClientRect().height, vTop = view.oy / view.s, vBot = (view.oy - H) / view.s;
  const r = pageRange(pg), top = Math.max(r.top, vTop), bot = Math.min(r.bot, vBot), tot = top - bot;
  const th = sbar.clientHeight, len = Math.max(28, (th * (vTop - vBot)) / tot);
  const at = ((top - vTop) / Math.max(tot - (vTop - vBot), 1e-9)) * (th - len);
  sthumb.style.height = len + 'px'; sthumb.style.transform = `translateY(${Math.max(0, Math.min(th - len, at || 0))}px)`;
  sbar.dataset.top = top; sbar.dataset.bot = bot;
}
let sdrag = null;
sthumb.addEventListener('pointerdown', (e) => {
  e.preventDefault(); e.stopPropagation(); sthumb.setPointerCapture(e.pointerId);
  const vis = cv.getBoundingClientRect().height / view.s; // lo que se ve, en mm: la barra recorre el total menos esto
  sdrag = { y: e.clientY, oy: view.oy, k: (+sbar.dataset.top - +sbar.dataset.bot - vis) / Math.max(sbar.clientHeight - sthumb.offsetHeight, 1) };
  sbar.classList.add('drag');
});
sthumb.addEventListener('pointermove', (e) => {
  if (!sdrag) return;
  const r = pageRange(globalDoc().page), H = cv.getBoundingClientRect().height;
  // y del modelo en el borde superior de la pantalla, sin pasarse de los extremos del recorrido
  const yv = Math.min(r.top, Math.max(r.bot + H / view.s, sdrag.oy / view.s - (e.clientY - sdrag.y) * sdrag.k));
  view.oy = yv * view.s; draw(); persist();
});
const sEnd = () => { sdrag = null; sbar.classList.remove('drag'); };
sthumb.addEventListener('pointerup', sEnd); sthumb.addEventListener('pointercancel', sEnd);
sbar.addEventListener('pointerdown', (e) => {
  if (e.target !== sbar) return;
  e.preventDefault();
  const H = cv.getBoundingClientRect().height, tr = sthumb.getBoundingClientRect(), r = pageRange(globalDoc().page);
  const step = (H - 40) / view.s * (e.clientY < tr.top ? 1 : -1);
  const yv = Math.min(r.top, Math.max(r.bot + H / view.s, view.oy / view.s + step));
  view.oy = yv * view.s; draw(); persist();
});
function fitView() {
  const b = contentBounds(true);
  const r = cv.getBoundingClientRect();
  const pg = globalDoc().page;
  if (pg) { // con pagina: su ancho llena la pantalla y se ve desde el borde superior de la primera hoja (o desde lo que sobresalga)
    const x0 = pg.x0 || 0, s = Math.min((r.width - 24) / pg.w, 400);
    const top = Math.max(pageTop(pg), contentTop());
    view = { s, ox: r.width / 2 - (x0 + pg.w / 2) * s, oy: PAGE_PAD + top * s };
    draw(); persist(); return;
  }
  if (!b) { view = { ox: r.width / 2, oy: r.height / 2, s: 5 }; draw(); return; }
  const w = Math.max(b.x1 - b.x0, 1e-6), h = Math.max(b.y1 - b.y0, 1e-6);
  const s = Math.min((r.width - 80) / w, (r.height - 80) / h, 400);
  view = { s, ox: r.width / 2 - ((b.x0 + b.x1) / 2) * s, oy: r.height / 2 + ((b.y0 + b.y1) / 2) * s };
  draw(); persist();
}
function loadDoc(d) {
  if (!d || typeof d !== 'object' || !d.pts || !d.lines || !d.circles) throw new Error('Archivo no válido');
  if (txState) endTextLive(); // una edicion abierta no pasa al dibujo nuevo
  doc = { n: 0, cons: {}, hatches: {}, ltypes: {}, arcs: {}, ellipses: {}, texts: {}, splines: {}, traces: {}, cn: {}, layers: {}, curLayer: null, ...d };
  ensureNumbers(doc); ensureMarkRefs(doc);
  const nMig = migrateCalcDoc(doc); // dibujos anteriores a la v2: «x{=v}» -> «$x:v$», «[=e]» -> «$e=$»
  if (nMig) setTimeout(() => toast(`Sintaxis de cálculo actualizada en ${nMig} texto${nMig > 1 ? 's' : ''}: x:valor asigna, expr= muestra el valor`), 1200);
  if (!(doc.tEnd > 0)) { const m = Math.max(0, ...Object.values(doc.graphs || {}).map((g) => Number(g.t1) || 0)); if (m > 0) doc.tEnd = m; } // dibujos anteriores: el tiempo final de sus graficas
  for (const g of Object.values(doc.graphs || {})) delete g.t1; // una grafica ya no tiene tiempo final propio: lo define el reproductor
  undoStack = []; redoStack = []; sel = []; pending = null;
  setAngleMode(doc);
  fillDimUnits(doc); // cotas guardadas como «2'cm»: la etiqueta dice «2 cm»
  ensureImagePoints(doc); syncImages(doc); // imagenes de dibujos anteriores: su punto de insercion
  setTimeout(() => { checkLibUpdates(); }, 2000); // bibliotecas insertadas: ¿hay una version nueva en GitHub?
}
async function exportPNG() {
  await imagesReady();
  const b = contentBounds();
  if (!b) { toast('No hay nada que exportar'); return; }
  const pad = 20, k = 6;
  let W = Math.ceil((b.x1 - b.x0) * k + pad * 2), H = Math.ceil((b.y1 - b.y0) * k + pad * 2);
  let v = { s: k, ox: pad - b.x0 * k, oy: H - pad + b.y0 * k };
  // el lienzo crece para que quepan cotas y textos
  const ex = extraExtents(doc, v, { dims: opts.dims, texts: opts.texts }), m = 8;
  if (ex) {
    const sx = Math.max(0, m - ex.minX), sy = Math.max(0, m - ex.minY);
    W = Math.ceil(Math.max(W, ex.maxX + m) + sx); H = Math.ceil(Math.max(H, ex.maxY + m) + sy);
    v = { s: k, ox: v.ox + sx, oy: v.oy + sy };
  }
  const fname = await askFileName('png');
  if (!fname) return;
  const off = document.createElement('canvas');
  off.width = Math.min(W * 2, 8000); off.height = Math.min(H * 2, 8000);
  const sc = off.width / W;
  const oc = off.getContext('2d');
  const saveDpr = dpr, saveHits = labelHits, saveSel = sel;
  dpr = sc; sel = [];
  render(oc, off.width, off.height, v, { fg: '#000', bg: '#fff', grid: false, cons: false, dims: opts.dims, texts: opts.texts, ui: false });
  dpr = saveDpr; labelHits = saveHits; sel = saveSel;
  off.toBlob((bl) => download(fname, bl), 'image/png');
}

// ---------------------------------------------------------------- cableado de la interfaz
function setTool(t) {
  if (txState && (t !== 'text' || txState.edit)) { if (txLive.value.trim()) commitTextLive(); endTextLive(); } // lo escrito se dibuja al cambiar de herramienta
  if (pending) { if (tool === 'spline' && pending.ids?.length >= 2) finishSpline(false); else { pending = null; cleanup(doc); } }
  toolName = t; consMode = t in CONS_TOOLS; tool = BASE_TOOL[t] || t; if (t !== 'select') selGraph = null;
  document.querySelectorAll('[data-tool]').forEach((b) => b.classList.toggle('on', b.dataset.tool === t));
  closeFly(); syncGroups(t);
  if (t !== 'intersect') pending = null;
  if (t === 'fillet' || t === 'chamfer') { // con puntos ya seleccionados, se aplica a esas esquinas
    const pts = sel.filter((x) => x.k === 'pt' && doc.pts[x.id]).map((x) => x.id);
    const els = sel.filter((x) => ['ln', 'ar', 'el', 'ci'].includes(x.k));
    if (pts.length) cornerTool(pts);
    else if (els.length === 2 && els.length === sel.length) roundTool(els[0], els[1]); // dos elementos ya seleccionados
  }
  if (t === 'dim') startDimTool();
  if (t === 'ml') { // con dos puntos ya seleccionados (el primero es la cola), se crea el actuador entre ellos
    const pts = sel.filter((x) => x.k === 'pt' && doc.pts[x.id]);
    if (pts.length === 2 && pts.length === sel.length) { pushUndo(); const id = addLinear(doc, pts[0].id, pts[1].id); sel = []; afterChange(); editAct(id, true); return; }
    if (pts.length === 1 && sel.length === 1) { pushUndo(); pending = { act1: pts[0].id }; toast('Cola elegida: toca el punto de la cabeza del actuador'); }
  }
  if (t === 'mr') { // con una linea (y uno de sus extremos) ya seleccionados, se crea el actuador sobre ellos
    const lns = sel.filter((x) => x.k === 'ln' && doc.lines[x.id]), pts = sel.filter((x) => x.k === 'pt' && doc.pts[x.id]);
    if (lns.length === 1) {
      const l = doc.lines[lns[0].id], ends = pts.filter((x) => x.id === l.a || x.id === l.b);
      if (ends.length === 1 && pts.length === 1) { mrMake(lns[0].id, ends[0].id); return; }
      if (!pts.length) { pending = { mr: { line: lns[0].id } }; toast('Toca el extremo de la línea que será el centro de giro'); }
    } else if (lns.length === 0 && pts.length === 1) { pending = { mr: { pt: pts[0].id } }; toast('Toca la línea que girará'); }
  }
  updateStatus(); draw();
}
document.querySelectorAll('[data-tool]').forEach((b) => { b.onclick = () => setTool(b.dataset.tool); });

// ---- botones desplegables: cada grupo muestra la ultima herramienta usada; toca de nuevo (con el grupo activo),
// toca la esquina marcada o mantén presionado para ver las demás.
const GROUPS = {
  file: [['fNew', 'file-plus', 'Nuevo dibujo'], ['fSave', 'save', 'Guardar (.json)'], ['fLoad', 'folder-open', 'Abrir…'], ['ghSave', 'save', 'Guardar en GitHub…'], ['ghOpen', 'folder-open', 'Abrir de GitHub…'], ['ghCfg', 'props', 'Configurar GitHub…'], ['fImg', 'image', 'Insertar imagen…'], ['libIns', 'folder-open', 'Insertar biblioteca…'], ['dataMgr', 'folder-open', 'Datos (wfile, rfile)…'], ['fPng', 'image', 'Exportar PNG'], ['fSvg', 'svg', 'Exportar SVG'], ['fLaser', 'svg', 'SVG para corte láser…'], ['fDxf', 'dxf', 'Exportar DXF']],
  spl: [['spline', 'spline', 'Spline por puntos (S)'], ['trTrace', 'trace', 'Trazar punto (activar o quitar)'], ['trClear', 'trash', 'Borrar trayectoria'], ['mkReset', 'mark-reset', 'Reiniciar marcas'], ['trSpline', 'spline', 'Trazado a spline…'], ['spClose', 'spline-closed', 'Cerrar o abrir el spline'], ['spOffset', 'spline', 'Equidistante…']],
  sel: [['select', 'select', 'Seleccionar y arrastrar (V)'], ['filter', 'filter', 'Filtrar la selección…']],
  line: [['line', 'line', 'Línea (L)'], ['vector', 'vector', 'Vector: línea con flecha y magnitud (W). Con una línea seleccionada, la convierte en vector'], ['mline', 'mline', 'Línea de punto medio (M)'], ['cline', 'cline', 'Línea constructiva (K)']],
  circle: [['circle', 'circle', 'Círculo (C)'], ['circle3', 'circle3', 'Círculo perimetral (3 puntos)'], ['ccircle', 'ccircle', 'Círculo constructivo']],
  arc: [['arcc', 'arc-c', 'Arco por centro y extremos (R)'], ['arc3', 'arc-3', 'Arco por 3 puntos (A)'], ['carcc', 'carcc', 'Arco constructivo por centro y extremos'], ['carc3', 'carc3', 'Arco constructivo por 3 puntos']],
  ellipse: [['ellipse', 'ellipse', 'Elipse: centro y dos ejes (O)'], ['earc', 'earc', 'Elipse parcial (arco elíptico)']],
  rect: [['rect', 'rect', 'Rectángulo por diagonal (B)'], ['rectc', 'rect-c', 'Rectángulo de centro']],
  act: [['mr', 'act-r', 'Actuador rotacional (MR): toca la línea y su extremo que será el centro de giro (o selecciónalos antes)', 'Actuador MR'], ['ml', 'act-l', 'Actuador lineal (ML): toca el punto de la cola y el de la cabeza', 'Actuador ML'], ['graph', 'graph', 'Gráfica: toca donde va su esquina inferior izquierda; muestra «variable1 vs variable2»', 'Gráfica'], ['sim', 'play', 'Simulación: barra de tiempo para mover los actuadores', 'Simulación']],
  corner: [['fillet', 'fillet', 'Redondeo (F): toca una esquina, o dos elementos, y teclea el radio'], ['chamfer', 'chamfer', 'Chaflán: toca una esquina y teclea la distancia']],
  clip: [['copy', 'copy', 'Copiar la selección (Ctrl+C)'], ['paste', 'paste', 'Pegar: toca el punto donde va el centro de lo copiado (Ctrl+V)']],
};
// Cada elemento de un grupo es una herramienta, salvo Filtrar y Copiar, que son acciones.
// Archivo y Spline: sus acciones viven en botones ocultos (#acts) que conservan su logica y su estado habilitado.
const ACT_IDS = new Set(['ghSave', 'ghOpen', 'ghCfg', 'fNew', 'fSave', 'fLoad', 'fImg', 'libIns', 'dataMgr', 'fPng', 'fSvg', 'fLaser', 'fDxf', 'trTrace', 'trClear', 'mkReset', 'trSpline', 'spClose', 'spOffset']);
const MENU_ONLY = new Set(['file']); // el boton solo abre el desplegable (nunca ejecuta algo, p. ej. "Nuevo")
const isAct = (id) => id === 'filter' || id === 'sim' || ACT_IDS.has(id);
// Vector <-> linea con lo seleccionado: con una linea (y uno de sus extremos, la cola) seleccionada, «Vector» la convierte;
// con un vector seleccionado, «Línea» lo convierte en linea. Sin eso, el boton elige la herramienta.
function selectedLines(wantVec) { return sel.filter((x) => x.k === 'ln' && doc.lines[x.id] && !!doc.lines[x.id].vec === wantVec).map((x) => x.id); }
function convertToVector() {
  const ids = selectedLines(false);
  if (!ids.length) return false;
  const pts = sel.filter((x) => x.k === 'pt').map((x) => x.id);
  pushUndo();
  for (const id of ids) { const l = doc.lines[id]; makeVector(doc, id, { rev: pts.includes(l.b) && !pts.includes(l.a), h: niceHeight() }); }
  afterChange(); toast(ids.length === 1 ? 'Convertida en vector' : `${ids.length} líneas convertidas en vectores`);
  return true;
}
function convertToLine() {
  const ids = selectedLines(true);
  if (!ids.length) return false;
  pushUndo();
  for (const id of ids) unmakeVector(doc, id);
  afterChange(); toast(ids.length === 1 ? 'Convertido en línea' : `${ids.length} vectores convertidos en líneas`);
  return true;
}
// ---- actuadores (motores) y simulacion
const ACT_COLOR = TRACE_STYLE.color;
function drawActs(c, o) {
  actHits = [];
  for (const [id, a] of Object.entries(doc.acts || {})) {
    const label = actName(a);
    c.save(); c.fillStyle = ACT_COLOR; c.strokeStyle = ACT_COLOR; c.setLineDash([]); c.lineCap = 'round'; c.lineJoin = 'round';
    c.font = 'bold ' + 13 * dpr + 'px -apple-system, system-ui, sans-serif'; c.textBaseline = 'middle';
    if (a.kind === 'MR') {
      const C = doc.pts[a.c];
      if (C) {
        const s = toScreen(C), x = s.x * dpr, y = s.y * dpr, r = 20 * dpr, S0 = Math.PI / 4, e = a.cw ? S0 + 1.5 * Math.PI : S0 - 1.5 * Math.PI; // en pantalla el eje y baja: antihorario = angulo decreciente
        c.lineWidth = 2 * dpr; c.beginPath(); c.arc(x, y, r, S0, e, !a.cw); c.stroke();
        const ex = x + r * Math.cos(e), ey = y + r * Math.sin(e), k = a.cw ? 1 : -1, tx = -Math.sin(e) * k, ty = Math.cos(e) * k, B = 8 * dpr; // tangente en el extremo, en el sentido del giro
        c.beginPath(); c.moveTo(ex - tx * B - ty * B * 0.5, ey - ty * B + tx * B * 0.5); c.lineTo(ex, ey); c.lineTo(ex - tx * B + ty * B * 0.5, ey - ty * B - tx * B * 0.5); c.stroke();
        c.textAlign = 'left'; c.fillText(label, x + 24 * dpr, y - 20 * dpr);
        actHits.push({ id, x: s.x + 24 + 24, y: s.y - 20, r: 26 });
      }
    } else {
      const P = doc.pts[a.p1], Q = doc.pts[a.p2];
      if (P && Q) {
        const A = toScreen(P), B = toScreen(Q), L = Math.hypot(B.x - A.x, B.y - A.y);
        if (L > 1) {
          const ux = (B.x - A.x) / L, uy = (B.y - A.y) / L, h = Math.min(12, L * 0.4) * dpr;
          c.lineWidth = 2.5 * dpr; c.beginPath(); c.moveTo(A.x * dpr, A.y * dpr); c.lineTo(B.x * dpr, B.y * dpr); c.stroke();
          c.beginPath(); c.moveTo(B.x * dpr, B.y * dpr); c.lineTo(B.x * dpr - ux * h - uy * h * 0.4, B.y * dpr - uy * h + ux * h * 0.4); c.lineTo(B.x * dpr - ux * h + uy * h * 0.4, B.y * dpr - uy * h - ux * h * 0.4); c.closePath(); c.fill();
          let ang = Math.atan2(uy, ux); if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI; // legible, de izquierda a derecha
          const mx = ((A.x + B.x) / 2) * dpr, my = ((A.y + B.y) / 2) * dpr;
          c.translate(mx, my); c.rotate(ang); c.textAlign = 'center'; c.fillText(label, 0, -10 * dpr);
          actHits.push({ id, x: (A.x + B.x) / 2, y: (A.y + B.y) / 2, r: 20 });
        }
      }
    }
    c.restore();
  }
}
function actAt(sx, sy) {
  for (const h of actHits) if (!h.g && Math.hypot(h.x - sx, h.y - sy) <= h.r) return h.id;
  for (const h of actHits) if (h.g && sx >= h.x && sx <= h.x + h.w && sy >= h.y && sy <= h.y + h.h) return h.id;
  return null;
}
// ---- graficas
const fmtG = (v) => String(Math.round(v * 1000) / 1000);
// marcas de los ejes: notacion cientifica desde el umbral de Configuracion; en un eje logaritmico desde 1e4 (10000 y 100000 se pegaban)
const fmtT = (v, lg) => { const a = Math.abs(v); return a >= (lg ? Math.min(1e4, sciFrom()) : sciFrom()) || (a > 0 && a < 1e-3) ? v.toExponential(1).replace('.0e', 'e').replace('e+', 'e') : fmtG(v); };
// Grafica bajo un toque (la de encima si hay varias): { id, mode }. Con la grafica seleccionada, sus bordes y esquinas redimensionan; el resto la mueve.
function graphAt(sx, sy) {
  for (const h of actHits) if (!h.g && Math.hypot(h.x - sx, h.y - sy) <= h.r) return null; // un boton de actuador encima de la grafica
  for (let i = actHits.length - 1; i >= 0; i--) {
    const h = actHits[i];
    if (!h.g) continue;
    const m = selGraph === h.id ? 12 : 0;
    if (sx < h.x - m || sx > h.x + h.w + m || sy < h.y - m || sy > h.y + h.h + m) continue;
    if (selGraph === h.id) {
      const T = Math.min(14, Math.min(h.w, h.h) / 4), l = sx - h.x < T, r = h.x + h.w - sx < T, t = sy - h.y < T, b = h.y + h.h - sy < T;
      if (l || r || t || b) return { id: h.id, mode: { l, r, t, b } };
    }
    return { id: h.id, mode: { move: true } };
  }
  for (let i = imgHits.length - 1; i >= 0; i--) { // las imagenes, debajo de las graficas
    const h = imgHits[i], m = selGraph === h.id ? 12 : 0;
    if (sx < h.x - m || sx > h.x + h.w + m || sy < h.y - m || sy > h.y + h.h + m) continue;
    if (selGraph === h.id) {
      const T = Math.min(14, Math.min(h.w, h.h) / 4), l = sx - h.x < T, r = h.x + h.w - sx < T, t = sy - h.y < T, b = h.y + h.h - sy < T;
      if (l || r || t || b) return { id: h.id, mode: { l, r, t, b } };
    }
    return { id: h.id, mode: { move: true } };
  }
  return null;
}
// ---- imagenes: se cargan una vez por dato (imgCache) y se dibujan cuando estan listas
const imgCache = new Map();
let imgHits = [], imgLocked = [];
const lockedImgAt = (sx, sy) => { for (let i = imgLocked.length - 1; i >= 0; i--) { const h = imgLocked[i]; if (sx >= h.x && sx <= h.x + h.w && sy >= h.y && sy <= h.y + h.h) return h.id; } return null; };
function imgEl(src) {
  let el = imgCache.get(src);
  if (!el) { el = new Image(); el.onload = () => draw(); el.src = src; imgCache.set(src, el); }
  return el.complete && el.naturalWidth ? el : null;
}
// Espera a que esten cargadas todas las imagenes del dibujo (para exportar)
function imagesReady() {
  return Promise.all(Object.values(doc.images || {}).map((im) => { const src = imageSrc(doc, im); if (!src) return null; imgEl(src); const el = imgCache.get(src); return el.complete ? null : new Promise((r) => { el.addEventListener('load', r, { once: true }); el.addEventListener('error', r, { once: true }); }); }));
}
function drawImages(c, o) {
  imgHits = []; imgLocked = [];
  const gsel = multiGraphs();
  for (const [id, im] of Object.entries(doc.images || {})) {
    if (isHidden(doc, im)) continue; // en una capa apagada
    const R = imgRect(doc, im); // desde su punto de insercion (puede moverse con el mecanismo)
    const A = toScreen({ x: R.x, y: R.y + R.h }), B = toScreen({ x: R.x + R.w, y: R.y });
    const x0 = A.x * dpr, y0 = A.y * dpr, W = (B.x - A.x) * dpr, H = (B.y - A.y) * dpr;
    const src = imageSrc(doc, im), el = src && imgEl(src);
    c.save(); c.setLineDash([]);
    if (el) { c.globalAlpha = im.alpha ?? 1; c.drawImage(el, x0, y0, W, H); c.globalAlpha = 1; } // transparencia: para calcar la geometria de una foto
    else { c.strokeStyle = o.fg + '55'; c.lineWidth = dpr; c.strokeRect(x0, y0, W, H); c.fillStyle = o.fg + '88'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 11 * dpr + 'px system-ui, sans-serif'; c.fillText(src ? 'Cargando imagen…' : '⚠ Imagen sin datos', x0 + W / 2, y0 + H / 2); }
    if (o.ui && gsel.has(id) && tool === 'select') {
      c.strokeStyle = theme.sel; c.lineWidth = 2.5 * dpr; c.strokeRect(x0, y0, W, H);
      c.fillStyle = o.bg; c.lineWidth = 1.5 * dpr;
      if (selGraph === id) for (const [hx, hy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const r = 5 * dpr; c.beginPath(); c.rect(x0 + hx * W - r, y0 + hy * H - r, 2 * r, 2 * r); c.fill(); c.stroke(); }
    }
    c.restore();
    (im.locked ? imgLocked : imgHits).push({ id, x: A.x, y: A.y, w: B.x - A.x, h: B.y - A.y }); // bloqueada: no se toca ni se arrastra
  }
}
// Borra una imagen y su punto de insercion, si es solo suyo (sin restricciones ni geometria que lo use)
function dropImage(id) {
  const im = doc.images?.[id]; if (!im) return;
  delete doc.images[id];
  const P = im.pt && doc.pts[im.pt];
  if (P?.txOnly && !geometryPoints().has(im.pt) && !Object.values(doc.cons).some((k) => (k.refs || []).includes(im.pt)) && !Object.values(doc.texts || {}).some((t) => t.pt === im.pt)) delete doc.pts[im.pt];
}
// Propiedades de una imagen (doble toque): su capa y su opacidad (para calcar sobre una foto)
function editImage(id) {
  const im = doc.images?.[id];
  if (!im) return;
  const dlg = $('dlgImg'), lay = $('imgLayer'), al = $('imgAlpha'), av = $('imgAlphaV');
  const el = imgCache.get(imageSrc(doc, im));
  $('imgInfo').textContent = el?.naturalWidth ? `${el.naturalWidth} × ${el.naturalHeight} px` : '';
  lay.textContent = '';
  for (const [v, t] of [['', 'Ninguna'], ...Object.entries(doc.layers || {}).map(([lid, l]) => [lid, l.name + (l.on ? '' : ' (apagada)')])]) { const o = document.createElement('option'); o.value = v; o.textContent = t; lay.append(o); }
  lay.value = im.layer && doc.layers?.[im.layer] ? im.layer : '';
  const pct = () => Math.round((doc.images[id]?.alpha ?? 1) * 100);
  al.value = String(pct()); av.textContent = pct() + ' %';
  // punto de insercion: su nombre (para las formulas: p12.x) y su anclaje; cambiar el anclaje no mueve la imagen si el punto esta libre
  const ptFree = () => { const q = doc.images[id]?.pt; return !Object.values(doc.cons).some((k) => (k.refs || []).includes(q)) && !geometryPoints().has(q); };
  const paintAnchor = () => {
    const x = doc.images[id]; if (!x) return;
    $('imgPt').textContent = x.pt ? `${x.pt} (${x.pt}.x, ${x.pt}.y)` : '';
    const box = $('imgAnchor'); box.textContent = '';
    for (const an of ANCHORS) {
      const bt = document.createElement('button'); bt.type = 'button'; bt.title = ANCHOR_NAMES[an] || an; bt.style.cssText = 'width:40px;height:40px;min-height:0;padding:0';
      bt.innerHTML = `<svg viewBox="0 0 20 20" width="20" height="20"><rect x="3" y="3" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="${{ l: 3, c: 10, r: 17 }[an[1]]}" cy="${{ t: 3, m: 10, b: 17 }[an[0]]}" r="2.6" fill="currentColor"/></svg>`;
      if ((x.anchor || 'bl') === an) bt.classList.add('on');
      bt.onclick = () => {
        const y = doc.images[id]; if (!y || (y.anchor || 'bl') === an) return;
        pushUndo();
        const R = imgRect(doc, y);
        if (y.pt && doc.pts[y.pt] && ptFree()) Object.assign(doc.pts[y.pt], anchorPoint(R, an)); // la imagen no se mueve: su punto va al nuevo anclaje
        y.anchor = an; afterChange(); paintAnchor();
      };
      box.append(bt);
    }
  };
  paintAnchor();
  $('imgLock').checked = !!im.locked;
  $('imgLock').onchange = () => { pushUndo(); const x = doc.images[id]; if (!x) return; if ($('imgLock').checked) { x.locked = true; if (selGraph === id) selGraph = null; } else delete x.locked; afterChange(); };
  let undone = false; // un solo paso de deshacer por cada vez que se mueve el control
  lay.onchange = () => {
    pushUndo(); const x = doc.images[id]; if (!x) return;
    if (lay.value) x.layer = lay.value; else delete x.layer;
    if (isHidden(doc, x)) { selGraph = null; dlg.close(); toast('La imagen quedó en una capa apagada: se ocultó'); }
    afterChange();
  };
  al.oninput = () => {
    const x = doc.images[id]; if (!x) return;
    if (!undone) { pushUndo(); undone = true; }
    const v = Number(al.value) / 100; if (v >= 1) delete x.alpha; else x.alpha = v;
    av.textContent = al.value + ' %'; draw();
  };
  al.onchange = () => { undone = false; afterChange(); };
  $('imgDel').onclick = () => { pushUndo(); dropImage(id); selGraph = null; dlg.close(); afterChange(); };
  $('imgOk').onclick = (ev) => { ev.preventDefault(); dlg.close(); };
  dlg.showModal();
}
// Insertar una imagen: se reduce a IMG_MAX px de lado mayor y queda en el centro de la vista, con 40 % de su ancho
async function insertImage(f) {
  if (!f || !/^image\//.test(f.type)) { toast('Elige una imagen (PNG, JPG, WebP…)'); return; }
  let bmp;
  try { bmp = await createImageBitmap(f); } catch { toast('No se pudo leer la imagen'); return; }
  const { w, h } = fitPixels(bmp.width, bmp.height), cnv = document.createElement('canvas');
  cnv.width = w; cnv.height = h;
  const cx = cnv.getContext('2d');
  const png = f.type === 'image/png' || f.type === 'image/gif' || f.type === 'image/svg+xml'; // pueden tener transparencia
  if (!png) { cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h); }
  cx.drawImage(bmp, 0, 0, w, h);
  const src = cnv.toDataURL(png ? 'image/png' : 'image/jpeg', 0.85);
  const r = cv.getBoundingClientRect(), c0 = toModel(r.width / 2, r.height / 2), c1 = toModel(r.width, 0);
  const mw = Math.abs(c1.x - c0.x) * 0.8, mh = mw * h / w;
  pushUndo();
  const id = addImage(doc, src, c0.x - mw / 2, c0.y - mh / 2, mw, mh);
  setTool('select'); sel = []; selGraph = id; afterChange();
  toast(`Imagen de ${w} × ${h} px (${Math.round(src.length * 0.75 / 1024)} KB)` + (Math.max(bmp.width, bmp.height) > IMG_MAX ? `, reducida desde ${bmp.width} × ${bmp.height}` : ''));
}
// Zoom y paneo de una grafica: botones y deslizadores fuera de su rectangulo (graphCtl: zonas tocables de este dibujo; gview: ventana actual y de partida de cada eje).
const graphCtl = [], gview = {}, gspring = {}; // gspring: desplazamiento (-1..1) de cada deslizador de zoom respecto del centro
const CTL = 14, CTL_GAP = 14; // tamaño de un control y separacion al borde de la grafica (px)
function drawGraphCtl(c, id, A, B, o) {
  const v = gview[id], x = A.x, y = A.y, w = B.x - A.x, h = B.y - A.y;
  if (!v || w < 90 || h < 90) return;
  const S = CTL, G = CTL_GAP;
  c.save(); c.setLineDash([]); c.lineWidth = dpr; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 9 * dpr + 'px system-ui';
  const box = (bx, by, bw, bh, fill) => { c.beginPath(); c.roundRect(bx * dpr, by * dpr, bw * dpr, bh * dpr, 3 * dpr); c.fillStyle = fill; c.fill(); c.strokeStyle = o.fg + '66'; c.stroke(); };
  // deslizadores elasticos: zoom horizontal (abajo, a la derecha acerca) y vertical (a la izquierda, arriba acerca);
  // paneo horizontal (arriba, a la derecha mueve hacia valores mayores) y vertical (a la derecha, arriba hacia valores mayores)
  const zx = { id, kind: 'zx', x, y: y + h + G, w, h: S }, zy = { id, kind: 'zy', x: x - S - G, y, w: S, h };
  const px = { id, kind: 'px', x, y: y - S - G, w, h: S }, py = { id, kind: 'py', x: x + w + G, y, w: S, h };
  graphCtl.push(zx, zy, px, py);
  for (const [z, horiz, glyph] of [[zx, true, '↔'], [zy, false, '↕'], [px, true, '⇆'], [py, false, '⇅']]) {
    const s = gspring[id + '|' + z.kind] || 0; // elastico: en reposo el mando esta al centro
    box(z.x, z.y, z.w, z.h, o.fg + '14');
    c.strokeStyle = o.fg + '55'; c.beginPath();
    if (horiz) { c.moveTo((z.x + S / 2) * dpr, (z.y + S / 2) * dpr); c.lineTo((z.x + z.w - S / 2) * dpr, (z.y + S / 2) * dpr); } else { c.moveTo((z.x + S / 2) * dpr, (z.y + S / 2) * dpr); c.lineTo((z.x + S / 2) * dpr, (z.y + z.h - S / 2) * dpr); }
    c.stroke();
    const tx = horiz ? z.x + ((s + 1) / 2) * (z.w - S) : z.x, ty = horiz ? z.y : z.y + ((1 - s) / 2) * (z.h - S);
    box(tx, ty, S, S, theme.sel); c.fillStyle = '#fff'; c.fillText(glyph, (tx + S / 2) * dpr, (ty + S / 2 + 0.5) * dpr);
  }
  // boton Ajustar (esquina superior derecha, entre los deslizadores de paneo horizontal y vertical): todos los ejes a limites automaticos
  const fx = x + w + G, fy = y - S - G;
  graphCtl.push({ id, kind: 'fit', x: fx, y: fy, w: S, h: S });
  box(fx, fy, S, S, o.fg + '14'); c.fillStyle = o.fg; c.fillText('⤢', (fx + S / 2) * dpr, (fy + S / 2 + 0.5) * dpr);
  // boton de la esquina (entre los dos deslizadores): guarda la vista actual; relleno si la grafica ya tiene una
  const hx = x - S - G, hy = y + h + G, saved = !!doc.graphs[id]?.home;
  graphCtl.push({ id, kind: 'home', x: hx, y: hy, w: S, h: S });
  c.beginPath(); c.arc((hx + S / 2) * dpr, (hy + S / 2) * dpr, (S / 2 - 1.5) * dpr, 0, 2 * Math.PI);
  c.fillStyle = saved ? theme.sel : o.bg; c.fill(); c.strokeStyle = saved ? theme.sel : o.fg + '88'; c.lineWidth = 1.5 * dpr; c.stroke();
  c.beginPath(); c.arc((hx + S / 2) * dpr, (hy + S / 2) * dpr, 2.2 * dpr, 0, 2 * Math.PI); c.fillStyle = saved ? '#fff' : o.fg + 'aa'; c.fill();
  c.restore();
}
const graphCtlAt = (px, py) => { for (let i = graphCtl.length - 1; i >= 0; i--) { const z = graphCtl[i]; if (px >= z.x && px <= z.x + z.w && py >= z.y && py <= z.y + z.h) return z; } return null; };
// Ventana actual de un eje de la grafica: sus limites si estan puestos, o la que se esta dibujando.
function graphWin(id, k) {
  const g = doc.graphs[id], cf = g.axes?.[k], n = (q) => q != null && q !== '' && Number.isFinite(Number(q));
  if (cf && n(cf.min) && n(cf.max) && Number(cf.max) > Number(cf.min)) return [Number(cf.min), Number(cf.max)];
  const v = gview[id]?.[k];
  return v ? [v.lo, v.hi] : k === 'x1' ? genericRange(g, 'x1') : [0, 1];
}
function graphPanStep(id, k, s, dt) { // un instante de paneo continuo: s > 0 hacia valores mayores
  const g = doc.graphs[id], v = gview[id]?.[k]; if (!g || !v) return;
  const [lo, hi] = graphWin(id, k), w = panStep(lo, hi, s, dt, v.log);
  setWindow(g, k, w[0], w[1]); scheduleGraphs(); draw();
}
function graphZoomStep(id, k, s, dt) { // un instante de zoom continuo: s > 0 acerca, s < 0 aleja
  const g = doc.graphs[id], v = gview[id]?.[k]; if (!g || !v) return;
  const [lo, hi] = graphWin(id, k), w = zoomStep(lo, hi, s, dt, v.log);
  setWindow(g, k, w[0], w[1]); scheduleGraphs(); draw();
}
function ctlDown(z, p) {
  const g = doc.graphs[z.id], k = z.kind.endsWith('x') ? 'x1' : 'y1';
  if (!g) return;
  pushUndo();
  if (z.kind === 'home') { drag = { p0: p, ctl: z, home: true, started: true }; graphHomeTap(z.id); return; } // al soltar no hace nada mas (ni seleccionar)
  if (z.kind === 'fit') { // Ajustar: la grafica vuelve a enfocarse sola (x de las medidas del problema, y de lo que se ve); la vista guardada no se toca
    drag = { p0: p, ctl: z, home: true, started: true };
    for (const ax of AXES) clearWindow(g, ax);
    toast('Gráfica ajustada: límites automáticos en todos los ejes'); afterChange(); return;
  }
  const d = drag = { p0: p, ctl: z, k, started: true, moved: false };
  const pan = z.kind[0] === 'p';
  d.zoom = true; d.s = 0; d.t0 = performance.now(); d.tdown = d.t0;
  ctlMove(p);
  d.iv = setInterval(() => { // mientras el mando siga desplazado, el zoom sigue
    if (drag !== d) return clearInterval(d.iv);
    const now = performance.now(), dt = Math.min(0.1, (now - d.t0) / 1000); d.t0 = now;
    if (Math.abs(d.s) > 0.04 && now - d.tdown > 160) (pan ? graphPanStep : graphZoomStep)(z.id, k, d.s, dt); // un toque corto no mueve (cuenta para el doble toque)
  }, 40);
}
function ctlMove(p) {
  const d = drag, z = d.ctl;
  if (!d.zoom) return;
  const horiz = z.kind === 'zx' || z.kind === 'px', S = CTL;
  const s = horiz ? ((p.x - z.x - S / 2) / (z.w - S)) * 2 - 1 : 1 - ((p.y - z.y - S / 2) / (z.h - S)) * 2;
  if (dist(p, d.p0) > 3) d.moved = true;
  d.s = Math.max(-1, Math.min(1, s)); gspring[z.id + '|' + z.kind] = d.s; draw();
}
let lastCtlTap = null;
// Boton de la esquina: un toque guarda la vista actual (ventana de x1 e y1); un doble toque la olvida (los deslizadores vuelven a limites automaticos).
function graphHomeTap(id) {
  const g = doc.graphs[id], now = performance.now();
  if (lastCtlTap?.kind === 'home' && lastCtlTap.id === id && now - lastCtlTap.t < 450) {
    forgetHome(g); lastCtlTap = null; toast('Vista guardada borrada: el doble toque en ↔ o ↕ vuelve a límites automáticos'); afterChange(); return;
  }
  saveHome(g, { x1: graphWin(id, 'x1'), y1: graphWin(id, 'y1') });
  const hx = homeWin(g, 'x1'), hy = homeWin(g, 'y1');
  lastCtlTap = { kind: 'home', id, t: now };
  toast(hx && hy ? `Vista guardada: x de ${fmtT(hx[0])} a ${fmtT(hx[1])}, y de ${fmtT(hy[0])} a ${fmtT(hy[1])}. Doble toque en ↔ o ↕ vuelve a ella` : 'Aún no hay una vista que guardar');
  afterChange();
}
function springBack(key) { // el mando vuelve al centro con un rebote suave
  const step = () => {
    const s = (gspring[key] || 0) * 0.78;
    if (Math.abs(s) < 0.01) { delete gspring[key]; draw(); return; }
    gspring[key] = s; draw(); setTimeout(step, 16);
  };
  setTimeout(step, 16);
}
function ctlUp(d) {
  if (d.home) return;
  clearTimeout(d.timer); clearInterval(d.iv);
  const z = d.ctl, now = performance.now();
  if (d.zoom) springBack(z.id + '|' + z.kind);
  if (d.zoom && !d.moved && now - d.tdown < 300 && lastCtlTap && lastCtlTap.kind === z.kind && lastCtlTap.id === z.id && now - lastCtlTap.t < 450) { // doble toque en un deslizador (zoom o paneo): a la vista guardada o a limites automaticos
    const w = resetAxis(doc.graphs[z.id], d.k); lastCtlTap = null;
    toast(w ? `Eje ${d.k[0]}: vista guardada, de ${fmtT(w[0])} a ${fmtT(w[1])}` : 'Eje con límites automáticos');
  } else lastCtlTap = d.zoom ? { kind: z.kind, id: z.id, t: now } : null;
  afterChange();
}
// Estilo de una serie (ver parseLineSpec en graphs.js): trazo de la linea y forma del simbolo, centrado en (u, w) con radio r
const seriesDash = (ln) => (ln === '--' ? [7 * dpr, 4 * dpr] : ln === ':' ? [1.5 * dpr, 3 * dpr] : ln === '-.' ? [8 * dpr, 3 * dpr, 1.5 * dpr, 3 * dpr] : []);
function drawMarker(c, m, u, w, r) {
  c.save(); c.setLineDash([]); c.lineWidth = 1.5 * dpr; c.lineJoin = 'miter'; c.beginPath();
  const poly = (pts) => { pts.forEach(([a, b], k) => (k ? c.lineTo(u + a * r, w + b * r) : c.moveTo(u + a * r, w + b * r))); c.closePath(); };
  const star = (n, inner) => poly(Array.from({ length: 2 * n }, (_, k) => { const t = -Math.PI / 2 + (k * Math.PI) / n, q = k % 2 ? inner : 1; return [Math.cos(t) * q, Math.sin(t) * q]; }));
  if (m === 'o') c.arc(u, w, r, 0, 7);
  else if (m === '.') { c.arc(u, w, r * 0.55, 0, 7); c.fill(); c.restore(); return; }
  else if (m === '+') { c.moveTo(u - r, w); c.lineTo(u + r, w); c.moveTo(u, w - r); c.lineTo(u, w + r); }
  else if (m === 'x') { const q = r * 0.8; c.moveTo(u - q, w - q); c.lineTo(u + q, w + q); c.moveTo(u - q, w + q); c.lineTo(u + q, w - q); }
  else if (m === '*') { const q = r * 0.75; c.moveTo(u - r, w); c.lineTo(u + r, w); c.moveTo(u, w - r); c.lineTo(u, w + r); c.moveTo(u - q, w - q); c.lineTo(u + q, w + q); c.moveTo(u - q, w + q); c.lineTo(u + q, w - q); }
  else if (m === 's') { const q = r * 0.85; c.rect(u - q, w - q, 2 * q, 2 * q); }
  else if (m === 'd') poly([[0, -1.2], [0.85, 0], [0, 1.2], [-0.85, 0]]);
  else if (m === '^') poly([[0, -1.1], [1, 0.75], [-1, 0.75]]);
  else if (m === 'v') poly([[0, 1.1], [1, -0.75], [-1, -0.75]]);
  else if (m === '>') poly([[1.1, 0], [-0.75, 1], [-0.75, -1]]);
  else if (m === '<') poly([[-1.1, 0], [0.75, 1], [0.75, -1]]);
  else if (m === 'p') star(5, 0.45);
  else if (m === 'h') poly(Array.from({ length: 6 }, (_, k) => [Math.cos((k * Math.PI) / 3), Math.sin((k * Math.PI) / 3)]));
  c.stroke(); c.restore();
}
function drawGraphs(c, o) {
  let need = false;
  graphCtl.length = 0;
  if (selGraph && !boxOf(selGraph)) selGraph = null;
  const gsel = multiGraphs();
  const F = (px, st = '') => st + px * dpr + 'px -apple-system, system-ui, sans-serif';
  for (const [id, g] of Object.entries(doc.graphs || {})) {
    const A = toScreen({ x: g.x, y: g.y + g.h }), B = toScreen({ x: g.x + g.w, y: g.y });
    const x0 = A.x * dpr, y0 = A.y * dpr, W = (B.x - A.x) * dpr, H = (B.y - A.y) * dpr;
    if (!(W > 20 * dpr && H > 20 * dpr)) continue;
    const D = graphData[id];
    delete gview[id];
    if (!D) need = true;
    c.save(); c.setLineDash([]); c.lineJoin = 'round'; c.lineCap = 'round';
    c.fillStyle = o.bg; c.fillRect(x0, y0, W, H); c.strokeStyle = o.fg; c.lineWidth = dpr; c.strokeRect(x0, y0, W, H);
    const fs = 10, nser = Math.max(1, D?.series.length || 1);
    const useAx = (k) => !!D && D.series.some((s) => (k[0] === 'x' ? s.ax : s.ay) === k);
    const nm = (k) => String(axisCfg(g, k).name || '').trim(), cset = (k) => !!nm(k) || axisCfg(g, k).min != null || axisCfg(g, k).max != null; // un eje secundario se dibuja si lo usa una relacion o si tiene nombre o limites
    const hasX2 = useAx('x2') || (!!D && cset('x2')), hasY2 = useAx('y2') || (!!D && cset('y2'));
    const L = (44 + (nm('y1') ? 14 : 0)) * dpr, R = (10 + (hasY2 ? 36 : 0) + (hasY2 && nm('y2') ? 14 : 0)) * dpr, Bm = (20 + (nm('x1') ? 14 : 0)) * dpr;
    const T = ((g.title ? 18 : 6) + nser * 13 + (hasX2 ? 14 : 0) + (hasX2 && nm('x2') ? 14 : 0)) * dpr;
    c.font = F(fs); c.textBaseline = 'middle'; c.fillStyle = o.fg;
    if (g.title) { c.textAlign = 'left'; c.font = F(12, 'bold '); c.fillText(g.title, x0 + 8 * dpr, y0 + 10 * dpr); c.font = F(fs); }
    const px = x0 + L, py = y0 + T, pw = W - L - R, ph = H - T - Bm;
    const bnd = D && dataBounds(D.series);
    if (!D && graphHold) { c.textAlign = 'center'; c.fillText('⏸ Cálculo en pausa: la página se cerró al calcular', x0 + W / 2, y0 + H / 2 - 8 * dpr); c.fillText('Toca la gráfica para calcular', x0 + W / 2, y0 + H / 2 + 8 * dpr); }
    else if (!D) { c.textAlign = 'center'; c.fillText('Calculando… ' + Math.round((graphProg[id] || 0) * 100) + ' %', x0 + W / 2, y0 + H / 2); }
    else if (D.error && !bnd) { c.textAlign = 'center'; c.fillStyle = '#dc2626'; c.fillText('⚠ ' + D.error.slice(0, 80), x0 + W / 2, y0 + H / 2); }
    else if (bnd && pw > 10 && ph > 10) {
      const lay = {};
      for (const k of AXES) {
        if ((k === 'x2' && !hasX2) || (k === 'y2' && !hasY2)) continue;
        const cf = axisCfg(g, k), r = axisRange(D.series, k, cf.scale === 'log', { x1: lay.x1, x2: lay.x2 }) || { lo: 0, hi: 1 }; // y: solo lo que cae en la ventana de x
        lay[k] = axisLayout(cf, r.lo, r.hi);
      }
      for (const k of ['x1', 'y1']) { // ventana y ventana de partida (la de los datos, o GEN_X en una x generica) para los controles de zoom y paneo
        const cf = axisCfg(g, k), r = axisRange(D.series, k, cf.scale === 'log', { x1: lay.x1, x2: lay.x2 });
        const hl = r ? axisLayout({ ...cf, min: null, max: null }, r.lo, r.hi) : lay[k];
        (gview[id] ||= {})[k] = { lo: lay[k].lo, hi: lay[k].hi, home: k === 'x1' && D.generic ? (D.genWin || GEN_X).slice() : [hl.lo, hl.hi], log: lay[k].log }; // x generica: la ventana que eligio el graficador
      }
      const posX = (k) => (v) => px + lay[k].f(v) * pw, posY = (k) => (v) => py + ph - lay[k].f(v) * ph;
      const gx = posX('x1'), gy = posY('y1');
      c.lineWidth = 0.6 * dpr; c.textAlign = 'center';
      c.strokeStyle = o.fg + '1a';
      for (const v of lay.x1.minors) { c.beginPath(); c.moveTo(gx(v), py); c.lineTo(gx(v), py + ph); c.stroke(); }
      for (const v of lay.y1.minors) { c.beginPath(); c.moveTo(px, gy(v)); c.lineTo(px + pw, gy(v)); c.stroke(); }
      c.strokeStyle = o.fg + '33';
      for (const v of lay.x1.ticks) { c.beginPath(); c.moveTo(gx(v), py); c.lineTo(gx(v), py + ph); c.stroke(); }
      for (const v of lay.y1.ticks) { c.beginPath(); c.moveTo(px, gy(v)); c.lineTo(px + pw, gy(v)); c.stroke(); }
      c.strokeStyle = o.fg; c.fillStyle = o.fg; c.lineWidth = dpr;
      const tick = (k) => { // marcas y numeros de un eje
        const a = lay[k], hor = k[0] === 'x', pos = hor ? posX(k) : posY(k), first = k[1] === '1', sgn = first ? 1 : -1;
        for (const [list, len] of [[a.minors, 2], [a.ticks, 4]]) for (const v of list) {
          const u = pos(v); if (!Number.isFinite(u)) continue;
          c.beginPath();
          if (hor) { const e = first ? py + ph : py; c.moveTo(u, e); c.lineTo(u, e - sgn * len * dpr); } else { const e = first ? px : px + pw; c.moveTo(e, u); c.lineTo(e + sgn * len * dpr, u); }
          c.stroke();
        }
        for (const v of a.ticks) {
          const u = pos(v); if (!Number.isFinite(u)) continue;
          if (hor) { c.textAlign = 'center'; c.fillText(fmtT(v, a.log), u, first ? py + ph + 9 * dpr : py - 8 * dpr); }
          else { c.textAlign = first ? 'right' : 'left'; c.fillText(fmtT(v, a.log), first ? px - 5 * dpr : px + pw + 5 * dpr, u); }
        }
      };
      for (const k of Object.keys(lay)) tick(k);
      c.strokeRect(px, py, pw, ph);
      // nombres de los ejes
      c.fillStyle = o.fg; c.font = F(fs, 'italic ');
      if (nm('x1')) { c.textAlign = 'center'; c.fillText(nm('x1'), px + pw / 2, y0 + H - 8 * dpr); }
      if (hasX2 && nm('x2')) { c.textAlign = 'center'; c.fillText(nm('x2'), px + pw / 2, py - 21 * dpr); }
      for (const [k, cx, ang] of [['y1', x0 + 9 * dpr, -Math.PI / 2], ['y2', x0 + W - 9 * dpr, -Math.PI / 2]]) {
        if (!nm(k) || (k === 'y2' && !hasY2)) continue;
        c.save(); c.translate(cx, py + ph / 2); c.rotate(ang); c.textAlign = 'center'; c.fillText(nm(k), 0, 0); c.restore();
      }
      c.font = F(fs);
      c.save(); c.beginPath(); c.rect(px, py, pw, ph); c.clip();
      D.series.forEach((s) => {
        const X = posX(s.ax), Y = posY(s.ay), col = s.color === 'fg' ? o.fg : s.color;
        c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 1.8 * dpr;
        if (s.line) {
          c.setLineDash(seriesDash(s.line)); c.beginPath();
          let pen = false;
          for (const [x, y] of s.pts) {
            const u = X(x), w = Y(y);
            if (!Number.isFinite(u) || !Number.isFinite(w)) { pen = false; continue; }
            if (pen) c.lineTo(u, w); else c.moveTo(u, w);
            pen = true;
          }
          c.stroke(); c.setLineDash([]);
        }
        // simbolos en cada punto; una serie de un solo punto sin simbolo (σ vs N: el punto de trabajo) seria una linea de largo cero: un circulo
        const p0 = s.pts[0], single = p0 && s.pts.every(([x, y]) => x === p0[0] && y === p0[1]);
        const mk = s.marker || (single ? 'o' : '');
        if (mk) for (const [x, y] of single ? [p0] : s.pts) { const u = X(x), w = Y(y); if (Number.isFinite(u) && Number.isFinite(w)) drawMarker(c, mk, u, w, 4 * dpr); }
      });
      if (sim) { // linea del tiempo actual en cada eje horizontal que grafica contra t
        c.setLineDash([4 * dpr, 3 * dpr]); c.strokeStyle = ACT_COLOR;
        for (const k of ['x1', 'x2']) if (lay[k] && D.series.some((s) => s.tx && s.ax === k)) { const f = lay[k].f(simT); if (f >= 0 && f <= 1) { c.beginPath(); c.moveTo(px + f * pw, py); c.lineTo(px + f * pw, py + ph); c.stroke(); } }
      }
      c.restore();
      if (D.error) { c.textAlign = 'right'; c.fillStyle = '#dc2626'; c.fillText('⚠ ' + D.error.slice(0, 70), x0 + W - 6 * dpr, y0 + H - 7 * dpr); }
    }
    if (D) { c.textAlign = 'left'; D.series.forEach((s, i) => { const ly = y0 + (g.title ? 24 : 10) * dpr + i * 13 * dpr, col = s.color === 'fg' ? o.fg : s.color; c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 1.8 * dpr; if (s.line) { c.setLineDash(seriesDash(s.line)); c.beginPath(); c.moveTo(x0 + 6 * dpr, ly); c.lineTo(x0 + 24 * dpr, ly); c.stroke(); c.setLineDash([]); } if (s.marker || !s.line) drawMarker(c, s.marker || 'o', x0 + 15 * dpr, ly, 3.5 * dpr); c.fillStyle = o.fg; c.fillText(s.label + (s.ax === 'x2' || s.ay === 'y2' ? ' (' + (s.ax === 'x2' ? 'x2' : '') + (s.ax === 'x2' && s.ay === 'y2' ? ', ' : '') + (s.ay === 'y2' ? 'y2' : '') + ')' : ''), x0 + 28 * dpr, ly); }); }
    if (o.ui && gsel.has(id) && tool === 'select') { // resaltada: borde grueso y, la de un toque, manijas en esquinas y centros de lados
      c.strokeStyle = theme.sel; c.lineWidth = 2.5 * dpr; c.strokeRect(x0, y0, W, H);
      c.fillStyle = o.bg; c.lineWidth = 1.5 * dpr;
      if (selGraph === id) for (const [hx, hy] of [[0, 0], [.5, 0], [1, 0], [0, .5], [1, .5], [0, 1], [.5, 1], [1, 1]]) { const r = 5 * dpr; c.beginPath(); c.rect(x0 + hx * W - r, y0 + hy * H - r, 2 * r, 2 * r); c.fill(); c.stroke(); }
    }
    if (o.ui && !sim && tool === 'select' && selGraph === id) drawGraphCtl(c, id, A, B, o); // los controles (deslizadores, Ajustar, vista guardada) solo con la grafica seleccionada: sin seleccionar se ve limpia
    c.restore();
    actHits.push({ id, g: true, x: A.x, y: A.y, w: B.x - A.x, h: B.y - A.y });
  }
  if (need) scheduleGraphs();
}
function scheduleGraphs() {
  if (sim || graphHold || !Object.keys(doc.graphs || {}).length) return;
  clearTimeout(graphTimer);
  graphTimer = setTimeout(() => {
    if (sim || graphHold) return;
    // solo se recalcula la grafica cuyo resultado puede haber cambiado: mover o redimensionar una grafica, su titulo o sus ejes no cambian los datos
    const base = JSON.stringify({ ...doc, graphs: undefined, traces: undefined, layers: undefined });
    const ns = {}, todo = [];
    for (const [id, g] of Object.entries(doc.graphs || {})) {
      ns[id] = base + '|' + JSON.stringify([g.series, g.n, g.angles, graphData[id]?.generic ? [g.axes?.x1, g.axes?.x2] : null, g.x, g.y + g.h]); // con x generica, los limites del eje x1 definen los valores de x; su esquina superior izquierda, su lugar en el orden de lectura
      if (!(graphData[id] && graphSig[id] === ns[id])) todo.push(id);
    }
    for (const id of Object.keys(graphData)) if (!doc.graphs?.[id]) delete graphData[id];
    const key = JSON.stringify(todo.map((id) => ns[id]));
    if (!todo.length || key === graphKey) return; // nada que calcular, o ya se esta calculando justo eso
    graphKey = key;
    runGraphs(++graphRun, todo, ns, key);
  }, 250);
}
// Calcula las graficas pendientes de una en una, cediendo el hilo al navegador (el solver en un iPad puede tardar segundos); un cambio posterior cancela la corrida.
async function runGraphs(run, todo, ns, key) {
  const t0 = performance.now();
  let lastDraw = 0;
  const stale = () => run !== graphRun || !!sim;
  const busy = () => !!drag; // un arrastre usa el solver con su propia sesion: se espera a que termine
  try {
    for (const id of todo) {
      const g = doc.graphs?.[id];
      if (!g) continue;
      graphProg[id] = 0;
      gcalcMark({ id, p: 0, ms: 0, t: Date.now() });
      const r = await computeGraphAsync(doc, g, solve, {
        stale, busy,
        onStep: (f) => {
          graphProg[id] = f;
          const now = performance.now();
          if (now - lastDraw > 200) { lastDraw = now; gcalcMark({ id, p: Math.round(f * 100) / 100, ms: Math.round(now - t0), t: Date.now() }); if (!graphData[id]) draw(); }
        },
      });
      if (!r) return;
      graphData[id] = r; graphSig[id] = ns[id];
      draw();
    }
  } finally {
    if (graphKey === key) graphKey = '';
    if (run === graphRun) gcalcMark(null); // terminada o cancelada sin relevo: ya no hay un calculo en vuelo
  }
}
function graphTool(p) {
  const ah = actAt(p.x, p.y);
  if (ah) { editAct(ah, false); return; }
  const q = toModel(p.x, p.y), a0 = Object.values(doc.acts || {})[0];
  pushUndo();
  const id = addGraph(doc, q.x, q.y, 320 / view.s, 200 / view.s, a0 ? [actName(a0) + ' vs t'] : []);
  afterChange(); editGraph(id, true);
}
// Ejes x1 (horizontal inferior), x2 (superior), y1 (vertical izquierdo) y y2 (derecho): se arman una vez dentro del cuadro de la grafica.
const AXIS_TXT = { x1: 'x1 · horizontal inferior', x2: 'x2 · horizontal superior', y1: 'y1 · vertical izquierdo', y2: 'y2 · vertical derecho' };
function buildAxesUI() {
  const box = $('grAxes');
  if (box.childElementCount) return;
  for (const k of AXES) {
    const d = document.createElement('details');
    d.innerHTML = `<summary>Eje ${AXIS_TXT[k]}</summary><label>Nombre (con unidades, p. ej. «p12.x [cm]»)<input id="ax_${k}_name" autocomplete="off"></label><div class="axg"><label>Escala<select id="ax_${k}_scale"><option value="lin">Lineal</option><option value="log">Log</option></select></label><label>Mín.<input id="ax_${k}_min" inputmode="decimal" placeholder="auto"></label><label>Máx.<input id="ax_${k}_max" inputmode="decimal" placeholder="auto"></label><label>Mayores<input id="ax_${k}_major" inputmode="numeric" placeholder="auto"></label><label>Menores<input id="ax_${k}_minor" inputmode="numeric" placeholder="0"></label></div>`;
    box.appendChild(d);
  }
}
// Estilo de cada relacion en el dialogo de la grafica: color, linea y simbolo, que escriben el LineSpec entre comillas al final de la linea
let styleTimer = 0;
const ST_COLORS = [['', 'Color auto'], ['b', 'Azul'], ['r', 'Rojo'], ['g', 'Verde'], ['c', 'Cian'], ['m', 'Magenta'], ['y', 'Amarillo'], ['k', 'Negro (texto)'], ['w', 'Blanco'], ['#', 'Otro…']];
const ST_LINES = [['-', 'Continua'], ['--', 'Discontinua'], [':', 'Punteada'], ['-.', 'Raya y punto'], ['', 'Sin línea']];
const ST_MARKS = [['', 'Sin símbolo'], ['o', '○ Círculo'], ['x', '× Equis'], ['+', '+ Más'], ['*', '✱ Asterisco'], ['.', '• Punto'], ['s', '□ Cuadrado'], ['d', '◇ Rombo'], ['^', '△ Triángulo'], ['v', '▽ Triángulo abajo'], ['>', '▷ Triángulo der.'], ['<', '◁ Triángulo izq.'], ['p', '☆ Estrella'], ['h', '⬡ Hexágono']];
function renderSeriesStyles() {
  const box = $('grStyles'), ta = $('grSeries'), lines = ta.value.split('\n');
  box.textContent = '';
  lines.forEach((ln, i) => {
    if (!ln.trim()) return;
    const row = document.createElement('div'); row.className = 'gst';
    const { base, spec } = splitSpec(ln);
    let st = { color: null, line: '-', marker: '' }, bad = '';
    if (spec !== null) { try { st = parseLineSpec(spec); } catch (e) { bad = e.message; } }
    const name = document.createElement('span'); name.textContent = base.trim(); name.title = base.trim();
    const sel = (opts, val) => { const s = document.createElement('select'); for (const [v, t] of opts) { const o = document.createElement('option'); o.value = v; o.textContent = t; s.append(o); } s.value = val; return s; };
    const hex = st.color && st.color[0] === '#';
    const sc = sel(ST_COLORS, hex ? '#' : st.color || ''), sl = sel(ST_LINES, st.line), sm = sel(ST_MARKS, st.marker);
    const pick = document.createElement('input'); pick.type = 'color'; pick.value = hex && st.color.length === 7 ? st.color : '#ff8800'; pick.hidden = !hex;
    const write = () => {
      const color = sc.value === '#' ? pick.value : sc.value || null;
      lines[i] = withSpec(lines[i], { color, line: sl.value, marker: sm.value });
      ta.value = lines.join('\n'); renderSeriesStyles();
    };
    sc.onchange = () => { pick.hidden = sc.value !== '#'; write(); }; sl.onchange = write; sm.onchange = write; pick.onchange = write;
    const cbox = document.createElement('span'); cbox.style.display = 'flex'; cbox.style.gap = '4px'; cbox.append(sc, pick);
    row.append(name, cbox, sl, sm);
    if (bad) { const w = document.createElement('span'); w.className = 'warn'; w.textContent = '⚠ ' + bad; row.append(w); }
    box.append(row);
  });
}
function editGraph(id, nuevo) {
  const g = doc.graphs?.[id];
  if (!g) return;
  const dlg = $('dlgGraph');
  $('grTitle').value = g.title || ''; $('grSeries').value = g.series.join('\n'); $('grN').value = g.n;
  $('grAng').value = g.angles === 'rad' || g.angles === 'deg' ? g.angles : '';
  $('grAng').options[0].textContent = 'Del documento (' + (doc.angles === 'rad' ? 'radianes' : 'grados') + ')';
  $('grX').value = fmtG(g.x); $('grY').value = fmtG(g.y); $('grW').value = fmtG(g.w); $('grH').value = fmtG(g.h);
  renderSeriesStyles(); $('grSeries').oninput = () => { clearTimeout(styleTimer); styleTimer = setTimeout(renderSeriesStyles, 250); };
  $('grVars').textContent = 'Variables: ' + graphVarNames(doc).join(', ') + '. También p1.x, l1.len, c1.r… y funciones (sin, sqrt…)';
  buildAxesUI();
  for (const k of AXES) { const a = axisCfg(g, k); $('ax_' + k + '_name').value = a.name; $('ax_' + k + '_scale').value = a.scale; for (const f of ['min', 'max', 'major', 'minor']) $('ax_' + k + '_' + f).value = a[f] ?? ''; }
  let done = false;
  $('grOk').onclick = (ev) => {
    ev.preventDefault();
    const series = $('grSeries').value.split('\n').map((s) => s.trim()).filter(Boolean);
    const num = (e) => Number(String($(e).value).replace(',', '.'));
    const nv = { x: num('grX'), y: num('grY'), w: num('grW'), h: num('grH'), n: Math.round(num('grN')) };
    if (!series.length) { toast('Escribe al menos una relación, por ejemplo «MR1 vs t»'); return; }
    if (![nv.x, nv.y, nv.w, nv.h, nv.n].every(Number.isFinite) || nv.w <= 0 || nv.h <= 0 || nv.n < 2) { toast('Revisa la posición, el tamaño y las muestras'); return; }
    const axes = {};
    for (const k of AXES) {
      const v = (f) => String($('ax_' + k + '_' + f).value).trim().replace(',', '.'), a = { name: $('ax_' + k + '_name').value.trim(), scale: $('ax_' + k + '_scale').value };
      for (const f of ['min', 'max', 'major', 'minor']) { a[f] = v(f) === '' ? null : Number(v(f)); if (a[f] !== null && !Number.isFinite(a[f])) { toast(`Eje ${k}: «${f}» no es un número`); return; } }
      if (a.min !== null && a.max !== null && !(a.max > a.min)) { toast(`Eje ${k}: el máximo debe ser mayor que el mínimo`); return; }
      if (a.scale === 'log' && ((a.min !== null && a.min <= 0) || (a.max !== null && a.max <= 0))) { toast(`Eje ${k}: en escala logarítmica los límites deben ser positivos`); return; }
      if ((a.major !== null && (a.major < 1 || a.major > 50)) || (a.minor !== null && (a.minor < 0 || a.minor > 20))) { toast(`Eje ${k}: divisiones mayores de 1 a 50 y menores de 0 a 20`); return; }
      axes[k] = a;
    }
    if (!nuevo) pushUndo();
    Object.assign(doc.graphs[id], nv, { title: $('grTitle').value.trim(), series, axes });
    if ($('grAng').value) doc.graphs[id].angles = $('grAng').value; else delete doc.graphs[id].angles;
    delete graphData[id];
    done = true; dlg.close(); afterChange();
  };
  $('grDel').onclick = (ev) => { ev.preventDefault(); if (!nuevo) pushUndo(); delete doc.graphs[id]; delete graphData[id]; done = true; dlg.close(); afterChange(); };
  const cancel = (ev) => { ev?.preventDefault?.(); if (done) return; done = true; dlg.close(); if (nuevo) { rollback(); afterChange(); } };
  $('grCancel').onclick = cancel; dlg.oncancel = cancel;
  dlg.showModal();
}
// Herramientas MR y ML: MR toca una linea (el extremo mas cercano al toque es el centro); ML toca la cola y luego la cabeza.
function actTool(p) {
  const ah = actAt(p.x, p.y);
  if (ah) { editAct(ah, false); return; }
  if (tool === 'mr') {
    const h = hitTest(p.x, p.y);
    if (!h || (h.k !== 'ln' && h.k !== 'pt')) { toast('Toca la línea que girará y su extremo que será el centro de giro (en cualquier orden)'); return; }
    mrPick(h);
    return;
  }
  const s = snapAt(p.x, p.y, { press: true });
  if (!pending?.act1) { pushUndo(); const a1 = pointFrom(s); pending = { act1: a1 }; sel = [{ k: 'pt', id: a1 }]; draw(); toast('Cola elegida: toca el punto de la cabeza del actuador'); return; }
  const first = pending.act1, second = pointFrom(s);
  if (first === second) { rollback(); pending = null; sel = []; draw(); return; }
  pending = null; sel = [];
  const id = addLinear(doc, first, second);
  afterChange(); editAct(id, true);
}
// MR: la linea y el punto de giro (uno de sus extremos) se eligen en cualquier orden, o vienen de la seleccion.
function mrPick(h) {
  const mr = { ...(pending?.mr || {}) };
  if (h.k === 'ln') mr.line = h.id; else mr.pt = h.id;
  const l = mr.line && doc.lines[mr.line];
  if (l && mr.pt && mr.pt !== l.a && mr.pt !== l.b) {
    if (h.k === 'pt') { toast('Ese punto no es un extremo de la línea: toca uno de sus extremos'); mr.pt = null; } // el punto nuevo no vale: se conserva la linea
    else { mr.pt = null; toast('La línea no termina en ese punto: toca el extremo que será el centro de giro'); }
  }
  if (mr.line && mr.pt) { mrMake(mr.line, mr.pt); return; }
  pending = { mr };
  sel = [...(mr.line ? [{ k: 'ln', id: mr.line }] : []), ...(mr.pt ? [{ k: 'pt', id: mr.pt }] : [])];
  toast(mr.line ? 'Toca el extremo de la línea que será el centro de giro' : 'Toca la línea que girará');
  draw();
}
function mrMake(line, pt) {
  pending = null; sel = [];
  pushUndo();
  const id = addRotary(doc, line, pt);
  if (!id) { rollback(); toast('El punto de giro debe ser un extremo de la línea'); draw(); return; }
  afterChange(); editAct(id, true);
}
// Cuadro de definicion de un actuador. nuevo: si se cancela, se deshace su creacion.
function editAct(id, nuevo) {
  if (doc.graphs?.[id]) { editGraph(id, nuevo); return; }
  const a = doc.acts?.[id];
  if (!a) return;
  const dlg = $('dlgAct'), unitD = a.kind === 'MR' ? '°' : '', unitV = a.kind === 'MR' ? '°/s' : 'unidades/s';
  $('actTitle').textContent = 'Actuador ' + actName(a) + (a.kind === 'MR' ? ' (rotacional)' : ' (lineal)');
  $('actMode').value = a.mode; $('actSrc').value = a.src; $('actExpr').value = a.expr ?? ''; $('actTable').value = tableText(a.table);
  $('actCw').checked = !!a.cw; $('actCwRow').style.display = a.kind === 'MR' ? '' : 'none';
  const sync = () => {
    const vel = $('actMode').value === 'vel', tab = $('actSrc').value === 'table';
    $('actExprRow').style.display = tab ? 'none' : ''; $('actTableRow').style.display = tab ? '' : 'none';
    $('actExprLbl').textContent = (vel ? 'Velocidad' : 'Desplazamiento') + ' en función de t (' + (vel ? unitV : unitD || 'unidades') + ')';
    $('actTableLbl').textContent = 'Tabla: una fila por línea, «tiempo; ' + (vel ? 'velocidad' : 'desplazamiento') + '»';
  };
  $('actMode').onchange = sync; $('actSrc').onchange = sync; sync();
  let done = false;
  const finish = (act) => { if (done) return; done = true; dlg.close(); if (act === 'cancel' && nuevo) { rollback(); afterChange(); } };
  $('actOk').onclick = (ev) => {
    ev.preventDefault();
    const b = { ...a, mode: $('actMode').value, src: $('actSrc').value, expr: $('actExpr').value, cw: a.kind === 'MR' && $('actCw').checked };
    try { if (b.src === 'table') b.table = parseTable($('actTable').value); } catch (e) { toast(e.message); return; }
    const err = actError(doc, b);
    if (err) { toast(err); return; }
    if (!nuevo) pushUndo();
    Object.assign(doc.acts[id], b);
    done = true; dlg.close(); afterChange();
  };
  $('actDel').onclick = (ev) => { ev.preventDefault(); if (!nuevo) pushUndo(); delete doc.acts[id]; done = true; dlg.close(); afterChange(); };
  $('actCancel').onclick = (ev) => { ev.preventDefault(); finish('cancel'); };
  dlg.oncancel = () => finish('cancel');
  dlg.showModal();
}
// Tiempo final: uno solo para el reproductor («hasta») y para todas las graficas (doc.tEnd); si cambia uno, cambia el otro.
const TE = () => (Number(doc.tEnd) > 0 ? Number(doc.tEnd) : 10);
function setTEnd(v) {
  doc.tEnd = v;
  if (sim) { const o = JSON.parse(sim.snap); o.tEnd = v; sim.snap = JSON.stringify(o); graphStale = true; } // al detener, el dibujo vuelve de la copia
  else { graphData = {}; scheduleGraphs(); }
}
function simShow() {
  $('simT').value = String(Math.round(simT * 1000) / 1000); $('simRange').max = String(TE()); $('simRange').value = String(Math.min(simT, TE())); $('simTmax').value = String(TE());
  $('simPlay').textContent = simRaf ? '⏸' : '▶';
  $('simLoop').classList.toggle('on', simMode === 'loop'); $('simPP').classList.toggle('on', simMode === 'pp');
  $('simSpeed').value = String(simSpeed);
}
function simGoto(t) {
  const trc = Object.keys(doc.traces || {}).length > 0, fwd = trc && t > (sim.tmax ?? 0); // los puntos con «Trazar punto» dibujan su trayectoria al avanzar el tiempo
  if (fwd && t - (sim.tmax ?? 0) > TE() / 150) { // salto grande (la barra): se recorre el tramo en pasos para que la trayectoria salga continua
    const from = sim.tmax ?? 0, n = Math.min(200, Math.ceil(((t - from) / TE()) * 200));
    for (let i = 1; i < n; i++) { if (!simStep(doc, sim, from + ((t - from) * i) / n, solve).ok) break; recordTraces(doc, 1 / view.s); }
  }
  const r = simStep(doc, sim, t, solve);
  if (!r.ok) { pauseSim(); toast(r.error || 'No se pudo mover'); simShow(); draw(); return false; }
  if (fwd) { recordTraces(doc, t >= TE() ? 2e-4 : 1 / view.s); sim.tmax = t; }
  simT = t; simShow(); draw();
  return true;
}
function pauseSim() { if (simRaf) cancelAnimationFrame(simRaf); simRaf = 0; $('simPlay').textContent = '▶'; }
// Reproduce a la velocidad elegida; al llegar al final: se detiene, vuelve a empezar (loop) o regresa (vaiven).
function playSim() {
  if (simRaf) { pauseSim(); return; }
  if (simT >= TE() && simMode !== 'pp') { if (!simGoto(0)) return; }
  simDir = simT >= TE() ? -1 : 1;
  let last = performance.now();
  const tick = (now) => {
    const dt = Math.min(0.25, (now - last) / 1000) * simSpeed; last = now;
    let t = simT + dt * simDir, stop = false;
    if (t >= TE()) { if (simMode === 'loop') t = t - TE(); else if (simMode === 'pp') { t = 2 * TE() - t; simDir = -1; } else { t = TE(); stop = true; } }
    else if (t <= 0 && simDir < 0) { if (simMode === 'pp') { t = -t; simDir = 1; } else { t = 0; stop = true; } }
    t = Math.min(TE(), Math.max(0, t));
    if (!simGoto(t)) return;
    if (stop) { pauseSim(); return; }
    simRaf = requestAnimationFrame(tick);
  };
  simRaf = requestAnimationFrame(tick); $('simPlay').textContent = '⏸';
}
// Un paso de simulacion: 1/100 del tiempo total.
function stepSim(dir) {
  pauseSim();
  if (!sim) return;
  const h = TE() / 100;
  simGoto(Math.min(TE(), Math.max(0, Math.round((simT + dir * h) * 1e6) / 1e6)));
}
function stopSim() {
  if (!sim) return;
  pauseSim();
  const trazas = doc.traces; // el dibujo vuelve a su estado, pero las trayectorias de la simulacion se conservan
  simEnd(doc, sim); sim = null; simT = 0;
  if (trazas) doc.traces = trazas;
  if (graphStale) { graphData = {}; graphStale = false; }
  $('simBar').hidden = true; pending = null; sel = sel.filter(exists);
  afterChange();
}
function toggleSim() {
  if (sim) { stopSim(); return; }
  if (!Object.keys(doc.acts || {}).length) { toast('Crea antes un actuador (MR o ML)'); return; }
  for (const a of Object.values(doc.acts)) { const e = actError(doc, a); if (e) { toast(actName(a) + ': ' + e); return; } }
  pending = null; sel = [];
  sim = simBegin(doc); simT = 0; sim.tmax = 0;
  for (const [pid, tr] of Object.entries(doc.traces || {})) if (doc.pts[pid]) tr.pts = [{ x: doc.pts[pid].x, y: doc.pts[pid].y }]; // la trayectoria parte de la posicion inicial
  $('simBar').hidden = false; simShow(); draw();
  toast('Simulación: mueve el tiempo con la barra. El dibujo vuelve a su estado al detenerla');
}
$('simPlay').onclick = playSim;
$('simBack').onclick = () => stepSim(-1);
$('simFwd').onclick = () => stepSim(1);
$('simLoop').onclick = () => { simMode = simMode === 'loop' ? 'none' : 'loop'; simShow(); };
$('simPP').onclick = () => { simMode = simMode === 'pp' ? 'none' : 'pp'; simShow(); };
$('simSpeed').onchange = () => { simSpeed = Number($('simSpeed').value) || 1; simShow(); };
$('simStop').onclick = stopSim;
$('simRange').oninput = () => { pauseSim(); if (sim) simGoto(Number($('simRange').value)); };
$('simT').onchange = () => { pauseSim(); const v = Number($('simT').value.replace(',', '.')); if (sim && Number.isFinite(v) && v >= 0) { setTEnd(Math.max(TE(), v)); simGoto(v); } else simShow(); };
$('simTmax').onchange = () => { const v = Number($('simTmax').value.replace(',', '.')); if (Number.isFinite(v) && v > 0) { setTEnd(v); if (simT > v && sim) simGoto(v); } simShow(); };

function runGroupItem(id) {
  if (id === 'vector' && convertToVector()) return;
  if (id === 'line' && convertToLine()) return;
  if (ACT_IDS.has(id)) { if (!$(id).disabled) $(id).click(); }
  else if (id === 'sim') toggleSim();
  else if (id === 'filter') openFilter();
  else if (id === 'copy') copySel();
  else if (id === 'paste') pasteTool();
  else setTool(id);
}
const grpTool = (g) => { const c = (opts.grp || {})[g]; return GROUPS[g].some((x) => x[0] === c && !isAct(x[0])) ? c : GROUPS[g][0][0]; };
function refreshGroups() {
  const filtered = (opts.filtKinds || []).length > 0 || (opts.filtLt || []).length > 0;
  document.querySelectorAll('.grp[data-group]').forEach((b) => {
    const g = b.dataset.group, id = grpTool(g), it = MENU_ONLY.has(g) ? ['', b.dataset.icon, 'Archivo: nuevo, guardar, abrir y exportar'] : GROUPS[g].find((x) => x[0] === id);
    b.querySelector(':scope > i').innerHTML = iconSvg(it[1]);
    b.title = it[2] + (MENU_ONLY.has(g) ? '' : ' · toca de nuevo o mantén presionado para ver más herramientas') + (g === 'sel' && filtered ? ' (filtro activo)' : '');
    b.setAttribute('aria-label', it[2]);
    b.classList.toggle('on', !MENU_ONLY.has(g) && toolName === id);
    b.classList.toggle('filtered', g === 'sel' && filtered);
  });
}
function syncGroups(t) {
  opts.grp = opts.grp || {};
  for (const g of Object.keys(GROUPS)) if (GROUPS[g].some((x) => x[0] === t && !isAct(x[0]))) opts.grp[g] = t;
  refreshGroups(); persist();
}
let fly = null;
function closeFly() { if (fly) { fly.el.remove(); fly = null; } }
function openFly(b) {
  closeFly();
  const g = b.dataset.group, el = document.createElement('div');
  el.id = 'fly';
  for (const [id, icon, tip, short] of GROUPS[g]) {
    const label = short || tip, x = document.createElement('button');
    x.title = tip;
    x.innerHTML = `<i>${iconSvg(icon)}</i><span>${label}</span>`;
    if (id === grpTool(g) && !isAct(id)) x.classList.add('on');
    if (ACT_IDS.has(id) && $(id).disabled) x.disabled = true;
    x.onclick = () => { closeFly(); runGroupItem(id); };
    el.appendChild(x);
  }
  document.body.appendChild(el);
  const r = b.getBoundingClientRect();
  el.style.top = r.bottom + 4 + 'px';
  el.style.left = Math.max(4, Math.min(r.left, innerWidth - el.offsetWidth - 4)) + 'px';
  fly = { el, btn: b };
}
function wireGroups() {
  document.querySelectorAll('.grp[data-group]').forEach((b) => {
    let lp = 0, long = false;
    b.addEventListener('pointerdown', () => { long = false; clearTimeout(lp); lp = setTimeout(() => { long = true; openFly(b); }, 420); });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => clearTimeout(lp));
    b.addEventListener('click', (e) => {
      if (long) { long = false; return; }
      if (fly?.btn === b) { closeFly(); return; }
      if (MENU_ONLY.has(b.dataset.group) || e.target.closest('.chev') || b.classList.contains('on')) { openFly(b); return; }
      runGroupItem(grpTool(b.dataset.group));
    });
  });
  document.addEventListener('pointerdown', (e) => { if (fly && !e.target.closest('#fly') && !e.target.closest('.grp[data-group]')) closeFly(); }, true);
}

// ---------------------------------------------------------------- capas
function layerBtn() {
  const l = doc.layers?.[doc.curLayer], n = l ? l.name : 'ninguna';
  $('tLayers').title = 'Capas · capa actual: ' + n;
  $('tLayers').setAttribute('aria-label', 'Capas, capa actual: ' + n);
  const tag = $('layerName'); // el nombre aparece bajo el boton solo cuando hay una capa actual
  tag.hidden = !l; tag.textContent = l ? l.name : '';
}
function setCurLayer(id) {
  if (id && !doc.layers[id].on) { toast('Enciende la capa para dibujar en ella'); renderLayers(); return; }
  doc.curLayer = id; layerBtn(); persist(); renderLayers(); draw();
  toast(id ? `Capa actual: ${doc.layers[id].name}` : 'Sin capa actual: lo nuevo no pertenece a ninguna capa');
}
function toggleLayer(id) {
  pushUndo();
  const l = doc.layers[id];
  l.on = !l.on;
  if (!l.on) {
    sel = [];
    if (doc.curLayer === id) { doc.curLayer = null; toast(`«${l.name}» apagada: ya no es la capa actual, dibujas sin capa`); }
  }
  afterChange(); renderLayers();
}
function removeLayer(id) {
  const l = doc.layers[id], n = layerCount(doc, id);
  if (!confirm(`¿Borrar la capa «${l.name}»?` + (n ? (n === 1 ? ' Su único elemento quedará sin capa («ninguna»).' : ` Sus ${n} elementos quedarán sin capa («ninguna»).`) : ''))) return;
  pushUndo(); deleteLayer(doc, id);
  afterChange(); renderLayers();
}
function renderLayers() {
  layerBtn();
  const box = $('lyList');
  box.textContent = '';
  const rows = [{ id: null, none: true }, ...Object.entries(doc.layers || {}).map(([id, l]) => ({ id, name: l.name, on: l.on }))];
  for (const r of rows) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;align-items:center;margin:4px 0';
    const rd = document.createElement('input');
    rd.type = 'radio'; rd.name = 'lyCur'; rd.checked = (doc.curLayer || null) === r.id;
    rd.style.cssText = 'width:22px;height:22px;min-height:22px;margin:0;flex:none';
    rd.title = 'Capa actual'; rd.setAttribute('aria-label', 'Capa actual: ' + (r.none ? 'ninguna' : r.name));
    rd.onchange = () => setCurLayer(r.id);
    row.appendChild(rd);
    if (r.none) {
      const sp = document.createElement('span');
      sp.style.cssText = 'flex:1;color:var(--muted)'; sp.textContent = 'Ninguna (sin capa)';
      row.appendChild(sp);
    } else {
      const nm = document.createElement('input');
      nm.type = 'text'; nm.value = r.name; nm.style.cssText = 'flex:1;min-width:0;min-height:40px;font-size:16px;' + (r.on ? '' : 'opacity:.5');
      nm.onchange = () => {
        const v = nm.value.trim();
        if (!v) { nm.value = doc.layers[r.id].name; return; }
        pushUndo(); doc.layers[r.id].name = v; afterChange();
      };
      row.appendChild(nm);
      const ct = document.createElement('small');
      ct.textContent = String(layerCount(doc, r.id)); ct.title = 'Elementos en la capa';
      row.appendChild(ct);
      const eb = document.createElement('button');
      eb.type = 'button'; eb.innerHTML = iconSvg(r.on ? 'eye' : 'eye-off');
      eb.title = r.on ? 'Apagar la capa (ocultarla)' : 'Encender la capa'; eb.setAttribute('aria-label', eb.title); eb.setAttribute('aria-pressed', String(r.on));
      eb.onclick = () => toggleLayer(r.id);
      const db = document.createElement('button');
      db.type = 'button'; db.innerHTML = iconSvg('trash'); db.title = 'Borrar la capa'; db.setAttribute('aria-label', 'Borrar la capa ' + r.name);
      db.onclick = () => removeLayer(r.id);
      row.append(eb, db);
    }
    box.appendChild(row);
  }
}
$('lyAdd').onclick = () => {
  let name = $('lyName').value.trim();
  if (!name) {
    const names = new Set(Object.values(doc.layers || {}).map((l) => l.name));
    let i = names.size + 1;
    while (names.has('Capa ' + i)) i++;
    name = 'Capa ' + i;
  }
  pushUndo(); addLayer(doc, name);
  $('lyName').value = '';
  afterChange(); renderLayers();
  toast(`Capa «${name}» creada y activa`);
};
$('dlgY').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
  e.preventDefault();
  if (e.target.id === 'lyName') $('lyAdd').click(); else e.target.blur();
});
$('tLayers').onclick = () => { renderLayers(); $('dlgY').showModal(); };

// ---------------------------------------------------------------- ventana de propiedades (doble toque)
const PROP_NAMES = { pt: 'Punto', ln: 'Línea', ci: 'Círculo', ar: 'Arco', el: 'Elipse', sp: 'Spline', tx: 'Texto', ha: 'Relleno' };
const PROP_COLL = { pt: 'pts', ln: 'lines', ci: 'circles', ar: 'arcs', el: 'ellipses', sp: 'splines', tx: 'texts', ha: 'hatches' };
let propT = null;
const propObj = () => (propT ? doc[PROP_COLL[propT.k]]?.[propT.id] : null);
function pointOwned(id) {
  return Object.values(doc.lines).some((l) => l.a === id || l.b === id) || Object.values(doc.circles).some((c) => c.c === id)
    || Object.values(doc.arcs).some((a) => a.c === id || a.a === id || a.b === id)
    || Object.values(doc.ellipses || {}).some((e) => [e.c, e.a, e.b, e.p1, e.p2].includes(id))
    || Object.values(doc.splines || {}).some((sp) => sp.pts.includes(id)) || Object.values(doc.texts || {}).some((t) => t.pt === id);
}
function propRow(label, ...els) {
  const r = document.createElement('div');
  r.className = 'row';
  const l = document.createElement('label');
  l.textContent = label;
  r.append(l, ...els);
  return r;
}
// Cambia una propiedad del elemento abierto (con deshacer) y refresca el dibujo.
function propSet(fn) {
  const o = propObj();
  if (!o) return;
  pushUndo(); fn(o); afterChange();
}
function propSelect(options, value, onChange) {
  const sl = document.createElement('select');
  for (const [v, t] of options) { const o = document.createElement('option'); o.value = v; o.textContent = t; sl.appendChild(o); }
  sl.value = value;
  sl.onchange = () => onChange(sl.value);
  return sl;
}
function propNumber(value, onChange, attrs = {}) {
  const i = document.createElement('input');
  i.type = 'number'; i.step = 'any'; i.value = value === '' || value === undefined ? '' : String(Math.round(value * 1000) / 1000);
  Object.assign(i, attrs);
  i.onchange = () => onChange(i.value, i);
  return i;
}
function propColors(o, field) {
  const wrap = colorPicker({ value: () => o[field] || 'auto', pick: (v) => propSet((x) => { x[field] = v; }) });
  wrap.style.flex = '2 1 220px';
  return wrap;
}
// Textos a los que se aplica un cambio en la ventana de propiedades: el abierto y los demas textos seleccionados.
function txTargets() {
  const ids = new Set([...(propT?.k === 'tx' ? [propT.id] : []), ...sel.filter((s) => s.k === 'tx').map((s) => s.id)]);
  return [...ids].map((id) => doc.texts[id]).filter(Boolean);
}
// Cambia una propiedad de esos textos (con deshacer); altura, angulo, anclaje, legible y fuente quedan ademas
// como los de los textos nuevos.
function txSet(prop, value) {
  const ts = txTargets();
  if (!ts.length) return;
  if (['h', 'ang', 'anchor', 'readable', 'font'].includes(prop) && !(prop === 'ang' && ts.some((t) => t.ref))) cur.tx[prop] = value;
  pushUndo();
  ts.forEach((t) => { if (value === undefined) delete t[prop]; else t[prop] = value; });
  afterChange();
}
// Color de un texto: las mismas muestras para la fuente o para el fondo, segun el boton de radio elegido.
// En el fondo, «Auto» es el color del papel (tapa lo de abajo) y «Sin fondo» lo quita.
let txColorField = 'color';
function textColors() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;align-items:center;flex:2 1 180px';
  const radios = document.createElement('div');
  radios.style.cssText = 'display:flex;gap:14px;flex:1 1 100%';
  const cur0 = () => propObj()?.[txColorField] || (txColorField === 'color' ? 'auto' : '');
  const none = document.createElement('button');
  none.type = 'button'; none.textContent = 'Sin fondo'; none.title = 'Sin color de fondo (transparente)';
  none.onclick = () => { txSet('bg', undefined); mark(); };
  const sw = colorPicker({ value: cur0, pick: (v) => { txSet(txColorField, v); mark(); }, extra: [none] });
  const mark = () => {
    const v = cur0();
    none.style.display = txColorField === 'bg' ? '' : 'none';
    none.setAttribute('aria-pressed', String(txColorField === 'bg' && !v));
    sw.querySelector('.cp-auto').title = txColorField === 'bg' ? 'Auto: color del papel (tapa lo que quede debajo)' : 'Auto';
    sw.refresh();
  };
  for (const [field, name] of [['color', 'Color de fuente'], ['bg', 'Color de fondo']]) {
    const lab = document.createElement('label'), r = document.createElement('input');
    lab.style.cssText = 'display:flex;gap:6px;align-items:center;font-size:13px;flex:none;min-width:0';
    r.type = 'radio'; r.name = 'txColorField'; r.value = field; r.checked = txColorField === field;
    r.style.cssText = 'width:20px;height:20px;min-height:20px;margin:0';
    r.onchange = () => { if (r.checked) { txColorField = field; mark(); } };
    lab.append(r, document.createTextNode(name));
    radios.appendChild(lab);
  }
  wrap.append(radios, sw);
  mark();
  return wrap;
}
function renderPropCons() {
  const box = $('prCons');
  box.textContent = '';
  if (!propT) return;
  const list = Object.entries(doc.cons).filter(([, k]) => (k.refs || []).includes(propT.id));
  $('prConsH').style.display = list.length ? '' : 'none';
  for (const [kid, k] of list) {
    const row = document.createElement('div');
    row.className = 'row';
    const lb = document.createElement('span');
    lb.style.flex = '1 1 160px'; lb.textContent = conLabel(doc, k);
    const del = document.createElement('button');
    del.type = 'button'; del.textContent = 'Quitar'; del.title = 'Quitar esta restricción';
    del.onclick = () => { pushUndo(); delete doc.cons[kid]; afterChange(); renderPropCons(); };
    if (FINITE_TYPES.includes(k.t) && !k.ref) { // «solo dentro de los limites»: la relacion deja de valer fuera del segmento o del arco
      const lab = document.createElement('label'), cb = document.createElement('input');
      lab.style.cssText = 'display:flex;gap:6px;align-items:center;font-size:12px;flex:none';
      lab.title = 'La relación solo vale mientras los elementos se tocan gráficamente, dentro de los límites del segmento o del arco; fuera, quedan libres';
      cb.type = 'checkbox'; cb.checked = !!k.finite; cb.style.cssText = 'width:20px;height:20px;min-height:20px;margin:0';
      const apply = () => {
        const ok = (hasReactive(doc) ? settle(doc, solve, []) : solve(doc, [])).ok;
        if (!ok) { rollback(); toast('No se pudo: entra en conflicto con otras restricciones'); }
        afterChange(); renderPropCons();
      };
      cb.onchange = () => { pushUndo(); if (cb.checked) k.finite = true; else { delete k.finite; delete k.stop; } apply(); };
      lab.append(cb, document.createTextNode('Solo en los límites'));
      row.append(lb, lab);
      if (k.finite) { // «tope en bordes»: al salirse por un borde el elemento se detiene ahi en vez de quedar libre
        const lab2 = document.createElement('label'), cb2 = document.createElement('input');
        lab2.style.cssText = lab.style.cssText;
        lab2.title = 'Al llegar al extremo del segmento o del arco el contacto se detiene ahí (el punto no pasa del extremo; el extremo del segmento o del arco se apoya en el otro elemento) en vez de quedar libre';
        cb2.type = 'checkbox'; cb2.checked = !!k.stop; cb2.style.cssText = cb.style.cssText;
        cb2.onchange = () => { pushUndo(); if (cb2.checked) k.stop = true; else delete k.stop; apply(); };
        lab2.append(cb2, document.createTextNode('Tope en bordes'));
        row.append(lab2);
      }
      row.append(del);
    } else row.append(lb, del);
    box.appendChild(row);
  }
}
// Tras mover marcas a mano: se actualizan las cotas que leen medidas (formulas) y los angulos continuos.
function relaxMarks() {
  const r = hasReactive(doc) ? settle(doc, solveSteps, [], { maxIter: 20 }) : solve(doc, []);
  if (r.ok) trackAngles(doc);
}

function openProps(h) {
  propT = { k: h.k, id: h.id };
  const o = propObj();
  if (!o) { propT = null; return; }
  $('prTitle').textContent = `${h.k === 'ln' && o.vec ? 'Vector' : PROP_NAMES[h.k]}${h.k === 'el' && isPartial(o) ? ' (arco elíptico)' : ''} ${h.id}`;
  const body = $('prBody');
  body.textContent = '';
  const k = h.k;
  // capa (un punto que forma parte de un elemento sigue la capa de ese elemento)
  if (k !== 'pt' || !pointOwned(h.id)) {
    const lopts = [['', 'Ninguna'], ...Object.entries(doc.layers || {}).map(([id, l]) => [id, l.name + (l.on ? '' : ' (apagada)')])];
    body.appendChild(propRow('Capa', propSelect(lopts, o.layer && doc.layers?.[o.layer] ? o.layer : '', (v) => {
      propSet((x) => { if (v) x.layer = v; else delete x.layer; });
      if (isHidden(doc, propObj())) { $('dlgR').close(); sel = []; afterChange(); toast('El elemento quedó en una capa apagada: se ocultó'); }
    })));
  }
  if (k === 'ln' && o.vec && doc.cons[o.vec.d]) { // magnitud del vector: su cota (D1...), de solo lectura o fija
    // Unidad y Escala: «30» en kN con escala 1'mm/kN dibuja 30 mm y dice «30 kN»; de solo lectura, la medida entre la escala en esa unidad
    const kid = o.vec.d, K = () => doc.cons[kid];
    const inpt = (ph) => { const e = document.createElement('input'); e.type = 'text'; e.autocomplete = 'off'; e.spellcheck = false; e.autocapitalize = 'off'; e.inputMode = 'text'; e.style.flex = '1 1 120px'; if (ph) e.placeholder = ph; return e; };
    const mag = inpt(), un = inpt('sin unidad; kN, N, m/s...'), scl = inpt("vacío = sin escala; 1'mm/kN, eF"), fix = document.createElement('input'), nm = inpt();
    fix.type = 'checkbox'; fix.style.cssText = 'width:22px;height:22px;min-height:22px;margin:0;flex:none'; fix.checked = !K().ref;
    nm.value = K().name || '';
    const showVal = () => {
      const q = K(), t = q.expr && !q.ref ? splitUnit(q.expr) : null;
      un.value = dimUnit(q.du) ? q.du : '';
      scl.value = q.scale > 0 && q.scale !== 1 ? (q.scaleExpr ?? String(q.scale)) : '';
      mag.value = q.expr && !q.ref ? (t && t.unit === q.du ? t.body.trim() : q.expr) : dimUnreadable(q) ? '⚠' : String(Math.round(dimShown(doc, q) * 1e6) / 1e6);
    };
    showVal();
    const apply = (mutate) => { // cambia la cota con deshacer; si el solver no la acepta, se deshace
      pushUndo(); mutate(K());
      const r = settle(doc, solve, []);
      if (!r.ok) { rollback(); toast(r.error || 'Valor imposible con las restricciones actuales'); afterChange(); showVal(); fix.checked = !K().ref; return false; }
      afterChange(); showVal(); fix.checked = !K().ref; return true;
    };
    const setScale = (q, s, src) => { if (s) { q.scale = s.sc; if (isPlainNumber(src)) delete q.scaleExpr; else q.scaleExpr = src; if (s.rep) q.srep = true; else delete q.srep; } else { delete q.scale; delete q.scaleExpr; delete q.srep; } delete q.serr; };
    // fixed: escribir la magnitud la fija; cambiar solo la unidad o la escala de una de solo lectura cambia lo que lee
    const commit = (fixed) => {
      const body = mag.value.trim(), unit = un.value.trim(), scs = scl.value.trim(), vars = varsOf(doc, kid);
      if (unit && !dimUnit(unit)) { toast(`No conozco la unidad «${unit}»`); showVal(); return; }
      if (K().ref && !fixed) {
        let s = null;
        if (scs) { try { s = scaleEval(scs, vars, dimUnit(unit)?.d); } catch (e) { toast('Escala: ' + e.message); showVal(); return; } }
        if (apply((q) => { if (unit) q.du = unit; else delete q.du; setScale(q, s, scs); }) && dimUnreadable(K())) toast(`Para leer la medida en ${unit} hace falta una escala con unidades, p. ej. 1'mm/${unit}`);
        return;
      }
      const expr = unit && !splitUnit(body) ? `${body}'${unit}` : body;
      let r, s = null;
      try { r = dimEval(expr, vars); if (scs) s = scaleEval(scs, vars, r.d); } catch (e) { toast(e.message); showVal(); return; }
      const v = Number((r.v * (s ? s.sc : 1)).toPrecision(12));
      if (!(v > 0)) { toast('La magnitud debe ser mayor que cero'); showVal(); return; }
      const warn = noScaleWarn(r.d, r.du, r.v, s?.rep);
      if (apply((q) => { q.v = v; delete q.ref; if (isPlainNumber(expr) && !(s && !isPlainNumber(scs))) delete q.expr; else q.expr = expr; if (r.du) q.du = r.du; else delete q.du; setScale(q, s, scs); }) && warn) toast(warn); // escribir un valor la fija
    };
    mag.onchange = () => commit(true);
    un.onchange = () => commit(false);
    scl.onchange = () => commit(false);
    fix.onchange = () => {
      if (fix.checked) { // fija la medida actual (con su unidad y escala, si las tiene)
        const q = K();
        if (dimUnreadable(q)) { toast('Pon primero una escala con unidades'); fix.checked = false; return; }
        const shown = Math.round(dimShown(doc, q) * 1e9) / 1e9;
        apply((x) => { x.v = dimValue(doc, { ...x, ref: true }); delete x.ref; if (x.du || x.scaleExpr) x.expr = x.du ? `${shown}'${x.du}` : String(shown); });
      } else apply((q) => { q.ref = true; delete q.expr; });
    };
    nm.onchange = () => {
      const n = nm.value.trim(), er = checkName(doc, n, kid);
      if (er) { toast(er); nm.value = K().name || ''; return; }
      pushUndo(); renameDim(doc, kid, n); afterChange();
    };
    body.appendChild(propRow('Magnitud', mag));
    body.appendChild(propRow('Unidad', un));
    body.appendChild(propRow('Escala', scl));
    body.appendChild(propRow('Magnitud fija (restringe la longitud)', fix));
    body.appendChild(propRow('Nombre de la magnitud', nm));
  }
  if (['ln', 'ci', 'ar', 'el', 'sp'].includes(k)) {
    body.appendChild(propRow('Color', propColors(o, 'color')));
    body.appendChild(propRow('Tipo de línea', propSelect(Object.entries(allLtypes(doc)).map(([v, t]) => [v, t.label]), o.ltype in allLtypes(doc) ? o.ltype : 'continua', (v) => {
      propSet((x) => { x.ltype = v; if (v === 'constructiva') { x.color = CLINE_STYLE.color; x.w = CLINE_STYLE.w; } });
    })));
    body.appendChild(propRow('Grosor', propSelect([['1', 'Fino'], ['2', 'Normal'], ['3.5', 'Grueso']], String([1, 2, 3.5].includes(o.w) ? o.w : 2), (v) => propSet((x) => { x.w = Number(v); }))));
    const rg = document.createElement('input');
    rg.type = 'range'; rg.min = '0.2'; rg.max = '3'; rg.step = '0.1'; rg.value = String(o.ls ?? 1);
    rg.onchange = () => propSet((x) => { x.ls = Number(rg.value); });
    body.appendChild(propRow('Escala del patrón', rg));
  }
  if (k === 'sp') { // forma fija: los puntos de control quedan amarrados entre si (la curva no se deforma al arrastrar)
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = isRigid(doc, h.id); cb.style.cssText = 'width:22px;height:22px;min-height:22px;margin:0;flex:none';
    cb.onchange = () => {
      pushUndo();
      if (cb.checked) {
        const r = rigidShape(doc, h.id);
        if (!r.ok) { rollback(); toast(r.msg); cb.checked = false; afterChange(); return; }
        const s = settle(doc, solve, []);
        if (!s.ok) { rollback(); toast('La forma fija contradice las restricciones del dibujo'); cb.checked = false; afterChange(); return; }
      } else looseShape(doc, h.id);
      afterChange();
    };
    body.appendChild(propRow('Forma fija (no se deforma al mover sus puntos)', cb));
  }
  if (k === 'tx') {
    body.appendChild(propRow('Color', textColors()));
    const ta = document.createElement('textarea');
    // el cuadro ocupa todo el ancho de la ventana (en su propia linea, bajo «Texto») y crece con las lineas del texto (de 3 a 14)
    ta.value = o.text;
    ta.style.cssText = 'flex:1 1 auto;min-width:0;width:100%;box-sizing:border-box;min-height:56px;padding:6px 8px;border:0;border-radius:0;background:transparent;color:var(--fg);font:inherit;line-height:1.4;resize:vertical;outline-offset:-2px';
    // el campo va en un marco con una columna de numeros de linea a la izquierda (solo en un script: ver taFont)
    const taBox = document.createElement('div'), gut = document.createElement('div');
    taBox.style.cssText = 'flex:1 1 100%;width:100%;display:flex;align-items:stretch;border:1px solid var(--line);border-radius:8px;background:var(--btn);overflow:hidden';
    gut.style.cssText = 'flex:none;padding:6px 6px 6px 8px;text-align:right;color:var(--muted);border-right:1px solid var(--line);user-select:none;-webkit-user-select:none;overflow:hidden;white-space:pre;font:inherit;line-height:1.4';
    gut.setAttribute('aria-hidden', 'true');
    taBox.append(gut, ta);
    const taErr = document.createElement('div'); // el error de sintaxis de un script, bajo el campo
    taErr.style.cssText = 'flex:1 1 100%;color:var(--warn);font-size:14px;margin-top:4px';
    const taRows = () => { ta.rows = Math.max(3, Math.min(14, ta.value.split('\n').length + 1)); };
    taRows(); ta.addEventListener('input', taRows);
    attachAutoPair(ta); // lo guardado: texto con Markdown y formulas entre $...$
    // un script se edita como codigo: monoespaciada, Enter con sangria, Tab; al salir del campo se colapsa (salvo «Mostrar el código»)
    const isSc = () => ta.value[0] === '%';
    // en un script: numeros de linea (el de la linea con un error de sintaxis, en rojo) y sin partir las lineas largas, para que cada
    // numero quede a la altura de su linea (las largas se recorren de lado)
    const taFont = () => {
      const sc = isSc();
      ta.style.fontFamily = gut.style.fontFamily = sc ? fontCss('mono') : '';
      ta.spellcheck = !sc; ta.wrap = sc ? 'off' : 'soft'; ta.style.whiteSpace = sc ? 'pre' : '';
      gut.hidden = !sc;
      const err = sc ? parseScript(ta.value).err || '' : '';
      taErr.textContent = err ? '⚠ ' + err : ''; taErr.hidden = !err;
      if (!sc) return;
      const bad = Number(/^línea (\d+)/.exec(err)?.[1] || 0);
      gut.innerHTML = ta.value.split('\n').map((_, i) => (i + 1 === bad ? `<b style="color:var(--warn)">${i + 1}</b>` : String(i + 1))).join('\n');
      gut.scrollTop = ta.scrollTop;
    };
    taFont(); ta.addEventListener('input', taFont);
    ta.addEventListener('scroll', () => { gut.scrollTop = ta.scrollTop; });
    ta.addEventListener('keydown', (e) => { if (isSc()) codeKeyEvent(e, ta); });
    ta.onchange = () => {
      if (!ta.value.trim()) { ta.value = propObj().text; return; }
      const before = textVarErrors(doc);
      pushUndo(); propObj().text = ta.value;
      if (isSc() && !shc.checked) delete propObj().open;
      if (textEditOk(before)) afterChange();
    };
    if (o.lib) libPropRows(body, propT.id, o); else body.appendChild(propRow('Texto', taBox, taErr)); // una biblioteca no se edita como texto
    const shc = document.createElement('input');
    shc.type = 'checkbox'; shc.checked = !!o.open; shc.style.cssText = 'width:22px;height:22px;min-height:22px;margin:0;flex:none';
    shc.onchange = () => { pushUndo(); if (shc.checked) propObj().open = true; else delete propObj().open; afterChange(); };
    if (isScript(o.text)) body.appendChild(propRow('Mostrar el código en el dibujo (si no, solo su nombre)', shc));
    else if (o.lib) body.appendChild(propRow('Mostrar sus nombres públicos en el dibujo (si no, solo su nombre)', shc));
    body.appendChild(propRow('Fuente', propSelect(FONTS.map((f) => [f[0], f[1]]), o.font || '', (v) => txSet('font', v))));
    if (globalDoc().page) body.appendChild(propRow('Altura (pt)', propNumber(ptOf(o.h), (v, i) => { const n = Number(v); if (n > 0) txSet('h', n * PT); else i.value = String(ptOf(propObj().h)); }, { min: '1', step: '0.5' })));
    else body.appendChild(propRow('Altura', propNumber(o.h, (v, i) => { const n = Number(v); if (n > 0) txSet('h', n); else i.value = String(propObj().h); }, { min: '0.01' })));
    body.appendChild(propRow(o.ref ? 'Desfase °' : 'Ángulo °', propNumber(o.ang, (v) => txSet('ang', Number(v) || 0))));
    // alinear con una linea (el angulo pasa a ser un desfase); «Ninguna» la suelta conservando la orientacion actual
    const lopts = [['', 'Ninguna (ángulo libre)'], ...Object.entries(doc.lines).map(([id, l]) => [id, `${l.vec ? 'Vector' : 'Línea'} ${id} · L = ${fmt(dist(doc.pts[l.a], doc.pts[l.b]))}`])];
    body.appendChild(propRow('Alinear con', propSelect(lopts, o.ref && doc.lines[o.ref] ? o.ref : '', (v) => {
      const ts = txTargets();
      pushUndo();
      ts.forEach((t) => { if (v) { t.ref = v; t.ang = 0; } else if (t.ref) { t.ang = rawAngle(doc, t); delete t.ref; } });
      afterChange(); openProps(h); // la etiqueta Ángulo/Desfase cambia
    })));
    const rd = document.createElement('input');
    rd.type = 'checkbox'; rd.checked = o.readable !== false; rd.style.cssText = 'width:22px;height:22px;min-height:22px;margin:0;flex:none';
    rd.onchange = () => txSet('readable', rd.checked);
    body.appendChild(propRow('Legible (gira 180° el texto que quedaría boca abajo)', rd));
    if (!isScript(o.text) && !o.lib) { // «expr=» se dibuja como su valor solo: para un tablero o una tabla de resultados
      const vo = document.createElement('input');
      vo.type = 'checkbox'; vo.checked = !!o.valOnly; vo.style.cssText = 'width:22px;height:22px;min-height:22px;margin:0;flex:none';
      vo.onchange = () => { pushUndo(); if (vo.checked) propObj().valOnly = true; else delete propObj().valOnly; afterChange(); };
      body.appendChild(propRow('Mostrar solo el resultado (expr= se dibuja como su valor)', vo));
    }
    const an = document.createElement('div');
    an.className = 'txa';
    const markA = () => [...an.children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.a === (propObj()?.anchor || 'bl'))));
    ANCHORS.forEach((a) => {
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.a = a; b.title = 'Punto de inserción: ' + ANCHOR_NAMES[a]; b.setAttribute('aria-label', b.title);
      const x = { l: 5, c: 12, r: 19 }[a[1]], y = { t: 5, m: 12, b: 19 }[a[0]];
      b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="5" y="5" width="14" height="14" rx="1" opacity=".55"/><circle cx="${x}" cy="${y}" r="3" fill="currentColor"/></svg>`;
      b.onclick = () => { txSet('anchor', a); markA(); };
      an.appendChild(b);
    });
    markA();
    body.appendChild(propRow('Punto de inserción', an));
  }
  if (k === 'pt') {
    body.appendChild(propRow('Color', propColors(o, 'color')));
    const fill = () => { xi.value = String(Math.round(propObj().x * 1000) / 1000); yi.value = String(Math.round(propObj().y * 1000) / 1000); };
    const move = () => {
      const x = Number(xi.value), y = Number(yi.value);
      if (xi.value === '' || yi.value === '' || !Number.isFinite(x) || !Number.isFinite(y)) { fill(); return; }
      pushUndo();
      const p = doc.pts[h.id];
      p.x = x; p.y = y;
      const r = solve(doc, p.fixed ? [] : [{ id: h.id, x, y }]);
      if (!r.ok) { rollback(); toast('Esa posición contradice las restricciones'); fill(); draw(); return; }
      afterChange(); fill();
    };
    const xi = propNumber(o.x, move), yi = propNumber(o.y, move);
    body.appendChild(propRow('X', xi));
    body.appendChild(propRow('Y', yi));
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = !!o.fixed; cb.style.cssText = 'width:22px;height:22px;min-height:22px;margin:0;flex:none';
    cb.onchange = () => propSet((x) => { x.fixed = cb.checked; });
    body.appendChild(propRow('Fijo (no se mueve al arrastrar)', cb));
    // Marca de referencia: se desliza solo a lo largo de una linea y recuerda lo recorrido
    const lines = Object.entries(doc.lines).filter(([, l]) => l.a !== h.id && l.b !== h.id);
    const opts = [['', 'Ninguna'], ...lines.map(([id, l]) => [id, `${l.vec ? 'Vector' : 'Línea'} ${id} · L = ${fmt(dist(doc.pts[l.a], doc.pts[l.b]))}`])];
    body.appendChild(propRow('Marca de referencia en', propSelect(opts, isMark(doc, h.id) ? o.mark : '', (v) => {
      propSet((x) => { if (v) assignMark(doc, h.id, v); else { delete x.mark; delete x.mark0; } });
      openProps(h); // los botones de la referencia aparecen o se van
    })));
    if (isMark(doc, h.id)) {
      const mkBtn = (txt, tip, fn) => { const b = document.createElement('button'); b.textContent = txt; b.title = tip; b.onclick = fn; return b; };
      body.appendChild(propRow('Referencia de la marca',
        mkBtn('Reiniciar', 'Devuelve la marca a su referencia sobre la línea', () => { propSet(() => { resetMarks(doc, [h.id]); relaxMarks(); }); openProps(h); }),
        mkBtn('Tomar la actual', 'La posición actual de la marca pasa a ser su referencia', () => { propSet(() => setMarkRef(doc, h.id)); openProps(h); })));
    }
  }
  if (k === 'ha') {
    const sm = document.createElement('small');
    sm.textContent = 'El patrón del relleno se cambia en el panel (sección Relleno) con el relleno seleccionado.';
    body.appendChild(sm);
  }
  // restricciones que se pueden asignar a este elemento solo
  const add = $('prAdd');
  add.textContent = '';
  const ADD = { ln: [['H', 'Horizontal'], ['V', 'Vertical'], ['DIM', 'Longitud'], ['FIX', 'Fijar / soltar']], ci: [['RAD', 'Diámetro'], ['FIX', 'Fijar / soltar']], ar: [['RAD', 'Radio']] }[k] || [];
  const has = (t) => Object.values(doc.cons).some((c) => c.t === t && c.refs.length === 1 && c.refs[0] === h.id);
  for (const [t, name] of ADD) {
    if ((t === 'H' || t === 'V') && has(t)) continue; // ya la tiene: se quita desde la lista
    const b = document.createElement('button');
    const own = t === 'RAD' && Object.values(doc.cons).some((c) => c.t === 'RAD' && !c.ref && c.refs[0] === h.id);
    b.type = 'button'; b.textContent = name; b.title = own ? 'Cambiar la cota de ' + name.toLowerCase() + ' que ya tiene' : 'Agregar: ' + name;
    b.onclick = () => { $('dlgR').close(); sel = [{ k, id: h.id }]; afterChange(); applyCon(t); };
    add.appendChild(b);
  }
  renderPropCons();
  if (!$('dlgR').open) $('dlgR').showModal();
}
$('dlgR').addEventListener('close', () => { if (!$('dlgR').open) propT = null; }); // el evento llega tarde: no pisar una ventana reabierta
$('dlgR').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); e.target.blur(); } });

// ---- filtro de seleccion ----
const FKINDS = [['pt', 'Puntos'], ['ln', 'Líneas'], ['ci', 'Círculos'], ['ar', 'Arcos'], ['el', 'Elipses'], ['sp', 'Splines'], ['tx', 'Textos'], ['ha', 'Rellenos'], ['co', 'Cotas y restricciones'], ['ac', 'Actuadores y gráficas']];
function openFilter() {
  const kb = $('flKinds'), lb = $('flLt');
  kb.textContent = ''; lb.textContent = '';
  const mk = (parent, key, label, on) => {
    const l = document.createElement('label'), i = document.createElement('input');
    l.style.cssText = 'display:flex;gap:8px;align-items:center;min-height:36px;font-size:14px';
    i.type = 'checkbox'; i.checked = on; i.dataset.key = key; i.style.cssText = 'width:22px;height:22px;min-height:22px;margin:0;flex:none';
    l.append(i, document.createTextNode(label)); parent.appendChild(l);
  };
  for (const [k, n] of FKINDS) mk(kb, k, n, fkOn(k));
  for (const [k, v] of Object.entries(allLtypes(doc))) mk(lb, k, v.label, !(opts.filtLt || []).includes(k));
  $('dlgF').showModal();
}
$('flAll').onclick = () => $('dlgF').querySelectorAll('input[type=checkbox]').forEach((i) => { i.checked = true; });
$('flNone').onclick = () => $('dlgF').querySelectorAll('input[type=checkbox]').forEach((i) => { i.checked = false; });
$('flCancel').onclick = () => $('dlgF').close();
$('flOk').onclick = (ev) => {
  ev.preventDefault();
  opts.filtKinds = [...$('flKinds').querySelectorAll('input')].filter((i) => !i.checked).map((i) => i.dataset.key);
  opts.filtLt = [...$('flLt').querySelectorAll('input')].filter((i) => !i.checked).map((i) => i.dataset.key);
  $('dlgF').close(); refreshGroups(); persist();
  toast(opts.filtKinds.length || opts.filtLt.length ? 'Filtro de selección activo' : 'Sin filtro: se puede seleccionar todo');
};
document.querySelectorAll('[data-con]').forEach((b) => { b.onclick = () => applyCon(b.dataset.con); });
$('mksplit').onclick = splitSelected;

// ---- matriz lineal ----
// Muestra el dialogo con el estado st; devuelve 'ok', 'cancel', 'pick1' o 'pick2' (elegir la linea de una direccion).
const lineName = (id) => { const l = doc.lines[id]; return `Línea ${id} · L = ${fmt(dist(doc.pts[l.a], doc.pts[l.b]))}`; };
let circC = null; // centro de la matriz circular mientras se define
let arrAxes = null; // direcciones elegidas de la matriz: se resaltan en el lienzo mientras se define
function showArrayDialog(st, count) {
  return new Promise((resolve) => {
    const dlg = $('dlgA');
    const name = (id) => (id && doc.lines[id] ? lineName(id) : null);
    const upd = () => { read(); arrAxes = { l1: st.l1, l2: st.l2, f1: st.f1, f2: st.f2 }; draw(); };
    $('arrF1').onchange = upd; $('arrF2').onchange = upd;
    arrAxes = { l1: st.l1, l2: st.l2, f1: st.f1, f2: st.f2 }; draw();
    $('arrInfo').textContent = `${count} elemento${count === 1 ? '' : 's'} a copiar`;
    $('arrD1').textContent = name(st.l1) || 'Horizontal (eje X)';
    $('arrD2').textContent = name(st.l2) || 'Perpendicular a la dirección 1';
    $('arrS1').value = st.s1; $('arrN1').value = st.n1; $('arrF1').checked = st.f1;
    $('arrS2').value = st.s2; $('arrN2').value = st.n2; $('arrF2').checked = st.f2;
    $('arrLink').checked = st.link; $('arrDims').checked = st.dims;
    $('arrErr').textContent = '';
    mountVarPicker('arrVars', 'dlgA', ['arrS1', 'arrN1', 'arrS2', 'arrN2'], null);
    const read = () => { st.s1 = $('arrS1').value; st.n1 = $('arrN1').value; st.f1 = $('arrF1').checked; st.s2 = $('arrS2').value; st.n2 = $('arrN2').value; st.f2 = $('arrF2').checked; st.link = $('arrLink').checked; st.dims = $('arrDims').checked; };
    let done = false;
    const finish = (v) => { if (done) return; done = true; read(); dlg.close(); if (v === 'ok' || v === 'cancel') arrAxes = null; draw(); resolve(v); };
    $('arrOk').onclick = (ev) => { ev.preventDefault(); finish('ok'); };
    $('arrCancel').onclick = () => finish('cancel');
    $('arrPick1').onclick = () => finish('pick1');
    $('arrPick2').onclick = () => finish('pick2');
    dlg.oncancel = () => finish('cancel');
    dlg.showModal(); $('arrS1').focus();
  });
}

const readIntField = (txt, label, min, max) => readInt(doc, txt, label, min, max);

// Lee espaciado y copias de una direccion; devuelve null si esta vacia, o {err} si es invalida.
function readArrayDir(lineId, base, sTxt, nTxt, flip) {
  if (!String(sTxt).trim()) return null;
  let s;
  try { s = parseValue(sTxt, { vars: varsOf(doc) }); } catch (e) { return { err: 'Espaciado: ' + e.message }; }
  if (!(Math.abs(s) > 1e-9)) return { err: 'El espaciado debe ser distinto de 0' };
  let n = 2; // solo el espaciado: 2 en total, con el original
  if (String(nTxt).trim() !== '') { const r = readIntField(nTxt, 'Número total', 2, 200); if (r.err) return r; n = r.n; }
  n -= 1; // copias nuevas
  let u = base;
  if (lineId) {
    const l = doc.lines[lineId], A = doc.pts[l.a], B = doc.pts[l.b], len = dist(A, B);
    if (len < 1e-9) return { err: 'La línea de dirección no tiene longitud' };
    u = { x: (B.x - A.x) / len, y: (B.y - A.y) / len };
  }
  if (flip) u = { x: -u.x, y: -u.y };
  return { u, s, n, line: lineId || null };
}

async function linearArrayCmd() {
  const items = sel.filter((x) => ['pt', 'ln', 'ci', 'ar', 'sp', 'tx', 'el'].includes(x.k));
  if (!items.length) { toast('Selecciona lo que quieres copiar'); return; }
  const st = { l1: null, l2: null, s1: '', n1: '', f1: false, s2: '', n2: '', f2: false, link: opts.arrLink !== false, dims: !!opts.arrDims };
  for (;;) {
    const act = await showArrayDialog(st, items.length);
    if (act === 'cancel') return;
    if (act === 'pick1' || act === 'pick2') {
      const h = await pickLine(act === 'pick1' ? 'Toca la línea que da la dirección 1' : 'Toca la línea que da la dirección 2');
      if (h) st[act === 'pick1' ? 'l1' : 'l2'] = h.id; else toast('No se eligió ninguna línea');
      continue;
    }
    const d1 = readArrayDir(st.l1, { x: 1, y: 0 }, st.s1, st.n1, st.f1);
    if (!d1) { toast('Escribe el espaciado de la dirección 1'); continue; }
    if (d1.err) { toast(d1.err); continue; }
    const base2 = { x: -d1.u.y, y: d1.u.x };
    const d2 = readArrayDir(st.l2, base2, st.s2, st.n2, st.f2);
    if (d2?.err) { toast(d2.err); continue; }
    if (d2 && Math.abs(d1.u.x * d2.u.y - d1.u.y * d2.u.x) < 1e-6) { toast('Las dos direcciones no pueden ser paralelas'); continue; }
    pushUndo();
    opts.arrLink = st.link; opts.arrDims = st.dims;
    const r = linearArray(doc, items, d2 ? [d1, d2] : [d1], { link: st.link, dims: st.dims });
    if (!r.ok) { rollback(); toast(r.msg); continue; }
    if (!solve(doc, []).ok) { rollback(); toast('Conflicto con las restricciones: se deshizo la matriz'); afterChange(); return; }
    sel = [];
    const nc = (d1.n + 1) * ((d2 ? d2.n : 0) + 1) - 1;
    toast(`${nc} copia${nc === 1 ? '' : 's'} creada${nc === 1 ? '' : 's'}`);
    afterChange();
    return;
  }
}
$('mkarr').onclick = linearArrayCmd;

// ---- matriz circular ----
function showCircDialog(st, count) {
  return new Promise((resolve) => {
    const dlg = $('dlgC');
    $('cirInfo').textContent = `${count} elemento${count === 1 ? '' : 's'} a copiar`;
    $('cirC').textContent = st.c ? (st.c.id ? `Punto ${st.c.id} (${fmt(st.c.x)}, ${fmt(st.c.y)})` : `(${fmt(st.c.x)}, ${fmt(st.c.y)})`) : 'Origen (0, 0)';
    $('cirLink').checked = st.link; $('cirDims').checked = st.dims;
    mountVarPicker('cirVars', 'dlgC', ['cirT', 'cirN', 'cirS', 'cirK'], null);
    $('cirT').value = st.t; $('cirN').value = st.n; $('cirEq').checked = st.eq; $('cirS').value = st.s; $('cirRev').checked = st.rev; $('cirK').value = st.k;
    circC = st.c || { x: 0, y: 0 }; draw();
    const read = () => { st.t = $('cirT').value; st.n = $('cirN').value; st.eq = $('cirEq').checked; st.s = $('cirS').value; st.rev = $('cirRev').checked; st.k = $('cirK').value; st.link = $('cirLink').checked; st.dims = $('cirDims').checked; };
    const sync = () => { $('cirStepRow').style.display = $('cirEq').checked ? 'none' : 'flex'; };
    $('cirEq').onchange = sync; sync();
    let done = false;
    const finish = (v) => { if (done) return; done = true; read(); dlg.close(); if (v !== 'pick') circC = null; draw(); resolve(v); };
    $('cirOk').onclick = (ev) => { ev.preventDefault(); finish('ok'); };
    $('cirCancel').onclick = () => finish('cancel');
    $('cirPick').onclick = () => finish('pick');
    dlg.oncancel = () => finish('cancel');
    dlg.showModal(); $('cirN').focus();
  });
}

async function circularCmd() {
  const items = sel.filter((x) => ['pt', 'ln', 'ci', 'ar', 'sp', 'tx', 'el'].includes(x.k));
  if (!items.length) { toast('Selecciona lo que quieres copiar'); return; }
  const st = { c: null, t: '360', n: '', eq: true, s: '', rev: false, k: '', link: opts.arrLink !== false, dims: !!opts.arrDims };
  for (;;) {
    const act = await showCircDialog(st, items.length);
    if (act === 'cancel') return;
    if (act === 'pick') {
      circC = st.c || { x: 0, y: 0 };
      const h = await pickLine('Toca el punto (o un lugar libre) que es el centro de la matriz', 'pt');
      if (h) st.c = h; else toast('No se eligió centro');
      continue;
    }
    let T, n = 4, stepDeg;
    try { T = parseValue(st.t, { angle: true, vars: varsOf(doc) }); } catch (e) { toast('Ángulo total: ' + e.message); continue; }
    if (!(T > 0) || T > 360 + 1e-9) { toast('El ángulo total debe estar entre 0° y 360°'); continue; }
    if (String(st.n).trim() !== '') { const r = readIntField(st.n, 'Número total', 2, 200); if (r.err) { toast(r.err); continue; } n = r.n; }
    if (st.eq) stepDeg = T >= 360 - 1e-9 ? T / n : T / (n - 1);
    else {
      try { stepDeg = parseValue(st.s, { angle: true, vars: varsOf(doc) }); } catch (e) { toast('Ángulo entre instancias: ' + e.message); continue; }
      if (!(Math.abs(stepDeg) > 1e-9)) { toast('El ángulo entre instancias debe ser distinto de 0'); continue; }
    }
    if (st.rev) stepDeg = -stepDeg;
    const skip = new Set(); let skipErr = null;
    for (const tk of splitTop(st.k)) { const r = readIntField(tk, 'Omitir', 2, n); if (r.err) { skipErr = r.err + ' (el 1 es el original)'; break; } skip.add(r.n); }
    if (skipErr) { toast(skipErr); continue; }
    pushUndo();
    opts.arrLink = st.link; opts.arrDims = st.dims;
    const r = circularArray(doc, items, { c: st.c || { x: 0, y: 0 }, step: (stepDeg * Math.PI) / 180, n, skip, link: st.link, cid: st.c?.id || null, dims: st.dims });
    if (!r.ok) { rollback(); toast(r.msg); continue; }
    if (!solve(doc, []).ok) { rollback(); toast('Conflicto con las restricciones: se deshizo la matriz'); afterChange(); return; }
    sel = [];
    const nc = n - 1 - skip.size;
    toast(`${nc} copia${nc === 1 ? '' : 's'} creada${nc === 1 ? '' : 's'}`);
    afterChange();
    return;
  }
}
$('mkcir').onclick = circularCmd;

// ---- copia espejo: elementos seleccionados + toque sobre la linea que hace de eje ----
async function mirrorCmd() {
  const items = sel.filter((x) => ['pt', 'ln', 'ci', 'ar', 'sp', 'tx', 'el'].includes(x.k));
  if (!items.length) { toast('Selecciona lo que quieres reflejar'); return; }
  const h = await pickLine('Toca la línea que hace de eje de simetría');
  if (!h) { toast('Copia espejo cancelada'); return; }
  const l = doc.lines[h.id];
  pushUndo();
  const r = mirrorCopy(doc, items.filter((x) => x.id !== h.id), doc.pts[l.a], doc.pts[l.b], { axis: opts.arrLink !== false ? h.id : null });
  if (!r.ok) { rollback(); toast(r.msg); return; }
  if (!solve(doc, []).ok) { rollback(); toast('Conflicto con las restricciones: se deshizo la copia espejo'); afterChange(); return; }
  sel = r.made;
  toast(`Copia espejo creada respecto de ${lineName(h.id)}`);
  afterChange();
}
$('mkmir').onclick = mirrorCmd;
$('mkint').onclick = () => {
  const it = sel.filter((s) => s.k === 'ln' || s.k === 'ci' || s.k === 'ar' || s.k === 'sp');
  if (it.length !== 2) { toast('Selecciona 2 elementos (líneas, arcos, círculos o splines)'); return; }
  makeIntersections(it);
};
$('undo').onclick = undo; $('redo').onclick = redo;
$('fit').onclick = fitView;
$('del').onclick = () => {
  const gs = [...multiGraphs()];
  if (!sel.length && !gs.length) return;
  pushUndo();
  for (const id of gs) { if (doc.graphs?.[id]) { delete doc.graphs[id]; delete graphData[id]; } else dropImage(id); }
  selGraph = null; selMulti = null;
  if (sel.length) {
    deleteItems(doc, sel); sel = [];
    const r = solve(doc, []); if (!r.ok) { /* las restricciones restantes siguen siendo validas */ }
  }
  afterChange();
};
$('weight').onchange = (e) => applyStyle('w', Number(e.target.value));
$('dimFs').onchange = (e) => {
  const f = Number(String(e.target.value).replace(',', '.'));
  if (doc.dimText) { // con la letra de los textos: sin selección de cotas cambia la del documento (todas las que no tienen una propia)
    if (!(f > 0)) { buildSwatches(); return; }
    if (sel.some((s) => s.k === 'co' && doc.cons[s.id]?.v !== undefined)) { applyStyle('dimFs', f); return; }
    pushUndo(); doc.dimH = dimFsRead(f); afterChange(); return;
  }
  const r = Math.round(f); if (r >= 6 && r <= 48) applyStyle('dimFs', r); else e.target.value = String(cur.dimFs || DIM_FS);
};
$('docDimText').onchange = (e) => { pushUndo(); if (e.target.checked) { doc.dimText = true; if (!(doc.dimH > 0)) doc.dimH = cur.tx.h ?? niceHeight(); } else delete doc.dimText; afterChange(); };
$('ltype').onchange = (e) => applyStyle('ltype', e.target.value);
['hKind', 'hAngle', 'hSpace', 'hAlpha'].forEach((id) => { $(id).onchange = updateHatchFromPanel; });
$('hAlpha').oninput = updateHatchFromPanel;
$('mkhatch').onclick = createHatch;

// ---- equidistante de un spline (p. ej. radio del rodillo de una leva) ----
function newControlPoints(P, closed, N, c = { x: 0, y: 0 }) {
  const R = closed ? resamplePolyline([...P, P[0]], N + 1).slice(0, -1) : resamplePolyline(P, N);
  return R.map((q) => { const id = addPoint(doc, c.x + q.x, c.y + q.y, true); doc.pts[id].splOnly = true; return id; });
}
$('spOffset').onclick = async () => {
  const spId = sel.find((x) => x.k === 'sp')?.id;
  if (!spId) { toast('Selecciona un spline'); return; }
  const d = await askNumber('Equidistante: distancia (positiva = hacia afuera en curvas cerradas)', opts.spOffD ?? 3, false, 'int');
  if (d === null) return;
  if (!Number.isFinite(d) || d === 0) { toast('Escribe la distancia (positiva = hacia afuera en curvas cerradas)'); return; }
  opts.spOffD = d;
  const sp = doc.splines[spId];
  const dense = splinePolyline(doc, sp, 24);
  const o = offsetPolyline(sp.closed ? dense.slice(0, -1) : dense, d, sp.closed);
  if (!o) { toast('El spline necesita al menos 3 puntos'); return; }
  pushUndo();
  const ids = newControlPoints(o.pts, sp.closed, Math.max(48, sp.pts.length * 3));
  const nid = addSpline(doc, ids, { color: sp.color, ltype: sp.ltype, w: sp.w, ls: sp.ls }, sp.closed);
  sel = [{ k: 'sp', id: nid }];
  afterChange();
  if (o.undercut > 0) toast(`La equidistante se socava en ${o.undercut} tramos: la distancia supera el radio de curvatura (mínimo ${fmt(o.minRadius)}). Revisa la curva.`);
  else toast('Equidistante creada');
};

// ---- SVG para corte laser ----
const WLAB = { 1: 'Fino', 2: 'Normal', 3.5: 'Grueso' };
$('fLaser').onclick = () => {
  const v = { unit: 1, stroke: 0.1, cutColor: '#ff0000', markColor: '#0000ff', modes: {}, ...(opts.laser || {}) };
  $('lsUnit').value = String(v.unit); $('lsStroke').value = String(v.stroke); $('lsColor').value = v.cutColor; $('lsMarkColor').value = v.markColor;
  const box = $('lsClasses'), lts = allLtypes(doc);
  box.textContent = '';
  const cls = laserClasses(doc);
  if (!cls.length) { toast('No hay geometría para exportar'); return; }
  for (const c of cls) {
    const row = document.createElement('div');
    row.className = 'row'; row.style.cssText = 'gap:8px;align-items:center;margin:4px 0';
    const lt = lts[c.ltype] || lts.continua;
    const dash = dashFromPattern(lt.pattern).map((n) => Math.max(0.5, n * 2.2)).join(' ');
    const col = c.color === 'auto' ? 'currentColor' : c.color;
    const sw = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    sw.setAttribute('width', '44'); sw.setAttribute('height', '16'); sw.style.flex = 'none';
    sw.innerHTML = `<path d="M2 8H42" stroke="${col}" stroke-width="${Math.max(1, c.w * 1.2)}" ${dash ? `stroke-dasharray="${dash}"` : ''} fill="none"/>`;
    const lab = document.createElement('span');
    lab.style.cssText = 'flex:1;font-size:13px;line-height:1.2';
    lab.textContent = `${lt.label} · ${WLAB[c.w] || c.w}${c.color === 'auto' ? '' : ' · ' + c.color} (${c.count})`;
    const sel2 = document.createElement('select');
    sel2.dataset.key = c.key; sel2.style.cssText = 'min-height:36px;padding:2px 6px;border:1px solid var(--line);border-radius:8px;background:var(--btn)';
    sel2.innerHTML = '<option value="cut">Corte</option><option value="mark">Marcado</option><option value="skip">Omitir</option>';
    sel2.value = v.modes[c.key] || (c.ltype === 'continua' ? 'cut' : 'skip');
    row.append(sw, lab, sel2);
    box.appendChild(row);
  }
  $('dlgL').showModal();
};
$('lsCancel').onclick = () => $('dlgL').close();
$('lsOk').onclick = (ev) => {
  ev.preventDefault();
  const modes = {};
  document.querySelectorAll('#lsClasses select').forEach((s) => { modes[s.dataset.key] = s.value; });
  const o = { unit: Number(String($('lsUnit').value).replace(',', '.')), stroke: Number(String($('lsStroke').value).replace(',', '.')), cutColor: $('lsColor').value, markColor: $('lsMarkColor').value, modes };
  if (!(o.unit > 0) || !(o.stroke > 0)) { toast('La escala y el grosor deben ser positivos'); return; }
  const r = exportSVGLaser(doc, o);
  if (!r) { toast('No hay nada marcado como Corte o Marcado'); return; }
  opts.laser = { ...(opts.laser || {}), ...o, modes: { ...(opts.laser?.modes || {}), ...modes } }; persist();
  $('dlgL').close();
  saveFile('svg', '-laser', () => new Blob([r.svg], { type: 'image/svg+xml' })).then(() => toast(`SVG de ${r.width.toFixed(1)} × ${r.height.toFixed(1)} mm: ${r.cut} de corte y ${r.mark} de marcado`));
};
$('trTrace').onclick = () => {
  const pts = sel.filter((x) => x.k === 'pt').map((x) => x.id);
  if (!pts.length) { toast('Selecciona uno o más puntos'); return; }
  pushUndo();
  if (pts.every((id) => doc.traces[id])) { pts.forEach((id) => delete doc.traces[id]); toast('Trazado desactivado'); }
  else { pts.forEach((id) => startTrace(doc, id)); toast('Trazado activado: mueve el mecanismo para dibujar la trayectoria'); }
  afterChange();
};
// Restricciones redundantes: el solver las detecta (otras ya implican lo mismo); mientras existan, cada resolucion se
// hace dos veces. Las cotas redundantes solo se avisan (pueden tener nombre y alimentar formulas), el resto se puede quitar.
function redundantReport() {
  const ids = redundantCons(doc);
  const isDim = (id) => DIM_TYPES.includes(doc.cons[id].t) && !doc.cons[id].hidden; // las cotas ocultas (automaticas) no las nombra ni las lee nadie
  return { removable: ids.filter((id) => !isDim(id)), dims: ids.filter(isDim) };
}
const redLine = (id) => '• ' + conLabel(doc, doc.cons[id]) + ' (' + doc.cons[id].refs.join(', ') + ')';
const redList = (ids) => ids.slice(0, 10).map(redLine).join('\n') + (ids.length > 10 ? `\n… y ${ids.length - 10} más` : '');
function warnRedundant() { // al abrir un archivo: un solo aviso, sin preguntar
  let r;
  try { r = redundantReport(); } catch { return; }
  const n = r.removable.length + r.dims.length;
  if (n) toast(`${n} restricción(es) redundante(s) hacen más lento el solver: botón «Redundantes» en Restricciones`);
}
$('redCheck').onclick = () => {
  const r = redundantReport();
  if (!r.removable.length && !r.dims.length) { toast('Sin restricciones redundantes'); return; }
  let msg = '';
  if (r.removable.length) msg += `${r.removable.length} restricción(es) redundante(s): no agregan información (otras ya implican lo mismo) y hacen más lento el solver.\n\n${redList(r.removable)}\n\n`;
  if (r.dims.length) msg += `${r.dims.length} cota(s) redundante(s) que NO se quitan (pueden alimentar fórmulas; revísalas a mano):\n${redList(r.dims)}\n\n`;
  if (!r.removable.length) { alert(msg.trim()); return; }
  if (!confirm(msg + '¿Quitar las restricciones? La geometría no cambia; se puede deshacer.')) return;
  pushUndo();
  let quitadas = 0;
  // el solver señala un subconjunto por vez: al quitarlo pueden aparecer otras que dependian de el, asi que se repite
  for (let pasada = 0, lista = r.removable; lista.length && pasada < 6; pasada++, lista = redundantReport().removable) {
    for (const id of lista) { delete doc.cons[id]; quitadas++; }
  }
  const ok = (hasReactive(doc) ? settle(doc, solve, []) : solve(doc, [])).ok;
  if (!ok) { rollback(); toast('No se pudo: el dibujo no resuelve sin ellas; no se quitó nada'); afterChange(); return; }
  afterChange();
  toast(`${quitadas} restricción(es) quitada(s)`);
};
$('mkReset').onclick = () => {
  const all = Object.keys(doc.pts).filter((id) => isMark(doc, id));
  if (!all.length) return;
  const chosen = sel.filter((x) => x.k === 'pt' && isMark(doc, x.id)).map((x) => x.id);
  pushUndo();
  const n = resetMarks(doc, chosen.length ? chosen : all);
  relaxMarks(); afterChange();
  toast(n === 1 ? 'Marca reiniciada' : `${n} marcas reiniciadas`);
};
$('trClear').onclick = () => {
  const pts = sel.filter((x) => x.k === 'pt' && doc.traces[x.id]).map((x) => x.id);
  if (!pts.length) return;
  pushUndo();
  pts.forEach((id) => { doc.traces[id].pts = [{ x: doc.pts[id].x, y: doc.pts[id].y }]; });
  afterChange();
};
$('trSpline').onclick = async () => {
  const pid = sel.find((x) => x.k === 'pt' && doc.traces[x.id])?.id;
  if (!pid) { toast('Selecciona un punto con trazado'); return; }
  const n = await askNumber('Puntos del spline', opts.trN ?? 16, false, 'int');
  if (n === null) return;
  opts.trN = Math.max(3, Math.min(200, Math.round(n) || 16));
  pushUndo();
  const id = traceToSpline(doc, pid, opts.trN);
  if (!id) { rollback(); toast('Aún no hay trayectoria: mueve el mecanismo con el trazado activado'); afterChange(); return; }
  sel = [{ k: 'sp', id }];
  toast(doc.splines[id].closed ? 'Spline cerrado creado a partir del trazado' : 'Spline creado a partir del trazado');
  afterChange();
};
$('spClose').onclick = () => {
  const sps = sel.filter((x) => x.k === 'sp').map((x) => doc.splines[x.id]);
  if (!sps.length) return;
  if (sps.some((sp) => sp.pts.length < 3)) { toast('Una curva cerrada necesita al menos 3 puntos'); return; }
  pushUndo();
  const to = !sps.every((sp) => sp.closed);
  sps.forEach((sp) => { sp.closed = to; });
  afterChange();
};
$('ltEl').oninput = (e) => applyStyle('ls', Number(e.target.value));

function toggle(id, key) {
  const b = $(id);
  b.onclick = () => { opts[key] = !opts[key]; b.setAttribute('aria-pressed', String(opts[key])); draw(); persist(); };
  b.setAttribute('aria-pressed', String(opts[key]));
}
toggle('tGrid', 'grid'); toggle('tSnap', 'snap'); toggle('tCons', 'cons'); toggle('tTouch', 'touch');
toggle('tLock', 'lock');
for (const [id, key, min, max, def] of [['intMs', 'intMs', 0, 2000, 80], ['lockDeg', 'lockDeg', 1, 90, 45]]) {
  $(id).onchange = (e) => { const v = Number(String(e.target.value).replace(',', '.')); opts[key] = Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def; e.target.value = String(opts[key]); persist(); draw(); };
} toggle('tPts', 'pts'); toggle('tDims', 'dims'); toggle('tTexts', 'texts');
$('tLabels').onclick = () => { opts.labels = !opts.labels; applyLabels(); persist(); };
function applyLabels() {
  document.body.classList.toggle('nolabels', !opts.labels);
  $('tLabels').setAttribute('aria-pressed', String(opts.labels));
}
// Pagina: al activarla en un dibujo que ya tiene contenido, su borde izquierdo y el superior quedan un margen antes de lo dibujado.
$('docPage').onchange = (e) => {
  const v = e.target.value;
  pushUndo();
  if (v === 'none') delete doc.page;
  else {
    const b = doc.page ? null : contentBounds(true), m = doc.page?.m ?? 25, P = PAGES[v];
    const t = doc.page ? null : contentTop();
    doc.page = {
      w: P?.w ?? doc.page?.w ?? PAGES.letter.w, h: P?.h ?? (doc.page ? pageH(doc.page) : PAGES.letter.h), m,
      x0: doc.page?.x0 ?? (b ? b.x0 - m : 0), y0: doc.page ? pageTop(doc.page) : isFinite(t) ? +(t + m).toFixed(3) : 0,
    };
  }
  afterChange(); syncPanel(); fitView();
  toast(v === 'none' ? 'Sin límites: lienzo infinito, los textos respetan cada salto de línea' : 'Página de ' + +doc.page.w.toFixed(1) + ' × ' + +doc.page.h.toFixed(1) + ' mm: los textos se ajustan a los márgenes');
};
const pageNum = (key, min) => (e) => {
  const x = parseFloat(e.target.value), pg = doc.page;
  const ok = pg && x >= min && (key === 'm' ? 2 * x < pg.w && 2 * x < pageH(pg) : 2 * pg.m < x);
  if (!ok) { syncPanel(); toast('Valor no válido'); return; }
  pushUndo(); doc.page = { ...pg, h: pageH(pg), y0: pageTop(pg), [key]: x }; afterChange(); syncPanel();
};
$('docPageW').onchange = pageNum('w', 20);
$('docPageH').onchange = pageNum('h', 20);
$('docMargin').onchange = pageNum('m', 0);
// Configuracion: idioma (de este dispositivo), indicador decimal (del dibujo) y las opciones del documento.
$('tCfg').onclick = () => { syncPanel(); $('dlgCfg').showModal(); };
$('cfgOk').onclick = () => $('dlgCfg').close();
$('cfgLang').onchange = (e) => { setLang(e.target.value); syncPanel(); };
$('cfgCc').onchange = (e) => { try { localStorage.setItem(CC_KEY, e.target.value); } catch { /* sin almacenamiento */ } ccClose(); };
$('cfgDec').onchange = (e) => {
  const to = e.target.value || null;
  if (to === (doc.decimal ?? null)) return;
  const probe = structuredClone(doc), n = setDocDecimal(probe, to);
  if (n && !confirm(to ? `Se reescribirán ${n} fórmula${n > 1 ? 's' : ''} del dibujo con el indicador decimal «${to}» (argumentos con «${to === ',' ? ';' : ','}»). ¿Continuar?` : `Se reescribirán ${n} fórmula${n > 1 ? 's' : ''} del dibujo sin indicador decimal elegido (como los dibujos anteriores). ¿Continuar?`)) { syncPanel(); return; }
  pushUndo(); setDocDecimal(doc, to); setAngleMode(doc);
  try { if (to) localStorage.setItem('a-cad-decimal', to); else localStorage.removeItem('a-cad-decimal'); } catch (err) { /* sin almacenamiento */ }
  afterChange(); syncPanel(); draw();
  toast(`Indicador decimal: ${to === ',' ? 'coma (1,5), argumentos con «;»' : to === '.' ? 'punto (1.5), argumentos con «,»' : 'sin elegir (se aceptan las dos formas)'}` + (n ? ` · ${n} fórmula${n > 1 ? 's' : ''} reescrita${n > 1 ? 's' : ''}` : ''));
};
// ---- biblioteca (library.js): la ficha del documento, lo publico y la revision antes de guardar en MyLibrary/
const libInitials = (name) => (String(name).match(/[A-Z]/g) || []).join('').slice(0, 4) || String(name).replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'LIB';
function renderLibCfg() {
  const L = doc.lib, on = !!L?.on;
  $('libOn').checked = on; $('libBox').hidden = !on;
  if (!on) return;
  $('libName').value = L.name || ''; $('libAlias').value = L.alias || ''; $('libAuthor').value = L.author || ''; $('libDesc').value = L.desc || '';
  $('libVer').textContent = (L.version ? `Versión guardada: v${L.version}.` : 'Todavía no se ha guardado como biblioteca.') + ' ' + `Al guardarla en GitHub queda en ${LIB_DIR}/${libFileName(L)} como v${(L.version || 0) + 1}.`;
  const box = $('libEx'), ex = new Set(L.exports || []), c = libClosure(doc, [...ex]);
  box.textContent = '';
  const KIND = { fn: 'función', script: 'script', var: 'variable' };
  for (const d of c.defs.values()) {
    const row = document.createElement('label'); row.style.display = 'flex'; row.style.gap = '6px'; row.style.alignItems = 'baseline'; row.style.margin = '2px 0';
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = ex.has(d.name);
    cb.onchange = () => { pushUndo(); const s = new Set(doc.lib.exports || []); if (cb.checked) s.add(d.name); else s.delete(d.name); doc.lib.exports = [...c.defs.keys()].filter((n) => s.has(n)); afterChange(); renderLibCfg(); };
    const nm = document.createElement('span'); nm.textContent = d.name + (d.params ? '(' + d.params.join(', ') + ')' : '');
    const tag = document.createElement('small'); tag.style.color = 'var(--muted)';
    tag.textContent = [KIND[d.kind], ...(ex.has(d.name) ? [] : [c.names.has(d.name) ? 'viaja como privada (la usa algo público)' : 'no viaja'])].join(' · ');
    row.append(cb, nm, tag); box.append(row);
  }
  if (!c.defs.size) box.textContent = 'El documento no tiene definiciones todavía.';
  const pr = checkLibrary(doc), chk = $('libChk');
  chk.style.color = pr.length ? 'var(--warn)' : 'var(--muted)';
  chk.textContent = pr.length ? '⚠ ' + pr.join(' · ') : `✓ Lista: ${ex.size} públicos y ${c.names.size - ex.size} privados.`;
}
$('libOn').onchange = (e) => {
  pushUndo();
  if (e.target.checked) {
    const name = doc.lib?.name || opts.fileBase || 'Biblioteca';
    doc.lib = { name, alias: libInitials(name), author: '', desc: '', version: 0, ...(doc.lib || {}), on: true };
    if (!Array.isArray(doc.lib.exports)) doc.lib.exports = defaultExports(libDefs(doc).defs);
  } else if (doc.lib) doc.lib.on = false; // la ficha se conserva por si se vuelve a marcar
  afterChange(); renderLibCfg();
};
for (const [id, k] of [['libName', 'name'], ['libAlias', 'alias'], ['libAuthor', 'author'], ['libDesc', 'desc']]) {
  $(id).onchange = (e) => { if (!doc.lib) return; pushUndo(); doc.lib[k] = String(e.target.value).trim(); afterChange(); renderLibCfg(); };
}
$('docSci').onchange = (e) => { // umbral de la notacion cientifica
  pushUndo(); const m = Number(e.target.value);
  if (m === SCI_DEFAULT) delete doc.sciAt; else doc.sciAt = m;
  setAngleMode(doc); afterChange(); toast(m ? `Notación científica desde 1e${m}` : 'Sin notación científica');
};
$('docTol').onchange = (e) => { // tolerancia de «≈»
  const v = Number(String(e.target.value).replace(',', '.'));
  if (!(v > 0) || v >= 1) { toast('La tolerancia es un número entre 0 y 1, p. ej. 1e-12'); e.target.value = String(Number(doc.approxTol) > 0 ? Number(doc.approxTol) : APPROX_TOL); return; }
  pushUndo(); if (v === APPROX_TOL) delete doc.approxTol; else doc.approxTol = v;
  setAngleMode(doc); afterChange(); toast(`Tolerancia de ≈: ${v}`);
};
$('docUnits').onchange = (e) => { // sistema de unidades del documento: en que unidades se muestran los resultados sin unidad pedida
  pushUndo(); if (e.target.value === 'US') doc.units = 'US'; else delete doc.units;
  setAngleMode(doc); fillDimUnits(doc, true); afterChange();
  toast(e.target.value === 'US' ? 'Resultados en unidades anglosajonas: in, ft, kip, kip·in, ksi' : 'Resultados en unidades del SI: mm, m, kN, kN·m, MPa');
};
$('docAngles').onchange = (e) => { pushUndo(); if (e.target.value === 'rad') doc.angles = 'rad'; else delete doc.angles; afterChange(); toast(e.target.value === 'rad' ? 'Textos de cálculo en radianes: sin(π/2)=1' : 'Textos de cálculo en grados: sin(90)=1'); };
$('ltScale').oninput = (e) => { opts.ltScale = Number(e.target.value); draw(); syncPanel(); persist(); };

function previewNew() {
  const pat = parsePattern($('ltPat').value);
  drawSample($('ltnewprev'), pat || [], theme.fg);
  return pat;
}
$('ltPat').oninput = previewNew;
$('ltAdd').onclick = () => {
  const name = $('ltName').value.trim();
  const pat = previewNew();
  if (!name) { toast('Escribe un nombre'); return; }
  if (!pat || !pat.some((n) => n > 0 || n === 0)) { toast('Patrón no válido. Ej.: 12 -3 2 -3'); return; }
  if (!pat.some((n) => n < 0)) { toast('El patrón necesita al menos un hueco (número negativo)'); return; }
  pushUndo();
  const key = 'u_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + (++doc.n);
  doc.ltypes[key] = { label: name, pattern: pat };
  cur.ltype = key;
  $('ltName').value = ''; $('ltPat').value = '';
  fillLtypes(); applyStyle('ltype', key);
  toast(`Tipo "${name}" creado`);
};
$('ltDel').onclick = () => {
  const k = $('ltype').value;
  if (!(k in doc.ltypes)) { toast('Solo se pueden quitar tipos propios'); return; }
  pushUndo();
  for (const o of [...Object.values(doc.lines), ...Object.values(doc.circles)]) if (o.ltype === k) o.ltype = 'continua';
  delete doc.ltypes[k]; cur.ltype = 'continua';
  fillLtypes(); afterChange();
};

$('fNew').onclick = () => { if (confirm('¿Empezar un dibujo nuevo? Se pierde lo no guardado.')) { loadDoc(freshDoc()); opts.fileBase = ''; opts.ghPath = null; fitView(); afterChange(); } };
$('fSave').onclick = () => saveFile(doc.lib?.on ? 'alib.json' : 'json', '', () => new Blob([JSON.stringify({ app: 'ipad-cad', version: VERSION, doc: docForSave(doc) }, null, 1)], { type: 'application/json' }));
$('fLoad').onclick = () => $('fileIn').click();
$('fileIn').onchange = async (e) => {
  opts.ghPath = null; // un archivo del dispositivo, no de GitHub
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  try { const j = JSON.parse(await f.text()); loadDoc(j.doc || j); const b = cleanFileBase(f.name, 'json'); if (b) opts.fileBase = b; fitView(); afterChange(); toast('Abierto: ' + f.name); setTimeout(warnRedundant, 2800); }
  catch (err) { toast('No se pudo abrir: ' + err.message); }
};
$('fPng').onclick = exportPNG;
$('fImg').onclick = () => $('imgIn').click();
$('imgIn').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; insertImage(f); };

// ---- GitHub: guardar y abrir los .json en un repositorio privado (ver github.js)
function openGhCfg() {
  const c = gh.loadCfg(), dlg = $('dlgGc');
  $('ghRepo').value = c.repo; $('ghBranch').value = c.branch; $('ghDir').value = c.dir; $('ghToken').value = '';
  $('ghToken').placeholder = c.token ? 'ya hay un token guardado (déjalo vacío para conservarlo)' : 'github_pat_…';
  $('ghMsg').textContent = '';
  let busy = false;
  $('ghOk').onclick = async (ev) => {
    ev.preventDefault();
    if (busy) return;
    const n = { repo: $('ghRepo').value.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, ''), branch: $('ghBranch').value.trim() || 'main', dir: gh.cleanDir($('ghDir').value), token: $('ghToken').value.trim() || c.token };
    if (!gh.isReady(n)) { $('ghMsg').textContent = 'Escribe el repositorio como usuario/repositorio y el token'; return; }
    busy = true; $('ghMsg').style.color = 'var(--muted)'; $('ghMsg').textContent = 'Probando la conexión…';
    try {
      const files = await gh.list(n);
      if (!gh.saveCfg(n)) throw new Error('Este navegador no deja guardar la configuración');
      dlg.close();
      toast(`GitHub configurado: ${files.length} dibujo${files.length === 1 ? '' : 's'} en ${n.repo}/${n.dir || ''}`);
    } catch (e) { $('ghMsg').style.color = 'var(--warn)'; $('ghMsg').textContent = e.message; }
    busy = false;
  };
  $('ghForget').onclick = () => { if (confirm('¿Olvidar el repositorio y el token en este dispositivo?')) { gh.clearCfg(); dlg.close(); toast('Configuración de GitHub olvidada'); } };
  $('ghCancel').onclick = () => dlg.close();
  dlg.showModal();
}
async function ghSaveCmd() {
  const c = gh.loadCfg();
  if (!gh.isReady(c)) { toast('Primero configura GitHub'); openGhCfg(); return; }
  const isLib = !!doc.lib?.on; // una biblioteca va a MyLibrary/ con el nombre de su ficha y su version sube sola
  if (isLib) { const pr = checkLibrary(doc); if (pr.length && !confirm(['La biblioteca tiene problemas:', ...pr.map((q) => '• ' + q), '', '¿Guardarla igual?'].join('\n'))) return; }
  const name = isLib ? libFileName(doc.lib) : await askFileName('json');
  if (!name) return;
  const path = isLib ? LIB_DIR + '/' + name : gh.filePath(c, name);
  const libNext = isLib ? { ...doc.lib, version: (doc.lib.version || 0) + 1, decimal: doc.decimal === ',' || doc.decimal === '.' ? doc.decimal : null, angles: doc.angles === 'rad' ? 'rad' : 'deg' } : null;
  try {
    toast('Guardando en GitHub…');
    const cur = await gh.currentSha(c, path), known = gh.knownSha(c, path);
    if (cur && cur !== known && !confirm(known
      ? `«${name}» cambió en GitHub desde la última vez que lo abriste o guardaste en este dispositivo (quizá lo editaste en otro). ¿Sobrescribirlo con este dibujo?`
      : `Ya existe «${name}» en GitHub. ¿Sobrescribirlo con este dibujo?`)) { toast('No se guardó'); return; }
    const text = JSON.stringify({ app: 'ipad-cad', version: VERSION, doc: docForSave(libNext ? { ...doc, lib: libNext } : doc) }, null, 1);
    const sha = await gh.write(c, path, text, `A-CAD: ${name}` + (libNext ? ` (biblioteca v${libNext.version})` : ''), cur);
    if (sha) gh.rememberSha(c, path, sha);
    if (libNext) {
      doc.lib = libNext; afterChange();
      let moved = '';
      try { // la version con el nombre de antes (MyLibrary/X.json): queda solo la nueva (los documentos que la insertaron la encuentran al buscar versiones)
        const old = legacyLibPath(path), osha = old !== path && (await gh.currentSha(c, old));
        if (osha) { await gh.remove(c, old, osha, `A-CAD: ${old} -> ${path}`); moved = ` (reemplaza a ${old})`; }
      } catch (e) { toast('No se pudo quitar la versión con el nombre anterior: ' + e.message); }
      toast(`Biblioteca guardada en GitHub: ${path} (v${libNext.version})${moved}`);
      // el documento venia de otra carpeta (dibujos/): el original puede ir a la papelera, para no tener dos archivos iguales
      const src0 = opts.ghPath;
      if (src0 && !src0.startsWith(LIB_DIR + '/') && src0 !== path) {
        try {
          if ((await gh.currentSha(c, src0)) && confirm(`Esta biblioteca se abrió desde «${src0}». ¿Mandar ese original a la papelera de GitHub? La biblioteca queda en «${path}»; desde la papelera se puede restaurar.`)) {
            const taken = (await gh.list(c, gh.TRASH)).map((f) => f.name), base = src0.split('/').pop();
            await gh.moveFile(c, src0, gh.filePath(c, gh.TRASH + '/' + gh.uniqueName(base, taken)));
            toast(`«${src0}» quedó en la papelera`);
          }
        } catch (e) { toast('No se pudo mover el original a la papelera: ' + e.message); }
      }
      opts.ghPath = path; persist();
    } else { opts.ghPath = path; persist(); toast(`Guardado en GitHub: ${path}`); }
  } catch (e) { toast('No se pudo guardar en GitHub: ' + e.message + (e.status === 409 || e.status === 422 ? '. Ábrelo de nuevo y reintenta.' : '')); }
}
// Gestor de archivos de GitHub: abrir, seleccion multiple, papelera (restaurar / eliminar definitivamente), renombrar, duplicar y proteger.
// «Protegido» vive en el repositorio (carpeta/_ipad-cad.json), asi vale en todos los dispositivos; borrarlo pide una confirmacion extra.
async function ghOpenCmd() {
  const c = gh.loadCfg();
  if (!gh.isReady(c)) { toast('Primero configura GitHub'); openGhCfg(); return; }
  const dlg = $('dlgGo'), box = $('goList'), bar = $('goBar'), auto = $('goAuto'), msgEl = $('goMsg');
  $('goWhere').textContent = `${c.repo}/${c.dir || ''}`;
  $('goCfg').onclick = () => { dlg.close(); openGhCfg(); };
  let tab = 'files', lists = { files: [], trash: [], lib: [] }, meta = { protected: [] }, sel = new Set(), busy = false, query = '', order = 'name', dates = {}, dateRun = 0;
  const key = (name, t = tab) => (t === 'trash' ? gh.TRASH + '/' + name : name);
  const isProt = (name, t = tab) => meta.protected.includes(key(name, t));
  const path = (name, t = tab) => (t === 'lib' ? LIB_DIR + '/' + name : gh.filePath(c, key(name, t))); // las bibliotecas, en MyLibrary/ desde la raiz
  const say = (t, bad) => { msgEl.style.color = bad ? 'var(--warn)' : 'var(--muted)'; msgEl.textContent = t; };
  const btn = (label, onclick, { on, disabled, title } = {}) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; if (on) b.classList.add('on'); b.disabled = !!disabled || busy; if (title) b.title = title; b.onclick = onclick; return b; };
  const list = (names) => names.slice(0, 6).map((n) => '• ' + n).join('\n') + (names.length > 6 ? `\n… y ${names.length - 6} más` : '');

  // Busqueda por nombre (sin mayusculas ni acentos) y orden por nombre o por fecha del ultimo cambio.
  const fold = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const dkey = (f, t = tab) => (t === 'trash' ? gh.TRASH + '/' : '') + f.name + ':' + f.sha;
  const dateOf = (f) => dates[dkey(f)] || null;
  const fmtDate = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }); };
  const visible = () => {
    const q = fold(query.trim()), a = lists[tab].filter((f) => !q || fold(f.name).includes(q));
    return order === 'date' ? a.sort((x, y) => (dateOf(y) ? Date.parse(dateOf(y)) : -1) - (dateOf(x) ? Date.parse(dateOf(x)) : -1) || x.name.localeCompare(y.name)) : a;
  };
  // Las fechas no vienen en la lista: se piden en segundo plano, una por archivo (se recuerdan por sha), y la lista se refresca al llegar.
  async function loadDates() {
    const run = ++dateRun, t = tab;
    for (const f of lists[t]) {
      if (run !== dateRun || !dlg.open) return;
      const k = dkey(f, t);
      if (dates[k]) continue;
      const p = gh.filePath(c, (t === 'trash' ? gh.TRASH + '/' : '') + f.name);
      dates[k] = gh.cachedDate(c, p, f.sha);
      if (dates[k]) continue;
      try { dates[k] = await gh.fileDate(c, p, f.sha); } catch (e) { return; } // sin red o limite de uso: se deja sin fecha
      if (run === dateRun && tab === t && !busy) render();
    }
  }
  const fd = $('goFind'); fd.textContent = '';
  const qIn = document.createElement('input'); qIn.type = 'search'; qIn.placeholder = 'Buscar por nombre…'; qIn.autocomplete = 'off'; qIn.setAttribute('aria-label', 'Buscar por nombre');
  const ordBtn = document.createElement('button'); ordBtn.type = 'button';
  const ordTxt = () => { ordBtn.textContent = order === 'date' ? 'Orden: fecha ↓' : 'Orden: nombre'; };
  ordTxt(); fd.append(qIn, ordBtn);
  qIn.oninput = () => { query = qIn.value; const v = new Set(visible().map((f) => f.name)); sel = new Set([...sel].filter((x) => v.has(x))); render(); }; // no se actua sobre lo que el filtro oculta
  ordBtn.onclick = () => { order = order === 'name' ? 'date' : 'name'; ordTxt(); render(); };

  async function openFile(f) {
    dlg.close();
    const p = path(f.name);
    try {
      toast('Abriendo de GitHub…');
      const j = JSON.parse(await gh.read(c, p));
      loadDoc(j.doc || j);
      gh.rememberSha(c, p, f.sha); opts.ghPath = p; // de donde vino (al guardarlo como biblioteca, el original puede ir a la papelera)
      const base = cleanFileBase(f.name, 'json'); if (base) opts.fileBase = base;
      fitView(); afterChange(); toast('Abierto de GitHub: ' + f.name); setTimeout(warnRedundant, 2800);
    } catch (e) { toast('No se pudo abrir: ' + e.message); }
  }
  // Ejecuta op(nombre) sobre cada seleccionado, uno tras otro (GitHub limita las escrituras seguidas); junta los errores y recarga al final.
  async function run(label, names, op, after) {
    if (busy) return;
    busy = true; render();
    const errs = []; let ok = 0;
    for (const n of names) {
      say(`${label} ${ok + errs.length + 1} de ${names.length}: ${n}…`);
      try { await op(n); ok++; } catch (e) { errs.push(`${n}: ${e.message}`); }
    }
    try { if (after) await after(); } catch (e) { errs.push('metadatos: ' + e.message); }
    busy = false; sel = new Set();
    await reload();
    say(`${ok} de ${names.length} listo${names.length === 1 ? '' : 's'}.` + (errs.length ? ' Con errores: ' + errs.join(' · ') : ''), errs.length > 0);
  }
  // Mueve las marcas de proteccion de unas rutas a otras (una sola escritura de metadatos, y solo si hace falta).
  const moveKeys = (pairs) => async () => {
    const hit = pairs.filter(([a]) => meta.protected.includes(a));
    if (hit.length) await gh.updateMeta(c, (m) => { for (const [a, b] of hit) { m.protected = m.protected.filter((x) => x !== a); if (b) m.protected.push(b); } });
  };

  const toTrash = () => {
    const names = [...sel], pr = names.filter((n) => isProt(n));
    if (!confirm(`¿Mover ${names.length === 1 ? 'este archivo' : names.length + ' archivos'} a la papelera?\n\n${list(names)}\n\nPodrás restaurarlos desde la pestaña Papelera.`)) return;
    if (pr.length && !confirm(`PROTEGIDO${pr.length === 1 ? '' : 'S'}: ${pr.join(', ')}.\n\n¿Seguro que quieres moverlo${pr.length === 1 ? '' : 's'} a la papelera?`)) return;
    const taken = lists.trash.map((f) => f.name), pairs = [];
    run('Moviendo a la papelera', names, async (n) => { const to = gh.uniqueName(n, taken); taken.push(to); await gh.moveFile(c, path(n, 'files'), path(to, 'trash')); pairs.push([key(n, 'files'), key(to, 'trash')]); }, () => moveKeys(pairs)());
  };
  const restore = () => {
    const names = [...sel], taken = lists.files.map((f) => f.name), pairs = [];
    run('Restaurando', names, async (n) => { const to = gh.uniqueName(n, taken); taken.push(to); await gh.moveFile(c, path(n, 'trash'), path(to, 'files')); pairs.push([key(n, 'trash'), key(to, 'files')]); }, () => moveKeys(pairs)());
  };
  const purge = () => {
    const names = [...sel], pr = names.filter((n) => isProt(n));
    if (!confirm(`¿Eliminar DEFINITIVAMENTE ${names.length === 1 ? 'este archivo' : names.length + ' archivos'}?\n\n${list(names)}\n\nNo se puede deshacer desde la app (solo desde el historial de git en GitHub).`)) return;
    if (pr.length && !confirm(`PROTEGIDO${pr.length === 1 ? '' : 'S'}: ${pr.join(', ')}.\n\n¿Seguro que quieres eliminarlo${pr.length === 1 ? '' : 's'} para siempre?`)) return;
    const pairs = [];
    run('Eliminando', names, async (n) => { const sha = lists.trash.find((f) => f.name === n)?.sha || await gh.currentSha(c, path(n)); await gh.remove(c, path(n), sha, `ipad-cad: eliminar ${key(n)}`); pairs.push([key(n), null]); }, () => moveKeys(pairs)());
  };
  const rename = () => {
    const [n] = [...sel], v = prompt('Nuevo nombre (sin «.json»)', n.replace(/\.json$/i, ''));
    if (v === null) return;
    const base = cleanFileBase(v, 'json');
    if (!base) { say('Escribe un nombre válido', true); return; }
    const to = base + '.json';
    if (to === n) return;
    if (lists.files.some((f) => f.name === to)) { say(`Ya existe «${to}»`, true); return; }
    run('Renombrando', [n], (x) => gh.moveFile(c, path(x), path(to)), moveKeys([[key(n), key(to)]]));
  };
  const duplicate = () => {
    const names = [...sel], taken = lists.files.map((f) => f.name);
    run('Duplicando', names, async (n) => { const to = gh.uniqueName(n, taken, 'copia'); taken.push(to); await gh.copyFile(c, path(n), path(to)); });
  };
  const protect = (on) => {
    const keys = [...sel].map((n) => key(n));
    run(on ? 'Protegiendo' : 'Quitando protección', [...sel], async () => {}, () => gh.updateMeta(c, (m) => { m.protected = on ? [...new Set([...m.protected, ...keys])] : m.protected.filter((x) => !keys.includes(x)); }));
  };

  function render() {
    const files = visible();
    $('goTabD').classList.toggle('on', tab === 'files'); $('goTabT').classList.toggle('on', tab === 'trash'); $('goTabL').classList.toggle('on', tab === 'lib');
    $('goTabD').textContent = `Dibujos (${lists.files.length})`; $('goTabT').textContent = `Papelera (${lists.trash.length})`; $('goTabL').textContent = `Bibliotecas (${lists.lib.length})`;
    $('goTabD').disabled = $('goTabT').disabled = $('goTabL').disabled = busy;
    // guardado automatico: el dibujo actual, que esta app guarda sola en este dispositivo y reabre al iniciar
    auto.textContent = ''; auto.hidden = tab !== 'files';
    const n = (d) => Object.keys(d || {}).length, elems = n(doc.lines) + n(doc.circles) + n(doc.arcs) + n(doc.ellipses) + n(doc.splines);
    const t = autosaveAt ? new Date(autosaveAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : null;
    const h = document.createElement('div'); h.innerHTML = '<b>Dibujo actual</b> <span style="color:var(--muted)">· guardado automático en este dispositivo</span>'; auto.appendChild(h);
    const sm = document.createElement('small'); sm.textContent = `«${opts.fileBase || 'sin nombre'}» · ${n(doc.pts)} puntos, ${elems} elementos${t ? ' · guardado a las ' + t : ''}. Solo existe en este dispositivo y se reabre solo al iniciar la app; no está en GitHub hasta que lo guardes.`; auto.appendChild(sm);
    const ab = document.createElement('div'); ab.className = 'gm-btns';
    ab.append(btn('Guardar en GitHub…', () => { dlg.close(); ghSaveCmd(); }), btn('Descartar y empezar nuevo', () => { dlg.close(); $('fNew').onclick(); }, { title: 'Borra el guardado automático de este dispositivo y empieza un dibujo en blanco' }));
    auto.appendChild(ab);
    // barra de acciones sobre la seleccion
    bar.textContent = '';
    const all = files.length && files.every((f) => sel.has(f.name));
    const cnt = sel.size, none = !cnt;
    bar.append(btn(all ? 'Ninguno' : 'Todos', () => { sel = all ? new Set() : new Set(files.map((f) => f.name)); render(); }, { disabled: !files.length }));
    if (tab === 'files') {
      const allProt = cnt && [...sel].every((x) => isProt(x));
      bar.append(btn('Papelera', toTrash, { disabled: none }), btn('Renombrar', rename, { disabled: cnt !== 1 }), btn('Duplicar', duplicate, { disabled: none }), btn(allProt ? 'Quitar protección' : 'Proteger', () => protect(!allProt), { disabled: none }));
    } else if (tab === 'trash') bar.append(btn('Restaurar', restore, { disabled: none }), btn('Eliminar definitivamente', purge, { disabled: none }));
    if (cnt) { const s = document.createElement('small'); s.style.color = 'var(--muted)'; s.textContent = cnt + (cnt === 1 ? ' seleccionado' : ' seleccionados'); bar.appendChild(s); }
    // lista
    const st = box.scrollTop;
    box.textContent = '';
    if (!files.length) { box.textContent = query.trim() && lists[tab].length ? 'Ningún nombre coincide con «' + query.trim() + '».' : tab === 'files' ? 'No hay dibujos .json en esa carpeta todavía. Guarda uno con «Guardar en GitHub».' : tab === 'lib' ? 'Todavía no hay bibliotecas. Declara un documento como biblioteca en Configuración y guárdalo en GitHub: queda en MyLibrary/.' : 'La papelera está vacía.'; return; }
    for (const f of files) {
      const row = document.createElement('div'); row.className = 'gm-row';
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = sel.has(f.name); cb.disabled = busy; cb.setAttribute('aria-label', 'Seleccionar ' + f.name);
      cb.onchange = () => { if (cb.checked) sel.add(f.name); else sel.delete(f.name); render(); };
      const nm = document.createElement('button'); nm.type = 'button'; nm.className = 'gm-name'; nm.disabled = busy;
      nm.innerHTML = '<span></span><small></small>';
      nm.firstChild.textContent = (isProt(f.name) ? '🔒 ' : '') + f.name; nm.lastChild.textContent = (dateOf(f) ? fmtDate(dateOf(f)) + ' · ' : '') + (f.size >= 1024 ? Math.round(f.size / 1024) + ' KB' : f.size + ' B');
      if (tab === 'files' || tab === 'lib') nm.onclick = () => openFile(f); else nm.onclick = () => { cb.checked = !cb.checked; cb.onchange(); };
      row.append(cb, nm); box.appendChild(row);
    }
    box.scrollTop = st;
  }
  async function reload() {
    say('Cargando…');
    try {
      const [fl, tr, m, lb] = await Promise.all([gh.list(c), gh.list(c, gh.TRASH), gh.loadMeta(c), gh.list(c, '', fetch, LIB_DIR)]);
      lists = { files: fl, trash: tr, lib: lb }; meta = m.meta;
    } catch (e) { box.textContent = 'No se pudo leer GitHub: ' + e.message; say(''); return; }
    sel = new Set([...sel].filter((x) => lists[tab].some((f) => f.name === x)));
    say(''); render(); loadDates();
  }
  $('goTabD').onclick = () => { tab = 'files'; sel = new Set(); render(); loadDates(); };
  $('goTabT').onclick = () => { tab = 'trash'; sel = new Set(); render(); loadDates(); };
  $('goTabL').onclick = () => { tab = 'lib'; sel = new Set(); render(); loadDates(); };
  box.textContent = 'Cargando…'; render();
  dlg.showModal();
  await reload();
}
// ---- bibliotecas insertadas: se leen de MyLibrary/ en GitHub, quedan copiadas en el documento (un texto con t.lib: funciona sin red) y
// se pueden actualizar cuando la biblioteca cambia. Sus nombres se usan como alias.nombre (ver tvars.js y qualify.js).
const libTexts = () => Object.entries(doc.texts || {}).filter(([, t]) => t.lib);
// Lo que se guarda en el documento: la ficha y lo que viaja; si la biblioteca usa otro indicador decimal, sus formulas se convierten
function libPayloadFor(libDoc, alias, path, sha) {
  const P = libPayload(libDoc, alias), from = P.decimal, to = doc.decimal === ',' || doc.decimal === '.' ? doc.decimal : null;
  if (from && to && from !== to) for (const d of P.defs) { d.expr = convertExpr(d.expr, from, to); for (const x of Object.values(d.lib || {})) x.fn.body = convertExpr(x.fn.body, from, to); }
  return { ...P, decimal: to ?? from, path, sha };
}
const libAngleWarn = (P) => (P.angles && (P.angles === 'rad') !== (doc.angles === 'rad') ? `Ojo: la biblioteca usa ángulos en ${P.angles === 'rad' ? 'radianes' : 'grados'} y este documento en ${doc.angles === 'rad' ? 'radianes' : 'grados'}: sus funciones con sin, cos… darían otro resultado` : '');
async function insertLibraryCmd() {
  const c = gh.loadCfg();
  if (!gh.isReady(c)) { toast('Primero configura GitHub: las bibliotecas se leen de la carpeta MyLibrary/ de tu repositorio'); openGhCfg(); return; }
  const dlg = $('dlgLib'), list = $('libList'), msg = $('libMsg'), as = $('libAs'), go = $('libGo');
  $('libWhere').textContent = `${c.repo}/${LIB_DIR}`;
  list.textContent = 'Cargando…'; msg.textContent = ''; as.value = ''; go.disabled = true;
  let pick = null;
  const used = new Set(libTexts().map(([, t]) => t.lib.alias));
  const check = () => {
    const a = as.value.trim(), pr = pick ? aliasProblem(a) || (used.has(a) ? `«${a}» ya es el alias de otra biblioteca de este documento` : null) : null;
    msg.style.color = pr ? 'var(--warn)' : 'var(--muted)';
    msg.textContent = !pick ? '' : pr ? '⚠ ' + pr : `Sus nombres se usarán como ${a}.nombre, p. ej. ${a}.${(pick.L.exports || [])[0] || '…'}`;
    go.disabled = !pick || !!pr;
  };
  as.oninput = check;
  $('libCancel').onclick = () => dlg.close();
  go.onclick = (ev) => { ev.preventDefault(); if (!pick || go.disabled) return; dlg.close(); placeLibrary(pick, as.value.trim()); };
  dlg.showModal();
  let files;
  try { files = await gh.list(c, '', fetch, LIB_DIR); } catch (e) { list.textContent = 'No se pudo leer GitHub: ' + e.message; return; }
  if (!files.length) { list.textContent = 'Todavía no hay bibliotecas en MyLibrary/. Abre un documento, márcalo como biblioteca en Configuración y guárdalo en GitHub.'; return; }
  const libs = await Promise.all(files.map(async (f) => { try { const j = JSON.parse(await gh.read(c, LIB_DIR + '/' + f.name)); const d = j.doc || j; return { f, d, L: d.lib || {} }; } catch (e) { return { f, err: e.message }; } }));
  list.textContent = '';
  for (const it of libs) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'lrow';
    const line = (tag, txt) => { const e = document.createElement(tag); e.textContent = txt; b.append(e); };
    if (it.err || !it.L.on) { b.disabled = true; line('b', it.f.name); line('small', it.err ? '⚠ ' + it.err : 'No está marcado como biblioteca'); list.append(b); continue; }
    const L = it.L;
    line('b', L.name || it.f.name); line('span', ` (${L.alias || '…'}) · v${L.version || 0}`);
    line('small', [L.author, `${(L.exports || []).length} nombres públicos`].filter(Boolean).join(' · '));
    if (L.desc) line('small', L.desc);
    b.onclick = () => { pick = it; for (const x of list.children) x.classList.remove('on'); b.classList.add('on'); as.value = L.alias || ''; check(); };
    list.append(b);
  }
}
function placeLibrary(it, alias) {
  const P = libPayloadFor(it.d, alias, LIB_DIR + '/' + it.f.name, it.f.sha);
  const q = toModel(40, 40); // arriba a la izquierda de lo que se ve: una biblioteca va antes de donde se usa
  pushUndo();
  const id = addText(doc, addPoint(doc, q.x, q.y), '▸ ' + P.name, { h: cur.tx.h ?? niceHeight(), anchor: 'tl', font: cur.tx.font });
  doc.texts[id].lib = P;
  setTool('select'); sel = [{ k: 'tx', id }]; afterChange();
  toast(`${P.name} v${P.version} insertada como ${alias}: ${P.exports.length} nombres públicos (${alias}.${P.exports[0] || '…'}…). Va antes de donde se usa, en el orden de lectura.`);
  const w = libAngleWarn(P); if (w) setTimeout(() => toast(w), 3500);
}
// En segundo plano: si una biblioteca insertada cambio en GitHub, su bloque lo indica («⟳ v4»); sin red o sin GitHub no hace nada
async function checkLibUpdates() {
  const c = gh.loadCfg();
  if (!gh.isReady(c) || !libTexts().length) return;
  for (const [id, t] of libTexts()) {
    try {
      let sha = await gh.currentSha(c, t.lib.path);
      if (!sha && newLibPath(t.lib.path) !== t.lib.path && (sha = await gh.currentSha(c, newLibPath(t.lib.path)))) t.lib.path = newLibPath(t.lib.path); // se renombro a .alib.json
      if (!sha || sha === t.lib.sha) continue;
      const j = JSON.parse(await gh.read(c, t.lib.path)), v = (j.doc || j).lib?.version || 0;
      if (v > (t.lib.version || 0) && doc.texts[id] === t && t.libNew !== v) { t.libNew = v; draw(); }
    } catch (e) { /* sin red: queda la copia */ }
  }
}
async function updateLibrary(id) {
  const t = doc.texts[id], c = gh.loadCfg();
  if (!t?.lib) return;
  if (!gh.isReady(c)) { toast('Para buscar versiones nuevas hace falta configurar GitHub'); return; }
  try {
    toast('Buscando en GitHub…');
    let sha = await gh.currentSha(c, t.lib.path);
    if (!sha && newLibPath(t.lib.path) !== t.lib.path && (sha = await gh.currentSha(c, newLibPath(t.lib.path)))) t.lib.path = newLibPath(t.lib.path); // se renombro a .alib.json
    if (!sha) { toast(`${t.lib.path} ya no está en GitHub: queda la copia de este documento`); return; }
    const j = JSON.parse(await gh.read(c, t.lib.path)), d = j.doc || j, L = d.lib || {};
    if (!L.on) { toast(`${t.lib.path} ya no está marcado como biblioteca`); return; }
    if ((L.version || 0) <= (t.lib.version || 0) && sha === t.lib.sha) { delete t.libNew; toast(`Ya es la última versión (v${t.lib.version || 0})`); draw(); return; }
    const old = new Set(t.lib.exports || []), nw = new Set(L.exports || []);
    const add = [...nw].filter((n) => !old.has(n)), gone = [...old].filter((n) => !nw.has(n));
    const lines = [`Actualizar ${t.lib.name} de v${t.lib.version || 0} a v${L.version || 0}?`, ...(add.length ? ['Nuevos: ' + add.join(', ')] : []), ...(gone.length ? ['Ya no están (las fórmulas que los usan darán ⚠): ' + gone.join(', ')] : [])];
    if (!confirm(lines.join('\n'))) return;
    pushUndo();
    t.lib = libPayloadFor(d, t.lib.alias, t.lib.path, sha); delete t.libNew;
    afterChange(); toast(`${t.lib.name} actualizada a v${t.lib.version}`);
    const w = libAngleWarn(t.lib); if (w) setTimeout(() => toast(w), 3000);
  } catch (e) { toast('No se pudo leer la biblioteca: ' + e.message); }
}
// Filas del panel de propiedades de un bloque de biblioteca
function libPropRows(body, id, o) {
  const L = o.lib, info = document.createElement('div');
  info.style.cssText = 'font-size:14px;line-height:1.5';
  const add = (txt, muted) => { const e = document.createElement('div'); e.textContent = txt; if (muted) e.style.color = 'var(--muted)'; info.append(e); };
  add(`${L.name} · v${L.version || 0}${o.libNew > (L.version || 0) ? ` (en GitHub hay v${o.libNew})` : ''}`);
  add(`Alias ${L.alias}: sus nombres se usan como ${L.alias}.nombre`, true);
  add(`${(L.exports || []).length} nombres públicos y ${(L.defs || []).length - (L.exports || []).length} privados · copiada de ${L.path}`, true);
  const w = libAngleWarn(L); if (w) { const e = document.createElement('div'); e.textContent = '⚠ ' + w; e.style.color = 'var(--warn)'; info.append(e); }
  body.appendChild(propRow('Biblioteca', info));
  const b = document.createElement('button'); b.type = 'button';
  b.textContent = o.libNew > (L.version || 0) ? `Actualizar a v${o.libNew}` : 'Buscar versión nueva';
  b.onclick = () => updateLibrary(id);
  body.appendChild(propRow('', b));
}
$('libIns').onclick = insertLibraryCmd;
$('dataMgr').onclick = openDataDlg;
$('ghSave').onclick = ghSaveCmd;
$('ghOpen').onclick = ghOpenCmd;
$('ghCfg').onclick = openGhCfg;
$('fSvg').onclick = () => { const s = exportSVG(doc, opts.ltScale, { dims: opts.dims, texts: opts.texts }); if (s) saveFile('svg', '', () => new Blob([s], { type: 'image/svg+xml' })); else toast('No hay nada que exportar'); };
$('fDxf').onclick = () => { const s = exportDXF(doc, view.s, { dims: opts.dims, texts: opts.texts }); if (s) saveFile('dxf', '', () => new Blob([s], { type: 'application/dxf' })); else toast('No hay nada que exportar'); };

window.addEventListener('keydown', (e) => {
  if (e.target.closest?.('input,select,textarea,dialog')) return;
  const k = e.key.toLowerCase();
  if (e.code === 'Space') { spaceDown = true; e.preventDefault(); }
  if (e.key === 'Shift') shiftDown = true;
  if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); redo(); }
  else if ((e.ctrlKey || e.metaKey) && k === 'c') { e.preventDefault(); copySel(); }
  else if ((e.ctrlKey || e.metaKey) && k === 'v') { e.preventDefault(); pasteTool(); }
  else if (k === 'escape') { if (pickResolve) { const r = pickResolve; pickResolve = null; r(null); } else if (pending) { if (tool === 'spline' && pending.ids?.length >= 2) finishSpline(false); else cancelPending(); } else { sel = []; selGraph = null; afterChange(); } }
  else if (k === 'delete' || k === 'backspace') $('del').click();
  else if (!e.ctrlKey && !e.metaKey) { const m = { v: 'select', p: 'point', l: 'line', c: 'circle', i: 'intersect', d: 'dim', a: 'arc3', r: 'arcc', t: 'text', s: 'spline', x: 'trim', e: 'extend', o: 'ellipse', b: 'rect', g: 'polygon', k: 'cline', m: 'mline', w: 'vector', f: 'fillet' }[k]; if (m) { e.preventDefault(); setTool(m); } } // preventDefault: si la herramienta abre un cuadro de texto, la letra no se escribe en el
});
window.addEventListener('keyup', (e) => { if (e.code === 'Space') spaceDown = false; if (e.key === 'Shift') shiftDown = false; });
// Area visible real (con teclado en pantalla): los dialogos se acomodan arriba de ella
function syncViewport() {
  const v = window.visualViewport;
  document.documentElement.style.setProperty('--vvh', (v ? v.height : window.innerHeight) + 'px');
  document.documentElement.style.setProperty('--vvt', (v ? v.offsetTop : 0) + 'px');
}
if (window.visualViewport) { window.visualViewport.addEventListener('resize', syncViewport); window.visualViewport.addEventListener('scroll', syncViewport); }
syncViewport();
window.addEventListener('resize', resize);
new ResizeObserver(resize).observe(cv);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readTheme(); syncPanel(); draw(); });

// ---------------------------------------------------------------- arranque
// Actualizacion automatica: al volver a la app (la web app de pantalla de inicio del iPad puede llevar dias suspendida) se mira si hay una
// compilacion nueva publicada y, si la hay, se recarga: el dibujo se restaura del autoguardado. Como mucho una vez cada 5 minutos, y nunca
// con una ventana abierta, una entrada de texto o una simulacion en marcha.
async function checkNewBuild() {
  try {
    if (document.hidden || location.protocol !== 'https:' || sim || txState || document.querySelector('dialog[open]')) return;
    const mine = [...document.scripts].map((s) => s.getAttribute('src') || '').find((s) => /assets\/index-/.test(s));
    const html = await (await fetch(new URL('./', location.href), { cache: 'no-store' })).text();
    const last = Number(localStorage.getItem('ipad-cad-reload')) || 0;
    if (!needsReload(mine, html) || !reloadAllowed(last, Date.now())) return;
    localStorage.setItem('ipad-cad-reload', String(Date.now()));
    persist(); toast('Hay una versión nueva: actualizando…');
    setTimeout(() => location.reload(), 700);
  } catch { /* sin conexion: se queda como esta */ }
}

async function boot() {
  $('ver').textContent = VERSION;
  $('relTag').textContent = `v${VERSION} ${BUILD}`;
  updateFileTag();
  readTheme();
  buildSwatches();
  for (const [k, n] of FONTS) { const o = document.createElement('option'); o.value = k; o.textContent = n; o.style.fontFamily = fontCss(k); $('dlgTFont').appendChild(o); }
  try {
    const s = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (s?.doc) { autosaveAt = Number(s.at) || 0; loadDoc(s.doc); if (s.view) view = s.view; if (s.cur) cur = { ...cur, ...s.cur }; if (s.opts) Object.assign(opts, s.opts); }
  } catch { /* sin estado previo */ }
  $('intMs').value = String(opts.intMs); $('lockDeg').value = String(opts.lockDeg);
  for (const [id, key] of [['tGrid', 'grid'], ['tSnap', 'snap'], ['tCons', 'cons'], ['tTouch', 'touch'], ['tPts', 'pts'], ['tDims', 'dims'], ['tTexts', 'texts'], ['tLock', 'lock']]) $(id).setAttribute('aria-pressed', String(opts[key]));
  $('ltScale').value = String(opts.ltScale);
  hydrateIcons(); wireGroups(); wireLongPressHints(); wireSections(); applyLabels(); applyChrome(); updateEnabled();
  initLang(); // idioma guardado en este dispositivo: traduce la interfaz ya escrita
  setTool('select');
  try { await initSolver(wasmUrl); } catch (err) { toast('No cargó el solver: ' + err.message); }
  syncPanel(); updateButtons(); resize();
  if (graphHold) toast(`La página se cerró al calcular una gráfica (avance ${Math.round((graphHold.p || 0) * 100)} %, ${Math.round((graphHold.ms || 0) / 100) / 10} s). Las gráficas quedan en pausa: toca una para calcularla.`);
  if (!Object.keys(doc.pts).length) fitView();
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').then((reg) => reg.update()).catch(() => {}); // reg.update(): mira si hay un service worker nuevo en cada arranque
    document.addEventListener('visibilitychange', checkNewBuild);
  }
  window.__cad = { load: (d) => { loadDoc(d); fitView(); afterChange(); draw(); }, hitTest, get doc() { return doc; }, get view() { return view; }, solve, setTool, toScreen, toModel, applyCon, get sel() { return sel; }, set sel(v) { sel = v; afterChange(); } };
}
boot();
