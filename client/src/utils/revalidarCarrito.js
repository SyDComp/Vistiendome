/**
 * Poner al día los precios que el carrito guardó.
 *
 * POR QUÉ HACE FALTA
 * El carrito vive en el navegador de la clienta (localStorage) y guarda el
 * precio que la prenda tenía en el momento de agregarla. Ese número no se
 * volvía a mirar nunca. Si la oferta terminaba —o si la clienta volvía a la
 * semana siguiente— seguía cotizando a un precio que ya no existe.
 * Reportado por QA: agregó con oferta puesta, la oferta venció, y el carrito
 * siguió mostrando el precio rebajado.
 *
 * Va aparte del contexto del carrito porque es una decisión pura —dados unos
 * precios, qué cambia— y así se puede probar sin React ni red de por medio.
 */

/**
 * @param {Array} carrito
 * @param {Array} precios  [{sku, price, original_price, on_sale}]
 * @returns {{items: Array, cambios: Array<{nombre, antes, ahora}>}}
 */
export const aplicarPreciosVigentes = (carrito = [], precios = []) => {
    const porSku = new Map(precios.map(p => [String(p.sku), p]));
    const cambios = [];

    const items = carrito.map(item => {
        const vigente = porSku.get(String(item.sku));

        // Sin respuesta para este SKU no se toca nada. Puede ser un producto
        // dado de baja o un problema de red, y en ninguno de los dos casos
        // conviene inventarle un precio ni sacarlo del carrito sin avisar.
        if (!vigente || vigente.price == null) return item;

        if (Number(vigente.price) === Number(item.price)) return item;

        cambios.push({ nombre: item.name, antes: item.price, ahora: vigente.price });
        return {
            ...item,
            price: vigente.price,
            original_price: vigente.original_price,
            on_sale: vigente.on_sale,
        };
    });

    return { items, cambios };
};
