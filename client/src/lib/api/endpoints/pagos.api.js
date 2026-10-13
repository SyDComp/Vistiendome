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

/** Se le devuelve a la clienta lo pagado de más. @param {{monto, medio, nota}} devolucion */
export const devolverPago = (pedidoId, devolucion) => post(`${base(pedidoId)}/devolver`, devolucion);

/** Lo pagado de más queda a favor de la clienta, para otra compra. */
export const dejarAFavor = (pedidoId, { monto, nota }) => post(`${base(pedidoId)}/a-favor`, { monto, nota });
