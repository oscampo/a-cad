<!-- es: 6fe8653161 -->
# 10. Style, layers and view

Color, line type, width and fills; layers; what the view shows; and the element tree.

[← 9. Graphical simulations](09-simulaciones-graficas.md) · [Index](README.md) · [11. File and export →](11-archivo-y-exportacion.md)

---

## Style

![Style](../icons/palette.svg) **Style** sets the color, the line type and the width. It applies to the selection and to new elements.

- **Color.**
- **Line type:** continuous, hidden, axis, phantom, dashed, dotted, dash-dot, or a new one with its own pattern.
- **Width:** thin, normal, thick.
- **Layer:** assigns the selection to a layer (or to "None"). It appears when what is selected can carry a layer (lines, circles, arcs, ellipses, splines, fills, texts, dimensions and leader lines) and, if they are on different layers, it says "(various)". It does not change the current layer, the one for new things. If you pick a hidden layer, what was assigned gets hidden. It can be undone.

**Mixed selection.** Each property changes only the elements it applies to: color reaches lines, texts and hatches; line type and width, the graphics (lines, circles, arcs, ellipses, splines, leader lines and traces), not the text or the hatch; **font** and **height** (rows that appear when a text is selected), only the texts. Rows that do not apply to the selection are dimmed. If the elements have different values the control says "(various)" and only changes what you choose.

## Fill / hatch

![Fill / hatch](../icons/hatch.svg) **Fill / hatch** applies to a closed outline (lines, arcs or a circle).

It can be hatching, cross-hatching or solid, with angle, spacing and opacity.

## Page

In Settings → Page you choose the format (Letter, A4 or custom sizes), the width, the height and the margins. Sheets repeat **downward** from the top edge of the first one: whatever is drawn **above** that edge falls outside the page (for example, a script that draws upward from the origin).

**Fit the page to what is drawn** moves the first sheet: its top edge a margin above the highest thing and, only if what is drawn goes past the sides, its left edge. It does not touch what is drawn, counts only what is visible (a hidden layer does not) and can be undone. If what is drawn does not fit on one sheet, the notice says how many it takes.

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
- **Snap when moving**: when dragging points, lines or a selection, the points that move snap to other points, midpoints and the edge of lines, circles and arcs that do not move (a ring shows where it snaps). With no object nearby, and the **Magnet** on, they fall on the grid. It creates no constraints.
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

### Grouping an outline

A detected outline can be **grouped**: the *Create a contour from these elements* button on its row creates an **outline group** (`k1`, `k2`…) with its elements. You can also select stroke elements and use the *Create a contour from the selection* button in the tree header.

A group is a declaration of yours: its lines and arcs now live **under it**, in "Outlines" (and leave "Lines" and "Arcs"), with everything that belongs to them. The row shows its state, measured every time: "closed", "open · gap 0.05 between its ends", or "disconnected (2 parts)" if the members do not form a chain. You can group elements even if they are not connected and look at the state afterwards.

- Tapping the group selects all its elements.
- **Properties** (the row button): the group's **name**, which is what the tree shows (without a name, its id), its state and its elements; from there you can also select, dissolve or delete.
- **Dissolve** (*Dissolve the contour*): the elements stay where they were, without a group, and go back to "Lines" and "Arcs".
- **Delete** (the trash can): deletes the group **and** its elements.
- An element is in only one group. A circle, a vector, a construction element or a closed spline cannot join.
- **Repair** (in the group properties, only when needed): the state warns about **repeated edges** (the same element drawn twice, which leaves the contour "branched") and **unconstrained joints** (two different points in the same place). *Remove repeated* keeps one of each, the one with the most relations; *Join coincident points* joins each pair into one, and whatever used one now uses the other (relations between the two points disappear, and it refuses if a line, an arc or a spline uses both). Both can be undone.
- **Copying** a **complete** group (paste, arrays, mirror copy) forms a new group **without a name** for each copy; if you copy only some of its elements, the copy inherits nothing. Splitting an element leaves the pieces in the group, and a fillet or chamfer between two elements of the same group adds the new piece to the group. If a group is left with fewer than two elements, it disappears on its own.

### Groups

A **group** (`g1`, `g2`…) gathers **anything** you want to treat as one unit: elements, texts, dimensions, fills, loose points, outlines and other groups, even if they are not connected (the front view of a part: its outline, a circle, its dimensions and its title). The *Group the selection* button in the tree header creates it; the one that creates an outline is *Create a contour from the selection*.

- It is a **hierarchy**: every object has **a single group**. A group can be inside another; when you group objects that are already in the same group, the new one stays there, and if they come from different places, at the root.
- In the tree its children **hang from the group** (under "Groups") and leave their by-type list. Tapping the group selects everything it contains.
- An element of an outline goes in with its **whole outline**; a point used by an element follows its element (only loose points are members); of the relations only dimensions go in.
- **Properties** (the row button): the name, how many objects it contains, and select, dissolve or delete.
- **Dissolve** (*Dissolve the group*): what it contains moves up one level (to the group above, or to the root). **Delete** (the trash can): deletes the group and everything it contains.
- A group with nothing left disappears on its own. **Copying** (paste, arrays and mirror) a whole group gives a **new group** with the same name, its hierarchy and its own outlines; if you copy only a part, the copy does not enter the original's group; **splitting** one leaves the pieces in their group.
- In the by-layer tree, groups list their children as links and each one stays in its layer.

---

[← 9. Graphical simulations](09-simulaciones-graficas.md) · [Index](README.md) · [11. File and export →](11-archivo-y-exportacion.md)
