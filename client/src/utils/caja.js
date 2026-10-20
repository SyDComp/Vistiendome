/**
 * La caja: lo que pasa cuando se escanea (o se elige) una prenda. Si ya está
 * en la venta, se suma una; si no queda más libre, se dice y no se suma.
 * Las cuentas (total, pagos) son las de la venta en el local: utils/ventaLocal.js.
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

/** "Cinturón M Negro CIN-M 7800000000017": lo que se busca escribiendo. */
const textoDe = (d) => [d.nombre, d.codigo, d.barcode, ...Object.values(d.config || {})].join(' ').toLowerCase();

/** Lo disponible que calza con lo escrito (todas las palabras), hasta `cuantos`. */
export const buscarDisponible = (disponibles, texto, cuantos = 8) => {
    const palabras = texto.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!palabras.length) return [];
    return disponibles.filter(d => palabras.every(p => textoDe(d).includes(p))).slice(0, cuantos);
};
