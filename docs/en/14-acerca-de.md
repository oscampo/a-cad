<!-- es: f55eb308a3 -->
# 14. About

The solver that resolves the constraints, the libraries the app uses, and where the version history is.

[← 13. Known limits](13-limites-conocidos.md) · [Index](README.md)

---

The constraints are solved by **PlaneGCS**, the 2D geometric solver of the *Sketcher* module of **FreeCAD**, whose original code is by **Konstantinos Poulios** (© 2011, part of the FreeCAD project, LGPL license).

The app uses it compiled to WebAssembly through the **@salusoft89/planegcs** package (v1.3.0), a wasm build and JavaScript wrapper by **Salusoft89**, licensed LGPL-2.0-or-later: [github.com/Salusoft89/planegcs](https://github.com/Salusoft89/planegcs). FreeCAD: [freecad.org](https://www.freecad.org).

Splines are **native cubic B-splines of PlaneGCS**: each spline point lies on its knot, the poles are auxiliary unknowns of the solver, and the drawn curve is the same one the solver resolves. The point on spline (`point_on_bspline`) and the tangencies with lines, circles and arcs (`angle_via_point_and_param`) are solved exactly. In open splines, zero curvature at the ends is expressed with a midpoint constraint between poles.

Other components: **Lucide** icons (ISC license) and packaging with **Vite** (MIT license).

## Version history

The detail of each version is in [CHANGELOG.md](https://github.com/oscampo/a-cad/blob/main/CHANGELOG.md), and the complete manual in [docs/](https://github.com/oscampo/a-cad/tree/main/docs).

---

[← 13. Known limits](13-limites-conocidos.md) · [Index](README.md)
