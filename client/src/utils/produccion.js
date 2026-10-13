/**
 * En qué va un pedido confirmado, dicho en una línea.
 *
 * Es **derivado**: lo calcula el servidor (core/pedidos/ciclo/listo.py) de las
 * prendas hechas en el taller y de lo apartado en bodega. Nadie lo declara, y
 * por eso no puede quedar en desacuerdo con la realidad — que es la razón por
 * la que el pedido no tiene un estado "en corte".
 *
 * Sólo tiene sentido a partir de CONFIRMADA: antes de que la clienta acepte no
 * hay nada que preparar.
 */

const SIN_PRODUCCION = { texto: null, tono: 'neutro', ordenes: [] };

/** "Listo para despachar" o, en un retiro, "Listo para retirar". */
export const textoListo = (modoEntrega) => (modoEntrega === 'RETIRO' ? 'Listo para retirar' : 'Listo para despachar');

export const estadoDeProduccion = (cotizacion) => {
    const estado = cotizacion?.estado;
    if (estado !== 'CONFIRMADA' && estado !== 'DESPACHADA') return SIN_PRODUCCION;

    const { taller = 0, hechas = 0, esperando = 0, listo = false, ordenes = [] } = cotizacion.produccion || {};

    if (estado === 'DESPACHADA') {
        return taller ? { texto: 'Hecho', tono: 'listo', ordenes } : SIN_PRODUCCION;
    }
    if (listo) return { texto: textoListo(cotizacion.modo_entrega), tono: 'listo', ordenes };

    // Las órdenes no se meten en el texto: la pantalla las pinta como enlaces
    // para poder saltar a ellas, y una cadena armada acá no se puede enlazar.
    const partes = [];
    if (taller && hechas < taller) {
        if (hechas) partes.push(`${hechas} de ${taller} hechas`);
        else partes.push(ordenes.length ? 'Por hacer en el taller' : 'Por hacer · sin orden todavía');
    }
    if (esperando) partes.push(esperando === 1 ? '1 esperando bodega' : `${esperando} esperando bodega`);
    if (!partes.length) return SIN_PRODUCCION;
    return { texto: partes.join(' · '), tono: hechas ? 'proceso' : 'espera', ordenes };
};

export const TONOS = {
    neutro:  { color: '#94a3b8', bg: 'transparent' },
    espera:  { color: '#b45309', bg: '#fef3c7' },
    proceso: { color: '#1d4ed8', bg: '#eff6ff' },
    listo:   { color: '#15803d', bg: '#dcfce7' },
};
