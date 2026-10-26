/**
 * El selector visual de la caja: se elige el producto y después una
 * característica a la vez, hasta que queda una sola variante. No pinta nada:
 * lo pinta caja/selector/.
 *
 * - Los pasos siguen el orden de la tienda (Características).
 * - Una característica con una sola opción entre lo que queda no se pregunta:
 *   se elige sola.
 * - Cada opción dice cuántas quedan libres con lo ya elegido. Las que no
 *   tienen se muestran apagadas, no se esconden: así se sabe que no hay.
 * - Las opciones van en el orden de la característica, y traen su color (hex)
 *   o su imagen (estampados) si los tienen.
 */
import { ordenarCaracteristicas } from './prendas';

const valorDe = (config, caracteristica) => {
    const clave = Object.keys(config || {}).find(k => k.toUpperCase() === caracteristica.toUpperCase());
    return clave ? config[clave] : undefined;
};

const calzaCon = (variante, elegidas) =>
    Object.entries(elegidas).every(([c, v]) => valorDe(variante.config, c) === v);

/** Las características de estas variantes, en el orden de la tienda (en mayúsculas). */
export const caracteristicasDe = (variantes, orden) => {
    const nombres = new Set();
    variantes.forEach(v => Object.entries(v.config || {}).forEach(([c, val]) => { if (val) nombres.add(c.toUpperCase()); }));
    return ordenarCaracteristicas([...nombres], orden);
};

/**
 * Las opciones de una característica con lo ya elegido.
 * @param {object[]} variantes        las del producto (con `config` y `disponible`)
 * @param {string} caracteristica
 * @param {object} elegidas           {CARACTERISTICA: valor}
 * @param {object} [definicion]       la característica del catálogo ({domain: [{value, hex_code, image_url}]})
 * @returns {{valor: string, libres: number, hex?: string, imagen?: string}[]}
 */
export const opcionesDe = (variantes, caracteristica, elegidas, definicion) => {
    const libres = new Map();
    variantes.forEach(v => {
        const valor = valorDe(v.config, caracteristica);
        if (!valor) return;
        const suma = calzaCon(v, elegidas) ? Number(v.disponible) || 0 : 0;
        libres.set(valor, (libres.get(valor) || 0) + suma);
    });
    const dominio = definicion?.domain || [];
    const posicion = (valor) => {
        const i = dominio.findIndex(o => o.value === valor);
        return i === -1 ? dominio.length : i;
    };
    return [...libres.entries()]
        .map(([valor, n]) => {
            const opcion = dominio.find(o => o.value === valor) || {};
            return { valor, libres: n, hex: opcion.hex_code, imagen: opcion.image_url || undefined };
        })
        .sort((a, b) => posicion(a.valor) - posicion(b.valor) || a.valor.localeCompare(b.valor));
};

/**
 * Lo que falta preguntar, con las elecciones que se hacen solas.
 * @returns {{elegidas: object, paso: string|null, variante: object|null}}
 *   `paso`: la característica que hay que elegir ahora (null si no queda);
 *   `variante`: la que quedó, cuando ya no hay nada que elegir.
 */
export const avanzar = (variantes, caracteristicas, elegidas, definiciones = []) => {
    const ahora = { ...elegidas };
    for (const c of caracteristicas) {
        if (c in ahora) continue;
        const conLibres = opcionesDe(variantes, c, ahora, definiciones.find(d => d.name.toUpperCase() === c))
            .filter(o => o.libres > 0);
        if (conLibres.length === 1) { ahora[c] = conLibres[0].valor; continue; }
        return { elegidas: ahora, paso: c, variante: null };
    }
    const quedan = variantes.filter(v => calzaCon(v, ahora) && Number(v.disponible) > 0);
    return { elegidas: ahora, paso: null, variante: quedan.length === 1 ? quedan[0] : null };
};

/** Volver un paso: se quita la última elección hecha a mano (y las automáticas que vinieron después). */
export const retroceder = (elegidasAMano) => {
    const claves = Object.keys(elegidasAMano);
    if (!claves.length) return null;
    const sinUltima = { ...elegidasAMano };
    delete sinUltima[claves[claves.length - 1]];
    return sinUltima;
};
