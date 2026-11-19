// Referencia de funciones y operadores de las formulas (cotas, textos, actuadores y graficas). Sin DOM.
// Es la fuente de la seccion «Funciones y operadores» de la ayuda y del capitulo del manual. Cada fila con ejemplo se comprueba
// en test/funcref.test.mjs evaluandolo con el motor real: si una funcion cambia y el ejemplo deja de dar el resultado anotado,
// la prueba falla. Fila: [nombre, que hace, ejemplo, resultado, modo]. Modo: 'n' numero (grados), 'm' admite vectores y
// matrices, 't' texto matematico tal como se teclea (las lineas se separan con «\n»; el resultado es el valor de la ultima salida «expr=»). Sin ejemplo: ''.

export const FUNC_GROUPS = [
  {
    title: 'Operadores',
    note: 'Sirven en cotas, textos (<code>x:…</code> y <code>expr=</code>), actuadores y gráficas.',
    rows: [
      ['<code>+ - * /</code>', 'Suma, resta, multiplicación y división. También <code>×</code>, <code>·</code> y <code>÷</code>.', '2+3*4', '14', 'n'],
      ['<code>^</code> (<code>**</code>)', 'Potencia.', '2^10', '1024', 'n'],
      ['Implícita', 'Un número pegado a un paréntesis, a π o a un nombre multiplica.', '3(4+1)', '15', 'n'],
      ['<code>√</code>', 'Raíz cuadrada de lo que sigue.', '√16', '4', 'n'],
      ['<code>;</code> y <code>, </code>', 'Separan los valores de una función de varios. <code>2,5</code> sin espacio es el número 2,5.', 'max(3; 8)', '8', 'n'],
      ['<code>&lt; &gt; &lt;= &gt;= == !=</code>', 'Comparan: dan 1 si se cumple y 0 si no. También <code>≤ ≥ ≠</code>. <code>==</code> y <code>!=</code> toleran el redondeo.', '0.1+0.2==0.3', '1', 'n'],
      ['<code>if(c; a; b)</code> (<code>si</code>)', 'Si la condición <code>c</code> no es 0 vale <code>a</code>, si no <code>b</code>. Solo calcula la rama elegida.', 'if(0==0; 0; 1/0)', '0', 'n'],
    ],
  },
  {
    title: 'Constantes',
    rows: [
      ['<code>π</code> (<code>pi</code>)', 'Pi. Un valor que lleva π está en radianes.', 'π', '3.1416', 'n'],
      ['<code>e</code>', 'Número de Euler.', 'e', '2.7183', 'n'],
    ],
  },
  {
    title: 'Trigonometría',
    note: 'Los ángulos de los <b>textos de cálculo y las gráficas</b> van según la opción del dibujo <b>Configuración → Ángulos en</b>: en <b>radianes</b> (los dibujos nuevos: <code>sin(π/2)</code> da 1) o en <b>grados</b> (los dibujos anteriores, que no tienen la opción: <code>sin(30)</code> da 0.5). En grados, si el argumento lleva π o es un ángulo del dibujo (una cota angular como <code>A1</code> o <code>l3.ang</code>) va en radianes. Las <b>cotas</b> y los actuadores siempre van en grados; en una cota angular en radianes, todo va en radianes.',
    rows: [
      ['<code>sin</code> (<code>sen</code>), <code>cos</code>, <code>tan</code>', 'Seno, coseno y tangente.', 'sin(30)', '0.5', 'n'],
      ['', 'Con π, en radianes.', 'cos(π/3)', '0.5', 'n'],
      ['<code>sec</code>, <code>csc</code>, <code>cot</code>', 'Secante, cosecante y cotangente, con la misma regla.', 'sec(60)', '2', 'n'],
      ['<code>asin</code>, <code>acos</code>, <code>atan</code>', 'Inversas: devuelven grados (radianes si el dibujo está en radianes).', 'asin(0.5)', '30', 'n'],
      ['<code>atan2(y; x)</code>', 'Ángulo del punto (x, y) en grados, de −180 a 180.', 'atan2(1; -1)', '135', 'n'],
      ['<code>sinh</code>, <code>cosh</code>, <code>tanh</code>, <code>asinh</code>, <code>acosh</code>, <code>atanh</code>', 'Hiperbólicas (no usan ángulos).', 'cosh(0)', '1', 'n'],
      ['<code>deg(x)</code>', 'De radianes a grados.', 'deg(π)', '180', 'n'],
      ['<code>rad(x)</code>', 'De grados a radianes.', 'rad(180)', '3.1416', 'n'],
    ],
  },
  {
    title: 'Raíces, potencias y logaritmos',
    rows: [
      ['<code>sqrt</code> (<code>raiz</code>, <code>√</code>)', 'Raíz cuadrada.', 'sqrt(2)', '1.4142', 'n'],
      ['<code>exp</code>', 'e elevado a x.', 'exp(1)', '2.7183', 'n'],
      ['<code>ln</code>', 'Logaritmo natural.', 'ln(e^2)', '2', 'n'],
      ['<code>log</code> (<code>log10</code>)', 'Logaritmo en base 10.', 'log(1000)', '3', 'n'],
      ['<code>abs</code>', 'Valor absoluto.', 'abs(-7)', '7', 'n'],
      ['<code>sign</code> (<code>signo</code>)', 'Signo: −1, 0 o 1.', 'sign(-3)', '-1', 'n'],
      ['<code>hypot(a; b; …)</code>', 'Raíz de la suma de los cuadrados.', 'hypot(3; 4)', '5', 'n'],
    ],
  },
  {
    title: 'Redondeo, mínimos y máximos',
    rows: [
      ['<code>round(x; n)</code> (<code>redondear</code>)', 'Redondea a <code>n</code> decimales (0 si se omite). La mitad se aleja del cero.', 'round(2.675; 2)', '2.68', 'n'],
      ['<code>floor</code> (<code>piso</code>)', 'Entero hacia abajo.', 'floor(-2.5)', '-3', 'n'],
      ['<code>ceil</code> (<code>techo</code>)', 'Entero hacia arriba.', 'ceil(2.1)', '3', 'n'],
      ['<code>trunc</code>', 'Quita los decimales.', 'trunc(-2.7)', '-2', 'n'],
      ['<code>mod(a; b)</code>', 'Resto de a entre b, con el signo de b.', 'mod(-7; 3)', '2', 'n'],
      ['<code>min(a; b; …)</code>, <code>max(a; b; …)</code>', 'El menor y el mayor de varios valores.', 'min(4; 1; 9)', '1', 'n'],
      ['<code>clamp(x; mín; máx)</code>', 'Recorta x al intervalo.', 'clamp(15; 0; 10)', '10', 'n'],
    ],
  },
  {
    title: 'Vectores y matrices',
    note: 'Se escriben entre corchetes: la coma separa los elementos de una fila, el punto y coma empieza otra fila, y los decimales llevan punto. Se usan en los textos (<code>A:[1,2;3,4]</code>, <code>A=</code>); una cota puede leer un elemento (<code>D1 = x_2</code>).',
    rows: [
      ['<code>[1, 2, 3]</code>, <code>[1; 2; 3]</code>', 'Vector fila y vector columna.', '[1,2,3]^T', '[1; 2; 3]', 'm'],
      ['<code>a..b;n</code>', 'Rango: <code>n</code> valores de a hasta b, ambos incluidos.', 'x:0..1;5\nx=', '[0, 0.25, 0.5, 0.75, 1]', 't'],
      ['<code>a..paso..b</code>', 'Rango con paso, sin pasar de b (el paso puede ser negativo).', 'x:10..-3..1\nx=', '[10, 7, 4, 1]', 't'],
      ['<code>x_i</code>, <code>A_(i,j)</code>', 'Elemento, contando desde 1. Los índices pueden ser fórmulas: <code>x_(i+1)</code>.', 'A:[1,2;3,4]\nA_(2,1)=', '3', 't'],
      ['<code>A_(i,:)</code>, <code>A_(:,j)</code>', 'Fila i y columna j.', 'A:[1,2;3,4]\nA_(:,2)=', '[2; 4]', 't'],
      ['<code>^T</code>', 'Transpuesta.', '[1,2;3,4]^T', '[1, 3; 2, 4]', 'm'],
      ['<code>+ -</code>', 'Entre matrices del mismo tamaño, o un número con cada elemento.', '[1,2]+10', '[11, 12]', 'm'],
      ['<code>*</code>', 'Producto matricial (o número por matriz).', '[1,2;3,4]*[5;6]', '[17; 39]', 'm'],
      ['<code>.* ./ .^</code>', 'Elemento a elemento.', '[1,2,3].^2', '[1, 4, 9]', 'm'],
      ['Funciones de un valor', 'Sobre una matriz, se aplican a cada elemento.', 'sqrt([4,9])', '[2, 3]', 'm'],
      ['<code>inv(A)</code>, <code>A^(-1)</code>', 'Inversa (avisa si es singular o no es cuadrada).', 'inv([2,0;0,4])', '[0.5, 0; 0, 0.25]', 'm'],
      ['<code>A^n</code>', 'Potencia entera de una matriz cuadrada.', '[1,1;0,1]^3', '[1, 3; 0, 1]', 'm'],
      ['<code>det</code>', 'Determinante.', 'det([1,2;3,4])', '-2', 'm'],
      ['<code>trace</code>', 'Traza: suma de la diagonal.', 'trace([1,2;3,4])', '5', 'm'],
      ['<code>diag</code>', 'De un vector, la matriz diagonal; de una matriz, su diagonal.', 'diag([1,2])', '[1, 0; 0, 2]', 'm'],
      ['<code>eye(n)</code>', 'Matriz identidad de n×n.', 'eye(2)', '[1, 0; 0, 1]', 'm'],
      ['<code>rows</code>, <code>cols</code>, <code>len</code>', 'Filas, columnas y número de elementos.', 'len([1,2;3,4])', '4', 'm'],
      ['<code>sum</code>, <code>prod</code>', 'Suma y producto de todos los elementos.', 'sum([1,2;3,4])', '10', 'm'],
      ['<code>mean</code>, <code>median</code>', 'Media y mediana.', 'median([4,1,3,2])', '2.5', 'm'],
      ['<code>std</code>, <code>variance</code>', 'Desviación estándar y varianza muestrales (entre n−1).', 'variance([2,4,4,4,5,5,7,9])', '4.5714', 'm'],
      ['<code>norm</code>', 'Norma euclidiana (de Frobenius en una matriz).', 'norm([3,4])', '5', 'm'],
      ['<code>min(x)</code>, <code>max(x)</code>', 'Con un solo vector: su menor y su mayor elemento.', 'max([4,1,9])', '9', 'm'],
      ['<code>cumsum</code>, <code>cumprod</code>', 'Suma y producto acumulados.', 'cumsum([1,2,3])', '[1, 3, 6]', 'm'],
      ['<code>dot(a; b)</code>', 'Producto punto.', 'dot([1,2,3]; [4,5,6])', '32', 'm'],
      ['<code>cross(a; b)</code>', 'Producto cruz de vectores de 3 elementos.', 'cross([1,0,0]; [0,1,0])', '[0, 0, 1]', 'm'],
    ],
  },
  {
    title: 'Funciones propias',
    note: 'Se definen en un texto y se usan en las salidas, en las variables y en las cotas. Pueden llamar a otras funciones y a sí mismas.',
    rows: [
      ['<code>f(x):…</code>', 'Función de un parámetro.', 'f(x):x^2+1\nf(3)=', '10', 't'],
      ['<code>g(a; b):…</code>', 'Varios parámetros, separados por <code>;</code> o <code>,</code>.', 'g(a; b):a*b+1\ng(2; 5)=', '11', 't'],
    ],
  },
  {
    title: 'Valores del dibujo',
    note: 'Nombres que una fórmula puede leer. Siempre valen lo que tiene el dibujo en ese momento.',
    rows: [
      ['<code>D1</code>, <code>A1</code>, <code>R1</code>, <code>O1</code>', 'Cotas con nombre: distancia, ángulo (vale en radianes), radio y diámetro. El nombre se puede cambiar.', '', '', ''],
      ['<code>p12.x</code>, <code>p12.y</code>', 'Coordenadas de un punto.', '', '', ''],
      ['<code>l3.len</code> (<code>l3.L</code>), <code>l3.ang</code>', 'Longitud de una línea y su ángulo (de su inicio a su fin, en radianes).', '', '', ''],
      ['<code>c1.r</code>, <code>c1.d</code>, <code>c1.x</code>, <code>c1.y</code>', 'Radio, diámetro y centro de un círculo.', '', '', ''],
      ['<code>a2.r</code>, <code>a2.x</code>, <code>a2.y</code>', 'Radio y centro de un arco.', '', '', ''],
      ['<code>x:…</code>', 'Variables de los textos, leídas de arriba a abajo y de izquierda a derecha.', '', '', ''],
      ['<code>t</code>', 'El tiempo, en los actuadores y las gráficas.', '', '', ''],
      ['<code>MR1</code>, <code>ML1</code>, <code>MR1.v</code>', 'En las gráficas: el desplazamiento de un actuador (también <code>.d</code>) y su velocidad.', '', '', ''],
      ['Reservados', 'No se pueden usar como nombre de cota ni de variable: las funciones y constantes de esta lista, <code>t</code>, <code>j</code>, <code>ω</code>, <code>θ</code> y <code>α</code>.', '', '', ''],
    ],
  },
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const exampleHtml = (ex) => ex.split('\n').map((l) => `<code>${esc(l)}</code>`).join('<br>');

// Seccion de la ayuda (HTML): una tabla por grupo.
export function funcRefHtml() {
  return FUNC_GROUPS.map((g) => {
    const rows = g.rows.map(([name, what, ex, res]) => `<tr><td>${name}</td><td>${what}</td><td>${ex ? exampleHtml(ex) : ''}</td><td>${res ? `<code>${esc(res)}</code>` : ''}</td></tr>`).join('');
    return `<h4>${g.title}</h4>${g.note ? `<p>${g.note}</p>` : ''}<table class="fref"><thead><tr><th>Función</th><th>Qué hace</th><th>Ejemplo</th><th>Da</th></tr></thead><tbody>${rows}</tbody></table>`;
  }).join('\n');
}

// Capitulo del manual (Markdown, docs/funciones.md). Se regenera con «npm run docs:funciones»; test/funcref.test.mjs avisa si quedo viejo.
const md = (h) => h.replace(/<code>([^<]*)<\/code>/g, (_, c) => '`' + c.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&') + '`')
  .replace(/<b>([^<]*)<\/b>/g, '**$1**').replace(/\|/g, '\|');
const mdExample = (ex) => ex.split('\n').map((l) => '`' + l + '`').join('<br>');
export function funcRefMarkdown() {
  const head = `# Funciones y operadores

Todo lo que acepta una fórmula, en las cotas, los textos (\`x:…\` y \`expr=\`), los actuadores y las gráficas. Cada ejemplo muestra lo que da; todos se comprueban con el motor de la app en las pruebas automáticas (\`test/funcref.test.mjs\`). Cómo se usan las fórmulas, las variables y el orden de lectura se explica en [6. Cotas](06-cotas.md) y [7. Texto y cálculo](07-texto-y-calculo.md).

[Índice](README.md) · [7. Texto y cálculo](07-texto-y-calculo.md)
`;
  const body = FUNC_GROUPS.map((g) => {
    const rows = g.rows.map(([name, what, ex, res]) => `| ${md(name)} | ${md(what)} | ${ex ? mdExample(ex) : ''} | ${res ? '`' + res + '`' : ''} |`).join('\n');
    return `## ${g.title}\n\n${g.note ? md(g.note) + '\n\n' : ''}| Función | Qué hace | Ejemplo | Da |\n|---|---|---|---|\n${rows}`;
  }).join('\n\n');
  return `${head}\n---\n\n${body}\n\n---\n\n[Índice](README.md) · [7. Texto y cálculo](07-texto-y-calculo.md)\n`;
}
