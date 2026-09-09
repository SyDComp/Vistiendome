import { useMediaQuery } from './useMediaQuery';

/**
 * Los cortes de pantalla, leidos del CSS.
 *
 * EL PROBLEMA QUE RESUELVE
 * Habia catorce componentes decidiendo por su cuenta si la pantalla era chica,
 * cada uno con `window.innerWidth`, su propio listener de `resize` (quince en
 * total) y su propio numero. Los numeros eran siete: 640, 768, 950, 1024, 1050,
 * 1280 y 1400. Los cortes del CSS son otros: 480, 640, 768, 1024, 1200 y 1400.
 *
 * O sea que 950, 1050 y 1280 no existian en ninguna hoja de estilos. En una
 * ventana de 1000 px, el JavaScript decidia "esto es chico" y armaba la pantalla
 * en modo movil, mientras el CSS la seguia pintando como escritorio. Nadie
 * escribio esa combinacion: sale de dos criterios que nunca se hablaron.
 *
 * POR QUE SE LEEN DEL CSS Y NO SE ESCRIBEN AQUI
 * Copiar los numeros a este archivo seria tener la misma duda dos veces: el dia
 * que alguien mueva `--bp-lg` en `variables.css`, el JavaScript seguiria con el
 * valor viejo y volveriamos al mismo desacuerdo, solo que mas dificil de ver.
 * Aca se leen de ahi, una vez, al arrancar.
 *
 * POR QUE `matchMedia` Y NO `innerWidth`
 * `innerWidth` obliga a escuchar `resize`, que se dispara en CADA pixel que se
 * arrastra el borde de la ventana, y cada uno redibujaba el componente entero.
 * `matchMedia` avisa UNA vez, cuando se cruza el corte: es el mismo mecanismo
 * que usa el CSS para sus `@media`, que es justamente lo que queremos que
 * coincida.
 */

/** Si el CSS no cargo todavia, estos son los mismos valores de `variables.css`.
 *  No son una segunda fuente de verdad: son el respaldo para el instante en que
 *  la primera aun no esta disponible. */
const RESPALDO = { sm: 480, md: 640, lg: 768, xl: 1024, '2xl': 1200, '3xl': 1400 };

const leerCortes = () => {
    if (typeof window === 'undefined') return RESPALDO;

    const raiz = getComputedStyle(document.documentElement);
    const cortes = {};
    for (const nombre of Object.keys(RESPALDO)) {
        const valor = parseFloat(raiz.getPropertyValue(`--bp-${nombre}`));
        cortes[nombre] = Number.isFinite(valor) ? valor : RESPALDO[nombre];
    }
    return cortes;
};

export const CORTES = leerCortes();

/**
 * `true` mientras la ventana sea MAS ANGOSTA que el corte.
 *
 * El 0.02 de menos no es un ajuste al ojo: `max-width: 640px` incluye los 640,
 * asi que sin restar nada, una ventana de exactamente 640 px daria verdadero
 * aqui y falso en un `@media (min-width: 640px)` del CSS. Las dos reglas
 * aplicarian a la vez. Restando esa fraccion, el corte cae donde el CSS lo
 * pone, y esto equivale exactamente al `innerWidth < 640` que habia antes.
 *
 * @param {'sm'|'md'|'lg'|'xl'|'2xl'|'3xl'} corte
 * @returns {boolean}
 *
 * @example
 * const esAngosta = useHasta('md');   // antes: window.innerWidth < 640
 */
export const useHasta = (corte) =>
    useMediaQuery(`(max-width: ${(CORTES[corte] ?? RESPALDO[corte]) - 0.02}px)`);

/** `true` desde el corte hacia arriba. El complemento exacto de `useHasta`. */
export const useDesde = (corte) =>
    useMediaQuery(`(min-width: ${CORTES[corte] ?? RESPALDO[corte]}px)`);

export default useHasta;
