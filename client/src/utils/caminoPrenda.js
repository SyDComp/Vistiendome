/**
 * De dónde sale cada prenda de un pedido: ya existe (bodega) o hay que
 * hacerla (taller). Las dos pasan por el taller: lo de bodega lo va a buscar,
 * lo otro lo confecciona (ver el servidor: core/pedidos/ciclo/tarea.py).
 *
 * Se decide al confirmar. Una prenda por bodega queda apartada, o esperando si
 * no alcanzó; se aparta sola cuando entra stock.
 */

export const CAMINOS = { BODEGA: 'Ya existe: buscar en bodega', TALLER: 'Hay que hacerla: confeccionar' };

/** Dónde está una prenda de un pedido confirmado, dicho corto. Null si no tiene camino. */
export const textoCamino = (prenda) => {
    if (prenda?.camino === 'BODEGA') {
        const buscada = prenda.encontrada ? 'encontrada' : 'por buscar';
        if (prenda.pieza_numero) return `Bodega · pieza única N° ${prenda.pieza_numero} · ${buscada}`;
        return prenda.en_bodega === 'ESPERANDO' ? 'Bodega · esperando que llegue' : `Bodega · apartada, ${buscada}`;
    }
    if (prenda?.camino === 'TALLER') return prenda.cortado ? 'Taller · hecha' : 'Taller';
    return null;
};

/** Una prenda que espera bodega se marca distinto: el pedido no puede salir. */
export const esperaBodega = (prenda) => prenda?.camino === 'BODEGA' && prenda.en_bodega === 'ESPERANDO';

/** Qué pasa con una prenda de la propuesta si se confirma así. */
export const textoQueda = (p) => {
    if (p.pieza_numero) return `Pieza única N° ${p.pieza_numero}: ya está apartada para este pedido`;
    if (p.camino === 'BODEGA') {
        return p.queda === 'APARTADA'
            ? `Se aparta y el taller la busca en bodega (libres: ${p.disponible})`
            : 'Queda esperando que llegue a bodega';
    }
    if (p.camino === 'TALLER') return 'Se confecciona en el taller';
    return 'Elige de dónde sale';
};

/** Las prendas que la persona ve "esperando": el servidor comprueba que siga siendo así. */
export const esperandoVistas = (prendas) => prendas.filter(p => p.queda === 'ESPERANDO').map(p => p.item_id);

/** ¿Hay prendas que se confirman distinto de lo habitual? Entonces la nota es obligatoria. */
export const pideNota = (prendas) => prendas.some(p => p.requiere_nota);

/**
 * Se puede apretar "Confirmar": no falta nada, y si hace falta nota, está
 * escrita. Hace falta si hay prendas contra lo habitual o si falta abono.
 */
export const sePuedeConfirmar = ({ prendas = [], problemas = [], abono = null }, nota = '') => {
    const necesitaNota = pideNota(prendas) || (abono?.falta || 0) > 0;
    return prendas.length > 0 && problemas.length === 0 && (!necesitaNota || nota.trim().length > 0);
};
