# 3. Seleccionar y editar

Seleccionar (con toque, cuadro o filtro), ver y cambiar las propiedades de un elemento, y las herramientas que modifican lo dibujado: copiar, recortar, extender, redondeo y chaflán.

[← 2. Dibujar](02-dibujar.md) · [Índice](README.md) · [4. Dividir, copiar y repetir →](04-dividir-copiar-y-repetir.md)

---

## Seleccionar (V)

Selecciona, arrastra puntos, líneas o el borde de un círculo (el mecanismo se mueve según las restricciones) y, arrastrando desde un lugar vacío, selecciona con un cuadro. El cuadro de izquierda a derecha toma lo que queda entero dentro; de derecha a izquierda, también lo que toca. Las **gráficas** entran en la selección (una sola queda como al tocarla; varias, o con otros elementos, se resaltan, se borran y se mueven junto con ellos).

Con **varios elementos seleccionados**, arrastrar cualquiera de ellos mueve todos juntos: sus puntos libres (extremos, centros, puntos de control y el punto de inserción de los textos). Los puntos fijos y las marcas de referencia se quedan donde están, y las restricciones siguen valiendo, así que lo que está ligado a algo fijo se acomoda en vez de trasladarse. Con un solo elemento seleccionado, arrastrar es como siempre (el borde de un círculo cambia su radio).

## Filtrar

**Filtrar** (en el desplegable de Seleccionar): elige qué se puede seleccionar, por entidades (puntos, líneas, círculos, arcos, elipses, splines, textos, rellenos, cotas) y por tipo de línea. Vale para tocar y para el cuadro de selección. Un punto rojo en el botón indica que hay filtro activo.

## Selección con cuadro

Con la herramienta Seleccionar, arrastra desde un lugar vacío. De **izquierda a derecha** (cuadro azul, línea continua) se seleccionan los elementos que quedan **completamente dentro**; de **derecha a izquierda** (cuadro naranja, línea discontinua) también los que el cuadro **toca**. Con Mayús se suma a la selección. Alcanza puntos, líneas, círculos, arcos, splines y textos (un texto por su punto de inserción). Con el dedo, activa *Dedo dibuja*, porque si no el dedo desplaza el lienzo.

## Elementos superpuestos

**Elementos superpuestos** (herramienta Seleccionar): cuando varios elementos comparten lugar o quedan casi encima (puntos coincidentes, centros de círculos o arcos concéntricos, líneas colineales), **toca y mantén** unos 0,7 s sobre ellos: se abre una ventana flotante con la lista de todos los que están cerca del toque, del más cercano al más lejano. Marca los que quieras: se resaltan en naranja en el dibujo para identificarlos. **Confirmar** los deja seleccionados (los que ya tenías seleccionados fuera de esa lista se conservan) y **Cancelar** (o Esc) cierra sin cambiar nada. «Todos» / «Ninguno» marca la lista entera. **Propiedades** (activo cuando hay un solo elemento marcado) lo deja seleccionado y abre su ventana de propiedades sin cerrar la lista; es la forma de editarlo sin que un toque extra deshaga la selección. Se mueve arrastrando su barra de título, para despejar la zona de trabajo (queda donde la dejes). Con un solo elemento bajo el dedo no aparece: sigue la lupa de siempre. Respeta el filtro de selección.

## Propiedades

Toca **dos veces** un punto, línea, círculo, arco, elipse, spline, texto o relleno y se abre su ventana de propiedades (sobre una cota, el doble toque sigue editando su valor). Según el elemento: **capa**, **color**, **tipo de línea**, **grosor** y **escala del patrón**; en un texto, todas sus opciones: el contenido, el **color de fuente** o **de fondo** (las mismas muestras; se elige cuál con dos botones de radio), la **fuente**, la **altura**, el ángulo, **alinear con** una línea, **legible** y el **punto de inserción** (si hay más textos seleccionados, el cambio se aplica a todos); en un punto, su **color**, sus coordenadas X e Y, si está fijo y su **marca de referencia**; en un **vector**, su **magnitud** (valor o fórmula; escribirla la fija), si está fija o es de solo lectura y su nombre. También lista las **restricciones y cotas** del elemento, cada una con «Quitar», y ofrece las que se pueden agregar a ese elemento solo (línea: horizontal, vertical, longitud y fijar; círculo: diámetro y fijar; arco: radio). Los cambios se aplican al momento y se pueden deshacer.

## Copiar / Pegar

**Copiar / Pegar** (desplegable; Ctrl+C y Ctrl+V): el botón muestra Copiar, y después de copiar pasa a mostrar Pegar (para copiar de nuevo usa Ctrl+C o el desplegable). Copiar guarda la selección con sus restricciones internas; Pegar pide un punto y deja el centro del cuadro que encierra lo copiado en ese punto (se ve el cuadro mientras mueves). Se puede pegar varias veces; Esc o Seleccionar termina. Lo copiado se conserva aunque borres el original, pero se pierde al cerrar la app.

## Recortar (X)

Mantén presionado y arrastra sobre los tramos que quieres quitar (entre los cruces con otros elementos). Un toque recorta un tramo. Solo se quita ese tramo: el resto del elemento no se divide en los demás cruces. Sin cruces, borra el elemento completo. También recorta **elipses** (una elipse completa necesita 2 cruces y queda como arco elíptico; un arco elíptico se acorta o se parte en dos que comparten centro y ejes) y **splines** (cada trozo es un spline nuevo que pasa por el corte, por los puntos originales y por puntos extra tomados de la curva para conservar la forma; es una aproximación muy cercana, no exacta).

## Extender (E)

Toca un segmento o arco cerca del extremo que quieres alargar; llega hasta el primer elemento que encuentre, incluidas elipses, arcos elípticos y splines. Un spline abierto también se extiende: se alarga en línea recta, en la dirección de su tangente en ese extremo, y el nuevo punto final queda sobre el elemento que encuentra (un spline con relaciones no se extiende). Al extender de nuevo, el mismo extremo se desplaza al siguiente cruce (no deja puntos en los anteriores).

## Redondeo (F) y Chaflán

**Redondeo (F) y Chaflán** (botón después de Polígono; toca de nuevo o mantén presionado para elegir): une **dos elementos de trazo** (segmentos, arcos y arcos elípticos, en cualquier combinación; las líneas constructivas no cuentan) con un arco tangente (redondeo) o con una línea (chaflán). Tres formas de elegirlos: **(1)** toca el punto de una **esquina** (donde terminan dos elementos, o dos puntos unidos por una restricción de coincidencia) y teclea el **radio** o la **distancia** del chaflán; **(2)** toca un elemento y luego el otro, **del lado que quieres conservar**, aunque no se junten en una esquina (se cruzan o ni se tocan: el redondeo alarga o recorta cada uno hasta su punto de tangencia; el chaflán necesita que se corten, ellos o sus prolongaciones); **(3)** **selecciona antes de elegir la herramienta** uno o varios puntos de esquina (el mismo valor para todas, por ejemplo las cuatro de un rectángulo) o exactamente dos elementos (se conserva la parte hacia el extremo más lejano del vértice). El valor puede ser una fórmula (`R1/2`, `m*0.3`). De las soluciones posibles gana el arco menor que media vuelta más cercano al vértice, sin importar el orden en que eliges los elementos. El redondeo es un arco con su **cota de radio** (editable: cambiarla mueve el arco; en las propiedades del arco, el botón «Radio» edita esa misma cota); el chaflán lleva una **cota por tramo** (D1, D2...; pueden ser distintas), medida en recta desde el vértice. En una esquina de dos líneas que comparten el punto, **el punto no se borra**: queda como vértice virtual sobre las dos rectas, y valen las cotas y restricciones que lo usaban; entre otros elementos, el vértice (si se cortan) queda como punto virtual oculto. Al recortar un segmento por esa vía se quitan sus cotas de longitud y su igualdad de longitud (ya no valen) y se avisa. Con elementos sueltos, al cambiar el radio el solver puede deformarlos: conviene fijar o acotar lo que no debe moverse. Si el valor no cabe, avisa. Un relleno que usaba los dos elementos incluye el arco o el chaflán. No se redondean círculos ni elipses completas (recorta antes la elipse) ni vectores.

---

[← 2. Dibujar](02-dibujar.md) · [Índice](README.md) · [4. Dividir, copiar y repetir →](04-dividir-copiar-y-repetir.md)
