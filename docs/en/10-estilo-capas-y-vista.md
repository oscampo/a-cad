<!-- es: 5ee03cd329 -->
# 10. Style, layers and view

Color, line type, width and fills; layers; what the view shows; and the element tree.

[← 9. Graphical simulations](09-simulaciones-graficas.md) · [Index](README.md) · [11. File and export →](11-archivo-y-exportacion.md)

---

## Style

Color, line type (continuous, hidden, axis, phantom, dashed, dotted, trace and point, or a new one with its own pattern) and width (thin, normal, thick). It applies to the selection and to new elements.

## Fill / hatch

On a closed outline (lines, arcs or a circle): lines, cross-hatch or solid, with angle, spacing and opacity.

## Layers

**Layers** (top left corner of the drawing): opens the list of layers. At first there are none, and what you draw belongs to no layer. "Create layer" makes the new layer the **current layer** (checked circle): whatever you draw afterwards, including points, texts and fills, goes on it; the "None" row goes back to drawing with no layer. The eye **turns the layer off or on** (when it is off, its elements, the points used only by them, and their constraints and dimensions are not visible, cannot be selected, do not cut when trimming or extending, and are not exported; they still exist and the solver respects them). The trash can **deletes** the layer, and its elements become "none". You can rename a layer in its row. Turning off the current layer leaves you with no current layer. To change the layer of an element, double-tap it. **Dimensions** and **leaders** also have a layer (the current one when you create them; you change it in their window, with a double tap): with the layer off they are not visible and are not exported, but a dimension still measures or drives through its formula, for example one that moves a part from a calculation. Copy and paste, split and trim keep the layer of the original. When there is a **current layer**, its name appears under the Layers button.

## View

Grid, magnet (to the grid), soft lock (and every how many degrees), time for the snap to intersections, show or hide constraints, points, dimensions and texts, finger draws, panel labels, and dash scale. In the bottom left corner of the drawing you see in italics the **app version and its build**, the commit it was compiled from (for example *v1.6.1 7bc0108*; with "+" if it had uncommitted changes), so you know exactly which build each device is running. In the top right corner you see the **name of the current file** (or "unnamed").

## Element tree

**Element tree** (first button of the bar): lists lines, circles, arcs, splines, texts, fills, points and relations. Tap an element to select it and see its points and constraints. Each thing has a single place of its own: a point lives in the first element that uses it (centers, in their circle) and appears in the others as a link *↗* ("↗ Point p1 (in Circle c2)"); under "Loose points" you only find those that belong to no element. Relations live in "Relations and dimensions", separated into Dimensions, Geometric, Mechanical and Automatic. The automatic ones are grouped by the operation that created them, numbered in the order it was done ("Circular array 2", "Fillet 1", "Mirror copy 1", "Chamfer", "Split", "Polygon"), and those of fixed shapes and vectors by their element; those with no origin (drawings made before this version, or those the magnet adds when drawing on an element) are grouped by type; under each element there is a single "Relations (n)" row with links to its own and to those of its points, which also counts the automatic ones. Tapping a link selects the element and opens its own place. If the drawing has layers, the layers button in the header groups the tree **by layer**: first each layer (empty ones too), with its eye to turn it on or off, and inside it the same groups by type; then "No layer" and the relations, actuators, graphs and paths, which have no layer. A point follows its element even if it is on another layer. The **Outlines** group joins the lines and arcs with stroke (not construction), elliptical arcs and open splines chained by their ends: "Outline 2 · closed · 4 lines, 2 arcs" (closed, open or branched if three or more meet at a node). Two ends touch if they are the same point, if a coincidence ties them, or if they are in the same place with nothing tying them: those are flagged ("1 join without constraint"), because they can open when the drawing is moved; to tie them, add a coincidence. Tapping an outline selects all its elements; inside it they appear as links, in the order they are traversed. If a free end is near another (within 1 % of the drawing size), the outline says how large that **gap** is and with which outline ("gap 0.0143 with 2"), or "between its ends" if it almost closes by itself: this is the typical reason a profile that should be closed comes out open.

---

[← 9. Graphical simulations](09-simulaciones-graficas.md) · [Index](README.md) · [11. File and export →](11-archivo-y-exportacion.md)
