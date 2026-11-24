<!-- es: a1fa0d424e -->
# 4. Splitting, copying and repeating

Splitting an element into sections and repeating geometry with linear arrays, circular arrays and mirror copies, linked to the original or not.

[← 3. Selecting and editing](03-seleccionar-y-editar.md) · [Index](README.md) · [5. Constraints →](05-restricciones.md)

---

## Split

**Split** (panel, Dimensions section...): with 1 segment, arc or circle plus the points that are on it, it cuts it at those points. With no points, it divides it into **n equal parts** (on lines, the parts get an equal-length constraint; on arcs and circles there is no equal-angle constraint).

## Linear array

Select what you want to copy. Define direction 1 (with a line: from its start to its end; with no line, horizontal), the spacing and the *total number* (it includes the original; if you only give the spacing, the total is 2). Direction 2 is optional and fills a grid; with no line it is perpendicular to 1. The chosen directions are highlighted with an arrow on the canvas.

## Circular array

Center (origin or a point you tap), total angle (360° by default), total number, equal spacing or angle between instances, reversed direction and *skip instances* (for example 3, 5).

## Variables in Split and in the arrays

The fields of these tools (number of parts, spacing, total number, angles and skipped instances) accept dimensions and the `x:value` variables defined in the texts, as well as numbers and formulas. In the fields that ask for an **integer** (number of parts, total number, skipped instances), a variable or formula is rounded to the nearest integer, like `round(variable;0)`; a plain number must be an integer. The dialogs have a **variables menu** with a filter (all, dimensions, angles, text variables): choosing one inserts its name into the field where you were typing, at the cursor position.

## Mirror copy

Select what you want to reflect, press the button and tap the line that acts as the axis. Points on the axis are shared.

## Linked copies

**Linked copies** (option "Link the copies to the original", on by default): each point of the copy is tied to its original with automatic constraints, so the copy is a rigid replica that **follows the original** if you move it, rotate it or change its size. In the linear array, the distance and the direction (the angle relative to the chosen line, or absolute if there is no line); in the circular array, equal distance to the center and the angle at the center; in the mirror copy, symmetry about the axis and, for circles, equal radius. **The array dimensions are optional** ("Show the array dimensions"): the distance between the original and the first copy in the linear array, and the angular dimension in the circular one. With the option off, the copies are independent and carry only their internal constraints.

---

[← 3. Selecting and editing](03-seleccionar-y-editar.md) · [Index](README.md) · [5. Constraints →](05-restricciones.md)
