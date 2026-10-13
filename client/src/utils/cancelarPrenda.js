/**
 * Qué pasa al cancelar una prenda, dicho antes de hacerlo y para quien atiende
 * la tienda. La regla vive en el servidor (core/pedidos/cancelar.py): lo hecho
 * no se pierde, va a bodega o a Piezas únicas.
 */

/** Las prendas que siguen en pedido (no canceladas). */
export const activas = (items = []) => items.filter(i => !i.cancelada_en);

/** El texto de la confirmación. */
export const avisoCancelarPrenda = (prenda, pedido) => {
    const partes = [];
    if (prenda.pieza_numero) {
        partes.push(`La pieza única N° ${prenda.pieza_numero} vuelve a quedar disponible en Bodega.`);
    } else if (prenda.cortado) {
        partes.push(prenda.sku_id
            ? 'Ya está hecha: entra a bodega y queda disponible para vender.'
            : 'Ya está hecha: queda en Bodega › Piezas únicas para venderla después.');
    } else if (prenda.camino === 'TALLER' && (pedido?.produccion?.ordenes || []).length) {
        partes.push(`Si el taller la está haciendo, cuando la termine irá a ${prenda.sku_id ? 'bodega' : 'Piezas únicas'}.`);
    } else if (prenda.camino === 'BODEGA') {
        partes.push('Lo apartado en bodega queda libre para otros pedidos.');
    }
    partes.push('La cancelación no se deshace: si hace falta, se agrega de nuevo.');
    partes.push(`¿Cancelar ${prenda.cantidad}× ${prenda.sku_name}?`);
    return partes.join(' ');
};
