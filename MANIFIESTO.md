# Manifiesto de diseño de A-CAD

Versión del 2026-11-27, escrita a partir del CHANGELOG (v1.0.0 a v2.9.6) y de las decisiones registradas en el segundo cerebro, y revisada por Oscar principio por principio. No inventa principios: cada uno nace de algo que ya se decidió, se corrigió o se rompió. Si un principio no tiene ese respaldo, no entra.

Sirve para dos cosas: decidir rápido cuando una función nueva tiene varias formas posibles, y detectar cuándo una propuesta (de Oscar o de Claude) contradice lo que ya se acordó.

---

## Qué es A-CAD

Un cuaderno de dibujo técnico paramétrico para tablet, celular y navegador, donde **geometría, cálculo y texto viven en el mismo documento** y se resuelven juntos. Nació el 2026-11-09 como un Updraw propio para el iPad de Oscar (PWA, solver PlaneGCS) y creció hacia algo más cercano a SMath más CAD: el dibujo es a la vez plano, hoja de cálculo y material de clase.

Lo usa un profesor para enseñar y para producir sus propios documentos. Eso decide mucho: el rigor importa más que el catálogo de funciones, y la lectura de un dibujo dentro de un año importa tanto como su edición hoy.

## Lo que A-CAD no es

- No es un CAD de producción 3D ni compite con SolidWorks. Es 2D, exacto y legible.
- No es un programa de scripts con un dibujo de adorno. El script sirve al dibujo, no al revés.
- No busca tener todas las funciones. Cada función nueva paga un costo en ayuda, traducción, pruebas y compatibilidad (ver principio 9).

---

## Los principios

### 1. El dibujo es el documento
Geometría, texto, cálculo, gráficas y cotas son un solo objeto que se guarda y se abre junto. No hay un «modelo» separado de su documentación.
*Se lee como un artículo académico.* El orden de lectura (arriba a abajo, izquierda a derecha) es la regla de evaluación de todo, incluidas las gráficas (#2634) y las escalas con variables. Como en un paper («sea a una variable que vale 10; sea f(x)=3x; sea ahora b=f(5)…»), en cualquier punto de la lectura el lector sabe cuánto vale cada cosa, y si más adelante se redefine, desde ahí vale lo nuevo. Esa jerarquía temporal le da orden al trabajo: el dibujo se puede leer, explicar y revisar de principio a fin sin saltos.
*Consecuencia:* lo que está más abajo no puede influir en lo de arriba. Usar algo antes de definirlo da error (⚠), nunca un valor adivinado. Reordenar el dibujo es reordenar el argumento, y la app lo hace visible en vez de callarlo.

### 2. Exacto cuando la matemática lo permite; si no, aproximado con la diferencia declarada
Si el solver puede resolver algo de forma exacta, no se aproxima. Tangencias y puntos sobre spline se resuelven con restricciones, no con tolerancia visual. Las elipses y los arcos elípticos son objetos exactos (`ellipse`, `earc`), no splines que se parecen (#2785). El snap de tangencia calcula la forma real de lo que se mueve; el primer intento, que pegaba al borde, dejaba la línea «secante» (v2.9.6) y se descartó.
Cuando no existe solución cerrada (cruces de una elipse con un spline, un spline recortado), se aproxima, pero **la aproximación es pequeña, está acotada y se dice** (por ejemplo, en `13-limites-conocidos.md`). Nunca se presenta como exacta.
*Evidencia, el dibujo del acetábulo (#2715 a #2720):* al corregir la construcción (proyectores cruzados, profundidad de un punto), la solución gráfica y la matemática coincidieron con una diferencia de 1,6e-12. Esa es la medida de «exacto» en A-CAD: lo que sobra es ruido de coma flotante, no error de método. De ahí nació el `≈0` (principio 3).
*Prueba de aplicación:* si una diferencia se ve al acercar con zoom y nadie la declaró, está mal. Si está declarada y acotada, es una decisión de diseño.

### 3. Lo real se mide en lo real
El dibujo mide el mundo, no la pantalla. Una cota con unidad guarda la magnitud real (`126'in` mide 3200,4 mm y dice «126 in»); la escala es un dato aparte (#2645). Los ángulos tienen unidad explícita y declarada por documento: **la unidad por defecto depende del dibujo, no de la app** (los nuevos calculan en radianes, los anteriores siguen en grados), y por eso el mismo `sin(90)` puede dar resultados distintos en dos dibujos; cada uno dice en qué trabaja.
Un resultado que es ruido de redondeo se muestra `≈0`, no como un número con cifras que aparenta precisión. El umbral es la **Tolerancia de ≈** del dibujo (1e-12 por defecto, #2722). *Origen:* en el acetábulo, gráfico y matemático diferían en 1,6e-12; mostrar esa cifra como «resultado» habría sido engañar.

### 4. Dos estados, y las transiciones entre ellos son explícitas
Un objeto generado por un script es **vivo**: depende del texto que lo produce, se regenera, y no se puede editar a mano ni «soltar». Un objeto **libre** es del usuario y nada lo regenera. No hay un tercer estado.
Se pasa de uno a otro solo por una acción visible y con nombre: **ejecutar** (la Ejecución manual corre el script una vez, a pedido, y crea objetos libres en un grupo nuevo; cada pulsación suma otro grupo) y **adoptar** (al marcar la casilla en un texto que ya dibujaba en vivo, sus objetos pasan a libres con los mismos ids). Nunca por un efecto secundario.
*De dónde sale:* «Soltar» dejaba el script activo, que volvía a dibujar lo borrado y chocaba con las relaciones heredadas (#2797). Los scripts que transforman producen una **copia viva** derivada, nunca editan los objetos del usuario (#2784).
*Excepciones conocidas:* los archivos antiguos con elementos ya «soltados» siguen abriéndose (principio 7). Y lo vivo se regenera al soltar el arrastre, no durante él (#2739): mientras se arrastra, lo vivo no está al día.
*Regla general:* si hay que explicar en qué estado está un objeto, o cómo llegó a él sin que nadie lo pidiera, el diseño está mal.

### 5a. Un gesto, un significado
Cosas parecidas se definen igual. Vector, línea indicativa y actuador lineal se crean con una línea y uno de sus extremos, que es la cabeza (#2701); el texto va por defecto en el punto medio. Unificar así cambió un comportamiento (al convertir una línea en vector, el extremo elegido pasó a ser la cabeza, antes la cola, v2.9.5).
*Costo:* unificar rompe hábitos y puede cambiar dibujos ya hechos, así que se justifica caso por caso y se documenta en «Cambia el comportamiento» (principio 7). Lo que es distinto sin motivo se unifica; lo que es distinto con motivo se deja y se explica.

### 5b. Una jerarquía, un padre
Todo elemento tiene un solo padre de grupo; los grupos se anidan; los puntos siguen a su elemento (#2786 a #2789). Los grupos genéricos se identifican con `gN` (y `Gr` queda para la relación de engranaje). La caja envolvente de un grupo usa los puntos de inserción de los textos, no su tamaño dibujado (#2790).
*Por qué un solo padre:* evita que un elemento pertenezca a dos grupos con reglas que se contradicen (¿cuál manda al mover, al heredar capa o estilo?). Si algún día hace falta que algo esté en dos conjuntos, será otro mecanismo (etiqueta, selección), no un segundo padre.

### 6. Hecho para tocar
Se diseña para dedo, Apple Pencil y ratón a la vez. La precisión con el dedo se resuelve con ayudas de interacción (lupa circular, snap con tolerancia en píxeles de pantalla, espera de 300 ms para distinguir un doble toque), no pidiendo al usuario que acerque más. Lo que rompe la interacción en un dispositivo es un defecto, no «un detalle del dispositivo».
*Costos declarados:* las ayudas no son gratis. Con dedo o lápiz, editar un texto con un toque tarda 300 ms en abrirse (con ratón es inmediato); un toque sobre código colapsado ya no abre la edición, porque en tablet o celular se abría sin querer (v2.9.5).
*Qué significa «probado»:* probado en los tres dispositivos de Oscar (iPad con Pencil, celular y PC con navegador). La app declara que funciona en iOS, Android y navegador (#2581), pero no se promete nada más allá de lo que esos tres han mostrado.
*Caso de referencia:* el snap funcionaba perfecto en el iPad y dejaba un hueco en el celular, porque el toque cae a varios píxeles del trazo; la causa estaba en el diseño del ancla (`grabAnchor`), no en la tolerancia.

### 7. Un dibujo guardado no se rompe en silencio
Un dibujo puede cambiar de aspecto o de valor al actualizar la app, pero nunca sin aviso: quien abre un dibujo de hace un mes ve lo mismo, o sabe exactamente por qué no y cómo arreglarlo. Se logra con:
- **Opciones por dibujo** en vez de cambios globales (los dibujos nuevos arrancan en radianes, página carta, punto decimal estricto; los viejos conservan grados, sin página, ambas formas).
- **Migración automática** cuando cambia la sintaxis (`doc.calc=2` al pasar a la sintaxis tipo SMath; los scripts `%f(x):` se traducen solos cuando `line` pasó a `seq`).
- **Reserva de nombres** antes de usarlos (`rand`, `seq`, `linspace`, `j`...), revisando los dibujos existentes para ver si alguno los usaba.
- Una sección **«Cambia el comportamiento»** en cada versión, que dice qué dibujo anterior se verá distinto y cómo arreglarlo.
- Los identificadores internos viejos se conservan a propósito (el renombre a A-CAD no tocó `ipad-cad` en claves y caché, #2581).
*Lo que sí rompe, y lo dice:* un texto de cálculo escrito a mano con `line(s:0; for(…); s)` hay que cambiarlo a `seq(…)`, y una variable usada antes de definirla ahora da ⚠ (v1.9.0). En ambos casos el cambio avisa con ⚠ o con una nota de versión; ninguno cambia un valor en silencio.
*Alcance de la garantía:* la revisión previa de nombres reservados cubre solo los dibujos conocidos (los de Oscar, los ejemplos y las guías). No hay forma de saber qué usan otras personas; para ellos la red de seguridad es el aviso y la sección «Cambia el comportamiento», no la revisión.

### 8. Los estándares son referencia, y el usuario elige cuál
Lo que ya está normalizado se sigue: flechas de cota según ASME Y14.2, altura del símbolo ⌀ según ISO 129-1 y UNE 1-039, diámetro y radio según ANSI, clases de línea de mecánica. Donde la norma es de pago o no cubre el caso, se cita sin reproducirla.
*Hoy mezcla:* ANSI/ASME es estadounidense e ISO/UNE europea, y sus convenciones de acotado difieren. La app toma de cada una lo que le conviene y no declara una norma base.
*Dirección decidida (2026-11-27):* el usuario podrá **elegir el estándar de acotado (ISO o ANSI)**. Está registrado como tarea pendiente; faltan por definir el valor por defecto, si es una opción por dibujo (principio 7, para no cambiar los dibujos existentes) y qué convenciones cambia cada estándar. Hasta entonces, un detalle visual de una cota se cambia solo sabiendo a qué norma obedece.

### 9. Lo nuevo se documenta: es una deuda con el usuario
Una función sin ayuda es una falla, no un pendiente. La documentación no se deja «para después»: quien recibe una función nueva tiene derecho a saber que existe, qué hace y cómo se usa, y la deuda nace en el momento en que se agrega.
*Cómo se hace cumplir:* una sola fuente en `docs/` (es) y `docs/en/` (en); las tablas de funciones y de cálculo se generan desde el código, de modo que no pueden quedar viejas; y `npm test` **falla** si se agrega un botón a un desplegable sin documentarlo en los dos idiomas (#2712). Los textos de interfaz pasan por i18n desde el inicio.
*Dónde todavía depende de la disciplina:* la prueba solo cubre botones de desplegables. Opciones de Configuración, mensajes de error y comportamientos nuevos sin botón no tienen un freno automático. Y hay deuda de inglés reconocida: la revisión humana de las traducciones (#2696) y las etiquetas del árbol (#2764) están pendientes.
*Costo asumido:* cada función nueva tarda más. Es el precio de que el producto siga siendo enseñable.

### 10. Explícito sobre implícito, con una frontera
La magia que ahorra dos teclas hoy cuesta una ambigüedad mañana. **La frontera:** lo implícito vale en la *entrada* (ayudar a escribir), no en la *semántica* (qué significa lo escrito). Una comodidad de teclado es buena; un significado que depende de una búsqueda o de una suposición oculta, no.
*Del lado de la entrada, aceptado:* el cierre automático de delimitadores (`[ ( { $ <`, con excepciones elegidas, #2615), las letras griegas con `\a` o Ctrl+G (#2618).
*Del lado de la semántica, explícito:*
- Un punto generado por otro texto se referencia por una variable que lleva su origen, no por búsqueda implícita de «nombre único» (se publicó, se descartó y se revirtió, #2745).
- Los símbolos con nombre llevan `\` (`\in`, `\to`), como en LaTeX (#2651).
- `contour(...)` se define por los elementos que lo forman, no por puntos, para no ser ambiguo con varios contornos posibles (#2768).
- `line` dibuja una línea; la función que encadena pasos se llama `seq`.
*Caso en la frontera, a vigilar:* los campos de «Dividir» y las matrices redondean al entero más cercano una variable o fórmula (#2517). Es cómodo, pero cambia un valor sin que el usuario lo escriba; hoy se tolera porque un campo de cantidad no puede ser fraccionario.

### 11. Cada idea nueva se conecta con las existentes
Antes de añadir un concepto se busca si uno existente lo cubre, y si no, se construye apoyándose en lo que ya hay en vez de convivir en paralelo. A-CAD crece rápido (unidades, `solve`, gráficas, simulaciones, grupos, capas), así que la medida no es tener pocas ideas sino que **cada una reutilice a las demás**.
*En positivo:* la Ejecución manual no inventó un contenedor ni un mecanismo de «liberar»: crea sus objetos en un **grupo** (el mismo de los grupos genéricos, 5b) y reutiliza la **adopción** de objetos vivos. El bloqueo de capas reutilizó las mismas funciones base de las capas apagadas (`isHidden`, la derivación de puntos por uso con `pointsWhere`); aun así hubo que tocar la selección (`pickEntries`, `boxsel.js`) y el árbol, pero sobre ese mismo cimiento y sin un mecanismo paralelo.
*En negativo (lo que no se construyó):* «asignar capa a un grupo» no se hizo porque SmartStyle ya lo cubre (#2791); una meta sobre una distancia no necesita `solve`, porque la hace el solver gráfico con una cota motriz (#2654).
*Prueba de aplicación:* si la función nueva necesita su propia versión de algo que ya existe (su propio contenedor, su propia selección, su propia unidad), hay que preguntar por qué no usa la existente.

### 12. Probado en el aparato antes de publicado
El número de versión es una promesa de que alguien lo usó. Se puede subir a `main` para probar (GitHub Pages despliega desde ahí), pero **no se versiona ni se etiqueta hasta que Oscar lo prueba** y lo aprueba (#2601). En un día se llegaron a etiquetar v2.2.0 a v2.9.0 sin validar ninguna; eso no se repite. Las pruebas automáticas (`npm test`, encadenadas) protegen lo que se puede escribir; la prueba en el dispositivo protege lo que no.
*`main` es prueba y producción a la vez:* GitHub Pages despliega desde `main`, así que subir para probar ya publica la app. La regla protege el número de versión y el Release, no a quien abra la app entre el push y la prueba. Mientras haya un solo usuario (Oscar) es aceptable; si A-CAD llega a otras personas, habrá que separar los entornos (por ejemplo, una rama de pruebas con su propio despliegue).

---

## Cómo decidimos

1. **El responsable del producto decide la semántica.** Quien propone (una persona o Claude) presenta opciones con su costo y recomienda una; no implementa una variante que no se haya consultado. En #2745 se implementó una búsqueda implícita que contradecía dos decisiones previas: fue error de proceso, no de código.
2. **Una decisión cerrada no se reabre sin motivo nuevo.** Si algo parece contradecirla, se cita el registro de la decisión y se pregunta antes de actuar.
3. **Lo descartado también se documenta**, con su razón, para no volver a proponerlo (la búsqueda por nombre único, el rango de x por defecto por gráfica, el botón Soltar).
4. **Cada defecto se arregla en su causa.** El hueco del snap no se arregló subiendo la tolerancia: se arregló el ancla.

*Sobre las referencias:* los números `#NNNN` de este documento son registros del segundo cerebro de Oscar (una base de decisiones fechadas y con fuente), que **no están en este repositorio y no se pueden abrir desde él**. Las decisiones que importan para el diseño están resumidas en el texto de cada principio; el número sirve para trazarlas por quien tiene acceso. Los números `vX.Y.Z` sí remiten al `CHANGELOG.md`.

## Lista de comprobación para una función nueva

Cada pregunta debe obligar a una respuesta distinta de «sí»: si se marca sin pensar, la lista no sirve.

**Antes de escribir código**
- [ ] ¿Algo existente ya lo cubre, o puede construirse apoyándose en ello? (11)
- [ ] ¿Es exacto? Si aproxima, ¿cuál es la diferencia y está declarada y acotada? (2)
- [ ] ¿Maneja magnitudes reales con su unidad, o depende de una unidad por defecto del dibujo? (3)
- [ ] Si genera objetos: ¿son vivos o libres, y cómo se pasa de uno a otro? (4)
- [ ] ¿Se define con el mismo gesto que cosas parecidas (5a)? ¿Respeta un solo padre de grupo (5b)?
- [ ] ¿Funciona con dedo, lápiz y ratón, y qué costo de interacción introduce? (6)
- [ ] ¿Qué dibujo anterior cambia de aspecto o de valor? ¿Opción por dibujo, migración o aviso? ¿Qué nombre reserva, y se revisaron los dibujos conocidos? (7)
- [ ] ¿Aplica un estándar de acotado, y respeta el que el usuario eligió? (8)
- [ ] ¿Algo es implícito? ¿Es ayuda al escribir (válido) o cambia el significado (no)? (10)

**Antes de dar la función por terminada**
- [ ] Ayuda en es y en, pruebas, entrada en «Sin publicar» y, si cambia un comportamiento, en «Cambia el comportamiento». (7, 9)
- [ ] Probada en los dispositivos de Oscar. No se versiona ni se etiqueta hasta su aprobación. (6, 12)

---

## Tensiones abiertas

Cosas donde los principios se rozan o la práctica todavía no los cumple. No son decisiones: son lo que hay que mirar de frente. Cada una trae un criterio de cierre, para que se pueda saber cuándo ya no es tensión.

1. **Exactitud contra alcance.** `iso()` ignora splines y elipses generales; los arcos y splines que se mueven no tienen snap de tangencia. El principio 2 pide que lo aproximado esté declarado y acotado, y `docs/13-limites-conocidos.md` lo cubre solo en parte.
   *Se cierra cuando:* cada hueco de exactitud conocido está en `13-limites-conocidos.md` con su alcance, o se rellena.
2. **Compatibilidad contra limpieza.** Cada migración y cada nombre reservado es deuda que se hereda para siempre. No hay una política de cuándo se retira una compatibilidad (por ejemplo, el modo «soltado» de archivos antiguos).
   *Se cierra cuando:* existe una regla escrita de cuándo se retira una compatibilidad y qué aviso previo se da.
3. **Velocidad de cambio contra estabilidad.** 42 versiones en 18 días (2026-11-09 a 2026-11-27). El principio 12 nació de una corrección (#2601) y hoy depende de que alguien se acuerde. Además, `main` es prueba y producción a la vez.
   *Se cierra cuando:* el flujo de release exige una aprobación explícita de Oscar, o hay una rama de pruebas con su propio despliegue.
4. **Inglés a medias.** Las etiquetas del árbol (« · bloqueada», « · apagada») y varias traducciones siguen sin revisión humana; se pospuso por prioridad (#2764). El principio 9 dice que lo nuevo se documenta, y el inglés es parte de esa deuda.
   *Se cierra cuando:* las etiquetas del árbol están traducidas y la revisión humana del inglés (#2696) se hizo.
5. **Regeneración y rendimiento.** Con objetos generados cada cambio reevalúa todos los textos y solo corre al soltar, no durante el arrastre (#2739). Un dibujo grande puede notarlo. No hay un presupuesto de rendimiento definido.
   *Se cierra cuando:* hay una medida (tamaño de dibujo y tiempo aceptable) y un dibujo de referencia que la cumple.
6. **Un solo mantenedor y un solo evaluador.** Las decisiones y las pruebas en dispositivo dependen de Oscar. Es una fortaleza (coherencia) y un riesgo (nadie contradice un supuesto). Los tests automáticos son el único segundo par de ojos.
   *Se cierra cuando:* es un riesgo aceptado, no un problema a resolver. Se revisa solo si llegan otros colaboradores o usuarios.
7. **El manifiesto mismo.** Fue redactado en un día, y Oscar lo revisó principio por principio, corrigiendo varias lecturas (el acetábulo, el orden de lectura, los estándares). Sigue el riesgo de fondo: justificar a posteriori decisiones que fueron accidentales.
   *Se cierra cuando:* es un riesgo permanente; la defensa es la regla de mantenimiento (un principio nuevo exige dos casos que lo respalden).
8. **Estándar de acotado sin elegir.** Hoy A-CAD mezcla ANSI/ASME e ISO/UNE sin declarar una base; se decidió que el usuario elija (#2802).
   *Se cierra cuando:* existe la opción de elegir el estándar de acotado, con valor por defecto definido y sin cambiar los dibujos existentes.
9. **Nombres que se tapan en silencio.** Un punto, grupo o contorno se puede llamar por el nombre que le pone el usuario, y comparte espacio con las variables de texto, las cotas y las funciones. El campo «Nombre» avisa de los choques al escribir, pero una variable que se define después con ese nombre gana sin avisar (un dibujo anterior no cambia, principio 7), y tampoco se avisa cuando dos elementos acaban con el mismo nombre. Roza el principio 10: lo implícito no debe cambiar el significado de lo escrito.
   *Se cierra cuando:* al definir una variable o función con el nombre de un elemento, o al repetirse un nombre, la app lo avisa (o lo impide) y el árbol marca el elemento tapado; el camino concreto (avisar, impedir o marcar) lo decide Oscar.

---

## Mantenimiento de este documento

- **Cuándo se revisa:** cuando se cierra una tensión abierta, cuando cambia un principio, y como mínimo cada tres meses. No se revisa por cada versión: hubo 9 minors en 18 días y una revisión por minor se volvería ritual.
- **Cómo cambia un principio:** solo con una decisión registrada de quien responde por el producto.
- **Cómo entra un principio nuevo:** solo con al menos dos casos reales que lo respalden. Un caso aislado es una anécdota, no un principio.
- **Qué no va aquí:** la historia (el porqué de una decisión puntual) va al CHANGELOG o al segundo cerebro. Este documento recoge lo que ya se decidió y lo que se sigue de ahí.
