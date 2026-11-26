/**
 * Los botones de "Acciones Rápidas" de Producción.
 *
 * Antes salían de la biblioteca entera: los 21 colores aunque el producto
 * tuviera uno, y tocar uno que no tenía no elegía nada y no decía nada
 * (reporte de QA 2026-11-25: "en el vestido perla no aparece la barra"). Ahora
 * son solo las características y opciones que tienen las variantes de ESTE
 * producto, con cuántas variantes hay de cada una, en el orden de la biblioteca.
 */

const _valor = (opcion) => (typeof opcion === 'string' ? opcion : opcion?.value);

/** ¿La variante tiene todo lo elegido? Dentro de una característica basta una opción; entre características, todas. */
export const cumpleFiltros = (config, filtros) =>
    Object.entries(filtros).every(([nombre, valores]) => !valores?.size || valores.has(config?.[nombre]));

export const hayFiltros = (filtros) => Object.values(filtros).some(v => v?.size > 0);

export const opcionesDelProducto = (variantes, biblioteca = []) => {
    const conteo = new Map();
    for (const v of variantes) {
        for (const [nombre, valor] of Object.entries(v.config || {})) {
            if (valor === undefined || valor === null || valor === '') continue;
            if (!conteo.has(nombre)) conteo.set(nombre, new Map());
            const porValor = conteo.get(nombre);
            porValor.set(valor, (porValor.get(valor) || 0) + 1);
        }
    }

    const ordenCaracteristica = new Map(biblioteca.map((c, i) => [c.name, i]));
    const ordenOpcion = new Map(biblioteca.map(c => [c.name, new Map((c.domain || []).map((o, i) => [_valor(o), i]))]));
    const porOrden = (orden, a, b) => ((orden?.get(a) ?? Infinity) - (orden?.get(b) ?? Infinity)) || String(a).localeCompare(String(b));

    return [...conteo.entries()]
        .sort(([a], [b]) => porOrden(ordenCaracteristica, a, b))
        .map(([name, porValor]) => ({
            name,
            values: [...porValor.entries()]
                .sort(([a], [b]) => porOrden(ordenOpcion.get(name), a, b))
                .map(([valor, cantidad]) => ({ valor, cantidad })),
        }));
};

/** "Rojo Italiano y XS": lo elegido, para decir que ninguna variante lo tiene. */
export const describirFiltros = (filtros) =>
    Object.values(filtros)
        .filter(v => v?.size)
        .map(v => [...v].join(' o '))
        .join(' y ');
