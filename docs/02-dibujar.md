# 2. Dibujar

Las herramientas que crean geometría (puntos, líneas, círculos, arcos, elipses, splines, rectángulos y polígonos) y las ayudas al dibujar: el bloqueo suave y el imán a intersecciones.

[← 1. Empezar](01-empezar.md) · [Índice](README.md) · [3. Seleccionar y editar →](03-seleccionar-y-editar.md)

---

Los botones con una esquina marcada son **desplegables**: muestran la última herramienta usada del grupo. Toca la esquina, vuelve a tocar el botón cuando ya está activo, o mantenlo presionado para ver las demás.

## Punto (P)

Sobre una línea o círculo queda restringido a él.

## Línea (L)

Toca inicio y fin (encadena) o arrastra un segmento. Esc o Seleccionar termina.

## Vector (W)

**Vector (W)** (en el desplegable de Línea): se dibuja igual que una línea, pero lleva una **cabeza de flecha en el punto final** (la cola es el inicio) y su **magnitud** escrita como texto en el punto medio (el punto de inserción es el medio del lado superior de la caja, así queda centrada, y por defecto está **alineado con la línea** del vector: gira con ella y se lee de izquierda a derecha). La magnitud es una cota con nombre (D1, D2...), de solo lectura al principio, así que puedes usarla en fórmulas y en textos. **Para cambiarla, toca dos veces el vector**: en sus propiedades están **Magnitud** (un valor o una fórmula con otras cotas, como `2*D1`; escribirlo fija la longitud), **Magnitud fija** (desmárcalo para que vuelva a solo medir) y su **Nombre**. Las propiedades del vector también tienen **Unidad** y **Escala**: con Magnitud 30, Unidad kN y Escala `1'mm/kN` (o una variable de texto, `eF`) el vector mide 30 mm y su texto dice «30 kN», y en fórmulas y textos la magnitud vale 30 kN. Si la magnitud no está fija, la unidad y la escala dicen cuánto vale lo que mide el vector: la resultante de un polígono de fuerzas se lee del dibujo en kN (ver [Cota con unidad](06-cotas.md#cota-con-unidad)). **Convertir**: con una línea seleccionada, y uno de sus extremos (será la cola; si no eliges ninguno, la cola es el inicio), elige Vector en el desplegable y la línea pasa a ser vector; con un vector seleccionado, elige Línea y deja de serlo (se quitan la flecha, el texto y la cota). Borrar el vector borra también su texto; copiar y matrices lo copian con su propio texto y su propia magnitud. La flecha sale en el SVG y el DXF (no en el SVG de corte láser, que lo trata como una línea). El texto de la magnitud es un texto normal: se puede mover, cambiar de tamaño o de fuente, o soltar la alineación (Texto → Soltar).

## Línea de punto medio (M)

**Línea de punto medio (M)** (desplegable de Línea): toca el punto inicial, que será el *punto medio*, y luego un extremo (o arrastra); la línea crece igual hacia el otro lado. Queda con una restricción de punto medio (M) y el bloqueo suave funciona como en las líneas.

## Línea constructiva (K)

**Línea constructiva (K)** (desplegable de Línea): gris (#C3C3C3), del grosor «fino» y con un trazo continuo en el medio y un punto en cada extremo, separados por un hueco; los puntos se ven como los del tipo «traza y punto». Se dibuja como una línea normal, con bloqueo suave. No sale en el SVG de corte láser salvo que cambies su clase a Corte o Marcado.

## Círculo (C)

Centro y un punto del borde.

## Círculo perimetral

**Círculo perimetral** (desplegable de Círculo): toca 3 puntos no colineales; los puntos quedan sobre la circunferencia.

## Elipse (O)

Toca el centro; luego toca (o arrastra hasta) el extremo del primer eje y, por último, un punto del segundo eje (la elipse pasa por la proyección de ese punto sobre la perpendicular al primer eje). También puedes arrastrar desde el centro hasta el extremo del primer eje. Es un elemento propio: se selecciona, se copia, se exporta, aparece en el árbol y sus tres puntos (centro, eje 1 y eje 2) se pueden acotar y restringir. Se recorta, se extiende hasta ella y admite coincidente y tangente; no admite intersecciones.

## Elipse parcial

**Elipse parcial** (desplegable de Elipse): crea un arco elíptico. Los tres primeros pasos son los de la elipse (centro, extremo del primer eje y punto del segundo eje); queda una elipse punteada de referencia. Después *arrastra sobre ella* desde donde empieza el tramo hasta donde termina: el tramo sigue el sentido de tu movimiento (↻ o ↺). También puedes tocar el inicio y luego el fin (con dos toques se toma el tramo corto). Los extremos son puntos que se deslizan sobre la elipse.

## Arco por centro y extremos (R)

Centro, inicio y fin. El sentido sale de *hacia dónde mueves*: tras tocar el inicio, lleva el cursor (o arrastra con el dedo o el lápiz) hacia el lado que quieres y suelta en el fin; la vista previa muestra ↻ (horario) o ↺ (antihorario). Con un toque directo en el fin, se crea el arco corto.

## Círculo y arcos constructivos

**Círculo y arcos constructivos** (en los desplegables de Círculo y Arco): usan el color y el grosor de la línea constructiva. El círculo se ve en «traza y punto»; los arcos llevan un punto en cada extremo. También puedes *convertir* cualquier elemento elegido el tipo «Constructiva» en el panel de Estilo (toma su color y grosor).

## Arco por 3 puntos (A)

**Arco por 3 puntos (A)** (desplegable de Arco): inicio, punto intermedio y fin.

## Spline (S)

Toca los puntos por donde pasa la curva; tocar de nuevo el último (o Esc) termina, tocar el primero la cierra.

## Rectángulo (B)

Toca (o arrastra entre) dos esquinas opuestas. Queda con restricciones horizontal y vertical, así que sigue siendo rectángulo al mover una esquina.

## Rectángulo de centro

**Rectángulo de centro** (desplegable de Rectángulo): toca el centro y una esquina (o arrastra del centro a la esquina). El centro queda como punto medio de la diagonal.

## Polígono (G)

Toca el centro y el radio; luego eliges el número de lados (3 a 64) y si es *inscrito* (el radio llega a un vértice) o *circunscrito* (el radio llega al medio de un lado). El ángulo del radio con la horizontal da la orientación, con los mismos bloqueos suaves de las líneas. Queda regular al mover un vértice (vértices equidistantes del centro y lados iguales, restricciones ocultas).

## Intersección

Ya no tiene botón en la barra; sigue disponible en el panel (selecciona 2 elementos y pulsa Intersección) y con la tecla I.

## Bloqueo suave e imán a intersecciones al dibujar líneas

Al dibujar una línea, si el cursor queda cerca de una dirección notable, la línea se ajusta y se ve una guía punteada con una etiqueta:

### Horizontal, vertical y 45°

**Horizontal, vertical y 45°** (cada 45°; el paso se puede cambiar en el panel Vista, por ejemplo a 15°): la etiqueta muestra H, V o el ángulo. H y V agregan su restricción; los demás ángulos no agregan ninguna.

### Cerca de una línea existente

**Cerca de una línea existente** (a menos de unos 36 px del cursor): **paralela (∥)** o **perpendicular (⟂)** a ella, con la restricción correspondiente. Si la dirección bloqueada cruza una línea, un arco o un círculo cerca del cursor, la nueva línea **termina en ese cruce**, sobre ese elemento (la perpendicular termina en el pie de la perpendicular).

### Cerca de un arco o círculo

**tangente (T)**, con el extremo sobre la curva. También si empiezas en una curva.

- Si empiezas en una línea o en su extremo, también da paralela y perpendicular a ella.

### Restricciones automáticas

Si la línea queda horizontal, vertical, perpendicular, paralela o tangente por haber aceptado el bloqueo, se crea la restricción correspondiente con los elementos involucrados (el final que cae sobre una línea o curva queda sobre ella). Los 45° y demás ángulos intermedios no agregan restricción.

- Un **punto existente**, una **intersección** o el **punto medio de una línea** (se marca con una M) cerca del cursor mandan sobre el bloqueo. El punto medio crea el punto con una restricción oculta de punto medio, así que sigue en el medio si la línea cambia. En líneas muy cortas en pantalla no se ofrece.

### Imán a intersecciones

Si el inicio o el final de la línea está cerca de la intersección de dos elementos (líneas, arcos, círculos o splines), la línea empieza o termina ahí (∩) y el punto queda sobre ambos. Con el cursor, hay que quedarse cerca unos milisegundos (por defecto 80, configurable en Vista; 0 = al instante); un toque o el inicio de un arrastre la toman al instante.

Si la restricción choca con las existentes, se quita y la línea queda tal cual. El bloqueo se apaga con *Bloqueo suave* en el panel Vista.

---

[← 1. Empezar](01-empezar.md) · [Índice](README.md) · [3. Seleccionar y editar →](03-seleccionar-y-editar.md)
