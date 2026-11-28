// importData(nombre; d_dec; d_arg; d_col; r_1; r_2; c_1; c_2; f): lee un archivo de la carpeta Datos como una matriz o un vector.
import assert from 'node:assert/strict';
import { evalExpr, isReservedName } from '../src/expr.js';
import { setDataBackend } from '../src/datastore.js';
import { setDecimal } from '../src/locale.js';

setDecimal(undefined);
let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok  ' + name); };
const files = new Map();
setDataBackend(files);
const put = (name, text) => files.set(name, text);
const ev = (s) => evalExpr(s, { vars: {}, allowMat: true, allowCplx: true });
const err = (s, re) => assert.throws(() => ev(s), re);
const mat = (s) => ev(s).mat;
const plain = (r) => r.cells.map((row) => row.map((c) => (c.str !== undefined ? c.str : c.v)));

put('t.prn', '1 2 3\n4 5 6\n7 8 9\n');
put('t.csv', 'x,y,z\n1.5,2,3\n4,5.25,6\n');
put('coma.csv', 'a;b\n1,5;2,5\n3,25;4\n');
put('mix.csv', 'nombre,valor\n"Ana",10\n"Luis, hijo",20\n');

t('numeros con espacios (el delimitador por omision): una matriz', () => {
  assert.deepEqual(mat('importData("t.prn")'), [[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
  assert.deepEqual(mat('importData("t.prn"; 0; 0; 0; 0; 0; 0; 0; 0)'), [[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
});

t('filas y columnas: r_1, r_2, c_1, c_2 desde 1; 0 es el principio o el final', () => {
  assert.deepEqual(mat('importData("t.prn"; 0; 0; 0; 2; 3; 0; 0; 0)'), [[4, 5, 6], [7, 8, 9]]);
  assert.deepEqual(mat('importData("t.prn"; 0; 0; 0; 0; 0; 2; 3; 0)'), [[2, 3], [5, 6], [8, 9]]);
  assert.deepEqual(mat('importData("t.prn"; 0; 0; 0; 2; 2; 2; 3; 0)'), [[5, 6]]);
  assert.deepEqual(mat('importData("t.prn"; 0; 0; 0; 0; 0; 1; 1; 0)'), [[1], [4], [7]]); // una columna
  assert.equal(ev('importData("t.prn"; 0; 0; 0; 2; 2; 2; 2; 0)').value, 5); // una celda: un numero
});

t('un csv con encabezado: se salta con r_1; delimitador y decimal', () => {
  assert.deepEqual(mat('importData("t.csv"; "."; 0; ","; 2; 0; 0; 0; 0)'), [[1.5, 2, 3], [4, 5.25, 6]]);
  assert.deepEqual(mat('importData("coma.csv"; ","; ";"; ";"; 2; 0; 0; 0; 0)'), [[1.5, 2.5], [3.25, 4]]); // coma decimal y punto y coma entre columnas
});

t('el decimal por omision es el del dibujo', () => {
  setDecimal(',');
  try { assert.deepEqual(mat('importData("coma.csv"; 0; 0; ";"; 2; 0; 0; 0; 0)'), [[1.5, 2.5], [3.25, 4]]); } finally { setDecimal(undefined); }
  err('importData("coma.csv"; 0; 0; ";"; 2; 0; 0; 0; 0)', /no es un número/); // sin elegir se lee con punto: «1,5» no es un numero
});

t('f = 1: expresiones, con cuentas, unidades y texto entre comillas', () => {
  put('exp.txt', '2*3 $4+1$ "hola"\n10 "a b" $max(1;7)$\n');
  assert.deepEqual(ev('importData("exp.txt"; 0; 0; 0; 1; 1; 1; 2; 1)').mat, [[6, 5]]);
  assert.deepEqual(ev('importData("exp.txt"; 0; 0; 0; 1; 1; 3; 3; 1)').str, 'hola');
  assert.deepEqual(plain(ev('importData("exp.txt"; 0; 0; 0; 2; 2; 0; 0; 1)')), [[10, 'a b', 7]]); // texto y numeros: una matriz con celdas (el 10 y el 7 siguen siendo numeros)
  const g = ev('importData("exp.txt"; 0; 0; 0; 0; 0; 0; 0; 1)'); assert.deepEqual(plain(g), [[6, 5, 'hola'], [10, 'a b', 7]]); // varias filas y columnas con texto: ya vale
  put('u.txt', "3'm 2'm\n");
  const u = ev('importData("u.txt"; 0; 0; 0; 0; 0; 0; 0; 1)'); assert.deepEqual(u.mat, [[3, 2]]); assert.deepEqual(u.dim, [1, 0, 0, 0, 0, 0, 0]);
});

t('f = 2: mixto, los numeros son numeros y el texto sin comillas va tal cual', () => {
  assert.deepEqual(ev('importData("mix.csv"; 0; 0; ","; 2; 0; 1; 1; 2)').strs, ['Ana', 'Luis, hijo']); // las comillas protegen la coma
  assert.deepEqual(ev('importData("mix.csv"; 0; 0; ","; 2; 0; 2; 2; 2)').mat, [[10], [20]]);
  assert.deepEqual(ev('importData("mix.csv"; 0; 0; ","; 1; 1; 0; 0; 2)').strs, ['nombre', 'valor']);
});

t('f = 2: un archivo con encabezado y texto es una matriz con celdas (texto y numeros), y se corta como cualquier matriz', () => {
  assert.deepEqual(plain(ev('importData("mix.csv"; 0; 0; ","; 0; 0; 0; 0; 2)')), [['nombre', 'valor'], ['Ana', 10], ['Luis, hijo', 20]]);
  put('v.csv', 'x,y\n3,4\n5,6\n');
  assert.deepEqual(ev('importData("v.csv"; 0; 0; ","; 2; 0; 0; 0; 2)').mat, [[3, 4], [5, 6]]); // sin texto: numerica, como siempre
});

t('cada celda con su unidad y numeros complejos: una matriz con celdas', () => {
  put('uc.txt', "$3'm$ $2'kg$ \"ok\"\n$(1+2j)'kΩ$ 7 $5'm$\n");
  const g = ev('importData("uc.txt"; 0; 0; 0; 0; 0; 0; 0; 1)'), c = g.cells;
  assert.deepEqual(c[0].map((x) => x.str ?? x.v), [3, 2, 'ok']); assert.deepEqual(c[0][0].d, [1, 0, 0, 0, 0, 0, 0]); assert.deepEqual(c[0][1].d, [0, 1, 0, 0, 0, 0, 0]);
  assert.equal(c[1][0].im, 2000); assert.equal(c[1][0].v, 1000); assert.equal(c[1][2].v, 5);
  put('un.txt', "$3'm$ $4'm$\n");
  const u = ev('importData("un.txt"; 0; 0; 0; 0; 0; 0; 0; 1)'); assert.deepEqual(u.mat, [[3, 4]]); assert.deepEqual(u.dim, [1, 0, 0, 0, 0, 0, 0]); // una misma magnitud: numerica con unidad
});

t('con f = 1 y un delimitador, los $…$ y las comillas no se parten', () => {
  put('m.csv', '$max(1,2)$,"a,b",3\n');
  assert.deepEqual(ev('importData("m.csv"; "."; ","; ","; 0; 0; 1; 1; 1)').value, 2);
  assert.equal(ev('importData("m.csv"; "."; ","; ","; 0; 0; 2; 2; 1)').str, 'a,b');
});

t('errores claros: archivo, celda, rangos, parametros', () => {
  err('importData("nada.txt")', /no hay datos «nada.txt»/);
  err('importData("t.csv")', /fila 1, columna 1.*no es un número/); // la 1.a fila es el encabezado (y la coma no separa con el delimitador por omision)
  err('importData("t.prn"; 0; 0; 0; 5; 0)', /no caben/); err('importData("t.prn"; 0; 0; 0; 0; 0; 4; 0)', /no caben/); err('importData("t.prn"; 0; 0; 0; 3; 2)', /no caben/);
  err('importData("t.prn"; "x")', /d_dec es «,» o «.»/); err('importData("t.prn"; ","; ","; 0)', /separador decimal y el de argumentos/);
  err('importData("t.prn"; 0; 0; 0; 0; 0; 0; 0; 5)', /f es 0/); err('importData("t.prn"; 0; 0; 0; -1)', /r_1 es un entero/); err('importData(3)', /el nombre del archivo debe ser una cadena/);
  put('rag.txt', '1 2 3\n4 5\n'); err('importData("rag.txt")', /fila 2, columna 3.*no tiene esa columna/);
  put('vacia.csv', '1,,3\n'); err('importData("vacia.csv"; 0; 0; ",")', /fila 1, columna 2.*vacía/);
});

t('el tabulador y las lineas vacias; es una funcion del programa (nombre reservado)', () => {
  put('tab.txt', '1\t2\r\n\r\n3\t4\r\n');
  assert.deepEqual(mat('importData("tab.txt"; 0; 0; "\\t")'), [[1, 2], [3, 4]]);
  assert.equal(isReservedName('importData'), true); assert.equal(isReservedName('importdata'), true);
});

console.log(passed + ' pruebas de importData');
