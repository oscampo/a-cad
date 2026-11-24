# 13. Límites conocidos

Lo que la app todavía no hace o hace con condiciones. Conviene leerlo antes de un trabajo grande.

[← 12. Atajos de teclado](12-atajos-de-teclado.md) · [Índice](README.md) · [14. Acerca de →](14-acerca-de.md)

---

## Elipses y splines

- La ![Elipse](icons/ellipse.svg) elipse no admite intersecciones ni tangencia con splines. Los cruces de una elipse con un spline u otra elipse, al recortar o extender, se calculan sobre la curva dibujada (aproximación muy cercana, no exacta).
- Una tangencia con un spline puede no converger si el punto de contacto arranca muy lejos de la solución (la app lo arranca en el punto más cercano).

### Spline recortado

Un spline recortado conserva su número de puntos y los reparte a distancias iguales sobre lo que queda (si el corte lo parte en dos, se reparten según la longitud de cada trozo). Se parece mucho al original, pero no es idéntico.

- Si el spline tiene pocos puntos y con ellos se apartaría de la curva (más de 0,1 % de su tamaño), se agregan los necesarios.
- Si tiene relaciones o alguno de sus puntos está fijo o lo usa otro elemento, los puntos no se mueven y solo se agregan unos pocos junto al corte.

## Solver y restricciones

- Las copias de una matriz circular y las simetrías no cargan al solver: un punto que solo es copia de otro se calcula de su fuente después de resolver (el solver tiene memoria fija y se agotaba con unos 220 puntos copiados). Si le pones otra restricción a un punto copia, o lo usas en una curva con relaciones (punto sobre spline, tangencia), vuelve a ser incógnita y cuenta contra ese tope.
- Si el solver no converge o hay restricciones en conflicto, la acción se deshace con un aviso.

## Dibujo, acotar y copias

- El punto medio como imán de dibujo solo se ofrece en líneas (no en arcos, elipses ni splines) y no en líneas muy cortas en pantalla.
- Acotar: un spline no se puede acotar contra un arco o círculo (no tiene centro), y la distancia entre dos líneas paralelas no lleva signo.
- La división en partes iguales de arcos y círculos no deja restricción de igual ángulo.
- Las cotas angulares de una matriz circular no se editan a mano (se rehace la matriz); la distancia de una matriz lineal sí.

## Capas

Las ![Capas](icons/layers.svg) [capas](10-estilo-capas-y-vista.md#capas) solo agrupan elementos (visibilidad y capa actual); no tienen color ni tipo de línea propios.

Un punto que forma parte de un elemento sigue la capa de ese elemento. Cambiar la capa de una selección completa hay que hacerlo elemento por elemento, desde su ventana de propiedades.

Una restricción o cota que une un elemento visible con uno oculto se oculta también mientras la capa esté apagada.

## Gráficas con simulación en Chrome del iPad

Calcular una gráfica que simula el mecanismo (por ejemplo `p41.y vs p41.x` con actuadores) puede cerrar la página en Chrome del iPad; en Safari, en PC y en el celular funciona.

**Lo observado.** Con el dibujo de prueba `prueba-simulaciones.json`: si la página se cerró calculando, al reabrir las gráficas quedan «en pausa» con un aviso del avance alcanzado, y volver a calcular (un toque sobre la gráfica) puede fallar otra vez, cada vez, con el dibujo guardado automáticamente. El mismo archivo abierto desde [GitHub](11-archivo-y-exportacion.md#github) ([Abrir](11-archivo-y-exportacion.md#guardar--abrir)) carga sin problema.

**Lo que no falla.** Mover o redimensionar la gráfica, y hacer pan o zoom, no fallan (no recalculan).

**Causa.** Aún no está confirmada.

**Mientras tanto.** Abre el archivo desde GitHub en lugar de reabrir el guardado automático, o usa Safari.

---

[← 12. Atajos de teclado](12-atajos-de-teclado.md) · [Índice](README.md) · [14. Acerca de →](14-acerca-de.md)
