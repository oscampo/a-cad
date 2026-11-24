# Guías por tarea

Cada guía resuelve una tarea concreta, paso a paso, con un dibujo de ejemplo que se abre en la app. Para el detalle de cada herramienta, sigue los enlaces al capítulo que la explica.

Al abrir un ejemplo, la app **enciende en [Vista](10-estilo-capas-y-vista.md#vista)** lo que ese dibujo necesita mostrar (cotas, restricciones, textos o puntos) y te avisa. Si más adelante apagas una de esas opciones, las cotas, las etiquetas o los textos de las guías dejarán de verse: vuelve a encenderla en Vista.

[← 1. Empezar](01-empezar.md) · [Índice](README.md) · [2. Dibujar →](02-dibujar.md)

---

## Dibujar una pieza que se adapta a sus medidas

Una placa con un agujero centrado: al cambiar el largo o el alto, la placa se ajusta y el agujero se mantiene en el centro con un diámetro proporcional.

**Ejemplo:** [Abrir el ejemplo](../ejemplos/guias/pieza-parametrica.json).

### Pasos

1. Dibuja la placa con ![Rectángulo](icons/rect.svg) [Rectángulo](02-dibujar.md#rectángulo-b): toca dos esquinas opuestas. Queda con restricciones horizontal y vertical.
2. Selecciona una esquina y toca ![Fijar / soltar](icons/lock.svg) [Fijar / soltar](05-restricciones.md#fijar--soltar): así la placa no se desplaza al cambiar sus medidas.
3. Dibuja el agujero con ![Círculo](icons/circle.svg) [Círculo](02-dibujar.md#círculo-c), y una diagonal con ![Línea constructiva](icons/cline.svg) [Línea constructiva](02-dibujar.md#línea-constructiva-k) entre esquinas opuestas.
4. Selecciona el centro del círculo y la diagonal, y aplica ![Punto medio](icons/con-mid.svg) [Punto medio](05-restricciones.md#punto-medio): el agujero queda en el centro de la placa.
5. Con ![Acotar](icons/dim-dist.svg) [Acotar (D)](06-cotas.md#acotar-d), toca los dos extremos de un lado para acotar el largo, y los de otro para el alto. Toca el círculo para acotar su diámetro.
6. Toca dos veces la cota del diámetro y escribe una fórmula con otra cota, por ejemplo `D2/3` (el diámetro es un tercio del alto). Ver [Fórmulas](06-cotas.md#fórmulas).

### Qué verás

Si no ves las cotas (D1, D2, O1) o las etiquetas de las restricciones, enciende **Cotas** y **Restricciones** en [Vista](10-estilo-capas-y-vista.md#vista). Toca dos veces la cota del largo o la del alto y cambia su valor: la placa se ajusta, el agujero sigue en el centro y su diámetro se recalcula.

### Para seguir

- Qué hace cada tipo de cota: [Cotas](06-cotas.md).
- Todas las relaciones geométricas: [Restricciones](05-restricciones.md).

## Calcular con textos y gobernar una cota

Un texto puede guardar un valor y hacer cuentas, y una cota puede leer ese valor: cambias un número y el dibujo se recalcula.

**Ejemplo:** [Abrir el ejemplo](../ejemplos/guias/calculo-y-cotas.json).

### Pasos

1. Con ![Texto](icons/text.svg) [Texto (T)](07-texto-y-calculo.md#escribir-un-texto-t), toca arriba del dibujo y escribe `ancho:120`; Enter. Lo que escribes es una ecuación: `ancho:120` define la variable.
2. En la entrada de abajo escribe `alto:ancho/2` y Enter, y después `area:ancho*alto=` y Enter: el `=` al final muestra el resultado (7200).
3. Dibuja un rectángulo y acota un lado horizontal y uno vertical (ver [Acotar (D)](06-cotas.md#acotar-d)).
4. Toca dos veces cada cota y, en lugar de un número, escribe `ancho` en la primera y `alto` en la segunda.
5. Para cambiar el dibujo, toca el texto `ancho:120`, escribe otro valor y Enter.

### Qué verás

Todo lo que depende de `ancho` se recalcula: el alto, el área y las dos cotas del rectángulo.

### Importante: el orden de lectura

Una variable vale desde el lugar de la página donde se define, leyendo de arriba a abajo. Por eso los textos que definen variables van **arriba** de lo que las usa. Ver [Orden de lectura](07-texto-y-calculo.md#orden-de-lectura).

### Para seguir

- Todo lo que se puede escribir en un texto: [Texto y cálculo](07-texto-y-calculo.md).
- Las funciones disponibles: [Funciones y operadores](funciones.md).

## Resolver ecuaciones

Un sistema de ecuaciones se resuelve en un texto, sin salir del dibujo.

**Ejemplo:** [Abrir el ejemplo](../ejemplos/guias/ecuaciones.json).

### Pasos

1. Con ![Texto](icons/text.svg) Texto (T), define cada incógnita con un valor inicial: `x:1` y `y:1`.
2. Escribe `solve(x+y==10; x-y==2; x; y)=` y Enter. Las ecuaciones llevan `==`; los nombres sueltos son las incógnitas.
3. El texto muestra la solución: `x=6; y=4`.
4. Prueba un sistema que no es lineal: `a:2`, `b:2` y `solve(a*b==12; a+b==7; a; b)=`.

### Qué verás

El segundo sistema tiene dos soluciones (3 y 4, o 4 y 3): la que aparece depende del valor inicial que le diste a `a` y `b`.

### Para seguir

- Todas las formas de `solve`: [Ecuaciones](funciones.md#ecuaciones).

## Dibujar un polígono de fuerzas con vectores

Tres fuerzas puestas punta con cola y su resultante: al mover un punto, las magnitudes se actualizan.

**Ejemplo:** [Abrir el ejemplo](../ejemplos/guias/poligono-de-fuerzas.json).

### Pasos

1. Dibuja con ![Línea](icons/line.svg) Línea (L) tres líneas encadenadas (el final de una es el inicio de la siguiente) y una cuarta del primer punto al último.
2. Convierte cada línea en vector: selecciona la línea y **uno de sus extremos**, que será la **cabeza** (el extremo hacia donde apunta la fuerza), y elige ![Vector](icons/vector.svg) [Vector (W)](02-dibujar.md#vector-w) en el desplegable de Línea. Es el mismo gesto de la [línea indicativa y el actuador lineal](02-dibujar.md#cabeza-y-cola-un-solo-gesto).
3. Cada vector muestra su magnitud como texto en el punto medio. El cuarto, de la cola del primero a la cabeza del último, es la resultante.
4. Arrastra un punto: las magnitudes se actualizan solas.

### Qué verás

Las magnitudes (D1, D2…) son cotas de referencia con nombre, así que puedes usarlas en fórmulas y en textos.

### Para seguir

- Unidad y escala de un vector (por ejemplo, kN): [Vector (W)](02-dibujar.md#vector-w).

## Mover un mecanismo y graficar su movimiento

Una manivela que gira con un actuador, y una gráfica de la altura y la posición horizontal de su extremo.

**Ejemplo:** [Abrir el ejemplo](../ejemplos/guias/manivela-y-grafica.json).

### Pasos

1. Dibuja una línea desde un punto (O) hasta otro (A), fija O con ![Fijar / soltar](icons/lock.svg) [Fijar / soltar](05-restricciones.md#fijar--soltar) y acota la longitud (ver [Acotar (D)](06-cotas.md#acotar-d)).
2. Con ![Actuador rotacional](icons/act-r.svg) [Actuador MR](09-simulaciones-graficas.md#actuadores), toca la línea y su extremo O, que será el centro de giro.
3. En su ventana escribe el desplazamiento respecto al tiempo: `90*t` (grados; un cuarto de vuelta por segundo).
4. Con ![Gráfica](icons/graph.svg) [Gráficas](09-simulaciones-graficas.md#gráficas), toca donde va la esquina de la gráfica y escribe una relación por línea: `p2.y vs t` y `p2.x vs t` (`p2` es el nombre de A, que ves en el [árbol de elementos](10-estilo-capas-y-vista.md#árbol-de-elementos)).
5. Toca ![Simulación](icons/play.svg) Simulación y ▶ para reproducir.

### Qué verás

A da vueltas alrededor de O, y la gráfica traza dos ondas desfasadas: altura y posición horizontal contra el tiempo. Al detener, el dibujo vuelve a como estaba.

### Para seguir

- Rodadura, engranajes y cremallera: [Simulaciones gráficas](09-simulaciones-graficas.md).
- Una rueda que rueda sin deslizar: [Abrir el ejemplo de la cicloide](../ejemplos/cicloide-rodando.json).

## Preparar una pieza para corte láser

Las líneas de corte y las de marcado (un pliegue, por ejemplo) se separan por color y tipo de línea.

**Ejemplo:** [Abrir el ejemplo](../ejemplos/guias/corte-laser.json).

### Pasos

1. Dibuja la pieza: el contorno, los agujeros y la línea de pliegue.
2. Selecciona las líneas de corte y dales un estilo (por ejemplo, rojo y continua) en el panel [Estilo](10-estilo-capas-y-vista.md#estilo).
3. Selecciona la línea de pliegue y dale otro estilo (por ejemplo, azul y discontinua).
4. Elige ![SVG para corte láser](icons/svg.svg) **SVG para corte láser** en el [botón Archivo](11-archivo-y-exportacion.md#botón-archivo).
5. Cada clase de línea (tipo, color y grosor) se manda a **Corte**, **Marcado** u **Omitir**: asigna Corte a las rojas y Marcado a la azul.

### Qué verás

Un SVG a escala real en milímetros, con dos grupos, «corte» y «marcado». No salen cotas, textos, puntos ni rellenos. Más detalle en [SVG CUT](11-archivo-y-exportacion.md#svg-cut).

## Hacer una consola de texto

Un texto que muestra varias líneas calculadas, como el estado de un juego o un panel de datos.

**Ejemplo:** [Abrir el ejemplo](../ejemplos/guias/consola-de-texto.json).

### Pasos

1. Define las variables que quieres mostrar, cada una en su texto: `$$n:3$$`.
2. En otro texto, define un vector de cadenas: `$$consola:["ESTADO", "Vidas: "+num2str(n), "Puntos: "+num2str(n*100)]$$`. Cada cadena será una línea (ver [Funciones y operadores](funciones.md)).
3. Crea un tercer texto que sea solo `$$consola=$$`.
4. Dale doble toque, activa *Mostrar solo el resultado* y elige una fuente monoespaciada y los colores de fuente y de fondo (ver [Fuente y formato del texto](07-texto-y-calculo.md#fuente-y-formato-del-texto)).

### Qué verás

Tres líneas de texto normal: «ESTADO», «Vidas: 3» y «Puntos: 300», sobre el fondo que elegiste. Cambia `n` y la consola se actualiza sola.

### Para seguir

- Un vector de cadenas que empieza y termina con tres comillas invertidas se dibuja como bloque de código.
- Para que la consola reaccione a lo que escribes, ver [Datos entre dibujos](funciones.md#datos-entre-dibujos).

## Recordar un valor entre cambios y reproducir un sonido

Un contador que no se pierde al cerrar el dibujo, y un sonido que suena cuando algo cambia.

**Ejemplo:** [Abrir el ejemplo](../ejemplos/guias/contador-y-sonido.json). Al abrirlo escribe el dato `contador` en este dispositivo.

### Pasos

1. Escribe `$$c:rfile(contador; 0)$$`: lee el dato «contador», o vale 0 si todavía no existe.
2. Escribe `$$wfile(c+1; contador)=$$`: guarda ese valor más 1. El resultado es 1 y solo importa que se ejecute.
3. Escribe `$$c=$$` para ver el valor que se leyó.
4. Abre ![Datos](icons/folder-open.svg) **Archivo → Datos…**: ya aparece `contador` (ver [Datos del dispositivo](11-archivo-y-exportacion.md#datos-del-dispositivo)).
5. Con **Importar…** agrega un audio y llámalo `ding`. Escribe `$$play("ding")=$$` para reproducirlo (ver [Sonidos](funciones.md#sonidos)).

### Qué verás

`c` sube de uno en uno cada vez que confirmas un cambio en el dibujo, y el dato sobrevive aunque cierres la app. Arrastrar o simular no escribe el dato: solo los cambios confirmados.

### Para seguir

- Los datos son comunes a todos los dibujos del dispositivo: dos dibujos pueden compartir un valor.
- Un nombre armado con una variable, como `play(n)`, no viaja con el dibujo.

## Repetir un agujero alrededor de un centro

Seis agujeros iguales en una brida, que cambian todos juntos al modificar uno.

**Ejemplo:** [Abrir el ejemplo](../ejemplos/guias/patron-circular.json).

### Pasos

1. Dibuja con ![Círculo](icons/circle.svg) el contorno de la brida y fija su centro O con ![Fijar / soltar](icons/lock.svg) [Fijar / soltar](05-restricciones.md#fijar--soltar).
2. Dibuja un círculo pequeño (el agujero) y acota su distancia a O y su radio (ver [Acotar (D)](06-cotas.md#acotar-d)).
3. Selecciona el agujero y elige ![Matriz circular](icons/array-circ.svg) [Matriz circular](04-dividir-copiar-y-repetir.md#matriz-circular).
4. Toca O como **Centro**, deja **Ángulo total** en 360° y escribe **Número total** 6.
5. Deja activas las [copias vinculadas](04-dividir-copiar-y-repetir.md#copias-vinculadas).

### Qué verás

Seis agujeros a 60° uno del otro. Cambia la cota de distancia o el radio de uno y los seis lo siguen.

### Para seguir

- Para una fila en vez de un círculo: [Matriz lineal](04-dividir-copiar-y-repetir.md#matriz-lineal).
- Para quitar la relación entre copias: [Sin vincular](04-dividir-copiar-y-repetir.md#sin-vincular).

## Redondear las esquinas de una placa

Una placa rectangular con las cuatro esquinas redondeadas, cuyo radio se gobierna desde una sola cota.

**Ejemplo:** [Abrir el ejemplo](../ejemplos/guias/placa-redondeada.json).

### Pasos

1. Dibuja la placa con ![Rectángulo](icons/rect.svg) y acota su largo y su alto (ver [Acotar (D)](06-cotas.md#acotar-d)). Fija una esquina para que no se mueva.
2. Selecciona las cuatro esquinas (sus puntos) y elige ![Redondeo](icons/fillet.svg) [Redondeo (F)](03-seleccionar-y-editar.md#redondeo-f-y-chaflán).
3. Escribe el radio, por ejemplo `8`. Cada esquina queda con un arco tangente y su propia cota de radio (R1 a R4).
4. Para que las cuatro valgan lo mismo, da doble toque a R2, R3 y R4 y escribe la fórmula `R1'mm` (con la unidad, sus etiquetas dicen «R8 mm»).

### Qué verás

Cuatro arcos de radio 8. Cambia R1 y las cuatro esquinas lo siguen; cambia el largo o el alto y la placa sigue redondeada.

### Para seguir

- Si el radio no cabe en la esquina, la app avisa y te dice el máximo.
- Para unir con una línea en vez de un arco, usa el chaflán (mismo botón, [Redondeo y Chaflán](03-seleccionar-y-editar.md#redondeo-f-y-chaflán)).
- Un círculo o una elipse completa no se redondean.

## Dibujar una curva suave por puntos

Un spline que pasa por puntos reales del dibujo y que se deforma al arrastrarlos.

**Ejemplo:** [Abrir el ejemplo](../ejemplos/guias/curva-suave.json).

### Pasos

1. Elige ![Spline](icons/spline.svg) [Spline (S)](02-dibujar.md#spline-s) y toca los puntos por donde debe pasar la curva.
2. Para terminar, toca otra vez el último punto (o Esc). Tocar el primero la cierra.
3. Fija los dos extremos con ![Fijar / soltar](icons/lock.svg) [Fijar / soltar](05-restricciones.md#fijar--soltar) si quieres que no se muevan.
4. Arrastra un punto del medio: la curva se deforma y el resto del dibujo sigue.
5. Con el spline seleccionado, abre el desplegable de Spline y elige **Cerrar / abrir** (ver [Cerrar / abrir](08-splines-y-trazados.md#cerrar--abrir)).

### Qué verás

Una curva suave que pasa exactamente por cada punto. Abierta, no se curva en los extremos; cerrada, es suave en toda la vuelta, sin esquina en la unión.

### Para seguir

- Una curva paralela a distancia fija (el rodillo de una leva): [Equidistante](08-splines-y-trazados.md#equidistante).
- La trayectoria de un punto que se mueve, convertida en spline: [Trazar punto](08-splines-y-trazados.md#trazar-punto).

## Acotar en pulgadas y ver el dibujo más pequeño

Cotas que dicen una unidad (pulgadas) mientras el dibujo mide lo real, y una cota que se dibuja a escala.

**Ejemplo:** [Abrir el ejemplo](../ejemplos/guias/cotas-en-pulgadas.json).

### Pasos

1. Dibuja la placa y fija una esquina. Da doble toque a la cota del largo y escribe el valor con su unidad: `4'in` (el apóstrofo une el valor y la unidad). Haz lo mismo con el alto: `2'in`.
2. Dibuja una línea larga y acótala con `126'in`. A tamaño real (3200,4 mm) no cabe en una hoja carta, que deja 165,9 mm útiles con márgenes de 25 mm.
3. Edita esa cota y añade la escala entre corchetes: `126'in[*0.05]` (ver [Cota a escala](06-cotas.md#cota-a-escala)).
4. Para cambiar solo la unidad con la que se lee una cota, usa **Unidad de la cota** en su ventana (ver [Cota con unidad](06-cotas.md#cota-con-unidad)).

### Qué verás

La placa dice «4 in» y «2 in», y el dibujo (en mm) mide 101,6 por 50,8. La línea larga se dibuja a 1:20: mide 160,02, cabe en la hoja y su cota sigue diciendo «126 in», <u>subrayada</u> para avisar que no está a escala real.

### Para seguir

- Una cota sin unidad entra a las fórmulas como número; para sumarla a una con unidad, dale la unidad en la fórmula (`D1'mm+D2`). Ver [Cotas con unidad en fórmulas](06-cotas.md#cotas-con-unidad-en-fórmulas).
- En una cota de solo lectura, la unidad solo cambia la etiqueta.

## Dibujar fuerzas a escala

Dos fuerzas en kN dibujadas con una escala de representación que se cambia en un solo lugar.

**Ejemplo:** [Abrir el ejemplo](../ejemplos/guias/escala-de-fuerzas.json).

### Pasos

1. En un texto, define la escala como variable: `$$eF:1'mm/kN$$` (cada kN se dibuja con 1 mm).
2. Dibuja una línea horizontal y acótala con la fuerza y la escala: `30'kN[*eF]`.
3. Haz lo mismo con otra línea: `45'kN[*eF]`.
4. Cambia `eF` a `2'mm/kN`: las dos líneas se alargan al doble.

### Qué verás

Las cotas dicen «30 kN» y «45 kN», y las líneas miden 30 y 45 mm. A diferencia de una escala de reducción, la cota **no** se subraya: está a la escala que declaraste.

### Para seguir

- `eF` se lee en el [orden de lectura](07-texto-y-calculo.md#orden-de-lectura): si la redefines más abajo, las cotas que están antes siguen usando la anterior.
- Sin escala, `30'kN` mediría 30000 (en el SI) y la app lo avisa con ⚠. Ver [Escala con unidades](06-cotas.md#escala-con-unidades).
- Los vectores usan la misma escala: [Polígono de fuerzas](#dibujar-un-polígono-de-fuerzas-con-vectores).

## Crear una biblioteca de funciones y usarla en otro dibujo

Funciones que defines una vez y reutilizas en cualquier dibujo, con un prefijo corto (el alias).

**Ejemplos:** [la biblioteca](../ejemplos/guias/biblioteca-geometria.json) y [un dibujo que la usa](../ejemplos/guias/usar-biblioteca.json). El segundo lleva una copia ya insertada; no viene de GitHub.

### Pasos

1. En un dibujo nuevo, define tus funciones en textos: `$$AreaCirculo(Dext):pi*Dext^2/4$$` y `$$AreaAnillo(Dext; Dint):AreaCirculo(Dext)-AreaCirculo(Dint)$$`. Puedes dejar una prueba, `$$ejemplo:AreaAnillo(50; 30)=$$`: los ejemplos no viajan con la biblioteca.
2. En **Configuración → Biblioteca** marca «Es una biblioteca» y llena la ficha: nombre, **alias** (`GEO`), autor y descripción (ver [Crear una biblioteca](09-simulaciones-graficas.md#crear-una-biblioteca)).
3. Revisa lo **público**: por defecto, las funciones y scripts. Lo que esas necesitan viaja también, como privado.
4. Elige **Guardar en GitHub**: queda en la carpeta `MyLibrary/` con una versión que sube sola (v1, v2…). Antes tienes que [configurar GitHub](11-archivo-y-exportacion.md#github).
5. En otro dibujo, elige **[Archivo](11-archivo-y-exportacion.md#botón-archivo) → Insertar biblioteca…**, escógela y confirma el alias.
6. Usa sus nombres con el alias: `$$GEO.AreaAnillo(50; 30)=$$`.

### Qué verás

Un bloque `▸ Geometría básica (GEO) · v1` con una copia de las definiciones, que funciona sin red. El prefijo `GEO.` se dibuja en gris y el cálculo da 1256,6 para el anillo y 78,54 para el círculo de diámetro 10.

### Para seguir

- Si cambias la biblioteca y la guardas de nuevo, los dibujos que la usan muestran `⟳ v2`; en las propiedades del bloque, «Actualizar» trae la versión nueva y antes avisa qué nombres cambian (ver [Actualizar](09-simulaciones-graficas.md#actualizar)).
- Una biblioteca no debería depender de las cotas ni de las medidas de su dibujo: la revisión antes de guardar te lo avisa.
- Para escribir el nombre sin acordarte de él, usa las sugerencias `ƒx` ([Texto y cálculo](07-texto-y-calculo.md)).

## Guardar, abrir y compartir tus dibujos

Tus dibujos se guardan como archivos `.json`, y puedes llevarlos a otro dispositivo con GitHub.

### Pasos

1. Abre el ![Archivo](icons/save.svg) [botón Archivo](11-archivo-y-exportacion.md#botón-archivo) y elige **Guardar (.json)**: te pide un nombre y descarga el archivo.
2. Para abrirlo, elige **Abrir…** y selecciona el archivo.
3. Para tenerlo en otro dispositivo y con historial, configura [GitHub](11-archivo-y-exportacion.md#github) una vez (repositorio, rama, carpeta y un token) y usa **Guardar en GitHub** y **Abrir de GitHub**.
4. Los datos que guardan `wfile` y `rfile`, y los audios, están en [Datos del dispositivo](11-archivo-y-exportacion.md#datos-del-dispositivo).

### Qué verás

La app también recuerda el último dibujo en este navegador, pero ese guardado es solo local: guarda un archivo para tener un respaldo.

---

[← 1. Empezar](01-empezar.md) · [Índice](README.md) · [2. Dibujar →](02-dibujar.md)
