/**
 * La fecha comprometida de un pedido, dicha para la tienda: "lun 20 oct", y si
 * está atrasada o vence pronto. La regla de cómo se propone vive en el
 * servidor (core/pedidos/fecha.py).
 */

// "Vence pronto": faltan esta cantidad de días o menos.
export const DIAS_PRONTO = 2;

const FORMATO = new Intl.DateTimeFormat('es-CL', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

/** "AAAA-MM-DD" → Date a medianoche UTC: una fecha de calendario no tiene zona. */
const comoFecha = (iso) => new Date(`${iso}T00:00:00Z`);

/** Hoy como "AAAA-MM-DD", en la hora del navegador (la tienda está en Chile). */
export const hoyIso = (ahora = new Date()) => {
    const dos = (n) => String(n).padStart(2, '0');
    return `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}`;
};

/** "lun 20 oct". */
export const textoFecha = (iso) => (iso ? FORMATO.format(comoFecha(iso)).replace(/\./g, '') : '');

/** Días de calendario de `desde` a `hasta` (negativo si ya pasó). */
export const diasHasta = (hasta, desde) => Math.round((comoFecha(hasta) - comoFecha(desde)) / 86400000);

/**
 * Cómo se muestra la fecha de un pedido en la lista o en su detalle.
 * Solo se colorea mientras el pedido está confirmado: uno que ya salió cumplió
 * (o no), y uno sin confirmar todavía no prometió nada.
 */
export const estadoFecha = (pedido, hoy = hoyIso()) => {
    if (!['CONFIRMADA', 'DESPACHADA'].includes(pedido?.estado)) return null;
    const fecha = pedido.fecha_comprometida;
    if (!fecha) return { texto: 'Sin fecha', tono: 'sin' };
    const texto = textoFecha(fecha);
    if (pedido.estado !== 'CONFIRMADA') return { texto, tono: 'normal' };
    const faltan = diasHasta(fecha, hoy);
    if (faltan < 0) return { texto, tono: 'atrasado', detalle: faltan === -1 ? 'Atrasado 1 día' : `Atrasado ${-faltan} días` };
    if (faltan <= DIAS_PRONTO) {
        return { texto, tono: 'pronto', detalle: faltan === 0 ? 'Es hoy' : faltan === 1 ? 'Mañana' : `En ${faltan} días` };
    }
    return { texto, tono: 'normal' };
};

/** "15 días hábiles (algo va al taller)". */
export const textoPlazo = (dias, por) =>
    `${dias} ${dias === 1 ? 'día hábil' : 'días hábiles'} (${por === 'taller' ? 'algo va al taller' : 'todo sale de bodega'})`;
