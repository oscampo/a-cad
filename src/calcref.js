// Referencia de «Texto y cálculo»: la misma fuente arma la sección de la ayuda (HTML) y el capítulo
// docs/07-texto-y-calculo.md. test/calcref.test.mjs comprueba que cada ejemplo da lo anotado y que el manual está al día.
//
// Cada grupo: { title, note?, head?, rows, rules? }. Una fila: [escribes, qué hace, ejemplo, se ve, modo] (HTML en las
// dos primeras columnas, texto plano en las otras dos). El modo dice cómo se comprueba el ejemplo:
//   't'   lo que se teclea en una ecuación (bloque $$…$$); «se ve» es el texto dibujado, línea por línea;
//   'p'   un texto normal (lo que se teclea tras el «'»); «se ve» es el texto dibujado sin los «$»;
//   'mig' un texto de un dibujo anterior a la v2.0; «se ve» es como queda al abrirlo;
//   ''    no se comprueba (depende del dibujo o de cómo se ve en pantalla).
// head: los títulos de las columnas, si no son los de siempre (una tabla sin ejemplos tiene solo dos).

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const c = (...xs) => xs.map((x) => `<code>${esc(x)}</code>`).join(', ');

export const CALC_GROUPS = [
  {
    title: 'Escribir un texto (T)',
    note: 'Toca donde va el punto de inserción y escribe ahí mismo, sin ventana. Lo que escribes es una <b>ecuación</b>: se guarda como bloque ' + c('$$…$$') + ', así que los delimitadores no se teclean (se ven en las propiedades del texto, doble toque).',
    head: ['Tecla', 'Qué hace'],
    rows: [
      ['<b>Enter</b>', 'Dibuja lo escrito y abre otra entrada justo debajo.'],
      ['<b>Shift+Enter</b>', 'Otra línea en el mismo bloque (otra ecuación).'],
      ['<b>Esc</b>', 'Descarta lo que escribes.'],
      ['<b>Enter</b> en una entrada vacía', 'Termina. Cambiar de herramienta también termina, y dibuja lo escrito.'],
      ['Tocar en otro sitio', 'Dibuja lo escrito y mueve la entrada allí.'],
      [c("'") + ' al empezar', 'Texto normal en vez de ecuación (sirve también el ' + c('’') + ' del teclado del iPad; el apóstrofo no se guarda). Ver «Texto normal, fórmulas y literales».'],
    ],
  },
  {
    title: 'Asignar y mostrar valores',
    note: 'Cada línea de una ecuación es un enunciado. El valor se actualiza solo cuando el dibujo cambia.',
    rows: [
      [c('x:valor'), 'Asigna a <b>x</b> el valor de una expresión. Se dibuja ' + c('x:=valor') + ', tal como lo escribiste.', 'x:2*3', 'x:=2*3', 't'],
      [c('x:=valor'), 'Lo mismo, tecleando ' + c(':=') + '.', 'k:=4', 'k:=4', 't'],
      [c('expr='), 'Un <b>=</b> al final de la línea muestra el valor, con hasta 3 decimales.', '2/3=', '2/3=0.667', 't'],
      [c('x:expr='), 'Asigna y muestra el valor en la misma línea.', 'x:2*3=\ny:x+1=', 'x:=2*3=6\ny:=x+1=7', 't'],
      [c('x:a..b;n'), '<b>Rango</b>: n valores de a hasta b, un vector fila.', 'x:1..5;5', 'x:=[1, 2, 3, 4, 5]', 't'],
      [c('x:a..paso..b'), 'Rango con paso.', 'x:0..0.5..2', 'x:=[0, 0.5, 1, 1.5, 2]', 't'],
      ['Ángulos', 'Un valor con π es un ángulo en radianes; uno sin π es un número a secas.', 'a:30\nsin(a)=', 'a:=30\nsin(a)=0.5', 't'],
      ['Error', 'Si la expresión no se puede calcular, en lugar del valor aparece ⚠.', 'sqrt(-1)=', 'sqrt(-1)=⚠', 't'],
    ],
    rules: [
      '<b>Un enunciado por línea</b>: lo que sobra en la línea se marca con ⚠ (' + c('x:2  y:3') + '). Para poner dos, Shift+Enter.',
      'No es salida si la línea termina en ' + c('==', '<=', '>=', '!=') + ' o ' + c(':=') + ': ahí el <b>=</b> es parte del operador.',
      'Un vector o una matriz asignado ya muestra su valor: en ' + c('v:1..3;3=') + ' el <b>=</b> final no añade nada.',
      'Una salida puede leer las cotas (también las de solo lectura y las magnitudes de los vectores), las variables y las funciones y constantes de «Funciones y operadores». Un ángulo de una cota vale su medida en radianes.',
      'Al editar ves ' + c('expr=') + '; el dibujo y las exportaciones (SVG, DXF) muestran ' + c('expr=valor') + '. La magnitud de un vector muestra solo el valor.',
    ],
  },
  {
    title: 'Texto normal, fórmulas y literales',
    note: 'Un texto que empieza con ' + c("'") + ' se dibuja tal cual, salvo lo que va entre signos de pesos, que es matemático y calcula igual que una ecuación.',
    rows: [
      [c('$…$'), 'Fórmula en línea con el texto.', "'Vale $2*3=$ mm", 'Vale 2*3=6 mm', 'p'],
      [c('$$…$$'), 'Fórmula en bloque: cada línea de dentro es una ecuación, centrada y a tamaño pleno.', '', '', ''],
      [c('`…`'), '<b>Literal</b>: se dibuja pero nunca se calcula ni se lee como asignación o salida. Sin las comillas, ' + c('f:RR->RR') + ' sería una asignación.', '`f:RR->RR`\n`x =` 3', 'f:RR->RR\nx = 3', 't'],
      [c('`…') + ' sin cerrar', 'Se marca con ⚠.', '`abierto', '`abierto ⚠', 't'],
      [c('\\$'), 'Un signo de pesos que no abre una fórmula.', '', '', ''],
      [c('$') + ' suelto', 'No es fórmula: ' + c('$5 y $6') + ' se dibuja tal cual. Un ' + c('$$') + ' sin cierre también, con ⚠.', '', '', ''],
    ],
  },
  {
    title: 'Escritura matemática (AsciiMath)',
    note: 'Las fórmulas siguen la sintaxis de <a href="https://asciimath.org/" target="_blank" rel="noopener">asciimath.org</a>. Se dibujan con fracciones, raíces, índices y símbolos de verdad, giran y se exportan (SVG, DXF) como cualquier texto. Los paréntesis crecen con lo que encierran.',
    head: ['Escribes', 'Se dibuja'],
    rows: [
      [c('a/b'), 'Fracción (los paréntesis de a y b no se ven).'],
      [c('x^2', 'x_1'), 'Superíndice y subíndice.'],
      [c('sqrt(x)', 'root 3 x'), 'Raíces.'],
      [c('alpha', 'beta', 'pi', 'Delta') + '…', 'Letras griegas.'],
      [c('sum_(i=1)^n', 'prod', 'int_0^1', 'lim_(x->0)'), 'Sumatoria, productoria, integral y límite.'],
      [c('sin', 'cos', 'ln') + '…', 'Nombres de funciones, en letra recta.'],
      [c('<=', '>=', '!=', '->', '=>', '+-', 'xx', '-:', 'oo'), '≤ ≥ ≠ → ⇒ ± × ÷ ∞'],
      [c('abs(x)', 'floor(x)', 'ceil(x)', 'norm(x)'), 'Valor absoluto, piso, techo y norma, con sus barras.'],
      [c('hat x', 'bar x', 'vec v', 'tilde', 'dot', 'ddot', 'ul', 'cancel', 'overarc'), 'Acentos, subrayado y tachado.'],
      [c('[a, b; c, d]', '[a; b]', '[[a,b],[c,d]]', '((a),(b))'), 'Matrices y vectores columna dibujados (sin calcular). Entre corchetes, ' + c(';') + ' separa filas y ' + c(',') + ' columnas.'],
      [c('[[a,b,|,c],[d,e,|,f]]'), 'Matriz aumentada.'],
      [c('{(2x,+,y,=,3),(x,-,y,=,1):}'), 'Sistema de ecuaciones.'],
      [c('ubrace(…)_("texto")', 'obrace', 'overset(x)(=)', 'underset'), 'Llaves y signos con algo encima o debajo.'],
      [c('color(red)(x)'), 'Color.'],
      [c('bb', 'bbb', 'cc', 'tt', 'fr', 'sf'), 'Fuentes: negrita, pizarra, caligráfica, máquina, fraktur, sin serifa.'],
      [c('"texto"', 'text(hola)'), 'Texto recto dentro de la fórmula.'],
      [c('dy/dx', "f'(x)"), 'Derivadas.'],
    ],
    rules: [
      'Como en AsciiMath, las palabras reservadas se reconocen aunque vayan pegadas a otras letras (' + c('pir') + ' es π r), así que «in», «or», «and»… dentro de un nombre se leen como símbolos: sepáralos con espacios o ponlos entre comillas.',
      'Aún no hay alineación por <b>=</b> entre líneas.',
    ],
  },
  {
    title: 'Nombres de variables',
    note: 'Siguen las reglas de los nombres de las cotas: letras, números y _, empiezan con una letra.',
    rows: [
      [c('masa_(total)'), 'Nombre con <b>subíndice de texto</b>: entre paréntesis, texto libre sin paréntesis ni llaves. Se dibuja con el subíndice en letra recta.', 'masa_(total):3\n2*masa_(total)=', 'masa_(total):=3\n2*masa_(total)=6', 't'],
      ['Reservados', 'Un nombre no puede ser una función o constante del programa (' + c('sin', 'pi') + '…) ni coincidir con el de una cota.', 'sin:2', 'sin:=2 ⚠', 't'],
    ],
    rules: [
      'Un texto con un nombre no válido, o que usa una variable que aún no existe, se rechaza al escribirlo («se deshizo»). Si llega de otra forma (al pegar un texto, por ejemplo), esa definición queda con ⚠ y la variable sin definir desde ahí.',
      'Los nombres se actualizan solos si renombras una cota que usan.',
    ],
  },
  {
    title: 'Orden de lectura',
    note: 'Como en SMath, la página se lee <b>de arriba a abajo</b> y, en una misma fila, <b>de izquierda a derecha</b>: dentro de un texto, línea por línea; los textos, por su esquina superior izquierda. Una variable vale lo de la <b>última definición leída antes</b>.',
    rows: [
      ['Redefinir', 'Una variable puede cambiar de valor más abajo.', 'k:1\nk=\nk:2\nk=', 'k:=1\nk=1\nk:=2\nk=2', 't'],
      ['Usarse a sí misma', 'Una redefinición puede leer el valor anterior.', 'n:1\nn:n+1\nn=', 'n:=1\nn:=n+1\nn=2', 't'],
      ['Usar antes de definir', 'Todavía no existe: avisa de que «se define más abajo o más a la derecha».', 'y=\ny:2', 'y=⚠\ny:=2', 't'],
      ['Leer cotas', 'Una definición puede usar las cotas y variables leídas antes, y se recalcula cuando cambian.', 'k:D1/2', '', ''],
    ],
    rules: [
      'Las <b>cotas con fórmula</b> (' + c('D2 = k*2') + ') se leen en el lugar de su <b>etiqueta</b>: si ' + c('k:1') + ' está arriba de la cota y ' + c('k:7') + ' más abajo, ' + c('D2') + ' vale 2.',
      'Mover un texto o la etiqueta de una cota (en Seleccionar) recalcula las cotas que leen variables de texto.',
      'Mientras se simula o se arrastra, el orden de lectura de las cotas queda <b>congelado</b>: una etiqueta que cruza un texto no cambia su valor ni detiene la simulación. Al soltar o terminar se vuelve al orden normal.',
      'Si se borra el texto con la definición, las cotas que la leían conservan su valor y pierden la fórmula.',
    ],
  },
  {
    title: 'Vectores y matrices',
    note: 'Se escriben entre corchetes: la coma separa los elementos de una fila, el punto y coma empieza otra fila, y los decimales llevan punto. Se dibujan con corchetes de verdad y sin comas; aquí se escriben con comas, como en «Funciones y operadores», donde está la lista completa de operaciones.',
    rows: [
      [c('[1, 2; 3, 4]'), 'Matriz. ' + c('[1, 2, 3]') + ' es un vector fila y ' + c('[1; 2; 3]') + ' uno columna.', 'A:[1,2;3,4]\nA=', 'A:=[1, 2; 3, 4]\nA=[1, 2; 3, 4]', 't'],
      [c('x^T'), 'Transpuesta: de un vector fila, el columna.', 'x:1..3;3\nx^T=', 'x:=[1, 2, 3]\nx^T=[1; 2; 3]', 't'],
      [c('x_2', 'x_i', 'x_(i+1)'), 'Elemento de un vector, contando desde 1.', 'x:1..3;3\nx_2=', 'x:=[1, 2, 3]\nx_2=2', 't'],
      [c('A_(i,j)'), 'Elemento de una matriz (fila, columna).', 'A:[1,2;3,4]\nA_(2,1)=', 'A:=[1, 2; 3, 4]\nA_(2,1)=3', 't'],
      [c('A_(2,:)', 'A_(:,2)'), 'Una fila o una columna entera.', 'A:[1,2;3,4]\nA_(:,2)=', 'A:=[1, 2; 3, 4]\nA_(:,2)=[2; 4]', 't'],
      [c('A^(-1)*b'), 'Resolver el sistema A·x = b.', 'A:[1,1;10,1]\nb:[-25;250]\nx:A^(-1)*b=', 'A:=[1, 1; 10, 1]\nb:=[-25; 250]\nx:=[30.556; -55.556]', 't'],
    ],
    rules: [
      'Un rango de más de 8 elementos se abrevia con «…».',
      c('*') + ' es el producto matricial: dos vectores fila dan error (usa ' + c('.*') + ' o ' + c('x*y^T') + ').',
      'Un nombre que ya existe como variable (' + c('x_1', 'k_(total)') + ') es esa variable, no un índice.',
      'Una cota puede leer un elemento o un resumen (' + c('D1 = x_2') + '), pero no un vector o una matriz entero: avisa con un mensaje. Lo mismo en las gráficas.',
      'Una matriz escrita en varias líneas de un bloque ' + c('$$') + ' se parte por líneas: escríbela en una sola.',
    ],
  },
  {
    title: 'Funciones propias',
    rows: [
      [c('f(x):…'), 'Define una función. Se dibuja ' + c('f(x):=…') + ' y se usa en las salidas, las variables y las cotas (' + c('D1 = f(3)') + ').', 'f(x):x^2+1\nf(3)=', 'f(x):=x^2+1\nf(3)=10', 't'],
      [c('g(a; b):…'), 'Varios parámetros, separados por ' + c(';') + ' o ' + c(',') + '.', 'g(a; b):a*b+1\ng(2; 5)=', 'g(a; b):=a*b+1\ng(2; 5)=11', 't'],
      [c('if(c; a; b)'), 'Recursión: solo se calcula la rama elegida (hasta 200 niveles).', 'fact(n):if(n<=1; 1; n*fact(n-1))\nfact(5)=', 'fact(n):=if(n<=1; 1; n*fact(n-1))\nfact(5)=120', 't'],
      [c('f(x):…='), 'Define la función y muestra ahí mismo ' + c('f(x)') + ', con las variables que valen en ese punto (' + c('⚠') + ' si alguna no existe).', 'x:3\nf(x):x^2+1=', 'x:=3\nf(x):=x^2+1=10', 't'],
      ['Variables de fuera', 'Lee las variables que valen donde se la llama, no donde se definió.', 'k:2\nf(x):x*k\nf(3)=\nk:5\nf(3)=', 'k:=2\nf(x):=x*k\nf(3)=6\nk:=5\nf(3)=15', 't'],
    ],
    rules: [
      'Los parámetros valen lo que se les pasa (números, vectores o matrices) y ocultan a las variables del mismo nombre.',
      'Los nombres de la función y de sus parámetros siguen las reglas de las variables, y no pueden ser funciones del programa (' + c('sin', 'sum') + '…).',
    ],
  },
  {
    title: 'Propiedades con «.»',
    note: 'Se usan en cualquier fórmula: cotas, textos (' + c('p12.x=') + '), actuadores y gráficas. Las medidas que leen se actualizan con el dibujo.',
    head: ['Escribes', 'Qué es'],
    rows: [
      [c('p12.x', 'p12.y'), 'Coordenadas de un punto.'],
      [c('l3.len') + ' (' + c('l3.L') + '), ' + c('l3.ang'), 'Longitud de una línea y su ángulo, en radianes.'],
      [c('c1.r', 'c1.d', 'c1.x', 'c1.y'), 'Radio, diámetro y centro de un círculo.'],
      [c('a2.r', 'a2.x', 'a2.y'), 'Radio y centro de un arco.'],
    ],
  },
  {
    title: 'Fuente y formato del texto',
    head: ['Propiedad', 'Qué hace'],
    rows: [
      ['Fuente', 'Se elige al crear el texto o en el panel: sistema, Helvetica/Arial, Times/Georgia, Courier/Menlo, Verdana, Palatino, Optima, Futura, American Typewriter y tres manuscritas. Si el dispositivo no tiene una, se usa una genérica parecida.'],
      ['Punto de inserción', 'Es un punto real: se puede acotar, fijar o relacionar. Se elige su lugar en la caja del texto.'],
      ['Ángulo y altura', 'Gira y escala el texto. También se puede alinear con una línea.'],
      ['<i>Legible</i>', 'Gira 180° el texto que quedaría boca abajo.'],
    ],
  },
  {
    title: 'Dibujos anteriores a la v2.0',
    note: 'Al abrirlos, la sintaxis vieja pasa a la nueva una sola vez, con un aviso.',
    head: ['Antes', 'Qué pasa', 'Ejemplo', 'Queda'],
    rows: [
      [c('x{=v}'), 'Definición: pasa a fórmula con asignación.', 'A{=b*h}', '$A:b*h$', 'mig'],
      [c('[=e]'), 'Salida: pasa a fórmula con <b>=</b> al final.', '[=A]', '$A=$', 'mig'],
      ['Fórmula vieja', 'Lo que ahora se leería como asignación o salida queda como literal.', '$$a:b$$', '$$`a:b`$$', 'mig'],
    ],
  },
];

const exampleHtml = (ex) => ex.split('\n').map((l) => `<code>${esc(l)}</code>`).join('<br>');
const HEAD = ['Escribes', 'Qué hace', 'Ejemplo', 'Se ve'];

// Seccion de la ayuda (HTML): por grupo, una nota, una tabla y, si hay, una lista de reglas.
export function calcRefHtml() {
  return CALC_GROUPS.map((g) => {
    const head = g.head || HEAD;
    const rows = g.rows.map((r) => '<tr>' + head.map((_, i) => `<td>${i < 2 ? r[i] : r[i] ? exampleHtml(r[i]) : ''}</td>`).join('') + '</tr>').join('');
    const rules = g.rules ? `<ul>${g.rules.map((x) => `<li>${x}</li>`).join('')}</ul>` : '';
    return `<h4>${g.title}</h4>${g.note ? `<p>${g.note}</p>` : ''}<table class="fref"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>${rules}`;
  }).join('\n');
}

// Capitulo del manual (Markdown). Se regenera con «npm run docs»; test/calcref.test.mjs avisa si quedo viejo.
const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const mdCode = (s, cell) => {
  const t = cell ? s.replace(/\|/g, '\\|') : s;
  return t.includes('`') ? '`` ' + t + ' ``' : '`' + t + '`';
};
const md = (h, cell) => h.replace(/<code>([^<]*)<\/code>/g, (_, x) => mdCode(unesc(x), cell))
  .replace(/<b>([^<]*)<\/b>/g, '**$1**').replace(/<i>([^<]*)<\/i>/g, '*$1*')
  .replace(/<a href="([^"]*)"[^>]*>([^<]*)<\/a>/g, '[$2]($1)');
const mdExample = (ex) => ex.split('\n').map((l) => mdCode(l, true)).join('<br>');
const NAV = '[← 6. Cotas](06-cotas.md) · [Índice](README.md) · [8. Splines y trazados (levas y trayectorias) →](08-splines-y-trazados.md)';
export function calcRefMarkdown() {
  const head = `# 7. Texto y cálculo

Textos que calculan: asignaciones, salidas, fórmulas con AsciiMath, vectores y matrices, funciones propias y el orden de lectura de la página. Los ejemplos con resultado se comprueban con el motor de la app en las pruebas automáticas (\`test/calcref.test.mjs\`).

La lista completa de funciones y operadores, con ejemplos, está en [Funciones y operadores](funciones.md).

${NAV}
`;
  const body = CALC_GROUPS.map((g) => {
    const h = g.head || HEAD;
    const rows = g.rows.map((r) => '| ' + h.map((_, i) => (i < 2 ? md(r[i], true) : r[i] ? mdExample(r[i]) : '')).join(' | ') + ' |').join('\n');
    const rules = g.rules ? '\n\n' + g.rules.map((x) => '- ' + md(x)).join('\n') : '';
    return `## ${g.title}\n\n${g.note ? md(g.note) + '\n\n' : ''}| ${h.join(' | ')} |\n|${h.map(() => '---').join('|')}|\n${rows}${rules}`;
  }).join('\n\n');
  return `${head}\n---\n\n${body}\n\n---\n\n${NAV}\n`;
}
