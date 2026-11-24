# Conceptos básicos

Las ideas que hay detrás de A-CAD. Si nunca has usado un CAD paramétrico, empieza aquí: con estas ideas claras, el resto del manual se entiende solo.

[Índice](README.md) · [1. Empezar →](01-empezar.md)

---

## Dibujo paramétrico

En un programa de dibujo común, una línea es un trazo que queda donde la dejaste. En un dibujo **paramétrico**, cada elemento guarda además sus **relaciones** con los demás: esta línea es horizontal, aquel círculo es tangente a ella, este punto está sobre ese arco, esta distancia mide 40. Cuando mueves algo o cambias una medida, el programa recoloca todo lo demás para que esas relaciones se sigan cumpliendo.

Por eso en A-CAD se trabaja en dos tiempos:

1. **Dibujas la forma aproximada**, sin preocuparte por medidas exactas.
2. **Le pones restricciones y cotas** hasta que la forma queda como la quieres. Las medidas exactas salen de las cotas, no de la mano.

La ventaja aparece después: para cambiar el diseño basta con cambiar una cota, y todo lo que depende de ella se ajusta.

## Restricciones

Una **restricción** es una relación geométrica que se mantiene siempre: horizontal, vertical, paralela, perpendicular, coincidente, punto medio, concéntrica, igual, tangente o fija. Se ponen seleccionando los elementos y tocando el botón de la restricción (ver [Restricciones](05-restricciones.md)).

Muchas se crean solas al dibujar: si una línea queda horizontal o tangente porque aceptaste el bloqueo suave, la restricción queda puesta (ver [Dibujar](02-dibujar.md)). Cada restricción lleva un número por tipo (H1, ∥2, T1...), rotulado junto a sus elementos y con el que aparece en el árbol de elementos; solo los puntos que quedan sobre un elemento al dibujar (●) no se rotulan.

## Grados de libertad

Cada elemento tiene **grados de libertad**: las formas independientes en que se puede mover. Un punto libre tiene dos (puede moverse en x y en y). Una línea tiene los de sus dos extremos. Cada restricción y cada cota quitan grados de libertad: una línea horizontal ya no puede inclinarse; si además fijas su longitud con una cota, solo puede trasladarse.

Un dibujo en el que nada puede moverse sin romper una relación está **totalmente definido**. No hace falta llegar ahí: en un mecanismo, justamente, se dejan libres los movimientos que interesan. Para ver qué queda libre, **arrastra**: lo que se mueve todavía tiene libertad.

Hay dos errores típicos:

- **Restricciones en conflicto**: dos relaciones que no se pueden cumplir a la vez, como una línea horizontal y vertical al mismo tiempo. La app avisa y deshace la acción.
- **Restricciones redundantes**: una relación que otras ya implican. No rompe nada, pero hace más lento cada cálculo. El botón «Redundantes» las encuentra (ver [Restricciones](05-restricciones.md)).

## El solver

El **solver** es el motor que, después de cada cambio, busca posiciones para todos los puntos que cumplan a la vez todas las restricciones y cotas. A-CAD usa **PlaneGCS**, el solver del Sketcher de FreeCAD (ver [Acerca de](14-acerca-de.md)).

El solver parte de dónde están las cosas y busca la solución más cercana. Por eso **la forma aproximada importa**: si una tangencia puede ocurrir por dentro o por fuera, el solver elige la que está más cerca de lo que dibujaste. Si una restricción no converge, acerca un poco los elementos a la posición que quieres y vuelve a intentarlo.

## Cotas conductoras y de referencia

Una **cota** es una medida en el dibujo: distancia, ángulo, radio o diámetro (ver [Cotas](06-cotas.md)). Puede ser de dos tipos:

- **Conductora**: manda sobre la geometría. Si escribes 40, el dibujo se ajusta para que esa distancia mida 40. Quita grados de libertad, como una restricción.
- **De referencia** (solo lectura, en cursiva): solo mide. Muestra el valor actual sin obligar a nada, así que nunca entra en conflicto. Sirve para leer resultados, por ejemplo cuánto recorre un punto de un mecanismo.

Las cotas tienen nombre (D1 para distancias, A1 para ángulos, R1 para radios, O1 para diámetros) y una cota puede depender de otra con una fórmula: `D2 = D1/2`. Una cota de referencia también puede alimentar una fórmula, y así una medida del dibujo puede gobernar otra.

## Calcular en el dibujo

Los textos del dibujo pueden calcular (ver [Texto y cálculo](07-texto-y-calculo.md)). `k:25` define una variable, `2*k=` muestra un resultado, y las fórmulas de las cotas pueden usar esas variables. También hay vectores, matrices y funciones propias.

La página se lee como una hoja de cálculo matemática: **de arriba a abajo y, en una misma fila, de izquierda a derecha**. Una variable vale lo de su última definición antes del punto donde se usa, y se puede redefinir más abajo. Si la usas antes de definirla, la app avisa que está definida más abajo.

## Simulaciones gráficas

Un mecanismo es un dibujo con grados de libertad a propósito: al arrastrar un eslabón, el solver recoloca los demás. Una **simulación** hace lo mismo pero en el tiempo (ver [Simulaciones gráficas](09-simulaciones-graficas.md)):

1. Un **actuador** dice cómo se mueve una parte: un giro (rotacional) o un desplazamiento (lineal), con una expresión del tiempo `t` como `90*t`, o con una tabla.
2. En cada instante, el solver resuelve el dibujo con el actuador en su posición.
3. Las **gráficas** registran cualquier medida (una cota, la coordenada de un punto) contra el tiempo o contra otra medida, y los **trazados** dejan la trayectoria de un punto.

Los engranajes, la rueda y cremallera, y las relaciones que valen solo mientras dos elementos se tocan (topes, levas) amplían lo que se puede simular.

## Glosario

| Término | Significado |
|---|---|
| Actuador | Elemento que mueve una parte del dibujo en el tiempo: rotacional (MR) o lineal (ML). |
| Capa | Grupo de elementos que se muestran u ocultan juntos. |
| Constructiva | Línea, círculo o arco de apoyo: se dibuja gris y no sale en el corte láser. |
| Contorno | Cadena de líneas, arcos y splines unidos por sus extremos; cerrado si vuelve a su inicio. |
| Cota conductora | Medida que obliga a la geometría a tener ese valor. |
| Cota de referencia | Medida que solo lee el valor actual (en cursiva). |
| Grado de libertad | Forma independiente en que un elemento puede moverse. |
| Matriz | Copias repetidas de una selección, en línea o alrededor de un centro. |
| Restricción | Relación geométrica que el solver mantiene siempre. |
| Solver | Motor que recoloca la geometría para cumplir todas las restricciones y cotas. |
| Spline | Curva suave que pasa por puntos del dibujo. |
| Vinculada | Copia que sigue al original al cambiarlo. |

---

[Índice](README.md) · [1. Empezar →](01-empezar.md)
