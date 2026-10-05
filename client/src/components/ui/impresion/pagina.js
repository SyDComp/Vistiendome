/**
 * Una página de etiquetas, en milímetros: el papel, su margen, la cuadrícula
 * y la separación entre casillas. La usan todas las hojas de etiquetas del
 * panel (envíos, códigos de barra), en pantalla y en papel.
 *
 * @typedef {object} Geometria
 * @property {number} anchoMm
 * @property {number|null} altoMm   null en una tira continua
 * @property {number} cols
 * @property {number} filas
 * @property {number} margenMm
 * @property {number} separacionMm
 */

/** Variables que dibujan la página con sus medidas reales. */
export const variablesDePagina = (g) => ({
    '--pag-ancho': `${g.anchoMm}mm`,
    '--pag-alto': g.altoMm ? `${g.altoMm}mm` : 'auto',
    '--pag-cols': g.cols,
    '--pag-filas': g.filas,
    '--pag-margen': `${g.margenMm}mm`,
    '--pag-separacion': `${g.separacionMm}mm`,
});

/**
 * Lo único de la hoja de impresión que no puede vivir en un .css: `@page`
 * no acepta variables, y el tamaño depende de lo que se eligió.
 */
export const estilosDePagina = (g) =>
    `@page { size: ${g.altoMm ? `${g.anchoMm}mm ${g.altoMm}mm` : 'auto'}; margin: 0; }`;
