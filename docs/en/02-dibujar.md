<!-- es: 628ebc32b7 -->
# 2. Drawing

The tools that create geometry (points, lines, circles, arcs, ellipses, splines, rectangles and polygons) and the drawing aids: the soft lock and the intersection magnet.

[← 1. Getting started](01-empezar.md) · [Index](README.md) · [3. Selecting and editing →](03-seleccionar-y-editar.md)

---

## Dropdown buttons

Buttons with a marked corner are **dropdowns**: they show the last tool used from the group. All the groups, with what each one contains, are gathered in [Dropdown buttons](desplegables.md).

## Point (P)

![Point](../icons/point.svg) **Point (P)**: on a line or circle, it is constrained to it.

## Line (L)

![Line](../icons/line.svg) **Line (L)**: tap the start and the end (it chains) or drag a segment.

Esc or [Select](03-seleccionar-y-editar.md#select-v) ends it.

## Vector (W)

![Vector](../icons/vector.svg) **Vector (W)** (in the [Line dropdown](desplegables.md#line)): drawn like a line, but it has an **arrowhead at the end point** (the tail is the start) and its **magnitude** written as text at the midpoint.

### Magnitude text

**Position.** The insertion point is the middle of the top side of the box, so it stays centered, and by default it is **aligned with the line** of the vector: it turns with it and reads from left to right.

**Normal text.** The magnitude text is a normal text: it can be moved, resized or given another font, or you can release the alignment (Text → Release).

### Magnitude

**Named dimension.** The magnitude is a named dimension (D1, D2...), read-only at first, so you can use it in formulas and texts.

**Changing it.** To change it, **double-tap the vector**. Its properties include:

- **Magnitude**: a value or a formula with other dimensions, such as `2*D1`; typing it fixes the length.
- **Fixed magnitude**: clear it to go back to measuring only.
- **Name**.

### Unit and scale

**Unit and scale.** The vector's properties also have **Unit** and **Scale**: with Magnitude 30, Unit kN and Scale `1'mm/kN` (or a text variable, `eF`) the vector measures 30 mm and its text says "30 kN", and in formulas and texts the magnitude is worth 30 kN.

**Magnitude not fixed.** If the magnitude is not fixed, the unit and the scale say how much the vector's measured length is worth: the resultant of a force polygon is read from the drawing in kN (see [Dimension with unit](06-cotas.md#dimension-with-unit)).

### Converting between line and vector

**Line to vector.** With a line selected, and one of its ends (it will be the **head**; if you choose none, the head is the end), choose Vector in the dropdown and the line becomes a vector. It is the same gesture as for the [leader and the linear actuator](#head-and-tail-one-gesture).

**Vector to line.** With a vector selected, choose Line and it stops being one (the arrow, the text and the dimension are removed).

### Deleting, copying and exporting

**Deleting and copying.** Deleting the vector also deletes its text; copies and arrays copy it with its own text and its own magnitude.

**Exporting.** The arrow appears in the SVG and the DXF (not in the laser-cut SVG, which treats it as a line).

## Head and tail: one gesture

The **vector**, the **leader** and the **linear actuator** are defined the same way: you choose **a line and one of its ends**, and that end is the **head** (where the arrow tip goes); the other end is the tail.

- ![Vector](../icons/vector.svg) **Vector**: the line becomes a vector (see [Vector (W)](#vector-w)).
- **Leader**: the arrow goes at the chosen end (see [Leaders](06-cotas.md#leaders)).
- ![Linear actuator](../icons/act-l.svg) **Linear actuator (ML)**: the displacement is measured from the tail to the head; it can also be defined with two points, the tail and the head (see [Actuators](09-simulaciones-graficas.md#actuators)).

The text of each one (the vector magnitude, the leader label and the actuator name) goes, by default, at the **midpoint** of the line; afterwards you can change it in its properties.

You can choose the line and the end in any order, or select them before choosing the tool.

## Midpoint line (M)

![Midpoint line](../icons/mline.svg) **Midpoint line (M)** (in the [Line dropdown](desplegables.md#line)): tap the start point, which will be the *midpoint*, and then an end (or drag); the line extends equally to the other side.

It gets a [midpoint](05-restricciones.md#midpoint) (M) constraint and the soft lock works as it does for lines.

## Construction line (K)

![Construction line](../icons/cline.svg) **Construction line (K)** (in the [Line dropdown](desplegables.md#line)): gray (#C3C3C3), "thin" weight, with a continuous stroke in the middle and a point at each end, separated by a gap; the points look like those of the "dash-dot" type.

It is drawn like a normal line, with soft lock.

It does not appear in the laser-cut SVG unless you change its class to Cut or Mark.

## Circle (C)

![Circle](../icons/circle.svg) **Circle (C)**: center and a point on the edge.

## Circle through 3 points

![Circle through 3 points](../icons/circle3.svg) **Circle through 3 points** (in the [Circle dropdown](desplegables.md#circle)): tap 3 non-collinear points; the points end up on the circumference.

## Ellipse (O)

![Ellipse](../icons/ellipse.svg) **Ellipse (O)**: tap the center; then tap (or drag to) the end of the first axis and, finally, a point of the second axis (the ellipse passes through the projection of that point onto the perpendicular to the first axis).

You can also drag from the center to the end of the first axis.

### What you can do with it

It is an element of its own:

- It can be selected, copied and exported.
- It appears in the [element tree](10-estilo-capas-y-vista.md#element-tree).
- Its three points (center, axis 1 and axis 2) can be dimensioned and constrained.
- It can be [trimmed](03-seleccionar-y-editar.md#trim-x), you can [extend](03-seleccionar-y-editar.md#extend-e) up to it, and it supports coincident and tangent.
- It does not support intersections.

## Partial ellipse

![Partial ellipse](../icons/earc.svg) **Partial ellipse** (in the [Ellipse dropdown](desplegables.md#ellipse)): creates an elliptical arc.

**First steps.** The first three steps are those of the ellipse (center, end of the first axis and point of the second axis); a dotted reference ellipse remains.

**Section.** Then *drag over it* from where the section starts to where it ends: the section follows the direction of your movement (↻ or ↺). You can also tap the start and then the end (with two taps the short section is taken).

**Ends.** The ends are points that slide over the ellipse.

## Arc by center and ends (R)

![Arc by center and ends](../icons/arc-c.svg) **Arc by center and ends (R)**: center, start and end.

**Direction.** It comes from *where you move*: after tapping the start, move the cursor (or drag with your finger or the pencil) to the side you want and release at the end; the preview shows ↻ (clockwise) or ↺ (counterclockwise).

**Short arc.** With a direct tap at the end, the short arc is created.

## Construction circle and arcs

![Construction circle](../icons/ccircle.svg) **Construction circle and arcs** (in the [Circle and Arc dropdowns](desplegables.md)): they use the color and weight of the construction line.

The circle looks "dash-dot"; the arcs have a point at each end.

You can also *convert* any chosen element to the "Construction" type in the [Style panel](10-estilo-capas-y-vista.md#style) (it takes its color and weight).

## Arc by 3 points (A)

![Arc by 3 points](../icons/arc-3.svg) **Arc by 3 points (A)** (in the [Arc dropdown](desplegables.md#arc)): start, intermediate point and end.

## Spline (S)

![Spline](../icons/spline.svg) **Spline (S)**: tap the points the curve passes through.

Tapping the last one again (or Esc) ends it, tapping the first one closes it.

## Rectangle (B)

![Rectangle](../icons/rect.svg) **Rectangle (B)**: tap (or drag between) two opposite corners.

It gets horizontal and vertical constraints, so it stays a rectangle when you move a corner.

## Center rectangle

![Center rectangle](../icons/rect-c.svg) **Center rectangle** (in the [Rectangle dropdown](desplegables.md#rectangle)): tap the center and a corner (or drag from the center to the corner).

The center is the midpoint of the diagonal.

## Polygon (G)

![Polygon](../icons/polygon.svg) **Polygon (G)**: tap the center and the radius; then choose the number of sides (3 to 64) and whether it is *inscribed* (the radius reaches a vertex) or *circumscribed* (the radius reaches the middle of a side).

**Orientation.** The angle of the radius with the horizontal gives the orientation, with the same soft locks as lines.

**Regularity.** It stays regular when you move a vertex (vertices equidistant from the center and equal sides, hidden constraints).

## Intersection

![Intersection](../icons/intersect.svg) **Intersection**: it no longer has a button in the toolbar; it is still available in the panel (select 2 elements and press Intersection) and with the I key.

## Soft lock and intersection magnet when drawing lines

![Soft lock](../icons/soft-lock.svg) **Soft lock**: when drawing a line, if the cursor is near a significant direction, the line snaps to it and a dotted guide appears with a label.

### Horizontal, vertical and 45°

**Horizontal, vertical and 45°** (every 45°; the step can be changed in the [View panel](10-estilo-capas-y-vista.md#view), for example to 15°): the label shows H, V or the angle.

H and V add their constraint; the other angles add none.

### Near an existing line

**Near an existing line** (within about 36 px of the cursor): **parallel (∥)** or **perpendicular (⟂)** to it, with the corresponding constraint.

If the locked direction crosses a line, an arc or a circle near the cursor, the new line **ends at that crossing**, on that element (the perpendicular ends at the foot of the perpendicular).

### Near an arc or circle

**tangent (T)**, with the end on the curve. Also if you start on a curve.

- If you start on a line or at its end, it also gives parallel and perpendicular to it.

### Automatic constraints

If the line ends up horizontal, vertical, perpendicular, parallel or tangent because you accepted the lock, the corresponding constraint is created with the elements involved (the end that falls on a line or curve stays on it).

45° and the other intermediate angles add no constraint.

- An **existing point**, an **intersection** or the **midpoint of a line** (marked with an M) near the cursor take priority over the lock. The midpoint creates the point with a hidden midpoint constraint, so it stays in the middle if the line changes. It is not offered on lines that are very short on screen.

### Intersection magnet

![Magnet](../icons/magnet.svg) **Intersection magnet**: if the start or the end of the line is near the intersection of two elements (lines, arcs, circles or splines), the line starts or ends there (∩) and the point stays on both.

With the cursor, you have to stay close for a few milliseconds (80 by default, configurable in View; 0 = instantly); a tap or the start of a drag takes it instantly.

If the constraint conflicts with the existing ones, it is removed and the line is left as is.

The lock is turned off with *Soft lock* in the View panel.

---

[← 1. Getting started](01-empezar.md) · [Index](README.md) · [3. Selecting and editing →](03-seleccionar-y-editar.md)
