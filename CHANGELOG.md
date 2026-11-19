# Historial de cambios

Cada versión agrupa sus cambios en **Nuevo**, **Cambia el comportamiento** (lo que puede hacer que un dibujo anterior se vea o calcule distinto) y **Corregido**. Cada punto empieza por el área (Textos, Cotas, Árbol de elementos…) y una frase con lo esencial; el resto es el detalle. Las versiones anteriores a la v1.9.0 están en un solo bloque. Los cambios que todavía no tienen versión van en «Sin publicar».

## Sin publicar

### Nuevo

- Unidades: psi admite prefijo (`kpsi`, `Mpsi`) y hay `ksi` (1000 psi) y `kip` (1000 lbf): `σ='kpsi` muestra un esfuerzo en kpsi.

## v2.9.0 (2026-11-18)

### Nuevo

- Textos: todas sus opciones están en la ventana de propiedades (doble toque sobre el texto): contenido, color, fuente, altura, ángulo, **Alinear con** una línea («Ninguna» la suelta y conserva la orientación), **Legible** y **punto de inserción**. Si hay más textos seleccionados, el cambio se aplica a todos.
- Color de un texto: las mismas muestras sirven para la fuente o para el fondo, según dos botones de radio (**Color de fuente** / **Color de fondo**). En el fondo, *Auto* es el color del papel y **Sin fondo** lo quita.

### Cambia el comportamiento

- Se quitó la sección «Texto» del menú de herramientas. La altura, el ángulo, la fuente, Legible y el punto de inserción de los textos nuevos son los últimos que se eligieron en las propiedades de un texto.

## v2.8.0 (2026-11-18)

### Nuevo

- Gráficas: un lado con unidades de los textos (variable, vector o expresión) se grafica en su unidad, la de la variable si la tiene (`F:[1,2,3]'kN` va en kN) o la del SI con prefijo, y la leyenda la dice: `F (kN) vs x (mm)`. Las cotas y los actuadores siguen en mm y grados, sin unidad en la leyenda.
- Una rigidez (fuerza entre longitud) se muestra en `N/m` en vez de `kg/s²`.

### Cambia el comportamiento

- Las gráficas ya no usan el SI para los valores con unidades: `x:5'mm` se grafica como 5, no como 0.005.

## v2.7.0 (2026-11-18)

### Nuevo

- Textos: **vectores y matrices con unidades**. Una sola unidad para todos los elementos: `v:[1,2,3]'mm`, `[1'm, 20'cm]` (cada elemento con la suya, de la misma magnitud) o un rango `x:0..10;5'mm`. Se muestran todos en la misma unidad (la de la variable, la pedida con `='unidad` o la del SI con prefijo). Las operaciones las propagan: `v*2` sigue en mm, `sum(v)` en mm, `dot(F;d)` en J, `det(M)` en m², `inv(M)` en 1/m, `sqrt` saca la raíz de la unidad.
- Mezclar magnitudes en un vector (`[1'm, 2'N]`) o sumar vectores de magnitudes distintas da ⚠.

### Corrige

- La fórmula dibujaba `inv(M)` como «∈v(M)» y `len(v)` como «≤n(v)»; ahora salen como funciones.

### Cambia el comportamiento

- Un vector con unidades ya no da ⚠.
- Las gráficas usan los valores de un vector con unidades en el SI (un vector en mm se grafica en m).

## v2.6.0 (2026-11-18)

### Nuevo

- Textos: **notación científica** en las expresiones: `2.5e6`, `3e-4`, `1E3`, también con unidades (`p:2.5e6'Pa`). La fórmula la dibuja compacta (`3e−4`), sin espacios alrededor del signo del exponente.
- Un número sin unidades muy pequeño (entre 1e-12 y 1e-3) se muestra con 4 cifras significativas en vez de 0 (`3e-4=` da `0.0003`); el ruido de redondeo, como `sin(180)`, sigue saliendo 0.

### Cambia el comportamiento

- `2e-1` ahora es 0.2; antes era 2·e−1 (con la constante e). Para eso, `2*e-1`.
- `2E3` es 2000 aunque exista una variable `E3`; para multiplicar, `2*E3`.

## v2.5.0 (2026-11-18)

### Nuevo

- Textos: **unidades reales**. `x:valor'unidad` guarda el valor en esa unidad, y las unidades se convierten y se propagan: `F:250'N` y `F*2=` da `500 N`. Tabla propia con las unidades del SI y sus prefijos (m, g, s, A, K, mol, N, Pa, J, W, V, Ω, Hz, L, bar...) y otras usuales (min, h, rpm, atm, psi, kgf, in, ft, lb, hp, gal, deg, rad, %).
- Unidades dentro de una expresión: `L:2'm+30'cm`, `v:3'(m/s)`, `sin(30'deg)=`.
- `expr='unidad` muestra el resultado en la unidad pedida (`F='kN`); ⚠ si no es de la misma magnitud.
- Sin unidad pedida, el resultado sale en la unidad de una variable de la expresión o en la del SI con prefijo (`F/A=` da `25 MPa`).
- Comprobación de dimensiones: sumar, restar o comparar magnitudes distintas, o pasar una cantidad con unidades a sin, ln, etc., da ⚠.
- En una cota, una longitud con unidades se convierte a mm (`2'cm` es 20).

### Cambia el comportamiento

- La unidad ya no es una etiqueta: se propaga a las expresiones (`F*2=` muestra `500 N`) y si el valor ya trae unidades, `'unidad` solo dice en qué unidad mostrarlo.
- Un vector, una matriz o un rango con unidades ahora da ⚠ (antes la unidad se dibujaba como etiqueta).

## v2.4.0 (2026-11-18)

### Nuevo

- Textos: **unidades como etiqueta** con `x:valor'unidad` (por ejemplo `F:250'N`, `a:2*3'm/s^2=`). La unidad se dibuja junto al valor, y `F=` la repite. Es solo una etiqueta: no convierte, no se propaga a `F*2=` ni comprueba dimensiones.
- Textos: **color de fondo** del cuadro de texto (fila «Fondo» en el panel, con «Sin fondo» para quitarlo). Se exporta a SVG; el DXF no lleva fondo.
- Entrada de texto en el área gráfica: el texto de ayuda azul sobre el cuadro se reemplaza por una insignia azul a la izquierda, **α** para matemática y **A** para texto.

### Cambia el comportamiento

- Textos: el texto normal ahora empieza con `"` (o `“`/`”`, o un espacio), ya no con `'`. La `'` queda para las unidades.

## v2.3.0 (2026-11-18)

### Nuevo

- Gráficas: **un lado puede ser una expresión que da un vector**, no solo el nombre de uno: con `x:0..1;10` y `f(x):x.^2`, `f(x) vs x`, `x.^2 vs x` o `sin(x) vs x` se grafican punto a punto. Antes daban «un vector solo se grafica solo, sin operaciones». También se acepta un vector columna (`v:[1;2;3]`). Los dos lados tienen que dar vectores del mismo tamaño; una expresión que da una matriz, o un vector contra `t`, sigue dando error.

### Cambia el comportamiento

- Textos: en `f(x):expr=`, si algún parámetro no es una variable en ese punto de la lectura, no se muestra nada (antes `=⚠`). Si los parámetros existen y el cálculo falla, sigue apareciendo `=⚠`.

## v2.2.0 (2026-11-18)

### Nuevo

- Textos: **`[a, b; c, d]` y `[a; b]` se dibujan como matriz y vector columna** en una línea que solo dibuja (sin asignar ni `=` al final). Entre corchetes, `;` separa filas y `,` columnas, la misma escritura de las matrices que se calculan. Si las filas no tienen el mismo número de elementos, si hay una celda vacía o si no hay ningún `;`, se dibuja tal cual. `[[a,b],[c,d]]` y `((a),(b))` siguen funcionando.

### Cambia el comportamiento

- Textos: **`f(x):expr=` define la función y muestra `f(x)` ahí mismo**, calculada con las variables que valen en ese punto de la lectura: con `x:0..1;3`, `f(x):x.^2=` se dibuja `f(x):=x.^2=[0  0.25  1]`. Si un parámetro no existe como variable aparece `=⚠`, pero la función queda definida igual. Antes el `=` quedaba en el cuerpo de la función y cada llamada (`f(x)=`, `f(3)=`) daba ⚠.

## v2.1.0 (2026-11-18)

### Nuevo

- Textos: **`x:expr=` asigna y muestra el valor en la misma línea**: `x:2*3=` se dibuja `x:=2*3=6`. Si el valor no se puede calcular aparece `=⚠`. Un vector o una matriz asignado ya muestra su valor, así que ahí el `=` final no añade nada. No aplica a las funciones propias (en `f(x):x^2=` el `=` queda en el cuerpo) ni a una línea que termina en `==`, `<=`, `>=` o `!=`.
- Ayuda: la sección **Texto y cálculo** deja los bloques largos de texto y pasa a tablas, como «Funciones y operadores»: once grupos (escribir un texto, asignar y mostrar, texto normal y literales, escritura AsciiMath, nombres, orden de lectura, vectores y matrices, funciones propias, propiedades con «.», fuente y formato, dibujos anteriores a la v2.0), cada uno con lo que se escribe, qué hace, un ejemplo y cómo se ve, y una lista corta de reglas. En el teléfono cada fila es una tarjeta y el buscador filtra las filas. El capítulo del manual ([`docs/07-texto-y-calculo.md`](https://github.com/oscampo/ipad-cad/blob/main/docs/07-texto-y-calculo.md)) sale de la misma fuente, `src/calcref.js`, y una prueba nueva (`test/calcref.test.mjs`) comprueba que cada ejemplo se dibuja como dice la ayuda y que el manual está al día (`npm run docs` regenera los dos capítulos).

## v2.0.0 (2026-11-18)

### Nuevo

- Textos: **sintaxis de cálculo nueva**, pensada para teclear en el teléfono y parecida a SMath. Lo que se escribe en un texto es matemático por defecto (se guarda como `$$…$$`). `x:valor` asigna y se dibuja `x:=valor` (también se puede teclear `:=`); `f(x;y):expr` define una función; `x:0..1;10` es un rango; `expr=` al final de una línea muestra el resultado, `expr=valor`. No es salida si la línea termina en `==`, `<=`, `>=`, `!=` o `:=`. Un enunciado por línea: lo que sobra se marca con ⚠. Si lo primero que se teclea es `'` (o el `’` del teclado del iPad) el texto es normal, y dentro de él `$…$` y `$$…$$` siguen calculando (`'La carga es $F:250$ N`). Lo que va entre comillas invertidas (`` `f:RR->RR` ``) es literal: se dibuja pero nunca se calcula; una sin cerrar se marca con ⚠. La ayuda, el manual, la referencia de funciones y los ejemplos usan la sintaxis nueva, y una prueba nueva (`test/calc.test.mjs`) la cubre junto con la migración.
- Nombre: la app pasa a llamarse **A-CAD** (antes iPad CAD), porque funciona en iOS, Android y el navegador. Cambia lo que se ve: el título de la pestaña, el nombre en la pantalla de inicio, la ayuda, el manual, el README y los mensajes de commit que la app escribe en el repositorio de dibujos (`A-CAD: nombre`). No cambian los identificadores internos, para no perder nada guardado: el autoguardado y la configuración de GitHub de cada dispositivo, la marca de archivos protegidos (`_ipad-cad.json`), el campo `"app": "ipad-cad"` de los archivos `.json` y la dirección de la app.
- Ayuda: sección **Funciones y operadores**, con todo lo que acepta una fórmula (operadores, constantes, trigonometría, raíces y logaritmos, redondeo, vectores y matrices, funciones propias y los valores del dibujo que se pueden leer) en tablas con lo que hace cada función, un ejemplo y su resultado. En el teléfono cada fila se ve como una tarjeta. El buscador de la ayuda también filtra sus filas. La misma referencia está en el manual ([`docs/funciones.md`](https://github.com/oscampo/ipad-cad/blob/main/docs/funciones.md)). Las dos salen de `src/funcref.js`, y una prueba nueva (`test/funcref.test.mjs`) evalúa los 58 ejemplos con el motor de la app, comprueba que nombra las 64 funciones y constantes del evaluador y que el manual está al día (`npm run docs:funciones` lo regenera).
- Fórmulas: la condición se escribe con **`if(condición; si_verdadero; si_falso)`**, el nombre más universal, en la ayuda, el manual y los mensajes de error. `si()` sigue funcionando como alias, así que los dibujos que ya lo usan no cambian.
- Ayuda: «Propiedades con «.»» nombra también `l3.L`, `a2.x` y `a2.y`, que ya se podían usar.
- Íconos: el ícono de la app (triángulo con el vértice naranja) llega también al iPhone y al iPad, que no aceptan un SVG en la pantalla de inicio: ahora hay un `apple-touch-icon.png` de 180×180, cuadrado y opaco (iOS redondea las esquinas). La pestaña del navegador tiene un favicon PNG de respaldo para los navegadores que no muestran SVG, y el manifiesto suma íconos PNG de 192 y 512 para Android.
- Descripción: «CAD 2D paramétrico para iOS/Android y navegador: restricciones, cotas con fórmulas, cálculo en el dibujo y simulaciones gráficas de mecanismos», en el manifiesto, en `index.html` (lo que muestran buscadores y enlaces compartidos) y en `package.json`. La presentación de la ayuda, del manual y del README menciona ahora el cálculo en el dibujo, las simulaciones gráficas y el corte láser. El README explica cómo instalarla también en Android y en el computador.

### Cambia el comportamiento

- Textos: **`x{=valor}` y `[=expr]` dejan de existir**. Los dibujos anteriores se migran solos al abrirlos, una sola vez y con un aviso: `x{=v}` pasa a `$x:v$` y `[=e]` a `$e=$`. Si el texto ya decía `e = [=e]` queda solo `$e=$`, sin repetir la expresión. Dentro de una fórmula vieja, lo que ahora se leería como asignación o salida (`$$a:b$$`, `$x+1=$`) queda como literal entre comillas invertidas, para que se vea igual. Los dibujos guardados llevan `"calc": 2` para no migrarse dos veces. Las fórmulas de las cotas no cambian.
- Textos: una salida se dibuja ahora **con su expresión delante**, `expr=valor` (antes solo el valor), así que los textos de los dibujos anteriores se ven distintos. Un texto que repetía la expresión a mano con otra forma (`dp=m*z= [=z*m]`) queda redundante (`dp=m*z= z*m=…`) y hay que arreglarlo a mano.
- Vectores: la etiqueta de la magnitud se guarda como `$Dn=$`, y sigue mostrando solo el valor.

## v1.9.0 (2026-11-18)

### Nuevo

- Textos: inversa `inv(A)` y `A^(-1)` (Gauss-Jordan con pivote parcial; avisa si la matriz es singular o no es cuadrada), potencias enteras de una matriz cuadrada (`A^2`, `A^0`, `A^(-2)`), y operaciones elemento a elemento: `.*`, `./`, `.^` (un número se extiende a todos los elementos; con dos matrices, el mismo tamaño) y funciones sobre cada elemento (`sqrt`, `abs`, `sin`, `exp`, `ln`, `floor`…, y `max`, `min`, `round`, `mod`, `atan2`, `clamp`, `hypot` con escalares o matrices del mismo tamaño). Permite resolver `A*x = b` con `x{=A^(-1)*b}`.
- Textos: `det(A)`, `sum(x)` (suma de todos los elementos), `norm(x)` (euclidiana; Frobenius en una matriz) e índices con la notación matemática, desde 1: `x_2`, `x_i`, `A_(fila,columna)` y con fórmulas `x_(i+1)`, `A_(i,j-1)`. Valen en `[=…]`, en las variables de texto (con su orden de cálculo, aunque se definan después) y en las fórmulas de las cotas (`D1 = x_2`). Un nombre que existe como variable (`x_1`, `k_(total)`) gana al índice. Fuera de rango, índices no enteros o una matriz con un solo índice dan un mensaje claro.
- Textos: más funciones de vectores y matrices: `prod`, `mean`, `median`, `std`, `variance`, `len`, `rows`, `cols`, `min(x)` y `max(x)` con un solo vector, `cumsum`, `cumprod`, `dot(a; b)`, `cross(a; b)`, `trace`, `diag`, `eye(n)`, y filas y columnas `A_(i,:)`, `A_(:,j)`. Dentro de una fórmula, `A_(i,:)` ya no confunde `:)` con un ángulo.
- Textos: funciones propias, `foo(x; y){=expresión}` (parámetros separados por `;` o `,`): se definen en un texto y se usan en `[=…]`, en las variables de texto y en las cotas. Los parámetros ocultan a las variables del mismo nombre y aceptan números, vectores y matrices; el resto lee las cotas y variables del dibujo, sin importar el orden en que se definan. Pueden llamar a otras funciones y a sí mismas (recursión hasta 200 niveles). `si(condición; a; b)` ahora es perezoso de verdad: solo evalúa la rama elegida (antes evaluaba las dos y ocultaba los errores de la otra). Nombres y parámetros inválidos, repetidos o reservados dan ⚠.
- Textos: un número se suma o se resta a cada elemento de un vector o matriz (`3*y+2` con un vector `y`), como ya se multiplicaba y dividía.
- Árbol de elementos: orden jerárquico sin repeticiones. Cada cosa tiene un solo lugar propio y en los demás aparece como enlace ↗ (sin hijos): un punto vive en el primer elemento que lo usa (círculos, líneas, arcos, elipses, splines, textos, actuadores) y «Puntos» pasa a «Puntos sueltos», solo con los que no son de nadie; las relaciones viven en «Relaciones y cotas», ahora separadas en Cotas, Geométricas, Mecánicas y Automáticas, y bajo cada elemento hay una sola fila «Relaciones (n, +m automáticas)» con enlaces a las suyas y a las de sus puntos. Antes cada relación se repetía bajo cada elemento y bajo cada uno de sus puntos: el ejemplo del engrane pasaba de 3.399 relaciones a 152.870 filas, ahora 15.975. Tocar un enlace selecciona el elemento y abre su lugar propio; seleccionar en el lienzo abre solo el lugar propio, no las copias. Armar el árbol del engrane bajaba de unos 3,5 s a unos 20 ms en un PC (se recorrían todas las relaciones por cada elemento; ahora hay un índice), y se arma en cada cambio mientras el árbol está abierto.
- Árbol de elementos: las relaciones automáticas se agrupan por su origen. Las operaciones que crean varias relaciones de una vez (matriz lineal y circular, copia espejo, redondeo, chaflán, polígono y dividir, también en partes iguales) guardan en cada relación `op` y en el documento `ops` (tipo y número), y «Automáticas» muestra una carpeta por operación en el orden en que se hizo («Matriz circular 2 (8)»); las de formas fijas y vectores van por su elemento. Las relaciones sin origen, de dibujos anteriores o del imán al dibujar, se agrupan por tipo («Igual distancia (1600)»): el origen de las ya hechas no se puede reconstruir. Una operación que no crea relaciones no queda registrada, una dentro de otra pertenece a la de fuera, y lo que se pega no hereda la operación del original.
- Árbol de elementos: vista **por capa**. Con capas en el dibujo aparece un botón de capas en el encabezado del árbol (se recuerda la elección): el primer nivel son las capas, en su orden y también las vacías, cada una con el número de elementos, «· apagada» si lo está y un ojo para encenderla o apagarla (con deshacer); dentro de cada capa, los mismos grupos por tipo. Luego van «Sin capa» (incluye los elementos de una capa que ya no existe) y relaciones, actuadores, gráficas y trazados, que no tienen capa. Un punto con dueño sigue a su elemento aunque esté en otra capa. Sin capas el botón no se ve y el árbol va por tipo.
- Árbol de elementos: grupo **Contornos**. Líneas y arcos de trazo (no constructivos, sin vectores), arcos elípticos y splines abiertas encadenados por sus extremos forman un contorno: cerrado, abierto o ramificado (un nudo con tres o más extremos), con su composición («Contorno 2 · cerrado · 4 líneas, 2 arcos»). Dos extremos se tocan si son el mismo punto, si los ata una coincidencia (COI) o si están en el mismo lugar sin nada que los ate (una millonésima del tamaño del dibujo); esas uniones se avisan («1 unión sin restricción») porque al mover el dibujo se pueden abrir. Tocar un contorno selecciona todos sus elementos y dentro van como enlaces en el orden del recorrido. Va también en la vista por capa (un contorno puede cruzar capas). En el ejemplo del engrane salen 34 contornos abiertos de 6 elementos: cada flanco queda a 0,0143 de la punta del diente, y por eso el perfil no cierra.
- Árbol de elementos, contornos: la **abertura** de un contorno abierto. Para cada extremo libre se busca el extremo libre más cercano, de otro contorno o del mismo, y si está a menos del 1 % del tamaño del dibujo el contorno lo dice con tres cifras significativas: «abertura 0.0143 con el 2», o «abertura 0.01 entre sus extremos» si casi se cierra solo. Más lejos no se informa (es un trazo abierto, no una abertura). La búsqueda es un barrido ordenado por x, sin comparar todos con todos.
- Ayuda: **buscador** arriba de la ayuda. Sin distinguir tildes ni mayúsculas (`iman` encuentra «imán») y con todas las palabras (`angulo limite`), deja solo los puntos que coinciden y abre sus secciones; si coincide el título de una sección, la muestra entera. Al vaciar el campo vuelve a como estaba.
- Documentación: **manual** en [`docs/`](https://github.com/oscampo/ipad-cad/tree/main/docs) para colegas y estudiantes, con un capítulo por tema (los mismos 14 de la ayuda, con su introducción y navegación entre capítulos) y una página de **conceptos básicos** (dibujo paramétrico, restricciones, grados de libertad, el solver, cotas conductoras y de referencia, cálculo en el dibujo, simulaciones gráficas y glosario). **README** nuevo: qué es la app, cómo instalarla en el iPad, qué se puede hacer, los ejemplos de `ejemplos/` con lo que muestra cada uno, documentación, desarrollo y créditos. El README anterior describía la v1.0 (por ejemplo, splines Catmull-Rom, que ya son B-splines de PlaneGCS).

### Cambia el comportamiento

- Textos: **orden de lectura y solución** (como SMath). La página se lee de arriba a abajo y, en una misma fila, de izquierda a derecha (dentro de un texto, línea por línea; los textos se ordenan por su esquina superior izquierda). Una variable vale lo de la última definición leída antes: se puede **redefinir** (`k{=1}` … `[=k]` … `k{=2}` … `[=k]`) y usarse en su propia redefinición (`n{=n+1}`); cada salida `[=…]` y cada definición ven el valor de su punto. Usar una variable antes de definirla da un error que dice que se define más abajo o más a la derecha, y una definición que falla deja la variable sin definir. Las fórmulas de las cotas ven el valor final. Las funciones propias leen las variables que valen al llamarlas. Ya no hay errores por «definida más de una vez» ni ciclos entre variables de texto. **Cambia el comportamiento de dibujos que usaban una variable antes (arriba) de su definición**: ahora esa salida da ⚠; mueve la definición arriba de su primer uso.
- Cotas: también se leen en el orden de lectura. Una cota con fórmula ve las variables de texto tal como estaban en el lugar de su etiqueta (de arriba a abajo y de izquierda a derecha, como los textos): si `k{=1}` está arriba de la cota y `k{=7}` entre la cota y el pie de la página, `D2 = k*2` vale 2. Una variable que se define después de la cota (más abajo o más a la derecha de su etiqueta) todavía no existe para ella y avisa. Mover un texto o la etiqueta de una cota recalcula las cotas que leen variables de texto. Las cotas por debajo de todas las definiciones ven los valores finales, como antes. Mientras se simula un mecanismo o se arrastra algo, el orden de lectura de las cotas se congela (el del inicio): una etiqueta que cruza un texto a mitad del movimiento no cambia el valor de su cota ni detiene la simulación (en las gráficas con simulación tampoco); al soltar o al terminar se vuelve al orden normal.
- Ayuda: ordenada **por tareas** (Empezar, Dibujar, Seleccionar y editar, Dividir copiar y repetir, Restricciones, Cotas, Texto y cálculo, Splines y trazados, Simulaciones gráficas, Estilo capas y vista, Archivo y exportación, Atajos, Límites conocidos y Acerca de) en vez de por los botones de la barra. Los textos se movieron sin reescribirlos (verificado punto por punto). Engranaje, cremallera, relaciones finitas, indicadores y redundantes salen de «Límites conocidos», donde no correspondían; la matemática de los textos sale de «Primeros pasos». El historial de versiones ya no se repite en la ayuda: queda en este archivo y en los Releases de GitHub.

### Corregido

- Arranque: si la app se cerraba con el árbol de elementos abierto, al volver a abrirla el arranque se cortaba antes de cargar el solver (las carpetas del árbol compartían la clase `.grp` con los grupos de herramientas de la barra). Ahora los grupos de herramientas se buscan por `.grp[data-group]`.

## v1.8.0 (2026-11-18)

- Actualización automática: la web app de pantalla de inicio del iPad se quedaba con un `index.html` viejo (la cache HTTP de GitHub Pages dura 10 minutos y la web app guarda la suya). El service worker (`sw.js`, ahora `ipad-cad-v2`) pide la página siempre con revalidación, solo atiende lo del mismo origen (las llamadas a la API de GitHub con el token ya no pasan por su cache) y borra las caches viejas al activarse. Además, al volver a la app se comprueba si hay una compilación nueva publicada y, si la hay, se recarga (el dibujo se restaura del autoguardado; como mucho una vez cada 5 minutos y nunca con una ventana, una entrada de texto o una simulación abiertas). La primera vez que llegue a un dispositivo con la web app vieja hay que limpiar los datos del sitio una última vez.
- Gráficas: un toque la selecciona (resaltada), se arrastra para moverla y sus bordes o esquinas cambian su tamaño; doble toque abre sus propiedades.
- Gráficas: ejes x1, x2, y1 e y2 (los secundarios con «@x2» o «@y2» al final de la relación), cada uno con nombre libre, escala lineal o logarítmica, límites y divisiones mayores y menores.
- Gráficas: las relaciones admiten operaciones y funciones («p1.x/p1.y vs t», «ML1.d-p1.x vs t»).
- Simulación: los puntos con «Trazar punto» dibujan su trayectoria y la conservan al detener la simulación.
- Menú de actuadores, gráfica y simulación: se quitan los textos descriptivos de los botones (siguen en la ayuda emergente).
- Gráficas: el cálculo cede el hilo cada ~25 ms (antes bloqueaba la página de una vez) y se pausa mientras se arrastra algo. Si la página se cierra a mitad de un cálculo (Chrome en iPad), al reabrir las gráficas quedan en pausa con un aviso del avance alcanzado, en vez de repetir el fallo; un toque sobre la gráfica la calcula.
- Ayuda, «Límites conocidos»: registrado que calcular gráficas con simulación puede cerrar la página en Chrome del iPad (observado con `prueba-simulaciones.json`): la pausa aparece al reabrir, recalcular falla otra vez, abrir el archivo desde GitHub carga bien, y mover, redimensionar, pan y zoom no fallan. Causa sin confirmar.
- GitHub: «Abrir de GitHub» pasa a ser un administrador de archivos: selección múltiple, papelera (`_papelera` en el repositorio) con Restaurar y Eliminar definitivamente, Renombrar, Duplicar y Proteger (la marca vive en `_ipad-cad.json`, vale en todos los dispositivos y pide confirmación extra al borrar). Muestra el guardado automático del dispositivo («Dibujo actual») con Guardar en GitHub y Descartar. Pruebas nuevas: `test/github.test.mjs` (GitHub simulado en memoria).
- GitHub (administrador): fecha del último cambio de cada archivo (se pide a GitHub en segundo plano y se recuerda por sha), buscador por nombre sin distinguir mayúsculas ni acentos, y orden por nombre o por fecha.
- Texto: la herramienta escribe directo sobre el dibujo, sin ventana. Por defecto la entrada es una ecuación AsciiMath que se guarda como bloque `$$…$$` (los delimitadores quedan visibles en las propiedades del texto); si lo primero que se teclea es `'` es texto normal (con `{=}`, `[=]`, `$…$` y `$$…$$` como siempre). Enter dibuja y abre otra entrada justo debajo (un texto por Enter), Shift+Enter hace otra línea dentro del mismo texto, Esc descarta, y Enter en una entrada vacía o cambiar de herramienta terminan.
- Cotas a escala: la escala puede ser una fórmula con cotas y variables de texto (`30[*k]` con `k{=25}`; antes daba «la escala debe ser un número mayor que cero»). Si cambia la variable, el dibujo se recalcula y la cota sigue diciendo el valor. Las cotas de solo lectura también tienen escala: al marcar «Solo lectura» aparece el campo «Escala (×)» y la cota dice la medida entre la escala (subrayada, en cursiva); la escala pasa de ese campo a `valor[*k]` y viceversa al marcar o desmarcar la casilla.
- Cotas a escala: `valor[*k]` en la cota de una distancia, radio o diámetro (`4[*10]`): el dibujo mide valor × k (40) y la cota dice el valor («4»), subrayada (ISO 129, UNE 1-039), también en SVG (subrayado) y DXF (`%%u`). La fórmula de la cota se multiplica por la escala, y al editar la cota vuelve a verse `valor[*k]`.
- Textos: variables con subíndice de texto, `var_(texto-del-subíndice){=valor|expresión}`. Se definen, se usan en `[=…]` y en las demás fórmulas (`k_(total)*2`), y dentro de una fórmula `$…$` se dibujan como nombre con el subíndice en texto recto (antes AsciiMath leía el subíndice como símbolos sueltos: «to» salía como una flecha y la definición no se reconocía). Los espacios sobrantes del subíndice no cuentan.
- Textos: vectores y matrices operables. Literal `[1, 2; 3, 4]` (fila `[1, 2, 3]`, columna `[1; 2; 3]`; dentro de corchetes la coma siempre separa y los decimales llevan punto), `A{=[1,2;3,4]}`, y en `[=…]` y en las definiciones: suma y resta de matrices del mismo tamaño, escalar por matriz, matriz entre escalar, producto matricial (`A*B`; fila por columna da un número, `x*y^T`), y `^T` como operador. Dentro de una fórmula `$…$` el resultado se dibuja como matriz. Los tamaños que no cuadran, la potencia y las funciones sobre matrices dan un mensaje claro (las funciones, las potencias y los índices llegarán después). Las salidas `[=…]` admiten corchetes dentro.
- Textos: `^T` en una fórmula transpone lo que lleva delante: un vector fila (`$$[=x]^T$$`, `$x{=1..3;3}^T$`) se dibuja como vector columna, y una matriz se dibuja transpuesta.
- Textos: dentro de una fórmula `$…$` o `$$…$$`, un rango (`x{=inicio..fin;n}`, `x{=inicio..paso..fin}`) y su salida `[=x]` se dibujan como vector fila con corchetes y sin comas (más de 8 elementos se abrevian con «…»); fuera de la fórmula siguen siendo texto «[1, 2, 3]».
- Textos: la matemática sigue ahora la tabla de asciimath.org completa: matrices (`[[a,b],[c,d]]`, vectores columna, aumentadas con `|`, sistemas con `{(…):}`), `floor`/`ceil`/`norm`, llaves `ubrace`/`obrace` con anotación, `overset`/`underset`, acentos (`tilde`, `dot`, `ddot`, `ul`, `cancel`, `overarc`), `color(red)(x)`, fuentes (`bb`, `bbb`, `cc`, `tt`, `fr`, `sf`), `text(…)`, `dy/dx`, `f'(x)`, todos los símbolos, flechas y relaciones de la tabla, y los operadores grandes `oint`, `^^^`, `vvv`, `nnn`, `uuu`. Se revisó cada ejemplo de la tabla en el dibujo.
- Textos: matemática en AsciiMath, `$…$` en línea con el texto y `$$…$$` en bloque (una ecuación por línea, centrada). Fracciones (`a/b`), índices (`x^2`, `x_1`), raíces, griegas, sumatorias/productos/integrales/límites, funciones, paréntesis que crecen, `abs`, acentos (`hat`, `bar`, `vec`) y operadores (`<=`, `->`, `+-`, `xx`…). Se dibuja como trazos y letras (sin dependencias), gira con el texto y sale en SVG y DXF. Las salidas `[=…]` se calculan antes de la fórmula. Un `$` suelto («$5 y $6») no cuenta; `\$` es literal; un `$$` sin cierre queda tal cual con ⚠. Los textos sin `$` no cambian.
- Seleccionar: tocar y mantener (~0,7 s) sobre elementos que comparten lugar o quedan casi encima (puntos coincidentes, centros concéntricos, líneas colineales) abre una ventana flotante y movible con la lista de los cercanos; los marcados se resaltan en el dibujo y «Confirmar» los selecciona («Cancelar» no cambia nada). Con un solo elemento bajo el dedo sigue la lupa. El botón «Propiedades» de la ventana abre las propiedades del elemento marcado (si es uno solo) sin cerrarla.

- La velocidad de un actuador en las gráficas se escribe con la notación «.»: `ML1.v` (reemplaza a `ML1_v`; el «_» queda reservado para subíndices); `ML1.d` es su desplazamiento, igual que `ML1`.
- **Tiempo final único**: el «hasta» del reproductor y el «Tiempo final» de las gráficas son el mismo valor (se guarda con el dibujo); si cambia uno, cambia el otro y todas las gráficas se recalculan.
- **Notación «.» para propiedades de elementos**: `p12.x` y `p12.y` son las coordenadas del punto p12; `l3.len` (o `l3.L`) y `l3.ang` la longitud y el ángulo de la línea l3; `c1.r`, `c1.d`, `c1.x`, `c1.y` el radio, diámetro y centro del círculo c1; `a2.r`, `a2.x`, `a2.y` lo propio del arco a2. Sirven en cualquier fórmula: cotas, textos (`[=p12.x]`), variables de texto, actuadores y gráficas (`p12.y vs t`). Siempre valen lo que tiene el dibujo en ese momento, también durante la simulación.
- **Actuadores (fase 1)**: «MR» (rotacional) se define sobre una línea y uno de sus extremos (el centro de giro), que se eligen tocándolos en cualquier orden o seleccionándolos antes; se muestra como una flecha circular (antihoraria por defecto, u horaria) con el texto MR1. «ML» (lineal) se define entre dos puntos (el primero es la cola) y se dibuja como un vector del color de las trazas de spline con su nombre en el punto medio. Su acción es un desplazamiento o una velocidad respecto al tiempo `t`, dada por una expresión (`90*t`, `30*sin(2π*t)`, con cotas y variables) o por una tabla «tiempo; valor» (interpolada linealmente). Se editan tocando su etiqueta. Un botón de `Simulación` (en el grupo de actuadores) abre una barra con reproducir, tiempo y duración: el dibujo se mueve resolviendo las restricciones y vuelve a su estado al detener. Los actuadores y las gráficas aparecen en el árbol de elementos (grupos «Actuadores» y «Gráficas»: tocar el nombre abre sus propiedades, con botón para editar y borrar) y el filtro de selección tiene la opción «Actuadores y gráficas» (apagada, tocar su etiqueta no los abre). El reproductor de la simulación tiene paso atrás y adelante (1/100 del tiempo total), repetición en ciclo (loop), vaivén (ping-pong) y escala de velocidad (0.5x, 1.0x, 1.5x, 2.0x). El ML se crea eligiendo sus dos puntos (la cola queda resaltada) o desde dos puntos seleccionados antes de elegir la herramienta. Las gráficas se describen abajo.
- **Gráficas**: un objeto del dibujo (herramienta «Gráfica» del grupo de actuadores) que muestra relaciones «variable1 vs variable2» (la primera en el eje vertical), una o varias en la misma gráfica, cada una con su color y leyenda. Las variables son `t`, el desplazamiento de cada actuador por su nombre (`MR1`, `ML1`) y su velocidad (`MR1.v`), las cotas con nombre, las variables de los textos y los vectores de rangos (dos vectores del mismo tamaño se grafican punto a punto). Si hay variables que cambian con el tiempo, el dibujo se simula (en una copia) de 0 al tiempo final con las muestras indicadas. Se edita tocando la gráfica (título, relaciones, tiempo final, muestras, posición y tamaño) y se recalcula al cambiar el dibujo; durante la simulación marca el tiempo actual.
- **Esquinas continuas**: las líneas, arcos, elipses y splines de trazo continuo llevan remate redondo, así que donde se juntan dos elementos ya no queda la muesca en la esquina (los trazos con patrón de rayas no cambian).
- **Rangos en las variables de texto**: `x{=inicio..fin;n}` define un vector de `n` elementos igualmente espaciados entre `inicio` y `fin`, y `x{=inicio..paso..fin}` uno que va de `inicio` sumando `paso` sin pasar de `fin`. Cada parte puede ser una fórmula; `[=x]` en un texto muestra los elementos. Por ahora un vector no entra en fórmulas numéricas (avisa).

## v1.7.1 (2026-11-16)

- **Redondeo y chaflán entre elementos cualesquiera**: la herramienta (`F`) ahora une dos segmentos, arcos o arcos elípticos aunque no se junten en una esquina ni sean tangentes, y se pueden elegir de tres formas: tocando el punto de una esquina (también con varios puntos seleccionados antes de elegir la herramienta), tocando un elemento y luego el otro, del lado que se conserva, o preseleccionando exactamente dos elementos (se conserva la parte hacia el extremo de cada uno más lejano del vértice). El redondeo crea un arco de ese radio tangente a los dos, con su cota de radio; cada elemento se recorta o se alarga hasta el punto de tangencia. El chaflán entre elementos une un punto de cada uno, a la distancia dada en recta del vértice donde se cortan, con una cota por tramo; si no se cortan, avisa. Las líneas constructivas que pasan por la esquina ya no cuentan, y una esquina donde los elementos terminan en puntos distintos unidos por una restricción de coincidencia (COI) vale como esquina (si se seleccionan los dos puntos se redondea una sola vez). Se pueden mezclar esquinas de segmentos, arcos y arcos elípticos en la misma selección.
- **Redondeo: criterio de elección**: de las soluciones tangentes a los dos elementos que los unen sin dejar una punta, se prefieren las de arco menor que media vuelta; entre ellas gana la más cercana al vértice (su extremo común o el corte de sus prolongaciones) y, a igual distancia, la de menor arco; si todas pasan de media vuelta, la de menor arco. No depende del orden en que se eligen los elementos ni de dónde caigan los toques (que solo deciden qué parte se conserva). Se quitan las cotas de longitud (cota e igualdad) de los segmentos recortados, porque ya no valen, y se avisa. Un círculo o una elipse completos no se redondean. Con elementos sueltos, el solver puede deformarlos al cambiar el radio. Verificado con las 12 esquinas de `test/fixtures/pruebas-redondeo.json`.
- **Restricción «Tangente en el extremo» con arcos y arcos elípticos**: además de línea y arco, ahora vale entre dos arcos (el punto de contacto sobre la recta de los dos centros) y entre un arco elíptico y un arco (el ángulo entre las curvas en el contacto).
- **Propiedades de un arco o círculo con cota de radio**: el botón «Radio» (o «Diámetro») ahora edita la cota que ya tiene, la misma que aparece como «R1 · Radio R = …» en la lista de restricciones, en vez de crear una segunda cota que entraba en conflicto. Con el arco de un redondeo, su radio y la cota «R» son una sola cota. Mismo comportamiento con el botón de cota de radio de la barra con el arco seleccionado.
- **Extender spline**: la herramienta Extender ahora alarga también los splines abiertos. El extremo que tocas se prolonga en línea recta, en la dirección de la tangente del spline en ese extremo, hasta el primer elemento que encuentre; se agrega un solo punto, que queda sobre ese elemento. No se extienden los splines cerrados ni los que tienen relaciones.
- **Recortar spline**: el spline conserva su número de puntos y los reparte a distancias iguales sobre lo que queda, en vez de amontonar puntos junto al corte (si el corte lo parte en dos, se reparten según la longitud de cada trozo). Solo se agregan puntos si con los mismos el trozo se apartaría de la curva original más de 0,1 % de su tamaño (splines de pocos puntos). Si el spline tiene relaciones, o alguno de sus puntos está fijo o lo usa otro elemento, se mantiene el comportamiento anterior: los puntos no se mueven y se agregan unos pocos junto al corte.
- **Trazado a spline**: el spline termina donde termina la trayectoria. La trayectoria guarda la posición exacta del punto al llegar a un «tope en bordes» y al soltar el arrastre (antes el último paso se descartaba si era más corto que la separación entre muestras), y al convertirla se quitan los tramos repasados: si el punto llega al extremo y retrocede un poco, el spline llega hasta el extremo y no hasta la última posición.
- **«Tope en bordes»** para las relaciones «Solo en los límites» (casilla nueva en las propiedades del elemento, visible cuando «Solo en los límites» está marcada; «Solo en los límites» funciona igual que antes). Sin tope, al salirse el contacto por un borde la relación se suelta y el elemento queda libre. Con tope, el elemento se detiene en el borde y no pasa: un punto sobre un segmento se queda en el extremo, un punto sobre un arco en el extremo del arco, en una tangencia círculo o arco con segmento el extremo del segmento se apoya en el círculo (o el extremo del arco en la línea), y en una tangencia entre círculos o arcos el extremo del arco se apoya en el otro. Al volver hacia dentro la relación se retoma sola. Solo se engrana si la relación valía al empezar el paso (un punto libre que cruza la prolongación del segmento no se atrapa). Si el tope no cabe con las demás restricciones (por ejemplo una cota que pide un valor que obligaría a pasar del borde) la resolución falla y el dibujo queda como estaba, en vez de quedar fuera del límite con la pasada anterior. Al arrastrar, el elemento llega hasta el borde aunque lo empuje una cota dura (por ejemplo una distancia con fórmula que sigue al arrastre): antes ese paso se rechazaba entero y el elemento se quedaba donde lo dejó el paso anterior, un poco antes del borde; ahora se busca la fracción del paso que lo deja en el borde (con una precisión de 1e-4 del largo del segmento o del radio).
- **Variables en Dividir, Matriz lineal y Matriz circular**: sus campos (número de partes, espaciado, número total, ángulo total, ángulo entre instancias y omitir instancias) aceptan las cotas y las variables de texto `x{=valor}`, además de números y fórmulas; los diálogos de las matrices, de Dividir y de las cotas tienen un menú de variables con filtro (todas, dimensiones, ángulos, variables de texto) que inserta la elegida en el campo donde se escribe, en la posición del cursor. Donde se pide un entero, una variable o fórmula se redondea al entero más cercano (como `round(variable;0)`); un número simple sigue exigiendo un entero. Dividir y los demás campos numéricos de «entero» (equidistante, puntos del spline) también leen variables. «Omitir instancias» admite fórmulas entre paréntesis, como `round(z/2;0)`.
- **Forma fija de un spline** (casilla en las propiedades del spline): amarra sus puntos de control entre sí con distancias ocultas (tres puntos ancla que forman el triángulo más grande y, para cada otro punto, sus distancias a los dos anclas con los que queda mejor determinado), de modo que la curva se mueve y gira como un cuerpo rígido y no se deforma cuando se arrastra uno de sus puntos. Desmarcarla borra esas distancias; borrar el spline también. Una matriz circular vinculada de 17 dientes sobre un diente con forma fija se resuelve y gira rígida, a unos 60 a 90 ms por arrastre.
- **Redondeo y chaflán de esquinas** (nuevo botón después de Polígono, con las dos herramientas agrupadas; atajo `F` para el redondeo): toca el punto donde se juntan dos líneas y teclea el radio o la distancia (admite fórmula). Con varios puntos seleccionados antes de elegir la herramienta se aplica a todos con un solo valor. El redondeo crea un arco tangente a las dos líneas con su cota de radio (editable); el chaflán, una línea con una cota por tramo. Las líneas se acortan hasta los puntos de contacto y el punto de la esquina queda como vértice virtual sobre las dos rectas, así las cotas del rectángulo y las restricciones que usaban esa esquina siguen valiendo, y redondear los cuatro lados de una pieza no desarma sus dimensiones. La igualdad de longitudes entre las líneas acortadas (por ejemplo, en un polígono) se convierte en igualdad de distancias hasta el vértice virtual; un relleno que usaba las líneas incluye también el arco o el chaflán. Avisa el máximo cuando el radio no cabe.
- **Restricción nueva: «Tangente en el extremo»** (`TANEP`, interna: la crea el redondeo): una línea es tangente a un arco en un punto que es extremo de los dos, expresada como perpendicularidad entre la línea y el radio que llega al punto. La tangencia común (distancia del centro a la recta igual al radio) es singular en ese caso: el solver la daba por conflicto al cambiar el radio. Se muestra como «T» como las demás tangentes.
- **Atajos con cuadros de texto**: si la herramienta elegida con una tecla abre un cuadro (como el radio del redondeo), la letra ya no se escribe en el campo.
- **Variables en los textos**: `nombre{=valor}` asigna a «nombre» el valor de una expresión. Vale para todo el dibujo: las salidas `[=nombre]` de cualquier texto y las fórmulas de las cotas la leen como a una cota con nombre. El valor puede usar cotas y otras variables (en cualquier orden) y se recalcula al cambiar lo que usa; las cotas con fórmula que las leen se recalculan en el orden correcto (una cota que depende de una variable que depende de otra cota va después de ella), y las que leen cotas de solo lectura a través de una variable también cuentan como reactivas. El texto muestra la definición **en cursiva** como `nombre:=valor`. No pueden repetirse ni coincidir con el nombre de una cota o de una función: al escribir el texto se rechaza (y se deshace) si introduce un problema nuevo; una definición mala que llega de otra forma queda marcada con ⚠. Renombrar una cota actualiza también las variables que la usan.
- **Nombres reservados para uso futuro**: `t` (el tiempo), `j`, `ω`, `θ` y `α` no se pueden usar como nombre de cota ni de variable de texto (solo esas minúsculas exactas; `T`, `Ω` o `i` sí), porque los motores, animaciones y cálculos dinámicos las usarán. Por ahora no valen nada: usarlas en una fórmula avisa que están reservadas. Un dibujo guardado que ya tenga una cota con ese nombre sigue funcionando.
- **Texto con tramos en cursiva**: la caja del texto, la selección y el dibujo miden y pintan cada tramo con su propia fuente; el SVG exporta el tramo con `font-style="italic"` y el DXF lo deja como texto plano.
- **Funciones nuevas en fórmulas**: redondeo (`round`/`redondear(x; n)`, `floor`/`piso`, `ceil`/`techo`, `trunc`, `sign`/`signo`), comparación (`min`, `max`, `clamp`, `mod`, `hypot`, los operadores `< > <= >= == !=` y `si(condición; verdadero; falso)`, que solo calcula la rama elegida) y trigonometría extra (`atan2`, `sec`, `csc`, `cot`, `sinh`, `cosh`, `tanh`, `asinh`, `acosh`, `atanh`, `deg`, `rad`). Las de varios valores se separan con `;` (o con una coma tras una variable o un espacio: `2,5` sigue siendo el número 2,5, y `max(2,5)` avisa en vez de dar un resultado equivocado).

## v1.7.0 (2026-11-14)

- **Indicadores de relaciones**: las de un punto con un elemento (punto sobre línea, sobre círculo o arco, spline o elipse) llevan la etiqueta en el punto y en el elemento, para ver con cuál se relaciona; la horizontal o vertical entre 2 puntos, junto a los dos puntos. Las de engranaje llevan «G» y las de cremallera «Cr», numeradas como las demás (también en archivos que ya las tenían).
- **Relaciones finitas** (casilla «Solo en los límites», apagada por defecto): en las propiedades de un elemento, cada tangencia, punto sobre línea, punto sobre círculo o arco y tangencia entre arcos puede valer solo mientras los elementos **se tocan gráficamente**: su punto de contacto cae dentro de los límites (el segmento entre sus extremos, el barrido del arco) y la separación es casi cero. Fuera de eso la relación no existe: no se manda al solver y los elementos quedan libres. Si en un paso se atraviesan (o se rozan por menos de lo que se movió el punto), se captura y la resolución los devuelve al contacto. Con esto una cruz de malta funciona con una relación finita de punto sobre segmento por ranura: con geometría ideal (a/d = sen(π/n)), la cruz avanza exactamente 90° por vuelta del impulsor, sin fallos, con pasos de 1°, 2° o 5°. Una primera versión validaba solo que el pie de la perpendicular cayera en el segmento: un perno lejos de una ranura la seguía con toda la cruz y varias ranuras a la vez chocaban entre sí (error o saltos). Límite: con geometría que no es ideal, el perno atraviesa la ranura de lado y la cruz da un salto al capturarlo.
- **Arrastre: solo se resuelve lo conectado**: al arrastrar, el solver recibe únicamente el componente (puntos, líneas, círculos, arcos y restricciones conectados entre sí, sin pasar por puntos fijos) que contiene lo arrastrado; el resto del dibujo queda fijo. Medido con un mecanismo diminuto y N relaciones sin conexión con él, el costo por resolución dejaba de crecer con N (~0,1 ms por relación). Solo en arrastres, sin fórmulas que lean medidas y sin elipses nativas. Con el prune de primitivas que no influyen (solo en este modo), el mismo caso con 200 relaciones ajenas pasó de ~23 ms a ~2,4 ms por resolución.
- **Versión y build** (abajo a la izquierda del dibujo): en lugar de la fecha, junto a la versión se ve el build, el commit corto desde el que se compiló (por ejemplo `v1.6.1 7bc0108`; con `+` si tenía cambios sin commitear, `dev` sin git). Sirve para saber exactamente qué compilación corre cada dispositivo.
- **Nombre del archivo** (arriba a la derecha del dibujo, con el mismo estilo): el archivo actual, o «sin nombre». Se actualiza al abrir, guardar y empezar uno nuevo.
- **Rueda y cremallera** (nueva restricción «Cremallera», grupo Restricciones): liga el giro de una rueda (una línea rígida con ella) con el avance de un punto a lo largo de una línea: `avance = razón × giro`. Sirve para un piñón con su cremallera y para una rueda que rueda sin deslizar (el punto es su centro y la razón, −radio). Se arrastra la rueda, la cremallera o el punto: el piñón de centro fijo se maneja por su ángulo, y lo demás avanza lo que avanza el ratón a lo largo de la cremallera. Pruebas: una rueda arrastrada 60 unidades gira exactamente −60/radio, y un piñón girado 90° mueve la cremallera r·π/2 y viceversa.
- **Cremallera: el punto que avanza se valida**: debe ser el centro de la rueda (a una distancia igual a la razón de la línea de la cremallera) o un punto de la propia cremallera. Si se elige un punto del borde (no avanza a ritmo uniforme y el sistema queda imposible: nada se mueve) y el otro extremo de la línea de la rueda sí vale, se usa ese (era el centro) y se avisa; si ninguno vale, se explica con la distancia medida y no se crea.
- **Engranaje y cremallera: el centro de giro** ya no se toma por una simple coincidencia de posiciones: debe ser un punto fijo o estar ligado a uno con una restricción «Coincidente». Una rueda que rueda puede pasar por donde hay un punto fijo sin que se confunda con un piñón.
- **Engranaje: trenes de varias ruedas**: la relación propaga el cambio de ángulo desde la postura actual en vez del ángulo absoluto con las constantes `a0` de cada relación. Una rueda que está en dos relaciones (A-B, B-C, C-D) puede tener esas constantes en vueltas distintas (180 en una, -180 en otra) y el ángulo compuesto salía desfasado en múltiplos de 360 por la razón: la rueda de salida se mandaba 180° fuera de su postura al resolver. Con el cambio, en reposo no se mueve nada y el giro de cada rueda sigue la razón desde donde estaba.
- **Arrastre más liviano en dibujos grandes**: durante un arrastre el análisis estructural del dibujo (seguidores, arcos inmóviles, cuerpos de los engranajes) se hace una sola vez y se reutiliza, porque solo cambian las posiciones. En el ejemplo de engranes con relación, el cálculo por movimiento pasó de ~32 ms a ~15 ms (Node, mismo resultado). Es trabajo de JavaScript, así que ayuda más en dispositivos lentos.
- **Un dibujo menos por movimiento**: al arrastrar, el lienzo se dibujaba dos veces por cada movimiento (una dentro de `toolMove` y otra al final); ahora una. En el ejemplo de engranes, de ~52 a ~40 ms por movimiento en el navegador de escritorio.
- **Medidor de rendimiento**: al abrir la app con `?perf` en la dirección (por ejemplo `.../ipad-cad/?perf`) aparece un recuadro con lo que tarda cada movimiento: rastreo, solver y dibujo, y la media de los últimos 20 arrastres. Sirve para saber qué pesa en un iPad o un teléfono. Desglosa el cálculo en WASM (carga de primitivas, cálculo y lectura del resultado) y el resto de JavaScript, y se acorta para que quepa en pantallas angostas.
- **Relación de engranaje** (nueva restricción «Engranaje», grupo Restricciones): liga el giro de dos cuerpos rígidos, cada uno representado por una línea (por ejemplo la radial de cada engranaje): `giro 2 = razón × giro 1`, con la razón que teclees (negativa si giran en sentido contrario; admite fórmula como `-17/34`) y la postura actual como punto de partida (no hay desfase que calcular: posiciona los engranes a mano y crea la relación). Se arrastra cualquiera de los dos y el otro gira con la razón, varias vueltas. El solver fija el ángulo del engranaje arrastrado (el del ratón alrededor del centro) y calcula el del otro, sin vueltas de fórmula ni objetivo suave: en el ejemplo de dos engranes de 17 dientes un movimiento de arrastre pasó de ~2 s a ~60 ms en el navegador. Requiere que el engranaje gire alrededor de un punto fijo y que sus puntos estén amarrados a ese centro (distancia y ángulo, como los de una matriz circular). No modela el contacto entre dientes.
## v1.6.1 (2026-11-13)

- **Arrastre más rápido con cotas que leen medidas** (engranes acoplados por fórmulas): un destino que la geometría no alcanza del todo (un punto sobre un círculo arrastrado con el mouse) ya no se sigue atrayendo en cada vuelta de la fórmula; desde la 2.ª vuelta el punto se queda donde la 1.ª lo puso y las vueltas siguientes solo ajustan las fórmulas. Un paso de arrastre de dos engranes de 17 dientes pasó de ~3 s a ~0,25 s en un dibujo sin redundantes.
- **El solver omite lo que no puede cambiar nada**: los arcos cuyo centro y extremos no se pueden mover (copias de una matriz circular) y las restricciones ya cumplidas entre puntos fijos. Eran restricciones redundantes para planegcs, que al detectarlas resuelve dos veces y las diagnostica (64 arcos copia multiplicaban por 6 cada resolución).
- **Restricciones redundantes**: nuevo botón «Redundantes» en Restricciones. Lista las que no agregan información (otras ya implican lo mismo) y ofrece quitarlas (la geometría no cambia; se repite hasta que no queden y se puede deshacer). Las cotas con nombre redundantes se avisan pero no se quitan. Al abrir un archivo con redundantes, un aviso lo indica.
- **Copias vinculadas y simetrías en dibujos grandes**: un punto que solo es copia de otro (matriz circular: EQD + ANG4, o una simetría) ya no es incógnita del solver: queda fijo mientras se resuelve y se calcula de su fuente al terminar. El resultado es el mismo, pero un engranaje con 17 dientes copiados (unos 1650 restricciones) pasaba de agotar la memoria del solver (WASM de memoria fija, tope de unos 220 puntos copiados) a resolverse en menos de 0,4 s. Arrastrar una copia sigue arrastrando su fuente. Un punto copia con otra restricción propia, o que pertenece a una curva con relaciones (PONS, tangencias, cotas de un arco), sigue siendo incógnita.
- **Recortar spline**: ya no multiplica los puntos de control. El trozo conserva los puntos originales que le quedan y agrega solo unos pocos junto al corte (un spline de 16 puntos pasa de 64 a unos 13), con desviación de forma menor a 0,05 % del tamaño.

## v1.6.0 (2026-11-13)

- **Reiniciar marcas**: cada marca guarda una referencia (su distancia sobre la línea desde el primer extremo, tomada al asignarla). El botón «Reiniciar marcas» del grupo Spline (con marcas seleccionadas, solo esas) y «Reiniciar» en las propiedades del punto las devuelven a ella, en cualquier lugar donde esté el mecanismo, para empezar de cero otra lectura. «Tomar la actual» redefine la referencia. Los archivos anteriores toman como referencia la posición al abrirlos.
- **Spline**: tocar la curva y arrastrar la mueve entera (antes no hacía nada). Arrastrar uno de sus puntos sigue cambiando su forma.
- **Marca de referencia**: un punto puede ser marca de una línea (propiedades del punto, «Marca de referencia en»). El solver no la mueve y, tras cada cambio, se proyecta sobre su línea: se desliza por ella arrastrada por la línea y recuerda lo recorrido, algo que una cota de posición no puede dar. Se dibuja como una x. Sirve para rieles, ruedas y planímetros; las copias la reasignan a la copia de su línea y si se borra la línea deja de ser marca. En el planímetro polar mide el área de un cuadrado con 2 a 4 % de error.

## v1.5.3 (2026-11-13)

- El texto de la magnitud de un vector queda **alineado con la línea** del vector por defecto.
- La **versión y su fecha** (`v1.5.3 2026-11-13`, en cursiva) se ven en la esquina inferior izquierda del dibujo, con el tamaño del texto de ayuda de abajo.
- Se quita el texto explicativo de las propiedades del vector (queda en la ayuda).
- **Propiedades del vector** (doble toque): «Magnitud» (valor o fórmula; escribirla fija la longitud), «Magnitud fija» (para volver a solo lectura) y «Nombre de la magnitud». Cambiar un nombre actualiza también las salidas `[=…]` de los textos.
- **Vector** (en el desplegable de Línea, tecla W): una línea con cabeza de flecha en el punto final y su magnitud como texto en el punto medio (inserción en el medio del lado superior, así queda centrada). La magnitud es una cota de solo lectura con nombre (D1...), usable en fórmulas y textos. Con una línea y uno de sus extremos (la cola) seleccionados, «Vector» la convierte; con un vector seleccionado, «Línea» lo convierte en línea. Se copian con su propio texto y magnitud, el borrado se lleva sus partes, y la flecha sale en SVG y DXF.
- **Salidas en textos**: `[=expresión]` en un texto muestra el valor de la expresión (`[=O1]`, `[=D1*D2]`, `[=A1/(2π)]`), con los nombres de las cotas y sus funciones. Se actualiza al cambiar el dibujo, y también en las exportaciones.

## v1.5.2 (2026-11-12)

- **Evolvente y otras salidas que leen una medida**: al resolver las fórmulas, los puntos que miden las cotas de solo lectura que ellas leen (las entradas) se dejan fijos. Antes, al fijar D1 = R·A1 el solver podía mover el punto tangente (que mide A1) en vez de alargar la cuerda, A1 cambiaba, la fórmula perseguía su propia cola y daba «D1 quedaría en -3.404». Si el dibujo necesita que la entrada se mueva (por ejemplo arrastrar la rueda por P), se reintenta sin fijarla. Con una comprobación de que la cota con fórmula se cumple de verdad.

## v1.5.1 (2026-11-12)

- **Arrastre con cotas que leen medidas, más robusto**: un salto grande del punto arrastrado se recorre en tramos cortos; si al girar otra cota el solver pierde el hilo, el punto arrastrado que ya llegó a su destino se deja fijo mientras se resuelve (así no se desliza), y si eso es imposible se vuelve al objetivo suave de siempre; si un cambio de golpe no se resuelve, se reintenta avanzando solo una fracción hacia el valor de las fórmulas.
- Ejemplo de la rueda que rueda sin deslizar gobernada por el punto de tangencia (diseño de Oscar): al arrastrar T, A1 = D1/r y P traza la cicloide en varias vueltas. Arrastrar P para gobernar era mal condicionado cerca del suelo.

## v1.5.0 (2026-11-12)

- **Cotas con nombre**: cada cota recibe un nombre automático por tipo (D distancia, A ángulo, R radio de arco, O diámetro de círculo; D1, A1...), visible en el árbol y en el diálogo de la cota (doble toque), donde se puede cambiar. Los dibujos viejos se numeran al abrirlos.
- **Fórmulas entre cotas**: el nombre de una cota se puede usar en la fórmula de otra (`D1*sin(3π/4)`, `D1/2+1`). Al cambiar una cota se recalculan en orden las que dependen de ella y se resuelve la geometría; ciclos, valores imposibles o referencias inexistentes se rechazan sin dejar cambios a medias. Un ángulo entra en la fórmula como radianes; las cotas de solo lectura no se pueden usar.
- Si se borra una cota de la que dependía otra, esa conserva su valor y pierde la fórmula (con aviso).
- **Ángulos sin límite**: las cotas angulares ya no se quedan entre 0° y 180°: 250° es un arco reflejo, 400° es una vuelta y 40°, y una cota angular de solo lectura sigue a la geometría sin saltar de 180° a 0° (mide siempre el equivalente más cercano al último valor). Se mide en el sentido en que se creó la cota; los dibujos viejos se actualizan cuando se edita o se mueve la cota a otro sector. En fórmulas el ángulo entra en radianes, también más allá de 2π. Con esto la rueda que rueda da varias vueltas y traza la cicloide completa.
- **Color de los puntos**: propiedad nueva en la ventana de propiedades de un punto (doble toque); solo se ve en pantalla.
- **Cotas de solo lectura en fórmulas**: una cota conductora puede leer una medida de la geometría. Se resuelve y recalcula en vueltas hasta que concuerden (secante, con repetición amortiguada de respaldo), al editar, crear y mientras se arrastra; si no se estabiliza se deshace y se avisa. Permite, por ejemplo, la rueda que rueda sin deslizar (D = r·A) y trazar la cicloide arrastrando un punto del borde.

## v1.4.2 (2026-11-12)

- **Lupa del dedo**: al tocar y sostener (unos 0,28 s sin mover) aparece un círculo con zoom 2x de lo que hay bajo el dedo, desplazado hacia arriba para no taparlo, con mira en el centro. Se desliza para afinar. Con «Dedo dibuja» activo funciona con cualquier herramienta; con «Dedo dibuja» apagado, en Selección: al soltar se selecciona lo que está bajo la mira.
- **Botón Capas** desacoplado de la barra: va en la esquina superior izquierda del dibujo, y cuando hay una capa actual su nombre aparece debajo.
- **Aro del cursor** (el circulito del lápiz o del ratón) también en Seleccionar, en la posición real del cursor.
- Con «Dedo dibuja» y Selección, sostener el dedo apunta con la lupa y al soltar selecciona; ya no arrastra ni arma un cuadro (el cuadro sigue saliendo al arrastrar de una vez desde un lugar vacío).
- **Botón Archivo** en la barra (entre el menú y la ayuda) con Nuevo, Guardar, Abrir, PNG, SVG, SVG para corte láser y DXF.
- **Botón Spline** ahora es un desplegable: Spline por puntos, Trazar punto, Borrar trayectoria, Trazado a spline, Cerrar o abrir y Equidistante. Trazado a spline y Equidistante piden el número de puntos o la distancia en una ventana.
- Se quitan del menú de herramientas las secciones «Spline y trazado» y «Archivo».
- **GitHub**: Archivo → Guardar en GitHub, Abrir de GitHub y Configurar GitHub. Guarda y abre los .json en un repositorio privado (API de contenidos, token de grano fino guardado solo en el navegador). Cada guardado es un commit; avisa antes de sobrescribir si el archivo cambió en GitHub desde la última vez que se abrió o guardó en ese dispositivo.
- **Safari/iPad**: se bloquea el zoom de la página por doble toque (touch-action en toda la interfaz) y por pellizco fuera del lienzo.

## v1.4.1 (2026-11-12)

- **Teléfono**: con el menú oculto, el lienzo ocupa todo el alto. Antes quedaba una franja vacía abajo (el 40% reservado al panel).

## v1.4.0 (2026-11-12)

- **Ventana de propiedades**: con doble toque sobre un punto, línea, círculo, arco, elipse, spline, texto o relleno se abre una ventana para cambiar su capa, color, tipo de línea, grosor, escala del patrón (texto: contenido, fuente, altura y ángulo; punto: X, Y y fijo), ver y quitar sus restricciones y cotas, y agregar las que se aplican a ese elemento solo. En una cota, el doble toque sigue editando su valor.
- **Capas**: botón Capas entre Pegar y Punto. Crear, renombrar, encender, apagar y borrar; por defecto no hay ninguna. Una capa nueva queda como capa actual y lo que se dibuja va en ella. Al apagarla se ocultan sus elementos, puntos, restricciones y cotas (no se seleccionan, no cortan al recortar o extender y no se exportan). Al borrarla, sus elementos pasan a «ninguna». Se guardan en el archivo .json.
- **Copiar y Pegar** en un solo botón desplegable. Tras copiar, el botón pasa a mostrar Pegar.

## v1.3.1 (2026-11-11)

- **Ayuda**: el atajo D de Acotar y la lista de límites conocidos quedan al día (ya se recortan y extienden elipses y splines).

## v1.3.0 (2026-11-11)

- **Herramienta Acotar** (tecla D) después de Texto, en lugar del botón de Intersección: elige sola la cota según la selección. 2 puntos o punto y línea: distancia; 2 líneas paralelas: distancia; 2 líneas no paralelas: ángulo; un arco: radio; un círculo: diámetro; arco o círculo con otro elemento: distancia hasta el centro. Si ya había selección, acota esa; si no, se toca elemento por elemento.
- **Distancia al centro** de un arco o círculo (desde un punto, una línea, otro arco o círculo, o una elipse), también desde el botón Distancia del panel.
- La intersección sigue disponible en el panel y con la tecla I.

## v1.2.1 (2026-11-11)

- **Cota de distancia entre 2 líneas paralelas** (se seleccionan las dos y se pulsa Distancia): acota la distancia perpendicular y agrega la restricción Paralela si no la tenían (salvo en cotas de referencia). Si no son paralelas (más de 1°) avisa.
- **Cotas**: un toque las selecciona (para borrarlas, por ejemplo), arrastrar las reposiciona y el doble toque edita su valor. Antes un toque abría directamente la edición.

## v1.2.0 (2026-11-11)

- **Enganche al punto medio de las líneas** al dibujar (marca M): el punto nuevo queda con una restricción oculta de punto medio. No se ofrece en líneas muy cortas en pantalla.

## v1.1.1 (2026-11-11)

- **Coincidente entre puntos lejanos**: si de golpe el solver pierde el hilo (pasaba con arcos tangentes y un punto a más de una unidad), ahora reintenta acercando los puntos poco a poco y pone la restricción al final. Antes decía «No se pudo» aunque el caso tenía solución.

## v1.1.0 (2026-11-11)

- **Elipse parcial** (desplegable de Elipse): arco elíptico definido con el centro, el primer eje y el segundo eje, y arrastrando sobre la elipse de referencia para marcar el tramo (en el sentido del movimiento). Sus extremos son puntos que se deslizan sobre la elipse.
- **Recortar elipses y splines**: la elipse queda como arco elíptico (o se parte en dos que comparten centro y ejes); el spline queda en trozos que conservan la forma con puntos extra tomados de la curva original.
- **Extender** líneas y arcos hasta elipses, arcos elípticos y splines.
- **Coincidente con elipses** (punto sobre elipse) y, con una elipse o spline, el extremo más cercano de las líneas o arcos seleccionados. Al dibujar, los puntos se enganchan también a las elipses.
- **Tangente con elipses**: línea, círculo, arco u otra elipse.
- Las elipses con relaciones y los arcos elípticos se resuelven como elipses nativas del solver.

## v1.0.6 (2026-11-11)

- **Círculos y arcos constructivos**: herramientas nuevas en los desplegables de Círculo y Arco (círculo constructivo; arco constructivo por centro y extremos y por 3 puntos) y conversión de cualquier elemento con el tipo «Constructiva» del panel de Estilo. Color y grosor de la línea constructiva; el círculo se ve en «traza y punto» y los arcos llevan un punto en cada extremo.
- **Arcos en sentido horario o antihorario** según el movimiento del cursor (o del arrastre) alrededor del centro; con un toque directo se crea el arco corto. La vista previa indica el sentido.

## v1.0.5 (2026-11-11)

- **Línea de punto medio** (desplegable de Línea, tecla M): el punto inicial es el punto medio y la línea crece igual hacia ambos lados al elegir un extremo (toques o arrastre). Con bloqueo suave y restricción de punto medio.
- **Restricción concéntrica** entre círculos y arcos (los centros coinciden), numerada (◎1...) y en el árbol de elementos.
- Los puntos de la línea constructiva se dibujan como los del tipo «traza y punto».

## v1.0.4 (2026-11-11)

- **Botones desplegables** (esquina marcada, tocar de nuevo o mantener presionado): Seleccionar (con **Filtrar**), Línea (con **línea constructiva**), Círculo (con **círculo perimetral** por 3 puntos), Arco (por centro y por 3 puntos) y Rectángulo (por diagonal y de centro). Cada grupo recuerda la última herramienta usada.
- **Filtrar** la selección por entidades y por tipo de línea (tocar y cuadro de selección), con indicador en el botón.
- **Copiar y Pegar**: el centro del cuadro de lo copiado queda en el punto elegido; conserva restricciones y rellenos internos y sobrevive a borrar el original.
- **Línea constructiva**: #C3C3C3, grosor fino, con un punto (el de «traza y punto») en cada extremo y trazo continuo en medio; por defecto no sale en el SVG de corte láser.
- **Rectángulos** (diagonal y de centro) con restricciones H/V, y **polígono regular** inscrito/circunscrito con número de lados y orientación por el radio (con bloqueo suave).
- **Fuentes de texto**: selector al crear y en el panel; se aplican en el lienzo y en el SVG.
- **Extensión sucesiva corregida**: el extremo se desplaza al siguiente cruce en vez de dejar puntos nuevos en los anteriores.

## v1.0.3 (2026-11-11)

- **Restricciones numeradas** por tipo (H1, V2, ⟂1, ∥1, =1, ●1, T1...). Las que involucran varios elementos comparten número y se rotulan junto a cada uno. El número no se reutiliza. Se muestran en el árbol de elementos, que lleva el lienzo hasta ellas.
- **Coincidente** unifica «Punto sobre»: 2 puntos coinciden; punto(s) y una línea, arco, círculo o spline quedan sobre el elemento. Se quita el botón «Punto sobre».
- **Restricciones automáticas del bloqueo suave** (verificado): horizontal, vertical, perpendicular, paralela y tangente, con los elementos involucrados.
- **Matrices lineal y circular y copia espejo con copias vinculadas** al original (distancia y dirección, igual distancia al centro y ángulo, simetría, igual radio), activables y con **cotas opcionales**.
- **Herramienta de elipse** (O): centro, primer eje y segundo eje, con toques o arrastrando. Se selecciona, copia, exporta (PNG, SVG, DXF, SVG CUT) y aparece en el árbol.
- **Recorte corregido**: solo quita el tramo bajo el cursor entre los dos cruces más cercanos; ya no divide el resto del elemento en los demás cruces.

## v1.0.2 (2026-11-10)

- El bloqueo suave vuelve a horizontal, vertical y 45° por defecto (cada 45°). El paso sigue siendo configurable en Vista ("Bloqueo suave cada (°)"), por ejemplo 15.
- Se conservan las mejoras de v1.0.1: el bloqueo se mantiene cerca de otros elementos, paralela, perpendicular y tangente, final en el cruce e imán a intersecciones.

## v1.0.1 (2026-11-10)

**Bloqueo suave rehecho al dibujar líneas**
- Bloqueos con paso configurable (15° en esta versión), con la etiqueta del ángulo.
- Corrección: el bloqueo ya no se pierde cuando el final de la línea se acerca a otra línea, un arco o un círculo.
- Cerca de una línea existente: paralela o perpendicular a ella; la perpendicular termina en el pie sobre esa línea.
- Cerca de un arco o círculo: tangente, con el extremo sobre la curva.
- Si la dirección bloqueada cruza un elemento cerca del cursor, la línea termina en ese cruce.
- Imán a intersecciones: el inicio o el final de la línea se toman en la intersección de dos elementos (líneas, arcos, círculos, splines) cuando el cursor se queda cerca; el tiempo (ms) es configurable en Vista. Un toque o el inicio de un arrastre la toman al instante.

## v1.0.0 (2026-11-10)

Primera versión numerada. Resume lo construido desde el prototipo del 2026-11-09.

**Dibujo y solver**
- Editor 2D paramétrico (PWA para iPad) con solver de restricciones PlaneGCS (FreeCAD, WebAssembly).
- Puntos, líneas, círculos, arcos (centro y extremos, 3 puntos), splines y textos.
- Restricciones: horizontal, vertical, paralela, perpendicular, coincidente, colineal, punto medio, igual, tangente, punto sobre, fijar.
- Intersección de dos elementos; tipos de línea de mecánica y propios, colores, grosores y rellenos.
- Bloqueo suave al dibujar líneas (H, V, 45°, paralela, perpendicular, tangente).

**Cotas**
- Distancia, ángulo (siempre positivo, el sector lo decide dónde se coloca), radio y diámetro (⌀) según ANSI.
- Fórmulas (`3π/4`, `10*sin(30)`...), grados o radianes, cotas de referencia.

**Splines**
- B-splines cúbicos nativos de PlaneGCS, abiertos y cerrados (periódicos).
- Punto sobre spline, intersecciones y tangencias con líneas, círculos y arcos, resueltos de forma exacta.
- Trazado de trayectorias y conversión a spline (primera vuelta), equidistante.

**Edición**
- Recortar (arrastrando), extender, dividir (en puntos o en n partes iguales).
- Matriz lineal (1 o 2 direcciones), matriz circular (con omitir instancias) y copia espejo.
- Selección con cuadro: de izquierda a derecha toma lo que queda dentro; de derecha a izquierda, lo que toca.

**Interfaz y archivos**
- Árbol de elementos con relaciones y propiedades; menú; ayuda con la documentación y los créditos del solver.
- Guardar y abrir .json; exportar PNG, SVG, DXF y SVG CUT (corte láser a escala real con clases de línea: corte, marcado u omitir).
