// En producción, usamos rutas relativas (cadena vacía) para que Nginx las intercepte.
// En desarrollo, usamos localhost:8000 o lo que diga VITE_API_URL.
const API_BASE_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || `${(window.location.origin.includes('localhost') ? 'http://localhost:8000' : '')}`);

// Simple in-memory cache para optimizar la carga (5 minutos)
const apiCache = new Map();
const CACHE_TTL = 300000;

export const getProducts = async (filters = {}) => {
    try {
        const params = new URLSearchParams();
        if (filters.category) params.append('category', filters.category);
        if (filters.min_price) params.append('min_price', filters.min_price);
        if (filters.max_price) params.append('max_price', filters.max_price);
        
        // Formatear specs como key:val,key2:val2
        if (filters.specs && Object.keys(filters.specs).length > 0) {
            const specParts = [];
            Object.entries(filters.specs).forEach(([key, values]) => {
                values.forEach(val => specParts.push(`${key}:${val}`));
            });
            if (specParts.length > 0) params.append('specs', specParts.join(','));
        }

        const cacheKey = `products_${params.toString()}`;
        const cachedItem = apiCache.get(cacheKey);
        const now = Date.now();
        if (cachedItem && (now - cachedItem.timestamp < CACHE_TTL)) {
            return cachedItem.data;
        }

        const response = await fetch(`${API_BASE_URL}/api/v1/products/?${params}`, { credentials: 'include' });
        if (!response.ok) throw new Error('Error al cargar productos');
        const data = await response.json();
        
        apiCache.set(cacheKey, { data, timestamp: now });
        return data;
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
};

export const getCategoriesTree = async () => {
    try {
        const cacheKey = 'categoriesTree';
        const cachedItem = apiCache.get(cacheKey);
        const now = Date.now();
        if (cachedItem && (now - cachedItem.timestamp < CACHE_TTL)) return cachedItem.data;

        const response = await fetch(`${API_BASE_URL}/api/v1/products/categories/tree`, { credentials: 'include' });
        if (!response.ok) throw new Error('Error al cargar árbol de categorías');
        const data = await response.json();
        
        apiCache.set(cacheKey, { data, timestamp: now });
        return data;
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
};

export const getFiltersMetadata = async () => {
    try {
        const cacheKey = 'filtersMetadata';
        const cachedItem = apiCache.get(cacheKey);
        const now = Date.now();
        if (cachedItem && (now - cachedItem.timestamp < CACHE_TTL)) return cachedItem.data;

        const response = await fetch(`${API_BASE_URL}/api/v1/products/filters-metadata`, { credentials: 'include' });
        if (!response.ok) throw new Error('Error al cargar metadatos de filtros');
        const data = await response.json();
        
        apiCache.set(cacheKey, { data, timestamp: now });
        return data;
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
};


export const getProductBySlug = async (slug) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/products/${slug}`, { credentials: 'include' });
        if (!response.ok) throw new Error('Producto no encontrado');
        return await response.json();
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
};

export const getCollections = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/collections/`, { credentials: 'include' });
        if (!response.ok) throw new Error('Error al cargar colecciones');
        return await response.json();
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
};

export const getCollectionBySlug = async (slug) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/collections/${slug}`, { credentials: 'include' });
        if (!response.ok) throw new Error('Colección no encontrada');
        return await response.json();
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
};

export const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${API_BASE_URL}/${cleanPath}`;
};

// --- CONFIGURACIONES DEL SITIO ---

export const getSiteSettings = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/settings`, { credentials: 'include' });
        if (!response.ok) throw new Error('Error al cargar configuraciones');
        return await response.json();
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
};

export const updateSiteSetting = async (key, value) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/settings/${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value }),
            credentials: 'include'
        });
        if (!response.ok) throw new Error('Error al actualizar configuración');
        return await response.json();
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
};
