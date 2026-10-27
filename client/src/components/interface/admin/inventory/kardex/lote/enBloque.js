/**
 * Las reglas del movimiento en bloque, sin pantalla de por medio. El servidor
 * las vuelve a revisar (core/bodega/); aquí sirven para decir qué falta antes
 * de mandar.
 */

/** Lo que impide sumar o restar a todas, o '' si se puede confirmar. */
export const problemaAlSumar = ({ filas, tipo, cantidad, motivo }) => {
    if (!filas.length) return 'Elige al menos una variante.';
    if (!cantidad) return 'Escribe una cantidad mayor que cero.';
    if (tipo === 'merma') {
        const noAlcanzan = filas.filter(f => (f.current_stock ?? 0) < cantidad);
        if (noAlcanzan.length) {
            return `En ${noAlcanzan.length} variante(s) hay menos de ${cantidad}: quedarían bajo cero. Quítalas de la selección o baja la cantidad.`;
        }
    }
    if (!motivo.trim()) return 'Escribe el motivo del movimiento.';
    return '';
};

/** Un número contado: entero de cero para arriba, o null si no es válido. */
export const contadoValido = (texto) => {
    if (texto === '' || texto === null || texto === undefined) return null;
    const n = Number(texto);
    return Number.isInteger(n) && n >= 0 ? n : null;
};

/**
 * Las filas del conteo listas para mandar: cuánto había (esperado) y cuánto se
 * contó. Las que se dejaron en blanco no van: no se contaron.
 */
export const filasDelConteo = (filas, contados) =>
    filas
        .filter(f => contadoValido(contados[f.sku_id]) !== null)
        .map(f => ({ sku_id: f.sku_id, esperado: f.current_stock ?? 0, contado: contadoValido(contados[f.sku_id]) }));

/** Lo que impide confirmar el conteo, o '' si se puede. */
export const problemaAlContar = ({ filas, contados, motivo }) => {
    const malos = filas.filter(f => contados[f.sku_id] !== undefined && contados[f.sku_id] !== '' && contadoValido(contados[f.sku_id]) === null);
    if (malos.length) return `Hay ${malos.length} cantidad(es) que no son un número entero de cero para arriba.`;
    if (!filasDelConteo(filas, contados).length) return 'Escribe lo que contaste en al menos una variante.';
    if (!motivo.trim()) return 'Escribe el motivo del conteo.';
    return '';
};
