// Indicador decimal del dibujo (doc.decimal): «.» o «,». Cambia como se leen y se escriben los numeros y los separadores (sin DOM).
//   «.»  1.5   argumentos con «,» (o «;»)   matriz [1, 2; 3, 4]   (elementos con «,», filas con «;»)
//   «,»  1,5   argumentos con «;»            matriz [1; 2 | 3; 4]  (elementos con «;», filas con «|»)
//   null: dibujos anteriores a esta opcion: se leen las dos formas (decimal con «.» o «,»; separadores «;» o «, »).
// Como «Angulos en», es una opcion del documento: setDecimal(doc.decimal) lo deja activo (lo hace setAngleMode de expr.js).
let DEC = null;
export const setDecimal = (d) => { DEC = d === ',' || d === '.' ? d : null; };
export const decimalMode = () => DEC;
export const commaMode = () => DEC === ',';
// Un numero ya escrito con punto, como se muestra (con coma en el modo «,»).
export const localNum = (s) => (DEC === ',' ? String(s).replace('.', ',') : String(s));
// Separadores de un modo (por defecto el activo): de los elementos de una fila de una matriz, de sus filas y de los argumentos de una funcion.
export const elemChar = (m = DEC) => (m === ',' ? ';' : ',');
export const rowChar = (m = DEC) => (m === ',' ? '|' : ';');
export const argChar = (m = DEC) => (m === ',' ? ';' : ',');
// Como se escribe el separador de argumentos en un mensaje: «,» con punto decimal; «;» con coma decimal o sin indicador.
export const argText = (m = DEC) => (m === '.' ? ',' : ';');
export const decChar = (m = DEC) => (m === ',' ? ',' : '.');
