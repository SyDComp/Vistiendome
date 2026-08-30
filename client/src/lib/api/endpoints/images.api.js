import { API_BASE_URL, API_ENDPOINTS } from '../../constants/api.js';
import { get } from '../client.js';
import { cachedFetch } from '../cache.js';

/**
 * Construye una URL completa para una imagen.
 * @param {string} path - Ruta relativa o URL absoluta
 * @returns {string} URL completa
 */
export const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${API_BASE_URL}/${cleanPath}`;
};

/**
 * Resuelve un srcset del servidor ("/media/x_sm.webp 400w, ...") a URLs
 * completas, manteniendo el descriptor de ancho de cada una.
 *
 * El servidor manda rutas relativas; sin este paso apuntarían al origen del
 * cliente, que en desarrollo es otro puerto.
 *
 * @param {string} srcset
 * @returns {string} '' si no hay nada que resolver.
 */
export const getSrcSet = (srcset) => {
    if (!srcset) return '';
    return srcset
        .split(',')
        .map(parte => {
            const [ruta, ancho] = parte.trim().split(/\s+/);
            if (!ruta) return null;
            return ancho ? `${getImageUrl(ruta)} ${ancho}` : getImageUrl(ruta);
        })
        .filter(Boolean)
        .join(', ');
};

/**
 * Mapa `url -> srcset` de toda la biblioteca de medios, resuelto a URLs
 * completas.
 *
 * Se pide una sola vez: `cachedFetch` deduplica las peticiones en vuelo, así
 * que veinte imágenes montándose a la vez producen una petición, no veinte.
 *
 * Existe para que ninguna pantalla nueva tenga que acordarse de pedir las
 * derivadas. Ver el endpoint `/media/srcsets` para el porqué.
 */
export const getMapaSrcsets = () =>
    cachedFetch('media:srcsets', async () => {
        const crudo = await get(`${API_ENDPOINTS.MEDIA}/srcsets`);
        const mapa = {};
        Object.entries(crudo || {}).forEach(([url, srcset]) => {
            mapa[url] = getSrcSet(srcset);
        });
        return mapa;
    }, 10 * 60 * 1000); // 10 min: las derivadas de una foto no cambian nunca;
                        // lo único que cambia es que aparezcan fotos nuevas.
