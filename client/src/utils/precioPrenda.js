/**
 * Cómo se dice el precio de una prenda: por cotizar, sin costo o un monto.
 *
 * Nunca "$0". Antes una prenda sin precio salía como "$0" en el panel, en la
 * planilla, en el comprobante de la clienta y en WhatsApp: parecía un regalo
 * o un error. Ahora el servidor guarda tres estados distintos (null, 0 elegido,
 * monto) y acá se nombra cada uno, en un solo lugar para que todas las
 * pantallas digan lo mismo.
 */
import { formatCurrency } from './cartUtils';

export const POR_COTIZAR = 'Por cotizar';
export const SIN_COSTO = 'Sin costo';

/** 'por_cotizar' | 'sin_costo' | 'monto' */
export const estadoPrecio = (precio) => {
    if (precio === null || precio === undefined) return 'por_cotizar';
    return Number(precio) === 0 ? 'sin_costo' : 'monto';
};

export const textoPrecio = (precio) => {
    const estado = estadoPrecio(precio);
    if (estado === 'por_cotizar') return POR_COTIZAR;
    if (estado === 'sin_costo') return SIN_COSTO;
    return formatCurrency(precio);
};

/** Lo de una línea: precio × cantidad, o el estado si no hay monto. */
export const textoSubtotal = ({ precio_unitario_estimado: precio, cantidad = 1 }) =>
    estadoPrecio(precio) === 'monto' ? formatCurrency(precio * cantidad) : textoPrecio(precio);

/** Cuánto suman las prendas con monto, y cuántas líneas están por cotizar o sin costo. */
export const resumirPrecios = (items = []) => items.reduce((r, it) => {
    const estado = estadoPrecio(it.precio_unitario_estimado);
    if (estado === 'monto') r.monto += it.precio_unitario_estimado * (it.cantidad || 1);
    else if (estado === 'sin_costo') r.sinCosto += 1;
    else r.porCotizar += 1;
    return r;
}, { monto: 0, porCotizar: 0, sinCosto: 0 });

/**
 * El total, dicho entero: "$35.980 + 1 por cotizar + 1 sin costo".
 * Si nada tiene monto, se dice lo que hay, sin inventar un "$0".
 */
export const textoTotal = (items = []) => {
    const { monto, porCotizar, sinCosto } = resumirPrecios(items);
    const partes = [];
    if (monto > 0) partes.push(formatCurrency(monto));
    if (porCotizar) partes.push(`${porCotizar} por cotizar`);
    if (sinCosto) partes.push(`${sinCosto} sin costo`);
    if (!partes.length) return POR_COTIZAR;
    if (!monto && porCotizar && !sinCosto) return POR_COTIZAR;
    if (!monto && sinCosto && !porCotizar) return SIN_COSTO;
    return partes.join(' + ');
};

/*
 * Para editar: lo que se elige en pantalla ({tipo, monto}) y lo que se manda
 * al servidor. `monto` es texto mientras se escribe.
 */

/** Desde lo guardado, a lo que se muestra en el control. */
export const valorDesde = (precio) => {
    const tipo = estadoPrecio(precio);
    return { tipo, monto: tipo === 'monto' ? String(precio) : '' };
};

/** Un monto tiene que ser un número mayor que cero; los otros dos estados siempre valen. */
export const esValido = ({ tipo, monto }) => tipo !== 'monto' || Number(monto) > 0;

/** Lo que se manda al servidor: {precio, sin_costo}. */
export const paraServidor = ({ tipo, monto }) => ({
    precio: tipo === 'monto' && Number(monto) > 0 ? Number(monto) : null,
    sin_costo: tipo === 'sin_costo',
});

/** El precio que representa lo elegido, como lo guarda el servidor (null, 0 o monto). */
export const precioDeValor = ({ tipo, monto }) => {
    if (tipo === 'sin_costo') return 0;
    return tipo === 'monto' && Number(monto) > 0 ? Number(monto) : null;
};
