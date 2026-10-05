import { get, post } from '../client.js';

/**
 * Bodega: el libro de movimientos de stock de cada variante.
 */

const BASE = '/api/v1/admin/catalog/kardex';

/** Saldo actual de cada variante. */
export const getSaldosKardex = () => get(BASE);

/** Movimientos de una variante, del más reciente al más antiguo. */
export const getHistorialKardex = (skuId) => get(`${BASE}/${skuId}/history`);

/**
 * @param {{sku_id: number, type: string, quantity: number, note: string}} movimiento
 *        `quantity` con signo: positiva suma, negativa resta.
 */
export const registrarMovimientoKardex = (movimiento) => post(`${BASE}/movement`, movimiento);
