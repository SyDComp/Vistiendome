import { API_BASE_URL } from '../constants/api.js';

/**
 * API Client centralizado
 * Wrapper ligero sobre fetch con manejo de errores, headers y base URL.
 */

class ApiError extends Error {
    constructor(message, status, response) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.response = response;
    }
}

const buildUrl = (endpoint) => {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${API_BASE_URL}${cleanEndpoint}`;
};

/**
 * Request base. Toda llamada HTTP pasa por aquí.
 */
export const request = async (method, endpoint, options = {}) => {
    const url = buildUrl(endpoint);

    const config = {
        method,
        credentials: 'include',
        headers: {
            ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
            ...options.headers,
        },
        ...options,
    };

    if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
        config.body = JSON.stringify(config.body);
    }

    try {
        const response = await fetch(url, config);

        if (!response.ok) {
            let errorMessage = `Error ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorData.message || errorMessage;
            } catch {
                // Si no hay JSON en el body de error, usamos el statusText
            }
            throw new ApiError(errorMessage, response.status, response);
        }

        // 204 No Content
        if (response.status === 204) {
            return null;
        }

        // Intentar parsear JSON; si falla, retornar texto
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        return await response.text();
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        // Errores de red (fetch falló)
        throw new ApiError(error.message || 'Error de red', 0, null);
    }
};

/**
 * Wrappers por método HTTP
 */
export const get = (endpoint, options = {}) => request('GET', endpoint, options);

export const post = (endpoint, body, options = {}) =>
    request('POST', endpoint, { ...options, body });

export const put = (endpoint, body, options = {}) =>
    request('PUT', endpoint, { ...options, body });

export const del = (endpoint, options = {}) => request('DELETE', endpoint, options);

export const patch = (endpoint, body, options = {}) =>
    request('PATCH', endpoint, { ...options, body });

export { ApiError };
