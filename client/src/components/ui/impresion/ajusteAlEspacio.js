import { useEffect } from 'react';

/**
 * Acomoda el tamaño de letra de las etiquetas al espacio que les toca.
 *
 * Una etiqueta no sabe cuánto mide su casilla: depende del papel y de cuántas
 * van por hoja. En vez de un tamaño por formato, se busca la escala más grande
 * con la que la etiqueta entra completa, sin cortar ninguna letra.
 *
 * Todas las etiquetas de la tanda llevan la MISMA escala, la de la que menos
 * espacio tiene: con una por etiqueta, la de texto largo saldría con otra
 * letra que su vecina de hoja.
 *
 * Qué tiene que traer cada etiqueta:
 *   data-ajuste            la caja que se ajusta. Su primer hijo es el
 *                          contenido, y los hijos de ése van separados con
 *                          `gap` y sin márgenes: su alto natural es la suma.
 *   data-ajuste="continuo" una tira sin alto fijo: el largo no limita.
 *   data-ajuste-clave      opcional. Las de la misma clave son iguales (copias
 *                          de una misma etiqueta) y se miden una sola vez.
 *   --escala               la variable que su CSS multiplica en letras y
 *                          espacios. La pone este ajuste.
 */

const ESCALA_MINIMA = 0.4;
const ESCALA_MAXIMA = 2.6;
// En una tira continua el largo no limita: la escala se queda en la de diseño.
const ESCALA_CONTINUA = 1;
// Aire de reserva: el papel redondea distinto que la pantalla.
const HOLGURA = 0.96;
const PASOS = 14;
// Cuánto se achica en cada intento de la comprobación final.
const REDUCCION = 0.98;

const esContinua = (caja) => caja.dataset.ajuste === 'continuo';

const altoNatural = (contenido) => {
    const hijos = [...contenido.children];
    const separacion = parseFloat(getComputedStyle(contenido).rowGap) || 0;
    return hijos.reduce((suma, h) => suma + h.offsetHeight, 0) + separacion * Math.max(0, hijos.length - 1);
};

const cabe = (caja, escala) => {
    caja.style.setProperty('--escala', String(escala));
    const contenido = caja.firstElementChild;
    if (contenido.scrollWidth > contenido.clientWidth + 1) return false;
    const estilo = getComputedStyle(caja);
    const disponible = caja.clientHeight - parseFloat(estilo.paddingTop) - parseFloat(estilo.paddingBottom);
    return altoNatural(contenido) <= disponible * HOLGURA;
};

const mayorEscala = (caja) => {
    if (esContinua(caja)) return ESCALA_CONTINUA;
    if (cabe(caja, ESCALA_MAXIMA)) return ESCALA_MAXIMA;
    let entra = ESCALA_MINIMA;
    let noEntra = ESCALA_MAXIMA;
    for (let i = 0; i < PASOS; i++) {
        const medio = (entra + noEntra) / 2;
        if (cabe(caja, medio)) entra = medio;
        else noEntra = medio;
    }
    return entra;
};

/** Una de cada clave: las copias de una etiqueta miden lo mismo. */
const representantes = (cajas) => {
    const vistas = new Set();
    return cajas.filter(caja => {
        const clave = caja.dataset.ajusteClave;
        if (!clave) return true;
        if (vistas.has(clave)) return false;
        vistas.add(clave);
        return true;
    });
};

const cabenTodas = (cajas, escala) => cajas.every(caja => esContinua(caja) || cabe(caja, escala));

export const ajustarAlEspacio = (contenedor) => {
    const cajas = [...contenedor.querySelectorAll('[data-ajuste]')];
    if (!cajas.length) return;
    const medidas = representantes(cajas);
    let escala = Number(Math.min(...medidas.map(mayorEscala)).toFixed(3));
    // El alto no siempre baja parejo con la letra: donde dos textos comparten
    // una fila, achicar puede cambiar cómo se reparten y dónde corta cada
    // línea. Por eso, ya con la escala común puesta, se comprueba de nuevo
    // cada etiqueta antes de darla por buena.
    while (escala > ESCALA_MINIMA && !cabenTodas(medidas, escala)) {
        escala = Number(Math.max(ESCALA_MINIMA, escala * REDUCCION).toFixed(3));
    }
    cajas.forEach(caja => caja.style.setProperty('--escala', String(escala)));
};

/**
 * Se mide en un efecto y no antes de pintar: un código de barras dibuja su
 * SVG en su propio efecto, y los efectos de los hijos corren antes que el de
 * quien los contiene. Medir antes sería medir la etiqueta sin el código.
 */
export const useAjusteAlEspacio = (contenedorRef, dependencias) => {
    useEffect(() => {
        if (contenedorRef.current) ajustarAlEspacio(contenedorRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, dependencias);
};
