# 6. Cotas

Las cotas: medidas que conducen la geometría o solo la leen, con fórmulas, nombres, escala y unidades.

La lista completa de funciones y operadores, con ejemplos, está en [Funciones y operadores](funciones.md).

[← 5. Restricciones](05-restricciones.md) · [Índice](README.md) · [7. Texto y cálculo →](07-texto-y-calculo.md)

---

## Acotar (D)

**Acotar (D)** (después de Texto): una sola herramienta para todas las cotas. Toca los elementos y la cota se crea sola cuando la selección está completa: **2 puntos** o **punto y línea** dan la distancia; **2 líneas paralelas** (menos de 1° de diferencia), la distancia entre ellas; **2 líneas no paralelas**, el ángulo; **un arco**, el radio; **un círculo**, el diámetro; y **un arco o círculo con otro elemento** (punto, línea, otro arco o círculo, o una elipse), la distancia desde ese elemento hasta el centro. Para acotar un elemento contra un arco o círculo, toca primero el otro elemento y después el arco o círculo (un arco solo, tocado primero, da su radio), o selecciónalos antes de elegir la herramienta. Si ya había una selección al elegir Acotar, acota esa selección (una sola línea da su longitud). Toca de nuevo un elemento para quitarlo de la selección; Esc la borra.

## Distancia

2 puntos, 1 línea, punto + línea, **arco o círculo + otro elemento** (distancia desde ese elemento hasta el centro), o **2 líneas paralelas** (distancia perpendicular entre ellas; si no tenían la restricción Paralela, se agrega, salvo que la cota sea de referencia; se pide que estén paralelas con menos de 1° de diferencia).

## Ángulo

2 líneas. El valor no tiene límite (250°, 400° = una vuelta y 40°; ver [Ángulos sin límite](#ángulos-sin-límite) más abajo). El lugar donde la coloques decide el sector que se acota (por ejemplo 20° o 160°). Arrastra la cota para reubicarla.

## Radio / ⌀

Arco (R) o círculo (diámetro con el símbolo ⌀). Siguen la norma ANSI: con el texto dentro, la línea de cota va por el interior; con el texto fuera, una llamada radial con la flecha tocando desde afuera.

## Cota a escala

**Cota a escala** (distancias, radios y diámetros): escribe `valor[*k]` en el valor de la cota, p. ej. `4[*10]`. El **dibujo mide valor × k** (aquí 40 unidades) y la **cota dice el valor** («4»), <u>subrayada</u> como en ISO 129 / UNE 1-039; con `4[*0.1]` el dibujo mide 0,4 y la cota sigue diciendo «4». El valor puede ser una fórmula (`D1/2[*10]`) y **la escala también**: un número, una variable de texto (`30[*k]` con `k:25` en un texto) o una fórmula con cotas (`4[*2*D1]`); si cambia la variable, el dibujo se recalcula y la cota sigue diciendo 30. Las cotas de **solo lectura** también: al marcar «Solo lectura» aparece el campo **Escala (×)** (vacío = sin escala) y la cota dice la **medida ÷ escala**, subrayada y en cursiva (medida 13,333 con escala 10 dice «1,333»). La escala se muestra al editar la cota (`valor[*k]`, o en su campo) y desaparece al borrarla. No vale en ángulos.

## Cota con unidad

**Cota con unidad** (distancias, radios y diámetros): escribe el valor con su unidad, `126'in`. El **dibujo mide lo real** (una longitud en mm: `126'in` mide 3200,4; otra magnitud en el SI: `5'kN` mide 5000, `12'V` mide 12) y la **cota lo dice en su unidad**: «126 in». En la ventana de la cota, **Unidad de la cota** muestra y cambia la unidad: con un número lo convierte (`126'in` pasa a `3200,4'mm`); con una fórmula solo cambia la unidad del final (`D2*2'ft`). Una fórmula sin unidad al final dice la de una cota de la fórmula con la misma magnitud (`D2*2` con D2 en in dice in) o la del SI. Para verla más pequeña o más grande, usa la escala: `126'in[*0.1]` dibuja 320,04 y la cota sigue diciendo «126 in», subrayada. En una cota de **solo lectura**, la unidad solo cambia la etiqueta (una medida de 254 mm, con la unidad in, dice «10 in»).

**Escala con unidades** (escala de representación): para una magnitud que no es una longitud, la escala lleva unidades y la magnitud por la escala da la longitud del dibujo: `30'kN[*1'mm/kN]` mide 30 mm y la cota dice «30 kN», **sin subrayar** (no está fuera de escala, está a la escala que declaraste). La escala puede ser una variable de texto, `eF:1'mm/kN`, y cada cota o vector la usa con `[*eF]`: lee la eF definida antes en el orden de lectura, así que si la redefines más abajo (`eF:10'mm/kN`) cambia la escala de lo que queda debajo. Si la escala por la magnitud no da una longitud (`30'kN[*2'mm]`) avisa con ⚠. Sin escala, `30'kN` mide 30000 (en el SI) y la app lo avisa. Una cota de **solo lectura** con unidad de otra magnitud (kN) necesita una escala con unidades para leer la medida: dice «⚠ kN» hasta tenerla; con ella dice la medida entre la escala (45 mm con `1'mm/kN` dicen «45 kN»).

En las fórmulas y en los textos de cálculo una cota con unidad entra como **cantidad**: lo que dice su etiqueta, con su magnitud y sin la escala. Con D2 = 126 in y D4 = 20 in, `A:D2*D4=` da el área (en m²; `A='ft^2` la pide en ft²). Una cota sin unidad sigue entrando como número: para sumarla a una con unidad, dale la unidad en la fórmula, `D1'mm+D2` (`D1+D2` da ⚠).

## Solo lectura (referencia)

Mide y muestra el valor en cursiva sin restringir la geometría.

- Toca una cota una vez para **seleccionarla** (por ejemplo para borrarla), **arrástrala** para reposicionarla, y **toca dos veces** para editar su valor.

## Fórmulas

En cualquier cota se puede escribir una expresión: `3π/4`, `2π*5`, `10*sin(30)`, `10+1/3`, `√2`, `2^3`. Lo mismo vale dentro de las salidas `expr=` y de las asignaciones `x:...` de los textos. **Rangos** (vectores de números igualmente espaciados): `x:inicio..fin;n` define `x` con `n` elementos entre `inicio` y `fin` (ambos incluidos); `x:inicio..paso..fin` con `inicio`, `inicio+paso`... sin pasar de `fin` (el paso puede ser negativo). Cada parte puede ser una fórmula. `x=` muestra los elementos; un vector no se puede usar todavía dentro de una fórmula numérica (avisa). **Operadores**: `+ - * / ^` (también `×`, `÷`, `**`) y la multiplicación implícita (`2π`, `3(4+1)`). **Constantes**: `π` (o `pi`) y `e`. **Funciones de un valor**: `sin` (o `sen`), `cos`, `tan`, `sec`, `csc`, `cot` (en grados, o en radianes si el argumento lleva π o es un ángulo), `asin`, `acos`, `atan` (devuelven grados), `sinh`, `cosh`, `tanh`, `asinh`, `acosh`, `atanh`, `sqrt` (o `raiz`, `√`), `abs`, `exp`, `ln`, `log` (o `log10`), `deg(x)` (de radianes a grados), `rad(x)` (de grados a radianes), `floor` (`piso`), `ceil` (`techo`), `trunc` y `sign` (`signo`). **Funciones de varios valores**, separados con `;` (o con una coma seguida de espacio o tras una variable; `2,5` es el número 2,5): `round(x; n)` (`redondear`; `n` decimales, 0 si se omite; la mitad se aleja del cero), `min(a; b; ...)`, `max(a; b; ...)`, `clamp(x; mínimo; máximo)`, `mod(a; b)` (el resultado lleva el signo de `b`), `hypot(a; b; ...)`, `atan2(y; x)` (grados). **Comparaciones**: `< > <= >= == !=` (también `≤ ≥ ≠`) dan 1 si se cumplen y 0 si no (`==` y `!=` toleran el redondeo), y `if(condición; si_verdadero; si_falso)` (o `si`) elige entre dos valores: solo calcula la rama elegida, así que `if(D1==0; 0; 10/D1)` no falla. Los nombres de estas funciones no se pueden usar como nombre de cota o de variable, y tampoco `t` (el tiempo), `j`, `ω`, `θ` ni `α` (solo esas minúsculas), reservadas para los futuros motores, animaciones y cálculos dinámicos; por ahora no tienen valor.

## Nombres de cotas y fórmulas entre cotas

Cada cota tiene un nombre automático por tipo: **D** distancia, **A** ángulo, **R** radio de arco y **O** diámetro de círculo (D1, D2, A1, R1, O1...; el número no se reutiliza). Lo ves en el árbol de elementos y al tocar dos veces la cota, donde también puedes **cambiarlo** (letras, números y _; el nuevo nombre se actualiza en las fórmulas que lo usan). El nombre de una cota entra en la fórmula de otra: `D1*sin(3π/4)`, `D1/2+1`, `2*O1`. Al cambiar el valor de una cota, las que dependen de ella se recalculan solas y la geometría se vuelve a resolver; si el resultado es imposible (conflicto o una distancia o radio que quedaría en cero o negativo) se deshace todo y se avisa. Reglas: un **ángulo** entra en la fórmula como su medida en radianes (igual que π): `sin(A1)` funciona y `R1*A1` es la longitud de arco; las cotas de **solo lectura** (referencia) sí se pueden leer, ver abajo; no puede haber ciclos entre cotas conductoras (D1 depende de D2 y D2 de D1); un diámetro (O) vale el diámetro, no el radio. Si se borra una cota de la que dependía otra, esa queda con su valor actual y la app avisa.

## Cotas de solo lectura como entradas

La fórmula de una cota conductora puede leer una cota de referencia, es decir una medida de la geometría (la longitud de una línea, un ángulo, un radio). Como la medida depende de la geometría y esta de la cota, la app **resuelve y recalcula en vueltas** hasta que la fórmula concuerde con lo medido (método de la secante, y si no cierra, repetición amortiguada). Esto ocurre al editar una cota, al crear una y **mientras arrastras**, así que la cota de salida se mueve con el dibujo. Para que la salida no empuje a la entrada, **los puntos que miden las cotas de solo lectura que leen las fórmulas se dejan fijos** mientras se resuelve (en una evolvente, la cuerda D1 = R·A1 se alarga sin mover el punto tangente que mide A1); si el dibujo necesita que se muevan, la app lo reintenta sin fijarlos. Al arrastrar un mecanismo con fórmulas que leen medidas, un punto sobre un círculo que el mouse no puede alcanzar exactamente se atrae solo en la primera vuelta de cálculo. Si no se estabiliza (por ejemplo, una cota que se define como su propia medida + 1) se deshace y se avisa. Ejemplo: la rueda que rueda sin deslizar. **Gobierna el punto de tangencia T** (la entrada): D1 (solo lectura) mide la distancia del origen a T y A1 (conductora, en radianes) vale `D1/(O1/2)`. Al arrastrar T por el suelo, la rueda gira lo que avanza y el punto marcado P, que queda como salida, traza la cicloide, con varias vueltas. Conviene que la entrada sea la medida más estable (la posición de T) y la salida la que se calcula; hacerlo al revés (arrastrar P y que la distancia lea el ángulo) funciona, pero es mal condicionado cerca del suelo. **Límite**: un arrastre muy rápido puede dejar de converger en algún paso (se conserva el último estado bueno).

## Ángulos sin límite

Una cota angular ya no se queda entre 0° y 180°. Escribe 250° y la geometría queda a 250° (el arco se dibuja más allá de 180°); 400° es una vuelta y 40° (el arco muestra los 40°). Se mide en el sentido (antihorario u horario) en que se creó la cota. Una cota angular de **solo lectura** sigue la geometría sin saltar: al pasar de 180° a 190°, a 360° y a 400° va creciendo, y al volver baja de nuevo; para eso toma el equivalente más cercano al último valor, así que sigue bien mientras cada cambio sea de menos de media vuelta. Los dibujos viejos conservan su valor de 0° a 180° hasta que editas esa cota (tocándola dos veces) o la arrastras a otro sector, y de ahí en adelante es continua. En fórmulas un ángulo entra en radianes, también más allá de 2π.

## Grados o radianes

En cotas angulares hay un selector de unidad. En grados, sin/cos/tan usan grados (radianes si el argumento lleva π); en radianes, todo va en radianes. Las fórmulas de las cotas siempre leen grados; los **textos de cálculo** y las gráficas siguen la opción **Configuración → Ángulos en** (radianes en los dibujos nuevos, grados en los anteriores).

## Color de los puntos

Toca dos veces un punto y elige su color en la ventana de propiedades (paleta o color libre; «auto» vuelve al color normal). El color solo se ve en pantalla: los puntos no salen en las exportaciones.

## Etiqueta libre

**Etiqueta libre**: al final del valor de una cota, `["texto"]` cambia lo que dice: `50["D"]` mide 50 y gobierna el dibujo, pero se lee «D». Con `[$fórmula$]` o `[$$fórmula$$]` la etiqueta se dibuja con el motor de los textos (subíndices, griegas, fracciones): `50[$D/2$]`, `8[$r_1$]`. Se combina con la escala, en ese orden: `30[*1'mm/kN]["F"]`. Al editar la cota se ve completa; para quitarla, borra el corchete. En el SVG y el DXF una etiqueta con fórmula sale como texto plano.

## Tamaño de letra de las cotas

**Tamaño de letra de las cotas**: con **Configuración → Cotas con la letra de los textos** (activada en los documentos nuevos), la letra de las cotas se mide como la de los textos: en **puntos** con página y en unidades del dibujo sin ella, y las cotas crecen y se achican con el zoom junto con el dibujo, también al exportar. Desmarcada (los dibujos anteriores), la letra va en píxeles de pantalla y no cambia con el zoom. Se elige en **Estilo → Letra de cotas** (sin cotas seleccionadas cambia la del documento, que siguen todas las que no tienen una propia; con cotas seleccionadas, la suya) y en la ventana de cada cota (doble toque), en **Letra de la cota**. Las flechas y las separaciones crecen con la letra. Las cabezas de flecha siguen la norma ASME Y14.2: su largo es la altura de las cifras y su base, un tercio del largo (3:1), rellenas. Las líneas indicativas usan la misma flecha que las cotas del documento.

## Líneas indicativas

**Líneas indicativas** (anotaciones): con la herramienta de cota (o el botón Distancia), elige **un punto y el elemento al que pertenece**; se abre su ventana. Si el punto es un **extremo** de una línea, un arco, un arco elíptico o un spline abierto, **el elemento mismo pasa a ser la línea indicativa**: la flecha va en ese extremo, en la dirección de la curva; su color, tipo de línea y grosor son los del elemento (cámbialos en el panel Estilo, con la línea indicativa o el elemento seleccionado), y el elemento no sale en el SVG de corte láser. Si el punto es el centro de un círculo o arco, o un punto intermedio, se dibuja una línea recta propia con la flecha en el punto y el estilo del panel. La **etiqueta es un texto del dibujo**: su altura va en unidades del dibujo, como la de los textos, y su flecha es la misma de las cotas del documento. En su ventana (al crearla y con doble toque) eliges la etiqueta (texto suelto, `"texto"`, `$fórmula$` o `$$fórmula$$`), **dónde va** (en una recta, un arco o un arco elíptico: un extremo o el punto medio; en un spline, cualquiera de sus puntos), el **punto de inserción** de su caja (esquinas, medios o centro, como en los textos; queda separada del punto un cuarto de altura), la **fuente** y la **altura** (con hoja, en puntos, como los textos; nace con la fuente y la altura de los textos nuevos). También puedes arrastrar la etiqueta: salta al lugar permitido más cercano. Si la geometría se mueve, la acompaña. No restringe nada: el solver no la ve, y se borra con su punto o su elemento (borrarla deja el elemento). Sale en el SVG y en el DXF, con la fórmula dibujada.

---

[← 5. Restricciones](05-restricciones.md) · [Índice](README.md) · [7. Texto y cálculo →](07-texto-y-calculo.md)
