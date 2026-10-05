/**
 * El nombre que corresponde a un pedido: el que la persona escribió en ESE
 * pedido. El RUT identifica a la persona, pero el nombre guardado con el RUT
 * puede ser el de un pedido anterior; si se muestra ése, la etiqueta, la lista
 * y el pedido hablan de nombres distintos.
 *
 * @param {object} cotizacion  con `nombre_contacto` cuando el pedido lo trae
 * @param {object} [persona]   { nombres, apellidos }, el respaldo
 * @returns {string}  vacío si no hay ninguno
 */
export const nombreDelPedido = (cotizacion, persona) => {
    const propio = cotizacion?.nombre_contacto?.trim();
    if (propio) return propio;
    return [persona?.nombres, persona?.apellidos].filter(Boolean).join(' ').trim();
};
