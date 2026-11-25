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
      ['<code>+ - * /</code>', 'Suma, resta, multiplicación y división. También <code>÷</code>; entre dos vectores, <code>·</code> es <code>dot</code> y <code>×</code> es <code>cross</code> (ver abajo).', '2+3*4', '14', 'n'],
      ['<code>^</code> (<code>**</code>)', 'Potencia.', '2^10', '1024', 'n'],
      ['Implícita', 'Un número pegado a un paréntesis, a π o a un nombre multiplica.', '3(4+1)', '15', 'n'],
      ['<code>√</code>', 'Raíz cuadrada de lo que sigue.', '√16', '4', 'n'],
      ['<code>;</code> y <code>, </code>', 'Separan los valores de una función de varios. <code>2,5</code> sin espacio es el número 2,5.', 'max(3; 8)', '8', 'n'],
      ['<code>&lt; &gt; &lt;= &gt;= == !=</code>', 'Comparan: dan 1 si se cumple y 0 si no. También <code>≤ ≥ ≠</code>. <code>==</code> y <code>!=</code> toleran el redondeo.', '0.1+0.2==0.3', '1', 'n'],
      ['<code>if(c; a; b)</code> (<code>si</code>)', 'Si la condición <code>c</code> no es 0 vale <code>a</code>, si no <code>b</code>. Solo calcula la rama elegida.', 'if(0==0; 0; 1/0)', '0', 'n'],
      ['<code>a ≈ b</code> (<code>a ~~ b</code>)', 'Casi igual: 1 si |a − b| ≤ tolerancia × máx(1, |a|, |b|), si no 0. La tolerancia (1e-12 por defecto) se cambia en <b>Configuración</b>. Sirve para comparar resultados con redondeo; <code>==</code> sigue siendo la igualdad de la app. Con la misma tolerancia, un resultado sin unidades distinto de 0 y con |x| ≤ tolerancia se muestra <code>≈0</code> (ruido de redondeo, no un cero exacto).', '0.1+0.2 ~~ 0.3', '1', 'n'],
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
      ['<code>sind</code>, <code>cosd</code>, <code>tand</code>', 'Como sin, cos y tan, pero el ángulo siempre en grados (sin importar el modo del dibujo).', 'sind(30)', '0.5', 'n'],
      ['<code>asind</code>, <code>acosd</code>, <code>atand</code>', 'Inversas, con el resultado siempre en grados.', 'atand(1)', '45', 'n'],
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
      ['<code>nthroot(x; n)</code>', 'Raíz n-ésima real: con x negativo y n impar da un negativo (x^(1/n) daría un complejo). Con unidades: nthroot(27\'m^3; 3) = 3 m.', 'nthroot(-27; 3)', '-3', 'n'],
      ['<code>log2</code>', 'Logaritmo en base 2.', 'log2(8)', '3', 'n'],
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
      ['<code>fix</code>', 'Hacia el cero (como trunc).', 'fix(-2.7)', '-2', 'n'],
      ['<code>rem(a; b)</code>', 'Resto de a entre b, con el signo de a (mod lleva el de b).', 'rem(-7; 3)', '-1', 'n'],
      ['<code>gcd(a; b)</code>, <code>lcm(a; b)</code>', 'Máximo común divisor y mínimo común múltiplo (enteros).', 'gcd(12; 18)+lcm(4; 6)', '18', 'n'],
      ['<code>factorial(n)</code>', 'n! (n entero de 0 a 170).', 'factorial(5)', '120', 'n'],
      ['<code>nchoosek(n; k)</code>', 'Combinaciones de n en k.', 'nchoosek(5; 2)', '10', 'n'],
      ['<code>rand()</code>, <code>rand(n)</code>, <code>rand(n; m)</code>', 'Números aleatorios uniformes en [0, 1): uno, una matriz de n×n o de n×m (<code>rand(1; 200)</code>, una fila). La secuencia es <b>reproducible</b>: cada cálculo del dibujo empieza en la misma semilla, para que una salida y su gráfica muestren los mismos valores.', 'size(rand(2; 3))', '[2, 3]', 'm'],
      ['<code>randn(…)</code>', 'Como rand, con distribución normal estándar (media 0, desviación 1). Para media μ y desviación s: <code>μ + s*randn(1; n)</code>.', 'numel(randn(1; 5))', '5', 'n'],
      ['<code>randi(imax; …)</code>, <code>randi([a, b]; …)</code>', 'Enteros aleatorios de 1 a imax, o de a a b; con n y m, una matriz.', 'min(randi([4, 4]; 1; 3))', '4', 'n'],
      ['<code>rng(semilla)</code>, <code>rng("shuffle")</code>', 'Cambia la semilla de rand, randn y randi desde ese punto de la lectura: otra secuencia, también reproducible. Con <code>"shuffle"</code>, una semilla nueva con cada cambio del dibujo (y con cada paso de <code>wfile</code>): para un juego o una simulación que no deba repetirse. Entre cambios se mantiene: la pantalla se redibuja con la misma tirada. Vale la semilla.', 'rng(7)', '7', 'n'],
    ],
  },
  {
    title: 'Vectores y matrices',
    note: 'Se escriben entre corchetes: la coma separa los elementos de una fila, el punto y coma empieza otra fila, y los decimales llevan punto. Se usan en los textos (<code>A:[1,2;3,4]</code>, <code>A=</code>); una cota puede leer un elemento (<code>D1 = x_2</code>).',
    rows: [
      ['<code>[1, 2, 3]</code>, <code>[1; 2; 3]</code>', 'Vector fila y vector columna.', '[1,2,3]^T', '[1; 2; 3]', 'm'],
      ['<code>[V; M]</code>, <code>[A, b]</code>', 'Por bloques: los elementos pueden ser vectores o matrices. La coma los pone lado a lado (mismo número de filas) y el punto y coma uno debajo del otro (mismo número de columnas).', 'V:[2,1]\nM:[1,3]\nF:[5;10]\n[V;M]^(-1)*F=', '[1; 3]', 't'],
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
      ['<code>dot(a; b)</code>', 'Producto punto. También se escribe <code>a · b</code> (o <code>a ⋅ b</code>), en cualquier orientación salvo columna por fila (<code>a · bᵀ</code>), que es el producto exterior, una matriz.', 'dot([1,2,3]; [4,5,6])', '32', 'm'],
      ['<code>cross(a; b)</code>', 'Producto cruz de vectores de 3 elementos. También se escribe <code>a × b</code>. Con tres vectores, <code>a×b×c</code> y <code>a·b×c</code> son ambiguos y dan error: usa paréntesis.', 'cross([1,0,0]; [0,1,0])', '[0, 0, 1]', 'm'],
      ['<code>dist(p; q)</code>', 'Distancia entre dos puntos (vectores del mismo tamaño, con sus unidades).', 'dist([0,0]; [3,4])', '5', 'n'],
    ],
  },
  {
    title: 'Construir y reordenar matrices',
    note: 'Las que reordenan conservan las unidades y los complejos.',
    rows: [
      ['<code>zeros(n; m)</code>, <code>ones(n; m)</code>', 'Matriz de ceros o de unos (de n×n con un solo valor).', 'zeros(2; 3)', '[0, 0, 0; 0, 0, 0]', 'm'],
      ['<code>linspace(a; b; n)</code>', 'n valores igualmente espaciados de a a b (100 si se omite n).', 'linspace(0; 1; 5)', '[0, 0.25, 0.5, 0.75, 1]', 'm'],
      ['<code>logspace(a; b; n)</code>', 'n valores de 10^a a 10^b en escala logarítmica (50 si se omite n).', 'logspace(0; 2; 3)', '[1, 10, 100]', 'm'],
      ['<code>numel(A)</code>, <code>size(A)</code>', 'Número de elementos (también de un vector de cadenas); [filas, columnas].', 'size([1,2,3;4,5,6])', '[2, 3]', 'm'],
      ['<code>transpose(A)</code>', 'Transpuesta (como A^T).', 'transpose([1,2;3,4])', '[1, 3; 2, 4]', 'm'],
      ['<code>sort(v)</code>', 'Ordena un vector de menor a mayor.', 'sort([3,1,2])', '[1, 2, 3]', 'm'],
      ['<code>flip(v)</code>, <code>fliplr(A)</code>, <code>flipud(A)</code>', 'Invierte el orden: un vector; las columnas (izquierda-derecha); las filas (arriba-abajo).', 'fliplr([1,2;3,4])', '[2, 1; 4, 3]', 'm'],
      ['<code>repmat(A; n; m)</code>', 'Repite A n veces hacia abajo y m hacia la derecha.', 'repmat([1,2]; 2; 2)', '[1, 2, 1, 2; 1, 2, 1, 2]', 'm'],
      ['<code>reshape(A; n; m)</code>', 'Los mismos elementos en n×m, tomados por columnas.', 'reshape([1,2,3,4,5,6]; 3; 2)', '[1, 4; 2, 5; 3, 6]', 'm'],
      ['<code>horzcat(A; B; …)</code>, <code>vertcat(A; B; …)</code>', 'Lado a lado y uno debajo del otro (como [A, B] y [A; B]).', 'vertcat([1,2]; [3,4])', '[1, 2; 3, 4]', 'm'],
      ['<code>kron(A; B)</code>', 'Producto de Kronecker.', 'kron([1,2]; [1;1])', '[1, 2; 1, 2]', 'm'],
      ['<code>any(v)</code>', '1 si algún elemento no es 0.', 'any([0,0,3])', '1', 'n'],
      ['<code>find(v)</code>', 'Las posiciones (desde 1; en una matriz, por columnas) de los elementos que no son 0; 0 si no hay ninguno. Con una comparación, qué elementos cumplen: <code>find(v > 100)</code>.', 'find([0,3,0,5])', '[2, 4]', 'm'],
    ],
  },
  {
    title: 'Álgebra lineal',
    note: 'Con números reales (inv, det, linsolve y eig también con complejos). eig admite hasta 12×12.',
    rows: [
      ['<code>linsolve(A; b)</code>', 'x tal que A·x = b. Si A no es cuadrada, por mínimos cuadrados.', 'linsolve([2,1;1,3]; [3;5])', '[0.8; 1.4]', 'm'],
      ['<code>rank(A)</code>', 'Rango.', 'rank([1,2;2,4])', '1', 'n'],
      ['<code>cond(A)</code>', 'Número de condición (con valores singulares).', 'cond([1,0;0,2])', '2', 'n'],
      ['<code>pinv(A)</code>', 'Pseudoinversa (vale con matrices singulares o no cuadradas).', 'pinv([1,2;2,4])', '[0.04, 0.08; 0.08, 0.16]', 'm'],
      ['<code>eig(A)</code>', 'Valores propios, en una columna; complejos si los hay.', 'eig([2,1;1,2])', '[1; 3]', 'm'],
      ['', '', 'eig([0,1;-1,0])=', '[-1j; 1j]', 't'],
    ],
  },
  {
    title: 'Diferencias, acumulados e integrales',
    rows: [
      ['<code>diff(v)</code>', 'Diferencias entre elementos seguidos.', 'diff([1,4,9,16])', '[3, 5, 7]', 'm'],
      ['<code>cummax(v)</code>, <code>cummin(v)</code>', 'Máximo y mínimo acumulados.', 'cummax([1,3,2,5,4])', '[1, 3, 3, 5, 5]', 'm'],
      ['<code>mode(v)</code>', 'El valor más repetido (con empate, el menor).', 'mode([1,2,2,3,3])', '2', 'n'],
      ['<code>trapz(x; y)</code>, <code>cumtrapz(x; y)</code>', 'Integral por trapecios de datos (y acumulada). Con un solo vector, paso 1.', 'trapz([0,1,2]; [0,1,4])', '3', 'n'],
      ['<code>integral(expr; x; a; b)</code>', 'Integral de una expresión con la variable x, entre a y b (numérica, adaptativa). Como en fzero, la variable se nombra. Con unidades: las de expr por las de x.', 'integral(x^2; x; 0; 3)', '9', 'n'],
    ],
  },
  {
    title: 'Interpolación y polinomios',
    note: 'Un polinomio es el vector de sus coeficientes, del mayor grado al menor: [1, 0, -2] es x² − 2.',
    rows: [
      ['<code>interp1(xs; ys; x)</code>', 'Interpolación lineal en una tabla (x un número o un vector; conserva las unidades de ys). Fuera de la tabla da ⚠; con <code>interp1(xs; ys; x; "extrap")</code> extrapola con el primer o el último tramo.', 'interp1([0,1,2]; [0,10,40]; 1.5)', '25', 'n'],
      ['<code>polyval(p; x)</code>', 'Valor del polinomio en x.', 'polyval([1,0,-2]; 3)', '7', 'n'],
      ['<code>roots(p)</code>', 'Raíces (columna); complejas si las hay.', 'roots([1,-6,11,-6])', '[3; 2; 1]', 'm'],
      ['', '', 'roots([1,0,1])=', '[1j; -1j]', 't'],
      ['<code>polyfit(x; y; n)</code>', 'Polinomio de grado n por mínimos cuadrados.', 'polyfit([0,1,2]; [1,3,5]; 1)', '[2, 1]', 'm'],
      ['<code>conv(p; q)</code>', 'Producto de polinomios.', 'conv([1,1]; [1,-1])', '[1, 0, -1]', 'm'],
      ['<code>polyder(p)</code>, <code>polyint(p)</code>', 'Derivada e integral (con constante 0).', 'polyder([1,2,3])', '[2, 2]', 'm'],
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
    title: 'Números complejos',
    note: '<code>j</code> es la unidad imaginaria (<code>3+4j</code>); un número también lleva el sufijo: <code>2.5j</code> o <code>2.5i</code> (la letra <code>i</code> sola sigue siendo una variable). La raíz de un negativo da un complejo: <code>sqrt(-4)</code> es <code>2j</code>, <code>ln(-1)</code> es <code>πj</code> y una base negativa con exponente no entero da un complejo. Valen las operaciones, las potencias, las funciones (sin, exp, ln, sqrt…), las matrices (inv, det, producto) y las unidades (una impedancia en Ω). Con complejos solo se compara con <code>==</code> y <code>!=</code>. Una cota, una gráfica o la condición de un if necesitan un real: abs, angle, real o imag lo dan.',
    rows: [
      ['<code>abs(z)</code>', 'Módulo.', 'abs(3+4j)', '5', 'n'],
      ['<code>angle(z)</code>', 'Argumento (en grados o radianes, según el dibujo).', 'angle(1+1j)', '45', 'n'],
      ['<code>real(z)</code>, <code>imag(z)</code>', 'Parte real e imaginaria.', 'real((1+2j)*(3-1j))', '5', 'n'],
      ['', '', 'imag((1+2j)*(3-1j))', '5', 'n'],
      ['<code>conj(z)</code>', 'Conjugado: z·conj(z) = |z|².', 'real((3+4j)*conj(3+4j))', '25', 'n'],
    ],
  },
  {
    title: 'Cadenas',
    note: 'Una cadena va entre comillas: <code>"Cumple"</code> (sirven las “ ” del iPad; <code>""</code> dentro es una comilla). Se unen con <code>+</code> y se comparan con <code>==</code> y <code>!=</code>; un número se convierte con <code>num2str</code> (con su unidad). <code>["a", "b"]</code> es un vector de cadenas (<code>v_2</code> es la segunda). En el resultado se muestran entre comillas tipográficas. Para un mensaje de verificación: <code>if(σ&lt;Sy, "Cumple", "No cumple")</code>.',
    rows: [
      ['<code>num2str(x; n)</code>, <code>string(x)</code>', 'Un número como texto, con su unidad y como lo muestra la app (n decimales fijos si se da).', '"Tensión: " + num2str(210.254\'MPa)=', '“Tensión: 210.254 MPa”', 't'],
      ['<code>sprintf(formato; …)</code>', 'Formato: %d, %f, %.2f, %e, %g, %s, %%. Sin unidades: divide por la unidad que quieres (F/1\'kN).', 'sprintf("%.1f kN"; 12.345)=', '“12.3 kN”', 't'],
      ['<code>str2double(s)</code>, <code>str2num(s)</code>', 'El número escrito en una cadena.', 'str2double("3.25")*2', '6.5', 'n'],
      ['<code>strcat(a; b; …)</code>', 'Une cadenas (como +).', 'strcat("A"; "-"; "CAD")=', '“A-CAD”', 't'],
      ['<code>upper</code>, <code>lower</code>, <code>strtrim</code>, <code>reverse</code>', 'Mayúsculas, minúsculas, sin espacios en los extremos, al revés.', 'upper("abc")=', '“ABC”', 't'],
      ['<code>strrep(s; viejo; nuevo)</code>, <code>replace(s; viejo; nuevo)</code>', 'Reemplaza todas las apariciones.', 'strrep("a-b-c"; "-"; "+")=', '“a+b+c”', 't'],
      ['<code>isempty(s)</code>', '1 si la cadena está vacía (o todas las de un vector de cadenas); un número o un vector nunca lo están.', 'isempty("")', '1', 'n'],
      ['<code>strsplit(s; sep)</code>, <code>strjoin(v; sep)</code>', 'Parte una cadena en un vector de cadenas (por espacios si no se da sep) y las vuelve a unir.', 'strjoin(strsplit("a,b,c"; ","); " | ")=', '“a | b | c”', 't'],
      ['<code>strlength(s)</code>', 'Número de caracteres.', 'strlength("hola")', '4', 'n'],
      ['<code>contains</code>, <code>startsWith</code>, <code>endsWith</code>', '1 si la cadena contiene, empieza o termina con el patrón.', 'contains("hola mundo"; "mun")', '1', 'n'],
      ['<code>strfind(s; patrón)</code>', 'Posiciones (desde 1) donde aparece el patrón; 0 si no aparece.', 'strfind("abcabc"; "bc")', '[2, 5]', 'm'],
      ['<code>strcmp(a; b)</code>, <code>strcmpi(a; b)</code>', '1 si son iguales (strcmpi, sin distinguir mayúsculas).', 'strcmpi("Abc"; "aBC")', '1', 'n'],
      ['<code>extractBefore</code>, <code>extractAfter</code>, <code>extractBetween</code>', 'Lo que hay antes o después de un patrón (o de una posición), o entre dos; con dos números, entre esas posiciones (incluidas).', 'extractAfter("x=10"; "=")=', '“10”', 't'],
      ['', 'Entre dos posiciones.', 'extractBetween("abcdef"; 2; 4)=', '“bcd”', 't'],
    ],
  },
  {
    title: 'Programas',
    note: 'Pasos en orden y ciclos dentro de una fórmula. Dentro, <code>s:valor</code> asigna una variable <b>local</b>: vale solo en esa fórmula (no crea variables del documento ni cambia las de afuera). Se pueden escribir en varias líneas, con sangría, y se dibujan como se escribieron. Un ciclo tiene un tope de 100 000 vueltas y 1,5 s: si lo pasa, avisa en vez de congelar la app.',
    rows: [
      ['<code>line(a; b; …; r)</code>', 'Hace los pasos en orden y vale el último.', 'line(a:2; b:a^2; a+b)', '6', 'n'],
      ['<code>for(i; inicio..fin; cuerpo)</code>', 'Repite el cuerpo con i = inicio, inicio+1, … hasta fin (si fin < inicio, ninguna vez). Con un vector en lugar del rango, i toma cada elemento.', 'suma2(n):line(s:0; for(i; 1..n; s:s+i^2); s)\nsuma2(10)=', '385', 't'],
      ['<code>while(condición; cuerpo)</code>', 'Repite el cuerpo mientras la condición se cumpla. Para varios pasos en el cuerpo, <code>line(…)</code>.', 'line(k:0; while(k^2<50; k:k+1); k)', '8', 'n'],
      ['<code>break()</code>, <code>continue()</code>', 'Dentro de un for o un while: <code>break()</code> sale del ciclo; <code>continue()</code> pasa a la vuelta siguiente. En un script se escriben solos en su línea: <code>break</code>, <code>continue</code>.', 'line(s:0; for(i; 1..10; line(if(i > 3; break(); 0); s:s + i)); s)', '6', 'n'],
      ['<code>return(x)</code>', 'Termina la función (o el script) con el valor x, sin seguir. En un script, <code>return x</code>.', 'line(return(5); 7)', '5', 'n'],
      ['<code>v_i:valor</code>, <code>A_(i,j):valor</code>', 'Asigna un elemento de un vector o de una matriz (o de un vector de cadenas) dentro de un programa, sobre una copia local: la variable del documento no cambia afuera. Un índice más allá del final agranda el vector con ceros (sirve para armar un vector en un <code>for</code>). El valor lleva la magnitud del vector; un vector de ceros sin unidades toma la del primer valor.', 'line(p:[1,2,3]; p_2:7; sum(p))', '11', 'n'],
    ],
  },
  {
    title: 'Ecuaciones',
    note: 'Se resuelven numéricamente (Levenberg-Marquardt): desde un valor inicial se busca el valor que cumple la ecuación. Con varias raíces da la más cercana al valor inicial; si no encuentra una, avisa. Para un sistema de ecuaciones, <code>solve(…)=</code> en un texto (ver <a href="07-texto-y-calculo.md#orden-de-lectura" data-help="calc" data-topic="Orden de lectura">Orden de lectura</a> en Texto y cálculo).',
    rows: [
      ['<code>fzero(ecuación; x; inicial)</code>', 'El valor de x que cumple la ecuación, escrita con <code>==</code> (<code>x^2 == 2</code>) o como una expresión que vale 0 (<code>x^2-2</code>). El valor inicial lleva las unidades de x; sin él usa el valor de x en ese punto, o 1.', 'fzero(x^2 == 2; x; 1)', '1.4142', 'm'],
      ['', 'Con unidades: la fuerza que da un momento de 30 kN·m con un brazo de 2 m (en kN).', "fzero(F*2'm == 30'kN*'m; F; 1'kN)/(1'kN)", '15', 'm'],
    ],
  },
  {
    title: 'Datos entre dibujos',
    note: 'Guardan un valor para leerlo después o desde otro dibujo. Los datos viven en este navegador, en este dispositivo (Archivo → Datos los muestra, exporta e importa). Se escriben al confirmar un cambio del dibujo, no al arrastrar ni en la simulación; rfile lee siempre lo guardado, así con <code>c:rfile(n)</code> y <code>wfile(c+1; n)</code> cada cambio suma 1 y se ve lo último guardado.',
    rows: [
      ['<code>wfile(valor; Nombre)</code>', 'Guarda el valor (un número con su unidad, un vector, una matriz o una cadena) en el archivo de datos <i>Nombre</i> y vale 1. El nombre no se evalúa: es el de una variable (no importa su valor, ni si existe) o una cadena con extensión, <code>"datos.txt"</code>. El archivo es texto con la sintaxis de A-CAD y punto decimal: <code>12\'kN</code>, <code>[1, 2; 3, 4]\'mm</code>, <code>"texto"</code>.', "a:12'kN\nwfile(a; MiVariable)=", '1', 't'],
      ['<code>rfile(Nombre)</code>', 'El valor guardado con <code>wfile</code>, con sus unidades: <code>q:rfile(MiVariable)</code> da 12 kN. Si no hay datos con ese nombre, da ⚠.', '', '', ''],
      ['<code>rfile(Nombre; inicial)</code>', 'Lo guardado o, si todavía no hay datos con ese nombre, <i>inicial</i> (que solo se calcula entonces): sirve para empezar, <code>c:rfile(n; 0)</code>. Es una extensión de A-CAD.', 'rfile(NoExiste; 42)', '42', 'n'],
      ['<code>entered(nombre)</code>', 'Vale 1 en el paso que inició un Enter sobre el texto que define <i>nombre</i> (en la edición en el lugar, también sin cambiarlo) y 0 en cualquier otro paso: abrir el dibujo, mover algo, editar otro texto. Para ejecutar una orden al confirmarla: <code>wfile(si(entered(orden); hacer(x; orden); x); Estado)</code>.', 'entered(x)', '0', 'n'],
    ],
  },
  {
    title: 'Sonidos',
    note: 'Archivos de audio de la carpeta de datos del dispositivo (Archivo → Datos…: se importan con un nombre, se prueban, exportan y borran). Al importarlos se reducen (un canal, 16 kHz, 8 bits): unos 16 KB por segundo. El dibujo lleva incrustados los que nombra entre comillas, <code>play("nombre")</code>, y los restaura al abrirse si faltan; un nombre armado con una variable no viaja con el dibujo.',
    rows: [
      ['<code>play("nombre")</code>', 'Hace sonar el sonido del dibujo con ese nombre, una vez, en el paso que confirma un cambio del dibujo (un Enter en un texto: el mismo paso en que se ejecuta <code>wfile</code>). No suena al redibujar, al arrastrar, al abrir el dibujo ni en la simulación. Vale 1 si el dibujo tiene ese sonido y 0 si no (sin error), y se puede usar dentro de una función o de una biblioteca: <code>if(choca; play("explosion"); 0)</code>. Los navegadores solo dejan sonar después de un toque o una tecla.', '', '', ''],
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

// Los textos fijos de la referencia (columnas, titulo, presentacion y navegacion del capitulo del manual); se traducen igual que los de los grupos.
const FIXED = {
  cols: ['Función', 'Qué hace', 'Ejemplo', 'Da'],
  title: 'Funciones y operadores',
  intro: 'Todo lo que acepta una fórmula, en las cotas, los textos (`x:…` y `expr=`), los actuadores y las gráficas. Cada ejemplo muestra lo que da; todos se comprueban con el motor de la app en las pruebas automáticas (`test/funcref.test.mjs`). Cómo se usan las fórmulas, las variables y el orden de lectura se explica en [6. Cotas](06-cotas.md) y [7. Texto y cálculo](07-texto-y-calculo.md).',
  nav: '[Índice](README.md) · [7. Texto y cálculo](07-texto-y-calculo.md)',
};
// Un texto tiene algo que traducir si, quitado el codigo y las marcas, le quedan palabras
const hasText = (s) => /[A-Za-zÁÉÍÓÚáéíóúñÑ]{3,}/.test(String(s).replace(/<code>[^<]*<\/code>/g, '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/`[^`]*`/g, ' '));
// Todos los textos que se traducen (para el catalogo en ingles y su prueba), sin repetir
export const funcRefStrings = () => {
  const out = new Set([...FIXED.cols, FIXED.title, FIXED.intro, FIXED.nav]);
  for (const g of FUNC_GROUPS) for (const s of [g.title, g.note, ...g.rows.flatMap((r) => [r[0], r[1]])]) if (s && hasText(s)) out.add(s);
  return [...out];
};

const id = (s) => s;
// Seccion de la ayuda (HTML): una tabla por grupo. T traduce un texto (en español, la identidad).
export function funcRefHtml(T = id) {
  const th = FIXED.cols.map((h) => `<th>${T(h)}</th>`).join('');
  return FUNC_GROUPS.map((g) => {
    const rows = g.rows.map(([name, what, ex, res]) => `<tr><td>${T(name)}</td><td>${T(what)}</td><td>${ex ? exampleHtml(ex) : ''}</td><td>${res ? `<code>${esc(res)}</code>` : ''}</td></tr>`).join('');
    return `<h4>${T(g.title)}</h4>${g.note ? `<p>${T(g.note)}</p>` : ''}<table class="fref"><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table>`;
  }).join('\n');
}

// Capitulo del manual (Markdown, docs/funciones.md y docs/en/funciones.md). Se regenera con «npm run docs»; test/funcref.test.mjs avisa si quedo viejo.
const md = (h) => h.replace(/<code>([^<]*)<\/code>/g, (_, c) => '`' + c.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&') + '`')
  .replace(/<b>([^<]*)<\/b>/g, '**$1**').replace(/<a href="([^"]*)"[^>]*>([^<]*)<\/a>/g, '[$2]($1)').replace(/\|/g, '\|');
const mdExample = (ex) => ex.split('\n').map((l) => '`' + l + '`').join('<br>');
export function funcRefMarkdown(T = id) {
  const head = `# ${T(FIXED.title)}\n\n${T(FIXED.intro)}\n\n${T(FIXED.nav)}\n`;
  const cols = FIXED.cols.map(T), hdr = `| ${cols.join(' | ')} |\n|---|---|---|---|`;
  const body = FUNC_GROUPS.map((g) => {
    const rows = g.rows.map(([name, what, ex, res]) => `| ${md(T(name))} | ${md(T(what))} | ${ex ? mdExample(ex) : ''} | ${res ? '`' + res + '`' : ''} |`).join('\n');
    return `## ${T(g.title)}\n\n${g.note ? md(T(g.note)) + '\n\n' : ''}${hdr}\n${rows}`;
  }).join('\n\n');
  return `${head}\n---\n\n${body}\n\n---\n\n${T(FIXED.nav)}\n`;
}
