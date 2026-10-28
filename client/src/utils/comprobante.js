/**
 * Qué dice el comprobante de una venta: la tienda, el número, las prendas, el
 * total, cómo se pagó y la política de cambios. No pinta nada: lo imprime
 * caja/comprobante/imprimirComprobante.js en papel de 58 mm.
 *
 * Es un comprobante para la clienta, no una boleta (decisión del usuario
 * 2026-10-20): una sola copia, y lo dice arriba.
 *
 * La política de cambios es la que el pedido guardó al entregarse, no la de
 * hoy: un comprobante reimpreso dice lo que se le prometió a esa clienta. Lo
 * entregado antes de que existiera ese dato no la trae, y no se inventa.
 */
import { nombreDeProducto } from './prendas';
import { frasesPolitica, sinCambio } from './politicaCambios';
import { desdeServidor } from './fechaServidor';

const EFECTIVO = 'Efectivo';

const activa = (item) => !item.cancelada_en;

const lineaDe = (item, politica) => {
    const precio = Math.round(Number(item.precio_unitario_estimado) || 0);
    return {
        nombre: nombreDeProducto(item),
        detalle: [
            item.pieza_numero ? `Pieza única N° ${item.pieza_numero}` : null,
            ...Object.values(item.config || {}).filter(Boolean),
        ].filter(Boolean).join(' / '),
        cantidad: item.cantidad,
        precio,
        subtotal: precio * item.cantidad,
        sinCambio: sinCambio(politica, item),
    };
};

/** Los movimientos de plata que valen, del más viejo al más nuevo. */
const movimientos = (pagos = []) => [...pagos]
    .filter(p => !p.anulado_en)
    .sort((a, b) => String(a.registrado_en).localeCompare(String(b.registrado_en)));

/**
 * @param {object} p
 * @param {object} p.pedido     como lo lee el panel (items, numero, created_at, politica_cambios)
 * @param {object[]} p.pagos    los del libro del pedido (verPagos().pagos)
 * @param {{nombre: string, direccion?: string, telefono?: string}} p.tienda
 * @param {number} [p.recibido] el efectivo que entregó la clienta, para el vuelto (solo al vender)
 * @param {Date|null} [p.reimpreso] si es una copia (no la que salió al vender), cuándo se imprimió
 */
export const armarComprobante = ({ pedido, pagos, tienda, recibido = 0, reimpreso = null }) => {
    const politica = pedido.politica_cambios || null;
    const lineas = (pedido.items || []).filter(activa).map(i => lineaDe(i, politica));
    const total = lineas.reduce((t, l) => t + l.subtotal, 0);
    const libro = movimientos(pagos);
    const pagado = libro.filter(p => p.tipo === 'PAGO');
    const efectivo = pagado.filter(p => p.medio === EFECTIVO).reduce((t, p) => t + p.monto, 0);
    return {
        tienda,
        numero: pedido.numero,
        fecha: desdeServidor(pedido.created_at),
        reimpreso,
        lineas,
        total,
        pagos: pagado.map(p => ({ medio: p.medio, monto: p.monto })),
        devoluciones: libro.filter(p => p.tipo !== 'PAGO')
            .map(p => ({ texto: p.tipo === 'DEVOLUCION' ? `Devuelto (${p.medio})` : 'Queda a favor', monto: p.monto })),
        vuelto: recibido > efectivo && efectivo > 0 ? { recibido, vuelto: recibido - efectivo } : null,
        politica: politica ? frasesPolitica(politica) : [],
    };
};
