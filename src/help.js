// Contenido de la ayuda. Sale del manual (docs/, en español; docs/en/ en ingles): tools/build-help.mjs arma un modulo por idioma en
// src/help-gen/ (npm run help) y aqui se juntan en el orden de la ayuda, con los capitulos que arma la propia app a partir del codigo:
// Texto y calculo, Funciones y operadores (sus tablas salen de calcref.js y funcref.js, con ejemplos que se calculan) e Iconos (de la
// interfaz). Esos tres se traducen con el catalogo src/i18n-ref-en.js (ver tools/ref-i18n.mjs). Ver docs/README.md para como se escribe
// y se traduce un capitulo.
import { funcRefHtml } from './funcref.js';
import { calcRefHtml } from './calcref.js';
import { hashStr } from './images.js';

const ORDER = ['conceptos', 'empezar', 'guias', 'desplegables', 'dibujar', 'seleccionar', 'dividir', 'restricciones', 'cotas', 'calc', 'icons', 'funcs', 'splines', 'simulaciones', 'estilo', 'archivo', 'atajos', 'limites', 'acerca'];
// Los textos de esos capitulos que no estan en calcref.js ni en funcref.js (para el catalogo en ingles)
const TEXT = {
  icons: '<p>Un texto puede mostrar el ícono de una herramienta, para referirse a ella en un tutorial o una nota: <code>![Línea](icon:line)</code> lo dibuja dentro de la línea, a la altura de la letra y con el color del texto (en un enlace, en azul). Lo que va entre corchetes es el texto alternativo: se usa si el nombre no existe y en otros visores de Markdown. Sale también al exportar (SVG y DXF, como trazos). <b>Toca una fila para copiarla</b> y pégala en el texto.</p>',
  funcs: '<p>Lista completa de lo que acepta una fórmula, en cotas, textos, actuadores y gráficas. Cada ejemplo muestra lo que da.</p>',
};
const TITLE = { calc: ['Texto y cálculo', 'Text and calculation'], icons: ['Íconos en los textos', 'Icons in texts'], funcs: ['Funciones y operadores', 'Functions and operators'] };
export const helpStrings = () => [...Object.values(TEXT), ...Object.values(TITLE).map((t) => t[0])];
const BUILT = {
  calc: (T) => calcRefHtml(T),
  icons: (T) => T(TEXT.icons) + '\n<div id="iconRef"></div>',
  funcs: (T) => T(TEXT.funcs) + '\n' + funcRefHtml(T),
};

// La ayuda en un idioma ('es' o 'en'): el modulo generado y, en ingles, el catalogo de las referencias se cargan solo cuando se piden
export async function helpHtml(lang) {
  const en = lang === 'en';
  const { default: gen } = await (en ? import('./help-gen/en.js') : import('./help-gen/es.js'));
  const REF = en ? (await import('./i18n-ref-en.js')).REF_EN : null;
  const T = REF ? (s) => REF[hashStr(s)] ?? s : (s) => s;
  const parts = ORDER.map((id) => {
    if (BUILT[id]) return `<details data-ch="${id}"><summary>${TITLE[id][en ? 1 : 0]}</summary>\n${BUILT[id](T)}\n</details>`;
    const h = gen.chapters[id] || '';
    return id === 'empezar' ? h.replace('<details ', '<details open ') : h;
  });
  return gen.intro + '\n\n' + parts.join('\n\n') + '\n';
}
