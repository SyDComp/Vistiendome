import { get, put } from '../client.js';

/** Lo que le pasó a un pedido, en el orden en que pasó. */
export const obtenerHistoriaPedido = (id) => get(`/api/v1/crm/cotizaciones/${id}/historia`);

/** Completa o corrige "¿Cómo llegó?" de un pedido cargado en el panel. Queda anotado. */
export const corregirCanalPedido = (id, canal) => put(`/api/v1/crm/cotizaciones/${id}/canal`, { canal });
