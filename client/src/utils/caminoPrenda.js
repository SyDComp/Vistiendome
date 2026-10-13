/**
 * De dónde sale cada prenda de un pedido: de la bodega o del taller.
 *
 * Se decide al confirmar (ver el servidor: core/pedidos/ciclo/). Una prenda
 * por bodega queda apartada, o esperando si no alcanzó; se aparta sola cuando
 * entra stock.
 */

export const CAMINOS = { BODEGA: 'Bodega', TALLER: 'Taller' };

/** Dónde está una prenda de un pedido confirmado, dicho corto. Null si no tiene camino. */
export const textoCamino = (prenda) => {
    if (prenda?.camino === 'BODEGA') {
        if (prenda.pieza_numero) return `Bodega · pieza única N° ${prenda.pieza_numero}`;
        return prenda.en_bodega === 'ESPERANDO' ? 'Bodega · esperando que llegue' : 'Bodega · apartada';
    }
    if (prenda?.camino === 'TALLER') return prenda.cortado ? 'Taller · hecha' : 'Taller';
    return null;
};

/** Una prenda que espera bodega se marca distinto: el pedido no puede salir. */
export const esperaBodega = (prenda) => prenda?.camino === 'BODEGA' && prenda.en_bodega === 'ESPERANDO';

/** Qué pasa con una prenda de la propuesta si se confirma así. */
export const textoQueda = (p) => {
    if (p.camino === 'BODEGA') {
        return p.queda === 'APARTADA'
            ? `Se aparta de bodega (libres: ${p.disponible})`
            : 'Queda esperando que llegue a bodega';
    }
    if (p.camino === 'TALLER') return 'Se confecciona en el taller';
    return 'Elige de dónde sale';
};

/** Las prendas que la persona ve "esperando": el servidor comprueba que siga siendo así. */
export const esperandoVistas = (prendas) => prendas.filter(p => p.queda === 'ESPERANDO').map(p => p.item_id);

/** ¿Hay prendas que se confirman distinto de lo habitual? Entonces la nota es obligatoria. */
export const pideNota = (prendas) => prendas.some(p => p.requiere_nota);

/** Se puede apretar "Confirmar": no falta nada, y si hace falta nota, está escrita. */
export const sePuedeConfirmar = ({ prendas = [], problemas = [] }, nota = '') =>
    prendas.length > 0 && problemas.length === 0 && (!pideNota(prendas) || nota.trim().length > 0);
