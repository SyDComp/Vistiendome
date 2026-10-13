/**
 * El stock de una variante viaja al guardar un producto SOLO si alguien lo
 * tocó en esta pantalla, o si la variante es nueva (es su stock inicial).
 *
 * POR QUE
 * Al recibir un stock, el servidor ajusta el saldo a ese número. El formulario
 * tiene el que leyó al abrirse: si entre medio se despachó algo, guardar
 * "devolvía" la venta con un ajuste. Sin stock (null), el servidor no lo toca.
 *
 * Después de guardar, nada queda "editado" ni "nuevo": el formulario sigue
 * abierto, y guardar otra vez no debe volver a mandar lo mismo.
 */

/** La variante con su stock cambiado a mano: queda marcada si de verdad cambió. */
export const conStockEditado = (variante, stock) => ({
    ...variante,
    stock,
    stockEditado: Boolean(variante.stockEditado) || Number(stock) !== Number(variante.stock),
});

/** Lo que se manda de una variante: sin las marcas, y con stock solo si corresponde. */
export const paraGuardar = ({ stockEditado, guardada, ...variante }) => ({
    ...variante,
    stock: stockEditado || (variante.id == null && !guardada) ? variante.stock : null,
});

/** Tras un guardado bueno: nada editado, todas guardadas. */
export const trasGuardar = (variantes = []) =>
    variantes.map(v => ({ ...v, stockEditado: false, guardada: true }));
