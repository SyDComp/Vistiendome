/**
 * Cache in-memory con TTL
 * Utilidad reutilizable para cachear respuestas de API.
 */

const cache = new Map();
const DEFAULT_TTL = 300000; // 5 minutos en ms

// Peticiones en vuelo, por clave. El caché solo evita la SEGUNDA visita; no
// evita que dos componentes que montan a la vez pidan lo mismo al mismo
// tiempo, porque ninguno alcanzó a guardar nada todavía. Medido en el build
// de producción: /catalogo pedía filters-metadata dos veces con 1 ms de
// diferencia (CartContext y useCatalog).
const enVuelo = new Map();

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
 * Devuelve lo cacheado si está fresco; si no, ejecuta `fetcher` — pero si esa
 * misma clave ya está pidiéndose, engancha a la petición en curso en vez de
 * lanzar otra.
 *
 * Único punto donde se combinan caché y red: los endpoints ya no repiten el
 * getCached/await/setCached a mano, así que no pueden olvidarse de deduplicar.
 */
export const cachedFetch = async (key, fetcher, ttl = DEFAULT_TTL) => {
    const cached = getCached(key);
    if (cached) return cached;

    const yaEnVuelo = enVuelo.get(key);
    if (yaEnVuelo) return yaEnVuelo;

    let promesa;
    promesa = (async () => {
        try {
            const data = await fetcher();
            // Si mientras se pedía alguien invalidó el caché, no repoblarlo:
            // esos datos ya nacieron viejos y taparían al cambio recién hecho.
            if (enVuelo.get(key) === promesa) setCached(key, data, ttl);
            return data;
        } finally {
            // Se libera pase lo que pase: si falla, el próximo intento debe
            // poder reintentar en vez de quedar pegado a una promesa muerta.
            if (enVuelo.get(key) === promesa) enVuelo.delete(key);
        }
    })();

    enVuelo.set(key, promesa);
    return promesa;
};

/**
 * Invalida una entrada del cache por clave exacta o por prefijo.
 */
export const invalidateCache = (keyOrPrefix) => {
    if (!keyOrPrefix) {
        cache.clear();
        enVuelo.clear();
        return;
    }
    // Si contiene underscore, es clave exacta; si no, elimina todo con ese prefijo
    if (keyOrPrefix.includes('_')) {
        cache.delete(keyOrPrefix);
        enVuelo.delete(keyOrPrefix);
    } else {
        for (const key of cache.keys()) {
            if (key.startsWith(keyOrPrefix)) {
                cache.delete(key);
            }
        }
        for (const key of enVuelo.keys()) {
            if (key.startsWith(keyOrPrefix)) {
                enVuelo.delete(key);
            }
        }
    }
};
