# 9. Simulaciones gráficas

Mover el dibujo en el tiempo: actuadores rotacionales y lineales, el reproductor de la simulación, gráficas de medidas, engranajes, cremallera y relaciones que solo valen mientras los elementos se tocan.

[← 8. Splines y trazados (levas y trayectorias)](08-splines-y-trazados.md) · [Índice](README.md) · [10. Estilo, capas y vista →](10-estilo-capas-y-vista.md)

---

## Actuadores

**Actuadores** (grupo después de Redondeo): **MR** (rotacional) se define eligiendo la línea y su extremo que será el centro de giro (tócalos en cualquier orden, o selecciónalos antes de elegir la herramienta) (antihorario por defecto, u horario; el sentido se ve en la flecha circular); **ML** (lineal) con la cola y la cabeza (toca los dos puntos, o selecciónalos antes: el primero es la cola). Se les da un **desplazamiento** o una **velocidad** respecto al tiempo `t`, por una expresión (`90*t`, `30*sin(2π*t)`) o una tabla «tiempo; valor». Toca su etiqueta, o su nombre en el árbol de elementos (grupo «Actuadores»), para editarlos o eliminarlos; el filtro de selección puede apagar «Actuadores y gráficas». **Simulación** abre la barra de tiempo: reproduce y mueve el dibujo resolviendo las restricciones (la línea del MR no puede estar fijada en horizontal o vertical, ni su longitud cambiar en el ML); el reproductor tiene paso atrás/adelante, repetición en ciclo (↻), vaivén (⇄) y velocidad 0.5x a 2.0x; al detener, el dibujo vuelve a como estaba.

## Gráficas

**Gráficas** (grupo de actuadores): toca donde va la esquina inferior izquierda y escribe las relaciones «variable1 vs variable2», una por línea (la primera va en el eje vertical): `MR1 vs t`, `MR1.v vs t`, `D1 vs t`, o dos vectores de rangos del mismo tamaño. Variables: `t`, los actuadores (`MR1`, `ML1`; su velocidad con `.v`, por ejemplo `ML1.v`), las cotas con nombre, las variables de los textos y los vectores. Cada lado admite operaciones y funciones con esas variables: `p1.x/p1.y vs t`, `ML1.d-p1.x vs t`. Al final de la línea, `@y2`, `@x2` o `@x2 y2` la dibujan en los ejes secundarios (x1 inferior, x2 superior, y1 izquierdo, y2 derecho). Toca una gráfica para seleccionarla (se resalta): arrástrala para moverla y arrastra sus bordes o esquinas para cambiar su tamaño. Doble toque abre sus propiedades: título, relaciones, tiempo final, muestras, posición, tamaño y, por cada eje, su nombre libre (por ejemplo `p12.x [cm]`, que sirve de documentación porque los ejes no muestran unidades), escala lineal o logarítmica, mínimo y máximo, y divisiones mayores y menores. Los puntos con «Trazar punto» dibujan su trayectoria al correr la simulación y la conservan al detenerla.

## Engranaje

**Engranaje** (grupo Restricciones): selecciona 2 líneas, una rígida con cada engranaje (por ejemplo el radio de cada uno que parte del centro fijo) y teclea la razón de giro (negativa si giran en sentido contrario; admite fórmula, p. ej. `-17/34`; con módulos iguales es −z1/z2, o la razón de los diámetros primitivos o de base, no la de los exteriores). Posiciona primero los engranes a mano, sin que los dientes interfieran, y luego crea la relación: la postura de ese momento es el punto de partida y de ahí en adelante el giro de ambos lo gobierna la razón. Arrastra cualquier punto de uno de los engranes y el otro gira con la razón, varias vueltas. Condiciones: cada engranaje gira alrededor de un punto fijo (el extremo de la línea que coincide con él) y sus puntos están amarrados al centro, como los de una matriz circular. No modela el contacto de los dientes. Si cambias `z` o `m`, vuelve a posicionar y a crear la relación.

## Cremallera

**Cremallera** (rueda y cremallera, grupo Restricciones): selecciona, en este orden, la línea radial de la rueda, la línea de la cremallera (o el suelo) y el punto que avanza, y teclea la razón: cuánto avanza el punto por cada radián que gira la rueda (con signo; el radio de la rueda. Una rueda que rueda hacia la derecha por el suelo gira en sentido horario, así que la razón es −radio). Para una rueda que rueda sin deslizar, el punto es su **centro** (no un punto del borde: la app lo comprueba y, si elegiste el extremo del borde de la línea de la rueda, usa el otro extremo); para un piñón con su cremallera, un punto de la cremallera. Arrastra la rueda o el punto y el otro se mueve con la razón. El piñón debe girar alrededor de un punto fijo (o ligado a uno con «Coincidente»). La línea de la cremallera da la dirección del avance. No modela el contacto de los dientes.

## Relaciones finitas

**Relaciones finitas** («Solo en los límites», en las propiedades de un elemento, en la lista de sus restricciones): por defecto una tangencia, un punto sobre una línea o un arco valen aunque los elementos no se vean en contacto (para el solver las líneas y los círculos son infinitos). Con la casilla encendida la relación solo vale mientras los elementos **se tocan gráficamente**: su punto de contacto cae dentro de los límites (el segmento entre sus extremos, el barrido del arco) y la separación es casi cero; fuera de eso, los elementos quedan libres. Si en un paso se atraviesan, se capturan. Con **Tope en bordes** (aparece al marcar «Solo en los límites») el elemento no queda libre al salirse por un borde: se detiene ahí (el punto en el extremo del segmento o del arco; en una tangencia, el extremo del segmento o del arco se apoya en el otro elemento) y la relación se retoma al volver hacia dentro. Sirve para ranuras y contactos que empiezan y terminan: una cruz de malta se arma con una relación «punto sobre línea» finita entre el perno y cada ranura (la cruz avanza una ranura por vuelta del impulsor). Con geometría ideal (a/d = sen(π/n)) el perno entra de frente por la boca; con otra, entra de lado y la cruz da un salto al capturarlo. Disponible en: punto sobre línea, punto sobre círculo o arco, tangente línea-círculo o arco y tangente entre arcos.

---

[← 8. Splines y trazados (levas y trayectorias)](08-splines-y-trazados.md) · [Índice](README.md) · [10. Estilo, capas y vista →](10-estilo-capas-y-vista.md)
