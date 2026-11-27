# 3. Seleccionar y editar

Seleccionar (con toque, cuadro o filtro), ver y cambiar las propiedades de un elemento, y las herramientas que modifican lo dibujado: copiar, recortar, extender, redondeo y chaflán.

[← 2. Dibujar](02-dibujar.md) · [Índice](README.md) · [4. Dividir, copiar y repetir →](04-dividir-copiar-y-repetir.md)

---

## Seleccionar (V)

![Seleccionar](icons/select.svg) **Seleccionar (V)** selecciona y arrastra puntos, líneas o el borde de un círculo (el mecanismo se mueve según las restricciones).

**Cuadro de selección.** Arrastrando desde un lugar vacío, selecciona con un cuadro. El cuadro de izquierda a derecha toma lo que queda entero dentro; de derecha a izquierda, también lo que toca.

**Gráficas.** Las **gráficas** entran en la selección: una sola queda como al tocarla; varias, o con otros elementos, se resaltan, se borran y se mueven junto con ellos.

### Varios elementos seleccionados

Con **varios elementos seleccionados**, arrastrar cualquiera de ellos mueve todos juntos: sus puntos libres (extremos, centros, puntos de control y el punto de inserción de los textos).

**Qué no se mueve.** Los puntos fijos y las marcas de referencia se quedan donde están, y las restricciones siguen valiendo, así que lo que está ligado a algo fijo se acomoda en vez de trasladarse.

**Un solo elemento.** Con un solo elemento seleccionado, arrastrar es como siempre (el borde de un círculo cambia su radio).

## Filtrar

![Filtrar](icons/filter.svg) **Filtrar** (en el [desplegable](desplegables.md#seleccionar) de Seleccionar) elige qué se puede seleccionar.

- **Por entidades:** puntos, líneas, círculos, arcos, elipses, splines, textos, rellenos, cotas.
- **Por tipo de línea.**
  Si no marcas **ningún** tipo de línea, no se filtra por tipo (así puedes quedarte solo con líneas, o solo con cotas, sin elegir un tipo). Y si no marcas **ninguna entidad** y eliges un tipo de línea, se toman las líneas, círculos, arcos, elipses y splines de ese tipo.

**Alcance.** Vale para tocar y para el cuadro de selección. Con un filtro activo que deja pasar las cotas y restricciones, el cuadro también las toma (por su etiqueta); sin filtro, el cuadro sigue tomando solo elementos. Con un filtro activo que deja pasar las cotas y restricciones, el cuadro también las toma (por su etiqueta); sin filtro, el cuadro sigue tomando solo elementos.

**Indicador.** Un punto rojo en el botón indica que hay filtro activo.

## Selección con cuadro

Con la herramienta Seleccionar, arrastra desde un lugar vacío.

- **De izquierda a derecha** (cuadro azul, línea continua): se seleccionan los elementos que quedan **completamente dentro**.
- **De derecha a izquierda** (cuadro naranja, línea discontinua): también los que el cuadro **toca**.

**Mayús.** Con Mayús se suma a la selección.

**Alcance.** Alcanza puntos, líneas, círculos, arcos, splines y textos (un texto por su punto de inserción).

**Con el dedo.** Con el dedo, activa *Dedo dibuja*, porque si no el dedo desplaza el lienzo.

## Elementos superpuestos

**Elementos superpuestos** (herramienta Seleccionar) sirve cuando varios elementos comparten lugar o quedan casi encima (puntos coincidentes, centros de círculos o arcos concéntricos, líneas colineales).

### Abrir la lista

**Toca y mantén** unos 0,7 s sobre ellos: se abre una ventana flotante con la lista de todos los que están cerca del toque, del más cercano al más lejano. Marca los que quieras: se resaltan en naranja en el dibujo para identificarlos.

### Botones de la ventana

- **Confirmar:** los deja seleccionados (los que ya tenías seleccionados fuera de esa lista se conservan).
- **Cancelar** (o Esc): cierra sin cambiar nada.
- **Todos** / **Ninguno:** marca la lista entera.
- **Propiedades** (activo cuando hay un solo elemento marcado): lo deja seleccionado y abre su ventana de propiedades sin cerrar la lista; es la forma de editarlo sin que un toque extra deshaga la selección.

### Detalles

**Mover la ventana.** Se mueve arrastrando su barra de título, para despejar la zona de trabajo (queda donde la dejes).

**Un solo elemento.** Con un solo elemento bajo el dedo no aparece: sigue la lupa de siempre.

**Filtro.** Respeta el filtro de selección.

## Propiedades

**Propiedades:** toca **dos veces** un punto, línea, círculo, arco, elipse, spline, texto o relleno y se abre su ventana de propiedades (sobre una cota, el doble toque sigue editando su valor).

### Qué muestra según el elemento

- **Cualquier elemento:** **capa**, **color**, **tipo de línea**, **grosor** y **escala del patrón**.
- **Texto:** todas sus opciones: el contenido, el **color de fuente** o **de fondo** (las mismas muestras; se elige cuál con dos botones de radio), la **fuente**, la **altura**, el ángulo, **alinear con** una línea, **legible** y el **punto de inserción**. Si hay más textos seleccionados, el cambio se aplica a todos.
- **Punto:** su **color**, su **nombre** (para llamarlo en las fórmulas: `ini.x`, `p_(fin).y`; ver [Propiedades con «.»](07-texto-y-calculo.md)), sus coordenadas X e Y, si está fijo y su **[marca de referencia](05-restricciones.md#marca-de-referencia)**.
- **[Vector](02-dibujar.md#vector-w):** su **magnitud** (valor o fórmula; escribirla la fija), si está fija o es de solo lectura y su nombre.

### Restricciones y cotas

También lista las **restricciones y cotas** del elemento, cada una con **Quitar**, y ofrece las que se pueden agregar a ese elemento solo:

- **Línea:** horizontal, vertical, longitud y fijar.
- **Círculo:** diámetro y fijar.
- **Arco:** radio.

Los cambios se aplican al momento y se pueden deshacer.

## Borrar (Supr)

Borra lo seleccionado. Al borrar una línea, un círculo, un arco, una elipse o un spline también se van **sus puntos que ya no usa nada**: ni otro elemento, ni un texto, ni una relación o una cota. Da igual que «Puntos» esté visible o no (un cuadro de selección toma los puntos solo si se ven, y antes eso decidía si quedaban «puntos sueltos»). Lo que genera un script no se borra a mano.

## Copiar / Pegar

![Copiar](icons/copy.svg) ![Pegar](icons/paste.svg) **Copiar / Pegar** (en el [desplegable](desplegables.md#copiar-y-pegar); Ctrl+C y Ctrl+V): el botón muestra Copiar, y después de copiar pasa a mostrar Pegar (para copiar de nuevo usa Ctrl+C o el desplegable).

**Copiar** guarda la selección con sus restricciones internas.

**Pegar** pide un punto y deja el centro del cuadro que encierra lo copiado en ese punto (se ve el cuadro mientras mueves). Se puede pegar varias veces; Esc o Seleccionar termina.

**Conservación.** Lo copiado se conserva aunque borres el original, pero se pierde al cerrar la app.

## Recortar (X)

![Recortar](icons/trim.svg) **Recortar (X)**: mantén presionado y arrastra sobre los tramos que quieres quitar (entre los cruces con otros elementos).

**Un tramo.** Un toque recorta un tramo. Solo se quita ese tramo: el resto del elemento no se divide en los demás cruces. Sin cruces, borra el elemento completo.

### Elipses y splines

También recorta **elipses** y **splines**:

- **Elipse completa:** necesita 2 cruces y queda como arco elíptico.
- **Arco elíptico:** se acorta o se parte en dos que comparten centro y ejes.
- **Spline:** cada trozo es un spline nuevo que pasa por el corte, por los puntos originales y por puntos extra tomados de la curva para conservar la forma; es una aproximación muy cercana, no exacta.

## Extender (E)

![Extender](icons/extend.svg) **Extender (E)**: toca un segmento o arco cerca del extremo que quieres alargar; llega hasta el primer elemento que encuentre, incluidas elipses, arcos elípticos y splines.

**Spline abierto.** Un spline abierto también se extiende: se alarga en línea recta, en la dirección de su tangente en ese extremo, y el nuevo punto final queda sobre el elemento que encuentra (un spline con relaciones no se extiende).

**Extender de nuevo.** Al extender de nuevo, el mismo extremo se desplaza al siguiente cruce (no deja puntos en los anteriores).

## Redondeo (F) y Chaflán

![Redondeo](icons/fillet.svg) ![Chaflán](icons/chamfer.svg) **Redondeo (F) y Chaflán** (botón después de [Polígono](02-dibujar.md#polígono-g); toca de nuevo o mantén presionado para elegir) une **dos elementos de trazo** con un arco tangente (redondeo) o con una línea (chaflán).

**Qué se une.** Segmentos, arcos y arcos elípticos, en cualquier combinación; las líneas constructivas no cuentan.

### Tres formas de elegirlos

1. Toca el punto de una **esquina** (donde terminan dos elementos, o dos puntos unidos por una restricción de coincidencia) y teclea el **radio** o la **distancia** del chaflán.
2. Toca un elemento y luego el otro, **del lado que quieres conservar**, aunque no se junten en una esquina. Si se cruzan o ni se tocan, el redondeo alarga o recorta cada uno hasta su punto de tangencia; el chaflán necesita que se corten, ellos o sus prolongaciones.
3. **Selecciona antes de elegir la herramienta** uno o varios puntos de esquina (el mismo valor para todas, por ejemplo las cuatro de un rectángulo) o exactamente dos elementos (se conserva la parte hacia el extremo más lejano del vértice).

### El valor

El valor puede ser una fórmula (`R1/2`, `m*0.3`). De las soluciones posibles gana el arco menor que media vuelta más cercano al vértice, sin importar el orden en que eliges los elementos.

### Cotas que quedan

- **Redondeo:** es un arco con su **cota de radio** (editable: cambiarla mueve el arco; en las propiedades del arco, el botón **Radio** edita esa misma cota).
- **Chaflán:** lleva una **cota por tramo** (D1, D2...; pueden ser distintas), medida en recta desde el vértice.

### El vértice

En una esquina de dos líneas que comparten el punto, **el punto no se borra**: queda como vértice virtual sobre las dos rectas, y valen las cotas y restricciones que lo usaban. Entre otros elementos, el vértice (si se cortan) queda como punto virtual oculto.

**Recorte de segmentos.** Al recortar un segmento por esa vía se quitan sus cotas de longitud y su igualdad de longitud (ya no valen) y se avisa.

### Avisos y límites

- Con elementos sueltos, al cambiar el radio el solver puede deformarlos: conviene fijar o acotar lo que no debe moverse.
- Si el valor no cabe, avisa.
- Un relleno que usaba los dos elementos incluye el arco o el chaflán.
- No se redondean círculos ni elipses completas (recorta antes la elipse) ni vectores.

## Textos e imágenes bloqueadas

**Textos e imágenes bloqueadas**: un toque **no selecciona un texto** (en documentos con muchos textos se agarraban y movían sin querer).

### Editar un texto en el lugar

Un toque lo **edita en el lugar**, con la misma entrada de la herramienta [Texto](07-texto-y-calculo.md#escribir-un-texto-t) encima de él y el cursor donde tocaste (una ecuación sin sus `$$`, un texto normal tal cual, un script con su código).

- **Enter** guarda (en un script, Shift+Enter).
- **Shift+Enter** hace otra línea.
- **Tocar fuera** también guarda.
- **Esc** lo deja como estaba.

Si lo escrito da un error, se avisa y la entrada sigue abierta para corregirlo.

**Objeto de código colapsado.** Un objeto de código colapsado (una biblioteca insertada, o un script sin «Mostrar el código en el dibujo») no se edita así: el toque pasa a lo que haya debajo (una línea, un punto); se abre con doble toque, en sus propiedades.

### Seleccionar un texto

Para seleccionar un texto, **enciérralo con un cuadro**, arrastrando desde él o desde un lugar vacío (de izquierda a derecha debe quedar entero dentro; de derecha a izquierda basta con tocarlo); ya seleccionado, se arrastra para moverlo.

**Doble toque y enlaces.** El **doble toque** sigue abriendo sus propiedades, y un toque sobre un **enlace** selecciona el texto y muestra la pastilla con su destino (sin abrirlo).

### Imágenes

Una imagen tiene un **punto de inserción**, como un texto: un punto real que se ve al seleccionarla, admite restricciones y se lee en las fórmulas (`p12.x`). En sus propiedades se elige su anclaje (9 posiciones), y al agrandarla o achicarla ese punto queda fijo.

**Imagen bloqueada.** Una **imagen bloqueada** (casilla «Bloqueada» en sus propiedades) sigue la misma regla: el toque y el arrastre la ignoran, y el doble toque abre sus propiedades para desbloquearla.

---

[← 2. Dibujar](02-dibujar.md) · [Índice](README.md) · [4. Dividir, copiar y repetir →](04-dividir-copiar-y-repetir.md)
