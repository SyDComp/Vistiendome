/**
 * Qué muestra cada vista del selector de la caja, como opciones con su
 * título, su detalle y si se pueden elegir. No pinta nada: lo pinta
 * caja/selector/OpcionesPaso.jsx.
 */

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

/** Los filtros disponibles: Categoría y las características "Filtro: SÍ", con lo puesto en cada una. */
export const opcionesFiltros = (facetas = []) => facetas.map(f => {
    const puestas = f.opciones.filter(o => o.elegida).map(o => o.etiqueta);
    return { clave: f.clave, titulo: f.nombre, detalle: puestas.length ? puestas.join(' o ') : 'Todas', marcada: puestas.length > 0 };
});

/** Los valores de un filtro: cuántos productos quedan con cada uno; los puestos van marcados. */
export const opcionesGrupo = (faceta) => (faceta?.opciones || []).map(o => ({
    clave: o.valor, titulo: o.etiqueta, detalle: plural(o.productos, 'producto', 'productos'),
    hex: o.hex, imagen: o.imagen, marcada: o.elegida,
}));

/**
 * Las opciones de una característica al elegir la prenda (de utils/selectorPrendas.js#opcionesDe).
 * `puestas`: los valores que ya venían filtrados ("azul" → Azul, Azul Marino): van marcados.
 */
export const opcionesPaso = (opciones = [], puestas = []) => opciones.map(o => ({
    clave: o.valor, titulo: o.valor, detalle: o.libres > 0 ? plural(o.libres, 'libre', 'libres') : 'no queda',
    hex: o.hex, imagen: o.imagen, apagada: o.libres <= 0, marcada: puestas.includes(o.valor),
}));

/** Las piezas únicas libres. */
export const opcionesPiezas = (piezas = []) => piezas.map(p => ({
    clave: p.pieza_id, titulo: p.nombre,
    detalle: [p.codigo, ...Object.values(p.config || {})].filter(Boolean).join(' · '),
}));
