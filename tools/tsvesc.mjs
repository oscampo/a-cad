// Escapes de los archivos tools/i18n/ref/*.tsv: la barra invertida, el tabulador y el salto de linea de un texto van escritos como \\, \t y \n,
// para que cada texto sea una linea y cada columna se separe con un tabulador.
export const esc = (s) => s.replace(/\\/g, '\\\\').replace(/\t/g, '\\t').replace(/\n/g, '\\n');
export const unesc = (s) => s.replace(/\\(\\|t|n)/g, (_, c) => (c === 't' ? '\t' : c === 'n' ? '\n' : '\\'));
