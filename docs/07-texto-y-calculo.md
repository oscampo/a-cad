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
| `"` o un espacio al empezar | Texto normal en vez de ecuación (sirven también las comillas `“` del teclado del iPad; la comilla o el espacio no se guardan). Ver «Texto normal, fórmulas y literales». |
| `%` al empezar | **Script**: una función escrita como programa, con sangría (ver «Programas» en Funciones). La primera línea es la firma (`%suma2(n):`) y debajo, con sangría: `s:0` asigna una variable local, `for i in 1..n:`, `while condición:` e `if c:` / `elif c:` / `else:` abren un bloque con más sangría, `g(x): …` define una función local y `#` comenta; `break` sale del for o while, `continue` pasa a la vuelta siguiente y `return x` termina con el valor x; si no, la última línea es el valor. Enter mantiene la sangría (y la aumenta tras `:`), Tab sangra y Shift+Enter lo dibuja. Se dibuja colapsado, como un cuadro con su nombre; la casilla **Mostrar el código** de sus propiedades lo expande. Los errores dicen su línea. |
| **Sugerencias** (botón `ƒx` o Ctrl+Espacio) | Una lista bajo el cursor con lo que existe **en ese lugar de la página**: variables y funciones definidas antes, cotas, bibliotecas insertadas antes (tras `UF.`, sus nombres públicos) y las funciones de A-CAD. Lo que se define más abajo no aparece: ahí todavía no existe. No distingue mayúsculas (`kt` encuentra `Kt_(C2)`) y las letras en orden bastan (`csu` encuentra `C_(surf)`). Al lado, el detalle: la definición dibujada, el valor en ese lugar, o la ayuda y un ejemplo; la ayuda de un script son las líneas `#` que siguen a su firma. Con la lista abierta, Enter o Tab aceptan, las flechas eligen y Esc la cierra sin borrar lo escrito. Mientras escribes los valores de una función, una pastilla sobre la entrada muestra su firma con el argumento actual resaltado. En **Configuración → Sugerencias al escribir**: automáticas (aparecen con 2 letras; por defecto en el PC y el iPad) o a pedido (por defecto en el celular). |
| Insignia azul | Junto a la esquina de la entrada: `α` es una ecuación, `A` es texto normal y `{}` un script. |
| `[`, `(`, `{`, `$`, `<`, `` ` `` | **Se cierran solos**: aparece el cierre y el cursor queda en medio (`[\|]`). Teclear el cierre cuando ya está delante solo avanza; borrar en un par vacío borra los dos; con texto seleccionado, lo encierra. `$` dentro de `$\|$` da `$$\|$$`. No se cierran delante de una letra o un número, ni `<` dentro de una fórmula (es «menor que»), ni el `$` o la `` ` `` que cierran algo ya abierto. Vale también en el campo Texto de las propiedades. |
| `\` y una letra, o Ctrl+G | **Letras griegas** sin teclado griego. `\a` se vuelve α al teclear la letra (Retroceso justo después deja `\a`). Ctrl+G, como en SMath, convierte la letra antes del cursor (otra vez la devuelve) o todo lo seleccionado; en el Mac también es Ctrl, no Cmd. Tabla: `a` α, `b` β, `c` χ, `d` δ, `e` ε, `f` φ, `g` γ, `h` η, `i` ι, `j` ϕ, `k` κ, `l` λ, `m` μ, `n` ν, `p` π, `q` θ, `r` ρ, `s` σ, `t` τ, `u` υ, `v` ϖ, `w` ω, `x` ξ, `y` ψ, `z` ζ; `D` Δ, `F` Φ, `G` Γ, `J` ϑ, `L` Λ, `P` Π, `Q` Θ, `S` Σ, `V` ς, `W` Ω, `X` Ξ, `Y` Ψ. Las mayúsculas que se ven igual que una latina (Α, Β, Ε…) y la ο no se convierten. Si la letra siguiente puede comenzar un símbolo o el nombre de una griega (`\in`, `\to`, `\al`…), vuelve a `\i` y la palabra se escribe tal cual; al terminarla, un símbolo se queda (`\in` se dibuja ∈), el nombre de una griega se vuelve la letra (`\alpha` α) y lo demás es la griega más el resto, como antes (`\an` αn). |

## Asignar y mostrar valores

Cada línea de una ecuación es un enunciado. El valor se actualiza solo cuando el dibujo cambia.

| Escribes | Qué hace | Ejemplo | Se ve |
|---|---|---|---|
| `x:valor` | Asigna a **x** el valor de una expresión. Se dibuja `x:=valor`, tal como lo escribiste. | `x:2*3` | `x:=2*3` |
| `x:=valor` | Lo mismo, tecleando `:=`. | `k:=4` | `k:=4` |
| `expr=` | Un **=** al final de la línea muestra el valor, con hasta 3 decimales. Desde 1e6 se muestra en notación científica (`2.569e6`, 4 cifras significativas); el umbral se cambia en **Configuración → Notación científica desde**. | `2/3=` | `2/3=0.667` |
| `x:expr=` | Asigna y muestra el valor en la misma línea. | `x:2*3=`<br>`y:x+1=` | `x:=2*3=6`<br>`y:=x+1=7` |
| Notación científica | `2.5e6` es 2.5·10⁶ y `3e-4` es 0.0003 (también con `E`). Un número muy pequeño se muestra con 4 cifras significativas en vez de 0. | `p:2.5e6`<br>`q:3e-4=` | `p:=2.5e6`<br>`q:=3e-4=0.0003` |
| `x:valor'unidad` | **Unidad**: el valor va en esa unidad. Las unidades se convierten y se propagan: `F*2` sigue en N. Hay unidades del SI con prefijo (m, g, s, A, K, mol, N, Pa, J, W, V, Ω, Hz, L, bar; k, M, G, c, m, µ, n...) y otras usuales (min, h, rpm, atm, psi con prefijo como kpsi, ksi, kgf, lbf, kip, in, ft, lb, hp, gal, deg, rad, %). Si el valor ya trae unidades, solo dice en qué unidad mostrarlo. | `F:250'N`<br>`F=`<br>`F*2=` | `F:=250 N`<br>`F=250 N`<br>`F*2=500 N` |
| `x:expr'unidad=` | Con `=` el valor calculado se muestra en esa unidad. | `a:2*3'm/s^2=` | `a:=2*3=6 m/s²` |
| `valor'unidad` | Unidades dentro de una expresión. Una unidad compuesta va entre paréntesis: `3'(m/s)`. | `L:2'm+30'cm`<br>`L=` | `L:=2 m+30 cm`<br>`L=2.3 m` |
| `expr='unidad` | Muestra el valor en la unidad pedida (de la misma magnitud; si no, ⚠). | `F:2'kN`<br>`F='N` | `F:=2 kN`<br>`F=2000 N` |
| Unidad automática | Sin unidad pedida, el resultado sale en la unidad de una variable de texto de la expresión o en la habitual del sistema de unidades del documento (**Configuración → Unidades**): en el SI mm o m, mm² o m², N o kN, N·mm, N·m o kN·m, MPa; en anglosajón in o ft, in² o ft², lbf o kip, lbf·in, kip·in o kip·ft, psi o ksi. Se pasa a la unidad mayor cuando el número llega a 1000 y en ella queda en 1 o más (3200 mm es 3,2 m; 1963,5 mm² sigue en mm²). Una cota con unidad no decide la unidad del resultado: D2 de «126 in» da `D2=3,2004 m` en el SI. El momento y la energía se muestran como momento (N·m); `='J` pide joules. | `F:5000'N`<br>`A:2'cm^2`<br>`F/A=` | `F:=5000 N`<br>`A:=2 cm²`<br>`F/A=25 MPa` |
| Unidades que no cuadran | Sumar, restar o comparar magnitudes distintas da ⚠, igual que un número sin unidades sumado a uno con unidades. La excepción es el **0**: vale con cualquier unidad (0 m = 0 kN), así que `x>0` con x en in, `x+0` o `[0, x]` funcionan, y una función como `if(x>a; x-a; 0)` sirve con o sin unidades. Las funciones (sin, ln...) piden números sin unidades; sqrt, abs y round las conservan. | `2'N+3=` | `2 N+3=⚠` |
| Ángulo con unidad | `deg`, `°` y `rad` hacen un ángulo. En una cota, una longitud con unidades se convierte a mm. | `sin(30'deg)=` | `sin(30 deg)=0.5` |
| `x:a..b;n` | **Rango**: n valores de a hasta b, un vector fila. Con punto decimal también se escribe `x:a..b,n`; con coma decimal, siempre con `;`. | `x:1..5;5` | `x:=[1, 2, 3, 4, 5]` |
| `x:a..paso..b` | Rango con paso. | `x:0..0.5..2` | `x:=[0, 0.5, 1, 1.5, 2]` |
| Vector con unidades | Una unidad para todos los elementos: `[1,2,3]'mm`, `[1'm, 20'cm]` o un rango `0..10;5'mm`. Se muestran todos en la misma unidad, y una gráfica los usa en esa unidad (la leyenda la dice). Mezclar magnitudes en un vector da ⚠. | `v:[1,2,3]'mm`<br>`v*2=`<br>`sum(v)=` | `v:=[1, 2, 3] mm`<br>`v*2=[2, 4, 6] mm`<br>`sum(v)=6 mm` |
| Unidades propias | Una línea `cantidad:cantidad` con exactamente una unidad nueva, en cualquiera de los dos lados, define esa unidad: `1'vuelta:2π'rad`, `1.70'm:1'persona`, o `1'persona:'persona` (la misma unidad en los dos lados) para una magnitud nueva que no se mezcla con ninguna otra. Vale en todo el dibujo, esté donde esté (no sigue el orden de lectura), con letras, _ y números (sin empezar por número) y sin prefijos. No puede redefinir una unidad que ya existe, con o sin prefijo: `1'in:30'mm` o `1'mm:'mm` dan ⚠, y definir la misma unidad dos veces también. Solo unidades proporcionales (sin cero desplazado, como °C). | `1'vuelta:2π'rad`<br>`a:0.25'vuelta`<br>`a='deg` | `1'vuelta:2π'rad`<br>`a:=0.25 vuelta`<br>`a=90 deg` |
| Ángulos | Según **Configuración → Ángulos en**. En grados (los dibujos anteriores), un valor con π es un ángulo en radianes y uno sin π es un número a secas: `sin(30)` va en grados. En radianes (los dibujos nuevos), todo va en radianes: `sin(π/6)=0.5`. El ejemplo, en un dibujo en grados. | `a:30`<br>`sin(a)=` | `a:=30`<br>`sin(a)=0.5` |
| Indicador decimal | Según **Configuración → Indicador decimal**. Con **punto** (`1.5`) los argumentos de una función van con coma, `max(2.5, 3)`, y en una matriz los elementos con coma y las filas con `;`: `[1, 2; 3, 4]`. Con **coma** (`1,5`) los argumentos van con `;`, `max(2,5; 3)`, y en una matriz los elementos con `;` y las filas con `\|`: `[1; 2 \| 3; 4]`; los índices también, `A_(1;2)`, y los rangos, `x:0,5..2;10` (con punto: `x:0.5..2,10`). Al cambiarlo se reescriben las fórmulas que ya tiene el dibujo; los dibujos anteriores, sin la opción, aceptan las dos formas. |  |  |
| `...` | **Sigue en la línea siguiente**, como en Python: `...` al final de una línea y, si quieres, al comienzo de la siguiente. Las dos líneas son un solo enunciado y se ven así, partidas. Sirve para una ecuación que se sale del margen de la página. | `F:1+2+...`<br>`...3=` | `F:=1+2+...`<br>`...3=6` |
| `(` o `[` abiertos | **Sigue sin** `...` mientras un paréntesis o un corchete esté abierto (también como en Python): la sangría no cuenta y se ve como si estuviera en una sola línea. Sirve para escribir una matriz o un `solve([ecuaciones], [incógnitas])` en columnas, con una ecuación por línea. El texto se guarda como lo escribiste. | `A:[`<br>`  1, 2;`<br>`  3, 4`<br>`]`<br>`A=` | `A:=[1, 2; 3, 4]`<br>`A=[1, 2; 3, 4]` |
| Error | Si la expresión no se puede calcular, en lugar del valor aparece ⚠. | `1/0=` | `1/0=⚠` |
| Complejos | Un resultado complejo se muestra como `3+4j` (`j` es la unidad imaginaria; ver «Números complejos» en Funciones). Como en MATLAB, la raíz de un negativo es un complejo. | `sqrt(-4)=` | `sqrt(-4)=2j` |

- **Un enunciado por línea**: lo que sobra en la línea se marca con ⚠ (`x:2  y:3`). Para poner dos, Shift+Enter.
- No es salida si la línea termina en `==`, `<=`, `>=`, `!=` o `:=`: ahí el **=** es parte del operador.
- Un vector o una matriz asignado ya muestra su valor: en `v:1..3;3=` el **=** final no añade nada.
- Una salida puede leer las cotas (también las de solo lectura y las magnitudes de los vectores), las variables y las funciones y constantes de «Funciones y operadores». Un ángulo de una cota vale su medida en radianes.
- Al editar ves `expr=`; el dibujo y las exportaciones (SVG, DXF) muestran `expr=valor`. La magnitud de un vector muestra solo el valor.

## Texto normal, fórmulas y literales

Un texto que empieza con `"` (o con un espacio) se dibuja tal cual, salvo lo que va entre signos de pesos, que es matemático y calcula igual que una ecuación.

| Escribes | Qué hace | Ejemplo | Se ve |
|---|---|---|---|
| `$…$` | Fórmula en línea con el texto. | `"Vale $2*3=$ mm` | `Vale 2*3=6 mm` |
| `$$…$$` | Fórmula en bloque: cada línea de dentro es una ecuación, centrada y a tamaño pleno. |  |  |
| `` `…` `` | **Literal**: se dibuja pero nunca se calcula ni se lee como asignación o salida. Sin las comillas, `f:\RR->\RR` sería una asignación. | `` `f:\RR->\RR` ``<br>`` `x =` 3 `` | `f:\RR->\RR`<br>`x = 3` |
| `` `… `` sin cerrar | Se marca con ⚠. | `` `abierto `` | `` `abierto ⚠ `` |
| `\$` | Un signo de pesos que no abre una fórmula. |  |  |
| `$` suelto | No es fórmula: `$5 y $6` se dibuja tal cual. Un `$$` sin cierre también, con ⚠. |  |  |

## Markdown en el texto normal

En un texto normal (el que empieza con `"` o un espacio), lo que va fuera de las fórmulas admite Markdown. Las marcas no cruzan una fórmula: `**a $x$ b**` no es negrita; se escribe `**a** $x$ **b**`.

| Escribes | Qué hace |
|---|---|
| `**negrita**`, `__negrita__` | **Negrita**. |
| `*cursiva*`, `_cursiva_` | *Cursiva*. El `_` dentro de una palabra no cuenta (`mi_archivo`). |
| `***ambas***` | <b>*Negrita y cursiva*</b>. |
| `~~tachado~~` | Tachado. |
| `` `código` `` | Letra monoespaciada. En una ecuación, en cambio, las comillas invertidas hacen un literal. |
| `# `, `## `, `### `, `#### `, `##### `, `###### ` al empezar la línea | Título, en negrita y más grande (1.6, 1.35, 1.15, 1.05, 1 y 0.9 veces la altura del texto). |
| Una línea y debajo `===` | También es un título de nivel 1. En cambio `---` debajo de un texto es siempre una raya, no un título. |
| `- `, `* `, `+ ` al empezar la línea | Viñeta. Dos espacios antes por cada nivel de sangría. |
| `- [ ] `, `- [x] ` al empezar la línea | Tarea: ☐ pendiente, ☑ hecha. |
| `1. `, `1) ` al empezar la línea | Lista numerada (el número se dibuja tal como se escribe). |
| `> ` al empezar la línea | Cita, con una raya a la izquierda; `>> ` es una cita dentro de otra. |
| `> [!note] Título` | **Aviso** (callout), con la raya y el título en color; las líneas `> ` que siguen son su cuerpo. Sin título se ve el tipo: `note`, `info`, `tip`, `important`, `warning`, `caution`, `danger`, `example`, `question`, `success`, `quote`… |
| `---` sola en la línea | Raya horizontal del ancho del texto (sirven también `***` y `___`). |
| `` ``` `` antes y después | **Bloque de código**: monoespaciado, en un recuadro, sin Markdown ni fórmulas dentro (sirve también `~~~`). Cuatro espacios al comienzo de las líneas, tras una línea en blanco, hacen lo mismo. |
| `\| a \| b \|` y debajo `\|---\|:-:\|` | **Tabla**: la primera fila es el encabezado (en negrita); la segunda dice la alineación de cada columna (`:--` izquierda, `:-:` centro, `--:` derecha). Las celdas admiten fórmulas; `\\|` es una barra dentro de una celda. |
| `[texto](url)` | Enlace, en azul y subrayado. También `[texto][ref]` con `[ref]: url` en otra línea (esa línea no se dibuja) y `<https://…>` o `<correo@dominio>`. **Para abrirlo**: un toque selecciona el texto y muestra encima una pastilla con el destino real de cada enlace; toca la pastilla, o el enlace con el texto ya seleccionado. Ctrl o Cmd + clic lo abre de una vez. Arrastrar sigue moviendo el texto y el doble toque abre sus propiedades. |
| `[texto](https://…)`, `(mailto:…)`, `(tel:…)` | Página web (en otra pestaña), correo o llamada. `www.algo.com` se toma como `https://`. No se abren `javascript:`, `data:` ni otros destinos: la pastilla los muestra tachados. |
| `[texto](#graficas)` | Un lugar del dibujo: la vista va a él y lo selecciona. Vale el título de un texto (`## Gráficas !!!` se alcanza con `#graficas`, sin tildes, mayúsculas, espacios ni signos), la primera línea de un texto o el identificador de un elemento (`#t17`, `#g94`, `#p5`). |
| `[texto](cicloide.json)` | Otro dibujo del repositorio de GitHub configurado (Archivo → GitHub), con la ruta relativa a su carpeta (`sub/a.json`, `../otra/b.json`, `/raiz.json` desde la raíz). Pregunta antes, porque se pierde lo no guardado. Con `#lugar` al final (`cicloide.json#rueda`), además va a ese lugar. |
| `![texto](imagen.png)` | Imagen: el dibujo no carga imágenes, muestra ▣ y su texto alternativo. |
| `![Línea](icon:line)` | **Ícono de una herramienta** de la app, dentro de la línea, a la altura de la letra y con el color del texto. Los nombres están en la ayuda, sección «Íconos en los textos» (toca una fila para copiarla). Si el nombre no existe se ve como una imagen: ▣ y el texto alternativo. |
| `texto[^1]` y `[^1]: la nota` | **Nota al pie**: la llamada va en superíndice, numerada en orden, y las notas se juntan al final del texto en letra más pequeña. |
| `<!-- … -->` | Comentario: no se dibuja (puede abarcar varias líneas). |
| `\*` | Deja el signo tal cual (sirve con cualquier signo de puntuación): `\*`, `\_`, `\#`, `\[`… Un `*` entre espacios (`2 * 3`) ya va tal cual, pero `2*3*4` pone el 3 en cursiva. |
| Saltos de línea | Cada salto de línea es un salto de línea, con página o sin ella (a diferencia de Markdown, las líneas seguidas no se unen). Con la página (Configuración → Página), una línea que no cabe se parte en el margen. Una `\` al final de una línea no se dibuja. |

## Escritura matemática (AsciiMath)

Las fórmulas siguen la sintaxis de [asciimath.org](https://asciimath.org/). Se dibujan con fracciones, raíces, índices y símbolos de verdad, giran y se exportan (SVG, DXF) como cualquier texto. Los paréntesis crecen con lo que encierran.

| Escribes | Se dibuja |
|---|---|
| `a/b` | Fracción (los paréntesis de a y b no se ven). |
| `x^2`, `x_1` | Superíndice y subíndice. |
| `sqrt(x)`, `root 3 x` | Raíces. |
| `alpha`, `beta`, `pi`, `Delta`… | Letras griegas. |
| `\sum_(i=1)^n`, `\prod`, `\int_0^1`, `\lim_(x->0)` | Sumatoria, productoria, integral y límite (con `\`; `sum(v)` sin ella es la función del cálculo). |
| `sin`, `cos`, `ln`, `mean`, `cumsum`… | Nombres de funciones (las de AsciiMath y las del cálculo), en letra recta. |
| `<=`, `>=`, `!=`, `->`, `=>`, `+-`, `-:`, `!in` | ≤ ≥ ≠ → ⇒ ± ÷ ∉ (con signos, sin `\`). |
| `\in`, `\to`, `\angle`, `\xx`, `\oo`, `\ll`, `\ne`, `\le`, `\AA`, `\RR`… | **Símbolos con nombre**: ∈ → ∠ × ∞ ≪ ≠ ≤ ∀ ℝ. Llevan `\` delante, como en LaTeX; sin ella son letras (`total`, `line` y `gain` no tienen → ni ∈ dentro). Al teclear `\in` la `\i` no se vuelve ι: el editor espera a ver si sigue un símbolo. |
| `abs(x)`, `floor(x)`, `ceil(x)`, `norm(x)` | Valor absoluto, piso, techo y norma, con sus barras. |
| `\hat x`, `\bar x`, `\vec v`, `\tilde`, `\dot`, `\ddot`, `\ul`, `\cancel`, `\overarc` | Acentos, subrayado y tachado. |
| `[a, b; c, d]`, `[a; b]`, `[[a,b],[c,d]]`, `((a),(b))` | Matrices y vectores columna dibujados (sin calcular). Entre corchetes, `;` separa filas y `,` columnas. |
| `[[a,b,\|,c],[d,e,\|,f]]` | Matriz aumentada. |
| `{(2x,+,y,=,3),(x,-,y,=,1):}` | Sistema de ecuaciones. |
| `\ubrace(…)_("texto")`, `\obrace`, `\overset(x)(=)`, `\underset` | Llaves y signos con algo encima o debajo. |
| `color(red)(x)` | Color. |
| `\bb`, `\bbb`, `\cc`, `\tt`, `\fr`, `\sf` | Fuentes: negrita, pizarra, caligráfica, máquina, fraktur, sin serifa. |
| `"texto"`, `text(hola)` | Texto recto dentro de la fórmula. |
| `dy/dx`, `f'(x)` | Derivadas. |

- A diferencia de AsciiMath, sin `\` una palabra solo se convierte si es **entera** una letra griega, una función, `if`/`and`/`or` o `sqrt`, `abs`, `norm`, `floor`, `ceil`, `root`, `frac`, `text`, `color`; si no, se dibuja letra por letra: `pi r` es π r, pero `pir` son tres letras, y `sinx` también (escribe `sin x` o `sin(x)`).
- Aún no hay alineación por **=** entre líneas.

## Nombres de variables

Siguen las reglas de los nombres de las cotas: letras, números y _, empiezan con una letra.

| Escribes | Qué hace | Ejemplo | Se ve |
|---|---|---|---|
| `masa_(total)` | Nombre con **subíndice de texto**: entre paréntesis, texto libre sin paréntesis ni llaves. Se dibuja con el subíndice en letra recta. | `masa_(total):3`<br>`2*masa_(total)=` | `masa_(total):=3`<br>`2*masa_(total)=6` |
| `Se'` | Nombre con **prima** al final (`Se'`, `Se''`, `σ'_(a)`, y funciones como `f'(x)`). La comilla es una prima si lo que sigue no puede empezar una unidad (`Se'=`, `Se'*2`); pegada a una unidad sigue siendo unidad: `x'm` es x en metros. | `Se':210'MPa`<br>`Se'*2=` | `Se':=210 MPa`<br>`Se'*2=420 MPa` |
| Letras griegas | Se escriben con la letra o con su nombre de AsciiMath, y es la **misma variable**: `beta` es `β`, `Delta_1` es `Δ_1` (`phi` es ϕ y `varphi` es φ, como se dibujan). `pi` sigue siendo la constante. Para teclear la letra: `\` y la letra (`\b` → β) o Ctrl+G (ver «Escribir un texto»). | `beta:2`<br>`β*3=` | `β:=2`<br>`β*3=6` |
| Reservados | Un nombre no puede ser una función o constante del programa (`sin`, `pi`…) ni coincidir con el de una cota. `t` es el tiempo, y `j`, `α`, `θ`, `ω` (también escritas `alpha`, `theta`, `omega`) quedan reservadas para uso futuro. | `sin:2` | `sin:=2 ⚠` |

- Un texto con un nombre no válido, o que usa una variable que aún no existe, se rechaza al escribirlo («se deshizo»). Si llega de otra forma (al pegar un texto, por ejemplo), esa definición queda con ⚠ y la variable sin definir desde ahí.
- Los nombres se actualizan solos si renombras una cota que usan.

## Orden de lectura

Como en SMath, la página se lee **de arriba a abajo** y, en una misma fila, **de izquierda a derecha**: dentro de un texto, línea por línea; los textos, por su esquina superior izquierda. Una variable vale lo de la **última definición leída antes**.

| Escribes | Qué hace | Ejemplo | Se ve |
|---|---|---|---|
| Redefinir | Una variable puede cambiar de valor más abajo. | `k:1`<br>`k=`<br>`k:2`<br>`k=` | `k:=1`<br>`k=1`<br>`k:=2`<br>`k=2` |
| Usarse a sí misma | Una redefinición puede leer el valor anterior. | `n:1`<br>`n:n+1`<br>`n=` | `n:=1`<br>`n:=n+1`<br>`n=2` |
| Borrar: `clear()` | `clear(k)=` borra la variable de texto k desde ese punto de la lectura (más abajo o más a la derecha ya no existe, salvo que se vuelva a definir); `clear(a, b)=` borra varias (con coma decimal, `clear(a; b)=`) y `clear(all)=` todas las variables y funciones de los textos definidas antes. Muestra 1 si todas las que nombra existían ahí y 0 si alguna no (las que existían se borran igual). También borra una **cota** o una **medida del dibujo** (`clear(D1)=`, `clear(l3.len)=`): desde ese punto ya no se leen (una fórmula o una salida que las lea más abajo da ⚠), pero siguen gobernando el dibujo, y el nombre queda libre para una variable de texto (`D1:7`). Si hay una variable de texto con ese nombre, el primer `clear` borra la variable y otro después la cota; una cota borrada no vuelve a leerse más abajo. Si la variable de texto se llamaba como una cota, al borrarla el nombre queda vacío (⚠) hasta el lugar de la página donde está la etiqueta de la cota: desde ahí vale la cota. `clear(all)=` (o `clear()=`, como en MATLAB) borra **todo**: variables y funciones de texto, cotas y medidas del dibujo. Es reversible por posición: si más abajo algo se rompe, quita el `clear(all)` y borra solo lo que corresponda. La página funciona como una cronología: `clear` borra lo que existe hasta ese punto, y una cota cuya etiqueta está más abajo vuelve a valer desde su etiqueta. Las medidas del dibujo (`l3.len`, `p1.x`) no tienen lugar en la página: una vez borradas no vuelven. Sirve para cerrar el alcance de una variable, como una escala eF: una cota o un vector que la lea más abajo da ⚠ en vez de usar un valor viejo. `clear` y `all` no se pueden usar como nombres. | `k:1`<br>`clear(k)=`<br>`k=` | `k:=1`<br>`clear(k)=1`<br>`k=⚠` |
| Sistema en columnas: `solve([…], […])` | La misma resolución con dos vectores: `solve([ec1; ec2; ec3], [x; y; z])=`, las ecuaciones y los nombres de las incógnitas, cada uno en una columna. Sirve cuando el sistema es grande y no cabe en una línea de la página. La respuesta es un vector columna `[x=…; y=…; z=…]`. Con coma decimal, las filas se separan con `\|` y los dos vectores con `;`: `solve([ec1 \| ec2]; [x \| y])=`. Valen las mismas reglas de la fila anterior (valor inicial, unidades, metas sobre el dibujo). | `x:1`<br>`y:1`<br>`solve([x+y==3; x-y==1], [x; y])=` | `x:=1`<br>`y:=1`<br>`solve([x+y==3; x-y==1], [x; y])=[x=2; y=1]` |
| Resolver: `solve()` | `solve(ec1; ec2; x; y)=` resuelve un sistema de ecuaciones: las que llevan `==` son las ecuaciones y los nombres sueltos, las incógnitas. Cada incógnita debe estar definida antes con su **valor inicial**, que fija su unidad (`x:1'm`); desde ese punto de la lectura vale la solución, y la salida la muestra. Se resuelve numéricamente desde los valores iniciales: con varias soluciones da la más cercana; si no encuentra una, da ⚠ y avisa (prueba otros valores iniciales). Hacen falta al menos tantas ecuaciones como incógnitas. Para una sola ecuación dentro de una fórmula está `fzero(ecuación; x; inicial)`. **Metas sobre el dibujo**: si las incógnitas son cotas, la app mueve esas cotas hasta que se cumplan las ecuaciones, que pueden leer medidas del dibujo (cotas de solo lectura, `l3.len`, `p1.x`) y variables de texto. Con el alto D5 de un rectángulo fijo, `solve(D4*D5 == 1200'mm^2; D4)=` ajusta el ancho D4 para que el área sea 1200 mm², también si después cambias D5. El valor inicial es el que tiene cada cota, y la meta se vuelve a cumplir con cada cambio (al arrastrar, al editar otra cota). Sirve para lo que no es una medida que se pueda restringir: un área, un producto o un cociente de cotas, una fórmula física. Si la meta es una distancia o un ángulo del dibujo (que una diagonal mida 50 mm), es mejor hacer esa cota motriz: el solver geométrico lo resuelve directo y más rápido. Las incógnitas deben mover el dibujo: ni de solo lectura ni con fórmula, y todas cotas o todas variables de texto. Si no hay solución, el cambio no se hace. `solve` no se puede usar como nombre. | `x:1'm`<br>`y:1'm`<br>`solve(x^2+y^2==25'm^2; y==x+1'm; x; y)=`<br>`x*y=` | `x:=1 m`<br>`y:=1 m`<br>`solve(x^2+y^2==25 m^2; y==x+1 m; x; y)=x=3 m; y=4 m`<br>`x*y=12 m²` |
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
| `[V; M]`, `[A, b]` | Matriz **por bloques**, como en MATLAB: los elementos pueden ser vectores o matrices ya definidos. `,` los pone lado a lado (mismo número de filas) y `;` uno debajo del otro (mismo número de columnas). Con dos filas V y M, `[V; M]` es la matriz del sistema. | `V:[2,1]`<br>`M:[1,3]`<br>`F:[5;10]`<br>`[V;M]^(-1)*F=` | `V:=[2, 1]`<br>`M:=[1, 3]`<br>`F:=[5; 10]`<br>`[V;M]^(-1)*F=[1; 3]` |
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
| `f(x):…=` | Define la función y muestra ahí mismo `f(x)`, con las variables que valen en ese punto (si un parámetro no es una variable en ese punto, no muestra nada). | `x:3`<br>`f(x):x^2+1=` | `x:=3`<br>`f(x):=x^2+1=10` |
| `f(a; varargin):…` | Valores opcionales, como en MATLAB: `varargin` (el último parámetro) recibe los que sobran, de cualquier tipo, y se leen con `varargin_1` o `varargin_(k)`; `nargin` es cuántos valores recibió la función (en cualquier función). Con `if(nargin==1; …; …)` se da un valor por defecto. | `d(b; varargin):if(nargin==1; 2*b; b+varargin_1)`<br>`d(5)=`<br>`d(5; 1)=` | `d(b; varargin):=if(nargin==1; 2*b; b+varargin_1)`<br>`d(5)=10`<br>`d(5; 1)=6` |
| Variables de fuera | Lee las variables que valen donde se la llama, no donde se definió. | `k:2`<br>`f(x):x*k`<br>`f(3)=`<br>`k:5`<br>`f(3)=` | `k:=2`<br>`f(x):=x*k`<br>`f(3)=6`<br>`k:=5`<br>`f(3)=15` |

- Los parámetros valen lo que se les pasa (números, vectores o matrices) y ocultan a las variables del mismo nombre.
- Los nombres de la función y de sus parámetros siguen las reglas de las variables, y no pueden ser funciones del programa (`sin`, `sum`…).

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
| Fuente | Se elige al crear el texto o en sus propiedades (doble toque sobre el texto): sistema, Helvetica/Arial, Times/Georgia, Courier/Menlo, Verdana, Palatino, Optima, Futura, American Typewriter y tres manuscritas. Si el dispositivo no tiene una, se usa una genérica parecida. |
| Propiedades | Todo lo del texto se cambia con **doble toque** sobre él: contenido, color, fuente, altura, ángulo, alineación con una línea, *Legible* y punto de inserción. Si hay otros textos seleccionados, el cambio (salvo el contenido) se aplica también a ellos, y la altura, el ángulo, la fuente, *Legible* y el punto de inserción quedan para los textos nuevos. |
| Punto de inserción | Es un punto real: se puede acotar, fijar o relacionar. Se elige su lugar en la caja del texto. |
| Ángulo y altura | Gira y escala el texto. **Alinear con** lo alinea con una línea (el ángulo pasa a ser un desfase); «Ninguna» lo suelta y conserva la orientación. |
| *Legible* | Gira 180° el texto que quedaría boca abajo. |
| Color y fondo | Las mismas muestras sirven para la fuente o para el fondo: se elige con **Color de fuente** o **Color de fondo**. El fondo pinta la caja del texto (con un pequeño margen) y tapa lo que quede debajo; en el fondo, *Auto* es el color del papel y **Sin fondo** lo quita. Se ve en el dibujo y en el SVG; el DXF no lo lleva. |

## Dibujos anteriores a la v2.0

Al abrirlos, la sintaxis vieja pasa a la nueva una sola vez, con un aviso.

| Antes | Qué pasa | Ejemplo | Queda |
|---|---|---|---|
| `x{=v}` | Definición: pasa a fórmula con asignación. | `A{=b*h}` | `$A:b*h$` |
| `[=e]` | Salida: pasa a fórmula con **=** al final. | `[=A]` | `$A=$` |
| Fórmula vieja | Lo que ahora se leería como asignación o salida queda como literal. | `$$a:b$$` | `` $$`a:b`$$ `` |

---

[← 6. Cotas](06-cotas.md) · [Índice](README.md) · [8. Splines y trazados (levas y trayectorias) →](08-splines-y-trazados.md)
