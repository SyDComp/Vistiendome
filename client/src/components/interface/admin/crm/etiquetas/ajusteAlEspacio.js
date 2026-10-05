import { useEffect } from 'react';

/**
 * Acomoda el tamaño de letra de las etiquetas al espacio que les toca.
 *
 * Una etiqueta no sabe cuánto mide su casilla: depende del papel y de cuántas
 * van por hoja. En vez de un tamaño por formato, se busca la escala más grande
 * con la que la etiqueta entra completa, sin cortar ninguna letra.
 *
 * Todas las etiquetas de la tanda llevan la MISMA escala, la de la que menos
 * espacio tiene: con una por etiqueta, la de dirección larga saldría con otra
 * letra que su vecina de hoja.
 */

const ESCALA_MINIMA = 0.4;
const ESCALA_MAXIMA = 2.6;
// En una tira continua el largo no limita: la escala se queda en la de diseño.
const ESCALA_CONTINUA = 1;
// Aire de reserva: el papel redondea distinto que la pantalla.
const HOLGURA = 0.96;
const PASOS = 14;

const altoNatural = (contenido) => {
    const hijos = [...contenido.children];
    const separacion = parseFloat(getComputedStyle(contenido).rowGap) || 0;
    return hijos.reduce((suma, h) => suma + h.offsetHeight, 0) + separacion * Math.max(0, hijos.length - 1);
};

const cabe = (etiqueta, escala) => {
    etiqueta.style.setProperty('--ee-escala', String(escala));
    const contenido = etiqueta.firstElementChild;
    if (contenido.scrollWidth > contenido.clientWidth + 1) return false;
    const estilo = getComputedStyle(etiqueta);
    const disponible = etiqueta.clientHeight - parseFloat(estilo.paddingTop) - parseFloat(estilo.paddingBottom);
    return altoNatural(contenido) <= disponible * HOLGURA;
};

const mayorEscala = (etiqueta) => {
    if (etiqueta.classList.contains('ee-etiqueta--continua')) return ESCALA_CONTINUA;
    if (cabe(etiqueta, ESCALA_MAXIMA)) return ESCALA_MAXIMA;
    let entra = ESCALA_MINIMA;
    let noEntra = ESCALA_MAXIMA;
    for (let i = 0; i < PASOS; i++) {
        const medio = (entra + noEntra) / 2;
        if (cabe(etiqueta, medio)) entra = medio;
        else noEntra = medio;
    }
    return entra;
};

// Cuánto se achica en cada intento de la comprobación final.
const REDUCCION = 0.98;

const cabenTodas = (etiquetas, escala) =>
    etiquetas.every(e => e.classList.contains('ee-etiqueta--continua') || cabe(e, escala));

export const ajustarEtiquetas = (contenedor) => {
    const etiquetas = [...contenedor.querySelectorAll('.ee-etiqueta')];
    if (!etiquetas.length) return;
    let escala = Number(Math.min(...etiquetas.map(mayorEscala)).toFixed(3));
    // El alto no siempre baja parejo con la letra: donde dos textos comparten
    // una fila (comuna y región), achicar puede cambiar cómo se reparten y
    // dónde corta cada línea. Por eso, ya con la escala común puesta, se
    // comprueba de nuevo cada etiqueta antes de darla por buena.
    while (escala > ESCALA_MINIMA && !cabenTodas(etiquetas, escala)) {
        escala = Number(Math.max(ESCALA_MINIMA, escala * REDUCCION).toFixed(3));
    }
    etiquetas.forEach(e => e.style.setProperty('--ee-escala', String(escala)));
};

/**
 * Se mide en un efecto y no antes de pintar: el código de barras dibuja su
 * SVG en su propio efecto, y los efectos de los hijos corren antes que el de
 * quien los contiene. Medir antes sería medir la etiqueta sin el código.
 */
export const useAjusteAlEspacio = (contenedorRef, dependencias) => {
    useEffect(() => {
        if (contenedorRef.current) ajustarEtiquetas(contenedorRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, dependencias);
};
