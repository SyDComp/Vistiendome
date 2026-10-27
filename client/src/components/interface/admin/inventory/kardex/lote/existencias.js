/**
 * Filtrar y ordenar la bodega por existencias, sin pantalla de por medio.
 *
 * Los filtros miran "disponible" (en bodega menos lo apartado): lo que se
 * puede vender (decisión del usuario 2026-10-27).
 */

export const FILTROS_EXISTENCIA = {
    todas: 'Todas',
    sin: 'Sin stock',
    con: 'Con stock',
    hasta: 'Hasta…',
};

/** El número escrito para "Hasta N": un entero de cero para arriba, o null. */
export const umbralValido = (texto) => {
    if (texto === '' || texto === null || texto === undefined) return null;
    const n = Number(texto);
    return Number.isInteger(n) && n >= 0 ? n : null;
};

/**
 * Si la fila pasa el filtro. "Sin stock" incluye las negativas: hay pedidos
 * esperando prendas que no están. "Hasta N" sin un número válido no filtra.
 */
export const cumpleExistencia = (fila, filtro, umbral) => {
    const d = fila.disponible ?? 0;
    if (filtro === 'sin') return d <= 0;
    if (filtro === 'con') return d > 0;
    if (filtro === 'hasta') return umbral === null || d <= umbral;
    return true;
};

/** Las columnas que se pueden ordenar. */
export const COLUMNAS_ORDENABLES = ['current_stock', 'apartado', 'disponible'];

/**
 * Las filas ordenadas por una columna; sin columna, como vinieron. Copia: no
 * reordena el arreglo de quien llama. A igual valor, por SKU, para que el
 * orden no baile entre recargas.
 */
export const ordenar = (filas, orden) => {
    if (!orden?.columna) return filas;
    const signo = orden.sentido === 'desc' ? -1 : 1;
    return [...filas].sort((a, b) =>
        signo * ((a[orden.columna] ?? 0) - (b[orden.columna] ?? 0)) || String(a.sku).localeCompare(String(b.sku))
    );
};

/** El siguiente orden al tocar el encabezado: ascendente, descendente, sin orden. */
export const siguienteOrden = (orden, columna) => {
    if (orden?.columna !== columna) return { columna, sentido: 'asc' };
    if (orden.sentido === 'asc') return { columna, sentido: 'desc' };
    return null;
};
