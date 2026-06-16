/**
 * Constantes de la API
 * Un único lugar de verdad para URLs, endpoints base y configuración.
 */

export const API_BASE_URL = import.meta.env.PROD
    ? ''
    : (import.meta.env.VITE_API_URL || `${(window.location.origin.includes('localhost') ? 'http://localhost:8000' : '')}`);

export const API_ENDPOINTS = {
    PRODUCTS: '/api/v1/products',
    CATEGORIES: '/api/v1/products/categories',
    FILTERS_METADATA: '/api/v1/products/filters-metadata',
    COLLECTIONS: '/api/v1/collections',
    SETTINGS: '/api/v1/settings',
    ADMIN_CATALOG: '/api/v1/admin/catalog',
};

export const WS_URL = (() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = import.meta.env.PROD ? window.location.host : 'localhost:8000';
    return `${wsProtocol}//${wsHost}/ws/heartbeat`;
})();
