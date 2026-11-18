# 7. Texto y cálculo

Textos que calculan: asignaciones, salidas, fórmulas con AsciiMath, vectores y matrices, funciones propias y el orden de lectura de la página. Los ejemplos con resultado se comprueban con el motor de la app en las pruebas automáticas (`test/calcref.test.mjs`).

La lista completa de funciones y operadores, con ejemplos, está en [Funciones y operadores](funciones.md).

[← 6. Cotas](06-cotas.md) · [Índice](README.md) · [8. Splines y trazados (levas y trayectorias) →](08-splines-y-trazados.md)

---

## Escribir un texto (T)

Toca donde va el punto de inserción y escribe ahí mismo, sin ventana. Lo que escribes es una **ecuación**: se guarda como bloque `$$…$$`, así que los delimitadores no se teclean (se ven en las propiedades del texto, doble toque).

| Tecla | Qué hace |
|---|---|
| **Enter** | Dibuja lo escrito y abre otra entrada justo debajo. |
| **Shift+Enter** | Otra línea en el mismo bloque (otra ecuación). |
| **Esc** | Descarta lo que escribes. |
| **Enter** en una entrada vacía | Termina. Cambiar de herramienta también termina, y dibuja lo escrito. |
| Tocar en otro sitio | Dibuja lo escrito y mueve la entrada allí. |
| `'` al empezar | Texto normal en vez de ecuación (sirve también el `’` del teclado del iPad; el apóstrofo no se guarda). Ver «Texto normal, fórmulas y literales». |

## Asignar y mostrar valores

Cada línea de una ecuación es un enunciado. El valor se actualiza solo cuando el dibujo cambia.

| Escribes | Qué hace | Ejemplo | Se ve |
|---|---|---|---|
| `x:valor` | Asigna a **x** el valor de una expresión. Se dibuja `x:=valor`, tal como lo escribiste. | `x:2*3` | `x:=2*3` |
| `x:=valor` | Lo mismo, tecleando `:=`. | `k:=4` | `k:=4` |
| `expr=` | Un **=** al final de la línea muestra el valor, con hasta 3 decimales. | `2/3=` | `2/3=0.667` |
| `x:expr=` | Asigna y muestra el valor en la misma línea. | `x:2*3=`<br>`y:x+1=` | `x:=2*3=6`<br>`y:=x+1=7` |
| `x:a..b;n` | **Rango**: n valores de a hasta b, un vector fila. | `x:1..5;5` | `x:=[1, 2, 3, 4, 5]` |
| `x:a..paso..b` | Rango con paso. | `x:0..0.5..2` | `x:=[0, 0.5, 1, 1.5, 2]` |
| Ángulos | Un valor con π es un ángulo en radianes; uno sin π es un número a secas. | `a:30`<br>`sin(a)=` | `a:=30`<br>`sin(a)=0.5` |
| Error | Si la expresión no se puede calcular, en lugar del valor aparece ⚠. | `sqrt(-1)=` | `sqrt(-1)=⚠` |

- **Un enunciado por línea**: lo que sobra en la línea se marca con ⚠ (`x:2  y:3`). Para poner dos, Shift+Enter.
- No es salida si la línea termina en `==`, `<=`, `>=`, `!=` o `:=`: ahí el **=** es parte del operador.
- Un vector o una matriz asignado ya muestra su valor: en `v:1..3;3=` el **=** final no añade nada.
- Una salida puede leer las cotas (también las de solo lectura y las magnitudes de los vectores), las variables y las funciones y constantes de «Funciones y operadores». Un ángulo de una cota vale su medida en radianes.
- Al editar ves `expr=`; el dibujo y las exportaciones (SVG, DXF) muestran `expr=valor`. La magnitud de un vector muestra solo el valor.

## Texto normal, fórmulas y literales

Un texto que empieza con `'` se dibuja tal cual, salvo lo que va entre signos de pesos, que es matemático y calcula igual que una ecuación.

| Escribes | Qué hace | Ejemplo | Se ve |
|---|---|---|---|
| `$…$` | Fórmula en línea con el texto. | `'Vale $2*3=$ mm` | `Vale 2*3=6 mm` |
| `$$…$$` | Fórmula en bloque: cada línea de dentro es una ecuación, centrada y a tamaño pleno. |  |  |
| `` `…` `` | **Literal**: se dibuja pero nunca se calcula ni se lee como asignación o salida. Sin las comillas, `f:RR->RR` sería una asignación. | `` `f:RR->RR` ``<br>`` `x =` 3 `` | `f:RR->RR`<br>`x = 3` |
| `` `… `` sin cerrar | Se marca con ⚠. | `` `abierto `` | `` `abierto ⚠ `` |
| `\$` | Un signo de pesos que no abre una fórmula. |  |  |
| `$` suelto | No es fórmula: `$5 y $6` se dibuja tal cual. Un `$$` sin cierre también, con ⚠. |  |  |

## Escritura matemática (AsciiMath)

Las fórmulas siguen la sintaxis de [asciimath.org](https://asciimath.org/). Se dibujan con fracciones, raíces, índices y símbolos de verdad, giran y se exportan (SVG, DXF) como cualquier texto. Los paréntesis crecen con lo que encierran.

| Escribes | Se dibuja |
|---|---|
| `a/b` | Fracción (los paréntesis de a y b no se ven). |
| `x^2`, `x_1` | Superíndice y subíndice. |
| `sqrt(x)`, `root 3 x` | Raíces. |
| `alpha`, `beta`, `pi`, `Delta`… | Letras griegas. |
| `sum_(i=1)^n`, `prod`, `int_0^1`, `lim_(x->0)` | Sumatoria, productoria, integral y límite. |
| `sin`, `cos`, `ln`… | Nombres de funciones, en letra recta. |
| `<=`, `>=`, `!=`, `->`, `=>`, `+-`, `xx`, `-:`, `oo` | ≤ ≥ ≠ → ⇒ ± × ÷ ∞ |
| `abs(x)`, `floor(x)`, `ceil(x)`, `norm(x)` | Valor absoluto, piso, techo y norma, con sus barras. |
| `hat x`, `bar x`, `vec v`, `tilde`, `dot`, `ddot`, `ul`, `cancel`, `overarc` | Acentos, subrayado y tachado. |
| `[[a,b],[c,d]]`, `((a),(b))` | Matrices dibujadas (sin calcular). |
| `[[a,b,\|,c],[d,e,\|,f]]` | Matriz aumentada. |
| `{(2x,+,y,=,3),(x,-,y,=,1):}` | Sistema de ecuaciones. |
| `ubrace(…)_("texto")`, `obrace`, `overset(x)(=)`, `underset` | Llaves y signos con algo encima o debajo. |
| `color(red)(x)` | Color. |
| `bb`, `bbb`, `cc`, `tt`, `fr`, `sf` | Fuentes: negrita, pizarra, caligráfica, máquina, fraktur, sin serifa. |
| `"texto"`, `text(hola)` | Texto recto dentro de la fórmula. |
| `dy/dx`, `f'(x)` | Derivadas. |

- Como en AsciiMath, las palabras reservadas se reconocen aunque vayan pegadas a otras letras (`pir` es π r), así que «in», «or», «and»… dentro de un nombre se leen como símbolos: sepáralos con espacios o ponlos entre comillas.
- Aún no hay alineación por **=** entre líneas.

## Nombres de variables

Siguen las reglas de los nombres de las cotas: letras, números y _, empiezan con una letra.

| Escribes | Qué hace | Ejemplo | Se ve |
|---|---|---|---|
| `masa_(total)` | Nombre con **subíndice de texto**: entre paréntesis, texto libre sin paréntesis ni llaves. Se dibuja con el subíndice en letra recta. | `masa_(total):3`<br>`2*masa_(total)=` | `masa_(total):=3`<br>`2*masa_(total)=6` |
| Reservados | Un nombre no puede ser una función o constante del programa (`sin`, `pi`…) ni coincidir con el de una cota. | `sin:2` | `sin:=2 ⚠` |

- Un texto con un nombre no válido, o que usa una variable que aún no existe, se rechaza al escribirlo («se deshizo»). Si llega de otra forma (al pegar un texto, por ejemplo), esa definición queda con ⚠ y la variable sin definir desde ahí.
- Los nombres se actualizan solos si renombras una cota que usan.

## Orden de lectura

Como en SMath, la página se lee **de arriba a abajo** y, en una misma fila, **de izquierda a derecha**: dentro de un texto, línea por línea; los textos, por su esquina superior izquierda. Una variable vale lo de la **última definición leída antes**.

| Escribes | Qué hace | Ejemplo | Se ve |
|---|---|---|---|
| Redefinir | Una variable puede cambiar de valor más abajo. | `k:1`<br>`k=`<br>`k:2`<br>`k=` | `k:=1`<br>`k=1`<br>`k:=2`<br>`k=2` |
| Usarse a sí misma | Una redefinición puede leer el valor anterior. | `n:1`<br>`n:n+1`<br>`n=` | `n:=1`<br>`n:=n+1`<br>`n=2` |
| Usar antes de definir | Todavía no existe: avisa de que «se define más abajo o más a la derecha». | `y=`<br>`y:2` | `y=⚠`<br>`y:=2` |
| Leer cotas | Una definición puede usar las cotas y variables leídas antes, y se recalcula cuando cambian. | `k:D1/2` |  |

- Las **cotas con fórmula** (`D2 = k*2`) se leen en el lugar de su **etiqueta**: si `k:1` está arriba de la cota y `k:7` más abajo, `D2` vale 2.
- Mover un texto o la etiqueta de una cota (en Seleccionar) recalcula las cotas que leen variables de texto.
- Mientras se simula o se arrastra, el orden de lectura de las cotas queda **congelado**: una etiqueta que cruza un texto no cambia su valor ni detiene la simulación. Al soltar o terminar se vuelve al orden normal.
- Si se borra el texto con la definición, las cotas que la leían conservan su valor y pierden la fórmula.

## Vectores y matrices

Se escriben entre corchetes: la coma separa los elementos de una fila, el punto y coma empieza otra fila, y los decimales llevan punto. Se dibujan con corchetes de verdad y sin comas; aquí se escriben con comas, como en «Funciones y operadores», donde está la lista completa de operaciones.

| Escribes | Qué hace | Ejemplo | Se ve |
|---|---|---|---|
| `[1, 2; 3, 4]` | Matriz. `[1, 2, 3]` es un vector fila y `[1; 2; 3]` uno columna. | `A:[1,2;3,4]`<br>`A=` | `A:=[1, 2; 3, 4]`<br>`A=[1, 2; 3, 4]` |
| `x^T` | Transpuesta: de un vector fila, el columna. | `x:1..3;3`<br>`x^T=` | `x:=[1, 2, 3]`<br>`x^T=[1; 2; 3]` |
| `x_2`, `x_i`, `x_(i+1)` | Elemento de un vector, contando desde 1. | `x:1..3;3`<br>`x_2=` | `x:=[1, 2, 3]`<br>`x_2=2` |
| `A_(i,j)` | Elemento de una matriz (fila, columna). | `A:[1,2;3,4]`<br>`A_(2,1)=` | `A:=[1, 2; 3, 4]`<br>`A_(2,1)=3` |
| `A_(2,:)`, `A_(:,2)` | Una fila o una columna entera. | `A:[1,2;3,4]`<br>`A_(:,2)=` | `A:=[1, 2; 3, 4]`<br>`A_(:,2)=[2; 4]` |
| `A^(-1)*b` | Resolver el sistema A·x = b. | `A:[1,1;10,1]`<br>`b:[-25;250]`<br>`x:A^(-1)*b=` | `A:=[1, 1; 10, 1]`<br>`b:=[-25; 250]`<br>`x:=[30.556; -55.556]` |

- Un rango de más de 8 elementos se abrevia con «…».
- `*` es el producto matricial: dos vectores fila dan error (usa `.*` o `x*y^T`).
- Un nombre que ya existe como variable (`x_1`, `k_(total)`) es esa variable, no un índice.
- Una cota puede leer un elemento o un resumen (`D1 = x_2`), pero no un vector o una matriz entero: avisa con un mensaje. Lo mismo en las gráficas.
- Una matriz escrita en varias líneas de un bloque `$$` se parte por líneas: escríbela en una sola.

## Funciones propias

| Escribes | Qué hace | Ejemplo | Se ve |
|---|---|---|---|
| `f(x):…` | Define una función. Se dibuja `f(x):=…` y se usa en las salidas, las variables y las cotas (`D1 = f(3)`). | `f(x):x^2+1`<br>`f(3)=` | `f(x):=x^2+1`<br>`f(3)=10` |
| `g(a; b):…` | Varios parámetros, separados por `;` o `,`. | `g(a; b):a*b+1`<br>`g(2; 5)=` | `g(a; b):=a*b+1`<br>`g(2; 5)=11` |
| `if(c; a; b)` | Recursión: solo se calcula la rama elegida (hasta 200 niveles). | `fact(n):if(n<=1; 1; n*fact(n-1))`<br>`fact(5)=` | `fact(n):=if(n<=1; 1; n*fact(n-1))`<br>`fact(5)=120` |
| Variables de fuera | Lee las variables que valen donde se la llama, no donde se definió. | `k:2`<br>`f(x):x*k`<br>`f(3)=`<br>`k:5`<br>`f(3)=` | `k:=2`<br>`f(x):=x*k`<br>`f(3)=6`<br>`k:=5`<br>`f(3)=15` |

- Los parámetros valen lo que se les pasa (números, vectores o matrices) y ocultan a las variables del mismo nombre.
- Los nombres de la función y de sus parámetros siguen las reglas de las variables, y no pueden ser funciones del programa (`sin`, `sum`…).
- En una función, un **=** al final queda en el cuerpo: `x:expr=` solo muestra el valor de una variable.

## Propiedades con «.»

Se usan en cualquier fórmula: cotas, textos (`p12.x=`), actuadores y gráficas. Las medidas que leen se actualizan con el dibujo.

| Escribes | Qué es |
|---|---|
| `p12.x`, `p12.y` | Coordenadas de un punto. |
| `l3.len` (`l3.L`), `l3.ang` | Longitud de una línea y su ángulo, en radianes. |
| `c1.r`, `c1.d`, `c1.x`, `c1.y` | Radio, diámetro y centro de un círculo. |
| `a2.r`, `a2.x`, `a2.y` | Radio y centro de un arco. |

## Fuente y formato del texto

| Propiedad | Qué hace |
|---|---|
| Fuente | Se elige al crear el texto o en el panel: sistema, Helvetica/Arial, Times/Georgia, Courier/Menlo, Verdana, Palatino, Optima, Futura, American Typewriter y tres manuscritas. Si el dispositivo no tiene una, se usa una genérica parecida. |
| Punto de inserción | Es un punto real: se puede acotar, fijar o relacionar. Se elige su lugar en la caja del texto. |
| Ángulo y altura | Gira y escala el texto. También se puede alinear con una línea. |
| *Legible* | Gira 180° el texto que quedaría boca abajo. |

## Dibujos anteriores a la v2.0

Al abrirlos, la sintaxis vieja pasa a la nueva una sola vez, con un aviso.

| Antes | Qué pasa | Ejemplo | Queda |
|---|---|---|---|
| `x{=v}` | Definición: pasa a fórmula con asignación. | `A{=b*h}` | `$A:b*h$` |
| `[=e]` | Salida: pasa a fórmula con **=** al final. | `[=A]` | `$A=$` |
| Fórmula vieja | Lo que ahora se leería como asignación o salida queda como literal. | `$$a:b$$` | `` $$`a:b`$$ `` |

---

[← 6. Cotas](06-cotas.md) · [Índice](README.md) · [8. Splines y trazados (levas y trayectorias) →](08-splines-y-trazados.md)
