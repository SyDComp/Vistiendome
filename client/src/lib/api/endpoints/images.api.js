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
