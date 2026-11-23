# Funciones y operadores

Todo lo que acepta una fórmula, en las cotas, los textos (`x:…` y `expr=`), los actuadores y las gráficas. Cada ejemplo muestra lo que da; todos se comprueban con el motor de la app en las pruebas automáticas (`test/funcref.test.mjs`). Cómo se usan las fórmulas, las variables y el orden de lectura se explica en [6. Cotas](06-cotas.md) y [7. Texto y cálculo](07-texto-y-calculo.md).

[Índice](README.md) · [7. Texto y cálculo](07-texto-y-calculo.md)

---

## Operadores

Sirven en cotas, textos (`x:…` y `expr=`), actuadores y gráficas.

| Función | Qué hace | Ejemplo | Da |
|---|---|---|---|
| `+ - * /` | Suma, resta, multiplicación y división. También `×`, `·` y `÷`. | `2+3*4` | `14` |
| `^` (`**`) | Potencia. | `2^10` | `1024` |
| Implícita | Un número pegado a un paréntesis, a π o a un nombre multiplica. | `3(4+1)` | `15` |
| `√` | Raíz cuadrada de lo que sigue. | `√16` | `4` |
| `;` y `, ` | Separan los valores de una función de varios. `2,5` sin espacio es el número 2,5. | `max(3; 8)` | `8` |
| `< > <= >= == !=` | Comparan: dan 1 si se cumple y 0 si no. También `≤ ≥ ≠`. `==` y `!=` toleran el redondeo. | `0.1+0.2==0.3` | `1` |
| `if(c; a; b)` (`si`) | Si la condición `c` no es 0 vale `a`, si no `b`. Solo calcula la rama elegida. | `if(0==0; 0; 1/0)` | `0` |
| `a ≈ b` (`a ~~ b`) | Casi igual: 1 si |a − b| ≤ tolerancia × máx(1, |a|, |b|), si no 0. La tolerancia (1e-12 por defecto) se cambia en **Configuración**. Sirve para comparar resultados con redondeo; `==` sigue siendo la igualdad de la app. | `0.1+0.2 ~~ 0.3` | `1` |

## Constantes

| Función | Qué hace | Ejemplo | Da |
|---|---|---|---|
| `π` (`pi`) | Pi. Un valor que lleva π está en radianes. | `π` | `3.1416` |
| `e` | Número de Euler. | `e` | `2.7183` |

## Trigonometría

Los ángulos de los **textos de cálculo y las gráficas** van según la opción del dibujo **Configuración → Ángulos en**: en **radianes** (los dibujos nuevos: `sin(π/2)` da 1) o en **grados** (los dibujos anteriores, que no tienen la opción: `sin(30)` da 0.5). En grados, si el argumento lleva π o es un ángulo del dibujo (una cota angular como `A1` o `l3.ang`) va en radianes. Las **cotas** y los actuadores siempre van en grados; en una cota angular en radianes, todo va en radianes.

| Función | Qué hace | Ejemplo | Da |
|---|---|---|---|
| `sin` (`sen`), `cos`, `tan` | Seno, coseno y tangente. | `sin(30)` | `0.5` |
|  | Con π, en radianes. | `cos(π/3)` | `0.5` |
| `sec`, `csc`, `cot` | Secante, cosecante y cotangente, con la misma regla. | `sec(60)` | `2` |
| `asin`, `acos`, `atan` | Inversas: devuelven grados (radianes si el dibujo está en radianes). | `asin(0.5)` | `30` |
| `atan2(y; x)` | Ángulo del punto (x, y) en grados, de −180 a 180. | `atan2(1; -1)` | `135` |
| `sinh`, `cosh`, `tanh`, `asinh`, `acosh`, `atanh` | Hiperbólicas (no usan ángulos). | `cosh(0)` | `1` |
| `deg(x)` | De radianes a grados. | `deg(π)` | `180` |
| `rad(x)` | De grados a radianes. | `rad(180)` | `3.1416` |
| `sind`, `cosd`, `tand` | Como sin, cos y tan, pero el ángulo siempre en grados (sin importar el modo del dibujo). | `sind(30)` | `0.5` |
| `asind`, `acosd`, `atand` | Inversas, con el resultado siempre en grados. | `atand(1)` | `45` |

## Raíces, potencias y logaritmos

| Función | Qué hace | Ejemplo | Da |
|---|---|---|---|
| `sqrt` (`raiz`, `√`) | Raíz cuadrada. | `sqrt(2)` | `1.4142` |
| `exp` | e elevado a x. | `exp(1)` | `2.7183` |
| `ln` | Logaritmo natural. | `ln(e^2)` | `2` |
| `log` (`log10`) | Logaritmo en base 10. | `log(1000)` | `3` |
| `abs` | Valor absoluto. | `abs(-7)` | `7` |
| `sign` (`signo`) | Signo: −1, 0 o 1. | `sign(-3)` | `-1` |
| `hypot(a; b; …)` | Raíz de la suma de los cuadrados. | `hypot(3; 4)` | `5` |
| `nthroot(x; n)` | Raíz n-ésima real: con x negativo y n impar da un negativo (x^(1/n) daría un complejo). Con unidades: nthroot(27'm^3; 3) = 3 m. | `nthroot(-27; 3)` | `-3` |
| `log2` | Logaritmo en base 2. | `log2(8)` | `3` |

## Redondeo, mínimos y máximos

| Función | Qué hace | Ejemplo | Da |
|---|---|---|---|
| `round(x; n)` (`redondear`) | Redondea a `n` decimales (0 si se omite). La mitad se aleja del cero. | `round(2.675; 2)` | `2.68` |
| `floor` (`piso`) | Entero hacia abajo. | `floor(-2.5)` | `-3` |
| `ceil` (`techo`) | Entero hacia arriba. | `ceil(2.1)` | `3` |
| `trunc` | Quita los decimales. | `trunc(-2.7)` | `-2` |
| `mod(a; b)` | Resto de a entre b, con el signo de b. | `mod(-7; 3)` | `2` |
| `min(a; b; …)`, `max(a; b; …)` | El menor y el mayor de varios valores. | `min(4; 1; 9)` | `1` |
| `clamp(x; mín; máx)` | Recorta x al intervalo. | `clamp(15; 0; 10)` | `10` |
| `fix` | Hacia el cero (como trunc). | `fix(-2.7)` | `-2` |
| `rem(a; b)` | Resto de a entre b, con el signo de a (mod lleva el de b). | `rem(-7; 3)` | `-1` |
| `gcd(a; b)`, `lcm(a; b)` | Máximo común divisor y mínimo común múltiplo (enteros). | `gcd(12; 18)+lcm(4; 6)` | `18` |
| `factorial(n)` | n! (n entero de 0 a 170). | `factorial(5)` | `120` |
| `nchoosek(n; k)` | Combinaciones de n en k. | `nchoosek(5; 2)` | `10` |
| `rand()`, `rand(n)`, `rand(n; m)` | Números aleatorios uniformes en [0, 1): uno, una matriz de n×n o de n×m (`rand(1; 200)`, una fila). La secuencia es **reproducible**: cada cálculo del dibujo empieza en la misma semilla, para que una salida y su gráfica muestren los mismos valores. | `size(rand(2; 3))` | `[2, 3]` |
| `randn(…)` | Como rand, con distribución normal estándar (media 0, desviación 1). Para media μ y desviación s: `μ + s*randn(1; n)`. | `numel(randn(1; 5))` | `5` |
| `randi(imax; …)`, `randi([a, b]; …)` | Enteros aleatorios de 1 a imax, o de a a b; con n y m, una matriz. | `min(randi([4, 4]; 1; 3))` | `4` |
| `rng(semilla)`, `rng("shuffle")` | Cambia la semilla de rand, randn y randi desde ese punto de la lectura: otra secuencia, también reproducible. Con `"shuffle"`, como en MATLAB, una semilla nueva cada vez que el dibujo se recalcula (al cambiar algo): para un juego o una simulación que no deba repetirse. Una salida muestra siempre la misma tirada aunque la pantalla se redibuje. Vale la semilla. | `rng(7)` | `7` |

## Vectores y matrices

Se escriben entre corchetes: la coma separa los elementos de una fila, el punto y coma empieza otra fila, y los decimales llevan punto. Se usan en los textos (`A:[1,2;3,4]`, `A=`); una cota puede leer un elemento (`D1 = x_2`).

| Función | Qué hace | Ejemplo | Da |
|---|---|---|---|
| `[1, 2, 3]`, `[1; 2; 3]` | Vector fila y vector columna. | `[1,2,3]^T` | `[1; 2; 3]` |
| `[V; M]`, `[A, b]` | Por bloques, como en MATLAB: los elementos pueden ser vectores o matrices. La coma los pone lado a lado (mismo número de filas) y el punto y coma uno debajo del otro (mismo número de columnas). | `V:[2,1]`<br>`M:[1,3]`<br>`F:[5;10]`<br>`[V;M]^(-1)*F=` | `[1; 3]` |
| `a..b;n` | Rango: `n` valores de a hasta b, ambos incluidos. | `x:0..1;5`<br>`x=` | `[0, 0.25, 0.5, 0.75, 1]` |
| `a..paso..b` | Rango con paso, sin pasar de b (el paso puede ser negativo). | `x:10..-3..1`<br>`x=` | `[10, 7, 4, 1]` |
| `x_i`, `A_(i,j)` | Elemento, contando desde 1. Los índices pueden ser fórmulas: `x_(i+1)`. | `A:[1,2;3,4]`<br>`A_(2,1)=` | `3` |
| `A_(i,:)`, `A_(:,j)` | Fila i y columna j. | `A:[1,2;3,4]`<br>`A_(:,2)=` | `[2; 4]` |
| `^T` | Transpuesta. | `[1,2;3,4]^T` | `[1, 3; 2, 4]` |
| `+ -` | Entre matrices del mismo tamaño, o un número con cada elemento. | `[1,2]+10` | `[11, 12]` |
| `*` | Producto matricial (o número por matriz). | `[1,2;3,4]*[5;6]` | `[17; 39]` |
| `.* ./ .^` | Elemento a elemento. | `[1,2,3].^2` | `[1, 4, 9]` |
| Funciones de un valor | Sobre una matriz, se aplican a cada elemento. | `sqrt([4,9])` | `[2, 3]` |
| `inv(A)`, `A^(-1)` | Inversa (avisa si es singular o no es cuadrada). | `inv([2,0;0,4])` | `[0.5, 0; 0, 0.25]` |
| `A^n` | Potencia entera de una matriz cuadrada. | `[1,1;0,1]^3` | `[1, 3; 0, 1]` |
| `det` | Determinante. | `det([1,2;3,4])` | `-2` |
| `trace` | Traza: suma de la diagonal. | `trace([1,2;3,4])` | `5` |
| `diag` | De un vector, la matriz diagonal; de una matriz, su diagonal. | `diag([1,2])` | `[1, 0; 0, 2]` |
| `eye(n)` | Matriz identidad de n×n. | `eye(2)` | `[1, 0; 0, 1]` |
| `rows`, `cols`, `len` | Filas, columnas y número de elementos. | `len([1,2;3,4])` | `4` |
| `sum`, `prod` | Suma y producto de todos los elementos. | `sum([1,2;3,4])` | `10` |
| `mean`, `median` | Media y mediana. | `median([4,1,3,2])` | `2.5` |
| `std`, `variance` | Desviación estándar y varianza muestrales (entre n−1). | `variance([2,4,4,4,5,5,7,9])` | `4.5714` |
| `norm` | Norma euclidiana (de Frobenius en una matriz). | `norm([3,4])` | `5` |
| `min(x)`, `max(x)` | Con un solo vector: su menor y su mayor elemento. | `max([4,1,9])` | `9` |
| `cumsum`, `cumprod` | Suma y producto acumulados. | `cumsum([1,2,3])` | `[1, 3, 6]` |
| `dot(a; b)` | Producto punto. | `dot([1,2,3]; [4,5,6])` | `32` |
| `cross(a; b)` | Producto cruz de vectores de 3 elementos. | `cross([1,0,0]; [0,1,0])` | `[0, 0, 1]` |
| `dist(p; q)` | Distancia entre dos puntos (vectores del mismo tamaño, con sus unidades). | `dist([0,0]; [3,4])` | `5` |

## Construir y reordenar matrices

Con los nombres de MATLAB. Las que reordenan conservan las unidades y los complejos.

| Función | Qué hace | Ejemplo | Da |
|---|---|---|---|
| `zeros(n; m)`, `ones(n; m)` | Matriz de ceros o de unos (de n×n con un solo valor). | `zeros(2; 3)` | `[0, 0, 0; 0, 0, 0]` |
| `linspace(a; b; n)` | n valores igualmente espaciados de a a b (100 si se omite n). | `linspace(0; 1; 5)` | `[0, 0.25, 0.5, 0.75, 1]` |
| `logspace(a; b; n)` | n valores de 10^a a 10^b en escala logarítmica (50 si se omite n). | `logspace(0; 2; 3)` | `[1, 10, 100]` |
| `numel(A)`, `size(A)` | Número de elementos; [filas, columnas]. | `size([1,2,3;4,5,6])` | `[2, 3]` |
| `transpose(A)` | Transpuesta (como A^T). | `transpose([1,2;3,4])` | `[1, 3; 2, 4]` |
| `sort(v)` | Ordena un vector de menor a mayor. | `sort([3,1,2])` | `[1, 2, 3]` |
| `flip(v)`, `fliplr(A)`, `flipud(A)` | Invierte el orden: un vector; las columnas (izquierda-derecha); las filas (arriba-abajo). | `fliplr([1,2;3,4])` | `[2, 1; 4, 3]` |
| `repmat(A; n; m)` | Repite A n veces hacia abajo y m hacia la derecha. | `repmat([1,2]; 2; 2)` | `[1, 2, 1, 2; 1, 2, 1, 2]` |
| `reshape(A; n; m)` | Los mismos elementos en n×m, tomados por columnas (como MATLAB). | `reshape([1,2,3,4,5,6]; 3; 2)` | `[1, 4; 2, 5; 3, 6]` |
| `horzcat(A; B; …)`, `vertcat(A; B; …)` | Lado a lado y uno debajo del otro (como [A, B] y [A; B]). | `vertcat([1,2]; [3,4])` | `[1, 2; 3, 4]` |
| `kron(A; B)` | Producto de Kronecker. | `kron([1,2]; [1;1])` | `[1, 2; 1, 2]` |
| `any(v)` | 1 si algún elemento no es 0. | `any([0,0,3])` | `1` |

## Álgebra lineal

Con números reales (inv, det, linsolve y eig también con complejos). eig admite hasta 12×12.

| Función | Qué hace | Ejemplo | Da |
|---|---|---|---|
| `linsolve(A; b)` | x tal que A·x = b (como A\b en MATLAB). Si A no es cuadrada, por mínimos cuadrados. | `linsolve([2,1;1,3]; [3;5])` | `[0.8; 1.4]` |
| `rank(A)` | Rango. | `rank([1,2;2,4])` | `1` |
| `cond(A)` | Número de condición (con valores singulares). | `cond([1,0;0,2])` | `2` |
| `pinv(A)` | Pseudoinversa (vale con matrices singulares o no cuadradas). | `pinv([1,2;2,4])` | `[0.04, 0.08; 0.08, 0.16]` |
| `eig(A)` | Valores propios, en una columna; complejos si los hay. | `eig([2,1;1,2])` | `[1; 3]` |
|  |  | `eig([0,1;-1,0])=` | `[-1j; 1j]` |

## Diferencias, acumulados e integrales

| Función | Qué hace | Ejemplo | Da |
|---|---|---|---|
| `diff(v)` | Diferencias entre elementos seguidos. | `diff([1,4,9,16])` | `[3, 5, 7]` |
| `cummax(v)`, `cummin(v)` | Máximo y mínimo acumulados. | `cummax([1,3,2,5,4])` | `[1, 3, 3, 5, 5]` |
| `mode(v)` | El valor más repetido (con empate, el menor). | `mode([1,2,2,3,3])` | `2` |
| `trapz(x; y)`, `cumtrapz(x; y)` | Integral por trapecios de datos (y acumulada). Con un solo vector, paso 1. | `trapz([0,1,2]; [0,1,4])` | `3` |
| `integral(expr; x; a; b)` | Integral de una expresión con la variable x, entre a y b (numérica, adaptativa). Como en fzero, la variable se nombra. Con unidades: las de expr por las de x. | `integral(x^2; x; 0; 3)` | `9` |

## Interpolación y polinomios

Un polinomio es el vector de sus coeficientes, del mayor grado al menor: [1, 0, -2] es x² − 2.

| Función | Qué hace | Ejemplo | Da |
|---|---|---|---|
| `interp1(xs; ys; x)` | Interpolación lineal en una tabla (x un número o un vector; conserva las unidades de ys). Fuera de la tabla da ⚠; con `interp1(xs; ys; x; "extrap")` extrapola con el primer o el último tramo, como en MATLAB. | `interp1([0,1,2]; [0,10,40]; 1.5)` | `25` |
| `polyval(p; x)` | Valor del polinomio en x. | `polyval([1,0,-2]; 3)` | `7` |
| `roots(p)` | Raíces (columna); complejas si las hay. | `roots([1,-6,11,-6])` | `[3; 2; 1]` |
|  |  | `roots([1,0,1])=` | `[1j; -1j]` |
| `polyfit(x; y; n)` | Polinomio de grado n por mínimos cuadrados. | `polyfit([0,1,2]; [1,3,5]; 1)` | `[2, 1]` |
| `conv(p; q)` | Producto de polinomios. | `conv([1,1]; [1,-1])` | `[1, 0, -1]` |
| `polyder(p)`, `polyint(p)` | Derivada e integral (con constante 0). | `polyder([1,2,3])` | `[2, 2]` |

## Funciones propias

Se definen en un texto y se usan en las salidas, en las variables y en las cotas. Pueden llamar a otras funciones y a sí mismas.

| Función | Qué hace | Ejemplo | Da |
|---|---|---|---|
| `f(x):…` | Función de un parámetro. | `f(x):x^2+1`<br>`f(3)=` | `10` |
| `g(a; b):…` | Varios parámetros, separados por `;` o `,`. | `g(a; b):a*b+1`<br>`g(2; 5)=` | `11` |

## Números complejos

`j` es la unidad imaginaria (`3+4j`); un número también lleva el sufijo: `2.5j` o `2.5i` (la letra `i` sola sigue siendo una variable). Como en MATLAB, `sqrt(-4)` es `2j`, `ln(-1)` es `πj` y una base negativa con exponente no entero da un complejo. Valen las operaciones, las potencias, las funciones (sin, exp, ln, sqrt…), las matrices (inv, det, producto) y las unidades (una impedancia en Ω). Con complejos solo se compara con `==` y `!=`. Una cota, una gráfica o la condición de un if necesitan un real: abs, angle, real o imag lo dan.

| Función | Qué hace | Ejemplo | Da |
|---|---|---|---|
| `abs(z)` | Módulo. | `abs(3+4j)` | `5` |
| `angle(z)` | Argumento (en grados o radianes, según el dibujo). | `angle(1+1j)` | `45` |
| `real(z)`, `imag(z)` | Parte real e imaginaria. | `real((1+2j)*(3-1j))` | `5` |
|  |  | `imag((1+2j)*(3-1j))` | `5` |
| `conj(z)` | Conjugado: z·conj(z) = |z|². | `real((3+4j)*conj(3+4j))` | `25` |

## Cadenas

Una cadena va entre comillas: `"Cumple"` (sirven las “ ” del iPad; `""` dentro es una comilla). Se unen con `+` y se comparan con `==` y `!=`; un número se convierte con `num2str` (con su unidad). `["a", "b"]` es un vector de cadenas (`v_2` es la segunda). En el resultado se muestran entre comillas tipográficas. Para un mensaje de verificación: `if(σ<Sy, "Cumple", "No cumple")`.

| Función | Qué hace | Ejemplo | Da |
|---|---|---|---|
| `num2str(x; n)`, `string(x)` | Un número como texto, con su unidad y como lo muestra la app (n decimales fijos si se da). | `"Tensión: " + num2str(210.254'MPa)=` | `“Tensión: 210.254 MPa”` |
| `sprintf(formato; …)` | Formato de MATLAB: %d, %f, %.2f, %e, %g, %s, %%. Sin unidades: divide por la unidad que quieres (F/1'kN). | `sprintf("%.1f kN"; 12.345)=` | `“12.3 kN”` |
| `str2double(s)`, `str2num(s)` | El número escrito en una cadena. | `str2double("3.25")*2` | `6.5` |
| `strcat(a; b; …)` | Une cadenas (como +). | `strcat("A"; "-"; "CAD")=` | `“A-CAD”` |
| `upper`, `lower`, `strtrim`, `reverse` | Mayúsculas, minúsculas, sin espacios en los extremos, al revés. | `upper("abc")=` | `“ABC”` |
| `strrep(s; viejo; nuevo)` | Reemplaza todas las apariciones. | `strrep("a-b-c"; "-"; "+")=` | `“a+b+c”` |
| `strsplit(s; sep)`, `strjoin(v; sep)` | Parte una cadena en un vector de cadenas (por espacios si no se da sep) y las vuelve a unir. | `strjoin(strsplit("a,b,c"; ","); " | ")=` | `“a | b | c”` |
| `strlength(s)` | Número de caracteres. | `strlength("hola")` | `4` |
| `contains`, `startsWith`, `endsWith` | 1 si la cadena contiene, empieza o termina con el patrón. | `contains("hola mundo"; "mun")` | `1` |
| `strfind(s; patrón)` | Posiciones (desde 1) donde aparece el patrón; 0 si no aparece. | `strfind("abcabc"; "bc")` | `[2, 5]` |
| `strcmp(a; b)`, `strcmpi(a; b)` | 1 si son iguales (strcmpi, sin distinguir mayúsculas). | `strcmpi("Abc"; "aBC")` | `1` |
| `extractBefore`, `extractAfter`, `extractBetween` | Lo que hay antes o después de un patrón (o de una posición), o entre dos. | `extractAfter("x=10"; "=")=` | `“10”` |

## Programas

Pasos en orden y ciclos dentro de una fórmula, como en SMath. Dentro, `s:valor` asigna una variable **local**: vale solo en esa fórmula (no crea variables del documento ni cambia las de afuera). Se pueden escribir en varias líneas, con sangría, y se dibujan como se escribieron. Un ciclo tiene un tope de 100 000 vueltas y 1,5 s: si lo pasa, avisa en vez de congelar la app.

| Función | Qué hace | Ejemplo | Da |
|---|---|---|---|
| `line(a; b; …; r)` | Hace los pasos en orden y vale el último. | `line(a:2; b:a^2; a+b)` | `6` |
| `for(i; inicio..fin; cuerpo)` | Repite el cuerpo con i = inicio, inicio+1, … hasta fin (si fin < inicio, ninguna vez). Con un vector en lugar del rango, i toma cada elemento. | `suma2(n):line(s:0; for(i; 1..n; s:s+i^2); s)`<br>`suma2(10)=` | `385` |
| `while(condición; cuerpo)` | Repite el cuerpo mientras la condición se cumpla. Para varios pasos en el cuerpo, `line(…)`. | `line(k:0; while(k^2<50; k:k+1); k)` | `8` |
| `v_i:valor`, `A_(i,j):valor` | Asigna un elemento de un vector o de una matriz (o de un vector de cadenas) dentro de un programa, sobre una copia local: la variable del documento no cambia afuera. Como en MATLAB, un índice más allá del final agranda el vector con ceros (sirve para armar un vector en un `for`). El valor lleva la magnitud del vector; un vector de ceros sin unidades toma la del primer valor. | `line(p:[1,2,3]; p_2:7; sum(p))` | `11` |

## Ecuaciones

Se resuelven numéricamente (Levenberg-Marquardt): desde un valor inicial se busca el valor que cumple la ecuación. Con varias raíces da la más cercana al valor inicial; si no encuentra una, avisa. Para un sistema de ecuaciones, `solve(…)=` en un texto (ver «Orden de lectura» en Texto y cálculo).

| Función | Qué hace | Ejemplo | Da |
|---|---|---|---|
| `fzero(ecuación; x; inicial)` | El valor de x que cumple la ecuación, escrita con `==` (`x^2 == 2`) o como una expresión que vale 0 (`x^2-2`). El valor inicial lleva las unidades de x; sin él usa el valor de x en ese punto, o 1. | `fzero(x^2 == 2; x; 1)` | `1.4142` |
|  | Con unidades: la fuerza que da un momento de 30 kN·m con un brazo de 2 m (en kN). | `fzero(F*2'm == 30'kN*'m; F; 1'kN)/(1'kN)` | `15` |

## Datos entre dibujos

Como en SMath: guardan un valor para leerlo después o desde otro dibujo. Los datos viven en este navegador, en este dispositivo (Archivo → Datos los muestra, exporta e importa). Se escriben al confirmar un cambio del dibujo, no al arrastrar ni en la simulación; rfile lee lo guardado hasta ese momento, así con `c:rfile(n)` y `wfile(c+1; n)` cada cambio suma 1.

| Función | Qué hace | Ejemplo | Da |
|---|---|---|---|
| `wfile(valor; Nombre)` | Guarda el valor (un número con su unidad, un vector, una matriz o una cadena) en el archivo de datos <i>Nombre</i> y vale 1. El nombre no se evalúa: es el de una variable (no importa su valor, ni si existe) o una cadena con extensión, `"datos.txt"`. El archivo es texto con la sintaxis de A-CAD y punto decimal: `12'kN`, `[1, 2; 3, 4]'mm`, `"texto"`. | `a:12'kN`<br>`wfile(a; MiVariable)=` | `1` |
| `rfile(Nombre)` | El valor guardado con `wfile`, con sus unidades: `q:rfile(MiVariable)` da 12 kN. Si no hay datos con ese nombre, da ⚠. |  |  |

## Valores del dibujo

Nombres que una fórmula puede leer. Siempre valen lo que tiene el dibujo en ese momento.

| Función | Qué hace | Ejemplo | Da |
|---|---|---|---|
| `D1`, `A1`, `R1`, `O1` | Cotas con nombre: distancia, ángulo (vale en radianes), radio y diámetro. El nombre se puede cambiar. |  |  |
| `p12.x`, `p12.y` | Coordenadas de un punto. |  |  |
| `l3.len` (`l3.L`), `l3.ang` | Longitud de una línea y su ángulo (de su inicio a su fin, en radianes). |  |  |
| `c1.r`, `c1.d`, `c1.x`, `c1.y` | Radio, diámetro y centro de un círculo. |  |  |
| `a2.r`, `a2.x`, `a2.y` | Radio y centro de un arco. |  |  |
| `x:…` | Variables de los textos, leídas de arriba a abajo y de izquierda a derecha. |  |  |
| `t` | El tiempo, en los actuadores y las gráficas. |  |  |
| `MR1`, `ML1`, `MR1.v` | En las gráficas: el desplazamiento de un actuador (también `.d`) y su velocidad. |  |  |
| Reservados | No se pueden usar como nombre de cota ni de variable: las funciones y constantes de esta lista, `t`, `j`, `ω`, `θ` y `α`. |  |  |

---

[Índice](README.md) · [7. Texto y cálculo](07-texto-y-calculo.md)
