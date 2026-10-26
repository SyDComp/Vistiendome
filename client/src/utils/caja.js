/**
 * La caja: lo que pasa cuando se escanea (o se elige) una prenda. Si ya está
 * en la venta, se suma una; si no queda más libre, se dice y no se suma.
 * Las cuentas (total, pagos) están en utils/ventaLocal.js; la búsqueda, en
 * utils/busquedaCaja.js.
 */
import { lineaDesde } from './ventaLocal';

export const claveDe = (d) => (d.sku_id ? `v-${d.sku_id}` : `p-${d.pieza_id}`);

/** @returns {{lineas: object[], aviso: string|null}} */
export const agregarALaVenta = (lineas, d) => {
    const ya = lineas.find(l => l.clave === claveDe(d));
    if (!ya) return { lineas: [...lineas, lineaDesde(d)], aviso: null };
    const cantidad = Number(ya.cantidad) + 1;
    // Lo libre puede haber cambiado desde que se agregó: vale lo último que dijo el servidor.
    const disponible = Math.max(Number(ya.disponible) || 0, Number(d.disponible) || 0);
    if (cantidad > disponible) {
        return { lineas, aviso: `No quedan más libres de ${d.nombre}: ya van ${ya.cantidad}.` };
    }
    return { lineas: lineas.map(l => (l === ya ? { ...l, cantidad, disponible } : l)), aviso: null };
};
