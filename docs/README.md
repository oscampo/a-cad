# Manual de A-CAD

*[English](en/README.md)*

A-CAD es un editor de dibujo 2D **paramétrico** para iOS, Android y el navegador. Dibujas puntos, líneas, círculos, arcos, elipses y splines, los relacionas con **restricciones** (horizontal, paralela, tangente...) y **cotas**, y un solver geométrico mantiene todo consistente: si mueves un punto o cambias una medida, el resto del dibujo se reacomoda. Los textos del dibujo **calculan** (variables, fórmulas, vectores y matrices) y pueden gobernar las cotas, y los mecanismos se mueven a mano o con **simulaciones gráficas** en el tiempo, con actuadores y gráficas. Sirve para croquis, geometría descriptiva, estática gráfica, mecanismos y piezas para corte láser.

Este manual explica cada herramienta y concepto en detalle, para quien empieza o quiere entender cómo funciona algo. La ayuda dentro de la app (botón **?**) tiene la misma información en forma compacta y con buscador.

## Por dónde empezar

1. Lee [Conceptos básicos](conceptos.md): qué significa que un dibujo sea paramétrico y cómo piensa el solver.
2. Sigue el capítulo [1. Empezar](01-empezar.md) con la app abierta.
3. Abre uno de los [ejemplos](../ejemplos/) (Archivo → Abrir) y arrástralo: la [cicloide que rueda](../ejemplos/cicloide-rodando.json) y la [marca de referencia](../ejemplos/marca-de-referencia.json) traen instrucciones dentro del dibujo.

## Capítulos

| # | Capítulo | De qué trata |
|---|---|---|
| | [Conceptos básicos](conceptos.md) | Dibujo paramétrico, restricciones, grados de libertad, cotas conductoras y de referencia, el solver y la simulación. |
| 1 | [Empezar](01-empezar.md) | Cómo se maneja la app: gestos con el lápiz, el dedo y el ratón, las partes de la pantalla y cómo seleccionar. |
| 2 | [Dibujar](02-dibujar.md) | Las herramientas que crean geometría (puntos, líneas, círculos, arcos, elipses, splines, rectángulos y polígonos) y las ayudas al dibujar: el bloqueo suave y el imán a intersecciones. |
| 3 | [Seleccionar y editar](03-seleccionar-y-editar.md) | Seleccionar (con toque, cuadro o filtro), ver y cambiar las propiedades de un elemento, y las herramientas que modifican lo dibujado: copiar, recortar, extender, redondeo y chaflán. |
| 4 | [Dividir, copiar y repetir](04-dividir-copiar-y-repetir.md) | Partir un elemento en tramos y repetir geometría con matrices lineales, circulares y copias espejo, vinculadas o no al original. |
| 5 | [Restricciones](05-restricciones.md) | Las relaciones geométricas que el solver mantiene siempre: horizontal, paralela, tangente, coincidente y las demás, con su numeración en el dibujo. |
| 6 | [Cotas](06-cotas.md) | Las cotas: medidas que conducen la geometría o solo la leen, con fórmulas, nombres, escala y unidades. |
| 7 | [Texto y cálculo](07-texto-y-calculo.md) | Textos que calculan: fórmulas con AsciiMath, variables, salidas, vectores y matrices, funciones propias y el orden de lectura de la página. |
| | [Funciones y operadores](funciones.md) | Referencia de todo lo que acepta una fórmula, con un ejemplo y su resultado para cada función. |
| 8 | [Splines y trazados (levas y trayectorias)](08-splines-y-trazados.md) | Curvas libres que pasan por puntos del dibujo, la trayectoria de un punto que se mueve y las curvas equidistantes, base de levas y trayectorias. |
| 9 | [Simulaciones gráficas](09-simulaciones-graficas.md) | Mover el dibujo en el tiempo: actuadores rotacionales y lineales, el reproductor de la simulación, gráficas de medidas, engranajes, cremallera y relaciones que solo valen mientras los elementos se tocan. |
| 10 | [Estilo, capas y vista](10-estilo-capas-y-vista.md) | Color, tipo de línea, grosor y rellenos; capas; lo que muestra la vista; y el árbol de elementos. |
| 11 | [Archivo y exportación](11-archivo-y-exportacion.md) | Guardar y abrir dibujos (también en un repositorio de GitHub) y exportar a PNG, SVG, DXF y SVG para corte láser. |
| 12 | [Atajos de teclado](12-atajos-de-teclado.md) | Las teclas de cada herramienta, para trabajar con teclado. |
| 13 | [Límites conocidos](13-limites-conocidos.md) | Lo que la app todavía no hace o hace con condiciones. Conviene leerlo antes de un trabajo grande. |
| 14 | [Acerca de](14-acerca-de.md) | El solver que resuelve las restricciones, las bibliotecas que usa la app y dónde está el historial de versiones. |

## Cómo se mantiene este manual

La ayuda de la app (botón **?**) se genera desde estos mismos archivos, así que hay una sola fuente: lo que se escribe aquí es lo que ve el usuario en la app y en GitHub.

- **Español**: los capítulos de esta carpeta. **Inglés**: los mismos archivos en [en/](en/README.md), con el mismo nombre.
- Los capítulos [Texto y cálculo](07-texto-y-calculo.md) y [Funciones y operadores](funciones.md) no se editan a mano: salen de `src/calcref.js` y `src/funcref.js` (`npm run docs`), y en la app llevan ejemplos que se calculan.
- Cada traducción empieza con una línea `<!-- es: ... -->` con el resumen del español al que corresponde. Si cambias un capítulo en español, el test (`npm test`) avisa que su traducción quedó vieja: actualízala y corre `npm run help:sync` para registrar que ya la revisaste.
- `npm run help` regenera la ayuda de la app (`src/help-gen/`); `node tools/shape.mjs <capítulo>.md` compara la estructura de una traducción con la del original.
- Una función o una opción nueva no está terminada hasta que aparece en el capítulo que le toca (y en su traducción).

## Más

- [Historial de cambios](../CHANGELOG.md): qué trae cada versión.
- [Página principal del proyecto](../README.md): instalar la app, ejemplos y desarrollo.
- [Licencia de la documentación](LICENSE.md): CC BY 4.0. El código es MIT.
