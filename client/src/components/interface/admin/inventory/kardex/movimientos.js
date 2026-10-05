/**
 * Las reglas de los movimientos de bodega, sin pantalla de por medio.
 */

/** Lo que se puede registrar a mano. Cada uno dice hacia dónde mueve el stock. */
export const OPCIONES_MOVIMIENTO = {
    ingreso: {
        tipo: 'receipt',
        signo: 1,
        nombre: 'Ingreso',
        ayuda: 'Entra mercadería: suma al stock.',
    },
    salida: {
        tipo: 'adjustment',
        signo: -1,
        nombre: 'Merma / Salida',
        ayuda: 'Prenda dañada, perdida o que sale sin venta: resta del stock.',
    },
};

const NOMBRES_POR_TIPO = {
    receipt: 'Ingreso',
    sale: 'Venta',
    return: 'Devolución',
    reservation: 'Reserva',
};

/** Cómo se llama un movimiento del historial. Un ajuste dice si sumó o restó. */
export const nombreDelMovimiento = (m) => {
    if (m.type === 'adjustment') return m.quantity < 0 ? 'Merma / Salida' : 'Ajuste';
    return NOMBRES_POR_TIPO[m.type] || 'Movimiento';
};

/**
 * El historial con el saldo que quedó después de cada movimiento.
 * Viene del más reciente al más antiguo, así que se recorre hacia atrás desde
 * el saldo de hoy.
 */
export const conSaldo = (historial = [], saldoActual = 0) => {
    let saldo = saldoActual;
    return historial.map(m => {
        const fila = { ...m, saldo };
        saldo -= m.quantity;
        return fila;
    });
};

/** La cantidad escrita, si es un entero mayor que cero; si no, null. */
export const cantidadValida = (texto) => {
    const n = Number(texto);
    return Number.isInteger(n) && n > 0 ? n : null;
};

/** Con qué stock queda la variante si se confirma el movimiento. */
export const stockResultante = (actual, opcion, cantidad) =>
    actual + OPCIONES_MOVIMIENTO[opcion].signo * cantidad;
