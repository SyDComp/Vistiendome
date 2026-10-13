/**
 * El aviso al sacar un pedido de "Confirmada" (volver a conversar, o
 * cancelarlo), dicho para quien atiende la tienda y no para un programador.
 *
 * Nada se pierde: lo hecho en el taller sigue marcado en sus prendas. Lo que
 * cambia es que lo apartado en bodega queda libre para otros pedidos, y que al
 * confirmar de nuevo se vuelve a decidir de dónde sale cada prenda.
 */

const VUELVE = ['NUEVA', 'EN_CONVERSACION'];

const prendas = (n) => (n === 1 ? '1 prenda' : `${n} prendas`);

/** El texto para confirmar el cambio, o null si el cambio no sale de "Confirmada". */
export const avisoVolverAtras = (pedido, destino) => {
    if (pedido?.estado !== 'CONFIRMADA') return null;
    const cancela = destino === 'CANCELADA';
    if (!cancela && !VUELVE.includes(destino)) return null;

    const items = pedido.items || [];
    const hechas = items.filter(i => i.cortado).length;
    const apartadas = items.filter(i => i.camino === 'BODEGA').length;
    const ordenes = (pedido.produccion?.ordenes || []).map(o => o.numero);

    const partes = [];
    if (hechas) partes.push(`Este pedido ya tiene ${hechas} de ${prendas(items.length)} hechas en el taller.`);
    if (ordenes.length) {
        partes.push(`Está en ${ordenes.length === 1 ? 'la orden' : 'las órdenes'} de corte N° ${ordenes.join(', ')}.`);
    }
    if (apartadas) {
        partes.push(`Lo apartado en bodega (${prendas(apartadas)}) queda libre para otros pedidos.`);
    }
    if (hechas) partes.push('Lo ya hecho no se pierde: sigue guardado para este pedido.');
    if (!cancela) partes.push('Al confirmar de nuevo se vuelve a decidir de dónde sale cada prenda.');
    partes.push(cancela ? '¿Cancelar el pedido?' : '¿Volver atrás?');
    return partes.join(' ');
};
