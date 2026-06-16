import { get } from '../client.js';
import { getCached, setCached, buildCacheKey } from '../cache.js';
import { API_ENDPOINTS } from '../../constants/api.js';

const CACHE_PREFIX = 'products';
const CACHE_PREFIX_CATEGORIES = 'categoriesTree';
const CACHE_PREFIX_FILTERS = 'filtersMetadata';

/**
 * Obtiene el listado de productos con filtros opcionales.
 * Cachea por combinación de filtros.
 */
export const getProducts = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.min_price) params.append('min_price', filters.min_price);
    if (filters.max_price) params.append('max_price', filters.max_price);

    if (filters.specs && Object.keys(filters.specs).length > 0) {
        const specParts = [];
        Object.entries(filters.specs).forEach(([key, values]) => {
            values.forEach(val => specParts.push(`${key}:${val}`));
        });
        if (specParts.length > 0) params.append('specs', specParts.join(','));
    }

    const cacheKey = buildCacheKey(CACHE_PREFIX, Object.fromEntries(params));
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const data = await get(`${API_ENDPOINTS.PRODUCTS}/?${params}`);
    setCached(cacheKey, data);
    return data;
};

/**
 * Obtiene un producto por su slug.
 */
export const getProductBySlug = async (slug) => {
    return get(`${API_ENDPOINTS.PRODUCTS}/${slug}`);
};

/**
 * Obtiene el árbol de categorías.
 * Cacheado globalmente.
 */
export const getCategoriesTree = async () => {
    const cached = getCached(CACHE_PREFIX_CATEGORIES);
    if (cached) return cached;

    const data = await get(`${API_ENDPOINTS.CATEGORIES}/tree`);
    setCached(CACHE_PREFIX_CATEGORIES, data);
    return data;
};

/**
 * Obtiene los metadatos de filtros disponibles.
 * Cacheado globalmente.
 */
export const getFiltersMetadata = async () => {
    const cached = getCached(CACHE_PREFIX_FILTERS);
    if (cached) return cached;

    const data = await get(API_ENDPOINTS.FILTERS_METADATA);
    setCached(CACHE_PREFIX_FILTERS, data);
    return data;
};
