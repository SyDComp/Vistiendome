/**
 * La búsqueda de la caja entiende lo que se escribe: "vestido roja xs" es el
 * producto Vestido, Color Rojo y Talla XS. Las palabras que calzan con una
 * opción de alguna característica se vuelven filtros (que se ven y se pueden
 * quitar); las demás buscan en el nombre y el código. Cada palabra que se suma
 * achica la búsqueda.
 *
 * Aquí se interpreta; buscar lo hace el servidor (core/caja, con la misma
 * regla de comparación en core/caja/texto.py: si una cambia, cambia la otra).
 *
 * Se compara sin tildes, sin plural y sin género ("rojas" encuentra "Rojo").
 * Las palabras de una o dos letras solo calzan exactas (la talla "S" no es
 * cualquier palabra que empiece con s).
 *
 * Una palabra que calza en DOS características ("rojo": Color Rojo Italiano y
 * Estampado Flores Rojas) no se vuelve filtro de las dos: eso exigía las dos a
 * la vez. Va como palabra suelta, y el servidor la busca también en los
 * valores de las características: trae lo que tenga una u otra.
 */

const normalizar = (texto) => String(texto ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** "rojas" → "roj", "rojo" → "roj", "vestidos" → "vestid". */
const raiz = (palabra) => {
    const p = normalizar(palabra);
    if (p.length < 3) return p;
    return p.replace(/s$/, '').replace(/[aoe]$/, '');
};

const palabrasDe = (texto) => normalizar(texto).split(/[\s/·,-]+/).filter(Boolean);

/** Si la palabra escrita calza con una palabra de un valor. */
const calza = (escrita, delValor) => {
    if (escrita.length < 3) return escrita === normalizar(delValor);
    return raiz(delValor).startsWith(raiz(escrita));
};

/**
 * Qué características reconoce cada palabra.
 * @param {string} texto
 * @param {{name: string, domain: {value: string}[]}[]} caracteristicas
 * @returns {{
 *   filtros: {caracteristica: string, valores: string[], palabras: string[]}[],
 *   libres: string[],
 *   ambiguas: {palabra: string, caracteristicas: string[]}[]
 * }}  `ambiguas` también están en `libres`: se buscan como texto.
 */
export const interpretar = (texto, caracteristicas = []) => {
    const porCaracteristica = new Map();
    const libres = [];
    const ambiguas = [];
    palabrasDe(texto).forEach(palabra => {
        const calzan = caracteristicas
            .map(c => ({ c, valores: (c.domain || []).map(o => o.value)
                .filter(v => palabrasDe(v).some(w => calza(palabra, w))) }))
            .filter(x => x.valores.length);
        if (calzan.length !== 1) {
            libres.push(palabra);
            if (calzan.length > 1) ambiguas.push({ palabra, caracteristicas: calzan.map(x => x.c.name) });
            return;
        }
        calzan.forEach(({ c, valores }) => {
            const actual = porCaracteristica.get(c.name) || { caracteristica: c.name, valores: null, palabras: [] };
            // Dos palabras de la misma característica se juntan ("azul marino"):
            // vale lo que calza con las dos. Si nada calza con las dos, cualquiera.
            const juntas = actual.valores ? actual.valores.filter(v => valores.includes(v)) : valores;
            actual.valores = juntas.length ? juntas : [...new Set([...(actual.valores || []), ...valores])];
            actual.palabras.push(palabra);
            porCaracteristica.set(c.name, actual);
        });
    });
    // En el orden de la tienda, no en el que se escribieron: las etiquetas
    // quedan siempre en el mismo lugar.
    const filtros = caracteristicas.map(c => porCaracteristica.get(c.name)).filter(Boolean);
    return { filtros, libres, ambiguas };
};

/** El texto sin las palabras de un filtro: quitar la etiqueta es borrar lo que la puso. */
export const sinFiltro = (texto, filtro) => {
    const quitar = new Set(filtro.palabras);
    return texto.split(/\s+/).filter(p => !quitar.has(normalizar(p))).join(' ');
};
