/**
 * En qué va la confección de un pedido, dicho en una línea.
 *
 * Es **derivado**: sale de contar las piezas cortadas, que las marca la orden
 * de corte al finalizar. Nadie lo declara, y por eso no puede quedar en
 * desacuerdo con la realidad — que es la razón por la que el pedido no tiene un
 * estado "en corte".
 *
 * Sólo tiene sentido a partir de CONFIRMADA: antes de que la clienta acepte no
 * hay nada que cortar, y mostrar "0 de 3 cortadas" en un pedido que quizás no
 * se concrete es ruido.
 */

const SIN_PRODUCCION = { texto: null, tono: 'neutro', ordenes: [] };

export const estadoDeProduccion = (cotizacion) => {
    const estado = cotizacion?.estado;
    if (estado !== 'CONFIRMADA' && estado !== 'DESPACHADA') return SIN_PRODUCCION;

    const { piezas = 0, cortadas = 0, ordenes = [] } = cotizacion.produccion || {};

    // Un pedido de ítems escritos a mano no tiene nada cortable: decir
    // "0 de 0 cortadas" sería inventar un problema que no existe.
    if (!piezas) return SIN_PRODUCCION;

    // Las órdenes no se meten en el texto: la pantalla las pinta como enlaces
    // para poder saltar a ellas, y una cadena armada acá no se puede enlazar.
    if (cortadas === 0) {
        return ordenes.length
            ? { texto: 'Por cortar', tono: 'espera', ordenes }
            : { texto: 'Por cortar · sin orden todavía', tono: 'espera', ordenes };
    }
    if (cortadas < piezas) {
        return { texto: `${cortadas} de ${piezas} cortadas`, tono: 'proceso', ordenes };
    }
    return {
        texto: estado === 'DESPACHADA' ? 'Cortada' : 'Lista para despachar',
        tono: 'listo',
        ordenes,
    };
};

export const TONOS = {
    neutro:  { color: '#94a3b8', bg: 'transparent' },
    espera:  { color: '#b45309', bg: '#fef3c7' },
    proceso: { color: '#1d4ed8', bg: '#eff6ff' },
    listo:   { color: '#15803d', bg: '#dcfce7' },
};
