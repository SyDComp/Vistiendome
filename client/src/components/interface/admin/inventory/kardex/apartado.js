/**
 * Lo apartado para pedidos confirmados y lo que queda libre, dicho para la
 * tienda. Lo calcula el servidor (core/pedidos/ciclo/apartado.py).
 */

/** Lo libre de una variante. Negativo: faltan, hay pedidos esperando. */
export const textoDisponible = (disponible) => (
    disponible < 0
        ? { texto: `Faltan ${-disponible}`, tono: 'empty' }
        : { texto: String(disponible), tono: disponible === 0 ? 'empty' : disponible < 5 ? 'low' : 'good' }
);

/** Cómo se dice el estado de una prenda apartada. */
export const textoApartado = (estado) => (estado === 'ESPERANDO' ? 'Esperando que llegue' : 'Apartada');
