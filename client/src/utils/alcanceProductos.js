/**
 * ¿Una regla de precio (promoción, tramo por cantidad) aplica a este producto?
 *
 * Cada regla guarda en `productos` los ids elegidos en Ajustes. Lista vacía =
 * todo el catálogo: así las reglas creadas antes de poder elegir productos
 * siguen aplicando a todo, como hasta ahora.
 */
export const aplicaAlProducto = (productos, productId) => {
    const ids = productos || [];
    if (!ids.length) return true;
    return ids.map(String).includes(String(productId));
};
