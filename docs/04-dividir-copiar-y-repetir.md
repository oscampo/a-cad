# 4. Dividir, copiar y repetir

Partir un elemento en tramos y repetir geometría con matrices lineales, circulares y copias espejo, vinculadas o no al original.

[← 3. Seleccionar y editar](03-seleccionar-y-editar.md) · [Índice](README.md) · [5. Restricciones →](05-restricciones.md)

---

## Dividir

![Dividir](icons/split.svg) **Dividir** (panel, sección Cotas...): con 1 segmento, arco o círculo más los puntos que están sobre él, lo parte en esos puntos.

Sin puntos, lo divide en **n partes iguales**:

- En líneas, las partes quedan con restricción de igual longitud.
- En arcos y círculos no hay restricción de igual ángulo.

## Fusionar y disolver puntos

**Fusionar puntos** (junto a Dividir): con 2 o más puntos seleccionados, los une en **uno solo**. Se queda el que más pesa (fijo, generado, con más relaciones, visible) y todo lo que usaba los otros pasa a usarlo a él. Sirve para arreglar dos puntos distintos que están en el mismo lugar y no deberían (los elementos no se encadenan). Se niega si una línea, un arco o un spline usa los dos puntos. Si los puntos no están en el mismo lugar, o hay relaciones entre ellos que se perderían (una cota entre los dos, por ejemplo), avisa y **pide confirmación** antes de tocar nada.

**Disolver punto** es lo contrario de Dividir: con 1 punto seleccionado que es el extremo común de **dos líneas alineadas**, de dos arcos del mismo círculo que se continúan, o de dos arcos elípticos de la misma elipse (aunque cada uno tenga sus propios puntos de eje, como los que deja un script `earc` ejecutado a mano, con diferencias de ruido), las dos partes pasan a ser **un solo elemento** y el punto desaparece. Se queda el estilo del primero, y el relleno y el grupo de contorno siguen pasando por él. Si no están alineadas, si son de círculos distintos, o si algo más usa el punto, no lo hace y dice por qué. Las relaciones del punto y de la parte que se absorbe **se pierden** (salvo en arcos elípticos: lo que se decía del arco absorbido pasa al que queda, y solo se van las que unían los dos arcos entre sí, como una tangencia): si hay alguna, la app lo avisa y **pide confirmación** antes de proceder. Ambos se deshacen.

**Separar punto** es lo contrario de Fusionar: un punto que usan varios elementos (dos splines unidas por su extremo, una línea y un arco…) se separa. Con el punto **y los elementos que se separan** seleccionados, esos elementos pasan a un punto **nuevo en el mismo lugar** y dejan de estar unidos al resto; con solo el punto, cada elemento menos el primero recibe el suyo. Las relaciones que tocaban el punto y solo a lo que se separa se van con el punto nuevo; las que unían las dos partes (una tangencia entre los dos, un punto medio…) **se pierden**, y entonces la app lo avisa y **pide confirmación**. Se niega si un solo elemento usa el punto, si algo lo genera un script o si lo usa un texto o un vector. Se deshace.

## Matriz lineal

![Matriz lineal](icons/array.svg) **Matriz lineal**: selecciona lo que quieres copiar.

**Dirección 1.** Con una línea, va de su inicio a su fin; sin línea, es horizontal.

**Espaciado y número.** Define el espaciado y el *número total* (incluye el original; si solo das el espaciado, el total es 2).

**Dirección 2.** Es opcional y llena una cuadrícula; sin línea es perpendicular a la 1.

**Resaltado.** Las direcciones elegidas se resaltan con una flecha en el lienzo.

## Matriz circular

![Matriz circular](icons/array-circ.svg) **Matriz circular**: se define con estos datos:

- **Centro**: el origen o un punto que toques.
- **Ángulo total**: 360° por defecto.
- **Número total**.
- **Separación igual** o **ángulo entre instancias**.
- **Sentido invertido**.
- *Omitir instancias*: por ejemplo 3, 5.

## Variables en Dividir y en las matrices

Los campos de esas herramientas (número de partes, espaciado, número total, ángulos y omitir instancias) aceptan las cotas y las variables `x:valor` definidas en los textos, además de números y fórmulas.

### Campos de números enteros

En los campos que piden un **entero** (número de partes, número total, instancias omitidas), una variable o fórmula se redondea al entero más cercano, como `round(variable;0)`; un número simple sí debe ser entero.

### Menú de variables

Los diálogos tienen un **menú de variables** con un filtro (todas, dimensiones, ángulos, variables de texto): al elegir una se inserta su nombre en el campo donde estabas escribiendo, en la posición del cursor.

## Copia espejo

![Copia espejo](icons/mirror.svg) **Copia espejo**: selecciona lo que quieres reflejar, pulsa el botón y toca la línea que hace de eje.

Los puntos sobre el eje se comparten.

## Copias vinculadas

**Copias vinculadas** (opción "Vincular las copias al original", activa por defecto): cada punto de la copia queda atado a su original con restricciones automáticas, así que la copia es una réplica rígida que **sigue al original** si lo mueves, lo giras o cambias su tamaño.

### Restricciones según la herramienta

- **Matriz lineal**: la distancia y la dirección (el ángulo respecto de la línea elegida, o absoluta si no hay línea).
- **Matriz circular**: igual distancia al centro y el ángulo en el centro.
- **Copia espejo**: simetría respecto del eje y, en los círculos, igual radio.

### Cotas de la matriz

**Las cotas de la matriz son opcionales** ("Mostrar las cotas"):

- En la lineal, la distancia entre el original y la primera copia.
- En la circular, la cota angular.

### Sin vincular

Con la opción desactivada, las copias son independientes y llevan solo sus restricciones internas.

---

[← 3. Seleccionar y editar](03-seleccionar-y-editar.md) · [Índice](README.md) · [5. Restricciones →](05-restricciones.md)
