# 2. Dibujar

Las herramientas que crean geometría (puntos, líneas, círculos, arcos, elipses, splines, rectángulos y polígonos) y las ayudas al dibujar: el bloqueo suave y el imán a intersecciones.

[← 1. Empezar](01-empezar.md) · [Índice](README.md) · [3. Seleccionar y editar →](03-seleccionar-y-editar.md)

---

## Botones desplegables

Los botones con una esquina marcada son **desplegables**: muestran la última herramienta usada del grupo. Todos los grupos, con lo que trae cada uno, están reunidos en [Botones desplegables](desplegables.md).

## Punto (P)

![Punto](icons/point.svg) **Punto (P)**: sobre una línea o círculo queda restringido a él.

## Línea (L)

![Línea](icons/line.svg) **Línea (L)**: toca inicio y fin (encadena) o arrastra un segmento.

Esc o [Seleccionar](03-seleccionar-y-editar.md#seleccionar-v) termina.

## Vector (W)

![Vector](icons/vector.svg) **Vector (W)** (en el [desplegable de Línea](desplegables.md#línea)): se dibuja igual que una línea, pero lleva una **cabeza de flecha en el punto final** (la cola es el inicio) y su **magnitud** escrita como texto en el punto medio.

### Texto de la magnitud

**Posición.** El punto de inserción es el medio del lado superior de la caja, así queda centrada, y por defecto está **alineado con la línea** del vector: gira con ella y se lee de izquierda a derecha.

**Texto normal.** El texto de la magnitud es un texto normal: se puede mover, cambiar de tamaño o de fuente, o soltar la alineación (Texto → Soltar).

### Magnitud

**Cota con nombre.** La magnitud es una cota con nombre (D1, D2...), de solo lectura al principio, así que puedes usarla en fórmulas y en textos.

**Cambiarla.** Para cambiarla, **toca dos veces el vector**. En sus propiedades están:

- **Magnitud**: un valor o una fórmula con otras cotas, como `2*D1`; escribirlo fija la longitud.
- **Magnitud fija**: desmárcalo para que vuelva a solo medir.
- **Nombre**.

### Unidad y escala

**Unidad y escala.** Las propiedades del vector también tienen **Unidad** y **Escala**: con Magnitud 30, Unidad kN y Escala `1'mm/kN` (o una variable de texto, `eF`) el vector mide 30 mm y su texto dice «30 kN», y en fórmulas y textos la magnitud vale 30 kN.

**Magnitud no fija.** Si la magnitud no está fija, la unidad y la escala dicen cuánto vale lo que mide el vector: la resultante de un polígono de fuerzas se lee del dibujo en kN (ver [Cota con unidad](06-cotas.md#cota-con-unidad)).

### Convertir entre línea y vector

**Línea a vector.** Con una línea seleccionada, y uno de sus extremos (será la **cabeza**; si no eliges ninguno, la cabeza es el final), elige Vector en el desplegable y la línea pasa a ser vector. Es el mismo gesto de la [línea indicativa y el actuador lineal](#cabeza-y-cola-un-solo-gesto).

**Vector a línea.** Con un vector seleccionado, elige Línea y deja de serlo (se quitan la flecha, el texto y la cota).

### Borrar, copiar y exportar

**Borrar y copiar.** Borrar el vector borra también su texto; copiar y matrices lo copian con su propio texto y su propia magnitud.

**Exportar.** La flecha sale en el SVG y el DXF (no en el SVG de corte láser, que lo trata como una línea).

## Cabeza y cola: un solo gesto

El **vector**, la **línea indicativa** y el **actuador lineal** se definen igual: eliges **una línea y uno de sus extremos**, y ese extremo es la **cabeza** (donde va la punta de la flecha); el otro extremo es la cola.

- ![Vector](icons/vector.svg) **Vector**: la línea pasa a ser vector (ver [Vector (W)](#vector-w)).
- **Línea indicativa**: la flecha va en el extremo elegido (ver [Líneas indicativas](06-cotas.md#líneas-indicativas)).
- ![Actuador lineal](icons/act-l.svg) **Actuador lineal (ML)**: el desplazamiento se mide de la cola a la cabeza; también se define con dos puntos, la cola y la cabeza (ver [Actuadores](09-simulaciones-graficas.md#actuadores)).

El texto de cada uno (la magnitud del vector, la etiqueta de la línea indicativa y el nombre del actuador) queda, por defecto, en el **punto medio** de la línea; después puedes cambiarlo en sus propiedades.

Puedes elegir la línea y el extremo en cualquier orden, o seleccionarlos antes de elegir la herramienta.

## Línea de punto medio (M)

![Línea de punto medio](icons/mline.svg) **Línea de punto medio (M)** (en el [desplegable de Línea](desplegables.md#línea)): toca el punto inicial, que será el *punto medio*, y luego un extremo (o arrastra); la línea crece igual hacia el otro lado.

Queda con una restricción de [punto medio](05-restricciones.md#punto-medio) (M) y el bloqueo suave funciona como en las líneas.

## Línea constructiva (K)

![Línea constructiva](icons/cline.svg) **Línea constructiva (K)** (en el [desplegable de Línea](desplegables.md#línea)): gris (#C3C3C3), del grosor «fino» y con un trazo continuo en el medio y un punto en cada extremo, separados por un hueco; los puntos se ven como los del tipo «traza y punto».

Se dibuja como una línea normal, con bloqueo suave.

No sale en el SVG de corte láser salvo que cambies su clase a Corte o Marcado.

## Círculo (C)

![Círculo](icons/circle.svg) **Círculo (C)**: centro y un punto del borde.

## Círculo perimetral

![Círculo perimetral](icons/circle3.svg) **Círculo perimetral** (en el [desplegable de Círculo](desplegables.md#círculo)): toca 3 puntos no colineales; los puntos quedan sobre la circunferencia.

## Elipse (O)

![Elipse](icons/ellipse.svg) **Elipse (O)**: toca el centro; luego toca (o arrastra hasta) el extremo del primer eje y, por último, un punto del segundo eje (la elipse pasa por la proyección de ese punto sobre la perpendicular al primer eje).

También puedes arrastrar desde el centro hasta el extremo del primer eje.

### Qué se puede hacer con ella

Es un elemento propio:

- Se selecciona, se copia y se exporta.
- Aparece en el [árbol de elementos](10-estilo-capas-y-vista.md#árbol-de-elementos).
- Sus tres puntos (centro, eje 1 y eje 2) se pueden acotar y restringir.
- Se [recorta](03-seleccionar-y-editar.md#recortar-x), se [extiende](03-seleccionar-y-editar.md#extender-e) hasta ella y admite coincidente y tangente.
- No admite intersecciones.

## Elipse parcial

![Elipse parcial](icons/earc.svg) **Elipse parcial** (en el [desplegable de Elipse](desplegables.md#elipse)): crea un arco elíptico.

**Primeros pasos.** Los tres primeros pasos son los de la elipse (centro, extremo del primer eje y punto del segundo eje); queda una elipse punteada de referencia.

**Tramo.** Después *arrastra sobre ella* desde donde empieza el tramo hasta donde termina: el tramo sigue el sentido de tu movimiento (↻ o ↺). También puedes tocar el inicio y luego el fin (con dos toques se toma el tramo corto).

**Extremos.** Los extremos son puntos que se deslizan sobre la elipse.

## Arco por centro y extremos (R)

![Arco por centro y extremos](icons/arc-c.svg) **Arco por centro y extremos (R)**: centro, inicio y fin.

**Sentido.** Sale de *hacia dónde mueves*: tras tocar el inicio, lleva el cursor (o arrastra con el dedo o el lápiz) hacia el lado que quieres y suelta en el fin; la vista previa muestra ↻ (horario) o ↺ (antihorario).

**Arco corto.** Con un toque directo en el fin, se crea el arco corto.

## Círculo y arcos constructivos

![Círculo constructivo](icons/ccircle.svg) **Círculo y arcos constructivos** (en los [desplegables](desplegables.md) de Círculo y Arco): usan el color y el grosor de la línea constructiva.

El círculo se ve en «traza y punto»; los arcos llevan un punto en cada extremo.

También puedes *convertir* cualquier elemento elegido el tipo «Constructiva» en el [panel de Estilo](10-estilo-capas-y-vista.md#estilo) (toma su color y grosor).

## Arco por 3 puntos (A)

![Arco por 3 puntos](icons/arc-3.svg) **Arco por 3 puntos (A)** (en el [desplegable de Arco](desplegables.md#arco)): inicio, punto intermedio y fin.

## Spline (S)

![Spline](icons/spline.svg) **Spline (S)**: toca los puntos por donde pasa la curva.

Tocar de nuevo el último (o Esc) termina, tocar el primero la cierra.

## Rectángulo (B)

![Rectángulo](icons/rect.svg) **Rectángulo (B)**: toca (o arrastra entre) dos esquinas opuestas.

Queda con restricciones horizontal y vertical, así que sigue siendo rectángulo al mover una esquina.

## Rectángulo de centro

![Rectángulo de centro](icons/rect-c.svg) **Rectángulo de centro** (en el [desplegable de Rectángulo](desplegables.md#rectángulo)): toca el centro y una esquina (o arrastra del centro a la esquina).

El centro queda como punto medio de la diagonal.

## Polígono (G)

![Polígono](icons/polygon.svg) **Polígono (G)**: toca el centro y el radio; luego eliges el número de lados (3 a 64) y si es *inscrito* (el radio llega a un vértice) o *circunscrito* (el radio llega al medio de un lado).

**Orientación.** El ángulo del radio con la horizontal da la orientación, con los mismos bloqueos suaves de las líneas.

**Regularidad.** Queda regular al mover un vértice (vértices equidistantes del centro y lados iguales, restricciones ocultas).

## Intersección

![Intersección](icons/intersect.svg) **Intersección**: ya no tiene botón en la barra; sigue disponible en el panel (selecciona 2 elementos y pulsa Intersección) y con la tecla I.

## Bloqueo suave e imán a intersecciones al dibujar líneas

![Bloqueo suave](icons/soft-lock.svg) **Bloqueo suave**: al dibujar una línea, si el cursor queda cerca de una dirección notable, la línea se ajusta y se ve una guía punteada con una etiqueta.

### Horizontal, vertical y 45°

**Horizontal, vertical y 45°** (cada 45°; el paso se puede cambiar en el [panel Vista](10-estilo-capas-y-vista.md#vista), por ejemplo a 15°): la etiqueta muestra H, V o el ángulo.

H y V agregan su restricción; los demás ángulos no agregan ninguna.

### Cerca de una línea existente

**Cerca de una línea existente** (a menos de unos 36 px del cursor): **paralela (∥)** o **perpendicular (⟂)** a ella, con la restricción correspondiente.

Si la dirección bloqueada cruza una línea, un arco o un círculo cerca del cursor, la nueva línea **termina en ese cruce**, sobre ese elemento (la perpendicular termina en el pie de la perpendicular).

### Cerca de un arco o círculo

**tangente (T)**, con el extremo sobre la curva. También si empiezas en una curva.

- Si empiezas en una línea o en su extremo, también da paralela y perpendicular a ella.

### Restricciones automáticas

Si la línea queda horizontal, vertical, perpendicular, paralela o tangente por haber aceptado el bloqueo, se crea la restricción correspondiente con los elementos involucrados (el final que cae sobre una línea o curva queda sobre ella).

Los 45° y demás ángulos intermedios no agregan restricción.

- Un **punto existente**, una **intersección** o el **punto medio de una línea** (se marca con una M) cerca del cursor mandan sobre el bloqueo. El punto medio crea el punto con una restricción oculta de punto medio, así que sigue en el medio si la línea cambia. En líneas muy cortas en pantalla no se ofrece.

### Imán a intersecciones

![Imán](icons/magnet.svg) **Imán a intersecciones**: si el inicio o el final de la línea está cerca de la intersección de dos elementos (líneas, arcos, círculos o splines), la línea empieza o termina ahí (∩) y el punto queda sobre ambos.

Con el cursor, hay que quedarse cerca unos milisegundos (por defecto 80, configurable en Vista; 0 = al instante); un toque o el inicio de un arrastre la toman al instante.

Si la restricción choca con las existentes, se quita y la línea queda tal cual.

El bloqueo se apaga con *Bloqueo suave* en el panel Vista.

---

[← 1. Empezar](01-empezar.md) · [Índice](README.md) · [3. Seleccionar y editar →](03-seleccionar-y-editar.md)
