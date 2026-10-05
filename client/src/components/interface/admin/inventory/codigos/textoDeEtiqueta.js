import { ordenarCaracteristicas } from '../../../../../utils/prendas';

const esTalla = (clave) => String(clave).trim().toLowerCase() === 'talla';

/**
 * Qué dice la etiqueta de código de barras de una variante.
 *
 * La talla va aparte y destacada: es lo que se busca en el estante. El resto
 * de las características sigue el mismo orden que en todo el sistema, para
 * que el color esté siempre en el mismo lugar.
 *
 * @param {{productName: string, sku: string, config: object}} etiqueta
 * @returns {{talla: string|null, descripcion: string}}
 */
export const textoDeEtiqueta = ({ productName, sku, config = {} }) => {
    const claves = Object.keys(config).filter(clave => config[clave]);
    const claveTalla = claves.find(esTalla);
    const resto = ordenarCaracteristicas(claves.filter(clave => clave !== claveTalla))
        .map(clave => config[clave]);
    const nombre = productName || sku;
    return {
        talla: claveTalla ? String(config[claveTalla]) : null,
        descripcion: resto.length ? `${nombre} – ${resto.join(' / ')}` : nombre,
    };
};
