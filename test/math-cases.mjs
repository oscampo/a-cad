// Ejemplos de la tabla de sintaxis de https://asciimath.org/ (fecha de consulta: 2026-11-17), usados en las pruebas y para revisar el dibujo a ojo.
export const CASES = [
  // inicio y operadores
  'sum_(i=1)^n i^3=((n(n+1))/2)^2',
  'a + b', 'a - b', 'a * b', 'a ** b', 'a *** b', 'a // b', 'a \\\\ b', 'a xx b', 'a -: b', 'a |>< b', 'a ><| b', 'a |><| b', 'a @ b',
  'a o+ b', 'a ox b', 'a o. b', 'a ^^ b', '^^^_(i=1)^n a_i', 'a vv b', 'vvv_(i=1)^n a_i', 'a nn b', 'nnn_(i=1)^n A_i', 'a uu b', 'uuu_(i=1)^n A_i',
  'a cdot b', 'a ast b', 'a star b', 'a backslash b', 'a setminus b', 'a times b', 'a div b', 'a ltimes b', 'a rtimes b', 'a bowtie b', 'a circ b',
  'a oplus b', 'a otimes b', 'a odot b', 'a wedge b', 'a vee b', 'a cap b', 'a cup b',
  // operaciones
  '2/3', 'frac{2}{3}', '2^3', 'sqrt x', 'root(3)(x)', 'int_0^1 x dx', 'oint_C f dz', 'del f', 'partial f', 'grad f', 'nabla f', 'a +- b', 'a pm b',
  'O/', 'emptyset', 'oo', 'infty', 'aleph', ':. x', ":' x", '1, 2, ..., n', 'a cdots b', 'a ldots b', 'vdots', 'ddots', 'a quad b', 'a qquad b', 'a\\ b',
  '/_ ABC', 'angle ABC', 'frown', '/_\\ ABC', 'triangle ABC', 'diamond', 'square', '|__ x __|', 'lfloor x rfloor', '|~ x ~|', 'lceiling x rceiling',
  'CC NN QQ RR ZZ', '"hi"', 'text(hi)',
  // relaciones
  'a = b', 'a != b', 'a ne b', 'a < b', 'a lt b', 'a > b', 'a gt b', 'a <= b', 'a le b', 'a >= b', 'a ge b', 'a mlt b', 'a ll b', 'a mgt b', 'a gg b',
  'a -< b', 'a prec b', 'a -<= b', 'a preceq b', 'a >- b', 'a succ b', 'a >-= b', 'a succeq b',
  'a in B', 'a !in B', 'a notin B', 'A sub B', 'A subset B', 'A sup B', 'A supset B', 'A sube B', 'A subseteq B', 'A supe B', 'A supseteq B',
  'a -= b', 'a equiv b', 'a ~= b', 'a cong b', 'a ~~ b', 'a approx b', 'a prop b', 'a propto b',
  // logica
  'a and b', 'a or b', 'not a', 'neg a', 'x if y', 'a => b', 'a implies b', 'a <=> b', 'a iff b', 'AA x', 'forall x', 'EE x', 'exists x',
  '_|_', 'bot', 'TT', 'top', '|-- p', 'vdash p', '|== p', 'models p',
  // agrupacion
  '(x)', '[x]', '{x}', '(: x :)', 'langle x rangle', '<< x >>', '{: x )', '( x :}', 'abs(x)', 'floor(x)', 'ceil(x)', 'norm(vecx)', 'abs(x/2)',
  // flechas
  'uarr', 'uparrow', 'darr', 'downarrow', 'rarr', 'rightarrow', 'a -> b', 'a to b', 'a >-> b', 'a ->> b', 'a >->> b', 'a |-> b', 'a mapsto b',
  'larr', 'leftarrow', 'harr', 'leftrightarrow', 'rArr', 'Rightarrow', 'lArr', 'Leftarrow', 'hArr', 'Leftrightarrow',
  // acentos
  'hat x', 'bar x', 'overline x', 'ul x', 'underline x', 'vec x', 'tilde x', 'dot x', 'ddot x', 'overset(x)(=)', 'underset(x)(=)', 'stackrel(x)(=)',
  'ubrace(1+2)', 'underbrace(1+2)', 'obrace(1+2)', 'overbrace(1+2)', 'overarc(AB)', 'overparen(AB)', 'color(red)(x)', 'cancel(x)',
  // griegas
  'alpha beta gamma Gamma delta Delta epsilon varepsilon zeta eta theta Theta vartheta iota kappa lambda Lambda mu nu xi Xi pi Pi rho sigma Sigma tau upsilon phi Phi varphi chi psi Psi omega Omega',
  // fuentes
  'bb "AaBbCc"', 'mathbf "AaBbCc"', 'bbb "AaBbCc"', 'mathbb "AaBbCc"', 'cc "AaBbCc"', 'mathcal "AaBbCc"', 'tt "AaBbCc"', 'mathtt "AaBbCc"',
  'fr "AaBbCc"', 'mathfrak "AaBbCc"', 'sf "AaBbCc"', 'mathsf "AaBbCc"', 'bb x + y',
  // funciones
  'sin cos tan sec csc cot', 'arcsin arccos arctan', 'sinh cosh tanh sech csch coth', 'exp log ln det dim mod gcd lcm lub glb min max',
  // casos especiales
  '[[a,b],[c,d]]', '((a),(b))', '[[a,b,|,c],[d,e,|,f]]', '{(2x,+,17y,=,23),(x,-,y,=,5):}', 'lim_(N->oo) sum_(i=0)^N', 'int_0^1 f(x)dx',
  "f'(x) = dy/dx", '(dq)/(dp)', 'ubrace(1+2+3+4)_("4 terms")', 'obrace(1+2+3+4)^("4 terms")', 'a/b/c', 'x^2_1', '(1,2)', '((1,2),(3,4))',
];
