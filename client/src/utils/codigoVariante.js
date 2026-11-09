/**
 * La vista previa del código de una variante: la misma regla que aplica el
 * servidor al guardar (server/app/core/codigos_variante.py), para que lo que se
 * ve al armar sea lo que queda.
 *
 *   PR-VESTIDO_PERLA-FLORAL_PRIMAVERA-34-12
 *
 * La dirección del producto tal cual, y los valores por el nombre de su
 * característica, en orden alfabético. Antes la vista previa limpiaba también la
 * dirección (PR-VESTIDONOEMI) y seguía el orden en que se eligieron.
 */

const limpiar = (texto) => String(texto ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '_')
    .replace(/^_+|_+$/g, '');

const porNombre = (a, b) => {
    const x = a.toUpperCase();
    const y = b.toUpperCase();
    return x < y ? -1 : x > y ? 1 : 0;
};

export const codigoDe = (direccion, config = {}) =>
    [direccion, ...Object.keys(config).sort(porNombre).map(k => limpiar(config[k]))]
        .filter(Boolean)
        .join('-')
        .toUpperCase();
