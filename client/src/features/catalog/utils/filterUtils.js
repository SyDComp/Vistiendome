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
 * Encuentra un nodo de categoría por su slug dentro del árbol de categorías.
 */
export const findCategoryNode = (categoriesTree, slug) => {
    if (!categoriesTree || !slug) return null;
    for (const node of categoriesTree) {
        if (node.slug === slug) return node;
        if (node.children) {
            const found = findCategoryNode(node.children, slug);
            if (found) return found;
        }
    }
    return null;
};

/**
 * Filtra productos por categoría.
 * @param {Array} products - Lista de productos.
 * @param {Object|null} categoryNode - Nodo de categoría seleccionada (incluye hijos).
 * @param {string|null} exactSlug - Slug exacto para filtro del drawer.
 * @param {Array} categoriesTree - Árbol completo de categorías.
 */
export const filterByCategory = (products, categoryNode, exactSlug, categoriesTree = []) => {
    if (!products?.length) return [];
    
    let resolvedNode = categoryNode;
    if (!resolvedNode && exactSlug) {
        resolvedNode = findCategoryNode(categoriesTree, exactSlug);
    }

    if (resolvedNode) {
        const allowedSlugs = getDescendantSlugs(resolvedNode);
        return products.filter(p => allowedSlugs.includes(p.category_slug));
    }
    
    // Fallback original por si no se encuentra el nodo
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
            
            const lowerValues = values.map(v => String(v).toLowerCase().trim());
            const lowerKey = String(key).toLowerCase().trim();

            const inSpecs = p.specs && Object.entries(p.specs).some(([sk, sv]) => 
                sk.toLowerCase().trim() === lowerKey && lowerValues.includes(String(sv).toLowerCase().trim())
            );
            
            // facets = valores distintos por característica que trae el
            // producto. Reemplaza a recorrer todas las variantes: el catálogo
            // filtra productos (basta con que ALGUNA variante calce) y para eso
            // el conjunto de valores es suficiente.
            const inFacets = p.facets && Object.entries(p.facets).some(([fk, fvals]) =>
                fk.toLowerCase().trim() === lowerKey &&
                (fvals || []).some(fv => lowerValues.includes(String(fv).toLowerCase().trim()))
            );

            // Respaldo para los consumidores que aún reciben variantes completas.
            const inVariants = p.variants && p.variants.some(v =>
                v.config && Object.entries(v.config).some(([ck, cv]) =>
                    ck.toLowerCase().trim() === lowerKey && lowerValues.includes(String(cv).toLowerCase().trim())
                )
            );

            return inSpecs || inFacets || inVariants;
        });
    });
};

/**
 * Filtra productos por rango de precio.
 */
export const filterByPriceRange = (products, priceRange) => {
    if (!products?.length) return [];
    if (!priceRange) return products;
    
    return products.filter(p => {
        const price = p.price || 0;
        if (priceRange.min !== undefined && priceRange.min !== null && price < priceRange.min) return false;
        if (priceRange.max !== undefined && priceRange.max !== null && price > priceRange.max) return false;
        return true;
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
