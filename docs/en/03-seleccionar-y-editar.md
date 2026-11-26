<!-- es: 2daf5e96e0 -->
# 3. Selecting and editing

Selecting (by tap, box or filter), viewing and changing an element's properties, and the tools that modify what you drew: copy, trim, extend, fillet and chamfer.

[← 2. Drawing](02-dibujar.md) · [Index](README.md) · [4. Splitting, copying and repeating →](04-dividir-copiar-y-repetir.md)

---

## Select (V)

![Select](../icons/select.svg) **Select (V)** selects and drags points, lines or the edge of a circle (the mechanism moves according to the constraints).

**Selection box.** When you drag from an empty spot, it selects with a box. A box drawn from left to right takes what ends up entirely inside; from right to left, it also takes what it touches.

**Graphs.** **Graphs** are part of the selection: a single one behaves as if you tapped it; several, or together with other elements, are highlighted, deleted and moved along with them.

### Several elements selected

With **several elements selected**, dragging any one of them moves all of them together: their free points (endpoints, centers, control points and the insertion point of texts).

**What does not move.** Fixed points and reference marks stay where they are, and the constraints still hold, so whatever is tied to something fixed adjusts instead of moving as a whole.

**A single element.** With a single element selected, dragging works as usual (the edge of a circle changes its radius).

## Filter

![Filter](../icons/filter.svg) **Filter** (in the Select [dropdown](desplegables.md#select)) chooses what can be selected.

- **By entity:** points, lines, circles, arcs, ellipses, splines, texts, fills, dimensions.
- **By line type.**
  If you check **no** line type, nothing is filtered by type (so you can keep only lines, or only dimensions, without picking a type).

**Scope.** It applies to tapping and to the selection box. With an active filter that lets dimensions and constraints through, the box also takes them (by their label); with no filter, the box still takes only elements. With an active filter that lets dimensions and constraints through, the box also takes them (by their label); with no filter, the box still takes only elements.

**Indicator.** A red dot on the button shows that a filter is active.

## Box selection

With the Select tool, drag from an empty spot.

- **From left to right** (blue box, solid line): it selects the elements that end up **completely inside**.
- **From right to left** (orange box, dashed line): it also selects those the box **touches**.

**Shift.** With Shift it adds to the selection.

**Scope.** It reaches points, lines, circles, arcs, splines and texts (a text by its insertion point).

**With a finger.** With a finger, turn on *Finger draws*, because otherwise the finger pans the canvas.

## Overlapping elements

**Overlapping elements** (Select tool) is for when several elements share a spot or sit almost on top of each other (coincident points, centers of concentric circles or arcs, collinear lines).

### Opening the list

**Tap and hold** on them for about 0.7 s: a floating window opens with a list of all the elements near the tap, from the nearest to the farthest. Check the ones you want: they are highlighted in orange in the drawing so you can identify them.

### Window buttons

- **Confirm:** leaves them selected (anything you already had selected outside that list is kept).
- **Cancel** (or Esc): closes without changing anything.
- **All** / **None:** checks the whole list.
- **Properties** (active when only one element is checked): leaves it selected and opens its properties window without closing the list; it is the way to edit it without an extra tap undoing the selection.

### Details

**Moving the window.** You can move it by dragging its title bar, to clear the work area (it stays where you leave it).

**A single element.** With a single element under your finger it does not appear: the usual magnifier follows.

**Filter.** It respects the selection filter.

## Properties

**Properties:** **double-tap** a point, line, circle, arc, ellipse, spline, text or fill and its properties window opens (on a dimension, the double tap still edits its value).

### What it shows depending on the element

- **Any element:** **layer**, **color**, **line type**, **width** and **pattern scale**.
- **Text:** all its options: the content, the **font color** or **background color** (the same swatches; two radio buttons choose which one), the **font**, the **height**, the angle, **align with** a line, **readable** and the **insertion point**. If more texts are selected, the change applies to all of them.
- **Point:** its **color**, its X and Y coordinates, whether it is fixed and its **[reference mark](05-restricciones.md#reference-mark)**.
- **[Vector](02-dibujar.md#vector-w):** its **magnitude** (a value or a formula; typing it fixes it), whether it is fixed or read-only and its name.

### Constraints and dimensions

It also lists the element's **constraints and dimensions**, each with **Remove**, and offers the ones that can be added to that element alone:

- **Line:** horizontal, vertical, length and fix.
- **Circle:** diameter and fix.
- **Arc:** radius.

Changes apply immediately and can be undone.

## Copy / Paste

![Copy](../icons/copy.svg) ![Paste](../icons/paste.svg) **Copy / Paste** (in the [dropdown](desplegables.md#copy-and-paste); Ctrl+C and Ctrl+V): the button shows Copy, and after copying it switches to showing Paste (to copy again, use Ctrl+C or the dropdown).

**Copy** stores the selection with its internal constraints.

**Paste** asks for a point and places the center of the box that encloses what you copied at that point (you see the box as you move). You can paste several times; Esc or Select ends it.

**Retention.** What you copied is kept even if you delete the original, but it is lost when you close the app.

## Trim (X)

![Trim](../icons/trim.svg) **Trim (X)**: press and hold, then drag over the sections you want to remove (between crossings with other elements).

**One section.** A tap trims one section. Only that section is removed: the rest of the element is not split at the other crossings. With no crossings, it deletes the whole element.

### Ellipses and splines

It also trims **ellipses** and **splines**:

- **Full ellipse:** it needs 2 crossings and becomes an elliptical arc.
- **Elliptical arc:** it is shortened or split into two that share center and axes.
- **Spline:** each piece is a new spline that passes through the cut, through the original points and through extra points taken from the curve to keep the shape; it is a very close approximation, not an exact one.

## Extend (E)

![Extend](../icons/extend.svg) **Extend (E)**: tap a segment or arc near the end you want to lengthen; it reaches the first element it finds, including ellipses, elliptical arcs and splines.

**Open spline.** An open spline can also be extended: it is lengthened in a straight line, in the direction of its tangent at that end, and the new end point lands on the element it finds (a spline with relations is not extended).

**Extending again.** When you extend again, the same end moves on to the next crossing (it leaves no points at the previous ones).

## Fillet (F) and Chamfer

![Fillet](../icons/fillet.svg) ![Chamfer](../icons/chamfer.svg) **Fillet (F) and Chamfer** (button after [Polygon](02-dibujar.md#polygon-g); tap again or press and hold to choose) joins **two drawn elements** with a tangent arc (fillet) or with a line (chamfer).

**What can be joined.** Segments, arcs and elliptical arcs, in any combination; construction lines do not count.

### Three ways to choose them

1. Tap the point of a **corner** (where two elements end, or two points joined by a coincidence constraint) and type the **radius** or the chamfer **distance**.
2. Tap one element and then the other, **on the side you want to keep**, even if they do not meet at a corner. If they cross or do not even touch, the fillet lengthens or trims each one up to its tangent point; the chamfer needs them to intersect, either themselves or their extensions.
3. **Select before choosing the tool** one or several corner points (the same value for all of them, for example the four of a rectangle) or exactly two elements (the part toward the end farthest from the vertex is kept).

### The value

The value can be a formula (`R1/2`, `m*0.3`). Of the possible solutions, the arc smaller than a half turn and closest to the vertex wins, regardless of the order in which you choose the elements.

### Dimensions that remain

- **Fillet:** it is an arc with its **radius dimension** (editable: changing it moves the arc; in the arc's properties, the **Radius** button edits that same dimension).
- **Chamfer:** it carries one **dimension per leg** (D1, D2...; they can be different), measured in a straight line from the vertex.

### The vertex

At a corner of two lines that share the point, **the point is not deleted**: it stays as a virtual vertex on the two straight lines, and the dimensions and constraints that used it still hold. Between other elements, the vertex (if they intersect) stays as a hidden virtual point.

**Trimming segments.** When a segment is trimmed this way, its length dimensions and its length equality are removed (they no longer hold) and you are notified.

### Warnings and limits

- With loose elements, changing the radius may let the solver deform them: it is best to fix or dimension whatever must not move.
- If the value does not fit, you are warned.
- A fill that used the two elements includes the arc or the chamfer.
- Circles, full ellipses (trim the ellipse first) and vectors cannot be filleted.

## Locked texts and images

**Locked texts and images**: a tap **does not select a text** (in documents with many texts they were grabbed and moved by accident).

### Editing a text in place

A tap **edits it in place**, with the same input as the [Text](07-texto-y-calculo.md#write-a-text-t) tool placed over it and the cursor where you tapped (an equation without its `$$`, a normal text as it is, a script with its code).

- **Enter** saves (in a script, Shift+Enter).
- **Shift+Enter** makes a new line.
- **Tapping outside** also saves.
- **Esc** leaves it as it was.

If what you typed gives an error, you are warned and the input stays open so you can fix it.

**Collapsed code object.** A collapsed code object (an inserted library, or a script without "Show the code in the drawing") is not edited this way: the tap passes through to whatever is underneath (a line, a point); it is opened with a double tap, in its properties.

### Selecting a text

To select a text, **enclose it with a box**, dragging from it or from an empty spot (from left to right it must end up entirely inside; from right to left, touching it is enough); once selected, you drag it to move it.

**Double tap and links.** The **double tap** still opens its properties, and a tap on a **link** selects the text and shows the pill with its destination (without opening it).

### Images

An image has an **insertion point**, like a text: a real point that shows when you select it, accepts constraints and can be read in formulas (`p12.x`). In its properties you choose its anchor (9 positions), and when you enlarge or shrink it that point stays fixed.

**Locked image.** A **locked image** ("Locked" checkbox in its properties) follows the same rule: tapping and dragging ignore it, and the double tap opens its properties so you can unlock it.

---

[← 2. Drawing](02-dibujar.md) · [Index](README.md) · [4. Splitting, copying and repeating →](04-dividir-copiar-y-repetir.md)
