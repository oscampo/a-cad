# 11. Archivo y exportación

Guardar y abrir dibujos (también en un repositorio de GitHub) y exportar a PNG, SVG, DXF y SVG para corte láser.

[← 10. Estilo, capas y vista](10-estilo-capas-y-vista.md) · [Índice](README.md) · [12. Atajos de teclado →](12-atajos-de-teclado.md)

---

## Botón Archivo

**Botón Archivo** (barra, entre el menú y la ayuda): abre el desplegable con Nuevo, Guardar, Abrir, PNG, SVG, SVG para corte láser y DXF. Antes estaban en una sección del menú de herramientas.

## GitHub

**GitHub** (Archivo → Guardar en GitHub / Abrir de GitHub / Configurar GitHub): guarda y abre los .json en un **repositorio privado**, para seguir un dibujo en otro dispositivo y tener el historial de versiones (cada guardado es un commit). Configuración, una vez por dispositivo: repositorio (`usuario/repositorio`), rama, carpeta y un **token de acceso personal de grano fino** (GitHub → Settings → Developer settings → Fine-grained tokens) limitado a ese único repositorio con el permiso «Contents: Read and write». El token queda solo en el almacenamiento de este navegador, no entra en los archivos ni en el .json; quien tenga acceso a tu navegador podría usarlo, por eso conviene el permiso mínimo y un repositorio solo para dibujos. Si el archivo cambió en GitHub desde la última vez que lo abriste o guardaste aquí (por ejemplo, lo editaste en otro dispositivo), la app pregunta antes de sobrescribir; no hay fusión automática: gana una versión. Sin conexión no funciona (el guardado local sigue disponible). El historial se ve en GitHub, en la pestaña del archivo → History.

## Administrar los archivos de GitHub

**Administrar los archivos de GitHub** (Archivo → Abrir de GitHub): tocar un nombre lo abre. Cada fila tiene una casilla para **seleccionar varios** («Todos» / «Ninguno»); sobre la selección: **Papelera** (mueve a la subcarpeta `_papelera` del repositorio, no borra), **Renombrar** (uno a la vez), **Duplicar** («nombre copia.json») y **Proteger** / «Quitar protección». La pestaña **Papelera** permite **Restaurar** o **Eliminar definitivamente** (esto sí es irreversible desde la app; el archivo sigue en el historial de git de GitHub). Un archivo **protegido** (🔒) pide una segunda confirmación para ir a la papelera y otra para eliminarse del todo; la marca se guarda en el repositorio (`_ipad-cad.json`, dentro de la carpeta configurada), así vale en todos tus dispositivos, y viaja con el archivo al renombrarlo o moverlo. Mover y renombrar crean el destino y luego borran el original: si algo falla a medias queda una copia de más, nunca se pierde el archivo. Cada operación es un commit; en lotes grandes GitHub puede frenar las escrituras seguidas, y el aviso lista lo que no se pudo hacer. Arriba de la lista aparece **Dibujo actual**: el guardado automático de este dispositivo (la hora del último guardado y cuántos elementos tiene), con «Guardar en GitHub» y «Descartar y empezar nuevo»; solo existe en este dispositivo y se reabre solo al iniciar la app. Cada archivo muestra la **fecha de su último cambio** (se pide a GitHub en segundo plano, una por archivo; un archivo renombrado o restaurado cuenta desde ese movimiento), hay un **buscador** por nombre (sin distinguir mayúsculas ni acentos; lo que el filtro oculta no se selecciona ni recibe acciones) y el botón **Orden** alterna nombre / fecha (la más reciente primero).

## Guardar / Abrir

El dibujo se guarda en un archivo .json (te pide el nombre). Además, la app recuerda el último dibujo **solo en este navegador**: guarda un .json para respaldar.

## Datos del dispositivo

**Archivo → Datos…** muestra la carpeta de datos de este dispositivo, común a todos los dibujos: los textos que guarda `wfile(valor, Nombre)` y lee `rfile(Nombre)`, y los archivos de audio. **Importar…** agrega un archivo (un archivo de audio se pide con un nombre, se reduce a un canal, 16 kHz y 8 bits, unos 16 KB por segundo, y suena con `play("nombre")`). Cada dato se puede **probar** (audio), **exportar** y **borrar**. Un dibujo lleva consigo, al guardarlo, los audios que nombra entre comillas (también dentro de una biblioteca) y al abrirse los restaura si faltan en el dispositivo, sin pisar uno que ya exista con ese nombre (si es distinto, avisa y usa el del dispositivo). Un nombre armado con una variable, como `play(n)`, no se detecta y no viaja con el dibujo. Los textos de `wfile` no viajan con el dibujo.

## PNG

Imagen del dibujo. **SVG**: vectorial. **DXF**: para CAD (las cotas salen como geometría y texto).

## SVG CUT

**SVG CUT** (corte láser): SVG a escala real en mm. Cada *clase de línea* (tipo, color y grosor) se manda a **Corte** (color de corte, rojo por defecto), **Marcado** (otro color, por ejemplo pliegues) u **Omitir**. Sale en dos grupos, "corte" y "marcado". No salen cotas, textos, puntos ni rellenos.

---

[← 10. Estilo, capas y vista](10-estilo-capas-y-vista.md) · [Índice](README.md) · [12. Atajos de teclado →](12-atajos-de-teclado.md)
