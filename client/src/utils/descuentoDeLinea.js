import { enOferta } from './oferta';

/**
 * Por qué una línea del carrito cuesta menos que su precio normal, y cuánto
 * costaba sin eso. El taller lo necesita en el pedido para saber qué precio
 * prometió el sitio y por qué.
 *
 * Los dos motivos se pueden sumar: el precio por cantidad (mayorista,
 * iglesia...) se calcula sobre el de oferta.
 *
 * @param {object} item  línea del carrito ya con su tramo resuelto
 * @returns {{motivos: string[], antes: number} | null}  null si paga el precio normal
 */
export const descuentoDeLinea = (item) => {
    const oferta = enOferta(item);
    const motivos = [];
    if (oferta) motivos.push('Oferta del producto');
    if (item?.tramoAplicado) motivos.push(`Precio ${item.tramoAplicado}`);
    if (!motivos.length) return null;
    return { motivos, antes: Number(oferta ? item.original_price : item.price) };
};
