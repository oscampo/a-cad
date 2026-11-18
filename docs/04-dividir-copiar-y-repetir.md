# 4. Dividir, copiar y repetir

Partir un elemento en tramos y repetir geometría con matrices lineales, circulares y copias espejo, vinculadas o no al original.

[← 3. Seleccionar y editar](03-seleccionar-y-editar.md) · [Índice](README.md) · [5. Restricciones →](05-restricciones.md)

---

## Dividir

**Dividir** (panel, sección Cotas...): con 1 segmento, arco o círculo más los puntos que están sobre él, lo parte en esos puntos. Sin puntos, lo divide en **n partes iguales** (en líneas, las partes quedan con restricción de igual longitud; en arcos y círculos no hay restricción de igual ángulo).

## Matriz lineal

Selecciona lo que quieres copiar. Define la dirección 1 (con una línea: de su inicio a su fin; sin línea, horizontal), el espaciado y el *número total* (incluye el original; si solo das el espaciado, el total es 2). La dirección 2 es opcional y llena una cuadrícula; sin línea es perpendicular a la 1. Las direcciones elegidas se resaltan con una flecha en el lienzo.

## Matriz circular

Centro (origen o un punto que toques), ángulo total (360° por defecto), número total, separación igual o ángulo entre instancias, sentido invertido y *omitir instancias* (por ejemplo 3, 5).

## Variables en Dividir y en las matrices

Los campos de esas herramientas (número de partes, espaciado, número total, ángulos y omitir instancias) aceptan las cotas y las variables `x{=valor}` definidas en los textos, además de números y fórmulas. En los campos que piden un **entero** (número de partes, número total, instancias omitidas), una variable o fórmula se redondea al entero más cercano, como `round(variable;0)`; un número simple sí debe ser entero. Los diálogos tienen un **menú de variables** con un filtro (todas, dimensiones, ángulos, variables de texto): al elegir una se inserta su nombre en el campo donde estabas escribiendo, en la posición del cursor.

## Copia espejo

Selecciona lo que quieres reflejar, pulsa el botón y toca la línea que hace de eje. Los puntos sobre el eje se comparten.

## Copias vinculadas

**Copias vinculadas** (opción "Vincular las copias al original", activa por defecto): cada punto de la copia queda atado a su original con restricciones automáticas, así que la copia es una réplica rígida que **sigue al original** si lo mueves, lo giras o cambias su tamaño. En la matriz lineal, la distancia y la dirección (el ángulo respecto de la línea elegida, o absoluta si no hay línea); en la circular, igual distancia al centro y el ángulo en el centro; en la copia espejo, simetría respecto del eje y, en los círculos, igual radio. **Las cotas de la matriz son opcionales** ("Mostrar las cotas"): la distancia entre el original y la primera copia en la lineal, y la cota angular en la circular. Con la opción desactivada, las copias son independientes y llevan solo sus restricciones internas.

---

[← 3. Seleccionar y editar](03-seleccionar-y-editar.md) · [Índice](README.md) · [5. Restricciones →](05-restricciones.md)
