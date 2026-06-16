import { get } from '../client.js';
import { API_ENDPOINTS } from '../../constants/api.js';

/**
 * Obtiene todas las colecciones.
 */
export const getCollections = async () => {
    return get(`${API_ENDPOINTS.COLLECTIONS}/`);
};

/**
 * Obtiene una colección por su slug.
 */
export const getCollectionBySlug = async (slug) => {
    return get(`${API_ENDPOINTS.COLLECTIONS}/${slug}`);
};
