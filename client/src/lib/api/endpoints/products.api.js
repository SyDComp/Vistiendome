import { get } from '../client.js';
import { cachedFetch, buildCacheKey } from '../cache.js';
import { API_ENDPOINTS } from '../../constants/api.js';

const CACHE_PREFIX = 'products';
const CACHE_PREFIX_CATEGORIES = 'categoriesTree';
const CACHE_PREFIX_FILTERS = 'filtersMetadata';

/**
 * Listado completo de productos con sus variantes. Lo usan el buscador, el
 * CMS, las colecciones y el modal del admin, que filtran en memoria.
 *
 * Ya no arma filtros para el servidor: ninguno de sus llamadores pasaba
 * ninguno, y el filtrado ocurre en el cliente para que se sienta instantáneo.
 * El catálogo y el explorador usan getCatalogo() (/looks), mucho más liviano.
 */
export const getProducts = async () =>
    cachedFetch(CACHE_PREFIX, () => get(`${API_ENDPOINTS.PRODUCTS}/`));

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
 * Cuánto cuestan HOY estos SKU.
 *
 * SIN cachedFetch, a propósito: se usa para corregir los precios viejos que el
 * carrito guardó en el navegador, así que pedirlo del caché devolvería
 * exactamente el número equivocado que se quiere arreglar.
 */
export const getPreciosVigentes = async (skus = []) => {
    const codigos = [...new Set(skus.filter(Boolean).map(String))];
    if (!codigos.length) return [];
    return get(`${API_ENDPOINTS.PRODUCTS}/precios?skus=${encodeURIComponent(codigos.join(','))}`);
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
export const getCategoriesTree = async () =>
    cachedFetch(CACHE_PREFIX_CATEGORIES, () => get(`${API_ENDPOINTS.CATEGORIES}/tree`));

/**
 * Obtiene los metadatos de filtros disponibles.
 * Cacheado globalmente.
 */
export const getFiltersMetadata = async () =>
    cachedFetch(CACHE_PREFIX_FILTERS, () => get(API_ENDPOINTS.FILTERS_METADATA));
