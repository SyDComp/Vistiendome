/**
 * Abrir una ventana y mandarla a imprimir.
 *
 * POR QUE UNA VENTANA APARTE
 * `window.print()` desde una vista del panel imprime el panel entero: barra
 * lateral, cabecera y todo. La unica forma de imprimir SOLO el documento es
 * darle su propia ventana con su propio HTML.
 *
 * POR QUE ESTA FUNCION EXISTE
 * Habia tres impresores (etiquetas de envio, codigos de barra y orden de corte)
 * y cada uno repetia la misma secuencia: abrir, avisar si el navegador bloqueo
 * el pop-up, escribir el documento, cerrarlo, esperar e imprimir. Cada copia
 * tenia sus propios tiempos y su propio manejo del bloqueo, y el CSS de cada
 * hoja vivia dentro de una cadena de JavaScript, donde ningun editor lo
 * entiende y una comilla invertida rompe la compilacion.
 *
 * COMO SE USA
 * El CSS de cada hoja vive en un `.css` de verdad, y se trae como texto:
 *
 *     import estilos from './miHoja.impresion.css?raw'
 *     imprimirDocumento({ titulo: 'Orden N 12', cuerpo: html, estilos })
 *
 * SOBRE EL COLOR EN PAPEL
 * Estas hojas NO usan los tokens de `variables.css`, y es a proposito: esos
 * colores estan pensados para una pantalla iluminada por detras. En papel, el
 * texto va en negro y las lineas en gris de tinta. Que una hoja de impresion
 * tenga sus propios valores no es una excepcion olvidada, es lo correcto.
 */

/**
 * El navegador necesita un instante entre recibir el documento y poder
 * paginarlo. Sin esta espera, `print()` puede dispararse antes de que las
 * imagenes carguen y salen recuadros vacios.
 */
const ESPERA_ANTES_DE_IMPRIMIR = 400;

const AVISO_POPUP =
    'Por favor permite las ventanas emergentes (pop-ups) en tu navegador para imprimir.';

/**
 * @param {object} doc
 * @param {string} doc.titulo   nombre de la ventana y del PDF si se guarda
 * @param {string} doc.cuerpo   HTML de lo que se imprime
 * @param {string|string[]} doc.estilos
 *        CSS de la hoja, como texto. Se acepta una lista porque hay hojas con
 *        medidas que solo se saben al momento (el tamano de papel que eligio
 *        quien imprime, cuantas etiquetas entran por fila): eso va en un
 *        segundo bloque, corto y generado, y el resto sigue en su `.css`.
 * @param {boolean} [doc.cerrarAlTerminar=true]  cerrar la ventana tras imprimir
 * @param {string}  [doc.idioma='es']
 * @returns {boolean} false si el navegador bloqueo la ventana
 */
export const imprimirDocumento = ({
    titulo,
    cuerpo,
    estilos,
    cerrarAlTerminar = true,
    idioma = 'es',
}) => {
    const ventana = window.open('', '_blank', 'width=1000,height=800');

    // Sin ventana no se imprimio nada. Quien llama necesita saberlo para no
    // dar por hecho lo que sigue (marcar como despachado, por ejemplo).
    if (!ventana) {
        alert(AVISO_POPUP);
        return false;
    }

    const cierre = cerrarAlTerminar ? 'window.close();' : '';
    const hoja = Array.isArray(estilos) ? estilos.join('\n\n') : estilos;

    ventana.document.write(`<!doctype html>
<html lang="${idioma}">
<head>
<meta charset="utf-8">
<title>${titulo}</title>
<style>
${hoja}
</style>
</head>
<body>
${cuerpo}
<script>
window.onload = function () {
    setTimeout(function () { window.print(); ${cierre} }, ${ESPERA_ANTES_DE_IMPRIMIR});
};
<\/script>
</body>
</html>`);
    ventana.document.close();
    return true;
};
