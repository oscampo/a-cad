// Cierre automatico de delimitadores al escribir un texto (la entrada en el lienzo y el campo Texto de las propiedades). Sin DOM en
// las funciones de calculo (se prueban en Node); attachAutoPair las conecta a un <textarea>.
//  - Al teclear «[», «(», «{», «$», «<» o «`» aparece su cierre y el cursor queda en medio: «[|]».
//  - Con texto seleccionado, lo encierra: seleccionar «x» y teclear «(» da «(x)», con «x» todavia seleccionado.
//  - Teclear el cierre justo delante del que ya esta («]» con «|]») solo avanza el cursor, no lo duplica.
//  - Borrar con el par vacio («[|]») borra los dos.
//  - «$» dentro de «$|$» da «$$|$$» (formula en bloque).
// Cuando NO se cierra solo (para no estorbar al escribir):
//  - si lo que sigue al cursor es una letra o un numero («(» delante de «x+1» pone solo «(»);
//  - «$» o «`» que cierran algo ya abierto (el segundo «$» de «$x»: se escribe tal cual);
//  - «<» dentro de una formula, donde es «menor que» (a<b, <=), y «$» en una entrada que ya es toda formula;
//  - «$» o «`» pegados detras de una letra o un numero (US$, 5$).
// No se cierran «"» (empezar con «"» hace texto normal), «'» (unidades), ni «*», «_», «~» (multiplicar, subindices).

export const PAIRS = { '[': ']', '(': ')', '{': '}', '$': '$', '<': '>', '`': '`' };
const CLOSERS = new Set([']', ')', '}', '>']);
const word = (c) => c !== undefined && /[\p{L}\p{N}_]/u.test(c);

// ¿La posicion pos de v esta dentro de una formula? wholeMath: la entrada entera es una formula (en la entrada del lienzo, lo que no
// empieza con «"» o un espacio). Si no, lo que va entre «$...$» o «$$...$$» (un «\$» no cuenta).
export function inMathAt(v, pos, wholeMath = false) {
  if (wholeMath) return true;
  let on = null; // null fuera, '$' o '$$' dentro
  for (let i = 0; i < pos; i++) {
    if (v[i] === '\\') { i++; continue; }
    if (v[i] !== '$') continue;
    const dd = v[i + 1] === '$' && i + 1 < pos;
    if (on === null) on = dd ? '$$' : '$';
    else if (on === '$$' ? dd : true) on = null;
    if (dd) i++;
  }
  return on !== null;
}
// ¿Hay una comilla invertida abierta en la linea del cursor?
const openTick = (v, pos) => ((v.slice(v.lastIndexOf('\n', pos - 1) + 1, pos).match(/`/g) || []).length % 2) === 1;

// Lo que hace teclear ch con la seleccion [s, e): { v, s, e } (texto y seleccion nuevos) o null (que el navegador lo escriba normal).
export function pairInsert(v, s, e, ch, wholeMath = false) {
  const next = v[e], prev = v[s - 1];
  // saltar el cierre que ya esta delante
  if (s === e && next === ch && (CLOSERS.has(ch) || ch === '`' || ch === '$')) {
    if (ch === '$' && prev === '$' && v[s - 2] !== '$' && !inMathAt(v, s - 1, false)) return { v: v.slice(0, s) + '$$' + v.slice(s), s: s + 1, e: s + 1 }; // «$|$» -> «$$|$$»
    return { v, s: s + 1, e: s + 1 };
  }
  const close = PAIRS[ch];
  if (!close) return null;
  const math = inMathAt(v, s, wholeMath);
  if (ch === '$' && (wholeMath || math)) return null; // en una formula, «$» cierra (o no significa nada)
  if (ch === '<' && math) return null; // menor que
  if (ch === '`' && openTick(v, s)) return null; // cierra un `codigo`
  // encerrar la seleccion
  if (s !== e) return { v: v.slice(0, s) + ch + v.slice(s, e) + close + v.slice(e), s: s + 1, e: e + 1 };
  if (word(next)) return null;
  if ((ch === '$' || ch === '`') && word(prev)) return null;
  return { v: v.slice(0, s) + ch + close + v.slice(s), s: s + 1, e: s + 1 };
}

// Borrar hacia atras con el cursor en s: si queda entre un par vacio («[|]»), borra los dos. null: borrado normal.
export function pairDelete(v, s, e) {
  if (s !== e || s < 1) return null;
  const o = v[s - 1];
  if (PAIRS[o] === undefined || v[s] !== PAIRS[o]) return null;
  return { v: v.slice(0, s - 1) + v.slice(s + 1), s: s - 1, e: s - 1 };
}

// Conecta el cierre automatico a un <textarea>. isMath(): la entrada entera es una formula. Tras cambiar el texto se dispara «input»,
// como al escribir, para quien escuche ese evento (la entrada del lienzo se redimensiona con el).
export function attachAutoPair(ta, isMath = () => false) {
  ta.addEventListener('beforeinput', (ev) => {
    if (ev.isComposing || ev.defaultPrevented) return; // ya lo atendio otro (la letra griega de greek.js)
    let r = null;
    if (ev.inputType === 'insertText' && ev.data && ev.data.length === 1) r = pairInsert(ta.value, ta.selectionStart, ta.selectionEnd, ev.data, isMath());
    else if (ev.inputType === 'deleteContentBackward') r = pairDelete(ta.value, ta.selectionStart, ta.selectionEnd);
    if (!r) return;
    ev.preventDefault();
    ta.value = r.v;
    ta.setSelectionRange(r.s, r.e);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
