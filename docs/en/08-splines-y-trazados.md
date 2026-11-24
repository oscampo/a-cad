<!-- es: bc1f2b4212 -->
# 8. Splines and paths (cams and trajectories)

Free curves that pass through points of the drawing, the path of a moving point and offset curves, the basis of cams and trajectories.

[← 7. Text and calculation](07-texto-y-calculo.md) · [Index](README.md) · [9. Graphical simulations →](09-simulaciones-graficas.md)

---

A spline is a **cubic B-spline** that passes through real points of the drawing.

- **Open:** zero curvature at the ends.
- **Closed:** periodic, smooth all the way around, with no corner at the joint.

Those points behave as free points until you constrain them.

## It is a first-class element

It can have points on it, intersections and tangencies with lines, circles and arcs.

The solver solves them exactly, not approximately, together with the rest of the drawing.

## Deformation

Dragging a point of the spline, or a point attached to it, deforms the curve and the rest of the drawing follows.

**Follower.** A follower (a point on the spline and on a straight line, for example) runs along the profile while you move the line.

- A point attached to an **open** spline cannot go beyond its ends: if you try, the app warns of a conflict and undoes the move.
- When you release a drag, a spline with relations recalculates its internal parameters so that it does not ripple if the points moved a lot; its shape may change slightly.

## Spline button

![Spline](../icons/spline.svg) **Spline button** (toolbar): tap to draw a spline.

**Dropdown.** Tap again or press and hold to open the [dropdown](desplegables.md#spline-and-paths), which contains:

- Trace point
- Clear trace
- Trace to spline
- Close or open
- Offset

**What it asks for.** Trace to spline and Offset ask you for the number of points or the distance when you use them.

## Trace point

![Trace point](../icons/trace.svg) **Trace point** makes a point draw its path as the mechanism moves.

**Trace to spline.** ![Trace to spline](../icons/spline.svg) **Trace to spline** converts the path (the first turn) into an editable spline.

## Offset

![Offset](../icons/spline.svg) **Offset** is a curve parallel to a spline at a given distance (for example the roller radius of a cam).

It warns you if the distance exceeds the radius of curvature.

## Close / open

![Close or open the spline](../icons/spline-closed.svg) **Close / open** the selected spline.

In the SVG for laser cutting and in the DXF they are exported as exact curves.

## Fixed shape of a spline

**Fixed shape of a spline** (spline properties) ties its control points to each other with hidden distances.

**Effect.** The curve moves and turns like a rigid body and **does not deform** when something drags one of its points (for example, the profile of a gear tooth that turns with its wheel).

**Clearing it.** Clear it to edit the curve point by point again.

**With arrays.** Use it before copying the spline in an array.

---

[← 7. Text and calculation](07-texto-y-calculo.md) · [Index](README.md) · [9. Graphical simulations →](09-simulaciones-graficas.md)
