// Referencia de «Texto y cálculo»: la misma fuente arma la sección de la ayuda (HTML) y el capítulo
// docs/07-texto-y-calculo.md. test/calcref.test.mjs comprueba que cada ejemplo da lo anotado y que el manual está al día.
//
// Cada grupo: { title, note?, head?, rows, rules? }. Una fila: [escribes, qué hace, ejemplo, se ve, modo] (HTML en las
// dos primeras columnas, texto plano en las otras dos). El modo dice cómo se comprueba el ejemplo:
//   't'   lo que se teclea en una ecuación (bloque $$…$$); «se ve» es el texto dibujado, línea por línea;
//   'p'   un texto normal (lo que se teclea tras el «"»); «se ve» es el texto dibujado sin los «$»;
//   'mig' un texto de un dibujo anterior a la v2.0; «se ve» es como queda al abrirlo;
//   ''    no se comprueba (depende del dibujo o de cómo se ve en pantalla).
// head: los títulos de las columnas, si no son los de siempre (una tabla sin ejemplos tiene solo dos).

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const c = (...xs) => xs.map((x) => `<code>${esc(x)}</code>`).join(', ');

export const CALC_GROUPS = [
  {
    title: 'Escribir un texto (T)',
    note: 'Toca donde va el punto de inserción y escribe ahí mismo, sin ventana. Lo que escribes es una <b>ecuación</b>: se guarda como bloque ' + c('$$…$$') + ', así que los delimitadores no se teclean (se ven en las propiedades del texto, doble toque).',
    head: ['Tecla', 'Qué hace'],
    rows: [
      ['<b>Enter</b>', 'Dibuja lo escrito y abre otra entrada justo debajo.'],
      ['<b>Shift+Enter</b>', 'Otra línea en el mismo bloque (otra ecuación).'],
      ['<b>Esc</b>', 'Descarta lo que escribes.'],
      ['<b>Enter</b> en una entrada vacía', 'Termina. Cambiar de herramienta también termina, y dibuja lo escrito.'],
      ['Tocar en otro sitio', 'Dibuja lo escrito y mueve la entrada allí.'],
      [c('"') + ' o un espacio al empezar', 'Texto normal en vez de ecuación (sirven también las comillas ' + c('“') + ' del teclado del iPad; la comilla o el espacio no se guardan). Ver «Texto normal, fórmulas y literales».'],
      ['Insignia azul', 'Junto a la esquina de la entrada: ' + c('α') + ' es una ecuación, ' + c('A') + ' es texto normal.'],
      [c('[', '(', '{', '$', '<', '`'), '<b>Se cierran solos</b>: aparece el cierre y el cursor queda en medio (' + c('[|]') + '). Teclear el cierre cuando ya está delante solo avanza; borrar en un par vacío borra los dos; con texto seleccionado, lo encierra. ' + c('$') + ' dentro de ' + c('$|$') + ' da ' + c('$$|$$') + '. No se cierran delante de una letra o un número, ni ' + c('<') + ' dentro de una fórmula (es «menor que»), ni el ' + c('$') + ' o la ' + c('`') + ' que cierran algo ya abierto. Vale también en el campo Texto de las propiedades.'],
      [c('\\') + ' y una letra, o Ctrl+G', '<b>Letras griegas</b> sin teclado griego. ' + c('\\a') + ' se vuelve α al teclear la letra (Retroceso justo después deja ' + c('\\a') + '). Ctrl+G, como en SMath, convierte la letra antes del cursor (otra vez la devuelve) o todo lo seleccionado; en el Mac también es Ctrl, no Cmd. Tabla: ' + c('a') + ' α, ' + c('b') + ' β, ' + c('c') + ' χ, ' + c('d') + ' δ, ' + c('e') + ' ε, ' + c('f') + ' φ, ' + c('g') + ' γ, ' + c('h') + ' η, ' + c('i') + ' ι, ' + c('j') + ' ϕ, ' + c('k') + ' κ, ' + c('l') + ' λ, ' + c('m') + ' μ, ' + c('n') + ' ν, ' + c('p') + ' π, ' + c('q') + ' θ, ' + c('r') + ' ρ, ' + c('s') + ' σ, ' + c('t') + ' τ, ' + c('u') + ' υ, ' + c('v') + ' ϖ, ' + c('w') + ' ω, ' + c('x') + ' ξ, ' + c('y') + ' ψ, ' + c('z') + ' ζ; ' + c('D') + ' Δ, ' + c('F') + ' Φ, ' + c('G') + ' Γ, ' + c('J') + ' ϑ, ' + c('L') + ' Λ, ' + c('P') + ' Π, ' + c('Q') + ' Θ, ' + c('S') + ' Σ, ' + c('V') + ' ς, ' + c('W') + ' Ω, ' + c('X') + ' Ξ, ' + c('Y') + ' Ψ. Las mayúsculas que se ven igual que una latina (Α, Β, Ε…) y la ο no se convierten.'],
    ],
  },
  {
    title: 'Asignar y mostrar valores',
    note: 'Cada línea de una ecuación es un enunciado. El valor se actualiza solo cuando el dibujo cambia.',
    rows: [
      [c('x:valor'), 'Asigna a <b>x</b> el valor de una expresión. Se dibuja ' + c('x:=valor') + ', tal como lo escribiste.', 'x:2*3', 'x:=2*3', 't'],
      [c('x:=valor'), 'Lo mismo, tecleando ' + c(':=') + '.', 'k:=4', 'k:=4', 't'],
      [c('expr='), 'Un <b>=</b> al final de la línea muestra el valor, con hasta 3 decimales.', '2/3=', '2/3=0.667', 't'],
      [c('x:expr='), 'Asigna y muestra el valor en la misma línea.', 'x:2*3=\ny:x+1=', 'x:=2*3=6\ny:=x+1=7', 't'],
      ['Notación científica', c('2.5e6') + ' es 2.5·10⁶ y ' + c('3e-4') + ' es 0.0003 (también con ' + c('E') + '). Un número muy pequeño se muestra con 4 cifras significativas en vez de 0.', 'p:2.5e6\nq:3e-4=', 'p:=2.5e6\nq:=3e-4=0.0003', 't'],
      [c("x:valor'unidad"), '<b>Unidad</b>: el valor va en esa unidad. Las unidades se convierten y se propagan: ' + c('F*2') + ' sigue en N. Hay unidades del SI con prefijo (m, g, s, A, K, mol, N, Pa, J, W, V, Ω, Hz, L, bar; k, M, G, c, m, µ, n...) y otras usuales (min, h, rpm, atm, psi con prefijo como kpsi, ksi, kgf, lbf, kip, in, ft, lb, hp, gal, deg, rad, %). Si el valor ya trae unidades, solo dice en qué unidad mostrarlo.', "F:250'N\nF=\nF*2=", 'F:=250 N\nF=250 N\nF*2=500 N', 't'],
      [c("x:expr'unidad="), 'Con ' + c('=') + ' el valor calculado se muestra en esa unidad.', "a:2*3'm/s^2=", 'a:=2*3=6 m/s²', 't'],
      [c("valor'unidad"), 'Unidades dentro de una expresión. Una unidad compuesta va entre paréntesis: ' + c("3'(m/s)") + '.', "L:2'm+30'cm\nL=", 'L:=2 m+30 cm\nL=2.3 m', 't'],
      [c("expr='unidad"), 'Muestra el valor en la unidad pedida (de la misma magnitud; si no, ⚠).', "F:2'kN\nF='N", 'F:=2 kN\nF=2000 N', 't'],
      ['Unidad automática', 'Sin unidad pedida, el resultado sale en la unidad de una variable de la expresión o en la del SI con prefijo.', "F:5000'N\nA:2'cm^2\nF/A=", 'F:=5000 N\nA:=2 cm²\nF/A=25 MPa', 't'],
      ['Unidades que no cuadran', 'Sumar, restar o comparar magnitudes distintas da ⚠, igual que un número sin unidades sumado a uno con unidades. Las funciones (sin, ln...) piden números sin unidades; sqrt, abs y round las conservan.', "2'N+3=", '2 N+3=⚠', 't'],
      ['Ángulo con unidad', c("deg") + ', ' + c('°') + ' y ' + c('rad') + ' hacen un ángulo. En una cota, una longitud con unidades se convierte a mm.', "sin(30'deg)=", 'sin(30 deg)=0.5', 't'],
      [c('x:a..b;n'), '<b>Rango</b>: n valores de a hasta b, un vector fila. Con punto decimal también se escribe ' + c('x:a..b,n') + '; con coma decimal, siempre con ' + c(';') + '.', 'x:1..5;5', 'x:=[1, 2, 3, 4, 5]', 't'],
      [c('x:a..paso..b'), 'Rango con paso.', 'x:0..0.5..2', 'x:=[0, 0.5, 1, 1.5, 2]', 't'],
      ['Vector con unidades', 'Una unidad para todos los elementos: ' + c("[1,2,3]'mm") + ', ' + c("[1'm, 20'cm]") + ' o un rango ' + c("0..10;5'mm") + '. Se muestran todos en la misma unidad, y una gráfica los usa en esa unidad (la leyenda la dice). Mezclar magnitudes en un vector da ⚠.', "v:[1,2,3]'mm\nv*2=\nsum(v)=", 'v:=[1, 2, 3] mm\nv*2=[2, 4, 6] mm\nsum(v)=6 mm', 't'],
      ['Ángulos', 'Según <b>Configuración → Ángulos en</b>. En grados (los dibujos anteriores), un valor con π es un ángulo en radianes y uno sin π es un número a secas: <code>sin(30)</code> va en grados. En radianes (los dibujos nuevos), todo va en radianes: <code>sin(π/6)=0.5</code>. El ejemplo, en un dibujo en grados.', 'a:30\nsin(a)=', 'a:=30\nsin(a)=0.5', 't'],
      ['Indicador decimal', 'Según <b>Configuración → Indicador decimal</b>. Con <b>punto</b> (' + c('1.5') + ') los argumentos de una función van con coma, ' + c('max(2.5, 3)') + ', y en una matriz los elementos con coma y las filas con ' + c(';') + ': ' + c('[1, 2; 3, 4]') + '. Con <b>coma</b> (' + c('1,5') + ') los argumentos van con ' + c(';') + ', ' + c('max(2,5; 3)') + ', y en una matriz los elementos con ' + c(';') + ' y las filas con ' + c('|') + ': ' + c('[1; 2 | 3; 4]') + '; los índices también, ' + c('A_(1;2)') + ', y los rangos, ' + c('x:0,5..2;10') + ' (con punto: ' + c('x:0.5..2,10') + '). Al cambiarlo se reescriben las fórmulas que ya tiene el dibujo; los dibujos anteriores, sin la opción, aceptan las dos formas.', '', '', 't'],
      [c('...'), '<b>Sigue en la línea siguiente</b>, como en Python: ' + c('...') + ' al final de una línea y, si quieres, al comienzo de la siguiente. Las dos líneas son un solo enunciado y se ven así, partidas. Sirve para una ecuación que se sale del margen de la página.', 'F:1+2+...\n...3=', 'F:=1+2+...\n...3=6', 't'],
      ['Error', 'Si la expresión no se puede calcular, en lugar del valor aparece ⚠.', 'sqrt(-1)=', 'sqrt(-1)=⚠', 't'],
    ],
    rules: [
      '<b>Un enunciado por línea</b>: lo que sobra en la línea se marca con ⚠ (' + c('x:2  y:3') + '). Para poner dos, Shift+Enter.',
      'No es salida si la línea termina en ' + c('==', '<=', '>=', '!=') + ' o ' + c(':=') + ': ahí el <b>=</b> es parte del operador.',
      'Un vector o una matriz asignado ya muestra su valor: en ' + c('v:1..3;3=') + ' el <b>=</b> final no añade nada.',
      'Una salida puede leer las cotas (también las de solo lectura y las magnitudes de los vectores), las variables y las funciones y constantes de «Funciones y operadores». Un ángulo de una cota vale su medida en radianes.',
      'Al editar ves ' + c('expr=') + '; el dibujo y las exportaciones (SVG, DXF) muestran ' + c('expr=valor') + '. La magnitud de un vector muestra solo el valor.',
    ],
  },
  {
    title: 'Texto normal, fórmulas y literales',
    note: 'Un texto que empieza con ' + c('"') + ' (o con un espacio) se dibuja tal cual, salvo lo que va entre signos de pesos, que es matemático y calcula igual que una ecuación.',
    rows: [
      [c('$…$'), 'Fórmula en línea con el texto.', '"Vale $2*3=$ mm', 'Vale 2*3=6 mm', 'p'],
      [c('$$…$$'), 'Fórmula en bloque: cada línea de dentro es una ecuación, centrada y a tamaño pleno.', '', '', ''],
      [c('`…`'), '<b>Literal</b>: se dibuja pero nunca se calcula ni se lee como asignación o salida. Sin las comillas, ' + c('f:RR->RR') + ' sería una asignación.', '`f:RR->RR`\n`x =` 3', 'f:RR->RR\nx = 3', 't'],
      [c('`…') + ' sin cerrar', 'Se marca con ⚠.', '`abierto', '`abierto ⚠', 't'],
      [c('\\$'), 'Un signo de pesos que no abre una fórmula.', '', '', ''],
      [c('$') + ' suelto', 'No es fórmula: ' + c('$5 y $6') + ' se dibuja tal cual. Un ' + c('$$') + ' sin cierre también, con ⚠.', '', '', ''],
    ],
  },
  {
    title: 'Markdown en el texto normal',
    note: 'En un texto normal (el que empieza con ' + c('"') + ' o un espacio), lo que va fuera de las fórmulas admite Markdown. Las marcas no cruzan una fórmula: ' + c('**a $x$ b**') + ' no es negrita; se escribe ' + c('**a** $x$ **b**') + '.',
    head: ['Escribes', 'Qué hace'],
    rows: [
      [c('**negrita**', '__negrita__'), '<b>Negrita</b>.'],
      [c('*cursiva*', '_cursiva_'), '<i>Cursiva</i>. El ' + c('_') + ' dentro de una palabra no cuenta (' + c('mi_archivo') + ').'],
      [c('***ambas***'), '<b><i>Negrita y cursiva</i></b>.'],
      [c('~~tachado~~'), 'Tachado.'],
      [c('`código`'), 'Letra monoespaciada. En una ecuación, en cambio, las comillas invertidas hacen un literal.'],
      [c('# ', '## ', '### ', '#### ', '##### ', '###### ') + ' al empezar la línea', 'Título, en negrita y más grande (1.6, 1.35, 1.15, 1.05, 1 y 0.9 veces la altura del texto).'],
      ['Una línea y debajo ' + c('==='), 'También es un título de nivel 1. En cambio ' + c('---') + ' debajo de un texto es siempre una raya, no un título.'],
      [c('- ', '* ', '+ ') + ' al empezar la línea', 'Viñeta. Dos espacios antes por cada nivel de sangría.'],
      [c('- [ ] ', '- [x] ') + ' al empezar la línea', 'Tarea: ☐ pendiente, ☑ hecha.'],
      [c('1. ', '1) ') + ' al empezar la línea', 'Lista numerada (el número se dibuja tal como se escribe).'],
      [c('> ') + ' al empezar la línea', 'Cita, con una raya a la izquierda; ' + c('>> ') + ' es una cita dentro de otra.'],
      [c('> [!note] Título'), '<b>Aviso</b> (callout), con la raya y el título en color; las líneas ' + c('> ') + ' que siguen son su cuerpo. Sin título se ve el tipo: ' + c('note', 'info', 'tip', 'important', 'warning', 'caution', 'danger', 'example', 'question', 'success', 'quote') + '…'],
      [c('---') + ' sola en la línea', 'Raya horizontal del ancho del texto (sirven también ' + c('***') + ' y ' + c('___') + ').'],
      [c('```') + ' antes y después', '<b>Bloque de código</b>: monoespaciado, en un recuadro, sin Markdown ni fórmulas dentro (sirve también ' + c('~~~') + '). Cuatro espacios al comienzo de las líneas, tras una línea en blanco, hacen lo mismo.'],
      [c('| a | b |') + ' y debajo ' + c('|---|:-:|'), '<b>Tabla</b>: la primera fila es el encabezado (en negrita); la segunda dice la alineación de cada columna (' + c(':--') + ' izquierda, ' + c(':-:') + ' centro, ' + c('--:') + ' derecha). Las celdas admiten fórmulas; ' + c('\\|') + ' es una barra dentro de una celda.'],
      [c('[texto](url)'), 'Enlace, en azul y subrayado. También ' + c('[texto][ref]') + ' con ' + c('[ref]: url') + ' en otra línea (esa línea no se dibuja) y ' + c('<https://…>') + ' o ' + c('<correo@dominio>') + '. <b>Para abrirlo</b>: un toque selecciona el texto y muestra encima una pastilla con el destino real de cada enlace; toca la pastilla, o el enlace con el texto ya seleccionado. Ctrl o Cmd + clic lo abre de una vez. Arrastrar sigue moviendo el texto y el doble toque abre sus propiedades.'],
      [c('[texto](https://…)', '(mailto:…)', '(tel:…)'), 'Página web (en otra pestaña), correo o llamada. ' + c('www.algo.com') + ' se toma como ' + c('https://') + '. No se abren ' + c('javascript:') + ', ' + c('data:') + ' ni otros destinos: la pastilla los muestra tachados.'],
      [c('[texto](#graficas)'), 'Un lugar del dibujo: la vista va a él y lo selecciona. Vale el título de un texto (' + c('## Gráficas !!!') + ' se alcanza con ' + c('#graficas') + ', sin tildes, mayúsculas, espacios ni signos), la primera línea de un texto o el identificador de un elemento (' + c('#t17') + ', ' + c('#g94') + ', ' + c('#p5') + ').'],
      [c('[texto](cicloide.json)'), 'Otro dibujo del repositorio de GitHub configurado (Archivo → GitHub), con la ruta relativa a su carpeta (' + c('sub/a.json') + ', ' + c('../otra/b.json') + ', ' + c('/raiz.json') + ' desde la raíz). Pregunta antes, porque se pierde lo no guardado. Con ' + c('#lugar') + ' al final (' + c('cicloide.json#rueda') + '), además va a ese lugar.'],
      [c('![texto](imagen.png)'), 'Imagen: el dibujo no carga imágenes, muestra ▣ y su texto alternativo.'],
      [c('![Línea](icon:line)'), '<b>Ícono de una herramienta</b> de la app, dentro de la línea, a la altura de la letra y con el color del texto. Los nombres están en la ayuda, sección «Íconos en los textos» (toca una fila para copiarla). Si el nombre no existe se ve como una imagen: ▣ y el texto alternativo.'],
      [c('texto[^1]') + ' y ' + c('[^1]: la nota'), '<b>Nota al pie</b>: la llamada va en superíndice, numerada en orden, y las notas se juntan al final del texto en letra más pequeña.'],
      [c('<!-- … -->'), 'Comentario: no se dibuja (puede abarcar varias líneas).'],
      [c('\\*'), 'Deja el signo tal cual (sirve con cualquier signo de puntuación): ' + c('\\*') + ', ' + c('\\_') + ', ' + c('\\#') + ', ' + c('\\[') + '… Un ' + c('*') + ' entre espacios (' + c('2 * 3') + ') ya va tal cual, pero ' + c('2*3*4') + ' pone el 3 en cursiva.'],
      ['Saltos de línea', 'Cada salto de línea es un salto de línea, con página o sin ella (a diferencia de Markdown, las líneas seguidas no se unen). Con la página (Configuración → Página), una línea que no cabe se parte en el margen. Una ' + c('\\') + ' al final de una línea no se dibuja.'],
    ],
  },
  {
    title: 'Escritura matemática (AsciiMath)',
    note: 'Las fórmulas siguen la sintaxis de <a href="https://asciimath.org/" target="_blank" rel="noopener">asciimath.org</a>. Se dibujan con fracciones, raíces, índices y símbolos de verdad, giran y se exportan (SVG, DXF) como cualquier texto. Los paréntesis crecen con lo que encierran.',
    head: ['Escribes', 'Se dibuja'],
    rows: [
      [c('a/b'), 'Fracción (los paréntesis de a y b no se ven).'],
      [c('x^2', 'x_1'), 'Superíndice y subíndice.'],
      [c('sqrt(x)', 'root 3 x'), 'Raíces.'],
      [c('alpha', 'beta', 'pi', 'Delta') + '…', 'Letras griegas.'],
      [c('sum_(i=1)^n', 'prod', 'int_0^1', 'lim_(x->0)'), 'Sumatoria, productoria, integral y límite.'],
      [c('sin', 'cos', 'ln') + '…', 'Nombres de funciones, en letra recta.'],
      [c('<=', '>=', '!=', '->', '=>', '+-', 'xx', '-:', 'oo'), '≤ ≥ ≠ → ⇒ ± × ÷ ∞'],
      [c('abs(x)', 'floor(x)', 'ceil(x)', 'norm(x)'), 'Valor absoluto, piso, techo y norma, con sus barras.'],
      [c('hat x', 'bar x', 'vec v', 'tilde', 'dot', 'ddot', 'ul', 'cancel', 'overarc'), 'Acentos, subrayado y tachado.'],
      [c('[a, b; c, d]', '[a; b]', '[[a,b],[c,d]]', '((a),(b))'), 'Matrices y vectores columna dibujados (sin calcular). Entre corchetes, ' + c(';') + ' separa filas y ' + c(',') + ' columnas.'],
      [c('[[a,b,|,c],[d,e,|,f]]'), 'Matriz aumentada.'],
      [c('{(2x,+,y,=,3),(x,-,y,=,1):}'), 'Sistema de ecuaciones.'],
      [c('ubrace(…)_("texto")', 'obrace', 'overset(x)(=)', 'underset'), 'Llaves y signos con algo encima o debajo.'],
      [c('color(red)(x)'), 'Color.'],
      [c('bb', 'bbb', 'cc', 'tt', 'fr', 'sf'), 'Fuentes: negrita, pizarra, caligráfica, máquina, fraktur, sin serifa.'],
      [c('"texto"', 'text(hola)'), 'Texto recto dentro de la fórmula.'],
      [c('dy/dx', "f'(x)"), 'Derivadas.'],
    ],
    rules: [
      'Como en AsciiMath, las palabras reservadas se reconocen aunque vayan pegadas a otras letras (' + c('pir') + ' es π r), así que «in», «or», «and»… dentro de un nombre se leen como símbolos: sepáralos con espacios o ponlos entre comillas.',
      'Aún no hay alineación por <b>=</b> entre líneas.',
    ],
  },
  {
    title: 'Nombres de variables',
    note: 'Siguen las reglas de los nombres de las cotas: letras, números y _, empiezan con una letra.',
    rows: [
      [c('masa_(total)'), 'Nombre con <b>subíndice de texto</b>: entre paréntesis, texto libre sin paréntesis ni llaves. Se dibuja con el subíndice en letra recta.', 'masa_(total):3\n2*masa_(total)=', 'masa_(total):=3\n2*masa_(total)=6', 't'],
      ['Letras griegas', 'Se escriben con la letra o con su nombre de AsciiMath, y es la <b>misma variable</b>: ' + c('beta') + ' es ' + c('β') + ', ' + c('Delta_1') + ' es ' + c('Δ_1') + ' (' + c('phi') + ' es ϕ y ' + c('varphi') + ' es φ, como se dibujan). ' + c('pi') + ' sigue siendo la constante. Para teclear la letra: ' + c('\\') + ' y la letra (' + c('\\b') + ' → β) o Ctrl+G (ver «Escribir un texto»).', 'beta:2\nβ*3=', 'β:=2\nβ*3=6', 't'],
      ['Reservados', 'Un nombre no puede ser una función o constante del programa (' + c('sin', 'pi') + '…) ni coincidir con el de una cota. ' + c('t') + ' es el tiempo, y ' + c('j', 'α', 'θ', 'ω') + ' (también escritas ' + c('alpha', 'theta', 'omega') + ') quedan reservadas para uso futuro.', 'sin:2', 'sin:=2 ⚠', 't'],
    ],
    rules: [
      'Un texto con un nombre no válido, o que usa una variable que aún no existe, se rechaza al escribirlo («se deshizo»). Si llega de otra forma (al pegar un texto, por ejemplo), esa definición queda con ⚠ y la variable sin definir desde ahí.',
      'Los nombres se actualizan solos si renombras una cota que usan.',
    ],
  },
  {
    title: 'Orden de lectura',
    note: 'Como en SMath, la página se lee <b>de arriba a abajo</b> y, en una misma fila, <b>de izquierda a derecha</b>: dentro de un texto, línea por línea; los textos, por su esquina superior izquierda. Una variable vale lo de la <b>última definición leída antes</b>.',
    rows: [
      ['Redefinir', 'Una variable puede cambiar de valor más abajo.', 'k:1\nk=\nk:2\nk=', 'k:=1\nk=1\nk:=2\nk=2', 't'],
      ['Usarse a sí misma', 'Una redefinición puede leer el valor anterior.', 'n:1\nn:n+1\nn=', 'n:=1\nn:=n+1\nn=2', 't'],
      ['Usar antes de definir', 'Todavía no existe: avisa de que «se define más abajo o más a la derecha».', 'y=\ny:2', 'y=⚠\ny:=2', 't'],
      ['Leer cotas', 'Una definición puede usar las cotas y variables leídas antes, y se recalcula cuando cambian.', 'k:D1/2', '', ''],
    ],
    rules: [
      'Las <b>cotas con fórmula</b> (' + c('D2 = k*2') + ') se leen en el lugar de su <b>etiqueta</b>: si ' + c('k:1') + ' está arriba de la cota y ' + c('k:7') + ' más abajo, ' + c('D2') + ' vale 2.',
      'Mover un texto o la etiqueta de una cota (en Seleccionar) recalcula las cotas que leen variables de texto.',
      'Mientras se simula o se arrastra, el orden de lectura de las cotas queda <b>congelado</b>: una etiqueta que cruza un texto no cambia su valor ni detiene la simulación. Al soltar o terminar se vuelve al orden normal.',
      'Si se borra el texto con la definición, las cotas que la leían conservan su valor y pierden la fórmula.',
    ],
  },
  {
    title: 'Vectores y matrices',
    note: 'Se escriben entre corchetes: la coma separa los elementos de una fila, el punto y coma empieza otra fila, y los decimales llevan punto. Se dibujan con corchetes de verdad y sin comas; aquí se escriben con comas, como en «Funciones y operadores», donde está la lista completa de operaciones.',
    rows: [
      [c('[1, 2; 3, 4]'), 'Matriz. ' + c('[1, 2, 3]') + ' es un vector fila y ' + c('[1; 2; 3]') + ' uno columna.', 'A:[1,2;3,4]\nA=', 'A:=[1, 2; 3, 4]\nA=[1, 2; 3, 4]', 't'],
      [c('[V; M]', '[A, b]'), 'Matriz <b>por bloques</b>, como en MATLAB: los elementos pueden ser vectores o matrices ya definidos. ' + c(',') + ' los pone lado a lado (mismo número de filas) y ' + c(';') + ' uno debajo del otro (mismo número de columnas). Con dos filas V y M, ' + c('[V; M]') + ' es la matriz del sistema.', 'V:[2,1]\nM:[1,3]\nF:[5;10]\n[V;M]^(-1)*F=', 'V:=[2, 1]\nM:=[1, 3]\nF:=[5; 10]\n[V;M]^(-1)*F=[1; 3]', 't'],
      [c('x^T'), 'Transpuesta: de un vector fila, el columna.', 'x:1..3;3\nx^T=', 'x:=[1, 2, 3]\nx^T=[1; 2; 3]', 't'],
      [c('x_2', 'x_i', 'x_(i+1)'), 'Elemento de un vector, contando desde 1.', 'x:1..3;3\nx_2=', 'x:=[1, 2, 3]\nx_2=2', 't'],
      [c('A_(i,j)'), 'Elemento de una matriz (fila, columna).', 'A:[1,2;3,4]\nA_(2,1)=', 'A:=[1, 2; 3, 4]\nA_(2,1)=3', 't'],
      [c('A_(2,:)', 'A_(:,2)'), 'Una fila o una columna entera.', 'A:[1,2;3,4]\nA_(:,2)=', 'A:=[1, 2; 3, 4]\nA_(:,2)=[2; 4]', 't'],
      [c('A^(-1)*b'), 'Resolver el sistema A·x = b.', 'A:[1,1;10,1]\nb:[-25;250]\nx:A^(-1)*b=', 'A:=[1, 1; 10, 1]\nb:=[-25; 250]\nx:=[30.556; -55.556]', 't'],
    ],
    rules: [
      'Un rango de más de 8 elementos se abrevia con «…».',
      c('*') + ' es el producto matricial: dos vectores fila dan error (usa ' + c('.*') + ' o ' + c('x*y^T') + ').',
      'Un nombre que ya existe como variable (' + c('x_1', 'k_(total)') + ') es esa variable, no un índice.',
      'Una cota puede leer un elemento o un resumen (' + c('D1 = x_2') + '), pero no un vector o una matriz entero: avisa con un mensaje. Lo mismo en las gráficas.',
      'Una matriz escrita en varias líneas de un bloque ' + c('$$') + ' se parte por líneas: escríbela en una sola.',
    ],
  },
  {
    title: 'Funciones propias',
    rows: [
      [c('f(x):…'), 'Define una función. Se dibuja ' + c('f(x):=…') + ' y se usa en las salidas, las variables y las cotas (' + c('D1 = f(3)') + ').', 'f(x):x^2+1\nf(3)=', 'f(x):=x^2+1\nf(3)=10', 't'],
      [c('g(a; b):…'), 'Varios parámetros, separados por ' + c(';') + ' o ' + c(',') + '.', 'g(a; b):a*b+1\ng(2; 5)=', 'g(a; b):=a*b+1\ng(2; 5)=11', 't'],
      [c('if(c; a; b)'), 'Recursión: solo se calcula la rama elegida (hasta 200 niveles).', 'fact(n):if(n<=1; 1; n*fact(n-1))\nfact(5)=', 'fact(n):=if(n<=1; 1; n*fact(n-1))\nfact(5)=120', 't'],
      [c('f(x):…='), 'Define la función y muestra ahí mismo ' + c('f(x)') + ', con las variables que valen en ese punto (si un parámetro no es una variable en ese punto, no muestra nada).', 'x:3\nf(x):x^2+1=', 'x:=3\nf(x):=x^2+1=10', 't'],
      ['Variables de fuera', 'Lee las variables que valen donde se la llama, no donde se definió.', 'k:2\nf(x):x*k\nf(3)=\nk:5\nf(3)=', 'k:=2\nf(x):=x*k\nf(3)=6\nk:=5\nf(3)=15', 't'],
    ],
    rules: [
      'Los parámetros valen lo que se les pasa (números, vectores o matrices) y ocultan a las variables del mismo nombre.',
      'Los nombres de la función y de sus parámetros siguen las reglas de las variables, y no pueden ser funciones del programa (' + c('sin', 'sum') + '…).',
    ],
  },
  {
    title: 'Propiedades con «.»',
    note: 'Se usan en cualquier fórmula: cotas, textos (' + c('p12.x=') + '), actuadores y gráficas. Las medidas que leen se actualizan con el dibujo.',
    head: ['Escribes', 'Qué es'],
    rows: [
      [c('p12.x', 'p12.y'), 'Coordenadas de un punto.'],
      [c('l3.len') + ' (' + c('l3.L') + '), ' + c('l3.ang'), 'Longitud de una línea y su ángulo, en radianes.'],
      [c('c1.r', 'c1.d', 'c1.x', 'c1.y'), 'Radio, diámetro y centro de un círculo.'],
      [c('a2.r', 'a2.x', 'a2.y'), 'Radio y centro de un arco.'],
    ],
  },
  {
    title: 'Fuente y formato del texto',
    head: ['Propiedad', 'Qué hace'],
    rows: [
      ['Fuente', 'Se elige al crear el texto o en sus propiedades (doble toque sobre el texto): sistema, Helvetica/Arial, Times/Georgia, Courier/Menlo, Verdana, Palatino, Optima, Futura, American Typewriter y tres manuscritas. Si el dispositivo no tiene una, se usa una genérica parecida.'],
      ['Propiedades', 'Todo lo del texto se cambia con <b>doble toque</b> sobre él: contenido, color, fuente, altura, ángulo, alineación con una línea, <i>Legible</i> y punto de inserción. Si hay otros textos seleccionados, el cambio (salvo el contenido) se aplica también a ellos, y la altura, el ángulo, la fuente, <i>Legible</i> y el punto de inserción quedan para los textos nuevos.'],
      ['Punto de inserción', 'Es un punto real: se puede acotar, fijar o relacionar. Se elige su lugar en la caja del texto.'],
      ['Ángulo y altura', 'Gira y escala el texto. <b>Alinear con</b> lo alinea con una línea (el ángulo pasa a ser un desfase); «Ninguna» lo suelta y conserva la orientación.'],
      ['<i>Legible</i>', 'Gira 180° el texto que quedaría boca abajo.'],
      ['Color y fondo', 'Las mismas muestras sirven para la fuente o para el fondo: se elige con <b>Color de fuente</b> o <b>Color de fondo</b>. El fondo pinta la caja del texto (con un pequeño margen) y tapa lo que quede debajo; en el fondo, <i>Auto</i> es el color del papel y <b>Sin fondo</b> lo quita. Se ve en el dibujo y en el SVG; el DXF no lo lleva.'],
    ],
  },
  {
    title: 'Dibujos anteriores a la v2.0',
    note: 'Al abrirlos, la sintaxis vieja pasa a la nueva una sola vez, con un aviso.',
    head: ['Antes', 'Qué pasa', 'Ejemplo', 'Queda'],
    rows: [
      [c('x{=v}'), 'Definición: pasa a fórmula con asignación.', 'A{=b*h}', '$A:b*h$', 'mig'],
      [c('[=e]'), 'Salida: pasa a fórmula con <b>=</b> al final.', '[=A]', '$A=$', 'mig'],
      ['Fórmula vieja', 'Lo que ahora se leería como asignación o salida queda como literal.', '$$a:b$$', '$$`a:b`$$', 'mig'],
    ],
  },
];

const exampleHtml = (ex) => ex.split('\n').map((l) => `<code>${esc(l)}</code>`).join('<br>');
const HEAD = ['Escribes', 'Qué hace', 'Ejemplo', 'Se ve'];

// Seccion de la ayuda (HTML): por grupo, una nota, una tabla y, si hay, una lista de reglas.
export function calcRefHtml() {
  return CALC_GROUPS.map((g) => {
    const head = g.head || HEAD;
    const rows = g.rows.map((r) => '<tr>' + head.map((_, i) => `<td>${i < 2 ? r[i] : r[i] ? exampleHtml(r[i]) : ''}</td>`).join('') + '</tr>').join('');
    const rules = g.rules ? `<ul>${g.rules.map((x) => `<li>${x}</li>`).join('')}</ul>` : '';
    return `<h4>${g.title}</h4>${g.note ? `<p>${g.note}</p>` : ''}<table class="fref"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>${rules}`;
  }).join('\n');
}

// Capitulo del manual (Markdown). Se regenera con «npm run docs»; test/calcref.test.mjs avisa si quedo viejo.
const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const mdCode = (s, cell) => {
  const t = cell ? s.replace(/\|/g, '\\|') : s;
  return t.includes('`') ? '`` ' + t + ' ``' : '`' + t + '`';
};
const md = (h, cell) => h.replace(/<code>([^<]*)<\/code>/g, (_, x) => mdCode(unesc(x), cell))
  .replace(/<b>([^<]*)<\/b>/g, '**$1**').replace(/<i>([^<]*)<\/i>/g, '*$1*')
  .replace(/<a href="([^"]*)"[^>]*>([^<]*)<\/a>/g, '[$2]($1)');
const mdExample = (ex) => ex.split('\n').map((l) => mdCode(l, true)).join('<br>');
const NAV = '[← 6. Cotas](06-cotas.md) · [Índice](README.md) · [8. Splines y trazados (levas y trayectorias) →](08-splines-y-trazados.md)';
export function calcRefMarkdown() {
  const head = `# 7. Texto y cálculo

Textos que calculan: asignaciones, salidas, fórmulas con AsciiMath, vectores y matrices, funciones propias y el orden de lectura de la página. Los ejemplos con resultado se comprueban con el motor de la app en las pruebas automáticas (\`test/calcref.test.mjs\`).

La lista completa de funciones y operadores, con ejemplos, está en [Funciones y operadores](funciones.md).

${NAV}
`;
  const body = CALC_GROUPS.map((g) => {
    const h = g.head || HEAD;
    const rows = g.rows.map((r) => '| ' + h.map((_, i) => (i < 2 ? md(r[i], true) : r[i] ? mdExample(r[i]) : '')).join(' | ') + ' |').join('\n');
    const rules = g.rules ? '\n\n' + g.rules.map((x) => '- ' + md(x)).join('\n') : '';
    return `## ${g.title}\n\n${g.note ? md(g.note) + '\n\n' : ''}| ${h.join(' | ')} |\n|${h.map(() => '---').join('|')}|\n${rows}${rules}`;
  }).join('\n\n');
  return `${head}\n---\n\n${body}\n\n---\n\n${NAV}\n`;
}
