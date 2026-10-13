/**
 * Cómo se dice en qué está el pago de un pedido. Lo calcula el servidor
 * (core/pagos/cuentas.py): el total de las prendas activas menos lo pagado.
 */
import { formatCurrency } from './cartUtils';

export const ESTADOS_PAGO = {
    SIN_PAGAR: { texto: 'Sin pagar', tono: 'espera' },
    ABONADO: { texto: 'Abonado', tono: 'proceso' },
    PAGADO: { texto: 'Pagado', tono: 'listo' },
    PAGADO_DE_MAS: { texto: 'Pagado de más', tono: 'alerta' },
};

/** "Falta $12.000", "Pagado de más: $3.000", o null si no falta nada. */
export const textoSaldo = ({ saldo = 0, por_cotizar: porCotizar = 0 } = {}) => {
    if (saldo < 0) return `Pagado de más: ${formatCurrency(-saldo)}`;
    if (saldo > 0) return `Falta ${formatCurrency(saldo)}${porCotizar ? ' (y lo que esté por cotizar)' : ''}`;
    return porCotizar ? 'Falta lo que esté por cotizar' : null;
};

/** El monto escrito a mano ("12.000", "$12000") como entero de pesos, o null si no sirve. */
export const montoDesde = (texto) => {
    const limpio = String(texto ?? '').replace(/[^\d]/g, '');
    const n = parseInt(limpio, 10);
    return Number.isInteger(n) && n > 0 ? n : null;
};
