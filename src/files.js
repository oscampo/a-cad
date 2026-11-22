// Nombres de archivo para guardar y exportar (sin DOM).
// Quita caracteres no validos y la extension si el usuario la tecleo; devuelve '' si no queda nada.
export function cleanFileBase(input, ext) {
  let s = String(input ?? '').replace(/[\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();
  const re = new RegExp('\\.' + ext.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'); // «alib.json»: con su punto
  s = s.replace(re, '');
  if (/json$/i.test(ext)) s = s.replace(/\.alib$/i, ''); // una biblioteca, «X.alib.json»: su nombre es X
  s = s.replace(/^\.+/, '').replace(/[. ]+$/, '').trim();
  return s.slice(0, 120);
}
