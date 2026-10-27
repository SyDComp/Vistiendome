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

/**
 * La misma cantidad a varias variantes. Todo o nada: un 409 trae en
 * `data.detail.filas` las que lo impiden.
 * @param {{sku_ids: number[], tipo: 'ingreso'|'merma', cantidad: number, motivo: string}} lote
 */
export const sumarEnBloque = (lote) => post(`${BASE}/lote/sumar`, lote);

/**
 * Conteo de inventario: se anota la diferencia como ajuste. Un 409 trae en
 * `data.detail.filas` las que cambiaron mientras se contaba.
 * @param {{filas: {sku_id: number, esperado: number, contado: number}[], motivo: string}} lote
 */
export const contarEnBloque = (lote) => post(`${BASE}/lote/conteo`, lote);
