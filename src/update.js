// Actualizacion automatica: al volver a la app, ¿hay una compilacion nueva publicada? (sin DOM)
// El index.html de cada compilacion apunta a un script con nombre propio («assets/index-XXXX.js»): si el de la pagina publicada es otro
// que el de la pagina abierta, hay version nueva.
export const assetOf = (html) => /assets\/index-[\w-]+\.js/.exec(String(html ?? ''))?.[0] || null;

// mine: el src del script de esta pagina; liveHtml: el index.html publicado. true si hay que recargar.
export const needsReload = (mine, liveHtml) => {
  const a = assetOf(mine), b = assetOf(liveHtml);
  return !!a && !!b && a !== b;
};

// Para no entrar en un bucle si algo falla: como mucho una recarga automatica cada `gap` ms (last: marca de la ultima, en ms).
export const reloadAllowed = (last, now, gap = 5 * 60 * 1000) => !(last > 0) || now - last > gap;
