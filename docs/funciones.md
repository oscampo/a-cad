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

## Constantes

| Función | Qué hace | Ejemplo | Da |
|---|---|---|---|
| `π` (`pi`) | Pi. Un valor que lleva π está en radianes. | `π` | `3.1416` |
| `e` | Número de Euler. | `e` | `2.7183` |

## Trigonometría

Los ángulos van en **grados**, salvo que el argumento lleve π o sea un ángulo del dibujo (una cota angular como `A1` o `l3.ang`): entonces van en radianes. En una cota angular en radianes, todo va en radianes.

| Función | Qué hace | Ejemplo | Da |
|---|---|---|---|
| `sin` (`sen`), `cos`, `tan` | Seno, coseno y tangente. | `sin(30)` | `0.5` |
|  | Con π, en radianes. | `cos(π/3)` | `0.5` |
| `sec`, `csc`, `cot` | Secante, cosecante y cotangente, con la misma regla. | `sec(60)` | `2` |
| `asin`, `acos`, `atan` | Inversas: devuelven grados. | `asin(0.5)` | `30` |
| `atan2(y; x)` | Ángulo del punto (x, y) en grados, de −180 a 180. | `atan2(1; -1)` | `135` |
| `sinh`, `cosh`, `tanh`, `asinh`, `acosh`, `atanh` | Hiperbólicas (no usan ángulos). | `cosh(0)` | `1` |
| `deg(x)` | De radianes a grados. | `deg(π)` | `180` |
| `rad(x)` | De grados a radianes. | `rad(180)` | `3.1416` |

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

## Vectores y matrices

Se escriben entre corchetes: la coma separa los elementos de una fila, el punto y coma empieza otra fila, y los decimales llevan punto. Se usan en los textos (`A:[1,2;3,4]`, `A=`); una cota puede leer un elemento (`D1 = x_2`).

| Función | Qué hace | Ejemplo | Da |
|---|---|---|---|
| `[1, 2, 3]`, `[1; 2; 3]` | Vector fila y vector columna. | `[1,2,3]^T` | `[1; 2; 3]` |
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

## Funciones propias

Se definen en un texto y se usan en las salidas, en las variables y en las cotas. Pueden llamar a otras funciones y a sí mismas.

| Función | Qué hace | Ejemplo | Da |
|---|---|---|---|
| `f(x):…` | Función de un parámetro. | `f(x):x^2+1`<br>`f(3)=` | `10` |
| `g(a; b):…` | Varios parámetros, separados por `;` o `,`. | `g(a; b):a*b+1`<br>`g(2; 5)=` | `11` |

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
