# 5. Restricciones

Las relaciones geométricas que el solver mantiene siempre: horizontal, paralela, tangente, coincidente y las demás, con su numeración en el dibujo.

[← 4. Dividir, copiar y repetir](04-dividir-copiar-y-repetir.md) · [Índice](README.md) · [6. Cotas →](06-cotas.md)

---

Selecciona los elementos y pulsa el botón. Cada botón indica qué selección necesita.

## Horizontal / Vertical

Líneas, o 2 puntos.

## Distribuir ↔ / Distribuir ↕

3 o más puntos o textos (un texto, por su punto de inserción). Quedan **igualmente espaciados** en horizontal (x) o en vertical (y), entre los dos de los extremos (el de más a la izquierda y el de más a la derecha, o el de más abajo y el de más arriba), que no se mueven al aplicarla. La otra coordenada queda libre: para alinearlos además, usa Horizontal o Vertical. Es una restricción como las demás: la separación es una incógnita, así que si arrastras un extremo los de en medio se reparten de nuevo, y si arrastras uno de en medio se mueven todos. Se rotula ↔1, ↕1 junto a cada punto.

## Paralela / Perpendicular

2 o más líneas.

## Coincidente

2 o más puntos (quedan en el mismo lugar); punto(s) y 1 línea, arco, círculo, elipse o spline (los puntos quedan sobre el elemento); o líneas/arcos y 1 elipse o spline (el extremo más cercano de cada línea o arco queda sobre la curva). **Colineal**: 2 o más líneas.

## Punto medio

1 punto + 1 línea.

## Concéntrica (◎)

2 o más círculos o arcos; el centro del primero manda y los demás centros coinciden con él. Si ya comparten el centro, avisa y no agrega nada.

## Igual

2 líneas (igual longitud) o 2 círculos/arcos (igual radio). Al redondear o achaflanar una esquina, la igualdad de longitudes de las líneas que se acortan pasa a ser una igualdad de distancias entre su otro extremo y el vértice virtual de la esquina (se ve como «=» junto a esos puntos).

## Tangente

Línea + círculo/arco, 2 círculos/arcos, un spline con una línea, círculo o arco, una **elipse** (o arco elíptico) con una línea, círculo o arco, o 2 elipses. Con elipses y splines aparece el punto de contacto.

## Fijar / soltar

Puntos, líneas o círculos. Un punto fijo no se mueve al arrastrar.

## Marca de referencia

**Marca de referencia** (propiedades de un punto, «Marca de referencia en» y la línea): una marca **no es un punto fijo**. El solver no la mueve mientras resuelve, pero después de cada cambio se **proyecta sobre su línea**, que ya está en su nueva posición y orientación. Así se desliza sola a lo largo de la línea, arrastrada por ella, y **recuerda lo recorrido**: la distancia entre la marca y otro punto de la línea acumula el camino. Una cota de posición no puede hacerlo, porque vuelve al mismo valor al cerrar un recorrido; la marca sí. Se dibuja como una **x**. **Reiniciar marcas** (botón del grupo Spline, o «Reiniciar» en las propiedades del punto) devuelve cada marca a su *referencia*: la distancia sobre la línea, desde su primer extremo, que tenía al asignarla. Sirve para colocar el mecanismo en otro lugar y empezar la lectura de nuevo desde cero. «Tomar la actual» cambia la referencia. Sirve para rieles, ruedas que ruedan sobre una línea que gira y planímetros. Ejemplo, el planímetro polar: el polo y el brazo con el trazador P siguen el contorno de una figura; el riel (perpendicular al brazo) pasa por P y lleva una marca; D = distancia de la marca a P (solo lectura), el giro de la rueda es `(D-D0)/(O1/2)` y el área es `longitud del brazo × radio × giro`. Una marca pertenece a una sola línea y no puede ser extremo de ella; si se borra la línea, deja de ser marca; las copias y matrices la reasignan a la copia de su línea. **Límite**: la marca avanza por pasos (cada resolución), así que el recorrido acumulado tiene un error que baja con arrastres más finos (en el planímetro, 2 a 4 % con arrastre normal).

## Indicadores

Cada relación se rotula con su letra y número junto a los elementos que involucra (los mismos número y letra en todos): una de un punto con una línea, un círculo o un arco, junto al punto y al elemento; una horizontal o vertical entre 2 puntos, junto a los dos. Las de engranaje se marcan con **G** y las de rueda y cremallera con **Cr**.

## Restricciones redundantes

Una restricción redundante no agrega información (otras ya implican lo mismo) y hace más lento cada cálculo, porque el solver resuelve dos veces y las diagnostica. El botón «Redundantes» (grupo Restricciones) las lista y ofrece quitarlas; al abrir un archivo que las tenga aparece un aviso. Las cotas con nombre no se quitan solas (pueden alimentar fórmulas).

## Numeración

Cada restricción lleva un número por tipo (H1, H2, ⟂1, ∥1, =1, ●1, T1...). Las que involucran varios elementos comparten un solo número y se rotulan junto a cada elemento (por ejemplo, dos líneas perpendiculares muestran ⟂1 cada una). El número no se reutiliza si borras la restricción. En el árbol de elementos cada restricción aparece con su número: tócala para seleccionarla junto con sus elementos y llevar el lienzo hasta ahí. Las restricciones automáticas que ponen un punto sobre un elemento al dibujar (●) no se rotulan.

Si una restricción contradice a las demás, la app avisa y deshace la acción.

---

[← 4. Dividir, copiar y repetir](04-dividir-copiar-y-repetir.md) · [Índice](README.md) · [6. Cotas →](06-cotas.md)
