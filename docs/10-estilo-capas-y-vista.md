# 10. Estilo, capas y vista

Color, tipo de línea, grosor y rellenos; capas; lo que muestra la vista; y el árbol de elementos.

[← 9. Simulaciones gráficas](09-simulaciones-graficas.md) · [Índice](README.md) · [11. Archivo y exportación →](11-archivo-y-exportacion.md)

---

## Estilo

Color, tipo de línea (continua, oculta, eje, fantasma, discontinua, punteada, traza y punto, o uno nuevo con su patrón) y grosor (fino, normal, grueso). Aplica a la selección y a lo nuevo.

## Relleno / achurado

Sobre un contorno cerrado (líneas, arcos o círculo): líneas, cruzado o sólido, con ángulo, separación y opacidad.

## Capas

**Capas** (esquina superior izquierda del dibujo): abre la lista de capas. Al principio no hay ninguna y lo que dibujas no pertenece a ninguna capa. **Crear capa** la hace la **capa actual** (círculo marcado): lo que dibujes después, incluidos puntos, textos y rellenos, queda en ella; la fila «Ninguna» vuelve a dibujar sin capa. El ojo **apaga o enciende** la capa (apagada, sus elementos, los puntos que solo ellos usan y sus restricciones y cotas no se ven, no se seleccionan, no cortan al recortar o extender y no se exportan; siguen existiendo y el solver los respeta). El bote **borra** la capa y sus elementos pasan a «ninguna». Puedes renombrarla en su fila. Apagar la capa actual la deja sin capa actual. Para cambiar la capa de un elemento, toca dos veces sobre él. Copiar y pegar, dividir y recortar conservan la capa del original. Cuando hay una **capa actual**, su nombre aparece bajo el botón Capas.

## Vista

Cuadrícula, imán (a la cuadrícula), bloqueo suave (y cada cuántos grados), tiempo del imán a intersecciones, mostrar u ocultar restricciones, puntos, cotas y textos, dedo dibuja, etiquetas del panel y escala de los trazos. En la esquina inferior izquierda del dibujo se ve en cursiva la **versión de la app y su build**, el commit desde el que se compiló (por ejemplo *v1.6.1 7bc0108*; con «+» si tenía cambios sin commitear), para saber exactamente qué compilación corre cada dispositivo. En la esquina superior derecha se ve el **nombre del archivo actual** (o «sin nombre»).

## Árbol de elementos

**Árbol de elementos** (primer botón de la barra): lista líneas, círculos, arcos, splines, textos, rellenos, puntos y relaciones. Toca un elemento para seleccionarlo y ver sus puntos y restricciones. Cada cosa tiene un solo lugar propio: un punto vive en el primer elemento que lo usa (los centros, en su círculo) y en los demás aparece como enlace *↗* («↗ Punto p1 (en Círculo c2)»); en «Puntos sueltos» solo quedan los que no son de ningún elemento. Las relaciones viven en «Relaciones y cotas», separadas en Cotas, Geométricas, Mecánicas y Automáticas. Las automáticas se agrupan por la operación que las creó, numerada en el orden en que se hizo («Matriz circular 2», «Redondeo 1», «Copia espejo 1», «Chaflán», «División», «Polígono»), y las de formas fijas y vectores por su elemento; las que no tienen origen (dibujos hechos antes de esta versión, o las que pone el imán al dibujar sobre un elemento) se agrupan por tipo; bajo cada elemento hay una sola fila «Relaciones (n)» con enlaces a las suyas y a las de sus puntos, que además cuenta las automáticas. Tocar un enlace selecciona el elemento y abre su lugar propio. Si el dibujo tiene capas, el botón de capas del encabezado agrupa el árbol **por capa**: primero cada capa (también las vacías), con su ojo para encenderla o apagarla, y dentro de ella los mismos grupos por tipo; luego «Sin capa» y las relaciones, actuadores, gráficas y trazados, que no tienen capa. Un punto sigue a su elemento aunque esté en otra capa. El grupo **Contornos** junta las líneas y arcos de trazo (no constructivos), arcos elípticos y splines abiertas encadenados por sus extremos: «Contorno 2 · cerrado · 4 líneas, 2 arcos» (cerrado, abierto o ramificado si en un nudo se juntan tres o más). Dos extremos se tocan si son el mismo punto, si los ata una coincidencia o si están en el mismo lugar sin nada que los ate: esas se avisan («1 unión sin restricción»), porque al mover el dibujo se pueden abrir; para atarlas, pon una coincidencia. Tocar un contorno selecciona todos sus elementos; dentro van como enlaces, en el orden en que se recorren. Si un extremo libre queda cerca de otro (hasta el 1 % del tamaño del dibujo), el contorno dice cuánto mide esa **abertura** y con qué contorno («abertura 0.0143 con el 2»), o «entre sus extremos» si casi se cierra solo: es la razón típica de que un perfil que debería ser cerrado salga abierto.

---

[← 9. Simulaciones gráficas](09-simulaciones-graficas.md) · [Índice](README.md) · [11. Archivo y exportación →](11-archivo-y-exportacion.md)
