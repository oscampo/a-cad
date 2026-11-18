# 14. Acerca de

El solver que resuelve las restricciones, las bibliotecas que usa la app y dónde está el historial de versiones.

[← 13. Límites conocidos](13-limites-conocidos.md) · [Índice](README.md)

---

Las restricciones las resuelve **PlaneGCS**, el solver geométrico 2D del módulo *Sketcher* de **FreeCAD**, cuyo código original es de **Konstantinos Poulios** (© 2011, parte del proyecto FreeCAD, licencia LGPL).

La app lo usa compilado a WebAssembly mediante el paquete **@salusoft89/planegcs** (v1.3.0), un build wasm y envoltorio JavaScript de **Salusoft89**, con licencia LGPL-2.0-or-later: [github.com/Salusoft89/planegcs](https://github.com/Salusoft89/planegcs). FreeCAD: [freecad.org](https://www.freecad.org).

Los splines son **B-splines cúbicos nativos de PlaneGCS**: cada punto del spline queda sobre su nudo, los polos son incógnitas auxiliares del solver y la curva dibujada es la misma que resuelve el solver. El punto sobre spline (`point_on_bspline`) y las tangencias con líneas, círculos y arcos (`angle_via_point_and_param`) se resuelven de forma exacta. En los abiertos, la curvatura nula en los extremos se expresa con una restricción de punto medio entre polos.

Otros componentes: íconos **Lucide** (licencia ISC) y empaquetado con **Vite** (licencia MIT).

## Historial de versiones

El detalle de cada versión está en [CHANGELOG.md](https://github.com/oscampo/ipad-cad/blob/main/CHANGELOG.md), y el manual completo en [docs/](https://github.com/oscampo/ipad-cad/tree/main/docs).

---

[← 13. Límites conocidos](13-limites-conocidos.md) · [Índice](README.md)
