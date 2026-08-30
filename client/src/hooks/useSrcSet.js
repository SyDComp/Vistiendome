import { useState, useEffect } from 'react';
import { getSrcSet, getMapaSrcsets } from '../lib/api/endpoints/index.js';
import { API_BASE_URL } from '../lib/constants/api.js';

/**
 * Resuelve el `srcset` de una imagen de la biblioteca.
 *
 * Es el único lugar donde vive esa lógica. Existe porque mostrar una foto bien
 * dependía de que el endpoint mandara el srcset Y de que la vista se acordara
 * de usarlo, y eso se olvidó cinco veces: galería (35 MB), ficha de producto
 * (17,6 MB), tarjetas del panel, selector de variantes y detalle de colección
 * (2,7 MB) — esta última con el srcset viajando en el payload, sin que nadie lo
 * leyera.
 *
 * Devuelve `{ srcSet, listo }`:
 *   - `srcSet`: '' si la imagen no tiene derivadas. Un srcset vacío hace que el
 *     navegador use el `src` de siempre, así que nada se rompe.
 *   - `listo`: false mientras no se sepa. Quien llama NO debe pintar el `<img>`
 *     todavía: si lo pinta, el navegador ya empezó a bajar el original y el
 *     srcset llega tarde. Sólo pasa la primera vez de la sesión.
 */

// Fuera del hook a propósito: es el mismo mapa para toda la aplicación. Tenerlo
// acá es lo que hace que, de la segunda imagen en adelante, el srcset esté
// disponible en el primer render y no haya parpadeo.
let mapaEnMemoria = null;

// El mapa viene con las rutas tal como las guarda el servidor ("/media/x.jpg").
// Si alguien ya resolvió la URL a absoluta, se le quita el prefijo para buscar.
const clave = (url) => {
    if (!url) return '';
    if (API_BASE_URL && url.startsWith(API_BASE_URL)) return url.slice(API_BASE_URL.length);
    return url;
};

export const useSrcSet = (url, srcsetExplicito = '') => {
    const [mapa, setMapa] = useState(mapaEnMemoria);

    const esExterna = !url || url.startsWith('http');
    // Si el payload ya trae el srcset, o la imagen es externa, no hay nada que
    // esperar ni que consultar.
    const necesitaMapa = !srcsetExplicito && !esExterna && !mapa;

    useEffect(() => {
        if (!necesitaMapa) return;
        let vigente = true;
        getMapaSrcsets()
            .then(m => { mapaEnMemoria = m; if (vigente) setMapa(m); })
            // Que falle el mapa no puede dejar la pantalla sin fotos: se sigue
            // con el original, que es exactamente como estaba antes.
            .catch(() => { mapaEnMemoria = {}; if (vigente) setMapa({}); });
        return () => { vigente = false; };
    }, [necesitaMapa]);

    if (srcsetExplicito) return { srcSet: getSrcSet(srcsetExplicito), listo: true };
    if (esExterna) return { srcSet: '', listo: true };
    if (!mapa) return { srcSet: '', listo: false };
    return { srcSet: mapa[clave(url)] || '', listo: true };
};

export default useSrcSet;
