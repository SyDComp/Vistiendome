/**
 * Las cuentas de una venta en el local mientras se arma: el total de las
 * prendas y cuánto falta o sobra en los pagos. El servidor vuelve a
 * comprobarlo todo al registrar.
 */

/** Una línea nueva a partir de algo disponible (variante o pieza única). */
export const lineaDesde = (d) => ({
    clave: d.sku_id ? `v-${d.sku_id}` : `p-${d.pieza_id}`,
    sku_id: d.sku_id ?? null,
    pieza_id: d.pieza_id ?? null,
    nombre: d.nombre,
    codigo: d.codigo,
    config: d.config || {},
    disponible: d.disponible,
    cantidad: 1,
    precio: d.precio ? String(d.precio) : '',
});

/** El monto escrito como entero de pesos, o 0. */
export const pesos = (texto) => parseInt(String(texto ?? '').replace(/[^\d]/g, ''), 10) || 0;

export const totalVenta = (lineas = []) => lineas.reduce((t, l) => t + pesos(l.precio) * (Number(l.cantidad) || 0), 0);

export const sumaPagos = (pagos = []) => pagos.reduce((t, p) => t + pesos(p.monto), 0);

/** Lo que falta cubrir con pagos (negativo: sobra). */
export const restante = (lineas, pagos) => totalVenta(lineas) - sumaPagos(pagos);

/** Lo que va al servidor. */
export const paraServidor = ({ clienta, lineas, pagos }) => ({
    clienta,
    prendas: lineas.map(l => ({
        sku_id: l.sku_id, pieza_id: l.pieza_id, cantidad: Number(l.cantidad), precio: pesos(l.precio),
    })),
    pagos: pagos.filter(p => pesos(p.monto) > 0).map(p => ({ monto: pesos(p.monto), medio: p.medio, nota: p.nota || null })),
});

/** Se puede registrar: hay prendas, todas con precio y cantidad válida, y los pagos suman justo el total. */
export const sePuedeVender = (lineas, pagos) =>
    lineas.length > 0
    && lineas.every(l => pesos(l.precio) > 0 && Number(l.cantidad) >= 1 && Number(l.cantidad) <= l.disponible)
    && restante(lineas, pagos) === 0;
