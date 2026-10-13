/**
 * Cómo se dicen las piezas únicas en Bodega. La regla vive en el servidor
 * (core/piezas/).
 */

export const ESTADOS_PIEZA = {
    DISPONIBLE: { texto: 'Disponible', tono: 'good' },
    APARTADA: { texto: 'Apartada', tono: 'low' },
    VENDIDA: { texto: 'Vendida', tono: 'neutro' },
    BAJA: { texto: 'Dada de baja', tono: 'empty' },
};

/** Sus características en una línea: "M / Uva / Cuello V (propuesto)". */
export const detallePieza = (pieza) => {
    const propuestas = pieza.config_propuesta || {};
    const partes = Object.entries(pieza.config || {})
        .filter(([, v]) => v)
        .map(([k, v]) => (propuestas[k] ? `${v} (propuesto)` : v));
    Object.entries(propuestas).forEach(([k, v]) => {
        if (!(k in (pieza.config || {}))) partes.push(`${v} (propuesto)`);
    });
    return partes.join(' / ');
};

/** Dónde está o de dónde vino. */
export const dondePieza = (pieza) => {
    if (pieza.estado === 'APARTADA' && pieza.pedido_numero) return `Apartada para el pedido N° ${pieza.pedido_numero}`;
    if (pieza.estado === 'VENDIDA' && pieza.pedido_numero) return `Salió con el pedido N° ${pieza.pedido_numero}`;
    if (pieza.estado === 'BAJA') return pieza.nota ? `Baja: ${pieza.nota}` : 'Dada de baja';
    return pieza.origen_pedido_numero ? `Hecha para el pedido N° ${pieza.origen_pedido_numero}, que se canceló` : null;
};
