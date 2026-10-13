import { get, post } from '../client.js';

/**
 * Los pagos de un pedido. Un pago no se edita ni se borra: se anula con motivo.
 */

const base = (pedidoId) => `/api/v1/crm/cotizaciones/${pedidoId}/pagos`;

/** {cuentas: {total, por_cotizar, pagado, saldo, estado}, pagos: [...]}, el más nuevo primero. */
export const verPagos = (pedidoId) => get(base(pedidoId));

/** @param {{monto: number, medio: string, nota?: string|null}} pago */
export const registrarPago = (pedidoId, pago) => post(base(pedidoId), pago);

export const anularPago = (pedidoId, pagoId, motivo) => post(`${base(pedidoId)}/${pagoId}/anular`, { motivo });
