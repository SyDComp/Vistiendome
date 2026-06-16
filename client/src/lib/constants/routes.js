/**
 * Constantes de rutas de la aplicación.
 * Un único lugar de verdad para evitar strings hardcodeados.
 */

export const ROUTES = {
    HOME: '/',
    CATALOG: '/catalogo',
    COLLECTIONS: '/colecciones',
    COLLECTION_DETAIL: '/coleccion/:slug',
    ABOUT: '/nosotros',
    CONTACT: '/contacto',
    HELP: '/ayuda',
    SEARCH: '/search',
    PRODUCT: '/producto/:slug',
    PRODUCT_WITH_SKU: '/producto/:slug/:sku',
    PRODUCT_FULL: '/producto/:slug/:sku/:imgIndex',
    CATALOG_PRODUCT: '/catalogo/producto/:slug',
    CATALOG_PRODUCT_SKU: '/catalogo/producto/:slug/:sku',
    CATALOG_PRODUCT_FULL: '/catalogo/producto/:slug/:sku/:imgIndex',
    COLLECTION_PRODUCT: '/coleccion/:collectionSlug/producto/:slug',
    COLLECTION_PRODUCT_SKU: '/coleccion/:collectionSlug/producto/:slug/:sku',
    COLLECTION_PRODUCT_FULL: '/coleccion/:collectionSlug/producto/:slug/:sku/:imgIndex',

    // Admin
    ADMIN_BOOTSTRAP: '/admin/bootstrap',
    ADMIN_LOGIN: '/admin/login',
    ADMIN_DASHBOARD: '/admin/dashboard/*',
};

export const ROUTE_PATHS = {
    COLLECTION: (slug) => `/coleccion/${slug}`,
    PRODUCT: (slug, sku, imgIndex) => {
        if (imgIndex !== undefined) return `/producto/${slug}/${sku}/${imgIndex}`;
        if (sku) return `/producto/${slug}/${sku}`;
        return `/producto/${slug}`;
    },
    CATALOG_PRODUCT: (slug, sku, imgIndex) => {
        if (imgIndex !== undefined) return `/catalogo/producto/${slug}/${sku}/${imgIndex}`;
        if (sku) return `/catalogo/producto/${slug}/${sku}`;
        return `/catalogo/producto/${slug}`;
    },
};
