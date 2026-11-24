<!-- es: 22d87b376f -->
# 11. File and export

Saving and opening drawings (also in a GitHub repository) and exporting to PNG, SVG, DXF and SVG for laser cutting.

[← 10. Style, layers and view](10-estilo-capas-y-vista.md) · [Index](README.md) · [12. Keyboard shortcuts →](12-atajos-de-teclado.md)

---

## File button

![File](../icons/save.svg) **File button** (bar, between the menu and help) opens the [dropdown](02-dibujar.md#dropdown-buttons) with:

- ![New drawing](../icons/file-plus.svg) **New**
- **Save**
- ![Open](../icons/folder-open.svg) **Open**
- ![PNG](../icons/image.svg) **PNG**
- ![SVG](../icons/svg.svg) **SVG**
- ![SVG for laser cutting](../icons/svg.svg) **SVG for laser cutting**
- ![DXF](../icons/dxf.svg) **DXF**

They used to be in a section of the tools menu.

## GitHub

![Open from GitHub](../icons/folder-open.svg) **GitHub** (File → Save to GitHub / Open from GitHub / ![Set up GitHub](../icons/props.svg) Set up GitHub) saves and opens .json files in a **private repository**.

It lets you continue a drawing on another device and keep the version history (each save is a commit).

### Setup

Done once per device. You are asked for:

- Repository (`user/repository`).
- Branch.
- Folder.
- A **fine-grained personal access token** (GitHub → Settings → Developer settings → Fine-grained tokens) limited to that single repository with the "Contents: Read and write" permission.

### Token security

The token stays only in this browser's storage, does not go into the files or the .json.

Anyone with access to your browser could use it, which is why the minimum permission and a repository used only for drawings are advisable.

### Conflicts and connection

If the file changed on GitHub since the last time you opened or saved it here (for example, you edited it on another device), the app asks before overwriting. There is no automatic merge: one version wins.

It does not work offline (local saving is still available).

### History

The history is visible on GitHub, in the file's tab → History.

## Managing GitHub files

**GitHub files** (File → [Open from GitHub](#github)) is the list of the drawings in the repository. Tapping a name opens it.

### Select and act on several

Each row has a checkbox to **select several** ("All" / "None"). On the selection:

- **Trash:** moves to the repository's `_papelera` subfolder, does not delete.
- **Rename:** one at a time.
- **Duplicate:** creates "name copia.json".
- **Protect** / "Remove protection".

### Trash

The **Trash** tab lets you **Restore** or **Delete permanently**.

Delete permanently is irreversible from the app; the file remains in GitHub's git history.

### Protect

A **protected** file (🔒) asks for a second confirmation to go to the trash and another to be deleted completely.

The mark is saved in the repository (`_ipad-cad.json`, inside the configured folder), so it applies on all your devices, and travels with the file when it is renamed or moved.

### Move, rename and batches

Moving and renaming create the destination and then delete the original: if something fails halfway you are left with an extra copy, the file is never lost.

Each operation is a commit. In large batches GitHub may throttle consecutive writes, and the notice lists what could not be done.

### Current drawing

Above the list appears **Current drawing**: the automatic save of this device (the time of the last save and how many elements it has), with "Save to GitHub" and "Discard and start new".

It exists only on this device and reopens by itself when the app starts.

### Date, search and sort

- **Date:** each file shows the **date of its last change** (requested from GitHub in the background, one per file; a renamed or restored file counts from that move).
- **Search box:** filters by name, ignoring case and accents. What the filter hides is not selected and does not receive actions.
- **Sort:** the button toggles name / date (most recent first).

## Save / Open

The drawing is saved to a .json file (it asks for the name).

In addition, the app remembers the last drawing **only in this browser**: save a .json to back it up.

## Device data

![Data](../icons/folder-open.svg) **File → Data…** shows the data folder of this device, shared by all drawings: the texts saved by `wfile(valor, Nombre)` and read by `rfile(Nombre)` (see [Data between drawings](funciones.md#data-between-drawings)), and the audio files.

### Import and manage

**Import…** adds a file. An audio file is asked for with a name, is reduced to one channel, 16 kHz and 8 bits, about 16 KB per second, and plays with `play("nombre")` (see [Sounds](funciones.md#sounds)).

Each item can be **tested** (audio), **exported** and **deleted**.

### What travels with the drawing

- When a drawing is saved it carries the audio files it names in quotes (also inside a library).
- When opened, it restores them if they are missing on the device, without overwriting one that already exists with that name (if it is different, it warns and uses the one on the device).
- A name built from a variable, such as `play(n)`, is not detected and does not travel with the drawing.
- The `wfile` texts do not travel with the drawing.

## PNG

![PNG](../icons/image.svg) **PNG** is an image of the drawing.

![SVG](../icons/svg.svg) **SVG**: vector.

![DXF](../icons/dxf.svg) **DXF**: for CAD (dimensions come out as geometry and text).

## SVG CUT

![SVG for laser cutting](../icons/svg.svg) **SVG CUT** (laser cutting): SVG at real scale in mm.

Each *line class* (type, color and width) is sent to:

- **Cut** (cut color, red by default).
- **Mark** (another color, for example folds).
- **Skip.**

It comes out in two groups, "cut" and "mark". Dimensions, texts, points and fills are not exported.

---

[← 10. Style, layers and view](10-estilo-capas-y-vista.md) · [Index](README.md) · [12. Keyboard shortcuts →](12-atajos-de-teclado.md)
