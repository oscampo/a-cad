<!-- es: d130041d7d -->
# 13. Known limits

What the app does not do yet or does only under certain conditions. Worth reading before a big job.

[← 12. Keyboard shortcuts](12-atajos-de-teclado.md) · [Index](README.md) · [14. About →](14-acerca-de.md)

---

## Ellipses and splines

- The ![Ellipse](../icons/ellipse.svg) ellipse does not support intersections or tangency with splines. Where an ellipse crosses a spline or another ellipse, trimming or extending is computed on the drawn curve (a very close approximation, not exact).
- A tangency with a spline may fail to converge if the contact point starts very far from the solution (the app starts it at the closest point).

### Trimmed spline

A trimmed spline keeps its number of points and spaces them at equal distances over what remains (if the cut splits it in two, they are spaced according to the length of each piece). It looks very much like the original, but it is not identical.

- If the spline has few points and with them it would drift from the curve (by more than 0.1% of its size), the necessary ones are added.
- If it has relationships or any of its points is fixed or used by another element, the points do not move and only a few are added next to the cut.

## Solver and constraints

- Copies in a circular array and symmetries do not load the solver: a point that is only a copy of another is computed from its source after solving (the solver has fixed memory and ran out at about 220 copied points). If you add another constraint to a copy point, or use it in a curve with relationships (point on spline, tangency), it becomes an unknown again and counts against that limit.
- If the solver does not converge or there are conflicting constraints, the action is undone with a warning.

## Drawing, dimensioning and copies

- The midpoint as a drawing snap is only offered on lines (not on arcs, ellipses or splines) and not on lines that are very short on screen.
- Dimensioning: a spline cannot be dimensioned against an arc or circle (it has no center), and the distance between two parallel lines carries no sign.
- Splitting arcs and circles into equal parts does not leave an equal-angle constraint.
- The angular dimensions of a circular array cannot be edited by hand (the array is redone); the distance of a linear array can.

## Layers

The ![Layers](../icons/layers.svg) [layers](10-estilo-capas-y-vista.md#layers) only group elements (visibility and current layer); they have no color or line type of their own.

A point that is part of an element follows that element's layer. Changing the layer of a whole selection has to be done element by element, from its properties window.

A constraint or dimension that joins a visible element with a hidden one is also hidden while the layer is off.

## Graphs with simulation in Chrome on iPad

Computing a graph that simulates the mechanism (for example `p41.y vs p41.x` with actuators) can close the page in Chrome on iPad; in Safari, on PC and on the phone it works.

**What was observed.** With the test drawing `prueba-simulaciones.json`: if the page closed while computing, on reopening the graphs are left "paused" with a notice of the progress reached, and computing again (one tap on the graph) can fail again, each time, with the drawing saved automatically. The same file opened from [GitHub](11-archivo-y-exportacion.md#github) ([Open](11-archivo-y-exportacion.md#save--open)) loads without problems.

**What does not fail.** Moving or resizing the graph, and panning or zooming, do not fail (they do not recompute).

**Cause.** It is not yet confirmed.

**In the meantime.** Open the file from GitHub instead of reopening the automatic save, or use Safari.

---

[← 12. Keyboard shortcuts](12-atajos-de-teclado.md) · [Index](README.md) · [14. About →](14-acerca-de.md)
