const API_BASE_URL = 'http://localhost:8000';

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

        const response = await fetch(`${API_BASE_URL}/api/v1/products/?${params}`);
        if (!response.ok) throw new Error('Error al cargar productos');
        return await response.json();
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
};

export const getCategoriesTree = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/products/categories/tree`);
        if (!response.ok) throw new Error('Error al cargar árbol de categorías');
        return await response.json();
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
};

export const getFiltersMetadata = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/products/filters-metadata`);
        if (!response.ok) throw new Error('Error al cargar metadatos de filtros');
        return await response.json();
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
};


export const getProductBySlug = async (slug) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/products/${slug}`);
        if (!response.ok) throw new Error('Producto no encontrado');
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
