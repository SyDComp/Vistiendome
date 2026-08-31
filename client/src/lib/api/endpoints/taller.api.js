import { get, post, put, del } from '../client.js';

/**
 * Órdenes de corte. Producción, no ventas: por eso vive aparte del CRM.
 */

const BASE = '/api/v1/ordenes-corte';

/** Piezas de pedidos que todavía no están en ninguna orden. Materia prima. */
export const getPiezasPendientes = (estado = 'CONFIRMADA') =>
    get(`${BASE}/pendientes?estado=${encodeURIComponent(estado)}`);

export const getOrdenesCorte = (estado) =>
    get(estado ? `${BASE}/?estado=${encodeURIComponent(estado)}` : `${BASE}/`);

export const getOrdenCorte = (id) => get(`${BASE}/${id}`);

export const crearOrdenCorte = (datos) => post(`${BASE}/`, datos);

export const cambiarEstadoOrden = (id, estado) => put(`${BASE}/${id}/estado`, { estado });

export const repetirOrden = (id) => post(`${BASE}/${id}/repetir`);

export const eliminarOrden = (id) => del(`${BASE}/${id}`);
