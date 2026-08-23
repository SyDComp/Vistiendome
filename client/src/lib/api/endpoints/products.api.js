import { get } from '../client.js';
import { cachedFetch, buildCacheKey } from '../cache.js';
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
    return cachedFetch(cacheKey, () => get(`${API_ENDPOINTS.PRODUCTS}/?${params}`));
};

/**
 * Catálogo liviano: productos (con sus facetas para filtrar) y looks (una
 * tarjeta por foto/valor visual distinto).
 *
 * Reemplaza a getProducts() en el catálogo y el explorador: antes se
 * descargaban las 1.049 variantes para dibujar ~60 tarjetas (284 KB).
 */
export const getCatalogo = async () =>
    cachedFetch(buildCacheKey('catalogo'), () => get(`${API_ENDPOINTS.PRODUCTS}/looks`));

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
export const getCategoriesTree = async () =>
    cachedFetch(CACHE_PREFIX_CATEGORIES, () => get(`${API_ENDPOINTS.CATEGORIES}/tree`));

/**
 * Obtiene los metadatos de filtros disponibles.
 * Cacheado globalmente.
 */
export const getFiltersMetadata = async () =>
    cachedFetch(CACHE_PREFIX_FILTERS, () => get(API_ENDPOINTS.FILTERS_METADATA));
