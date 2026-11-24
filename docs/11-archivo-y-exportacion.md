# 11. Archivo y exportación

Guardar y abrir dibujos (también en un repositorio de GitHub) y exportar a PNG, SVG, DXF y SVG para corte láser.

[← 10. Estilo, capas y vista](10-estilo-capas-y-vista.md) · [Índice](README.md) · [12. Atajos de teclado →](12-atajos-de-teclado.md)

---

## Botón Archivo

![Archivo](icons/save.svg) **Botón Archivo** (barra, entre el menú y la ayuda) abre el [desplegable](desplegables.md#archivo) con:

- ![Nuevo dibujo](icons/file-plus.svg) **Nuevo**
- **Guardar**
- ![Abrir](icons/folder-open.svg) **Abrir**
- ![PNG](icons/image.svg) **PNG**
- ![SVG](icons/svg.svg) **SVG**
- ![SVG para corte láser](icons/svg.svg) **SVG para corte láser**
- ![DXF](icons/dxf.svg) **DXF**

Antes estaban en una sección del menú de herramientas.

## GitHub

![Abrir de GitHub](icons/folder-open.svg) **GitHub** (Archivo → Guardar en GitHub / Abrir de GitHub / ![Configurar GitHub](icons/props.svg) Configurar GitHub) guarda y abre los .json en un **repositorio privado**.

Sirve para seguir un dibujo en otro dispositivo y tener el historial de versiones (cada guardado es un commit).

### Configuración

Se hace una vez por dispositivo. Se piden:

- Repositorio (`usuario/repositorio`).
- Rama.
- Carpeta.
- Un **token de acceso personal de grano fino** (GitHub → Settings → Developer settings → Fine-grained tokens) limitado a ese único repositorio con el permiso «Contents: Read and write».

### Seguridad del token

El token queda solo en el almacenamiento de este navegador, no entra en los archivos ni en el .json.

Quien tenga acceso a tu navegador podría usarlo, por eso conviene el permiso mínimo y un repositorio solo para dibujos.

### Conflictos y conexión

Si el archivo cambió en GitHub desde la última vez que lo abriste o guardaste aquí (por ejemplo, lo editaste en otro dispositivo), la app pregunta antes de sobrescribir. No hay fusión automática: gana una versión.

Sin conexión no funciona (el guardado local sigue disponible).

### Historial

El historial se ve en GitHub, en la pestaña del archivo → History.

## Administrar los archivos de GitHub

**Administrar los archivos de GitHub** (Archivo → [Abrir de GitHub](#github)) es la lista de los dibujos del repositorio. Tocar un nombre lo abre.

### Seleccionar y actuar sobre varios

Cada fila tiene una casilla para **seleccionar varios** («Todos» / «Ninguno»). Sobre la selección:

- **Papelera:** mueve a la subcarpeta `_papelera` del repositorio, no borra.
- **Renombrar:** uno a la vez.
- **Duplicar:** crea «nombre copia.json».
- **Proteger** / «Quitar protección».

### Papelera

La pestaña **Papelera** permite **Restaurar** o **Eliminar definitivamente**.

Eliminar definitivamente sí es irreversible desde la app; el archivo sigue en el historial de git de GitHub.

### Proteger

Un archivo **protegido** (🔒) pide una segunda confirmación para ir a la papelera y otra para eliminarse del todo.

La marca se guarda en el repositorio (`_ipad-cad.json`, dentro de la carpeta configurada), así vale en todos tus dispositivos, y viaja con el archivo al renombrarlo o moverlo.

### Mover, renombrar y lotes

Mover y renombrar crean el destino y luego borran el original: si algo falla a medias queda una copia de más, nunca se pierde el archivo.

Cada operación es un commit. En lotes grandes GitHub puede frenar las escrituras seguidas, y el aviso lista lo que no se pudo hacer.

### Dibujo actual

Arriba de la lista aparece **Dibujo actual**: el guardado automático de este dispositivo (la hora del último guardado y cuántos elementos tiene), con «Guardar en GitHub» y «Descartar y empezar nuevo».

Solo existe en este dispositivo y se reabre solo al iniciar la app.

### Fecha, búsqueda y orden

- **Fecha:** cada archivo muestra la **fecha de su último cambio** (se pide a GitHub en segundo plano, una por archivo; un archivo renombrado o restaurado cuenta desde ese movimiento).
- **Buscador:** filtra por nombre, sin distinguir mayúsculas ni acentos. Lo que el filtro oculta no se selecciona ni recibe acciones.
- **Orden:** el botón alterna nombre / fecha (la más reciente primero).

## Guardar / Abrir

El dibujo se guarda en un archivo .json (te pide el nombre).

Además, la app recuerda el último dibujo **solo en este navegador**: guarda un .json para respaldar.

## Datos del dispositivo

![Datos](icons/folder-open.svg) **Archivo → Datos…** muestra la carpeta de datos de este dispositivo, común a todos los dibujos: los textos que guarda `wfile(valor, Nombre)` y lee `rfile(Nombre)` (ver [Datos entre dibujos](funciones.md#datos-entre-dibujos)), y los archivos de audio.

### Importar y administrar

**Importar…** agrega un archivo. Un archivo de audio se pide con un nombre, se reduce a un canal, 16 kHz y 8 bits, unos 16 KB por segundo, y suena con `play("nombre")` (ver [Sonidos](funciones.md#sonidos)).

Cada dato se puede **probar** (audio), **exportar** y **borrar**.

### Qué viaja con el dibujo

- Un dibujo lleva consigo, al guardarlo, los audios que nombra entre comillas (también dentro de una biblioteca).
- Al abrirse los restaura si faltan en el dispositivo, sin pisar uno que ya exista con ese nombre (si es distinto, avisa y usa el del dispositivo).
- Un nombre armado con una variable, como `play(n)`, no se detecta y no viaja con el dibujo.
- Los textos de `wfile` no viajan con el dibujo.

## PNG

![PNG](icons/image.svg) **PNG** es una imagen del dibujo.

![SVG](icons/svg.svg) **SVG**: vectorial.

![DXF](icons/dxf.svg) **DXF**: para CAD (las cotas salen como geometría y texto).

## SVG CUT

![SVG para corte láser](icons/svg.svg) **SVG CUT** (corte láser): SVG a escala real en mm.

Cada *clase de línea* (tipo, color y grosor) se manda a:

- **Corte** (color de corte, rojo por defecto).
- **Marcado** (otro color, por ejemplo pliegues).
- **Omitir.**

Sale en dos grupos, "corte" y "marcado". No salen cotas, textos, puntos ni rellenos.

---

[← 10. Estilo, capas y vista](10-estilo-capas-y-vista.md) · [Índice](README.md) · [12. Atajos de teclado →](12-atajos-de-teclado.md)
