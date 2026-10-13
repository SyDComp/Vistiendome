import { del, get, post, put } from '../client.js';

/** El pedido tal como está ahora en el servidor (el de la lista puede estar viejo). */
export const obtenerPedido = (id) => get(`/api/v1/crm/cotizaciones/${id}`);

/** Cotiza una prenda: {precio} un monto, {sin_costo: true}, o ninguno para "por cotizar". */
export const cotizarPrenda = (pedidoId, prendaId, { precio, sin_costo }) =>
    put(`/api/v1/crm/cotizaciones/${pedidoId}/prendas/${prendaId}/precio`, { precio, sin_costo });

/**
 * Cómo quedaría el pedido al confirmarlo. No guarda nada.
 * @param {{caminos?: Object<string, string>}} eleccion  {prendaId: 'BODEGA'|'TALLER'}
 */
export const propuestaConfirmacion = (pedidoId, eleccion) =>
    post(`/api/v1/crm/cotizaciones/${pedidoId}/propuesta`, eleccion);

/**
 * Confirma el pedido. Si la bodega cambió mientras se decidía, falla con 409
 * y el error trae `data.propuesta` con la propuesta nueva.
 * @param {{caminos: Object, nota: string|null, esperando_vistas: string[]}} eleccion
 */
export const confirmarPedido = (pedidoId, eleccion) =>
    post(`/api/v1/crm/cotizaciones/${pedidoId}/confirmar`, eleccion);

/** Quita una prenda de un pedido que todavía no se confirma. Queda en la historia. */
export const quitarPrenda = (pedidoId, prendaId) =>
    del(`/api/v1/crm/cotizaciones/${pedidoId}/prendas/${prendaId}`);

/**
 * Agrega una prenda a un pedido que todavía no se confirma. Devuelve el pedido.
 * @param {{producto_id?: number, nombre_custom?: string, cantidad: number,
 *          precio_unitario_estimado?: number|null, config_custom?: object, config_propuesta?: object}} prenda
 */
export const agregarPrenda = (pedidoId, prenda) =>
    post(`/api/v1/crm/cotizaciones/${pedidoId}/prendas`, prenda);

/**
 * Cancela una prenda de un pedido confirmado. Devuelve el pedido: si no le
 * queda ninguna prenda, la pantalla pregunta si se cancela entero.
 */
export const cancelarPrenda = (pedidoId, prendaId) =>
    post(`/api/v1/crm/cotizaciones/${pedidoId}/prendas/${prendaId}/cancelar`, {});

/** Los pedidos en esos estados (por ejemplo ['NUEVA', 'EN_CONVERSACION']). */
export const listarCotizaciones = (estados = []) =>
    get(`/api/v1/crm/${estados.length ? '?' + estados.map(e => `estado=${e}`).join('&') : ''}`);
