# iPad CAD

Editor de dibujo 2D **paramétrico** para iPad con Apple Pencil, que también funciona en un computador con ratón y teclado. Dibujas la geometría, le pones restricciones y cotas, y el dibujo se mantiene coherente al arrastrar o al cambiar una medida. Además calcula con fórmulas, matrices y funciones dentro del propio dibujo y simula mecanismos con gráficas.

**Abrir la app:** <https://oscampo.github.io/ipad-cad/>

Es una aplicación web instalable (PWA): no necesita App Store ni servidor propio, funciona sin conexión una vez abierta y guarda el dibujo en el dispositivo. Las restricciones las resuelve **PlaneGCS**, el solver geométrico del Sketcher de FreeCAD, compilado a WebAssembly.

## Instalar en el iPad

1. Abre <https://oscampo.github.io/ipad-cad/> en **Safari**.
2. Toca **Compartir** y luego **Añadir a pantalla de inicio**.
3. Abre la app desde su ícono. Se actualiza sola cuando hay una versión nueva: la versión y la compilación que corre se ven abajo a la izquierda del dibujo (por ejemplo, *v1.9.0 a1b2c3d*).

En un computador basta con abrir el enlace en el navegador.

## Qué puedes hacer

- **Dibujar**: puntos, líneas, vectores, líneas constructivas, círculos, arcos, elipses y arcos elípticos, splines, rectángulos y polígonos. Bloqueo suave a horizontal, vertical, paralela, perpendicular y tangente, e imán a intersecciones y puntos medios.
- **Editar**: seleccionar (también con cuadro y con filtro), propiedades con doble toque, copiar y pegar, recortar, extender, dividir, redondeo y chaflán, matrices lineal y circular, y copia espejo vinculadas al original.
- **Restringir y acotar**: horizontal, vertical, paralela, perpendicular, coincidente, punto medio, concéntrica, igual, tangente, fijar y marca de referencia; cotas de distancia, ángulo, radio y diámetro, con fórmulas, nombres (D1, A1, R1, O1), cotas a escala (`4[*10]`) y cotas de solo lectura que alimentan otras.
- **Calcular en el dibujo**: textos con fórmulas en AsciiMath, variables, vectores y matrices (inversa, determinante, índices), funciones propias y salidas `[=expresión]`, leídos en orden de arriba a abajo y de izquierda a derecha, como en una hoja de cálculo matemática.
- **Splines y trayectorias**: B-splines cúbicos que pasan por puntos del dibujo, con intersecciones y tangencias; trazado de la trayectoria de un punto y conversión a spline; curva equidistante para levas.
- **Simulaciones gráficas**: actuadores rotacionales y lineales con una expresión o una tabla en el tiempo, reproductor de la simulación, gráficas de cualquier medida contra el tiempo o contra otra medida, engranajes, rueda y cremallera, y relaciones que valen solo mientras los elementos se tocan (topes, levas).
- **Organizar**: capas, estilos de línea (propios incluidos), colores, grosores y rellenos, y un árbol de elementos con vista por tipo o por capa, relaciones agrupadas por su origen y contornos con su abertura.
- **Guardar y exportar**: archivo `.json`, guardado y administrador de archivos en un repositorio de GitHub (papelera, renombrar, duplicar, proteger), y exportación a PNG, SVG, DXF y SVG para corte láser a escala real.

## Ejemplos

En [`ejemplos/`](ejemplos/) hay dibujos listos para abrir (descárgalos y usa **Archivo → Abrir**):

| Archivo | Qué muestra |
|---|---|
| [`cicloide.json`](ejemplos/cicloide.json) | La cicloide `x = r(θ − sen θ)`, `y = r(1 − cos θ)` con la rueda en cinco posiciones, por capas, y su trazado convertido a spline. |
| [`cicloide-rodando.json`](ejemplos/cicloide-rodando.json) | Una rueda que rueda sin deslizar (`A1 = D1/r`): al arrastrar el punto de contacto, un punto del borde traza la cicloide. |
| [`rueda-rodando.json`](ejemplos/rueda-rodando.json) | Rueda y cremallera: la rodadura con la relación mecánica, y la trayectoria de un punto. |
| [`marca-de-referencia.json`](ejemplos/marca-de-referencia.json) | Marca de referencia frente a punto fijo sobre un riel: la marca recuerda el camino recorrido, el punto fijo no. Guía paso a paso dentro del dibujo. |
| [`marca-de-referencia-2.json`](ejemplos/marca-de-referencia-2.json) | Prueba de memoria con giro: marca de referencia frente a punto coincidente en dos rieles. |
| [`engrane_recto_giro.json`](ejemplos/engrane_recto_giro.json) | Engrane recto paramétrico (módulo `m` y número de dientes `z`) hecho con matrices circulares, con dos ruedas. Variantes [`_ligero`](ejemplos/engrane_recto_giro_ligero.json) y [`_relacion`](ejemplos/engrane_recto_giro_relacion.json) (con relación de engranaje). |

## Documentación

- **[Manual](docs/README.md)**: cada herramienta y concepto en detalle, con un capítulo por tema. Es la referencia para quien empieza o quiere entender cómo funciona algo.
- **Ayuda dentro de la app** (botón **?**): la misma información, compacta y con buscador.
- **[Historial de cambios](CHANGELOG.md)** y [Releases](https://github.com/oscampo/ipad-cad/releases): qué trae cada versión.
- **Límites conocidos**: al final del manual y de la ayuda.

## Desarrollo

Requiere Node.js.

```bash
npm install
npm run dev      # servidor local (también en la red, para probar en el iPad)
npm test         # pruebas: solver, matemática, matrices, orden de lectura, árbol, GitHub simulado...
npm run build    # compilación en dist/
```

- `src/`: la app, sin framework. `main.js` (interfaz y herramientas), `model.js` (documento y elementos), `solver.js` (puente con PlaneGCS), `dims.js` y `params.js` (cotas y fórmulas), `tvars.js` y `expr.js` (cálculo en textos), `tree.js` (árbol de elementos), `help.js` (ayuda).
- `test/`: pruebas en Node (`node test/<archivo>.test.mjs`).
- Publicación: cada push a `main` se publica en GitHub Pages (`.github/workflows/pages.yml`). Una etiqueta `vX.Y.Z` crea el Release con las notas de su sección en `CHANGELOG.md` (`.github/workflows/release.yml`).

## Créditos

- [PlaneGCS](https://github.com/FreeCAD/FreeCAD), solver geométrico 2D del Sketcher de FreeCAD, mediante el paquete [@salusoft89/planegcs](https://github.com/Salusoft89/planegcs) (WebAssembly).
- Íconos [Lucide](https://lucide.dev) (licencia ISC). Empaquetado con [Vite](https://vite.dev) (licencia MIT).
- Inspirado en Updraw.
