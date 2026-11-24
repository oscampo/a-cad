<!-- es: 9da816e5cd -->
# Basic concepts

The ideas behind A-CAD. If you have never used a parametric CAD, start here: with these ideas clear, the rest of the manual explains itself.

[Index](README.md) · [1. Getting started →](01-empezar.md)

---

## Parametric drawing

In an ordinary drawing program, a line is a stroke that stays where you left it. In a **parametric** drawing, each element also keeps its **relationships** with the others: this line is horizontal, that circle is tangent to it, this point lies on that arc, this distance measures 40. When you move something or change a measurement, the program repositions everything else so those relationships still hold.

That is why you work in two steps in A-CAD:

1. **You draw the approximate shape**, without worrying about exact measurements.
2. **You add constraints and dimensions** until the shape is the way you want it. The exact measurements come from the dimensions, not from your hand.

The advantage shows up later: to change the design, you just change one dimension, and everything that depends on it adjusts.

## Constraints

A **constraint** is a geometric relationship that is always maintained: horizontal, vertical, parallel, perpendicular, coincident, midpoint, concentric, equal, tangent or fixed. You add them by selecting the elements and tapping the constraint's button ([chapter 5](05-restricciones.md)).

Many are created automatically while you draw: if a line ends up horizontal or tangent because you accepted the soft snap, the constraint is added ([chapter 2](02-dibujar.md)). Each constraint carries a number per type (H1, ∥2, T1...), labeled next to its elements and shown with that number in the element tree; only the points that end up on an element while drawing (●) are not labeled.

## Degrees of freedom

Each element has **degrees of freedom**: the independent ways it can move. A free point has two (it can move in x and in y). A line has those of its two endpoints. Each constraint and each dimension removes degrees of freedom: a horizontal line can no longer tilt; if you also fix its length with a dimension, it can only translate.

A drawing in which nothing can move without breaking a relationship is **fully defined**. You do not need to get there: in a mechanism, precisely, you leave free the movements you care about. To see what is still free, **drag**: whatever moves still has freedom.

There are two typical errors:

- **Conflicting constraints**: two relationships that cannot both be satisfied, such as a line that is horizontal and vertical at the same time. The app warns you and undoes the action.
- **Redundant constraints**: a relationship that others already imply. It breaks nothing, but it makes every calculation slower. The "Redundant" button finds them ([chapter 5](05-restricciones.md)).

## The solver

The **solver** is the engine that, after each change, looks for positions for all the points that satisfy all the constraints and dimensions at once. A-CAD uses **PlaneGCS**, the solver of FreeCAD's Sketcher ([chapter 14](14-acerca-de.md)).

The solver starts from where things are and looks for the closest solution. That is why **the approximate shape matters**: if a tangency can occur on the inside or the outside, the solver picks the one closest to what you drew. If a constraint does not converge, move the elements a little closer to the position you want and try again.

## Driving and reference dimensions

A **dimension** is a measurement in the drawing: distance, angle, radius or diameter ([chapter 6](06-cotas.md)). It can be of two types:

- **Driving**: it rules over the geometry. If you type 40, the drawing adjusts so that distance measures 40. It removes degrees of freedom, like a constraint.
- **Reference** (read-only, in italics): it only measures. It shows the current value without forcing anything, so it never conflicts. It is useful for reading results, for example how far a point of a mechanism travels.

Dimensions have names (D1 for distances, A1 for angles, R1 for radii, O1 for diameters) and a dimension can depend on another through a formula: `D2 = D1/2`. A reference dimension can also feed a formula, so one measurement in the drawing can govern another.

## Calculating in the drawing

Texts in the drawing can calculate ([chapter 7](../07-texto-y-calculo.md)). `k:25` defines a variable, `2*k=` shows a result, and dimension formulas can use those variables. There are also vectors, matrices and built-in functions.

The page reads like a mathematical spreadsheet: **from top to bottom and, within the same row, from left to right**. A variable has the value of its last definition before the point where it is used, and it can be redefined further down. If you use it before defining it, the app warns you that it is defined further down.

## Graphical simulations

A mechanism is a drawing with degrees of freedom on purpose: when you drag a link, the solver repositions the others. A **simulation** does the same but over time ([chapter 9](09-simulaciones-graficas.md)):

1. An **actuator** says how a part moves: a rotation (rotational) or a displacement (linear), with an expression of time `t` such as `90*t`, or with a table.
2. At each instant, the solver solves the drawing with the actuator in its position.
3. **Graphs** record any measurement (a dimension, a point's coordinate) against time or against another measurement, and **paths** leave the trajectory of a point.

Gears, rack and pinion, and relationships that hold only while two elements touch (stops, cams) extend what can be simulated.

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
