/**
 * Cache in-memory con TTL
 * Utilidad reutilizable para cachear respuestas de API.
 */

const cache = new Map();
const DEFAULT_TTL = 300000; // 5 minutos en ms

/**
 * Genera una clave de cache a partir de un prefijo y parámetros.
 */
export const buildCacheKey = (prefix, params = {}) => {
    const paramString = Object.keys(params).length
        ? new URLSearchParams(params).toString()
        : '';
    return paramString ? `${prefix}_${paramString}` : prefix;
};

/**
 * Obtiene un valor del cache si existe y no ha expirado.
 */
export const getCached = (key) => {
    const item = cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
        cache.delete(key);
        return null;
    }
    return item.data;
};

/**
 * Guarda un valor en el cache.
 */
export const setCached = (key, data, ttl = DEFAULT_TTL) => {
    cache.set(key, { data, timestamp: Date.now(), ttl });
};

/**
 * Invalida una entrada del cache por clave exacta o por prefijo.
 */
export const invalidateCache = (keyOrPrefix) => {
    if (!keyOrPrefix) {
        cache.clear();
        return;
    }
    // Si contiene underscore, es clave exacta; si no, elimina todo con ese prefijo
    if (keyOrPrefix.includes('_')) {
        cache.delete(keyOrPrefix);
    } else {
        for (const key of cache.keys()) {
            if (key.startsWith(keyOrPrefix)) {
                cache.delete(key);
            }
        }
    }
};
