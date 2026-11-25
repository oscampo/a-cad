# Functions and operators

Everything a formula accepts, in Dimensions, Texts (`x:…` and `expr=`), actuators and Graphs. Each example shows what it gives; all are checked against the app's engine in the automated tests (`test/funcref.test.mjs`). How formulas, variables and the reading order work is explained in [6. Dimensions](06-cotas.md) and [7. Text and calculation](07-texto-y-calculo.md).

[Index](README.md) · [7. Text and calculation](07-texto-y-calculo.md)

---

## Operators

They work in Dimensions, Texts (`x:…` and `expr=`), actuators and Graphs.

| Function | What it does | Example | Gives |
|---|---|---|---|
| `+ - * /` | Addition, subtraction, multiplication and division. Also `÷`; between two vectors, `·` is `dot` and `×` is `cross` (see below). | `2+3*4` | `14` |
| `^` (`**`) | Power. | `2^10` | `1024` |
| Implicit | A number next to a parenthesis, π or a name multiplies. | `3(4+1)` | `15` |
| `√` | Square root of what follows. | `√16` | `4` |
| `;` y `, ` | They separate the values of a multi-argument function. `2,5` without a space is the number 2.5. | `max(3; 8)` | `8` |
| `< > <= >= == !=` | They compare: give 1 if true and 0 if not. Also `≤ ≥ ≠`. `==` and `!=` tolerate rounding. | `0.1+0.2==0.3` | `1` |
| `if(c; a; b)` (`si`) | If the condition `c` is not 0 the value is `a`, otherwise `b`. It only calculates the chosen branch. | `if(0==0; 0; 1/0)` | `0` |
| `a ≈ b` (`a ~~ b`) | Almost equal: 1 if |a − b| ≤ tolerance × max(1, |a|, |b|), otherwise 0. The tolerance (1e-12 by default) is changed in **Settings**. Use it to compare rounded results; `==` remains the app's equality. With the same tolerance, a unitless result (or each element of a vector or matrix) other than 0 with |x| ≤ tolerance is shown as `≈0` (rounding noise, not an exact zero). | `0.1+0.2 ~~ 0.3` | `1` |

## Constants

| Function | What it does | Example | Gives |
|---|---|---|---|
| `π` (`pi`) | Pi. A value that carries π is in radians. | `π` | `3.1416` |
| `e` | Euler's number. | `e` | `2.7183` |

## Trigonometry

The angles in **calculation texts and Graphs** follow the drawing option **Settings → Angles in**: in **radians** (new drawings: `sin(π/2)` gives 1) or in **degrees** (older drawings, which do not have the option: `sin(30)` gives 0.5). In degrees, if the argument carries π or is a drawing angle (an angular dimension such as `A1` or `l3.ang`) it is in radians. **Dimensions** and actuators always use degrees; in an angular dimension in radians, everything is in radians.

| Function | What it does | Example | Gives |
|---|---|---|---|
| `sin` (`sen`), `cos`, `tan` | Sine, cosine and tangent. | `sin(30)` | `0.5` |
|  | With π, in radians. | `cos(π/3)` | `0.5` |
| `sec`, `csc`, `cot` | Secant, cosecant and cotangent, with the same rule. | `sec(60)` | `2` |
| `asin`, `acos`, `atan` | Inverses: return degrees (radians if the drawing is in radians). | `asin(0.5)` | `30` |
| `atan2(y; x)` | Angle of the point (x, y) in degrees, from −180 to 180. | `atan2(1; -1)` | `135` |
| `sinh`, `cosh`, `tanh`, `asinh`, `acosh`, `atanh` | Hyperbolic (they do not use angles). | `cosh(0)` | `1` |
| `deg(x)` | From radians to degrees. | `deg(π)` | `180` |
| `rad(x)` | From degrees to radians. | `rad(180)` | `3.1416` |
| `sind`, `cosd`, `tand` | Like sin, cos and tan, but the angle is always in degrees (regardless of the drawing's mode). | `sind(30)` | `0.5` |
| `asind`, `acosd`, `atand` | Inverses, with the result always in degrees. | `atand(1)` | `45` |

## Roots, powers and logarithms

| Function | What it does | Example | Gives |
|---|---|---|---|
| `sqrt` (`raiz`, `√`) | Square root. | `sqrt(2)` | `1.4142` |
| `exp` | e raised to x. | `exp(1)` | `2.7183` |
| `ln` | Natural logarithm. | `ln(e^2)` | `2` |
| `log` (`log10`) | Base-10 logarithm. | `log(1000)` | `3` |
| `abs` | Absolute value. | `abs(-7)` | `7` |
| `sign` (`signo`) | Sign: −1, 0 or 1. | `sign(-3)` | `-1` |
| `hypot(a; b; …)` | Square root of the sum of squares. | `hypot(3; 4)` | `5` |
| `nthroot(x; n)` | Real n-th root: with negative x and odd n it gives a negative (x^(1/n) would give a complex number). With units: nthroot(27'm^3; 3) = 3 m. | `nthroot(-27; 3)` | `-3` |
| `log2` | Base-2 logarithm. | `log2(8)` | `3` |

## Rounding, minimums and maximums

| Function | What it does | Example | Gives |
|---|---|---|---|
| `round(x; n)` (`redondear`) | Rounds to `n` decimals (0 if omitted). Halves round away from zero. | `round(2.675; 2)` | `2.68` |
| `floor` (`piso`) | Integer rounded down. | `floor(-2.5)` | `-3` |
| `ceil` (`techo`) | Integer rounded up. | `ceil(2.1)` | `3` |
| `trunc` | Removes the decimals. | `trunc(-2.7)` | `-2` |
| `mod(a; b)` | Remainder of a divided by b, with the sign of b. | `mod(-7; 3)` | `2` |
| `min(a; b; …)`, `max(a; b; …)` | The smallest and the largest of several values. | `min(4; 1; 9)` | `1` |
| `clamp(x; mín; máx)` | Clamps x to the interval. | `clamp(15; 0; 10)` | `10` |
| `fix` | Toward zero (like trunc). | `fix(-2.7)` | `-2` |
| `rem(a; b)` | Remainder of a divided by b, with the sign of a (mod takes the sign of b). | `rem(-7; 3)` | `-1` |
| `gcd(a; b)`, `lcm(a; b)` | Greatest common divisor and least common multiple (integers). | `gcd(12; 18)+lcm(4; 6)` | `18` |
| `factorial(n)` | n! (n an integer from 0 to 170). | `factorial(5)` | `120` |
| `nchoosek(n; k)` | Combinations of n taken k at a time. | `nchoosek(5; 2)` | `10` |
| `rand()`, `rand(n)`, `rand(n; m)` | Uniform random numbers in [0, 1): one, an n×n or n×m matrix (`rand(1; 200)`, a row). The sequence is **reproducible**: each calculation of the drawing starts from the same seed, so an output and its graph show the same values. | `size(rand(2; 3))` | `[2, 3]` |
| `randn(…)` | Like rand, with a standard normal distribution (mean 0, deviation 1). For mean μ and deviation s: `μ + s*randn(1; n)`. | `numel(randn(1; 5))` | `5` |
| `randi(imax; …)`, `randi([a, b]; …)` | Random integers from 1 to imax, or from a to b; with n and m, a matrix. | `min(randi([4, 4]; 1; 3))` | `4` |
| `rng(semilla)`, `rng("shuffle")` | Changes the seed of rand, randn and randi from that point of the reading: another sequence, also reproducible. With `"shuffle"`, a new seed with each change of the drawing (and with each step of `wfile`): for a game or a simulation that must not repeat. Between changes it is kept: the screen is redrawn with the same draw. The seed is what counts. | `rng(7)` | `7` |

## Vectors and matrices

They are written in square brackets: the comma separates the elements of a row, the semicolon starts another row, and decimals use a point. They are used in Texts (`A:[1,2;3,4]`, `A=`); a dimension can read an element (`D1 = x_2`).

| Function | What it does | Example | Gives |
|---|---|---|---|
| `[1, 2, 3]`, `[1; 2; 3]` | Row vector and column vector. | `[1,2,3]^T` | `[1; 2; 3]` |
| `[V; M]`, `[A, b]` | By blocks: the elements can be vectors or matrices. The comma puts them side by side (same number of rows) and the semicolon one below the other (same number of columns). | `V:[2,1]`<br>`M:[1,3]`<br>`F:[5;10]`<br>`[V;M]^(-1)*F=` | `[1; 3]` |
| `a..b;n` | Range: `n` values from a to b, both included. | `x:0..1;5`<br>`x=` | `[0, 0.25, 0.5, 0.75, 1]` |
| `a..paso..b` | Range with step, not going past b (the step can be negative). | `x:10..-3..1`<br>`x=` | `[10, 7, 4, 1]` |
| `x_i`, `A_(i,j)` | Element, counting from 1. The indices can be formulas: `x_(i+1)`. | `A:[1,2;3,4]`<br>`A_(2,1)=` | `3` |
| `A_(i,:)`, `A_(:,j)` | Row i and column j. | `A:[1,2;3,4]`<br>`A_(:,2)=` | `[2; 4]` |
| `^T` | Transpose. | `[1,2;3,4]^T` | `[1, 3; 2, 4]` |
| `+ -` | Between matrices of the same size, or a number with each element. | `[1,2]+10` | `[11, 12]` |
| `*` | Matrix product (or number times matrix). | `[1,2;3,4]*[5;6]` | `[17; 39]` |
| `.* ./ .^` | Element by element. | `[1,2,3].^2` | `[1, 4, 9]` |
| Single-argument functions | On a matrix, they apply to each element. | `sqrt([4,9])` | `[2, 3]` |
| `inv(A)`, `A^(-1)` | Inverse (warns if it is singular or not square). | `inv([2,0;0,4])` | `[0.5, 0; 0, 0.25]` |
| `A^n` | Integer power of a square matrix. | `[1,1;0,1]^3` | `[1, 3; 0, 1]` |
| `det` | Determinant. | `det([1,2;3,4])` | `-2` |
| `trace` | Trace: sum of the diagonal. | `trace([1,2;3,4])` | `5` |
| `diag` | From a vector, the diagonal matrix; from a matrix, its diagonal. | `diag([1,2])` | `[1, 0; 0, 2]` |
| `eye(n)` | n×n identity matrix. | `eye(2)` | `[1, 0; 0, 1]` |
| `rows`, `cols`, `len` | Rows, columns and number of elements. | `len([1,2;3,4])` | `4` |
| `sum`, `prod` | Sum and product of all the elements. | `sum([1,2;3,4])` | `10` |
| `mean`, `median` | Mean and median. | `median([4,1,3,2])` | `2.5` |
| `std`, `variance` | Sample standard deviation and variance (divided by n−1). | `variance([2,4,4,4,5,5,7,9])` | `4.5714` |
| `norm` | Euclidean norm (Frobenius for a matrix). | `norm([3,4])` | `5` |
| `min(x)`, `max(x)` | With a single vector: its smallest and largest element. | `max([4,1,9])` | `9` |
| `cumsum`, `cumprod` | Cumulative sum and product. | `cumsum([1,2,3])` | `[1, 3, 6]` |
| `dot(a; b)` | Dot product. Also written `a · b` (or `a ⋅ b`), in any orientation except column by row (`a · bᵀ`), which is the outer product, a matrix. | `dot([1,2,3]; [4,5,6])` | `32` |
| `cross(a; b)` | Cross product of 3-element vectors. Also written `a × b`. With three vectors, `a×b×c` and `a·b×c` are ambiguous and give an error: use parentheses. | `cross([1,0,0]; [0,1,0])` | `[0, 0, 1]` |
| `dist(p; q)` | Distance between two points (vectors of the same size, with their units). | `dist([0,0]; [3,4])` | `5` |

## Building and reordering matrices

Those that reorder keep the units and the complex numbers.

| Function | What it does | Example | Gives |
|---|---|---|---|
| `zeros(n; m)`, `ones(n; m)` | Matrix of zeros or ones (n×n with a single value). | `zeros(2; 3)` | `[0, 0, 0; 0, 0, 0]` |
| `linspace(a; b; n)` | n evenly spaced values from a to b (100 if n is omitted). | `linspace(0; 1; 5)` | `[0, 0.25, 0.5, 0.75, 1]` |
| `logspace(a; b; n)` | n values from 10^a to 10^b on a logarithmic scale (50 if n is omitted). | `logspace(0; 2; 3)` | `[1, 10, 100]` |
| `numel(A)`, `size(A)` | Number of elements (also of a string vector); [rows, columns]. | `size([1,2,3;4,5,6])` | `[2, 3]` |
| `transpose(A)` | Transpose (like A^T). | `transpose([1,2;3,4])` | `[1, 3; 2, 4]` |
| `sort(v)` | Sorts a vector from smallest to largest. | `sort([3,1,2])` | `[1, 2, 3]` |
| `flip(v)`, `fliplr(A)`, `flipud(A)` | Reverses the order: a vector; the columns (left-right); the rows (top-bottom). | `fliplr([1,2;3,4])` | `[2, 1; 4, 3]` |
| `repmat(A; n; m)` | Repeats A n times downward and m times to the right. | `repmat([1,2]; 2; 2)` | `[1, 2, 1, 2; 1, 2, 1, 2]` |
| `reshape(A; n; m)` | The same elements as n×m, taken column by column. | `reshape([1,2,3,4,5,6]; 3; 2)` | `[1, 4; 2, 5; 3, 6]` |
| `horzcat(A; B; …)`, `vertcat(A; B; …)` | Side by side and one below the other (like [A, B] and [A; B]). | `vertcat([1,2]; [3,4])` | `[1, 2; 3, 4]` |
| `kron(A; B)` | Kronecker product. | `kron([1,2]; [1;1])` | `[1, 2; 1, 2]` |
| `any(v)` | 1 if any element is not 0. | `any([0,0,3])` | `1` |
| `find(v)` | The positions (from 1; in a matrix, column by column) of the elements that are not 0; 0 if there are none. With a comparison, which elements meet it: `find(v > 100)`. | `find([0,3,0,5])` | `[2, 4]` |

## Linear algebra

With real numbers (inv, det, linsolve and eig also with complex numbers). eig supports up to 12×12.

| Function | What it does | Example | Gives |
|---|---|---|---|
| `linsolve(A; b)` | x such that A·x = b. If A is not square, by least squares. | `linsolve([2,1;1,3]; [3;5])` | `[0.8; 1.4]` |
| `rank(A)` | Rank. | `rank([1,2;2,4])` | `1` |
| `cond(A)` | Condition number (using singular values). | `cond([1,0;0,2])` | `2` |
| `pinv(A)` | Pseudoinverse (works with singular or non-square matrices). | `pinv([1,2;2,4])` | `[0.04, 0.08; 0.08, 0.16]` |
| `eig(A)` | Eigenvalues, in a column; complex if there are any. | `eig([2,1;1,2])` | `[1; 3]` |
|  |  | `eig([0,1;-1,0])=` | `[-1j; 1j]` |

## Differences, cumulative sums and integrals

| Function | What it does | Example | Gives |
|---|---|---|---|
| `diff(v)` | Differences between consecutive elements. | `diff([1,4,9,16])` | `[3, 5, 7]` |
| `cummax(v)`, `cummin(v)` | Running maximum and minimum. | `cummax([1,3,2,5,4])` | `[1, 3, 3, 5, 5]` |
| `mode(v)` | The most frequent value (with a tie, the smallest). | `mode([1,2,2,3,3])` | `2` |
| `trapz(x; y)`, `cumtrapz(x; y)` | Trapezoidal integral of data (and cumulative). With a single vector, step 1. | `trapz([0,1,2]; [0,1,4])` | `3` |
| `integral(expr; x; a; b)` | Integral of an expression in the variable x, between a and b (numerical, adaptive). As in fzero, the variable is named. With units: those of expr times those of x. | `integral(x^2; x; 0; 3)` | `9` |

## Interpolation and polynomials

A polynomial is the vector of its coefficients, from highest degree to lowest: [1, 0, -2] is x² − 2.

| Function | What it does | Example | Gives |
|---|---|---|---|
| `interp1(xs; ys; x)` | Linear interpolation in a table (x a number or a vector; keeps the units of ys). Outside the table it gives ⚠; with `interp1(xs; ys; x; "extrap")` it extrapolates using the first or last segment. | `interp1([0,1,2]; [0,10,40]; 1.5)` | `25` |
| `polyval(p; x)` | Value of the polynomial at x. | `polyval([1,0,-2]; 3)` | `7` |
| `roots(p)` | Roots (column); complex if there are any. | `roots([1,-6,11,-6])` | `[3; 2; 1]` |
|  |  | `roots([1,0,1])=` | `[1j; -1j]` |
| `polyfit(x; y; n)` | Degree-n polynomial by least squares. | `polyfit([0,1,2]; [1,3,5]; 1)` | `[2, 1]` |
| `conv(p; q)` | Product of polynomials. | `conv([1,1]; [1,-1])` | `[1, 0, -1]` |
| `polyder(p)`, `polyint(p)` | Derivative and integral (with constant 0). | `polyder([1,2,3])` | `[2, 2]` |

## Custom functions

They are defined in a text and used in outputs, variables and dimensions. They can call other functions and themselves.

| Function | What it does | Example | Gives |
|---|---|---|---|
| `f(x):…` | Function of one parameter. | `f(x):x^2+1`<br>`f(3)=` | `10` |
| `g(a; b):…` | Several parameters, separated by `;` or `,`. | `g(a; b):a*b+1`<br>`g(2; 5)=` | `11` |

## Complex numbers

`j` is the imaginary unit (`3+4j`); a number can also take the suffix: `2.5j` or `2.5i` (the letter `i` alone is still a variable). The square root of a negative number gives a complex number: `sqrt(-4)` is `2j`, `ln(-1)` is `πj`, and a negative base with a non-integer exponent gives a complex number. Operations, powers, functions (sin, exp, ln, sqrt…), matrices (inv, det, product) and units (an impedance in Ω) all work. Complex numbers can only be compared with `==` and `!=`. A dimension, a graph or the condition of an if needs a real number: abs, angle, real or imag give one.

| Function | What it does | Example | Gives |
|---|---|---|---|
| `abs(z)` | Modulus (absolute value). | `abs(3+4j)` | `5` |
| `angle(z)` | Argument (in degrees or radians, depending on the drawing). | `angle(1+1j)` | `45` |
| `real(z)`, `imag(z)` | Real and imaginary part. | `real((1+2j)*(3-1j))` | `5` |
|  |  | `imag((1+2j)*(3-1j))` | `5` |
| `conj(z)` | Conjugate: z·conj(z) = |z|². | `real((3+4j)*conj(3+4j))` | `25` |

## Strings

A string goes between quotes: `"Cumple"` (the iPad's curly quotes “ ” work too; `""` inside is one quote). They are joined with `+` and compared with `==` and `!=`; a number is converted with `num2str` (with its unit). `["a", "b"]` is a string vector (`v_2` is the second). In the result they are shown in typographic quotes. For a check message: `if(σ<Sy, "Cumple", "No cumple")`.

| Function | What it does | Example | Gives |
|---|---|---|---|
| `num2str(x; n)`, `string(x)` | A number as text, with its unit and as the app shows it (n fixed decimals if given). | `"Tensión: " + num2str(210.254'MPa)=` | `“Tensión: 210.254 MPa”` |
| `sprintf(formato; …)` | Format: %d, %f, %.2f, %e, %g, %s, %%. Without units: divide by the unit you want (F/1'kN). | `sprintf("%.1f kN"; 12.345)=` | `“12.3 kN”` |
| `str2double(s)`, `str2num(s)` | The number written in a string. | `str2double("3.25")*2` | `6.5` |
| `strcat(a; b; …)` | Joins strings (like +). | `strcat("A"; "-"; "CAD")=` | `“A-CAD”` |
| `upper`, `lower`, `strtrim`, `reverse` | Uppercase, lowercase, trimmed of spaces at the ends, reversed. | `upper("abc")=` | `“ABC”` |
| `strrep(s; viejo; nuevo)`, `replace(s; viejo; nuevo)` | Replaces all occurrences. | `strrep("a-b-c"; "-"; "+")=` | `“a+b+c”` |
| `isempty(s)` | 1 if the string is empty (or all of those in a string vector); a number or a vector is never empty. | `isempty("")` | `1` |
| `strsplit(s; sep)`, `strjoin(v; sep)` | Splits a string into a string vector (by spaces if sep is not given) and joins them back. | `strjoin(strsplit("a,b,c"; ","); " | ")=` | `“a | b | c”` |
| `strlength(s)` | Number of characters. | `strlength("hola")` | `4` |
| `contains`, `startsWith`, `endsWith` | 1 if the string contains, starts with or ends with the pattern. | `contains("hola mundo"; "mun")` | `1` |
| `strfind(s; patrón)` | Positions (from 1) where the pattern appears; 0 if it does not appear. | `strfind("abcabc"; "bc")` | `[2, 5]` |
| `strcmp(a; b)`, `strcmpi(a; b)` | 1 if they are equal (strcmpi, ignoring case). | `strcmpi("Abc"; "aBC")` | `1` |
| `extractBefore`, `extractAfter`, `extractBetween` | What comes before or after a pattern (or a position), or between two; with two numbers, between those positions (inclusive). | `extractAfter("x=10"; "=")=` | `“10”` |
|  | Between two positions. | `extractBetween("abcdef"; 2; 4)=` | `“bcd”` |

## Programs

Steps in order and loops inside a formula. Inside, `s:valor` assigns a **local** variable: it is valid only in that formula (it does not create document variables or change those outside). They can be written on several lines, with indentation, and are drawn as written. A loop is capped at 100,000 iterations and 1.5 s: if it exceeds that, it warns instead of freezing the app.

| Function | What it does | Example | Gives |
|---|---|---|---|
| `seq(a; b; …; r)` | Does the steps in order and takes the value of the last one. | `seq(a:2; b:a^2; a+b)` | `6` |
| `for(i; inicio..fin; cuerpo)` | Repeats the body with i = inicio, inicio+1, … up to fin (if fin < inicio, zero times). With a vector instead of the range, i takes each element. | `suma2(n):seq(s:0; for(i; 1..n; s:s+i^2); s)`<br>`suma2(10)=` | `385` |
| `while(condición; cuerpo)` | Repeats the body while the condition holds. For several steps in the body, `seq(…)`. | `seq(k:0; while(k^2<50; k:k+1); k)` | `8` |
| `break()`, `continue()` | Inside a for or a while: `break()` exits the loop; `continue()` moves on to the next iteration. In a script they are written alone on their line: `break`, `continue`. | `seq(s:0; for(i; 1..10; seq(if(i > 3; break(); 0); s:s + i)); s)` | `6` |
| `return(x)` | Ends the function (or the script) with the value x, without going on. In a script, `return x`. | `seq(return(5); 7)` | `5` |
| `v_i:valor`, `A_(i,j):valor` | Assigns an element of a vector or matrix (or of a string vector) inside a program, on a local copy: the document variable does not change outside. An index past the end extends the vector with zeros (useful for building a vector in a `for`). The value takes the vector's magnitude; a vector of unitless zeros takes that of the first value. | `seq(p:[1,2,3]; p_2:7; sum(p))` | `11` |

## Drawing from a script

A calculation text can **draw**: `point`, `line` and `circle` create points, lines and circles and return their **name** (a string), which is how the others refer to them. What is generated is governed by the script: its points are fixed, they are identified by their name (local to the text that draws them) and they update on their own when the variables the script reads change. You can put dimensions and constraints on them, but you cannot move, trim or delete them by hand: you change the call. A dimension between two generated things becomes a reference dimension. If you remove a call, what it drew disappears. The variable that holds what you draw has the same properties as the drawing elements: `p.x`, `p.y` on a point; `l.L` (or `l.len`) and `l.ang` on a line; `c.r`, `c.d`, `c.x`, `c.y` on a circle; `r`, `x`, `y` on an arc. They are computed from what the script asked for (not read from the drawing), are valid further down in the reading order and, if a variable has the same name as a drawing element (`p1`), the variable wins. As always in the reading order, the script goes above or to the left of whatever reads it. If the text reads a reference dimension that measures what the text itself draws, it is a loop: the app warns and leaves what was generated as it was. When you select something generated, the status bar says which text it comes from (tap it to see it) and the text is highlighted.

| Function | What it does | Example | Gives |
|---|---|---|---|
| `point(x; y)`, `point("A"; x; y)` | Creates a point at (x, y), in drawing units, and returns its name. It is fixed. Without a label it is named after the variable you assign it to (`a:point(10; 5)` is the point "a"); if one statement creates several (a for, a function), the first takes that name and the others "a#2", "a#3"… With the label, the name is the one you write. The name is local to the text. | `a:point(10; 5)`<br>`a=` | `“a”` |
| `line(a; b)`, `line(a; b; "eje")` | A line between two points already created with point (by name or by the variable that holds it). The line type is optional ("eje", "oculta"…); without it, continuous. | `line("A"; "B")=` | `“A-B”` |
| `circle(c; r)`, `circle(c; r; "oculta")` | A circle centered at the point c (created with point) and radius r. The line type is optional. | `circle("A"; 4)=` | `“o(A)”` |
| `arc(c; a; b)` | An arc centered at the point c with ends a and b (created with point), from a to b counterclockwise. a and b must be at the same distance from c, which is the radius. Optional line type. | `arc("O"; "A"; "B")=` | `“arc(O,A-B)”` |
| `spline(["A", "B", "C"])` | A spline through the named points (at least 2), created with point. A second string "cerrado" (closed) closes it (at least 3 points); another one is the line type: `spline(["A", "B", "C"]; "cerrado"; "eje")`. | `spline(["A", "B", "C"])=` | `“spline(A,B,C)”` |
|  | A rectangle that depends on w and h: change them and it redraws. | `w:40`<br>`h:30`<br>`p1:point(0; 0)`<br>`p2:point(w; 0)`<br>`p3:point(w; h)`<br>`p4:point(0; h)`<br>`s1:line(p1; p2)`<br>`s2:line(p2; p3)`<br>`s3:line(p3; p4)`<br>`s4:line(p4; p1)=` | `“p4-p1”` |

## Equations

They are solved numerically (Levenberg-Marquardt): starting from an initial value, it looks for the value that satisfies the equation. With several roots it gives the one closest to the initial value; if it finds none, it warns. For a system of equations, `solve(…)=` in a text (see [Reading order](07-texto-y-calculo.md#reading-order) in Text and calculation).

| Function | What it does | Example | Gives |
|---|---|---|---|
| `fzero(ecuación; x; inicial)` | The value of x that satisfies the equation, written with `==` (`x^2 == 2`) or as an expression equal to 0 (`x^2-2`). The initial value carries the units of x; without it, it uses the value of x at that point, or 1. | `fzero(x^2 == 2; x; 1)` | `1.4142` |
|  | With units: the force that gives a moment of 30 kN·m with an arm of 2 m (in kN). | `fzero(F*2'm == 30'kN*'m; F; 1'kN)/(1'kN)` | `15` |

## Data between drawings

They store a value to read it later or from another drawing. The data lives in this browser, on this device (File → Data shows, exports and imports it). They are written when a change to the drawing is confirmed, not while dragging or in the simulation; rfile always reads what is stored, so with `c:rfile(n)` and `wfile(c+1; n)` each change adds 1 and the last stored value is shown.

| Function | What it does | Example | Gives |
|---|---|---|---|
| `wfile(valor; Nombre)` | Stores the value (a number with its unit, a vector, a matrix or a string) in the data file <i>Name</i> and equals 1. The name is not evaluated: it is that of a variable (its value does not matter, nor whether it exists) or a string with an extension, `"datos.txt"`. The file is text with A-CAD syntax and a decimal point: `12'kN`, `[1, 2; 3, 4]'mm`, `"texto"`. | `a:12'kN`<br>`wfile(a; MiVariable)=` | `1` |
| `rfile(Nombre)` | The value stored with `wfile`, with its units: `q:rfile(MiVariable)` gives 12 kN. If there is no data with that name, it gives ⚠. |  |  |
| `rfile(Nombre; inicial)` | What is stored or, if there is not yet any data with that name, <i>inicial</i> (which is only calculated then): useful for getting started, `c:rfile(n; 0)`. It is an A-CAD extension. | `rfile(NoExiste; 42)` | `42` |
| `entered(nombre)` | Equals 1 in the step started by an Enter on the text that defines <i>nombre</i> (in in-place editing, even without changing it) and 0 in any other step: opening the drawing, moving something, editing another text. To run a command when it is confirmed: `wfile(si(entered(orden); hacer(x; orden); x); Estado)`. | `entered(x)` | `0` |

## Sounds

Audio files in the device's data folder (File → Data…: they are imported with a name, tested, exported and deleted). When imported they are downsampled (one channel, 16 kHz, 8 bits): about 16 KB per second. The drawing embeds those it names in quotes, `play("nombre")`, and restores them on opening if they are missing; a name built from a variable does not travel with the drawing.

| Function | What it does | Example | Gives |
|---|---|---|---|
| `play("nombre")` | Plays the drawing's sound with that name, once, in the step that confirms a change to the drawing (an Enter in a text: the same step in which `wfile` runs). It does not play on redraw, on dragging, on opening the drawing or in the simulation. Equals 1 if the drawing has that sound and 0 if not (no error), and it can be used inside a function or a library: `if(choca; play("explosion"); 0)`. Browsers only allow sound after a tap or a key press. |  |  |

## Drawing values

Names that a formula can read. They always equal what the drawing has at that moment.

| Function | What it does | Example | Gives |
|---|---|---|---|
| `D1`, `A1`, `R1`, `O1` | Named dimensions: distance, angle (in radians), radius and diameter. The name can be changed. |  |  |
| `p12.x`, `p12.y` | Coordinates of a point. |  |  |
| `l3.len` (`l3.L`), `l3.ang` | Length of a line and its angle (from its start to its end, in radians). |  |  |
| `c1.r`, `c1.d`, `c1.x`, `c1.y` | Radius, diameter and center of a circle. |  |  |
| `a2.r`, `a2.x`, `a2.y` | Radius and center of an arc. |  |  |
| `x:…` | Variables of the texts, read from top to bottom and from left to right. |  |  |
| `t` | Time, in actuators and graphs. |  |  |
| `MR1`, `ML1`, `MR1.v` | In graphs: the displacement of an actuator (also `.d`) and its velocity. |  |  |
| Reserved | They cannot be used as a dimension or variable name: the functions and constants in this list, `t`, `j`, `ω`, `θ` and `α`. |  |  |

---

[Index](README.md) · [7. Text and calculation](07-texto-y-calculo.md)
