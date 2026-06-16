/**
 * Funciones puras de filtrado y ordenamiento para el catálogo.
 */

/**
 * Obtiene todos los slugs descendientes de un nodo de categoría.
 */
export const getDescendantSlugs = (node) => {
    if (!node) return [];
    let slugs = [node.slug];
    if (node.children) {
        node.children.forEach(child => {
            slugs = [...slugs, ...getDescendantSlugs(child)];
        });
    }
    return slugs;
};

/**
 * Filtra productos por categoría.
 * @param {Array} products - Lista de productos.
 * @param {Object|null} categoryNode - Nodo de categoría seleccionada (incluye hijos).
 * @param {string|null} exactSlug - Slug exacto para filtro del drawer.
 */
export const filterByCategory = (products, categoryNode, exactSlug) => {
    if (!products?.length) return [];
    if (categoryNode) {
        const allowedSlugs = getDescendantSlugs(categoryNode);
        return products.filter(p => allowedSlugs.includes(p.category_slug));
    }
    if (exactSlug) {
        return products.filter(p => p.category_slug === exactSlug);
    }
    return products;
};

/**
 * Filtra productos por especificaciones (atributos dinámicos).
 * Para que un producto pase, debe cumplir con AL MENOS UNO
 * de los valores seleccionados para CADA atributo.
 */
export const filterBySpecs = (products, specs) => {
    if (!products?.length) return [];
    if (!specs || Object.keys(specs).length === 0) return products;

    return products.filter(p => {
        return Object.entries(specs).every(([key, values]) => {
            if (!values || values.length === 0) return true;
            return values.includes(p.specs?.[key]);
        });
    });
};

/**
 * Ordena productos según el criterio seleccionado.
 */
export const sortProducts = (products, sortOrder) => {
    if (!products?.length) return [];
    const result = [...products];

    if (sortOrder === 'precio-bajo') {
        result.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortOrder === 'precio-alto') {
        result.sort((a, b) => (b.price || 0) - (a.price || 0));
    }
    // 'relevancia' mantiene el orden original del servidor

    return result;
};
