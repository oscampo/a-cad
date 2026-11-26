<!-- es: 41ecd2b70f -->
# 4. Splitting, copying and repeating

Splitting an element into sections and repeating geometry with linear arrays, circular arrays and mirror copies, linked to the original or not.

[← 3. Selecting and editing](03-seleccionar-y-editar.md) · [Index](README.md) · [5. Constraints →](05-restricciones.md)

---

## Split

![Split](../icons/split.svg) **Split** (panel, Dimensions section...): with 1 segment, arc or circle plus the points that are on it, it cuts it at those points.

With no points, it divides it into **n equal parts**:

- On lines, the parts get an equal-length constraint.
- On arcs and circles there is no equal-angle constraint.

## Merge and dissolve points

**Merge points** (next to Split): with 2 or more points selected, it joins them into **a single one**. The one that weighs most stays (fixed, generated, with more relations, visible) and whatever used the others now uses it. It fixes two different points that sit in the same place and should not (elements do not chain). It refuses if a line, an arc or a spline uses both points. If the points are not in the same place, or relations between them would be lost (a dimension between the two, for example), it warns and **asks for confirmation** before touching anything.

**Dissolve point** is the opposite of Split: with 1 point selected that is the common end of **two aligned lines**, of two arcs of the same circle that continue each other, or of two elliptical arcs of the same ellipse, the two parts become **a single element** and the point disappears. The first one's style stays, and the fill and the contour group keep passing through it. If they are not aligned, if they belong to different circles, or if anything else uses the point, it does nothing and says why. The relations of the point and of the absorbed part **are lost**: if there are any, the app warns and **asks for confirmation** before proceeding. Both can be undone.

**Separate point** is the opposite of Merge: a point used by several elements (two splines joined at their end, a line and an arc…) is separated. With the point **and the elements to separate** selected, those elements move to a **new point in the same place** and are no longer joined to the rest; with only the point, each element except the first gets its own. Relations that touched the point and only what is separating go with the new point; the ones that joined the two parts (a tangency between them, a midpoint…) **are lost**, and then the app warns and **asks for confirmation**. It refuses if only one element uses the point, if a script generates something, or if a text or a vector uses it. It can be undone.

## Linear array

![Linear array](../icons/array.svg) **Linear array**: select what you want to copy.

**Direction 1.** With a line, it goes from its start to its end; with no line, it is horizontal.

**Spacing and number.** Define the spacing and the *total number* (it includes the original; if you only give the spacing, the total is 2).

**Direction 2.** It is optional and fills a grid; with no line it is perpendicular to 1.

**Highlighting.** The chosen directions are highlighted with an arrow on the canvas.

## Circular array

![Circular array](../icons/array-circ.svg) **Circular array**: it is defined with this data:

- **Center**: the origin or a point you tap.
- **Total angle**: 360° by default.
- **Total number**.
- **Equal spacing** or **angle between instances**.
- **Reversed direction**.
- *Skip instances*: for example 3, 5.

## Variables in Split and in the arrays

The fields of these tools (number of parts, spacing, total number, angles and skipped instances) accept dimensions and the `x:value` variables defined in the texts, as well as numbers and formulas.

### Integer fields

In the fields that ask for an **integer** (number of parts, total number, skipped instances), a variable or formula is rounded to the nearest integer, like `round(variable;0)`; a plain number must be an integer.

### Variables menu

The dialogs have a **variables menu** with a filter (all, dimensions, angles, text variables): choosing one inserts its name into the field where you were typing, at the cursor position.

## Mirror copy

![Mirror copy](../icons/mirror.svg) **Mirror copy**: select what you want to reflect, press the button and tap the line that acts as the axis.

Points on the axis are shared.

## Linked copies

**Linked copies** (option "Link the copies to the original", on by default): each point of the copy is tied to its original with automatic constraints, so the copy is a rigid replica that **follows the original** if you move it, rotate it or change its size.

### Constraints by tool

- **Linear array**: the distance and the direction (the angle relative to the chosen line, or absolute if there is no line).
- **Circular array**: equal distance to the center and the angle at the center.
- **Mirror copy**: symmetry about the axis and, for circles, equal radius.

### Array dimensions

**The array dimensions are optional** ("Show the array dimensions"):

- In the linear array, the distance between the original and the first copy.
- In the circular one, the angular dimension.

### Without linking

With the option off, the copies are independent and carry only their internal constraints.

---

[← 3. Selecting and editing](03-seleccionar-y-editar.md) · [Index](README.md) · [5. Constraints →](05-restricciones.md)
