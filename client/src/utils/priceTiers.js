/**
 * Tramos de precio por cantidad (mayorista, iglesia, los que Paola defina).
 *
 * El precio no depende de quién dice ser el cliente sino de qué compra: si
 * lleva N unidades del mismo producto y todas las tallas caen dentro del rango
 * del tramo, se aplica su descuento. Nadie declara nada y nadie puede mentir.
 *
 * Configuración global en ajustes (clave `price_tiers`). Nada acá está
 * hardcodeado: la característica, el rango, el mínimo y el descuento son datos.
 */

const norm = (v) => String(v ?? '').toLowerCase().trim();

/**
 * Valores de una característica que caen dentro del rango [desde, hasta].
 * Se resuelve contra el orden real de `filtersMetadata`, así que si mañana se
 * agrega una talla intermedia el tramo la incluye sin reconfigurar nada.
 */
export const valoresEnRango = (valoresOrdenados, desde, hasta) => {
    if (!valoresOrdenados?.length) return [];
    const i = valoresOrdenados.findIndex(v => norm(v) === norm(desde));
    const j = valoresOrdenados.findIndex(v => norm(v) === norm(hasta));
    if (i === -1 || j === -1) return [];
    const [a, b] = i <= j ? [i, j] : [j, i];
    return valoresOrdenados.slice(a, b + 1);
};

/**
 * Clave de agrupación: el producto y todas sus características MENOS aquella
 * sobre la que el tramo define su rango. "6 unidades del mismo producto, mismo
 * color, distintas tallas" cuenta como grupo; distinto color, no.
 */
const claveGrupo = (item, caracteristica) => {
    const partes = Object.entries(item.selections || {})
        .filter(([k]) => norm(k) !== norm(caracteristica))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${norm(k)}=${norm(v)}`);
    return `${item.productId}|${partes.join('&')}`;
};

export const aplicarDescuento = (precio, tipo, valor) => {
    const n = Number(valor);
    if (!Number.isFinite(n) || n <= 0) return precio;
    if (tipo === 'percent') return n < 100 ? Math.round(precio * (1 - n / 100)) : precio;
    if (tipo === 'amount') return Math.max(0, precio - n);
    if (tipo === 'fixed') return n;
    return precio;
};

/**
 * Evalúa los tramos sobre el carrito y devuelve, por cada línea, el precio que
 * corresponde y el tramo que lo justifica.
 *
 * @returns Map de itemKey -> { precio, tramo } (sólo las líneas con tramo)
 */
export const evaluarTramos = (cart, config, filtersMetadata) => {
    const resultado = new Map();
    const tramos = (config?.tiers || []).filter(t => t?.active !== false);
    if (!cart?.length || !tramos.length) return resultado;

    for (const tramo of tramos) {
        const car = tramo.characteristic;
        // filters-metadata entrega cada característica como un array de valores
        // ya ordenado. No usar `?.values`: en un array eso devuelve
        // Array.prototype.values (una función), no los valores.
        const crudo = filtersMetadata?.attributes?.[car] ?? filtersMetadata?.[car];
        const orden = Array.isArray(crudo) ? crudo : (crudo?.values ?? []);
        const permitidos = new Set(valoresEnRango(orden, tramo.from, tramo.to).map(norm));
        if (!permitidos.size) continue;

        // Agrupar el carrito por producto + todo menos la característica del tramo
        const grupos = new Map();
        for (const item of cart) {
            const valor = Object.entries(item.selections || {})
                .find(([k]) => norm(k) === norm(car))?.[1];
            if (valor == null) continue;
            const g = claveGrupo(item, car);
            if (!grupos.has(g)) grupos.set(g, []);
            grupos.get(g).push({ item, valor });
        }

        for (const miembros of grupos.values()) {
            // Todas las tallas del grupo deben caer dentro del rango: si una se
            // sale, el grupo entero no califica para ESTE tramo (puede calificar
            // para otro más amplio).
            if (!miembros.every(m => permitidos.has(norm(m.valor)))) continue;

            const unidades = miembros.reduce((a, m) => a + (m.item.quantity || 0), 0);
            if (unidades < (Number(tramo.min_qty) || 0)) continue;

            for (const { item } of miembros) {
                const precio = aplicarDescuento(item.price, tramo.discount_type, tramo.discount_value);
                const previo = resultado.get(item.__key);
                // Si el pedido califica para más de un tramo (los rangos se
                // solapan), gana el precio menor: es lo que espera el cliente.
                if (!previo || precio < previo.precio) {
                    resultado.set(item.__key, { precio, tramo: tramo.name, unidades });
                }
            }
        }
    }

    return resultado;
};
