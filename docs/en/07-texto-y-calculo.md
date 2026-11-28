# 7. Text and calculation

Texts that calculate: assignments, outputs, formulas with AsciiMath, vectors and matrices, your own functions and the reading order of the page. Examples with a result are checked against the app engine in the automated tests (`test/calcref.test.mjs`).

The full list of functions and operators, with examples, is in [Functions and operators](funciones.md).

[← 6. Dimensions](06-cotas.md) · [Index](README.md) · [8. Splines and paths (cams and trajectories) →](08-splines-y-trazados.md)

---

## Write a text (T)

Tap where the insertion point goes and type right there, no dialog. What you type is an **equation**: it is saved as a `$$…$$` block, so you do not type the delimiters (you see them in the text properties, double tap).

| Key | What it does |
|---|---|
| **Enter** | Draws what you typed and opens another entry right below. |
| **Shift+Enter** | Another line in the same block (another equation). |
| **Esc** | Discards what you are typing. |
| **Enter** on an empty entry | Finishes. Changing tool also finishes, and draws what you typed. |
| Tap elsewhere | Draws what you typed and moves the entry there. |
| `"` or a space at the start | Plain text instead of an equation (the `“` quotes of the iPad keyboard also work; the quote or the space is not saved). See "Plain text, formulas and literals". |
| `%` at the start | **Script**: a function written as a program, with indentation (see [Programs](funciones.md#programs) in Functions). The first line is the signature (`%suma2(n):`) and below it, indented: `s:0` assigns a local variable, `for i in 1..n:`, `while condición:` and `if c:` / `elif c:` / `else:` open a block with more indentation, `g(x): …` defines a local function and `#` comments; `break` exits the for or while, `continue` moves on to the next iteration and `return x` ends with the value x; otherwise, the last line is the value. Enter keeps the indentation (and increases it after `:`), Tab indents and Shift+Enter draws it. It is drawn collapsed, as a box with its name; the **Show the code** checkbox in its properties expands it. Errors tell you their line. |
| **Suggestions** (`ƒx` button or Ctrl+Space) | A list under the cursor with what exists **at that place in the page**: variables and functions defined before, dimensions, libraries inserted before (after `UF.`, their public names) and the A-CAD functions. What is defined further down does not appear: it does not exist there yet. It is not case sensitive (`kt` finds `Kt_(C2)`) and the letters in order are enough (`csu` finds `C_(surf)`). Beside it, the detail: the drawn definition, the value at that place, or the help and an example; the help of a script is the `#` lines that follow its signature. With the list open, Enter or Tab accept, the arrows choose and Esc closes it without deleting what you typed. While you type the values of a function, a pill above the entry shows its signature with the current argument highlighted. In **Settings → Suggestions while typing**: automatic (they appear after 2 letters; the default on PC and iPad) or on request (the default on the phone). |
| Blue badge | Next to the corner of the entry: `α` is an equation, `A` is plain text and `{}` a script. |
| `[`, `(`, `{`, `$`, `<`, `` ` `` | **They close themselves**: the closing character appears and the cursor stays in the middle (`[\|]`). Typing the closing character when it is already ahead just moves past it; deleting inside an empty pair deletes both; with text selected, it wraps it. `$` inside `$\|$` gives `$$\|$$`. They do not close before a letter or a number, nor `<` inside a formula (it is "less than"), nor the `$` or the `` ` `` that close something already open. It also works in the Text field of the properties. |
| `\` and a letter, or Ctrl+G | **Greek letters** without a Greek keyboard. `\a` becomes α when you type the letter (Backspace right after leaves `\a`). Ctrl+G converts the letter before the cursor (again turns it back) or everything selected; on the Mac it is also Ctrl, not Cmd. Table: `a` α, `b` β, `c` χ, `d` δ, `e` ε, `f` φ, `g` γ, `h` η, `i` ι, `j` ϕ, `k` κ, `l` λ, `m` μ, `n` ν, `p` π, `q` θ, `r` ρ, `s` σ, `t` τ, `u` υ, `v` ϖ, `w` ω, `x` ξ, `y` ψ, `z` ζ; `D` Δ, `F` Φ, `G` Γ, `J` ϑ, `L` Λ, `P` Π, `Q` Θ, `S` Σ, `V` ς, `W` Ω, `X` Ξ, `Y` Ψ. Capitals that look the same as a Latin letter (Α, Β, Ε…) and the ο are not converted. If the next letter can start a symbol or the name of a Greek letter (`\in`, `\to`, `\al`…), it goes back to `\i` and the word is typed as is; when you finish it, a symbol stays (`\in` is drawn ∈), the name of a Greek letter becomes the letter (`\alpha` α) and anything else is the Greek letter plus the rest, as before (`\an` αn). |

## Assign and show values

Each line of an equation is a statement. The value updates by itself when the drawing changes.

| You type | What it does | Example | What you see |
|---|---|---|---|
| `x:valor` | Assigns to **x** the value of an expression. `x:=valor` is drawn, just as you typed it. | `x:2*3` | `x:=2*3` |
| `x:=valor` | The same, typing `:=`. | `k:=4` | `k:=4` |
| `expr=` | A **=** at the end of the line shows the value, with up to 3 decimals. From 1e6 it is shown in scientific notation (`2.569e6`, 4 significant figures); the threshold is changed in **Settings → Scientific notation from**. | `2/3=` | `2/3=0.667` |
| `x:expr=` | Assigns and shows the value on the same line. | `x:2*3=`<br>`y:x+1=` | `x:=2*3=6`<br>`y:=x+1=7` |
| Scientific notation | `2.5e6` is 2.5·10⁶ and `3e-4` is 0.0003 (also with `E`). A very small number is shown with 4 significant figures instead of 0. | `p:2.5e6`<br>`q:3e-4=` | `p:=2.5e6`<br>`q:=3e-4=0.0003` |
| `x:valor'unidad` | **Unit**: the value is given in that unit. Units are converted and propagated: `F*2` stays in N. There are SI units with prefixes (m, g, s, A, K, mol, N, Pa, J, W, V, Ω, Hz, L, bar; k, M, G, c, m, µ, n...) and other common ones (min, h, rpm, atm, psi with prefix such as kpsi, ksi, kgf, lbf, kip, in, ft, lb, hp, gal, deg, rad, %). If the value already carries units, it only says in which unit to show it. | `F:250'N`<br>`F=`<br>`F*2=` | `F:=250 N`<br>`F=250 N`<br>`F*2=500 N` |
| `x:expr'unidad=` | With `=` the calculated value is shown in that unit. | `a:2*3'm/s^2=` | `a:=2*3=6 m/s²` |
| `valor'unidad` | Units inside an expression. A compound unit goes in parentheses: `3'(m/s)`. | `L:2'm+30'cm`<br>`L=` | `L:=2 m+30 cm`<br>`L=2.3 m` |
| `expr='unidad` | Shows the value in the requested unit (of the same magnitude; otherwise ⚠). | `F:2'kN`<br>`F='N` | `F:=2 kN`<br>`F=2000 N` |
| Automatic unit | With no unit requested, the result comes out in the unit of a text variable in the expression or in the usual one of the document's unit system (**Settings → Units**): in SI mm or m, mm² or m², N or kN, N·mm, N·m or kN·m, MPa; in imperial in or ft, in² or ft², lbf or kip, lbf·in, kip·in or kip·ft, psi or ksi. It moves to the larger unit when the number reaches 1000 and stays in it as long as the value is 1 or more (3200 mm is 3.2 m; 1963.5 mm² stays in mm²). A dimension with a unit does not decide the unit of the result: D2 of "126 in" gives `D2=3,2004 m` in SI. Moment and energy are shown as moment (N·m); `='J` asks for joules. | `F:5000'N`<br>`A:2'cm^2`<br>`F/A=` | `F:=5000 N`<br>`A:=2 cm²`<br>`F/A=25 MPa` |
| Units that do not match | Adding, subtracting or comparing different magnitudes gives ⚠, just like a number without units added to one with units. The exception is **0**: it is valid with any unit (0 m = 0 kN), so `x>0` with x in in, `x+0` or `[0, x]` work, and a function such as `if(x>a; x-a; 0)` works with or without units. Functions (sin, ln...) require numbers without units; sqrt, abs and round keep them. | `2'N+3=` | `2 N+3=⚠` |
| Angle with unit | `deg`, `°` and `rad` make an angle. In a dimension, a length with units is converted to mm. | `sin(30'deg)=` | `sin(30 deg)=0.5` |
| `x:a..b;n` | **Range**: n values from a to b, a row vector. With a decimal point it is also written `x:a..b,n`; with a decimal comma, always with `;`. | `x:1..5;5` | `x:=[1, 2, 3, 4, 5]` |
| `x:a..paso..b` | Range with step. | `x:0..0.5..2` | `x:=[0, 0.5, 1, 1.5, 2]` |
| Vector with units | One unit for all the elements: `[1,2,3]'mm`, `[1'm, 20'cm]` or a range `0..10;5'mm`. All are shown in the same unit, and a graph uses them in that unit (the legend says so). Mixing magnitudes in a vector gives ⚠. | `v:[1,2,3]'mm`<br>`v*2=`<br>`sum(v)=` | `v:=[1, 2, 3] mm`<br>`v*2=[2, 4, 6] mm`<br>`sum(v)=6 mm` |
| Your own units | A line `cantidad:cantidad` with exactly one new unit, on either side, defines that unit: `1'vuelta:2π'rad`, `1.70'm:1'persona`, or `1'persona:'persona` (the same unit on both sides) for a new magnitude that does not mix with any other. It applies to the whole drawing, wherever it is (it does not follow the reading order), with letters, _ and numbers (not starting with a number) and without prefixes. It cannot redefine a unit that already exists, with or without prefix: `1'in:30'mm` or `1'mm:'mm` give ⚠, and so does defining the same unit twice. Only proportional units (no offset zero, like °C). | `1'vuelta:2π'rad`<br>`a:0.25'vuelta`<br>`a='deg` | `1'vuelta:2π'rad`<br>`a:=0.25 vuelta`<br>`a=90 deg` |
| Angles | According to **Settings → Angles in**. In degrees (older drawings), a value with π is an angle in radians and one without π is a plain number: `sin(30)` is in degrees. In radians (new drawings), everything is in radians: `sin(π/6)=0.5`. The example is in a drawing in degrees. | `a:30`<br>`sin(a)=` | `a:=30`<br>`sin(a)=0.5` |
| Decimal separator | According to **Settings → Decimal separator**. With **point** (`1.5`) function arguments are separated with a comma, `max(2.5, 3)`, and in a matrix elements are separated with a comma and rows with `;`: `[1, 2; 3, 4]`. With **comma** (`1,5`) arguments are separated with `;`, `max(2,5; 3)`, and in a matrix elements with `;` and rows with `\|`: `[1; 2 \| 3; 4]`; indices too, `A_(1;2)`, and ranges, `x:0,5..2;10` (with a point: `x:0.5..2,10`). When you change it, the formulas already in the drawing are rewritten; older drawings, without the option, accept both forms. |  |  |
| `...` | **Continues on the next line**, as in Python: `...` at the end of a line and, if you want, at the start of the next one. The two lines are a single statement and are drawn like that, split. Useful for an equation that runs past the page margin. | `F:1+2+...`<br>`...3=` | `F:=1+2+...`<br>`...3=6` |
| `(` or `[` open | **Continues without** `...` while a parenthesis or a bracket is open (also as in Python): the indentation does not count and it looks as if it were on a single line. Useful for writing a matrix or a `solve([ecuaciones], [incógnitas])` in columns, with one equation per line. The text is saved as you typed it. | `A:[`<br>`  1, 2;`<br>`  3, 4`<br>`]`<br>`A=` | `A:=[1, 2; 3, 4]`<br>`A=[1, 2; 3, 4]` |
| Error | If the expression cannot be calculated, ⚠ appears instead of the value. | `1/0=` | `1/0=⚠` |
| Complex numbers | A complex result is shown as `3+4j` (`j` is the imaginary unit; see [Complex numbers](funciones.md#complex-numbers) in Functions). The root of a negative number is a complex number. | `sqrt(-4)=` | `sqrt(-4)=2j` |

- **One statement per line**: whatever is left over on the line is marked with ⚠ (`x:2  y:3`). To put two, use Shift+Enter.
- It is not an output if the line ends in `==`, `<=`, `>=`, `!=` or `:=`: there the **=** is part of the operator.
- An assigned vector or matrix already shows its value: in `v:1..3;3=` the final **=** adds nothing.
- An output can read dimensions (including read-only ones and the magnitudes of vectors), variables, and the functions and constants of "Functions and operators". An angle dimension is worth its measure in radians.
- While editing you see `expr=`; the drawing and the exports (SVG, DXF) show `expr=valor`. The magnitude of a vector shows only the value.

## Plain text, formulas and literals

A text that starts with `"` (or with a space) is drawn as is, except what goes between dollar signs, which is mathematical and calculates just like an equation.

| You type | What it does | Example | What you see |
|---|---|---|---|
| `$…$` | Inline formula, within the text. | `"Vale $2*3=$ mm` | `Vale 2*3=6 mm` |
| `$$…$$` | Block formula: each line inside is an equation, centered and at full size. |  |  |
| `` `…` `` | **Literal**: it is drawn but never calculated or read as an assignment or output. Without the quotes, `f:\RR->\RR` would be an assignment. | `` `f:\RR->\RR` ``<br>`` `x =` 3 `` | `f:\RR->\RR`<br>`x = 3` |
| `` `… `` unclosed | It is marked with ⚠. | `` `abierto `` | `` `abierto ⚠ `` |
| `\$` | A dollar sign that does not open a formula. |  |  |
| Lone `$` | It is not a formula: `$5 y $6` is drawn as is. An unclosed `$$` too, with ⚠. |  |  |

## Markdown in plain text

In a plain text (one that starts with `"` or a space), whatever is outside the formulas accepts Markdown. The marks do not cross a formula: `**a $x$ b**` is not bold; write `**a** $x$ **b**`.

| You type | What it does |
|---|---|
| `**negrita**`, `__negrita__` | **Bold**. |
| `*cursiva*`, `_cursiva_` | *Italic*. The `_` inside a word does not count (`mi_archivo`). |
| `***ambas***` | <b>*Bold and italic*</b>. |
| `~~tachado~~` | Strikethrough. |
| `` `código` `` | Monospaced font. In an equation, on the other hand, backticks make a literal. |
| `# `, `## `, `### `, `#### `, `##### `, `###### ` at the start of the line | Heading, in bold and larger (1.6, 1.35, 1.15, 1.05, 1 and 0.9 times the text height). |
| A line and `===` below it | Also a level 1 heading. On the other hand, `---` below a text is always a rule, not a heading. |
| `- `, `* `, `+ ` at the start of the line | Bullet. Two spaces before for each level of indentation. |
| `- [ ] `, `- [x] ` at the start of the line | Task: ☐ pending, ☑ done. |
| `1. `, `1) ` at the start of the line | Numbered list (the number is drawn just as it is typed). |
| `> ` at the start of the line | Quote, with a line on the left; `>> ` is a quote inside another. |
| `> [!note] Título` | **Callout**, with the line and the title in color; the `> ` lines that follow are its body. Without a title the type is shown: `note`, `info`, `tip`, `important`, `warning`, `caution`, `danger`, `example`, `question`, `success`, `quote`… |
| `---` alone on the line | Horizontal rule the width of the text (`***` and `___` also work). |
| `` ``` `` before and after | **Code block**: monospaced, in a box, with no Markdown or formulas inside (`~~~` also works). Four spaces at the start of the lines, after a blank line, do the same. |
| `\| a \| b \|` and below it `\|---\|:-:\|` | **Table**: the first row is the header (in bold); the second gives the alignment of each column (`:--` left, `:-:` center, `--:` right). Cells accept formulas; `\\|` is a bar inside a cell. |
| `[texto](url)` | Link, in blue and underlined. Also `[texto][ref]` with `[ref]: url` on another line (that line is not drawn) and `<https://…>` or `<correo@dominio>`. **To open it**: one tap selects the text and shows above it a pill with the real destination of each link; tap the pill, or the link with the text already selected. Ctrl or Cmd + click opens it right away. Dragging still moves the text and a double tap opens its properties. |
| `[texto](https://…)`, `(mailto:…)`, `(tel:…)` | Web page (in another tab), email or call. `www.algo.com` is taken as `https://`. `javascript:`, `data:` and other destinations are not opened: the pill shows them struck through. |
| `[texto](#graficas)` | A place in the drawing: the view goes to it and selects it. The title of a text works (`## Gráficas !!!` is reached with `#graficas`, without accents, capitals, spaces or signs), the first line of a text or the identifier of an element (`#t17`, `#g94`, `#p5`). |
| `[texto](cicloide.json)` | Another drawing from the configured GitHub repository (File → GitHub), with the path relative to its folder (`sub/a.json`, `../otra/b.json`, `/raiz.json` from the root). It asks first, because unsaved work is lost. With `#lugar` at the end (`cicloide.json#rueda`), it also goes to that place. |
| `![texto](imagen.png)` | Image: the drawing does not load images, it shows ▣ and its alternative text. |
| `![Línea](icon:line)` | **Icon of an app tool**, inside the line, at the height of the letter and in the color of the text. The names are in the help, section "Icons in texts" (tap a row to copy it). If the name does not exist it looks like an image: ▣ and the alternative text. |
| `texto[^1]` y `[^1]: la nota` | **Footnote**: the call mark goes in superscript, numbered in order, and the notes are gathered at the end of the text in smaller type. |
| `<!-- … -->` | Comment: not drawn (can span several lines). |
| `\*` | Leaves the sign as is (works with any punctuation sign): `\*`, `\_`, `\#`, `\[`… A `*` between spaces (`2 * 3`) is already left as is, but `2*3*4` puts the 3 in italics. |
| Line breaks | Every line break is a line break, with or without a page (unlike Markdown, consecutive lines are not joined). With the page (Settings → Page), a line that does not fit is wrapped at the margin, and the left margin is a hard limit: a horizontal text does not start to its left or get dragged past it (graphics can still cross it). A `\` at the end of a line is not drawn. |

## Math notation (AsciiMath)

Formulas follow the syntax of [asciimath.org](https://asciimath.org/). They are drawn with fractions, roots, subscripts and mathematical symbols, and they rotate and export (SVG, DXF) like any text. Parentheses grow with what they enclose.

| You type | Drawn as |
|---|---|
| `a/b` | Fraction (the parentheses around a and b are not shown). |
| `x^2`, `x_1` | Superscript and subscript. |
| `sqrt(x)`, `root 3 x` | Roots. |
| `alpha`, `beta`, `pi`, `Delta`… | Greek letters. |
| `\sum_(i=1)^n`, `\prod`, `\int_0^1`, `\lim_(x->0)` | Sum, product, integral and limit (with `\`; `sum(v)` without it is the calculation function). |
| `sin`, `cos`, `ln`, `mean`, `cumsum`… | Function names (those of AsciiMath and those of the calculation), in upright type. |
| `<=`, `>=`, `!=`, `->`, `=>`, `+-`, `-:`, `!in` | ≤ ≥ ≠ → ⇒ ± ÷ ∉ (typed with signs, without `\`). |
| `\in`, `\to`, `\angle`, `\xx`, `\oo`, `\ll`, `\ne`, `\le`, `\AA`, `\RR`… | **Named symbols**: ∈ → ∠ × ∞ ≪ ≠ ≤ ∀ ℝ. They take a `\` in front, as in LaTeX; without it they are letters (`total`, `line` and `gain` have no → or ∈ inside). When you type `\in`, the `\i` does not turn into ι: the editor waits to see whether a symbol follows. They are for **drawing**: in a formula only `\cdot`, `\times` and the logical operators (`\and` `\or` `\not` `\xor`) are calculated. For everything else write the operator (`<=` `>=` `!=` `*` `/`) or its character (`≤` `≥` `≠` `≈` `×` `÷`): `\le`, `\ne`, `\xx` or `\div` are drawn but give an "Invalid character" error when calculating. |
| `abs(x)`, `floor(x)`, `ceil(x)`, `norm(x)` | Absolute value, floor, ceiling and norm, with their bars. |
| `\hat x`, `\bar x`, `\vec v`, `\tilde`, `\dot`, `\ddot`, `\ul`, `\cancel`, `\overarc` | Accents, underline and strikethrough. |
| `[a, b; c, d]`, `[a; b]`, `[[a,b],[c,d]]`, `((a),(b))` | Matrices and column vectors drawn (not calculated). Inside brackets, `;` separates rows and `,` columns. |
| `[[a,b,\|,c],[d,e,\|,f]]` | Augmented matrix. |
| `{(2x,+,y,=,3),(x,-,y,=,1):}` | System of equations. |
| `\ubrace(…)_("texto")`, `\obrace`, `\overset(x)(=)`, `\underset` | Braces and signs with something above or below. |
| `color(red)(x)` | Color. |
| `\bb`, `\bbb`, `\cc`, `\tt`, `\fr`, `\sf` | Fonts: bold, blackboard, calligraphic, typewriter, fraktur, sans-serif. |
| `"texto"`, `text(hola)` | Upright text inside the formula. |
| `dy/dx`, `f'(x)` | Derivatives. |

- Unlike AsciiMath, without `\` a word is converted only if it is **entirely** a Greek letter, a function, `if`/`and`/`or` or `sqrt`, `abs`, `norm`, `floor`, `ceil`, `root`, `frac`, `text`, `color`; otherwise it is drawn letter by letter: `pi r` is π r, but `pir` is three letters, and so is `sinx` (write `sin x` or `sin(x)`).
- There is no alignment by **=** between lines yet.

## Variable names

They follow the rules for Dimension names: letters, numbers and _, starting with a letter.

| You type | What it does | Example | What you see |
|---|---|---|---|
| `masa_(total)` | Name with a **text subscript**: inside parentheses, free text without parentheses or braces. It is drawn with the subscript in upright type. | `masa_(total):3`<br>`2*masa_(total)=` | `masa_(total):=3`<br>`2*masa_(total)=6` |
| `Se'` | Name with a **prime** at the end (`Se'`, `Se''`, `σ'_(a)`, and functions such as `f'(x)`). The quote is a prime if what follows cannot start a unit (`Se'=`, `Se'*2`); attached to a unit it is still a unit: `x'm` is x in meters. | `Se':210'MPa`<br>`Se'*2=` | `Se':=210 MPa`<br>`Se'*2=420 MPa` |
| Greek letters | They are typed with the letter or with its AsciiMath name, and it is the **same variable**: `beta` is `β`, `Delta_1` is `Δ_1` (`phi` is ϕ and `varphi` is φ, as they are drawn). `pi` is still the constant. To type the letter: `\` and the letter (`\b` → β) or Ctrl+G (see [Write a text](07-texto-y-calculo.md#write-a-text-t)). | `beta:2`<br>`β*3=` | `β:=2`<br>`β*3=6` |
| Reserved | A name cannot be a program function or constant (`sin`, `pi`…) or match the name of a Dimension. `t` is time, and `j`, `α`, `θ`, `ω` (also written `alpha`, `theta`, `omega`) are reserved for future use. | `sin:2` | `sin:=2 ⚠` |

- A text with an invalid name, or that uses a variable that does not exist yet, is rejected when you write it ("undone"). If it arrives some other way (when pasting a text, for example), that definition is left with ⚠ and the variable undefined from there on.
- Names update on their own if you rename a Dimension that they use.

## Reading order

The page is read **from top to bottom** and, within the same row, **from left to right**: inside a text, line by line; texts, by their top left corner. A variable has the value of the **last definition read before it**.

| You type | What it does | Example | What you see |
|---|---|---|---|
| Redefine | A variable can change value further down. | `k:1`<br>`k=`<br>`k:2`<br>`k=` | `k:=1`<br>`k=1`<br>`k:=2`<br>`k=2` |
| Using itself | A redefinition can read the previous value. | `n:1`<br>`n:n+1`<br>`n=` | `n:=1`<br>`n:=n+1`<br>`n=2` |
| Clear: `clear()` | `clear(k)=` clears the text variable k from that point of the reading (further down or further right it no longer exists, unless it is defined again); `clear(a, b)=` clears several (with a decimal comma, `clear(a; b)=`) and `clear(all)=` all the variables and functions of the texts defined before. It shows 1 if all the ones it names existed there and 0 if any did not (the ones that existed are cleared anyway). It also clears a **Dimension** or a **drawing measure** (`clear(D1)=`, `clear(l3.len)=`): from that point they are no longer read (a formula or an output that reads them further down gives ⚠), but they still govern the drawing, and the name is free for a text variable (`D1:7`). If there is a text variable with that name, the first `clear` clears the variable and a later one clears the Dimension; a cleared Dimension is not read again further down. If the text variable was named like a Dimension, when it is cleared the name is left empty (⚠) up to the place on the page where the Dimension label is: from there on the Dimension applies. `clear(all)=` (or `clear()=`) clears **everything**: text variables and functions, Dimensions and drawing measures. It is reversible by position: if something breaks further down, remove the `clear(all)` and clear only what applies. The page works like a timeline: `clear` clears what exists up to that point, and a Dimension whose label is further down has its value again from its label. Drawing measures (`l3.len`, `p1.x`) have no place on the page: once cleared they do not come back. It is useful for closing the scope of a variable, such as a scale eF: a Dimension or a vector that reads it further down gives ⚠ instead of using an old value. `clear` and `all` cannot be used as names. | `k:1`<br>`clear(k)=`<br>`k=` | `k:=1`<br>`clear(k)=1`<br>`k=⚠` |
| System in columns: `solve([…], […])` | The same resolution with two vectors: `solve([ec1; ec2; ec3], [x; y; z])=`, the equations and the names of the unknowns, each in a column. It is useful when the system is large and does not fit on one line of the page. The answer is a column vector `[x=…; y=…; z=…]`. With a decimal comma, rows are separated with `\|` and the two vectors with `;`: `solve([ec1 \| ec2]; [x \| y])=`. The same rules of the previous row apply (initial value, units, goals on the drawing). | `x:1`<br>`y:1`<br>`solve([x+y==3; x-y==1], [x; y])=` | `x:=1`<br>`y:=1`<br>`solve([x+y==3; x-y==1], [x; y])=[x=2; y=1]` |
| Solve: `solve()` | `solve(ec1; ec2; x; y)=` solves a system of equations: those with `==` are the equations and the bare names are the unknowns. Each unknown must be defined earlier with its **initial value**, which sets its unit (`x:1'm`); from that point of the reading it has the solution value, and the output shows it. It is solved numerically from the initial values: with several solutions it gives the closest; if it does not find one, it gives ⚠ and warns (try other initial values). There must be at least as many equations as unknowns. For a single equation inside a formula there is `fzero(ecuación; x; inicial)`. **Goals on the drawing**: if the unknowns are Dimensions, the app moves those Dimensions until the equations are met, and the equations can read drawing measures (read-only Dimensions, `l3.len`, `p1.x`) and text variables. With the height D5 of a rectangle fixed, `solve(D4*D5 == 1200'mm^2; D4)=` adjusts the width D4 so that the area is 1200 mm², also if you change D5 later. The initial value is the one each Dimension has, and the goal is met again with each change (when dragging, when editing another Dimension). It is useful for what is not a measure you can constrain: an area, a product or a quotient of Dimensions, a physics formula. If the goal is a distance or an angle in the drawing (a diagonal measuring 50 mm), it is better to make that Dimension driving: the geometric solver solves it directly and faster. The unknowns must move the drawing: neither read-only nor with a formula, and all Dimensions or all text variables. If there is no solution, the change is not made. `solve` cannot be used as a name. | `x:1'm`<br>`y:1'm`<br>`solve(x^2+y^2==25'm^2; y==x+1'm; x; y)=`<br>`x*y=` | `x:=1 m`<br>`y:=1 m`<br>`solve(x^2+y^2==25 m^2; y==x+1 m; x; y)=x=3 m; y=4 m`<br>`x*y=12 m²` |
| Use before defining | It does not exist yet: it warns that it "is defined further down or further right". | `y=`<br>`y:2` | `y=⚠`<br>`y:=2` |
| Read Dimensions | A definition can use the Dimensions and variables read before it, and is recalculated when they change. | `k:D1/2` |  |

- **Dimensions with a formula** (`D2 = k*2`) are read at the place of their **label**: if `k:1` is above the Dimension and `k:7` further down, `D2` is 2.
- Moving a text or a Dimension label (in Select) recalculates the Dimensions that read text variables.
- While simulating or dragging, the reading order of the Dimensions stays **frozen**: a label that crosses a text does not change its value or stop the simulation. When you release or finish, the normal order returns.
- If the text with the definition is deleted, the Dimensions that read it keep their value and lose the formula.

## Vectors and matrices

They are written in brackets: the comma separates the elements of a row, the semicolon starts another row, and decimals use a point. They are drawn with real brackets and without commas; here they are written with commas, as in "Functions and operators", where the full list of operations is.

| You type | What it does | Example | What you see |
|---|---|---|---|
| `[1, 2; 3, 4]` | Matrix. `[1, 2, 3]` is a row vector and `[1; 2; 3]` a column one. | `A:[1,2;3,4]`<br>`A=` | `A:=[1, 2; 3, 4]`<br>`A=[1, 2; 3, 4]` |
| `[V; M]`, `[A, b]` | **Block** matrix: the elements can be vectors or matrices already defined. `,` puts them side by side (same number of rows) and `;` one below the other (same number of columns). With two rows V and M, `[V; M]` is the system matrix. | `V:[2,1]`<br>`M:[1,3]`<br>`F:[5;10]`<br>`[V;M]^(-1)*F=` | `V:=[2, 1]`<br>`M:=[1, 3]`<br>`F:=[5; 10]`<br>`[V;M]^(-1)*F=[1; 3]` |
| `x^T` | Transpose: of a row vector, the column one. | `x:1..3;3`<br>`x^T=` | `x:=[1, 2, 3]`<br>`x^T=[1; 2; 3]` |
| `x_2`, `x_i`, `x_(i+1)` | Element of a vector, counting from 1. | `x:1..3;3`<br>`x_2=` | `x:=[1, 2, 3]`<br>`x_2=2` |
| `A_(i,j)` | Element of a matrix (row, column). | `A:[1,2;3,4]`<br>`A_(2,1)=` | `A:=[1, 2; 3, 4]`<br>`A_(2,1)=3` |
| `A_(2..3,1)`, `A_(:,1..2)`, `A_(2..end,2)` | A **part** of a matrix: a range of rows and columns (from lowest to highest, starting at 1). `end` is the last one in that direction: `A_(end,1)`. It also works on a vector (`v_(2..end)`) and on a vector of strings. The part is operated like any matrix, with its units. | `A:[1,2,3;4,5,6;7,8,9]`<br>`A_(2..3,1)=` | `A:=[1, 2, 3; 4, 5, 6; 7, 8, 9]`<br>`A_(2..3,1)=[4; 7]` |
| `["Datos", "col1"; "fil1", 1]` | A **matrix with cells of different types**: text and numbers (each number with its unit) in the same matrix. By convention the first row and column hold the names. It is sliced like any matrix (`C_(2,2)`, `C_(2..4,2)`) and, if the slice has a single type, it becomes a numeric matrix or a vector of strings again. Operating on a mixed matrix gives an error that says which cell is in the way. | `C:["Datos","nota";"a",4.5;"b",3.5]`<br>`C_(2..3,2)=` | `C:=["“Datos”","“nota”";"“a”",4.5;"“b”",3.5]`<br>`C_(2..3,2)=[4.5; 3.5]` |
| `A_(2,:)`, `A_(:,2)` | A whole row or column. | `A:[1,2;3,4]`<br>`A_(:,2)=` | `A:=[1, 2; 3, 4]`<br>`A_(:,2)=[2; 4]` |
| `A^(-1)*b` | Solve the system A·x = b. | `A:[1,1;10,1]`<br>`b:[-25;250]`<br>`x:A^(-1)*b=` | `A:=[1, 1; 10, 1]`<br>`b:=[-25; 250]`<br>`x:=[30.556; -55.556]` |

- A range of more than 8 elements is abbreviated with "…".
- `*` is the matrix product: two row vectors give an error (use `.*` or `x*y^T`).
- A name that already exists as a variable (`x_1`, `k_(total)`) is that variable, not an index.
- A Dimension can read an element or a summary (`D1 = x_2`), but not a whole vector or matrix: it warns with a message. The same in Graphs.
- A matrix written over several lines of a `$$` block is split by lines: write it on a single line.

## Custom functions

| You type | What it does | Example | What you see |
|---|---|---|---|
| `f(x):…` | Defines a function. It is drawn `f(x):=…` and used in outputs, variables and Dimensions (`D1 = f(3)`). | `f(x):x^2+1`<br>`f(3)=` | `f(x):=x^2+1`<br>`f(3)=10` |
| `g(a; b):…` | Several parameters, separated by `;` or `,`. | `g(a; b):a*b+1`<br>`g(2; 5)=` | `g(a; b):=a*b+1`<br>`g(2; 5)=11` |
| `if(c; a; b)` | Recursion: only the chosen branch is calculated (up to 200 levels). | `fact(n):if(n<=1; 1; n*fact(n-1))`<br>`fact(5)=` | `fact(n):=if(n<=1; 1; n*fact(n-1))`<br>`fact(5)=120` |
| `f(x):…=` | Defines the function and shows `f(x)` right there, with the variables that have a value at that point (if a parameter is not a variable at that point, it shows nothing). | `x:3`<br>`f(x):x^2+1=` | `x:=3`<br>`f(x):=x^2+1=10` |
| `f(l5)` | A **drawing object** reaches a function of your own by its name (`f(l5)`, `f(a8)`, `f(k1)`) and `typeof(x)` says what it is. Its points are read by their role, the same ones the element tree shows: `o.a` and `o.b` in a line; `o.c` (center), `o.a` (start) and `o.b` (end) in an arc; `o.c` in a circle. Each point has `o.a.x` and `o.a.y`, and the element its properties (`o.len`, `o.ang`, `o.r`). A spline has `s.n` points and `s_i` is the i-th; a contour group has `k1.n` elements, and `k1_i` is the i-th (`k1_i.len`, or stored: `o:k1_i` and then `o.a.x`). A group (`g1`) has `g1.n` objects and `g1_i` is the i-th; its bounding box, and a contour's, is `g1.xmin`, `g1.xmax`, `g1.ymin`, `g1.ymax`, `g1.w` (width) and `g1.h` (height). A text has `t3.x` and `t3.y`. With `varargin` they arrive of any type. What a branch of an `if` does not use does not fail when read (`k.n` in one branch and `o.c.x` in another): it only fails if that branch runs with an object that lacks it. Careful: `e` is Euler's constant, it does not work as a name. | `typeof(3)=` | `typeof(3)="“number”"` |
| `f(a; varargin):…` | Optional values: `varargin` (the last parameter) receives the extra ones, of any type, and they are read with `varargin_1` or `varargin_(k)`; `nargin` is how many values the function received (in any function, **counting the fixed parameters too**: with `f(a; varargin)`, `nargin-1` are those of `varargin`). With `if(nargin==1; …; …)` a default value is given. If what arrives is a **point of the drawing** (`p5`), its coordinates are read with `varargin_1.x` and `varargin_k.y` (or it is stored in a name without an underscore, `q:varargin_1`, and `q.x` is read; a name with an underscore is an index and takes no ".x"). | `d(b; varargin):if(nargin==1; 2*b; b+varargin_1)`<br>`d(5)=`<br>`d(5; 1)=` | `d(b; varargin):=if(nargin==1; 2*b; b+varargin_1)`<br>`d(5)=10`<br>`d(5; 1)=6` |
| Outside variables | It reads the variables that have a value where it is called, not where it was defined. | `k:2`<br>`f(x):x*k`<br>`f(3)=`<br>`k:5`<br>`f(3)=` | `k:=2`<br>`f(x):=x*k`<br>`f(3)=6`<br>`k:=5`<br>`f(3)=15` |

- Parameters have the value they are given (numbers, vectors or matrices) and hide variables with the same name.
- The names of the function and its parameters follow the rules for variables, and cannot be program functions (`sin`, `sum`…).

## Properties with "."

They are used in any formula: Dimensions, texts (`p12.x=`), actuators and Graphs. The measures they read update with the drawing.

| You type | What it is |
|---|---|
| `p12.x`, `p12.y` | Coordinates of a point. |
| `l3.len` (`l3.L`), `l3.ang` | Length of a line and its angle, in radians. |
| `c1.r`, `c1.d`, `c1.x`, `c1.y` | Radius, diameter and center of a circle. |
| `a2.r`, `a2.x`, `a2.y` | Radius and center of an arc. |
| `e1.x`, `e1.y`, `e1.ra`, `e1.rb`, `e1.ang` | An ellipse: its center, its semi-axes (1 is the one of point a and 2 is given by the distance from b to axis 1; 1 is not always the major one) and the angle of axis 1, in radians. They also work on an ellipse that reaches an own function (`k.ra`) or is a member of a group (`k_i.rb`). |
| `e1.sweep` | An elliptical arc: how much it sweeps from its start to its end counterclockwise, as the parametric angle of the ellipse (a full ellipse does not have it). |
| `k1.L` (`k1.len`), `k1.area` | Perimeter of a contour group (the sum of its elements) and its area, which only exists if the elements form a closed chain. |
| `g1.n`, `g1.w`, `g1.h`, `g1.xmin`, `g1.xmax`, `g1.ymin`, `g1.ymax` | A group: how many objects it has and its bounding box (width, height and extremes). |
| `ini.x`, `Brida.L`, `p_(fin).y` | **By its name**: a point, a line, a circle, an arc, an ellipse, a spline, a group or a contour is called in formulas by the name you give it in **Properties → Name**, just like by its id (`ini.x` is `p12.x`), and it also reaches an own function by its name (`f(ini)`, `typeof(Brida)`). The name takes letters and numbers, starts with a letter and may carry a subscript (`iso_1`, `p_(ini)`); it cannot look like an id (`p12`), nor be repeated, nor be a dimension, a text variable or function, or a reserved word, and the other way round: defining a variable or function with the name of an element gives ⚠ (it says which element already has the name); nothing shares a name. When you change an element's name, the formulas that used it are updated (dimensions, texts, actuators and graphs; programs with `%` are not changed automatically and the app warns you). The local variables and parameters of a program do not count. A group or contour with a name of another form (`Vista frontal`) is only used by the tree. Each "Manual run" names its group with the function it calls and a number (`ort2iso_1`, `ort2iso_2`; `script_1` if it draws directly). A copy (paste, mirror, arrays) is a new object: it does not inherit the name and is seen by its id. If two elements end up with the same name (only by editing the file by hand), neither can be called by it. |

## Font and text format

| Property | What it does |
|---|---|
| Font | It is chosen when creating the text or in its properties (double tap on the text): system, Helvetica/Arial, Times/Georgia, Courier/Menlo, Verdana, Palatino, Optima, Futura, American Typewriter and three handwriting fonts. If the device does not have one, a similar generic one is used. |
| Properties | Everything about the text is changed with a **double tap** on it: content, color, font, height, angle, alignment with a line, *Readable* and insertion point. If other texts are selected, the change (except the content) also applies to them, and the height, angle, font, *Readable* and insertion point are kept for new texts. |
| Insertion point | It is a real point: it can be dimensioned, fixed or related. Its place is chosen in the text box. |
| Angle and height | Rotates and scales the text. **Align with** aligns it with a line (the angle becomes an offset); "None" releases it and keeps the orientation. |
| *Readable* | Rotates 180° a text that would end up upside down. |
| Show only the result | In a text that is just `expr=`, it draws the value without the formula: a number, a table or a message. If the result is a string or a vector of strings, it comes out as normal text, one line per string and with its spaces, in the font of the text: useful for a console or a board. A vector of strings that starts and ends with `` "```" `` is drawn as a code block (in the chosen font, or monospaced if none was chosen). It only applies if the text has nothing more than that output. |
| Color and background | The same swatches serve for the font or the background: it is chosen with **Font color** or **Background color**. The background paints the text box (with a small margin) and covers what is underneath; in the background, *Auto* is the paper color and **No background** removes it. It shows in the drawing and in the SVG; the DXF does not carry it. |

## Drawings from before v2.0

When opened, the old syntax is converted to the new one just once, with a notice.

| Before | What happens | Example | Result |
|---|---|---|---|
| `x{=v}` | Definition: becomes a formula with assignment. | `A{=b*h}` | `$A:b*h$` |
| `[=e]` | Output: becomes a formula with **=** at the end. | `[=A]` | `$A=$` |
| Old formula | What would now be read as an assignment or an output is left as a literal. | `$$a:b$$` | `` $$`a:b`$$ `` |

---

[← 6. Dimensions](06-cotas.md) · [Index](README.md) · [8. Splines and paths (cams and trajectories) →](08-splines-y-trazados.md)
