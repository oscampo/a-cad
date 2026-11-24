<!-- es: 1a75f62e22 -->
# 10. Style, layers and view

Color, line type, width and fills; layers; what the view shows; and the element tree.

[← 9. Graphical simulations](09-simulaciones-graficas.md) · [Index](README.md) · [11. File and export →](11-archivo-y-exportacion.md)

---

## Style

![Style](../icons/palette.svg) **Style** sets the color, the line type and the width. It applies to the selection and to new elements.

- **Color.**
- **Line type:** continuous, hidden, axis, phantom, dashed, dotted, dash-dot, or a new one with its own pattern.
- **Width:** thin, normal, thick.

## Fill / hatch

![Fill / hatch](../icons/hatch.svg) **Fill / hatch** applies to a closed outline (lines, arcs or a circle).

It can be hatching, cross-hatching or solid, with angle, spacing and opacity.

## Layers

![Layers](../icons/layers.svg) **Layers** (top left corner of the drawing) opens the list of layers.

At first there are none, and what you draw belongs to no layer.

### Create, choose and delete

- **Create layer:** makes the new layer the **current layer** (checked circle). Whatever you draw afterwards, including points, texts and fills, goes on it.
- **None:** the "None" row goes back to drawing with no layer.
- **Delete:** the trash can **deletes** the layer, and its elements become "none".
- **Rename:** you can rename a layer in its row.
- **Name on screen:** when there is a **current layer**, its name appears under the Layers button.

### Turn off and on

The eye **turns the layer off or on**.

When it is off, its elements, the points used only by them, and their constraints and dimensions are not visible, cannot be selected, do not cut when [trimming or extending](03-seleccionar-y-editar.md#trim-x), and are not exported. They still exist and the solver respects them.

Turning off the current layer leaves you with no current layer.

### Change the layer of an element

To change the layer of an element, double-tap it.

Copy and paste, split and trim keep the layer of the original.

### Dimensions and leaders

**Dimensions** and **leaders** also have a layer: the current one when you create them, and you change it in their window, with a double tap.

With the layer off they are not visible and are not exported, but a dimension still measures or drives through its formula, for example one that moves a part from a calculation.

## View

![View](../icons/eye.svg) **View** gathers these options:

- **Grid.**
- **Magnet** (to the grid).
- **Soft lock** (and every how many degrees).
- **Time for the snap** to intersections.
- **Show or hide** constraints, points, dimensions and texts.
- **Finger draws.**
- **Panel labels.**
- **Dash scale.**

**Version and build.** In the bottom left corner of the drawing you see in italics the **app version and its build**, the commit it was compiled from (for example *v1.6.1 7bc0108*; with "+" if it had uncommitted changes), so you know exactly which build each device is running.

**Current file.** In the top right corner you see the **name of the current file** (or "unnamed").

## Element tree

![Element tree](../icons/list-tree.svg) **Element tree** (first button of the bar) lists lines, circles, arcs, splines, texts, fills, points and relations.

Tap an element to select it and see its points and constraints.

### One place for each thing

Each thing has a single place of its own.

**Points.** A point lives in the first element that uses it (centers, in their circle) and appears in the others as a link *↗* ("↗ Point p1 (in Circle c2)"). Under "Loose points" you only find those that belong to no element.

**Links.** Tapping a link selects the element and opens its own place.

### Relations and dimensions

Relations live in "Relations and dimensions", separated into Dimensions, Geometric, Mechanical and Automatic.

**Automatic.** They are grouped by the operation that created them, numbered in the order it was done ("Circular array 2", "Fillet 1", "Mirror copy 1", "Chamfer", "Split", "Polygon"), and those of fixed shapes and vectors by their element.

**No origin.** Those with no origin (drawings made before this version, or those the magnet adds when drawing on an element) are grouped by type.

**Per element.** Under each element there is a single "Relations (n)" row with links to its own and to those of its points, which also counts the automatic ones.

### Group by layer

If the drawing has layers, the layers button in the header groups the tree **by layer**.

First comes each layer (empty ones too), with its eye to turn it on or off, and inside it the same groups by type. Then "No layer" and the relations, actuators, graphs and paths, which have no layer.

A point follows its element even if it is on another layer.

### Outlines

The **Outlines** group joins the lines and arcs with stroke (not construction), elliptical arcs and open splines chained by their ends: "Outline 2 · closed · 4 lines, 2 arcs" (closed, open or branched if three or more meet at a node).

**When two ends touch.** Two ends touch if they are the same point, if a [coincidence](05-restricciones.md#coincident) ties them, or if they are in the same place with nothing tying them. Those are flagged ("1 join without constraint"), because they can open when the drawing is moved; to tie them, add a coincidence.

**Selecting.** Tapping an outline selects all its elements; inside it they appear as links, in the order they are traversed.

**Gap.** If a free end is near another (within 1 % of the drawing size), the outline says how large that **gap** is and with which outline ("gap 0.0143 with 2"), or "between its ends" if it almost closes by itself. This is the typical reason a profile that should be closed comes out open.

---

[← 9. Graphical simulations](09-simulaciones-graficas.md) · [Index](README.md) · [11. File and export →](11-archivo-y-exportacion.md)
