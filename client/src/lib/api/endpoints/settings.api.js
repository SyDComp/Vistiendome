import { get, post } from '../client.js';
import { API_ENDPOINTS } from '../../constants/api.js';

/**
 * Obtiene las configuraciones del sitio.
 */
export const getSiteSettings = async () => {
    return get(API_ENDPOINTS.SETTINGS);
};

/**
 * Actualiza una configuración específica del sitio.
 */
export const updateSiteSetting = async (key, value) => {
    return post(`${API_ENDPOINTS.SETTINGS}/${key}`, { value });
};
