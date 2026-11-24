<!-- es: 04a441f310 -->
# 9. Graphical simulations

Moving the drawing over time: rotary and linear actuators, the simulation player, graphs of measurements, gears, rack and pinion, and relations that only hold while the elements touch.

[← 8. Splines and paths (cams and trajectories)](08-splines-y-trazados.md) · [Index](README.md) · [10. Style, layers and view →](10-estilo-capas-y-vista.md)

---

## Actuators

The **Actuators** (group after [Fillet](03-seleccionar-y-editar.md#fillet-f-and-chamfer)) move the drawing according to time `t`: ![Rotary actuator](../icons/act-r.svg) **MR** (rotary) and ![Linear actuator](../icons/act-l.svg) **ML** (linear). The **Simulation** ![Simulation](../icons/play.svg) plays them.

### MR (rotary)

It is defined by choosing the line and the end of it that will be the center of rotation.

- Tap them in any order, or select them before choosing the tool.
- It turns counterclockwise by default, or clockwise; the direction is shown by the circular arrow.

### ML (linear)

It is defined with **a line and one of its ends**: tap the line and the end that will be the **head** (in any order), or select them before choosing the tool. The tail is the other end, and the actuator name stays at the midpoint of the line (see [Head and tail](02-dibujar.md#head-and-tail-one-gesture)).

### Value of the motion

Each actuator is given a **displacement** or a **speed** with respect to time `t`, in one of these ways:

- An expression: `90*t`, `30*sin(2π*t)`.
- A "time; value" table.

### Edit and delete

Tap their label, or their name in the [element tree](10-estilo-capas-y-vista.md#element-tree) (group "Actuators"), to edit or delete them. The [selection filter](03-seleccionar-y-editar.md#filter) can turn off "Actuators and graphs".

### Simulation

**Simulation** opens the time bar: it plays and moves the drawing by solving the constraints. The MR line cannot be fixed horizontal or vertical, nor its length changed in the ML.

The player has:

- Step back and step forward.
- Loop repeat (↻).
- Back-and-forth (⇄).
- Speed from 0.5x to 2.0x.

When you stop, the drawing returns to how it was.

## Graphs

The **Graphs** tool ![Graph](../icons/graph.svg) (actuator group) draws relations between variables. Tap where the lower left corner goes and type the relations.

### Relations

They are written "variable1 vs variable2", one per line. The first goes on the vertical axis.

- With actuators and time: `MR1 vs t`, `MR1.v vs t`, `D1 vs t`.
- With two vectors of the same size, by name or with an expression (with `x:0..1;10` and `f(x):x.^2`): `f(x) vs x`, `x.^2 vs x`, `sin(x) vs x`.

**Variables.** You can use:

- `t`.
- The actuators (`MR1`, `ML1`); their speed with `.v`, for example `ML1.v`.
- The named dimensions.
- The variables of the texts.
- The vectors.

**Operations.** Each side accepts operations and functions with those variables: `p1.x/p1.y vs t`, `ML1.d-p1.x vs t`.

**Reading order.** The graph is read at its place on the page, in the [reading order](07-texto-y-calculo.md#reading-order) (from top to bottom and, within a row, from left to right, by its upper left corner), like a dimension with a formula. It sees the variables and functions defined **before** it; what is defined or redefined further down does not affect it.

**Time.** The time `t` is defined only by the simulation player (its "to"): the graph no longer has an end time.

### The x variable

The **x** belongs to each graph.

- If the drawing already defines `x` before the graph (a range or a vector), those values are used one by one.
- If not, the graph uses a generic vector of *Samples* values between the limits of its **x1** axis (from −10 to 10 if you do not set them), so `sin(x)/x vs x` is drawn without defining anything.

What you see is what gets sampled: with `x'cm` and the axis from 0 to 900 mm, x goes from 0 to 90 cm.

### Axes and window

**With no limits on x1 and an x with units**, the graph **focuses itself**: the window goes from 0 to the largest of the measurements with that magnitude that the relation reads, also inside its functions (with a beam of L = 900 mm, from 0 to 900 mm).

**If there are no such measurements** (an x without units, or cuts written as numbers, `fsn(x, 0.5, 0)`), the window is the stretch where the curve does something (jumps, kinks or curvature): outside it, the curve is constant or straight.

**A curve that does something over the whole range** (`sin(x)/x`, `x^2`) stays from −10 to 10.

**With no limits on y**, the y window is that of what is seen in the x window.

### Graph controls

With the graph selected (a tap, or when dragging it), controls appear on its sides; unselected, it looks clean, only the graph. There are four elastic sliders:

- Top: horizontal pan (⇆).
- Right: vertical pan (⇅).
- Bottom: horizontal zoom (↔).
- Left: vertical zoom (↕).

While you hold them away from the center the window moves (to the right or upward, or the opposite) or zooms in (right or up) or out, faster the further you move them. The pan is slow near the center, for fine adjustment. When you release them they return to the center.

The **⤢ Fit** button in the upper right corner puts all the axes in automatic limits with one tap (the saved view does not change).

Moving or zooming the window changes the axis limits (also in the graph's properties) and a generic x is recalculated within them.

### Saved view

A double tap on a slider returns that axis to the **saved view**.

- **Saving it:** leave the graph at the position and zoom you want and tap the round button in the corner, between the zoom sliders (it fills in and saves the limits of x1 and y1). Afterwards you can move and zoom freely and the double tap recovers it.
- **Deleting it:** a double tap on that button deletes the saved view.
- **Without a saved view,** the double tap on a slider returns the axis to automatic limits.

### Secondary axes

At the end of the line, `@y2`, `@x2` or `@x2 y2` draw the relation on the secondary axes: x1 bottom, x2 top, y1 left, y2 right.

### Style of each relation

It goes in quotes at the end of the relation, and combines:

- **Color:** `r g b c m y k w` or `#rrggbb`; `k` is the text color.
- **Line:** `-` solid, `--` dashed, `:` dotted, `-.` dash-dot.
- **Symbol:** `o + * . x s d ^ v > < p h` (circle, plus, asterisk, point, cross, square, diamond, triangles, star and hexagon).

Examples:

- `σ vs N "rx"`: a red cross with no line.
- `y vs x "k--d"`: black dashed with diamonds.
- `Y vs X "o"`: only circles, a **scatter plot**, to see how data are distributed (for example, from `randn`).

With a symbol and no line, the line is not drawn. Without quotes, a solid line in the color that comes next in order. A relation of a single point without a symbol is marked with a circle.

In the graph's properties, below the relations, each one has its lists of color, line and symbol, which write that style.

### Properties

Tap a graph to select it (it is highlighted): drag it to move it and drag its edges or corners to resize it.

A double tap opens its [properties](03-seleccionar-y-editar.md#properties):

- Title.
- Relations.
- Samples.
- Position.
- Size.
- For each axis: its free name (for example `p12.x [cm]`, which serves as documentation because the axes do not show units), linear or logarithmic scale, minimum and maximum, and major and minor divisions.

### Points with a trajectory

Points with ["Trace point"](08-splines-y-trazados.md#trace-point) draw their trajectory when the simulation runs and keep it when you stop it.

## Gear

**Gear** (Constraints group) links the rotation of two gears with a rotation ratio.

### Creating the relation

1. First position the gears by hand, with the teeth not interfering.
2. Select 2 lines, one rigid with each gear (for example the radius of each one that starts at the fixed center).
3. Type the rotation ratio and create the relation.

The pose at that moment is the starting point and from then on the rotation of both is governed by the ratio.

### The rotation ratio

- It is negative if they turn in opposite directions.
- It accepts a formula, e.g. `-17/34`.
- With equal modules it is −z1/z2, or the ratio of the pitch or base diameters, not of the outside ones.

### Use and conditions

Drag any point of one of the gears and the other turns with the ratio, for several turns.

Conditions: each gear turns around a fixed point (the end of the line that coincides with it) and its points are tied to the center, like those of a [circular array](04-dividir-copiar-y-repetir.md#circular-array).

It does not model tooth contact. If you change `z` or `m`, position again and create the relation again.

## Rack

**Rack** ![Rack](../icons/rack.svg) (wheel and rack, Constraints group) links the rotation of a wheel with the advance of a point.

### Creating the relation

Select, in this order:

1. The radial line of the wheel.
2. The line of the rack (or the ground).
3. The point that advances.

Then type the ratio.

### The ratio

It is how far the point advances for each radian the wheel turns (signed; the radius of the wheel). A wheel rolling to the right on the ground turns clockwise, so the ratio is −radius.

### Which point to choose

- For a wheel rolling without slipping, the point is its **center** (not a point on the rim: the app checks this and, if you chose the end of the wheel line at the rim, it uses the other end).
- For a pinion with its rack, a point of the rack.

### Use and conditions

Drag the wheel or the point and the other moves with the ratio.

- The pinion must turn around a fixed point (or one tied to a fixed point with ["Coincident"](05-restricciones.md#coincident)).
- The rack line gives the direction of advance.
- It does not model tooth contact.

## Finite relations

**Finite relations** ("Only within limits", in the [properties](03-seleccionar-y-editar.md#properties) of an element, in the list of its constraints) make a relation hold only while the elements touch.

### By default and with the box checked

- **By default,** a tangency, a point on a line or on an arc holds even if the elements are not seen in contact (for the solver, lines and circles are infinite).
- **With the box checked,** the relation only holds while the elements **touch graphically**: their contact point falls within the limits (the segment between its ends, the sweep of the arc) and the separation is almost zero. Outside that, the elements are left free.

If they cross each other within a step, they are captured.

### Stop at edges

With **Stop at edges** (it appears when you check "Only within limits") the element is not left free when it goes out through an edge: it stops there and the relation resumes when it goes back inside.

- The point stays at the end of the segment or of the arc.
- In a tangency, the end of the segment or of the arc rests on the other element.

### Example: Geneva drive

It is useful for slots and contacts that begin and end. A Geneva drive is built with a finite "point on line" relation between the pin and each slot (the drive advances one slot per turn of the driver).

With ideal geometry (a/d = sin(π/n)) the pin enters head-on through the mouth; with any other, it enters from the side and the drive makes a jump when capturing it.

### Where it is available

- Point on line.
- Point on circle or arc.
- Line-circle or arc tangent.
- Tangent between arcs.

## Libraries

A **Library** is a document with functions, scripts and tables that you want to use in others.

### Creating a library

In **Settings → Library** check "It is a library" and fill in its card:

- Name.
- **Alias** (a short prefix, e.g. `UF`).
- Author.
- Description.
- What is **public**: by default, its functions and scripts. What those need travels too, as private, and the examples do not travel.

### Saving

"Save to [GitHub](11-archivo-y-exportacion.md#github)" leaves it in the `MyLibrary/` folder of the repository, with the extension `.alib.json` and a version that goes up by itself (v1, v2…). If it had been opened from another folder, it offers to send the original to the trash.

"Open from GitHub" has the **Libraries** tab to reopen it.

### Using it in another document

1. Choose **[File](11-archivo-y-exportacion.md#file-button) → Insert library…**.
2. Choose it and confirm the alias.

A block `▸ UtilidadesFatiga (UF) · v3` remains with a copy of its definitions (it works offline).

Its names are used with the alias: `UF.C_(surf)(520'MPa, "machined")=`, `UF.Neuber_(steels)_(1,1)=`. The prefix is drawn in gray.

It applies from its place on the page, like any definition, and its functions always use their own tables even if your document has others with the same name.

### Updating

If the library changes on GitHub, the block shows `⟳ v4`. In its properties (double tap), "Update" brings in the new version and first tells you which names are added or disappear.

### Decimal separator and angle mode

- If the library uses another decimal separator, it is converted when inserted.
- If it uses another angle mode, the block warns you.

---

[← 8. Splines and paths (cams and trajectories)](08-splines-y-trazados.md) · [Index](README.md) · [10. Style, layers and view →](10-estilo-capas-y-vista.md)
