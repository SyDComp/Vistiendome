import { PAPELES } from '../../../../../utils/papeles';

/**
 * Cómo se reparten las etiquetas de envío en el papel.
 *
 * En una hoja, el tamaño de cada etiqueta NO es un dato: sale del papel, del
 * margen y de cuántas van por hoja. Así cuatro etiquetas caben en una carta y
 * también en una A4, aunque las dos hojas midan distinto.
 */

const MARGEN_HOJA_MM = 8;
const SEPARACION_MM = 4;

export const FORMATOS = {
    hoja_4: { nombre: '4 por hoja', tipo: 'hoja', cols: 2, filas: 2 },
    hoja_6: { nombre: '6 por hoja', tipo: 'hoja', cols: 2, filas: 3 },
    hoja_2: { nombre: '2 por hoja', tipo: 'hoja', cols: 1, filas: 2 },
    hoja_1: { nombre: '1 por hoja', tipo: 'hoja', cols: 1, filas: 1 },
    rollo_100x150: { nombre: 'Rollo térmico courier (100 × 150 mm)', tipo: 'rollo', anchoMm: 100, altoMm: 150, margenMm: 3 },
    // Tira continua: su largo lo decide el contenido, no el papel.
    ticketera_80: { nombre: 'Ticketera de 80 mm (tira continua)', tipo: 'rollo', anchoMm: 80, altoMm: null, margenMm: 3 },
};

export const usaPapel = (formatoKey) => FORMATOS[formatoKey]?.tipo === 'hoja';

/**
 * Medidas de la página y de cada etiqueta, en milímetros.
 * `altoMm` y `etiquetaAltoMm` son null en una tira continua.
 */
export const geometria = (formatoKey, papelKey) => {
    const f = FORMATOS[formatoKey];
    if (f.tipo === 'hoja') {
        const p = PAPELES[papelKey];
        return {
            anchoMm: p.anchoMm,
            altoMm: p.altoMm,
            cols: f.cols,
            filas: f.filas,
            margenMm: MARGEN_HOJA_MM,
            separacionMm: SEPARACION_MM,
            etiquetaAnchoMm: (p.anchoMm - 2 * MARGEN_HOJA_MM - (f.cols - 1) * SEPARACION_MM) / f.cols,
            etiquetaAltoMm: (p.altoMm - 2 * MARGEN_HOJA_MM - (f.filas - 1) * SEPARACION_MM) / f.filas,
        };
    }
    return {
        anchoMm: f.anchoMm,
        altoMm: f.altoMm,
        cols: 1,
        filas: 1,
        margenMm: f.margenMm,
        separacionMm: 0,
        etiquetaAnchoMm: f.anchoMm - 2 * f.margenMm,
        etiquetaAltoMm: f.altoMm ? f.altoMm - 2 * f.margenMm : null,
    };
};

export const porPagina = (g) => g.cols * g.filas;

/** "9,8 × 13 cm": la medida de cada etiqueta, para decirla en pantalla. */
export const describirMedida = (g) => {
    const cm = (mm) => (mm / 10).toLocaleString('es-CL', { maximumFractionDigits: 1 });
    return g.etiquetaAltoMm
        ? `Cada etiqueta: ${cm(g.etiquetaAnchoMm)} × ${cm(g.etiquetaAltoMm)} cm`
        : `Cada etiqueta: ${cm(g.etiquetaAnchoMm)} cm de ancho, el largo que necesite`;
};

/**
 * Lo único de la hoja de impresión que no puede vivir en un .css: `@page`
 * no acepta variables, y el tamaño depende de lo que se eligió.
 */
export const estilosDePagina = (g) =>
    `@page { size: ${g.altoMm ? `${g.anchoMm}mm ${g.altoMm}mm` : 'auto'}; margin: 0; }`;

/** Variables que dibujan la página con sus medidas reales. */
export const variablesDePagina = (g) => ({
    '--pag-ancho': `${g.anchoMm}mm`,
    '--pag-alto': g.altoMm ? `${g.altoMm}mm` : 'auto',
    '--pag-cols': g.cols,
    '--pag-filas': g.filas,
    '--pag-margen': `${g.margenMm}mm`,
    '--pag-separacion': `${g.separacionMm}mm`,
});
