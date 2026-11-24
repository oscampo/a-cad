<!-- es: c8dbca2c69 -->
# 6. Dimensions

Dimensions: measurements that drive the geometry or only read it, with formulas, names, scale and units.

The full list of functions and operators, with examples, is in [Functions and operators](funciones.md).

[← 5. Constraints](05-restricciones.md) · [Index](README.md) · [7. Text and calculation →](07-texto-y-calculo.md)

---

## Dimension (D)

![Dimension](../icons/dim-dist.svg) **Dimension (D)** (after Text): a single tool for all dimensions.

Tap the elements and the dimension is created automatically once the selection is complete:

- **2 points** or **a point and a line**: the distance.
- **2 parallel lines** (less than 1° apart): the distance between them.
- **2 non-parallel lines**: the angle.
- **An arc**: the radius.
- **A circle**: the diameter.
- **An arc or circle with another element** (a point, a line, another arc or circle, or an ellipse): the distance from that element to the center.

**Arc or circle against another element.** Tap the other element first and then the arc or circle (an arc alone, tapped first, gives its radius), or select them before choosing the tool.

**With a previous selection.** If something was already selected when you chose Dimension, it dimensions that selection (a single line gives its length).

**Removing from the selection.** Tap an element again to remove it; Esc clears the selection.

## Distance

![Distance](../icons/dim-dist.svg) **Distance** dimensions these cases:

- 2 points.
- 1 line.
- Point + line.
- **Arc or circle + another element**: distance from that element to the center.
- **2 parallel lines**: perpendicular distance between them.

**Parallel lines.** If they did not have the [Parallel](05-restricciones.md#parallel--perpendicular) constraint, it is added, unless the dimension is a reference one. The lines must be parallel within 1°.

## Angle

![Angle](../icons/dim-ang.svg) **Angle** dimensions 2 lines.

**Value with no limit.** 250° or 400° (one full turn and 40°) are valid; see [Angles without limit](#angles-without-limit) below.

**Sector.** Where you place the dimension decides which sector is dimensioned (for example 20° or 160°). Drag the dimension to reposition it.

## Radius / ⌀

![Radius / ⌀](../icons/dim-rad.svg) **Radius / ⌀** dimensions an arc (R) or a circle (diameter, with the ⌀ symbol).

They follow the ANSI standard:

- **Text inside:** the dimension line runs through the interior.
- **Text outside:** a radial leader with the arrow touching from outside.

## Scaled dimension

**Scaled dimension** (distances, radii and diameters): type `value[*k]` in the dimension's value, e.g. `4[*10]`.

**What it measures and what it says.** The **drawing measures value × k** (here 40 units) and the **dimension says the value** ("4"), <u>underlined</u> as in ISO 129 / UNE 1-039. With `4[*0.1]` the drawing measures 0.4 and the dimension still says "4".

**Formulas.** The value can be a formula (`D1/2[*10]`) and **so can the scale**: a number, a text variable (`30[*k]` with `k:25` in a text) or a formula with dimensions (`4[*2*D1]`). If the variable changes, the drawing is recalculated and the dimension still says 30.

**Read-only dimensions.** When you check "Read-only" the **Scale (×)** field appears (empty = no scale) and the dimension says the **measurement ÷ scale**, underlined and in italics (a measurement of 13.333 with scale 10 says "1.333").

**Where it shows.** The scale is shown when you edit the dimension (`value[*k]`, or in its field) and disappears when you delete it.

**Limit.** It does not apply to angles.

## Dimension with unit

**Dimension with unit** (distances, radii and diameters): type the value with its unit, `126'in`.

**What it measures and what it says.** The **drawing measures the real thing** and the **dimension says it in its unit**: "126 in".

- A length is measured in mm: `126'in` measures 3200.4.
- Another SI quantity: `5'kN` measures 5000, `12'V` measures 12.

**Changing the unit.** In the dimension's window, **Dimension unit** shows and changes the unit:

- With a number it converts it: `126'in` becomes `3200.4'mm`.
- With a formula it only changes the unit at the end: `D2*2'ft`.

**Formula with no unit at the end.** It uses the unit of a dimension in the formula that has the same quantity (`D2*2` with D2 in inches says in), or else the SI unit.

**Seeing it smaller or larger.** Use the scale: `126'in[*0.1]` draws 320.04 and the dimension still says "126 in", underlined.

**Read-only.** In a **read-only** dimension, the unit only changes the label (a measurement of 254 mm, with the unit in, says "10 in").

### Scale with units

**Scale with units** (representation scale): for a quantity that is not a length, the scale carries units and the quantity times the scale gives the drawing length.

**Example.** `30'kN[*1'mm/kN]` measures 30 mm and the dimension says "30 kN", **not underlined** (it is not out of scale, it is at the scale you declared).

**Scale as a variable.** The scale can be a text variable, `eF:1'mm/kN`, and each dimension or vector uses it with `[*eF]`. It reads the eF defined earlier in the [reading order](07-texto-y-calculo.md#reading-order), so if you redefine it further down (`eF:10'mm/kN`) the scale of everything below changes.

**Warnings.** If the quantity times the scale does not give a length (`30'kN[*2'mm]`) it warns with ⚠. Without a scale, `30'kN` measures 30000 (in SI) and the app warns you.

**Read-only with another quantity.** A **read-only** dimension with a unit of another quantity (kN) needs a scale with units to read the measurement: it says "⚠ kN" until it has one. With it, it says the measurement divided by the scale (45 mm with `1'mm/kN` says "45 kN").

### Dimensions with unit in formulas

In formulas and calculation texts a dimension with a unit enters as a **quantity**: what its label says, with its quantity and without the scale.

**Example.** With D2 = 126 in and D4 = 20 in, `A:D2*D4=` gives the area (in m²; `A='ft^2` asks for it in ft²).

**Dimension without a unit.** It still enters as a number: to add it to one with a unit, give it the unit in the formula, `D1'mm+D2` (`D1+D2` gives ⚠).

## Read-only (reference)

It measures and shows the value in italics without constraining the geometry.

- Tap a dimension once to **select** it (for example to delete it), **drag** it to reposition it, and **tap twice** to edit its value.

## Formulas

Any dimension can take an expression: `3π/4`, `2π*5`, `10*sin(30)`, `10+1/3`, `√2`, `2^3`. The same applies inside the `expr=` outputs and the `x:...` assignments of the [texts](07-texto-y-calculo.md#assign-and-show-values).

### Ranges

**Ranges** are vectors of evenly spaced numbers:

- `x:start..end;n` defines `x` with `n` elements between `start` and `end` (both included).
- `x:start..step..end` defines `start`, `start+step`... without going past `end` (the step can be negative).

Each part can be a formula. `x=` shows the elements; a vector cannot yet be used inside a numeric formula (it warns).

### Operators and constants

- **Operators**: `+ - * / ^` (also `×`, `÷`, `**`) and implicit multiplication (`2π`, `3(4+1)`).
- **Constants**: `π` (or `pi`) and `e`.

### Single-value functions

- `sin` (or `sen`), `cos`, `tan`, `sec`, `csc`, `cot`: in degrees, or in radians if the argument contains π or is an angle.
- `asin`, `acos`, `atan`: return degrees.
- `sinh`, `cosh`, `tanh`, `asinh`, `acosh`, `atanh`.
- `sqrt` (or `raiz`, `√`), `abs`, `exp`, `ln`, `log` (or `log10`).
- `deg(x)` (radians to degrees) and `rad(x)` (degrees to radians).
- `floor` (`piso`), `ceil` (`techo`), `trunc` and `sign` (`signo`).

### Multi-value functions

The values are separated with `;` (or with a comma followed by a space or after a variable; `2,5` is the number 2.5):

- `round(x; n)` (`redondear`): `n` decimals, 0 if omitted; halves round away from zero.
- `min(a; b; ...)`, `max(a; b; ...)`.
- `clamp(x; mínimo; máximo)`.
- `mod(a; b)`: the result takes the sign of `b`.
- `hypot(a; b; ...)`.
- `atan2(y; x)`: degrees.

### Comparisons

`< > <= >= == !=` (also `≤ ≥ ≠`) give 1 if true and 0 if not (`==` and `!=` tolerate rounding).

`if(condición; si_verdadero; si_falso)` (or `si`) chooses between two values: it only calculates the chosen branch, so `if(D1==0; 0; 10/D1)` does not fail.

### Reserved names

The names of these functions cannot be used as a dimension or variable name, nor can `t` (time), `j`, `ω`, `θ` or `α` (only those lowercase letters). They are reserved for future engines, animations and dynamic calculations; for now they have no value.

## Dimension names and formulas between dimensions

Each dimension has an automatic name by type:

- **D**: distance.
- **A**: angle.
- **R**: arc radius.
- **O**: circle diameter.

This gives D1, D2, A1, R1, O1...; the number is not reused.

**Where to see and change it.** You see it in the [element tree](10-estilo-capas-y-vista.md#element-tree) and when you tap the dimension twice, where you can also **change it** (letters, numbers and _; the new name is updated in the formulas that use it).

**Using it in formulas.** A dimension's name can be used in another's formula: `D1*sin(3π/4)`, `D1/2+1`, `2*O1`.

**Recalculation.** When you change a dimension's value, the ones that depend on it are recalculated automatically and the geometry is solved again. If the result is impossible (a conflict, or a distance or radius that would end up zero or negative) everything is undone and you are warned.

### Rules

- An **angle** enters the formula as its measure in radians (like π): `sin(A1)` works and `R1*A1` is the arc length.
- **Read-only** (reference) dimensions can be read, see [below](#read-only-dimensions-as-inputs).
- There can be no cycles between driving dimensions (D1 depends on D2 and D2 on D1).
- A diameter (O) is worth the diameter, not the radius.
- If a dimension that another depended on is deleted, the latter keeps its current value and the app warns you.

## Read-only dimensions as inputs

The formula of a driving dimension can read a reference dimension, that is, a measurement of the geometry (the length of a line, an angle, a radius). See [Driving and reference dimensions](conceptos.md#driving-and-reference-dimensions).

### How it is solved

Since the measurement depends on the geometry and the geometry on the dimension, the app **solves and recalculates in rounds** until the formula matches the measurement (secant method, and if it does not converge, damped iteration).

This happens when editing a dimension, when creating one and **while you drag**, so the output dimension moves with the drawing.

**Fixed points.** So that the output does not push the input, **the points measured by the read-only dimensions that the formulas read are kept fixed** while solving (in an involute, the chord D1 = R·A1 gets longer without moving the tangent point that A1 measures). If the drawing needs them to move, the app retries without fixing them.

**While dragging.** When you drag a mechanism with formulas that read measurements, a point on a circle that the mouse cannot reach exactly is pulled in on its own in the first calculation pass.

**If it does not stabilize.** For example, a dimension defined as its own measurement + 1: it is undone and you are warned.

### Example: the wheel that rolls without slipping

**The tangent point T governs** (the input): D1 (read-only) measures the distance from the origin to T and A1 (driving, in radians) is worth `D1/(O1/2)`.

When you drag T along the ground, the wheel turns as much as it advances and the marked point P, which stays as the output, traces the cycloid, over several turns.

**What is best.** It is best for the input to be the most stable measurement (the position of T) and the output the calculated one. Doing it the other way round (dragging P and having the distance read the angle) works, but is ill-conditioned near the ground.

### Limit

A very fast drag may stop converging at some step (the last good state is kept).

## Angles without limit

An angular dimension no longer stays between 0° and 180°.

- Type 250° and the geometry ends up at 250° (the arc is drawn beyond 180°).
- 400° is one full turn and 40° (the arc shows the 40°).

**Direction.** It is measured in the direction (counterclockwise or clockwise) in which the dimension was created.

**Read-only.** A **read-only** angular dimension follows the geometry without jumping: going from 180° to 190°, to 360° and to 400° it keeps growing, and on the way back it goes down again. To do this it takes the equivalent closest to the last value, so it stays correct as long as each change is less than half a turn.

**Old drawings.** They keep their 0° to 180° value until you edit that dimension (by tapping it twice) or drag it to another sector, and from then on it is continuous.

**In formulas.** An angle enters in radians, also beyond 2π.

## Degrees or radians

Angular dimensions have a unit selector.

- **Degrees:** sin/cos/tan use degrees (radians if the argument contains π).
- **Radians:** everything is in radians.

Dimension formulas always read degrees; the **calculation texts** and the graphs follow the **Settings → Angles in** option (radians in new drawings, degrees in earlier ones).

## Point color

Tap a point twice and choose its color in the [properties](03-seleccionar-y-editar.md#properties) window (palette or free color; "auto" goes back to the normal color).

The color is only visible on screen: points do not appear in exports.

## Free label

**Free label**: at the end of a dimension's value, `["texto"]` changes what it says: `50["D"]` measures 50 and drives the drawing, but reads "D".

**With a formula.** With `[$fórmula$]` or `[$$fórmula$$]` the label is drawn with the text engine (subscripts, Greek letters, fractions): `50[$D/2$]`, `8[$r_1$]`.

**With a scale.** It combines with the scale, in that order: `30[*1'mm/kN]["F"]`.

**Editing and removing.** When you edit the dimension it is shown in full; to remove it, delete the bracket.

**Export.** In the SVG and the DXF a label with a formula comes out as plain text.

## Dimension font size

**Dimension font size**: with **Settings → Dimensions use the text font size** (on in new documents), the dimension font is measured like that of the texts.

- **On:** in **points** with a page and in drawing units without one; dimensions grow and shrink with the zoom along with the drawing, also when exporting.
- **Unchecked** (earlier drawings): the font is in screen pixels and does not change with the zoom.

### Where to choose it

- In the [Style](10-estilo-capas-y-vista.md#style) panel, under **Dimension text**: with no dimensions selected it changes the document's, which all dimensions without their own follow; with dimensions selected, theirs.
- In each dimension's window (double tap), under **Dimension text**.

### Arrows

Arrows and spacing grow with the font. Arrowheads follow the ASME Y14.2 standard: their length is the height of the digits and their base is a third of the length (3:1), filled. Leaders use the same arrow as the document's dimensions.

## Leaders

**Leaders** (annotations): with the dimension tool (or the ![Distance](../icons/dim-dist.svg) Distance button), choose **a point and the element it belongs to**; its window opens. With a line, it is the same gesture as for the vector and the linear actuator: the chosen end is the **head** (see [Head and tail](02-dibujar.md#head-and-tail-one-gesture)).

### Depending on the chosen point

- **Endpoint** of a line, an arc, an elliptical arc or an open spline: **the element itself becomes the leader**. The arrow goes at that endpoint, in the direction of the curve; its color, line type and width are the element's (change them in the [Style](10-estilo-capas-y-vista.md#style) panel, with the leader or the element selected), and the element does not appear in the laser-cut SVG.
- **Center** of a circle or arc, or an **intermediate point**: a straight line of its own is drawn with the arrow at the point and the panel's style.

### The label

The **label is a text of the drawing**: its height is in drawing units, like that of the texts, and its arrow is the same as the document's dimensions.

In its window (when creating it and with a double tap) you choose:

- The label (plain text, `"texto"`, `$fórmula$` or `$$fórmula$$`).
- **Placement**: on a line, an arc or an elliptical arc, an endpoint or the midpoint (by default, the midpoint, beside the line); on a spline, any of its points.
- The **insertion point** of its box (corners, midpoints or center, as in the texts; it is kept a quarter of its height away from the point).
- The **font** and the **height** (with a page, in points, like the texts; it starts with the font and height of new texts).

**Dragging.** You can also drag the label: it jumps to the nearest allowed place. If the geometry moves, it goes with it.

**What it does not do.** It constrains nothing: the solver does not see it, and it is deleted with its point or its element (deleting it leaves the element).

**Export.** It appears in the SVG and the DXF, with the formula drawn.

---

[← 5. Constraints](05-restricciones.md) · [Index](README.md) · [7. Text and calculation →](07-texto-y-calculo.md)
