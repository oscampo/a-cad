// Contenido de la ayuda. Sale del manual (docs/, en español; docs/en/ en ingles): tools/build-help.mjs arma un modulo por idioma en
// src/help-gen/ (npm run help) y aqui se juntan en el orden de la ayuda, con los capitulos que arma la propia app a partir del codigo:
// Texto y calculo, Funciones y operadores (sus tablas salen de calcref.js y funcref.js, con ejemplos que se calculan) e Iconos (de la
// interfaz). Ver docs/README.md para como se escribe y se traduce un capitulo.
import { funcRefHtml } from './funcref.js';
import { calcRefHtml } from './calcref.js';

// El orden y los titulos de los capitulos que arma la app (el resto, los de docs/); «es» marca lo que aun esta solo en español
const ORDER = ['conceptos', 'empezar', 'dibujar', 'seleccionar', 'dividir', 'restricciones', 'cotas', 'calc', 'icons', 'funcs', 'splines', 'simulaciones', 'estilo', 'archivo', 'atajos', 'limites', 'acerca'];
const BUILT = {
  calc: { es: 'Texto y cálculo', en: 'Text and calculation', body: () => calcRefHtml() },
  icons: {
    es: 'Íconos en los textos', en: 'Icons in texts',
    body: () => '<p>Un texto puede mostrar el ícono de una herramienta, para referirse a ella en un tutorial o una nota: <code>![Línea](icon:line)</code> lo dibuja dentro de la línea, a la altura de la letra y con el color del texto (en un enlace, en azul). Lo que va entre corchetes es el texto alternativo: se usa si el nombre no existe y en otros visores de Markdown. Sale también al exportar (SVG y DXF, como trazos). <b>Toca una fila para copiarla</b> y pégala en el texto.</p>\n<div id="iconRef"></div>',
  },
  funcs: {
    es: 'Funciones y operadores', en: 'Functions and operators',
    body: () => '<p>Lista completa de lo que acepta una fórmula, en cotas, textos, actuadores y gráficas. Cada ejemplo muestra lo que da.</p>\n' + funcRefHtml(),
  },
};

// La ayuda en un idioma ('es' o 'en'): el modulo generado se carga solo cuando se pide
export async function helpHtml(lang) {
  const { default: gen } = await (lang === 'en' ? import('./help-gen/en.js') : import('./help-gen/es.js'));
  const parts = ORDER.map((id) => {
    if (BUILT[id]) { // sin traducir el contenido (aun): el titulo va en el idioma y la marca (es)
      const b = BUILT[id], mark = lang === 'es' ? '' : ' <small>(es)</small>';
      return `<details data-ch="${id}"><summary>${b[lang] || b.es}${mark}</summary>\n${b.body()}\n</details>`;
    }
    const h = gen.chapters[id] || '';
    return id === 'empezar' ? h.replace('<details ', '<details open ') : h;
  });
  return gen.intro + '\n\n' + parts.join('\n\n') + '\n';
}
