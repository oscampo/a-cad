# 9. Simulaciones gráficas

Mover el dibujo en el tiempo: actuadores rotacionales y lineales, el reproductor de la simulación, gráficas de medidas, engranajes, cremallera y relaciones que solo valen mientras los elementos se tocan.

[← 8. Splines y trazados (levas y trayectorias)](08-splines-y-trazados.md) · [Índice](README.md) · [10. Estilo, capas y vista →](10-estilo-capas-y-vista.md)

---

## Actuadores

Los **Actuadores** (grupo después de [Redondeo](03-seleccionar-y-editar.md#redondeo-f-y-chaflán)) mueven el dibujo según el tiempo `t`: ![Actuador rotacional](icons/act-r.svg) **MR** (rotacional) y ![Actuador lineal](icons/act-l.svg) **ML** (lineal). La **Simulación** ![Simulación](icons/play.svg) los reproduce.

### MR (rotacional)

Se define eligiendo la línea y su extremo que será el centro de giro.

- Tócalos en cualquier orden, o selecciónalos antes de elegir la herramienta.
- Gira en sentido antihorario por defecto, u horario; el sentido se ve en la flecha circular.

### ML (lineal)

Se define con la cola y la cabeza: toca los dos puntos, o selecciónalos antes (el primero es la cola).

### Valor del movimiento

A cada actuador se le da un **desplazamiento** o una **velocidad** respecto al tiempo `t`, de una de estas formas:

- Una expresión: `90*t`, `30*sin(2π*t)`.
- Una tabla «tiempo; valor».

### Editar y eliminar

Toca su etiqueta, o su nombre en el [árbol de elementos](10-estilo-capas-y-vista.md#árbol-de-elementos) (grupo «Actuadores»), para editarlos o eliminarlos. El [filtro de selección](03-seleccionar-y-editar.md#filtrar) puede apagar «Actuadores y gráficas».

### Simulación

**Simulación** abre la barra de tiempo: reproduce y mueve el dibujo resolviendo las restricciones. La línea del MR no puede estar fijada en horizontal o vertical, ni su longitud cambiar en el ML.

El reproductor tiene:

- Paso atrás y paso adelante.
- Repetición en ciclo (↻).
- Vaivén (⇄).
- Velocidad de 0.5x a 2.0x.

Al detener, el dibujo vuelve a como estaba.

## Gráficas

La herramienta **Gráficas** ![Gráfica](icons/graph.svg) (grupo de actuadores) dibuja relaciones entre variables. Toca donde va la esquina inferior izquierda y escribe las relaciones.

### Relaciones

Se escriben «variable1 vs variable2», una por línea. La primera va en el eje vertical.

- Con actuadores y tiempo: `MR1 vs t`, `MR1.v vs t`, `D1 vs t`.
- Con dos vectores del mismo tamaño, por su nombre o con una expresión (con `x:0..1;10` y `f(x):x.^2`): `f(x) vs x`, `x.^2 vs x`, `sin(x) vs x`.

**Variables.** Se pueden usar:

- `t`.
- Los actuadores (`MR1`, `ML1`); su velocidad con `.v`, por ejemplo `ML1.v`.
- Las cotas con nombre.
- Las variables de los textos.
- Los vectores.

**Operaciones.** Cada lado admite operaciones y funciones con esas variables: `p1.x/p1.y vs t`, `ML1.d-p1.x vs t`.

**Orden de lectura.** La gráfica se lee en su lugar de la página, en el [orden de lectura](07-texto-y-calculo.md#orden-de-lectura) (de arriba a abajo y, en una fila, de izquierda a derecha, por su esquina superior izquierda), como una cota con fórmula. Ve las variables y funciones definidas **antes** de ella; lo que se define o redefine más abajo no la afecta.

**El tiempo.** El tiempo `t` lo define solo el reproductor de la simulación (su «hasta»): la gráfica ya no tiene tiempo final.

### La variable x

La **x** es propia de cada gráfica.

- Si el dibujo ya define `x` antes de la gráfica (un rango o un vector), se usan esos valores uno por uno.
- Si no, la gráfica usa un vector genérico de *Muestras* valores entre los límites de su eje **x1** (de −10 a 10 si no los pones), así `sin(x)/x vs x` se dibuja sin definir nada.

Se muestrea lo que se ve: con `x'cm` y el eje de 0 a 900 mm, la x va de 0 a 90 cm.

### Ejes y ventana

**Sin límites en x1 y con una x con unidades**, la gráfica se **enfoca sola**: la ventana va de 0 a la mayor de las medidas con esa magnitud que lee la relación, también dentro de sus funciones (con una viga de L = 900 mm, de 0 a 900 mm).

**Si no hay esas medidas** (una x sin unidades, o cortes escritos como números, `fsn(x, 0.5, 0)`), la ventana es el tramo donde la curva hace algo (saltos, quiebres o curvatura): fuera de él es constante o recta.

**Una curva que hace algo en todo el rango** (`sin(x)/x`, `x^2`) sigue de −10 a 10.

**Sin límites en y**, la ventana de y es la de lo que se ve en la de x.

### Controles de la gráfica

Con la gráfica seleccionada (un toque, o al arrastrarla) aparecen controles en sus lados; sin seleccionar se ve limpia, solo la gráfica. Son cuatro deslizadores elásticos:

- Arriba: paneo horizontal (⇆).
- A la derecha: paneo vertical (⇅).
- Abajo: zoom horizontal (↔).
- A la izquierda: zoom vertical (↕).

Mientras los mantienes desplazados del centro la ventana se mueve (hacia la derecha o hacia arriba, o al revés) o se acerca (derecha o arriba) o se aleja, más rápido cuanto más los desplazas. El paneo va lento cerca del centro, para afinar. Al soltarlos vuelven al centro.

El botón **⤢ Ajustar** de la esquina superior derecha pone todos los ejes en límites automáticos de un toque (la vista guardada no cambia).

Mover o acercar la ventana cambia los límites del eje (también en las propiedades de la gráfica) y una x genérica se vuelve a calcular dentro de ellos.

### Vista guardada

Un doble toque en un deslizador vuelve ese eje a la **vista guardada**.

- **Guardarla:** deja la gráfica en la posición y el acercamiento que quieres y toca el botón redondo de la esquina, entre los deslizadores de zoom (queda relleno y guarda los límites de x1 e y1). Después puedes mover y acercar libremente y el doble toque la recupera.
- **Borrarla:** un doble toque en ese botón borra la vista guardada.
- **Sin vista guardada,** el doble toque en un deslizador vuelve el eje a límites automáticos.

### Ejes secundarios

Al final de la línea, `@y2`, `@x2` o `@x2 y2` dibujan la relación en los ejes secundarios: x1 inferior, x2 superior, y1 izquierdo, y2 derecho.

### Estilo de cada relación

Va entre comillas al final de la relación, y combina:

- **Color:** `r g b c m y k w` o `#rrggbb`; `k` es el color del texto.
- **Línea:** `-` continua, `--` discontinua, `:` punteada, `-.` raya y punto.
- **Símbolo:** `o + * . x s d ^ v > < p h` (círculo, más, asterisco, punto, equis, cuadrado, rombo, triángulos, estrella y hexágono).

Ejemplos:

- `σ vs N "rx"`: una equis roja sin línea.
- `y vs x "k--d"`: negra discontinua con rombos.
- `Y vs X "o"`: solo círculos, una **nube de puntos**, para ver cómo se distribuyen datos (por ejemplo, de `randn`).

Con símbolo y sin línea no se dibuja la línea. Sin comillas, línea continua del color que le toca por orden. Una relación de un solo punto sin símbolo se marca con un círculo.

En las propiedades de la gráfica, debajo de las relaciones, cada una tiene sus listas de color, línea y símbolo, que escriben ese estilo.

### Propiedades

Toca una gráfica para seleccionarla (se resalta): arrástrala para moverla y arrastra sus bordes o esquinas para cambiar su tamaño.

Un doble toque abre sus [propiedades](03-seleccionar-y-editar.md#propiedades):

- Título.
- Relaciones.
- Muestras.
- Posición.
- Tamaño.
- Por cada eje: su nombre libre (por ejemplo `p12.x [cm]`, que sirve de documentación porque los ejes no muestran unidades), escala lineal o logarítmica, mínimo y máximo, y divisiones mayores y menores.

### Puntos con trayectoria

Los puntos con [«Trazar punto»](08-splines-y-trazados.md#trazar-punto) dibujan su trayectoria al correr la simulación y la conservan al detenerla.

## Engranaje

**Engranaje** (grupo Restricciones) liga el giro de dos engranajes con una razón de giro.

### Crear la relación

1. Posiciona primero los engranes a mano, sin que los dientes interfieran.
2. Selecciona 2 líneas, una rígida con cada engranaje (por ejemplo el radio de cada uno que parte del centro fijo).
3. Teclea la razón de giro y crea la relación.

La postura de ese momento es el punto de partida y de ahí en adelante el giro de ambos lo gobierna la razón.

### La razón de giro

- Es negativa si giran en sentido contrario.
- Admite fórmula, p. ej. `-17/34`.
- Con módulos iguales es −z1/z2, o la razón de los diámetros primitivos o de base, no la de los exteriores.

### Uso y condiciones

Arrastra cualquier punto de uno de los engranes y el otro gira con la razón, varias vueltas.

Condiciones: cada engranaje gira alrededor de un punto fijo (el extremo de la línea que coincide con él) y sus puntos están amarrados al centro, como los de una [matriz circular](04-dividir-copiar-y-repetir.md#matriz-circular).

No modela el contacto de los dientes. Si cambias `z` o `m`, vuelve a posicionar y a crear la relación.

## Cremallera

**Cremallera** ![Cremallera](icons/rack.svg) (rueda y cremallera, grupo Restricciones) liga el giro de una rueda con el avance de un punto.

### Crear la relación

Selecciona, en este orden:

1. La línea radial de la rueda.
2. La línea de la cremallera (o el suelo).
3. El punto que avanza.

Luego teclea la razón.

### La razón

Es cuánto avanza el punto por cada radián que gira la rueda (con signo; el radio de la rueda). Una rueda que rueda hacia la derecha por el suelo gira en sentido horario, así que la razón es −radio.

### Qué punto elegir

- Para una rueda que rueda sin deslizar, el punto es su **centro** (no un punto del borde: la app lo comprueba y, si elegiste el extremo del borde de la línea de la rueda, usa el otro extremo).
- Para un piñón con su cremallera, un punto de la cremallera.

### Uso y condiciones

Arrastra la rueda o el punto y el otro se mueve con la razón.

- El piñón debe girar alrededor de un punto fijo (o ligado a uno con [«Coincidente»](05-restricciones.md#coincidente)).
- La línea de la cremallera da la dirección del avance.
- No modela el contacto de los dientes.

## Relaciones finitas

**Relaciones finitas** («Solo en los límites», en las [propiedades](03-seleccionar-y-editar.md#propiedades) de un elemento, en la lista de sus restricciones) hacen que una relación valga solo mientras los elementos se tocan.

### Por defecto y con la casilla

- **Por defecto,** una tangencia, un punto sobre una línea o un arco valen aunque los elementos no se vean en contacto (para el solver las líneas y los círculos son infinitos).
- **Con la casilla encendida,** la relación solo vale mientras los elementos **se tocan gráficamente**: su punto de contacto cae dentro de los límites (el segmento entre sus extremos, el barrido del arco) y la separación es casi cero. Fuera de eso, los elementos quedan libres.

Si en un paso se atraviesan, se capturan.

### Tope en bordes

Con **Tope en bordes** (aparece al marcar «Solo en los límites») el elemento no queda libre al salirse por un borde: se detiene ahí y la relación se retoma al volver hacia dentro.

- El punto queda en el extremo del segmento o del arco.
- En una tangencia, el extremo del segmento o del arco se apoya en el otro elemento.

### Ejemplo: cruz de malta

Sirve para ranuras y contactos que empiezan y terminan. Una cruz de malta se arma con una relación «punto sobre línea» finita entre el perno y cada ranura (la cruz avanza una ranura por vuelta del impulsor).

Con geometría ideal (a/d = sen(π/n)) el perno entra de frente por la boca; con otra, entra de lado y la cruz da un salto al capturarlo.

### Dónde está disponible

- Punto sobre línea.
- Punto sobre círculo o arco.
- Tangente línea-círculo o arco.
- Tangente entre arcos.

## Bibliotecas

Una **Biblioteca** es un documento con funciones, scripts y tablas que quieres usar en otros.

### Crear una biblioteca

En **Configuración → Biblioteca** marca «Es una biblioteca» y llena su ficha:

- Nombre.
- **Alias** (un prefijo corto, p. ej. `UF`).
- Autor.
- Descripción.
- Lo **público**: por defecto, sus funciones y scripts. Lo que esos necesitan viaja también, como privado, y los ejemplos no viajan.

### Guardar

«Guardar en [GitHub](11-archivo-y-exportacion.md#github)» la deja en la carpeta `MyLibrary/` del repositorio, con la extensión `.alib.json` y una versión que sube sola (v1, v2…). Si se había abierto desde otra carpeta, ofrece mandar el original a la papelera.

«Abrir de GitHub» tiene la pestaña **Bibliotecas** para reabrirla.

### Usarla en otro documento

1. Elige **[Archivo](11-archivo-y-exportacion.md#botón-archivo) → Insertar biblioteca…**.
2. Elígela y confirma el alias.

Queda un bloque `▸ UtilidadesFatiga (UF) · v3` con una copia de sus definiciones (funciona sin red).

Sus nombres se usan con el alias: `UF.C_(surf)(520'MPa, "machined")=`, `UF.Neuber_(steels)_(1,1)=`. El prefijo se dibuja en gris.

Vale desde su lugar en la página, como cualquier definición, y sus funciones usan siempre sus propias tablas aunque tu documento tenga otras con el mismo nombre.

### Actualizar

Si la biblioteca cambia en GitHub, el bloque muestra `⟳ v4`. En sus propiedades (doble toque), «Actualizar» trae la versión nueva y antes avisa qué nombres se agregan o desaparecen.

### Indicador decimal y modo de ángulos

- Si la biblioteca usa otro indicador decimal, se convierte al insertarla.
- Si usa otro modo de ángulos, el bloque lo advierte.

---

[← 8. Splines y trazados (levas y trayectorias)](08-splines-y-trazados.md) · [Índice](README.md) · [10. Estilo, capas y vista →](10-estilo-capas-y-vista.md)
