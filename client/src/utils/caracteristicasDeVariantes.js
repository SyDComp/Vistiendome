/**
 * Qué características tiene YA un producto, deducidas de sus variantes.
 *
 * POR QUÉ EXISTE
 * El editor de producto arrancaba con la lista de características vacía, tanto
 * para uno nuevo como para uno que ya existe. Eso hacía imposible en la
 * práctica agregarle una característica a un producto hecho: para sumar
 * "cuello" a un vestido que ya tiene talla y color había que volver a escribir
 * talla y color enteras, con todos sus valores, de memoria. Y si sólo se
 * escribía "cuello", el generador producía únicamente variantes de cuello y el
 * resto desaparecía.
 *
 * Reportado por QA como una pregunta —"¿cómo agrego el cuello a un producto ya
 * hecho?"— y la respuesta honesta era que no se podía.
 *
 * El producto ya sabe qué características tiene: están en la config de cada
 * una de sus variantes. Se leen de ahí en vez de pedirle a nadie que las
 * recuerde.
 */

/**
 * @param {Array} skus  variantes del producto, cada una con su `config`
 * @returns {Array<{name: string, values: string}>}  valores separados por coma,
 *          que es el formato que el formulario ya usa.
 */
export const caracteristicasDe = (skus = []) => {
    // Map conserva el orden de aparición: la primera variante define en qué
    // orden se ven las características, que es el que la clienta ya conoce.
    const porClave = new Map();

    skus.forEach(sku => {
        Object.entries(sku?.config || {}).forEach(([clave, valor]) => {
            if (!porClave.has(clave)) porClave.set(clave, new Set());
            if (valor != null && String(valor).trim() !== '') {
                porClave.get(clave).add(String(valor));
            }
        });
    });

    return [...porClave.entries()].map(([name, valores]) => ({
        name,
        values: [...valores].join(', '),
    }));
};
