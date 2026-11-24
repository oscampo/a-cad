<!-- es: 1a1ee19af3 -->
# 5. Constraints

The geometric relations the solver always maintains: horizontal, parallel, tangent, coincident and the rest, with their numbering in the drawing.

[← 4. Splitting, copying and repeating](04-dividir-copiar-y-repetir.md) · [Index](README.md) · [6. Dimensions →](06-cotas.md)

---

Select the elements and press the button. Each button states what selection it needs.

## Horizontal / Vertical

Lines, or 2 points.

## Distribute ↔ / Distribute ↕

3 or more points or texts (a text, by its insertion point). They end up **evenly spaced** horizontally (x) or vertically (y), between the two at the ends (the leftmost and the rightmost, or the lowest and the highest), which do not move when you apply it. The other coordinate stays free: to align them as well, use Horizontal or Vertical. It is a constraint like the others: the spacing is an unknown, so if you drag an end point the ones in between are spread out again, and if you drag one in between they all move. It is labeled ↔1, ↕1 next to each point.

## Parallel / Perpendicular

2 or more lines.

## Coincident

2 or more points (they end up in the same place); point(s) and 1 line, arc, circle, ellipse or spline (the points end up on the element); or lines/arcs and 1 ellipse or spline (the nearest end of each line or arc ends up on the curve). **Collinear**: 2 or more lines.

## Midpoint

1 point + 1 line.

## Concentric (◎)

2 or more circles or arcs; the center of the first one rules and the other centers coincide with it. If they already share the center, you are warned and nothing is added.

## Equal

2 lines (equal length) or 2 circles/arcs (equal radius). When you fillet or chamfer a corner, the length equality of the lines that get shortened becomes an equality of distances between their other end and the virtual vertex of the corner (it shows as "=" next to those points).

## Tangent

Line + circle/arc, 2 circles/arcs, a spline with a line, circle or arc, an **ellipse** (or elliptical arc) with a line, circle or arc, or 2 ellipses. With ellipses and splines the contact point appears.

## Fix / release

Points, lines or circles. A fixed point does not move when you drag.

## Reference mark

**Reference mark** (properties of a point, "Reference mark at" and the line): a mark **is not a fixed point**. The solver does not move it while solving, but after each change it is **projected onto its line**, which is already in its new position and orientation. This way it slides along the line by itself, carried by it, and **remembers the distance traveled**: the distance between the mark and another point on the line accumulates the path. A position dimension cannot do this, because it returns to the same value when a trip is closed; the mark can. It is drawn as an **x**. **Reset marks** (button in the Spline group, or "Reset" in the point's properties) returns each mark to its *reference*: the distance along the line, from its first end, that it had when it was assigned. It is useful for placing the mechanism somewhere else and starting the reading again from zero. "Take the current one" changes the reference. It is useful for rails, wheels that roll on a rotating line and planimeters. Example, the polar planimeter: the pole and the arm with the tracer P follow the outline of a figure; the rail (perpendicular to the arm) passes through P and carries a mark; D = distance from the mark to P (read-only), the wheel's rotation is `(D-D0)/(O1/2)` and the area is `arm length × radius × rotation`. A mark belongs to a single line and cannot be an end of it; if the line is deleted, it stops being a mark; copies and arrays reassign it to the copy of its line. **Limit**: the mark advances in steps (each solve), so the accumulated travel has an error that decreases with finer drags (in the planimeter, 2 to 4 % with a normal drag).

## Indicators

Each relation is labeled with its letter and number next to the elements it involves (the same number and letter on all of them): one between a point and a line, circle or arc, next to the point and the element; a horizontal or vertical between 2 points, next to both. Gear relations are marked with **G** and wheel-and-rack ones with **Cr**.

## Redundant constraints

A redundant constraint adds no information (others already imply the same thing) and slows down every calculation, because the solver solves twice and diagnoses them. The "Redundant" button (Constraints group) lists them and offers to remove them; when you open a file that has them, a notice appears. Named dimensions are not removed automatically (they may feed formulas).

## Numbering

Each constraint carries a number per type (H1, H2, ⟂1, ∥1, =1, ●1, T1...). Those that involve several elements share a single number and are labeled next to each element (for example, two perpendicular lines each show ⟂1). The number is not reused if you delete the constraint. In the element tree each constraint appears with its number: tap it to select it together with its elements and bring the canvas to it. The automatic constraints that place a point on an element while drawing (●) are not labeled.

If a constraint contradicts the others, the app warns you and undoes the action.

---

[← 4. Splitting, copying and repeating](04-dividir-copiar-y-repetir.md) · [Index](README.md) · [6. Dimensions →](06-cotas.md)
