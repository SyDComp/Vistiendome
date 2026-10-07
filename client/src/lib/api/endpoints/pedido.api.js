import { get, put } from '../client.js';

/** El pedido tal como está ahora en el servidor (el de la lista puede estar viejo). */
export const obtenerPedido = (id) => get(`/api/v1/crm/cotizaciones/${id}`);

/** Cotiza una prenda: {precio} un monto, {sin_costo: true}, o ninguno para "por cotizar". */
export const cotizarPrenda = (pedidoId, prendaId, { precio, sin_costo }) =>
    put(`/api/v1/crm/cotizaciones/${pedidoId}/prendas/${prendaId}/precio`, { precio, sin_costo });
