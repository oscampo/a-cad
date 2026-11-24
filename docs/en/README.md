# A-CAD Manual

*[Español](../README.md)*

A-CAD is a **parametric** 2D drawing editor for iOS, Android and the browser. You draw points, lines, circles, arcs, ellipses and splines, relate them with **constraints** (horizontal, parallel, tangent...) and **dimensions**, and a geometric solver keeps everything consistent: if you move a point or change a measurement, the rest of the drawing rearranges itself. The texts in the drawing **calculate** (variables, formulas, vectors and matrices) and can drive the dimensions, and mechanisms move by hand or with **graphical simulations** over time, with actuators and graphs. It is useful for sketches, descriptive geometry, graphic statics, mechanisms and laser-cut parts.

This manual explains every tool and concept in detail, for people who are starting out or want to understand how something works. The help inside the app (the **?** button) has the same information in compact form, with a search box.

## Where to start

1. Read [Basic concepts](conceptos.md): what it means for a drawing to be parametric and how the solver thinks.
2. Follow chapter [1. Getting started](01-empezar.md) with the app open.
3. Open one of the [examples](../../ejemplos/) (File → Open) and drag it: the [rolling cycloid](../../ejemplos/cicloide-rodando.json) and the [reference mark](../../ejemplos/marca-de-referencia.json) have instructions inside the drawing.

## Chapters

| # | Chapter | What it covers |
|---|---|---|
| | [Basic concepts](conceptos.md) | Parametric drawing, constraints, degrees of freedom, driving and reference dimensions, the solver and the simulation. |
| | [Task guides](guias.md) | Concrete tasks step by step, each with an example drawing that opens in the app: a parametric part, texts that calculate, equations, vectors, simulation and graphs, laser cutting and saving. |
| 1 | [Getting started](01-empezar.md) | How to use the app: gestures with the pencil, the finger and the mouse, the parts of the screen and how to select. |
| 2 | [Drawing](02-dibujar.md) | The tools that create geometry (points, lines, circles, arcs, ellipses, splines, rectangles and polygons) and the drawing aids: soft lock and intersection snap. |
| 3 | [Selecting and editing](03-seleccionar-y-editar.md) | Selecting (by tap, box or filter), viewing and changing the properties of an element, and the tools that modify what is drawn: copy, trim, extend, fillet and chamfer. |
| 4 | [Splitting, copying and repeating](04-dividir-copiar-y-repetir.md) | Splitting an element into segments and repeating geometry with linear and circular arrays and mirror copies, linked or not to the original. |
| 5 | [Constraints](05-restricciones.md) | The geometric relations that the solver always keeps: horizontal, parallel, tangent, coincident and the rest, with their numbering in the drawing. |
| 6 | [Dimensions](06-cotas.md) | Dimensions: measurements that drive the geometry or only read it, with formulas, names, scale and units. |
| 7 | [Text and calculation](07-texto-y-calculo.md) | Texts that calculate: formulas with AsciiMath, variables, outputs, vectors and matrices, your own functions and the page reading order. |
| | [Functions and operators](funciones.md) | Reference for everything a formula accepts, with an example and its result for each function. |
| 8 | [Splines and paths (cams and trajectories)](08-splines-y-trazados.md) | Free curves that pass through points of the drawing, the trajectory of a moving point and offset curves, the basis of cams and trajectories. |
| 9 | [Graphical simulations](09-simulaciones-graficas.md) | Moving the drawing over time: rotary and linear actuators, the simulation player, graphs of measurements, gears, rack, and relations that only hold while the elements touch. |
| 10 | [Style, layers and view](10-estilo-capas-y-vista.md) | Color, line type, width and fills; layers; what the view shows; and the element tree. |
| 11 | [File and export](11-archivo-y-exportacion.md) | Saving and opening drawings (also in a GitHub repository) and exporting to PNG, SVG, DXF and SVG for laser cutting. |
| 12 | [Keyboard shortcuts](12-atajos-de-teclado.md) | The keys for each tool, for working with the keyboard. |
| 13 | [Known limits](13-limites-conocidos.md) | What the app does not do yet or does with conditions. Worth reading before a large job. |
| 14 | [About](14-acerca-de.md) | The solver that resolves the constraints, the libraries the app uses and where the version history is. |

## More

- [Change log](../../CHANGELOG.md): what each version brings.
- [Project home page](../../README.md): installing the app, examples and development.
- [Documentation license](../LICENSE.md): CC BY 4.0. The code is MIT.
