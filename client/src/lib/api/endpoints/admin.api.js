import { get, post, put, del } from '../client.js';
import { API_ENDPOINTS } from '../../constants/api.js';

const ADMIN_BASE = API_ENDPOINTS.ADMIN_CATALOG;

// ==================== PRODUCTS ====================

export const getAdminProducts = async (params = {}) => {
    const searchParams = new URLSearchParams(params);
    return get(`${ADMIN_BASE}/products?${searchParams}`);
};

export const getAdminProductById = async (id) => {
    return get(`${ADMIN_BASE}/products/${id}`);
};

export const createAdminProduct = async (data) => {
    return post(`${ADMIN_BASE}/products`, data);
};

export const updateAdminProduct = async (id, data) => {
    return put(`${ADMIN_BASE}/products/${id}`, data);
};

export const deleteAdminProduct = async (id, force = true) => {
    return del(`${ADMIN_BASE}/products/${id}?force=${force}`);
};

// ==================== SKUS / VARIANTS ====================

export const getAdminSkus = async (params = {}) => {
    const searchParams = new URLSearchParams(params);
    return get(`${ADMIN_BASE}/skus?${searchParams}`);
};

export const getAdminSkuById = async (id) => {
    return get(`${ADMIN_BASE}/skus/${id}`);
};

// ==================== CATEGORIES ====================

export const getAdminCategories = async (params = {}) => {
    const searchParams = new URLSearchParams(params);
    return get(`${ADMIN_BASE}/categories?${searchParams}`);
};

// ==================== ATTRIBUTES / CHARACTERISTICS ====================

export const getAdminAttributes = async () => {
    return get(`${ADMIN_BASE}/attributes`);
};

// ==================== CRM ====================

/**
 * Cambia el estado de un pedido.
 *
 * Ojo con DESPACHADA: ese estado descuenta el stock. No es una etiqueta, es un
 * hecho — ver `EstadoCotizacion` en el servidor.
 */
export const actualizarEstadoCotizacion = (id, estado) =>
    put(`/api/v1/crm/cotizaciones/${id}/estado`, { estado });

// ==================== COLLECTIONS ====================

export const getAdminCollections = async () => {
    return get(`${ADMIN_BASE}/collections`);
};
