<!-- es: 8041c1e6ad -->
# Task guides

Each guide solves a concrete task, step by step, with an example drawing that opens in the app. For the detail of each tool, follow the links to the chapter that explains it.

When you open an example, the app **turns on in [View](10-estilo-capas-y-vista.md#view)** what that drawing needs to show (dimensions, constraints, texts or points) and tells you. If you later turn one of those options off, the dimensions, labels or texts of the guides will stop showing: turn it on again in View.

[← 1. Getting started](01-empezar.md) · [Index](README.md) · [2. Drawing →](02-dibujar.md)

---

## Draw a part that adapts to its measurements

A plate with a centered hole: when you change the length or the height, the plate adjusts and the hole stays at the center with a proportional diameter.

**Example:** [Open the example](../../ejemplos/guias/pieza-parametrica.json).

### Steps

1. Draw the plate with ![Rectangle](../icons/rect.svg) [Rectangle](02-dibujar.md#rectangle-b): tap two opposite corners. It gets horizontal and vertical constraints.
2. Select a corner and tap ![Fix / release](../icons/lock.svg) [Fix / release](05-restricciones.md#fix--release): this way the plate does not move when its measurements change.
3. Draw the hole with ![Circle](../icons/circle.svg) [Circle](02-dibujar.md#circle-c), and a diagonal with ![Construction line](../icons/cline.svg) [Construction line](02-dibujar.md#construction-line-k) between opposite corners.
4. Select the center of the circle and the diagonal, and apply ![Midpoint](../icons/con-mid.svg) [Midpoint](05-restricciones.md#midpoint): the hole ends up at the center of the plate.
5. With ![Dimension](../icons/dim-dist.svg) [Dimension (D)](06-cotas.md#dimension-d), tap the two ends of one side to dimension the length, and those of another for the height. Tap the circle to dimension its diameter.
6. Double tap the diameter dimension and type a formula with another dimension, for example `D2/3` (the diameter is a third of the height). See [Formulas](06-cotas.md#formulas).

### What you will see

If you do not see the dimensions (D1, D2, O1) or the constraint labels, turn on **Dimensions** and **Constraints** in [View](10-estilo-capas-y-vista.md#view). Double tap the length dimension or the height dimension and change its value: the plate adjusts, the hole stays at the center and its diameter is recalculated.

### To continue

- What each type of dimension does: [Dimensions](06-cotas.md).
- All the geometric relations: [Constraints](05-restricciones.md).

## Calculate with texts and drive a dimension

A text can store a value and do calculations, and a dimension can read that value: you change a number and the drawing is recalculated.

**Example:** [Open the example](../../ejemplos/guias/calculo-y-cotas.json).

### Steps

1. With ![Text](../icons/text.svg) [Text (T)](07-texto-y-calculo.md#write-a-text-t), tap above the drawing and type `ancho:120`; Enter. What you type is an equation: `ancho:120` defines the variable.
2. In the entry below type `alto:ancho/2` and Enter, and then `area:ancho*alto=` and Enter: the `=` at the end shows the result (7200).
3. Draw a rectangle and dimension a horizontal side and a vertical one (see [Dimension (D)](06-cotas.md#dimension-d)).
4. Double tap each dimension and, instead of a number, type `ancho` in the first and `alto` in the second.
5. To change the drawing, tap the `ancho:120` text, type another value and Enter.

### What you will see

Everything that depends on `ancho` is recalculated: the height, the area and the two dimensions of the rectangle.

### Important: the reading order

A variable is valid from the place on the page where it is defined, reading from top to bottom. That is why the texts that define variables go **above** what uses them. See [Reading order](07-texto-y-calculo.md#reading-order).

### To continue

- Everything you can write in a text: [Text and calculation](07-texto-y-calculo.md).
- The available functions: [Functions and operators](funciones.md).

## Solve equations

A system of equations is solved in a text, without leaving the drawing.

**Example:** [Open the example](../../ejemplos/guias/ecuaciones.json).

### Steps

1. With ![Text](../icons/text.svg) Text (T), define each unknown with an initial value: `x:1` and `y:1`.
2. Type `solve(x+y==10; x-y==2; x; y)=` and Enter. The equations use `==`; the loose names are the unknowns.
3. The text shows the solution: `x=6; y=4`.
4. Try a system that is not linear: `a:2`, `b:2` and `solve(a*b==12; a+b==7; a; b)=`.

### What you will see

The second system has two solutions (3 and 4, or 4 and 3): the one that appears depends on the initial value you gave `a` and `b`.

### To continue

- All the forms of `solve`: [Equations](funciones.md#equations).

## Draw a force polygon with vectors

Three forces placed head to tail and their resultant: when you move a point, the magnitudes update.

**Example:** [Open the example](../../ejemplos/guias/poligono-de-fuerzas.json).

### Steps

1. With ![Line](../icons/line.svg) Line (L), draw three chained lines (the end of one is the start of the next) and a fourth from the first point to the last.
2. Convert each line into a vector: select the line and **one of its ends**, which will be the **head** (the end the force points to), and choose ![Vector](../icons/vector.svg) [Vector (W)](02-dibujar.md#vector-w) in the Line dropdown. It is the same gesture as for the [leader and the linear actuator](02-dibujar.md#head-and-tail-one-gesture).
3. Each vector shows its magnitude as text at the midpoint. The fourth, from the tail of the first to the head of the last, is the resultant.
4. Drag a point: the magnitudes update by themselves.

### What you will see

The magnitudes (D1, D2…) are named reference dimensions, so you can use them in formulas and in texts.

### To continue

- Unit and scale of a vector (for example, kN): [Vector (W)](02-dibujar.md#vector-w).

## Move a mechanism and graph its motion

A crank that turns with an actuator, and a graph of the height and the horizontal position of its end.

**Example:** [Open the example](../../ejemplos/guias/manivela-y-grafica.json).

### Steps

1. Draw a line from one point (O) to another (A), fix O with ![Fix / release](../icons/lock.svg) [Fix / release](05-restricciones.md#fix--release) and dimension the length (see [Dimension (D)](06-cotas.md#dimension-d)).
2. With ![Rotary actuator](../icons/act-r.svg) [MR actuator](09-simulaciones-graficas.md#actuators), tap the line and its end O, which will be the center of rotation.
3. In its window type the displacement with respect to time: `90*t` (degrees; a quarter turn per second).
4. With ![Graph](../icons/graph.svg) [Graphs](09-simulaciones-graficas.md#graphs), tap where the corner of the graph goes and type one relation per line: `p2.y vs t` and `p2.x vs t` (`p2` is the name of A, which you see in the [element tree](10-estilo-capas-y-vista.md#element-tree)).
5. Tap ![Simulation](../icons/play.svg) Simulation and ▶ to play.

### What you will see

A goes around O, and the graph draws two shifted waves: height and horizontal position against time. When you stop, the drawing goes back to how it was.

### To continue

- Rolling, gears and rack: [Graphical simulations](09-simulaciones-graficas.md).
- A wheel rolling without slipping: [Open the cycloid example](../../ejemplos/cicloide-rodando.json).

## Prepare a part for laser cutting

The cut lines and the marking lines (a fold, for example) are separated by color and line type.

**Example:** [Open the example](../../ejemplos/guias/corte-laser.json).

### Steps

1. Draw the part: the outline, the holes and the fold line.
2. Select the cut lines and give them a style (for example, red and continuous) in the [Style](10-estilo-capas-y-vista.md#style) panel.
3. Select the fold line and give it another style (for example, blue and dashed).
4. Choose ![SVG for laser cutting](../icons/svg.svg) **SVG for laser cutting** in the [File button](11-archivo-y-exportacion.md#file-button).
5. Each line class (type, color and width) is sent to **Cut**, **Mark** or **Skip**: assign Cut to the red ones and Mark to the blue one.

### What you will see

A real-scale SVG in millimeters, with two groups, "cut" and "mark". Dimensions, texts, points and fills are not included. More detail in [SVG CUT](11-archivo-y-exportacion.md#svg-cut).

## Make a text console

A text that shows several calculated lines, like a game status or a data panel.

**Example:** [Open the example](../../ejemplos/guias/consola-de-texto.json).

### Steps

1. Define the variables you want to show, each in its own text: `$$n:3$$`.
2. In another text, define a vector of strings: `$$consola:["ESTADO", "Vidas: "+num2str(n), "Puntos: "+num2str(n*100)]$$`. Each string will be one line (see [Functions and operators](funciones.md)).
3. Create a third text that is just `$$consola=$$`.
4. Double tap it, turn on *Show only the result* and choose a monospaced font and the font and background colors (see [Font and text format](07-texto-y-calculo.md#font-and-text-format)).

### What you will see

Three lines of normal text: "ESTADO", "Vidas: 3" and "Puntos: 300", on the background you chose. Change `n` and the console updates by itself.

### To continue

- A vector of strings that starts and ends with three backticks is drawn as a code block.
- To make the console react to what you type, see [Data between drawings](funciones.md#data-between-drawings).

## Remember a value between changes and play a sound

A counter that is not lost when you close the drawing, and a sound that plays when something changes.

**Example:** [Open the example](../../ejemplos/guias/contador-y-sonido.json). When opened it writes the `contador` data on this device.

### Steps

1. Type `$$c:rfile(contador; 0)$$`: it reads the data "contador", or is 0 if it does not exist yet.
2. Type `$$wfile(c+1; contador)=$$`: it stores that value plus 1. The result is 1 and all that matters is that it runs.
3. Type `$$c=$$` to see the value that was read.
4. Open ![Data](../icons/folder-open.svg) **File → Data…**: `contador` is already there (see [Device data](11-archivo-y-exportacion.md#device-data)).
5. With **Import…** add an audio file and name it `ding`. Type `$$play("ding")=$$` to play it (see [Sounds](funciones.md#sounds)).

### What you will see

`c` goes up by one each time you confirm a change in the drawing, and the data survives even if you close the app. Dragging or simulating does not write the data: only confirmed changes do.

### To continue

- The data is shared by all the drawings on the device: two drawings can share a value.
- A name built from a variable, like `play(n)`, does not travel with the drawing.

## Repeat a hole around a center

Six equal holes on a flange, which all change together when you modify one.

**Example:** [Open the example](../../ejemplos/guias/patron-circular.json).

### Steps

1. With ![Circle](../icons/circle.svg) draw the outline of the flange and fix its center O with ![Fix / release](../icons/lock.svg) [Fix / release](05-restricciones.md#fix--release).
2. Draw a small circle (the hole) and dimension its distance to O and its radius (see [Dimension (D)](06-cotas.md#dimension-d)).
3. Select the hole and choose ![Circular array](../icons/array-circ.svg) [Circular array](04-dividir-copiar-y-repetir.md#circular-array).
4. Tap O as the **Center**, leave **Total angle** at 360° and type **Total number** 6.
5. Leave [linked copies](04-dividir-copiar-y-repetir.md#linked-copies) on.

### What you will see

Six holes 60° apart. Change the distance dimension or the radius of one and all six follow.

### To continue

- For a row instead of a circle: [Linear array](04-dividir-copiar-y-repetir.md#linear-array).
- To remove the relation between copies: [Without linking](04-dividir-copiar-y-repetir.md#without-linking).

## Save, open and share your drawings

Your drawings are saved as `.json` files, and you can take them to another device with GitHub.

### Steps

1. Open the ![File](../icons/save.svg) [File button](11-archivo-y-exportacion.md#file-button) and choose **Save (.json)**: it asks for a name and downloads the file.
2. To open it, choose **Open…** and select the file.
3. To have it on another device and with history, set up [GitHub](11-archivo-y-exportacion.md#github) once (repository, branch, folder and a token) and use **Save to GitHub** and **Open from GitHub**.
4. The data saved by `wfile` and `rfile`, and the audio files, are in [Device data](11-archivo-y-exportacion.md#device-data).

### What you will see

The app also remembers the last drawing in this browser, but that save is local only: save a file to have a backup.

---

[← 1. Getting started](01-empezar.md) · [Index](README.md) · [2. Drawing →](02-dibujar.md)
