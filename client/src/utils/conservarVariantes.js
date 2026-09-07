/**
 * Conservar lo ya cargado cuando se regeneran las variantes de un producto.
 *
 * POR QUE EXISTE
 * El formulario arma las variantes pidiendole al servidor todas las
 * combinaciones de las caracteristicas elegidas. Ese endpoint devuelve cada
 * combinacion con `price: 0` y `stock: 0` —no puede saber otra cosa— y el
 * formulario reemplazaba la lista entera con esa respuesta.
 *
 * En un producto nuevo eso esta bien. En uno que YA existe es una perdida de
 * trabajo: agregar una caracteristica a un vestido de 100 variantes tarifadas
 * devolvia las 100 a $0. Reproducido: 4 variantes a $10.000, se agrega CUELLO,
 * quedan 8 a $0.
 *
 * QUE HEREDA Y QUE NO
 *   precio  SI. Agregar "cuello" no cambia cuanto vale la prenda. La
 *           combinacion nueva toma el precio de la variante de la que sale:
 *           la que coincide en todas las caracteristicas que ambas comparten.
 *   stock   NO, salvo que la variante sea exactamente la misma de antes.
 *           Si "XS Negro" tenia 5 unidades y ahora se divide en "XS Negro En V"
 *           y "XS Negro Redondo", no hay forma de saber cuantas son de cada
 *           una. Copiarlo a las dos inventaria 5 unidades que no existen, y el
 *           inventario dejaria de describir lo que hay en el taller.
 */

const mismaConfig = (a = {}, b = {}) => {
    const claves = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of claves) if (a[k] !== b[k]) return false;
    return true;
};

/** ¿`nueva` es una subdivision de `vieja`? Coinciden en todo lo que comparten. */
const salenDeLaMisma = (nueva = {}, vieja = {}) => {
    const comunes = Object.keys(vieja).filter(k => k in nueva);
    if (!comunes.length) return false;
    return comunes.every(k => nueva[k] === vieja[k]);
};

/**
 * @param {Array} combinaciones  lo que devolvio generate-variants (precio 0)
 * @param {Array} existentes     las variantes que el producto ya tenia
 * @returns {{variantes: Array, heredadas: number, nuevas: number}}
 */
export const conservarDatosCargados = (combinaciones = [], existentes = []) => {
    if (!existentes.length) {
        return { variantes: combinaciones, heredadas: 0, nuevas: combinaciones.length };
    }

    let heredadas = 0;
    let nuevas = 0;

    const variantes = combinaciones.map(combo => {
        const exacta = existentes.find(v => mismaConfig(v.config, combo.config));
        if (exacta) {
            heredadas++;
            // Es la misma variante de siempre: se queda tal cual estaba, con su
            // precio, su stock, sus fotos y su oferta.
            return { ...combo, ...exacta, sku: exacta.sku || combo.sku, config: combo.config };
        }

        const origen = existentes.find(v => salenDeLaMisma(combo.config, v.config));
        if (origen) {
            heredadas++;
            return {
                ...combo,
                price: origen.price ?? combo.price,
                media_ids: origen.media_ids || (origen.media_assets?.map(a => a.id)) || [],
                media_assets: origen.media_assets || [],
                stock: 0,
            };
        }

        nuevas++;
        return combo;
    });

    return { variantes, heredadas, nuevas };
};
