import { API_BASE_URL } from '../../constants/api.js';

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
