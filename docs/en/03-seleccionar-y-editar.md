<!-- es: d3fa5aeeaa -->
# 3. Selecting and editing

Selecting (by tap, box or filter), viewing and changing an element's properties, and the tools that modify what you drew: copy, trim, extend, fillet and chamfer.

[← 2. Drawing](02-dibujar.md) · [Index](README.md) · [4. Splitting, copying and repeating →](04-dividir-copiar-y-repetir.md)

---

## Select (V)

Selects, drags points, lines or the edge of a circle (the mechanism moves according to the constraints) and, when you drag from an empty spot, selects with a box. A box drawn from left to right takes what ends up entirely inside; from right to left, it also takes what it touches. **Graphs** are part of the selection (a single one behaves as if you tapped it; several, or together with other elements, are highlighted, deleted and moved along with them).

With **several elements selected**, dragging any one of them moves all of them together: their free points (endpoints, centers, control points and the insertion point of texts). Fixed points and reference marks stay where they are, and the constraints still hold, so whatever is tied to something fixed adjusts instead of moving as a whole. With a single element selected, dragging works as usual (the edge of a circle changes its radius).

## Filter

**Filter** (in the Select dropdown): chooses what can be selected, by entity (points, lines, circles, arcs, ellipses, splines, texts, fills, dimensions) and by line type. It applies to tapping and to the selection box. A red dot on the button shows that a filter is active.

## Box selection

With the Select tool, drag from an empty spot. From **left to right** (blue box, solid line) it selects the elements that end up **completely inside**; from **right to left** (orange box, dashed line) it also selects those the box **touches**. With Shift it adds to the selection. It reaches points, lines, circles, arcs, splines and texts (a text by its insertion point). With a finger, turn on *Finger draws*, because otherwise the finger pans the canvas.

## Overlapping elements

**Overlapping elements** (Select tool): when several elements share a spot or sit almost on top of each other (coincident points, centers of concentric circles or arcs, collinear lines), **tap and hold** on them for about 0.7 s: a floating window opens with a list of all the elements near the tap, from the nearest to the farthest. Check the ones you want: they are highlighted in orange in the drawing so you can identify them. **Confirm** leaves them selected (anything you already had selected outside that list is kept) and **Cancel** (or Esc) closes without changing anything. "All" / "None" checks the whole list. **Properties** (active when only one element is checked) leaves it selected and opens its properties window without closing the list; it is the way to edit it without an extra tap undoing the selection. You can move the window by dragging its title bar, to clear the work area (it stays where you leave it). With a single element under your finger it does not appear: the usual magnifier follows. It respects the selection filter.

## Properties

**Double-tap** a point, line, circle, arc, ellipse, spline, text or fill and its properties window opens (on a dimension, the double tap still edits its value). Depending on the element: **layer**, **color**, **line type**, **thickness** and **pattern scale**; for a text, all its options: the content, the **font color** or **background color** (the same swatches; two radio buttons choose which one), the **font**, the **height**, the angle, **align with** a line, **readable** and the **insertion point** (if more texts are selected, the change applies to all of them); for a point, its **color**, its X and Y coordinates, whether it is fixed and its **reference mark**; for a **vector**, its **magnitude** (a value or a formula; typing it fixes it), whether it is fixed or read-only and its name. It also lists the element's **constraints and dimensions**, each with "Remove", and offers the ones that can be added to that element alone (line: horizontal, vertical, length and fix; circle: diameter and fix; arc: radius). Changes apply immediately and can be undone.

## Copy / Paste

**Copy / Paste** (dropdown; Ctrl+C and Ctrl+V): the button shows Copy, and after copying it switches to showing Paste (to copy again, use Ctrl+C or the dropdown). Copy stores the selection with its internal constraints; Paste asks for a point and places the center of the box that encloses what you copied at that point (you see the box as you move). You can paste several times; Esc or Select ends it. What you copied is kept even if you delete the original, but it is lost when you close the app.

## Trim (X)

Press and hold, then drag over the sections you want to remove (between crossings with other elements). A tap trims one section. Only that section is removed: the rest of the element is not split at the other crossings. With no crossings, it deletes the whole element. It also trims **ellipses** (a full ellipse needs 2 crossings and becomes an elliptical arc; an elliptical arc is shortened or split into two that share center and axes) and **splines** (each piece is a new spline that passes through the cut, through the original points and through extra points taken from the curve to keep the shape; it is a very close approximation, not an exact one).

## Extend (E)

Tap a segment or arc near the end you want to lengthen; it reaches the first element it finds, including ellipses, elliptical arcs and splines. An open spline can also be extended: it is lengthened in a straight line, in the direction of its tangent at that end, and the new end point lands on the element it finds (a spline with relations is not extended). When you extend again, the same end moves on to the next crossing (it leaves no points at the previous ones).

## Fillet (F) and Chamfer

**Fillet (F) and Chamfer** (button after Polygon; tap again or press and hold to choose): joins **two stroke elements** (segments, arcs and elliptical arcs, in any combination; construction lines do not count) with a tangent arc (fillet) or with a line (chamfer). There are three ways to choose them: **(1)** tap the point of a **corner** (where two elements end, or two points joined by a coincidence constraint) and type the **radius** or the chamfer **distance**; **(2)** tap one element and then the other, **on the side you want to keep**, even if they do not meet at a corner (they cross or do not even touch: the fillet lengthens or trims each one up to its tangent point; the chamfer needs them to intersect, either themselves or their extensions); **(3)** **select before choosing the tool** one or several corner points (the same value for all of them, for example the four of a rectangle) or exactly two elements (the part toward the end farthest from the vertex is kept). The value can be a formula (`R1/2`, `m*0.3`). Of the possible solutions, the arc smaller than a half turn and closest to the vertex wins, regardless of the order in which you choose the elements. The fillet is an arc with its **radius dimension** (editable: changing it moves the arc; in the arc's properties, the "Radius" button edits that same dimension); the chamfer carries one **dimension per leg** (D1, D2...; they can be different), measured in a straight line from the vertex. At a corner of two lines that share the point, **the point is not deleted**: it stays as a virtual vertex on the two straight lines, and the dimensions and constraints that used it still hold; between other elements, the vertex (if they intersect) stays as a hidden virtual point. When a segment is trimmed this way, its length dimensions and its length equality are removed (they no longer hold) and you are notified. With loose elements, changing the radius may let the solver deform them: it is best to fix or dimension whatever must not move. If the value does not fit, you are warned. A fill that used the two elements includes the arc or the chamfer. Circles, full ellipses (trim the ellipse first) and vectors cannot be filleted.

## Locked texts and images

**Locked texts and images**: a tap **does not select a text** (in documents with many texts they were grabbed and moved by accident): a tap **edits it in place**, with the same input as the Text tool placed over it and the cursor where you tapped (an equation without its `$$`, a normal text as it is, a script with its code). Enter saves (in a script, Shift+Enter), Shift+Enter makes a new line, tapping outside also saves and Esc leaves it as it was; if what you typed gives an error, you are warned and the input stays open so you can fix it. A collapsed code object (an inserted library, or a script without "Show the code in the drawing") is not edited this way: the tap passes through to whatever is underneath (a line, a point); it is opened with a double tap, in its properties. To select a text, **enclose it with a box**, dragging from it or from an empty spot (from left to right it must end up entirely inside; from right to left, touching it is enough); once selected, you drag it to move it. The **double tap** still opens its properties, and a tap on a **link** selects the text and shows the pill with its destination (without opening it). An image has an **insertion point**, like a text: a real point that shows when you select it, accepts constraints and can be read in formulas (`p12.x`); in its properties you choose its anchor (9 positions), and when you enlarge or shrink it that point stays fixed. A **locked image** ("Locked" checkbox in its properties) follows the same rule: tapping and dragging ignore it, and the double tap opens its properties so you can unlock it.

---

[← 2. Drawing](02-dibujar.md) · [Index](README.md) · [4. Splitting, copying and repeating →](04-dividir-copiar-y-repetir.md)
