// Edicion de scripts («%f(x):» con sangria, ver script.js) en un campo de texto, como en un editor de codigo:
//  - Enter: salto de linea con la misma sangria de la linea actual, y 2 espacios mas si la linea termina en «:» (abre un bloque).
//  - Tab: 2 espacios (con varias lineas seleccionadas, las corre a todas); Shift+Tab: quita 2 espacios al comienzo de la linea (o de las lineas).
// Sin DOM propio: trabaja sobre el valor y la seleccion del campo. Pruebas en test/codeedit.test.mjs.
export const INDENT = '  ';

// Lo que hace la tecla con el valor v y la seleccion [s, e): { v, s, e } o null (no la maneja).
export function codeKey(key, shift, v, s, e) {
  const lineStart = v.lastIndexOf('\n', s - 1) + 1;
  if (key === 'Enter') {
    const line = v.slice(lineStart, s), ind = /^ */.exec(line)[0] + (/:\s*$/.test(line) ? INDENT : '');
    const ins = '\n' + ind;
    return { v: v.slice(0, s) + ins + v.slice(e), s: s + ins.length, e: s + ins.length };
  }
  if (key === 'Tab') {
    const multi = v.slice(s, e).includes('\n');
    if (!shift && !multi) return { v: v.slice(0, s) + INDENT + v.slice(e), s: s + INDENT.length, e: s + INDENT.length };
    const end = e > s && v[e - 1] === '\n' ? e - 1 : e; // la ultima linea seleccionada entera no arrastra la siguiente
    const lines = v.slice(lineStart, end).split('\n');
    let d0 = 0, dAll = 0;
    const moved = lines.map((l, i) => {
      if (!shift) { if (i === 0) d0 = INDENT.length; dAll += INDENT.length; return INDENT + l; }
      const k = Math.min(INDENT.length, /^ */.exec(l)[0].length);
      if (i === 0) d0 = -k;
      dAll -= k;
      return l.slice(k);
    });
    const nv = v.slice(0, lineStart) + moved.join('\n') + v.slice(end);
    return { v: nv, s: Math.max(lineStart, s + d0), e: e + dAll };
  }
  return null;
}

// Aplica codeKey al evento de teclado de un campo (textarea) cuando on() es verdadero. Devuelve true si la manejo.
export function codeKeyEvent(ev, el) {
  if (ev.isComposing || ev.ctrlKey || ev.metaKey || ev.altKey) return false;
  if (ev.key === 'Enter' && ev.shiftKey) return false;
  const r = codeKey(ev.key, ev.shiftKey, el.value, el.selectionStart, el.selectionEnd);
  if (!r) return false;
  ev.preventDefault();
  el.value = r.v;
  el.setSelectionRange(r.s, r.e);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}
