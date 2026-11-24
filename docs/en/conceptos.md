<!-- es: 26618d0419 -->
# Basic concepts

The ideas behind A-CAD. If you have never used a parametric CAD, start here: with these ideas clear, the rest of the manual explains itself.

[Index](README.md) · [1. Getting started →](01-empezar.md)

---

## Parametric drawing

In a **parametric** drawing, each element keeps its relationships with the others, not just its position.

**Ordinary drawing.** A line is a stroke that stays where you left it.

**Parametric drawing.** Each element also keeps its **relationships** with the others: this line is horizontal, that circle is tangent to it, this point lies on that arc, this distance measures 40.

**What happens when you change something.** When you move something or change a measurement, the program repositions everything else so those relationships still hold.

### Two steps

In A-CAD you work in two steps:

1. **Draw the approximate shape**, without worrying about exact measurements.
2. **Add constraints and dimensions** until the shape is the way you want it. Exact measurements come from the dimensions, not from the hand.

**The advantage** shows up later: to change the design it is enough to change one dimension, and everything that depends on it adjusts.

## Constraints

A **constraint** is a geometric relationship that is always maintained: horizontal, vertical, parallel, perpendicular, coincident, midpoint, concentric, equal, tangent or fixed.

**How to add them.** Select the elements and tap the constraint's button (see [Constraints](05-restricciones.md)).

**Automatic ones.** Many are created on their own while drawing: if a line ends up horizontal or tangent because you accepted the soft lock, the constraint is added (see [Drawing](02-dibujar.md)).

**Numbering.** Each constraint carries a number per type (H1, ∥2, T1...), labeled next to its elements and with which it appears in the [element tree](10-estilo-capas-y-vista.md#element-tree); only the points that end up on an element while drawing (●) are not labeled.

## Degrees of freedom

**Degrees of freedom** are the independent ways in which an element can move.

- A free point has two (it can move in x and in y).
- A line has those of its two endpoints.
- Each constraint and each dimension removes degrees of freedom: a horizontal line can no longer tilt; if you also fix its length with a dimension, it can only translate.

### Fully defined

A drawing in which nothing can move without breaking a relationship is **fully defined**. You do not need to get there: in a mechanism, precisely, you leave free the movements you care about. To see what is still free, **drag**: whatever moves still has freedom.

### Typical errors

There are two:

- **Conflicting constraints**: two relationships that cannot both be satisfied, such as a line that is horizontal and vertical at the same time. The app warns you and undoes the action.
- **Redundant constraints**: a relationship that others already imply. It breaks nothing, but it makes every calculation slower. The ![Redundant](../icons/redundant.svg) **Redundant** button finds them (see [Redundant constraints](05-restricciones.md#redundant-constraints)).

## The solver

The **solver** is the engine that, after each change, looks for positions for all the points that satisfy all the constraints and dimensions at once.

**Which one it uses.** A-CAD uses **PlaneGCS**, the solver of FreeCAD's Sketcher (see [About](14-acerca-de.md)).

**Why the approximate shape matters.** The solver starts from where things are and looks for the closest solution. That is why **the approximate shape matters**: if a tangency can occur on the inside or the outside, the solver picks the one closest to what you drew.

**If it does not converge.** If a constraint does not converge, move the elements a little closer to the position you want and try again.

## Driving and reference dimensions

A **dimension** is a measurement in the drawing: distance, angle, radius or diameter (see [Dimensions](06-cotas.md)).

### Two types

- **Driving**: it rules over the geometry. If you type 40, the drawing adjusts so that distance measures 40. It removes degrees of freedom, like a constraint.
- **Reference** (read-only, in italics): it only measures. It shows the current value without forcing anything, so it never conflicts. It is useful for reading results, for example how far a point of a mechanism travels.

### Names and formulas

Dimensions have names: D1 for distances, A1 for angles, R1 for radii, O1 for diameters.

**Formulas.** A dimension can depend on another through a formula: `D2 = D1/2`. A reference dimension can also feed a formula, so one measurement in the drawing can govern another.

## Calculating in the drawing

Texts in the drawing can calculate (see [Text and calculation](07-texto-y-calculo.md)).

**Variables and results.** `k:25` defines a variable, `2*k=` shows a result, and dimension formulas can use those variables. There are also vectors, matrices and built-in functions.

### Reading order

The page reads like a mathematical spreadsheet: **from top to bottom and, within the same row, from left to right**. A variable has the value of its last definition before the point where it is used, and it can be redefined further down.

**Use before defining.** If you use it before defining it, the app warns you that it is defined further down.

## Graphical simulations

A mechanism is a drawing with degrees of freedom on purpose: when you drag a link, the solver repositions the others. A **simulation** does the same but over time (see [Graphical simulations](09-simulaciones-graficas.md)).

### How it works

1. A ![Rotational actuator](../icons/act-r.svg) ![Linear actuator](../icons/act-l.svg) **actuator** says how a part moves: a rotation (rotational) or a displacement (linear), with an expression of time `t` such as `90*t`, or with a table.
2. At each instant, the solver solves the drawing with the actuator in its position.
3. **Graphs** record any measurement (a dimension, a point's coordinate) against time or against another measurement, and **paths** leave the trajectory of a point.

**What else can be simulated.** Gears, rack and pinion, and relationships that hold only while two elements touch (stops, cams) extend what can be simulated.

## Glossary

| Term | Meaning |
|---|---|
| Actuator | Element that moves a part of the drawing over time: rotational (MR) or linear (ML). |
| Layer | Group of elements that are shown or hidden together. |
| Construction | Helper line, circle or arc: drawn in gray and not included in laser cutting. |
| Outline | Chain of lines, arcs and splines joined at their endpoints; closed if it returns to its start. |
| Driving dimension | Measurement that forces the geometry to have that value. |
| Reference dimension | Measurement that only reads the current value (in italics). |
| Degree of freedom | Independent way in which an element can move. |
| Array | Repeated copies of a selection, in a line or around a center. |
| Constraint | Geometric relationship that the solver always maintains. |
| Solver | Engine that repositions the geometry to satisfy all constraints and dimensions. |
| Spline | Smooth curve that passes through points of the drawing. |
| Linked | Copy that follows the original when it changes. |

---

[Index](README.md) · [1. Getting started →](01-empezar.md)
