/**
 * Los filtros de la caja: valores de características (Color: Negro o Azul),
 * categorías y palabras sueltas. Los arman el buscador (lo que entendió de lo
 * escrito, utils/busquedaCaja.js) y los filtros del selector; el servidor los
 * aplica (core/caja en el servidor).
 *
 * Forma: { valores: {COLOR: ['Negro', 'Azul']}, categorias: ['3'], palabras: ['vestido'] }
 */

export const SIN_FILTROS = { valores: {}, categorias: [], palabras: [] };

/** Lo que entendió el buscador, como filtros. */
export const desdeInterpretacion = (interpretacion) => ({
    valores: Object.fromEntries((interpretacion?.filtros || [])
        .map(f => [f.caracteristica.toUpperCase(), [...f.valores]])),
    categorias: [],
    palabras: [...(interpretacion?.libres || [])],
});

/** Los parámetros de la URL: valor=COLOR=Negro (uno por valor), categoria=3, palabra=vestido. */
export const aParametros = (filtros, extra = {}) => {
    const p = new URLSearchParams();
    Object.entries(filtros.valores || {}).forEach(([c, vs]) => vs.forEach(v => p.append('valor', `${c}=${v}`)));
    (filtros.categorias || []).forEach(id => p.append('categoria', id));
    (filtros.palabras || []).forEach(w => p.append('palabra', w));
    Object.entries(extra).forEach(([k, v]) => p.set(k, v));
    return p.toString();
};

/** Marca o desmarca una opción. `clave`: 'categoria' o el nombre de la característica. */
export const alternar = (filtros, clave, valor) => {
    if (clave === 'categoria') {
        const categorias = filtros.categorias.includes(valor)
            ? filtros.categorias.filter(c => c !== valor) : [...filtros.categorias, valor];
        return { ...filtros, categorias };
    }
    const actuales = filtros.valores[clave] || [];
    const nuevos = actuales.includes(valor) ? actuales.filter(v => v !== valor) : [...actuales, valor];
    const valores = { ...filtros.valores, [clave]: nuevos };
    if (!nuevos.length) delete valores[clave];
    return { ...filtros, valores };
};

/** Cuántas opciones hay marcadas en total (para el botón "Filtros"). */
export const cuantosFiltros = (filtros) =>
    Object.values(filtros.valores || {}).reduce((n, vs) => n + vs.length, 0) + (filtros.categorias || []).length;

/**
 * Lo ya elegido que se da por hecho al abrir un producto: solo las
 * características con un único valor marcado (con dos, todavía hay que elegir).
 */
export const elegidasDe = (filtros) => Object.fromEntries(
    Object.entries(filtros.valores || {}).filter(([, vs]) => vs.length === 1).map(([c, vs]) => [c, vs[0]]),
);

/** Una página de una lista: 10 por página (las teclas 1 a 9 y 0). */
export const POR_PAGINA = 10;
export const paginaDe = (lista, pagina) => lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
export const paginasDe = (lista) => Math.max(1, Math.ceil(lista.length / POR_PAGINA));

/** La tecla de la posición i en la página: 1 a 9 y 0 para la décima. */
export const teclaDe = (i) => (i < 9 ? String(i + 1) : i === 9 ? '0' : null);

/** La posición de una tecla: '1' → 0 … '9' → 8, '0' → 9; null si no es un número. */
export const posicionDe = (tecla) => (/^[0-9]$/.test(tecla) ? (tecla === '0' ? 9 : Number(tecla) - 1) : null);
