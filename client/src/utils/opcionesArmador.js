/**
 * Qué opciones ofrece cada característica al armar una prenda personalizada.
 *
 * Primero las de esa prenda (las de sus variantes), después las demás del
 * catálogo: una personalizada puede llevar cualquier opción que exista, aunque
 * ese producto no la tenga. Antes solo salían las de la prenda: "Corta" en
 * Mangas no aparecía, se escribía en "Otro", el servidor decía que ya existe,
 * y al usarla el desplegable mostraba "sin especificar" porque no la tenía.
 *
 * Lo elegido siempre está entre las opciones, aunque no venga de ninguna.
 * Si la categoría no acepta personalizaciones (`soloCatalogo`), solo las de
 * la prenda.
 */

const clave = (v) => String(v).trim().toLowerCase();

export const opcionesDe = ({ deLaPrenda = [], delCatalogo = [], elegido = '', soloCatalogo = false }) => {
    const propias = [...deLaPrenda];
    const vistas = new Set(propias.map(clave));
    const otras = soloCatalogo ? [] : delCatalogo.filter(v => !vistas.has(clave(v)) && vistas.add(clave(v)));
    if (elegido && !vistas.has(clave(elegido))) (soloCatalogo ? propias : otras).push(elegido);
    return { propias, otras };
};
